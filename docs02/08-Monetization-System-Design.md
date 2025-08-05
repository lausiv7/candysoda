# 수익화 시스템 설계

## 개요

Sweet Puzzle 게임의 수익화 전략 및 시스템 설계서입니다. F2P(Free-to-Play) 모델을 기반으로 플레이어에게 가치를 제공하면서 지속 가능한 수익을 창출하는 다층적 수익화 시스템을 구축합니다. 광고, 인앱 구매, 구독, 시즌 패스 등을 통한 균형잡힌 수익화 전략을 제시합니다.

---

## 1. 💰 인앱 구매 시스템

### 가상 화폐 체계

#### 다층 화폐 구조
```typescript
// 화폐 타입 정의
export enum CurrencyType {
    COINS = 'coins',           // 기본 화폐 (게임 내 획득 가능)
    GEMS = 'gems',             // 프리미엄 화폐 (주로 구매)
    HEARTS = 'hearts',         // 생명 시스템
    KEYS = 'keys',             // 특별 콘텐츠 해제
    STARS = 'stars',           // 성취 화폐
    TOKENS = 'tokens'          // 이벤트 화폐
}

export interface Currency {
    type: CurrencyType;
    amount: number;
    lastUpdated: number;
    
    // 화폐별 제한사항
    maxAmount?: number;
    regenerationRate?: number;  // 시간당 자동 회복량 (하트용)
    regenerationCap?: number;   // 자동 회복 최대치
}

export interface CurrencyTransaction {
    id: string;
    playerId: string;
    currencyType: CurrencyType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: TransactionReason;
    timestamp: number;
    
    // 트랜잭션 메타데이터
    metadata: {
        source?: string;
        levelId?: string;
        purchaseId?: string;
        eventId?: string;
    };
}

// 화폐 관리 시스템
export class CurrencyManager {
    private static instance: CurrencyManager;
    private balances: Map<CurrencyType, Currency> = new Map();
    private transactionHistory: CurrencyTransaction[] = [];
    private regenerationTimers: Map<CurrencyType, number> = new Map();
    
    static getInstance(): CurrencyManager {
        if (!this.instance) {
            this.instance = new CurrencyManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.loadBalances();
        this.startRegenerationSystem();
        this.setupTransactionLogging();
    }
    
    async addCurrency(type: CurrencyType, amount: number, reason: TransactionReason, metadata?: any): Promise<boolean> {
        try {
            const currentBalance = this.getBalance(type);
            const currency = this.balances.get(type);
            
            if (!currency) {
                console.error(`Currency type ${type} not found`);
                return false;
            }
            
            // 최대 보유량 확인
            const newAmount = currentBalance + amount;
            const maxAmount = currency.maxAmount || Number.MAX_SAFE_INTEGER;
            
            if (newAmount > maxAmount) {
                console.warn(`Currency ${type} would exceed maximum (${maxAmount})`);
                return false;
            }
            
            // 트랜잭션 기록 생성
            const transaction: CurrencyTransaction = {
                id: this.generateTransactionId(),
                playerId: PlayerManager.getInstance().getCurrentPlayerId(),
                currencyType: type,
                amount: amount,
                balanceBefore: currentBalance,
                balanceAfter: newAmount,
                reason: reason,
                timestamp: Date.now(),
                metadata: metadata || {}
            };
            
            // 잔액 업데이트
            currency.amount = newAmount;
            currency.lastUpdated = Date.now();
            
            // 트랜잭션 로깅
            this.transactionHistory.push(transaction);
            await this.logTransaction(transaction);
            
            // 이벤트 발생
            EventBus.getInstance().emit('currency_added', {
                type: type,
                amount: amount,
                newBalance: newAmount,
                reason: reason
            });
            
            // 데이터 저장
            await this.saveBalances();
            
            return true;
        } catch (error) {
            console.error('Failed to add currency:', error);
            return false;
        }
    }
    
    async deductCurrency(type: CurrencyType, amount: number, reason: TransactionReason, metadata?: any): Promise<boolean> {
        try {
            const currentBalance = this.getBalance(type);
            
            if (currentBalance < amount) {
                console.warn(`Insufficient ${type}: required ${amount}, available ${currentBalance}`);
                return false;
            }
            
            return await this.addCurrency(type, -amount, reason, metadata);
        } catch (error) {
            console.error('Failed to deduct currency:', error);
            return false;
        }
    }
    
    private startRegenerationSystem(): void {
        // 하트 자동 회복 시스템
        const heartsRegeneration = setInterval(() => {
            const heartsCurrency = this.balances.get(CurrencyType.HEARTS);
            if (heartsCurrency && heartsCurrency.regenerationRate && heartsCurrency.regenerationCap) {
                const currentAmount = heartsCurrency.amount;
                const maxAmount = heartsCurrency.regenerationCap;
                
                if (currentAmount < maxAmount) {
                    const newAmount = Math.min(currentAmount + heartsCurrency.regenerationRate, maxAmount);
                    
                    if (newAmount > currentAmount) {
                        this.addCurrency(
                            CurrencyType.HEARTS, 
                            newAmount - currentAmount, 
                            TransactionReason.REGENERATION
                        );
                    }
                }
            }
        }, 60 * 60 * 1000); // 1시간마다
        
        this.regenerationTimers.set(CurrencyType.HEARTS, heartsRegeneration);
    }
    
    getBalance(type: CurrencyType): number {
        const currency = this.balances.get(type);
        return currency ? currency.amount : 0;
    }
    
    canAfford(cost: CurrencyCost[]): boolean {
        for (const costItem of cost) {
            if (this.getBalance(costItem.type) < costItem.amount) {
                return false;
            }
        }
        return true;
    }
    
    async processPurchase(cost: CurrencyCost[], reason: TransactionReason, metadata?: any): Promise<boolean> {
        if (!this.canAfford(cost)) {
            return false;
        }
        
        // 트랜잭션으로 모든 비용 차감
        const transaction = new CurrencyTransactionBatch();
        
        for (const costItem of cost) {
            transaction.addDeduction(costItem.type, costItem.amount, reason, metadata);
        }
        
        return await transaction.execute();
    }
}
```

