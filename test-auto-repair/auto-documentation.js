#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class AutoDocumentationSystem {
  constructor() {
    this.docsDir = path.join(__dirname, 'docs');
    this.reportsDir = path.join(__dirname, 'reports');
  }

  // 테스트 결과를 마크다운 문서로 변환
  async generateTestReport(testSummary) {
    const reportContent = `# WindWalker 테스트 자동화 리포트

## 📊 실행 요약

- **실행 시간**: ${testSummary.timestamp}
- **모드**: ${testSummary.mode}
- **총 실행 횟수**: ${testSummary.totalRuns}
- **재시도 횟수**: ${testSummary.retryCount}
- **최종 상태**: ${testSummary.finalStatus}

## 🧪 테스트 결과

${testSummary.testResults.map((result, index) => `
### 실행 ${index + 1}

- **종료 코드**: ${result.code}
- **실행 시간**: ${result.timestamp}
- **상태**: ${result.code === 0 ? '✅ PASS' : '❌ FAIL'}

${result.code !== 0 ? `
#### 오류 로그
\`\`\`
${result.stderr}
\`\`\`

#### 표준 출력
\`\`\`
${result.stdout}
\`\`\`
` : ''}
`).join('')}

## 🔧 수정 시도

${testSummary.repairAttempts.length > 0 ? 
  testSummary.repairAttempts.map((repair, index) => `
### 수정 시도 ${index + 1}

- **시간**: ${repair.timestamp}
- **모드**: ${repair.mode || 'legacy'}
- **상태**: ${repair.status || 'unknown'}

${repair.repairPlan ? `
#### 적용된 변경사항

${repair.repairPlan.appliedChanges?.map(change => `
**파일**: \`${change.file}\`

\`\`\`diff
${change.fullDiff}
\`\`\`
`).join('') || '변경사항 없음'}
` : `
#### 기존 방식 수정
- **유형**: ${repair.type}
- **동작**: ${repair.action}
`}
`).join('') : '수정 시도 없음'}

## 📈 통계

- **성공률**: ${testSummary.finalStatus === 'PASSED' ? '100%' : '0%'}
- **평균 실행 시간**: ${this.calculateAverageTime(testSummary.testResults)}ms
- **가장 많은 실패 유형**: ${this.getMostCommonFailure(testSummary.repairAttempts)}

## 🎯 개선 제안

${this.generateImprovementSuggestions(testSummary)}

---
*자동 생성된 리포트 - ${new Date().toISOString()}*
`;

    await fs.ensureDir(this.reportsDir);
    const reportPath = path.join(this.reportsDir, `test-report-${Date.now()}.md`);
    await fs.writeFile(reportPath, reportContent);
    
    console.log(`📋 테스트 리포트 생성: ${reportPath}`);
    return reportPath;
  }

  // 수정 변경사항을 문서화
  async documentChanges(repairPlan) {
    if (!repairPlan.appliedChanges || repairPlan.appliedChanges.length === 0) {
      return null;
    }

    const changelogContent = `# 자동 수정 변경 로그

## ${new Date().toISOString()}

### 실패 분석
- **유형**: ${repairPlan.failure.type}
- **메시지**: ${repairPlan.failure.message}
- **파일**: ${repairPlan.failure.file}:${repairPlan.failure.line}

### 적용된 수정사항

${repairPlan.appliedChanges.map(change => `
#### 📁 ${change.file}

${change.changes.map(c => `
**${c.description}**

\`\`\`diff
${c.diff}
\`\`\`
`).join('')}

**전체 diff:**
\`\`\`diff
${change.fullDiff}
\`\`\`

**백업 파일**: \`${change.backup}\`
`).join('')}

### 수정 결과
- **모드**: ${repairPlan.mode}
- **상태**: ${repairPlan.status}
- **적용 시간**: ${repairPlan.appliedAt}

---
`;

    await fs.ensureDir(this.docsDir);
    const changelogPath = path.join(this.docsDir, 'CHANGELOG.md');
    
    // 기존 changelog에 추가
    let existingContent = '';
    if (await fs.pathExists(changelogPath)) {
      existingContent = await fs.readFile(changelogPath, 'utf8');
    }
    
    const newContent = changelogContent + '\\n' + existingContent;
    await fs.writeFile(changelogPath, newContent);
    
    console.log(`📝 변경 로그 업데이트: ${changelogPath}`);
    return changelogPath;
  }

  // Git 커밋 및 푸시
  async commitAndPush(message, files = []) {
    try {
      console.log('📤 Git 작업 시작...');

      // Git 상태 확인
      const { stdout: status } = await execAsync('git status --porcelain');
      if (!status.trim() && files.length === 0) {
        console.log('커밋할 변경사항이 없습니다.');
        return false;
      }

      // 특정 파일들 추가 또는 모든 변경사항 추가
      if (files.length > 0) {
        for (const file of files) {
          await execAsync(`git add "${file}"`);
          console.log(`✅ 추가됨: ${file}`);
        }
      } else {
        await execAsync('git add .');
        console.log('✅ 모든 변경사항 추가됨');
      }

      // 커밋
      const commitMessage = message || `자동 테스트 수정 - ${new Date().toISOString()}`;
      await execAsync(`git commit -m "${commitMessage}

🤖 Generated with Claude Code Auto-Repair System

