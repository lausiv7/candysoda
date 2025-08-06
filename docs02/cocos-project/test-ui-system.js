/**
 * [의도] Sweet Puzzle UI 시스템 통합 테스트 스크립트
 * [책임] UI 씬들의 구조, 통합성, 상호작용 검증
 */

const fs = require('fs');
const path = require('path');

class UISystemTester {
    constructor() {
        this.testResults = {
            sceneStructure: { passed: 0, failed: 0, errors: [] },
            sceneInteraction: { passed: 0, failed: 0, errors: [] },
            dataFlow: { passed: 0, failed: 0, errors: [] },
            integration: { passed: 0, failed: 0, errors: [] },
            totalTests: 0,
            startTime: Date.now()
        };
        
        this.scriptsPath = path.join(__dirname, 'assets/scripts');
        this.uiScenes = [
            'ui/UIManager.ts',
            'ui/BaseUIScene.ts',
            'ui/GamePlayScene.ts',
            'ui/WorldMapScene.ts',
            'ui/LevelSelectScene.ts',
            'ui/LevelCompleteScene.ts',
            'ui/PauseScene.ts',
            'ui/MainMenuScene.ts'
        ];
    }
    
    async runAllTests() {
        console.log('🎨 Sweet Puzzle UI 시스템 통합 테스트 시작\n');
        
        try {
            await this.verifySceneStructures();
            await this.verifySceneInteractions();
            await this.verifyDataFlows();
            await this.verifySystemIntegration();
            
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ UI 테스트 실행 중 오류 발생:', error);
        }
    }
    
    async verifySceneStructures() {
        console.log('🏗️ UI 씬 구조 검증 중...');
        
        const sceneTests = [
            {
                file: 'ui/UIManager.ts',
                expectedElements: ['UIScene enum', 'TransitionType enum', 'UIManager class'],
                requiredMethods: ['switchToScene', 'showModal', 'closeModal', 'getUIState']
            },
            {
                file: 'ui/BaseUIScene.ts',
                expectedElements: ['BaseUIScene class', 'onSceneEnter method'],
                requiredMethods: ['onSceneEnter', 'onSceneExit', 'onReceiveData', 'setupScene']
            },
            {
                file: 'ui/GamePlayScene.ts',
                expectedElements: ['GamePlayScene extends BaseUIScene', 'GamePlayData interface'],
                requiredMethods: ['setupScene', 'updateUI', 'onScoreUpdate', 'onLevelComplete']
            },
            {
                file: 'ui/WorldMapScene.ts',
                expectedElements: ['WorldMapScene extends BaseUIScene'],
                requiredMethods: ['createWorldNodes', 'onWorldClicked', 'updatePlayerInfo']
            },
            {
                file: 'ui/LevelSelectScene.ts',
                expectedElements: ['LevelSelectScene extends BaseUIScene'],
                requiredMethods: ['createLevelNodes', 'onLevelClicked', 'showLevelInfo']
            },
            {
                file: 'ui/LevelCompleteScene.ts',
                expectedElements: ['LevelCompleteScene extends BaseUIScene'],
                requiredMethods: ['startResultAnimation', 'animateStars', 'animateRewards']
            }
        ];
        
        let passedScenes = 0;
        
        for (const test of sceneTests) {
            const filePath = path.join(this.scriptsPath, test.file);
            
            if (!fs.existsSync(filePath)) {
                console.log(`  ❌ ${test.file} - 파일 없음`);
                this.testResults.sceneStructure.failed++;
                this.testResults.sceneStructure.errors.push(`파일 없음: ${test.file}`);
                continue;
            }
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                let score = 0;
                const maxScore = test.expectedElements.length + test.requiredMethods.length;
                
                for (const element of test.expectedElements) {
                    if (content.includes(element.split(' ')[0])) {
                        score++;
                    }
                }
                
                for (const method of test.requiredMethods) {
                    const methodPattern = new RegExp(`${method}\\s*\\(`);
                    if (methodPattern.test(content)) {
                        score++;
                    }
                }
                
                const percentage = Math.round((score / maxScore) * 100);
                
                if (percentage >= 80) {
                    console.log(`  ✅ ${path.basename(test.file)} - 구조 검증 통과 (${score}/${maxScore}, ${percentage}%)`);
                    passedScenes++;
                    this.testResults.sceneStructure.passed++;
                } else {
                    console.log(`  ⚠️ ${path.basename(test.file)} - 구조 검증 부분 통과 (${score}/${maxScore}, ${percentage}%)`);
                    this.testResults.sceneStructure.failed++;
                    this.testResults.sceneStructure.errors.push(`구조 미완성: ${test.file}`);
                }
                
            } catch (error) {
                console.log(`  ❌ ${path.basename(test.file)} - 구조 검증 오류: ${error.message}`);
                this.testResults.sceneStructure.failed++;
                this.testResults.sceneStructure.errors.push(`구조 검증 오류: ${test.file}`);
            }
        }
        
