const fs = require('fs');
const path = require('path');

/**
 * Sweet Puzzle 테스트 결과 HTML 리포트 생성기
 */
class TestReportGenerator {
  constructor() {
    this.resultsDir = 'test-results';
    this.screenshotsDir = path.join(this.resultsDir, 'screenshots');
    this.reportPath = path.join(this.resultsDir, 'sweet-puzzle-dashboard.html');
  }

  async generateReport() {
    console.log('🎯 Sweet Puzzle 테스트 리포트 생성 시작...');

    // 테스트 결과 JSON 파일 읽기
    let testResults = null;
    try {
      const resultsFile = path.join(this.resultsDir, 'results.json');
      if (fs.existsSync(resultsFile)) {
        testResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      }
    } catch (error) {
      console.warn('테스트 결과 JSON 파일을 읽을 수 없습니다:', error.message);
    }

    // 스크린샷 파일 목록 수집
    const screenshots = this.collectScreenshots();

    // HTML 리포트 생성
    const html = this.generateHTML(testResults, screenshots);

    // 파일 저장
    fs.writeFileSync(this.reportPath, html, 'utf8');

    console.log(`✅ 테스트 리포트 생성 완료: ${this.reportPath}`);
    return this.reportPath;
  }

  collectScreenshots() {
    const screenshots = [];

    if (!fs.existsSync(this.screenshotsDir)) {
      return screenshots;
    }

    const files = fs.readdirSync(this.screenshotsDir);
    
    files.forEach(file => {
      if (file.endsWith('.png')) {
        const fullPath = path.join(this.screenshotsDir, file);
        const stats = fs.statSync(fullPath);
        
        screenshots.push({
          filename: file,
          path: `screenshots/${file}`,
          size: this.formatFileSize(stats.size),
          timestamp: stats.mtime,
          category: this.categorizeScreenshot(file)
        });
      }
    });

    // 파일명으로 정렬
    screenshots.sort((a, b) => a.filename.localeCompare(b.filename));

    return screenshots;
  }

  categorizeScreenshot(filename) {
    if (filename.includes('initial')) return 'initialization';
    if (filename.includes('block') || filename.includes('drag')) return 'interaction';
    if (filename.includes('match') || filename.includes('chain')) return 'matching';
    if (filename.includes('gravity')) return 'physics';
    if (filename.includes('hint')) return 'hints';
    if (filename.includes('restart') || filename.includes('shuffle')) return 'controls';
    if (filename.includes('debug')) return 'debugging';
    if (filename.includes('session')) return 'gameplay';
    if (filename.includes('rapid') || filename.includes('memory')) return 'performance';
    return 'other';
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  generateHTML(testResults, screenshots) {
    const now = new Date();
    const testSummary = this.generateTestSummary(testResults);
    const screenshotGallery = this.generateScreenshotGallery(screenshots);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Puzzle Phase 1 - 테스트 리포트</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #4a5568;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #718096;
            font-size: 1.2rem;
            margin-bottom: 20px;
        }
        
        .header .timestamp {
            color: #a0aec0;
            font-size: 0.9rem;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-card .icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }
        
        .metric-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 10px;
        }
        
        .metric-card .label {
            color: #718096;
            font-size: 0.9rem;
        }
        
