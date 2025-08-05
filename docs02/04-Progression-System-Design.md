# 진행 시스템 설계

## 개요

Sweet Puzzle 게임의 플레이어 진행과 동기부여를 담당하는 시스템 설계서입니다. 월드맵 구조, 레벨 진행, 보상 시스템, 화폐 경제, 이벤트 시스템을 통해 장기간 플레이할 수 있는 매력적인 진행 경험을 제공합니다.

---

## 1. 🗺️ 월드맵 및 레벨 진행

### 월드 구조 설계

#### 월드맵 아키텍처
```typescript
// 월드 정보 인터페이스
export interface WorldInfo {
    id: string;
    name: string;
    theme: WorldTheme;
    description: string;
    
    // 진행 정보
    totalLevels: number;
    unlockedLevels: number;
    completedLevels: number;
    starsCollected: number;
    totalStars: number;
    
    // 잠금 조건
    unlockRequirements: UnlockRequirement[];
    
    // 시각적 요소
    backgroundImage: string;
    musicTrack: string;
    colorPalette: string[];
    
    // 특별 기능
    specialFeatures: WorldFeature[];
    bossLevel?: number; // 보스 레벨 번호 (있는 경우)
}

export enum WorldTheme {
    CANDY_LAND = 'candy_land',
    FRUIT_GARDEN = 'fruit_garden',
    CHOCOLATE_FACTORY = 'chocolate_factory',
    ICE_CREAM_PARLOR = 'ice_cream_parlor',
    BAKERY_TOWN = 'bakery_town',
    MAGICAL_FOREST = 'magical_forest',
    UNDERWATER_SWEETS = 'underwater_sweets',
    SPACE_CANDY = 'space_candy'
}

// 월드 관리자
export class WorldManager {
    private worlds: Map<string, WorldInfo> = new Map();
    private currentWorld: string = 'world_1';
    private playerProgress: ProgressData;
    
    constructor(playerProgress: ProgressData) {
        this.playerProgress = playerProgress;
        this.initializeWorlds();
    }
    
    // 월드 정보 초기화
    private initializeWorlds(): void {
        // 월드 1: 캔디 랜드 (튜토리얼 월드)
        this.worlds.set('world_1', {
            id: 'world_1',
            name: '달콤한 캔디 랜드',
            theme: WorldTheme.CANDY_LAND,
            description: '모험이 시작되는 달콤한 캔디의 세계',
            totalLevels: 20,
            unlockRequirements: [], // 기본 잠금 해제
            backgroundImage: 'world1_bg.jpg',
            musicTrack: 'candy_land_theme.mp3',
            colorPalette: ['#FF69B4', '#FFB6C1', '#FFC0CB'],
            specialFeatures: [WorldFeature.TUTORIAL_HINTS, WorldFeature.BEGINNER_FRIENDLY]
        });
        
        // 월드 2: 과일 정원
        this.worlds.set('world_2', {
            id: 'world_2',
            name: '상큼한 과일 정원',
            theme: WorldTheme.FRUIT_GARDEN,
            description: '신선한 과일들이 가득한 정원',
            totalLevels: 25,
            unlockRequirements: [
                { type: RequirementType.STARS, value: 30 },
                { type: RequirementType.LEVEL_COMPLETION, value: 15 }
            ],
            backgroundImage: 'world2_bg.jpg',
            musicTrack: 'fruit_garden_theme.mp3',
            colorPalette: ['#32CD32', '#90EE90', '#ADFF2F'],
            specialFeatures: [WorldFeature.FRUIT_POWER_UPS, WorldFeature.GARDEN_OBSTACLES]
        });
        
        // 추가 월드들...
        this.loadAdditionalWorlds();
    }
    
    // 월드 잠금 해제 확인
    isWorldUnlocked(worldId: string): boolean {
        const world = this.worlds.get(worldId);
        if (!world) return false;
        
        return world.unlockRequirements.every(req => 
            this.checkRequirement(req)
        );
    }
    
    // 요구사항 확인
    private checkRequirement(requirement: UnlockRequirement): boolean {
        switch (requirement.type) {
            case RequirementType.STARS:
                return this.playerProgress.totalStars >= requirement.value;
                
            case RequirementType.LEVEL_COMPLETION:
                return this.playerProgress.totalLevelsCompleted >= requirement.value;
                
            case RequirementType.WORLD_COMPLETION:
                const worldId = requirement.targetWorldId!;
                return this.isWorldCompleted(worldId);
                
            case RequirementType.SPECIAL_ACHIEVEMENT:
                return this.playerProgress.achievements.has(requirement.achievementId!);
                
            default:
                return false;
        }
    }
}
```

### 레벨 잠금/해제 시스템

