# Monetization System Design 구현계획
Sweet Puzzle - 수익화 시스템 구현계획

## 1. 구현 개요

### 1.1 구현 목표
- 다층 수익화 모델 구축 (광고, IAP, 구독)
- 동적 가격 책정 시스템
- 개인화된 오퍼 엔진
- 수익 최적화 자동화

### 1.2 구현 범위
```
Phase 1: 기본 수익화 (5주)
├── IAP 시스템 구축
├── 광고 통합 (AdMob, Unity Ads)
├── 가상 화폐 시스템
└── 기본 상점 구현

Phase 2: 구독 시스템 (4주)
├── 시즌 패스 구현
├── VIP 멤버십 시스템
├── 자동 갱신 처리
└── 혜택 관리 시스템

Phase 3: 동적 가격 책정 (6주)
├── 가격 최적화 알고리즘
├── A/B 테스트 통합
├── 시장 세분화
└── 실시간 가격 조정

Phase 4: 개인화 오퍼 (5주)
├── 사용자 세분화
├── 맞춤형 번들 생성
├── 타이밍 최적화
└── 전환율 예측

Phase 5: 수익 분석 (3주)
├── 매출 대시보드
├── LTV 추적
├── 코호트 수익 분석
└── 예측 모델링
```

## 2. Phase 1: 기본 수익화 (5주)

### 2.1 IAP 시스템 구축

```typescript
// src/monetization/IAPManager.ts
export interface IAPProduct {
    id: string;
    type: 'consumable' | 'non_consumable' | 'subscription';
    price: number;
    localizedPrice: string;
    currency: string;
    title: string;
    description: string;
    rewards: Reward[];
    discountPercent?: number;
    limitedTime?: number;
    purchaseLimit?: number;
}

export interface PurchaseResult {
    success: boolean;
    productId: string;
    transactionId: string;
    receipt: string;
    error?: string;
}

export class IAPManager {
    private products = new Map<string, IAPProduct>();
    private purchaseQueue: string[] = [];
    private isProcessing = false;

    constructor(
        private storePlugin: any,
        private eventTracker: any,
        private userManager: any
    ) {}

    async initialize(): Promise<void> {
        await this.loadProducts();
        this.setupStoreListeners();
        await this.restorePurchases();
    }

    private async loadProducts(): Promise<void> {
        const productIds = [
            'coins_pack_small',
            'coins_pack_medium',
            'coins_pack_large',
            'gems_pack_small',
            'gems_pack_medium',
            'gems_pack_large',
            'starter_pack',
            'value_pack',
            'mega_pack',
            'remove_ads',
            'season_pass',
            'vip_membership'
        ];

        try {
            const products = await this.storePlugin.getProducts(productIds);
            
            products.forEach((product: any) => {
                this.products.set(product.id, {
                    id: product.id,
                    type: this.getProductType(product.id),
                    price: product.price,
                    localizedPrice: product.localizedPrice,
                    currency: product.currency,
                    title: product.title,
                    description: product.description,
                    rewards: this.getProductRewards(product.id)
                });
            });
        } catch (error) {
            console.error('Failed to load IAP products:', error);
        }
    }

    async purchaseProduct(productId: string): Promise<PurchaseResult> {
        if (this.isProcessing) {
            this.purchaseQueue.push(productId);
            return { success: false, productId, transactionId: '', receipt: '', error: 'Purchase queue full' };
        }

        this.isProcessing = true;
        
        try {
            const product = this.products.get(productId);
            if (!product) {
                throw new Error(`Product ${productId} not found`);
            }

            // 구매 전 검증
            await this.validatePurchase(productId);
            
            // 구매 이벤트 추적
            this.eventTracker.track('purchase_initiated', {
                product_id: productId,
                price: product.price,
                currency: product.currency
            });

            const result = await this.storePlugin.purchase(productId);
            
            if (result.success) {
                // 서버 검증
                const verified = await this.verifyPurchase(result);
                
                if (verified) {
                    // 보상 지급
                    await this.processPurchaseRewards(productId, result);
                    
                    this.eventTracker.track('purchase_completed', {
                        product_id: productId,
                        transaction_id: result.transactionId,
                        price: product.price,
                        currency: product.currency
                    });
                    
                    return result;
                } else {
                    throw new Error('Purchase verification failed');
                }
            } else {
                throw new Error(result.error || 'Purchase failed');
            }
        } catch (error) {
            console.error('Purchase failed:', error);
            
            this.eventTracker.track('purchase_failed', {
                product_id: productId,
                error: error.message
            });
            
            return {
                success: false,
                productId,
                transactionId: '',
                receipt: '',
                error: error.message
            };
        } finally {
            this.isProcessing = false;
            this.processQueue();
        }
    }

    private async verifyPurchase(result: PurchaseResult): Promise<boolean> {
        try {
            const response = await fetch('/api/purchases/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: result.transactionId,
                    receipt: result.receipt,
                    productId: result.productId
                })
            });
            
            const verification = await response.json();
            return verification.valid;
        } catch (error) {
            console.error('Purchase verification error:', error);
            return false;
        }
    }

    private async processPurchaseRewards(productId: string, result: PurchaseResult): Promise<void> {
        const product = this.products.get(productId);
        if (!product) return;

        for (const reward of product.rewards) {
            await this.userManager.addReward(reward);
        }
    }
}
```

