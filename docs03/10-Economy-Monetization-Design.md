# 경제/수익화 시스템 설계

## 문서 정보
- **문서명**: 경제/수익화 시스템 설계
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [경제 시스템 개요](#1-경제-시스템-개요)
2. [기술 스택](#2-기술-스택)
3. [게임 경제 아키텍처](#3-게임-경제-아키텍처)
4. [인게임 화폐 시스템](#4-인게임-화폐-시스템)
5. [수익화 모델](#5-수익화-모델)
6. [상점 및 구매 시스템](#6-상점-및-구매-시스템)
7. [보상 시스템](#7-보상-시스템)
8. [경제 밸런싱](#8-경제-밸런싱)
9. [사기 방지 시스템](#9-사기-방지-시스템)
10. [분석 및 최적화](#10-분석-및-최적화)

## 1. 경제 시스템 개요

### 1.1 핵심 목표
- **지속 가능한 F2P 모델**: 무료 플레이어와 유료 플레이어 간 균형
- **공정한 진행 곡선**: Pay-to-Win 방지 및 실력 기반 경쟁
- **다양한 수익화 채널**: IAP, 광고, 배틀패스, 구독 모델
- **플레이어 가치 최대화**: LTV 증가 및 이탈률 감소
- **투명한 경제 구조**: 플레이어가 이해하기 쉬운 가치 체계

### 1.2 경제 시스템 구성요소
```typescript
// [의도] 게임 경제의 전체적인 구조와 흐름 정의
// [책임] 화폐 간 교환 비율, 인플레이션 제어, 싱크 메커니즘 관리
interface EconomySystem {
  currencies: CurrencyManager;
  monetization: MonetizationManager;
  rewards: RewardSystem;
  marketplace: MarketplaceManager;
  analytics: EconomyAnalytics;
  
  // 경제 건강도 모니터링
  monitorEconomyHealth(): Promise<EconomyHealthMetrics>;
  // 인플레이션 제어
  controlInflation(): Promise<void>;
  // 플레이어 가치 계산
  calculatePlayerValue(playerId: string): Promise<PlayerEconomicValue>;
}
```

## 2. 기술 스택

### 2.1 결제 및 수익화 기술
- **Google Play Billing**: Android IAP 처리
- **Apple StoreKit**: iOS IAP 처리
- **Facebook Audience Network**: 광고 수익화
- **Unity Ads**: 크로스 플랫폼 광고
- **Firebase**: 수익화 분석 및 A/B 테스트

### 2.2 경제 데이터 관리
```typescript
// [의도] 경제 데이터의 안전하고 정확한 처리를 위한 인프라
// [책임] 거래 무결성 보장, 데이터 일관성 유지, 감사 로그 관리
interface EconomyDataInfrastructure {
  transactionProcessor: TransactionProcessor;
  auditLogger: AuditLogger;
  fraudDetector: FraudDetectionSystem;
  dataValidator: EconomyDataValidator;
  
  // 거래 처리 (원자적 보장)
  processTransaction(transaction: EconomyTransaction): Promise<TransactionResult>;
  // 데이터 일관성 검증
  validateDataIntegrity(): Promise<ValidationResult>;
  // 감사 로그 기록
  logEconomyEvent(event: EconomyEvent): Promise<void>;
}
```

## 3. 게임 경제 아키텍처

### 3.1 경제 시스템 아키텍처
```typescript
// [의도] 경제 시스템의 계층적 구조 및 데이터 흐름 관리
// [책임] 서버-클라이언트 동기화, 보안 검증, 상태 관리
class EconomyArchitecture {
  // 클라이언트 레이어 - 표시 및 기본 검증
  clientEconomy: {
    currencyDisplay: CurrencyDisplayManager;
    purchaseUI: PurchaseUIManager;
    rewardDisplay: RewardDisplayManager;
  };
  
  // 서버 레이어 - 핵심 경제 로직
  serverEconomy: {
    currencyManager: ServerCurrencyManager;
    transactionProcessor: TransactionProcessor;
    rewardCalculator: RewardCalculator;
    economyValidator: EconomyValidator;
  };
  
  // 클라우드 레이어 - 분석 및 최적화
  cloudEconomy: {
    economyAnalytics: EconomyAnalytics;
    pricingOptimizer: DynamicPricingAI;
    fraudDetection: FraudDetectionAI;
  };
  
  async synchronizeEconomy(playerId: string): Promise<void> {
    const serverState = await this.serverEconomy.currencyManager.getPlayerState(playerId);
    await this.clientEconomy.currencyDisplay.updateState(serverState);
  }
}
```

### 3.2 거래 처리 시스템
```typescript
// [의도] 모든 경제 거래의 안전하고 일관된 처리
// [책임] 거래 검증, 롤백 처리, 동시성 제어, 감사 로그
class TransactionProcessor {
  private transactionQueue: TransactionQueue;
  private validator: TransactionValidator;
  private auditLogger: AuditLogger;
  
  async processTransaction(transaction: EconomyTransaction): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    try {
      // 1. 거래 유효성 검증
      const validation = await this.validator.validate(transaction);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
      
      // 2. 거래 시작 로그
      await this.auditLogger.logTransactionStart(transactionId, transaction);
      
      // 3. 원자적 거래 실행
      const result = await this.executeAtomicTransaction(transactionId, transaction);
      
      // 4. 거래 완료 로그
      await this.auditLogger.logTransactionComplete(transactionId, result);
      
      return result;
      
    } catch (error) {
      // 5. 거래 실패 시 롤백
      await this.rollbackTransaction(transactionId, transaction);
      await this.auditLogger.logTransactionError(transactionId, error);
      
      return { success: false, error: error.message };
    }
  }
  
  private async executeAtomicTransaction(
    transactionId: string,
    transaction: EconomyTransaction
  ): Promise<TransactionResult> {
    const dbTransaction = await this.database.beginTransaction();
    
    try {
      // 화폐 차감
      await this.deductCurrency(dbTransaction, transaction.from);
      
      // 아이템/화폐 지급
      await this.grantRewards(dbTransaction, transaction.to);
      
      // 거래 기록 저장
      await this.saveTransactionRecord(dbTransaction, transactionId, transaction);
      
      await dbTransaction.commit();
      
      return { success: true, transactionId };
      
    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }
}
```

## 4. 인게임 화폐 시스템

### 4.1 다중 화폐 구조
```typescript
// [의도] 다양한 게임 화폐의 생태계 구성 및 교환 시스템
// [책임] 화폐 간 균형 유지, 인플레이션 방지, 싱크 메커니즘 관리
enum CurrencyType {
  GOLD = 'gold',           // 기본 화폐 (게임플레이로 획득)
  GEMS = 'gems',           // 프리미엄 화폐 (구매 또는 특별 보상)
  TROPHIES = 'trophies',   // 랭킹 화폐 (매칭에 사용)
  ARENA_POINTS = 'arena_points', // 아레나 포인트 (특별 상품 구매)
  SEASON_TOKENS = 'season_tokens' // 시즌 토큰 (배틀패스 진행)
}

interface CurrencyConfiguration {
  type: CurrencyType;
  maxAmount: number;
  earnRate: number;
  spendingSinks: SpendingSink[];
  exchangeRates: ExchangeRate[];
  inflationControls: InflationControl[];
}

class CurrencyManager {
  private currencies: Map<CurrencyType, CurrencyConfiguration>;
  private playerBalances: Map<string, PlayerCurrencyBalance>;
  private economyBalancer: EconomyBalancer;
  
  async addCurrency(
    playerId: string, 
    currencyType: CurrencyType, 
    amount: number,
    source: CurrencySource
  ): Promise<CurrencyResult> {
    const currentBalance = await this.getBalance(playerId, currencyType);
    const config = this.currencies.get(currencyType);
    
    // 최대 보유량 체크
    if (currentBalance + amount > config.maxAmount) {
      return { 
        success: false, 
        error: 'CURRENCY_CAP_EXCEEDED',
        maxAmount: config.maxAmount 
      };
    }
    
    // 화폐 지급
    const newBalance = await this.updateBalance(playerId, currencyType, amount);
    
    // 경제 지표 업데이트
    await this.economyBalancer.recordCurrencyInflux(currencyType, amount, source);
    
    return { success: true, newBalance };
  }
  
  async spendCurrency(
    playerId: string,
    currencyType: CurrencyType,
    amount: number,
    purpose: SpendingPurpose
  ): Promise<CurrencyResult> {
    const currentBalance = await this.getBalance(playerId, currencyType);
    
    if (currentBalance < amount) {
      return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }
    
    const newBalance = await this.updateBalance(playerId, currencyType, -amount);
    
    // 싱크 메커니즘 기록
    await this.economyBalancer.recordCurrencyOutflow(currencyType, amount, purpose);
    
    return { success: true, newBalance };
  }
}
```

### 4.2 화폐 획득 시스템
```typescript
// [의도] 다양한 게임플레이를 통한 화폐 획득 메커니즘
// [책임] 보상 균형 유지, 일일 한도 관리, 프로그레션 곡선 조절
class CurrencyEarningSystem {
  private dailyLimits: Map<CurrencyType, number>;
  private earningRates: Map<GameMode, CurrencyReward[]>;
  private bonusMultipliers: BonusMultiplierManager;
  
  async calculateBattleReward(battleResult: BattleResult): Promise<CurrencyReward[]> {
    const baseRewards: CurrencyReward[] = [];
    
    // 승리 보상
    if (battleResult.victory) {
      baseRewards.push({
        type: CurrencyType.GOLD,
        amount: this.calculateGoldReward(battleResult),
        source: 'BATTLE_VICTORY'
      });
      
      baseRewards.push({
        type: CurrencyType.TROPHIES,
        amount: this.calculateTrophyReward(battleResult),
        source: 'BATTLE_VICTORY'
      });
    }
    
    // 참가 보상 (패배해도 소량 지급)
    baseRewards.push({
      type: CurrencyType.GOLD,
      amount: Math.floor(this.calculateGoldReward(battleResult) * 0.3),
      source: 'BATTLE_PARTICIPATION'
    });
    
    // 성과 기반 보너스
    const performanceBonus = this.calculatePerformanceBonus(battleResult);
    baseRewards.push(...performanceBonus);
    
    // 멀티플라이어 적용
    const finalRewards = await this.applyMultipliers(baseRewards, battleResult.playerId);
    
    return finalRewards;
  }
  
  private calculateGoldReward(battleResult: BattleResult): number {
    const baseGold = 100;
    const trophyMultiplier = Math.max(1, battleResult.playerTrophies / 1000);
    const durationBonus = Math.min(2, battleResult.battleDuration / 180); // 최대 3분
    
    return Math.floor(baseGold * trophyMultiplier * durationBonus);
  }
  
  async processDailyRewards(playerId: string): Promise<CurrencyReward[]> {
    const dailyRewards: CurrencyReward[] = [
      { type: CurrencyType.GOLD, amount: 500, source: 'DAILY_LOGIN' },
      { type: CurrencyType.GEMS, amount: 10, source: 'DAILY_LOGIN' }
    ];
    
    // 연속 로그인 보너스
    const loginStreak = await this.getLoginStreak(playerId);
    const streakMultiplier = Math.min(2, 1 + (loginStreak - 1) * 0.1);
    
    for (const reward of dailyRewards) {
      reward.amount = Math.floor(reward.amount * streakMultiplier);
    }
    
    return dailyRewards;
  }
}
```

## 5. 수익화 모델

### 5.1 인앱 구매 (IAP) 시스템
```typescript
// [의도] 다양한 IAP 상품과 가격 정책을 통한 수익 극대화
// [책임] 상품 구성, 가격 최적화, 구매 플로우 관리
class IAPSystem {
  private productCatalog: Map<string, IAPProduct>;
  private pricingStrategy: DynamicPricingStrategy;
  private purchaseProcessor: PurchaseProcessor;
  
  async initializeIAPProducts(): Promise<void> {
    // 화폐 패키지
    this.addCurrencyPackages();
    
    // 배틀패스
    this.addBattlePassProducts();
    
    // 스페셜 오퍼
    this.addSpecialOffers();
    
    // 스킨 및 코스메틱
    this.addCosmeticProducts();
  }
  
  private addCurrencyPackages(): void {
    const packages = [
      {
        id: 'gems_starter',
        name: '스타터 젬 패키지',
        gems: 500,
        bonusGems: 0,
        priceUSD: 4.99,
        tier: 'starter'
      },
      {
        id: 'gems_popular',
        name: '인기 젬 패키지',
        gems: 1200,
        bonusGems: 300, // 25% 보너스
        priceUSD: 9.99,
        tier: 'popular',
        badge: 'MOST_POPULAR'
      },
      {
        id: 'gems_value',
        name: '가치 젬 패키지',
        gems: 2500,
        bonusGems: 800, // 32% 보너스
        priceUSD: 19.99,
        tier: 'value',
        badge: 'BEST_VALUE'
      },
      {
        id: 'gems_ultimate',
        name: '얼티밋 젬 패키지',
        gems: 6500,
        bonusGems: 2500, // 38% 보너스
        priceUSD: 49.99,
        tier: 'ultimate'
      }
    ];
    
    for (const pkg of packages) {
      this.productCatalog.set(pkg.id, this.createIAPProduct(pkg));
    }
  }
  
  async processPurchase(playerId: string, productId: string): Promise<PurchaseResult> {
    const product = this.productCatalog.get(productId);
    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    
    try {
      // 1. 플랫폼별 결제 처리
      const paymentResult = await this.purchaseProcessor.processPayment(playerId, product);
      
      if (!paymentResult.success) {
        return paymentResult;
      }
      
      // 2. 상품 지급
      await this.grantPurchaseRewards(playerId, product);
      
      // 3. 구매 기록
      await this.recordPurchase(playerId, product, paymentResult.transactionId);
      
      // 4. 분석 데이터 전송
      await this.trackPurchaseEvent(playerId, product);
      
      return { success: true, transactionId: paymentResult.transactionId };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  private async grantPurchaseRewards(playerId: string, product: IAPProduct): Promise<void> {
    for (const reward of product.rewards) {
      await this.currencyManager.addCurrency(
        playerId,
        reward.type,
        reward.amount,
        'IAP_PURCHASE'
      );
    }
  }
}
```

### 5.2 광고 수익화 시스템
```typescript
// [의도] 광고를 통한 추가 수익 창출 및 무료 플레이어 지원
// [책임] 광고 타이밍 최적화, 보상 밸런싱, 사용자 경험 보호
class AdMonetizationSystem {
  private adProviders: AdProvider[];
  private adPlacementStrategy: AdPlacementStrategy;
  private rewardCalculator: AdRewardCalculator;
  
  async showRewardedAd(playerId: string, context: AdContext): Promise<AdResult> {
    // 광고 시청 가능 여부 확인
    const canShowAd = await this.canShowRewardedAd(playerId, context);
    if (!canShowAd.eligible) {
      return { success: false, reason: canShowAd.reason };
    }
    
    // 최적 광고 제공자 선택
    const provider = await this.selectOptimalProvider(playerId);
    
    try {
      // 광고 로드 및 표시
      const adLoadResult = await provider.loadRewardedAd();
      if (!adLoadResult.success) {
        return { success: false, reason: 'AD_LOAD_FAILED' };
      }
      
      const adShowResult = await provider.showRewardedAd();
      if (!adShowResult.completed) {
        return { success: false, reason: 'AD_NOT_COMPLETED' };
      }
      
      // 보상 지급
      const rewards = await this.calculateAdRewards(context);
      await this.grantAdRewards(playerId, rewards);
      
      // 쿨다운 설정
      await this.setAdCooldown(playerId, context);
      
      return { 
        success: true, 
        rewards,
        nextAvailableTime: await this.getNextAdTime(playerId, context)
      };
      
    } catch (error) {
      return { success: false, reason: 'AD_ERROR', error: error.message };
    }
  }
  
  private async calculateAdRewards(context: AdContext): Promise<CurrencyReward[]> {
    const baseRewards: CurrencyReward[] = [];
    
    switch (context.placement) {
      case 'POST_BATTLE':
        baseRewards.push({
          type: CurrencyType.GOLD,
          amount: 100,
          source: 'AD_REWARD'
        });
        break;
        
      case 'CHEST_UNLOCK':
        baseRewards.push({
          type: CurrencyType.GEMS,
          amount: 5,
          source: 'AD_REWARD'
        });
        break;
        
      case 'CARD_UPGRADE':
        baseRewards.push({
          type: CurrencyType.GOLD,
          amount: 200,
          source: 'AD_REWARD'
        });
        break;
    }
    
    return baseRewards;
  }
  
  async optimizeAdPlacements(): Promise<AdPlacementOptimization> {
    const placementData = await this.collectPlacementData();
    const optimization = await this.adPlacementStrategy.optimize(placementData);
    
    return {
      recommendations: optimization.recommendations,
      expectedRevenueIncrease: optimization.expectedIncrease,
      userExperienceImpact: optimization.uxImpact
    };
  }
}
```

### 5.3 배틀패스 시스템
```typescript
// [의도] 시즌별 프로그레션을 통한 장기적 유저 참여 및 수익화
// [책임] 티어 진행 관리, 보상 밸런싱, 프리미엄 패스 가치 제공
class BattlePassSystem {
  private seasonConfig: SeasonConfiguration;
  private progressionTracker: ProgressionTracker;
  private rewardDispenser: RewardDispenser;
  
  async initializeSeason(seasonId: string): Promise<void> {
    this.seasonConfig = await this.loadSeasonConfig(seasonId);
    
    // 무료 티어 보상 설정
    this.setupFreeTierRewards();
    
    // 프리미엄 티어 보상 설정
    this.setupPremiumTierRewards();
    
    // 진행 요구사항 설정
    this.setupProgressionRequirements();
  }
  
  private setupFreeTierRewards(): void {
    const freeTiers = [
      { tier: 1, reward: { type: CurrencyType.GOLD, amount: 500 } },
      { tier: 2, reward: { type: 'CARD', cardId: 'common_archer', count: 5 } },
      { tier: 3, reward: { type: CurrencyType.GEMS, amount: 10 } },
      { tier: 5, reward: { type: 'CHEST', chestType: 'silver' } },
      { tier: 10, reward: { type: 'CARD', cardId: 'rare_dragon', count: 1 } },
      // ... 더 많은 티어
    ];
    
    for (const tier of freeTiers) {
      this.seasonConfig.freeTiers.set(tier.tier, tier.reward);
    }
  }
  
  private setupPremiumTierRewards(): void {
    const premiumTiers = [
      { tier: 1, reward: { type: CurrencyType.GOLD, amount: 1000 } },
      { tier: 2, reward: { type: CurrencyType.GEMS, amount: 50 } },
      { tier: 3, reward: { type: 'SKIN', skinId: 'knight_golden' } },
      { tier: 4, reward: { type: 'EMOTE', emoteId: 'victory_dance' } },
      { tier: 5, reward: { type: 'CHEST', chestType: 'gold' } },
      // ... 프리미엄 전용 보상
    ];
    
    for (const tier of premiumTiers) {
      this.seasonConfig.premiumTiers.set(tier.tier, tier.reward);
    }
  }
  
  async addBattlePassXP(playerId: string, xp: number, source: string): Promise<BattlePassResult> {
    const currentProgress = await this.progressionTracker.getProgress(playerId);
    const newXP = currentProgress.xp + xp;
    const newTier = this.calculateTierFromXP(newXP);
    
    // 티어 업 체크
    const tierUps = newTier - currentProgress.tier;
    const unclaimedRewards: BattlePassReward[] = [];
    
    if (tierUps > 0) {
      // 새로운 티어의 보상 확인
      for (let tier = currentProgress.tier + 1; tier <= newTier; tier++) {
        // 무료 보상
        const freeReward = this.seasonConfig.freeTiers.get(tier);
        if (freeReward) {
          unclaimedRewards.push({ tier, reward: freeReward, type: 'free' });
        }
        
        // 프리미엄 보상 (구매한 경우만)
        if (currentProgress.hasPremiumPass) {
          const premiumReward = this.seasonConfig.premiumTiers.get(tier);
          if (premiumReward) {
            unclaimedRewards.push({ tier, reward: premiumReward, type: 'premium' });
          }
        }
      }
    }
    
    // 진행도 업데이트
    await this.progressionTracker.updateProgress(playerId, newXP, newTier);
    
    return {
      previousTier: currentProgress.tier,
      newTier,
      xpGained: xp,
      totalXP: newXP,
      unclaimedRewards,
      source
    };
  }
  
  async purchasePremiumPass(playerId: string): Promise<PurchaseResult> {
    const currentProgress = await this.progressionTracker.getProgress(playerId);
    
    if (currentProgress.hasPremiumPass) {
      return { success: false, error: 'ALREADY_PURCHASED' };
    }
    
    // 구매 처리
    const purchaseResult = await this.processPremiumPassPurchase(playerId);
    if (!purchaseResult.success) {
      return purchaseResult;
    }
    
    // 프리미엄 플래그 설정
    await this.progressionTracker.setPremiumPass(playerId, true);
    
    // 이미 달성한 티어의 프리미엄 보상 지급
    const retroactiveRewards: BattlePassReward[] = [];
    for (let tier = 1; tier <= currentProgress.tier; tier++) {
      const premiumReward = this.seasonConfig.premiumTiers.get(tier);
      if (premiumReward) {
        retroactiveRewards.push({ tier, reward: premiumReward, type: 'premium' });
        await this.rewardDispenser.grantReward(playerId, premiumReward);
      }
    }
    
    return { 
      success: true, 
      retroactiveRewards,
      transactionId: purchaseResult.transactionId 
    };
  }
}
```

## 6. 상점 및 구매 시스템

### 6.1 동적 상점 시스템
```typescript
// [의도] 플레이어별 맞춤 상품 진열 및 동적 가격 조정
// [책임] 상품 로테이션, 개인화 추천, 할인 정책 관리
class DynamicShopSystem {
  private playerProfiler: PlayerProfiler;
  private priceOptimizer: PriceOptimizer;
  private inventoryManager: ShopInventoryManager;
  
  async generatePersonalizedShop(playerId: string): Promise<PersonalizedShop> {
    const playerProfile = await this.playerProfiler.getProfile(playerId);
    const playerProgress = await this.getPlayerProgress(playerId);
    
    const shop: PersonalizedShop = {
      featuredOffers: await this.generateFeaturedOffers(playerProfile),
      dailyDeals: await this.generateDailyDeals(playerProfile),
      cardShop: await this.generateCardShop(playerProgress),
      currencyPackages: await this.generateCurrencyPackages(playerProfile),
      specialOffers: await this.generateSpecialOffers(playerProfile)
    };
    
    return shop;
  }
  
  private async generateFeaturedOffers(profile: PlayerProfile): Promise<ShopOffer[]> {
    const offers: ShopOffer[] = [];
    
    // 플레이어 선호도 기반 상품 선택
    const preferredCategories = profile.preferences.categories;
    
    for (const category of preferredCategories.slice(0, 3)) {
      const baseOffer = await this.getBaseOfferForCategory(category);
      const personalizedOffer = await this.personalizeOffer(baseOffer, profile);
      offers.push(personalizedOffer);
    }
    
    return offers;
  }
  
  private async personalizeOffer(baseOffer: ShopOffer, profile: PlayerProfile): Promise<ShopOffer> {
    // 가격 개인화
    const personalizedPrice = await this.priceOptimizer.optimizePrice(
      baseOffer.basePrice,
      profile.spendingBehavior
    );
    
    // 할인율 계산
    const discountPercentage = Math.round((1 - personalizedPrice / baseOffer.basePrice) * 100);
    
    return {
      ...baseOffer,
      personalizedPrice,
      discountPercentage,
      timeRemaining: this.calculateOfferDuration(profile),
      purchaseLimit: this.calculatePurchaseLimit(profile)
    };
  }
  
  async processShopPurchase(
    playerId: string, 
    offerId: string
  ): Promise<ShopPurchaseResult> {
    const offer = await this.getOfferById(offerId);
    const playerCurrency = await this.getCurrencyBalance(playerId);
    
    // 구매 가능성 검증
    const validation = await this.validatePurchase(playerId, offer, playerCurrency);
    if (!validation.canPurchase) {
      return { success: false, error: validation.error };
    }
    
    // 화폐 차감
    await this.deductCurrency(playerId, offer.currency, offer.price);
    
    // 상품 지급
    await this.grantPurchaseItems(playerId, offer.items);
    
    // 구매 한도 업데이트
    await this.updatePurchaseLimit(playerId, offerId);
    
    // 구매 이벤트 추적
    await this.trackPurchaseEvent(playerId, offer);
    
    return { success: true, purchasedItems: offer.items };
  }
}
```

### 6.2 카드 상점 시스템
```typescript
// [의도] 카드 수집 및 업그레이드를 위한 전용 상점 운영
// [책임] 카드 로테이션, 희귀도별 출현율, 진행도 기반 필터링
class CardShopSystem {
  private cardDatabase: CardDatabase;
  private rotationScheduler: RotationScheduler;
  private rarityManager: RarityManager;
  
  async generateDailyCardShop(playerId: string): Promise<CardShopInventory> {
    const playerLevel = await this.getPlayerLevel(playerId);
    const availableCards = await this.getAvailableCards(playerLevel);
    
    const inventory: CardShopInventory = {
      commonCards: await this.selectCommonCards(availableCards, 8),
      rareCards: await this.selectRareCards(availableCards, 3),
      epicCards: await this.selectEpicCards(availableCards, 1),
      legendaryCard: await this.selectLegendaryCard(availableCards, playerLevel),
      refreshCost: this.calculateRefreshCost(playerId),
      nextFreeRefresh: await this.getNextFreeRefreshTime(playerId)
    };
    
    return inventory;
  }
  
  private async selectCommonCards(availableCards: Card[], count: number): Promise<CardShopItem[]> {
    const commonCards = availableCards.filter(card => card.rarity === 'common');
    const selectedCards = this.randomSelect(commonCards, count);
    
    return selectedCards.map(card => ({
      cardId: card.id,
      quantity: this.getCardQuantity(card.rarity),
      price: this.getCardPrice(card.rarity),
      currency: CurrencyType.GOLD
    }));
  }
  
  private async selectRareCards(availableCards: Card[], count: number): Promise<CardShopItem[]> {
    const rareCards = availableCards.filter(card => card.rarity === 'rare');
    const selectedCards = this.randomSelect(rareCards, count);
    
    return selectedCards.map(card => ({
      cardId: card.id,
      quantity: this.getCardQuantity(card.rarity),
      price: this.getCardPrice(card.rarity),
      currency: CurrencyType.GOLD
    }));
  }
  
  private getCardPrice(rarity: CardRarity): number {
    const basePrices = {
      common: 10,
      rare: 50,
      epic: 500,
      legendary: 20000
    };
    
    return basePrices[rarity];
  }
  
  private getCardQuantity(rarity: CardRarity): number {
    const quantities = {
      common: 5,
      rare: 3,
      epic: 1,
      legendary: 1
    };
    
    return quantities[rarity];
  }
  
  async refreshCardShop(playerId: string, useGems: boolean = false): Promise<RefreshResult> {
    const refreshCost = await this.calculateRefreshCost(playerId);
    
    if (useGems) {
      // 젬으로 즉시 새로고침
      const gemBalance = await this.getCurrencyBalance(playerId, CurrencyType.GEMS);
      if (gemBalance < refreshCost.gems) {
        return { success: false, error: 'INSUFFICIENT_GEMS' };
      }
      
      await this.deductCurrency(playerId, CurrencyType.GEMS, refreshCost.gems);
    } else {
      // 무료 새로고침 시간 체크
      const canRefreshFree = await this.canRefreshForFree(playerId);
      if (!canRefreshFree) {
        return { success: false, error: 'REFRESH_ON_COOLDOWN' };
      }
      
      await this.setFreeRefreshCooldown(playerId);
    }
    
    // 새 상점 인벤토리 생성
    const newInventory = await this.generateDailyCardShop(playerId);
    
    return { success: true, newInventory };
  }
}
```

## 7. 보상 시스템

### 7.1 보상 계산 엔진
```typescript
// [의도] 다양한 게임 활동에 대한 공정하고 균형잡힌 보상 제공
// [책임] 보상 공식 관리, 난이도 조절, 진행도 기반 스케일링
class RewardCalculationEngine {
  private rewardFormulas: Map<RewardType, RewardFormula>;
  private difficultyScaler: DifficultyScaler;
  private progressionCurves: ProgressionCurveManager;
  
  async calculateBattleRewards(battleData: BattleData): Promise<RewardBundle> {
    const baseRewards = await this.calculateBaseRewards(battleData);
    const modifiedRewards = await this.applyModifiers(baseRewards, battleData);
    const finalRewards = await this.applyProgressionScaling(modifiedRewards, battleData.playerId);
    
    return {
      primary: finalRewards.primary,
      bonus: finalRewards.bonus,
      streak: await this.calculateStreakBonus(battleData),
      first_win: await this.calculateFirstWinBonus(battleData)
    };
  }
  
  private async calculateBaseRewards(battleData: BattleData): Promise<BaseRewards> {
    const rewards: BaseRewards = {
      gold: 0,
      trophies: 0,
      experience: 0,
      cards: []
    };
    
    // 골드 계산
    rewards.gold = this.calculateGoldReward(battleData);
    
    // 트로피 계산
    if (battleData.victory) {
      rewards.trophies = await this.calculateTrophyGain(battleData);
    } else {
      rewards.trophies = await this.calculateTrophyLoss(battleData);
    }
    
    // 경험치 계산
    rewards.experience = this.calculateExperienceReward(battleData);
    
    // 카드 보상 (승리 시만)
    if (battleData.victory) {
      rewards.cards = await this.generateCardRewards(battleData);
    }
    
    return rewards;
  }
  
  private calculateGoldReward(battleData: BattleData): number {
    const baseGold = 100;
    const arenaMultiplier = this.getArenaMultiplier(battleData.arena);
    const durationBonus = this.getDurationBonus(battleData.battleDuration);
    const performanceBonus = this.getPerformanceBonus(battleData.performance);
    
    return Math.floor(
      baseGold * arenaMultiplier * durationBonus * performanceBonus
    );
  }
  
  private async calculateTrophyGain(battleData: BattleData): Promise<number> {
    const baseTrophies = 30;
    const skillDifference = battleData.opponentTrophies - battleData.playerTrophies;
    const difficultyMultiplier = this.calculateDifficultyMultiplier(skillDifference);
    
    // ELO 기반 트로피 계산
    const expectedWinRate = this.calculateExpectedWinRate(skillDifference);
    const trophyGain = Math.round(baseTrophies * (1.5 - expectedWinRate) * difficultyMultiplier);
    
    return Math.max(10, Math.min(50, trophyGain)); // 10-50 범위로 제한
  }
  
  private async generateCardRewards(battleData: BattleData): Promise<CardReward[]> {
    const cardRewards: CardReward[] = [];
    const rewardCount = this.getCardRewardCount(battleData.arena);
    
    for (let i = 0; i < rewardCount; i++) {
      const card = await this.selectRandomCard(battleData.arena);
      cardRewards.push({
        cardId: card.id,
        quantity: this.getCardQuantity(card.rarity),
        rarity: card.rarity
      });
    }
    
    return cardRewards;
  }
}
```

### 7.2 일일/주간 미션 시스템
```typescript
// [의도] 정기적인 목표 제공을 통한 플레이어 참여도 증진
// [책임] 미션 생성, 진행도 추적, 보상 지급, 난이도 조절
class MissionSystem {
  private missionTemplates: MissionTemplate[];
  private progressTracker: MissionProgressTracker;
  private rewardDispenser: RewardDispenser;
  
  async generateDailyMissions(playerId: string): Promise<Mission[]> {
    const playerProfile = await this.getPlayerProfile(playerId);
    const missionPool = await this.getDailyMissionPool(playerProfile.level);
    
    // 3개의 일일 미션 선택
    const selectedMissions = this.selectMissions(missionPool, 3, playerProfile);
    
    const missions: Mission[] = [];
    for (const template of selectedMissions) {
      const mission = await this.createMissionFromTemplate(template, playerProfile);
      missions.push(mission);
    }
    
    return missions;
  }
  
  private getDailyMissionPool(playerLevel: number): MissionTemplate[] {
    return [
      // 전투 관련 미션
      {
        id: 'win_battles',
        type: 'BATTLE',
        objective: 'WIN_BATTLES',
        targetCount: this.scaleMissionTarget(3, playerLevel),
        rewards: [
          { type: CurrencyType.GOLD, amount: 500 },
          { type: CurrencyType.GEMS, amount: 10 }
        ]
      },
      {
        id: 'play_battles',
        type: 'BATTLE',
        objective: 'PLAY_BATTLES',
        targetCount: this.scaleMissionTarget(5, playerLevel),
        rewards: [
          { type: CurrencyType.GOLD, amount: 300 }
        ]
      },
      
      // 카드 관련 미션
      {
        id: 'upgrade_cards',
        type: 'CARD',
        objective: 'UPGRADE_CARDS',
        targetCount: 2,
        rewards: [
          { type: CurrencyType.GOLD, amount: 400 },
          { type: 'CARD_TOKENS', amount: 50 }
        ]
      },
      
      // 수집 관련 미션
      {
        id: 'collect_gold',
        type: 'COLLECTION',
        objective: 'COLLECT_GOLD',
        targetCount: this.scaleMissionTarget(2000, playerLevel),
        rewards: [
          { type: CurrencyType.GEMS, amount: 15 }
        ]
      },
      
      // 소셜 관련 미션
      {
        id: 'clan_battles',
        type: 'SOCIAL',
        objective: 'CLAN_BATTLE_PARTICIPATION',
        targetCount: 1,
        rewards: [
          { type: CurrencyType.CLAN_COINS, amount: 100 }
        ]
      }
    ];
  }
  
  async generateWeeklyMissions(playerId: string): Promise<Mission[]> {
    const playerProfile = await this.getPlayerProfile(playerId);
    const weeklyPool = await this.getWeeklyMissionPool(playerProfile);
    
    // 5개의 주간 미션 선택 (더 어렵고 보상이 큰 미션들)
    const selectedMissions = this.selectMissions(weeklyPool, 5, playerProfile);
    
    return selectedMissions.map(template => 
      this.createMissionFromTemplate(template, playerProfile)
    );
  }
  
  async updateMissionProgress(
    playerId: string, 
    eventType: GameEventType, 
    eventData: GameEventData
  ): Promise<MissionProgressUpdate[]> {
    const activeMissions = await this.getActiveMissions(playerId);
    const updates: MissionProgressUpdate[] = [];
    
    for (const mission of activeMissions) {
      if (this.missionAppliesTo(mission, eventType, eventData)) {
        const progressDelta = this.calculateProgressDelta(mission, eventData);
        const newProgress = await this.progressTracker.addProgress(
          playerId, 
          mission.id, 
          progressDelta
        );
        
        updates.push({
          missionId: mission.id,
          previousProgress: newProgress - progressDelta,
          newProgress: newProgress,
          isCompleted: newProgress >= mission.targetCount
        });
        
        // 미션 완료 시 보상 지급
        if (newProgress >= mission.targetCount && !mission.isCompleted) {
          await this.completeMission(playerId, mission);
        }
      }
    }
    
    return updates;
  }
  
  private async completeMission(playerId: string, mission: Mission): Promise<void> {
    // 미션 완료 표시
    await this.progressTracker.markMissionComplete(playerId, mission.id);
    
    // 보상 지급
    for (const reward of mission.rewards) {
      await this.rewardDispenser.grantReward(playerId, reward);
    }
    
    // 완료 이벤트 추적
    await this.trackMissionCompletionEvent(playerId, mission);
    
    // 연속 완료 보너스 체크
    await this.checkStreakBonus(playerId);
  }
}
```

## 8. 경제 밸런싱

### 8.1 경제 모니터링 시스템
```typescript
// [의도] 게임 경제의 건강도를 실시간으로 모니터링하고 균형 유지
// [책임] 인플레이션 추적, 화폐 유통량 분석, 불균형 탐지
class EconomyMonitoringSystem {
  private inflationTracker: InflationTracker;
  private currencyAnalyzer: CurrencyFlowAnalyzer;
  private balanceDetector: EconomyBalanceDetector;
  
  async monitorEconomyHealth(): Promise<EconomyHealthReport> {
    const report: EconomyHealthReport = {
      timestamp: Date.now(),
      inflationRate: await this.calculateInflationRate(),
      currencyVelocity: await this.calculateCurrencyVelocity(),
      supplyDemandBalance: await this.analyzeSupplyDemand(),
      playerSegmentAnalysis: await this.analyzePlayerSegments(),
      recommendations: []
    };
    
    // 경제 이상 징후 탐지
    const anomalies = await this.detectEconomicAnomalies(report);
    report.anomalies = anomalies;
    
    // 개선 권장사항 생성
    report.recommendations = await this.generateRecommendations(report);
    
    return report;
  }
  
  private async calculateInflationRate(): Promise<InflationMetrics> {
    const currentPeriod = await this.getCurrencyMetrics(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const previousPeriod = await this.getCurrencyMetrics(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    return {
      goldInflation: this.calculateCurrencyInflation('gold', currentPeriod, previousPeriod),
      gemInflation: this.calculateCurrencyInflation('gems', currentPeriod, previousPeriod),
      overallInflation: this.calculateOverallInflation(currentPeriod, previousPeriod)
    };
  }
  
  private async analyzeSupplyDemand(): Promise<SupplyDemandAnalysis> {
    const goldFlow = await this.currencyAnalyzer.analyzeCurrencyFlow('gold');
    const gemFlow = await this.currencyAnalyzer.analyzeCurrencyFlow('gems');
    
    return {
      gold: {
        supply: goldFlow.totalEarned,
        demand: goldFlow.totalSpent,
        balance: goldFlow.totalEarned / goldFlow.totalSpent,
        trend: this.calculateTrend(goldFlow.historicalData)
      },
      gems: {
        supply: gemFlow.totalEarned,
        demand: gemFlow.totalSpent,
        balance: gemFlow.totalEarned / gemFlow.totalSpent,
        trend: this.calculateTrend(gemFlow.historicalData)
      }
    };
  }
  
  async adjustEconomyParameters(adjustments: EconomyAdjustment[]): Promise<void> {
    for (const adjustment of adjustments) {
      switch (adjustment.type) {
        case 'REWARD_MULTIPLIER':
          await this.adjustRewardMultipliers(adjustment.parameters);
          break;
        case 'SINK_ADJUSTMENT':
          await this.adjustCurrencySinks(adjustment.parameters);
          break;
        case 'PRICE_MODIFICATION':
          await this.adjustPrices(adjustment.parameters);
          break;
      }
    }
    
    // 조정사항 로그
    await this.logEconomyAdjustments(adjustments);
  }
}
```

### 8.2 동적 가격 조정 시스템
```typescript
// [의도] 시장 상황과 플레이어 행동에 따른 자동 가격 최적화
// [책임] 수요-공급 분석, 가격 탄력성 계산, 수익 최적화
class DynamicPricingSystem {
  private demandAnalyzer: DemandAnalyzer;
  private elasticityCalculator: PriceElasticityCalculator;
  private revenueOptimizer: RevenueOptimizer;
  
  async optimizePricing(productId: string): Promise<PricingOptimization> {
    const currentPrice = await this.getCurrentPrice(productId);
    const demandData = await this.demandAnalyzer.analyzeDemand(productId);
    const elasticity = await this.elasticityCalculator.calculate(productId);
    
    // 최적 가격 계산
    const optimalPrice = await this.calculateOptimalPrice(
      currentPrice,
      demandData,
      elasticity
    );
    
    // A/B 테스트 설정
    const testConfiguration = await this.setupPriceTest(productId, currentPrice, optimalPrice);
    
    return {
      currentPrice,
      recommendedPrice: optimalPrice,
      expectedRevenueChange: await this.calculateRevenueImpact(optimalPrice, currentPrice),
      confidence: elasticity.confidence,
      testConfiguration
    };
  }
  
  private async calculateOptimalPrice(
    currentPrice: number,
    demandData: DemandData,
    elasticity: PriceElasticity
  ): Promise<number> {
    // 가격 탄력성을 이용한 최적 가격 계산
    const marginalCost = 0; // 디지털 상품의 경우 한계비용 0
    const optimalMarkup = -1 / (elasticity.coefficient + 1);
    
    let optimalPrice = marginalCost * (1 + optimalMarkup);
    
    // 시장 상황 반영
    if (demandData.trend === 'increasing') {
      optimalPrice *= 1.05; // 5% 가격 인상
    } else if (demandData.trend === 'decreasing') {
      optimalPrice *= 0.95; // 5% 가격 인하
    }
    
    // 가격 변동 제한 (±20%)
    const minPrice = currentPrice * 0.8;
    const maxPrice = currentPrice * 1.2;
    
    return Math.max(minPrice, Math.min(maxPrice, optimalPrice));
  }
  
  async implementPersonalizedPricing(playerId: string): Promise<PersonalizedPricing> {
    const playerProfile = await this.getPlayerProfile(playerId);
    const spendingBehavior = await this.analyzeSpendingBehavior(playerId);
    const sensitivity = await this.calculatePriceSensitivity(spendingBehavior);
    
    const personalizedPrices: Map<string, number> = new Map();
    
    for (const productId of this.getPersonalizableProducts()) {
      const basePrice = await this.getBasePrice(productId);
      const personalizedPrice = this.adjustPriceForPlayer(
        basePrice,
        sensitivity,
        playerProfile
      );
      
      personalizedPrices.set(productId, personalizedPrice);
    }
    
    return {
      playerId,
      prices: personalizedPrices,
      discountLevel: this.calculateDiscountLevel(sensitivity),
      validUntil: Date.now() + 24 * 60 * 60 * 1000 // 24시간
    };
  }
}
```

## 9. 사기 방지 시스템

### 9.1 부정행위 탐지 시스템
```typescript
// [의도] 경제 관련 부정행위와 사기를 실시간으로 탐지하고 차단
// [책임] 패턴 분석, 이상거래 탐지, 자동 차단, 증거 수집
class FraudDetectionSystem {
  private patternAnalyzer: PatternAnalyzer;
  private anomalyDetector: AnomalyDetector;
  private riskScorer: TransactionRiskScorer;
  
  async analyzeTransaction(transaction: EconomyTransaction): Promise<FraudAnalysis> {
    const riskScore = await this.riskScorer.calculateRisk(transaction);
    const patterns = await this.patternAnalyzer.analyzePatterns(transaction);
    const anomalies = await this.anomalyDetector.detectAnomalies(transaction);
    
    const analysis: FraudAnalysis = {
      transactionId: transaction.id,
      riskScore,
      riskLevel: this.categorizeRisk(riskScore),
      suspiciousPatterns: patterns.suspicious,
      anomalies,
      recommendedAction: this.determineAction(riskScore, patterns, anomalies)
    };
    
    // 고위험 거래 자동 차단
    if (analysis.riskLevel === 'HIGH') {
      await this.blockTransaction(transaction);
      await this.flagPlayerForReview(transaction.playerId);
    }
    
    return analysis;
  }
  
  private async detectSuspiciousPatterns(playerId: string): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];
    const playerHistory = await this.getPlayerTransactionHistory(playerId);
    
    // 비정상적인 구매 패턴 탐지
    const rapidPurchases = this.detectRapidPurchases(playerHistory);
    if (rapidPurchases.detected) {
      patterns.push({
        type: 'RAPID_PURCHASES',
        severity: 'MEDIUM',
        evidence: rapidPurchases.evidence
      });
    }
    
    // 화폐 생성 이상 패턴
    const currencyAnomalies = this.detectCurrencyAnomalies(playerHistory);
    if (currencyAnomalies.detected) {
      patterns.push({
        type: 'CURRENCY_ANOMALY',
        severity: 'HIGH',
        evidence: currencyAnomalies.evidence
      });
    }
    
    // 계정 공유 의혹
    const accountSharing = await this.detectAccountSharing(playerId);
    if (accountSharing.detected) {
      patterns.push({
        type: 'ACCOUNT_SHARING',
        severity: 'MEDIUM',
        evidence: accountSharing.evidence
      });
    }
    
    return patterns;
  }
  
  async implementSecurityMeasures(): Promise<void> {
    // 거래 한도 설정
    await this.setTransactionLimits();
    
    // 실시간 모니터링 시작
    await this.startRealTimeMonitoring();
    
    // 머신러닝 모델 업데이트
    await this.updateFraudDetectionModels();
  }
  
  private async setTransactionLimits(): Promise<void> {
    const limits = {
      maxDailySpending: 1000, // USD
      maxPurchaseFrequency: 10, // per hour
      maxCurrencyTransfer: 100000, // gold per transaction
      maxAccountValue: 10000 // USD equivalent
    };
    
    await this.saveTransactionLimits(limits);
  }
}
```

### 9.2 보안 결제 시스템
```typescript
// [의도] 결제 과정의 보안성을 극대화하고 사기 결제 방지
// [책임] 결제 검증, 환불 정책 관리, 플랫폼 연동 보안
class SecurePaymentSystem {
  private paymentValidator: PaymentValidator;
  private refundManager: RefundManager;
  private receiptVerifier: ReceiptVerifier;
  
  async processSecurePayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    try {
      // 1. 결제 요청 검증
      const validation = await this.paymentValidator.validate(paymentRequest);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
      
      // 2. 플랫폼별 결제 처리
      const platformResult = await this.processPlatformPayment(paymentRequest);
      if (!platformResult.success) {
        return platformResult;
      }
      
      // 3. 영수증 검증
      const receiptValid = await this.receiptVerifier.verify(
        platformResult.receipt,
        paymentRequest.platform
      );
      
      if (!receiptValid) {
        await this.rollbackPayment(platformResult.transactionId);
        return { success: false, error: 'RECEIPT_VERIFICATION_FAILED' };
      }
      
      // 4. 상품 지급
      await this.grantPurchasedItems(paymentRequest.playerId, paymentRequest.productId);
      
      // 5. 결제 기록 저장
      await this.recordPayment(paymentRequest, platformResult);
      
      return { 
        success: true, 
        transactionId: platformResult.transactionId,
        receipt: platformResult.receipt 
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async handleRefundRequest(refundRequest: RefundRequest): Promise<RefundResult> {
    // 환불 정책 확인
    const eligibility = await this.checkRefundEligibility(refundRequest);
    if (!eligibility.eligible) {
      return { success: false, reason: eligibility.reason };
    }
    
    // 원본 결제 정보 조회
    const originalPayment = await this.getPaymentRecord(refundRequest.transactionId);
    
    // 지급된 아이템 회수
    await this.revokeGrantedItems(
      refundRequest.playerId,
      originalPayment.productId
    );
    
    // 플랫폼 환불 처리
    const platformRefund = await this.processPlatformRefund(refundRequest);
    
    // 환불 기록 저장
    await this.recordRefund(refundRequest, platformRefund);
    
    return { success: true, refundId: platformRefund.refundId };
  }
  
  private async checkRefundEligibility(request: RefundRequest): Promise<RefundEligibility> {
    const payment = await this.getPaymentRecord(request.transactionId);
    const now = Date.now();
    const paymentAge = now - payment.timestamp;
    
    // 48시간 이내 환불 가능
    if (paymentAge > 48 * 60 * 60 * 1000) {
      return { eligible: false, reason: 'REFUND_PERIOD_EXPIRED' };
    }
    
    // 이미 환불된 거래 체크
    if (payment.refunded) {
      return { eligible: false, reason: 'ALREADY_REFUNDED' };
    }
    
    // 상품 사용 여부 체크
    const itemsUsed = await this.checkItemUsage(request.playerId, payment.productId);
    if (itemsUsed) {
      return { eligible: false, reason: 'ITEMS_ALREADY_USED' };
    }
    
    return { eligible: true };
  }
}
```

## 10. 분석 및 최적화

### 10.1 수익화 분석 시스템
```typescript
// [의도] 수익화 전략의 효과를 측정하고 최적화 방향 제시
// [책임] KPI 추적, 코호트 분석, 수익 예측, 최적화 권장사항
class MonetizationAnalytics {
  private kpiTracker: KPITracker;
  private cohortAnalyzer: CohortAnalyzer;
  private revenuePredictor: RevenuePredictor;
  
  async generateMonetizationReport(): Promise<MonetizationReport> {
    const report: MonetizationReport = {
      overview: await this.generateOverview(),
      revenueMetrics: await this.calculateRevenueMetrics(),
      playerSegmentation: await this.analyzePlayerSegments(),
      productPerformance: await this.analyzeProductPerformance(),
      recommendations: await this.generateOptimizationRecommendations()
    };
    
    return report;
  }
  
  private async calculateRevenueMetrics(): Promise<RevenueMetrics> {
    const timeRange = { start: Date.now() - 30 * 24 * 60 * 60 * 1000, end: Date.now() };
    
    const metrics = {
      totalRevenue: await this.getTotalRevenue(timeRange),
      arpu: await this.calculateARPU(timeRange),
      arppu: await this.calculateARPPU(timeRange),
      conversionRate: await this.calculateConversionRate(timeRange),
      ltv: await this.calculateLTV(timeRange),
      revenueBySource: await this.getRevenueBySource(timeRange)
    };
    
    return metrics;
  }
  
  private async analyzePlayerSegments(): Promise<PlayerSegmentAnalysis> {
    const segments = await this.segmentPlayers();
    const analysis: PlayerSegmentAnalysis = {};
    
    for (const segment of segments) {
      analysis[segment.name] = {
        playerCount: segment.players.length,
        totalRevenue: await this.getSegmentRevenue(segment),
        arpu: await this.calculateSegmentARPU(segment),
        retentionRate: await this.calculateSegmentRetention(segment),
        topProducts: await this.getSegmentTopProducts(segment)
      };
    }
    
    return analysis;
  }
  
  private async segmentPlayers(): Promise<PlayerSegment[]> {
    const allPlayers = await this.getAllPlayers();
    
    return [
      {
        name: 'whales',
        players: allPlayers.filter(p => p.totalSpent > 100),
        criteria: 'total_spent > 100'
      },
      {
        name: 'dolphins',
        players: allPlayers.filter(p => p.totalSpent > 10 && p.totalSpent <= 100),
        criteria: '10 < total_spent <= 100'
      },
      {
        name: 'minnows',
        players: allPlayers.filter(p => p.totalSpent > 0 && p.totalSpent <= 10),
        criteria: '0 < total_spent <= 10'
      },
      {
        name: 'free_players',
        players: allPlayers.filter(p => p.totalSpent === 0),
        criteria: 'total_spent = 0'
      }
    ];
  }
  
  async optimizeMonetization(): Promise<OptimizationStrategy> {
    const currentMetrics = await this.calculateRevenueMetrics();
    const benchmarks = await this.getIndustryBenchmarks();
    const gaps = this.identifyPerformanceGaps(currentMetrics, benchmarks);
    
    const strategy: OptimizationStrategy = {
      priorityAreas: this.identifyPriorityAreas(gaps),
      recommendations: await this.generateActionableRecommendations(gaps),
      expectedImpact: await this.estimateOptimizationImpact(gaps),
      timeline: this.createImplementationTimeline()
    };
    
    return strategy;
  }
}
```

### 10.2 실시간 대시보드 시스템
```typescript
// [의도] 경제 및 수익화 지표를 실시간으로 모니터링
// [책임] 데이터 시각화, 알림 설정, 트렌드 추적, 의사결정 지원
class MonetizationDashboard {
  private dataStreamer: RealTimeDataStreamer;
  private chartGenerator: ChartGenerator;
  private alertManager: AlertManager;
  
  async initializeDashboard(): Promise<DashboardConfiguration> {
    const config: DashboardConfiguration = {
      widgets: await this.setupDashboardWidgets(),
      refreshInterval: 60000, // 1분
      alertRules: await this.setupAlertRules(),
      dataRetention: 90 * 24 * 60 * 60 * 1000 // 90일
    };
    
    await this.startDataStreaming();
    
    return config;
  }
  
  private async setupDashboardWidgets(): Promise<DashboardWidget[]> {
    return [
      {
        id: 'revenue_overview',
        type: 'CHART',
        title: '실시간 수익 현황',
        chartType: 'LINE',
        dataSource: 'revenue_stream',
        refreshRate: 30000
      },
      {
        id: 'conversion_funnel',
        type: 'FUNNEL',
        title: '구매 전환 퍼널',
        stages: ['view', 'click', 'purchase'],
        dataSource: 'conversion_events'
      },
      {
        id: 'top_products',
        type: 'TABLE',
        title: '인기 상품 순위',
        columns: ['product', 'revenue', 'sales_count'],
        dataSource: 'product_performance'
      },
      {
        id: 'player_segments',
        type: 'PIE_CHART',
        title: '플레이어 세그먼트별 수익',
        dataSource: 'segment_revenue'
      },
      {
        id: 'kpi_summary',
        type: 'METRICS',
        title: '핵심 지표 요약',
        metrics: ['ARPU', 'ARPPU', 'Conversion Rate', 'LTV'],
        dataSource: 'kpi_metrics'
      }
    ];
  }
  
  private async setupAlertRules(): Promise<AlertRule[]> {
    return [
      {
        id: 'revenue_drop',
        condition: 'hourly_revenue < previous_hour_revenue * 0.7',
        severity: 'HIGH',
        message: '시간당 수익이 30% 이상 감소했습니다',
        actions: ['EMAIL_NOTIFICATION', 'SLACK_ALERT']
      },
      {
        id: 'conversion_drop',
        condition: 'conversion_rate < 0.02',
        severity: 'MEDIUM',
        message: '구매 전환율이 2% 미만으로 떨어졌습니다',
        actions: ['EMAIL_NOTIFICATION']
      },
      {
        id: 'payment_failures',
        condition: 'payment_failure_rate > 0.05',
        severity: 'HIGH',
        message: '결제 실패율이 5%를 초과했습니다',
        actions: ['EMAIL_NOTIFICATION', 'AUTO_INVESTIGATION']
      }
    ];
  }
  
  async generateInsights(): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];
    
    // 수익 트렌드 분석
    const revenueTrend = await this.analyzeRevenueTrend();
    if (revenueTrend.insight) {
      insights.push(revenueTrend.insight);
    }
    
    // 플레이어 행동 패턴 분석
    const behaviorInsights = await this.analyzeBehaviorPatterns();
    insights.push(...behaviorInsights);
    
    // 제품 성과 분석
    const productInsights = await this.analyzeProductPerformance();
    insights.push(...productInsights);
    
    return insights;
  }
}
```

## 결론

이 경제/수익화 시스템 설계는 Royal Clash 게임의 지속 가능한 수익 모델을 구축하고 플레이어에게 공정한 경제 환경을 제공하는 것을 목표로 합니다.

주요 특징:
- **균형잡힌 F2P 모델**: 무료 플레이어와 유료 플레이어 모두가 만족할 수 있는 경제 구조
- **다양한 수익화 채널**: IAP, 광고, 배틀패스, 구독 등 다양한 수익원 확보
- **실시간 경제 모니터링**: 경제 건강도를 지속적으로 추적하고 균형 유지
- **개인화된 가격 정책**: 플레이어별 맞춤 가격으로 구매 전환율 최적화
- **강력한 보안 시스템**: 사기 방지 및 공정한 경제 환경 보장

이 설계를 통해 게임은 장기적으로 안정적인 수익을 창출하면서도 플레이어들에게는 가치있는 경험을 제공할 수 있습니다.