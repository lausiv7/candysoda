// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // WindWalker 테스트는 순차 실행
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['line']
  ],
  use: {
    // Global test settings
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    headless: false, // 스크린샷 캡처를 위해 headless 비활성화
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 시스템 설치된 Chromium 사용 시도
        channel: 'chromium',
        executablePath: '/google/idx/builtins/bin/chromium',
        // 추가 안전 인수
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--single-process'
        ]
      },
    }
  ],

  // Docker에서 실행 중인 Code Server 사용
  webServer: {
    command: 'echo "Docker 컨테이너 확인 중..." && docker ps | grep windwalker-ide',
    port: 8080,
    timeout: 10000,
    reuseExistingServer: true,
  },
});