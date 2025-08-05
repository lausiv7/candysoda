# 소셜 시스템 설계

## 개요

Sweet Puzzle 게임의 소셜 기능 아키텍처 설계서입니다. 친구 시스템, 길드 관리, 경쟁 시스템, 협력 퍼즐, 리더보드를 통해 플레이어 간의 상호작용과 커뮤니티 형성을 촉진하는 시스템을 설계합니다.

---

## 1. 👥 친구 시스템

### 친구 관리 아키텍처

#### 친구 데이터 모델
```typescript
// 친구 관계 정의
export interface FriendRelationship {
    id: string;
    playerId: string;
    friendId: string;
    status: FriendStatus;
    connectionDate: number;
    lastInteraction: number;
    
    // 상호작용 통계
    helpsSent: number;
    helpsReceived: number;
    giftsExchanged: number;
    
    // 친구 정보 캐시
    friendData: {
        username: string;
        level: number;
        avatarUrl: string;
        lastSeen: number;
        currentWorld: number;
    };
}

export enum FriendStatus {
    PENDING_SENT = 'pending_sent',
    PENDING_RECEIVED = 'pending_received',
    ACCEPTED = 'accepted',
    BLOCKED = 'blocked'
}

// 친구 관리 시스템
export class FriendManager {
    private friends: Map<string, FriendRelationship> = new Map();
    private friendRequests: FriendRequest[] = [];
    private maxFriends: number = 100;
    
    async sendFriendRequest(targetPlayerId: string): Promise<FriendRequestResult> {
        try {
            // 1. 이미 친구인지 확인
            if (this.isFriend(targetPlayerId)) {
                return { success: false, error: 'Already friends' };
            }
            
            // 2. 친구 수 제한 확인
            if (this.getFriendCount() >= this.maxFriends) {
                return { success: false, error: 'Friend limit reached' };
            }
            
            // 3. 차단 상태 확인
            if (await this.isBlocked(targetPlayerId)) {
                return { success: false, error: 'Cannot send request to blocked user' };
            }
            
            // 4. 친구 요청 생성
            const request: FriendRequest = {
                id: this.generateRequestId(),
                fromPlayerId: PlayerManager.getInstance().getCurrentPlayerId(),
                toPlayerId: targetPlayerId,
                timestamp: Date.now(),
                message: ''
            };
            
            // 5. 서버로 요청 전송
            const result = await NetworkManager.getInstance().sendFriendRequest(request);
            
            if (result.success) {
                // 로컬 상태 업데이트
                this.addPendingRequest(request);
                
                EventBus.getInstance().emit('friend_request_sent', {
                    targetPlayerId: targetPlayerId
                });
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async acceptFriendRequest(requestId: string): Promise<boolean> {
        try {
            const request = this.findPendingRequest(requestId);
            if (!request) {
                return false;
            }
            
            // 서버에 수락 요청
            const result = await NetworkManager.getInstance().acceptFriendRequest(requestId);
            
            if (result.success) {
                // 친구 관계 생성
                const friendship: FriendRelationship = {
                    id: this.generateFriendshipId(),
                    playerId: PlayerManager.getInstance().getCurrentPlayerId(),
                    friendId: request.fromPlayerId,
                    status: FriendStatus.ACCEPTED,
                    connectionDate: Date.now(),
                    lastInteraction: Date.now(),
                    helpsSent: 0,
                    helpsReceived: 0,
                    giftsExchanged: 0,
                    friendData: await this.fetchFriendData(request.fromPlayerId)
                };
                
                this.friends.set(request.fromPlayerId, friendship);
                this.removePendingRequest(requestId);
                
                EventBus.getInstance().emit('friend_added', {
                    friend: friendship.friendData
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to accept friend request:', error);
            return false;
        }
    }
}
```

