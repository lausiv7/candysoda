# 분석 시스템 설계

## 개요

Sweet Puzzle 게임의 데이터 분석 및 비즈니스 인텔리전스 시스템 설계서입니다. 플레이어 행동 분석, 실시간 지표 모니터링, A/B 테스트, 예측 분석을 통해 데이터 기반 의사결정을 지원하고 게임 운영을 최적화하는 시스템을 구축합니다.

---

## 1. 📊 데이터 수집 시스템

### 이벤트 추적 아키텍처

#### 게임 이벤트 정의
```typescript
// 핵심 게임 이벤트 타입 정의
export enum GameEventType {
    // 세션 관련
    SESSION_START = 'session_start',
    SESSION_END = 'session_end',
    
    // 게임플레이 관련
    LEVEL_START = 'level_start',
    LEVEL_COMPLETE = 'level_complete',
    LEVEL_FAIL = 'level_fail',
    LEVEL_RETRY = 'level_retry',
    
    // 매치 관련
    MATCH_MADE = 'match_made',
    SPECIAL_BLOCK_CREATED = 'special_block_created',
    SPECIAL_BLOCK_USED = 'special_block_used',
    COMBO_ACHIEVED = 'combo_achieved',
    
    // 경제 관련
    CURRENCY_EARNED = 'currency_earned',
    CURRENCY_SPENT = 'currency_spent',
    PURCHASE_MADE = 'purchase_made',
    PURCHASE_FAILED = 'purchase_failed',
    
    // 소셜 관련
    FRIEND_INVITED = 'friend_invited',
    GIFT_SENT = 'gift_sent',
    GIFT_RECEIVED = 'gift_received',
    
    // UI 관련
    BUTTON_CLICKED = 'button_clicked',
    SCREEN_VIEWED = 'screen_viewed',
    TUTORIAL_STEP_COMPLETED = 'tutorial_step_completed',
    
    // 광고 관련
    AD_IMPRESSION = 'ad_impression',
    AD_CLICKED = 'ad_clicked',
    AD_COMPLETED = 'ad_completed',
    AD_SKIPPED = 'ad_skipped'
}

// 이벤트 데이터 구조
export interface GameEvent {
    eventType: GameEventType;
    timestamp: number;
    sessionId: string;
    playerId: string;
    deviceId: string;
    
    // 이벤트별 고유 데이터
    properties: EventProperties;
    
    // 컨텍스트 정보
    context: EventContext;
}

export interface EventProperties {
    [key: string]: string | number | boolean | object;
}

export interface EventContext {
    gameVersion: string;
    platform: string;
    deviceModel: string;
    osVersion: string;
    screenResolution: string;
    language: string;
    country: string;
    timezone: string;
    
    // 게임 상태
    playerLevel: number;
    currentWorld: number;
    totalPlayTime: number;
    sessionNumber: number;
}

// 이벤트 수집 관리자
export class AnalyticsManager {
    private static instance: AnalyticsManager;
    private eventQueue: GameEvent[] = [];
    private collectors: AnalyticsCollector[] = [];
    private sessionId: string;
    private isEnabled: boolean = true;
    private batchSize: number = 50;
    private flushInterval: number = 30000; // 30초
    
    static getInstance(): AnalyticsManager {
        if (!this.instance) {
            this.instance = new AnalyticsManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.sessionId = this.generateSessionId();
        this.setupCollectors();
        this.startBatchProcessor();
        this.trackSessionStart();
    }
    
    trackEvent(eventType: GameEventType, properties: EventProperties = {}): void {
        if (!this.isEnabled) return;
        
        const event: GameEvent = {
            eventType: eventType,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            playerId: PlayerManager.getInstance().getCurrentPlayerId(),
            deviceId: this.getDeviceId(),
            properties: properties,
            context: this.buildEventContext()
        };
        
        // 이벤트 검증
        if (this.validateEvent(event)) {
            this.eventQueue.push(event);
            
            // 중요한 이벤트는 즉시 전송
            if (this.isCriticalEvent(eventType)) {
                this.flushEvents();
            }
        }
        
        // 로컬 디버그 로깅
        if (CC_DEBUG) {
            console.log(`[Analytics] ${eventType}:`, properties);
        }
    }
    
    private setupCollectors(): void {
        // Firebase Analytics
        this.collectors.push(new FirebaseAnalyticsCollector());
        
        // 커스텀 분석 서버
        this.collectors.push(new CustomAnalyticsCollector());
        
        // 서드파티 분석 도구들
        if (this.isCollectorEnabled('mixpanel')) {
            this.collectors.push(new MixpanelCollector());
        }
        
        if (this.isCollectorEnabled('amplitude')) {
            this.collectors.push(new AmplitudeCollector());
        }
        
        // A/B 테스트 플랫폼
        this.collectors.push(new ABTestCollector());
    }
    
    private startBatchProcessor(): void {
        setInterval(() => {
            if (this.eventQueue.length >= this.batchSize) {
                this.flushEvents();
            }
        }, this.flushInterval);
        
        // 앱이 백그라운드로 이동할 때도 이벤트 전송
        cc.game.on(cc.game.EVENT_HIDE, () => {
            this.flushEvents();
        });
        
        // 앱 종료 시 이벤트 전송
        cc.game.on(cc.game.EVENT_GAME_INITED, () => {
            window.addEventListener('beforeunload', () => {
                this.flushEvents();
            });
        });
    }
    
    private flushEvents(): void {
        if (this.eventQueue.length === 0) return;
        
        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];
        
        // 모든 수집기에 이벤트 전송
        this.collectors.forEach(collector => {
            collector.sendEvents(eventsToSend).catch(error => {
                console.error(`Failed to send events to ${collector.name}:`, error);
                
                // 실패한 이벤트는 다시 큐에 추가 (재시도)
                if (collector.retryable) {
                    this.eventQueue.unshift(...eventsToSend);
                }
            });
        });
    }
    
    private buildEventContext(): EventContext {
        return {
            gameVersion: GameConfig.VERSION,
            platform: cc.sys.platform,
            deviceModel: this.getDeviceModel(),
            osVersion: cc.sys.osVersion,
            screenResolution: `${cc.view.getFrameSize().width}x${cc.view.getFrameSize().height}`,
            language: cc.sys.language,
            country: this.getCountryCode(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            
            playerLevel: PlayerManager.getInstance().getPlayerLevel(),
            currentWorld: PlayerManager.getInstance().getCurrentWorld(),
            totalPlayTime: PlayerManager.getInstance().getTotalPlayTime(),
            sessionNumber: this.getSessionNumber()
        };
    }
    
    // 특정 게임 이벤트 추적 메서드들
    trackLevelStart(levelId: string, attemptNumber: number): void {
        this.trackEvent(GameEventType.LEVEL_START, {
            level_id: levelId,
            attempt_number: attemptNumber,
            world_id: PlayerManager.getInstance().getCurrentWorld(),
            player_level: PlayerManager.getInstance().getPlayerLevel(),
            boosters_available: this.getAvailableBoosters()
        });
    }
    
    trackLevelComplete(levelId: string, score: number, movesUsed: number, starsEarned: number, timeSpent: number): void {
        this.trackEvent(GameEventType.LEVEL_COMPLETE, {
            level_id: levelId,
            score: score,
            moves_used: movesUsed,
            stars_earned: starsEarned,
            time_spent: timeSpent,
            boosters_used: this.getBoostersUsedInLevel(),
            difficulty_rating: this.getCurrentDifficultyRating()
        });
    }
    
    trackPurchase(itemId: string, itemType: string, price: number, currency: string, transactionId: string): void {
        this.trackEvent(GameEventType.PURCHASE_MADE, {
            item_id: itemId,
            item_type: itemType,
            price: price,
            currency: currency,
            transaction_id: transactionId,
            player_level: PlayerManager.getInstance().getPlayerLevel(),
            days_since_install: this.getDaysSinceInstall(),
            previous_purchases: PlayerManager.getInstance().getPurchaseHistory().length
        });
    }
    
    trackAdInteraction(adType: string, adProvider: string, placement: string, action: string, revenue?: number): void {
        this.trackEvent(GameEventType.AD_IMPRESSION, {
            ad_type: adType,
            ad_provider: adProvider,
            placement: placement,
            action: action,
            revenue: revenue || 0,
            session_ad_count: this.getSessionAdCount(),
            level_context: this.getCurrentLevelContext()
        });
    }
}
```