### 2.2 광고 시스템 구축

```typescript
// src/monetization/AdManager.ts
export enum AdType {
    BANNER = 'banner',
    INTERSTITIAL = 'interstitial',
    REWARDED = 'rewarded',
    REWARDED_INTERSTITIAL = 'rewarded_interstitial'
}

export interface AdReward {
    type: string;
    amount: number;
}

export interface AdConfig {
    type: AdType;
    placement: string;
    frequency: number;
    cooldown: number;
    rewards?: AdReward[];
}

export class AdManager {
    private adNetworks: Map<string, any> = new Map();
    private adConfigs: Map<string, AdConfig> = new Map();
    private adCooldowns: Map<string, number> = new Map();
    private impressionCounts: Map<string, number> = new Map();

    constructor(
        private eventTracker: any,
        private userManager: any
    ) {}

    async initialize(): Promise<void> {
        await this.initializeAdMob();
        await this.initializeUnityAds();
        this.loadAdConfigs();
    }

    private async initializeAdMob(): Promise<void> {
        try {
            const admob = (window as any).admob;
            await admob.start();
            
            this.adNetworks.set('admob', {
                banner: admob.BannerAd,
                interstitial: admob.InterstitialAd,
                rewarded: admob.RewardedAd
            });
        } catch (error) {
            console.error('AdMob initialization failed:', error);
        }
    }

    private async initializeUnityAds(): Promise<void> {
        try {
            const unityAds = (window as any).UnityAds;
            await unityAds.initialize('your-game-id');
            
            this.adNetworks.set('unity', unityAds);
        } catch (error) {
            console.error('Unity Ads initialization failed:', error);
        }
    }

    async showAd(placement: string): Promise<boolean> {
        const config = this.adConfigs.get(placement);
        if (!config) {
            console.error(`Ad placement ${placement} not configured`);
            return false;
        }

        // 쿨다운 확인
        if (this.isOnCooldown(placement)) {
            return false;
        }

        // 빈도 제한 확인
        if (this.exceedsFrequencyLimit(placement)) {
            return false;
        }

        try {
            const success = await this.displayAd(config);
            
            if (success) {
                this.updateAdMetrics(placement);
                
                if (config.rewards) {
                    await this.processAdRewards(config.rewards);
                }
                
                this.eventTracker.track('ad_watched', {
                    placement,
                    ad_type: config.type,
                    reward_given: !!config.rewards
                });
            }
            
            return success;
        } catch (error) {
            console.error('Ad display failed:', error);
            
            this.eventTracker.track('ad_failed', {
                placement,
                ad_type: config.type,
                error: error.message
            });
            
            return false;
        }
    }

    private async displayAd(config: AdConfig): Promise<boolean> {
        const network = this.selectBestNetwork(config.type);
        if (!network) return false;

        switch (config.type) {
            case AdType.BANNER:
                return await this.showBannerAd(network);
            case AdType.INTERSTITIAL:
                return await this.showInterstitialAd(network);
            case AdType.REWARDED:
                return await this.showRewardedAd(network);
            default:
                return false;
        }
    }

    private selectBestNetwork(adType: AdType): any {
        // 광고 네트워크 선택 로직 (성능 기반)
        const admob = this.adNetworks.get('admob');
        const unity = this.adNetworks.get('unity');
        
        // 간단한 라운드 로빈 방식
        const random = Math.random();
        return random < 0.5 ? admob : unity;
    }

    private async processAdRewards(rewards: AdReward[]): Promise<void> {
        for (const reward of rewards) {
            await this.userManager.addReward({
                type: reward.type,
                amount: reward.amount
            });
        }
    }

    isAdAvailable(placement: string): boolean {
        return !this.isOnCooldown(placement) && !this.exceedsFrequencyLimit(placement);
    }

    private isOnCooldown(placement: string): boolean {
        const lastShown = this.adCooldowns.get(placement) || 0;
        const config = this.adConfigs.get(placement);
        return Date.now() - lastShown < (config?.cooldown || 0);
    }

    private exceedsFrequencyLimit(placement: string): boolean {
        const count = this.impressionCounts.get(placement) || 0;
        const config = this.adConfigs.get(placement);
        return count >= (config?.frequency || Infinity);
    }
}
```