#### 동적 레벨 잠금 해제
```typescript
export class LevelProgressionSystem {
    private levelStates: Map<string, LevelState> = new Map();
    
    // 레벨 상태 업데이트
    updateLevelCompletion(levelId: string, result: LevelResult): void {
        const currentState = this.levelStates.get(levelId) || new LevelState(levelId);
        
        // 최고 기록 업데이트
        if (result.stars > currentState.bestStars) {
            currentState.bestStars = result.stars;
            currentState.bestScore = result.score;
            currentState.bestMoves = result.movesUsed;
        }
        
        currentState.attemptCount++;
        currentState.isCompleted = result.stars > 0;
        currentState.lastPlayedAt = Date.now();
        
        this.levelStates.set(levelId, currentState);
        
        // 다음 레벨들 잠금 해제 확인
        this.checkAndUnlockNextLevels(levelId, result);
        
        // 월드 완료 확인
        this.checkWorldCompletion(this.getWorldIdFromLevel(levelId));
    }
    
    // 다음 레벨 잠금 해제 로직
    private checkAndUnlockNextLevels(completedLevelId: string, result: LevelResult): void {
        const levelNumber = this.extractLevelNumber(completedLevelId);
        const worldId = this.getWorldIdFromLevel(completedLevelId);
        
        // 기본 규칙: 1성 이상으로 클리어하면 다음 레벨 해제
        if (result.stars >= 1) {
            const nextLevelId = `${worldId}_level_${levelNumber + 1}`;
            this.unlockLevel(nextLevelId);
        }
        
        // 특별 규칙: 3성 클리어 시 보너스 레벨 해제
        if (result.stars === 3) {
            this.checkBonusLevelUnlock(worldId, levelNumber);
        }
        
        // 보스 레벨 잠금 해제 확인
        this.checkBossLevelUnlock(worldId);
    }
    
    // 보너스 레벨 잠금 해제
    private checkBonusLevelUnlock(worldId: string, levelNumber: number): void {
        // 5의 배수 레벨을 3성으로 클리어하면 보너스 레벨 해제
        if (levelNumber % 5 === 0) {
            const bonusLevelId = `${worldId}_bonus_${levelNumber / 5}`;
            this.unlockLevel(bonusLevelId);
        }
    }
    
    // 보스 레벨 잠금 해제
    private checkBossLevelUnlock(worldId: string): void {
        const worldInfo = WorldManager.getInstance().getWorld(worldId);
        if (!worldInfo?.bossLevel) return;
        
        const requiredLevel = worldInfo.bossLevel - 1;
        const previousLevelId = `${worldId}_level_${requiredLevel}`;
        const previousState = this.levelStates.get(previousLevelId);
        
        if (previousState?.isCompleted) {
            const bossLevelId = `${worldId}_boss`;
            this.unlockLevel(bossLevelId);
        }
    }
}
```

### 별점 및 평가 시스템

#### 동적 별점 계산
```typescript
export class StarRatingCalculator {
    // 레벨 결과에 따른 별점 계산
    calculateStars(levelResult: LevelResult, levelConfig: LevelConfig): number {
        const metrics = {
            scoreRatio: levelResult.score / levelConfig.starThresholds.threeStar,
            efficiencyRatio: this.calculateEfficiency(levelResult, levelConfig),
            objectiveCompletion: this.calculateObjectiveCompletion(levelResult, levelConfig),
            timeBonus: this.calculateTimeBonus(levelResult, levelConfig)
        };
        
        let totalScore = 0;
        
        // 점수 기준 (40%)
        totalScore += Math.min(metrics.scoreRatio, 1.0) * 0.4;
        
        // 효율성 기준 (30%) - 적은 이동수로 클리어
        totalScore += metrics.efficiencyRatio * 0.3;
        
        // 목표 달성도 (20%)
        totalScore += metrics.objectiveCompletion * 0.2;
        
        // 시간 보너스 (10%)
        totalScore += metrics.timeBonus * 0.1;
        
        // 별점 변환
        if (totalScore >= 0.9) return 3;
        if (totalScore >= 0.7) return 2;
        if (totalScore >= 0.5) return 1;
        return 0;
    }
    
    private calculateEfficiency(result: LevelResult, config: LevelConfig): number {
        if (!config.maxMoves) return 1.0;
        
        const efficiency = (config.maxMoves - result.movesUsed) / config.maxMoves;
        return Math.max(0, Math.min(1, efficiency));
    }
    
    private calculateObjectiveCompletion(result: LevelResult, config: LevelConfig): number {
        let completionRate = 0;
        
        for (const objective of config.objectives) {
            const achieved = result.objectiveProgress.get(objective.type) || 0;
            const required = objective.quantity;
            
            completionRate += Math.min(achieved / required, 1.0);
        }
        
        return completionRate / config.objectives.length;
    }
}
```

