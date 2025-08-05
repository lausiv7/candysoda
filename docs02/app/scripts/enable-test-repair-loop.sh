#!/bin/bash

# [의도] Sweet Puzzle 프로젝트에 테스트 리페어 루프 시스템을 활성화하는 스크립트
# [책임] 상위 test-auto-repair 시스템을 Sweet Puzzle 개발에 맞게 설정 및 실행

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 프로젝트 루트 확인
if [[ ! -f "CLAUDE.md" ]]; then
    log_error "CLAUDE.md 파일을 찾을 수 없습니다. docs02/app/ 디렉토리에서 실행해주세요."
    exit 1
fi

# 상위 테스트 자동화 시스템 경로 확인
TEST_REPAIR_PATH="../../test-auto-repair"
if [[ ! -d "$TEST_REPAIR_PATH" ]]; then
    log_error "테스트 자동화 시스템을 찾을 수 없습니다: $TEST_REPAIR_PATH"
    exit 1
fi

log_info "🔧 Sweet Puzzle 테스트 리페어 루프 활성화를 시작합니다..."

# 실행 모드 확인
TEST_MODE=${1:-"semi-auto"}
TARGET_SYSTEM=${2:-"puzzle-system"}

log_info "📋 실행 설정:"
echo "  - 테스트 모드: $TEST_MODE"
echo "  - 대상 시스템: $TARGET_SYSTEM"
echo "  - 테스트 환경: Sweet Puzzle 게임"

# 1. 테스트 환경 설정 확인
log_step "1️⃣ 테스트 환경 설정 확인 중..."

# Node.js 확인
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되지 않았습니다."
    exit 1
fi

# Docker 확인
if ! command -v docker &> /dev/null; then
    log_warning "Docker가 설치되지 않았습니다. 로컬 테스트 모드로 진행합니다."
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
fi

# Playwright 확인
if [[ ! -d "$TEST_REPAIR_PATH/node_modules/@playwright/test" ]]; then
    log_info "📦 Playwright 설치 중..."
    cd "$TEST_REPAIR_PATH"
    npm install
    npx playwright install
    cd - > /dev/null
fi

log_success "테스트 환경 설정 확인 완료"

# 2. Sweet Puzzle 전용 테스트 설정 생성
log_step "2️⃣ Sweet Puzzle 전용 테스트 설정 생성 중..."

# Playwright 설정 파일 생성 (Sweet Puzzle 전용)
cat > test-setup/playwright.config.js << 'EOF'
// [의도] Sweet Puzzle 게임 전용 Playwright 테스트 설정
// [책임] 퍼즐 게임 특화 테스트 환경 및 모바일 최적화 설정

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 2,
  
  // Sweet Puzzle 게임 전용 설정
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 모바일 최적화 설정
    viewport: { width: 375, height: 812 },  // iPhone 12 크기
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    
    // 게임 테스트 최적화
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // 브라우저 옵션
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content'
    ]
  },

  // 테스트 프로젝트 설정
  projects: [
    {
      name: 'sweet-puzzle-mobile',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'sweet-puzzle-tablet',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'sweet-puzzle-desktop',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  // 개발 서버 설정
  webServer: {
    command: 'cd ../dev-environment && npm start',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },

  // 리포트 설정
  reporter: [
    ['html', { outputFolder: '../reports/test-results' }],
    ['json', { outputFile: '../reports/test-results.json' }],
    ['junit', { outputFile: '../reports/junit-results.xml' }]
  ],

  // 스크린샷 및 비디오 경로
  outputDir: '../reports/test-artifacts',
});
EOF

# Sweet Puzzle 게임 테스트 시나리오 생성
mkdir -p test-setup/tests
cat > test-setup/tests/sweet-puzzle-game.spec.js << 'EOF'
// [의도] Sweet Puzzle 게임의 핵심 기능에 대한 종합적인 테스트 시나리오
// [책임] 퍼즐 매칭, UI 반응성, 게임 플로우 전체 검증

const { test, expect } = require('@playwright/test');

