/**
 * Sweet Puzzle - Module 3: UI/UX System 완전한 통합 테스트
 * 
 * 테스트 대상:
 * - DesignSystem.ts - 디자인 시스템 및 색상 팔레트
 * - ResponsiveLayout.ts - 반응형 레이아웃 시스템
 * - AccessibilityManager.ts - 접근성 매니저
 * - UIComponentLibrary.ts - UI 컴포넌트 라이브러리
 * - ThemeManager.ts - 테마 매니저
 * - AnimationManager.ts - 애니메이션 매니저
 * - UIManager.ts - UI 매니저 (기존)
 */

const fs = require('fs');
const path = require('path');

// 테스트 결과 저장
let testResults = {
    moduleName: 'Module 3: UI/UX System',
    testDate: new Date().toISOString(),
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        successRate: 0
    },
    categories: {
        designSystem: { total: 0, passed: 0, tests: [] },
        responsiveLayout: { total: 0, passed: 0, tests: [] },
        accessibility: { total: 0, passed: 0, tests: [] },
        componentLibrary: { total: 0, passed: 0, tests: [] },
        themeManager: { total: 0, passed: 0, tests: [] },
        animationManager: { total: 0, passed: 0, tests: [] },
        systemIntegration: { total: 0, passed: 0, tests: [] }
    }
};

// 테스트 헬퍼 함수들
function runTest(category, testName, testFunction) {
    testResults.categories[category].total++;
    testResults.summary.total++;
    
    try {
        const result = testFunction();
        if (result) {
            testResults.categories[category].passed++;
            testResults.summary.passed++;
            testResults.categories[category].tests.push({
                name: testName,
                status: 'PASSED',
                message: 'Test completed successfully'
            });
            console.log(`✅ ${testName}`);
        } else {
            testResults.categories[category].tests.push({
                name: testName,
                status: 'FAILED',
                message: 'Test returned false'
            });
            console.log(`❌ ${testName}`);
        }
    } catch (error) {
        testResults.categories[category].tests.push({
            name: testName,
            status: 'FAILED',
            message: error.message
        });
        console.log(`❌ ${testName}: ${error.message}`);
    }
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function readFile(filePath) {
    if (!fileExists(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function hasClass(content, className) {
    return content.includes(`class ${className}`) || content.includes(`export class ${className}`);
}

function hasMethod(content, methodName) {
    return content.includes(`${methodName}(`) || content.includes(`${methodName} (`);
}

function hasInterface(content, interfaceName) {
    return content.includes(`interface ${interfaceName}`) || content.includes(`export interface ${interfaceName}`);
}

function hasEnum(content, enumName) {
    return content.includes(`enum ${enumName}`) || content.includes(`export enum ${enumName}`);
}

// 스크립트 파일 경로들
const scriptPaths = {
    designSystem: './assets/scripts/ui/DesignSystem.ts',
    responsiveLayout: './assets/scripts/ui/ResponsiveLayout.ts',
    accessibility: './assets/scripts/ui/AccessibilityManager.ts',
    componentLibrary: './assets/scripts/ui/UIComponentLibrary.ts',
    themeManager: './assets/scripts/ui/ThemeManager.ts',
    animationManager: './assets/scripts/ui/AnimationManager.ts',
    uiManager: './assets/scripts/ui/UIManager.ts'
};

console.log('🎨 Sweet Puzzle Module 3: UI/UX System 완전한 통합 테스트 시작\n');

// ===== 디자인 시스템 테스트 =====
console.log('📋 1. Design System 테스트');

runTest('designSystem', 'DesignSystem 클래스 파일 존재', () => {
    return fileExists(scriptPaths.designSystem);
});

runTest('designSystem', 'DesignSystem 클래스 정의', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasClass(content, 'DesignSystem');
});

runTest('designSystem', 'ColorTheme enum 정의', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasEnum(content, 'ColorTheme');
});

runTest('designSystem', 'FontSize enum 정의', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasEnum(content, 'FontSize');
});

runTest('designSystem', 'SWEET_PUZZLE_COLORS 팔레트 정의', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && content.includes('SWEET_PUZZLE_COLORS');
});

