# 경제/수익화 시스템 구현계획

## 문서 정보
- **문서명**: 경제/수익화 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [통화 시스템](#3-통화-시스템)
4. [상점 시스템](#4-상점-시스템)
5. [수익화 구현](#5-수익화-구현)

## 1. 구현 개요

### 1.1 기술 스택
- **결제 처리**: Google Play Billing, App Store Connect
- **데이터베이스**: PostgreSQL + Redis
- **보안**: JWT + RSA 암호화
- **분석**: Firebase Analytics, Custom Analytics
- **A/B 테스트**: Firebase Remote Config

### 1.2 구현 목표
- **결제 성공률**: 99.5% 이상
- **거래 처리 시간**: 3초 이내
- **동시 처리**: 1000+ 거래/초
- **보안 수준**: PCI DSS 준수

## 2. 개발 일정

### 2.1 Phase 1: 기본 경제 시스템 (3주)
```typescript
const phase1Tasks = {
  week1: ['통화 시스템', '기본 상점'],
  week2: ['IAP 연동', '결제 처리'],
  week3: ['보안 강화', '테스트']
};
```

### 2.2 Phase 2: 고급 기능 (3주)
```typescript
const phase2Tasks = {
  week1: ['동적 가격', '개인화 상점'],
  week2: ['구독 서비스', '시즌 패스'],
  week3: ['A/B 테스트', '분석 시스템']
};
```

### 2.3 Phase 3: 최적화 (2주)
```typescript
const phase3Tasks = {
  week1: ['성능 최적화', '사기 방지'],
  week2: ['런칭 준비', '모니터링']
};
```

## 3. 통화 시스템

### 3.1 다중 통화 관리
```typescript
// [의도] 게임 내 다양한 통화를 안전하게 관리
// [책임] 통화 발행, 거래 처리, 잔액 관리, 보안
export class CurrencyManager {
  private currencyBalance: Map<string, PlayerCurrencyData>;
  private transactionLogger: TransactionLogger;
  private securityValidator: SecurityValidator;
  private exchangeRateManager: ExchangeRateManager;
  
  constructor() {
    this.currencyBalance = new Map();
    this.transactionLogger = new TransactionLogger();
    this.securityValidator = new SecurityValidator();
    this.exchangeRateManager = new ExchangeRateManager();
  }
  
  async addCurrency(
    playerId: string, 
    currencyType: CurrencyType, 
    amount: number, 
    source: CurrencySource,
    metadata?: TransactionMetadata
  ): Promise<CurrencyTransaction> {
    // 보안 검증
    const validationResult = await this.securityValidator.validateTransaction({
      playerId,
      type: TransactionType.Add,
      currencyType,
      amount,
      source
    });
    
    if (!validationResult.isValid) {
      throw new SecurityError(`Invalid transaction: ${validationResult.reason}`);
    }
    
    const player = await this.getPlayerCurrency(playerId);
    const oldBalance = player.balances.get(currencyType) || 0;
    const newBalance = oldBalance + amount;
    
    // 잔액 업데이트
    player.balances.set(currencyType, newBalance);
    await this.savePlayerCurrency(player);
    
    // 거래 기록
    const transaction: CurrencyTransaction = {
      id: this.generateTransactionId(),
      playerId,
      currencyType,
      amount,
      source,
      timestamp: Date.now(),
      oldBalance,
      newBalance,
      metadata
    };
    
    await this.transactionLogger.log(transaction);
    
    // 이벤트 발생
    this.emitCurrencyChanged(playerId, currencyType, oldBalance, newBalance);
    
    return transaction;
  }
  
  async spendCurrency(
    playerId: string,
    currencyType: CurrencyType,
    amount: number,
    purpose: SpendingPurpose,
    metadata?: TransactionMetadata
  ): Promise<CurrencyTransaction> {
    const player = await this.getPlayerCurrency(playerId);
    const currentBalance = player.balances.get(currencyType) || 0;
    
    // 잔액 확인
    if (currentBalance < amount) {
      throw new InsufficientFundsError(
        `Insufficient ${currencyType}: required ${amount}, available ${currentBalance}`
      );
    }
    
    // 보안 검증
    await this.securityValidator.validateSpending(playerId, currencyType, amount, purpose);
    
    const newBalance = currentBalance - amount;
    player.balances.set(currencyType, newBalance);
    await this.savePlayerCurrency(player);
    
    const transaction: CurrencyTransaction = {
      id: this.generateTransactionId(),
      playerId,
      currencyType,
      amount: -amount, // 음수로 표시
      source: CurrencySource.Spending,
      timestamp: Date.now(),
      oldBalance: currentBalance,
      newBalance,
      metadata: { ...metadata, purpose }
    };
    
    await this.transactionLogger.log(transaction);
    this.emitCurrencyChanged(playerId, currencyType, currentBalance, newBalance);
    
    return transaction;
  }
  
  async exchangeCurrency(
    playerId: string,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    amount: number
  ): Promise<ExchangeResult> {
    const exchangeRate = await this.exchangeRateManager.getRate(fromCurrency, toCurrency);
    const convertedAmount = Math.floor(amount * exchangeRate);
    const fee = Math.floor(convertedAmount * 0.05); // 5% 수수료
    const finalAmount = convertedAmount - fee;
    
    // 원본 통화 차감
    await this.spendCurrency(
      playerId, 
      fromCurrency, 
      amount, 
      SpendingPurpose.CurrencyExchange
    );
    
    // 대상 통화 추가
    await this.addCurrency(
      playerId, 
      toCurrency, 
      finalAmount, 
      CurrencySource.Exchange
    );
    
    return {
      fromCurrency,
      toCurrency,
      originalAmount: amount,
      exchangeRate,
      convertedAmount,
      fee,
      finalAmount
    };
  }
  
  // 통화 생성 제어 (인플레이션 방지)
  async controlInflation(): Promise<void> {
    const inflationData = await this.analyzeInflation();
    
    if (inflationData.inflationRate > 0.1) { // 10% 이상 인플레이션
      // 통화 싱크 활성화
      await this.activateInflationControl(inflationData);
    }
  }
}
```

### 3.2 거래 검증 시스템
```typescript
// [의도] 모든 경제 거래의 보안과 무결성 보장
// [책임] 거래 검증, 사기 탐지, 롤백 처리
export class TransactionValidator {
  private fraudDetector: FraudDetector;
  private patternAnalyzer: PatternAnalyzer;
  private riskScorer: RiskScorer;
  
  constructor() {
    this.fraudDetector = new FraudDetector();
    this.patternAnalyzer = new PatternAnalyzer();
    this.riskScorer = new RiskScorer();
  }
  
  async validateTransaction(transaction: PendingTransaction): Promise<ValidationResult> {
    const results: ValidationCheck[] = [];
    
    // 기본 유효성 검사
    results.push(await this.validateBasicConstraints(transaction));
    
    // 플레이어 상태 검사
    results.push(await this.validatePlayerState(transaction));
    
    // 거래 패턴 분석
    results.push(await this.validateTransactionPattern(transaction));
    
    // 사기 위험도 평가
    results.push(await this.validateFraudRisk(transaction));
    
    // 속도 제한 검사
    results.push(await this.validateRateLimit(transaction));
    
    const overallResult = this.combineValidationResults(results);
    
    // 위험도가 높은 경우 추가 검증
    if (overallResult.riskScore > 0.7) {
      const additionalCheck = await this.performAdditionalVerification(transaction);
      overallResult.requiresAdditionalVerification = true;
      overallResult.additionalSteps = additionalCheck.requiredSteps;
    }
    
    return overallResult;
  }
  
  private async validateBasicConstraints(
    transaction: PendingTransaction
  ): Promise<ValidationCheck> {
    const issues: string[] = [];
    
    // 금액 유효성
    if (transaction.amount <= 0) {
      issues.push('Transaction amount must be positive');
    }
    
    if (transaction.amount > 1000000) { // 최대 거래 한도
      issues.push('Transaction amount exceeds maximum limit');
    }
    
    // 통화 타입 유효성
    if (!this.isValidCurrencyType(transaction.currencyType)) {
      issues.push('Invalid currency type');
    }
    
    // 플레이어 ID 유효성
    if (!await this.isValidPlayer(transaction.playerId)) {
      issues.push('Invalid player ID');
    }
    
    return {
      checkType: 'BasicConstraints',
      passed: issues.length === 0,
      issues,
      riskScore: issues.length > 0 ? 1.0 : 0.0
    };
  }
  
  private async validateFraudRisk(
    transaction: PendingTransaction
  ): Promise<ValidationCheck> {
    const riskFactors = await this.fraudDetector.analyzeTransaction(transaction);
    const riskScore = this.riskScorer.calculateRisk(riskFactors);
    
    const issues: string[] = [];
    
    if (riskScore > 0.8) {
      issues.push('High fraud risk detected');
    }
    
    if (riskFactors.unusualPattern) {
      issues.push('Unusual spending pattern detected');
    }
    
    if (riskFactors.velocityViolation) {
      issues.push('Transaction velocity limit exceeded');
    }
    
    return {
      checkType: 'FraudRisk',
      passed: riskScore < 0.5,
      issues,
      riskScore,
      details: riskFactors
    };
  }
  
  async rollbackTransaction(transactionId: string): Promise<RollbackResult> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }
    
    if (transaction.status === TransactionStatus.RolledBack) {
      return { success: true, message: 'Transaction already rolled back' };
    }
    
    try {
      // 역거래 실행
      const reverseTransaction = this.createReverseTransaction(transaction);
      await this.executeTransaction(reverseTransaction);
      
      // 원본 거래 상태 업데이트
      await this.updateTransactionStatus(
        transactionId,
        TransactionStatus.RolledBack
      );
      
      // 롤백 로그 기록
      await this.logRollback(transactionId, reverseTransaction.id);
      
      return { 
        success: true, 
        message: 'Transaction rolled back successfully',
        reverseTransactionId: reverseTransaction.id
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Rollback failed: ${error.message}` 
      };
    }
  }
}
```

## 4. 상점 시스템

### 4.1 동적 상점 관리
```typescript
// [의도] 개인화되고 동적인 상점 경험 제공
// [책임] 상품 관리, 가격 조정, 개인화 추천
export class DynamicStoreManager {
  private storeItemManager: StoreItemManager;
  private pricingEngine: PricingEngine;
  private personalizationEngine: PersonalizationEngine;
  private inventoryManager: InventoryManager;
  
