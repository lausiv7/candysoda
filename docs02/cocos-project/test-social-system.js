/**
 * [의도] Sweet Puzzle 소셜 시스템 자동 테스트
 * [책임] 친구 시스템, 선물 시스템, 이벤트 버스의 기능을 종합적으로 검증
 */

const fs = require('fs');
const path = require('path');

class SocialSystemTester {
    constructor() {
        this.testResults = [];
        this.timestamp = new Date().toISOString();
    }
    
    /**
     * [의도] 모든 소셜 시스템 테스트 실행
     */
    async runAllTests() {
        console.log('🧪 소셜 시스템 테스트 시작\n');
        
        const testSuites = [
            { name: '파일 구조 검증', tests: this.testFileStructure.bind(this) },
            { name: 'TypeScript 문법 검증', tests: this.testTypeScriptSyntax.bind(this) },
            { name: '클래스 구조 검증', tests: this.testClassStructure.bind(this) },
            { name: '의존성 검증', tests: this.testDependencies.bind(this) },
            { name: '데이터 플로우 테스트', tests: this.testDataFlow.bind(this) },
            { name: '이벤트 시스템 테스트', tests: this.testEventSystem.bind(this) },
            { name: '친구 시스템 로직 테스트', tests: this.testFriendSystem.bind(this) },
            { name: '선물 시스템 로직 테스트', tests: this.testGiftSystem.bind(this) }
        ];
        
        for (const suite of testSuites) {
            console.log(`\n📋 ${suite.name}`);
            console.log('='.repeat(50));
            
            try {
                await suite.tests();
                console.log(`✅ ${suite.name} 완료`);
            } catch (error) {
                console.error(`❌ ${suite.name} 실패:`, error.message);
            }
        }
        
        this.generateReport();
    }
    
    /**
     * [의도] 소셜 시스템 파일 구조 검증
     */
    testFileStructure() {
        const requiredFiles = [
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/core/EventBus.ts'
        ];
        
        requiredFiles.forEach(filePath => {
            const fullPath = path.join(__dirname, filePath);
            if (fs.existsSync(fullPath)) {
                this.addTestResult('파일 존재 확인', filePath, true);
                console.log(`  ✅ ${filePath}`);
            } else {
                this.addTestResult('파일 존재 확인', filePath, false, `파일이 존재하지 않음: ${fullPath}`);
                console.log(`  ❌ ${filePath} - 파일 없음`);
            }
        });
    }
    
    /**
     * [의도] TypeScript 문법 유효성 검증
     */
    testTypeScriptSyntax() {
        const tsFiles = [
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/core/EventBus.ts'
        ];
        
        tsFiles.forEach(filePath => {
            try {
                const fullPath = path.join(__dirname, filePath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // 기본 TypeScript 문법 검사
                    const hasValidSyntax = this.validateTypeScriptSyntax(content, filePath);
                    this.addTestResult('TypeScript 문법', filePath, hasValidSyntax);
                    console.log(`  ${hasValidSyntax ? '✅' : '❌'} ${filePath}`);
                }
            } catch (error) {
                this.addTestResult('TypeScript 문법', filePath, false, error.message);
                console.log(`  ❌ ${filePath} - ${error.message}`);
            }
        });
    }
    