#### 친구 추천 시스템
```typescript
export class FriendRecommendationEngine {
    private recommendationAlgorithms: RecommendationAlgorithm[] = [];
    
    constructor() {
        this.setupAlgorithms();
    }
    
    async generateRecommendations(playerId: string, limit: number = 10): Promise<FriendRecommendation[]> {
        const playerProfile = await this.getPlayerProfile(playerId);
        const recommendations: FriendRecommendation[] = [];
        
        // 1. 공통 친구 기반 추천
        const mutualFriendRecommendations = await this.findMutualFriendConnections(playerProfile);
        recommendations.push(...mutualFriendRecommendations);
        
        // 2. 플레이 스타일 유사성 기반 추천
        const similarPlayersRecommendations = await this.findSimilarPlayers(playerProfile);
        recommendations.push(...similarPlayersRecommendations);
        
        // 3. 지역 기반 추천
        const localPlayersRecommendations = await this.findLocalPlayers(playerProfile);
        recommendations.push(...localPlayersRecommendations);
        
        // 4. 레벨 대역 기반 추천
        const levelBasedRecommendations = await this.findSameLevelPlayers(playerProfile);
        recommendations.push(...levelBasedRecommendations);
        
        // 추천 점수 계산 및 정렬
        const scoredRecommendations = recommendations.map(rec => ({
            ...rec,
            score: this.calculateRecommendationScore(rec, playerProfile)
        }));
        
        scoredRecommendations.sort((a, b) => b.score - a.score);
        
        return scoredRecommendations.slice(0, limit);
    }
    
    private async findMutualFriendConnections(playerProfile: PlayerProfile): Promise<FriendRecommendation[]> {
        const playerFriends = await this.getPlayerFriends(playerProfile.id);
        const recommendations: FriendRecommendation[] = [];
        
        for (const friend of playerFriends) {
            const friendsFriends = await this.getPlayerFriends(friend.id);
            
            for (const friendOfFriend of friendsFriends) {
                if (friendOfFriend.id !== playerProfile.id && !this.isAlreadyFriend(playerProfile.id, friendOfFriend.id)) {
                    recommendations.push({
                        candidateId: friendOfFriend.id,
                        candidateData: friendOfFriend,
                        reason: `${friend.username}님과 공통 친구`,
                        confidence: 0.8,
                        mutualFriends: [friend]
                    });
                }
            }
        }
        
        return this.deduplicateRecommendations(recommendations);
    }
    
    private calculateRecommendationScore(recommendation: FriendRecommendation, playerProfile: PlayerProfile): number {
        let score = 0;
        
        // 공통 친구 수에 따른 점수
        score += recommendation.mutualFriends.length * 20;
        
        // 레벨 차이에 따른 점수 (비슷할수록 높은 점수)
        const levelDifference = Math.abs(playerProfile.level - recommendation.candidateData.level);
        score += Math.max(0, 50 - levelDifference * 2);
        
        // 활동성에 따른 점수
        const daysSinceLastSeen = (Date.now() - recommendation.candidateData.lastSeen) / (24 * 60 * 60 * 1000);
        score += Math.max(0, 30 - daysSinceLastSeen * 2);
        
        // 플레이 스타일 유사성
        const stylesSimilarity = this.calculatePlayStyleSimilarity(playerProfile, recommendation.candidateData);
        score += stylesSimilarity * 30;
        
        return score * recommendation.confidence;
    }
}
```

### 선물 및 도움 시스템

#### 하트 선물 메커니즘
```typescript
export class GiftSystem {
    private giftCooldowns: Map<string, number> = new Map();
    private maxGiftsPerDay: number = 5;
    private giftTypes: Map<GiftType, GiftConfig> = new Map();
    
    constructor() {
        this.setupGiftTypes();
    }
    
    async sendGift(giftType: GiftType, recipientId: string): Promise<GiftResult> {
        try {
            const senderId = PlayerManager.getInstance().getCurrentPlayerId();
            
            // 1. 쿨다운 확인
            if (this.isOnCooldown(senderId, recipientId)) {
                const cooldownEnd = this.giftCooldowns.get(`${senderId}_${recipientId}`) || 0;
                const remainingTime = cooldownEnd - Date.now();
                return {
                    success: false,
                    error: 'Gift cooldown active',
                    cooldownMs: remainingTime
                };
            }
            
            // 2. 일일 선물 한도 확인
            const dailyGiftCount = await this.getDailyGiftCount(senderId);
            if (dailyGiftCount >= this.maxGiftsPerDay) {
                return {
                    success: false,
                    error: 'Daily gift limit reached'
                };
            }
            
            // 3. 선물 비용 확인
            const giftConfig = this.giftTypes.get(giftType);
            if (!giftConfig) {
                return { success: false, error: 'Invalid gift type' };
            }
            
            const canAfford = await this.checkGiftCost(senderId, giftConfig.cost);
            if (!canAfford) {
                return { success: false, error: 'Insufficient resources' };
            }
            
            // 4. 선물 생성
            const gift: Gift = {
                id: this.generateGiftId(),
                senderId: senderId,
                recipientId: recipientId,
                giftType: giftType,
                timestamp: Date.now(),
                claimed: false,
                expiresAt: Date.now() + giftConfig.expirationTime
            };
            
            // 5. 서버로 선물 전송
            const result = await NetworkManager.getInstance().sendGift(gift);
            
            if (result.success) {
                // 로컬 상태 업데이트
                await this.deductGiftCost(senderId, giftConfig.cost);
                this.setGiftCooldown(senderId, recipientId, giftConfig.cooldownTime);
                await this.incrementDailyGiftCount(senderId);
                
                EventBus.getInstance().emit('gift_sent', {
                    recipient: recipientId,
                    giftType: giftType
                });
                
                return { success: true, gift: gift };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async claimGift(giftId: string): Promise<ClaimResult> {
        try {
            const gift = await this.getGift(giftId);
            if (!gift) {
                return { success: false, error: 'Gift not found' };
            }
            
            if (gift.claimed) {
                return { success: false, error: 'Gift already claimed' };
            }
            
            if (Date.now() > gift.expiresAt) {
                return { success: false, error: 'Gift expired' };
            }
            
            // 선물 수령
            const giftConfig = this.giftTypes.get(gift.giftType);
            const rewards = this.calculateGiftRewards(giftConfig);
            
            const result = await RewardManager.getInstance().giveRewards(rewards);
            
            if (result.success) {
                // 선물 상태 업데이트
                await this.markGiftAsClaimed(giftId);
                
                // 송신자에게 고마움 표시 전송
                await this.sendThankYouNotification(gift.senderId, gift.recipientId);
                
                EventBus.getInstance().emit('gift_claimed', {
                    gift: gift,
                    rewards: rewards
                });
                
                return { success: true, rewards: rewards };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    private setupGiftTypes(): void {
        this.giftTypes.set(GiftType.HEART, {
            cost: { coins: 100 },
            rewards: { hearts: 1 },
            cooldownTime: 4 * 60 * 60 * 1000, // 4시간
            expirationTime: 24 * 60 * 60 * 1000 // 24시간
        });
        
        this.giftTypes.set(GiftType.COINS, {
            cost: { coins: 500 },
            rewards: { coins: 1000 },
            cooldownTime: 8 * 60 * 60 * 1000, // 8시간
            expirationTime: 48 * 60 * 60 * 1000 // 48시간
        });
        
        this.giftTypes.set(GiftType.BOOSTER, {
            cost: { gems: 10 },
            rewards: { boosters: { hammer: 1 } },
            cooldownTime: 12 * 60 * 60 * 1000, // 12시간
            expirationTime: 72 * 60 * 60 * 1000 // 72시간
        });
    }
}
```