  constructor() {
    this.storeItemManager = new StoreItemManager();
    this.pricingEngine = new PricingEngine();
    this.personalizationEngine = new PersonalizationEngine();
    this.inventoryManager = new InventoryManager();
  }
  
  async generatePersonalizedStore(playerId: string): Promise<PersonalizedStore> {
    const playerProfile = await this.getPlayerProfile(playerId);
    const purchaseHistory = await this.getPurchaseHistory(playerId);
    const gameplayData = await this.getGameplayData(playerId);
    
    // 기본 상점 아이템 로드
    const baseItems = await this.storeItemManager.getBaseStoreItems();
    
    // 개인화 추천 아이템
    const recommendedItems = await this.personalizationEngine.getRecommendations(
      playerProfile,
      purchaseHistory,
      gameplayData
    );
    
    // 동적 가격 계산
    const pricedItems = await this.calculateDynamicPricing(
      [...baseItems, ...recommendedItems],
      playerProfile
    );
    
    // 특별 할인 적용
    const discountedItems = await this.applyPersonalizedDiscounts(
      pricedItems,
      playerProfile
    );
    
    // 상점 레이아웃 최적화
    const optimizedLayout = this.optimizeStoreLayout(
      discountedItems,
      playerProfile.preferences
    );
    
    return {
      playerId,
      items: optimizedLayout.items,
      featuredItems: optimizedLayout.featured,
      dailyDeals: optimizedLayout.dailyDeals,
      personalizedOffers: optimizedLayout.personalized,
      refreshTime: this.getNextRefreshTime(),
      currency: await this.getPlayerCurrencies(playerId)
    };
  }
  