## 3. Phase 2: 구독 시스템 (4주)

### 3.1 시즌 패스 구현

```typescript
// src/monetization/SeasonPass.ts
export interface SeasonPassTier {
    tier: number;
    xpRequired: number;
    freeRewards: Reward[];
    premiumRewards: Reward[];
    unlocked: boolean;
    claimed: boolean;
}

export interface SeasonPassData {
    id: string;
    name: string;
    startDate: number;
    endDate: number;
    price: number;
    currentXP: number;
    isPremiumActive: boolean;
    tiers: SeasonPassTier[];
}

export class SeasonPassManager {
    private currentSeason: SeasonPassData | null = null;

    constructor(
        private userManager: any,
        private eventTracker: any,
        private iapManager: IAPManager
    ) {}

    async loadCurrentSeason(): Promise<void> {
        try {
            const response = await fetch('/api/season-pass/current');
            const seasonData = await response.json();
            
            this.currentSeason = seasonData;
            await this.syncUserProgress();
        } catch (error) {
            console.error('Failed to load season pass:', error);
        }
    }

    async addXP(amount: number, source: string): Promise<void> {
        if (!this.currentSeason) return;

        const oldXP = this.currentSeason.currentXP;
        this.currentSeason.currentXP += amount;
        
        this.eventTracker.track('season_pass_xp_gained', {
            amount,
            source,
            total_xp: this.currentSeason.currentXP
        });

        // 새로운 티어 해금 확인
        const newTiersUnlocked = this.checkNewTiersUnlocked(oldXP);
        
        if (newTiersUnlocked.length > 0) {
            this.eventTracker.track('season_pass_tiers_unlocked', {
                tiers: newTiersUnlocked,
                total_xp: this.currentSeason.currentXP
            });
        }

        await this.saveProgress();
    }

    async claimReward(tier: number, isPremium: boolean = false): Promise<boolean> {
        if (!this.currentSeason) return false;

        const tierData = this.currentSeason.tiers.find(t => t.tier === tier);
        if (!tierData || !tierData.unlocked || tierData.claimed) {
            return false;
        }

        if (isPremium && !this.currentSeason.isPremiumActive) {
            return false;
        }

        const rewards = isPremium ? tierData.premiumRewards : tierData.freeRewards;
        
        for (const reward of rewards) {
            await this.userManager.addReward(reward);
        }

        tierData.claimed = true;
        
        this.eventTracker.track('season_pass_reward_claimed', {
            tier,
            is_premium: isPremium,
            rewards: rewards.map(r => ({ type: r.type, amount: r.amount }))
        });

        await this.saveProgress();
        return true;
    }

    async purchasePremium(): Promise<boolean> {
        if (!this.currentSeason || this.currentSeason.isPremiumActive) {
            return false;
        }

        const result = await this.iapManager.purchaseProduct('season_pass');
        
        if (result.success) {
            this.currentSeason.isPremiumActive = true;
            await this.saveProgress();
            
            this.eventTracker.track('season_pass_premium_purchased', {
                season_id: this.currentSeason.id,
                price: this.currentSeason.price
            });
            
            return true;
        }
        
        return false;
    }

    private checkNewTiersUnlocked(oldXP: number): number[] {
        if (!this.currentSeason) return [];

        const newTiers: number[] = [];
        
        for (const tier of this.currentSeason.tiers) {
            if (tier.xpRequired <= this.currentSeason.currentXP && 
                tier.xpRequired > oldXP && 
                !tier.unlocked) {
                tier.unlocked = true;
                newTiers.push(tier.tier);
            }
        }
        
        return newTiers;
    }

    getDaysRemaining(): number {
        if (!this.currentSeason) return 0;
        
        const now = Date.now();
        const remaining = this.currentSeason.endDate - now;
        return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
    }

    getProgressToNextTier(): { current: number; required: number; progress: number } {
        if (!this.currentSeason) return { current: 0, required: 0, progress: 0 };

        const nextTier = this.currentSeason.tiers.find(t => 
            t.xpRequired > this.currentSeason!.currentXP
        );

        if (!nextTier) {
            return { current: this.currentSeason.currentXP, required: this.currentSeason.currentXP, progress: 1 };
        }

        return {
            current: this.currentSeason.currentXP,
            required: nextTier.xpRequired,
            progress: this.currentSeason.currentXP / nextTier.xpRequired
        };
    }
}
```