---

## 2. 🏰 길드 시스템

### 길드 관리 아키텍처

#### 길드 데이터 모델
```typescript
export interface Guild {
    id: string;
    name: string;
    description: string;
    tag: string; // 3-4글자 태그
    logoUrl: string;
    
    // 길드 정보
    level: number;
    experience: number;
    memberCount: number;
    maxMembers: number;
    
    // 길드 설정
    joinPolicy: GuildJoinPolicy;
    requiredLevel: number;
    language: string;
    region: string;
    
    // 시간 정보
    createdAt: number;
    lastActivityAt: number;
    
    // 통계
    totalScore: number;
    weeklyScore: number;
    achievements: GuildAchievement[];
    
    // 현재 이벤트
    activeEvents: GuildEvent[];
}

export interface GuildMember {
    playerId: string;
    playerData: {
        username: string;
        level: number;
        avatarUrl: string;
        lastSeen: number;
    };
    
    // 길드 내 정보
    rank: GuildRank;
    joinDate: number;
    lastContribution: number;
    
    // 기여도
    totalContribution: number;
    weeklyContribution: number;
    
    // 권한
    permissions: GuildPermission[];
}

export enum GuildRank {
    MEMBER = 'member',
    OFFICER = 'officer',
    VICE_LEADER = 'vice_leader',
    LEADER = 'leader'
}

export class GuildManager {
    private currentGuild: Guild | null = null;
    private guildMembers: Map<string, GuildMember> = new Map();
    private guildEvents: Map<string, GuildEvent> = new Map();
    
    async createGuild(guildData: CreateGuildRequest): Promise<CreateGuildResult> {
        try {
            // 1. 길드 이름 중복 확인
            const nameExists = await this.checkGuildNameExists(guildData.name);
            if (nameExists) {
                return { success: false, error: 'Guild name already exists' };
            }
            
            // 2. 태그 중복 확인
            const tagExists = await this.checkGuildTagExists(guildData.tag);
            if (tagExists) {
                return { success: false, error: 'Guild tag already exists' };
            }
            
            // 3. 생성 비용 확인
            const creationCost = this.getGuildCreationCost();
            const canAfford = await PlayerManager.getInstance().checkCurrency(creationCost);
            if (!canAfford) {
                return { success: false, error: 'Insufficient resources to create guild' };
            }
            
            // 4. 길드 생성
            const guild: Guild = {
                id: this.generateGuildId(),
                name: guildData.name,
                description: guildData.description,
                tag: guildData.tag,
                logoUrl: guildData.logoUrl || this.getDefaultGuildLogo(),
                level: 1,
                experience: 0,
                memberCount: 1,
                maxMembers: this.getInitialMemberLimit(),
                joinPolicy: guildData.joinPolicy,
                requiredLevel: guildData.requiredLevel,
                language: guildData.language,
                region: guildData.region,
                createdAt: Date.now(),
                lastActivityAt: Date.now(),
                totalScore: 0,
                weeklyScore: 0,
                achievements: [],
                activeEvents: []
            };
            
            // 5. 서버에 길드 생성 요청
            const result = await NetworkManager.getInstance().createGuild(guild);
            
            if (result.success) {
                // 생성자를 리더로 추가
                const leaderMember: GuildMember = {
                    playerId: PlayerManager.getInstance().getCurrentPlayerId(),
                    playerData: await PlayerManager.getInstance().getPlayerData(),
                    rank: GuildRank.LEADER,
                    joinDate: Date.now(),
                    lastContribution: Date.now(),
                    totalContribution: 0,
                    weeklyContribution: 0,
                    permissions: this.getAllPermissions()
                };
                
                this.currentGuild = result.guild;
                this.guildMembers.set(leaderMember.playerId, leaderMember);
                
                // 생성 비용 차감
                await PlayerManager.getInstance().deductCurrency(creationCost);
                
                EventBus.getInstance().emit('guild_created', { guild: guild });
                
                return { success: true, guild: guild };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async joinGuild(guildId: string, applicationMessage?: string): Promise<JoinGuildResult> {
        try {
            const guild = await this.getGuildInfo(guildId);
            if (!guild) {
                return { success: false, error: 'Guild not found' };
            }
            
            // 1. 가입 조건 확인
            const playerLevel = PlayerManager.getInstance().getPlayerLevel();
            if (playerLevel < guild.requiredLevel) {
                return { 
                    success: false, 
                    error: `Required level: ${guild.requiredLevel}` 
                };
            }
            
            // 2. 길드 정원 확인
            if (guild.memberCount >= guild.maxMembers) {
                return { success: false, error: 'Guild is full' };
            }
            
            // 3. 가입 정책에 따른 처리
            if (guild.joinPolicy === GuildJoinPolicy.AUTO_ACCEPT) {
                return await this.processAutoJoin(guildId);
            } else {
                return await this.submitJoinApplication(guildId, applicationMessage);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    private async processAutoJoin(guildId: string): Promise<JoinGuildResult> {
        const joinResult = await NetworkManager.getInstance().joinGuild(guildId);
        
        if (joinResult.success) {
            const guild = joinResult.guild;
            const newMember: GuildMember = {
                playerId: PlayerManager.getInstance().getCurrentPlayerId(),
                playerData: await PlayerManager.getInstance().getPlayerData(),
                rank: GuildRank.MEMBER,
                joinDate: Date.now(),
                lastContribution: Date.now(),
                totalContribution: 0,
                weeklyContribution: 0,
                permissions: this.getMemberPermissions()
            };
            
            this.currentGuild = guild;
            this.guildMembers.set(newMember.playerId, newMember);
            
            EventBus.getInstance().emit('guild_joined', { guild: guild });
        }
        
        return joinResult;
    }
}
```

