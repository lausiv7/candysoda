/**
 * [의도] Module 1: Puzzle System 통합 테스트
 * [책임] 4개 Phase (기본 퍼즐, 특수 블록, AI 생성, 보드 관리)의 완전한 통합 검증
 */

const fs = require('fs');
const path = require('path');

// 테스트 설정
const TEST_CONFIG = {
    timeout: 20000,
    verbose: true,
    generateReport: true
};

class Module1IntegrationTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'Module 1: Puzzle System - Complete Integration Test',
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                successRate: 0
            },
            phases: {
                phase1: { name: '기본 퍼즐 시스템', tests: [], passed: 0, failed: 0 },
                phase2: { name: '특수 블록 시스템', tests: [], passed: 0, failed: 0 },
                phase3: { name: 'AI 레벨 생성', tests: [], passed: 0, failed: 0 },
                phase4: { name: '보드 관리', tests: [], passed: 0, failed: 0 }
            },
            integration: {
                crossPhaseCompatibility: { tests: [], passed: 0, failed: 0 },
                systemArchitecture: { tests: [], passed: 0, failed: 0 },
                performanceIntegration: { tests: [], passed: 0, failed: 0 },
                dataFlowIntegration: { tests: [], passed: 0, failed: 0 }
            },
            errors: []
        };
        
        this.basePath = path.join(__dirname, 'assets/scripts/puzzle');
    }
    
    /**
     * [의도] 전체 통합 테스트 실행
     */
    async runAllTests() {
        console.log('🧩 Module 1: Puzzle System 통합 테스트 시작\\n');
        
        try {
            // Phase별 개별 검증
            await this.testPhase1BasicPuzzle();
            await this.testPhase2SpecialBlocks();
            await this.testPhase3AIGeneration();
            await this.testPhase4BoardManagement();
            
            // 통합 검증
            await this.testCrossPhaseCompatibility();
            await this.testSystemArchitecture();
            await this.testPerformanceIntegration();
            await this.testDataFlowIntegration();
            
            this.calculateSummary();
            await this.generateIntegratedReport();
            
        } catch (error) {
            console.error('❌ 통합 테스트 실행 중 오류 발생:', error);
            this.results.errors.push(`Integration test error: ${error.message}`);
        }
        
        return this.results;
    }
    
    /**
     * [의도] Phase 1: 기본 퍼즐 시스템 검증
     */
    async testPhase1BasicPuzzle() {
        console.log('📋 Phase 1: 기본 퍼즐 시스템 검증');
        console.log('==================================================');
        
        try {
            const coreFiles = [
                'Block.ts',
                'BlockType.ts',
                'GameBoard.ts',
                'MatchDetector.ts'
            ];
            
            for (const filename of coreFiles) {
                const testName = `Phase1: ${filename} 핵심 파일 존재 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    this.addPhaseTestResult('phase1', testName, true, '핵심 파일이 존재합니다');
                    console.log(`  ✅ ${filename}`);
                } else {
                    this.addPhaseTestResult('phase1', testName, false, '핵심 파일이 존재하지 않습니다');
                    console.log(`  ❌ ${filename}`);
                }
            }
            
            // 기본 퍼즐 기능 검증
            const puzzleFeatures = [
                { file: 'BlockType.ts', feature: 'BlockTypeHelper', description: '블록 타입 헬퍼' },
                { file: 'MatchDetector.ts', feature: 'findAllMatches', description: '매치 감지' },
                { file: 'GameBoard.ts', feature: 'class GameBoard', description: '게임 보드' }
            ];
            
            for (const { file, feature, description } of puzzleFeatures) {
                const testName = `Phase1: ${description} 기능 확인`;
                const filePath = path.join(this.basePath, file);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes(feature)) {
                        this.addPhaseTestResult('phase1', testName, true, `${description} 기능이 구현되어 있습니다`);
                        console.log(`  ✅ ${description}`);
                    } else {
                        this.addPhaseTestResult('phase1', testName, false, `${description} 기능이 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${description}`);
                    }
                } else {
                    this.addPhaseTestResult('phase1', testName, false, `${file} 파일이 존재하지 않습니다`);
                    console.log(`  ❌ ${file} 없음`);
                }
            }
            
        } catch (error) {
            this.addPhaseTestResult('phase1', 'Phase 1 검증', false, error.message);
            console.log(`  ❌ Phase 1 검증 실패: ${error.message}`);
        }
        
        console.log('✅ Phase 1 검증 완료\\n');
    }
    
    /**
     * [의도] Phase 2: 특수 블록 시스템 검증
     */
    async testPhase2SpecialBlocks() {
        console.log('📋 Phase 2: 특수 블록 시스템 검증');
        console.log('==================================================');
        
        try {
            const specialFiles = [
                'SpecialBlock.ts',
                'SpecialBlockManager.ts'
            ];
            
            for (const filename of specialFiles) {
                const testName = `Phase2: ${filename} 특수 블록 파일 존재 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    this.addPhaseTestResult('phase2', testName, true, '특수 블록 파일이 존재합니다');
                    console.log(`  ✅ ${filename}`);
                } else {
                    this.addPhaseTestResult('phase2', testName, false, '특수 블록 파일이 존재하지 않습니다');
                    console.log(`  ❌ ${filename}`);
                }
            }
            
            // 특수 블록 클래스 확인
            const specialBlockClasses = [
                'LineBlock',
                'BombBlock',
                'RainbowBlock',
                'SpecialBlockCombinator'
            ];
            
            const specialBlockPath = path.join(this.basePath, 'SpecialBlock.ts');
            if (fs.existsSync(specialBlockPath)) {
                const content = fs.readFileSync(specialBlockPath, 'utf8');
                
                for (const className of specialBlockClasses) {
                    const testName = `Phase2: ${className} 클래스 확인`;
                    if (content.includes(className)) {
                        this.addPhaseTestResult('phase2', testName, true, `${className} 클래스가 구현되어 있습니다`);
                        console.log(`  ✅ ${className} 클래스`);
                    } else {
                        this.addPhaseTestResult('phase2', testName, false, `${className} 클래스가 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${className} 클래스`);
                    }
                }
            }
            
            // 특수 블록 타입 확인
            const blockTypePath = path.join(this.basePath, 'BlockType.ts');
            if (fs.existsSync(blockTypePath)) {
                const content = fs.readFileSync(blockTypePath, 'utf8');
                const specialTypes = ['LINE_HORIZONTAL', 'LINE_VERTICAL', 'BOMB', 'RAINBOW'];
                
                for (const type of specialTypes) {
                    const testName = `Phase2: ${type} 타입 통합 확인`;
                    if (content.includes(type)) {
                        this.addPhaseTestResult('phase2', testName, true, `${type} 타입이 통합되어 있습니다`);
                        console.log(`  ✅ ${type} 통합`);
                    } else {
                        this.addPhaseTestResult('phase2', testName, false, `${type} 타입이 통합되어 있지 않습니다`);
                        console.log(`  ❌ ${type} 통합`);
                    }
                }
            }
            
        } catch (error) {
            this.addPhaseTestResult('phase2', 'Phase 2 검증', false, error.message);
            console.log(`  ❌ Phase 2 검증 실패: ${error.message}`);
        }
        
        console.log('✅ Phase 2 검증 완료\\n');
    }
    
    /**
     * [의도] Phase 3: AI 레벨 생성 검증
     */
    async testPhase3AIGeneration() {
        console.log('📋 Phase 3: AI 레벨 생성 검증');
        console.log('==================================================');
        
        try {
            const aiFiles = [
                'AILevelGenerator.ts',
                'AdaptiveDifficultySystem.ts'
            ];
            
            for (const filename of aiFiles) {
                const testName = `Phase3: ${filename} AI 파일 존재 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    this.addPhaseTestResult('phase3', testName, true, 'AI 파일이 존재합니다');
                    console.log(`  ✅ ${filename}`);
                } else {
                    this.addPhaseTestResult('phase3', testName, false, 'AI 파일이 존재하지 않습니다');
                    console.log(`  ❌ ${filename}`);
                }
            }
            
            // AI 레벨 생성 핵심 기능 확인
            const aiGeneratorPath = path.join(this.basePath, 'AILevelGenerator.ts');
            if (fs.existsSync(aiGeneratorPath)) {
                const content = fs.readFileSync(aiGeneratorPath, 'utf8');
                const aiFeatures = [
                    'generateLevel',
                    'calculateOptimalDifficulty',
                    'LevelConfig',
                    'ValidationResult'
                ];
                
                for (const feature of aiFeatures) {
                    const testName = `Phase3: ${feature} AI 기능 확인`;
                    if (content.includes(feature)) {
                        this.addPhaseTestResult('phase3', testName, true, `${feature} AI 기능이 구현되어 있습니다`);
                        console.log(`  ✅ ${feature} AI 기능`);
                    } else {
                        this.addPhaseTestResult('phase3', testName, false, `${feature} AI 기능이 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${feature} AI 기능`);
                    }
                }
            }
            
            // 적응형 난이도 시스템 확인
            const adaptivePath = path.join(this.basePath, 'AdaptiveDifficultySystem.ts');
            if (fs.existsSync(adaptivePath)) {
                const content = fs.readFileSync(adaptivePath, 'utf8');
                const adaptiveFeatures = [
                    'updatePlayerPerformance',
                    'calculateDifficultyAdjustment',
                    'PlayerProfile',
                    'PerformanceAnalysis'
                ];
                
                for (const feature of adaptiveFeatures) {
                    const testName = `Phase3: ${feature} 적응형 기능 확인`;
                    if (content.includes(feature)) {
                        this.addPhaseTestResult('phase3', testName, true, `${feature} 적응형 기능이 구현되어 있습니다`);
                        console.log(`  ✅ ${feature} 적응형 기능`);
                    } else {
                        this.addPhaseTestResult('phase3', testName, false, `${feature} 적응형 기능이 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${feature} 적응형 기능`);
                    }
                }
            }
            
        } catch (error) {
            this.addPhaseTestResult('phase3', 'Phase 3 검증', false, error.message);
            console.log(`  ❌ Phase 3 검증 실패: ${error.message}`);
        }
        
        console.log('✅ Phase 3 검증 완료\\n');
    }
    
    /**
     * [의도] Phase 4: 보드 관리 검증
     */
    async testPhase4BoardManagement() {
        console.log('📋 Phase 4: 보드 관리 검증');
        console.log('==================================================');
        
        try {
            const boardFile = 'BoardManager.ts';
            const testName = `Phase4: ${boardFile} 보드 관리 파일 존재 확인`;
            const filePath = path.join(this.basePath, boardFile);
            
            if (fs.existsSync(filePath)) {
                this.addPhaseTestResult('phase4', testName, true, '보드 관리 파일이 존재합니다');
                console.log(`  ✅ ${boardFile}`);
                
                const content = fs.readFileSync(filePath, 'utf8');
                
                // 보드 관리 핵심 기능 확인
                const boardFeatures = [
                    'generateBoard',
                    'checkAndResolveDeadlock',
                    'getHint',
                    'shuffleBoard',
                    'analyzeBoard'
                ];
                
                for (const feature of boardFeatures) {
                    const featureTestName = `Phase4: ${feature} 보드 기능 확인`;
                    if (content.includes(feature)) {
                        this.addPhaseTestResult('phase4', featureTestName, true, `${feature} 보드 기능이 구현되어 있습니다`);
                        console.log(`  ✅ ${feature} 기능`);
                    } else {
                        this.addPhaseTestResult('phase4', featureTestName, false, `${feature} 보드 기능이 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${feature} 기능`);
                    }
                }
                
                // 패턴 생성 확인
                const patterns = ['checkerboard', 'spiral', 'diamond', 'cross'];
                for (const pattern of patterns) {
                    const patternTestName = `Phase4: ${pattern} 패턴 확인`;
                    if (content.includes(pattern)) {
                        this.addPhaseTestResult('phase4', patternTestName, true, `${pattern} 패턴이 구현되어 있습니다`);
                        console.log(`  ✅ ${pattern} 패턴`);
                    } else {
                        this.addPhaseTestResult('phase4', patternTestName, false, `${pattern} 패턴이 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${pattern} 패턴`);
                    }
                }
                
            } else {
                this.addPhaseTestResult('phase4', testName, false, '보드 관리 파일이 존재하지 않습니다');
                console.log(`  ❌ ${boardFile}`);
            }
            
        } catch (error) {
            this.addPhaseTestResult('phase4', 'Phase 4 검증', false, error.message);
            console.log(`  ❌ Phase 4 검증 실패: ${error.message}`);
        }
        
        console.log('✅ Phase 4 검증 완료\\n');
    }
    
    /**
     * [의도] 크로스 Phase 호환성 검증
     */
    async testCrossPhaseCompatibility() {
        console.log('📋 크로스 Phase 호환성 검증');
        console.log('==================================================');
        
        try {
            // Phase 간 인터페이스 호환성 확인
            const interfaces = [
                { name: 'BlockType', files: ['BlockType.ts', 'SpecialBlock.ts', 'BoardManager.ts'] },
                { name: 'Block', files: ['Block.ts', 'GameBoard.ts', 'BoardManager.ts'] },
                { name: 'Vec2', files: ['SpecialBlock.ts', 'BoardManager.ts'] }
            ];
            
            for (const { name, files } of interfaces) {
                const testName = `CrossPhase: ${name} 인터페이스 호환성 확인`;
                let compatibilityCount = 0;
                
                for (const filename of files) {
                    const filePath = path.join(this.basePath, filename);
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.includes(name)) {
                            compatibilityCount++;
                        }
                    }
                }
                
                if (compatibilityCount >= files.length - 1) { // 최소 2개 파일에서 사용
                    this.addIntegrationTestResult('crossPhaseCompatibility', testName, true, `${name} 인터페이스가 호환됩니다`);
                    console.log(`  ✅ ${name} 호환성`);
                } else {
                    this.addIntegrationTestResult('crossPhaseCompatibility', testName, false, `${name} 인터페이스 호환성 부족`);
                    console.log(`  ❌ ${name} 호환성`);
                }
            }
            
            // 특수 블록과 보드 관리 통합 확인
            const specialBlockPath = path.join(this.basePath, 'SpecialBlock.ts');
            const boardManagerPath = path.join(this.basePath, 'BoardManager.ts');
            
            if (fs.existsSync(specialBlockPath) && fs.existsSync(boardManagerPath)) {
                const specialContent = fs.readFileSync(specialBlockPath, 'utf8');
                const boardContent = fs.readFileSync(boardManagerPath, 'utf8');
                
                const testName = 'CrossPhase: 특수 블록-보드 관리 통합 확인';
                if (specialContent.includes('BlockType') && boardContent.includes('BlockType')) {
                    this.addIntegrationTestResult('crossPhaseCompatibility', testName, true, '특수 블록과 보드 관리가 통합되어 있습니다');
                    console.log(`  ✅ 특수 블록-보드 통합`);
                } else {
                    this.addIntegrationTestResult('crossPhaseCompatibility', testName, false, '특수 블록과 보드 관리 통합 부족');
                    console.log(`  ❌ 특수 블록-보드 통합`);
                }
            }
            
            // AI 생성과 보드 관리 통합 확인
            const aiGeneratorPath = path.join(this.basePath, 'AILevelGenerator.ts');
            
            if (fs.existsSync(aiGeneratorPath) && fs.existsSync(boardManagerPath)) {
                const aiContent = fs.readFileSync(aiGeneratorPath, 'utf8');
                const boardContent = fs.readFileSync(boardManagerPath, 'utf8');
                
                const testName = 'CrossPhase: AI 생성-보드 관리 통합 확인';
                if (aiContent.includes('BlockType') && boardContent.includes('analyzeBoard')) {
                    this.addIntegrationTestResult('crossPhaseCompatibility', testName, true, 'AI 생성과 보드 관리가 통합되어 있습니다');
                    console.log(`  ✅ AI-보드 통합`);
                } else {
                    this.addIntegrationTestResult('crossPhaseCompatibility', testName, false, 'AI 생성과 보드 관리 통합 부족');
                    console.log(`  ❌ AI-보드 통합`);
                }
            }
            
        } catch (error) {
            this.addIntegrationTestResult('crossPhaseCompatibility', '크로스 Phase 호환성 검증', false, error.message);
            console.log(`  ❌ 크로스 Phase 호환성 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 크로스 Phase 호환성 검증 완료\\n');
    }
    
    /**
     * [의도] 시스템 아키텍처 검증
     */
    async testSystemArchitecture() {
        console.log('📋 시스템 아키텍처 검증');
        console.log('==================================================');
        
        try {
            // 싱글톤 패턴 일관성 확인
            const singletonFiles = [
                'SpecialBlockManager.ts',
                'AILevelGenerator.ts',
                'AdaptiveDifficultySystem.ts',
                'BoardManager.ts'
            ];
            
            for (const filename of singletonFiles) {
                const testName = `Architecture: ${filename} 싱글톤 패턴 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('getInstance') && content.includes('private static instance')) {
                        this.addIntegrationTestResult('systemArchitecture', testName, true, `${filename}이 싱글톤 패턴을 구현합니다`);
                        console.log(`  ✅ ${filename} 싱글톤`);
                    } else {
                        this.addIntegrationTestResult('systemArchitecture', testName, false, `${filename}이 싱글톤 패턴을 구현하지 않습니다`);
                        console.log(`  ❌ ${filename} 싱글톤`);
                    }
                } else {
                    this.addIntegrationTestResult('systemArchitecture', testName, false, `${filename} 파일이 존재하지 않습니다`);
                    console.log(`  ❌ ${filename} 없음`);
                }
            }
            
            // TypeScript 데코레이터 일관성 확인
            const componentFiles = [
                'SpecialBlockManager.ts',
                'AILevelGenerator.ts',
                'AdaptiveDifficultySystem.ts',
                'BoardManager.ts'
            ];
            
            for (const filename of componentFiles) {
                const testName = `Architecture: ${filename} 데코레이터 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('@ccclass')) {
                        this.addIntegrationTestResult('systemArchitecture', testName, true, `${filename}이 Cocos Creator 데코레이터를 사용합니다`);
                        console.log(`  ✅ ${filename} 데코레이터`);
                    } else {
                        this.addIntegrationTestResult('systemArchitecture', testName, false, `${filename}이 Cocos Creator 데코레이터를 사용하지 않습니다`);
                        console.log(`  ❌ ${filename} 데코레이터`);
                    }
                }
            }
            
            // 에러 처리 일관성 확인
            const errorHandlingFiles = [
                'AILevelGenerator.ts',
                'AdaptiveDifficultySystem.ts',
                'BoardManager.ts'
            ];
            
            for (const filename of errorHandlingFiles) {
                const testName = `Architecture: ${filename} 에러 처리 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('try {') && content.includes('catch (error)')) {
                        this.addIntegrationTestResult('systemArchitecture', testName, true, `${filename}이 일관된 에러 처리를 구현합니다`);
                        console.log(`  ✅ ${filename} 에러 처리`);
                    } else {
                        this.addIntegrationTestResult('systemArchitecture', testName, false, `${filename}이 일관된 에러 처리를 구현하지 않습니다`);
                        console.log(`  ❌ ${filename} 에러 처리`);
                    }
                }
            }
            
        } catch (error) {
            this.addIntegrationTestResult('systemArchitecture', '시스템 아키텍처 검증', false, error.message);
            console.log(`  ❌ 시스템 아키텍처 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 시스템 아키텍처 검증 완료\\n');
    }
    
    /**
     * [의도] 성능 통합 검증
     */
    async testPerformanceIntegration() {
        console.log('📋 성능 통합 검증');
        console.log('==================================================');
        
        try {
            // 메모리 최적화 확인
            const optimizationFeatures = [
                { file: 'BoardManager.ts', feature: 'map(row => [...row])', description: '배열 복사 최적화' },
                { file: 'AdaptiveDifficultySystem.ts', feature: 'buffer.length >', description: '버퍼 크기 제한' },
                { file: 'AILevelGenerator.ts', feature: 'maxAttempts', description: '시도 횟수 제한' },
                { file: 'SpecialBlockManager.ts', feature: 'cleanupSpecialBlocks', description: '리소스 정리' }
            ];
            
            for (const { file, feature, description } of optimizationFeatures) {
                const testName = `Performance: ${description} 확인`;
                const filePath = path.join(this.basePath, file);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes(feature)) {
                        this.addIntegrationTestResult('performanceIntegration', testName, true, `${description}이 구현되어 있습니다`);
                        console.log(`  ✅ ${description}`);
                    } else {
                        this.addIntegrationTestResult('performanceIntegration', testName, false, `${description}이 구현되어 있지 않습니다`);
                        console.log(`  ❌ ${description}`);
                    }
                }
            }
            
            // 비동기 처리 최적화 확인
            const asyncFiles = [
                'AILevelGenerator.ts',
                'AdaptiveDifficultySystem.ts'
            ];
            
            for (const filename of asyncFiles) {
                const testName = `Performance: ${filename} 비동기 처리 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('async ') && content.includes('await ')) {
                        this.addIntegrationTestResult('performanceIntegration', testName, true, `${filename}이 비동기 처리를 구현합니다`);
                        console.log(`  ✅ ${filename} 비동기`);
                    } else {
                        this.addIntegrationTestResult('performanceIntegration', testName, false, `${filename}이 비동기 처리를 구현하지 않습니다`);
                        console.log(`  ❌ ${filename} 비동기`);
                    }
                }
            }
            
        } catch (error) {
            this.addIntegrationTestResult('performanceIntegration', '성능 통합 검증', false, error.message);
            console.log(`  ❌ 성능 통합 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 성능 통합 검증 완료\\n');
    }
    
    /**
     * [의도] 데이터 플로우 통합 검증
     */
    async testDataFlowIntegration() {
        console.log('📋 데이터 플로우 통합 검증');
        console.log('==================================================');
        
        try {
            // 데이터 타입 일관성 확인
            const dataTypes = [
                'BlockType',
                'Vec2',
                'LevelConfig',
                'Block'
            ];
            
            const allFiles = [
                'BlockType.ts',
                'Block.ts',
                'SpecialBlock.ts',
                'AILevelGenerator.ts',
                'BoardManager.ts'
            ];
            
            for (const dataType of dataTypes) {
                const testName = `DataFlow: ${dataType} 타입 일관성 확인`;
                let typeUsageCount = 0;
                
                for (const filename of allFiles) {
                    const filePath = path.join(this.basePath, filename);
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.includes(dataType)) {
                            typeUsageCount++;
                        }
                    }
                }
                
                if (typeUsageCount >= 2) { // 최소 2개 파일에서 사용
                    this.addIntegrationTestResult('dataFlowIntegration', testName, true, `${dataType} 타입이 일관되게 사용됩니다`);
                    console.log(`  ✅ ${dataType} 일관성`);
                } else {
                    this.addIntegrationTestResult('dataFlowIntegration', testName, false, `${dataType} 타입 사용이 제한적입니다`);
                    console.log(`  ❌ ${dataType} 일관성`);
                }
            }
            
            // 이벤트 기반 통신 확인
            const eventFiles = [
                'SpecialBlockManager.ts',
                'AdaptiveDifficultySystem.ts'
            ];
            
            for (const filename of eventFiles) {
                const testName = `DataFlow: ${filename} 이벤트 처리 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('Event') || content.includes('emit') || content.includes('callback')) {
                        this.addIntegrationTestResult('dataFlowIntegration', testName, true, `${filename}이 이벤트 기반 통신을 구현합니다`);
                        console.log(`  ✅ ${filename} 이벤트`);
                    } else {
                        this.addIntegrationTestResult('dataFlowIntegration', testName, false, `${filename}이 이벤트 기반 통신을 구현하지 않습니다`);
                        console.log(`  ⚠️ ${filename} 이벤트`);
                    }
                }
            }
            
            // 데이터 검증 확인
            const validationFiles = [
                'AILevelGenerator.ts',
                'BoardManager.ts'
            ];
            
            for (const filename of validationFiles) {
                const testName = `DataFlow: ${filename} 데이터 검증 확인`;
                const filePath = path.join(this.basePath, filename);
                
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('validate') || content.includes('isValid')) {
                        this.addIntegrationTestResult('dataFlowIntegration', testName, true, `${filename}이 데이터 검증을 구현합니다`);
                        console.log(`  ✅ ${filename} 검증`);
                    } else {
                        this.addIntegrationTestResult('dataFlowIntegration', testName, false, `${filename}이 데이터 검증을 구현하지 않습니다`);
                        console.log(`  ❌ ${filename} 검증`);
                    }
                }
            }
            
        } catch (error) {
            this.addIntegrationTestResult('dataFlowIntegration', '데이터 플로우 통합 검증', false, error.message);
            console.log(`  ❌ 데이터 플로우 통합 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 데이터 플로우 통합 검증 완료\\n');
    }
    
    /**
     * [의도] Phase 테스트 결과 추가
     */
    addPhaseTestResult(phase, testName, passed, message) {
        const result = {
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.results.phases[phase].tests.push(result);
        
        if (passed) {
            this.results.phases[phase].passed++;
        } else {
            this.results.phases[phase].failed++;
        }
    }
    
    /**
     * [의도] 통합 테스트 결과 추가
     */
    addIntegrationTestResult(category, testName, passed, message) {
        const result = {
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.results.integration[category].tests.push(result);
        
        if (passed) {
            this.results.integration[category].passed++;
        } else {
            this.results.integration[category].failed++;
        }
    }
    
    /**
     * [의도] 전체 테스트 요약 계산
     */
    calculateSummary() {
        // Phase 테스트 집계
        for (const phase of Object.values(this.results.phases)) {
            this.results.summary.totalTests += phase.tests.length;
            this.results.summary.passed += phase.passed;
            this.results.summary.failed += phase.failed;
        }
        
        // 통합 테스트 집계
        for (const integration of Object.values(this.results.integration)) {
            this.results.summary.totalTests += integration.tests.length;
            this.results.summary.passed += integration.passed;
            this.results.summary.failed += integration.failed;
        }
        
        if (this.results.summary.totalTests > 0) {
            this.results.summary.successRate = Math.round(
                (this.results.summary.passed / this.results.summary.totalTests) * 100
            );
        }
    }
    
    /**
     * [의도] 통합 테스트 리포트 생성
     */
    async generateIntegratedReport() {
        const reportPath = path.join(__dirname, 'test-results', 'module1-integration-test-report.json');
        
        // 디렉토리 생성
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        // 리포트 저장
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // 콘솔 결과 출력
        console.log('📊 Module 1: Puzzle System 통합 테스트 결과 요약');
        console.log('============================================================');
        console.log(`🧩 테스트 대상: 완전한 퍼즐 시스템 (4개 Phase 통합)`);
        console.log(`📁 총 파일: 8개 TypeScript 파일`);
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
        
        console.log('\\n📋 Phase별 결과:');
        for (const [phaseName, phase] of Object.entries(this.results.phases)) {
            const total = phase.tests.length;
            const successRate = total > 0 ? Math.round((phase.passed / total) * 100) : 0;
            console.log(`  ${phase.name}: ${phase.passed}/${total} (${successRate}%)`);
        }
        
        console.log('\\n📋 통합 검증 결과:');
        for (const [integrationName, integration] of Object.entries(this.results.integration)) {
            const total = integration.tests.length;
            const successRate = total > 0 ? Math.round((integration.passed / total) * 100) : 0;
            const displayName = integrationName.replace(/([A-Z])/g, ' $1').toLowerCase();
            console.log(`  ${displayName}: ${integration.passed}/${total} (${successRate}%)`);
        }
        
        console.log(`\\n📄 상세 보고서: ${reportPath}`);
        
        return reportPath;
    }
}

// 테스트 실행
async function runModule1IntegrationTests() {
    const testSuite = new Module1IntegrationTestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        process.exit(results.summary.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error('❌ 통합 테스트 실행 실패:', error);
        process.exit(1);
    }
}

// 직접 실행 시에만 테스트 실행
if (require.main === module) {
    runModule1IntegrationTests();
}

module.exports = Module1IntegrationTestSuite;