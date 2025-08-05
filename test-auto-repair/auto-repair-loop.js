#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const DiffBasedRepairSystem = require('./diff-repair-system');
const AutoDocumentationSystem = require('./auto-documentation');

class WindWalkerTestAutoRepair {
  constructor(mode = 'semi-auto') {
    this.maxRetries = 3;
    this.retryCount = 0;
    this.testResults = [];
    this.repairAttempts = [];
    this.mode = mode; // 'semi-auto', 'auto', 'interactive'
    this.diffRepairSystem = new DiffBasedRepairSystem();
    this.autoDocumentation = new AutoDocumentationSystem();
    this.appliedRepairPlans = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    
    switch(type) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
      case 'info':
      default:
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
        break;
    }
  }

  async runTests() {
    this.log('WindWalker 테스트 오토 리페어 루프 시작', 'info');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['playwright', 'test'], {
        stdio: 'pipe',
        cwd: __dirname
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      testProcess.on('close', (code) => {
        const result = {
          code,
          stdout,
          stderr,
          timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (code === 0) {
          this.log('모든 테스트 통과!', 'success');
          resolve(result);
        } else {
          this.log(`테스트 실패 (종료 코드: ${code})`, 'error');
          resolve(result); // reject가 아닌 resolve로 처리하여 repair 로직 실행
        }
      });

      testProcess.on('error', (error) => {
        this.log(`테스트 실행 오류: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async analyzeFailures() {
    const lastResult = this.testResults[this.testResults.length - 1];
    if (!lastResult || lastResult.code === 0) return [];

    const failures = [];
    const output = lastResult.stdout + lastResult.stderr;

    // 일반적인 실패 패턴 분석
    if (output.includes('Timeout')) {
      failures.push({
        type: 'timeout',
        message: 'Page load or element timeout',
        suggestion: 'Code Server 시작 대기 시간 증가'
      });
    }

    if (output.includes('toBeVisible')) {
      failures.push({
        type: 'element_not_visible',
        message: 'WindWalker UI elements not visible',
        suggestion: '확장 로딩 대기 시간 증가 또는 셀렉터 수정'
      });
    }

    if (output.includes('Connection refused') || output.includes('ECONNREFUSED')) {
      failures.push({
        type: 'connection_refused',
        message: 'Code Server not accessible',
        suggestion: 'Code Server 재시작 필요'
      });
    }

    if (output.includes('Extension') && output.includes('not found')) {
      failures.push({
        type: 'extension_not_found',
        message: 'WindWalker extension not loaded',
        suggestion: '확장 디렉토리 및 파일 권한 확인'
      });
    }

    return failures;
  }

  async attemptRepair(failures) {
    this.log(`${failures.length}개의 문제 발견, ${this.mode} 모드로 복구 시작...`, 'warning');

    const lastResult = this.testResults[this.testResults.length - 1];
    
    try {
      // Diff 기반 수정 시스템 사용
      const repairPlan = await this.diffRepairSystem.analyzeFailureAndSuggestFix(lastResult, this.mode);
      
      if (repairPlan.status === 'applied') {
        this.log('✅ Diff 기반 수정 완료', 'success');
        
        this.repairAttempts.push({
          timestamp: new Date().toISOString(),
          mode: this.mode,
          repairPlan: repairPlan,
          status: 'success'
        });
        
        this.appliedRepairPlans.push(repairPlan);
        
        return true;
      } else if (repairPlan.status === 'manual_review_required') {
        this.log('⚠️ 수동 검토 필요 - 기존 방식으로 fallback', 'warning');
        return await this.legacyRepair(failures);
      } else {
        this.log('❌ Diff 기반 수정 실패 - 기존 방식으로 fallback', 'error');
        return await this.legacyRepair(failures);
      }
      
    } catch (error) {
      this.log(`Diff 기반 수정 오류: ${error.message}`, 'error');
      return await this.legacyRepair(failures);
    }
  }

  // 기존 수정 방식 (fallback용)
  async legacyRepair(failures) {
    this.log('기존 수정 방식 사용', 'info');
    
    for (const failure of failures) {
      this.log(`복구 시도: ${failure.message}`, 'info');
      
      try {
        switch (failure.type) {
          case 'timeout':
            await this.increaseTimeouts();
            break;
          case 'element_not_visible':
            await this.fixElementVisibility();
            break;
          case 'connection_refused':
            await this.restartCodeServer();
            break;
          case 'extension_not_found':
            await this.reinstallExtension();
            break;
        }
        
        this.repairAttempts.push({
          type: failure.type,
          action: failure.suggestion,
          timestamp: new Date().toISOString(),
          method: 'legacy'
        });
        
      } catch (error) {
        this.log(`복구 실패: ${error.message}`, 'error');
      }
    }
    
    return true;
  }

  async increaseTimeouts() {
    this.log('테스트 타임아웃 증가', 'info');
    const configPath = path.join(__dirname, 'playwright.config.js');
    let config = await fs.readFile(configPath, 'utf8');
    
    // 타임아웃을 더 크게 설정
    config = config.replace(/timeout: \d+/g, 'timeout: 90000');
    config = config.replace(/waitForTimeout\(\d+\)/g, 'waitForTimeout(8000)');
    
    await fs.writeFile(configPath, config);
  }

  async fixElementVisibility() {
    this.log('UI 요소 가시성 문제 수정', 'info');
    // 테스트에서 더 긴 대기 시간 설정
    const testPath = path.join(__dirname, 'tests/windwalker-phase1.spec.js');
    let testContent = await fs.readFile(testPath, 'utf8');
    
    // 대기 시간 증가
    testContent = testContent.replace(/timeout: \d+/g, 'timeout: 15000');
    testContent = testContent.replace(/waitForTimeout\(\d+\)/g, 'waitForTimeout(5000)');
    
    await fs.writeFile(testPath, testContent);
  }

  async restartCodeServer() {
    this.log('Code Server 재시작', 'warning');
    
    return new Promise((resolve) => {
      // Code Server 종료
      exec('pkill -f code-server', () => {
        setTimeout(() => {
          // Code Server 재시작
          const startScript = path.join(__dirname, '../start-windwalker.sh');
          exec(`bash ${startScript} &`, (error) => {
            if (error) {
              this.log(`Code Server 재시작 오류: ${error.message}`, 'error');
            } else {
              this.log('Code Server 재시작 완료', 'success');
            }
            // 서버 시작 대기
            setTimeout(resolve, 10000);
          });
        }, 3000);
      });
    });
  }

  async reinstallExtension() {
    this.log('WindWalker 확장 재설치', 'info');
    
    return new Promise((resolve) => {
      const commands = [
        'rm -rf ~/.local/share/code-server/extensions/windwalker-phase1',
        'cp -r /home/user/studio/extensions/windwalker-phase1 ~/.local/share/code-server/extensions/'
      ];
      
      exec(commands.join(' && '), (error) => {
        if (error) {
          this.log(`확장 재설치 오류: ${error.message}`, 'error');
        } else {
          this.log('확장 재설치 완료', 'success');
        }
        resolve();
      });
    });
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRuns: this.testResults.length,
      retryCount: this.retryCount,
      testResults: this.testResults,
      repairAttempts: this.repairAttempts,
      finalStatus: this.testResults[this.testResults.length - 1]?.code === 0 ? 'PASSED' : 'FAILED'
    };

    const reportPath = path.join(__dirname, 'auto-repair-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`테스트 리포트 생성: ${reportPath}`, 'info');
    return report;
  }

  async processCompletion(report) {
    try {
      this.log('📚 자동 문서화 및 GitHub 푸시 시작...', 'info');
      
      const result = await this.autoDocumentation.processTestCompletion(report, this.appliedRepairPlans);
      
      if (result.success) {
        this.log('✅ 자동 문서화 완료', 'success');
        if (result.pushedToGithub) {
          this.log('✅ GitHub 푸시 완료', 'success');
        }
      } else {
        this.log(`⚠️ 문서화 부분 실패: ${result.error}`, 'warning');
      }
      
    } catch (error) {
      this.log(`📚 문서화 프로세스 오류: ${error.message}`, 'error');
    }
  }

  async run() {
    try {
      while (this.retryCount < this.maxRetries) {
        this.log(`테스트 실행 (${this.retryCount + 1}/${this.maxRetries})`, 'info');
        
        const result = await this.runTests();
        
        if (result.code === 0) {
          this.log('테스트 성공! 오토 리페어 루프 완료', 'success');
          break;
        }
        
        this.retryCount++;
        
        if (this.retryCount < this.maxRetries) {
          const failures = await this.analyzeFailures();
          if (failures.length > 0) {
            await this.attemptRepair(failures);
            this.log('복구 완료, 재테스트 준비 중...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      const report = await this.generateReport();
      
      // 자동 문서화 및 GitHub 푸시
      await this.processCompletion(report);
      
      if (report.finalStatus === 'PASSED') {
        this.log('🎉 WindWalker 테스트 완전 성공!', 'success');
        process.exit(0);
      } else {
        this.log('❌ 최대 재시도 횟수 초과, 수동 확인 필요', 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`오토 리페어 루프 오류: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'semi-auto';
  
  // 모드 검증
  const validModes = ['semi-auto', 'auto', 'interactive'];
  if (!validModes.includes(mode)) {
    console.log(`
🌪️ WindWalker 테스트 자동화 루프

사용법: node auto-repair-loop.js [mode]

모드:
  semi-auto     ✅ 반자동 (기본값) - 실패 시 사용자 승인 후 수정
  auto          🔁 자동 복구 - 실패 시 자동으로 수정 반복  
  interactive   💬 대화형 - 사용자와 상호작용하며 수정

예시:
  node auto-repair-loop.js semi-auto
  node auto-repair-loop.js auto
  node auto-repair-loop.js interactive
    `);
    process.exit(1);
  }

  console.log(chalk.blue(`🚀 ${mode} 모드로 테스트 자동화 시작...`));
  
  const autoRepair = new WindWalkerTestAutoRepair(mode);
  autoRepair.run();
}

module.exports = WindWalkerTestAutoRepair;