### 구매 패키지 시스템

#### 동적 가격 책정
```typescript
// 구매 패키지 정의
export interface PurchasePackage {
    id: string;
    name: string;
    description: string;
    
    // 가격 정보
    basePrice: number;
    currency: string; // USD, KRW 등
    dynamicPricing?: DynamicPricingConfig;
    
    // 패키지 내용
    contents: PackageContent[];
    
    // 표시 정보
    displayInfo: {
        iconUrl: string;
        badgeText?: string; // "BEST VALUE", "LIMITED" 등
        highlightColor?: string;
        sortOrder: number;
    };
    
    // 구매 조건
    requirements?: PurchaseRequirement[];
    
    // 유효성
    availability: {
        startTime?: number;
        endTime?: number;
        purchaseLimit?: number;
        playerLevelMin?: number;
        playerLevelMax?: number;
    };
    
    // 개인화
    personalization?: PersonalizationConfig;
}

export interface PackageContent {
    type: 'currency' | 'item' | 'booster' | 'subscription';
    itemId: string;
    quantity: number;
    bonusMultiplier?: number; // 보너스 배율
}

// 동적 가격 책정 시스템
export class DynamicPricingManager {
    private static instance: DynamicPricingManager;
    private pricingModels: Map<string, PricingModel> = new Map();
    private playerSegments: Map<string, PlayerSegment> = new Map();
    
    static getInstance(): DynamicPricingManager {
        if (!this.instance) {
            this.instance = new DynamicPricingManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.setupPricingModels();
        this.loadPlayerSegments();
    }
    
    async calculatePrice(packageId: string, playerId: string): Promise<PriceCalculation> {
        const basePackage = await this.getPackageInfo(packageId);
        if (!basePackage) {
            throw new Error(`Package ${packageId} not found`);
        }
        
        const playerProfile = await this.getPlayerProfile(playerId);
        const playerSegment = this.determinePlayerSegment(playerProfile);
        
        let finalPrice = basePackage.basePrice;
        const adjustments: PriceAdjustment[] = [];
        
        // 지역별 가격 조정
        const regionAdjustment = this.calculateRegionAdjustment(basePackage.basePrice, playerProfile.country);
        if (regionAdjustment !== 1.0) {
            finalPrice *= regionAdjustment;
            adjustments.push({
                type: 'region',
                factor: regionAdjustment,
                reason: `Regional pricing for ${playerProfile.country}`
            });
        }
        
        // 플레이어 세그먼트별 조정
        const segmentAdjustment = this.calculateSegmentAdjustment(playerSegment, packageId);
        if (segmentAdjustment !== 1.0) {
            finalPrice *= segmentAdjustment;
            adjustments.push({
                type: 'segment',
                factor: segmentAdjustment,
                reason: `Segment-based pricing for ${playerSegment.name}`
            });
        }
        
        // LTV 기반 조정
        const ltvAdjustment = await this.calculateLTVBasedAdjustment(playerId, packageId);
        if (ltvAdjustment !== 1.0) {
            finalPrice *= ltvAdjustment;
            adjustments.push({
                type: 'ltv',
                factor: ltvAdjustment,
                reason: 'LTV-based pricing optimization'
            });
        }
        
        // 구매 이력 기반 조정
        const historyAdjustment = await this.calculateHistoryBasedAdjustment(playerId, packageId);
        if (historyAdjustment !== 1.0) {
            finalPrice *= historyAdjustment;
            adjustments.push({
                type: 'history',
                factor: historyAdjustment,
                reason: 'Purchase history-based adjustment'
            });
        }
        
        // 시간 기반 할인 (해피아워, 위크엔드 세일 등)
        const timeBasedAdjustment = this.calculateTimeBasedAdjustment();
        if (timeBasedAdjustment !== 1.0) {
            finalPrice *= timeBasedAdjustment;
            adjustments.push({
                type: 'time',
                factor: timeBasedAdjustment,
                reason: 'Time-based promotional pricing'
            });
        }
        
        return {
            packageId: packageId,
            playerId: playerId,
            basePrice: basePackage.basePrice,
            finalPrice: Math.round(finalPrice * 100) / 100, // 소수점 2자리 반올림
            adjustments: adjustments,
            currency: basePackage.currency,
            calculatedAt: Date.now(),
            validUntil: Date.now() + 15 * 60 * 1000 // 15분간 유효
        };
    }
    
    private determinePlayerSegment(playerProfile: PlayerProfile): PlayerSegment {
        // 지출 패턴 기반 세그멘테이션
        const totalSpent = playerProfile.totalSpent;
        const daysSinceInstall = playerProfile.daysSinceInstall;
        const averageSessionLength = playerProfile.averageSessionLength;
        const levelProgress = playerProfile.levelProgress;
        
        if (totalSpent >= 100) {
            return this.playerSegments.get('whale')!;
        } else if (totalSpent >= 20) {
            return this.playerSegments.get('dolphin')!;
        } else if (totalSpent > 0) {
            return this.playerSegments.get('minnow')!;
        } else {
            // 무료 사용자 중에서도 세분화
            if (averageSessionLength > 600 && levelProgress > 50) {
                return this.playerSegments.get('engaged_free')!;
            } else if (daysSinceInstall < 7) {
                return this.playerSegments.get('new_free')!;
            } else {
                return this.playerSegments.get('casual_free')!;
            }
        }
    }
    
    private async calculateLTVBasedAdjustment(playerId: string, packageId: string): Promise<number> {
        const predictedLTV = await PredictiveAnalytics.getInstance().predictPlayerLTV(playerId);
        
        if (predictedLTV.predictedLTV > 50) {
            // 높은 LTV 예측 플레이어에게는 프리미엄 가격 적용
            return 1.1;
        } else if (predictedLTV.predictedLTV < 5) {
            // 낮은 LTV 예측 플레이어에게는 할인 적용
            return 0.8;
        }
        
        return 1.0;
    }
    
    private setupPricingModels(): void {
        // 기본 모델들 설정
        this.pricingModels.set('regional', new RegionalPricingModel({
            baseCountry: 'US',
            adjustments: {
                'KR': 0.9,   // 한국 10% 할인
                'JP': 1.1,   // 일본 10% 할증
                'CN': 0.7,   // 중국 30% 할인
                'IN': 0.6,   // 인도 40% 할인
                'BR': 0.8    // 브라질 20% 할인
            }
        }));
        
        this.pricingModels.set('segment', new SegmentPricingModel({
            segments: {
                'whale': 1.0,
                'dolphin': 0.95,
                'minnow': 0.9,
                'engaged_free': 0.85,
                'new_free': 0.8,
                'casual_free': 0.9
            }
        }));
    }
}
```

