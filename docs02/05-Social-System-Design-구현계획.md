# Sweet Puzzle 구현 계획서: 소셜 시스템

## 1. 🎯 구현 목표

이 문서는 `docs02/05-Social-System-Design.md`에 정의된 **소셜 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 친구 시스템, 길드 관리, 경쟁 시스템, 리더보드, 토너먼트를 완성하여 플레이어 간의 상호작용과 커뮤니티 형성을 촉진하는 활발한 소셜 환경을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

소셜 시스템 구현은 `assets/scripts/social` 폴더를 중심으로 진행됩니다.

### 2.1. Social Core (소셜 핵심)

```
assets/scripts/social/
├── SocialManager.ts                 # ✅ 소셜 시스템 총괄 관리자
├── RelationshipManager.ts           # ✅ 관계 관리 시스템
├── SocialNetworking.ts              # ✅ 소셜 네트워킹 처리
├── PrivacyManager.ts                # ✅ 개인정보 보호 관리
└── SocialEventDispatcher.ts         # ✅ 소셜 이벤트 처리
```

### 2.2. Friend System (친구 시스템)

```
assets/scripts/social/friends/
├── FriendManager.ts                 # ✅ 친구 관리자
├── FriendRequestSystem.ts           # ✅ 친구 요청 시스템
├── FriendRecommendationEngine.ts    # ✅ 친구 추천 엔진
├── GiftSystem.ts                    # ✅ 선물 시스템
└── FriendActivityTracker.ts         # ✅ 친구 활동 추적
```

### 2.3. Guild System (길드 시스템)

```
assets/scripts/social/guilds/
├── GuildManager.ts                  # ✅ 길드 관리자
├── GuildCreationSystem.ts           # ✅ 길드 생성 시스템
├── GuildEventManager.ts             # ✅ 길드 이벤트 관리
├── GuildRoleSystem.ts               # ✅ 길드 역할 시스템
└── GuildChatSystem.ts               # ✅ 길드 채팅 시스템
```

### 2.4. Competition System (경쟁 시스템)

```
assets/scripts/social/competition/
├── LeaderboardManager.ts            # ✅ 리더보드 관리자
├── TournamentSystem.ts              # ✅ 토너먼트 시스템
├── RankingCalculator.ts             # ✅ 순위 계산기
├── CompetitionScheduler.ts          # ✅ 경쟁 일정 관리
└── PrizeDistributor.ts              # ✅ 상금 배포 시스템
```

### 2.5. Communication (커뮤니케이션)