  private async calculateDynamicPricing(
    items: StoreItem[],
    playerProfile: PlayerProfile
  ): Promise<PricedStoreItem[]> {
    const pricedItems: PricedStoreItem[] = [];
    
    for (const item of items) {
      const basePrice = item.basePrice;
      let finalPrice = basePrice;
      
      // 플레이어 세그먼트 기반 가격 조정
      const segment = this.determinePlayerSegment(playerProfile);
      const segmentMultiplier = this.getSegmentPriceMultiplier(segment);
      finalPrice *= segmentMultiplier;
      
      // 수요-공급 기반 가격 조정
      const demandData = await this.getDemandData(item.id);
      const demandMultiplier = this.calculateDemandMultiplier(demandData);
      finalPrice *= demandMultiplier;
      
      // A/B 테스트 가격
      if (this.isInPricingExperiment(playerProfile.id)) {
        const experimentPrice = await this.getExperimentPrice(item.id, playerProfile.id);
        if (experimentPrice) {
          finalPrice = experimentPrice;
        }
      }
      
      pricedItems.push({
        ...item,
        originalPrice: basePrice,
        currentPrice: Math.round(finalPrice),
        discount: basePrice > finalPrice ? Math.round((basePrice - finalPrice) / basePrice * 100) : 0,
        priceHistory: await this.getPriceHistory(item.id)
      });
    }
    
    return pricedItems;
  }
  