---

## 2. 📺 광고 수익화 시스템

### 보상형 광고 최적화

#### 스마트 광고 배치
```typescript
// 광고 배치 관리자
export class AdPlacementManager {
    private static instance: AdPlacementManager;
    private adProviders: Map<string, AdProvider> = new Map();
    private placementConfigs: Map<string, AdPlacementConfig> = new Map();
    private playerAdProfile: PlayerAdProfile;
    private waterfallManager: AdWaterfallManager;
    
    static getInstance(): AdPlacementManager {
        if (!this.instance) {
            this.instance = new AdPlacementManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.setupAdProviders();
        this.setupPlacements();
        this.waterfallManager = new AdWaterfallManager();
        this.loadPlayerAdProfile();
    }
    
    private setupAdProviders(): void {
        // 주요 광고 네트워크 설정
        this.adProviders.set('admob', new AdMobProvider({
            appId: 'ca-app-pub-xxxxx',
            testMode: CC_DEBUG,
            gdprCompliant: true
        }));
        
        this.adProviders.set('unity', new UnityAdsProvider({
            gameId: 'xxxxx',
            testMode: CC_DEBUG
        }));
        
        this.adProviders.set('ironsource', new IronSourceProvider({
            appKey: 'xxxxx',
            userId: () => PlayerManager.getInstance().getCurrentPlayerId()
        }));
        
        this.adProviders.set('applovin', new AppLovinProvider({
            sdkKey: 'xxxxx',
            mediationProvider: 'max'
        }));
    }
    
    private setupPlacements(): void {
        // 레벨 실패 후 재시도 광고
        this.placementConfigs.set('level_retry', {
            id: 'level_retry',
            type: AdType.REWARDED_VIDEO,
            triggers: [AdTrigger.LEVEL_FAILED],
            cooldown: 0, // 즉시 표시 가능
            maxPerSession: 10,
            maxPerDay: 50,
            
            rewards: [
                { type: 'currency', currencyType: CurrencyType.HEARTS, amount: 1 },
                { type: 'moves', amount: 5 }
            ],
            
            // 개인화 설정
            personalization: {
                showProbability: 0.8,
                adaptiveRewards: true,
                playerSegmentModifiers: {
                    'stuck_player': { showProbability: 0.95, rewardMultiplier: 1.5 },
                    'new_player': { showProbability: 0.6, rewardMultiplier: 1.2 },
                    'returning_player': { showProbability: 0.9, rewardMultiplier: 1.3 }
                }
            }
        });
        
        // 하트 충전 광고
        this.placementConfigs.set('heart_refill', {
            id: 'heart_refill',
            type: AdType.REWARDED_VIDEO,
            triggers: [AdTrigger.HEARTS_DEPLETED],
            cooldown: 3 * 60 * 1000, // 3분 쿨다운
            maxPerSession: 5,
            maxPerDay: 20,
            
            rewards: [
                { type: 'currency', currencyType: CurrencyType.HEARTS, amount: 1 }
            ],
            
            personalization: {
                showProbability: 0.9,
                adaptiveRewards: false
            }
        });
        
        // 일일 보너스 2배 광고
        this.placementConfigs.set('daily_bonus_2x', {
            id: 'daily_bonus_2x',
            type: AdType.REWARDED_VIDEO,
            triggers: [AdTrigger.DAILY_BONUS_AVAILABLE],
            cooldown: 24 * 60 * 60 * 1000, // 24시간 쿨다운
            maxPerSession: 1,
            maxPerDay: 1,
            
            rewards: [
                { type: 'multiplier', target: 'daily_bonus', multiplier: 2 }
            ],
            
            personalization: {
                showProbability: 0.7,
                adaptiveRewards: false
            }
        });
        
        // 부스터 획득 광고
        this.placementConfigs.set('free_booster', {
            id: 'free_booster',
            type: AdType.REWARDED_VIDEO,
            triggers: [AdTrigger.SHOP_VISITED, AdTrigger.LEVEL_START],
            cooldown: 10 * 60 * 1000, // 10분 쿨다운
            maxPerSession: 3,
            maxPerDay: 10,
            
            rewards: [
                { type: 'item', itemId: 'random_booster', amount: 1 }
            ],
            
            personalization: {
                showProbability: 0.5,
                adaptiveRewards: true,
                playerSegmentModifiers: {
                    'booster_user': { showProbability: 0.8, rewardMultiplier: 1.2 }
                }
            }
        });
        
        // 인터스티셜 광고 (레벨 완료 후)
        this.placementConfigs.set('level_complete_interstitial', {
            id: 'level_complete_interstitial',
            type: AdType.INTERSTITIAL,
            triggers: [AdTrigger.LEVEL_COMPLETED],
            cooldown: 5 * 60 * 1000, // 5분 쿨다운
            maxPerSession: 4,
            maxPerDay: 15,
            
            // 표시 조건
            showConditions: {
                minLevelsCompleted: 3, // 최소 3레벨 완료 후
                maxConsecutiveShows: 2, // 연속 2회까지만
                skipIfRecentPurchase: 24 * 60 * 60 * 1000 // 최근 구매 후 24시간 스킵
            }
        });
    }
    
    async showAd(placementId: string, context?: AdContext): Promise<AdResult> {
        try {
            const placement = this.placementConfigs.get(placementId);
            if (!placement) {
                return { success: false, error: 'Placement not found' };
            }
            
            // 표시 가능 여부 확인
            const canShow = await this.canShowAd(placement, context);
            if (!canShow.allowed) {
                return { success: false, error: canShow.reason };
            }
            
            // 최적의 광고 제공자 선택
            const provider = await this.waterfallManager.selectProvider(placement);
            if (!provider) {
                return { success: false, error: 'No ad provider available' };
            }
            
            // 광고 표시
            const adResult = await provider.showAd(placement, context);
            
            // 결과 처리
            if (adResult.success) {
                await this.processAdCompletion(placement, adResult);
                
                // 분석 이벤트 전송
                AnalyticsManager.getInstance().trackAdInteraction(
                    placement.type,
                    provider.name,
                    placementId,
                    'completed',
                    adResult.revenue
                );
            }
            
            return adResult;
        } catch (error) {
            console.error(`Failed to show ad for placement ${placementId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    private async canShowAd(placement: AdPlacementConfig, context?: AdContext): Promise<CanShowResult> {
        // 쿨다운 확인
        const lastShown = this.playerAdProfile.getLastShown(placement.id);
        if (lastShown && Date.now() - lastShown < placement.cooldown) {
            return {
                allowed: false,
                reason: 'Placement is on cooldown'
            };
        }
        
        // 세션/일일 한도 확인
        const sessionCount = this.playerAdProfile.getSessionCount(placement.id);
        const dailyCount = this.playerAdProfile.getDailyCount(placement.id);
        
        if (sessionCount >= placement.maxPerSession) {
            return {
                allowed: false,
                reason: 'Session limit exceeded'
            };
        }
        
        if (dailyCount >= placement.maxPerDay) {
            return {
                allowed: false,
                reason: 'Daily limit exceeded'
            };
        }
        
        // 개인화 설정 확인
        if (placement.personalization) {
            const playerSegment = await this.getPlayerSegment();
            const segmentModifier = placement.personalization.playerSegmentModifiers?.[playerSegment];
            const showProbability = segmentModifier?.showProbability || placement.personalization.showProbability;
            
            if (Math.random() > showProbability) {
                return {
                    allowed: false,
                    reason: 'Personalization probability check failed'
                };
            }
        }
        
        // 특별 조건 확인 (인터스티셜의 경우)
        if (placement.showConditions) {
            const conditionsResult = await this.checkShowConditions(placement.showConditions, context);
            if (!conditionsResult.allowed) {
                return conditionsResult;
            }
        }
        
        return { allowed: true };
    }
    
    private async processAdCompletion(placement: AdPlacementConfig, adResult: AdResult): Promise<void> {
        // 보상 지급
        if (placement.rewards && adResult.watched) {
            for (const reward of placement.rewards) {
                await this.giveAdReward(reward, placement);
            }
        }
        
        // 플레이어 광고 프로필 업데이트
        this.playerAdProfile.recordAdView(placement.id, adResult);
        
        // 이벤트 발생
        EventBus.getInstance().emit('ad_completed', {
            placementId: placement.id,
            rewards: placement.rewards,
            revenue: adResult.revenue
        });
    }
    
    private async giveAdReward(reward: AdReward, placement: AdPlacementConfig): Promise<void> {
        switch (reward.type) {
            case 'currency':
                let amount = reward.amount;
                
                // 적응형 보상 적용
                if (placement.personalization?.adaptiveRewards) {
                    const playerSegment = await this.getPlayerSegment();
                    const segmentModifier = placement.personalization.playerSegmentModifiers?.[playerSegment];
                    
                    if (segmentModifier?.rewardMultiplier) {
                        amount = Math.floor(amount * segmentModifier.rewardMultiplier);
                    }
                }
                
                await CurrencyManager.getInstance().addCurrency(
                    reward.currencyType!,
                    amount,
                    TransactionReason.AD_REWARD,
                    { placementId: placement.id }
                );
                break;
                
            case 'item':
                await InventoryManager.getInstance().addItem(
                    reward.itemId!,
                    reward.amount,
                    'ad_reward'
                );
                break;
                
            case 'moves':
                GameManager.getInstance().addMoves(reward.amount);
                break;
                
            case 'multiplier':
                // 배율 보상 처리 (일일 보너스 2배 등)
                await this.applyMultiplierReward(reward);
                break;
        }
    }
}