        this.testResults.totalTests += sceneTests.length;
        console.log(`🏗️ UI 씬 구조 검증 완료: ${passedScenes}/${sceneTests.length} 통과\n`);
    }
    
    async verifySceneInteractions() {
        console.log('🔄 씬 간 상호작용 검증 중...');
        
        const interactionTests = [
            {
                name: 'MainMenu → WorldMap 전환',
                fromScene: 'ui/MainMenuScene.ts',
                toScene: 'WORLD_MAP',
                triggerMethod: 'onPlayClicked'
            },
            {
                name: 'WorldMap → LevelSelect 전환',
                fromScene: 'ui/WorldMapScene.ts',
                toScene: 'LEVEL_SELECT',
                triggerMethod: 'onWorldClicked'
            },
            {
                name: 'LevelSelect → GamePlay 전환',
                fromScene: 'ui/LevelSelectScene.ts',
                toScene: 'GAME_PLAY',
                triggerMethod: 'onPlayLevelClicked'
            },
            {
                name: 'GamePlay → LevelComplete 전환',
                fromScene: 'ui/GamePlayScene.ts',
                toScene: 'LEVEL_COMPLETE',
                triggerMethod: 'onLevelComplete'
            },
            {
                name: 'GamePlay ↔ Pause 모달',
                fromScene: 'ui/GamePlayScene.ts',
                toScene: 'PAUSE',
                triggerMethod: 'onPauseClicked'
            }
        ];
        
        let passedInteractions = 0;
        
        for (const test of interactionTests) {
            const filePath = path.join(this.scriptsPath, test.fromScene);
            
            if (!fs.existsSync(filePath)) {
                console.log(`  ❌ ${test.name} - 소스 파일 없음`);
                this.testResults.sceneInteraction.failed++;
                continue;
            }
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                const uiManagerCallPattern = new RegExp(`UIManager\\.getInstance\\(\\)\\.switchToScene\\(\\s*UIScene\\.${test.toScene}`);
                const modalCallPattern = new RegExp(`UIManager\\.getInstance\\(\\)\\.showModal\\(\\s*UIScene\\.${test.toScene}`);
                const triggerPattern = new RegExp(`${test.triggerMethod}\\s*\\(`);
                
                const hasUICall = uiManagerCallPattern.test(content) || modalCallPattern.test(content);
                const hasTrigger = triggerPattern.test(content);
                
                if (hasUICall && hasTrigger) {
                    console.log(`  ✅ ${test.name} - 상호작용 검증 통과`);
                    passedInteractions++;
                    this.testResults.sceneInteraction.passed++;
                } else {
                    console.log(`  ⚠️ ${test.name} - 상호작용 검증 부분 통과 (UI:${hasUICall}, Trigger:${hasTrigger})`);
                    this.testResults.sceneInteraction.failed++;
                    this.testResults.sceneInteraction.errors.push(`상호작용 미완성: ${test.name}`);
                }
                
            } catch (error) {
                console.log(`  ❌ ${test.name} - 상호작용 검증 오류: ${error.message}`);
                this.testResults.sceneInteraction.failed++;
                this.testResults.sceneInteraction.errors.push(`상호작용 오류: ${test.name}`);
            }
        }
        
        this.testResults.totalTests += interactionTests.length;
        console.log(`🔄 씬 간 상호작용 검증 완료: ${passedInteractions}/${interactionTests.length} 통과\n`);
    }
    
    async verifyDataFlows() {
        console.log('📊 데이터 플로우 검증 중...');
        
        const dataFlowTests = [
            {
                name: '레벨 데이터 전달 플로우',
                scenes: ['LevelSelectScene', 'GamePlayScene'],
                dataInterface: 'GamePlayData',
                requiredFields: ['levelId', 'worldId', 'targetScore', 'maxMoves']
            },
            {
                name: '레벨 완료 결과 플로우',
                scenes: ['GamePlayScene', 'LevelCompleteScene'],
                dataInterface: 'LevelCompleteData',
                requiredFields: ['score', 'stars', 'levelId', 'rewards']
            },
            {
                name: '월드맵 상태 플로우',
                scenes: ['MainMenuScene', 'WorldMapScene'],
                dataInterface: 'WorldMapData',
                requiredFields: ['currentWorldId', 'unlockedWorlds']
            },
            {
                name: '일시정지 상태 플로우',
                scenes: ['GamePlayScene', 'PauseScene'],
                dataInterface: 'PauseSceneData',
                requiredFields: ['type', 'currentScore', 'remainingMoves']
            }
        ];
        
        let passedFlows = 0;
        
        for (const test of dataFlowTests) {
            console.log(`  🔄 ${test.name} 플로우 검증 중...`);
            
            let flowScore = 0;
            const maxFlowScore = test.scenes.length + 1;
            
            let interfaceFound = false;
            for (const scene of test.scenes) {
                const sceneFile = `ui/${scene}.ts`;
                const filePath = path.join(this.scriptsPath, sceneFile);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes(`interface ${test.dataInterface}`)) {
                        interfaceFound = true;
                        break;
                    }
                }
            }
            
            if (interfaceFound) {
                flowScore++;
            }
            
            for (const scene of test.scenes) {
                const sceneFile = `ui/${scene}.ts`;
                const filePath = path.join(this.scriptsPath, sceneFile);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes(test.dataInterface)) {
                        flowScore++;
                    }
                }
            }
            
            const flowPercentage = Math.round((flowScore / maxFlowScore) * 100);
            
            if (flowPercentage >= 70) {
                console.log(`    ✅ ${test.name} - 플로우 검증 통과 (${flowScore}/${maxFlowScore})`);
                passedFlows++;
                this.testResults.dataFlow.passed++;
            } else {
                console.log(`    ⚠️ ${test.name} - 플로우 검증 부분 통과 (${flowScore}/${maxFlowScore})`);
                this.testResults.dataFlow.failed++;
                this.testResults.dataFlow.errors.push(`데이터 플로우 미완성: ${test.name}`);
            }
        }
        
        this.testResults.totalTests += dataFlowTests.length;
        console.log(`📊 데이터 플로우 검증 완료: ${passedFlows}/${dataFlowTests.length} 통과\n`);
    }
    
    async verifySystemIntegration() {
        console.log('🔗 시스템 통합 검증 중...');
        
        const integrationTests = [
            {
                name: 'UI-퍼즐 시스템 통합',
                description: 'GamePlayScene이 GameBoard와 올바르게 연결되는가',
                checkFiles: ['ui/GamePlayScene.ts'],
                expectedConnections: ['GameBoard', 'onScoreUpdate', 'onLevelComplete']
            },
            {
                name: 'UI-진행 시스템 통합',
                description: '진행 매니저들이 UI 씬들과 올바르게 연결되는가',
                checkFiles: ['ui/WorldMapScene.ts', 'ui/LevelSelectScene.ts'],
                expectedConnections: ['ProgressionManager', 'LevelManager', 'getPlayerProgress']
            },
            {
                name: 'UIManager 싱글톤 패턴',
                description: 'UIManager가 싱글톤으로 올바르게 구현되었는가',
                checkFiles: ['ui/UIManager.ts'],
                expectedConnections: ['getInstance', 'private static instance']
            },
            {
                name: '씬 전환 애니메이션 시스템',
                description: '씬 전환 시 애니메이션이 올바르게 구현되었는가',
                checkFiles: ['ui/UIManager.ts'],
                expectedConnections: ['TransitionType', 'playTransitionAnimation', 'tween']
            }
        ];
        
        let passedIntegrations = 0;
        
        for (const test of integrationTests) {
            console.log(`  🔍 ${test.name} 통합 검증 중...`);
            
            let integrationScore = 0;
            let filesChecked = 0;
            
            for (const file of test.checkFiles) {
                const filePath = path.join(this.scriptsPath, file);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    filesChecked++;
                    
                    let connectionsFound = 0;
                    for (const connection of test.expectedConnections) {
                        if (content.includes(connection)) {
                            connectionsFound++;
                        }
                    }
                    
                    if (connectionsFound >= Math.ceil(test.expectedConnections.length * 0.7)) {
                        integrationScore++;
                    }
                }
            }
            
            const integrationPercentage = filesChecked > 0 ? Math.round((integrationScore / filesChecked) * 100) : 0;
            
            if (integrationPercentage >= 75) {
                console.log(`    ✅ ${test.name} - 통합 검증 통과 (${integrationScore}/${filesChecked} 파일)`);
                passedIntegrations++;
                this.testResults.integration.passed++;
            } else {
                console.log(`    ⚠️ ${test.name} - 통합 검증 부분 통과 (${integrationScore}/${filesChecked} 파일)`);
                this.testResults.integration.failed++;
                this.testResults.integration.errors.push(`시스템 통합 미완성: ${test.name}`);
            }
        }
        
        this.testResults.totalTests += integrationTests.length;
        console.log(`🔗 시스템 통합 검증 완료: ${passedIntegrations}/${integrationTests.length} 통과\n`);
    }
    
    generateTestReport() {
        const endTime = Date.now();
        const duration = (endTime - this.testResults.startTime) / 1000;
        
        const totalPassed = this.testResults.sceneStructure.passed + 
                          this.testResults.sceneInteraction.passed + 
                          this.testResults.dataFlow.passed + 
                          this.testResults.integration.passed;
        
        const totalFailed = this.testResults.sceneStructure.failed + 
                          this.testResults.sceneInteraction.failed + 
                          this.testResults.dataFlow.failed + 
                          this.testResults.integration.failed;
        
        const successRate = Math.round((totalPassed / this.testResults.totalTests) * 100);
        
        console.log('🎨 === Sweet Puzzle UI 시스템 테스트 결과 ===\n');
        console.log(`🕒 테스트 소요 시간: ${duration.toFixed(2)}초`);
        console.log(`📈 전체 성공률: ${successRate}% (${totalPassed}/${this.testResults.totalTests})\n`);
        
        console.log('🏗️ 씬 구조 테스트:');
        console.log(`   ✅ 통과: ${this.testResults.sceneStructure.passed}`);
        console.log(`   ❌ 실패: ${this.testResults.sceneStructure.failed}`);
        
        console.log('\n🔄 씬 상호작용 테스트:');
        console.log(`   ✅ 통과: ${this.testResults.sceneInteraction.passed}`);
        console.log(`   ❌ 실패: ${this.testResults.sceneInteraction.failed}`);
        
        console.log('\n📊 데이터 플로우 테스트:');
        console.log(`   ✅ 통과: ${this.testResults.dataFlow.passed}`);
        console.log(`   ❌ 실패: ${this.testResults.dataFlow.failed}`);
        
        console.log('\n🔗 시스템 통합 테스트:');
        console.log(`   ✅ 통과: ${this.testResults.integration.passed}`);
        console.log(`   ❌ 실패: ${this.testResults.integration.failed}`);
        
        console.log('\n🎯 UI 시스템 평가:');
        if (successRate >= 90) {
            console.log('   🌟 우수: UI 시스템이 매우 안정적으로 구현되었습니다!');
        } else if (successRate >= 80) {
            console.log('   ✅ 양호: UI 시스템이 잘 구현되었습니다. 일부 개선이 필요합니다.');
        } else if (successRate >= 70) {
            console.log('   ⚠️ 보통: 기본 UI 기능은 작동하지만 추가 개발이 필요합니다.');
        } else {
            console.log('   ❌ 개선 필요: 여러 UI 문제가 발견되었습니다. 코드 검토가 필요합니다.');
        }
        
        console.log('\n🎮 Sweet Puzzle UI 시스템 테스트 완료!\n');
        
        this.saveJsonReport(successRate, duration);
    }
    
    saveJsonReport(successRate, duration) {
        const report = {
            timestamp: new Date().toISOString(),
            system: 'UI System',
            duration: duration,
            successRate: successRate,
            totalTests: this.testResults.totalTests,
            results: this.testResults,
            summary: {
                status: successRate >= 75 ? 'PASS' : 'FAIL',
                readyForRelease: successRate >= 80,
                recommendedActions: this.getUIRecommendedActions(successRate)
            }
        };
        
        const reportPath = path.join(__dirname, 'test-results', 'ui-system-test-report.json');
        
        const testResultsDir = path.dirname(reportPath);
        if (!fs.existsSync(testResultsDir)) {
            fs.mkdirSync(testResultsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 상세 UI 리포트 저장: ${reportPath}`);
    }
    
    getUIRecommendedActions(successRate) {
        if (successRate >= 90) {
            return ['UI 최적화 및 폴리싱', '사용자 경험 개선', '출시 준비'];
        } else if (successRate >= 80) {
            return ['일부 UI 이슈 수정', '씬 전환 최적화', '통합 테스트 보강'];
        } else if (successRate >= 70) {
            return ['주요 UI 오류 수정', '데이터 플로우 안정화', '씬 통합성 개선'];
        } else {
            return ['UI 아키텍처 재검토', '씬 구조 개선', '전면적인 UI 시스템 점검'];
        }
    }
}

if (require.main === module) {
    const tester = new UISystemTester();
    tester.runAllTests();
}

module.exports = UISystemTester;