---

## 2. 🏆 성취 및 보상 시스템

### 일일 미션 시스템

#### 동적 미션 생성
```typescript
export class DailyMissionSystem {
    private missionTemplates: MissionTemplate[] = [];
    private activeMissions: Map<string, DailyMission> = new Map();
    private playerProfile: PlayerProfile;
    
    constructor(playerProfile: PlayerProfile) {
        this.playerProfile = playerProfile;
        this.initializeMissionTemplates();
    }
    
    // 오늘의 미션 생성
    generateDailyMissions(): DailyMission[] {
        const missions: DailyMission[] = [];
        const today = new Date().toDateString();
        
        // 기존 미션이 있으면 반환
        if (this.hasValidMissionsForDate(today)) {
            return Array.from(this.activeMissions.values());
        }
        
        // 새로운 미션 생성
        const selectedTemplates = this.selectMissionTemplates();
        
        for (const template of selectedTemplates) {
            const mission = this.createMissionFromTemplate(template, today);
            missions.push(mission);
            this.activeMissions.set(mission.id, mission);
        }
        
        return missions;
    }
    
    private selectMissionTemplates(): MissionTemplate[] {
        const availableTemplates = this.missionTemplates.filter(template =>
            this.isMissionSuitableForPlayer(template)
        );
        
        // 난이도별로 분류
        const easyMissions = availableTemplates.filter(t => t.difficulty === Difficulty.EASY);
        const mediumMissions = availableTemplates.filter(t => t.difficulty === Difficulty.MEDIUM);
        const hardMissions = availableTemplates.filter(t => t.difficulty === Difficulty.HARD);
        
        const selected: MissionTemplate[] = [];
        
        // 쉬운 미션 2개
        selected.push(...this.randomSelect(easyMissions, 2));
        
        // 중간 미션 1개
        selected.push(...this.randomSelect(mediumMissions, 1));
        
        // 어려운 미션 1개 (플레이어 레벨이 충분한 경우)
        if (this.playerProfile.level >= 10) {
            selected.push(...this.randomSelect(hardMissions, 1));
        }
        
        return selected;
    }
    
    private createMissionFromTemplate(template: MissionTemplate, date: string): DailyMission {
        const scaledTarget = this.scaleTargetToPlayer(template.baseTarget, template.difficulty);
        
        return new DailyMission(
            `mission_${date}_${template.id}`,
            template.name,
            template.description.replace('{target}', scaledTarget.toString()),
            template.type,
            scaledTarget,
            0, // 현재 진행률
            template.rewards,
            date,
            false // 완료 여부
        );
    }
    
    // 플레이어 레벨에 맞춘 목표 조정
    private scaleTargetToPlayer(baseTarget: number, difficulty: Difficulty): number {
        const playerLevel = this.playerProfile.level;
        const skillMultiplier = this.playerProfile.averageStarsPerLevel;
        
        let scalingFactor = 1.0;
        
        switch (difficulty) {
            case Difficulty.EASY:
                scalingFactor = 0.8 + (playerLevel * 0.02);
                break;
            case Difficulty.MEDIUM:
                scalingFactor = 1.0 + (playerLevel * 0.03);
                break;
            case Difficulty.HARD:
                scalingFactor = 1.2 + (playerLevel * 0.05);
                break;
        }
        
        return Math.floor(baseTarget * scalingFactor * skillMultiplier);
    }
}
```

### 주간 챌린지