## 4. Phase 3: 동적 가격 책정 (6주)

### 4.1 가격 최적화 시스템

```typescript
// src/monetization/PricingOptimizer.ts
export interface PricePoint {
    price: number;
    currency: string;
    conversionRate: number;
    revenue: number;
    sampleSize: number;
    confidence: number;
}

export interface PricingExperiment {
    id: string;
    productId: string;
    variants: PricePoint[];
    startDate: number;
    endDate: number;
    status: 'running' | 'completed' | 'paused';
    winner?: PricePoint;
}

export class PricingOptimizer {
    private experiments = new Map<string, PricingExperiment>();
    private userSegments = new Map<string, string>();

    constructor(
        private abTestManager: any,
        private analyticsClient: any,
        private eventTracker: any
    ) {}

    async optimizePrice(
        productId: string,
        userId: string
    ): Promise<number> {
        const userSegment = await this.getUserSegment(userId);
        const runningExperiment = this.getRunningExperiment(productId);
        
        if (runningExperiment) {
            return await this.getExperimentPrice(runningExperiment, userId);
        }

        return await this.getSegmentPrice(productId, userSegment);
    }

    async createPricingExperiment(
        productId: string,
        priceVariants: number[],
        duration: number
    ): Promise<string> {
        const experimentId = `price_${productId}_${Date.now()}`;
        
        const experiment: PricingExperiment = {
            id: experimentId,
            productId,
            variants: priceVariants.map(price => ({
                price,
                currency: 'USD',
                conversionRate: 0,
                revenue: 0,
                sampleSize: 0,
                confidence: 0
            })),
            startDate: Date.now(),
            endDate: Date.now() + duration,
            status: 'running'
        };

        this.experiments.set(experimentId, experiment);
        
        // A/B 테스트 시스템에 등록
        await this.abTestManager.createExperiment({
            name: `Price Optimization: ${productId}`,
            description: `Testing price points for ${productId}`,
            variants: priceVariants.map((price, index) => ({
                id: `price_${price}`,
                name: `$${price}`,
                traffic: 100 / priceVariants.length,
                config: { price }
            }))
        });

        this.eventTracker.track('pricing_experiment_created', {
            experiment_id: experimentId,
            product_id: productId,
            variants: priceVariants
        });

        return experimentId;
    }

    private async getExperimentPrice(
        experiment: PricingExperiment,
        userId: string
    ): Promise<number> {
        const variant = await this.abTestManager.getVariant(experiment.id, userId);
        const priceVariant = experiment.variants.find(v => 
            `price_${v.price}` === variant
        );
        
        return priceVariant?.price || experiment.variants[0].price;
    }

    private async getUserSegment(userId: string): Promise<string> {
        if (this.userSegments.has(userId)) {
            return this.userSegments.get(userId)!;
        }

        try {
            const response = await this.analyticsClient.get(`/users/${userId}/segment`);
            const segment = response.segment;
            
            this.userSegments.set(userId, segment);
            return segment;
        } catch (error) {
            console.error('Failed to get user segment:', error);
            return 'default';
        }
    }

    private async getSegmentPrice(productId: string, segment: string): Promise<number> {
        try {
            const response = await this.analyticsClient.get(`/pricing/${productId}/${segment}`);
            return response.optimalPrice;
        } catch (error) {
            console.error('Failed to get segment price:', error);
            return this.getDefaultPrice(productId);
        }
    }

    async updateExperimentResults(): Promise<void> {
        for (const experiment of this.experiments.values()) {
            if (experiment.status !== 'running') continue;

            try {
                const results = await this.abTestManager.getExperimentResults(experiment.id);
                
                experiment.variants.forEach((variant, index) => {
                    const result = results.variants[`price_${variant.price}`];
                    if (result) {
                        variant.conversionRate = result.conversionRate;
                        variant.revenue = result.revenue;
                        variant.sampleSize = result.sampleSize;
                        variant.confidence = result.confidence;
                    }
                });

                // 실험 종료 조건 확인
                if (this.shouldEndExperiment(experiment)) {
                    await this.endExperiment(experiment.id);
                }
            } catch (error) {
                console.error(`Failed to update experiment ${experiment.id}:`, error);
            }
        }
    }

    private shouldEndExperiment(experiment: PricingExperiment): boolean {
        // 시간 기반 종료
        if (Date.now() > experiment.endDate) {
            return true;
        }

        // 통계적 유의성 기반 종료
        const significantVariants = experiment.variants.filter(v => 
            v.confidence > 0.95 && v.sampleSize > 100
        );

        return significantVariants.length > 0;
    }

    private async endExperiment(experimentId: string): Promise<void> {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) return;

        experiment.status = 'completed';
        
        // 최적 가격 결정
        const winner = experiment.variants.reduce((best, current) => 
            current.revenue > best.revenue ? current : best
        );
        
        experiment.winner = winner;

        this.eventTracker.track('pricing_experiment_completed', {
            experiment_id: experimentId,
            product_id: experiment.productId,
            winning_price: winner.price,
            improvement: this.calculateImprovement(experiment.variants, winner)
        });

        // 최적 가격으로 업데이트
        await this.updateProductPrice(experiment.productId, winner.price);
    }

    private calculateImprovement(variants: PricePoint[], winner: PricePoint): number {
        const baseline = variants.find(v => v !== winner);
        if (!baseline) return 0;

        return ((winner.revenue - baseline.revenue) / baseline.revenue) * 100;
    }
}
```

