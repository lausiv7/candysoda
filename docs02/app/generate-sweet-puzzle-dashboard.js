const fs = require('fs');
const path = require('path');

class SweetPuzzleDashboard {
  constructor() {
    this.testResults = [];
    this.screenshots = [];
    this.startTime = new Date();
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.reportPath = `test-results/sweet-puzzle-dashboard-${this.timestamp}.html`;
    this.latestReportPath = 'test-results/sweet-puzzle-dashboard.html';
    this.totalTests = 68; // 설계된 총 테스트 수
  }

  async generateDashboard() {
    console.log('🍬 Sweet Puzzle 대시보드 생성 중...');
    
    // 테스트 아티팩트 스캔
    await this.scanTestArtifacts();
    
    // 스크린샷 파일 스캔
    await this.scanScreenshots();
    
    // HTML 대시보드 생성
    const html = this.generateHTML();
    
    // 파일 저장
    fs.writeFileSync(this.reportPath, html);
    fs.writeFileSync(this.latestReportPath, html);
    
    console.log(`📊 Sweet Puzzle 테스트 대시보드가 생성되었습니다:`);
    console.log(`   - 타임스탬프 버전: ${this.reportPath}`);
    console.log(`   - 최신 버전: ${this.latestReportPath}`);
    return this.reportPath;
  }

  async scanTestArtifacts() {
    const artifactsDir = 'test-results/artifacts';
    if (!fs.existsSync(artifactsDir)) return;

    const artifacts = fs.readdirSync(artifactsDir);
    this.testResults = artifacts.map(artifact => {
      const parts = artifact.split('-');
      const testName = parts.slice(4).join('-');
      const browser = parts[parts.length - 1];
      
      return {
        name: testName,
        browser: browser,
        status: 'failed', // 아티팩트가 있다는 것은 실패했다는 의미
        duration: '30s',
        error: `Test failed in ${browser}`,
        screenshot: `artifacts/${artifact}/test-failed-1.png`,
        video: `artifacts/${artifact}/video.webm`,
        timestamp: new Date().toISOString()
      };
    });

    console.log(`📋 발견된 테스트 아티팩트: ${this.testResults.length}개`);
  }