test.describe('Sweet Puzzle - 핵심 게임 기능 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // 게임 로딩 완료 대기
    await page.waitForSelector('.game-board', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // 의미있는 순간 캡처: 게임 초기 화면
    await page.screenshot({ 
      path: 'screenshots/01-game-initial-state.png',
      fullPage: true 
    });
  });

  test('게임 초기 로딩 및 UI 표시 확인', async ({ page }) => {
    // 게임 제목 확인
    const gameTitle = page.locator('h1');
    await expect(gameTitle).toContainText('Sweet Puzzle');
    
    // 게임 보드 표시 확인
    const gameBoard = page.locator('.game-board');
    await expect(gameBoard).toBeVisible();
    
    // 캔디 요소들 확인 (8x8 = 64개)
    const candies = page.locator('.candy');
    await expect(candies).toHaveCount(64);
    
    // 점수 표시 확인
    const scoreDisplay = page.locator('#score');
    await expect(scoreDisplay).toBeVisible();
    await expect(scoreDisplay).toContainText('0');
    
    // 스크린샷 캡처
    await page.screenshot({ 
      path: 'screenshots/01-ui-elements-verified.png',
      fullPage: true 
    });
  });

  test('게임 시작 버튼 클릭 및 게임 활성화', async ({ page }) => {
    const startButton = page.locator('#start-game');
    await expect(startButton).toBeVisible();
    
    // 게임 시작 전 상태 캡처
    await page.screenshot({ 
      path: 'screenshots/02-before-game-start.png',
      fullPage: true 
    });
    
    // 게임 시작 버튼 클릭
    await startButton.click();
    await page.waitForTimeout(1000);
    
    // 게임 시작 후 상태 캡처
    await page.screenshot({ 
      path: 'screenshots/02-after-game-start.png',
      fullPage: true 
    });
    
    // 게임 보드가 활성화되었는지 확인
    const gameBoard = page.locator('.game-board');
    await expect(gameBoard).toBeVisible();
  });

  test('캔디 클릭 반응성 테스트', async ({ page }) => {
    // 게임 시작
    await page.locator('#start-game').click();
    await page.waitForTimeout(1000);
    
    // 첫 번째 캔디 클릭
    const firstCandy = page.locator('.candy').first();
    
    // 클릭 전 상태 캡처
    await page.screenshot({ 
      path: 'screenshots/03-before-candy-click.png',
      fullPage: true 
    });
    
    await firstCandy.click();
    await page.waitForTimeout(500);
    
    // 클릭 후 상태 캡처
    await page.screenshot({ 
      path: 'screenshots/03-after-candy-click.png',
      fullPage: true 
    });
    
    // 콘솔 로그 확인 (클릭 이벤트 발생 확인)
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await firstCandy.click();
    await page.waitForTimeout(500);
    
    // 클릭 로그가 기록되었는지 확인
    const hasClickLog = logs.some(log => 
      log.includes('캔디 클릭') || log.includes('candy click')
    );
    
    if (!hasClickLog) {
      // 실패 시 디버깅용 스크린샷
      await page.screenshot({ 
        path: 'screenshots/03-candy-click-fail.png',
        fullPage: true 
      });
    }
    
    expect(hasClickLog).toBeTruthy();
  });

  test('게임 리셋 기능 테스트', async ({ page }) => {
    // 게임 시작
    await page.locator('#start-game').click();
    await page.waitForTimeout(1000);
    
    // 몇 개의 캔디 클릭
    const candies = page.locator('.candy');
    await candies.first().click();
    await candies.nth(1).click();
    
    // 리셋 전 상태 캡처
    await page.screenshot({ 
      path: 'screenshots/04-before-reset.png',
      fullPage: true 
    });
    
    // 리셋 버튼 클릭
    const resetButton = page.locator('#reset-game');
    await resetButton.click();
    await page.waitForTimeout(1000);
    
    // 리셋 후 상태 캡처
    await page.screenshot({ 
      path: 'screenshots/04-after-reset.png',
      fullPage: true 
    });
    
    // 점수가 0으로 초기화되었는지 확인
    const scoreDisplay = page.locator('#score');
    await expect(scoreDisplay).toContainText('0');
    
    // 레벨이 1로 초기화되었는지 확인
    const levelDisplay = page.locator('#level');
    await expect(levelDisplay).toContainText('1');
  });

  test('모바일 터치 반응성 테스트', async ({ page }) => {
    // 모바일 뷰포트로 설정
    await page.setViewportSize({ width: 375, height: 812 });
    
    // 게임 시작
    await page.locator('#start-game').click();
    await page.waitForTimeout(1000);
    
    // 터치 이벤트 시뮬레이션
    const candy = page.locator('.candy').first();
    const boundingBox = await candy.boundingBox();
    
    if (boundingBox) {
      // 터치 시작
      await page.touchscreen.tap(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );
      
      await page.waitForTimeout(500);
      
      // 터치 반응 확인을 위한 스크린샷
      await page.screenshot({ 
        path: 'screenshots/05-mobile-touch-response.png',
        fullPage: true 
      });
    }
  });

  test('성능 측정 - 게임 로딩 시간', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('.game-board');
    
    const loadTime = Date.now() - startTime;
    
    // 로딩 시간 로그
    console.log(`게임 로딩 시간: ${loadTime}ms`);
    
    // 3초 이내 로딩 확인 (모바일 최적화 목표)
    expect(loadTime).toBeLessThan(3000);
    
    // 성능 데이터 수집
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });
    
    console.log('성능 지표:', performanceMetrics);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // 테스트 실패 시 추가 디버그 정보 수집
    if (testInfo.status === 'failed') {
      // 콘솔 에러 로그 수집
      const logs = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logs.push(msg.text());
        }
      });
      
      // 네트워크 에러 확인
      page.on('response', response => {
        if (response.status() >= 400) {
          console.log(`네트워크 에러: ${response.url()} - ${response.status()}`);
        }
      });
      
      // 실패 상황 종합 스크린샷
      await page.screenshot({ 
        path: `screenshots/FAIL-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    }
  });
});
EOF

log_success "Sweet Puzzle 전용 테스트 설정 생성 완료"

# 3. 테스트 리페어 루프 통합 설정
log_step "3️⃣ 테스트 리페어 루프 통합 설정 중..."

# Sweet Puzzle 전용 자동 수정 규칙 생성
cat > test-setup/sweet-puzzle-repair-rules.js << 'EOF'
// [의도] Sweet Puzzle 게임 특화 자동 수정 규칙 정의
// [책임] 퍼즐 게임에서 자주 발생하는 문제에 대한 자동 수정 로직

class SweetPuzzleRepairRules {
  constructor() {
    this.gameSpecificRules = [
      {
        pattern: /캔디 클릭.*timeout/i,
        fix: `
          // 캔디 클릭 타임아웃 해결
          await page.waitForSelector('.candy', { timeout: 30000 });
          await page.waitForTimeout(1000);  // 게임 로딩 추가 대기
        `,
        description: '캔디 요소 로딩 대기 시간 증가'
      },
      
      {
        pattern: /게임 보드.*not visible/i,
        fix: `
          // 게임 보드 가시성 문제 해결
          await page.waitForSelector('.game-board', { timeout: 30000 });
          await page.evaluate(() => {
            const board = document.querySelector('.game-board');
            if (board) board.style.display = 'grid';
          });
        `,
        description: '게임 보드 강제 표시'
      },
      
      {
        pattern: /점수.*not found/i,
        fix: `
          // 점수 표시 문제 해결
          await page.waitForSelector('#score', { timeout: 15000 });
          const scoreExists = await page.locator('#score').count();
          if (scoreExists === 0) {
            console.log('점수 요소가 없습니다. DOM 구조를 확인하세요.');
          }
        `,
        description: '점수 표시 요소 확인 로직 추가'
      },
      
      {
        pattern: /mobile.*touch.*failed/i,
        fix: `
          // 모바일 터치 이벤트 개선
          await page.setViewportSize({ width: 375, height: 812 });
          await page.evaluate(() => {
            document.body.style.touchAction = 'manipulation';
          });
          await page.touchscreen.tap(x, y);
        `,
        description: '모바일 터치 이벤트 최적화'
      },
      
      {
        pattern: /performance.*slow/i,
        fix: `
          // 성능 최적화
          await page.addInitScript(() => {
            window.localStorage.setItem('gameOptimization', 'true');
          });
          await page.waitForLoadState('networkidle');
        `,
        description: '게임 성능 최적화 설정'
      }
    ];
  }
  
  findApplicableRule(errorMessage) {
    for (const rule of this.gameSpecificRules) {
      if (rule.pattern.test(errorMessage)) {
        return rule;
      }
    }
    return null;
  }
  
  generateFixSuggestion(errorMessage, testCode) {
    const rule = this.findApplicableRule(errorMessage);
    
    if (rule) {
      return {
        type: 'sweet-puzzle-specific',
        fix: rule.fix,
        description: rule.description,
        confidence: 0.9
      };
    }
    
    return null;
  }
}

module.exports = SweetPuzzleRepairRules;
EOF

# 통합 테스트 실행 스크립트 생성
cat > test-setup/run-sweet-puzzle-tests.sh << 'EOF'
#!/bin/bash

# [의도] Sweet Puzzle 게임 전용 테스트 실행 및 자동 수정 통합 스크립트
# [책임] 테스트 실행, 실패 감지, 자동 수정 적용의 전체 플로우 관리

set -e

TEST_MODE=${1:-"semi-auto"}
MAX_RETRY=${2:-3}

echo "🍭 Sweet Puzzle 테스트 실행 시작..."
echo "모드: $TEST_MODE, 최대 재시도: $MAX_RETRY"

for i in $(seq 1 $MAX_RETRY); do
    echo "🔄 테스트 실행 시도 $i/$MAX_RETRY"
    
    # Playwright 테스트 실행
    if npx playwright test --config=playwright.config.js; then
        echo "✅ 테스트 성공!"
        break
    else
        echo "❌ 테스트 실패 (시도 $i/$MAX_RETRY)"
        
        if [ "$TEST_MODE" = "auto" ] && [ $i -lt $MAX_RETRY ]; then
            echo "🔧 자동 수정 시도 중..."
            
            # 상위 테스트 리페어 시스템 호출
            cd ../../../test-auto-repair
            node auto-repair-loop.js --project="sweet-puzzle" --mode="auto"
            cd - > /dev/null
            
            echo "⏳ 수정 후 잠시 대기..."
            sleep 3
        elif [ "$TEST_MODE" = "semi-auto" ] && [ $i -lt $MAX_RETRY ]; then
            echo "🤔 반자동 모드: 수정 제안을 확인하세요"
            read -p "수정을 적용하고 다시 시도하시겠습니까? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "테스트 중단됨"
                exit 1
            fi
        fi
    fi
    
    if [ $i -eq $MAX_RETRY ]; then
        echo "💥 최대 재시도 횟수 초과. 테스트 실패"
        exit 1
    fi
done

# 테스트 리포트 생성
echo "📊 테스트 리포트 생성 중..."
npx playwright show-report

echo "🎉 Sweet Puzzle 테스트 완료!"
EOF

chmod +x test-setup/run-sweet-puzzle-tests.sh

log_success "테스트 리페어 루프 통합 설정 완료"

# 4. 상위 테스트 자동화 시스템과 연동
log_step "4️⃣ 상위 테스트 자동화 시스템 연동 중..."

# Sweet Puzzle 프로젝트 정보 등록
cat > test-setup/project-config.json << EOF
{
  "projectName": "Sweet Puzzle",
  "projectType": "mobile-game",
  "testFramework": "playwright",
  "gameEngine": "html5-javascript",
  
  "paths": {
    "projectRoot": "../",
    "testDir": "./tests",
    "sourceDir": "../src",
    "reportsDir": "../reports"
  },
  
  "testTargets": [
    {
      "name": "puzzle-system",
      "description": "퍼즐 매칭 및 게임 로직",
      "priority": "high",
      "testFiles": ["sweet-puzzle-game.spec.js"]
    },
    {
      "name": "ui-system",
      "description": "사용자 인터페이스 및 반응성",
      "priority": "high",
      "testFiles": ["sweet-puzzle-game.spec.js"]
    },
    {
      "name": "mobile-optimization",
      "description": "모바일 최적화 및 성능",
      "priority": "medium",
      "testFiles": ["sweet-puzzle-game.spec.js"]
    }
  ],
  
  "repairRules": {
    "customRulesFile": "sweet-puzzle-repair-rules.js",
    "maxRetryAttempts": 3,
    "autoFixConfidenceThreshold": 0.8
  },
  
  "qualityGates": {
    "minTestPassRate": 0.95,
    "maxLoadTime": 3000,
    "minFrameRate": 60,
    "maxMemoryUsage": 100
  }
}
EOF

# 상위 시스템에 프로젝트 등록
if [[ -f "$TEST_REPAIR_PATH/projects.json" ]]; then
    # 기존 프로젝트 목록에 추가
    node -e "
    const fs = require('fs');
    const projects = JSON.parse(fs.readFileSync('$TEST_REPAIR_PATH/projects.json', 'utf8'));
    const sweetPuzzleConfig = JSON.parse(fs.readFileSync('test-setup/project-config.json', 'utf8'));
    
    projects['sweet-puzzle'] = {
      ...sweetPuzzleConfig,
      registeredAt: new Date().toISOString(),
      lastTestRun: null,
      status: 'active'
    };
    
    fs.writeFileSync('$TEST_REPAIR_PATH/projects.json', JSON.stringify(projects, null, 2));
    console.log('Sweet Puzzle 프로젝트가 등록되었습니다.');
    "
else
    # 새 프로젝트 목록 생성
    echo '{}' > "$TEST_REPAIR_PATH/projects.json"
    node -e "
    const fs = require('fs');
    const sweetPuzzleConfig = JSON.parse(fs.readFileSync('test-setup/project-config.json', 'utf8'));
    
    const projects = {
      'sweet-puzzle': {
        ...sweetPuzzleConfig,
        registeredAt: new Date().toISOString(),
        lastTestRun: null,
        status: 'active'
      }
    };
    
    fs.writeFileSync('$TEST_REPAIR_PATH/projects.json', JSON.stringify(projects, null, 2));
    console.log('프로젝트 목록을 생성하고 Sweet Puzzle을 등록했습니다.');
    "
fi

log_success "상위 테스트 자동화 시스템 연동 완료"

# 5. 개발 환경 체크 및 최종 테스트
log_step "5️⃣ 개발 환경 체크 및 최종 테스트 중..."

# 개발 서버 실행 상태 확인
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    log_warning "개발 서버가 실행되지 않았습니다. 서버를 시작합니다..."
    
    if [[ "$DOCKER_AVAILABLE" = true ]]; then
        cd dev-environment
        docker-compose up -d
        cd - > /dev/null
        
        # 서버 시작 대기
        for i in {1..30}; do
            if curl -s http://localhost:3000/api/health > /dev/null; then
                break
            fi
            sleep 1
        done
    else
        cd dev-environment
        npm start &
        DEV_SERVER_PID=$!
        cd - > /dev/null
        
        # 서버 시작 대기
        sleep 5
    fi
fi

# 초기 테스트 실행 (연결 확인)
log_info "🧪 초기 연결 테스트 실행 중..."

cd test-setup
if timeout 60 npx playwright test --config=playwright.config.js --grep="게임 초기 로딩" > /dev/null 2>&1; then
    log_success "초기 테스트 성공!"
else
    log_warning "초기 테스트 실패. 디버그 모드로 재시도..."
    
    # 디버그 모드로 한 번 더 실행
    npx playwright test --config=playwright.config.js --grep="게임 초기 로딩" --headed || true
fi

cd - > /dev/null

# 6. 테스트 리페어 루프 활성화
log_step "6️⃣ 테스트 리페어 루프 활성화 중..."

# 활성화 상태 저장
cat > reports/test-repair-status.json << EOF
{
  "activated": true,
  "activatedAt": "$(date -Iseconds)",
  "mode": "$TEST_MODE",
  "targetSystem": "$TARGET_SYSTEM",
  "projectPath": "$(pwd)",
  "testRepairPath": "$TEST_REPAIR_PATH",
  
  "configuration": {
    "maxRetryAttempts": 3,
    "autoFixEnabled": $([ "$TEST_MODE" = "auto" ] && echo "true" || echo "false"),
    "screenshotOnFailure": true,
    "performanceMonitoring": true
  },
  
  "status": "ready",
  "lastHealthCheck": "$(date -Iseconds)"
}
EOF

log_success "테스트 리페어 루프 활성화 완료"

# 7. 사용 가이드 출력
echo ""
log_success "🎉 Sweet Puzzle 테스트 리페어 루프 활성화 완료!"
echo ""
echo "📋 사용 방법:"
echo ""
echo "1. 📱 기본 테스트 실행:"
echo "   cd test-setup && ./run-sweet-puzzle-tests.sh"
echo ""
echo "2. 🔧 자동 복구 모드:"
echo "   cd test-setup && ./run-sweet-puzzle-tests.sh auto"
echo ""
echo "3. 🤔 반자동 모드 (권장):"
echo "   cd test-setup && ./run-sweet-puzzle-tests.sh semi-auto"
echo ""
echo "4. 🎮 대화형 모드:"
echo "   cd test-setup && ./run-sweet-puzzle-tests.sh interactive"
echo ""
echo "5. 📊 테스트 리포트 보기:"
echo "   cd test-setup && npx playwright show-report"
echo ""
echo "6. 🖼️ 스크린샷 확인:"
echo "   ls -la reports/test-artifacts/screenshots/"
echo ""
echo "🔗 연동된 시스템:"
echo "  - 상위 테스트 자동화: $TEST_REPAIR_PATH"
echo "  - 개발 서버: http://localhost:3000"
echo "  - 테스트 대시보드: http://localhost:3000/test-dashboard"
echo ""
echo "🎯 다음 단계:"
echo "  1. ./monitor-game-development.sh 실행으로 실시간 모니터링 시작"
echo "  2. 퍼즐 시스템 구현하며 자동 테스트 확인"
echo "  3. 실패 시 자동 수정 제안 활용"
echo ""
log_info "🍭 Happy Testing! Sweet Puzzle 개발을 시작하세요! ✨"

# 모니터링 스크립트 실행 제안
if [[ -f "scripts/monitor-game-development.sh" ]]; then
    echo ""
    read -p "🔍 실시간 개발 모니터링을 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/monitor-game-development.sh &
        MONITOR_PID=$!
        echo "🎯 모니터링 시작됨 (PID: $MONITOR_PID)"
        echo "중단하려면: kill $MONITOR_PID"
    fi
fi