  async purchaseItem(
    playerId: string,
    itemId: string,
    quantity: number = 1
  ): Promise<PurchaseResult> {
    // 아이템 유효성 검사
    const item = await this.storeItemManager.getItem(itemId);
    if (!item) {
      throw new ItemNotFoundError(`Item not found: ${itemId}`);
    }
    
    // 재고 확인
    if (!await this.inventoryManager.hasStock(itemId, quantity)) {
      throw new OutOfStockError(`Item out of stock: ${itemId}`);
    }
    
    // 구매 자격 확인
    const eligibility = await this.checkPurchaseEligibility(playerId, item);
    if (!eligibility.eligible) {
      throw new PurchaseNotAllowedError(eligibility.reason);
    }
    
    // 가격 계산
    const totalPrice = item.currentPrice * quantity;
    
    // 통화 차감
    await this.currencyManager.spendCurrency(
      playerId,
      item.currencyType,
      totalPrice,
      SpendingPurpose.StorePurchase,
      { itemId, quantity }
    );
    
    // 아이템 지급
    const grantResult = await this.grantPurchasedItems(playerId, item, quantity);
    
    // 재고 차감
    await this.inventoryManager.reduceStock(itemId, quantity);
    
    // 구매 기록
    const purchase = await this.recordPurchase({
      playerId,
      itemId,
      quantity,
      totalPrice,
      currencyType: item.currencyType,
      timestamp: Date.now()
    });
    
    // 개인화 엔진에 피드백
    await this.personalizationEngine.recordPurchase(playerId, purchase);
    
    return {
      success: true,
      purchaseId: purchase.id,
      itemsGranted: grantResult.items,
      remainingCurrency: await this.currencyManager.getBalance(playerId, item.currencyType)
    };
  }
}
```

### 4.2 개인화 추천 엔진
```typescript
// [의도] AI 기반 개인화된 상품 추천 시스템
// [책임] 선호도 분석, 추천 생성, 성과 측정
export class PersonalizationEngine {
  private recommenderModel: RecommenderModel;
  private behaviorAnalyzer: BehaviorAnalyzer;
  private segmentationEngine: SegmentationEngine;
  
  constructor() {
    this.recommenderModel = new RecommenderModel();
    this.behaviorAnalyzer = new BehaviorAnalyzer();
    this.segmentationEngine = new SegmentationEngine();
  }
  
  async getRecommendations(
    playerProfile: PlayerProfile,
    purchaseHistory: PurchaseHistory,
    gameplayData: GameplayData
  ): Promise<RecommendedItem[]> {
    // 플레이어 행동 분석
    const behaviorProfile = this.behaviorAnalyzer.analyze(
      playerProfile,
      purchaseHistory,
      gameplayData
    );
    
    // 플레이어 세그먼트 결정
    const segment = this.segmentationEngine.classifyPlayer(behaviorProfile);
    
    // 콘텐츠 기반 필터링
    const contentBasedRecs = await this.getContentBasedRecommendations(
      playerProfile,
      behaviorProfile
    );
    
    // 협업 필터링
    const collaborativeRecs = await this.getCollaborativeRecommendations(
      playerProfile,
      segment
    );
    
    // 하이브리드 추천
    const hybridRecs = this.combineRecommendations(
      contentBasedRecs,
      collaborativeRecs,
      behaviorProfile
    );
    
    // 추천 점수 계산
    const scoredRecommendations = await this.scoreRecommendations(
      hybridRecs,
      playerProfile
    );
    
    return scoredRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 상위 10개
  }
  
  private async getContentBasedRecommendations(
    playerProfile: PlayerProfile,
    behaviorProfile: BehaviorProfile
  ): Promise<RecommendedItem[]> {
    const recommendations: RecommendedItem[] = [];
    
    // 플레이 스타일 기반 추천
    if (behaviorProfile.playStyle.isAggressive) {
      const aggressiveItems = await this.getItemsByCategory('aggressive_units');
      recommendations.push(...aggressiveItems.map(item => ({
        ...item,
        recommendationReason: 'Matches your aggressive play style',
        confidence: 0.8
      })));
    }
    
    // 부족한 카드 타입 추천
    const missingCardTypes = this.analyzeMissingCardTypes(playerProfile.deck);
    for (const cardType of missingCardTypes) {
      const typeItems = await this.getItemsByCardType(cardType);
      recommendations.push(...typeItems.map(item => ({
        ...item,
        recommendationReason: `Strengthens your ${cardType} options`,
        confidence: 0.7
      })));
    }
    
    // 승률이 낮은 매치업 개선 아이템
    const weakMatchups = this.analyzeWeakMatchups(behaviorProfile.matchupData);
    for (const matchup of weakMatchups) {
      const counterItems = await this.getCounterItems(matchup.enemyArchetype);
      recommendations.push(...counterItems.map(item => ({
        ...item,
        recommendationReason: `Counters ${matchup.enemyArchetype}`,
        confidence: 0.6
      })));
    }
    
    return recommendations;
  }
  