// 광고 워터폴 관리자
export class AdWaterfallManager {
    private providerPriorities: Map<string, ProviderPriority[]> = new Map();
    private performanceData: Map<string, ProviderPerformance> = new Map();
    
    constructor() {
        this.setupWaterfalls();
    }
    
    async selectProvider(placement: AdPlacementConfig): Promise<AdProvider | null> {
        const priorities = this.providerPriorities.get(placement.type) || [];
        
        // 성능 데이터를 기반으로 우선순위 동적 조정
        const adjustedPriorities = this.adjustPrioritiesByPerformance(priorities, placement);
        
        // 워터폴 방식으로 제공자 선택
        for (const priority of adjustedPriorities) {
            const provider = AdPlacementManager.getInstance()['adProviders'].get(priority.providerId);
            
            if (provider && await provider.isAdAvailable(placement)) {
                return provider;
            }
        }
        
        return null;
    }
    
    private adjustPrioritiesByPerformance(
        priorities: ProviderPriority[], 
        placement: AdPlacementConfig
    ): ProviderPriority[] {
        return priorities.sort((a, b) => {
            const perfA = this.performanceData.get(a.providerId);
            const perfB = this.performanceData.get(b.providerId);
            
            if (!perfA || !perfB) {
                return a.priority - b.priority;
            }
            
            // eCPM 기반 정렬 (높은 eCPM 우선)
            const ecpmA = perfA.totalRevenue / Math.max(perfA.impressions, 1) * 1000;
            const ecpmB = perfB.totalRevenue / Math.max(perfB.impressions, 1) * 1000;
            
            // 채우기 비율도 고려
            const fillRateA = perfA.filled / Math.max(perfA.requests, 1);
            const fillRateB = perfB.filled / Math.max(perfB.requests, 1);
            
            // 종합 점수 계산 (eCPM 70% + 채우기 비율 30%)
            const scoreA = ecpmA * 0.7 + fillRateA * 100 * 0.3;
            const scoreB = ecpmB * 0.7 + fillRateB * 100 * 0.3;
            
            return scoreB - scoreA;
        });
    }
}
```

---

## 3. 📅 구독 및 시즌 패스

### 시즌 패스 시스템

#### 진행형 보상 구조
```typescript
// 시즌 패스 정의
export interface SeasonPass {
    id: string;
    name: string;
    description: string;
    