### 길드 이벤트 시스템

#### 협력 이벤트 관리
```typescript
export class GuildEventManager {
    private activeEvents: Map<string, GuildEvent> = new Map();
    private eventTemplates: Map<string, GuildEventTemplate> = new Map();
    
    constructor() {
        this.loadEventTemplates();
    }
    
    async startGuildEvent(eventType: GuildEventType, guildId: string): Promise<EventStartResult> {
        try {
            const template = this.eventTemplates.get(eventType);
            if (!template) {
                return { success: false, error: 'Invalid event type' };
            }
            
            // 1. 길드 권한 확인
            const hasPermission = await this.checkEventPermission(guildId);
            if (!hasPermission) {
                return { success: false, error: 'Insufficient permissions' };
            }
            
            // 2. 이벤트 생성
            const guildEvent: GuildEvent = {
                id: this.generateEventId(),
                guildId: guildId,
                eventType: eventType,
                title: template.title,
                description: template.description,
                
                // 시간 설정
                startTime: Date.now(),
                endTime: Date.now() + template.duration,
                
                // 목표 설정
                objectives: template.objectives.map(obj => ({
                    ...obj,
                    progress: 0,
                    completed: false
                })),
                
                // 보상 설정
                rewards: template.rewards,
                milestoneRewards: template.milestoneRewards,
                
                // 참가자 정보
                participants: new Map(),
                
                // 상태
                status: EventStatus.ACTIVE,
                totalProgress: 0
            };
            
            // 3. 서버에 이벤트 시작 요청
            const result = await NetworkManager.getInstance().startGuildEvent(guildEvent);
            
            if (result.success) {
                this.activeEvents.set(guildEvent.id, guildEvent);
                
                EventBus.getInstance().emit('guild_event_started', {
                    event: guildEvent
                });
                
                // 길드원들에게 알림 전송
                await this.notifyGuildMembers(guildId, {
                    type: 'event_started',
                    eventId: guildEvent.id,
                    title: guildEvent.title
                });
                
                return { success: true, event: guildEvent };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async contributeToEvent(eventId: string, contribution: EventContribution): Promise<ContributionResult> {
        try {
            const event = this.activeEvents.get(eventId);
            if (!event) {
                return { success: false, error: 'Event not found' };
            }
            
            if (event.status !== EventStatus.ACTIVE) {
                return { success: false, error: 'Event is not active' };
            }
            
            if (Date.now() > event.endTime) {
                return { success: false, error: 'Event has ended' };
            }
            
            const playerId = PlayerManager.getInstance().getCurrentPlayerId();
            
            // 1. 기여도 검증
            const isValid = await this.validateContribution(contribution);
            if (!isValid) {
                return { success: false, error: 'Invalid contribution' };
            }
            
            // 2. 참가자 정보 업데이트
            let participant = event.participants.get(playerId);
            if (!participant) {
                participant = {
                    playerId: playerId,
                    joinTime: Date.now(),
                    totalContribution: 0,
                    contributions: []
                };
                event.participants.set(playerId, participant);
            }
            
            participant.contributions.push(contribution);
            participant.totalContribution += contribution.value;
            
            // 3. 이벤트 진행도 업데이트
            const objectiveIndex = contribution.objectiveId;
            if (objectiveIndex < event.objectives.length) {
                const objective = event.objectives[objectiveIndex];
                objective.progress += contribution.value;
                
                if (objective.progress >= objective.target && !objective.completed) {
                    objective.completed = true;
                    
                    EventBus.getInstance().emit('objective_completed', {
                        eventId: eventId,
                        objectiveId: objectiveIndex,
                        objective: objective
                    });
                }
            }
            
            // 4. 전체 진행도 계산
            event.totalProgress = event.objectives.reduce((sum, obj) => 
                sum + Math.min(obj.progress, obj.target), 0);
            
            // 5. 마일스톤 체크
            await this.checkMilestones(event);
            
            // 6. 서버 동기화
            await NetworkManager.getInstance().updateEventProgress(eventId, {
                participant: participant,
                objectives: event.objectives,
                totalProgress: event.totalProgress
            });
            
            EventBus.getInstance().emit('event_contribution_made', {
                eventId: eventId,
                contribution: contribution,
                participant: participant
            });
            
            return { success: true, newProgress: event.totalProgress };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    private async checkMilestones(event: GuildEvent): Promise<void> {
        const totalTarget = event.objectives.reduce((sum, obj) => sum + obj.target, 0);
        const progressPercentage = (event.totalProgress / totalTarget) * 100;
        
        for (const milestone of event.milestoneRewards) {
            if (progressPercentage >= milestone.threshold && !milestone.claimed) {
                milestone.claimed = true;
                
                // 길드원들에게 마일스톤 보상 지급
                await this.distributeMilestoneRewards(event.guildId, milestone.rewards);
                
                EventBus.getInstance().emit('milestone_reached', {
                    eventId: event.id,
                    milestone: milestone,
                    progressPercentage: progressPercentage
                });
            }
        }
    }
    
    private loadEventTemplates(): void {
        // 점수 수집 이벤트
        this.eventTemplates.set(GuildEventType.SCORE_COLLECTION, {
            title: '길드 점수 수집전',
            description: '모든 길드원이 힘을 합쳐 목표 점수를 달성하세요!',
            duration: 7 * 24 * 60 * 60 * 1000, // 7일
            objectives: [
                {
                    id: 0,
                    description: '총 점수 1,000,000점 획득',
                    target: 1000000,
                    type: ObjectiveType.SCORE_TOTAL
                }
            ],
            rewards: {
                coins: 50000,
                gems: 100,
                boosters: { hammer: 10, swap: 5 }
            },
            milestoneRewards: [
                {
                    threshold: 25,
                    rewards: { coins: 10000 },
                    claimed: false
                },
                {
                    threshold: 50,
                    rewards: { gems: 25 },
                    claimed: false
                },
                {
                    threshold: 75,
                    rewards: { boosters: { bomb: 3 } },
                    claimed: false
                },
                {
                    threshold: 100,
                    rewards: { gems: 50, specialBooster: 1 },
                    claimed: false
                }
            ]
        });
        
        // 레벨 클리어 이벤트
        this.eventTemplates.set(GuildEventType.LEVEL_CLEAR, {
            title: '길드 레벨 정복전',
            description: '새로운 레벨들을 클리어하여 길드의 영역을 확장하세요!',
            duration: 5 * 24 * 60 * 60 * 1000, // 5일
            objectives: [
                {
                    id: 0,
                    description: '새로운 레벨 500개 클리어',
                    target: 500,
                    type: ObjectiveType.LEVELS_CLEARED
                }
            ],
            rewards: {
                coins: 30000,
                gems: 75,
                hearts: 20
            },
            milestoneRewards: [
                {
                    threshold: 20,
                    rewards: { hearts: 5 },
                    claimed: false
                },
                {
                    threshold: 50,
                    rewards: { coins: 10000 },
                    claimed: false
                },
                {
                    threshold: 80,
                    rewards: { gems: 30 },
                    claimed: false
                }
            ]
        });
    }
}
```

