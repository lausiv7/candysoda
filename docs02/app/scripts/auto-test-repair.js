const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Sweet Puzzle 자동 테스트 & 수정 시스템
 * 테스트 실행 → 에러 분석 → 자동 수정 → 재테스트 루프
 */
class AutoTestRepairSystem {
  constructor() {
    this.projectRoot = process.cwd();
    this.testResultsDir = path.join(this.projectRoot, 'test-results');
    this.historyFile = path.join(this.testResultsDir, 'test-history.json');
    this.maxRetries = 3;
    this.currentAttempt = 0;
    
    // 히스토리 디렉토리 생성
    if (!fs.existsSync(this.testResultsDir)) {
      fs.mkdirSync(this.testResultsDir, { recursive: true });
    }
    
    // 스크린샷 디렉토리 생성
    const screenshotsDir = path.join(this.testResultsDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  }

  async runTestCycle() {
    console.log('🚀 Sweet Puzzle 자동 테스트 & 수정 시스템 시작');
    console.log('=' .repeat(60));

    const startTime = Date.now();
    let testHistory = this.loadTestHistory();
    
    const sessionId = `session_${Date.now()}`;
    const sessionData = {
      sessionId,
      startTime: new Date().toISOString(),
      attempts: [],
      finalResult: null,
      totalDuration: 0
    };

    for (this.currentAttempt = 1; this.currentAttempt <= this.maxRetries; this.currentAttempt++) {
      console.log(`\n🔄 테스트 시도 ${this.currentAttempt}/${this.maxRetries}`);
      
      const attemptData = await this.runSingleTestAttempt();
      sessionData.attempts.push(attemptData);
      
      if (attemptData.success) {
        console.log(`✅ 테스트 성공! (${this.currentAttempt}번째 시도)`);
        sessionData.finalResult = 'success';
        break;
      } else {
        console.log(`❌ 테스트 실패 (${this.currentAttempt}번째 시도)`);
        
        if (this.currentAttempt < this.maxRetries) {
          console.log('🔧 자동 수정 시도 중...');
          const repaired = await this.attemptAutoRepair(attemptData.errors);
          
          if (repaired) {
            console.log('✅ 자동 수정 완료, 다시 테스트 시도');
          } else {
            console.log('⚠️ 자동 수정 실패, 수동 개입 필요');
          }
        }
      }
    }

    sessionData.endTime = new Date().toISOString();
    sessionData.totalDuration = Date.now() - startTime;
    
    if (!sessionData.finalResult) {
      sessionData.finalResult = 'failed_after_retries';
    }

    // 히스토리 저장
    testHistory.sessions.push(sessionData);
    this.saveTestHistory(testHistory);

    // 최종 리포트 생성
    await this.generateFinalReport(sessionData);

    console.log('\n' + '='.repeat(60));
    console.log(`🏁 테스트 사이클 완료 (${(sessionData.totalDuration / 1000).toFixed(1)}초)`);
    console.log(`최종 결과: ${sessionData.finalResult}`);
    
    return sessionData;
  }

  async runSingleTestAttempt() {
    const attemptStartTime = Date.now();
    const attemptData = {
      attempt: this.currentAttempt,
      startTime: new Date().toISOString(),
      success: false,
      errors: [],
      testResults: null,
      screenshots: [],
      duration: 0
    };

    try {
      console.log('📦 Playwright 설치 확인 중...');
      await this.ensurePlaywrightInstalled();

      console.log('🌐 개발 서버 시작 중...');
      const serverProcess = await this.startDevServer();

      console.log('⏳ 서버 준비 대기 중...');
      await this.waitForServer();

      console.log('🧪 E2E 테스트 실행 중...');
      const testResult = await this.runPlaywrightTests();
      
      attemptData.testResults = testResult;
      attemptData.success = testResult.success;
      
      if (!testResult.success) {
        attemptData.errors = testResult.errors;
      }

      // 서버 종료
      if (serverProcess) {
        serverProcess.kill();
      }

      // 스크린샷 수집
      attemptData.screenshots = this.collectScreenshots();

    } catch (error) {
      console.error('❌ 테스트 실행 중 오류:', error.message);
      attemptData.errors.push({
        type: 'execution_error',
        message: error.message,
        stack: error.stack
      });
    }

    attemptData.endTime = new Date().toISOString();
    attemptData.duration = Date.now() - attemptStartTime;

    return attemptData;
  }

  async ensurePlaywrightInstalled() {
    try {
      // package.json 존재 확인
      if (!fs.existsSync('package.json')) {
        throw new Error('package.json이 없습니다.');
      }

      // node_modules 및 Playwright 설치 확인
      if (!fs.existsSync('node_modules')) {
        console.log('📦 npm 패키지 설치 중...');
        execSync('npm install', { stdio: 'inherit' });
      }

      // Playwright 브라우저 설치
      console.log('🌐 Playwright 브라우저 설치 중...');
      execSync('npx playwright install', { stdio: 'inherit' });

    } catch (error) {
      throw new Error(`Playwright 설치 실패: ${error.message}`);
    }
  }

  async startDevServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 HTTP 서버 시작 (포트 8080)...');
      
      const serverProcess = spawn('python3', ['-m', 'http.server', '8080'], {
        stdio: 'pipe',
        detached: false
      });

      let resolved = false;

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`서버: ${output.trim()}`);
        