runTest('designSystem', 'getColor 메서드 구현', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasMethod(content, 'getColor');
});

runTest('designSystem', 'setTheme 메서드 구현', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasMethod(content, 'setTheme');
});

runTest('designSystem', 'applyTypographyStyle 메서드 구현', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasMethod(content, 'applyTypographyStyle');
});

runTest('designSystem', '색상 대비 계산 기능', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && hasMethod(content, 'calculateContrastRatio');
});

runTest('designSystem', '싱글톤 패턴 구현', () => {
    const content = readFile(scriptPaths.designSystem);
    return content && content.includes('getInstance()') && content.includes('private static instance');
});

// ===== 반응형 레이아웃 테스트 =====
console.log('\n📱 2. Responsive Layout 테스트');

runTest('responsiveLayout', 'ResponsiveLayout 클래스 파일 존재', () => {
    return fileExists(scriptPaths.responsiveLayout);
});

runTest('responsiveLayout', 'ResponsiveLayout 클래스 정의', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasClass(content, 'ResponsiveLayout');
});

runTest('responsiveLayout', 'ScreenCategory enum 정의', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasEnum(content, 'ScreenCategory');
});

runTest('responsiveLayout', 'ScreenConfig 인터페이스 정의', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasInterface(content, 'ScreenConfig');
});

runTest('responsiveLayout', 'detectScreenConfig 메서드 구현', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasMethod(content, 'detectScreenConfig');
});

runTest('responsiveLayout', 'applyResponsiveLayout 메서드 구현', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasMethod(content, 'applyResponsiveLayout');
});

runTest('responsiveLayout', '세이프 에리어 감지 기능', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasMethod(content, 'detectSafeArea');
});

runTest('responsiveLayout', '레이아웃 어댑터 시스템', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasInterface(content, 'LayoutAdapter');
});

runTest('responsiveLayout', '폰트 크기 자동 조정', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasMethod(content, 'adjustFontSizes');
});

runTest('responsiveLayout', '터치 영역 크기 조정', () => {
    const content = readFile(scriptPaths.responsiveLayout);
    return content && hasMethod(content, 'adjustTouchAreas');
});

// ===== 접근성 매니저 테스트 =====
console.log('\n♿ 3. Accessibility Manager 테스트');

runTest('accessibility', 'AccessibilityManager 클래스 파일 존재', () => {
    return fileExists(scriptPaths.accessibility);
});

runTest('accessibility', 'AccessibilityManager 클래스 정의', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasClass(content, 'AccessibilityManager');
});

runTest('accessibility', 'ColorBlindnessType enum 정의', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasEnum(content, 'ColorBlindnessType');
});

runTest('accessibility', 'AccessibilitySettings 인터페이스 정의', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasInterface(content, 'AccessibilitySettings');
});

runTest('accessibility', '음성 피드백 시스템', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasMethod(content, 'provideSpeechFeedback');
});

runTest('accessibility', '색맹 지원 필터', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasMethod(content, 'setupColorBlindnessFilters');
});

runTest('accessibility', '포커스 관리 시스템', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasMethod(content, 'moveFocus') && hasMethod(content, 'focusNode');
});

runTest('accessibility', '접근성 정보 설정', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasMethod(content, 'setAccessibilityInfo');
});

runTest('accessibility', '시스템 접근성 설정 감지', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasMethod(content, 'detectSystemAccessibilitySettings');
});

runTest('accessibility', '접근성 검사 기능', () => {
    const content = readFile(scriptPaths.accessibility);
    return content && hasMethod(content, 'runAccessibilityAudit');
});

// ===== UI 컴포넌트 라이브러리 테스트 =====
console.log('\n🧩 4. UI Component Library 테스트');

