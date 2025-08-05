# 분석 시스템 구현계획

## 문서 정보
- **문서명**: 분석 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [데이터 수집 시스템](#3-데이터-수집-시스템)
4. [실시간 분석](#4-실시간-분석)
5. [예측 분석 AI](#5-예측-분석-ai)

## 1. 구현 개요

### 1.1 기술 스택
- **데이터 수집**: Custom Event System + Firebase
- **데이터 저장**: ClickHouse + Redis
- **실시간 처리**: Apache Kafka + Apache Flink
- **분석 엔진**: Python + TensorFlow
- **시각화**: Grafana + Custom Dashboard

### 1.2 구현 목표
- **데이터 처리량**: 초당 10,000+ 이벤트
- **실시간 지연시간**: 100ms 이하
- **예측 정확도**: 85% 이상
- **시스템 가용성**: 99.9%

## 2. 개발 일정

### 2.1 Phase 1: 기본 분석 시스템 (4주)
```typescript
const phase1Tasks = {
  week1: ['이벤트 수집 시스템', '데이터 파이프라인'],
  week2: ['기본 분석 엔진', '데이터 저장소'],
  week3: ['실시간 대시보드', '기본 리포트'],
  week4: ['성능 최적화', '테스트']
};
```

### 2.2 Phase 2: 고급 분석 (4주)
```typescript
const phase2Tasks = {
  week1: ['예측 분석 모델', '코호트 분석'],
  week2: ['A/B 테스트 시스템', '개인화 분석'],
  week3: ['이상 탐지', '자동 알림'],
  week4: ['ML 파이프라인', '모델 배포']
};
```

### 2.3 Phase 3: 고도화 (2주)
```typescript
const phase3Tasks = {
  week1: ['고급 시각화', '자동 인사이트'],
  week2: ['최종 최적화', '운영 준비']
};
```

## 3. 데이터 수집 시스템

### 3.1 이벤트 추적 시스템
```typescript
// [의도] 게임 내 모든 사용자 행동과 시스템 이벤트를 추적
// [책임] 이벤트 생성, 배치 전송, 오프라인 저장
export class EventTrackingSystem {
  private eventQueue: EventQueue;
  private batchProcessor: BatchProcessor;
  private offlineStorage: OfflineStorage;
  private sessionManager: SessionManager;
  private privacyManager: PrivacyManager;
  
  constructor() {
    this.eventQueue = new EventQueue();
    this.batchProcessor = new BatchProcessor();
    this.offlineStorage = new OfflineStorage();
    this.sessionManager = new SessionManager();
    this.privacyManager = new PrivacyManager();
    
    this.initializeTracking();
  }
  
  private initializeTracking(): void {
    // 자동 이벤트 추적 설정
    this.setupAutoTracking();
    
    // 배치 전송 스케줄링
    this.startBatchProcessing();
    
    // 오프라인 지원 설정
    this.setupOfflineSupport();
  }
  
  // 커스텀 이벤트 추적
  trackEvent(
    eventName: string, 
    properties: EventProperties = {},
    options: TrackingOptions = {}
  ): void {
    // 개인정보 보호 검사
    if (!this.privacyManager.canTrackEvent(eventName, properties)) {
      return;
    }
    
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.sessionManager.getCurrentSessionId(),
      userId: this.getUserId(),
      properties: this.sanitizeProperties(properties),
      context: this.getEventContext(),
      version: this.getAppVersion()
    };
    
    // 즉시 전송 또는 큐에 추가
    if (options.immediate) {
      this.sendEventImmediately(event);
    } else {
      this.eventQueue.enqueue(event);
    }
  }
  
  // 게임플레이 이벤트 자동 추적
  private setupAutoTracking(): void {
    // 매치 시작/종료
    GameEvents.on('match_started', this.onMatchStarted, this);
    GameEvents.on('match_ended', this.onMatchEnded, this);
    
    // 카드 사용
    GameEvents.on('card_played', this.onCardPlayed, this);
    
    // 구매 이벤트
    GameEvents.on('purchase_completed', this.onPurchaseCompleted, this);
    
    // UI 상호작용
    UIEvents.on('screen_viewed', this.onScreenViewed, this);
    UIEvents.on('button_clicked', this.onButtonClicked, this);
    
    // 세션 이벤트
    GameEvents.on('session_started', this.onSessionStarted, this);
    GameEvents.on('session_ended', this.onSessionEnded, this);
  }
  
  private onMatchStarted(matchData: MatchData): void {
    this.trackEvent('match_started', {
      match_id: matchData.id,
      game_mode: matchData.gameMode,
      opponent_rating: matchData.opponentRating,
      player_deck: matchData.playerDeck.map(card => card.id),
      match_type: matchData.matchType,
      queue_time: matchData.queueTime
    });
  }
  
  private onMatchEnded(matchResult: MatchResult): void {
    this.trackEvent('match_ended', {
      match_id: matchResult.matchId,
      result: matchResult.result,
      duration: matchResult.duration,
      player_score: matchResult.playerScore,
      opponent_score: matchResult.opponentScore,
      cards_played: matchResult.cardsPlayed,
      damage_dealt: matchResult.damageDealt,
      damage_taken: matchResult.damageTaken,
      elixir_efficiency: matchResult.elixirEfficiency,
      comeback_factor: matchResult.comebackFactor
    });
  }
  
  private onCardPlayed(cardData: CardPlayData): void {
    this.trackEvent('card_played', {
      card_id: cardData.cardId,
      card_level: cardData.cardLevel,
      elixir_cost: cardData.elixirCost,
      placement_x: cardData.position.x,
      placement_y: cardData.position.y,
      game_time: cardData.gameTime,
      player_elixir: cardData.playerElixir,
      opponent_elixir: cardData.opponentElixir,
      strategic_context: cardData.strategicContext
    });
  }
  
  // 배치 처리 시스템
  private startBatchProcessing(): void {
    setInterval(() => {
      this.processBatch();
    }, 30000); // 30초마다 배치 전송
    
    // 앱 종료 시 남은 이벤트 전송
    GameEvents.on('app_will_terminate', () => {
      this.flushAllEvents();
    });
  }
  
  private async processBatch(): Promise<void> {
    if (this.eventQueue.isEmpty()) return;
    
    const events = this.eventQueue.dequeueBatch(100); // 최대 100개씩
    
    try {
      await this.sendEventBatch(events);
      
      // 성공시 오프라인 저장소에서도 제거
      this.offlineStorage.removeEvents(events.map(e => e.id));
    } catch (error) {
      console.error('Failed to send event batch:', error);
      
      // 실패시 오프라인 저장소에 보관
      await this.offlineStorage.storeEvents(events);
    }
  }
  
  private async sendEventBatch(events: AnalyticsEvent[]): Promise<void> {
    const payload = {
      events: events,
      client_info: this.getClientInfo(),
      timestamp: Date.now()
    };
    
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }
  }
  
  // 사용자 여정 추적
  trackUserJourney(journeyStep: JourneyStep): void {
    const journey = this.sessionManager.getCurrentJourney();
    journey.addStep(journeyStep);
    
    this.trackEvent('user_journey_step', {
      step_name: journeyStep.name,
      step_type: journeyStep.type,
      previous_step: journey.getPreviousStep()?.name,
      journey_duration: journey.getDuration(),
      step_sequence: journey.getStepCount(),
      funnel_stage: this.determineFunnelStage(journeyStep)
    });
  }
  
  // 코호트 추적을 위한 사용자 식별
  identifyUser(userId: string, traits: UserTraits): void {
    this.sessionManager.setUserId(userId);
    
    this.trackEvent('user_identified', {
      user_id: userId,
      traits: traits,
      first_seen: this.isFirstTimeUser(userId),
      days_since_install: this.getDaysSinceInstall(),
      previous_sessions: this.getPreviousSessionCount(userId)
    });
  }
  
  // 개인정보 보호 준수
  private sanitizeProperties(properties: EventProperties): EventProperties {
    const sanitized = { ...properties };
    
    // PII 제거
    delete sanitized.email;
    delete sanitized.phone;
    delete sanitized.real_name;
    
    // IP 주소 해싱
    if (sanitized.ip_address) {
      sanitized.ip_hash = this.hashIP(sanitized.ip_address);
      delete sanitized.ip_address;
    }
    
    return sanitized;
  }
}
```

### 3.2 실시간 데이터 파이프라인
```typescript
// [의도] 대량의 이벤트 데이터를 실시간으로 처리하는 파이프라인
// [책임] 데이터 스트리밍, 변환, 라우팅, 저장
export class RealTimeDataPipeline {
  private kafkaProducer: KafkaProducer;
  private streamProcessor: StreamProcessor;
  private dataEnricher: DataEnricher;
  private routingEngine: RoutingEngine;
  
  constructor() {
    this.kafkaProducer = new KafkaProducer();
    this.streamProcessor = new StreamProcessor();
    this.dataEnricher = new DataEnricher();
    this.routingEngine = new RoutingEngine();
    
    this.initializePipeline();
  }
  
  private initializePipeline(): void {
    // Kafka 토픽 설정
    this.setupKafkaTopics();
    
    // 스트림 처리 파이프라인 구성
    this.configureStreamProcessing();
    
    // 데이터 라우팅 규칙 설정
    this.setupRoutingRules();
  }
  
  private setupKafkaTopics(): void {
    const topics = [
      'game-events',
      'user-events', 
      'system-events',
      'purchase-events',
      'performance-events'
    ];
    
    for (const topic of topics) {
      this.kafkaProducer.createTopic(topic, {
        partitions: 10,
        replicationFactor: 3,
        retentionMs: 7 * 24 * 60 * 60 * 1000 // 7일
      });
    }
  }
  
  // 이벤트 스트림 처리
  async processEventStream(event: AnalyticsEvent): Promise<void> {
    try {
      // 1. 데이터 유효성 검사
      const validationResult = await this.validateEvent(event);
      if (!validationResult.isValid) {
        throw new Error(`Invalid event: ${validationResult.errors.join(', ')}`);
      }
      
      // 2. 데이터 보강
      const enrichedEvent = await this.dataEnricher.enrich(event);
      
      // 3. 실시간 집계 업데이트
      await this.updateRealTimeAggregates(enrichedEvent);
      
      // 4. 적절한 토픽으로 라우팅
      const topic = this.routingEngine.determineTopicForEvent(enrichedEvent);
      await this.kafkaProducer.send(topic, enrichedEvent);
      
      // 5. 즉시 처리가 필요한 이벤트 확인
      if (this.requiresImmediateProcessing(enrichedEvent)) {
        await this.processImmediately(enrichedEvent);
      }
      
    } catch (error) {
      // 데드 레터 큐로 전송
      await this.sendToDeadLetterQueue(event, error);
    }
  }
  
  private async updateRealTimeAggregates(event: AnalyticsEvent): Promise<void> {
    // Redis에서 실시간 메트릭 업데이트
    const redis = this.getRedisClient();
    const timestamp = Math.floor(event.timestamp / 60000) * 60000; // 1분 단위
    
    switch (event.name) {
      case 'match_started':
        await redis.incr(`matches:started:${timestamp}`);
        await redis.incr(`matches:total:daily:${this.getDayKey(event.timestamp)}`);
        break;
        
      case 'match_ended':
        await this.updateMatchMetrics(event, redis, timestamp);
        break;
        
      case 'purchase_completed':
        await this.updateRevenueMetrics(event, redis, timestamp);
        break;
        
      case 'user_session_started':
        await redis.incr(`sessions:started:${timestamp}`);
        await redis.sadd(`daily_active_users:${this.getDayKey(event.timestamp)}`, event.userId);
        break;
    }
  }
  
  private async updateMatchMetrics(
    event: AnalyticsEvent, 
    redis: RedisClient, 
    timestamp: number
  ): Promise<void> {
    const result = event.properties.result;
    const duration = event.properties.duration;
    
    // 매치 결과 집계
    await redis.incr(`matches:${result}:${timestamp}`);
    
    // 평균 매치 시간 업데이트 (HyperLogLog 사용)
    await redis.pfadd(`match_durations:${timestamp}`, duration.toString());
    
    // 플레이어 활동 추적
    await redis.sadd(`active_players:${timestamp}`, event.userId);
  }
  
  private async updateRevenueMetrics(
    event: AnalyticsEvent,
    redis: RedisClient,
    timestamp: number
  ): Promise<void> {
    const amount = event.properties.amount;
    const currency = event.properties.currency;
    
    // 수익 집계
    await redis.incrbyfloat(`revenue:${currency}:${timestamp}`, amount);
    await redis.incr(`purchases:count:${timestamp}`);
    
    // 일일 수익
    const dayKey = this.getDayKey(event.timestamp);
    await redis.incrbyfloat(`revenue:daily:${currency}:${dayKey}`, amount);
  }
  
  // 스트림 처리 설정
  private configureStreamProcessing(): void {
    this.streamProcessor.addProcessor('session-analysis', {
      windowSize: 300000, // 5분 윈도우
      processor: this.processSessionWindow.bind(this)
    });
    
    this.streamProcessor.addProcessor('anomaly-detection', {
      windowSize: 60000, // 1분 윈도우
      processor: this.detectAnomalies.bind(this)
    });
    
    this.streamProcessor.addProcessor('real-time-personalization', {
      windowSize: 10000, // 10초 윈도우
      processor: this.updatePersonalizationModel.bind(this)
    });
  }
  
  private async processSessionWindow(events: AnalyticsEvent[]): Promise<void> {
    // 세션별로 그룹화
    const sessionGroups = this.groupEventsBySession(events);
    
    for (const [sessionId, sessionEvents] of sessionGroups) {
      const sessionAnalysis = this.analyzeSession(sessionEvents);
      
      // 세션 분석 결과 저장
      await this.storeSessionAnalysis(sessionId, sessionAnalysis);
      
      // 실시간 대시보드 업데이트
      this.updateSessionDashboard(sessionAnalysis);
    }
  }
  
  private async detectAnomalies(events: AnalyticsEvent[]): Promise<void> {
    const metrics = this.extractMetricsFromEvents(events);
    
    // 이상 탐지 알고리즘 적용
    const anomalies = await this.anomalyDetector.detect(metrics);
    
    for (const anomaly of anomalies) {
      if (anomaly.severity > 0.8) {
        // 심각한 이상 상황 - 즉시 알림
        await this.sendCriticalAlert(anomaly);
      } else if (anomaly.severity > 0.5) {
        // 중간 수준 이상 - 로그 기록
        this.logAnomalyWarning(anomaly);
      }
    }
  }
}
```

## 4. 실시간 분석

### 4.1 실시간 대시보드 시스템
```typescript
// [의도] 게임 운영진을 위한 실시간 모니터링 대시보드
// [책임] 실시간 데이터 시각화, 알림, 인터랙티브 분석
export class RealTimeDashboard {
  private websocketServer: WebSocketServer;
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private chartRenderer: ChartRenderer;
  
  constructor() {
    this.websocketServer = new WebSocketServer();
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.chartRenderer = new ChartRenderer();
    
    this.initializeDashboard();
  }
  
  private initializeDashboard(): void {
    // WebSocket 연결 관리
    this.setupWebSocketHandlers();
    
    // 실시간 메트릭 수집 시작
    this.startMetricsCollection();
    
    // 대시보드 위젯 설정
    this.setupDashboardWidgets();
  }
  
  private setupDashboardWidgets(): void {
    // KPI 위젯들
    this.createWidget('concurrent-users', {
      type: 'number',
      title: 'Concurrent Users',
      dataSource: 'real-time-users',
      refreshInterval: 5000
    });
    
    this.createWidget('matches-per-minute', {
      type: 'line-chart',
      title: 'Matches per Minute',
      dataSource: 'match-rate',
      refreshInterval: 10000,
      timeWindow: 3600000 // 1시간
    });
    
    this.createWidget('revenue-today', {
      type: 'currency',
      title: 'Revenue Today',
      dataSource: 'daily-revenue',
      refreshInterval: 60000
    });
    
    this.createWidget('server-performance', {
      type: 'gauge',
      title: 'Server Performance',
      dataSource: 'server-metrics',
      refreshInterval: 5000,
      thresholds: { warning: 70, critical: 90 }
    });
    
    // 게임 특화 위젯들
    this.createWidget('popular-cards', {
      type: 'bar-chart',
      title: 'Popular Cards (Last Hour)',
      dataSource: 'card-usage',
      refreshInterval: 300000 // 5분
    });
    
    this.createWidget('win-rate-by-deck', {
      type: 'table',
      title: 'Win Rate by Deck Type',
      dataSource: 'deck-performance',
      refreshInterval: 300000
    });
  }
  
  private async startMetricsCollection(): Promise<void> {
    // 5초마다 실시간 메트릭 수집
    setInterval(async () => {
      const metrics = await this.collectRealTimeMetrics();
      this.broadcastMetrics(metrics);
      
      // 임계값 체크
      this.checkThresholds(metrics);
    }, 5000);
  }
  
  private async collectRealTimeMetrics(): Promise<RealTimeMetrics> {
    const redis = this.getRedisClient();
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000) * 60000;
    
    return {
      timestamp: now,
      concurrentUsers: await redis.scard(`active_players:${currentMinute}`),
      matchesStarted: await redis.get(`matches:started:${currentMinute}`) || 0,
      matchesCompleted: await redis.get(`matches:ended:${currentMinute}`) || 0,
      totalRevenue: await this.getTotalRevenue(),
      serverLoad: await this.getServerLoad(),
      errorRate: await this.getErrorRate(),
      averageLatency: await this.getAverageLatency(),
      popularCards: await this.getPopularCards(),
      activeRegions: await this.getActiveRegions()
    };
  }
  
  private broadcastMetrics(metrics: RealTimeMetrics): void {
    // 연결된 모든 클라이언트에게 메트릭 브로드캐스트
    this.websocketServer.broadcast('metrics-update', metrics);
  }
  
  private checkThresholds(metrics: RealTimeMetrics): void {
    // 동시 사용자 수 급증 감지
    if (metrics.concurrentUsers > 10000) {
      this.alertManager.sendAlert({
        type: AlertType.HIGH_LOAD,
        severity: AlertSeverity.WARNING,
        message: `High concurrent users: ${metrics.concurrentUsers}`,
        metrics: metrics
      });
    }
    
    // 서버 부하 임계값
    if (metrics.serverLoad > 80) {
      this.alertManager.sendAlert({
        type: AlertType.SERVER_OVERLOAD,
        severity: metrics.serverLoad > 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        message: `Server load: ${metrics.serverLoad}%`,
        metrics: metrics
      });
    }
    
    // 오류율 임계값
    if (metrics.errorRate > 5) {
      this.alertManager.sendAlert({
        type: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.CRITICAL,
        message: `High error rate: ${metrics.errorRate}%`,
        metrics: metrics
      });
    }
  }
  
  // 커스텀 쿼리 실행
  async executeCustomQuery(query: AnalyticsQuery): Promise<QueryResult> {
    try {
      const startTime = performance.now();
      
      // 쿼리 유형에 따른 처리
      let result: QueryResult;
      
      switch (query.type) {
        case 'time-series':
          result = await this.executeTimeSeriesQuery(query);
          break;
        case 'aggregation':
          result = await this.executeAggregationQuery(query);
          break;
        case 'funnel':
          result = await this.executeFunnelQuery(query);
          break;
        case 'cohort':
          result = await this.executeCohortQuery(query);
          break;
        default:
          throw new Error(`Unsupported query type: ${query.type}`);
      }
      
      const executionTime = performance.now() - startTime;
      
      return {
        ...result,
        executionTime,
        queryId: this.generateQueryId(),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        queryId: this.generateQueryId(),
        timestamp: Date.now()
      };
    }
  }
  
  private async executeTimeSeriesQuery(query: TimeSeriesQuery): Promise<QueryResult> {
    const clickhouse = this.getClickHouseClient();
    
    const sql = `
      SELECT 
        toDateTime(intDiv(timestamp, ${query.interval}) * ${query.interval}) as time,
        ${query.aggregations.map(agg => `${agg.function}(${agg.field}) as ${agg.alias}`).join(', ')}
      FROM events 
      WHERE timestamp >= ${query.startTime} 
        AND timestamp <= ${query.endTime}
        ${query.filters ? `AND ${this.buildFilterClause(query.filters)}` : ''}
      GROUP BY time 
      ORDER BY time
    `;
    
    const rows = await clickhouse.query(sql);
    
    return {
      success: true,
      data: rows,
      totalRows: rows.length,
      chartType: 'line'
    };
  }
  
  // 실시간 A/B 테스트 모니터링
  monitorABTests(): void {
    setInterval(async () => {
      const activeTests = await this.getActiveABTests();
      
      for (const test of activeTests) {
        const results = await this.calculateABTestResults(test);
        
        // 통계적 유의성 확인
        if (results.statisticalSignificance > 0.95) {
          this.alertManager.sendAlert({
            type: AlertType.AB_TEST_SIGNIFICANT,
            severity: AlertSeverity.INFO,
            message: `A/B Test "${test.name}" reached statistical significance`,
            data: results
          });
        }
        
        // 실시간 결과 업데이트
        this.websocketServer.broadcast('ab-test-update', {
          testId: test.id,
          results: results
        });
      }
    }, 60000); // 1분마다 체크
  }
}
```

### 4.2 이상 탐지 시스템
```typescript
// [의도] 게임 데이터에서 이상 패턴을 자동으로 탐지
// [책임] 이상 탐지, 분류, 알림, 자동 대응
export class AnomalyDetectionSystem {
  private detectionEngines: Map<string, AnomalyDetector>;
  private mlModels: Map<string, MLModel>;
  private alertRouter: AlertRouter;
  private responseAutomator: ResponseAutomator;
  
  constructor() {
    this.detectionEngines = new Map();
    this.mlModels = new Map();
    this.alertRouter = new AlertRouter();
    this.responseAutomator = new ResponseAutomator();
    
    this.initializeDetectors();
  }
  
  private initializeDetectors(): void {
    // 통계적 이상 탐지
    this.detectionEngines.set('statistical', new StatisticalAnomalyDetector({
      algorithms: ['z-score', 'iqr', 'isolation-forest'],
      sensitivity: 0.05 // 5% 임계값
    }));
    
    // 시계열 이상 탐지
    this.detectionEngines.set('time-series', new TimeSeriesAnomalyDetector({
      algorithms: ['lstm', 'arima', 'prophet'],
      windowSize: 288, // 24시간 (5분 간격)
      forecastHorizon: 12 // 1시간 예측
    }));
    
    // 행동 패턴 이상 탐지
    this.detectionEngines.set('behavioral', new BehavioralAnomalyDetector({
      algorithms: ['one-class-svm', 'autoencoder'],
      features: ['session_duration', 'actions_per_session', 'purchase_frequency']
    }));
    
    // 부정행위 탐지
    this.detectionEngines.set('fraud', new FraudDetectionEngine({
      algorithms: ['gradient-boosting', 'neural-network'],
      features: ['win_rate', 'progression_speed', 'spending_patterns']
    }));
  }
  
  async detectAnomalies(
    dataType: DataType, 
    timeWindow: TimeWindow
  ): Promise<AnomalyReport> {
    const data = await this.collectData(dataType, timeWindow);
    const anomalies: Anomaly[] = [];
    
    // 모든 탐지 엔진 실행
    for (const [engineName, detector] of this.detectionEngines) {
      try {
        const engineAnomalies = await detector.detect(data);
        anomalies.push(...engineAnomalies.map(anomaly => ({
          ...anomaly,
          detectorType: engineName,
          confidence: anomaly.confidence || 0.5
        })));
      } catch (error) {
        console.error(`Anomaly detection failed for ${engineName}:`, error);
      }
    }
    
    // 이상 현상 통합 및 중복 제거
    const consolidatedAnomalies = this.consolidateAnomalies(anomalies);
    
    // 심각도별 분류
    const classifiedAnomalies = this.classifyAnomalies(consolidatedAnomalies);
    
    // 보고서 생성
    const report: AnomalyReport = {
      timestamp: Date.now(),
      dataType,
      timeWindow,
      totalAnomalies: classifiedAnomalies.length,
      criticalAnomalies: classifiedAnomalies.filter(a => a.severity === 'critical').length,
      anomalies: classifiedAnomalies,
      summary: this.generateAnomalySummary(classifiedAnomalies)
    };
    
    // 자동 대응 실행
    await this.executeAutomaticResponse(report);
    
    return report;
  }
  
  // 특정 도메인별 이상 탐지
  async detectGameplayAnomalies(): Promise<GameplayAnomalyReport> {
    const data = await this.collectGameplayData();
    
    const anomalies = await Promise.all([
      this.detectWinRateAnomalies(data.winRates),
      this.detectProgressionAnomalies(data.progressions),
      this.detectSpendingAnomalies(data.purchases),
      this.detectEngagementAnomalies(data.sessions)
    ]);
    
    return {
      timestamp: Date.now(),
      winRateAnomalies: anomalies[0],
      progressionAnomalies: anomalies[1],
      spendingAnomalies: anomalies[2],
      engagementAnomalies: anomalies[3],
      overallRisk: this.calculateOverallRisk(anomalies.flat())
    };
  }
  
  private async detectWinRateAnomalies(winRateData: WinRateData[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    for (const playerData of winRateData) {
      // 비정상적으로 높은 승률
      if (playerData.winRate > 0.95 && playerData.gamesPlayed > 50) {
        anomalies.push({
          type: AnomalyType.SUSPICIOUS_WIN_RATE,
          severity: 'high',
          confidence: 0.9,
          description: `Player ${playerData.playerId} has ${(playerData.winRate * 100).toFixed(1)}% win rate over ${playerData.gamesPlayed} games`,
          affectedEntity: playerData.playerId,
          metrics: {
            winRate: playerData.winRate,
            gamesPlayed: playerData.gamesPlayed,
            expectedWinRate: 0.5
          }
        });
      }
      
      // 급격한 승률 변화
      const recentWinRate = playerData.recentWinRate;
      const historicalWinRate = playerData.historicalWinRate;
      const winRateChange = Math.abs(recentWinRate - historicalWinRate);
      
      if (winRateChange > 0.3 && playerData.recentGames > 20) {
        anomalies.push({
          type: AnomalyType.WIN_RATE_SPIKE,
          severity: 'medium',
          confidence: 0.7,
          description: `Player ${playerData.playerId} win rate changed by ${(winRateChange * 100).toFixed(1)}%`,
          affectedEntity: playerData.playerId,
          metrics: {
            recentWinRate,
            historicalWinRate,
            change: winRateChange
          }
        });
      }
    }
    
    return anomalies;
  }
  
  private async detectProgressionAnomalies(progressionData: ProgressionData[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    for (const playerData of progressionData) {
      // 비정상적으로 빠른 진행
      const progressionRate = playerData.levelGained / playerData.timePlayed;
      const expectedRate = this.getExpectedProgressionRate(playerData.currentLevel);
      
      if (progressionRate > expectedRate * 3) {
        anomalies.push({
          type: AnomalyType.RAPID_PROGRESSION,
          severity: 'high',
          confidence: 0.8,
          description: `Player ${playerData.playerId} progressing ${(progressionRate / expectedRate).toFixed(1)}x faster than expected`,
          affectedEntity: playerData.playerId,
          metrics: {
            actualRate: progressionRate,
            expectedRate: expectedRate,
            multiplier: progressionRate / expectedRate
          }
        });
      }
    }
    
    return anomalies;
  }
  
  // 자동 대응 시스템
  private async executeAutomaticResponse(report: AnomalyReport): Promise<void> {
    for (const anomaly of report.anomalies) {
      const response = this.responseAutomator.determineResponse(anomaly);
      
      switch (response.action) {
        case ResponseAction.IMMEDIATE_BAN:
          await this.banPlayer(anomaly.affectedEntity, response.reason);
          break;
          
        case ResponseAction.TEMPORARY_RESTRICTION:
          await this.restrictPlayer(anomaly.affectedEntity, response.duration);
          break;
          
        case ResponseAction.INCREASE_MONITORING:
          await this.increaseMonitoring(anomaly.affectedEntity);
          break;
          
        case ResponseAction.ALERT_HUMAN:
          await this.alertHumanModerator(anomaly);
          break;
          
        case ResponseAction.AUTO_INVESTIGATE:
          await this.startAutomaticInvestigation(anomaly);
          break;
      }
    }
  }
  
  // 이상 패턴 학습 및 모델 업데이트
  async updateDetectionModels(): Promise<void> {
    // 확인된 이상 사례들을 학습 데이터로 활용
    const labeledData = await this.getLabeledAnomalyData();
    
    for (const [modelName, model] of this.mlModels) {
      try {
        // 모델 재훈련
        await model.retrain(labeledData);
        
        // 성능 평가
        const performance = await model.evaluate();
        
        if (performance.accuracy < 0.8) {
          console.warn(`Model ${modelName} performance degraded: ${performance.accuracy}`);
        }
        
        // 모델 배포
        await model.deploy();
      } catch (error) {
        console.error(`Failed to update model ${modelName}:`, error);
      }
    }
  }
}
```

## 5. 예측 분석 AI

### 5.1 사용자 행동 예측
```typescript
// [의도] 머신러닝을 활용한 사용자 행동 예측 시스템
// [책임] 이탈 예측, LTV 예측, 구매 확률 예측
export class UserBehaviorPredictor {
  private churnModel: ChurnPredictionModel;
  private ltvModel: LTVPredictionModel;
  private purchaseModel: PurchasePredictionModel;
  private engagementModel: EngagementPredictionModel;
  private featureEngine: FeatureEngine;
  
  constructor() {
    this.churnModel = new ChurnPredictionModel();
    this.ltvModel = new LTVPredictionModel();
    this.purchaseModel = new PurchasePredictionModel();
    this.engagementModel = new EngagementPredictionModel();
    this.featureEngine = new FeatureEngine();
    
    this.initializeModels();
  }
  
  private async initializeModels(): Promise<void> {
    // 모델 로드 또는 초기화
    await Promise.all([
      this.churnModel.initialize(),
      this.ltvModel.initialize(),
      this.purchaseModel.initialize(),
      this.engagementModel.initialize()
    ]);
  }
  
  // 이탈 위험도 예측
  async predictChurnRisk(userId: string): Promise<ChurnPrediction> {
    // 사용자 특성 추출
    const features = await this.featureEngine.extractUserFeatures(userId);
    
    // 이탈 확률 예측
    const churnProbability = await this.churnModel.predict(features);
    
    // 주요 이탈 요인 분석
    const churnFactors = this.churnModel.explainPrediction(features);
    
    // 이탈 방지 액션 추천
    const preventionActions = this.recommendChurnPrevention(churnFactors);
    
    return {
      userId,
      churnProbability,
      riskLevel: this.categorizeChurnRisk(churnProbability),
      primaryFactors: churnFactors.slice(0, 3),
      timeToChurn: this.estimateTimeToChurn(features, churnProbability),
      preventionActions,
      confidence: this.churnModel.getConfidence(),
      timestamp: Date.now()
    };
  }
  
  // 생애 가치(LTV) 예측
  async predictLifetimeValue(userId: string): Promise<LTVPrediction> {
    const features = await this.featureEngine.extractUserFeatures(userId);
    
    // 다양한 기간별 LTV 예측
    const predictions = await Promise.all([
      this.ltvModel.predict(features, { timeHorizon: 30 }),   // 30일
      this.ltvModel.predict(features, { timeHorizon: 90 }),   // 90일
      this.ltvModel.predict(features, { timeHorizon: 365 }),  // 1년
      this.ltvModel.predict(features, { timeHorizon: 1095 })  // 3년
    ]);
    
    return {
      userId,
      ltv30: predictions[0].value,
      ltv90: predictions[1].value,
      ltv365: predictions[2].value,
      ltv1095: predictions[3].value,
      ltvSegment: this.categorizeLTVSegment(predictions[2].value),
      valueDrivers: this.identifyValueDrivers(features),
      growthPotential: this.assessGrowthPotential(features, predictions),
      confidence: predictions[2].confidence,
      timestamp: Date.now()
    };
  }
  
  // 구매 확률 예측
  async predictPurchaseProbability(
    userId: string, 
    productId?: string
  ): Promise<PurchasePrediction> {
    const features = await this.featureEngine.extractPurchaseFeatures(userId, productId);
    
    let predictions: any;
    
    if (productId) {
      // 특정 상품 구매 확률
      predictions = await this.purchaseModel.predictSpecificProduct(features, productId);
    } else {
      // 일반적인 구매 확률
      predictions = await this.purchaseModel.predictGeneral(features);
    }
    
    return {
      userId,
      productId,
      purchaseProbability: predictions.probability,
      expectedSpend: predictions.expectedAmount,
      optimalTiming: predictions.optimalTiming,
      recommendedOffers: this.generatePersonalizedOffers(features, predictions),
      conversionFactors: predictions.factors,
      confidence: predictions.confidence,
      timestamp: Date.now()
    };
  }
  
  // 참여도 예측
  async predictEngagement(userId: string): Promise<EngagementPrediction> {
    const features = await this.featureEngine.extractEngagementFeatures(userId);
    
    const predictions = await this.engagementModel.predict(features);
    
    return {
      userId,
      sessionFrequency: predictions.sessionFrequency,
      sessionDuration: predictions.sessionDuration,
      activityLevel: predictions.activityLevel,
      socialEngagement: predictions.socialEngagement,
      contentConsumption: predictions.contentConsumption,
      engagementScore: this.calculateEngagementScore(predictions),
      engagementTrend: this.analyzeEngagementTrend(features),
      improvementAreas: this.identifyImprovementAreas(predictions),
      timestamp: Date.now()
    };
  }
  
  // 배치 예측 (대량 사용자 처리)
  async batchPredict(
    userIds: string[], 
    predictionType: PredictionType
  ): Promise<BatchPredictionResult> {
    const batchSize = 1000;
    const results: any[] = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchFeatures = await this.featureEngine.extractBatchFeatures(batch);
      
      let batchPredictions: any[];
      
      switch (predictionType) {
        case PredictionType.CHURN:
          batchPredictions = await this.churnModel.batchPredict(batchFeatures);
          break;
        case PredictionType.LTV:
          batchPredictions = await this.ltvModel.batchPredict(batchFeatures);
          break;
        case PredictionType.PURCHASE:
          batchPredictions = await this.purchaseModel.batchPredict(batchFeatures);
          break;
        default:
          throw new Error(`Unsupported prediction type: ${predictionType}`);
      }
      
      results.push(...batchPredictions);
    }
    
    return {
      predictionType,
      totalUsers: userIds.length,
      predictions: results,
      summary: this.generateBatchSummary(results, predictionType),
      timestamp: Date.now()
    };
  }
  
  // 모델 성능 모니터링
  async monitorModelPerformance(): Promise<ModelPerformanceReport> {
    const models = [this.churnModel, this.ltvModel, this.purchaseModel, this.engagementModel];
    const performances: ModelPerformance[] = [];
    
    for (const model of models) {
      const performance = await this.evaluateModelPerformance(model);
      performances.push(performance);
      
      // 성능 저하 감지
      if (performance.accuracy < model.getMinAccuracyThreshold()) {
        await this.scheduleModelRetraining(model);
      }
    }
    
    return {
      timestamp: Date.now(),
      models: performances,
      overallHealth: this.calculateOverallModelHealth(performances),
      recommendations: this.generateModelRecommendations(performances)
    };
  }
  
  private async evaluateModelPerformance(model: MLModel): Promise<ModelPerformance> {
    // 최근 예측 정확도 계산
    const recentPredictions = await this.getRecentPredictions(model.getName());
    const actualOutcomes = await this.getActualOutcomes(recentPredictions);
    
    const accuracy = this.calculateAccuracy(recentPredictions, actualOutcomes);
    const precision = this.calculatePrecision(recentPredictions, actualOutcomes);
    const recall = this.calculateRecall(recentPredictions, actualOutcomes);
    const f1Score = 2 * (precision * recall) / (precision + recall);
    
    return {
      modelName: model.getName(),
      accuracy,
      precision,
      recall,
      f1Score,
      lastUpdated: model.getLastUpdateTime(),
      predictionCount: recentPredictions.length,
      driftScore: await this.calculateModelDrift(model)
    };
  }
  
  // 특성 중요도 분석
  analyzeFeatureImportance(modelType: ModelType): FeatureImportanceReport {
    const model = this.getModelByType(modelType);
    const featureImportances = model.getFeatureImportances();
    
    return {
      modelType,
      features: featureImportances.map(f => ({
        name: f.name,
        importance: f.importance,
        description: this.getFeatureDescription(f.name),
        actionable: this.isFeatureActionable(f.name)
      })).sort((a, b) => b.importance - a.importance),
      insights: this.generateFeatureInsights(featureImportances),
      timestamp: Date.now()
    };
  }
  
  // 예측 기반 액션 추천
  generateActionRecommendations(predictions: PredictionResult[]): ActionRecommendation[] {
    const recommendations: ActionRecommendation[] = [];
    
    for (const prediction of predictions) {
      switch (prediction.type) {
        case PredictionType.CHURN:
          if (prediction.value > 0.7) {
            recommendations.push({
              userId: prediction.userId,
              action: ActionType.RETENTION_CAMPAIGN,
              priority: Priority.HIGH,
              description: 'Send personalized retention offer',
              expectedImpact: 0.3,
              cost: 5.0
            });
          }
          break;
          
        case PredictionType.PURCHASE:
          if (prediction.value > 0.6) {
            recommendations.push({
              userId: prediction.userId,
              action: ActionType.TARGETED_OFFER,
              priority: Priority.MEDIUM,
              description: 'Show personalized product recommendation',
              expectedImpact: prediction.value * 0.5,
              cost: 1.0
            });
          }
          break;
      }
    }
    
    return recommendations.sort((a, b) => 
      (b.expectedImpact / b.cost) - (a.expectedImpact / a.cost)
    );
  }
}
```

### 5.2 게임 밸런스 예측
```typescript
// [의도] 게임 메타와 밸런스 변화를 예측하는 AI 시스템
// [책임] 메타 트렌드 예측, 밸런스 영향 분석, 최적화 제안
export class GameBalancePredictionAI {
  private metaTrendModel: MetaTrendModel;
  private balanceImpactModel: BalanceImpactModel;
  private cardUsagePredictor: CardUsagePredictor;
  private competitivenessAnalyzer: CompetitivenessAnalyzer;
  
  constructor() {
    this.metaTrendModel = new MetaTrendModel();
    this.balanceImpactModel = new BalanceImpactModel();
    this.cardUsagePredictor = new CardUsagePredictor();
    this.competitivenessAnalyzer = new CompetitivenessAnalyzer();
  }
  
  // 메타 트렌드 예측
  async predictMetaTrends(
    timeHorizon: number = 30 // 30일 예측
  ): Promise<MetaTrendPrediction> {
    // 현재 메타 데이터 수집
    const currentMeta = await this.getCurrentMetaSnapshot();
    
    // 시계열 특성 추출
    const timeSeriesFeatures = await this.extractTimeSeriesFeatures(currentMeta);
    
    // 트렌드 예측
    const trendPredictions = await this.metaTrendModel.predict({
      features: timeSeriesFeatures,
      horizon: timeHorizon
    });
    
    // 카드별 사용률 예측
    const cardUsagePredictions = await this.predictCardUsageChanges(
      currentMeta,
      timeHorizon
    );
    
    // 덱 아키타입 예측
    const archetypePredictions = await this.predictArchetypePopularity(
      currentMeta,
      timeHorizon
    );
    
    return {
      timeHorizon,
      currentMeta,
      predictedTrends: trendPredictions,
      cardUsageForecasts: cardUsagePredictions,
      archetypeForecasts: archetypePredictions,
      confidenceLevel: this.calculateTrendConfidence(trendPredictions),
      keyInsights: this.generateTrendInsights(trendPredictions),
      timestamp: Date.now()
    };
  }
  
  // 밸런스 변경 영향 예측
  async predictBalanceImpact(
    balanceChanges: BalanceChange[]
  ): Promise<BalanceImpactPrediction> {
    const impactPredictions: CardImpactPrediction[] = [];
    
    for (const change of balanceChanges) {
      // 직접적 영향 예측
      const directImpact = await this.predictDirectImpact(change);
      
      // 간접적 영향 예측 (다른 카드들에 미치는 영향)
      const indirectImpacts = await this.predictIndirectImpacts(change);
      
      // 메타 시프트 예측
      const metaShift = await this.predictMetaShift(change);
      
      impactPredictions.push({
        cardId: change.cardId,
        changeType: change.changeType,
        changeAmount: change.changeAmount,
        directImpact,
        indirectImpacts,
        metaShift,
        overallImpactScore: this.calculateOverallImpact(
          directImpact,
          indirectImpacts,
          metaShift
        )
      });
    }
    
    return {
      balanceChanges,
      cardImpacts: impactPredictions,
      predictedMetaState: await this.predictPostChangeMetaState(impactPredictions),
      diversityIndex: this.predictMetaDiversity(impactPredictions),
      competitiveBalance: this.predictCompetitiveBalance(impactPredictions),
      recommendations: this.generateBalanceRecommendations(impactPredictions),
      timestamp: Date.now()
    };
  }
  
  private async predictDirectImpact(change: BalanceChange): Promise<DirectImpact> {
    const historicalData = await this.getCardHistoricalData(change.cardId);
    
    // 특성 벡터 구성
    const features = {
      currentStats: historicalData.currentStats,
      changeVector: this.encodeBalanceChange(change),
      cardType: historicalData.cardType,
      elixirCost: historicalData.elixirCost,
      rarity: historicalData.rarity,
      synergies: historicalData.synergies
    };
    
    const prediction = await this.balanceImpactModel.predict(features);
    
    return {
      usageRateChange: prediction.usageRateChange,
      winRateChange: prediction.winRateChange,
      playRateChange: prediction.playRateChange,
      confidence: prediction.confidence,
      expectedTimeToStabilize: prediction.stabilizationTime
    };
  }
  
  private async predictIndirectImpacts(
    change: BalanceChange
  ): Promise<IndirectImpact[]> {
    const allCards = await this.getAllCards();
    const indirectImpacts: IndirectImpact[] = [];
    
    for (const card of allCards) {
      if (card.id === change.cardId) continue;
      
      // 카드 간 상호작용 분석
      const relationship = await this.analyzeCardRelationship(change.cardId, card.id);
      
      if (relationship.strength > 0.1) { // 유의미한 관계만
        const impact = await this.calculateIndirectImpact(
          change,
          card,
          relationship
        );
        
        indirectImpacts.push({
          affectedCardId: card.id,
          relationshipType: relationship.type,
          impactMagnitude: impact.magnitude,
          impactDirection: impact.direction,
          confidence: impact.confidence
        });
      }
    }
    
    return indirectImpacts.sort((a, b) => 
      Math.abs(b.impactMagnitude) - Math.abs(a.impactMagnitude)
    );
  }
  
  // 경쟁 균형성 분석
  async analyzeCompetitiveBalance(): Promise<CompetitiveBalanceReport> {
    const currentMeta = await this.getCurrentMetaSnapshot();
    
    // 다양성 지수 계산
    const diversityMetrics = this.calculateDiversityMetrics(currentMeta);
    
    // 지배적 전략 분석
    const dominantStrategies = this.identifyDominantStrategies(currentMeta);
    
    // 카운터 플레이 가능성 분석
    const counterPlayAvailability = this.analyzeCounterPlayOptions(currentMeta);
    
    // 접근성 분석 (신규 플레이어를 위한)
    const accessibilityMetrics = await this.analyzeMetaAccessibility(currentMeta);
    
    return {
      overallBalanceScore: this.calculateOverallBalanceScore([
        diversityMetrics,
        counterPlayAvailability,
        accessibilityMetrics
      ]),
      diversityMetrics,
      dominantStrategies,
      counterPlayAvailability,
      accessibilityMetrics,
      balanceIssues: this.identifyBalanceIssues(currentMeta),
      improvementSuggestions: this.generateBalanceImprovements(currentMeta),
      timestamp: Date.now()
    };
  }
  
  // 자동 밸런스 최적화 제안
  async generateOptimalBalanceChanges(
    targetMetrics: BalanceTargets
  ): Promise<OptimalBalanceProposal> {
    // 현재 상태와 목표 상태 간 차이 분석
    const currentState = await this.getCurrentMetaSnapshot();
    const gap = this.calculateMetricGaps(currentState, targetMetrics);
    
    // 유전 알고리즘을 통한 최적 변경안 탐색
    const optimizer = new GeneticBalanceOptimizer({
      populationSize: 100,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8
    });
    
    const proposals = await optimizer.optimize({
      currentState,
      targetMetrics,
      constraints: this.getBalanceConstraints()
    });
    
    // 제안안들의 영향 시뮬레이션
    const simulatedResults = await Promise.all(
      proposals.map(proposal => this.simulateBalanceChanges(proposal))
    );
    
    // 최적안 선택
    const bestProposal = this.selectBestProposal(proposals, simulatedResults);
    
    return {
      targetMetrics,
      currentGaps: gap,
      recommendedChanges: bestProposal.changes,
      expectedOutcome: bestProposal.expectedOutcome,
      implementationPlan: this.generateImplementationPlan(bestProposal),
      riskAssessment: this.assessImplementationRisk(bestProposal),
      alternativeOptions: proposals.slice(1, 4), // 상위 3개 대안
      timestamp: Date.now()
    };
  }
  
  // 실시간 메타 모니터링
  startRealTimeMetaMonitoring(): void {
    setInterval(async () => {
      const currentMeta = await this.getCurrentMetaSnapshot();
      const previousMeta = await this.getPreviousMetaSnapshot();
      
      // 급격한 변화 감지
      const significantChanges = this.detectSignificantMetaChanges(
        previousMeta,
        currentMeta
      );
      
      if (significantChanges.length > 0) {
        // 변화 원인 분석
        const changeAnalysis = await this.analyzeMetaChangesCauses(
          significantChanges
        );
        
        // 알림 발송
        await this.sendMetaChangeAlert({
          changes: significantChanges,
          analysis: changeAnalysis,
          timestamp: Date.now()
        });
      }
      
      // 예측 모델 업데이트
      await this.updatePredictionModels(currentMeta);
    }, 300000); // 5분마다 체크
  }
  
  // 플레이어 세그먼트별 메타 분석
  async analyzeMetaByPlayerSegment(): Promise<SegmentedMetaAnalysis> {
    const segments = ['casual', 'competitive', 'professional'];
    const segmentAnalyses: SegmentMetaAnalysis[] = [];
    
    for (const segment of segments) {
      const segmentData = await this.getSegmentMetaData(segment);
      
      const analysis: SegmentMetaAnalysis = {
        segment,
        topDecks: segmentData.topDecks,
        cardUsageDistribution: segmentData.cardUsage,
        averageSkillLevel: segmentData.skillLevel,
        metaDiversity: this.calculateDiversityMetrics(segmentData),
        uniqueCharacteristics: this.identifySegmentUniqueFeatures(
          segment,
          segmentData
        )
      };
      
      segmentAnalyses.push(analysis);
    }
    
    return {
      segments: segmentAnalyses,
      crossSegmentInsights: this.generateCrossSegmentInsights(segmentAnalyses),
      balanceRecommendations: this.generateSegmentAwareBalanceRecommendations(
        segmentAnalyses
      ),
      timestamp: Date.now()
    };
  }
}
```

이 구현계획은 포괄적이고 고도화된 분석 시스템을 구축하기 위한 핵심 요소들을 다루고 있습니다. 실시간 데이터 처리, 머신러닝 기반 예측, 이상 탐지, 게임 밸런스 분석을 통해 데이터 기반의 의사결정을 지원하고 게임 운영을 최적화합니다.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "docs03/01-Game-Design.md \uc791\uc131 - \ud074\ub798\uc2dc\ub85c\uc584 \uc2a4\ud0c0\uc77c \uac8c\uc784 \uae30\ud68d\uc11c", "status": "completed", "priority": "high", "id": "1"}, {"content": "docs03/02-TRD.md \uc791\uc131 - \uae30\uc220 \uc694\uad6c\uc0ac\ud56d \ubb38\uc11c", "status": "completed", "priority": "high", "id": "2"}, {"content": "docs03/03-Battle-System-Design.md \uc791\uc131 - \uc804\ud22c \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "3"}, {"content": "docs03/04-Unit-System-Design.md \uc791\uc131 - \uc720\ub2db \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "4"}, {"content": "docs03/05-Deck-Card-System-Design.md \uc791\uc131 - \ub371/\uce74\ub4dc \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "5"}, {"content": "docs03/06-Matchmaking-System-Design.md \uc791\uc131 - \ub9e4\uce6d \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "6"}, {"content": "docs03/07-Progression-System-Design.md \uc791\uc131 - \uc9c4\ud589 \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "7"}, {"content": "docs03/08-Real-time-Networking-Design.md \uc791\uc131 - \uc2e4\uc2dc\uac04 \ub124\ud2b8\uc6cc\ud0b9 \uc124\uacc4", "status": "completed", "priority": "high", "id": "8"}, {"content": "docs03/09-AI-System-Design.md \uc791\uc131 - AI \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "9"}, {"content": "docs03/10-Economy-Monetization-Design.md \uc791\uc131 - \uacbd\uc81c/\uc218\uc775\ud654 \uc124\uacc4", "status": "completed", "priority": "high", "id": "10"}, {"content": "docs03/11-UI-UX-System-Design.md \uc791\uc131 - UI/UX \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "11"}, {"content": "docs03/12-Analytics-System-Design.md \uc791\uc131 - \ubd84\uc11d \uc2dc\uc2a4\ud15c \uc124\uacc4", "status": "completed", "priority": "high", "id": "12"}, {"content": "docs03/03-Battle-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "13"}, {"content": "docs03/04-Unit-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "14"}, {"content": "docs03/05-Deck-Card-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "15"}, {"content": "docs03/06-Matchmaking-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "16"}, {"content": "docs03/07-Progression-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "17"}, {"content": "docs03/08-Real-time-Networking-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "18"}, {"content": "docs03/09-AI-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "19"}, {"content": "docs03/10-Economy-Monetization-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "20"}, {"content": "docs03/11-UI-UX-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "21"}, {"content": "docs03/12-Analytics-System-Design-\uad6c\ud604\uacc4\ud68d.md \uc791\uc131", "status": "completed", "priority": "medium", "id": "22"}]