# Sweet Puzzle 구현 계획서: 진행 시스템

## 1. 🎯 구현 목표

이 문서는 `docs02/04-Progression-System-Design.md`에 정의된 **진행 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 월드맵 진행, 레벨 관리, 보상 시스템, 경제 시스템, 이벤트 시스템을 완성하여 플레이어에게 지속적인 동기부여와 진행감을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

진행 시스템 구현은 `assets/scripts/progression` 폴더를 중심으로 진행됩니다.

### 2.1. Progression Core (진행 핵심)

```
assets/scripts/progression/
├── ProgressionManager.ts            # ✅ 진행 시스템 총괄 관리자  
├── LevelManager.ts                  # ✅ 레벨 관리 시스템
├── WorldManager.ts                  # ✅ 월드맵 관리 시스템
├── PlayerProgressTracker.ts         # ✅ 플레이어 진행 추적
└── ProgressionValidator.ts          # ✅ 진행 검증 시스템
```

### 2.2. Reward System (보상 시스템)

```
assets/scripts/progression/rewards/
├── RewardManager.ts                 # ✅ 보상 관리자
├── RewardCalculator.ts              # ✅ 보상 계산기
├── RewardDistributor.ts             # ✅ 보상 배포 시스템
├── StarSystem.ts                    # ✅ 별점 관리 시스템
└── AchievementSystem.ts             # ✅ 성취 시스템
```

### 2.3. Economy System (경제 시스템)

```
assets/scripts/progression/economy/
├── CurrencyManager.ts               # ✅ 화폐 관리자
├── ShopSystem.ts                    # ✅ 상점 시스템
├── InventoryManager.ts              # ✅ 인벤토리 관리
├── ExchangeRateManager.ts           # ✅ 환율 관리
└── EconomyAnalyzer.ts               # ✅ 경제 분석기
```

### 2.4. Mission System (미션 시스템)

```
assets/scripts/progression/missions/
├── MissionManager.ts                # ✅ 미션 관리자
├── DailyMissionGenerator.ts         # ✅ 일일 미션 생성기
├── WeeklyChallengeSystem.ts         # ✅ 주간 도전 시스템
├── MissionValidator.ts              # ✅ 미션 검증 시스템
└── MissionRewardCalculator.ts       # ✅ 미션 보상 계산기
```

### 2.5. Event System (이벤트 시스템)