Co-Authored-By: Claude <noreply@anthropic.com>"`);
      
      console.log(`✅ 커밋 완료: ${commitMessage}`);

      // 푸시 시도
      try {
        await execAsync('git push origin main');
        console.log('✅ GitHub 푸시 완료');
        return true;
      } catch (pushError) {
        // main 브랜치가 없으면 master 시도
        try {
          await execAsync('git push origin master');
          console.log('✅ GitHub 푸시 완료 (master)');
          return true;
        } catch (masterError) {
          console.log('⚠️ 푸시 실패 - 수동으로 푸시해주세요:', pushError.message);
          return false;
        }
      }

    } catch (error) {
      console.error('❌ Git 작업 실패:', error.message);
      return false;
    }
  }

  // 통합 문서화 및 푸시 프로세스
  async processTestCompletion(testSummary, repairPlans = []) {
    console.log('\\n📚 자동 문서화 프로세스 시작...');

    const generatedFiles = [];

    try {
      // 1. 테스트 리포트 생성
      const reportPath = await this.generateTestReport(testSummary);
      generatedFiles.push(reportPath);

      // 2. 각 수정사항 문서화
      for (const repairPlan of repairPlans) {
        if (repairPlan.status === 'applied') {
          const changelogPath = await this.documentChanges(repairPlan);
          if (changelogPath && !generatedFiles.includes(changelogPath)) {
            generatedFiles.push(changelogPath);
          }
        }
      }

      // 3. README 업데이트 (테스트 배지 등)
      await this.updateReadme(testSummary);
      generatedFiles.push('README.md');

      // 4. Git 커밋 및 푸시
      const commitMessage = this.generateCommitMessage(testSummary, repairPlans);
      const pushSuccess = await this.commitAndPush(commitMessage, generatedFiles);

      console.log('\\n📋 문서화 완료:');
      generatedFiles.forEach(file => {
        console.log(`  ✅ ${file}`);
      });

      if (pushSuccess) {
        console.log('\\n🎉 GitHub 푸시 완료!');
      }

      return {
        success: true,
        generatedFiles,
        pushedToGithub: pushSuccess
      };

    } catch (error) {
      console.error('❌ 문서화 프로세스 실패:', error.message);
      return {
        success: false,
        error: error.message,
        generatedFiles
      };
    }
  }

  // README 테스트 상태 배지 업데이트
  async updateReadme(testSummary) {
    const readmePath = path.join(__dirname, '../README.md');
    
    if (!await fs.pathExists(readmePath)) {
      console.log('README.md 파일이 없습니다. 스킵...');
      return;
    }

    let readmeContent = await fs.readFile(readmePath, 'utf8');
    
    const status = testSummary.finalStatus === 'PASSED' ? 'passing' : 'failing';
    const color = status === 'passing' ? 'green' : 'red';
    const badge = `![Test Status](https://img.shields.io/badge/tests-${status}-${color})`;
    
    // 기존 배지 교체 또는 추가
    if (readmeContent.includes('![Test Status]')) {
      readmeContent = readmeContent.replace(/!\\[Test Status\\]\\([^)]+\\)/, badge);
    } else {
      // README 시작 부분에 배지 추가
      readmeContent = `${badge}\\n\\n${readmeContent}`;
    }

    await fs.writeFile(readmePath, readmeContent);
    console.log('✅ README.md 테스트 배지 업데이트');
  }

  // 커밋 메시지 생성
  generateCommitMessage(testSummary, repairPlans) {
    const status = testSummary.finalStatus === 'PASSED' ? '✅' : '❌';
    const repairCount = repairPlans.filter(p => p.status === 'applied').length;
    
    let message = `${status} 자동 테스트 ${testSummary.finalStatus.toLowerCase()}`;
    
    if (repairCount > 0) {
      message += ` - ${repairCount}개 자동 수정 적용`;
    }

    return message;
  }

  // 헬퍼 메서드들
  calculateAverageTime(testResults) {
    if (testResults.length === 0) return 0;
    
    const times = testResults.map(r => {
      const timestamp = new Date(r.timestamp).getTime();
      return timestamp;
    });
    
    const totalTime = times[times.length - 1] - times[0];
    return Math.round(totalTime / testResults.length);
  }

  getMostCommonFailure(repairAttempts) {
    if (repairAttempts.length === 0) return '없음';
    
    const failureTypes = repairAttempts.map(r => r.type || r.repairPlan?.failure?.type).filter(Boolean);
    const counts = {};
    
    failureTypes.forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });

    const mostCommon = Object.entries(counts).sort(([,a], [,b]) => b - a)[0];
    return mostCommon ? mostCommon[0] : '없음';
  }

  generateImprovementSuggestions(testSummary) {
    const suggestions = [];

    if (testSummary.retryCount > 0) {
      suggestions.push('- 타임아웃 값 조정 고려');
    }

    if (testSummary.finalStatus === 'FAILED') {
      suggestions.push('- 셀렉터 안정성 개선 필요');
      suggestions.push('- 서버 시작 시간 최적화 검토');
    }

    if (testSummary.repairAttempts.length > 2) {
      suggestions.push('- 테스트 안정성 개선 필요');
    }

    return suggestions.length > 0 ? suggestions.join('\\n') : '- 현재 특별한 개선사항 없음';
  }
}

module.exports = AutoDocumentationSystem;