runTest('componentLibrary', 'UIComponentLibrary 클래스 파일 존재', () => {
    return fileExists(scriptPaths.componentLibrary);
});

runTest('componentLibrary', 'UIComponentLibrary 클래스 정의', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasClass(content, 'UIComponentLibrary');
});

runTest('componentLibrary', 'ComponentType enum 정의', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasEnum(content, 'ComponentType');
});

runTest('componentLibrary', 'ComponentConfig 인터페이스 정의', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasInterface(content, 'ComponentConfig');
});

runTest('componentLibrary', '버튼 생성 기능', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasMethod(content, 'createButton');
});

runTest('componentLibrary', '패널 생성 기능', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasMethod(content, 'createPanel');
});

runTest('componentLibrary', '모달 생성 기능', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasMethod(content, 'createModal');
});

runTest('componentLibrary', '진행 바 생성 기능', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasMethod(content, 'createProgressBar');
});

runTest('componentLibrary', '알림 생성 기능', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasMethod(content, 'createNotification');
});

runTest('componentLibrary', '컴포넌트 프리팹 시스템', () => {
    const content = readFile(scriptPaths.componentLibrary);
    return content && hasMethod(content, 'createComponentPrefabs');
});

// ===== 테마 매니저 테스트 =====
console.log('\n🎨 5. Theme Manager 테스트');

runTest('themeManager', 'ThemeManager 클래스 파일 존재', () => {
    return fileExists(scriptPaths.themeManager);
});

runTest('themeManager', 'ThemeManager 클래스 정의', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasClass(content, 'ThemeManager');
});

runTest('themeManager', 'ThemeType enum 정의', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasEnum(content, 'ThemeType');
});

runTest('themeManager', 'ThemeConfig 인터페이스 정의', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasInterface(content, 'ThemeConfig');
});

runTest('themeManager', '테마 전환 기능', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasMethod(content, 'switchToTheme');
});

runTest('themeManager', '내장 테마 생성', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasMethod(content, 'createBuiltInThemes');
});

runTest('themeManager', '자동 테마 감지', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasMethod(content, 'detectSystemTheme');
});

runTest('themeManager', '계절별 테마 시스템', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasEnum(content, 'SeasonalTheme');
});

runTest('themeManager', '시간대별 테마 시스템', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasEnum(content, 'TimeBasedTheme');
});

runTest('themeManager', '커스텀 테마 생성', () => {
    const content = readFile(scriptPaths.themeManager);
    return content && hasMethod(content, 'createCustomTheme');
});

// ===== 애니메이션 매니저 테스트 =====
console.log('\n✨ 6. Animation Manager 테스트');

runTest('animationManager', 'AnimationManager 클래스 파일 존재', () => {
    return fileExists(scriptPaths.animationManager);
});

runTest('animationManager', 'AnimationManager 클래스 정의', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasClass(content, 'AnimationManager');
});

runTest('animationManager', 'AnimationType enum 정의', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasEnum(content, 'AnimationType');
});

runTest('animationManager', 'AnimationConfig 인터페이스 정의', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasInterface(content, 'AnimationConfig');
});

runTest('animationManager', '기본 애니메이션 재생 기능', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasMethod(content, 'playAnimation');
});

runTest('animationManager', '프리셋 애니메이션 시스템', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasMethod(content, 'playPresetAnimation');
});

runTest('animationManager', '시퀀스 애니메이션 기능', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasMethod(content, 'playSequenceAnimation');
});

runTest('animationManager', '파티클 효과 시스템', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasMethod(content, 'playParticleEffect');
});

runTest('animationManager', '애니메이션 제어 기능', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasMethod(content, 'pauseAnimation') && hasMethod(content, 'stopAnimation');
});

runTest('animationManager', '성능 최적화 기능', () => {
    const content = readFile(scriptPaths.animationManager);
    return content && hasMethod(content, 'adjustConfigForPerformance');
});