        .success { color: #38a169; }
        .warning { color: #d69e2e; }
        .error { color: #e53e3e; }
        .info { color: #3182ce; }
        
        .section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #2d3748;
            font-size: 1.8rem;
            margin-bottom: 20px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        
        .test-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .test-group {
            background: #f7fafc;
            border-radius: 10px;
            padding: 20px;
            border-left: 4px solid #667eea;
        }
        
        .test-group h3 {
            color: #4a5568;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        
        .test-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .test-item:last-child {
            border-bottom: none;
        }
        
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .status-passed {
            background: #c6f6d5;
            color: #22543d;
        }
        
        .status-failed {
            background: #fed7d7;
            color: #742a2a;
        }
        
        .status-skipped {
            background: #faf089;
            color: #744210;
        }
        
        .screenshot-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .screenshot-item {
            background: #f7fafc;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .screenshot-item:hover {
            transform: scale(1.02);
        }
        
        .screenshot-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            cursor: pointer;
        }
        
        .screenshot-info {
            padding: 15px;
        }
        
        .screenshot-info h4 {
            color: #2d3748;
            margin-bottom: 8px;
            font-size: 0.9rem;
        }
        
        .screenshot-meta {
            color: #718096;
            font-size: 0.8rem;
            display: flex;
            justify-content: space-between;
        }
        
        .category-filter {
            margin-bottom: 20px;
            text-align: center;
        }
        
        .filter-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 16px;
            margin: 0 5px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .filter-btn:hover,
        .filter-btn.active {
            background: rgba(255, 255, 255, 0.9);
            color: #4a5568;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
        }
        
        .modal-content {
            display: block;
            margin: auto;
            max-width: 90%;
            max-height: 90%;
            margin-top: 5%;
        }
        
        .close {
            position: absolute;
            top: 15px;
            right: 35px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .dashboard {
                grid-template-columns: 1fr;
            }
            
            .screenshot-gallery {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍬 Sweet Puzzle Phase 1</h1>
            <div class="subtitle">E2E 테스트 리포트 & 대시보드</div>
            <div class="timestamp">생성 시간: ${now.toLocaleString('ko-KR')}</div>
        </div>
        
        <div class="dashboard">
            <div class="metric-card">
                <div class="icon">📊</div>
                <div class="value ${testSummary.overallStatus}">${testSummary.totalTests}</div>
                <div class="label">총 테스트 수</div>
            </div>
            
            <div class="metric-card">
                <div class="icon">✅</div>
                <div class="value success">${testSummary.passedTests}</div>
                <div class="label">통과한 테스트</div>
            </div>
            
            <div class="metric-card">
                <div class="icon">📸</div>
                <div class="value info">${screenshots.length}</div>
                <div class="label">캡처된 스크린샷</div>
            </div>
        </div>
        
        ${testSummary.html}
        
        <div class="section">
            <h2>📸 테스트 스크린샷 갤러리</h2>
            
            <div class="category-filter">
                <button class="filter-btn active" onclick="filterScreenshots('all')">전체</button>
                <button class="filter-btn" onclick="filterScreenshots('initialization')">초기화</button>
                <button class="filter-btn" onclick="filterScreenshots('interaction')">상호작용</button>
                <button class="filter-btn" onclick="filterScreenshots('matching')">매칭</button>
                <button class="filter-btn" onclick="filterScreenshots('physics')">물리</button>
                <button class="filter-btn" onclick="filterScreenshots('controls')">제어</button>
                <button class="filter-btn" onclick="filterScreenshots('gameplay')">게임플레이</button>
            </div>
            
            <div class="screenshot-gallery">
                ${screenshotGallery}
            </div>
        </div>
    </div>
    
    <div class="footer">
        Sweet Puzzle 캔디소다 03 Phase 1 - Playwright E2E 테스트 리포트<br>
        테스트 자동화 루프 시스템 by Claude Code
    </div>
    
    <!-- 이미지 모달 -->
    <div id="imageModal" class="modal">
        <span class="close">&times;</span>
        <img class="modal-content" id="modalImg">
    </div>
    
    <script>
        // 스크린샷 필터링
        function filterScreenshots(category) {
            const items = document.querySelectorAll('.screenshot-item');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // 버튼 활성화 상태 업데이트
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            // 스크린샷 필터링
            items.forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }
        
        // 이미지 모달
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImg');
        const closeModal = document.querySelector('.close');
        
        document.querySelectorAll('.screenshot-item img').forEach(img => {
            img.onclick = function() {
                modal.style.display = 'block';
                modalImg.src = this.src;
            }
        });
        
        closeModal.onclick = function() {
            modal.style.display = 'none';
        }
        
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        }
        
        // 실시간 메트릭 업데이트 (시뮬레이션)
        function updateMetrics() {
            const now = new Date();
            document.querySelector('.timestamp').textContent = '마지막 업데이트: ' + now.toLocaleString('ko-KR');
        }
        
        // 5분마다 메트릭 업데이트
        setInterval(updateMetrics, 300000);
    </script>
</body>
</html>`;
  }

  generateTestSummary(testResults) {
    if (!testResults) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallStatus: 'info',
        html: '<div class="section"><h2>⚠️ 테스트 결과 데이터 없음</h2><p>테스트 실행 후 결과를 확인할 수 있습니다.</p></div>'
      };
    }

    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0
    };

    // 테스트 결과 분석
    if (testResults.suites) {
      testResults.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          spec.tests.forEach(test => {
            summary.totalTests++;
            
            if (test.status === 'passed') {
              summary.passedTests++;
            } else if (test.status === 'failed') {
              summary.failedTests++;
            } else {
              summary.skippedTests++;
            }
          });
        });
      });
    }

    summary.overallStatus = summary.failedTests > 0 ? 'error' : 
                           summary.skippedTests > 0 ? 'warning' : 'success';

    // HTML 생성
    const html = `
      <div class="section">
          <h2>📋 테스트 결과 요약</h2>
          
          <div class="test-summary">
              <div class="test-group">
                  <h3>🎯 전체 결과</h3>
                  <div class="test-item">
                      <span>총 테스트 수</span>
                      <span class="test-status">${summary.totalTests}</span>
                  </div>
                  <div class="test-item">
                      <span>통과율</span>
                      <span class="test-status status-passed">${summary.totalTests > 0 ? ((summary.passedTests / summary.totalTests) * 100).toFixed(1) : 0}%</span>
                  </div>
              </div>
              
              <div class="test-group">
                  <h3>✅ 통과한 테스트</h3>
                  <div class="test-item">
                      <span>성공</span>
                      <span class="test-status status-passed">${summary.passedTests}</span>
                  </div>
              </div>
              
              <div class="test-group">
                  <h3>❌ 실패/건너뛴 테스트</h3>
                  <div class="test-item">
                      <span>실패</span>
                      <span class="test-status status-failed">${summary.failedTests}</span>
                  </div>
                  <div class="test-item">
                      <span>건너뜀</span>
                      <span class="test-status status-skipped">${summary.skippedTests}</span>
                  </div>
              </div>
          </div>
      </div>
    `;

    return { ...summary, html };
  }

  generateScreenshotGallery(screenshots) {
    return screenshots.map(screenshot => `
      <div class="screenshot-item" data-category="${screenshot.category}">
          <img src="${screenshot.path}" alt="${screenshot.filename}" loading="lazy">
          <div class="screenshot-info">
              <h4>${this.formatScreenshotTitle(screenshot.filename)}</h4>
              <div class="screenshot-meta">
                  <span>${screenshot.size}</span>
                  <span>${screenshot.timestamp.toLocaleTimeString('ko-KR')}</span>
              </div>
          </div>
      </div>
    `).join('');
  }

  formatScreenshotTitle(filename) {
    return filename
      .replace(/^\d{2}-\d-/, '') // 숫자 접두사 제거
      .replace(/\.png$/, '') // 확장자 제거
      .replace(/-/g, ' ') // 하이픈을 공백으로
      .replace(/\b\w/g, l => l.toUpperCase()); // 첫 글자 대문자
  }
}

// 스크립트 실행
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = TestReportGenerator;