## 5. Phase 4: 개인화 오퍼 (5주)

### 5.1 맞춤형 오퍼 엔진

```typescript
// src/monetization/OfferEngine.ts
export interface PersonalizedOffer {
    id: string;
    userId: string;
    type: 'bundle' | 'discount' | 'limited_time' | 'progression_boost';
    products: string[];
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    validUntil: number;
    targetSegment: string;
    conversionProbability: number;
    reason: string;
}

export interface OfferTrigger {
    event: string;
    conditions: Record<string, any>;
    cooldown: number;
    maxShows: number;
}

export class OfferEngine {
    private activeOffers = new Map<string, PersonalizedOffer[]>();
    private offerHistory = new Map<string, number[]>();
    private triggers: OfferTrigger[] = [];

    constructor(
        private userAnalytics: any,
        private pricingOptimizer: PricingOptimizer,
        private eventTracker: any
    ) {
        this.setupTriggers();
    }

    private setupTriggers(): void {
        this.triggers = [
            {
                event: 'level_failed',
                conditions: { consecutiveFails: 3 },
                cooldown: 3600000, // 1 hour
                maxShows: 3
            },
            {
                event: 'session_start',
                conditions: { daysSinceLastPurchase: 7 },
                cooldown: 86400000, // 1 day
                maxShows: 1
            },
            {
                event: 'coins_low',
                conditions: { coinsRemaining: { $lt: 100 } },
                cooldown: 1800000, // 30 minutes
                maxShows: 2
            },
            {
                event: 'progression_stuck',
                conditions: { sameLevel: { $gte: 5 } },
                cooldown: 7200000, // 2 hours
                maxShows: 1
            }
        ];
    }

    async generatePersonalizedOffer(
        userId: string,
        trigger: string,
        context: Record<string, any> = {}
    ): Promise<PersonalizedOffer | null> {
        try {
            const userProfile = await this.userAnalytics.getUserProfile(userId);
            const segment = await this.userAnalytics.getUserSegment(userId);
            
            const offerType = this.selectOfferType(trigger, userProfile, context);
            const products = await this.selectProducts(userId, offerType, userProfile);
            
            if (products.length === 0) return null;

            const { originalPrice, discountedPrice, discountPercent } = 
                await this.calculatePricing(userId, products, segment);

            const conversionProbability = await this.predictConversion(
                userId, offerType, discountPercent
            );

            const offer: PersonalizedOffer = {
                id: this.generateOfferId(),
                userId,
                type: offerType,
                products,
                originalPrice,
                discountedPrice,
                discountPercent,
                validUntil: Date.now() + this.getOfferDuration(offerType),
                targetSegment: segment,
                conversionProbability,
                reason: this.generateOfferReason(trigger, offerType)
            };

            // 오퍼 저장
            const userOffers = this.activeOffers.get(userId) || [];
            userOffers.push(offer);
            this.activeOffers.set(userId, userOffers);

            this.eventTracker.track('personalized_offer_generated', {
                offer_id: offer.id,
                user_id: userId,
                offer_type: offerType,
                trigger,
                conversion_probability: conversionProbability,
                discount_percent: discountPercent
            });

            return offer;
        } catch (error) {
            console.error('Failed to generate personalized offer:', error);
            return null;
        }
    }

    private selectOfferType(
        trigger: string,
        userProfile: any,
        context: Record<string, any>
    ): string {
        // 트리거 기반 오퍼 타입 결정
        switch (trigger) {
            case 'level_failed':
                return userProfile.powerUpUsage > 0.5 ? 'bundle' : 'progression_boost';
            case 'coins_low':
                return 'bundle';
            case 'session_start':
                return userProfile.purchaseHistory > 0 ? 'discount' : 'limited_time';
            case 'progression_stuck':
                return 'progression_boost';
            default:
                return 'bundle';
        }
    }

    private async selectProducts(
        userId: string,
        offerType: string,
        userProfile: any
    ): Promise<string[]> {
        const recommendations = await this.userAnalytics.recommendProducts(
            userId, offerType
        );

        // 사용자 행동 패턴에 따른 제품 선택
        switch (offerType) {
            case 'bundle':
                return this.createBundle(recommendations, userProfile);
            case 'progression_boost':
                return recommendations.filter((p: string) => 
                    p.includes('power_up') || p.includes('boost')
                ).slice(0, 3);
            case 'discount':
                return recommendations.slice(0, 1);
            default:
                return recommendations.slice(0, 2);
        }
    }

    private createBundle(recommendations: string[], userProfile: any): string[] {
        const bundle: string[] = [];
        
        // 코인 팩 추가 (사용 패턴 기반)
        if (userProfile.coinUsage > 0.7) {
            bundle.push('coins_pack_large');
        } else {
            bundle.push('coins_pack_medium');
        }
        
        // 파워업 추가 (선호도 기반)
        const preferredPowerUps = Object.entries(userProfile.powerUpPreferences)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 2)
            .map(([powerUp]) => `power_up_${powerUp}`);
        
        bundle.push(...preferredPowerUps);
        
        return bundle;
    }

    private async predictConversion(
        userId: string,
        offerType: string,
        discountPercent: number
    ): Promise<number> {
        try {
            const response = await fetch('/api/ml/predict-conversion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    offerType,
                    discountPercent
                })
            });
            
            const prediction = await response.json();
            return prediction.probability;
        } catch (error) {
            console.error('Conversion prediction failed:', error);
            // 기본 확률 반환 (할인율 기반)
            return Math.min(0.8, 0.1 + (discountPercent / 100) * 0.6);
        }
    }

    async processOfferInteraction(
        offerId: string,
        action: 'viewed' | 'clicked' | 'purchased' | 'dismissed'
    ): Promise<void> {
        const offer = this.findOffer(offerId);
        if (!offer) return;

        this.eventTracker.track(`offer_${action}`, {
            offer_id: offerId,
            user_id: offer.userId,
            offer_type: offer.type,
            discount_percent: offer.discountPercent,
            conversion_probability: offer.conversionProbability
        });

        if (action === 'purchased') {
            await this.processOfferPurchase(offer);
        }
    }

    private async processOfferPurchase(offer: PersonalizedOffer): Promise<void> {
        // 구매 처리
        for (const productId of offer.products) {
            // IAP 시스템을 통한 구매 처리는 별도로 진행
            // 여기서는 오퍼 관련 처리만 수행
        }

        // 오퍼 제거
        this.removeOffer(offer.id);
        
        // 구매 히스토리 업데이트
        const history = this.offerHistory.get(offer.userId) || [];
        history.push(Date.now());
        this.offerHistory.set(offer.userId, history);
    }

    private findOffer(offerId: string): PersonalizedOffer | null {
        for (const userOffers of this.activeOffers.values()) {
            const offer = userOffers.find(o => o.id === offerId);
            if (offer) return offer;
        }
        return null;
    }

    private removeOffer(offerId: string): void {
        for (const [userId, userOffers] of this.activeOffers.entries()) {
            const filteredOffers = userOffers.filter(o => o.id !== offerId);
            this.activeOffers.set(userId, filteredOffers);
        }
    }
}
```