```
assets/scripts/social/communication/
├── ChatManager.ts                   # ✅ 채팅 관리자
├── MessageFilter.ts                 # ✅ 메시지 필터링
├── EmoteSystem.ts                   # ✅ 이모트 시스템
├── NotificationCenter.ts            # ✅ 알림 센터
└── ModerationSystem.ts              # ✅ 중재 시스템
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs02/05-Social-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 친구 시스템 구축 (가장 중요)**
*   **기간:** 9일
*   **목표:** 친구 추가, 관리, 기본 상호작용이 완전히 동작한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `FriendManager.ts`: 친구 관계 관리와 데이터 구조를 구현합니다.
        ```typescript
        export class FriendManager {
            private static instance: FriendManager;
            private friends: Map<string, Friend> = new Map();
            private friendRequests: Map<string, FriendRequest> = new Map();
            private blockedUsers: Set<string> = new Set();
            private maxFriends: number = 100;
            
            static getInstance(): FriendManager {
                if (!this.instance) {
                    this.instance = new FriendManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.loadFriendsData();
                this.setupNetworkHandlers();
                this.startActivityTracking();
            }
            
            async sendFriendRequest(targetPlayerId: string, message?: string): Promise<FriendRequestResult> {
                try {
                    // 유효성 검사
                    const validation = await this.validateFriendRequest(targetPlayerId);
                    if (!validation.isValid) {
                        return { success: false, error: validation.reason };
                    }
                    
                    // 친구 요청 생성
                    const request: FriendRequest = {
                        id: this.generateRequestId(),
                        fromPlayerId: PlayerManager.getInstance().getCurrentPlayerId(),
                        toPlayerId: targetPlayerId,
                        message: message || '',
                        timestamp: Date.now(),
                        status: FriendRequestStatus.PENDING
                    };
                    
                    // 서버로 요청 전송
                    const serverResponse = await NetworkManager.getInstance().sendRequest({
                        endpoint: '/social/friend-request',
                        method: 'POST',
                        data: request
                    });
                    
                    if (serverResponse.success) {
                        // 로컬 상태 업데이트
                        this.friendRequests.set(request.id, request);
                        
                        // 이벤트 발생
                        EventBus.getInstance().emit('friend_request_sent', {
                            targetPlayerId: targetPlayerId,
                            requestId: request.id
                        });
                        
                        // 분석 이벤트
                        AnalyticsManager.getInstance().trackEvent('friend_request_sent', {
                            target_player_id: targetPlayerId,
                            has_message: !!message
                        });
                        
                        return { success: true, requestId: request.id };
                    }
                    
                    return { success: false, error: serverResponse.error };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async acceptFriendRequest(requestId: string): Promise<AcceptRequestResult> {
                try {
                    const request = this.friendRequests.get(requestId);
                    if (!request) {
                        return { success: false, error: 'Request not found' };
                    }
                    
                    if (request.status !== FriendRequestStatus.PENDING) {
                        return { success: false, error: 'Request not pending' };
                    }
                    
                    // 친구 수 제한 확인
                    if (this.friends.size >= this.maxFriends) {
                        return { success: false, error: 'Friend limit reached' };
                    }
                    
                    // 서버에 수락 요청
                    const serverResponse = await NetworkManager.getInstance().sendRequest({
                        endpoint: '/social/friend-request/accept',
                        method: 'POST',
                        data: { requestId: requestId }
                    });
                    
                    if (serverResponse.success) {
                        // 친구 관계 생성
                        const newFriend: Friend = {
                            playerId: request.fromPlayerId,
                            friendshipDate: Date.now(),
                            lastInteraction: Date.now(),
                            interactionCount: 0,
                            giftsSent: 0,
                            giftsReceived: 0,
                            status: FriendStatus.ACTIVE,
                            playerData: await this.fetchPlayerData(request.fromPlayerId)
                        };
                        
                        this.friends.set(request.fromPlayerId, newFriend);
                        
                        // 요청 상태 업데이트
                        request.status = FriendRequestStatus.ACCEPTED;
                        request.respondedAt = Date.now();
                        
                        // 환영 선물 자동 전송
                        await this.sendWelcomeGift(request.fromPlayerId);
                        
                        // 이벤트 발생
                        EventBus.getInstance().emit('friend_added', {
                            friend: newFriend
                        });
                        
                        // 분석 이벤트
                        AnalyticsManager.getInstance().trackEvent('friend_request_accepted', {
                            requester_id: request.fromPlayerId,
                            response_time: Date.now() - request.timestamp
                        });
                        
                        return { success: true, newFriend: newFriend };
                    }
                    
                    return { success: false, error: serverResponse.error };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async removeFriend(friendId: string, reason?: string): Promise<RemoveFriendResult> {
                try {
                    const friend = this.friends.get(friendId);
                    if (!friend) {
                        return { success: false, error: 'Friend not found' };
                    }
                    
                    // 서버에 제거 요청
                    const serverResponse = await NetworkManager.getInstance().sendRequest({
                        endpoint: '/social/friend/remove',
                        method: 'POST',
                        data: { friendId: friendId, reason: reason }
                    });
                    
                    if (serverResponse.success) {
                        // 로컬에서 제거
                        this.friends.delete(friendId);
                        
                        // 이벤트 발생
                        EventBus.getInstance().emit('friend_removed', {
                            friendId: friendId,
                            reason: reason
                        });
                        
                        return { success: true };
                    }
                    
                    return { success: false, error: serverResponse.error };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            private async validateFriendRequest(targetPlayerId: string): Promise<ValidationResult> {
                // 자기 자신에게 요청 금지
                if (targetPlayerId === PlayerManager.getInstance().getCurrentPlayerId()) {
                    return { isValid: false, reason: 'Cannot send request to yourself' };
                }
                
                // 이미 친구인지 확인
                if (this.friends.has(targetPlayerId)) {
                    return { isValid: false, reason: 'Already friends' };
                }
                
                // 차단된 사용자인지 확인
                if (this.blockedUsers.has(targetPlayerId)) {
                    return { isValid: false, reason: 'User is blocked' };
                }
                
                // 이미 대기 중인 요청이 있는지 확인
                const existingRequest = Array.from(this.friendRequests.values())
                    .find(req => req.toPlayerId === targetPlayerId && req.status === FriendRequestStatus.PENDING);
                
                if (existingRequest) {
                    return { isValid: false, reason: 'Request already pending' };
                }
                
                // 친구 수 제한 확인
                if (this.friends.size >= this.maxFriends) {
                    return { isValid: false, reason: 'Friend limit reached' };
                }
                
                // 사용자 존재 여부 확인
                const userExists = await this.checkUserExists(targetPlayerId);
                if (!userExists) {
                    return { isValid: false, reason: 'User not found' };
                }
                
                return { isValid: true };
            }
        }
        ```
    2.  **[Task 1.2]** `FriendRequestSystem.ts`: 친구 요청의 생성, 수락, 거절 로직을 구현합니다.
    3.  **[Task 1.3]** `GiftSystem.ts`: 친구 간 선물 주고받기 시스템을 구현합니다.
    4.  **[Task 1.4]** `FriendRecommendationEngine.ts`: AI 기반 친구 추천 알고리즘을 구현합니다.
    5.  **[Task 1.5]** **친구 시스템 테스트:** 친구 추가/제거와 선물 기능이 정상 작동하는지 검증합니다.

### **Phase 2: 길드 시스템 구현**
*   **기간:** 10일
*   **목표:** 길드 생성, 관리, 이벤트, 역할 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 2.1]** `GuildManager.ts`: 길드의 전체 생명 주기 관리를 구현합니다.
        ```typescript
        export class GuildManager {
            private static instance: GuildManager;
            private currentGuild: Guild | null = null;
            private guildMembers: Map<string, GuildMember> = new Map();
            private guildEvents: Map<string, GuildEvent> = new Map();
            private memberPermissions: Map<string, Set<GuildPermission>> = new Map();
            
            static getInstance(): GuildManager {
                if (!this.instance) {
                    this.instance = new GuildManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.loadCurrentGuild();
                this.setupEventHandlers();
                this.startActivityTracking();
            }
            
            async createGuild(guildData: CreateGuildRequest): Promise<CreateGuildResult> {
                try {
                    // 길드 생성 조건 확인
                    const validation = await this.validateGuildCreation(guildData);
                    if (!validation.isValid) {
                        return { success: false, error: validation.reason };
                    }
                    
                    // 길드 데이터 구성
                    const guild: Guild = {
                        id: this.generateGuildId(),
                        name: guildData.name,
                        description: guildData.description,
                        tag: guildData.tag,
                        logoUrl: guildData.logoUrl || this.getDefaultLogo(),
                        
                        level: 1,
                        experience: 0,
                        memberCount: 1,
                        maxMembers: this.getInitialMemberLimit(),
                        
                        joinPolicy: guildData.joinPolicy,
                        requiredLevel: guildData.requiredLevel || 1,
                        language: guildData.language || 'en',
                        region: guildData.region || 'global',
                        
                        createdAt: Date.now(),
                        lastActivityAt: Date.now(),
                        
                        totalScore: 0,
                        weeklyScore: 0,
                        achievements: [],
                        activeEvents: [],
                        
                        settings: {
                            allowInvitations: true,
                            requireApproval: guildData.joinPolicy === GuildJoinPolicy.APPROVAL_REQUIRED,
                            weeklyGoal: 10000,
                            chatEnabled: true
                        }
                    };
                    
                    // 서버에 생성 요청
                    const serverResponse = await NetworkManager.getInstance().sendRequest({
                        endpoint: '/social/guild/create',
                        method: 'POST',
                        data: guild
                    });
                    
                    if (serverResponse.success) {
                        this.currentGuild = serverResponse.guild;
                        
                        // 생성자를 리더로 등록
                        const leader: GuildMember = {
                            playerId: PlayerManager.getInstance().getCurrentPlayerId(),
                            playerData: await PlayerManager.getInstance().getPlayerData(),
                            rank: GuildRank.LEADER,
                            joinDate: Date.now(),
                            lastSeen: Date.now(),
                            totalContribution: 0,
                            weeklyContribution: 0,
                            permissions: this.getLeaderPermissions()
                        };
                        
                        this.guildMembers.set(leader.playerId, leader);
                        this.memberPermissions.set(leader.playerId, leader.permissions);
                        
                        // 길드 생성 비용 차감
                        await CurrencyManager.getInstance().deductCurrency(
                            CurrencyType.GEMS,
                            this.getGuildCreationCost(),
                            TransactionReason.GUILD_CREATION
                        );
                        
                        // 이벤트 발생
                        EventBus.getInstance().emit('guild_created', {
                            guild: this.currentGuild
                        });
                        
                        // 분석 이벤트
                        AnalyticsManager.getInstance().trackEvent('guild_created', {
                            guild_id: this.currentGuild.id,
                            guild_name: this.currentGuild.name,
                            join_policy: this.currentGuild.joinPolicy
                        });
                        
                        return { success: true, guild: this.currentGuild };
                    }
                    
                    return { success: false, error: serverResponse.error };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async joinGuild(guildId: string, applicationMessage?: string): Promise<JoinGuildResult> {
                try {
                    // 이미 길드에 속해있는지 확인
                    if (this.currentGuild) {
                        return { success: false, error: 'Already in a guild' };
                    }
                    
                    // 길드 정보 조회
                    const guildInfo = await this.getGuildInfo(guildId);
                    if (!guildInfo) {
                        return { success: false, error: 'Guild not found' };
                    }
                    
                    // 가입 조건 확인
                    const validation = await this.validateGuildJoin(guildInfo);
                    if (!validation.isValid) {
                        return { success: false, error: validation.reason };
                    }
                    
                    // 가입 정책에 따른 처리
                    if (guildInfo.joinPolicy === GuildJoinPolicy.AUTO_ACCEPT) {
                        return await this.processAutoJoin(guildId);
                    } else {
                        return await this.submitJoinApplication(guildId, applicationMessage);
                    }
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async promoteToRank(memberId: string, newRank: GuildRank): Promise<PromotionResult> {
                try {
                    // 권한 확인
                    if (!this.hasPermission(GuildPermission.PROMOTE_MEMBERS)) {
                        return { success: false, error: 'Insufficient permissions' };
                    }
                    
                    const member = this.guildMembers.get(memberId);
                    if (!member) {
                        return { success: false, error: 'Member not found' };
                    }
                    
                    // 승진 가능성 확인
                    const currentPlayerRank = this.getCurrentPlayerRank();
                    if (!this.canPromoteToRank(currentPlayerRank, newRank)) {
                        return { success: false, error: 'Cannot promote to this rank' };
                    }
                    
                    // 서버에 승진 요청
                    const serverResponse = await NetworkManager.getInstance().sendRequest({
                        endpoint: '/social/guild/promote',
                        method: 'POST',
                        data: {
                            guildId: this.currentGuild!.id,
                            memberId: memberId,
                            newRank: newRank
                        }
                    });
                    
                    if (serverResponse.success) {
                        // 로컬 상태 업데이트
                        const oldRank = member.rank;
                        member.rank = newRank;
                        member.permissions = this.getPermissionsForRank(newRank);
                        this.memberPermissions.set(memberId, member.permissions);
                        
                        // 이벤트 발생
                        EventBus.getInstance().emit('member_promoted', {
                            memberId: memberId,
                            oldRank: oldRank,
                            newRank: newRank
                        });
                        
                        // 길드 채팅에 알림
                        await this.sendGuildAnnouncement(
                            `${member.playerData.username}님이 ${newRank}로 승진했습니다!`
                        );
                        
                        return { success: true, oldRank: oldRank, newRank: newRank };
                    }
                    
                    return { success: false, error: serverResponse.error };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            // 길드 이벤트 시작
            async startGuildEvent(eventType: GuildEventType, eventData: any): Promise<EventStartResult> {
                try {
                    // 이벤트 시작 권한 확인
                    if (!this.hasPermission(GuildPermission.START_EVENTS)) {
                        return { success: false, error: 'Insufficient permissions' };
                    }
                    
                    // 이벤트 생성
                    const guildEvent = await GuildEventManager.getInstance().createEvent(
                        eventType,
                        this.currentGuild!.id,
                        eventData
                    );
                    
                    if (guildEvent) {
                        this.guildEvents.set(guildEvent.id, guildEvent);
                        
                        // 모든 길드원에게 알림
                        await this.notifyAllMembers({
                            type: 'guild_event_started',
                            title: `새로운 길드 이벤트: ${guildEvent.name}`,
                            message: guildEvent.description,
                            data: { eventId: guildEvent.id }
                        });
                        
                        return { success: true, event: guildEvent };
                    }
                    
                    return { success: false, error: 'Failed to create event' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            private hasPermission(permission: GuildPermission): boolean {
                const currentPlayerId = PlayerManager.getInstance().getCurrentPlayerId();
                const playerPermissions = this.memberPermissions.get(currentPlayerId);
                
                return playerPermissions ? playerPermissions.has(permission) : false;
            }
            
            private getLeaderPermissions(): Set<GuildPermission> {
                return new Set([
                    GuildPermission.KICK_MEMBERS,
                    GuildPermission.PROMOTE_MEMBERS,
                    GuildPermission.DEMOTE_MEMBERS,
                    GuildPermission.START_EVENTS,
                    GuildPermission.MANAGE_SETTINGS,
                    GuildPermission.DISBAND_GUILD,
                    GuildPermission.SEND_ANNOUNCEMENTS
                ]);
            }
        }
        ```
    2.  **[Task 2.2]** `GuildCreationSystem.ts`: 길드 생성 프로세스와 초기 설정을 구현합니다.
    3.  **[Task 2.3]** `GuildEventManager.ts`: 길드 협력 이벤트와 도전 과제를 구현합니다.
    4.  **[Task 2.4]** `GuildRoleSystem.ts`: 길드 내 역할과 권한 관리를 구현합니다.
    5.  **[Task 2.5]** **길드 시스템 테스트:** 길드 생성, 가입, 이벤트가 정상 작동하는지 검증합니다.

### **Phase 3: 경쟁 및 리더보드 시스템**
*   **기간:** 8일
*   **목표:** 리더보드, 토너먼트, 순위 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 3.1]** `LeaderboardManager.ts`: 다중 리더보드 관리와 실시간 업데이트를 구현합니다.
        ```typescript
        export class LeaderboardManager {
            private static instance: LeaderboardManager;
            private leaderboards: Map<LeaderboardType, Leaderboard> = new Map();
            private playerRankings: Map<string, PlayerRanking> = new Map();
            private rankingCache: Map<string, CachedRanking> = new Map();
            private updateQueue: RankingUpdate[] = [];
            
            static getInstance(): LeaderboardManager {
                if (!this.instance) {
                    this.instance = new LeaderboardManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.setupLeaderboards();
                this.loadPlayerRankings();
                this.startRankingProcessor();
                this.startCacheManager();
            }
            
            private setupLeaderboards(): void {
                // 글로벌 점수 리더보드
                this.leaderboards.set(LeaderboardType.GLOBAL_SCORE, {
                    type: LeaderboardType.GLOBAL_SCORE,
                    name: '글로벌 최고 점수',
                    description: '전 세계 플레이어들의 최고 점수 순위',
                    scoreType: ScoreType.HIGHEST_SCORE,
                    timeframe: TimeFrame.ALL_TIME,
                    maxEntries: 10000,
                    updateFrequency: 5 * 60 * 1000, // 5분
                    entries: [],
                    lastUpdated: 0
                });
                
                // 주간 점수 리더보드
                this.leaderboards.set(LeaderboardType.WEEKLY_SCORE, {
                    type: LeaderboardType.WEEKLY_SCORE,
                    name: '주간 점수 랭킹',
                    description: '이번 주 누적 점수 순위',
                    scoreType: ScoreType.WEEKLY_TOTAL,
                    timeframe: TimeFrame.WEEKLY,
                    maxEntries: 1000,
                    updateFrequency: 60 * 60 * 1000, // 1시간
                    resetFrequency: 7 * 24 * 60 * 60 * 1000, // 주간 리셋
                    entries: [],
                    lastUpdated: 0
                });
                
                // 친구 리더보드
                this.leaderboards.set(LeaderboardType.FRIENDS, {
                    type: LeaderboardType.FRIENDS,
                    name: '친구 순위',
                    description: '친구들과의 점수 경쟁',
                    scoreType: ScoreType.HIGHEST_SCORE,
                    timeframe: TimeFrame.ALL_TIME,
                    maxEntries: 100,
                    updateFrequency: 5 * 60 * 1000, // 5분
                    filterType: FilterType.FRIENDS_ONLY,
                    entries: [],
                    lastUpdated: 0
                });
            }
            
            async updatePlayerScore(
                playerId: string, 
                scoreType: ScoreType, 
                newScore: number,
                metadata?: any
            ): Promise<RankingUpdateResult> {
                try {
                    // 점수 개선 여부 확인
                    const currentScore = await this.getPlayerScore(playerId, scoreType);
                    if (newScore <= currentScore) {
                        return { success: true, rankChanged: false, improvement: false };
                    }
                    
                    // 업데이트 큐에 추가
                    const update: RankingUpdate = {
                        playerId: playerId,
                        scoreType: scoreType,
                        oldScore: currentScore,
                        newScore: newScore,
                        timestamp: Date.now(),
                        metadata: metadata || {}
                    };
                    
                    this.updateQueue.push(update);
                    
                    // 즉시 로컬 캐시 업데이트
                    await this.updateLocalRanking(update);
                    
                    // 영향받는 리더보드 확인
                    const affectedLeaderboards = this.getAffectedLeaderboards(scoreType);
                    let rankChanged = false;
                    
                    for (const leaderboardType of affectedLeaderboards) {
                        const oldRank = await this.getPlayerRank(playerId, leaderboardType);
                        await this.updateLeaderboard(leaderboardType, playerId, newScore);
                        const newRank = await this.getPlayerRank(playerId, leaderboardType);
                        
                        if (oldRank !== newRank) {
                            rankChanged = true;
                            
                            // 순위 변화 이벤트
                            EventBus.getInstance().emit('ranking_changed', {
                                playerId: playerId,
                                leaderboardType: leaderboardType,
                                oldRank: oldRank,
                                newRank: newRank,
                                scoreImprovement: newScore - currentScore
                            });
                            
                            // 중요한 순위 변화는 즉시 알림
                            if (newRank <= 10 && oldRank > 10) {
                                await this.sendRankingAchievementNotification(
                                    playerId, 
                                    leaderboardType, 
                                    newRank
                                );
                            }
                        }
                    }
                    
                    return {
                        success: true,
                        rankChanged: rankChanged,
                        improvement: true,
                        scoreImprovement: newScore - currentScore,
                        affectedLeaderboards: affectedLeaderboards
                    };
                } catch (error) {
                    console.error('Failed to update player score:', error);
                    return { success: false, error: error.message };
                }
            }
            
            async getLeaderboard(
                type: LeaderboardType, 
                limit: number = 100,
                offset: number = 0
            ): Promise<LeaderboardEntry[]> {
                const cacheKey = `${type}_${limit}_${offset}`;
                const cached = this.rankingCache.get(cacheKey);
                
                // 캐시된 데이터가 있고 유효한 경우
                if (cached && Date.now() - cached.timestamp < 60000) { // 1분 캐시
                    return cached.entries;
                }
                
                const leaderboard = this.leaderboards.get(type);
                if (!leaderboard) {
                    return [];
                }
                
                // 서버에서 최신 데이터 조회
                const serverResponse = await NetworkManager.getInstance().sendRequest({
                    endpoint: '/social/leaderboard',
                    method: 'GET',
                    params: {
                        type: type,
                        limit: limit,
                        offset: offset
                    }
                });
                
                if (serverResponse.success) {
                    const entries = serverResponse.entries.map((entry: any) => ({
                        rank: entry.rank,
                        playerId: entry.player_id,
                        playerName: entry.player_name,
                        score: entry.score,
                        avatar: entry.avatar,
                        country: entry.country,
                        lastUpdated: entry.last_updated
                    }));
                    
                    // 캐시에 저장
                    this.rankingCache.set(cacheKey, {
                        entries: entries,
                        timestamp: Date.now()
                    });
                    
                    return entries;
                }
                
                return [];
            }
            
            async getPlayerRank(playerId: string, leaderboardType: LeaderboardType): Promise<number> {
                try {
                    const serverResponse = await NetworkManager.getInstance().sendRequest({
                        endpoint: '/social/player-rank',
                        method: 'GET',
                        params: {
                            player_id: playerId,
                            leaderboard_type: leaderboardType
                        }
                    });
                    
                    return serverResponse.success ? serverResponse.rank : -1;
                } catch (error) {
                    console.error('Failed to get player rank:', error);
                    return -1;
                }
            }
            
            // 실시간 순위 업데이트 처리
            private startRankingProcessor(): void {
                setInterval(async () => {
                    if (this.updateQueue.length === 0) {
                        return;
                    }
                    
                    // 배치로 업데이트 처리
                    const batch = this.updateQueue.splice(0, 50); // 최대 50개씩
                    
                    try {
                        await NetworkManager.getInstance().sendRequest({
                            endpoint: '/social/ranking/batch-update',
                            method: 'POST',
                            data: { updates: batch }
                        });
                    } catch (error) {
                        console.error('Failed to process ranking updates:', error);
                        
                        // 실패한 업데이트는 다시 큐에 추가
                        this.updateQueue.unshift(...batch);
                    }
                }, 10000); // 10초마다 처리
            }
        }
        ```
    2.  **[Task 3.2]** `TournamentSystem.ts`: 토너먼트 생성, 참가, 순위 관리를 구현합니다.
    3.  **[Task 3.3]** `RankingCalculator.ts`: 복잡한 순위 계산 알고리즘을 구현합니다.
    4.  **[Task 3.4]** `CompetitionScheduler.ts`: 경쟁 이벤트의 일정 관리를 구현합니다.
    5.  **[Task 3.5]** **경쟁 시스템 테스트:** 리더보드와 토너먼트가 정확히 작동하는지 검증합니다.

### **Phase 4: 커뮤니케이션 시스템**
*   **기간:** 6일
*   **목표:** 채팅, 알림, 중재 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 4.1]** `ChatManager.ts`: 실시간 채팅과 메시지 관리를 구현합니다.
        ```typescript
        export class ChatManager {
            private static instance: ChatManager;
            private chatChannels: Map<string, ChatChannel> = new Map();
            private messageHistory: Map<string, ChatMessage[]> = new Map();
            private messageFilter: MessageFilter;
            private moderationSystem: ModerationSystem;
            
            static getInstance(): ChatManager {
                if (!this.instance) {
                    this.instance = new ChatManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.messageFilter = new MessageFilter();
                this.moderationSystem = new ModerationSystem();
                this.setupDefaultChannels();
                this.connectToWebSocket();
            }
            
            async sendMessage(channelId: string, content: string, type: MessageType = MessageType.TEXT): Promise<SendMessageResult> {
                try {
                    const playerId = PlayerManager.getInstance().getCurrentPlayerId();
                    
                    // 채널 존재 확인
                    const channel = this.chatChannels.get(channelId);
                    if (!channel) {
                        return { success: false, error: 'Channel not found' };
                    }
                    
                    // 전송 권한 확인
                    if (!this.canSendMessage(playerId, channel)) {
                        return { success: false, error: 'No permission to send messages' };
                    }
                    
                    // 메시지 필터링
                    const filterResult = await this.messageFilter.filterMessage(content);
                    if (!filterResult.allowed) {
                        return { 
                            success: false, 
                            error: 'Message blocked by filter',
                            reason: filterResult.reason 
                        };
                    }
                    
                    // 메시지 생성
                    const message: ChatMessage = {
                        id: this.generateMessageId(),
                        channelId: channelId,
                        senderId: playerId,
                        senderName: await this.getPlayerName(playerId),
                        content: filterResult.filteredContent || content,
                        type: type,
                        timestamp: Date.now(),
                        edited: false,
                        reactions: new Map()
                    };
                    
                    // 서버로 전송
                    const serverResponse = await this.sendToServer(message);
                    if (!serverResponse.success) {
                        return { success: false, error: serverResponse.error };
                    }
                    
                    // 로컬 히스토리에 추가
                    this.addMessageToHistory(channelId, message);
                    
                    // 이벤트 발생
                    EventBus.getInstance().emit('message_sent', {
                        channelId: channelId,
                        message: message
                    });
                    
                    return { success: true, messageId: message.id };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async receiveMessage(message: ChatMessage): Promise<void> {
                // 메시지 추가
                this.addMessageToHistory(message.channelId, message);
                
                // 중재 시스템 적용
                await this.moderationSystem.processMessage(message);
                
                // UI 업데이트 이벤트
                EventBus.getInstance().emit('message_received', {
                    channelId: message.channelId,
                    message: message
                });
                
                // 알림 처리 (현재 채널이 아닌 경우)
                if (!this.isCurrentChannel(message.channelId)) {
                    await this.showMessageNotification(message);
                }
            }
            
            private connectToWebSocket(): void {
                const wsUrl = `${GameConfig.WEBSOCKET_URL}/chat`;
                const ws = new WebSocket(wsUrl);
                
                ws.onopen = () => {
                    console.log('Chat WebSocket connected');
                    
                    // 인증 정보 전송
                    ws.send(JSON.stringify({
                        type: 'auth',
                        token: PlayerManager.getInstance().getAuthToken()
                    }));
                };
                
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    
                    switch (data.type) {
                        case 'message':
                            this.receiveMessage(data.message);
                            break;
                        case 'user_joined':
                            this.handleUserJoined(data);
                            break;
                        case 'user_left':
                            this.handleUserLeft(data);
                            break;
                    }
                };
                
                ws.onerror = (error) => {
                    console.error('Chat WebSocket error:', error);
                };
                
                ws.onclose = () => {
                    console.log('Chat WebSocket disconnected');
                    // 재연결 로직
                    setTimeout(() => this.connectToWebSocket(), 5000);
                };
            }
        }
        ```
    2.  **[Task 4.2]** `MessageFilter.ts`: 메시지 필터링과 욕설 차단을 구현합니다.
    3.  **[Task 4.3]** `ModerationSystem.ts`: 사용자 신고와 자동 중재를 구현합니다.
    4.  **[Task 4.4]** `NotificationCenter.ts`: 통합 알림 시스템을 구현합니다.
    5.  **[Task 4.5]** **커뮤니케이션 테스트:** 채팅과 알림이 실시간으로 작동하는지 검증합니다.

### **Phase 5: 고급 소셜 기능**
*   **기간:** 4일
*   **목표:** 프라이버시, 차단, 신고 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 5.1]** `PrivacyManager.ts`: 개인정보 보호와 공개 범위 설정을 구현합니다.
    2.  **[Task 5.2]** **사용자 차단 시스템:** 차단과 신고 기능을 구현합니다.
    3.  **[Task 5.3]** **소셜 분석 시스템:** 소셜 활동 분석과 개선 제안을 구현합니다.
    4.  **[Task 5.4]** **크로스 플랫폼 연동:** 다양한 플랫폼 간 소셜 연동을 구현합니다.
    5.  **[Task 5.5]** **통합 소셜 시스템 테스트:** 모든 소셜 기능이 유기적으로 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 실시간 소셜 동기화

```typescript
// 실시간 소셜 데이터 동기화
export class SocialSyncManager {
    private syncQueue: SyncOperation[] = [];
    private conflictResolver: ConflictResolver;
    
    async syncSocialData(): Promise<SyncResult> {
        const operations = this.collectPendingSyncOperations();
        
        for (const operation of operations) {
            try {
                await this.executeSyncOperation(operation);
            } catch (error) {
                // 충돌 해결
                const resolution = await this.conflictResolver.resolve(operation, error);
                if (resolution.shouldRetry) {
                    this.syncQueue.push(operation);
                }
            }
        }
        
        return {
            syncedOperations: operations.length,
            failedOperations: this.syncQueue.length
        };
    }
}
```

### 4.2. 소셜 추천 알고리즘

```typescript
// AI 기반 소셜 추천 시스템
export class SocialRecommendationEngine {
    async generateRecommendations(playerId: string): Promise<SocialRecommendation[]> {
        const playerProfile = await this.getPlayerProfile(playerId);
        
        // 다양한 추천 알고리즘 적용
        const recommendations = [
            ...await this.findMutualFriends(playerProfile),
            ...await this.findSimilarPlayers(playerProfile),
            ...await this.findActiveGuilds(playerProfile),
            ...await this.findNearbyPlayers(playerProfile)
        ];
        
        // 추천 점수 계산 및 정렬
        return this.rankRecommendations(recommendations, playerProfile);
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **설계 문서 완벽 준수:** `05-Social-System-Design.md`에 정의된 모든 소셜 기능을 정확히 구현합니다.

2.  **실시간성 보장:** 채팅, 알림, 상태 업데이트가 실시간으로 동기화되어야 합니다.

3.  **확장성 고려:** 대규모 사용자와 길드를 지원할 수 있는 아키텍처를 구축합니다.

4.  **보안 및 중재:** 악용 방지와 건전한 커뮤니티 환경을 위한 시스템을 구축합니다.

5.  **크로스 플랫폼:** 다양한 플랫폼에서 일관된 소셜 경험을 제공합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **메시지 전송 지연:** 500ms 이내
- **친구 목록 로딩:** 2초 이내
- **리더보드 업데이트:** 10초 이내
- **길드 데이터 동기화:** 5초 이내

### 6.2. 검증 기준
- 모든 소셜 기능이 안정적으로 작동함
- 실시간 커뮤니케이션이 지연 없이 동작함
- 대규모 길드 이벤트가 원활히 진행됨
- 개인정보 보호 정책이 완벽히 준수됨
- 악용 행위가 효과적으로 차단됨

이 구현 계획을 통해 Sweet Puzzle의 소셜 시스템을 완성하여 플레이어들이 자연스럽게 연결되고 소통할 수 있는 활발한 커뮤니티 환경을 제공할 수 있을 것입니다.