  private async getCollaborativeRecommendations(
    playerProfile: PlayerProfile,
    segment: PlayerSegment
  ): Promise<RecommendedItem[]> {
    // 유사한 플레이어들이 구매한 아이템 찾기
    const similarPlayers = await this.findSimilarPlayers(playerProfile, segment);
    const popularItems = await this.getPopularItemsAmongPlayers(similarPlayers);
    
    // 플레이어가 아직 구매하지 않은 아이템만 추천
    const unownedPopularItems = popularItems.filter(item => 
      !playerProfile.ownedItems.includes(item.id)
    );
    
    return unownedPopularItems.map(item => ({
      ...item,
      recommendationReason: 'Popular among similar players',
      confidence: 0.65
    }));
  }
  
  async optimizeRecommendations(
    playerId: string,
    currentRecommendations: RecommendedItem[]
  ): Promise<OptimizedRecommendations> {
    // A/B 테스트 그룹 확인
    const testGroup = await this.getABTestGroup(playerId);
    
    // 그룹별 최적화 전략 적용
    let optimizedRecs: RecommendedItem[];
    
    switch (testGroup) {
      case 'price_sensitive':
        optimizedRecs = this.optimizeForPriceSensitive(currentRecommendations);
        break;
      case 'value_oriented':
        optimizedRecs = this.optimizeForValueOriented(currentRecommendations);
        break;
      case 'premium_focused':
        optimizedRecs = this.optimizeForPremium(currentRecommendations);
        break;
      default:
        optimizedRecs = currentRecommendations;
    }
    
    // 다양성 보장
    optimizedRecs = this.ensureDiversity(optimizedRecs);
    
    // 실시간 성과 데이터 반영
    const performanceData = await this.getRecommendationPerformance();
    optimizedRecs = this.adjustBasedOnPerformance(optimizedRecs, performanceData);
    
    return {
      recommendations: optimizedRecs,
      testGroup,
      optimizationStrategy: this.getOptimizationStrategy(testGroup),
      expectedCTR: this.predictClickThroughRate(optimizedRecs, playerId),
      expectedRevenue: this.predictRevenue(optimizedRecs, playerId)
    };
  }
}
```

## 5. 수익화 구현

### 5.1 IAP 시스템
```typescript
// [의도] 안전하고 효율적인 인앱 결제 시스템
// [책임] 결제 처리, 영수증 검증, 사기 방지
export class IAPManager {
  private billingClient: BillingClient;
  private receiptValidator: ReceiptValidator;
  private purchaseTracker: PurchaseTracker;
  private fraudDetector: FraudDetector;
  
  constructor() {
    this.billingClient = new BillingClient();
    this.receiptValidator = new ReceiptValidator();
    this.purchaseTracker = new PurchaseTracker();
    this.fraudDetector = new FraudDetector();
  }
  
  async initializeBilling(): Promise<boolean> {
    try {
      await this.billingClient.initialize();
      
      // SKU 정보 로드
      const skuList = await this.loadSKUList();
      await this.billingClient.querySkuDetails(skuList);
      
      // 미완료 구매 복구
      await this.restorePendingPurchases();
      
      return true;
    } catch (error) {
      console.error('Billing initialization failed:', error);
      return false;
    }
  }
  