#### 시즌별 챌린지 시스템
```typescript
export class WeeklyChallengeSystem {
    private currentSeason: SeasonInfo;
    private challengeProgress: Map<string, ChallengeProgress> = new Map();
    
    // 주간 챌린지 초기화
    initializeWeeklyChallenge(): WeeklyChallenge {
        const weekNumber = this.getCurrentWeekNumber();
        const seasonTheme = this.currentSeason.theme;
        
        return new WeeklyChallenge(
            `week_${weekNumber}_${seasonTheme}`,
            this.generateChallengeTitle(seasonTheme, weekNumber),
            this.createChallengeStages(seasonTheme),
            this.calculateSeasonRewards(weekNumber),
            this.getWeekStartDate(),
            this.getWeekEndDate()
        );
    }
    
    private createChallengeStages(theme: SeasonTheme): ChallengeStage[] {
        const stages: ChallengeStage[] = [];
        
        switch (theme) {
            case SeasonTheme.SPRING_FESTIVAL:
                stages.push(
                    new ChallengeStage('봄꽃 수집', '핑크색 블록 100개 매치', 100, RewardType.BOOSTERS),
                    new ChallengeStage('벚꽃 폭발', '폭탄 블록 20개 생성', 20, RewardType.COINS),
                    new ChallengeStage('봄의 정원사', '연속 10레벨 3성 클리어', 10, RewardType.GEMS)
                );
                break;
                
            case SeasonTheme.SUMMER_VACATION:
                stages.push(
                    new ChallengeStage('여름 바캉스', '시간 제한 레벨 15개 클리어', 15, RewardType.BOOSTERS),
                    new ChallengeStage('아이스크림 파티', '파란색 블록 200개 매치', 200, RewardType.COINS),
                    new ChallengeStage('여름 축제', '특수 블록 조합 30회', 30, RewardType.SPECIAL_ITEM)
                );
                break;
                
            // 다른 시즌들...
        }
        
        return stages;
    }
    
    // 챌린지 진행 상황 업데이트
    updateChallengeProgress(action: GameAction): void {
        const activeChallenge = this.getCurrentWeeklyChallenge();
        if (!activeChallenge || this.isChallengeExpired(activeChallenge)) return;
        
        for (const stage of activeChallenge.stages) {
            if (stage.isCompleted) continue;
            
            const progress = this.challengeProgress.get(stage.id) || new ChallengeProgress(stage.id);
            
            if (this.doesActionContributeToStage(action, stage)) {
                const contribution = this.calculateContribution(action, stage);
                progress.currentValue += contribution;
                
                // 스테이지 완료 확인
                if (progress.currentValue >= stage.targetValue) {
                    stage.isCompleted = true;
                    this.awardStageReward(stage);
                    
                    // 전체 챌린지 완료 확인
                    if (this.isChallengCompleted(activeChallenge)) {
                        this.awardChallengeCompletionBonus(activeChallenge);
                    }
                }
                
                this.challengeProgress.set(stage.id, progress);
            }
        }
    }
}
```

### 성취 시스템

#### 계층적 성취 시스템
```typescript
export class AchievementSystem {
    private achievements: Map<string, Achievement> = new Map();
    private playerAchievements: Set<string> = new Set();
    
    constructor() {
        this.initializeAchievements();
    }
    
    private initializeAchievements(): void {
        // 진행 기반 성취
        this.registerProgressAchievements();
        
        // 스킬 기반 성취
        this.registerSkillAchievements();
        
        // 소셜 기반 성취
        this.registerSocialAchievements();
        
        // 시간 기반 성취
        this.registerTimeBasedAchievements();
        
        // 숨겨진 성취
        this.registerSecretAchievements();
    }
    
    private registerProgressAchievements(): void {
        // 레벨 완료 성취
        const levelMilestones = [10, 25, 50, 100, 250, 500, 1000];
        levelMilestones.forEach(milestone => {
            this.achievements.set(`levels_completed_${milestone}`, new Achievement(
                `levels_completed_${milestone}`,
                `레벨 마스터 ${milestone}`,
                `${milestone}개의 레벨을 완료하세요`,
                AchievementCategory.PROGRESS,
                {
                    type: TriggerType.LEVELS_COMPLETED,
                    threshold: milestone
                },
                this.calculateProgressReward(milestone)
            ));
        });
        
        // 별 수집 성취
        const starMilestones = [50, 150, 300, 600, 1200, 2500];
        starMilestones.forEach(milestone => {
            this.achievements.set(`stars_collected_${milestone}`, new Achievement(
                `stars_collected_${milestone}`,
                `별 수집가 ${milestone}`,
                `${milestone}개의 별을 수집하세요`,
                AchievementCategory.PROGRESS,
                {
                    type: TriggerType.STARS_COLLECTED,
                    threshold: milestone
                },
                this.calculateProgressReward(milestone)
            ));
        });
    }
    
    private registerSkillAchievements(): void {
        // 연속 3성 클리어
        this.achievements.set('perfect_streak_10', new Achievement(
            'perfect_streak_10',
            '완벽주의자',
            '연속 10레벨을 3성으로 클리어하세요',
            AchievementCategory.SKILL,
            { type: TriggerType.CONSECUTIVE_THREE_STARS, threshold: 10 },
            new Reward(RewardType.SPECIAL_TITLE, 'perfect_streak_10', 1)
        ));
        
        // 최소 이동수 클리어
        this.achievements.set('efficiency_master', new Achievement(
            'efficiency_master',
            '효율성 마스터',
            '한 레벨을 최소 이동수로 클리어하세요',
            AchievementCategory.SKILL,
            { type: TriggerType.MINIMUM_MOVES_CLEAR, threshold: 1 },
            new Reward(RewardType.BOOSTER, 'efficiency_booster', 5)
        ));
        
        // 큰 콤보 달성
        this.achievements.set('combo_master_15', new Achievement(
            'combo_master_15',
            '콤보 마스터',
            '15콤보를 달성하세요',
            AchievementCategory.SKILL,
            { type: TriggerType.COMBO_ACHIEVED, threshold: 15 },
            new Reward(RewardType.GEMS, 'combo_bonus', 50)
        ));
    }
    
    // 성취 달성 확인
    checkAchievements(gameEvent: GameEvent): UnlockedAchievement[] {
        const unlockedAchievements: UnlockedAchievement[] = [];
        
        for (const [id, achievement] of this.achievements) {
            if (this.playerAchievements.has(id)) continue; // 이미 달성함
            
            if (this.isAchievementTriggered(achievement, gameEvent)) {
                this.playerAchievements.add(id);
                unlockedAchievements.push(new UnlockedAchievement(
                    achievement,
                    Date.now(),
                    this.calculateAchievementRarity(achievement)
                ));
                
                // 보상 지급
                this.awardAchievementReward(achievement.reward);
            }
        }
        
        return unlockedAchievements;
    }
    
    private isAchievementTriggered(achievement: Achievement, event: GameEvent): boolean {
        const trigger = achievement.trigger;
        
        switch (trigger.type) {
            case TriggerType.LEVELS_COMPLETED:
                return event.playerStats.totalLevelsCompleted >= trigger.threshold;
                
            case TriggerType.STARS_COLLECTED:
                return event.playerStats.totalStars >= trigger.threshold;
                
            case TriggerType.CONSECUTIVE_THREE_STARS:
                return event.playerStats.currentStreak >= trigger.threshold;
                
            case TriggerType.COMBO_ACHIEVED:
                return event.levelResult?.maxCombo >= trigger.threshold;
                
            default:
                return false;
        }
    }
}
```

