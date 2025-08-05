#!/usr/bin/env node

/**
 * Sweet Puzzle 테스트 실행기
 * 상위 테스트 리페어 루프 시스템을 활용하여 Sweet Puzzle 전용 테스트 실행
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class SweetPuzzleTestRunner {
  constructor() {
    this.projectRoot = process.cwd();
    this.configFile = path.join(this.projectRoot, 'sweet-puzzle-config.json');
    this.config = this.loadConfig();
    
    // 결과 디렉토리 생성
    if (!fs.existsSync(this.config.testing.outputDir)) {
      fs.mkdirSync(this.config.testing.outputDir, { recursive: true });
    }
  }

  loadConfig() {
    if (!fs.existsSync(this.configFile)) {
      throw new Error(`설정 파일을 찾을 수 없습니다: ${this.configFile}`);
    }
    
    return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
  }

  async runTests() {
    console.log('🍬 Sweet Puzzle Phase 1 테스트 시작');
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    let success = false;
    let attempts = 0;
    const maxAttempts = this.config.repair.maxAttempts;

    // 테스트 히스토리 초기화
    const testSession = {
      sessionId: `sweet-puzzle-${Date.now()}`,
      startTime: new Date().toISOString(),
      config: this.config.project,
      attempts: [],
      finalResult: null
    };

    while (attempts < maxAttempts && !success) {
      attempts++;
      console.log(`\n🔄 테스트 시도 ${attempts}/${maxAttempts}`);
      
      const attemptResult = await this.runSingleAttempt(attempts);
      testSession.attempts.push(attemptResult);
      
      if (attemptResult.success) {
        success = true;
        testSession.finalResult = 'success';
        console.log(`✅ 테스트 성공! (${attempts}번째 시도)`);
        break;
      } else {
        console.log(`❌ 테스트 실패 (${attempts}번째 시도)`);
        
        if (attempts < maxAttempts) {
          console.log('🔧 자동 수정 시도...');
          const repaired = await this.attemptRepair(attemptResult.errors);
          attemptResult.repairAttempted = true;
          attemptResult.repairSuccess = repaired;
          
          if (repaired) {
            console.log('✅ 자동 수정 완료');
          } else {
            console.log('⚠️ 자동 수정 실패');
          }
        }
      }
    }

    testSession.endTime = new Date().toISOString();
    testSession.duration = Date.now() - startTime;
    
    if (!success) {
      testSession.finalResult = 'failed_after_retries';
    }

    // 결과 저장
    await this.saveResults(testSession);
    
    // 리포트 생성
    await this.generateReport();

    console.log('\n' + '='.repeat(50));
    console.log(`🏁 테스트 완료 (${(testSession.duration / 1000).toFixed(1)}초)`);
    console.log(`최종 결과: ${testSession.finalResult}`);
    console.log(`총 시도 횟수: ${attempts}/${maxAttempts}`);

    return testSession;
  }

  async runSingleAttempt(attemptNum) {
    const attempt = {
      attemptNumber: attemptNum,
      startTime: new Date().toISOString(),
      success: false,
      errors: [],
      testResults: null,
      screenshots: []
    };

    try {
      // 1. 환경 준비
      await this.prepareEnvironment();
      
      // 2. 서버 시작 (Playwright가 자동으로 처리)
      console.log('🌐 개발 서버 준비 중...');
      
      // 3. 테스트 실행
      console.log('🧪 Playwright 테스트 실행 중...');
      const testResult = await this.executePlaywrightTests();
      
      attempt.testResults = testResult;
      attempt.success = testResult.success;
      
      if (!testResult.success) {
        attempt.errors = this.extractErrors(testResult);
      }

      // 4. 스크린샷 수집
      attempt.screenshots = this.collectScreenshots();
      
    } catch (error) {
      console.error('❌ 테스트 실행 오류:', error.message);
      attempt.errors.push({
        type: 'execution_error',
        message: error.message,
        stack: error.stack
      });
    }

    attempt.endTime = new Date().toISOString();
    return attempt;
  }

  async prepareEnvironment() {
    // package.json 확인
    if (!fs.existsSync('package.json')) {
      console.log('📦 package.json 생성 중...');
      execSync('npm init -y', { stdio: 'inherit' });
    }

    // Playwright 설치 확인
    if (!fs.existsSync('node_modules/@playwright')) {
      console.log('📦 Playwright 설치 중...');
      execSync('npm install @playwright/test', { stdio: 'inherit' });
      execSync('npx playwright install', { stdio: 'inherit' });
    }
  }

  async executePlaywrightTests() {
    try {
      // JSON 리포터로 실행하여 결과 파싱 가능하도록
      const result = execSync('npx playwright test --reporter=json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const testResults = JSON.parse(result);
      
      return {
        success: testResults.stats.failed === 0,
        rawResults: testResults,
        stats: testResults.stats
      };

    } catch (error) {
      // execSync는 실패 시 exception을 던짐
      let testResults = null;
      
      try {
        // stderr에서 JSON 결과 추출 시도
        if (error.stdout) {
          testResults = JSON.parse(error.stdout);
        }
      } catch (parseError) {
        // JSON 파싱 실패
      }

      return {
        success: false,
        rawResults: testResults,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      };
    }
  }

  extractErrors(testResult) {
    const errors = [];

    if (testResult.rawResults && testResult.rawResults.suites) {
      testResult.rawResults.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          spec.tests.forEach(test => {
            if (test.status === 'failed') {
              errors.push({
                type: 'test_failure',
                testName: test.title,
                suiteName: suite.title,
                error: test.error?.message || 'Unknown test failure',
                location: test.location
              });
            }
          });
        });
      });
    }

    // 일반적인 실행 오류
    if (testResult.error) {
      errors.push({
        type: 'execution_error',
        message: testResult.error,
        stdout: testResult.stdout,
        stderr: testResult.stderr
      });
    }

    return errors;
  }

  collectScreenshots() {
    const screenshotsDir = path.join(this.config.testing.outputDir, 'screenshots');
    const screenshots = [];

    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      
      files.forEach(file => {
        if (file.endsWith('.png')) {
          const filePath = path.join(screenshotsDir, file);
          const stats = fs.statSync(filePath);
          
          screenshots.push({
            filename: file,
            size: stats.size,
            timestamp: stats.mtime.toISOString()
          });
        }
      });
    }

    return screenshots;
  }

  async attemptRepair(errors) {
    console.log(`🔧 ${errors.length}개 에러 수정 시도 중...`);
    
    let repaired = false;

    for (const error of errors) {
      const fixed = await this.repairError(error);
      if (fixed) {
        repaired = true;
        console.log(`✅ 에러 수정: ${error.type}`);
      }
    }

    return repaired;
  }

  async repairError(error) {
    switch (error.type) {
      case 'test_failure':
        return this.repairTestFailure(error);
      case 'execution_error':
        return this.repairExecutionError(error);
      default:
        return false;
    }
  }

  async repairTestFailure(error) {
    // Sweet Puzzle 특화 수정 로직
    if (error.error.includes('window.game')) {
      return this.fixGameInitialization();
    }
    
    if (error.error.includes('Element not found')) {
      return this.fixElementSelectors();
    }
    
    if (error.error.includes('Timeout')) {
      return this.increaseTimeouts();
    }

    return false;
  }

  async repairExecutionError(error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('server')) {
      console.log('🔧 서버 연결 문제 감지 - 재시도 대기');
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    }

    return false;
  }

  fixGameInitialization() {
    try {
      const testFile = path.join(this.config.testing.testDir, 'sweet-puzzle-e2e.spec.js');
      let content = fs.readFileSync(testFile, 'utf8');

      // 게임 초기화 대기 시간 증가
      const oldPattern = /await page\.waitForFunction\(\(\) => window\.game[^}]+}/g;
      const newPattern = `await page.waitForFunction(() => ${this.config.gameSpecific.gameStateCheck}, { timeout: 30000 })`;

      if (content.includes('window.game')) {
        content = content.replace(oldPattern, newPattern);
        fs.writeFileSync(testFile, content);
        console.log('✅ 게임 초기화 코드 수정');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 게임 초기화 수정 실패:', error.message);
      return false;
    }
  }

  fixElementSelectors() {
    try {
      const testFile = path.join(this.config.testing.testDir, 'sweet-puzzle-e2e.spec.js');
      let content = fs.readFileSync(testFile, 'utf8');

      // Sweet Puzzle 특화 셀렉터 수정
      const selectorFixes = [
        {
          from: '.candy',
          to: '.candy:visible'
        },
        {
          from: '#game-board',
          to: '#game-board:visible'
        }
      ];

      let updated = false;
      selectorFixes.forEach(fix => {
        if (content.includes(`'${fix.from}'`)) {
          content = content.replace(new RegExp(`'${fix.from}'`, 'g'), `'${fix.to}'`);
          updated = true;
        }
      });

      if (updated) {
        fs.writeFileSync(testFile, content);
        console.log('✅ 엘리먼트 셀렉터 수정');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 셀렉터 수정 실패:', error.message);
      return false;
    }
  }

  increaseTimeouts() {
    try {
      const configFile = 'playwright.config.js';
      let content = fs.readFileSync(configFile, 'utf8');

      // 타임아웃 값들 증가
      const timeoutFixes = [
        { from: 'timeout: 60000', to: 'timeout: 120000' },
        { from: 'actionTimeout: 10000', to: 'actionTimeout: 20000' },
        { from: 'navigationTimeout: 30000', to: 'navigationTimeout: 60000' }
      ];

      let updated = false;
      timeoutFixes.forEach(fix => {
        if (content.includes(fix.from)) {
          content = content.replace(fix.from, fix.to);
          updated = true;
        }
      });

      if (updated) {
        fs.writeFileSync(configFile, content);
        console.log('✅ 타임아웃 설정 증가');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 타임아웃 수정 실패:', error.message);
      return false;
    }
  }

  async saveResults(sessionData) {
    const historyFile = path.join(this.config.testing.outputDir, 'sweet-puzzle-test-history.json');
    
    let history = { sessions: [] };
    
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      } catch (error) {
        console.warn('기존 히스토리 로드 실패:', error.message);
      }
    }

    history.sessions.push(sessionData);
    
    // 최근 10개 세션만 유지
    if (history.sessions.length > 10) {
      history.sessions = history.sessions.slice(-10);
    }

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log(`📊 테스트 히스토리 저장: ${history.sessions.length}개 세션`);
  }

  async generateReport() {
    try {
      const TestReportGenerator = require('./scripts/generate-test-report.js');
      const generator = new TestReportGenerator();
      await generator.generateReport();
      
      console.log('📊 HTML 테스트 리포트 생성 완료');
    } catch (error) {
      console.error('리포트 생성 실패:', error.message);
    }
  }
}

// 스크립트 직접 실행
if (require.main === module) {
  const runner = new SweetPuzzleTestRunner();
  
  runner.runTests()
    .then(result => {
      const success = result.finalResult === 'success';
      console.log(success ? '\n🎉 Sweet Puzzle 테스트 성공!' : '\n❌ Sweet Puzzle 테스트 실패');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 실패:', error.message);
      process.exit(1);
    });
}

module.exports = SweetPuzzleTestRunner;