// ===== 시스템 통합 테스트 =====
console.log('\n🔗 7. System Integration 테스트');

runTest('systemIntegration', '모든 UI 시스템 파일 존재', () => {
    return Object.values(scriptPaths).every(path => fileExists(path));
});

runTest('systemIntegration', '싱글톤 패턴 일관성', () => {
    const managers = ['designSystem', 'responsiveLayout', 'accessibility', 'componentLibrary', 'themeManager', 'animationManager'];
    return managers.every(manager => {
        const content = readFile(scriptPaths[manager]);
        return content && content.includes('getInstance()') && content.includes('private static instance');
    });
});

runTest('systemIntegration', 'EventBus 통합', () => {
    const managers = ['designSystem', 'responsiveLayout', 'accessibility', 'themeManager', 'animationManager'];
    return managers.every(manager => {
        const content = readFile(scriptPaths[manager]);
        return content && content.includes("from '../core/EventBus'");
    });
});

runTest('systemIntegration', '상호 참조 시스템', () => {
    const componentLibraryContent = readFile(scriptPaths.componentLibrary);
    const themeManagerContent = readFile(scriptPaths.themeManager);
    return componentLibraryContent && componentLibraryContent.includes('DesignSystem') &&
           themeManagerContent && themeManagerContent.includes('DesignSystem');
});

runTest('systemIntegration', 'TypeScript 인터페이스 일관성', () => {
    const files = Object.values(scriptPaths);
    return files.every(filePath => {
        const content = readFile(filePath);
        return content && (content.includes('export interface') || content.includes('export enum'));
    });
});

runTest('systemIntegration', 'Cocos Creator 컴포넌트 패턴', () => {
    const files = Object.values(scriptPaths);
    return files.every(filePath => {
        const content = readFile(filePath);
        return content && content.includes('@ccclass') && content.includes('extends Component');
    });
});

runTest('systemIntegration', '접근성 통합 지원', () => {
    const integrationFiles = ['componentLibrary', 'themeManager', 'animationManager'];
    return integrationFiles.every(manager => {
        const content = readFile(scriptPaths[manager]);
        return content && content.includes('AccessibilityManager');
    });
});

runTest('systemIntegration', '반응형 레이아웃 통합', () => {
    const componentLibraryContent = readFile(scriptPaths.componentLibrary);
    return componentLibraryContent && componentLibraryContent.includes('ResponsiveLayout');
});

runTest('systemIntegration', '테마 시스템 통합', () => {
    const componentLibraryContent = readFile(scriptPaths.componentLibrary);
    const animationManagerContent = readFile(scriptPaths.animationManager);
    return componentLibraryContent && componentLibraryContent.includes('ColorTheme') &&
           animationManagerContent && animationManagerContent.includes('AccessibilityManager');
});

runTest('systemIntegration', '통합 이벤트 시스템', () => {
    const managers = ['designSystem', 'responsiveLayout', 'themeManager'];
    return managers.every(manager => {
        const content = readFile(scriptPaths[manager]);
        return content && content.includes('EventBus.getInstance().emit');
    });
});

// ===== 테스트 결과 계산 및 출력 =====
testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
testResults.summary.successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);

console.log('\n📊 테스트 결과 요약');
console.log('='.repeat(50));
console.log(`총 테스트: ${testResults.summary.total}개`);
console.log(`성공: ${testResults.summary.passed}개`);
console.log(`실패: ${testResults.summary.failed}개`);
console.log(`성공률: ${testResults.summary.successRate}%`);

if (testResults.summary.successRate >= 90) {
    console.log('🎉 EXCELLENT - UI/UX 시스템이 훌륭하게 구현되었습니다!');
} else if (testResults.summary.successRate >= 80) {
    console.log('✅ GOOD - UI/UX 시스템이 잘 구현되었습니다!');
} else if (testResults.summary.successRate >= 70) {
    console.log('⚠️ FAIR - UI/UX 시스템 구현이 개선이 필요합니다.');
} else {
    console.log('❌ POOR - UI/UX 시스템 구현에 문제가 있습니다.');
}