---

## 3. 💎 인게임 화폐 시스템

### 화폐 타입 및 용도

#### 다중 화폐 시스템
```typescript
export enum CurrencyType {
    COINS = 'coins',        // 기본 화폐
    GEMS = 'gems',          // 프리미엄 화폐
    HEARTS = 'hearts',      // 생명 시스템
    ENERGY = 'energy',      // 특별 이벤트용
    TOKENS = 'tokens'       // 시즌 화폐
}

export class CurrencyManager {
    private balances: Map<CurrencyType, number> = new Map();
    private earnRates: Map<CurrencyType, EarnRate> = new Map();
    private spendingLimits: Map<CurrencyType, SpendingLimit> = new Map();
    
    constructor() {
        this.initializeCurrencies();
        this.setupEarnRates();
        this.setupSpendingLimits();
    }
    
    private initializeCurrencies(): void {
        // 초기 화폐 지급
        this.balances.set(CurrencyType.COINS, 1000);
        this.balances.set(CurrencyType.GEMS, 50);
        this.balances.set(CurrencyType.HEARTS, 5);
        this.balances.set(CurrencyType.ENERGY, 0);
        this.balances.set(CurrencyType.TOKENS, 0);
    }
    
    // 화폐 지급
    awardCurrency(type: CurrencyType, amount: number, source: EarnSource): boolean {
        const currentBalance = this.balances.get(type) || 0;
        const earnRate = this.earnRates.get(type);
        
        // 획득 제한 확인
        if (earnRate && !earnRate.canEarn(amount, source)) {
            return false;
        }
        
        // 최대 보유량 확인
        const maxCapacity = this.getMaxCapacity(type);
        const finalAmount = Math.min(currentBalance + amount, maxCapacity);
        
        this.balances.set(type, finalAmount);
        
        // 획득 기록
        this.recordEarning(type, amount, source);
        
        // 이벤트 발생
        EventBus.getInstance().emit('currency_earned', {
            type: type,
            amount: amount,
            source: source,
            newBalance: finalAmount
        });
        
        return true;
    }
    
    // 화폐 소모
    spendCurrency(type: CurrencyType, amount: number, purpose: SpendPurpose): boolean {
        const currentBalance = this.balances.get(type) || 0;
        
        if (currentBalance < amount) {
            return false; // 잔액 부족
        }
        
        const spendingLimit = this.spendingLimits.get(type);
        if (spendingLimit && !spendingLimit.canSpend(amount, purpose)) {
            return false; // 지출 제한
        }
        
        this.balances.set(type, currentBalance - amount);
        
        // 지출 기록
        this.recordSpending(type, amount, purpose);
        
        // 이벤트 발생
        EventBus.getInstance().emit('currency_spent', {
            type: type,
            amount: amount,
            purpose: purpose,
            newBalance: currentBalance - amount
        });
        
        return true;
    }
    
    private getMaxCapacity(type: CurrencyType): number {
        switch (type) {
            case CurrencyType.COINS:
                return 999999; // 99만 9999
            case CurrencyType.GEMS:
                return 99999;  // 9만 9999
            case CurrencyType.HEARTS:
                return 5;      // 최대 5개
            case CurrencyType.ENERGY:
                return 100;    // 최대 100
            case CurrencyType.TOKENS:
                return 9999;   // 최대 9999
            default:
                return Number.MAX_SAFE_INTEGER;
        }
    }
}
```