## 6. Phase 5: 수익 분석 (3주)

### 6.1 수익 대시보드 및 분석

```typescript
// src/monetization/RevenueAnalytics.ts
export interface RevenueMetrics {
    totalRevenue: number;
    revenueBySource: Record<string, number>;
    arpu: number; // Average Revenue Per User
    arppu: number; // Average Revenue Per Paying User
    payingUserRate: number;
    ltv: number;
    cohortRevenue: CohortRevenueData[];
    topProducts: ProductRevenue[];
}

export interface CohortRevenueData {
    cohort: string;
    day1: number;
    day7: number;
    day14: number;
    day30: number;
    day60: number;
    day90: number;
}

export interface ProductRevenue {
    productId: string;
    revenue: number;
    units: number;
    conversionRate: number;
}

export class RevenueAnalytics {
    constructor(
        private analyticsClient: any,
        private eventTracker: any
    ) {}

    async getRevenueMetrics(
        startDate: Date,
        endDate: Date
    ): Promise<RevenueMetrics> {
        try {
            const response = await this.analyticsClient.post('/revenue/metrics', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });
            
            return response.metrics;
        } catch (error) {
            console.error('Failed to get revenue metrics:', error);
            throw error;
        }
    }

    async getLTVPrediction(userId: string): Promise<{
        predicted30Day: number;
        predicted90Day: number;
        predicted365Day: number;
        confidence: number;
    }> {
        try {
            const response = await this.analyticsClient.get(`/revenue/ltv-prediction/${userId}`);
            return response.prediction;
        } catch (error) {
            console.error('LTV prediction failed:', error);
            return {
                predicted30Day: 0,
                predicted90Day: 0,
                predicted365Day: 0,
                confidence: 0
            };
        }
    }

    async optimizeRevenue(): Promise<{
        recommendations: string[];
        potentialIncrease: number;
        confidence: number;
    }> {
        try {
            const response = await this.analyticsClient.post('/revenue/optimize');
            return response.optimization;
        } catch (error) {
            console.error('Revenue optimization failed:', error);
            return {
                recommendations: [],
                potentialIncrease: 0,
                confidence: 0
            };
        }
    }

    async trackRevenueEvent(
        userId: string,
        productId: string,
        amount: number,
        currency: string,
        source: string
    ): Promise<void> {
        this.eventTracker.track('revenue_generated', {
            user_id: userId,
            product_id: productId,
            amount,
            currency,
            source,
            timestamp: Date.now()
        });
    }

    async generateRevenueReport(
        startDate: Date,
        endDate: Date
    ): Promise<{
        summary: RevenueMetrics;
        trends: any[];
        insights: string[];
    }> {
        const metrics = await this.getRevenueMetrics(startDate, endDate);
        const trends = await this.getRevenueTrends(startDate, endDate);
        const insights = await this.generateInsights(metrics, trends);

        return {
            summary: metrics,
            trends,
            insights
        };
    }

    private async getRevenueTrends(startDate: Date, endDate: Date): Promise<any[]> {
        const response = await this.analyticsClient.post('/revenue/trends', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });
        
        return response.trends;
    }

    private async generateInsights(metrics: RevenueMetrics, trends: any[]): Promise<string[]> {
        const insights: string[] = [];

        // ARPU 분석
        if (metrics.arpu > 5) {
            insights.push('High ARPU indicates strong monetization efficiency');
        } else if (metrics.arpu < 1) {
            insights.push('Low ARPU suggests room for monetization improvement');
        }

        // 결제 유저 비율 분석
        if (metrics.payingUserRate > 0.05) {
            insights.push('Above-average conversion to paying users');
        } else if (metrics.payingUserRate < 0.02) {
            insights.push('Low paying user conversion - consider offer optimization');
        }

        // 수익 트렌드 분석
        const recentTrend = trends.slice(-7); // 최근 7일
        const trendDirection = this.calculateTrendDirection(recentTrend);
        
        if (trendDirection > 0.1) {
            insights.push('Revenue trending upward - current strategies are effective');
        } else if (trendDirection < -0.1) {
            insights.push('Revenue declining - review and adjust monetization strategy');
        }

        return insights;
    }

    private calculateTrendDirection(trendData: any[]): number {
        if (trendData.length < 2) return 0;
        
        const first = trendData[0].revenue;
        const last = trendData[trendData.length - 1].revenue;
        
        return (last - first) / first;
    }
}
```

