#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

class PlaywrightTestGenerator {
  constructor() {
    this.baseUrl = 'http://localhost:8082';
    this.outputDir = './tests';
  }

  // Playwright codegen을 사용한 테스트 자동 생성
  async generateTestsFromRecording() {
    console.log('🎬 Playwright Codegen을 시작합니다...');
    console.log('브라우저가 열리면 테스트할 동작을 수행하세요.');
    console.log('Ctrl+C로 기록을 종료할 수 있습니다.');

    return new Promise((resolve, reject) => {
      const codegen = spawn('npx', [
        'playwright', 
        'codegen', 
        this.baseUrl,
        '--target=javascript',
        '--output=./tests/generated-test.spec.js'
      ], {
        stdio: 'inherit',
        cwd: __dirname
      });

      codegen.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 테스트 생성 완료!');
          resolve();
        } else {
          reject(new Error(`Codegen failed with code ${code}`));
        }
      });

      codegen.on('error', reject);
    });
  }

  // 기본 테스트 템플릿 생성
  async generateBasicTestTemplate(componentName) {
    const template = `const { test, expect } = require('@playwright/test');

test.describe('${componentName} Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    await page.waitForTimeout(3000);
  });

  test('${componentName} 컴포넌트 로드 테스트', async ({ page }) => {
    // TODO: ${componentName} 관련 테스트 로직 구현
    console.log('Testing ${componentName}...');
  });

  test('${componentName} 상호작용 테스트', async ({ page }) => {
    // TODO: 사용자 상호작용 테스트 구현
  });

  test('${componentName} 에러 처리 테스트', async ({ page }) => {
    // TODO: 에러 시나리오 테스트 구현
  });

});
`;

    const fileName = `${componentName.toLowerCase()}.spec.js`;
    const filePath = path.join(this.outputDir, fileName);
    
    await fs.ensureDir(this.outputDir);
    await fs.writeFile(filePath, template);
    
    console.log(`📝 테스트 템플릿 생성: ${filePath}`);
    return filePath;
  }

  // 브라우저 기반 테스트 선택 HTML UI 생성
  async generateTestSelectorUI() {
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker Test Suite Selector</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .content {
            padding: 30px;
        }
        .test-categories {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .category {
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        .category:hover {
            border-color: #4CAF50;
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.2);
        }
        .category h3 {
            color: #4CAF50;
            margin-top: 0;
            font-size: 1.3em;
        }
        .test-item {
            display: flex;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
            transition: background-color 0.2s;
        }
        .test-item:hover {
            background-color: #f5f5f5;
        }
        .test-item input[type="checkbox"] {
            margin-right: 10px;
            transform: scale(1.2);
        }
        .test-item label {
            cursor: pointer;
            flex: 1;
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-left: 10px;
        }
        .status-pass { background-color: #4CAF50; }
        .status-fail { background-color: #f44336; }
        .status-pending { background-color: #ff9800; }
        .controls {
            text-align: center;
            padding: 20px;
            border-top: 1px solid #e0e0e0;
            background-color: #f9f9f9;
        }
        .btn {
            padding: 12px 30px;
            margin: 0 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background-color: #4CAF50;
            color: white;
        }
        .btn-primary:hover {
            background-color: #45a049;
            transform: translateY(-2px);
        }
        .btn-secondary {
            background-color: #2196F3;
            color: white;
        }
        .btn-secondary:hover {
            background-color: #1976D2;
            transform: translateY(-2px);
        }
        .btn-danger {
            background-color: #f44336;
            color: white;
        }
        .btn-danger:hover {
            background-color: #d32f2f;
            transform: translateY(-2px);
        }
        .results {
            margin-top: 30px;
            padding: 20px;
            background-color: #f5f5f5;
            border-radius: 10px;
            display: none;
        }
        .log-output {
            background-color: #000;
            color: #00ff00;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌪️ WindWalker Test Suite</h1>
            <p>Interactive Test Selection & Execution Dashboard</p>
        </div>
        
        <div class="content">
            <div class="test-categories">
                <div class="category">
                    <h3>🔧 Core Extension Tests</h3>
                    <div class="test-item">
                        <input type="checkbox" id="test-activation" checked>
                        <label for="test-activation">Extension Activation</label>
                        <div class="status-indicator status-pass"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-sidebar" checked>
                        <label for="test-sidebar">Sidebar Icon Display</label>
                        <div class="status-indicator status-pass"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-commands">
                        <label for="test-commands">Command Palette</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                </div>

                <div class="category">
                    <h3>🤖 AI Chat Tests</h3>
                    <div class="test-item">
                        <input type="checkbox" id="test-chat-ui">
                        <label for="test-chat-ui">Chat UI Loading</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-chat-message">
                        <label for="test-chat-message">Message Sending</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-ai-response">
                        <label for="test-ai-response">AI Response</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                </div>

                <div class="category">
                    <h3>🖥️ Preview Tests</h3>
                    <div class="test-item">
                        <input type="checkbox" id="test-preview-panel">
                        <label for="test-preview-panel">Preview Panel</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-preview-reload">
                        <label for="test-preview-reload">Auto Reload</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                </div>

                <div class="category">
                    <h3>📁 File Operations</h3>
                    <div class="test-item">
                        <input type="checkbox" id="test-file-read">
                        <label for="test-file-read">File Reading</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-file-write">
                        <label for="test-file-write">File Writing</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                    <div class="test-item">
                        <input type="checkbox" id="test-file-create">
                        <label for="test-file-create">File Creation</label>
                        <div class="status-indicator status-pending"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="controls">
            <button class="btn btn-primary" onclick="runSelectedTests()">▶️ Run Selected Tests</button>
            <button class="btn btn-secondary" onclick="selectAll()">☑️ Select All</button>
            <button class="btn btn-secondary" onclick="selectNone()">❌ Clear All</button>
            <button class="btn btn-danger" onclick="stopTests()">⏹️ Stop Tests</button>
            <button class="btn btn-secondary" onclick="generateTests()">🎬 Generate New Tests</button>
        </div>

        <div class="results" id="results">
            <h3>Test Results</h3>
            <div class="log-output" id="logOutput"></div>
            <div style="text-align: center; margin-top: 15px;">
                <button class="btn btn-secondary" onclick="downloadReport()">📊 Download Report</button>
                <button class="btn btn-secondary" onclick="shareResults()">🔗 Share Results</button>
            </div>
        </div>
    </div>

    <script>
        let testProcess = null;
        let logOutput = document.getElementById('logOutput');

        function selectAll() {
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        }

        function selectNone() {
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }

        function runSelectedTests() {
            const selected = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.id);
            
            if (selected.length === 0) {
                alert('테스트를 선택해주세요!');
                return;
            }

            document.getElementById('results').style.display = 'block';
            logOutput.innerHTML = '🚀 테스트 시작...\\n\\n';
            
            // 선택된 테스트 실행 (실제로는 Playwright API 호출)
            simulateTestExecution(selected);
        }

        function simulateTestExecution(selectedTests) {
            let currentTest = 0;
            const totalTests = selectedTests.length;

            function runNextTest() {
                if (currentTest >= totalTests) {
                    logOutput.innerHTML += '\\n✅ 모든 테스트 완료!\\n';
                    updateTestStatus();
                    return;
                }

                const testId = selectedTests[currentTest];
                logOutput.innerHTML += \`🧪 실행중: \${testId}...\\n\`;
                logOutput.scrollTop = logOutput.scrollHeight;

                // 테스트 시뮬레이션 (실제로는 Playwright 호출)
                setTimeout(() => {
                    const success = Math.random() > 0.3; // 70% 성공률
                    if (success) {
                        logOutput.innerHTML += \`✅ \${testId} 통과\\n\`;
                    } else {
                        logOutput.innerHTML += \`❌ \${testId} 실패\\n\`;
                    }
                    
                    currentTest++;
                    runNextTest();
                }, 2000);
            }

            runNextTest();
        }

        function updateTestStatus() {
            // 실제로는 테스트 결과에 따라 상태 업데이트
            document.querySelectorAll('.status-indicator').forEach(indicator => {
                const random = Math.random();
                if (random > 0.7) {
                    indicator.className = 'status-indicator status-fail';
                } else if (random > 0.3) {
                    indicator.className = 'status-indicator status-pass';
                }
            });
        }

        function stopTests() {
            if (testProcess) {
                // 실제 테스트 프로세스 종료
                logOutput.innerHTML += '\\n⏹️ 테스트 중단됨\\n';
            }
        }

        function generateTests() {
            alert('Playwright Codegen이 시작됩니다. 브라우저에서 동작을 기록하세요.');
            // 실제로는 codegen 명령 실행
        }

        function downloadReport() {
            const report = {
                timestamp: new Date().toISOString(),
                results: logOutput.innerHTML,
                selectedTests: Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.id)
            };
            
            const blob = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`windwalker-test-report-\${Date.now()}.json\`;
            a.click();
        }

        function shareResults() {
            const results = logOutput.innerHTML;
            if (navigator.share) {
                navigator.share({
                    title: 'WindWalker Test Results',
                    text: results
                });
            } else {
                navigator.clipboard.writeText(results);
                alert('결과가 클립보드에 복사되었습니다!');
            }
        }
    </script>
</body>
</html>`;

    const uiPath = path.join(__dirname, 'test-selector-ui.html');
    await fs.writeFile(uiPath, htmlContent);
    
    console.log(`🌐 테스트 선택 UI 생성: ${uiPath}`);
    console.log(`브라우저에서 file://${uiPath} 을 열어 사용하세요.`);
    
    return uiPath;
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'record':
        await this.generateTestsFromRecording();
        break;
      case 'template':
        const componentName = args[1] || 'NewComponent';
        await this.generateBasicTestTemplate(componentName);
        break;
      case 'ui':
        await this.generateTestSelectorUI();
        break;
      default:
        console.log(`
🎭 Playwright Test Generator

사용법:
  node test-generator.js record     # 브라우저 녹화로 테스트 생성
  node test-generator.js template [name] # 기본 테스트 템플릿 생성
  node test-generator.js ui        # 브라우저 UI 테스트 선택기 생성

예시:
  node test-generator.js record
  node test-generator.js template ChatComponent
  node test-generator.js ui
        `);
    }
  }
}

if (require.main === module) {
  const generator = new PlaywrightTestGenerator();
  generator.run().catch(console.error);
}

module.exports = PlaywrightTestGenerator;