  async purchaseProduct(
    playerId: string,
    productId: string
  ): Promise<PurchaseResult> {
    // 제품 정보 확인
    const product = await this.getProductInfo(productId);
    if (!product) {
      throw new ProductNotFoundError(`Product not found: ${productId}`);
    }
    
    // 구매 자격 확인
    const eligibility = await this.checkPurchaseEligibility(playerId, productId);
    if (!eligibility.eligible) {
      throw new PurchaseNotEligibleError(eligibility.reason);
    }
    
    // 사기 위험도 체크
    const fraudRisk = await this.fraudDetector.assessPurchaseRisk(playerId, productId);
    if (fraudRisk.level === FraudRiskLevel.High) {
      throw new HighRiskPurchaseError('Purchase blocked due to high fraud risk');
    }
    
    // 구매 시작
    const purchaseFlow = await this.billingClient.launchPurchaseFlow(productId);
    
    return new Promise((resolve, reject) => {
      purchaseFlow.onSuccess = async (purchaseToken: string, orderId: string) => {
        try {
          const result = await this.processPurchaseSuccess(
            playerId,
            productId,
            purchaseToken,
            orderId
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      purchaseFlow.onError = (error: BillingError) => {
        this.logPurchaseError(playerId, productId, error);
        reject(new PurchaseFailedError(error.message));
      };
      
      purchaseFlow.onCancelled = () => {
        this.logPurchaseCancellation(playerId, productId);
        reject(new PurchaseCancelledError('Purchase cancelled by user'));
      };
    });
  }
  
  private async processPurchaseSuccess(
    playerId: string,
    productId: string,
    purchaseToken: string,
    orderId: string
  ): Promise<PurchaseResult> {
    try {
      // 영수증 검증
      const validation = await this.receiptValidator.validate(
        purchaseToken,
        productId,
        orderId
      );
      
      if (!validation.isValid) {
        throw new InvalidReceiptError('Receipt validation failed');
      }
      
      // 중복 처리 방지
      if (await this.purchaseTracker.isDuplicate(orderId)) {
        throw new DuplicatePurchaseError('Purchase already processed');
      }
      
      // 구매 기록
      const purchase = await this.recordPurchase({
        playerId,
        productId,
        orderId,
        purchaseToken,
        timestamp: Date.now(),
        validationData: validation
      });
      
      // 아이템 지급
      const rewards = await this.grantPurchaseRewards(playerId, productId);
      
      // 구매 완료 처리
      await this.billingClient.acknowledgePurchase(purchaseToken);
      
      // 구매 트래킹
      await this.purchaseTracker.track(purchase);
      
      // 분석 이벤트 발송
      this.sendPurchaseAnalytics(purchase, rewards);
      
      return {
        success: true,
        purchaseId: purchase.id,
        rewards: rewards,
        orderId: orderId
      };
    } catch (error) {
      // 실패 시 구매 복구 대기열에 추가
      await this.addToRecoveryQueue(playerId, productId, purchaseToken, orderId);
      throw error;
    }
  }
  
  async restorePurchases(playerId: string): Promise<RestoreResult> {
    const restoredPurchases: RestoredPurchase[] = [];
    
    try {
      // 플랫폼별 구매 내역 조회
      const platformPurchases = await this.billingClient.queryPurchaseHistory();
      
      for (const purchase of platformPurchases) {
        // 이미 처리된 구매인지 확인
        if (await this.purchaseTracker.isProcessed(purchase.orderId)) {
          continue;
        }
        
        // 영수증 재검증
        const validation = await this.receiptValidator.validate(
          purchase.purchaseToken,
          purchase.productId,
          purchase.orderId
        );
        
        if (validation.isValid) {
          // 아이템 재지급
          const rewards = await this.grantPurchaseRewards(playerId, purchase.productId);
          
          restoredPurchases.push({
            orderId: purchase.orderId,
            productId: purchase.productId,
            rewards: rewards
          });
          
          // 처리 완료 마킹
          await this.purchaseTracker.markAsProcessed(purchase.orderId);
        }
      }
      
      return {
        success: true,
        restoredCount: restoredPurchases.length,
        purchases: restoredPurchases
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        restoredCount: 0,
        purchases: []
      };
    }
  }
}
```

### 5.2 구독 서비스 시스템
```typescript
// [의도] 구독 기반 수익 모델 구현
// [책임] 구독 관리, 자동 갱신, 혜택 제공
export class SubscriptionManager {
  private subscriptionTracker: SubscriptionTracker;
  private benefitManager: BenefitManager;
  private renewalManager: RenewalManager;
  private churnPredictor: ChurnPredictor;
  
  constructor() {
    this.subscriptionTracker = new SubscriptionTracker();
    this.benefitManager = new BenefitManager();
    this.renewalManager = new RenewalManager();
    this.churnPredictor = new ChurnPredictor();
  }
  
  async activateSubscription(
    playerId: string,
    subscriptionType: SubscriptionType,
    purchaseToken: string
  ): Promise<SubscriptionActivation> {
    // 기존 구독 확인
    const existingSubscription = await this.getActiveSubscription(playerId);
    if (existingSubscription) {
      // 업그레이드/다운그레이드 처리
      return await this.handleSubscriptionChange(
        existingSubscription,
        subscriptionType,
        purchaseToken
      );
    }
    
    // 새 구독 생성
    const subscription = await this.createSubscription({
      playerId,
      type: subscriptionType,
      purchaseToken,
      startDate: Date.now(),
      status: SubscriptionStatus.Active
    });
    
    // 혜택 활성화
    await this.benefitManager.activateSubscriptionBenefits(
      playerId,
      subscriptionType
    );
    
    // 자동 갱신 설정
    await this.renewalManager.setupAutoRenewal(subscription);
    
    // 구독 환영 혜택 지급
    const welcomeBonus = await this.grantWelcomeBonus(playerId, subscriptionType);
    
    return {
      subscriptionId: subscription.id,
      type: subscriptionType,
      benefits: await this.getBenefitsList(subscriptionType),
      welcomeBonus: welcomeBonus,
      nextBillingDate: this.calculateNextBillingDate(subscription)
    };
  }
  
  async processSubscriptionRenewal(subscriptionId: string): Promise<RenewalResult> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(`Subscription not found: ${subscriptionId}`);
    }
    
    try {
      // 결제 처리 시도
      const renewalResult = await this.billingClient.processRenewal(
        subscription.purchaseToken
      );
      
      if (renewalResult.success) {
        // 구독 기간 연장
        await this.extendSubscription(subscription, renewalResult.newExpiryDate);
        
        // 갱신 보너스 지급
        const renewalBonus = await this.grantRenewalBonus(
          subscription.playerId,
          subscription.type
        );
        
        return {
          success: true,
          newExpiryDate: renewalResult.newExpiryDate,
          renewalBonus: renewalBonus
        };
      } else {
        // 갱신 실패 - 유예 기간 시작
        await this.startGracePeriod(subscription);
        
        return {
          success: false,
          reason: renewalResult.failureReason,
          gracePeriodEnd: this.calculateGracePeriodEnd(subscription)
        };
      }
    } catch (error) {
      // 결제 오류 처리
      await this.handleRenewalError(subscription, error);
      throw error;
    }
  }
  
  async predictChurnRisk(playerId: string): Promise<ChurnPrediction> {
    const subscription = await this.getActiveSubscription(playerId);
    if (!subscription) {
      return { risk: 0, factors: [] };
    }
    
    // 사용 패턴 분석
    const usageData = await this.getUserUsageData(playerId);
    
    // 구독 혜택 활용도 분석
    const benefitUsage = await this.benefitManager.getUsageStats(playerId);
    
    // ML 모델을 통한 이탈 위험도 예측
    const prediction = await this.churnPredictor.predict({
      subscriptionDuration: subscription.getDuration(),
      usageFrequency: usageData.frequency,
      benefitUtilization: benefitUsage.utilizationRate,
      supportTickets: usageData.supportTickets,
      lastActive: usageData.lastActiveDate
    });
    
    return prediction;
  }
  
  async implementRetentionStrategy(
    playerId: string,
    churnRisk: ChurnPrediction
  ): Promise<RetentionAction> {
    if (churnRisk.risk < 0.3) {
      return { action: 'none', reason: 'Low churn risk' };
    }
    
    const subscription = await this.getActiveSubscription(playerId);
    
    if (churnRisk.risk > 0.7) {
      // 고위험 - 개인화된 할인 제공
      const discount = await this.createPersonalizedDiscount(playerId, subscription);
      await this.sendRetentionOffer(playerId, discount);
      
      return {
        action: 'discount_offer',
        details: discount,
        reason: 'High churn risk detected'
      };
    } else if (churnRisk.risk > 0.4) {
      // 중위험 - 추가 혜택 제공
      const bonus = await this.grantRetentionBonus(playerId, subscription.type);
      
      return {
        action: 'bonus_reward',
        details: bonus,
        reason: 'Moderate churn risk'
      };
    }
    
    // 저위험 - 사용량 증대 유도
    await this.sendEngagementNotification(playerId);
    
    return {
      action: 'engagement_boost',
      reason: 'Encouraging more active usage'
    };
  }
}
```

### 5.3 동적 가격 최적화
```typescript
// [의도] AI 기반 실시간 가격 최적화 시스템
// [책임] 가격 분석, 최적화, A/B 테스트
export class DynamicPricingAI {
  private pricingModel: PricingModel;
  private demandForecaster: DemandForecaster;
  private competitorAnalyzer: CompetitorAnalyzer;
  private abTestManager: ABTestManager;
  