### 실시간 데이터 파이프라인

#### 스트리밍 분석 시스템
```typescript
// 실시간 데이터 처리를 위한 스트림 프로세서
export class RealTimeAnalyticsProcessor {
    private static instance: RealTimeAnalyticsProcessor;
    private eventStream: EventStream;
    private processors: Map<string, StreamProcessor> = new Map();
    private alertSystem: AlertSystem;
    
    static getInstance(): RealTimeAnalyticsProcessor {
        if (!this.instance) {
            this.instance = new RealTimeAnalyticsProcessor();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.eventStream = new EventStream();
        this.setupProcessors();
        this.alertSystem = new AlertSystem();
        this.startProcessing();
    }
    
    private setupProcessors(): void {
        // 실시간 KPI 계산 프로세서
        this.processors.set('kpi_calculator', new KPICalculatorProcessor({
            windowSize: 5 * 60 * 1000, // 5분 윈도우
            metrics: ['dau', 'session_length', 'retention', 'revenue']
        }));
        
        // 이상 탐지 프로세서
        this.processors.set('anomaly_detector', new AnomalyDetectorProcessor({
            sensitivity: 0.85,
            lookbackWindow: 24 * 60 * 60 * 1000, // 24시간
            alertThreshold: 2.0 // 2 표준편차
        }));
        
        // 사용자 세그멘테이션 프로세서
        this.processors.set('user_segmentation', new UserSegmentationProcessor({
            segments: ['new_users', 'casual_players', 'core_players', 'whales'],
            updateInterval: 60 * 1000 // 1분마다 업데이트
        }));
        
        // 수익 최적화 프로세서
        this.processors.set('revenue_optimizer', new RevenueOptimizerProcessor({
            strategies: ['pricing', 'offers', 'ad_placement'],
            learningRate: 0.1
        }));
    }
    
    processEvent(event: GameEvent): void {
        // 모든 프로세서에 이벤트 전달
        for (const [name, processor] of this.processors) {
            try {
                const result = processor.process(event);
                
                if (result.hasAlert) {
                    this.alertSystem.sendAlert(result.alert);
                }
                
                if (result.hasUpdate) {
                    this.broadcastUpdate(name, result.update);
                }
            } catch (error) {
                console.error(`Error in processor ${name}:`, error);
            }
        }
    }
    
    private broadcastUpdate(processorName: string, update: ProcessorUpdate): void {
        EventBus.getInstance().emit('analytics_update', {
            processor: processorName,
            update: update,
            timestamp: Date.now()
        });
    }
}

// KPI 계산 프로세서
export class KPICalculatorProcessor implements StreamProcessor {
    private windowData: Map<string, TimeSeries> = new Map();
    private config: KPIProcessorConfig;
    
    constructor(config: KPIProcessorConfig) {
        this.config = config;
        this.initializeTimeSeries();
    }
    
    process(event: GameEvent): ProcessorResult {
        const timestamp = event.timestamp;
        
        // DAU 계산
        this.updateDAU(event);
        
        // 세션 길이 계산
        if (event.eventType === GameEventType.SESSION_END) {
            this.updateSessionLength(event);
        }
        
        // 수익 계산
        if (event.eventType === GameEventType.PURCHASE_MADE) {
            this.updateRevenue(event);
        }
        
        // 리텐션 계산
        if (event.eventType === GameEventType.SESSION_START) {
            this.updateRetention(event);
        }
        
        // 윈도우 기반 메트릭 계산
        const currentWindow = Math.floor(timestamp / this.config.windowSize);
        const metrics = this.calculateWindowMetrics(currentWindow);
        
        return {
            hasUpdate: true,
            update: {
                type: 'kpi_update',
                data: metrics,
                window: currentWindow
            },
            hasAlert: false
        };
    }
    
    private updateDAU(event: GameEvent): void {
        const date = new Date(event.timestamp).toDateString();
        const dauSeries = this.windowData.get('dau');
        
        if (dauSeries) {
            dauSeries.addUniqueValue(date, event.playerId);
        }
    }
    
    private updateSessionLength(event: GameEvent): void {
        const sessionLength = event.properties['session_length'] as number;
        if (sessionLength) {
            const lengthSeries = this.windowData.get('session_length');
            lengthSeries?.addValue(event.timestamp, sessionLength);
        }
    }
    
    private calculateWindowMetrics(window: number): KPIMetrics {
        const windowStart = window * this.config.windowSize;
        const windowEnd = windowStart + this.config.windowSize;
        
        return {
            window: window,
            timeRange: { start: windowStart, end: windowEnd },
            dau: this.windowData.get('dau')?.getUniqueCount(windowStart, windowEnd) || 0,
            averageSessionLength: this.windowData.get('session_length')?.getAverage(windowStart, windowEnd) || 0,
            totalRevenue: this.windowData.get('revenue')?.getSum(windowStart, windowEnd) || 0,
            retention: this.calculateRetentionRate(windowStart, windowEnd)
        };
    }
}

// 이상 탐지 프로세서
export class AnomalyDetectorProcessor implements StreamProcessor {
    private historicalData: Map<string, HistoricalMetrics> = new Map();
    private config: AnomalyDetectorConfig;
    
    constructor(config: AnomalyDetectorConfig) {
        this.config = config;
    }
    
    process(event: GameEvent): ProcessorResult {
        const metricValue = this.extractMetricValue(event);
        if (metricValue === null) {
            return { hasUpdate: false, hasAlert: false };
        }
        
        const metricName = this.getMetricName(event);
        const historical = this.historicalData.get(metricName);
        
        if (!historical) {
            // 초기 데이터 수집
            this.historicalData.set(metricName, new HistoricalMetrics());
            return { hasUpdate: false, hasAlert: false };
        }
        
        // 이상 탐지 수행
        const anomalyScore = this.calculateAnomalyScore(metricValue, historical);
        
        if (anomalyScore > this.config.alertThreshold) {
            return {
                hasUpdate: true,
                update: {
                    type: 'anomaly_detected',
                    data: {
                        metric: metricName,
                        value: metricValue,
                        score: anomalyScore,
                        timestamp: event.timestamp
                    }
                },
                hasAlert: true,
                alert: {
                    severity: this.getAlertSeverity(anomalyScore),
                    title: `Anomaly detected in ${metricName}`,
                    message: `Value: ${metricValue}, Score: ${anomalyScore.toFixed(2)}`,
                    timestamp: event.timestamp
                }
            };
        }
        
        // 정상 데이터로 히스토리 업데이트
        historical.addValue(metricValue, event.timestamp);
        
        return { hasUpdate: false, hasAlert: false };
    }
    
    private calculateAnomalyScore(value: number, historical: HistoricalMetrics): number {
        const mean = historical.getMean();
        const stdDev = historical.getStandardDeviation();
        
        if (stdDev === 0) return 0;
        
        // Z-score 기반 이상 탐지
        const zScore = Math.abs((value - mean) / stdDev);
        
        // 추가적인 이상 탐지 알고리즘 적용
        const seasonalScore = this.calculateSeasonalAnomalyScore(value, historical);
        const trendScore = this.calculateTrendAnomalyScore(value, historical);
        
        // 종합 이상 점수
        return Math.max(zScore, seasonalScore, trendScore);
    }
    
    private calculateSeasonalAnomalyScore(value: number, historical: HistoricalMetrics): number {
        // 요일별, 시간대별 패턴 분석
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hourOfDay = now.getHours();
        
        const seasonalMean = historical.getSeasonalMean(dayOfWeek, hourOfDay);
        const seasonalStdDev = historical.getSeasonalStdDev(dayOfWeek, hourOfDay);
        
        if (seasonalStdDev === 0) return 0;
        
        return Math.abs((value - seasonalMean) / seasonalStdDev);
    }
}
```

