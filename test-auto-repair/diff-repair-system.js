#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class DiffBasedRepairSystem {
  constructor() {
    this.repairHistory = [];
    this.tempDir = path.join(__dirname, '.temp-repairs');
  }

  // Git diff를 생성하여 변경사항을 추적
  async generateDiff(filePath, originalContent, modifiedContent) {
    await fs.ensureDir(this.tempDir);
    
    const originalFile = path.join(this.tempDir, 'original.txt');
    const modifiedFile = path.join(this.tempDir, 'modified.txt');
    
    await fs.writeFile(originalFile, originalContent);
    await fs.writeFile(modifiedFile, modifiedContent);
    
    try {
      const { stdout } = await execAsync(`diff -u "${originalFile}" "${modifiedFile}"`);
      return stdout;
    } catch (error) {
      // diff 명령어는 차이가 있을 때 exit code 1을 반환
      return error.stdout || '';
    }
  }

  // 테스트 실패 분석 및 수정 제안 생성
  async analyzeFailureAndSuggestFix(testResult, mode = 'semi-auto') {
    const failure = await this.analyzeTestFailure(testResult);
    const suggestions = await this.generateRepairSuggestions(failure);
    
    const repairPlan = {
      timestamp: new Date().toISOString(),
      failure: failure,
      suggestions: suggestions,
      mode: mode,
      status: 'pending'
    };

    this.repairHistory.push(repairPlan);
    
    if (mode === 'semi-auto') {
      return await this.promptUserForApproval(repairPlan);
    } else if (mode === 'auto') {
      return await this.autoApplyRepairs(repairPlan);
    } else if (mode === 'interactive') {
      return await this.interactiveRepair(repairPlan);
    }
    
    return repairPlan;
  }

  async analyzeTestFailure(testResult) {
    const output = testResult.stdout + testResult.stderr;
    const failure = {
      type: 'unknown',
      file: null,
      line: null,
      message: '',
      context: '',
      stackTrace: ''
    };

    // 스택 트레이스 분석
    const stackTraceMatch = output.match(/at.*\((.*?):(\d+):(\d+)\)/);
    if (stackTraceMatch) {
      failure.file = stackTraceMatch[1];
      failure.line = parseInt(stackTraceMatch[2]);
    }

    // 에러 유형 분석
    if (output.includes('TimeoutError')) {
      failure.type = 'timeout';
      failure.message = 'Element or page timeout';
    } else if (output.includes('toBeVisible')) {
      failure.type = 'element_visibility';
      failure.message = 'Element not visible';
    } else if (output.includes('ECONNREFUSED')) {
      failure.type = 'connection';
      failure.message = 'Connection refused to server';
    } else if (output.includes('Element not found')) {
      failure.type = 'selector';
      failure.message = 'Selector not found';
    } else if (output.includes('Host system is missing dependencies') || output.includes('Missing libraries')) {
      failure.type = 'system_dependencies';
      failure.message = 'Missing system libraries for browser execution';
    }

    // 컨텍스트 추출
    const contextMatch = output.match(/Error:.*\n(.*\n.*\n.*)/);
    if (contextMatch) {
      failure.context = contextMatch[1];
    }

    failure.stackTrace = output;
    return failure;
  }

  async generateRepairSuggestions(failure) {
    const suggestions = [];

    switch (failure.type) {
      case 'timeout':
        suggestions.push({
          description: 'Increase timeout values',
          files: [
            {
              path: './playwright.config.js',
              changes: [
                {
                  type: 'replace',
                  pattern: /timeout: \d+/g,
                  replacement: 'timeout: 90000',
                  description: 'Global timeout 증가 (60s → 90s)'
                }
              ]
            },
            {
              path: failure.file || './tests/windwalker-phase1.spec.js',
              changes: [
                {
                  type: 'replace',
                  pattern: /waitForTimeout\(\d+\)/g,
                  replacement: 'waitForTimeout(8000)',
                  description: '대기 시간 증가 (3s → 8s)'
                },
                {
                  type: 'replace',
                  pattern: /timeout: \d+/g,
                  replacement: 'timeout: 15000',
                  description: 'Element timeout 증가'
                }
              ]
            }
          ],
          priority: 'high',
          riskLevel: 'low'
        });
        break;

      case 'element_visibility':
        suggestions.push({
          description: 'Improve element waiting strategy',
          files: [
            {
              path: failure.file || './tests/windwalker-phase1.spec.js',
              changes: [
                {
                  type: 'replace',
                  pattern: /await expect\(([^)]+)\)\.toBeVisible\(\)/g,
                  replacement: 'await expect($1).toBeVisible({ timeout: 15000 })',
                  description: 'toBeVisible에 timeout 추가'
                },
                {
                  type: 'add_before',
                  pattern: /await expect\(.*\)\.toBeVisible/,
                  addition: '    await page.waitForLoadState(\'networkidle\');\n',
                  description: 'Network idle 대기 추가'
                }
              ]
            }
          ],
          priority: 'high',
          riskLevel: 'low'
        });
        break;

      case 'connection':
        suggestions.push({
          description: 'Fix server connection issues',
          files: [
            {
              path: '../start-windwalker.sh',
              changes: [
                {
                  type: 'add_after',
                  pattern: /code-server.*$/,
                  addition: ' --disable-workspace-trust',
                  description: 'Workspace trust 비활성화 추가'
                }
              ]
            }
          ],
          priority: 'critical',
          riskLevel: 'medium',
          requiresRestart: true
        });
        break;

      case 'selector':
        suggestions.push({
          description: 'Update selectors with more robust alternatives',
          files: [
            {
              path: failure.file || './tests/windwalker-phase1.spec.js',
              changes: [
                {
                  type: 'replace',
                  pattern: /page\.locator\('\[title\*="WindWalker"\]'\)/g,
                  replacement: 'page.locator(\'[title*="WindWalker"], [aria-label*="WindWalker"], .activity-bar-item[title*="WindWalker"]\').first()',
                  description: '더 견고한 셀렉터로 변경'
                }
              ]
            }
          ],
          priority: 'medium',
          riskLevel: 'low'
        });
        break;

      case 'system_dependencies':
        suggestions.push({
          description: 'Configure headless browser for Firebase/Nix environment',
          files: [
            {
              path: './playwright.config.js',
              changes: [
                {
                  type: 'replace',
                  pattern: /use: \{[\s\S]*?\}/,
                  replacement: `use: {
    // Global test settings
    baseURL: 'http://localhost:8082',
    trace: 'on-first-retry',
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
  }`,
                  description: 'Headless 모드 및 시스템 제약 우회 설정 추가'
                }
              ]
            },
            {
              path: './package.json',
              changes: [
                {
                  type: 'add_after',
                  pattern: /"scripts": \{/,
                  replacement: '\n    "test:headless": "PLAYWRIGHT_BROWSERS_PATH=./browsers npx playwright test --headed=false",',
                  description: 'Headless 테스트 스크립트 추가'
                }
              ]
            }
          ],
          priority: 'critical',
          riskLevel: 'low',
          environmentNote: 'Firebase/Nix 환경에서는 브라우저 의존성 문제로 인해 대안적 접근 필요'
        });
        
        suggestions.push({
          description: 'Alternative: Manual testing approach for constrained environment',
          files: [
            {
              path: './firebase-manual-test.md',
              changes: [
                {
                  type: 'create',
                  content: `# Firebase 환경 수동 테스트 가이드

## 환경 제약사항
- 시스템 라이브러리 의존성 부족으로 Playwright 브라우저 실행 불가
- 대안적 검증 방법 필요

## 수동 검증 절차
1. Code Server 시작: ./start-windwalker.sh
2. 브라우저에서 http://localhost:8082 접속
3. 확장 로딩 및 기능 확인

## 검증 체크리스트
- [ ] 확장 활성화 메시지 표시
- [ ] 사이드바 아이콘 표시
- [ ] WebView 통신 정상 작동
                  `,
                  description: '수동 테스트 가이드 생성'
                }
              ]
            }
          ],
          priority: 'high',
          riskLevel: 'low'
        });
        break;
    }

    return suggestions;
  }

  // 사용자 승인 모드 (반자동)
  async promptUserForApproval(repairPlan) {
    console.log('\\n🔧 테스트 실패 분석 완료');
    console.log('━'.repeat(50));
    console.log(`실패 유형: ${repairPlan.failure.type}`);
    console.log(`실패 메시지: ${repairPlan.failure.message}`);
    
    if (repairPlan.failure.file) {
      console.log(`파일: ${repairPlan.failure.file}:${repairPlan.failure.line}`);
    }

    console.log('\\n💡 수정 제안:');
    
    for (let i = 0; i < repairPlan.suggestions.length; i++) {
      const suggestion = repairPlan.suggestions[i];
      console.log(`\\n${i + 1}. ${suggestion.description}`);
      console.log(`   우선순위: ${suggestion.priority} | 위험도: ${suggestion.riskLevel}`);
      
      for (const fileChange of suggestion.files) {
        console.log(`   📁 ${fileChange.path}:`);
        
        for (const change of fileChange.changes) {
          console.log(`      • ${change.description}`);
          
          if (change.type === 'replace') {
            console.log(`        변경 전: ${change.pattern}`);
            console.log(`        변경 후: ${change.replacement}`);
          }
        }
      }
    }

    // 실제 구현에서는 readline 또는 UI를 통한 사용자 입력
    const userApproval = await this.simulateUserInput();
    
    if (userApproval) {
      console.log('\\n✅ 사용자가 수정을 승인했습니다. 적용 중...');
      return await this.applyRepairs(repairPlan);
    } else {
      console.log('\\n❌ 사용자가 수정을 거부했습니다.');
      repairPlan.status = 'rejected';
      return repairPlan;
    }
  }

  // 자동 복구 모드
  async autoApplyRepairs(repairPlan) {
    console.log('\\n🤖 자동 복구 모드: 수정 사항을 자동으로 적용합니다...');
    
    // 위험도가 높은 변경사항은 제외
    const safeRepairs = repairPlan.suggestions.filter(s => s.riskLevel !== 'high');
    
    if (safeRepairs.length === 0) {
      console.log('⚠️ 안전한 자동 수정 사항이 없습니다. 수동 검토가 필요합니다.');
      repairPlan.status = 'manual_review_required';
      return repairPlan;
    }

    repairPlan.suggestions = safeRepairs;
    return await this.applyRepairs(repairPlan);
  }

  // 대화형 수정 모드
  async interactiveRepair(repairPlan) {
    console.log('\\n💬 대화형 수정 모드');
    console.log('다음 질문에 답해주세요:');
    
    console.log(`\\n1. 이 테스트의 목적은 무엇인가요?`);
    console.log(`   현재 실패: ${repairPlan.failure.message}`);
    
    console.log(`\\n2. 예상한 동작과 실제 동작의 차이점은?`);
    
    console.log(`\\n3. 이전에 비슷한 문제를 겪은 적이 있나요?`);
    
    // 실제로는 사용자 입력을 받아 더 정교한 수정 계획을 수립
    const userContext = await this.gatherUserContext();
    
    // 사용자 입력을 바탕으로 수정 계획 개선
    const improvedPlan = await this.improveRepairPlan(repairPlan, userContext);
    
    return await this.applyRepairs(improvedPlan);
  }

  async applyRepairs(repairPlan) {
    console.log('\\n🔄 수정 사항 적용 중...');
    const appliedChanges = [];

    for (const suggestion of repairPlan.suggestions) {
      console.log(`\\n📝 적용 중: ${suggestion.description}`);
      
      for (const fileChange of suggestion.files) {
        const filePath = path.resolve(__dirname, fileChange.path);
        
        if (!await fs.pathExists(filePath)) {
          console.log(`⚠️ 파일을 찾을 수 없습니다: ${filePath}`);
          continue;
        }

        let originalContent = await fs.readFile(filePath, 'utf8');
        let modifiedContent = originalContent;
        const fileChanges = [];

        for (const change of fileChange.changes) {
          const beforeContent = modifiedContent;
          
          switch (change.type) {
            case 'replace':
              modifiedContent = modifiedContent.replace(change.pattern, change.replacement);
              break;
            case 'add_before':
              modifiedContent = modifiedContent.replace(change.pattern, change.addition + '$&');
              break;
            case 'add_after':
              modifiedContent = modifiedContent.replace(change.pattern, '$&' + change.addition);
              break;
          }

          if (beforeContent !== modifiedContent) {
            const diff = await this.generateDiff(filePath, beforeContent, modifiedContent);
            fileChanges.push({
              description: change.description,
              diff: diff
            });
          }
        }

        if (originalContent !== modifiedContent) {
          // 백업 생성
          const backupPath = `${filePath}.backup.${Date.now()}`;
          await fs.copy(filePath, backupPath);
          
          // 수정된 내용 적용
          await fs.writeFile(filePath, modifiedContent);
          
          appliedChanges.push({
            file: fileChange.path,
            backup: backupPath,
            changes: fileChanges,
            fullDiff: await this.generateDiff(filePath, originalContent, modifiedContent)
          });

          console.log(`✅ ${fileChange.path} 수정 완료`);
          console.log(`   백업: ${backupPath}`);
        }
      }
    }

    repairPlan.status = 'applied';
    repairPlan.appliedChanges = appliedChanges;
    repairPlan.appliedAt = new Date().toISOString();

    // 수정 내역 출력
    console.log('\\n📋 적용된 변경사항:');
    for (const change of appliedChanges) {
      console.log(`\\n📁 ${change.file}:`);
      console.log(change.fullDiff);
    }

    return repairPlan;
  }

  // 변경사항 롤백
  async rollbackChanges(repairPlan) {
    if (!repairPlan.appliedChanges) {
      console.log('롤백할 변경사항이 없습니다.');
      return;
    }

    console.log('\\n↩️ 변경사항 롤백 중...');
    
    for (const change of repairPlan.appliedChanges) {
      const filePath = path.resolve(__dirname, change.file);
      const backupPath = change.backup;
      
      if (await fs.pathExists(backupPath)) {
        await fs.copy(backupPath, filePath);
        await fs.remove(backupPath);
        console.log(`✅ ${change.file} 롤백 완료`);
      }
    }

    repairPlan.status = 'rolled_back';
    repairPlan.rolledBackAt = new Date().toISOString();
  }

  // 수정 내역 리포트 생성
  async generateRepairReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRepairs: this.repairHistory.length,
      successfulRepairs: this.repairHistory.filter(r => r.status === 'applied').length,
      failedRepairs: this.repairHistory.filter(r => r.status === 'failed').length,
      repairHistory: this.repairHistory.map(r => ({
        timestamp: r.timestamp,
        failureType: r.failure.type,
        status: r.status,
        mode: r.mode,
        suggestionsCount: r.suggestions.length,
        appliedChanges: r.appliedChanges?.length || 0
      }))
    };

    const reportPath = path.join(__dirname, 'repair-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 수정 리포트 생성: ${reportPath}`);
    return report;
  }

  // 시뮬레이션 헬퍼 메서드들
  async simulateUserInput() {
    // 실제로는 readline이나 UI를 통한 사용자 입력
    return Math.random() > 0.3; // 70% 승인율
  }

  async gatherUserContext() {
    return {
      testPurpose: "WindWalker extension loading verification",
      expectedBehavior: "Extension should load and show icon in sidebar",
      previousExperience: "Similar timeout issues occurred before"
    };
  }

  async improveRepairPlan(repairPlan, userContext) {
    // 사용자 컨텍스트를 바탕으로 수정 계획 개선
    return repairPlan;
  }
}

module.exports = DiffBasedRepairSystem;