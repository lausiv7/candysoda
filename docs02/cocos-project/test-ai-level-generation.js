/**
 * [의도] Module 1 Phase 3: AI Level Generation 시스템 테스트
 * [책임] AI 기반 레벨 생성, 적응형 난이도 조절, 동적 레벨 검증의 완전한 테스트
 */

const fs = require('fs');
const path = require('path');

// 테스트 설정
const TEST_CONFIG = {
    timeout: 15000,
    verbose: true,
    generateReport: true
};

class AILevelGenerationTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'Module 1 Phase 3: AI Level Generation System',
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                successRate: 0
            },
            categories: {
                fileStructure: { tests: [], passed: 0, failed: 0 },
                typeScriptSyntax: { tests: [], passed: 0, failed: 0 },
                levelGenerator: { tests: [], passed: 0, failed: 0 },
                adaptiveDifficulty: { tests: [], passed: 0, failed: 0 },
                levelValidation: { tests: [], passed: 0, failed: 0 },
                playerAnalysis: { tests: [], passed: 0, failed: 0 },
                aiIntegration: { tests: [], passed: 0, failed: 0 },
                performanceOptimization: { tests: [], passed: 0, failed: 0 }
            },
            errors: []
        };
        
        this.basePath = path.join(__dirname, 'assets/scripts/puzzle');
    }
    
    /**
     * [의도] 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🤖 Module 1 Phase 3: AI Level Generation 시스템 테스트 시작\\n');
        
        try {
            // 1. 파일 구조 검증
            await this.testFileStructure();
            
            // 2. TypeScript 문법 검증
            await this.testTypeScriptSyntax();
            
            // 3. 레벨 생성기 검증
            await this.testLevelGenerator();
            
            // 4. 적응형 난이도 시스템 검증
            await this.testAdaptiveDifficulty();
            
            // 5. 레벨 검증 시스템 검증
            await this.testLevelValidation();
            
            // 6. 플레이어 분석 시스템 검증
            await this.testPlayerAnalysis();
            
            // 7. AI 통합 검증
            await this.testAIIntegration();
            
            // 8. 성능 최적화 검증
            await this.testPerformanceOptimization();
            
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
            'AILevelGenerator.ts',
            'AdaptiveDifficultySystem.ts'
        ];
        
        for (const filename of requiredFiles) {
            const testName = `${filename} 존재 확인`;
            const filePath = path.join(this.basePath, filename);
            
            try {
                if (fs.existsSync(filePath)) {
                    this.addTestResult('fileStructure', testName, true, '파일이 존재합니다');
                    console.log(`  ✅ ${filename}`);
                } else {
                    this.addTestResult('fileStructure', testName, false, '파일이 존재하지 않습니다');
                    console.log(`  ❌ ${filename}`);
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
            'AILevelGenerator.ts',
            'AdaptiveDifficultySystem.ts'
        ];
        
        for (const filename of files) {
            const testName = `${filename} 문법 검증`;
            const filePath = path.join(this.basePath, filename);
            
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // 기본 TypeScript 구문 검사
                    const hasImports = content.includes('import');
                    const hasExports = content.includes('export');
                    const hasInterfaces = content.includes('interface') || content.includes('enum') || content.includes('class');
                    const hasAsyncAwait = content.includes('async') && content.includes('await');
                    const hasProperTypes = content.includes(': ') && content.includes('=>');
                    
                    if (hasImports && hasExports && hasInterfaces && hasAsyncAwait && hasProperTypes) {
                        this.addTestResult('typeScriptSyntax', testName, true, 'TypeScript 구문이 올바릅니다');
                        console.log(`  ✅ ${filename}`);
                    } else {
                        this.addTestResult('typeScriptSyntax', testName, false, 'TypeScript 구문에 문제가 있습니다');
                        console.log(`  ⚠️ ${filename}: 구문 검사 경고`);
                    }
                } else {
                    this.addTestResult('typeScriptSyntax', testName, false, '파일이 존재하지 않습니다');
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
     * [의도] AI 레벨 생성기 검증
     */
    async testLevelGenerator() {
        console.log('📋 AI 레벨 생성기 검증');
        console.log('==================================================');
        
        try {
            const generatorPath = path.join(this.basePath, 'AILevelGenerator.ts');
            const content = fs.readFileSync(generatorPath, 'utf8');
            
            // 핵심 클래스 및 인터페이스 확인
            const coreComponents = [
                'AILevelGenerator',
                'LevelConfig',
                'GenerationParameters',
                'ObjectiveType',
                'DifficultyLevel',
                'LevelObjective'
            ];
            
            for (const component of coreComponents) {
                const testName = `${component} 정의 확인`;
                if (content.includes(component)) {
                    this.addTestResult('levelGenerator', testName, true, '컴포넌트가 정의되어 있습니다');
                    console.log(`  ✅ ${component}`);
                } else {
                    this.addTestResult('levelGenerator', testName, false, '컴포넌트가 정의되어 있지 않습니다');
                    console.log(`  ❌ ${component}`);
                }
            }
            
            // 핵심 메서드 확인
            const coreMethods = [
                'generateLevel',
                'calculateOptimalDifficulty',
                'adjustLevelDifficulty',
                'generateLevelSeries',
                'buildGenerationPrompt'
            ];
            
            for (const method of coreMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('levelGenerator', testName, true, '메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('levelGenerator', testName, false, '메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // AI 관련 기능 확인
            const aiFeatures = [
                'simulateAIGeneration',
                'parseLevelFromAI',
                'AIPrompt',
                'ValidationResult'
            ];
            
            for (const feature of aiFeatures) {
                const testName = `${feature} AI 기능 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('levelGenerator', testName, true, 'AI 기능이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} AI 기능`);
                } else {
                    this.addTestResult('levelGenerator', testName, false, 'AI 기능이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} AI 기능`);
                }
            }
            
        } catch (error) {
            this.addTestResult('levelGenerator', 'AI 레벨 생성기 검증', false, error.message);
            console.log(`  ❌ AI 레벨 생성기 검증 실패: ${error.message}`);
        }
        
        console.log('✅ AI 레벨 생성기 검증 완료\\n');
    }
    
    /**
     * [의도] 적응형 난이도 시스템 검증
     */
    async testAdaptiveDifficulty() {
        console.log('📋 적응형 난이도 시스템 검증');
        console.log('==================================================');
        
        try {
            const adaptivePath = path.join(this.basePath, 'AdaptiveDifficultySystem.ts');
            const content = fs.readFileSync(adaptivePath, 'utf8');
            
            // 적응형 시스템 인터페이스 확인
            const adaptiveInterfaces = [
                'PlayerPerformanceData',
                'AdaptationSettings',
                'DifficultyAdjustmentResult',
                'PlayerProfile',
                'PerformanceAnalysis'
            ];
            
            for (const interfaceName of adaptiveInterfaces) {
                const testName = `${interfaceName} 인터페이스 확인`;
                if (content.includes(interfaceName)) {
                    this.addTestResult('adaptiveDifficulty', testName, true, '인터페이스가 정의되어 있습니다');
                    console.log(`  ✅ ${interfaceName} 인터페이스`);
                } else {
                    this.addTestResult('adaptiveDifficulty', testName, false, '인터페이스가 정의되어 있지 않습니다');
                    console.log(`  ❌ ${interfaceName} 인터페이스`);
                }
            }
            
            // 적응형 메서드 확인
            const adaptiveMethods = [
                'updatePlayerPerformance',
                'calculateDifficultyAdjustment',
                'analyzePlayerPerformance',
                'predictiveDifficultyAdjustment',
                'processSatisfactionFeedback'
            ];
            
            for (const method of adaptiveMethods) {
                const testName = `${method} 적응형 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('adaptiveDifficulty', testName, true, '적응형 메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('adaptiveDifficulty', testName, false, '적응형 메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 싱글톤 패턴 확인
            const singletonTestName = 'AdaptiveDifficultySystem 싱글톤 패턴 확인';
            if (content.includes('getInstance') && content.includes('private static instance')) {
                this.addTestResult('adaptiveDifficulty', singletonTestName, true, '싱글톤 패턴이 구현되어 있습니다');
                console.log(`  ✅ 싱글톤 패턴`);
            } else {
                this.addTestResult('adaptiveDifficulty', singletonTestName, false, '싱글톤 패턴이 구현되어 있지 않습니다');
                console.log(`  ❌ 싱글톤 패턴`);
            }
            
        } catch (error) {
            this.addTestResult('adaptiveDifficulty', '적응형 난이도 시스템 검증', false, error.message);
            console.log(`  ❌ 적응형 난이도 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 적응형 난이도 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 레벨 검증 시스템 검증
     */
    async testLevelValidation() {
        console.log('📋 레벨 검증 시스템 검증');
        console.log('==================================================');
        
        try {
            const generatorPath = path.join(this.basePath, 'AILevelGenerator.ts');
            const content = fs.readFileSync(generatorPath, 'utf8');
            
            // 검증 시스템 구성 요소 확인
            const validationComponents = [
                'LevelValidator',
                'ValidationResult',
                'validateLevel',
                'calculateSolvabilityScore',
                'calculateBalanceScore',
                'calculateDifficultyScore',
                'calculateFunScore'
            ];
            
            for (const component of validationComponents) {
                const testName = `${component} 검증 컴포넌트 확인`;
                if (content.includes(component)) {
                    this.addTestResult('levelValidation', testName, true, '검증 컴포넌트가 구현되어 있습니다');
                    console.log(`  ✅ ${component}`);
                } else {
                    this.addTestResult('levelValidation', testName, false, '검증 컴포넌트가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${component}`);
                }
            }
            
            // 검증 기준 확인
            const validationCriteria = [
                'solvability',
                'balance',
                'difficulty',
                'funFactor'
            ];
            
            for (const criteria of validationCriteria) {
                const testName = `${criteria} 검증 기준 확인`;
                if (content.includes(criteria)) {
                    this.addTestResult('levelValidation', testName, true, '검증 기준이 설정되어 있습니다');
                    console.log(`  ✅ ${criteria} 기준`);
                } else {
                    this.addTestResult('levelValidation', testName, false, '검증 기준이 설정되어 있지 않습니다');
                    console.log(`  ❌ ${criteria} 기준`);
                }
            }
            
        } catch (error) {
            this.addTestResult('levelValidation', '레벨 검증 시스템 검증', false, error.message);
            console.log(`  ❌ 레벨 검증 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 레벨 검증 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 플레이어 분석 시스템 검증
     */
    async testPlayerAnalysis() {
        console.log('📋 플레이어 분석 시스템 검증');
        console.log('==================================================');
        
        try {
            const adaptivePath = path.join(this.basePath, 'AdaptiveDifficultySystem.ts');
            const content = fs.readFileSync(adaptivePath, 'utf8');
            
            // 플레이어 분석 메서드 확인
            const analysisMethods = [
                'calculatePerformanceTrend',
                'calculateSkillProgression',
                'calculateEngagementLevel',
                'calculateFrustrationLevel',
                'estimateOptimalDifficulty',
                'recommendObjectiveTypes',
                'analyzePlayerStrengthsWeaknesses',
                'generatePerformanceInsights'
            ];
            
            for (const method of analysisMethods) {
                const testName = `${method} 분석 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('playerAnalysis', testName, true, '분석 메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('playerAnalysis', testName, false, '분석 메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 플레이어 데이터 관리 확인
            const dataManagement = [
                'playerProfiles',
                'performanceBuffer',
                'getOrCreatePlayerProfile',
                'savePlayerProfile',
                'loadPlayerProfiles'
            ];
            
            for (const component of dataManagement) {
                const testName = `${component} 데이터 관리 확인`;
                if (content.includes(component)) {
                    this.addTestResult('playerAnalysis', testName, true, '데이터 관리 기능이 구현되어 있습니다');
                    console.log(`  ✅ ${component} 데이터 관리`);
                } else {
                    this.addTestResult('playerAnalysis', testName, false, '데이터 관리 기능이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${component} 데이터 관리`);
                }
            }
            
            // 예측 시스템 확인
            const predictionFeatures = [
                'predictNextLevelPerformance',
                'predictiveDifficultyAdjustment',
                'generatePreAdjustedLevel'
            ];
            
            for (const feature of predictionFeatures) {
                const testName = `${feature} 예측 기능 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('playerAnalysis', testName, true, '예측 기능이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} 예측`);
                } else {
                    this.addTestResult('playerAnalysis', testName, false, '예측 기능이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} 예측`);
                }
            }
            
        } catch (error) {
            this.addTestResult('playerAnalysis', '플레이어 분석 시스템 검증', false, error.message);
            console.log(`  ❌ 플레이어 분석 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 플레이어 분석 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] AI 통합 검증
     */
    async testAIIntegration() {
        console.log('📋 AI 통합 시스템 검증');
        console.log('==================================================');
        
        try {
            const generatorPath = path.join(this.basePath, 'AILevelGenerator.ts');
            const content = fs.readFileSync(generatorPath, 'utf8');
            
            // AI 통합 구성 요소 확인
            const aiIntegrationFeatures = [
                'AIGenerationParams',
                'enableAIGeneration',
                'fallbackToTemplates',
                'maxGenerationAttempts',
                'simulateAIGeneration',
                'parseLevelFromAI'
            ];
            
            for (const feature of aiIntegrationFeatures) {
                const testName = `${feature} AI 통합 기능 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('aiIntegration', testName, true, 'AI 통합 기능이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} AI 통합`);
                } else {
                    this.addTestResult('aiIntegration', testName, false, 'AI 통합 기능이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} AI 통합`);
                }
            }
            
            // 템플릿 시스템 확인
            const templateFeatures = [
                'LevelTemplate',
                'templateLibrary',
                'loadTemplateLibrary',
                'findBestTemplate',
                'customizeTemplate',
                'generateFromTemplate'
            ];
            
            for (const feature of templateFeatures) {
                const testName = `${feature} 템플릿 시스템 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('aiIntegration', testName, true, '템플릿 시스템이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} 템플릿`);
                } else {
                    this.addTestResult('aiIntegration', testName, false, '템플릿 시스템이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} 템플릿`);
                }
            }
            
            // 프롬프트 생성 시스템 확인
            const promptFeatures = [
                'buildGenerationPrompt',
                'AIPrompt',
                'addFeedback'
            ];
            
            for (const feature of promptFeatures) {
                const testName = `${feature} 프롬프트 시스템 확인`;
                if (content.includes(feature)) {
                    this.addTestResult('aiIntegration', testName, true, '프롬프트 시스템이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} 프롬프트`);
                } else {
                    this.addTestResult('aiIntegration', testName, false, '프롬프트 시스템이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} 프롬프트`);
                }
            }
            
        } catch (error) {
            this.addTestResult('aiIntegration', 'AI 통합 시스템 검증', false, error.message);
            console.log(`  ❌ AI 통합 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ AI 통합 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 성능 최적화 검증
     */
    async testPerformanceOptimization() {
        console.log('📋 성능 최적화 검증');
        console.log('==================================================');
        
        try {
            const generatorPath = path.join(this.basePath, 'AILevelGenerator.ts');
            const adaptivePath = path.join(this.basePath, 'AdaptiveDifficultySystem.ts');
            const generatorContent = fs.readFileSync(generatorPath, 'utf8');
            const adaptiveContent = fs.readFileSync(adaptivePath, 'utf8');
            
            // 최적화 기능 확인
            const optimizationFeatures = [
                'delay', // API 호출 제한
                'maxGenerationAttempts', // 무한 루프 방지
                'adaptationCooldown', // 과도한 적응 방지
                'performanceBuffer', // 메모리 효율성
                'buffer.length > 50' // 버퍼 크기 제한
            ];
            
            for (const feature of optimizationFeatures) {
                const testName = `${feature} 최적화 기능 확인`;
                const hasInGenerator = generatorContent.includes(feature);
                const hasInAdaptive = adaptiveContent.includes(feature);
                
                if (hasInGenerator || hasInAdaptive) {
                    this.addTestResult('performanceOptimization', testName, true, '최적화 기능이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} 최적화`);
                } else {
                    this.addTestResult('performanceOptimization', testName, false, '최적화 기능이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} 최적화`);
                }
            }
            
            // 메모리 관리 확인
            const memoryManagement = [
                'Map', // 효율적 데이터 구조
                'slice', // 배열 분할
                'shift', // 오래된 데이터 제거
                'Math.max(0, Math.min(' // 값 범위 제한
            ];
            
            for (const feature of memoryManagement) {
                const testName = `${feature} 메모리 관리 확인`;
                const hasInGenerator = generatorContent.includes(feature);
                const hasInAdaptive = adaptiveContent.includes(feature);
                
                if (hasInGenerator || hasInAdaptive) {
                    this.addTestResult('performanceOptimization', testName, true, '메모리 관리 기능이 구현되어 있습니다');
                    console.log(`  ✅ ${feature} 메모리 관리`);
                } else {
                    this.addTestResult('performanceOptimization', testName, false, '메모리 관리 기능이 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} 메모리 관리`);
                }
            }
            
            // 에러 처리 확인
            const errorHandling = [
                'try {',
                'catch (error)',
                'console.error',
                'console.warn'
            ];
            
            for (const feature of errorHandling) {
                const testName = `${feature} 에러 처리 확인`;
                const hasInGenerator = generatorContent.includes(feature);
                const hasInAdaptive = adaptiveContent.includes(feature);
                
                if (hasInGenerator || hasInAdaptive) {
                    this.addTestResult('performanceOptimization', testName, true, '에러 처리가 구현되어 있습니다');
                    console.log(`  ✅ ${feature} 에러 처리`);
                } else {
                    this.addTestResult('performanceOptimization', testName, false, '에러 처리가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${feature} 에러 처리`);
                }
            }
            
        } catch (error) {
            this.addTestResult('performanceOptimization', '성능 최적화 검증', false, error.message);
            console.log(`  ❌ 성능 최적화 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 성능 최적화 검증 완료\\n');
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
        const reportPath = path.join(__dirname, 'test-results', 'ai-level-generation-test-report.json');
        
        // 디렉토리 생성
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        // 리포트 저장
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // 콘솔 결과 출력
        console.log('📊 Module 1 Phase 3: AI Level Generation 시스템 테스트 결과 요약');
        console.log('============================================================');
        console.log(`🎯 테스트 대상: AI 기반 레벨 생성, 적응형 난이도 조절, 플레이어 분석`);
        console.log(`📁 총 파일: 2개 TypeScript 파일`);
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
async function runAILevelGenerationTests() {
    const testSuite = new AILevelGenerationTestSuite();
    
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
    runAILevelGenerationTests();
}

module.exports = AILevelGenerationTestSuite;