### 하트 시스템 (생명)

#### 시간 기반 회복 시스템
```typescript
export class HeartSystem {
    private maxHearts: number = 5;
    private currentHearts: number = 5;
    private recoveryTimeMs: number = 30 * 60 * 1000; // 30분
    private lastRecoveryTime: number = Date.now();
    private recoveryTimer: NodeJS.Timeout | null = null;
    
    constructor() {
        this.loadHeartState();
        this.startRecoveryTimer();
    }
    
    // 하트 소모 (레벨 시작 시)
    consumeHeart(): boolean {
        if (this.currentHearts <= 0) {
            return false;
        }
        
        this.currentHearts--;
        this.saveHeartState();
        
        // 하트가 최대치 미만이면 회복 타이머 시작
        if (this.currentHearts < this.maxHearts && !this.recoveryTimer) {
            this.startRecoveryTimer();
        }
        
        EventBus.getInstance().emit('heart_consumed', {
            remaining: this.currentHearts,
            maxHearts: this.maxHearts
        });
        
        return true;
    }
    
    // 하트 회복
    recoverHeart(): boolean {
        if (this.currentHearts >= this.maxHearts) {
            return false;
        }
        
        this.currentHearts++;
        this.lastRecoveryTime = Date.now();
        this.saveHeartState();
        
        EventBus.getInstance().emit('heart_recovered', {
            current: this.currentHearts,
            maxHearts: this.maxHearts
        });
        
        // 최대치에 도달하면 타이머 중지
        if (this.currentHearts >= this.maxHearts) {
            this.stopRecoveryTimer();
        }
        
        return true;
    }
    
    // 하트 즉시 충전 (광고 시청, 구매 등)
    refillHearts(method: RefillMethod): boolean {
        const cost = this.getRefillCost(method);
        
        if (method === RefillMethod.PURCHASE && !this.canAffordRefill(cost)) {
            return false;
        }
        
        if (method === RefillMethod.AD_WATCH && !this.canWatchAd()) {
            return false;
        }
        
        // 하트 완전 충전
        this.currentHearts = this.maxHearts;
        this.lastRecoveryTime = Date.now();
        this.saveHeartState();
        this.stopRecoveryTimer();
        
        // 비용 지불
        if (method === RefillMethod.PURCHASE) {
            CurrencyManager.getInstance().spendCurrency(
                CurrencyType.GEMS, 
                cost.amount, 
                SpendPurpose.HEART_REFILL
            );
        }
        
        EventBus.getInstance().emit('hearts_refilled', {
            method: method,
            cost: cost
        });
        
        return true;
    }
    
    // 다음 하트 회복까지 남은 시간
    getTimeToNextHeart(): number {
        if (this.currentHearts >= this.maxHearts) {
            return 0;
        }
        
        const timeSinceLastRecovery = Date.now() - this.lastRecoveryTime;
        const timeToNext = this.recoveryTimeMs - timeSinceLastRecovery;
        
        return Math.max(0, timeToNext);
    }
    
    private startRecoveryTimer(): void {
        if (this.recoveryTimer) {
            clearInterval(this.recoveryTimer);
        }
        
        this.recoveryTimer = setInterval(() => {
            const timeSinceLastRecovery = Date.now() - this.lastRecoveryTime;
            
            if (timeSinceLastRecovery >= this.recoveryTimeMs) {
                if (this.recoverHeart()) {
                    // 하트 회복 성공, 다음 회복을 위해 타이머 계속
                } else {
                    // 최대치 도달, 타이머 중지
                    this.stopRecoveryTimer();
                }
            }
        }, 1000); // 1초마다 체크
    }
}
```

### 화폐 밸런싱