---

## 2. 📈 비즈니스 인텔리전스

### 대시보드 시스템

#### 실시간 KPI 모니터링
```typescript
// 비즈니스 대시보드 관리자
export class BusinessDashboard {
    private static instance: BusinessDashboard;
    private widgets: Map<string, DashboardWidget> = new Map();
    private dataProviders: Map<string, DataProvider> = new Map();
    private updateScheduler: UpdateScheduler;
    
    static getInstance(): BusinessDashboard {
        if (!this.instance) {
            this.instance = new BusinessDashboard();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.setupDataProviders();
        this.createDashboardWidgets();
        this.updateScheduler = new UpdateScheduler();
        this.startRealTimeUpdates();
    }
    
    private setupDataProviders(): void {
        // 플레이어 메트릭 데이터 제공자
        this.dataProviders.set('player_metrics', new PlayerMetricsProvider({
            metrics: ['dau', 'mau', 'new_users', 'returning_users'],
            updateInterval: 60 * 1000 // 1분
        }));
        
        // 수익 메트릭 데이터 제공자
        this.dataProviders.set('revenue_metrics', new RevenueMetricsProvider({
            metrics: ['daily_revenue', 'arpu', 'arppu', 'ltv'],
            updateInterval: 5 * 60 * 1000 // 5분
        }));
        
        // 게임플레이 메트릭 데이터 제공자
        this.dataProviders.set('gameplay_metrics', new GameplayMetricsProvider({
            metrics: ['level_completion_rate', 'session_length', 'retention_rate'],
            updateInterval: 2 * 60 * 1000 // 2분
        }));
        
        // 기술적 메트릭 데이터 제공자
        this.dataProviders.set('technical_metrics', new TechnicalMetricsProvider({
            metrics: ['crash_rate', 'load_time', 'fps', 'memory_usage'],
            updateInterval: 30 * 1000 // 30초
        }));
    }
    
    private createDashboardWidgets(): void {
        // 핵심 KPI 위젯
        this.widgets.set('kpi_overview', new KPIOverviewWidget({
            title: 'Key Performance Indicators',
            metrics: ['dau', 'revenue', 'retention_d1', 'conversion_rate'],
            layout: 'grid',
            refreshRate: 60000
        }));
        
        // 실시간 플레이어 활동 위젯
        this.widgets.set('live_activity', new LiveActivityWidget({
            title: 'Live Player Activity',
            type: 'real_time_chart',
            metrics: ['concurrent_users', 'levels_completed', 'purchases'],
            timeWindow: 24 * 60 * 60 * 1000, // 24시간
            refreshRate: 10000 // 10초
        }));
        
        // 수익 트렌드 위젯
        this.widgets.set('revenue_trend', new RevenueTrendWidget({
            title: 'Revenue Trends',
            type: 'time_series',
            metrics: ['daily_revenue', 'weekly_revenue', 'monthly_revenue'],
            timeRange: '30d',
            refreshRate: 300000 // 5분
        }));
        
        // 플레이어 퍼널 위젯
        this.widgets.set('player_funnel', new PlayerFunnelWidget({
            title: 'Player Conversion Funnel',
            type: 'funnel',
            steps: ['install', 'tutorial_complete', 'level_10', 'first_purchase'],
            refreshRate: 600000 // 10분
        }));
        
        // 지역별 분석 위젯
        this.widgets.set('geo_analytics', new GeoAnalyticsWidget({
            title: 'Geographic Analytics',
            type: 'map',
            metrics: ['users_by_country', 'revenue_by_region'],
            refreshRate: 300000 // 5분
        }));
    }
    
    getWidgetData(widgetId: string, timeRange?: TimeRange): Promise<WidgetData> {
        const widget = this.widgets.get(widgetId);
        if (!widget) {
            throw new Error(`Widget ${widgetId} not found`);
        }
        
        return widget.getData(timeRange);
    }
    
    private startRealTimeUpdates(): void {
        // 위젯별 업데이트 스케줄링
        for (const [id, widget] of this.widgets) {
            this.updateScheduler.schedule(id, widget.refreshRate, async () => {
                try {
                    const newData = await widget.fetchData();
                    EventBus.getInstance().emit('widget_updated', {
                        widgetId: id,
                        data: newData,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error(`Failed to update widget ${id}:`, error);
                }
            });
        }
    }
}

// KPI 개요 위젯
export class KPIOverviewWidget implements DashboardWidget {
    private config: KPIWidgetConfig;
    private cache: Map<string, CachedData> = new Map();
    
    constructor(config: KPIWidgetConfig) {
        this.config = config;
    }
    
    async getData(timeRange?: TimeRange): Promise<WidgetData> {
        const data: KPIData = {};
        
        for (const metric of this.config.metrics) {
            const cachedData = this.cache.get(metric);
            
            if (cachedData && this.isCacheValid(cachedData)) {
                data[metric] = cachedData.value;
            } else {
                const value = await this.fetchMetricValue(metric, timeRange);
                data[metric] = value;
                
                this.cache.set(metric, {
                    value: value,
                    timestamp: Date.now(),
                    ttl: this.config.refreshRate
                });
            }
        }
        
        return {
            type: 'kpi_overview',
            data: data,
            metadata: {
                lastUpdated: Date.now(),
                timeRange: timeRange || this.getDefaultTimeRange()
            }
        };
    }
    
    private async fetchMetricValue(metric: string, timeRange?: TimeRange): Promise<MetricValue> {
        switch (metric) {
            case 'dau':
                return await this.calculateDAU(timeRange);
            case 'revenue':
                return await this.calculateRevenue(timeRange);
            case 'retention_d1':
                return await this.calculateRetention(1, timeRange);
            case 'conversion_rate':
                return await this.calculateConversionRate(timeRange);
            default:
                throw new Error(`Unknown metric: ${metric}`);
        }
    }
    
    private async calculateDAU(timeRange?: TimeRange): Promise<MetricValue> {
        const analyticsDB = AnalyticsDatabase.getInstance();
        const today = timeRange || { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() };
        
        const uniqueUsers = await analyticsDB.query(`
            SELECT COUNT(DISTINCT player_id) as dau
            FROM events 
            WHERE event_type = 'session_start' 
            AND timestamp BETWEEN ${today.start} AND ${today.end}
        `);
        
        const yesterday = { 
            start: today.start - 24 * 60 * 60 * 1000, 
            end: today.start 
        };
        
        const previousDau = await analyticsDB.query(`
            SELECT COUNT(DISTINCT player_id) as dau
            FROM events 
            WHERE event_type = 'session_start' 
            AND timestamp BETWEEN ${yesterday.start} AND ${yesterday.end}
        `);
        
        const currentValue = uniqueUsers[0].dau;
        const previousValue = previousDau[0].dau;
        const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        
        return {
            current: currentValue,
            previous: previousValue,
            change: change,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
    }
    
    private async calculateRevenue(timeRange?: TimeRange): Promise<MetricValue> {
        const analyticsDB = AnalyticsDatabase.getInstance();
        const today = timeRange || { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() };
        
        const revenue = await analyticsDB.query(`
            SELECT SUM(CAST(properties->>'price' AS DECIMAL)) as total_revenue
            FROM events 
            WHERE event_type = 'purchase_made' 
            AND timestamp BETWEEN ${today.start} AND ${today.end}
        `);
        
        const yesterday = { 
            start: today.start - 24 * 60 * 60 * 1000, 
            end: today.start 
        };
        
        const previousRevenue = await analyticsDB.query(`
            SELECT SUM(CAST(properties->>'price' AS DECIMAL)) as total_revenue
            FROM events 
            WHERE event_type = 'purchase_made' 
            AND timestamp BETWEEN ${yesterday.start} AND ${yesterday.end}
        `);
        
        const currentValue = revenue[0].total_revenue || 0;
        const previousValue = previousRevenue[0].total_revenue || 0;
        const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        
        return {
            current: currentValue,
            previous: previousValue,
            change: change,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
            format: 'currency'
        };
    }
}
```