    // 시즌 정보
    seasonNumber: number;
    startTime: number;
    endTime: number;
    duration: number; // 밀리초
    
    // 가격 정보
    price: number;
    currency: string;
    discountedPrice?: number;
    
    // 진행 시스템
    maxTier: number;
    tierExperience: number[]; // 각 티어별 필요 경험치
    
    // 보상 트랙
    freeTrack: SeasonReward[];
    premiumTrack: SeasonReward[];
    
    // 특별 보상
    bonusRewards?: BonusReward[];
    
    // 시각적 요소
    theme: {
        name: string;
        colorScheme: string[];
        backgroundImage: string;
        musicTrack?: string;
    };
}

export interface SeasonReward {
    tier: number;
    rewards: RewardItem[];
    isMainReward: boolean; // 주요 보상 여부
    unlockConditions?: UnlockCondition[];
}

export interface PlayerSeasonProgress {
    playerId: string;
    seasonId: string;
    
    // 진행 상황
    currentTier: number;
    currentExperience: number;
    totalExperience: number;
    
    // 구매 정보
    premiumPurchased: boolean;
    purchaseDate?: number;
    
    // 보상 수령 상태
    claimedFreeRewards: Set<number>;
    claimedPremiumRewards: Set<number>;
    
    // 특별 진행
    bonusExperience: number;
    experienceMultiplier: number;
    