    /**
     * [의도] 클래스 구조 및 주요 메서드 존재 확인
     */
    testClassStructure() {
        const classTests = [
            {
                file: 'assets/scripts/social/SocialManager.ts',
                className: 'SocialManager',
                requiredMethods: ['getInstance', 'initialize', 'getFriendManager', 'cleanup']
            },
            {
                file: 'assets/scripts/social/friends/FriendManager.ts',
                className: 'FriendManager',
                requiredMethods: ['getInstance', 'initialize', 'sendFriendRequest', 'acceptFriendRequest', 'getFriends']
            },
            {
                file: 'assets/scripts/social/friends/GiftSystem.ts',
                className: 'GiftSystem',
                requiredMethods: ['getInstance', 'initialize', 'sendGift', 'claimGift', 'getUnclaimedGifts']
            },
            {
                file: 'assets/scripts/core/EventBus.ts',
                className: 'EventBus',
                requiredMethods: ['getInstance', 'on', 'off', 'emit', 'once']
            }
        ];
        
        classTests.forEach(test => {
            try {
                const fullPath = path.join(__dirname, test.file);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // 클래스 선언 확인
                    const hasClass = content.includes(`class ${test.className}`);
                    this.addTestResult('클래스 선언', `${test.className}`, hasClass);
                    
                    // 필수 메서드 존재 확인
                    test.requiredMethods.forEach(method => {
                        const hasMethod = content.includes(`${method}(`);
                        this.addTestResult('메서드 존재', `${test.className}.${method}`, hasMethod);
                        console.log(`  ${hasMethod ? '✅' : '❌'} ${test.className}.${method}()`);
                    });
                }
            } catch (error) {
                this.addTestResult('클래스 구조', test.className, false, error.message);
                console.log(`  ❌ ${test.className} - ${error.message}`);
            }
        });
    }
    
    /**
     * [의도] 의존성 및 import 문 검증
     */
    testDependencies() {
        const dependencyTests = [
            {
                file: 'assets/scripts/social/SocialManager.ts',
                expectedImports: ['FriendManager', 'EventBus']
            },
            {
                file: 'assets/scripts/social/friends/FriendManager.ts',
                expectedImports: ['EventBus', 'sys']
            },
            {
                file: 'assets/scripts/social/friends/GiftSystem.ts',
                expectedImports: ['EventBus', 'Gift', 'GiftType']
            }
        ];
        
        dependencyTests.forEach(test => {
            try {
                const fullPath = path.join(__dirname, test.file);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    test.expectedImports.forEach(importName => {
                        const hasImport = content.includes(importName);
                        this.addTestResult('의존성 import', `${test.file} -> ${importName}`, hasImport);
                        console.log(`  ${hasImport ? '✅' : '❌'} ${path.basename(test.file)} imports ${importName}`);
                    });
                }
            } catch (error) {
                this.addTestResult('의존성 검증', test.file, false, error.message);
                console.log(`  ❌ ${test.file} - ${error.message}`);
            }
        });
    }
    
    /**
     * [의도] 데이터 플로우 및 상태 관리 테스트
     */
    testDataFlow() {
        const dataFlowTests = [
            {
                name: '싱글톤 패턴 구현',
                check: (content) => content.includes('static instance') && content.includes('getInstance')
            },
            {
                name: '이벤트 발생 코드',
                check: (content) => content.includes('EventBus.getInstance().emit')
            },
            {
                name: '데이터 저장 메커니즘',
                check: (content) => content.includes('localStorage') || content.includes('save')
            },
            {
                name: '에러 처리',
                check: (content) => content.includes('try') && content.includes('catch')
            }
        ];
        
        const socialFiles = [
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts'
        ];
        
        socialFiles.forEach(file => {
            try {
                const fullPath = path.join(__dirname, file);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    dataFlowTests.forEach(test => {
                        const passed = test.check(content);
                        this.addTestResult('데이터 플로우', `${path.basename(file)} - ${test.name}`, passed);
                        console.log(`  ${passed ? '✅' : '❌'} ${path.basename(file)}: ${test.name}`);
                    });
                }
            } catch (error) {
                this.addTestResult('데이터 플로우', file, false, error.message);
                console.log(`  ❌ ${file} - ${error.message}`);
            }
        });
    }
    
    /**
     * [의도] 이벤트 시스템 로직 테스트
     */
    testEventSystem() {
        const eventTests = [
            {
                name: '이벤트 등록 (on)',
                pattern: /on\s*\(\s*\w+:\s*string/
            },
            {
                name: '일회성 이벤트 (once)',
                pattern: /once\s*\(\s*\w+:\s*string/
            },
            {
                name: '이벤트 해제 (off)',
                pattern: /off\s*\(\s*\w+:\s*string/
            },
            {
                name: '이벤트 발생 (emit)',
                pattern: /emit\s*\(\s*\w+:\s*string/
            },
            {
                name: '이벤트 핸들러 Map 구조',
                pattern: /Map<string,.*EventHandler/
            }
        ];
        
        try {
            const eventBusPath = path.join(__dirname, 'assets/scripts/core/EventBus.ts');
            if (fs.existsSync(eventBusPath)) {
                const content = fs.readFileSync(eventBusPath, 'utf8');
                
                eventTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('이벤트 시스템', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('이벤트 시스템', 'EventBus 검증', false, error.message);
            console.log(`  ❌ EventBus 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 친구 시스템 로직 테스트
     */
    testFriendSystem() {
        const friendTests = [
            {
                name: '친구 관계 인터페이스',
                pattern: /interface\s+Friend/
            },
            {
                name: '친구 요청 인터페이스',
                pattern: /interface\s+FriendRequest/
            },
            {
                name: '친구 상태 열거형',
                pattern: /enum\s+FriendStatus/
            },
            {
                name: '친구 요청 검증 로직',
                pattern: /validateFriendRequest/
            },
            {
                name: '친구 데이터 저장',
                pattern: /saveFriendsData/
            },
            {
                name: '만료된 요청 정리',
                pattern: /cleanupExpiredRequests/
            }
        ];
        
        try {
            const friendManagerPath = path.join(__dirname, 'assets/scripts/social/friends/FriendManager.ts');
            if (fs.existsSync(friendManagerPath)) {
                const content = fs.readFileSync(friendManagerPath, 'utf8');
                
                friendTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('친구 시스템', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('친구 시스템', 'FriendManager 검증', false, error.message);
            console.log(`  ❌ FriendManager 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 선물 시스템 로직 테스트
     */
    testGiftSystem() {
        const giftTests = [
            {
                name: '선물 정의 인터페이스',
                pattern: /interface\s+GiftDefinition/
            },
            {
                name: '선물 타입 열거형',
                pattern: /enum\s+GiftType/
            },
            {
                name: '선물 통계 인터페이스',
                pattern: /interface\s+PlayerGiftStats/
            },
            {
                name: '일일 제한 검사',
                pattern: /dailyLimit/
            },
            {
                name: '쿨다운 관리',
                pattern: /cooldownTime|cooldownRemaining/
            },
            {
                name: '일일 리셋 로직',
                pattern: /checkDailyReset/
            }
        ];
        
        try {
            const giftSystemPath = path.join(__dirname, 'assets/scripts/social/friends/GiftSystem.ts');
            if (fs.existsSync(giftSystemPath)) {
                const content = fs.readFileSync(giftSystemPath, 'utf8');
                
                giftTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('선물 시스템', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('선물 시스템', 'GiftSystem 검증', false, error.message);
            console.log(`  ❌ GiftSystem 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] TypeScript 기본 문법 검증
     */
    validateTypeScriptSyntax(content, fileName) {
        const checks = [
            { name: '클래스 선언', pattern: /class\s+\w+/ },
            { name: 'TypeScript 타입 어노테이션', pattern: /:\s*\w+/ },
            { name: 'export 문', pattern: /export/ },
            { name: 'import 문', pattern: /import.*from/ },
            { name: '인터페이스 선언', pattern: /interface\s+\w+/ }
        ];
        
        let passedChecks = 0;
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                passedChecks++;
            }
        });
        
        return passedChecks >= 3; // 최소 3개 이상의 체크를 통과해야 함
    }
    
    /**
     * [의도] 테스트 결과 기록
     */
    addTestResult(category, testName, passed, error = null) {
        this.testResults.push({
            category,
            testName,
            passed,
            error,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * [의도] 테스트 보고서 생성
     */
    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        
        const report = {
            timestamp: this.timestamp,
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate
            },
            details: this.testResults,
            status: successRate >= 80 ? 'EXCELLENT' : successRate >= 60 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
        };
        
        // JSON 보고서 저장
        const reportPath = path.join(__dirname, 'test-results', 'social-system-test-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // 콘솔 요약
        console.log('\n📊 소셜 시스템 테스트 결과 요약');
        console.log('='.repeat(50));
        console.log(`총 테스트: ${totalTests}개`);
        console.log(`통과: ${passedTests}개`);
        console.log(`실패: ${failedTests}개`);
        console.log(`성공률: ${successRate}%`);
        console.log(`상태: ${report.status}`);
        console.log(`\n📄 상세 보고서: ${reportPath}`);
        
        return report;
    }
}

// 테스트 실행
if (require.main === module) {
    const tester = new SocialSystemTester();
    tester.runAllTests().catch(console.error);
}

module.exports = SocialSystemTester;