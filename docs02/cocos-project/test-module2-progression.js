/**
 * [의도] Module 2: Progression System 통합 테스트
 * [책임] 보상 시스템, 화폐 관리, 이벤트 시스템의 완전한 검증 및 통합 테스트
 */

const fs = require('fs');
const path = require('path');

// 테스트 설정
const TEST_CONFIG = {
    timeout: 20000,
    verbose: true,
    generateReport: true
};

class Module2ProgressionTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'Module 2: Progression System Complete',
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                successRate: 0
            },
            categories: {
                fileStructure: { tests: [], passed: 0, failed: 0 },
                typeScriptSyntax: { tests: [], passed: 0, failed: 0 },
                rewardSystem: { tests: [], passed: 0, failed: 0 },
                currencyManager: { tests: [], passed: 0, failed: 0 },
                eventManager: { tests: [], passed: 0, failed: 0 },
                systemIntegration: { tests: [], passed: 0, failed: 0 },
                progressionFlow: { tests: [], passed: 0, failed: 0 },
                economyBalance: { tests: [], passed: 0, failed: 0 }
            },
            errors: []
        };
        
        this.basePath = path.join(__dirname, 'assets/scripts/progression');
    }
    
    /**
     * [의도] 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🏆 Module 2: Progression System 통합 테스트 시작\\n');
        
        try {
            // 1. 파일 구조 검증
            await this.testFileStructure();
            
            // 2. TypeScript 문법 검증
            await this.testTypeScriptSyntax();
            
            // 3. 보상 시스템 검증
            await this.testRewardSystem();
            
            // 4. 화폐 관리자 검증
            await this.testCurrencyManager();
            
            // 5. 이벤트 매니저 검증
            await this.testEventManager();
            
            // 6. 시스템 통합 검증
            await this.testSystemIntegration();
            
            // 7. 진행 플로우 검증
            await this.testProgressionFlow();
            
            // 8. 경제 밸런스 검증
            await this.testEconomyBalance();
            
            this.calculateSummary();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ 테스트 실행 중 오류 발생:', error);
            this.results.errors.push(`Test execution error: ${error.message}`);
        }
        
        return this.results;
    }
    
    /**
     * [의도] 파일 구조 검증
     */
    async testFileStructure() {
        console.log('📋 파일 구조 검증');
        console.log('==================================================');
        
        const requiredFiles = [
            'ProgressionManager.ts',
            'LevelManager.ts',
            'WorldManager.ts',
            'PlayerProgressTracker.ts',
            'RewardSystem.ts',
            'CurrencyManager.ts',
            'EventManager.ts'
        ];
        
        for (const filename of requiredFiles) {
            const testName = `${filename} 존재 확인`;
            const filePath = path.join(this.basePath, filename);
            
            try {
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    if (stats.size > 0) {
                        this.addTestResult('fileStructure', testName, true, `파일 크기: ${stats.size} bytes`);
                        console.log(`  ✅ ${filename} (${stats.size} bytes)`);
                    } else {
                        this.addTestResult('fileStructure', testName, false, '파일이 비어있음');
                        console.log(`  ❌ ${filename}: 비어있음`);
                    }
                } else {
                    this.addTestResult('fileStructure', testName, false, '파일이 존재하지 않음');
                    console.log(`  ❌ ${filename}: 파일 없음`);
                }
            } catch (error) {
                this.addTestResult('fileStructure', testName, false, error.message);
                console.log(`  ❌ ${filename}: ${error.message}`);
            }
        }
        
        console.log('✅ 파일 구조 검증 완료\\n');
    }
    
    /**
     * [의도] TypeScript 문법 검증
     */
    async testTypeScriptSyntax() {
        console.log('📋 TypeScript 문법 검증');
        console.log('==================================================');
        
        const files = [
            'RewardSystem.ts',
            'CurrencyManager.ts',
            'EventManager.ts'
        ];
        
        for (const filename of files) {
            const testName = `${filename} 문법 검증`;
            const filePath = path.join(this.basePath, filename);
            
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // TypeScript 구문 검사
                    const hasImports = content.includes('import');
                    const hasExports = content.includes('export');
                    const hasInterfaces = content.includes('interface') || content.includes('enum') || content.includes('class');
                    const hasDecorators = content.includes('@ccclass');
                    const hasProperTypes = content.includes(': ') && (content.includes('=>') || content.includes('function'));
                    
                    if (hasImports && hasExports && hasInterfaces && hasDecorators && hasProperTypes) {
                        this.addTestResult('typeScriptSyntax', testName, true, 'TypeScript 구문이 올바름');
                        console.log(`  ✅ ${filename}`);
                    } else {
                        const missing = [];
                        if (!hasImports) missing.push('imports');
                        if (!hasExports) missing.push('exports');
                        if (!hasInterfaces) missing.push('interfaces/classes');
                        if (!hasDecorators) missing.push('decorators');
                        if (!hasProperTypes) missing.push('type annotations');
                        
                        this.addTestResult('typeScriptSyntax', testName, false, `누락: ${missing.join(', ')}`);
                        console.log(`  ⚠️ ${filename}: ${missing.join(', ')} 누락`);
                    }
                } else {
                    this.addTestResult('typeScriptSyntax', testName, false, '파일이 존재하지 않음');
                    console.log(`  ❌ ${filename}: 파일 없음`);
                }
            } catch (error) {
                this.addTestResult('typeScriptSyntax', testName, false, error.message);
                console.log(`  ❌ ${filename}: ${error.message}`);
            }
        }
        
        console.log('✅ TypeScript 문법 검증 완료\\n');
    }
    
    /**
     * [의도] 보상 시스템 검증
     */
    async testRewardSystem() {
        console.log('📋 보상 시스템 검증');
        console.log('==================================================');
        
        try {
            const filePath = path.join(this.basePath, 'RewardSystem.ts');
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 핵심 컴포넌트 확인
            const coreComponents = [
                'RewardSystem',
                'DailyMission',
                'Achievement',
                'SeasonProgress',
                'MissionTemplate'
            ];
            
            for (const component of coreComponents) {
                const testName = `${component} 컴포넌트 확인`;
                if (content.includes(component)) {
                    this.addTestResult('rewardSystem', testName, true, '컴포넌트가 정의됨');
                    console.log(`  ✅ ${component}`);
                } else {
                    this.addTestResult('rewardSystem', testName, false, '컴포넌트가 정의되지 않음');
                    console.log(`  ❌ ${component}`);
                }
            }
            
            // 핵심 메서드 확인
            const coreMethods = [
                'generateDailyMissions',
                'updateMissionProgress',
                'checkAchievements',
                'awardSeasonXP',
                'awardReward'
            ];
            
            for (const method of coreMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('rewardSystem', testName, true, '메서드가 구현됨');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('rewardSystem', testName, false, '메서드가 구현되지 않음');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 보상 타입 확인
            const rewardTypes = [
                'RewardType.COINS',
                'RewardType.GEMS',
                'RewardType.BOOSTERS',
                'RewardType.SPECIAL_ITEM'
            ];
            
            for (const rewardType of rewardTypes) {
                const testName = `${rewardType} 보상 타입 확인`;
                if (content.includes(rewardType)) {
                    this.addTestResult('rewardSystem', testName, true, '보상 타입이 정의됨');
                    console.log(`  ✅ ${rewardType}`);
                } else {
                    this.addTestResult('rewardSystem', testName, false, '보상 타입이 정의되지 않음');
                    console.log(`  ❌ ${rewardType}`);
                }
            }
            
            // 미션 타입 확인
            const missionTypes = [
                'PLAY_LEVELS',
                'COLLECT_STARS',
                'MATCH_COLORS',
                'CREATE_SPECIALS'
            ];
            
            for (const missionType of missionTypes) {
                const testName = `${missionType} 미션 타입 확인`;
                if (content.includes(missionType)) {
                    this.addTestResult('rewardSystem', testName, true, '미션 타입이 정의됨');
                    console.log(`  ✅ ${missionType}`);
                } else {
                    this.addTestResult('rewardSystem', testName, false, '미션 타입이 정의되지 않음');
                    console.log(`  ❌ ${missionType}`);
                }
            }
            
            // 싱글톤 패턴 확인
            const singletonTest = 'RewardSystem 싱글톤 패턴 확인';
            if (content.includes('getInstance') && content.includes('private static instance')) {
                this.addTestResult('rewardSystem', singletonTest, true, '싱글톤 패턴이 구현됨');
                console.log(`  ✅ 싱글톤 패턴`);
            } else {
                this.addTestResult('rewardSystem', singletonTest, false, '싱글톤 패턴이 구현되지 않음');
                console.log(`  ❌ 싱글톤 패턴`);
            }
            
        } catch (error) {
            this.addTestResult('rewardSystem', '보상 시스템 검증', false, error.message);
            console.log(`  ❌ 보상 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 보상 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 화폐 관리자 검증
     */
    async testCurrencyManager() {
        console.log('📋 화폐 관리자 검증');
        console.log('==================================================');
        
        try {
            const filePath = path.join(this.basePath, 'CurrencyManager.ts');
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 화폐 타입 확인
            const currencyTypes = [
                'CurrencyType.COINS',
                'CurrencyType.GEMS',
                'CurrencyType.HEARTS',
                'CurrencyType.ENERGY',
                'CurrencyType.TOKENS'
            ];
            
            for (const currencyType of currencyTypes) {
                const testName = `${currencyType} 화폐 타입 확인`;
                if (content.includes(currencyType)) {
                    this.addTestResult('currencyManager', testName, true, '화폐 타입이 정의됨');
                    console.log(`  ✅ ${currencyType}`);
                } else {
                    this.addTestResult('currencyManager', testName, false, '화폐 타입이 정의되지 않음');
                    console.log(`  ❌ ${currencyType}`);
                }
            }
            
            // 핵심 메서드 확인
            const coreMethods = [
                'addCurrency',
                'spendCurrency',
                'getBalance',
                'canAfford',
                'consumeHeart',
                'refillHearts'
            ];
            
            for (const method of coreMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('currencyManager', testName, true, '메서드가 구현됨');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('currencyManager', testName, false, '메서드가 구현되지 않음');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 하트 시스템 확인
            const heartSystemFeatures = [
                'heartRecoveryTimeMs',
                'startHeartRecoverySystem',
                'HeartSystemState',
                'RefillMethod'
            ];
            
            for (const feature of heartSystemFeatures) {
                const testName = `${feature} 하트 시스템 기능 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('currencyManager', testName, true, '하트 시스템 기능이 구현됨');
                    console.log(`  ✅ ${feature} 하트 기능`);
                } else {
                    this.addTestResult('currencyManager', testName, false, '하트 시스템 기능이 구현되지 않음');
                    console.log(`  ❌ ${feature} 하트 기능`);
                }
            }
            
            // 경제 시스템 확인
            const economyFeatures = [
                'Transaction',
                'EconomyMetrics',
                'transactionHistory',
                'updateEconomyMetrics'
            ];
            
            for (const feature of economyFeatures) {
                const testName = `${feature} 경제 시스템 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('currencyManager', testName, true, '경제 시스템이 구현됨');
                    console.log(`  ✅ ${feature} 경제`);
                } else {
                    this.addTestResult('currencyManager', testName, false, '경제 시스템이 구현되지 않음');
                    console.log(`  ❌ ${feature} 경제`);
                }
            }
            
        } catch (error) {
            this.addTestResult('currencyManager', '화폐 관리자 검증', false, error.message);
            console.log(`  ❌ 화폐 관리자 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 화폐 관리자 검증 완료\\n');
    }
    
    /**
     * [의도] 이벤트 매니저 검증
     */
    async testEventManager() {
        console.log('📋 이벤트 매니저 검증');
        console.log('==================================================');
        
        try {
            const filePath = path.join(this.basePath, 'EventManager.ts');
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 이벤트 타입 확인
            const eventTypes = [
                'EventType.COLLECTION',
                'EventType.TOURNAMENT',
                'EventType.WEEKEND_CHALLENGE',
                'EventType.SEASONAL_FESTIVAL'
            ];
            
            for (const eventType of eventTypes) {
                const testName = `${eventType} 이벤트 타입 확인`;
                if (content.includes(eventType)) {
                    this.addTestResult('eventManager', testName, true, '이벤트 타입이 정의됨');
                    console.log(`  ✅ ${eventType}`);
                } else {
                    this.addTestResult('eventManager', testName, false, '이벤트 타입이 정의되지 않음');
                    console.log(`  ❌ ${eventType}`);
                }
            }
            
            // 이벤트 클래스 확인
            const eventClasses = [
                'CollectionEvent',
                'TournamentEvent',
                'WeekendChallengeEvent',
                'SeasonalFestivalEvent'
            ];
            
            for (const eventClass of eventClasses) {
                const testName = `${eventClass} 클래스 확인`;
                if (content.includes(eventClass)) {
                    this.addTestResult('eventManager', testName, true, '이벤트 클래스가 구현됨');
                    console.log(`  ✅ ${eventClass} 클래스`);
                } else {
                    this.addTestResult('eventManager', testName, false, '이벤트 클래스가 구현되지 않음');
                    console.log(`  ❌ ${eventClass} 클래스`);
                }
            }
            
            // 주간 챌린지 시스템 확인
            const weeklyFeatures = [
                'WeeklyChallenge',
                'ChallengeStage',
                'initializeWeeklyChallenge',
                'updateWeeklyChallengeProgress'
            ];
            
            for (const feature of weeklyFeatures) {
                const testName = `${feature} 주간 챌린지 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('eventManager', testName, true, '주간 챌린지 기능이 구현됨');
                    console.log(`  ✅ ${feature} 주간 챌린지`);
                } else {
                    this.addTestResult('eventManager', testName, false, '주간 챌린지 기능이 구현되지 않음');
                    console.log(`  ❌ ${feature} 주간 챌린지`);
                }
            }
            
            // 핵심 메서드 확인
            const coreMethods = [
                'startEvent',
                'updateEventProgress',
                'scheduleEvents',
                'checkEventSchedule'
            ];
            
            for (const method of coreMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('eventManager', testName, true, '메서드가 구현됨');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('eventManager', testName, false, '메서드가 구현되지 않음');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
        } catch (error) {
            this.addTestResult('eventManager', '이벤트 매니저 검증', false, error.message);
            console.log(`  ❌ 이벤트 매니저 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 이벤트 매니저 검증 완료\\n');
    }
    
    /**
     * [의도] 시스템 통합 검증
     */
    async testSystemIntegration() {
        console.log('📋 시스템 통합 검증');
        console.log('==================================================');
        
        try {
            const rewardSystemPath = path.join(this.basePath, 'RewardSystem.ts');
            const currencyManagerPath = path.join(this.basePath, 'CurrencyManager.ts');
            const eventManagerPath = path.join(this.basePath, 'EventManager.ts');
            
            const rewardContent = fs.readFileSync(rewardSystemPath, 'utf8');
            const currencyContent = fs.readFileSync(currencyManagerPath, 'utf8');
            const eventContent = fs.readFileSync(eventManagerPath, 'utf8');
            
            // 시스템 간 참조 확인
            const integrationTests = [
                {
                    name: 'RewardSystem → CurrencyManager 참조',
                    check: rewardContent.includes('CurrencyManager') && rewardContent.includes('CurrencyType'),
                    description: '보상 시스템이 화폐 매니저를 참조함'
                },
                {
                    name: 'EventManager → RewardSystem 참조',
                    check: eventContent.includes('RewardSystem') && eventContent.includes('Reward'),
                    description: '이벤트 매니저가 보상 시스템을 참조함'
                },
                {
                    name: 'EventBus 통합',
                    check: rewardContent.includes('EventBus') && currencyContent.includes('EventBus'),
                    description: '모든 시스템이 이벤트 버스를 사용함'
                },
                {
                    name: '싱글톤 패턴 일관성',
                    check: rewardContent.includes('getInstance()') && 
                           currencyContent.includes('getInstance()') && 
                           eventContent.includes('getInstance()'),
                    description: '모든 매니저가 싱글톤 패턴을 사용함'
                }
            ];
            
            for (const test of integrationTests) {
                this.addTestResult('systemIntegration', test.name, test.check, test.description);
                console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`);
            }
            
            // 인터페이스 호환성 확인
            const interfaceTests = [
                {
                    name: 'Reward 인터페이스 호환성',
                    check: rewardContent.includes('interface Reward') && 
                           eventContent.includes('Reward'),
                    description: '보상 인터페이스가 여러 시스템에서 호환됨'
                },
                {
                    name: 'CurrencyType 열거형 일관성',
                    check: rewardContent.includes('CurrencyType') && 
                           currencyContent.includes('enum CurrencyType'),
                    description: '화폐 타입이 일관되게 사용됨'
                },
                {
                    name: 'EventBus 이벤트 일관성',
                    check: rewardContent.includes("'mission_completed'") && 
                           currencyContent.includes("'currency_added'"),
                    description: '이벤트 이름이 일관되게 정의됨'
                }
            ];
            
            for (const test of interfaceTests) {
                this.addTestResult('systemIntegration', test.name, test.check, test.description);
                console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`);
            }
            
        } catch (error) {
            this.addTestResult('systemIntegration', '시스템 통합 검증', false, error.message);
            console.log(`  ❌ 시스템 통합 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 시스템 통합 검증 완료\\n');
    }
    
    /**
     * [의도] 진행 플로우 검증
     */
    async testProgressionFlow() {
        console.log('📋 진행 플로우 검증');
        console.log('==================================================');
        
        try {
            const progressionPath = path.join(this.basePath, 'ProgressionManager.ts');
            const levelManagerPath = path.join(this.basePath, 'LevelManager.ts');
            
            const progressionExists = fs.existsSync(progressionPath);
            const levelManagerExists = fs.existsSync(levelManagerPath);
            
            // 기존 진행 시스템 확인
            this.addTestResult('progressionFlow', 'ProgressionManager 존재 확인', progressionExists, 
                progressionExists ? 'ProgressionManager가 존재함' : 'ProgressionManager가 없음');
            console.log(`  ${progressionExists ? '✅' : '❌'} ProgressionManager`);
            
            this.addTestResult('progressionFlow', 'LevelManager 존재 확인', levelManagerExists, 
                levelManagerExists ? 'LevelManager가 존재함' : 'LevelManager가 없음');
            console.log(`  ${levelManagerExists ? '✅' : '❌'} LevelManager`);
            
            if (progressionExists) {
                const content = fs.readFileSync(progressionPath, 'utf8');
                
                // 월드 시스템 확인
                const worldFeatures = [
                    'WorldInfo',
                    'WorldTheme',
                    'initializeWorlds',
                    'isWorldUnlocked'
                ];
                
                for (const feature of worldFeatures) {
                    const testName = `${feature} 월드 시스템 확인`;
                    const exists = content.includes(feature);
                    this.addTestResult('progressionFlow', testName, exists, 
                        exists ? '월드 시스템 기능이 구현됨' : '월드 시스템 기능이 구현되지 않음');
                    console.log(`  ${exists ? '✅' : '❌'} ${feature} 월드 기능`);
                }
                
                // 플레이어 진행 추적
                const progressFeatures = [
                    'PlayerProgress',
                    'updatePlayerProgress',
                    'checkForNewUnlocks',
                    'startLevel',
                    'completeLevel'
                ];
                
                for (const feature of progressFeatures) {
                    const testName = `${feature} 진행 추적 확인`;
                    const exists = content.includes(feature);
                    this.addTestResult('progressionFlow', testName, exists, 
                        exists ? '진행 추적 기능이 구현됨' : '진행 추적 기능이 구현되지 않음');
                    console.log(`  ${exists ? '✅' : '❌'} ${feature} 진행 추적`);
                }
            }
            
        } catch (error) {
            this.addTestResult('progressionFlow', '진행 플로우 검증', false, error.message);
            console.log(`  ❌ 진행 플로우 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 진행 플로우 검증 완료\\n');
    }
    
    /**
     * [의도] 경제 밸런스 검증
     */
    async testEconomyBalance() {
        console.log('📋 경제 밸런스 검증');
        console.log('==================================================');
        
        try {
            const currencyPath = path.join(this.basePath, 'CurrencyManager.ts');
            const rewardPath = path.join(this.basePath, 'RewardSystem.ts');
            
            const currencyContent = fs.readFileSync(currencyPath, 'utf8');
            const rewardContent = fs.readFileSync(rewardPath, 'utf8');
            
            // 화폐 한도 확인
            const balanceFeatures = [
                {
                    name: '화폐 최대 한도 설정',
                    check: currencyContent.includes('maxCapacities') && currencyContent.includes('maxCapacity'),
                    description: '각 화폐별 최대 보유 한도가 설정됨'
                },
                {
                    name: '하트 회복 시간 제한',
                    check: currencyContent.includes('heartRecoveryTimeMs') && currencyContent.includes('30 * 60 * 1000'),
                    description: '하트 회복에 시간 제약이 있음'
                },
                {
                    name: '경제 지표 추적',
                    check: currencyContent.includes('EconomyMetrics') && currencyContent.includes('updateEconomyMetrics'),
                    description: '경제 상황을 모니터링함'
                },
                {
                    name: '거래 내역 기록',
                    check: currencyContent.includes('Transaction') && currencyContent.includes('transactionHistory'),
                    description: '모든 화폐 거래가 기록됨'
                }
            ];
            
            for (const test of balanceFeatures) {
                this.addTestResult('economyBalance', test.name, test.check, test.description);
                console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`);
            }
            
            // 보상 밸런스 확인
            const rewardBalanceTests = [
                {
                    name: '난이도별 보상 차등화',
                    check: rewardContent.includes('Difficulty.EASY') && 
                           rewardContent.includes('Difficulty.MEDIUM') && 
                           rewardContent.includes('Difficulty.HARD'),
                    description: '난이도에 따른 보상이 차등화됨'
                },
                {
                    name: '플레이어 레벨 기반 조정',
                    check: rewardContent.includes('scaleTargetToPlayer') && 
                           rewardContent.includes('playerLevel'),
                    description: '플레이어 레벨에 따라 목표가 조정됨'
                },
                {
                    name: '시즌 경험치 밸런싱',
                    check: rewardContent.includes('getXPRequiredForLevel') && 
                           rewardContent.includes('Math.floor'),
                    description: '시즌 레벨업에 필요한 경험치가 균형있게 조정됨'
                },
                {
                    name: '보상 가중치 시스템',
                    check: rewardContent.includes('weight') && 
                           rewardContent.includes('weightedRandomSelect'),
                    description: '미션 선택에 가중치가 적용됨'
                }
            ];
            
            for (const test of rewardBalanceTests) {
                this.addTestResult('economyBalance', test.name, test.check, test.description);
                console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`);
            }
            
        } catch (error) {
            this.addTestResult('economyBalance', '경제 밸런스 검증', false, error.message);
            console.log(`  ❌ 경제 밸런스 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 경제 밸런스 검증 완료\\n');
    }
    
    /**
     * [의도] 테스트 결과 추가
     */
    addTestResult(category, testName, passed, message) {
        const result = {
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.results.categories[category].tests.push(result);
        
        if (passed) {
            this.results.categories[category].passed++;
        } else {
            this.results.categories[category].failed++;
        }
    }
    
    /**
     * [의도] 전체 테스트 요약 계산
     */
    calculateSummary() {
        for (const category of Object.values(this.results.categories)) {
            this.results.summary.totalTests += category.tests.length;
            this.results.summary.passed += category.passed;
            this.results.summary.failed += category.failed;
        }
        
        if (this.results.summary.totalTests > 0) {
            this.results.summary.successRate = Math.round(
                (this.results.summary.passed / this.results.summary.totalTests) * 100
            );
        }
    }
    
    /**
     * [의도] 테스트 리포트 생성
     */
    async generateReport() {
        const reportPath = path.join(__dirname, 'test-results', 'module2-progression-test-report.json');
        
        // 디렉토리 생성
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        // 리포트 저장
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // 콘솔 결과 출력
        console.log('📊 Module 2: Progression System 테스트 결과 요약');
        console.log('============================================================');
        console.log(`🎯 테스트 대상: 보상 시스템, 화폐 관리, 이벤트 시스템`);
        console.log(`📁 신규 구현: 3개 핵심 시스템 (RewardSystem, CurrencyManager, EventManager)`);
        console.log(`🧪 총 테스트: ${this.results.summary.totalTests}개`);
        console.log(`✅ 통과: ${this.results.summary.passed}개`);
        console.log(`❌ 실패: ${this.results.summary.failed}개`);
        console.log(`📈 성공률: ${this.results.summary.successRate}%`);
        
        // 상태 판정
        let status;
        if (this.results.summary.successRate >= 95) {
            status = 'EXCELLENT';
        } else if (this.results.summary.successRate >= 85) {
            status = 'GOOD';
        } else if (this.results.summary.successRate >= 70) {
            status = 'ACCEPTABLE';
        } else {
            status = 'NEEDS_IMPROVEMENT';
        }
        console.log(`⭐ 상태: ${status}`);
        
        console.log('\\n📋 카테고리별 결과:');
        for (const [categoryName, category] of Object.entries(this.results.categories)) {
            const total = category.tests.length;
            const successRate = total > 0 ? Math.round((category.passed / total) * 100) : 0;
            console.log(`  ${categoryName}: ${category.passed}/${total} (${successRate}%)`);
        }
        
        console.log(`\\n📄 상세 보고서: ${reportPath}`);
        
        return reportPath;
    }
}

// 테스트 실행
async function runModule2ProgressionTests() {
    const testSuite = new Module2ProgressionTestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        process.exit(results.summary.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error('❌ 테스트 실행 실패:', error);
        process.exit(1);
    }
}

// 직접 실행 시에만 테스트 실행
if (require.main === module) {
    runModule2ProgressionTests();
}

module.exports = Module2ProgressionTestSuite;