---

## 3. 🏆 경쟁 시스템

### 리더보드 아키텍처

#### 다층 랭킹 시스템
```typescript
export class LeaderboardManager {
    private leaderboards: Map<LeaderboardType, Leaderboard> = new Map();
    private playerRankings: Map<string, PlayerRanking> = new Map();
    private rankingUpdateQueue: RankingUpdate[] = [];
    
    constructor() {
        this.initializeLeaderboards();
        this.startRankingUpdateWorker();
    }
    
    async updatePlayerScore(playerId: string, scoreType: ScoreType, newScore: number): Promise<RankingUpdateResult> {
        try {
            const currentRanking = this.playerRankings.get(playerId);
            const previousScore = currentRanking ? currentRanking.scores.get(scoreType) || 0 : 0;
            
            // 점수가 개선된 경우에만 업데이트
            if (newScore <= previousScore) {
                return { success: true, rankChanged: false };
            }
            
            // 랭킹 업데이트 큐에 추가
            const update: RankingUpdate = {
                playerId: playerId,
                scoreType: scoreType,
                oldScore: previousScore,
                newScore: newScore,
                timestamp: Date.now()
            };
            
            this.rankingUpdateQueue.push(update);
            
            // 로컬 랭킹 즉시 업데이트
            await this.updateLocalRanking(update);
            
            // 영향받는 리더보드들 확인
            const affectedLeaderboards = this.getAffectedLeaderboards(scoreType);
            let rankChanged = false;
            
            for (const leaderboardType of affectedLeaderboards) {
                const rankChange = await this.updateLeaderboard(leaderboardType, playerId, newScore);
                if (rankChange) {
                    rankChanged = true;
                }
            }
            
            if (rankChanged) {
                EventBus.getInstance().emit('ranking_changed', {
                    playerId: playerId,
                    scoreType: scoreType,
                    newScore: newScore,
                    affectedLeaderboards: affectedLeaderboards
                });
            }
            
            return { success: true, rankChanged: rankChanged };
        } catch (error) {
            console.error('Failed to update player score:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getLeaderboard(type: LeaderboardType, timeFrame: TimeFrame, limit: number = 100): Promise<LeaderboardEntry[]> {
        const leaderboard = this.leaderboards.get(type);
        if (!leaderboard) {
            return [];
        }
        
        const entries = leaderboard.getEntries(timeFrame, limit);
        
        // 플레이어 정보 풍부화
        const enrichedEntries = await Promise.all(
            entries.map(async entry => ({
                ...entry,
                playerData: await this.getPlayerDisplayData(entry.playerId)
            }))
        );
        
        return enrichedEntries;
    }
    
    async getPlayerRank(playerId: string, leaderboardType: LeaderboardType, timeFrame: TimeFrame): Promise<PlayerRankInfo> {
        const leaderboard = this.leaderboards.get(leaderboardType);
        if (!leaderboard) {
            return { rank: -1, percentile: 0, score: 0 };
        }
        
        const rank = await leaderboard.getPlayerRank(playerId, timeFrame);
        const totalPlayers = await leaderboard.getTotalPlayers(timeFrame);
        const percentile = totalPlayers > 0 ? ((totalPlayers - rank + 1) / totalPlayers) * 100 : 0;
        const score = await leaderboard.getPlayerScore(playerId, timeFrame);
        
        return {
            rank: rank,
            percentile: percentile,
            score: score,
            totalPlayers: totalPlayers
        };
    }
    
    private async updateLeaderboard(type: LeaderboardType, playerId: string, newScore: number): Promise<boolean> {
        const leaderboard = this.leaderboards.get(type);
        if (!leaderboard) {
            return false;
        }
        
        const oldRank = await leaderboard.getPlayerRank(playerId, TimeFrame.ALL_TIME);
        await leaderboard.updateScore(playerId, newScore);
        const newRank = await leaderboard.getPlayerRank(playerId, TimeFrame.ALL_TIME);
        
        // 순위 변경 시 알림
        if (oldRank !== newRank) {
            await this.sendRankingNotification(playerId, type, oldRank, newRank);
            return true;
        }
        
        return false;
    }
    
    private initializeLeaderboards(): void {
        // 글로벌 점수 리더보드
        this.leaderboards.set(LeaderboardType.GLOBAL_SCORE, new Leaderboard({
            type: LeaderboardType.GLOBAL_SCORE,
            name: '글로벌 최고 점수',
            scoreType: ScoreType.HIGHEST_SCORE,
            updateFrequency: 5 * 60 * 1000, // 5분마다 업데이트
            maxEntries: 10000
        }));
        
        // 주간 점수 리더보드
        this.leaderboards.set(LeaderboardType.WEEKLY_SCORE, new Leaderboard({
            type: LeaderboardType.WEEKLY_SCORE,
            name: '주간 점수 랭킹',
            scoreType: ScoreType.WEEKLY_TOTAL,
            updateFrequency: 60 * 60 * 1000, // 1시간마다 업데이트
            resetFrequency: 7 * 24 * 60 * 60 * 1000, // 주간 리셋
            maxEntries: 1000
        }));
        
        // 레벨 진행도 리더보드
        this.leaderboards.set(LeaderboardType.LEVEL_PROGRESS, new Leaderboard({
            type: LeaderboardType.LEVEL_PROGRESS,
            name: '레벨 진행도',
            scoreType: ScoreType.LEVELS_COMPLETED,
            updateFrequency: 10 * 60 * 1000, // 10분마다 업데이트
            maxEntries: 5000
        }));
        
        // 친구 리더보드
        this.leaderboards.set(LeaderboardType.FRIENDS, new Leaderboard({
            type: LeaderboardType.FRIENDS,
            name: '친구 순위',
            scoreType: ScoreType.HIGHEST_SCORE,
            updateFrequency: 5 * 60 * 1000, // 5분마다 업데이트
            maxEntries: 100,
            filterType: FilterType.FRIENDS_ONLY
        }));
    }
}
```