  constructor() {
    this.pricingModel = new PricingModel();
    this.demandForecaster = new DemandForecaster();
    this.competitorAnalyzer = new CompetitorAnalyzer();
    this.abTestManager = new ABTestManager();
  }
  
  async optimizePrice(
    productId: string,
    playerSegment: PlayerSegment
  ): Promise<OptimizedPrice> {
    // 현재 가격 성과 분석
    const currentPerformance = await this.analyzePricePerformance(productId);
    
    // 수요 예측
    const demandForecast = await this.demandForecaster.forecast(productId);
    
    // 경쟁사 가격 분석
    const competitorPrices = await this.competitorAnalyzer.getCompetitorPrices(productId);
    
    // 플레이어 세그먼트 분석
    const segmentAnalysis = await this.analyzeSegmentBehavior(playerSegment);
    
    // ML 모델을 통한 최적 가격 예측
    const optimizationInput = {
      currentPrice: currentPerformance.averagePrice,
      demandElasticity: demandForecast.elasticity,
      competitorPriceRange: competitorPrices.range,
      segmentPriceSensitivity: segmentAnalysis.priceSensitivity,
      seasonalFactors: demandForecast.seasonalFactors
    };
    
    const optimizedPrice = await this.pricingModel.optimize(optimizationInput);
    
    // A/B 테스트 설정
    const abTest = await this.abTestManager.createPriceTest({
      productId,
      currentPrice: currentPerformance.averagePrice,
      testPrice: optimizedPrice.recommendedPrice,
      targetSegment: playerSegment
    });
    
    return {
      recommendedPrice: optimizedPrice.recommendedPrice,
      confidence: optimizedPrice.confidence,
      expectedLift: optimizedPrice.expectedRevenueLift,
      abTestId: abTest.id,
      reasoning: this.explainPriceOptimization(optimizationInput, optimizedPrice)
    };
  }
  