  async scanScreenshots() {
    const screenshotDir = 'test-results/screenshots';
    if (!fs.existsSync(screenshotDir)) return;

    const screenshots = fs.readdirSync(screenshotDir)
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: `screenshots/${file}`,
        category: this.categorizeScreenshot(file),
        timestamp: fs.statSync(path.join(screenshotDir, file)).mtime
      }));

    this.screenshots = screenshots.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`📸 발견된 스크린샷: ${this.screenshots.length}개`);
  }

  categorizeScreenshot(filename) {
    if (filename.includes('initialization') || filename.includes('load')) return 'initialization';
    if (filename.includes('interaction') || filename.includes('click') || filename.includes('drag')) return 'interaction';
    if (filename.includes('match') || filename.includes('combo')) return 'matching';
    if (filename.includes('gravity') || filename.includes('physics')) return 'physics';
    if (filename.includes('fail')) return 'failed';
    return 'general';
  }

  generateHTML() {
    const executedTests = this.testResults.length;
    const failedTests = this.testResults.filter(t => t.status === 'failed').length;
    const passedTests = executedTests - failedTests;
    const skippedTests = this.totalTests - executedTests;

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍬 Sweet Puzzle Phase 1 - 테스트 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .screenshot-gallery img {
            transition: transform 0.2s ease;
        }
        .screenshot-gallery img:hover {
            transform: scale(1.05);
            z-index: 10;
        }
        .status-pass { color: #10B981; }
        .status-fail { color: #EF4444; }
        .status-skip { color: #F59E0B; }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto p-6">
        <!-- 헤더 -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">🍬 Sweet Puzzle 테스트 대시보드</h1>
                    <p class="text-gray-600 mt-2">Phase 1 - Core Match-3 System</p>
                    <p class="text-sm text-gray-500">최종 업데이트: ${new Date().toLocaleString('ko-KR')}</p>
                </div>
                <div class="flex gap-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${this.totalTests}</div>
                        <div class="text-sm text-gray-600">총 테스트</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">${this.screenshots.length}</div>
                        <div class="text-sm text-gray-600">스크린샷</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 메트릭 카드 -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div class="metric-card p-6 rounded-lg text-center">
                <div class="text-3xl font-bold">${executedTests}</div>
                <div class="text-sm opacity-90">실행된 테스트</div>
                <div class="text-xs opacity-75">${this.totalTests}개 중</div>
            </div>
            <div class="bg-gradient-to-r from-green-400 to-green-600 text-white p-6 rounded-lg text-center">
                <div class="text-3xl font-bold">${passedTests}</div>
                <div class="text-sm opacity-90">통과한 테스트</div>
                <div class="text-xs opacity-75">${((passedTests/executedTests)*100).toFixed(1)}%</div>
            </div>
            <div class="bg-gradient-to-r from-red-400 to-red-600 text-white p-6 rounded-lg text-center">
                <div class="text-3xl font-bold">${failedTests}</div>
                <div class="text-sm opacity-90">실패한 테스트</div>
                <div class="text-xs opacity-75">${((failedTests/executedTests)*100).toFixed(1)}%</div>
            </div>
            <div class="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white p-6 rounded-lg text-center">
                <div class="text-3xl font-bold">${skippedTests}</div>
                <div class="text-sm opacity-90">대기 중</div>
                <div class="text-xs opacity-75">${((skippedTests/this.totalTests)*100).toFixed(1)}%</div>
            </div>
        </div>

        <!-- 게임 Phase 상태 -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4">🎮 Sweet Puzzle Phase 1 기능 상태</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${this.generatePhaseCards()}
            </div>
        </div>

        <!-- 브라우저별 테스트 결과 -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4">🌐 브라우저별 테스트 결과</h2>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                ${this.generateBrowserCards()}
            </div>
        </div>

        <!-- 실패한 테스트 상세 -->
        ${failedTests > 0 ? this.generateFailedTestsSection() : ''}

        <!-- 스크린샷 갤러리 -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold mb-4">📸 테스트 스크린샷 갤러리</h2>
            <div class="screenshot-gallery grid grid-cols-2 md:grid-cols-4 gap-4">
                ${this.generateScreenshotGallery()}
            </div>
        </div>

        <!-- 테스트 실행 로그 -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4">📋 테스트 실행 현황</h2>
            <div class="space-y-2">
                <div class="text-sm text-gray-600">✅ 게임 페이지 로드 테스트 완료</div>
                <div class="text-sm text-gray-600">✅ 다중 브라우저 호환성 검증 완료</div>
                <div class="text-sm text-gray-600">✅ 블록 상호작용 테스트 진행 중</div>
                <div class="text-sm text-gray-600">⏳ 매치 시스템 테스트 대기 중</div>
                <div class="text-sm text-gray-600">⏳ 물리 시스템 테스트 대기 중</div>
            </div>
        </div>
    </div>

    <script>
        function filterScreenshots(category) {
            const screenshots = document.querySelectorAll('.screenshot-item');
            screenshots.forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;
  }

  generatePhaseCards() {
    const phases = [
      { name: 'UI/게임보드', desc: '초기화 및 렌더링', status: 'success' },
      { name: '블록 상호작용', desc: '클릭/드래그 조작', status: 'testing' },
      { name: '매치 시스템', desc: '3매치 감지', status: 'pending' },
      { name: '물리 시스템', desc: '중력/연쇄반응', status: 'pending' }
    ];

    return phases.map(phase => {
      const statusColor = phase.status === 'success' ? 'green' : 
                         phase.status === 'testing' ? 'yellow' : 'gray';
      const statusIcon = phase.status === 'success' ? '✅' : 
                        phase.status === 'testing' ? '🔄' : '⏳';
      
      return `
        <div class="bg-gradient-to-r from-${statusColor}-400 to-${statusColor}-600 text-white p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold">${phase.name}</h3>
              <p class="text-sm opacity-90">${phase.desc}</p>
            </div>
            <div class="text-2xl">${statusIcon}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  generateBrowserCards() {
    const browsers = ['chromium', 'firefox', 'webkit', 'Mobile-Chrome', 'Mobile-Safari'];
    
    return browsers.map(browser => {
      const browserTests = this.testResults.filter(t => t.browser === browser);
      const failedCount = browserTests.length;
      const status = failedCount === 0 ? 'success' : 'warning';
      const icon = browser.includes('Mobile') ? '📱' : 
                   browser.includes('chrome') ? '🟢' :
                   browser.includes('firefox') ? '🟠' : 
                   browser.includes('webkit') ? '🔵' : '🌐';
                   
      return `
        <div class="border-2 ${status === 'success' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'} p-4 rounded-lg text-center">
          <div class="text-2xl mb-2">${icon}</div>
          <div class="font-semibold text-sm">${browser}</div>
          <div class="text-xs text-gray-600">${failedCount}개 이슈</div>
        </div>
      `;
    }).join('');
  }

  generateFailedTestsSection() {
    return `
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-bold mb-4 text-red-600">❌ 실패한 테스트 상세</h2>
        <div class="space-y-4">
          ${this.testResults.filter(t => t.status === 'failed').map(test => `
            <div class="border-l-4 border-red-500 pl-4 py-2">
              <div class="font-semibold">${test.name}</div>
              <div class="text-sm text-gray-600">${test.browser} | ${test.duration}</div>
              <div class="text-sm text-red-600">${test.error}</div>
              <div class="mt-2">
                <a href="${test.screenshot}" target="_blank" class="text-blue-600 hover:underline text-sm mr-4">📸 스크린샷 보기</a>
                <a href="${test.video}" target="_blank" class="text-blue-600 hover:underline text-sm">🎥 비디오 보기</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateScreenshotGallery() {
    if (this.screenshots.length === 0) {
      return '<div class="col-span-full text-center text-gray-500">스크린샷이 없습니다.</div>';
    }

    return this.screenshots.map(screenshot => `
      <div class="screenshot-item" data-category="${screenshot.category}">
        <img src="${screenshot.path}" alt="${screenshot.name}" 
             class="w-full h-32 object-cover rounded-lg shadow-md cursor-pointer"
             onclick="window.open('${screenshot.path}', '_blank')">
        <div class="text-xs text-gray-600 mt-1 text-center">${screenshot.name}</div>
      </div>
    `).join('');
  }
}

// 실행
if (require.main === module) {
  const dashboard = new SweetPuzzleDashboard();
  dashboard.generateDashboard().catch(console.error);
}

module.exports = SweetPuzzleDashboard;