#### 경제 시뮬레이션 시스템
```typescript
export class EconomyBalancer {
    private economyMetrics: EconomyMetrics;
    private inflationRate: number = 0;
    private deflationRate: number = 0;
    
    // 경제 지표 분석
    analyzeEconomy(playerData: PlayerEconomyData[]): EconomyAnalysis {
        const metrics = this.calculateMetrics(playerData);
        
        return {
            averageEarningsPerDay: metrics.dailyEarnings,
            averageSpendingPerDay: metrics.dailySpending,
            currencyAccumulationRate: metrics.accumulationRate,
            spendingDistribution: metrics.spendingByCategory,
            recommendedAdjustments: this.generateAdjustmentRecommendations(metrics)
        };
    }
    
    // 동적 가격 조정
    adjustPrices(category: SpendCategory, adjustmentFactor: number): void {
        const items = ShopManager.getInstance().getItemsByCategory(category);
        
        for (const item of items) {
            const currentPrice = item.price;
            const newPrice = Math.round(currentPrice * adjustmentFactor);
            
            // 가격 변동 한계 설정 (±30%)
            const minPrice = Math.floor(currentPrice * 0.7);
            const maxPrice = Math.ceil(currentPrice * 1.3);
            
            item.price = Math.max(minPrice, Math.min(maxPrice, newPrice));
        }
        
        // 가격 변동 알림
        EventBus.getInstance().emit('prices_adjusted', {
            category: category,
            adjustmentFactor: adjustmentFactor
        });
    }
    
    // 인플레이션/디플레이션 감지
    detectEconomicTrends(historicalData: EconomySnapshot[]): EconomicTrend {
        if (historicalData.length < 7) {
            return EconomicTrend.STABLE; // 데이터 부족
        }
        
        const recentData = historicalData.slice(-7); // 최근 7일
        const olderData = historicalData.slice(-14, -7); // 이전 7일
        
        const recentAvgWealth = this.calculateAverageWealth(recentData);
        const olderAvgWealth = this.calculateAverageWealth(olderData);
        
        const changeRate = (recentAvgWealth - olderAvgWealth) / olderAvgWealth;
        
        if (changeRate > 0.15) {
            return EconomicTrend.INFLATION; // 15% 이상 증가
        } else if (changeRate < -0.15) {
            return EconomicTrend.DEFLATION; // 15% 이상 감소
        } else {
            return EconomicTrend.STABLE;
        }
    }
}
```

---

## 4. 📅 이벤트 시스템

### 한정 이벤트 구조

#### 이벤트 관리자
```typescript
export class EventManager {
    private activeEvents: Map<string, GameEvent> = new Map();
    private eventSchedule: EventSchedule[] = [];
    private eventHistory: EventHistory[] = [];
    
    // 새 이벤트 시작
    startEvent(eventConfig: EventConfig): boolean {
        // 중복 이벤트 확인
        if (this.hasConflictingEvent(eventConfig)) {
            return false;
        }
        
        const gameEvent = this.createEventFromConfig(eventConfig);
        this.activeEvents.set(gameEvent.id, gameEvent);
        
        // 이벤트 초기화
        this.initializeEventData(gameEvent);
        
        // 플레이어에게 알림
        this.notifyEventStart(gameEvent);
        
        // 자동 종료 타이머 설정
        this.scheduleEventEnd(gameEvent);
        
        return true;
    }
    
    private createEventFromConfig(config: EventConfig): GameEvent {
        switch (config.type) {
            case EventType.COLLECTION:
                return new CollectionEvent(config);
                
            case EventType.TOURNAMENT:
                return new TournamentEvent(config);
                
            case EventType.SPECIAL_LEVELS:
                return new SpecialLevelsEvent(config);
                
            case EventType.DOUBLE_REWARDS:
                return new DoubleRewardsEvent(config);
                
            case EventType.BOSS_RUSH:
                return new BossRushEvent(config);
                
            default:
                throw new Error(`Unknown event type: ${config.type}`);
        }
    }
    
    // 이벤트 진행률 업데이트
    updateEventProgress(playerId: string, action: GameAction): EventUpdateResult[] {
        const results: EventUpdateResult[] = [];
        
        for (const [eventId, event] of this.activeEvents) {
            if (event.isPlayerParticipating(playerId)) {
                const result = event.processAction(playerId, action);
                
                if (result.progressMade) {
                    results.push(result);
                    
                    // 이벤트 완료 확인
                    if (result.isCompleted) {
                        this.handleEventCompletion(event, playerId, result);
                    }
                }
            }
        }
        
        return results;
    }
}

// 수집 이벤트 예시
export class CollectionEvent extends GameEvent {
    private targetItems: Map<string, number> = new Map(); // 수집 목표
    private playerProgress: Map<string, Map<string, number>> = new Map(); // 플레이어별 진행률
    
    constructor(config: EventConfig) {
        super(config);
        this.initializeCollectionTargets(config.parameters);
    }
    
    processAction(playerId: string, action: GameAction): EventUpdateResult {
        if (action.type !== ActionType.BLOCK_MATCH) {
            return EventUpdateResult.noProgress();
        }
        
        const matchData = action.data as MatchData;
        const playerProgress = this.getPlayerProgress(playerId);
        let progressMade = false;
        
        // 매치된 블록 색상별로 집계
        for (const [color, count] of matchData.colorCounts) {
            if (this.targetItems.has(color)) {
                const currentCount = playerProgress.get(color) || 0;
                const newCount = currentCount + count;
                playerProgress.set(color, newCount);
                progressMade = true;
            }
        }
        
        // 완료 여부 확인
        const isCompleted = this.checkCompletion(playerProgress);
        
        return new EventUpdateResult(
            progressMade,
            isCompleted,
            this.calculateRewardTier(playerProgress),
            this.getProgressPercentage(playerProgress)
        );
    }
    
    private checkCompletion(playerProgress: Map<string, number>): boolean {
        for (const [item, requiredCount] of this.targetItems) {
            const currentCount = playerProgress.get(item) || 0;
            if (currentCount < requiredCount) {
                return false;
            }
        }
        return true;
    }
}
```

