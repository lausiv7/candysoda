/**
 * [의도] Sweet Puzzle 모듈별 Phase 스크린샷 캡처 시스템
 * [책임] 각 모듈의 Phase별 상태를 시각적으로 캡처하고 대시보드에 표시
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ModuleScreenshotCapturer {
    constructor() {
        this.screenshotDir = path.join(__dirname, 'test-results', 'module-screenshots');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // 스크린샷 디렉토리 생성
        this.ensureDirectoryExists(this.screenshotDir);
        
        this.modules = [
            {
                id: 'module1',
                name: '퍼즐 시스템',
                phases: [
                    { id: 'phase1', name: 'Core (기본 퍼즐)', url: 'file://' + path.join(__dirname, 'index.html') },
                    { id: 'phase2', name: 'Special Blocks', url: null },
                    { id: 'phase3', name: 'AI Level Generation', url: null },
                    { id: 'phase4', name: 'Board Management', url: null }
                ]
            },
            {
                id: 'module2', 
                name: '진행 시스템',
                phases: [
                    { id: 'phase1', name: 'Core (레벨/진행)', url: null },
                    { id: 'phase2', name: 'Reward System', url: null },
                    { id: 'phase3', name: 'Economy System', url: null },
                    { id: 'phase4', name: 'Mission System', url: null }
                ]
            },
            {
                id: 'module3',
                name: 'UI 시스템', 
                phases: [
                    { id: 'phase1', name: 'Core (기본 UI)', url: null },
                    { id: 'phase2', name: 'Design System', url: null },
                    { id: 'phase3', name: 'Responsive Layout', url: null },
                    { id: 'phase4', name: 'Accessibility', url: null }
                ]
            },
            {
                id: 'module4',
                name: '소셜 시스템',
                phases: [
                    { id: 'phase1', name: 'Core (친구 시스템)', url: 'file://' + path.join(__dirname, '../cocos-project/test-results/social-system-test-report.json') },
                    { id: 'phase2', name: 'Guild System (길드)', url: 'file://' + path.join(__dirname, '../cocos-project/test-results/complete-social-system-test-report.json') },
                    { id: 'phase3', name: 'Competition System (리더보드)', url: 'file://' + path.join(__dirname, '../cocos-project/test-results/complete-social-system-test-report.json') },
                    { id: 'phase4', name: 'Communication System (채팅)', url: 'file://' + path.join(__dirname, '../cocos-project/test-results/complete-social-system-test-report.json') }
                ]
            }
        ];
    }
    
    /**
     * [의도] 디렉토리 존재 보장
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`📁 디렉토리 생성: ${dirPath}`);
        }
    }
    
    /**
     * [의도] 모든 모듈의 스크린샷 캡처
     */
    async captureAllModuleScreenshots() {
        console.log('📸 모듈별 Phase 스크린샷 캡처 시작\\n');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        const results = {
            timestamp: new Date().toISOString(),
            modules: []
        };
        
        for (const module of this.modules) {
            console.log(`🔍 ${module.name} 스크린샷 캡처 중...`);
            
            const moduleResult = {
                ...module,
                phases: []
            };
            
            for (const phase of module.phases) {
                const phaseResult = await this.capturePhaseScreenshot(context, module, phase);
                moduleResult.phases.push(phaseResult);
            }
            
            results.modules.push(moduleResult);
            console.log(`✅ ${module.name} 완료\\n`);
        }
        
        await browser.close();
        
        // 결과 JSON 저장
        const resultPath = path.join(this.screenshotDir, `screenshot-results-${this.timestamp}.json`);
        fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
        
        console.log('📊 스크린샷 캡처 완료!');
        console.log(`📄 결과 저장: ${resultPath}`);
        
        return results;
    }
    
    /**
     * [의도] 개별 Phase 스크린샷 캡처
     */
    async capturePhaseScreenshot(context, module, phase) {
        const phaseDir = path.join(this.screenshotDir, module.id, phase.id);
        this.ensureDirectoryExists(phaseDir);
        
        const result = {
            ...phase,
            implemented: false,
            screenshotPath: null,
            error: null,
            captureTime: new Date().toISOString()
        };
        
        try {
            if (phase.url) {
                // 실제 구현된 페이지 캡처
                const page = await context.newPage();
                await page.goto(phase.url, { waitUntil: 'networkidle', timeout: 10000 });
                
                // 페이지 로드 확인
                await page.waitForTimeout(2000);
                
                const screenshotPath = path.join(phaseDir, `${phase.id}-implementation.png`);
                await page.screenshot({ 
                    path: screenshotPath,
                    fullPage: true
                });
                
                result.implemented = true;
                result.screenshotPath = screenshotPath;
                console.log(`  ✅ ${phase.name}: 구현됨 - 스크린샷 저장`);
                
                await page.close();
                
            } else {
                // 미구현 상태 표시 이미지 생성
                await this.generateNotImplementedImage(phaseDir, module, phase);
                result.screenshotPath = path.join(phaseDir, `${phase.id}-not-implemented.png`);
                console.log(`  ⚠️ ${phase.name}: 미구현 - 플레이스홀더 생성`);
            }
            
        } catch (error) {
            result.error = error.message;
            console.log(`  ❌ ${phase.name}: 오류 - ${error.message}`);
            
            // 오류 상태 이미지 생성
            await this.generateErrorImage(phaseDir, module, phase, error.message);
            result.screenshotPath = path.join(phaseDir, `${phase.id}-error.png`);
        }
        
        return result;
    }
    
    /**
     * [의도] 미구현 상태 이미지 생성
     */
    async generateNotImplementedImage(phaseDir, module, phase) {
        const imagePath = path.join(phaseDir, `${phase.id}-not-implemented.png`);
        
        // SVG로 플레이스홀더 이미지 생성
        const svgContent = `
            <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="800" height="600" fill="url(#grad1)" stroke="#d1d5db" stroke-width="2"/>
                
                <!-- 큰 아이콘 -->
                <circle cx="400" cy="200" r="60" fill="#9ca3af" opacity="0.5"/>
                <text x="400" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#6b7280">⚠️</text>
                
                <!-- 제목 -->
                <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#374151">${module.name}</text>
                <text x="400" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">${phase.name}</text>
                
                <!-- 상태 -->
                <text x="400" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#ef4444">미구현 상태</text>
                <text x="400" y="385" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">This phase is not yet implemented</text>
                
                <!-- 구현 계획 정보 -->
                <text x="400" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">구현 계획에는 포함되어 있음</text>
                <text x="400" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">향후 개발 예정</text>
                
                <!-- 타임스탬프 -->
                <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">캡처: ${new Date().toLocaleString('ko-KR')}</text>
            </svg>
        `;
        
        // SVG를 PNG로 변환하는 대신 직접 SVG 저장 (간단한 방법)
        fs.writeFileSync(imagePath.replace('.png', '.svg'), svgContent);
        
        // 또는 Canvas를 사용한 PNG 생성 (node-canvas 필요 시)
        console.log(`    📝 플레이스홀더 SVG 생성: ${imagePath.replace('.png', '.svg')}`);
    }
    
    /**
     * [의도] 오류 상태 이미지 생성
     */
    async generateErrorImage(phaseDir, module, phase, errorMessage) {
        const imagePath = path.join(phaseDir, `${phase.id}-error.svg`);
        
        const svgContent = `
            <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#fef2f2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#fee2e2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="800" height="600" fill="url(#errorGrad)" stroke="#f87171" stroke-width="2"/>
                
                <!-- 오류 아이콘 -->
                <circle cx="400" cy="200" r="60" fill="#ef4444" opacity="0.2"/>
                <text x="400" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#dc2626">❌</text>
                
                <!-- 제목 -->
                <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#991b1b">${module.name}</text>
                <text x="400" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#dc2626">${phase.name}</text>
                
                <!-- 오류 정보 -->
                <text x="400" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#ef4444">캡처 오류 발생</text>
                <text x="400" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">${errorMessage.substring(0, 60)}...</text>
                
                <!-- 타임스탬프 -->
                <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">캡처 시도: ${new Date().toLocaleString('ko-KR')}</text>
            </svg>
        `;
        
        fs.writeFileSync(imagePath, svgContent);
        console.log(`    ❌ 오류 이미지 생성: ${imagePath}`);
    }
    
    /**
     * [의도] 스크린샷 갤러리 HTML 생성
     */
    generateScreenshotGallery(results) {
        const galleryHtml = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>📸 Sweet Puzzle 모듈별 스크린샷 갤러리</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    .screenshot-item { transition: transform 0.2s ease; }
                    .screenshot-item:hover { transform: scale(1.05); }
                    .implemented { border-color: #10b981; }
                    .not-implemented { border-color: #f59e0b; }
                    .error { border-color: #ef4444; }
                </style>
            </head>
            <body class="bg-gray-50 p-6">
                <div class="container mx-auto">
                    <h1 class="text-4xl font-bold text-center mb-8">📸 Sweet Puzzle 모듈별 스크린샷</h1>
                    <p class="text-center text-gray-600 mb-8">캡처 시간: ${new Date(results.timestamp).toLocaleString('ko-KR')}</p>
                    
                    ${results.modules.map(module => `
                        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                            <h2 class="text-2xl font-bold mb-4">${module.name}</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                ${module.phases.map(phase => `
                                    <div class="screenshot-item border-4 ${phase.implemented ? 'implemented' : phase.error ? 'error' : 'not-implemented'} rounded-lg p-4">
                                        <h3 class="font-semibold mb-2">${phase.name}</h3>
                                        <div class="w-full h-48 bg-gray-100 rounded border mb-2 flex items-center justify-center">
                                            ${phase.screenshotPath ? 
                                                (phase.screenshotPath.endsWith('.svg') ? 
                                                    `<embed src="${path.relative(this.screenshotDir, phase.screenshotPath)}" type="image/svg+xml" width="100%" height="100%">` :
                                                    `<img src="${path.relative(this.screenshotDir, phase.screenshotPath)}" alt="${phase.name}" class="max-w-full max-h-full">`) :
                                                '<span class="text-gray-500">No Screenshot</span>'
                                            }
                                        </div>
                                        <div class="text-sm">
                                            <span class="inline-block px-2 py-1 rounded text-xs ${phase.implemented ? 'bg-green-100 text-green-800' : phase.error ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                                ${phase.implemented ? '✅ 구현됨' : phase.error ? '❌ 오류' : '⚠️ 미구현'}
                                            </span>
                                        </div>
                                        ${phase.error ? `<div class="text-xs text-red-600 mt-1">${phase.error}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </body>
            </html>
        `;
        
        const galleryPath = path.join(this.screenshotDir, 'screenshot-gallery.html');
        fs.writeFileSync(galleryPath, galleryHtml);
        
        console.log(`🖼️ 스크린샷 갤러리 생성: ${galleryPath}`);
        return galleryPath;
    }
}

// 스크린샷 캡처 실행
async function main() {
    const capturer = new ModuleScreenshotCapturer();
    
    try {
        const results = await capturer.captureAllModuleScreenshots();
        const galleryPath = capturer.generateScreenshotGallery(results);
        
        console.log('\\n🎯 모듈 스크린샷 시스템 완료!');
        console.log(`📸 총 ${results.modules.length}개 모듈, ${results.modules.reduce((sum, m) => sum + m.phases.length, 0)}개 Phase 처리`);
        console.log(`🖼️ 갤러리: ${galleryPath}`);
        
    } catch (error) {
        console.error('❌ 스크린샷 캡처 실패:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = ModuleScreenshotCapturer;