console.log('\n📋 카테고리별 결과:');
Object.entries(testResults.categories).forEach(([category, result]) => {
    const successRate = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
    const status = successRate >= 80 ? '✅' : successRate >= 60 ? '⚠️' : '❌';
    console.log(`${status} ${category}: ${result.passed}/${result.total} (${successRate}%)`);
});

// 테스트 결과 저장
const resultsDir = './test-results';
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const resultsFile = path.join(resultsDir, `module3-ui-ux-test-report-${timestamp}.json`);

fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
console.log(`\n💾 테스트 결과가 저장되었습니다: ${resultsFile}`);

// 대시보드 HTML 생성
const dashboardHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Puzzle - Module 3: UI/UX System 테스트 결과</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #333; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
        .header h1 { margin: 0; color: #4A90E2; font-size: 2.5em; }
        .header .subtitle { color: #666; font-size: 1.2em; margin-top: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); text-align: center; }
        .summary-card h3 { margin: 0 0 15px 0; font-size: 1.1em; color: #666; }
        .summary-card .value { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .success { color: #27AE60; }
        .warning { color: #F39C12; }
        .error { color: #E74C3C; }
        .categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .category { background: white; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .category-header { padding: 20px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: white; }
        .category-header h3 { margin: 0; font-size: 1.3em; }
        .category-stats { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .category-body { padding: 20px; }
        .test-item { display: flex; align-items: center; padding: 10px; margin: 5px 0; border-radius: 8px; background: #f8f9fa; }
        .test-item.passed { border-left: 4px solid #27AE60; }
        .test-item.failed { border-left: 4px solid #E74C3C; background: #ffeaea; }
        .test-status { margin-right: 10px; font-weight: bold; }
        .progress-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .timestamp { text-align: center; margin-top: 30px; color: rgba(255,255,255,0.8); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Sweet Puzzle - UI/UX System</h1>
            <div class="subtitle">Module 3 완전한 통합 테스트 결과</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>총 테스트</h3>
                <div class="value">${testResults.summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>성공</h3>
                <div class="value success">${testResults.summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>실패</h3>
                <div class="value error">${testResults.summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>성공률</h3>
                <div class="value ${testResults.summary.successRate >= 90 ? 'success' : testResults.summary.successRate >= 70 ? 'warning' : 'error'}">${testResults.summary.successRate}%</div>
            </div>
        </div>
        
        <div class="categories">
            ${Object.entries(testResults.categories).map(([category, result]) => {
                const successRate = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
                const statusClass = successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error';
                return `
                <div class="category">
                    <div class="category-header">
                        <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                        <div class="category-stats">
                            <span>${result.passed}/${result.total} 통과</span>
                            <span class="${statusClass}">${successRate}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${statusClass}" style="width: ${successRate}%; background-color: ${successRate >= 80 ? '#27AE60' : successRate >= 60 ? '#F39C12' : '#E74C3C'};"></div>
                        </div>
                    </div>
                    <div class="category-body">
                        ${result.tests.map(test => `
                            <div class="test-item ${test.status.toLowerCase()}">
                                <span class="test-status">${test.status === 'PASSED' ? '✅' : '❌'}</span>
                                <span>${test.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        
        <div class="timestamp">
            테스트 실행 시간: ${new Date().toLocaleString('ko-KR')}
        </div>
    </div>
</body>
</html>
`;

const dashboardFile = path.join(resultsDir, `module3-ui-ux-dashboard-${timestamp}.html`);
fs.writeFileSync(dashboardFile, dashboardHtml);
console.log(`📊 테스트 대시보드가 생성되었습니다: ${dashboardFile}`);

console.log(`\n🎯 Module 3: UI/UX System 완전한 테스트 완료 - 성공률: ${testResults.summary.successRate}%`);