### 시즌 패스

#### 계층적 보상 시스템
```typescript
export class SeasonPassSystem {
    private currentSeason: Season;
    private playerProgress: SeasonProgress;
    private tierRewards: Map<number, TierReward[]> = new Map();
    
    constructor() {
        this.loadCurrentSeason();
        this.initializeTierRewards();
    }
    
    // 시즌 경험치 지급
    awardSeasonXP(playerId: string, amount: number, source: XPSource): void {
        const progress = this.getPlayerProgress(playerId);
        const oldLevel = progress.level;
        
        progress.xp += amount;
        
        // 레벨업 체크
        while (progress.xp >= this.getXPRequiredForNextLevel(progress.level)) {
            progress.xp -= this.getXPRequiredForNextLevel(progress.level);
            progress.level++;
            
            // 레벨 보상 지급
            this.awardTierRewards(playerId, progress.level);
        }
        
        // 레벨업 발생 시 이벤트
        if (progress.level > oldLevel) {
            EventBus.getInstance().emit('season_level_up', {
                playerId: playerId,
                oldLevel: oldLevel,
                newLevel: progress.level,
                seasonId: this.currentSeason.id
            });
        }
        
        this.savePlayerProgress(playerId, progress);
    }
    
    private awardTierRewards(playerId: string, tier: number): void {
        const rewards = this.tierRewards.get(tier);
        if (!rewards) return;
        
        const playerProgress = this.getPlayerProgress(playerId);
        
        for (const reward of rewards) {
            // 무료 패스 보상
            if (reward.isFreeReward) {
                this.grantReward(playerId, reward);
                playerProgress.claimedFreeRewards.add(tier);
            }
            
            // 프리미엄 패스 보상
            if (reward.isPremiumReward && playerProgress.hasPremiumPass) {
                this.grantReward(playerId, reward);
                playerProgress.claimedPremiumRewards.add(tier);
            }
        }
    }
    
    // 프리미엄 패스 구매
    purchasePremiumPass(playerId: string): boolean {
        const cost = this.currentSeason.premiumPassPrice;
        
        if (!CurrencyManager.getInstance().canAfford(CurrencyType.GEMS, cost)) {
            return false;
        }
        
        if (!CurrencyManager.getInstance().spendCurrency(
            CurrencyType.GEMS, 
            cost, 
            SpendPurpose.PREMIUM_PASS
        )) {
            return false;
        }
        
        const progress = this.getPlayerProgress(playerId);
        progress.hasPremiumPass = true;
        
        // 이미 달성한 티어의 프리미엄 보상 소급 지급
        for (let tier = 1; tier <= progress.level; tier++) {
            if (!progress.claimedPremiumRewards.has(tier)) {
                const tierRewards = this.tierRewards.get(tier);
                const premiumRewards = tierRewards?.filter(r => r.isPremiumReward) || [];
                
                for (const reward of premiumRewards) {
                    this.grantReward(playerId, reward);
                    progress.claimedPremiumRewards.add(tier);
                }
            }
        }
        
        this.savePlayerProgress(playerId, progress);
        
        EventBus.getInstance().emit('premium_pass_purchased', {
            playerId: playerId,
            seasonId: this.currentSeason.id,
            retroactiveRewards: progress.claimedPremiumRewards.size
        });
        
        return true;
    }
}
```

Sweet Puzzle의 진행 시스템은 플레이어의 장기적인 참여를 유도하는 다양한 동기부여 요소들을 제공합니다. 개인화된 난이도 조절, 풍부한 보상 시스템, 정기적인 이벤트를 통해 지속적으로 새로운 도전과 성취감을 제공하여 플레이어 리텐션을 극대화합니다.