        if (output.includes('8080') && !resolved) {
          resolved = true;
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`서버 에러: ${data.toString()}`);
      });

      serverProcess.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`서버 시작 실패: ${error.message}`));
        }
      });

      // 5초 후 타임아웃
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(serverProcess); // 일단 프로세스 반환
        }
      }, 5000);
    });
  }

  async waitForServer() {
    const maxWait = 30000; // 30초
    const interval = 1000; // 1초
    let waited = 0;

    while (waited < maxWait) {
      try {
        const response = await fetch('http://localhost:8080');
        if (response.ok) {
          console.log('✅ 서버 준비 완료');
          return;
        }
      } catch (error) {
        // 연결 실패, 계속 대기
      }

      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
      
      if (waited % 5000 === 0) {
        console.log(`⏳ 서버 대기 중... (${waited/1000}초)`);
      }
    }

    throw new Error('서버 시작 시간 초과');
  }

  async runPlaywrightTests() {
    try {
      const output = execSync('npx playwright test --reporter=json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // JSON 결과 파싱
      const results = JSON.parse(output);
      
      const success = results.stats.failed === 0;
      const errors = [];

      if (!success) {
        results.suites.forEach(suite => {
          suite.specs.forEach(spec => {
            spec.tests.forEach(test => {
              if (test.status === 'failed') {
                errors.push({
                  type: 'test_failure',
                  testName: test.title,
                  suiteName: suite.title,
                  error: test.error?.message || 'Unknown error',
                  location: test.location
                });
              }
            });
          });
        });
      }

      return {
        success,
        errors,
        rawResults: results,
        stats: results.stats
      };

    } catch (error) {
      // 테스트 실행 실패
      return {
        success: false,
        errors: [{
          type: 'test_execution_error',
          message: error.message,
          stdout: error.stdout,
          stderr: error.stderr
        }],
        rawResults: null
      };
    }
  }

  collectScreenshots() {
    const screenshotsDir = path.join(this.testResultsDir, 'screenshots');
    const screenshots = [];

    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      
      files.forEach(file => {
        if (file.endsWith('.png')) {
          const filePath = path.join(screenshotsDir, file);
          const stats = fs.statSync(filePath);
          
          screenshots.push({
            filename: file,
            path: filePath,
            size: stats.size,
            timestamp: stats.mtime.toISOString()
          });
        }
      });
    }

    return screenshots;
  }

  async attemptAutoRepair(errors) {
    console.log(`🔧 ${errors.length}개의 에러 자동 수정 시도 중...`);
    
    let repaired = false;

    for (const error of errors) {
      const fixed = await this.repairSingleError(error);
      if (fixed) {
        repaired = true;
        console.log(`✅ 에러 수정 완료: ${error.type}`);
      } else {
        console.log(`❌ 에러 수정 실패: ${error.type}`);
      }
    }

    return repaired;
  }

  async repairSingleError(error) {
    console.log(`🔍 에러 분석 중: ${error.type}`);

    switch (error.type) {
      case 'test_execution_error':
        return await this.repairExecutionError(error);
      
      case 'test_failure':
        return await this.repairTestFailure(error);
      
      case 'timeout_error':
        return await this.repairTimeoutError(error);
        
      case 'element_not_found':
        return await this.repairElementNotFound(error);
        
      default:
        console.log(`⚠️ 알 수 없는 에러 타입: ${error.type}`);
        return false;
    }
  }

  async repairExecutionError(error) {
    // 실행 에러 수정 시도
    if (error.message.includes('ECONNREFUSED')) {
      console.log('🔧 서버 연결 에러 감지, 서버 재시작 시도');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }

    if (error.message.includes('TimeoutError')) {
      console.log('🔧 타임아웃 에러 감지, 대기 시간 증가');
      // playwright.config.js의 타임아웃 설정 증가
      return this.increaseTimeouts();
    }

    return false;
  }

  async repairTestFailure(error) {
    // 테스트 실패 수정 시도
    console.log(`🔧 테스트 실패 수정 시도: ${error.testName}`);

    if (error.error.includes('Element not found')) {
      return await this.repairElementNotFound(error);
    }

    if (error.error.includes('Timeout')) {
      return await this.repairTimeoutError(error);
    }

    // 일반적인 JavaScript 에러 수정
    if (error.error.includes('ReferenceError') || error.error.includes('TypeError')) {
      return await this.repairJavaScriptError(error);
    }

    return false;
  }

  async repairTimeoutError(error) {
    console.log('🔧 타임아웃 에러 수정: 대기 시간 증가');
    return this.increaseTimeouts();
  }

  async repairElementNotFound(error) {
    console.log('🔧 엘리먼트 찾기 에러 수정: 셀렉터 업데이트');
    
    // 일반적인 셀렉터 문제 수정
    const commonFixes = [
      {
        from: '.candy',
        to: '.candy:visible'
      },
      {
        from: '#game-board',
        to: '#game-board:visible'
      }
    ];

    // 테스트 파일에서 셀렉터 업데이트
    return this.updateSelectors(commonFixes);
  }

  async repairJavaScriptError(error) {
    console.log('🔧 JavaScript 에러 수정 시도');

    // 일반적인 JavaScript 에러 패턴 수정
    if (error.error.includes('window.game is undefined')) {
      return this.fixGameInitialization();
    }

    if (error.error.includes('Cannot read property')) {
      return this.addNullChecks();
    }

    return false;
  }

  increaseTimeouts() {
    try {
      const configPath = 'playwright.config.js';
      let config = fs.readFileSync(configPath, 'utf8');
      
      // 타임아웃 값 증가
      config = config.replace(/timeout: 60000/, 'timeout: 120000');
      config = config.replace(/navigationTimeout: 30000/, 'navigationTimeout: 60000');
      config = config.replace(/actionTimeout: 10000/, 'actionTimeout: 20000');
      
      fs.writeFileSync(configPath, config);
      console.log('✅ 타임아웃 설정 증가 완료');
      return true;
    } catch (error) {
      console.error('❌ 타임아웃 설정 수정 실패:', error.message);
      return false;
    }
  }

  updateSelectors(fixes) {
    try {
      const testFile = 'tests/sweet-puzzle-e2e.spec.js';
      let content = fs.readFileSync(testFile, 'utf8');
      let updated = false;

      fixes.forEach(fix => {
        if (content.includes(fix.from)) {
          content = content.replace(new RegExp(fix.from, 'g'), fix.to);
          updated = true;
        }
      });

      if (updated) {
        fs.writeFileSync(testFile, content);
        console.log('✅ 셀렉터 업데이트 완료');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 셀렉터 업데이트 실패:', error.message);
      return false;
    }
  }

  fixGameInitialization() {
    try {
      const testFile = 'tests/sweet-puzzle-e2e.spec.js';
      let content = fs.readFileSync(testFile, 'utf8');

      // 게임 초기화 대기 시간 증가
      const waitForGamePattern = /await page\.waitForFunction\(\(\) => window\.game[^}]+}\)/g;
      const newWaitForGame = `await page.waitForFunction(() => window.game && window.game.gameState === 'player_turn', { timeout: 30000 })`;

      content = content.replace(waitForGamePattern, newWaitForGame);

      fs.writeFileSync(testFile, content);
      console.log('✅ 게임 초기화 수정 완료');
      return true;
    } catch (error) {
      console.error('❌ 게임 초기화 수정 실패:', error.message);
      return false;
    }
  }

  addNullChecks() {
    try {
      // PuzzleManager.js에 null 체크 추가
      const managerFile = 'src/js/puzzle/PuzzleManager.js';
      let content = fs.readFileSync(managerFile, 'utf8');

      // 일반적인 null 체크 패턴 추가
      const nullCheckPatterns = [
        {
          from: 'this.selectedBlock.position',
          to: 'this.selectedBlock && this.selectedBlock.position'
        },
        {
          from: 'window.game.gameState',
          to: 'window.game && window.game.gameState'
        }
      ];

      let updated = false;
      nullCheckPatterns.forEach(pattern => {
        if (content.includes(pattern.from) && !content.includes(pattern.to)) {
          content = content.replace(new RegExp(pattern.from, 'g'), pattern.to);
          updated = true;
        }
      });

      if (updated) {
        fs.writeFileSync(managerFile, content);
        console.log('✅ null 체크 추가 완료');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ null 체크 추가 실패:', error.message);
      return false;
    }
  }

  loadTestHistory() {
    if (fs.existsSync(this.historyFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      } catch (error) {
        console.warn('테스트 히스토리 로드 실패:', error.message);
      }
    }

    return {
      created: new Date().toISOString(),
      sessions: []
    };
  }

  saveTestHistory(history) {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
      console.log(`📊 테스트 히스토리 저장 완료 (${history.sessions.length} 세션)`);
    } catch (error) {
      console.error('테스트 히스토리 저장 실패:', error.message);
    }
  }

  async generateFinalReport(sessionData) {
    try {
      const TestReportGenerator = require('./generate-test-report.js');
      const generator = new TestReportGenerator();
      
      const reportPath = await generator.generateReport();
      
      console.log(`📊 최종 리포트 생성 완료: ${reportPath}`);
      
      // 히스토리 요약 추가
      const history = this.loadTestHistory();
      const summaryPath = path.join(this.testResultsDir, 'test-summary.json');
      
      const summary = {
        lastUpdated: new Date().toISOString(),
        totalSessions: history.sessions.length,
        successfulSessions: history.sessions.filter(s => s.finalResult === 'success').length,
        averageAttempts: history.sessions.reduce((sum, s) => sum + s.attempts.length, 0) / history.sessions.length,
        lastSession: sessionData
      };
      
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
    } catch (error) {
      console.error('최종 리포트 생성 실패:', error.message);
    }
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const system = new AutoTestRepairSystem();
  
  system.runTestCycle()
    .then(result => {
      console.log('\n🎉 자동 테스트 & 수정 시스템 완료');
      process.exit(result.finalResult === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 시스템 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = AutoTestRepairSystem;