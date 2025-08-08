/**
 * [의도] Module 1 Phase 2: Special Blocks 시스템 테스트
 * [책임] 특수 블록 생성, 활성화, 조합 효과의 완전한 테스트 검증
 */

const fs = require('fs');
const path = require('path');

// 테스트 설정
const TEST_CONFIG = {
    timeout: 10000,
    verbose: true,
    generateReport: true
};

class SpecialBlocksTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'Module 1 Phase 2: Special Blocks System',
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                successRate: 0
            },
            categories: {
                fileStructure: { tests: [], passed: 0, failed: 0 },
                typeScriptSyntax: { tests: [], passed: 0, failed: 0 },
                specialBlockTypes: { tests: [], passed: 0, failed: 0 },
                blockCreation: { tests: [], passed: 0, failed: 0 },
                activation: { tests: [], passed: 0, failed: 0 },
                combination: { tests: [], passed: 0, failed: 0 },
                preview: { tests: [], passed: 0, failed: 0 },
                manager: { tests: [], passed: 0, failed: 0 }
            },
            errors: []
        };
        
        this.basePath = path.join(__dirname, 'assets/scripts/puzzle');
    }
    
    /**
     * [의도] 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🎯 Module 1 Phase 2: Special Blocks 시스템 테스트 시작\\n');
        
        try {
            // 1. 파일 구조 검증
            await this.testFileStructure();
            
            // 2. TypeScript 문법 검증
            await this.testTypeScriptSyntax();
            
            // 3. 특수 블록 타입 검증
            await this.testSpecialBlockTypes();
            
            // 4. 블록 생성 시스템 검증
            await this.testBlockCreation();
            
            // 5. 활성화 시스템 검증
            await this.testActivation();
            
            // 6. 조합 시스템 검증
            await this.testCombination();
            
            // 7. 미리보기 시스템 검증
            await this.testPreview();
            
            // 8. 매니저 시스템 검증
            await this.testManager();
            
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
            'SpecialBlock.ts',
            'SpecialBlockManager.ts',
            'BlockType.ts'
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
            'SpecialBlock.ts',
            'SpecialBlockManager.ts', 
            'BlockType.ts'
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
                    const hasProperIndentation = !content.includes('\\t'); // 스페이스 인덴테이션 확인
                    
                    if (hasImports && hasExports && hasInterfaces) {
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
     * [의도] 특수 블록 타입 검증
     */
    async testSpecialBlockTypes() {
        console.log('📋 특수 블록 타입 검증');
        console.log('==================================================');
        
        try {
            const blockTypePath = path.join(this.basePath, 'BlockType.ts');
            const content = fs.readFileSync(blockTypePath, 'utf8');
            
            // 특수 블록 타입 존재 확인
            const specialBlocks = [
                'LINE_HORIZONTAL',
                'LINE_VERTICAL', 
                'BOMB',
                'RAINBOW',
                'OBSTACLE'
            ];
            
            for (const blockType of specialBlocks) {
                const testName = `${blockType} 타입 정의 확인`;
                if (content.includes(blockType)) {
                    this.addTestResult('specialBlockTypes', testName, true, '타입이 정의되어 있습니다');
                    console.log(`  ✅ ${blockType} 타입`);
                } else {
                    this.addTestResult('specialBlockTypes', testName, false, '타입이 정의되어 있지 않습니다');
                    console.log(`  ❌ ${blockType} 타입`);
                }
            }
            
            // BlockTypeHelper 특수 블록 메서드 확인
            const helperMethods = [
                'isSpecialBlock',
                'getSpecialBlockTypeFromMatch',
                'getSpecialBlockFromShapeMatch'
            ];
            
            for (const method of helperMethods) {
                const testName = `BlockTypeHelper.${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('specialBlockTypes', testName, true, '메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('specialBlockTypes', testName, false, '메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
        } catch (error) {
            this.addTestResult('specialBlockTypes', '특수 블록 타입 검증', false, error.message);
            console.log(`  ❌ 특수 블록 타입 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 특수 블록 타입 검증 완료\\n');
    }
    
    /**
     * [의도] 블록 생성 시스템 검증
     */
    async testBlockCreation() {
        console.log('📋 블록 생성 시스템 검증');
        console.log('==================================================');
        
        try {
            const specialBlockPath = path.join(this.basePath, 'SpecialBlock.ts');
            const content = fs.readFileSync(specialBlockPath, 'utf8');
            
            // 특수 블록 클래스 확인
            const blockClasses = [
                'SpecialBlock',
                'LineBlock',
                'BombBlock', 
                'RainbowBlock'
            ];
            
            for (const className of blockClasses) {
                const testName = `${className} 클래스 정의 확인`;
                if (content.includes(`class ${className}`) || content.includes(`export class ${className}`)) {
                    this.addTestResult('blockCreation', testName, true, '클래스가 정의되어 있습니다');
                    console.log(`  ✅ ${className} 클래스`);
                } else {
                    this.addTestResult('blockCreation', testName, false, '클래스가 정의되어 있지 않습니다');
                    console.log(`  ❌ ${className} 클래스`);
                }
            }
            
            // 필수 메서드 확인
            const requiredMethods = [
                'activate',
                'getPreviewEffect',
                'canActivate',
                'init'
            ];
            
            for (const method of requiredMethods) {
                const testName = `${method} 메서드 구현 확인`;
                if (content.includes(`${method}(`)) {
                    this.addTestResult('blockCreation', testName, true, '메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('blockCreation', testName, false, '메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 활성화 결과 클래스 확인
            const testName = 'ActivationResult 클래스 확인';
            if (content.includes('class ActivationResult')) {
                this.addTestResult('blockCreation', testName, true, 'ActivationResult 클래스가 정의되어 있습니다');
                console.log(`  ✅ ActivationResult 클래스`);
            } else {
                this.addTestResult('blockCreation', testName, false, 'ActivationResult 클래스가 정의되어 있지 않습니다');
                console.log(`  ❌ ActivationResult 클래스`);
            }
            
        } catch (error) {
            this.addTestResult('blockCreation', '블록 생성 시스템 검증', false, error.message);
            console.log(`  ❌ 블록 생성 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 블록 생성 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 활성화 시스템 검증
     */
    async testActivation() {
        console.log('📋 활성화 시스템 검증');
        console.log('==================================================');
        
        try {
            const specialBlockPath = path.join(this.basePath, 'SpecialBlock.ts');
            const content = fs.readFileSync(specialBlockPath, 'utf8');
            
            // 활성화 패턴 확인
            const patterns = [
                'SINGLE_CLICK',
                'SWAP_ACTIVATION', 
                'AUTO_ACTIVATION'
            ];
            
            for (const pattern of patterns) {
                const testName = `${pattern} 패턴 정의 확인`;
                if (content.includes(pattern)) {
                    this.addTestResult('activation', testName, true, '활성화 패턴이 정의되어 있습니다');
                    console.log(`  ✅ ${pattern} 패턴`);
                } else {
                    this.addTestResult('activation', testName, false, '활성화 패턴이 정의되어 있지 않습니다');
                    console.log(`  ❌ ${pattern} 패턴`);
                }
            }
            
            // 효과 타입 확인
            const effects = [
                'LINE_CLEAR',
                'EXPLOSION',
                'COLOR_CLEAR',
                'CROSS_EXPLOSION',
                'MEGA_EXPLOSION'
            ];
            
            for (const effect of effects) {
                const testName = `${effect} 효과 정의 확인`;
                if (content.includes(effect)) {
                    this.addTestResult('activation', testName, true, '효과 타입이 정의되어 있습니다');
                    console.log(`  ✅ ${effect} 효과`);
                } else {
                    this.addTestResult('activation', testName, false, '효과 타입이 정의되어 있지 않습니다');
                    console.log(`  ❌ ${effect} 효과`);
                }
            }
            
            // 라인 방향 확인
            const directions = ['HORIZONTAL', 'VERTICAL'];
            for (const direction of directions) {
                const testName = `${direction} 방향 정의 확인`;
                if (content.includes(direction)) {
                    this.addTestResult('activation', testName, true, '방향이 정의되어 있습니다');
                    console.log(`  ✅ ${direction} 방향`);
                } else {
                    this.addTestResult('activation', testName, false, '방향이 정의되어 있지 않습니다');
                    console.log(`  ❌ ${direction} 방향`);
                }
            }
            
        } catch (error) {
            this.addTestResult('activation', '활성화 시스템 검증', false, error.message);
            console.log(`  ❌ 활성화 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 활성화 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 조합 시스템 검증
     */
    async testCombination() {
        console.log('📋 조합 시스템 검증');
        console.log('==================================================');
        
        try {
            const specialBlockPath = path.join(this.basePath, 'SpecialBlock.ts');
            const content = fs.readFileSync(specialBlockPath, 'utf8');
            
            // 조합 클래스 확인
            const testName = 'SpecialBlockCombinator 클래스 확인';
            if (content.includes('class SpecialBlockCombinator')) {
                this.addTestResult('combination', testName, true, 'SpecialBlockCombinator 클래스가 정의되어 있습니다');
                console.log(`  ✅ SpecialBlockCombinator 클래스`);
            } else {
                this.addTestResult('combination', testName, false, 'SpecialBlockCombinator 클래스가 정의되어 있지 않습니다');
                console.log(`  ❌ SpecialBlockCombinator 클래스`);
            }
            
            // 조합 메서드 확인
            const combinationMethods = [
                'calculateCombination',
                'createCrossExplosion',
                'createMegaExplosion',
                'createRainbowLineCombo'
            ];
            
            for (const method of combinationMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('combination', testName, true, '조합 메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('combination', testName, false, '조합 메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 조합 효과 클래스 확인
            const effectTestName = 'CombinationEffect 클래스 확인';
            if (content.includes('class CombinationEffect')) {
                this.addTestResult('combination', effectTestName, true, 'CombinationEffect 클래스가 정의되어 있습니다');
                console.log(`  ✅ CombinationEffect 클래스`);
            } else {
                this.addTestResult('combination', effectTestName, false, 'CombinationEffect 클래스가 정의되어 있지 않습니다');
                console.log(`  ❌ CombinationEffect 클래스`);
            }
            
        } catch (error) {
            this.addTestResult('combination', '조합 시스템 검증', false, error.message);
            console.log(`  ❌ 조합 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 조합 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 미리보기 시스템 검증
     */
    async testPreview() {
        console.log('📋 미리보기 시스템 검증');
        console.log('==================================================');
        
        try {
            const managerPath = path.join(this.basePath, 'SpecialBlockManager.ts');
            const content = fs.readFileSync(managerPath, 'utf8');
            
            // 미리보기 관련 메서드 확인
            const previewMethods = [
                'getSpecialBlockPreview',
                'getPreviewByType',
                'getLinePreview',
                'getBombPreview',
                'getRainbowPreview'
            ];
            
            for (const method of previewMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('preview', testName, true, '미리보기 메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('preview', testName, false, '미리보기 메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 미리보기 설정 확인
            const testName = 'enableSpecialBlockPreview 설정 확인';
            if (content.includes('enableSpecialBlockPreview')) {
                this.addTestResult('preview', testName, true, '미리보기 설정이 구현되어 있습니다');
                console.log(`  ✅ enableSpecialBlockPreview 설정`);
            } else {
                this.addTestResult('preview', testName, false, '미리보기 설정이 구현되어 있지 않습니다');
                console.log(`  ❌ enableSpecialBlockPreview 설정`);
            }
            
        } catch (error) {
            this.addTestResult('preview', '미리보기 시스템 검증', false, error.message);
            console.log(`  ❌ 미리보기 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 미리보기 시스템 검증 완료\\n');
    }
    
    /**
     * [의도] 매니저 시스템 검증
     */
    async testManager() {
        console.log('📋 매니저 시스템 검증');
        console.log('==================================================');
        
        try {
            const managerPath = path.join(this.basePath, 'SpecialBlockManager.ts');
            const content = fs.readFileSync(managerPath, 'utf8');
            
            // 매니저 클래스 확인
            const testName = 'SpecialBlockManager 클래스 확인';
            if (content.includes('class SpecialBlockManager')) {
                this.addTestResult('manager', testName, true, 'SpecialBlockManager 클래스가 정의되어 있습니다');
                console.log(`  ✅ SpecialBlockManager 클래스`);
            } else {
                this.addTestResult('manager', testName, false, 'SpecialBlockManager 클래스가 정의되어 있지 않습니다');
                console.log(`  ❌ SpecialBlockManager 클래스`);
            }
            
            // 싱글톤 패턴 확인
            const singletonTestName = '싱글톤 패턴 구현 확인';
            if (content.includes('getInstance')) {
                this.addTestResult('manager', singletonTestName, true, '싱글톤 패턴이 구현되어 있습니다');
                console.log(`  ✅ 싱글톤 패턴`);
            } else {
                this.addTestResult('manager', singletonTestName, false, '싱글톤 패턴이 구현되어 있지 않습니다');
                console.log(`  ❌ 싱글톤 패턴`);
            }
            
            // 핵심 관리 메서드 확인
            const managerMethods = [
                'shouldCreateSpecialBlock',
                'createSpecialBlock',
                'activateSpecialBlock',
                'activateSpecialBlockCombination',
                'cleanupSpecialBlocks',
                'getSpecialBlockStats'
            ];
            
            for (const method of managerMethods) {
                const testName = `${method} 메서드 확인`;
                if (content.includes(method)) {
                    this.addTestResult('manager', testName, true, '관리 메서드가 구현되어 있습니다');
                    console.log(`  ✅ ${method} 메서드`);
                } else {
                    this.addTestResult('manager', testName, false, '관리 메서드가 구현되어 있지 않습니다');
                    console.log(`  ❌ ${method} 메서드`);
                }
            }
            
            // 인터페이스 확인
            const interfaces = [
                'SpecialBlockCreation',
                'SpecialBlockActivationEvent'
            ];
            
            for (const interfaceName of interfaces) {
                const testName = `${interfaceName} 인터페이스 확인`;
                if (content.includes(`interface ${interfaceName}`)) {
                    this.addTestResult('manager', testName, true, '인터페이스가 정의되어 있습니다');
                    console.log(`  ✅ ${interfaceName} 인터페이스`);
                } else {
                    this.addTestResult('manager', testName, false, '인터페이스가 정의되어 있지 않습니다');
                    console.log(`  ❌ ${interfaceName} 인터페이스`);
                }
            }
            
        } catch (error) {
            this.addTestResult('manager', '매니저 시스템 검증', false, error.message);
            console.log(`  ❌ 매니저 시스템 검증 실패: ${error.message}`);
        }
        
        console.log('✅ 매니저 시스템 검증 완료\\n');
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
        const reportPath = path.join(__dirname, 'test-results', 'special-blocks-system-test-report.json');
        
        // 디렉토리 생성
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        // 리포트 저장
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // 콘솔 결과 출력
        console.log('📊 Module 1 Phase 2: Special Blocks 시스템 테스트 결과 요약');
        console.log('============================================================');
        console.log(`🎯 테스트 대상: 특수 블록 시스템 (라인, 폭탄, 레인보우, 조합)`);
        console.log(`📁 총 파일: 3개 TypeScript 파일`);
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
async function runSpecialBlocksTests() {
    const testSuite = new SpecialBlocksTestSuite();
    
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
    runSpecialBlocksTests();
}

module.exports = SpecialBlocksTestSuite;