  async runPriceExperiment(
    productId: string,
    priceVariants: number[]
  ): Promise<ExperimentResult> {
    const experiment = await this.abTestManager.createExperiment({
      productId,
      variants: priceVariants.map((price, index) => ({
        name: `variant_${index}`,
        price: price,
        trafficAllocation: 1 / priceVariants.length
      })),
      duration: 14 * 24 * 60 * 60 * 1000, // 14일
      successMetric: 'revenue_per_user'
    });
    
    // 실험 모니터링
    this.monitorExperiment(experiment);
    
    return {
      experimentId: experiment.id,
      startDate: experiment.startDate,
      expectedEndDate: experiment.endDate,
      variants: experiment.variants
    };
  }
  
  private async monitorExperiment(experiment: PriceExperiment): Promise<void> {
    const checkInterval = setInterval(async () => {
      const results = await this.abTestManager.getExperimentResults(experiment.id);
      
      // 통계적 유의성 체크
      if (results.hasStatisticalSignificance) {
        const winningVariant = results.getWinningVariant();
        
        if (winningVariant) {
          // 승리 변형 자동 적용
          await this.applyWinningPrice(experiment.productId, winningVariant.price);
          
          // 실험 종료
          await this.abTestManager.stopExperiment(experiment.id);
          clearInterval(checkInterval);
        }
      }
      
      // 실험 기간 종료 체크
      if (Date.now() > experiment.endDate) {
        await this.abTestManager.stopExperiment(experiment.id);
        clearInterval(checkInterval);
      }
    }, 3600000); // 1시간마다 체크
  }
  
  private explainPriceOptimization(
    input: OptimizationInput,
    result: OptimizedPrice
  ): PriceExplanation {
    const factors: PriceFactor[] = [];
    
    // 수요 탄력성 영향
    if (input.demandElasticity < -1) {
      factors.push({
        factor: 'High price sensitivity',
        impact: 'Price decrease recommended',
        weight: 0.3
      });
    } else if (input.demandElasticity > -0.5) {
      factors.push({
        factor: 'Low price sensitivity',
        impact: 'Price increase opportunity',
        weight: 0.3
      });
    }
    
    // 경쟁사 가격 영향
    if (input.currentPrice > input.competitorPriceRange.average * 1.2) {
      factors.push({
        factor: 'Above competitor average',
        impact: 'Competitive pressure to lower price',
        weight: 0.2
      });
    }
    
    // 세그먼트 특성 영향
    if (input.segmentPriceSensitivity > 0.7) {
      factors.push({
        factor: 'Price-sensitive segment',
        impact: 'Lower prices drive higher volume',
        weight: 0.25
      });
    }
    
    return {
      primaryFactors: factors.slice(0, 3),
      expectedOutcome: `${result.expectedRevenueLift}% revenue increase`,
      confidence: result.confidence
    };
  }
}
```

이 구현계획은 포괄적이고 지속 가능한 경제/수익화 시스템을 구축하기 위한 핵심 요소들을 다루고 있습니다. 보안, 개인화, AI 최적화를 통해 플레이어 만족도와 수익성을 동시에 달성할 수 있는 시스템을 제공합니다.