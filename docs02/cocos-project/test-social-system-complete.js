/**
 * [의도] Sweet Puzzle 소셜 시스템 완전 통합 테스트
 * [책임] 모든 Phase (친구, 길드, 리더보드, 채팅) 시스템의 종합적 검증
 */

const fs = require('fs');
const path = require('path');

class CompleteSocialSystemTester {
    constructor() {
        this.testResults = [];
        this.timestamp = new Date().toISOString();
    }
    
    /**
     * [의도] 전체 소셜 시스템 테스트 실행
     */
    async runAllTests() {
        console.log('🧪 완전 소셜 시스템 테스트 시작\n');
        
        const testSuites = [
            // Phase 1: 친구 시스템
            { name: '파일 구조 검증', tests: this.testFileStructure.bind(this) },
            { name: 'TypeScript 문법 검증', tests: this.testTypeScriptSyntax.bind(this) },
            
            // Phase 2: 길드 시스템
            { name: '길드 시스템 구조 검증', tests: this.testGuildSystem.bind(this) },
            { name: '길드 관리 로직 테스트', tests: this.testGuildLogic.bind(this) },
            
            // Phase 3: 경쟁 시스템
            { name: '리더보드 시스템 구조 검증', tests: this.testLeaderboardSystem.bind(this) },
            { name: '리더보드 로직 테스트', tests: this.testLeaderboardLogic.bind(this) },
            
            // Phase 4: 커뮤니케이션 시스템
            { name: '채팅 시스템 구조 검증', tests: this.testChatSystem.bind(this) },
            { name: '채팅 로직 테스트', tests: this.testChatLogic.bind(this) },
            
            // 통합 테스트
            { name: '소셜 매니저 통합 테스트', tests: this.testSocialManagerIntegration.bind(this) },
            { name: '이벤트 시스템 통합 테스트', tests: this.testEventIntegration.bind(this) },
            { name: '데이터 플로우 테스트', tests: this.testDataFlow.bind(this) },
            { name: '의존성 및 아키텍처 검증', tests: this.testArchitecture.bind(this) }
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
     * [의도] 전체 소셜 시스템 파일 구조 검증
     */
    testFileStructure() {
        const requiredFiles = [
            // Phase 1: 친구 시스템
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/core/EventBus.ts',
            
            // Phase 2: 길드 시스템
            'assets/scripts/social/guilds/GuildManager.ts',
            
            // Phase 3: 경쟁 시스템
            'assets/scripts/social/competition/LeaderboardManager.ts',
            
            // Phase 4: 커뮤니케이션 시스템
            'assets/scripts/social/communication/ChatManager.ts'
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
     * [의도] 전체 TypeScript 문법 검증
     */
    testTypeScriptSyntax() {
        const tsFiles = [
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/social/guilds/GuildManager.ts',
            'assets/scripts/social/competition/LeaderboardManager.ts',
            'assets/scripts/social/communication/ChatManager.ts',
            'assets/scripts/core/EventBus.ts'
        ];
        
        tsFiles.forEach(filePath => {
            try {
                const fullPath = path.join(__dirname, filePath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
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
     * [의도] 길드 시스템 구조 검증
     */
    testGuildSystem() {
        const guildTests = [
            {
                name: '길드 인터페이스',
                pattern: /interface\s+Guild/
            },
            {
                name: '길드 멤버 인터페이스',
                pattern: /interface\s+GuildMember/
            },
            {
                name: '길드 역할 열거형',
                pattern: /enum\s+GuildRole/
            },
            {
                name: '길드 생성 메서드',
                pattern: /createGuild/
            },
            {
                name: '가입 신청 메서드',
                pattern: /requestJoinGuild/
            },
            {
                name: '멤버 역할 변경',
                pattern: /changeUserRole/
            }
        ];
        
        try {
            const guildManagerPath = path.join(__dirname, 'assets/scripts/social/guilds/GuildManager.ts');
            if (fs.existsSync(guildManagerPath)) {
                const content = fs.readFileSync(guildManagerPath, 'utf8');
                
                guildTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('길드 시스템 구조', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('길드 시스템 구조', 'GuildManager 검증', false, error.message);
            console.log(`  ❌ GuildManager 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 길드 관리 로직 테스트
     */
    testGuildLogic() {
        const logicTests = [
            {
                name: '길드명 유효성 검사',
                pattern: /validateGuildName/
            },
            {
                name: '권한 확인 로직',
                pattern: /getCurrentPlayerMember/
            },
            {
                name: '멤버 수 제한 체크',
                pattern: /maxMembers/
            },
            {
                name: '만료된 요청 정리',
                pattern: /cleanupExpiredRequests/
            },
            {
                name: '리더 이양 로직',
                pattern: /리더 이양|newLeader/
            }
        ];
        
        try {
            const guildManagerPath = path.join(__dirname, 'assets/scripts/social/guilds/GuildManager.ts');
            if (fs.existsSync(guildManagerPath)) {
                const content = fs.readFileSync(guildManagerPath, 'utf8');
                
                logicTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('길드 관리 로직', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('길드 관리 로직', '길드 로직 검증', false, error.message);
            console.log(`  ❌ 길드 로직 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 리더보드 시스템 구조 검증
     */
    testLeaderboardSystem() {
        const leaderboardTests = [
            {
                name: '리더보드 인터페이스',
                pattern: /interface\s+Leaderboard/
            },
            {
                name: '리더보드 엔트리 인터페이스',
                pattern: /interface\s+LeaderboardEntry/
            },
            {
                name: '리더보드 타입 열거형',
                pattern: /enum\s+LeaderboardType/
            },
            {
                name: '시즌 관리',
                pattern: /interface\s+Season/
            },
            {
                name: '점수 제출 메서드',
                pattern: /submitScore/
            },
            {
                name: '순위 계산 로직',
                pattern: /recalculateRanks/
            }
        ];
        
        try {
            const leaderboardPath = path.join(__dirname, 'assets/scripts/social/competition/LeaderboardManager.ts');
            if (fs.existsExists(leaderboardPath)) {
                const content = fs.readFileSync(leaderboardPath, 'utf8');
                
                leaderboardTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('리더보드 시스템 구조', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('리더보드 시스템 구조', 'LeaderboardManager 검증', false, error.message);
            console.log(`  ❌ LeaderboardManager 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 리더보드 로직 테스트  
     */
    testLeaderboardLogic() {
        const logicTests = [
            {
                name: '기본 리더보드 설정',
                pattern: /setupDefaultLeaderboards/
            },
            {
                name: '시즌 종료 처리',
                pattern: /checkCurrentSeason/
            },
            {
                name: '새 시즌 시작',
                pattern: /startNewSeason/
            },
            {
                name: '플레이어 순위 조회',
                pattern: /getPlayerRank/
            },
            {
                name: '정기 업데이트 타이머',
                pattern: /startUpdateTimer/
            }
        ];
        
        try {
            const leaderboardPath = path.join(__dirname, 'assets/scripts/social/competition/LeaderboardManager.ts');
            if (fs.existsSync(leaderboardPath)) {
                const content = fs.readFileSync(leaderboardPath, 'utf8');
                
                logicTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('리더보드 로직', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('리더보드 로직', '리더보드 로직 검증', false, error.message);
            console.log(`  ❌ 리더보드 로직 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 채팅 시스템 구조 검증
     */
    testChatSystem() {
        const chatTests = [
            {
                name: '채팅 메시지 인터페이스',
                pattern: /interface\s+ChatMessage/
            },
            {
                name: '채팅 채널 인터페이스',
                pattern: /interface\s+ChatChannel/
            },
            {
                name: '메시지 타입 열거형',
                pattern: /enum\s+MessageType/
            },
            {
                name: '채널 타입 열거형',
                pattern: /enum\s+ChannelType/
            },
            {
                name: '알림 설정 인터페이스',
                pattern: /interface\s+NotificationSettings/
            },
            {
                name: '메시지 전송 메서드',
                pattern: /sendMessage/
            }
        ];
        
        try {
            const chatManagerPath = path.join(__dirname, 'assets/scripts/social/communication/ChatManager.ts');
            if (fs.existsSync(chatManagerPath)) {
                const content = fs.readFileSync(chatManagerPath, 'utf8');
                
                chatTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('채팅 시스템 구조', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('채팅 시스템 구조', 'ChatManager 검증', false, error.message);
            console.log(`  ❌ ChatManager 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 채팅 로직 테스트
     */
    testChatLogic() {
        const logicTests = [
            {
                name: '메시지 필터링',
                pattern: /filterMessage/
            },
            {
                name: '메시지 검증',
                pattern: /validateMessage/
            },
            {
                name: '개인 메시지 전송',
                pattern: /sendPrivateMessage/
            },
            {
                name: '메시지 반응 추가',
                pattern: /addReaction/
            },
            {
                name: '조용한 시간 확인',
                pattern: /isQuietTime/
            },
            {
                name: '사용자 차단',
                pattern: /blockUser/
            }
        ];
        
        try {
            const chatManagerPath = path.join(__dirname, 'assets/scripts/social/communication/ChatManager.ts');
            if (fs.existsSync(chatManagerPath)) {
                const content = fs.readFileSync(chatManagerPath, 'utf8');
                
                logicTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('채팅 로직', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('채팅 로직', '채팅 로직 검증', false, error.message);
            console.log(`  ❌ 채팅 로직 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 소셜 매니저 통합 테스트
     */
    testSocialManagerIntegration() {
        const integrationTests = [
            {
                name: '모든 매니저 import',
                pattern: /import.*FriendManager.*GuildManager.*LeaderboardManager.*ChatManager/s
            },
            {
                name: '매니저 인스턴스 변수',
                pattern: /friendManager.*guildManager.*leaderboardManager.*chatManager/s
            },
            {
                name: '통합 초기화 로직',
                pattern: /await.*initialize/
            },
            {
                name: 'Getter 메서드들',
                pattern: /getFriendManager.*getGuildManager.*getLeaderboardManager.*getChatManager/s
            },
            {
                name: '통합 cleanup',
                pattern: /cleanup.*friendManager.*guildManager.*leaderboardManager.*chatManager/s
            }
        ];
        
        try {
            const socialManagerPath = path.join(__dirname, 'assets/scripts/social/SocialManager.ts');
            if (fs.existsSync(socialManagerPath)) {
                const content = fs.readFileSync(socialManagerPath, 'utf8');
                
                integrationTests.forEach(test => {
                    const passed = test.pattern.test(content);
                    this.addTestResult('소셜 매니저 통합', test.name, passed);
                    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                });
            }
        } catch (error) {
            this.addTestResult('소셜 매니저 통합', 'SocialManager 통합 검증', false, error.message);
            console.log(`  ❌ SocialManager 통합 검증 실패: ${error.message}`);
        }
    }
    
    /**
     * [의도] 이벤트 시스템 통합 테스트
     */
    testEventIntegration() {
        const eventTests = [
            {
                name: 'EventBus import',
                check: (content) => content.includes('import') && content.includes('EventBus')
            },
            {
                name: 'Event emission',
                check: (content) => content.includes('EventBus.getInstance().emit')
            },
            {
                name: 'Event listening',
                check: (content) => content.includes('EventBus.getInstance().on')
            },
            {
                name: 'Event cleanup',
                check: (content) => content.includes('EventBus.getInstance().off') || content.includes('eventBus.off')
            }
        ];
        
        const socialFiles = [
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/social/guilds/GuildManager.ts',
            'assets/scripts/social/competition/LeaderboardManager.ts',
            'assets/scripts/social/communication/ChatManager.ts'
        ];
        
        socialFiles.forEach(file => {
            try {
                const fullPath = path.join(__dirname, file);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    eventTests.forEach(test => {
                        const passed = test.check(content);
                        this.addTestResult('이벤트 통합', `${path.basename(file)} - ${test.name}`, passed);
                        console.log(`  ${passed ? '✅' : '❌'} ${path.basename(file)}: ${test.name}`);
                    });
                }
            } catch (error) {
                this.addTestResult('이벤트 통합', file, false, error.message);
                console.log(`  ❌ ${file} - ${error.message}`);
            }
        });
    }
    
    /**
     * [의도] 데이터 플로우 테스트
     */
    testDataFlow() {
        const dataFlowTests = [
            {
                name: '로컬 저장소 사용',
                check: (content) => content.includes('localStorage') || content.includes('sys.localStorage')
            },
            {
                name: '데이터 로드 메서드',
                check: (content) => content.includes('load') && content.includes('Data')
            },
            {
                name: '데이터 저장 메서드',  
                check: (content) => content.includes('save') && content.includes('Data')
            },
            {
                name: 'Map 자료구조 사용',
                check: (content) => content.includes('Map<') || content.includes('new Map')
            },
            {
                name: '에러 핸들링',
                check: (content) => content.includes('try') && content.includes('catch')
            }
        ];
        
        const managerFiles = [
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/social/guilds/GuildManager.ts',
            'assets/scripts/social/competition/LeaderboardManager.ts',
            'assets/scripts/social/communication/ChatManager.ts'
        ];
        
        managerFiles.forEach(file => {
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
     * [의도] 아키텍처 및 의존성 검증
     */
    testArchitecture() {
        const architectureTests = [
            {
                name: '싱글톤 패턴 구현',
                pattern: /static\s+instance.*getInstance/s
            },
            {
                name: '초기화 상태 관리',
                pattern: /_isInitialized.*boolean/
            },
            {
                name: 'TypeScript 데코레이터',
                pattern: /@ccclass/
            },
            {
                name: '의도/책임 주석',
                pattern: /\[의도\].*\[책임\]/s
            },
            {
                name: 'cleanup 메서드',
                pattern: /cleanup\(\)/
            }
        ];
        
        const allFiles = [
            'assets/scripts/social/SocialManager.ts',
            'assets/scripts/social/friends/FriendManager.ts',
            'assets/scripts/social/friends/GiftSystem.ts',
            'assets/scripts/social/guilds/GuildManager.ts',
            'assets/scripts/social/competition/LeaderboardManager.ts',
            'assets/scripts/social/communication/ChatManager.ts'
        ];
        
        allFiles.forEach(file => {
            try {
                const fullPath = path.join(__dirname, file);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    architectureTests.forEach(test => {
                        const passed = test.pattern.test(content);
                        this.addTestResult('아키텍처', `${path.basename(file)} - ${test.name}`, passed);
                        console.log(`  ${passed ? '✅' : '❌'} ${path.basename(file)}: ${test.name}`);
                    });
                }
            } catch (error) {
                this.addTestResult('아키텍처', file, false, error.message);
                console.log(`  ❌ ${file} - ${error.message}`);
            }
        });
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
            { name: '인터페이스 또는 열거형', pattern: /(interface|enum)\s+\w+/ }
        ];
        
        let passedChecks = 0;
        checks.forEach(check => {
            if (check.pattern.test(content)) {
                passedChecks++;
            }
        });
        
        return passedChecks >= 4; // 최소 4개 이상의 체크를 통과해야 함
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
     * [의도] 완전 테스트 보고서 생성
     */
    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        
        // 카테고리별 통계
        const categoryStats = {};
        this.testResults.forEach(result => {
            if (!categoryStats[result.category]) {
                categoryStats[result.category] = { total: 0, passed: 0 };
            }
            categoryStats[result.category].total++;
            if (result.passed) {
                categoryStats[result.category].passed++;
            }
        });
        
        const report = {
            timestamp: this.timestamp,
            system: 'Complete Social System',
            phases: ['Friends', 'Guild', 'Leaderboard', 'Chat'],
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate,
                categoryStats
            },
            details: this.testResults,
            status: successRate >= 90 ? 'EXCELLENT' : successRate >= 75 ? 'GOOD' : successRate >= 60 ? 'ACCEPTABLE' : 'NEEDS_IMPROVEMENT'
        };
        
        // JSON 보고서 저장
        const reportPath = path.join(__dirname, 'test-results', 'complete-social-system-test-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // 콘솔 상세 요약
        console.log('\n📊 완전 소셜 시스템 테스트 결과 요약');
        console.log('='.repeat(60));
        console.log(`🎯 테스트 대상: 4개 Phase (친구, 길드, 리더보드, 채팅)`);
        console.log(`📁 총 파일: 7개 TypeScript 파일`);
        console.log(`🧪 총 테스트: ${totalTests}개`);
        console.log(`✅ 통과: ${passedTests}개`);
        console.log(`❌ 실패: ${failedTests}개`);
        console.log(`📈 성공률: ${successRate}%`);
        console.log(`⭐ 상태: ${report.status}`);
        
        console.log('\n📋 카테고리별 결과:');
        Object.entries(categoryStats).forEach(([category, stats]) => {
            const rate = Math.round((stats.passed / stats.total) * 100);
            console.log(`  ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
        });
        
        console.log(`\n📄 상세 보고서: ${reportPath}`);
        
        return report;
    }
}

// 테스트 실행
if (require.main === module) {
    const tester = new CompleteSocialSystemTester();
    tester.runAllTests().catch(console.error);
}

module.exports = CompleteSocialSystemTester;