## 7. 구현 우선순위 및 마일스톤

### 7.1 핵심 마일스톤
```
Week 1-5: 기본 수익화 구축
- IAP 시스템 완전 구현 및 테스트
- 광고 시스템 통합 (AdMob, Unity Ads)
- 가상 화폐 시스템 구축
- 기본 상점 UI/UX 완성

Week 6-9: 구독 시스템 구현
- 시즌 패스 전체 시스템 구축
- VIP 멤버십 기능 개발
- 자동 갱신 및 혜택 관리
- 구독 상태 동기화

Week 10-15: 동적 가격 최적화
- 가격 최적화 알고리즘 구현
- A/B 테스트 통합 및 자동화
- 시장 세분화 모델 구축
- 실시간 가격 조정 시스템

Week 16-20: 개인화 오퍼 엔진
- 사용자 세분화 및 행동 분석
- 맞춤형 번들 생성 엔진
- 타이밍 최적화 알고리즘
- 전환율 예측 모델

Week 21-23: 수익 분석 시스템
- 실시간 수익 대시보드
- LTV 추적 및 예측
- 코호트 수익 분석
- 자동 인사이트 생성
```

### 7.2 성공 지표
- IAP 전환율 > 3%
- 광고 시청률 > 80%
- 시즌 패스 구매율 > 15%
- 개인화 오퍼 전환율 > 12%
- 평균 결제 금액 > $8
- 30일 LTV > $15

### 7.3 기술 스택
- **결제**: Google Play Billing, Apple In-App Purchase
- **광고**: AdMob, Unity Ads, AppLovin
- **분석**: Firebase Analytics, 커스텀 분석 시스템
- **A/B 테스트**: Firebase Remote Config, 커스텀 실험 플랫폼
- **백엔드**: Node.js, MongoDB, Redis
- **ML**: Python/TensorFlow (가격 최적화, 전환 예측)