### 토너먼트 시스템

#### 시즌 토너먼트 관리
```typescript
export class TournamentManager {
    private activeTournaments: Map<string, Tournament> = new Map();
    private playerTournamentData: Map<string, PlayerTournamentData> = new Map();
    private tournamentScheduler: TournamentScheduler;
    
    constructor() {
        this.tournamentScheduler = new TournamentScheduler();
        this.loadActiveTournaments();
    }
    
    async joinTournament(tournamentId: string): Promise<JoinTournamentResult> {
        try {
            const tournament = this.activeTournaments.get(tournamentId);
            if (!tournament) {
                return { success: false, error: 'Tournament not found' };
            }
            
            const playerId = PlayerManager.getInstance().getCurrentPlayerId();
            
            // 1. 참가 조건 확인
            const eligibilityResult = await this.checkTournamentEligibility(tournament, playerId);
            if (!eligibilityResult.eligible) {
                return { success: false, error: eligibilityResult.reason };
            }
            
            // 2. 참가비 확인
            if (tournament.entryFee && tournament.entryFee.amount > 0) {
                const canAfford = await PlayerManager.getInstance().checkCurrency({
                    type: tournament.entryFee.currency,
                    amount: tournament.entryFee.amount
                });
                
                if (!canAfford) {
                    return { success: false, error: 'Insufficient currency for entry fee' };
                }
            }
            
            // 3. 토너먼트 정원 확인
            if (tournament.participants.size >= tournament.maxParticipants) {
                return { success: false, error: 'Tournament is full' };
            }
            
            // 4. 참가자 데이터 생성
            const participantData: TournamentParticipant = {
                playerId: playerId,
                playerData: await PlayerManager.getInstance().getPlayerData(),
                joinTime: Date.now(),
                currentScore: 0,
                currentRank: tournament.participants.size + 1,
                matchesPlayed: 0,
                matchesWon: 0,
                status: ParticipantStatus.ACTIVE
            };
            
            // 5. 서버에 참가 요청
            const result = await NetworkManager.getInstance().joinTournament(tournamentId, participantData);
            
            if (result.success) {
                // 참가비 차감
                if (tournament.entryFee && tournament.entryFee.amount > 0) {
                    await PlayerManager.getInstance().deductCurrency(tournament.entryFee);
                }
                
                // 로컬 상태 업데이트
                tournament.participants.set(playerId, participantData);
                this.playerTournamentData.set(playerId, {
                    currentTournaments: [tournamentId],
                    tournamentHistory: [],
                    totalWins: 0,
                    totalParticipations: 0
                });
                
                EventBus.getInstance().emit('tournament_joined', {
                    tournament: tournament,
                    participant: participantData
                });
                
                return { success: true, tournament: tournament };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async submitTournamentScore(tournamentId: string, score: number, levelData: LevelCompletionData): Promise<SubmitScoreResult> {
        try {
            const tournament = this.activeTournaments.get(tournamentId);
            if (!tournament) {
                return { success: false, error: 'Tournament not found' };
            }
            
            const playerId = PlayerManager.getInstance().getCurrentPlayerId();
            const participant = tournament.participants.get(playerId);
            
            if (!participant) {
                return { success: false, error: 'Not participating in this tournament' };
            }
            
            if (tournament.status !== TournamentStatus.ACTIVE) {
                return { success: false, error: 'Tournament is not active' };
            }
            
            // 1. 점수 검증
            const validation = await this.validateTournamentScore(score, levelData, tournament.rules);
            if (!validation.isValid) {
                return { success: false, error: validation.reason };
            }
            
            // 2. 점수 제출 규칙 확인
            const canSubmit = this.checkScoreSubmissionRules(participant, score, tournament.rules);
            if (!canSubmit.allowed) {
                return { success: false, error: canSubmit.reason };
            }
            
            // 3. 점수 업데이트
            const scoreImproved = score > participant.currentScore;
            if (scoreImproved || tournament.rules.allowMultipleSubmissions) {
                participant.currentScore = Math.max(participant.currentScore, score);
                participant.matchesPlayed++;
                
                if (scoreImproved) {
                    participant.matchesWon++;
                }
            }
            
            // 4. 순위 재계산
            await this.recalculateTournamentRankings(tournament);
            
            // 5. 서버 동기화
            const result = await NetworkManager.getInstance().submitTournamentScore(
                tournamentId, 
                playerId, 
                score, 
                levelData
            );
            
            if (result.success) {
                EventBus.getInstance().emit('tournament_score_submitted', {
                    tournamentId: tournamentId,
                    playerId: playerId,
                    score: score,
                    newRank: participant.currentRank,
                    scoreImproved: scoreImproved
                });
                
                // 순위 개선 시 특별 알림
                if (scoreImproved && participant.currentRank <= 10) {
                    EventBus.getInstance().emit('tournament_rank_improved', {
                        tournamentId: tournamentId,
                        playerId: playerId,
                        newRank: participant.currentRank
                    });
                }
                
                return { 
                    success: true, 
                    newScore: participant.currentScore,
                    newRank: participant.currentRank,
                    scoreImproved: scoreImproved
                };
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    private async recalculateTournamentRankings(tournament: Tournament): Promise<void> {
        const participants = Array.from(tournament.participants.values());
        
        // 점수순으로 정렬 (동점 시 플레이 시간 고려)
        participants.sort((a, b) => {
            if (a.currentScore !== b.currentScore) {
                return b.currentScore - a.currentScore;
            }
            
            // 동점인 경우 더 적은 매치로 달성한 플레이어 우선
            return a.matchesPlayed - b.matchesPlayed;
        });
        
        // 순위 업데이트
        participants.forEach((participant, index) => {
            const newRank = index + 1;
            const oldRank = participant.currentRank;
            participant.currentRank = newRank;
            
            // 순위 변화 시 알림
            if (oldRank !== newRank) {
                EventBus.getInstance().emit('tournament_rank_changed', {
                    tournamentId: tournament.id,
                    playerId: participant.playerId,
                    oldRank: oldRank,
                    newRank: newRank
                });
            }
        });
    }
    
    async endTournament(tournamentId: string): Promise<void> {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) {
            return;
        }
        
        tournament.status = TournamentStatus.ENDED;
        tournament.endTime = Date.now();
        
        // 최종 순위 확정
        await this.recalculateTournamentRankings(tournament);
        
        // 보상 분배
        await this.distributeTournamentRewards(tournament);
        
        // 토너먼트 기록 저장
        await this.saveTournamentResults(tournament);
        
        EventBus.getInstance().emit('tournament_ended', {
            tournament: tournament,
            winners: this.getTournamentWinners(tournament)
        });
    }
    
    private async distributeTournamentRewards(tournament: Tournament): Promise<void> {
        const participants = Array.from(tournament.participants.values())
            .sort((a, b) => a.currentRank - b.currentRank);
        
        for (const participant of participants) {
            const rewards = this.calculateTournamentRewards(tournament, participant.currentRank);
            
            if (rewards && Object.keys(rewards).length > 0) {
                await RewardManager.getInstance().giveRewards(rewards, participant.playerId);
                
                EventBus.getInstance().emit('tournament_rewards_received', {
                    tournamentId: tournament.id,
                    playerId: participant.playerId,
                    rank: participant.currentRank,
                    rewards: rewards
                });
            }
        }
    }
}
```

Sweet Puzzle의 소셜 시스템은 플레이어 간의 자연스러운 상호작용을 통해 게임의 재미와 지속성을 크게 향상시킵니다. 친구와의 경쟁, 길드에서의 협력, 토너먼트에서의 도전을 통해 단순한 퍼즐 게임을 넘어선 풍부한 소셜 경험을 제공합니다.