### 예측 분석 시스템

#### 플레이어 생애 가치 예측
```typescript
// 예측 분석 엔진
export class PredictiveAnalytics {
    private static instance: PredictiveAnalytics;
    private models: Map<string, PredictiveModel> = new Map();
    private dataPreprocessor: DataPreprocessor;
    
    static getInstance(): PredictiveAnalytics {
        if (!this.instance) {
            this.instance = new PredictiveAnalytics();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.dataPreprocessor = new DataPreprocessor();
        this.setupPredictiveModels();
        this.startModelTraining();
    }
    
    private setupPredictiveModels(): void {
        // LTV 예측 모델
        this.models.set('ltv_prediction', new LTVPredictionModel({
            algorithm: 'random_forest',
            features: [
                'days_since_install',
                'total_sessions',
                'average_session_length',
                'levels_completed',
                'purchase_count',
                'total_spent',
                'social_connections',
                'last_login_days_ago'
            ],
            targetVariable: 'ltv_90_days',
            trainingDataWindow: 90 * 24 * 60 * 60 * 1000 // 90일
        }));
        
        // 이탈 예측 모델
        this.models.set('churn_prediction', new ChurnPredictionModel({
            algorithm: 'gradient_boosting',
            features: [
                'days_since_last_session',
                'session_frequency_decline',
                'level_progress_stagnation',
                'purchase_recency',
                'support_tickets',
                'app_version_outdated'
            ],
            targetVariable: 'churn_7_days',
            threshold: 0.7
        }));
        
        // 구매 확률 예측 모델
        this.models.set('purchase_probability', new PurchaseProbabilityModel({
            algorithm: 'logistic_regression',
            features: [
                'free_currency_balance',
                'stuck_on_level_duration',
                'previous_purchase_days_ago',
                'special_offer_views',
                'friend_purchases',
                'difficulty_spike_encountered'
            ],
            targetVariable: 'purchase_next_24h'
        }));
        
        // 콘텐츠 선호도 예측 모델
        this.models.set('content_preference', new ContentPreferenceModel({
            algorithm: 'collaborative_filtering',
            features: [
                'level_completion_patterns',
                'booster_usage_patterns',
                'social_interaction_patterns',
                'time_of_day_patterns',
                'difficulty_preferences'
            ],
            targetVariable: 'preferred_content_types'
        }));
    }
    
    async predictPlayerLTV(playerId: string, predictionDays: number = 90): Promise<LTVPrediction> {
        const model = this.models.get('ltv_prediction') as LTVPredictionModel;
        if (!model) {
            throw new Error('LTV prediction model not found');
        }
        
        // 플레이어 특성 데이터 수집
        const playerFeatures = await this.extractPlayerFeatures(playerId);
        
        // 데이터 전처리
        const processedFeatures = this.dataPreprocessor.process(playerFeatures);
        
        // 예측 수행
        const prediction = await model.predict(processedFeatures);
        
        // 신뢰도 계산
        const confidence = this.calculatePredictionConfidence(prediction, model);
        
        // 예측 결과 구성
        return {
            playerId: playerId,
            predictedLTV: prediction.value,
            confidence: confidence,
            predictionHorizon: predictionDays,
            factors: this.extractImportantFactors(prediction, model),
            lastUpdated: Date.now(),
            
            // 세그먼트별 예측
            segments: {
                low_value: prediction.value < 5,
                medium_value: prediction.value >= 5 && prediction.value < 25,
                high_value: prediction.value >= 25 && prediction.value < 100,
                whale: prediction.value >= 100
            }
        };
    }
    
    async predictChurnRisk(playerId: string): Promise<ChurnPrediction> {
        const model = this.models.get('churn_prediction') as ChurnPredictionModel;
        if (!model) {
            throw new Error('Churn prediction model not found');
        }
        
        const playerFeatures = await this.extractChurnFeatures(playerId);
        const processedFeatures = this.dataPreprocessor.process(playerFeatures);
        
        const prediction = await model.predict(processedFeatures);
        const churnProbability = prediction.probability;
        
        // 리스크 레벨 결정
        let riskLevel: ChurnRiskLevel;
        if (churnProbability >= 0.8) {
            riskLevel = ChurnRiskLevel.CRITICAL;
        } else if (churnProbability >= 0.6) {
            riskLevel = ChurnRiskLevel.HIGH;
        } else if (churnProbability >= 0.4) {
            riskLevel = ChurnRiskLevel.MEDIUM;
        } else {
            riskLevel = ChurnRiskLevel.LOW;
        }
        
        // 이탈 방지 추천 액션 생성
        const preventionActions = this.generateChurnPreventionActions(churnProbability, playerFeatures);
        
        return {
            playerId: playerId,
            churnProbability: churnProbability,
            riskLevel: riskLevel,
            keyRiskFactors: this.identifyRiskFactors(prediction, model),
            preventionActions: preventionActions,
            confidenceScore: this.calculatePredictionConfidence(prediction, model),
            predictionDate: Date.now(),
            
            // 시간별 위험도 예측
            timeBasedRisk: {
                next_7_days: churnProbability,
                next_14_days: Math.min(churnProbability * 1.3, 1.0),
                next_30_days: Math.min(churnProbability * 1.6, 1.0)
            }
        };
    }
    
    private async extractPlayerFeatures(playerId: string): Promise<PlayerFeatures> {
        const analyticsDB = AnalyticsDatabase.getInstance();
        const playerData = await PlayerManager.getInstance().getPlayerData(playerId);
        
        // 기본 플레이어 정보
        const installDate = playerData.installDate;
        const daysSinceInstall = (Date.now() - installDate) / (24 * 60 * 60 * 1000);
        
        // 세션 관련 특성
        const sessionData = await analyticsDB.query(`
            SELECT 
                COUNT(*) as total_sessions,
                AVG(CAST(properties->>'session_length' AS INTEGER)) as avg_session_length,
                MAX(timestamp) as last_session
            FROM events 
            WHERE player_id = '${playerId}' 
            AND event_type = 'session_end'
        `);
        
        // 구매 관련 특성
        const purchaseData = await analyticsDB.query(`
            SELECT 
                COUNT(*) as purchase_count,
                SUM(CAST(properties->>'price' AS DECIMAL)) as total_spent,
                MAX(timestamp) as last_purchase
            FROM events 
            WHERE player_id = '${playerId}' 
            AND event_type = 'purchase_made'
        `);
        
        // 게임 진행 관련 특성
        const progressData = await analyticsDB.query(`
            SELECT 
                COUNT(*) as levels_completed,
                MAX(CAST(properties->>'level_id' AS INTEGER)) as highest_level
            FROM events 
            WHERE player_id = '${playerId}' 
            AND event_type = 'level_complete'
        `);
        
        // 소셜 관련 특성
        const socialData = await this.calculateSocialFeatures(playerId);
        
        return {
            days_since_install: daysSinceInstall,
            total_sessions: sessionData[0]?.total_sessions || 0,
            average_session_length: sessionData[0]?.avg_session_length || 0,
            levels_completed: progressData[0]?.levels_completed || 0,
            purchase_count: purchaseData[0]?.purchase_count || 0,
            total_spent: purchaseData[0]?.total_spent || 0,
            social_connections: socialData.friendCount,
            last_login_days_ago: sessionData[0]?.last_session ? 
                (Date.now() - sessionData[0].last_session) / (24 * 60 * 60 * 1000) : 999,
            
            // 추가 계산된 특성들
            session_frequency: this.calculateSessionFrequency(sessionData[0]),
            spending_velocity: this.calculateSpendingVelocity(purchaseData[0], daysSinceInstall),
            progress_rate: this.calculateProgressRate(progressData[0], daysSinceInstall),
            engagement_score: this.calculateEngagementScore(sessionData[0], socialData)
        };
    }
    
    private generateChurnPreventionActions(churnProbability: number, features: PlayerFeatures): ChurnPreventionAction[] {
        const actions: ChurnPreventionAction[] = [];
        
        // 높은 이탈 위험도에 따른 액션
        if (churnProbability >= 0.8) {
            actions.push({
                type: 'immediate_intervention',
                action: 'send_personalized_offer',
                priority: 'critical',
                description: 'Send high-value discount offer immediately',
                expectedImpact: 0.3 // 이탈 확률 30% 감소 예상
            });
            
            actions.push({
                type: 'customer_service',
                action: 'proactive_support_contact',
                priority: 'high',
                description: 'Reach out via push notification with helpful tips',
                expectedImpact: 0.15
            });
        }
        
        // 세션 빈도가 낮은 경우
        if (features.session_frequency < 0.5) {
            actions.push({
                type: 're_engagement',
                action: 'send_comeback_bonus',
                priority: 'medium',
                description: 'Offer bonus rewards for returning to game',
                expectedImpact: 0.2
            });
        }
        
        // 진행이 멈춘 경우
        if (features.progress_rate < 0.1) {
            actions.push({
                type: 'difficulty_adjustment',
                action: 'offer_level_assistance',
                priority: 'medium',
                description: 'Provide boosters or skip options for stuck levels',
                expectedImpact: 0.25
            });
        }
        
        return actions.sort((a, b) => b.expectedImpact - a.expectedImpact);
    }
}
```

Sweet Puzzle의 분석 시스템은 실시간 데이터 처리, 예측 분석, 비즈니스 인텔리전스를 통해 게임 운영의 모든 측면을 데이터 기반으로 최적화합니다. 플레이어 행동을 깊이 이해하고, 비즈니스 성과를 지속적으로 개선하며, 예측적 인사이트를 통해 전략적 의사결정을 지원하는 포괄적인 분석 플랫폼을 제공합니다.