```
assets/scripts/progression/events/
├── EventManager.ts                  # ✅ 이벤트 관리자
├── SeasonalEventSystem.ts           # ✅ 시즌 이벤트 시스템
├── LimitedTimeEvent.ts              # ✅ 한정 이벤트
├── EventProgressTracker.ts          # ✅ 이벤트 진행 추적
└── EventRewardDistributor.ts        # ✅ 이벤트 보상 배포
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs02/04-Progression-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 진행 시스템 구축 (가장 중요)**
*   **기간:** 8일
*   **목표:** 월드맵과 레벨 진행의 기본 구조가 완전히 동작한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `WorldManager.ts`: 월드맵 구조와 레벨 잠금/해제 시스템을 구현합니다.
        ```typescript
        export class WorldManager {
            private static instance: WorldManager;
            private worlds: Map<string, World> = new Map();
            private currentWorld: string = 'world_1';
            private playerProgress: PlayerWorldProgress;
            
            static getInstance(): WorldManager {
                if (!this.instance) {
                    this.instance = new WorldManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.loadWorldData();
                this.loadPlayerProgress();
                this.validateWorldStates();
            }
            
            private loadWorldData(): void {
                // 월드 1: 캔디 농장
                this.worlds.set('world_1', {
                    id: 'world_1',
                    name: 'Sweet Farm',
                    description: '달콤한 사탕 농장에서 첫 번째 모험을 시작하세요!',
                    theme: {
                        backgroundImage: 'world_1_bg',
                        colorScheme: ['#FFB6C1', '#FFC0CB', '#FFE4E1'],
                        musicTrack: 'world_1_theme'
                    },
                    levels: this.generateWorldLevels('world_1', 20),
                    unlockRequirement: null, // 첫 번째 월드는 항상 해제
                    starRequirement: 0,
                    rewards: {
                        unlockReward: { coins: 1000, gems: 10 },
                        completionReward: { coins: 5000, gems: 50, special: 'world_1_trophy' }
                    }
                });
                
                // 월드 2: 초콜릿 공장
                this.worlds.set('world_2', {
                    id: 'world_2',
                    name: 'Chocolate Factory',
                    description: '신비로운 초콜릿 공장의 비밀을 풀어보세요!',
                    theme: {
                        backgroundImage: 'world_2_bg',
                        colorScheme: ['#8B4513', '#A0522D', '#D2691E'],
                        musicTrack: 'world_2_theme'
                    },
                    levels: this.generateWorldLevels('world_2', 25),
                    unlockRequirement: {
                        type: 'world_completion',
                        worldId: 'world_1',
                        minStars: 30
                    },
                    starRequirement: 30,
                    rewards: {
                        unlockReward: { coins: 2000, gems: 20 },
                        completionReward: { coins: 10000, gems: 100, special: 'world_2_trophy' }
                    }
                });
            }
            
            async unlockLevel(worldId: string, levelNumber: number): Promise<UnlockResult> {
                const world = this.worlds.get(worldId);
                if (!world) {
                    return { success: false, error: 'World not found' };
                }
                
                const level = world.levels.find(l => l.levelNumber === levelNumber);
                if (!level) {
                    return { success: false, error: 'Level not found' };
                }
                
                // 이미 해제된 레벨인지 확인
                if (this.isLevelUnlocked(worldId, levelNumber)) {
                    return { success: true, alreadyUnlocked: true };
                }
                
                // 이전 레벨 완료 여부 확인
                if (levelNumber > 1) {
                    const previousLevelCompleted = this.isLevelCompleted(worldId, levelNumber - 1);
                    if (!previousLevelCompleted) {
                        return { success: false, error: 'Previous level not completed' };
                    }
                }
                
                // 레벨 해제
                this.playerProgress.worldProgress[worldId].unlockedLevels.add(levelNumber);
                
                // 해제 보상 지급
                if (level.unlockReward) {
                    await RewardManager.getInstance().giveRewards(level.unlockReward);
                }
                
                // 진행 상황 저장
                await this.savePlayerProgress();
                
                // 이벤트 발생
                EventBus.getInstance().emit('level_unlocked', {
                    worldId: worldId,
                    levelNumber: levelNumber,
                    level: level
                });
                
                return { success: true, level: level };
            }
            
            async completeLevel(worldId: string, levelNumber: number, result: LevelResult): Promise<CompletionResult> {
                const world = this.worlds.get(worldId);
                if (!world) {
                    return { success: false, error: 'World not found' };
                }
                
                const level = world.levels.find(l => l.levelNumber === levelNumber);
                if (!level) {
                    return { success: false, error: 'Level not found' };
                }
                
                // 레벨 해제 여부 확인
                if (!this.isLevelUnlocked(worldId, levelNumber)) {
                    return { success: false, error: 'Level not unlocked' };
                }
                
                const worldProgress = this.playerProgress.worldProgress[worldId];
                const currentResult = worldProgress.levelResults.get(levelNumber);
                
                // 별점 계산
                const stars = this.calculateStars(result, level);
                
                // 최고 기록 업데이트
                if (!currentResult || stars > currentResult.stars || result.score > currentResult.score) {
                    worldProgress.levelResults.set(levelNumber, {
                        score: result.score,
                        stars: stars,
                        movesUsed: result.movesUsed,
                        timeSpent: result.timeSpent,
                        completedAt: Date.now(),
                        attempts: (currentResult?.attempts || 0) + 1
                    });
                    
                    // 새로운 최고 기록 달성
                    const isNewRecord = !currentResult || stars > currentResult.stars;
                    
                    if (isNewRecord) {
                        // 완료 보상 지급
                        const rewards = this.calculateCompletionRewards(level, stars);
                        await RewardManager.getInstance().giveRewards(rewards);
                        
                        // 다음 레벨 자동 해제
                        if (levelNumber < world.levels.length) {
                            await this.unlockLevel(worldId, levelNumber + 1);
                        }
                        
                        // 월드 완료 확인
                        if (this.isWorldCompleted(worldId)) {
                            await this.completeWorld(worldId);
                        }
                    }
                }
                
                // 진행 상황 저장
                await this.savePlayerProgress();
                
                return {
                    success: true,
                    stars: stars,
                    isNewRecord: !currentResult || stars > currentResult.stars,
                    rewards: this.calculateCompletionRewards(level, stars),
                    nextLevelUnlocked: levelNumber < world.levels.length
                };
            }
            
            private calculateStars(result: LevelResult, level: Level): number {
                const { score, movesUsed } = result;
                const { starThresholds, maxMoves } = level;
                
                let stars = 0;
                
                // 기본 완료 (1성)
                if (this.checkObjectivesCompleted(result, level.objectives)) {
                    stars = 1;
                }
                
                // 점수 기준 추가 별점
                if (score >= starThresholds.twoStar) {
                    stars = 2;
                }
                
                if (score >= starThresholds.threeStar) {
                    stars = 3;
                }
                
                // 효율성 보너스 (적은 이동으로 완료 시)
                if (stars >= 2 && maxMoves && movesUsed <= maxMoves * 0.7) {
                    stars = Math.max(stars, 2);
                }
                
                if (stars >= 3 && maxMoves && movesUsed <= maxMoves * 0.5) {
                    stars = 3;
                }
                
                return stars;
            }
        }
        ```
    2.  **[Task 1.2]** `LevelManager.ts`: 개별 레벨의 상태 관리와 진행 추적을 구현합니다.
    3.  **[Task 1.3]** `PlayerProgressTracker.ts`: 플레이어 진행 상황 추적과 데이터 저장을 구현합니다.
    4.  **[Task 1.4]** `ProgressionValidator.ts`: 진행 조건과 요구사항 검증을 구현합니다.
    5.  **[Task 1.5]** **기본 진행 테스트:** 월드맵 네비게이션과 레벨 잠금/해제가 정상 작동하는지 검증합니다.

### **Phase 2: 보상 시스템 구현**
*   **기간:** 6일
*   **목표:** 별점, 성취, 보상 계산 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 2.1]** `RewardManager.ts`: 통합 보상 관리 시스템을 구현합니다.
        ```typescript
        export class RewardManager {
            private static instance: RewardManager;
            private rewardQueue: RewardOperation[] = [];
            private rewardHistory: RewardHistory[] = [];
            
            static getInstance(): RewardManager {
                if (!this.instance) {
                    this.instance = new RewardManager();
                }
                return this.instance;
            }
            
            async giveRewards(rewards: RewardBundle, playerId?: string): Promise<RewardResult> {
                const targetPlayerId = playerId || PlayerManager.getInstance().getCurrentPlayerId();
                const operation: RewardOperation = {
                    id: this.generateOperationId(),
                    playerId: targetPlayerId,
                    rewards: rewards,
                    timestamp: Date.now(),
                    status: 'pending'
                };
                
                this.rewardQueue.push(operation);
                
                try {
                    // 보상 지급 실행
                    const result = await this.processRewardOperation(operation);
                    
                    // 히스토리 기록
                    this.rewardHistory.push({
                        operationId: operation.id,
                        playerId: targetPlayerId,
                        rewards: rewards,
                        result: result,
                        timestamp: Date.now()
                    });
                    
                    // 보상 지급 이벤트
                    EventBus.getInstance().emit('rewards_given', {
                        playerId: targetPlayerId,
                        rewards: rewards,
                        result: result
                    });
                    
                    return result;
                } catch (error) {
                    operation.status = 'failed';
                    operation.error = error.message;
                    
                    return {
                        success: false,
                        error: error.message,
                        operationId: operation.id
                    };
                }
            }
            
            private async processRewardOperation(operation: RewardOperation): Promise<RewardResult> {
                const { rewards, playerId } = operation;
                const givenRewards: RewardItem[] = [];
                
                // 화폐 보상 처리
                if (rewards.coins && rewards.coins > 0) {
                    const success = await CurrencyManager.getInstance().addCurrency(
                        CurrencyType.COINS,
                        rewards.coins,
                        TransactionReason.LEVEL_REWARD,
                        { operationId: operation.id }
                    );
                    
                    if (success) {
                        givenRewards.push({
                            type: 'currency',
                            currencyType: CurrencyType.COINS,
                            amount: rewards.coins
                        });
                    }
                }
                
                if (rewards.gems && rewards.gems > 0) {
                    const success = await CurrencyManager.getInstance().addCurrency(
                        CurrencyType.GEMS,
                        rewards.gems,
                        TransactionReason.LEVEL_REWARD,
                        { operationId: operation.id }
                    );
                    
                    if (success) {
                        givenRewards.push({
                            type: 'currency',
                            currencyType: CurrencyType.GEMS,
                            amount: rewards.gems
                        });
                    }
                }
                
                // 아이템 보상 처리
                if (rewards.items) {
                    for (const itemReward of rewards.items) {
                        const success = await InventoryManager.getInstance().addItem(
                            itemReward.itemId,
                            itemReward.quantity,
                            'level_reward'
                        );
                        
                        if (success) {
                            givenRewards.push({
                                type: 'item',
                                itemId: itemReward.itemId,
                                quantity: itemReward.quantity
                            });
                        }
                    }
                }
                
                // 부스터 보상 처리
                if (rewards.boosters) {
                    for (const [boosterType, quantity] of Object.entries(rewards.boosters)) {
                        const success = await InventoryManager.getInstance().addBooster(
                            boosterType as BoosterType,
                            quantity
                        );
                        
                        if (success) {
                            givenRewards.push({
                                type: 'booster',
                                boosterType: boosterType as BoosterType,
                                quantity: quantity
                            });
                        }
                    }
                }
                
                // 특별 보상 처리
                if (rewards.special) {
                    await this.processSpecialReward(rewards.special, playerId);
                    givenRewards.push({
                        type: 'special',
                        specialId: rewards.special
                    });
                }
                
                operation.status = 'completed';
                
                return {
                    success: true,
                    operationId: operation.id,
                    givenRewards: givenRewards,
                    totalValue: this.calculateRewardValue(givenRewards)
                };
            }
            
            // 동적 보상 계산
            calculateDynamicRewards(context: RewardContext): RewardBundle {
                let baseRewards: RewardBundle = {};
                
                // 컨텍스트에 따른 기본 보상
                switch (context.type) {
                    case 'level_completion':
                        baseRewards = this.calculateLevelCompletionRewards(context);
                        break;
                    case 'daily_mission':
                        baseRewards = this.calculateDailyMissionRewards(context);
                        break;
                    case 'achievement':
                        baseRewards = this.calculateAchievementRewards(context);
                        break;
                }
                
                // 플레이어 상태에 따른 보너스
                const playerBonus = this.calculatePlayerBonus(context.playerId);
                
                // 이벤트 보너스
                const eventBonus = this.calculateEventBonus();
                
                // 최종 보상 계산
                return this.applyBonuses(baseRewards, playerBonus, eventBonus);
            }
            
            private calculateLevelCompletionRewards(context: RewardContext): RewardBundle {
                const levelData = context.levelData;
                const performance = context.performance;
                
                let rewards: RewardBundle = {
                    coins: levelData.baseReward.coins,
                    gems: 0
                };
                
                // 별점에 따른 추가 보상
                if (performance.stars >= 2) {
                    rewards.coins = Math.floor(rewards.coins * 1.5);
                    rewards.gems = 5;
                }
                
                if (performance.stars >= 3) {
                    rewards.coins = Math.floor(rewards.coins * 2);
                    rewards.gems = 10;
                    
                    // 완벽한 플레이 보너스
                    if (performance.movesUsed <= levelData.maxMoves * 0.5) {
                        rewards.boosters = { hammer: 1 };
                    }
                }
                
                return rewards;
            }
        }
        ```
    2.  **[Task 2.2]** `StarSystem.ts`: 별점 계산과 별점 기반 보상 시스템을 구현합니다.
    3.  **[Task 2.3]** `AchievementSystem.ts`: 성취 시스템과 도전 과제를 구현합니다.
    4.  **[Task 2.4]** `RewardCalculator.ts`: 동적 보상 계산과 밸런싱을 구현합니다.
    5.  **[Task 2.5]** **보상 시스템 테스트:** 모든 보상이 정확히 계산되고 지급되는지 검증합니다.

### **Phase 3: 경제 시스템 구현**
*   **기간:** 7일
*   **목표:** 다중 화폐 시스템과 상점, 인벤토리가 완성된다.
*   **작업 내용:**
    1.  **[Task 3.1]** `CurrencyManager.ts`: 다중 화폐 관리와 트랜잭션 로깅을 구현합니다.
        ```typescript
        export class CurrencyManager {
            private static instance: CurrencyManager;
            private balances: Map<CurrencyType, number> = new Map();
            private transactionLog: CurrencyTransaction[] = [];
            private exchangeRates: Map<string, number> = new Map();
            
            static getInstance(): CurrencyManager {
                if (!this.instance) {
                    this.instance = new CurrencyManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.loadBalances();
                this.setupExchangeRates();
                this.startAutoSave();
            }
            
            async addCurrency(
                type: CurrencyType, 
                amount: number, 
                reason: TransactionReason,
                metadata?: any
            ): Promise<boolean> {
                if (amount <= 0) {
                    return false;
                }
                
                const currentBalance = this.getBalance(type);
                const newBalance = currentBalance + amount;
                
                // 최대 보유량 확인
                const maxAmount = this.getMaxAmount(type);
                if (newBalance > maxAmount) {
                    console.warn(`Currency ${type} would exceed maximum (${maxAmount})`);
                    return false;
                }
                
                // 트랜잭션 생성
                const transaction: CurrencyTransaction = {
                    id: this.generateTransactionId(),
                    playerId: PlayerManager.getInstance().getCurrentPlayerId(),
                    type: type,
                    amount: amount,
                    balanceBefore: currentBalance,
                    balanceAfter: newBalance,
                    reason: reason,
                    timestamp: Date.now(),
                    metadata: metadata || {}
                };
                
                // 잔액 업데이트
                this.balances.set(type, newBalance);
                
                // 트랜잭션 로그
                this.transactionLog.push(transaction);
                await this.logTransaction(transaction);
                
                // 이벤트 발생
                EventBus.getInstance().emit('currency_changed', {
                    type: type,
                    amount: amount,
                    newBalance: newBalance,
                    reason: reason
                });
                
                return true;
            }
            
            async deductCurrency(
                type: CurrencyType,
                amount: number,
                reason: TransactionReason,
                metadata?: any
            ): Promise<boolean> {
                if (amount <= 0) {
                    return false;
                }
                
                const currentBalance = this.getBalance(type);
                if (currentBalance < amount) {
                    console.warn(`Insufficient ${type}: required ${amount}, available ${currentBalance}`);
                    return false;
                }
                
                return await this.addCurrency(type, -amount, reason, metadata);
            }
            
            // 화폐 교환 시스템
            async exchangeCurrency(
                fromType: CurrencyType,
                toType: CurrencyType,
                fromAmount: number
            ): Promise<ExchangeResult> {
                const exchangeKey = `${fromType}_to_${toType}`;
                const exchangeRate = this.exchangeRates.get(exchangeKey);
                
                if (!exchangeRate) {
                    return { success: false, error: 'Exchange rate not available' };
                }
                
                const toAmount = Math.floor(fromAmount * exchangeRate);
                
                // 교환 수수료 적용 (5%)
                const fee = Math.floor(fromAmount * 0.05);
                const totalDeduction = fromAmount + fee;
                
                // 잔액 확인
                if (this.getBalance(fromType) < totalDeduction) {
                    return { success: false, error: 'Insufficient balance for exchange' };
                }
                
                // 교환 실행
                const deductSuccess = await this.deductCurrency(
                    fromType,
                    totalDeduction,
                    TransactionReason.CURRENCY_EXCHANGE,
                    { exchangeTo: toType, fee: fee }
                );
                
                if (!deductSuccess) {
                    return { success: false, error: 'Failed to deduct source currency' };
                }
                
                const addSuccess = await this.addCurrency(
                    toType,
                    toAmount,
                    TransactionReason.CURRENCY_EXCHANGE,
                    { exchangeFrom: fromType, rate: exchangeRate }
                );
                
                if (!addSuccess) {
                    // 롤백
                    await this.addCurrency(fromType, totalDeduction, TransactionReason.ROLLBACK);
                    return { success: false, error: 'Failed to add target currency' };
                }
                
                return {
                    success: true,
                    fromAmount: fromAmount,
                    toAmount: toAmount,
                    fee: fee,
                    exchangeRate: exchangeRate
                };
            }
            
            private setupExchangeRates(): void {
                // 기본 환율 설정 (동적으로 조정 가능)
                this.exchangeRates.set('coins_to_gems', 0.01);     // 100 코인 = 1 젬
                this.exchangeRates.set('gems_to_coins', 90);       // 1 젬 = 90 코인 (수수료 고려)
                this.exchangeRates.set('stars_to_gems', 0.5);      // 2 별 = 1 젬
                this.exchangeRates.set('hearts_to_coins', 50);     // 1 하트 = 50 코인
            }
            
            // 경제 분석을 위한 데이터 제공
            getEconomyAnalytics(): EconomyAnalytics {
                const recentTransactions = this.transactionLog
                    .filter(t => Date.now() - t.timestamp < 24 * 60 * 60 * 1000)
                    .slice(-100);
                
                return {
                    currentBalances: Object.fromEntries(this.balances),
                    dailyTransactionCount: recentTransactions.length,
                    dailyIncomeBySource: this.calculateIncomeBySource(recentTransactions),
                    dailySpendingByCategory: this.calculateSpendingByCategory(recentTransactions),
                    exchangeActivity: this.calculateExchangeActivity(recentTransactions)
                };
            }
        }
        ```
    2.  **[Task 3.2]** `ShopSystem.ts`: 상점 시스템과 동적 상품 관리를 구현합니다.
    3.  **[Task 3.3]** `InventoryManager.ts`: 아이템 인벤토리와 부스터 관리를 구현합니다.
    4.  **[Task 3.4]** `EconomyAnalyzer.ts`: 경제 밸런스 분석과 조정 시스템을 구현합니다.
    5.  **[Task 3.5]** **경제 시스템 테스트:** 화폐 거래와 상점 기능이 안정적으로 작동하는지 검증합니다.

### **Phase 4: 미션 및 도전 시스템**
*   **기간:** 6일
*   **목표:** 일일 미션, 주간 도전, 성취 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 4.1]** `MissionManager.ts`: 미션 시스템의 전체 관리를 구현합니다.
        ```typescript
        export class MissionManager {
            private static instance: MissionManager;
            private activeMissions: Map<string, Mission> = new Map();
            private completedMissions: Set<string> = new Set();
            private missionGenerators: Map<MissionType, MissionGenerator> = new Map();
            
            static getInstance(): MissionManager {
                if (!this.instance) {
                    this.instance = new MissionManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.setupMissionGenerators();
                this.loadActiveMissions();
                this.startDailyRefresh();
            }
            
            private setupMissionGenerators(): void {
                this.missionGenerators.set(MissionType.DAILY, new DailyMissionGenerator());
                this.missionGenerators.set(MissionType.WEEKLY, new WeeklyMissionGenerator());
                this.missionGenerators.set(MissionType.ACHIEVEMENT, new AchievementMissionGenerator());
            }
            
            async generateDailyMissions(): Promise<Mission[]> {
                const generator = this.missionGenerators.get(MissionType.DAILY);
                if (!generator) {
                    return [];
                }
                
                const playerProfile = await PlayerManager.getInstance().getPlayerProfile();
                const missions = await generator.generateMissions(playerProfile);
                
                // 기존 일일 미션 제거
                this.clearMissionsByType(MissionType.DAILY);
                
                // 새로운 미션 추가
                for (const mission of missions) {
                    this.activeMissions.set(mission.id, mission);
                }
                
                // 미션 갱신 이벤트
                EventBus.getInstance().emit('daily_missions_refreshed', {
                    missions: missions
                });
                
                return missions;
            }
            
            async trackProgress(eventType: string, data: any): Promise<void> {
                for (const [missionId, mission] of this.activeMissions) {
                    if (mission.isCompleted) {
                        continue;
                    }
                    
                    // 미션 진행 조건 확인
                    const progressMade = this.checkMissionProgress(mission, eventType, data);
                    
                    if (progressMade > 0) {
                        mission.currentProgress += progressMade;
                        
                        // 미션 완료 확인
                        if (mission.currentProgress >= mission.targetProgress) {
                            await this.completeMission(missionId);
                        } else {
                            // 진행 상황 이벤트
                            EventBus.getInstance().emit('mission_progress_updated', {
                                missionId: missionId,
                                progress: mission.currentProgress,
                                target: mission.targetProgress
                            });
                        }
                    }
                }
                
                // 진행 상황 저장
                await this.saveMissionProgress();
            }
            
            private checkMissionProgress(mission: Mission, eventType: string, data: any): number {
                switch (mission.objectiveType) {
                    case 'complete_levels':
                        if (eventType === 'level_completed') {
                            return 1;
                        }
                        break;
                        
                    case 'earn_score':
                        if (eventType === 'level_completed') {
                            return data.score || 0;
                        }
                        break;
                        
                    case 'use_boosters':
                        if (eventType === 'booster_used') {
                            return data.boosterType === mission.targetType ? 1 : 0;
                        }
                        break;
                        
                    case 'collect_stars':
                        if (eventType === 'level_completed') {
                            return data.stars || 0;
                        }
                        break;
                        
                    case 'make_special_blocks':
                        if (eventType === 'special_block_created') {
                            return mission.targetType ? 
                                (data.blockType === mission.targetType ? 1 : 0) : 1;
                        }
                        break;
                        
                    case 'complete_world':
                        if (eventType === 'world_completed') {
                            return mission.targetType === data.worldId ? 1 : 0;
                        }
                        break;
                }
                
                return 0;
            }
            
            private async completeMission(missionId: string): Promise<void> {
                const mission = this.activeMissions.get(missionId);
                if (!mission) {
                    return;
                }
                
                mission.isCompleted = true;
                mission.completedAt = Date.now();
                
                // 보상 지급
                const rewardResult = await RewardManager.getInstance().giveRewards(mission.rewards);
                
                // 완료된 미션 목록에 추가
                this.completedMissions.add(missionId);
                
                // 미션 완료 이벤트
                EventBus.getInstance().emit('mission_completed', {
                    mission: mission,
                    rewards: rewardResult
                });
                
                // 분석 이벤트
                AnalyticsManager.getInstance().trackEvent('mission_completed', {
                    mission_id: missionId,
                    mission_type: mission.type,
                    objective_type: mission.objectiveType,
                    completion_time: Date.now() - mission.createdAt,
                    reward_value: this.calculateRewardValue(mission.rewards)
                });
            }
            
            getActiveMissions(type?: MissionType): Mission[] {
                const missions = Array.from(this.activeMissions.values());
                
                if (type) {
                    return missions.filter(m => m.type === type && !m.isCompleted);
                }
                
                return missions.filter(m => !m.isCompleted);
            }
            
            // 미션 난이도 조정
            adjustMissionDifficulty(playerPerformance: PlayerPerformance): void {
                const generators = Array.from(this.missionGenerators.values());
                
                for (const generator of generators) {
                    if (generator.supportsDifficultyAdjustment) {
                        generator.adjustDifficulty(playerPerformance);
                    }
                }
            }
        }
        ```
    2.  **[Task 4.2]** `DailyMissionGenerator.ts`: 플레이어 맞춤형 일일 미션 생성을 구현합니다.
    3.  **[Task 4.3]** `WeeklyChallengeSystem.ts`: 주간 도전 과제와 랭킹 시스템을 구현합니다.
    4.  **[Task 4.4]** `MissionValidator.ts`: 미션 진행 검증과 부정 방지를 구현합니다.
    5.  **[Task 4.5]** **미션 시스템 테스트:** 모든 미션 타입이 정확히 추적되고 완료되는지 검증합니다.

### **Phase 5: 이벤트 및 시즌 시스템**
*   **기간:** 5일
*   **목표:** 시즌 이벤트와 한정 이벤트 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 5.1]** `EventManager.ts`: 이벤트 시스템의 전체 관리를 구현합니다.
        ```typescript
        export class EventManager {
            private static instance: EventManager;
            private activeEvents: Map<string, GameEvent> = new Map();
            private eventScheduler: EventScheduler;
            private eventProgressTracker: Map<string, EventProgress> = new Map();
            
            static getInstance(): EventManager {
                if (!this.instance) {
                    this.instance = new EventManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.eventScheduler = new EventScheduler();
                this.loadActiveEvents();
                this.startEventUpdater();
            }
            
            async startEvent(eventConfig: EventConfiguration): Promise<EventStartResult> {
                try {
                    // 이벤트 생성
                    const gameEvent: GameEvent = {
                        id: eventConfig.id,
                        name: eventConfig.name,
                        description: eventConfig.description,
                        type: eventConfig.type,
                        
                        startTime: eventConfig.startTime,
                        endTime: eventConfig.endTime,
                        
                        objectives: eventConfig.objectives,
                        rewards: eventConfig.rewards,
                        milestoneRewards: eventConfig.milestoneRewards,
                        
                        participants: new Map(),
                        status: EventStatus.ACTIVE,
                        
                        metadata: eventConfig.metadata || {}
                    };
                    
                    // 이벤트 등록
                    this.activeEvents.set(gameEvent.id, gameEvent);
                    
                    // 플레이어 참가 처리
                    await this.registerPlayerForEvent(
                        gameEvent.id,
                        PlayerManager.getInstance().getCurrentPlayerId()
                    );
                    
                    // 이벤트 시작 알림
                    await NotificationManager.getInstance().sendNotification({
                        type: 'event_started',
                        title: `새로운 이벤트: ${gameEvent.name}`,
                        message: gameEvent.description,
                        data: { eventId: gameEvent.id }
                    });
                    
                    // 이벤트 시작 이벤트
                    EventBus.getInstance().emit('event_started', {
                        event: gameEvent
                    });
                    
                    return { success: true, event: gameEvent };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async registerPlayerForEvent(eventId: string, playerId: string): Promise<boolean> {
                const event = this.activeEvents.get(eventId);
                if (!event) {
                    return false;
                }
                
                // 이미 참가한 플레이어인지 확인
                if (event.participants.has(playerId)) {
                    return true;
                }
                
                // 참가자 등록
                const participant: EventParticipant = {
                    playerId: playerId,
                    joinTime: Date.now(),
                    progress: 0,
                    milestonesClaimed: new Set(),
                    rewards: []
                };
                
                event.participants.set(playerId, participant);
                
                // 이벤트 진행 추적 시작
                this.eventProgressTracker.set(`${eventId}_${playerId}`, {
                    eventId: eventId,
                    playerId: playerId,
                    objectives: event.objectives.map(obj => ({
                        ...obj,
                        currentProgress: 0,
                        isCompleted: false
                    })),
                    totalProgress: 0,
                    lastUpdated: Date.now()
                });
                
                return true;
            }
            
            async updateEventProgress(eventId: string, playerId: string, progressData: any): Promise<void> {
                const progressKey = `${eventId}_${playerId}`;
                const progress = this.eventProgressTracker.get(progressKey);
                
                if (!progress) {
                    return;
                }
                
                const event = this.activeEvents.get(eventId);
                if (!event || event.status !== EventStatus.ACTIVE) {
                    return;
                }
                
                let progressMade = false;
                
                // 목표별 진행 업데이트
                for (const objective of progress.objectives) {
                    if (objective.isCompleted) {
                        continue;
                    }
                    
                    const progressValue = this.calculateObjectiveProgress(objective, progressData);
                    
                    if (progressValue > 0) {
                        objective.currentProgress += progressValue;
                        progressMade = true;
                        
                        // 목표 완료 확인
                        if (objective.currentProgress >= objective.targetProgress) {
                            objective.isCompleted = true;
                            
                            EventBus.getInstance().emit('event_objective_completed', {
                                eventId: eventId,
                                playerId: playerId,
                                objective: objective
                            });
                        }
                    }
                }
                
                if (progressMade) {
                    // 전체 진행도 계산
                    progress.totalProgress = progress.objectives.reduce((total, obj) => {
                        return total + Math.min(obj.currentProgress, obj.targetProgress);
                    }, 0);
                    
                    progress.lastUpdated = Date.now();
                    
                    // 마일스톤 보상 확인
                    await this.checkMilestoneRewards(eventId, playerId);
                    
                    // 이벤트 완료 확인
                    const allCompleted = progress.objectives.every(obj => obj.isCompleted);
                    if (allCompleted) {
                        await this.completeEventForPlayer(eventId, playerId);
                    }
                }
            }
            
            private async checkMilestoneRewards(eventId: string, playerId: string): Promise<void> {
                const event = this.activeEvents.get(eventId);
                const participant = event?.participants.get(playerId);
                const progress = this.eventProgressTracker.get(`${eventId}_${playerId}`);
                
                if (!event || !participant || !progress) {
                    return;
                }
                
                const totalPossibleProgress = event.objectives.reduce((total, obj) => total + obj.targetProgress, 0);
                const progressPercentage = (progress.totalProgress / totalPossibleProgress) * 100;
                
                // 마일스톤 보상 확인
                for (const milestone of event.milestoneRewards) {
                    if (progressPercentage >= milestone.threshold && 
                        !participant.milestonesClaimed.has(milestone.id)) {
                        
                        // 마일스톤 보상 지급
                        await RewardManager.getInstance().giveRewards(milestone.rewards);
                        participant.milestonesClaimed.add(milestone.id);
                        
                        EventBus.getInstance().emit('event_milestone_reached', {
                            eventId: eventId,
                            playerId: playerId,
                            milestone: milestone
                        });
                    }
                }
            }
        }
        ```
    2.  **[Task 5.2]** `SeasonalEventSystem.ts`: 시즌별 특별 이벤트를 구현합니다.
    3.  **[Task 5.3]** `LimitedTimeEvent.ts`: 한정 시간 이벤트와 긴급성을 구현합니다.
    4.  **[Task 5.4]** `EventProgressTracker.ts`: 이벤트 진행 추적과 순위 시스템을 구현합니다.
    5.  **[Task 5.5]** **이벤트 시스템 테스트:** 모든 이벤트 타입이 정상 작동하고 보상이 지급되는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 적응형 난이도 조절

```typescript
// 플레이어 실력에 맞는 동적 콘텐츠 조정
export class AdaptiveDifficultyManager {
    private playerSkillProfile: PlayerSkillProfile;
    private difficultyModifiers: Map<string, number> = new Map();
    
    async adjustContentDifficulty(contentType: string, baseConfig: any): Promise<any> {
        const skillLevel = await this.calculatePlayerSkillLevel();
        const modifier = this.difficultyModifiers.get(contentType) || 1.0;
        
        switch (contentType) {
            case 'level_generation':
                return this.adjustLevelDifficulty(baseConfig, skillLevel, modifier);
            case 'mission_generation':
                return this.adjustMissionDifficulty(baseConfig, skillLevel, modifier);
            case 'reward_calculation':
                return this.adjustRewardAmounts(baseConfig, skillLevel, modifier);
        }
        
        return baseConfig;
    }
    
    private async calculatePlayerSkillLevel(): Promise<number> {
        const recentPerformance = await this.getRecentPerformance();
        
        const factors = {
            averageStars: recentPerformance.averageStars / 3.0,
            completionRate: recentPerformance.completionRate,
            averageMovesEfficiency: recentPerformance.averageMovesEfficiency,
            boosterUsageEfficiency: recentPerformance.boosterUsageEfficiency
        };
        
        // 가중평균으로 스킬 레벨 계산
        const skillLevel = 
            factors.averageStars * 0.3 +
            factors.completionRate * 0.3 +
            factors.averageMovesEfficiency * 0.2 +
            factors.boosterUsageEfficiency * 0.2;
        
        return Math.max(0.1, Math.min(1.0, skillLevel));
    }
}
```

### 4.2. 경제 밸런싱 시스템

```typescript
// 게임 경제의 자동 밸런싱
export class EconomyBalancer {
    private economyMetrics: EconomyMetrics;
    private balancingRules: BalancingRule[] = [];
    
    async analyzeAndBalance(): Promise<BalancingResult> {
        // 현재 경제 상태 분석
        const analysis = await this.analyzeEconomyHealth();
        
        const adjustments: EconomyAdjustment[] = [];
        
        // 인플레이션 확인
        if (analysis.inflationRate > 0.1) {
            adjustments.push({
                type: 'currency_sink',
                action: 'increase_shop_prices',
                magnitude: analysis.inflationRate * 0.5
            });
        }
        
        // 디플레이션 확인
        if (analysis.inflationRate < -0.05) {
            adjustments.push({
                type: 'currency_source',
                action: 'increase_reward_amounts',
                magnitude: Math.abs(analysis.inflationRate) * 0.3
            });
        }
        
        // 플레이어 참여도 기반 조정
        if (analysis.averageEngagement < 0.6) {
            adjustments.push({
                type: 'engagement_boost',
                action: 'increase_daily_rewards',
                magnitude: 0.2
            });
        }
        
        // 조정 사항 적용
        for (const adjustment of adjustments) {
            await this.applyEconomyAdjustment(adjustment);
        }
        
        return {
            adjustmentsMade: adjustments.length,
            adjustments: adjustments,
            newEconomyHealth: await this.analyzeEconomyHealth()
        };
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **설계 문서 완벽 준수:** `04-Progression-System-Design.md`에 정의된 모든 진행 메커니즘을 정확히 구현합니다.

2.  **데이터 무결성:** 플레이어 진행 데이터의 손실이나 손상을 방지하는 안전한 저장 시스템을 구축합니다.

3.  **성능 최적화:** 대량의 진행 데이터를 효율적으로 처리하고 쿼리하는 시스템을 구현합니다.

4.  **경제 밸런스:** 지속 가능한 게임 경제를 위한 자동 밸런싱 시스템을 구축합니다.

5.  **확장성 고려:** 새로운 월드, 이벤트, 보상 타입을 쉽게 추가할 수 있는 구조를 유지합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **진행 데이터 로딩:** 2초 이내 완료
- **보상 계산 및 지급:** 500ms 이내 완료  
- **미션 진행 추적:** 실시간 업데이트 100ms 이내
- **경제 데이터 분석:** 5초 이내 완료

### 6.2. 검증 기준
- 모든 진행 조건이 정확히 검증되고 처리됨
- 보상 계산이 일관되고 공정함
- 미션과 이벤트가 정확히 추적되고 완료됨
- 경제 밸런스가 자동으로 유지됨
- 다양한 플레이 스타일에 맞는 개인화된 콘텐츠 제공

이 구현 계획을 통해 Sweet Puzzle의 진행 시스템을 완성하여 플레이어에게 지속적인 동기부여와 만족스러운 진행 경험을 제공할 수 있을 것입니다.