    // 통계
    dailyExperienceEarned: Map<string, number>; // 날짜별 경험치
    experienceSources: Map<string, number>; // 소스별 경험치
}

// 시즌 패스 관리자
export class SeasonPassManager {
    private static instance: SeasonPassManager;
    private currentSeason: SeasonPass | null = null;
    private playerProgress: PlayerSeasonProgress | null = null;
    private experienceMultipliers: Map<string, number> = new Map();
    
    static getInstance(): SeasonPassManager {
        if (!this.instance) {
            this.instance = new SeasonPassManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.loadCurrentSeason();
        this.loadPlayerProgress();
        this.setupExperienceMultipliers();
    }
    
    async addExperience(amount: number, source: string, metadata?: any): Promise<ExperienceResult> {
        if (!this.currentSeason || !this.playerProgress) {
            return { success: false, error: 'No active season' };
        }
        
        // 시즌 종료 확인
        if (Date.now() > this.currentSeason.endTime) {
            return { success: false, error: 'Season has ended' };
        }
        
        // 경험치 배율 적용
        let finalAmount = amount;
        const baseMultiplier = this.experienceMultipliers.get(source) || 1.0;
        const playerMultiplier = this.playerProgress.experienceMultiplier;
        
        finalAmount = Math.floor(finalAmount * baseMultiplier * playerMultiplier);
        
        // 보너스 경험치 적용
        if (this.playerProgress.bonusExperience > 0) {
            const bonusAmount = Math.min(finalAmount * 0.5, this.playerProgress.bonusExperience);
            finalAmount += bonusAmount;
            this.playerProgress.bonusExperience -= bonusAmount;
        }
        
        // 경험치 추가
        const previousTier = this.playerProgress.currentTier;
        const previousExperience = this.playerProgress.currentExperience;
        
        this.playerProgress.currentExperience += finalAmount;
        this.playerProgress.totalExperience += finalAmount;
        
        // 티어 업 확인
        const tierUpResult = this.checkTierUp();
        
        // 일일 경험치 기록
        const today = new Date().toDateString();
        const dailyExp = this.playerProgress.dailyExperienceEarned.get(today) || 0;
        this.playerProgress.dailyExperienceEarned.set(today, dailyExp + finalAmount);
        
        // 소스별 경험치 기록
        const sourceExp = this.playerProgress.experienceSources.get(source) || 0;
        this.playerProgress.experienceSources.set(source, sourceExp + finalAmount);
        
        // 데이터 저장
        await this.savePlayerProgress();
        
        // 분석 이벤트
        AnalyticsManager.getInstance().trackEvent('season_pass_experience_gained', {
            season_id: this.currentSeason.id,
            amount: finalAmount,
            source: source,
            current_tier: this.playerProgress.currentTier,
            tier_progress: this.calculateTierProgress()
        });
        
        // 이벤트 발생
        EventBus.getInstance().emit('season_pass_experience_gained', {
            amount: finalAmount,
            source: source,
            newTier: this.playerProgress.currentTier,
            tierUp: tierUpResult.tierUp,
            newRewards: tierUpResult.newRewards
        });
        
        return {
            success: true,
            experienceGained: finalAmount,
            newTier: this.playerProgress.currentTier,
            tierUp: tierUpResult.tierUp,
            availableRewards: tierUpResult.newRewards
        };
    }
    
    private checkTierUp(): TierUpResult {
        if (!this.currentSeason || !this.playerProgress) {
            return { tierUp: false, newRewards: [] };
        }
        
        const tierExperience = this.currentSeason.tierExperience;
        let currentTier = this.playerProgress.currentTier;
        let currentExp = this.playerProgress.currentExperience;
        const newRewards: AvailableReward[] = [];
        
        // 여러 티어를 한번에 올릴 수 있도록 루프
        while (currentTier < this.currentSeason.maxTier && currentExp >= tierExperience[currentTier]) {
            currentExp -= tierExperience[currentTier];
            currentTier++;
            
            // 새로운 보상 확인
            const freeReward = this.currentSeason.freeTrack.find(r => r.tier === currentTier);
            if (freeReward) {
                newRewards.push({
                    tier: currentTier,
                    track: 'free',
                    rewards: freeReward.rewards,
                    isMainReward: freeReward.isMainReward
                });
            }
            
            if (this.playerProgress.premiumPurchased) {
                const premiumReward = this.currentSeason.premiumTrack.find(r => r.tier === currentTier);
                if (premiumReward) {
                    newRewards.push({
                        tier: currentTier,
                        track: 'premium',
                        rewards: premiumReward.rewards,
                        isMainReward: premiumReward.isMainReward
                    });
                }
            }
        }
        
        // 진행 상황 업데이트
        const tierUp = currentTier > this.playerProgress.currentTier;
        this.playerProgress.currentTier = currentTier;
        this.playerProgress.currentExperience = currentExp;
        
        return { tierUp, newRewards };
    }
    
    async purchasePremiumPass(): Promise<PurchaseResult> {
        if (!this.currentSeason || !this.playerProgress) {
            return { success: false, error: 'No active season' };
        }
        
        if (this.playerProgress.premiumPurchased) {
            return { success: false, error: 'Premium pass already purchased' };
        }
        
        // 구매 처리
        const purchaseResult = await PurchaseManager.getInstance().processPurchase({
            productId: `season_pass_${this.currentSeason.id}`,
            price: this.currentSeason.price,
            currency: this.currentSeason.currency
        });
        
        if (!purchaseResult.success) {
            return purchaseResult;
        }
        
        // 프리미엄 패스 활성화
        this.playerProgress.premiumPurchased = true;
        this.playerProgress.purchaseDate = Date.now();
        
        // 지금까지의 프리미엄 보상들 해제
        const retroactiveRewards: AvailableReward[] = [];
        
        for (let tier = 1; tier <= this.playerProgress.currentTier; tier++) {
            const premiumReward = this.currentSeason.premiumTrack.find(r => r.tier === tier);
            if (premiumReward) {
                retroactiveRewards.push({
                    tier: tier,
                    track: 'premium',
                    rewards: premiumReward.rewards,
                    isMainReward: premiumReward.isMainReward
                });
            }
        }
        
        // 데이터 저장
        await this.savePlayerProgress();
        
        // 분석 이벤트
        AnalyticsManager.getInstance().trackPurchase(
            `season_pass_${this.currentSeason.id}`,
            'season_pass',
            this.currentSeason.price,
            this.currentSeason.currency,
            purchaseResult.transactionId!
        );
        
        // 이벤트 발생
        EventBus.getInstance().emit('season_pass_purchased', {
            seasonId: this.currentSeason.id,
            currentTier: this.playerProgress.currentTier,
            retroactiveRewards: retroactiveRewards
        });
        
        return {
            success: true,
            retroactiveRewards: retroactiveRewards
        };
    }
    
    async claimReward(tier: number, track: 'free' | 'premium'): Promise<ClaimResult> {
        if (!this.currentSeason || !this.playerProgress) {
            return { success: false, error: 'No active season' };
        }
        
        // 티어 도달 확인
        if (tier > this.playerProgress.currentTier) {
            return { success: false, error: 'Tier not reached' };
        }
        
        // 프리미엄 구매 확인
        if (track === 'premium' && !this.playerProgress.premiumPurchased) {
            return { success: false, error: 'Premium pass not purchased' };
        }
        
        // 이미 수령 확인
        const claimedSet = track === 'free' ? 
            this.playerProgress.claimedFreeRewards : 
            this.playerProgress.claimedPremiumRewards;
        
        if (claimedSet.has(tier)) {
            return { success: false, error: 'Reward already claimed' };
        }
        
        // 보상 찾기
        const rewardTrack = track === 'free' ? 
            this.currentSeason.freeTrack : 
            this.currentSeason.premiumTrack;
        
        const reward = rewardTrack.find(r => r.tier === tier);
        if (!reward) {
            return { success: false, error: 'Reward not found' };
        }
        
        // 보상 지급
        const giveRewardsResult = await RewardManager.getInstance().giveRewards(reward.rewards);
        if (!giveRewardsResult.success) {
            return giveRewardsResult;
        }
        
        // 수령 상태 업데이트
        claimedSet.add(tier);
        
        // 데이터 저장
        await this.savePlayerProgress();
        
        // 분석 이벤트
        AnalyticsManager.getInstance().trackEvent('season_pass_reward_claimed', {
            season_id: this.currentSeason.id,
            tier: tier,
            track: track,
            rewards: reward.rewards
        });
        
        return {
            success: true,
            rewards: reward.rewards
        };
    }
    
    private setupExperienceMultipliers(): void {
        // 경험치 소스별 배율 설정
        this.experienceMultipliers.set('level_complete', 1.0);
        this.experienceMultipliers.set('daily_mission', 2.0);
        this.experienceMultipliers.set('weekly_challenge', 3.0);
        this.experienceMultipliers.set('social_activity', 1.5);
        this.experienceMultipliers.set('special_event', 2.5);
        this.experienceMultipliers.set('purchase_bonus', 5.0);
    }
    
    getSeasonInfo(): SeasonInfo | null {
        if (!this.currentSeason || !this.playerProgress) {
            return null;
        }
        
        return {
            season: this.currentSeason,
            progress: this.playerProgress,
            timeRemaining: this.currentSeason.endTime - Date.now(),
            tierProgress: this.calculateTierProgress(),
            availableRewards: this.getAvailableRewards()
        };
    }
    
    private calculateTierProgress(): number {
        if (!this.currentSeason || !this.playerProgress) {
            return 0;
        }
        
        const currentTier = this.playerProgress.currentTier;
        if (currentTier >= this.currentSeason.maxTier) {
            return 1.0; // 최대 티어 달성
        }
        
        const tierExp = this.currentSeason.tierExperience[currentTier];
        const currentExp = this.playerProgress.currentExperience;
        
        return Math.min(currentExp / tierExp, 1.0);
    }
}
```

Sweet Puzzle의 수익화 시스템은 플레이어 경험을 해치지 않으면서도 지속 가능한 수익을 창출하는 균형잡힌 접근법을 제공합니다. 개인화된 가격 책정, 스마트한 광고 배치, 그리고 가치 있는 구독 서비스를 통해 모든 플레이어 세그먼트에게 적절한 수익화 옵션을 제공하며, 장기적인 비즈니스 성공을 위한 견고한 기반을 구축합니다.