# Analytics System Design 구현계획
Sweet Puzzle - 데이터 분석 시스템 구현계획

## 1. 구현 개요

### 1.1 구현 목표
- 실시간 플레이어 행동 데이터 수집
- 예측 분석 기반 개인화 시스템
- A/B 테스트 프레임워크 구축
- 비즈니스 인텔리전스 대시보드 개발

### 1.2 구현 범위
```
Phase 1: 기본 데이터 수집 (4주)
├── 게임 이벤트 추적
├── 플레이어 세션 관리
└── Firebase Analytics 통합

Phase 2: 예측 분석 (6주)
├── ML 파이프라인 구축
├── 이탈 예측 모델
└── 매출 예측 시스템

Phase 3: A/B 테스트 (4주)
├── 실험 관리 시스템
├── 통계적 유의성 검증
└── 자동 결과 분석

Phase 4: 대시보드 (3주)
├── 실시간 KPI 모니터링
├── 맞춤형 리포트
└── 알림 시스템

Phase 5: 고급 분석 (5주)
├── 코호트 분석
├── 수익 최적화
└── 개인화 추천
```

## 2. Phase 1: 기본 데이터 수집 (4주)

### 2.1 이벤트 추적 시스템

```typescript
// src/analytics/EventTracker.ts
export enum EventType {
    GAME_START = 'game_start',
    LEVEL_START = 'level_start',
    LEVEL_COMPLETE = 'level_complete',
    LEVEL_FAIL = 'level_fail',
    MOVE_MADE = 'move_made',
    POWER_UP_USED = 'power_up_used',
    PURCHASE_MADE = 'purchase_made',
    AD_VIEWED = 'ad_viewed',
    TUTORIAL_STEP = 'tutorial_step',
    SESSION_START = 'session_start',
    SESSION_END = 'session_end'
}

export interface GameEvent {
    type: EventType;
    timestamp: number;
    userId: string;
    sessionId: string;
    parameters: Record<string, any>;
}

export class EventTracker {
    private batchBuffer: GameEvent[] = [];
    private batchSize = 50;
    private flushInterval = 30000; // 30초
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private firebaseAnalytics: any,
        private localStorage: any
    ) {
        this.startBatchTimer();
    }

    track(type: EventType, parameters: Record<string, any> = {}): void {
        const event: GameEvent = {
            type,
            timestamp: Date.now(),
            userId: this.getCurrentUserId(),
            sessionId: this.getCurrentSessionId(),
            parameters: {
                ...parameters,
                device_info: this.getDeviceInfo(),
                app_version: this.getAppVersion()
            }
        };

        // 로컬 저장 (오프라인 지원)
        this.storeEventLocally(event);
        
        // 배치에 추가
        this.batchBuffer.push(event);
        
        // 배치 크기 도달 시 즉시 전송
        if (this.batchBuffer.length >= this.batchSize) {
            this.flushBatch();
        }
    }

    private async flushBatch(): Promise<void> {
        if (this.batchBuffer.length === 0) return;

        const events = [...this.batchBuffer];
        this.batchBuffer = [];

        try {
            // Firebase Analytics로 전송
            await Promise.all(events.map(event => 
                this.firebaseAnalytics.logEvent(event.type, event.parameters)
            ));

            // 커스텀 백엔드로 전송
            await this.sendToCustomBackend(events);
            
            // 로컬 저장소에서 전송된 이벤트 제거
            this.removeStoredEvents(events);
        } catch (error) {
            console.error('Failed to send analytics events:', error);
            // 실패한 이벤트를 다시 배치에 추가
            this.batchBuffer.unshift(...events);
        }
    }

    private startBatchTimer(): void {
        this.timer = setInterval(() => {
            this.flushBatch();
        }, this.flushInterval);
    }
}
```

### 2.2 세션 관리 시스템

```typescript
// src/analytics/SessionManager.ts
export interface SessionData {
    sessionId: string;
    userId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    levelProgress: number;
    movesCount: number;
    powerUpsUsed: number;
    coinsEarned: number;
    coinsSpent: number;
    adsWatched: number;
    purchasesMade: number;
}

export class SessionManager {
    private currentSession: SessionData | null = null;
    private heartbeatInterval = 60000; // 1분
    private heartbeatTimer: NodeJS.Timeout | null = null;

    constructor(private eventTracker: EventTracker) {}

    startSession(userId: string): string {
        const sessionId = this.generateSessionId();
        
        this.currentSession = {
            sessionId,
            userId,
            startTime: Date.now(),
            levelProgress: 0,
            movesCount: 0,
            powerUpsUsed: 0,
            coinsEarned: 0,
            coinsSpent: 0,
            adsWatched: 0,
            purchasesMade: 0
        };

        this.eventTracker.track(EventType.SESSION_START, {
            session_id: sessionId,
            user_id: userId
        });

        this.startHeartbeat();
        return sessionId;
    }

    endSession(): void {
        if (!this.currentSession) return;

        const now = Date.now();
        this.currentSession.endTime = now;
        this.currentSession.duration = now - this.currentSession.startTime;

        this.eventTracker.track(EventType.SESSION_END, {
            session_id: this.currentSession.sessionId,
            duration: this.currentSession.duration,
            level_progress: this.currentSession.levelProgress,
            moves_count: this.currentSession.movesCount,
            power_ups_used: this.currentSession.powerUpsUsed,
            coins_earned: this.currentSession.coinsEarned,
            coins_spent: this.currentSession.coinsSpent,
            ads_watched: this.currentSession.adsWatched,
            purchases_made: this.currentSession.purchasesMade
        });

        this.stopHeartbeat();
        this.currentSession = null;
    }

    updateSessionData(updates: Partial<SessionData>): void {
        if (!this.currentSession) return;
        
        Object.assign(this.currentSession, updates);
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.currentSession) {
                this.eventTracker.track('session_heartbeat', {
                    session_id: this.currentSession.sessionId,
                    elapsed_time: Date.now() - this.currentSession.startTime
                });
            }
        }, this.heartbeatInterval);
    }
}
```

## 3. Phase 2: 예측 분석 (6주)

### 3.1 이탈 예측 모델

```typescript
// src/analytics/ChurnPrediction.ts
export interface PlayerFeatures {
    userId: string;
    daysSinceInstall: number;
    totalSessions: number;
    avgSessionLength: number;
    levelsCompleted: number;
    totalMoves: number;
    powerUpsUsed: number;
    coinsSpent: number;
    adsWatched: number;
    purchasesMade: number;
    lastSessionDaysAgo: number;
    progressionRate: number;
    socialInteractions: number;
}

export class ChurnPredictor {
    private model: any = null;
    private featureScaler: any = null;

    constructor(private apiClient: any) {}

    async loadModel(): Promise<void> {
        try {
            const response = await this.apiClient.get('/ml/churn-model');
            this.model = response.model;
            this.featureScaler = response.scaler;
        } catch (error) {
            console.error('Failed to load churn prediction model:', error);
        }
    }

    async predictChurnProbability(userId: string): Promise<number> {
        if (!this.model) {
            await this.loadModel();
        }

        const features = await this.extractPlayerFeatures(userId);
        const scaledFeatures = this.scaleFeatures(features);
        
        try {
            const response = await this.apiClient.post('/ml/predict-churn', {
                features: scaledFeatures
            });
            
            return response.churnProbability;
        } catch (error) {
            console.error('Churn prediction failed:', error);
            return 0.5; // 기본값
        }
    }

    private async extractPlayerFeatures(userId: string): Promise<PlayerFeatures> {
        const playerData = await this.apiClient.get(`/analytics/player/${userId}`);
        
        return {
            userId,
            daysSinceInstall: playerData.daysSinceInstall,
            totalSessions: playerData.totalSessions,
            avgSessionLength: playerData.avgSessionLength,
            levelsCompleted: playerData.levelsCompleted,
            totalMoves: playerData.totalMoves,
            powerUpsUsed: playerData.powerUpsUsed,
            coinsSpent: playerData.coinsSpent,
            adsWatched: playerData.adsWatched,
            purchasesMade: playerData.purchasesMade,
            lastSessionDaysAgo: playerData.lastSessionDaysAgo,
            progressionRate: playerData.progressionRate,
            socialInteractions: playerData.socialInteractions
        };
    }

    async getHighRiskPlayers(threshold: number = 0.7): Promise<string[]> {
        const response = await this.apiClient.get('/analytics/high-risk-players', {
            params: { threshold }
        });
        
        return response.userIds;
    }
}
```

### 3.2 매출 예측 시스템

```typescript
// src/analytics/RevenuePredictor.ts
export interface RevenueFeatures {
    userId: string;
    ltv: number;
    daysSinceInstall: number;
    totalPurchases: number;
    avgPurchaseValue: number;
    lastPurchaseDaysAgo: number;
    engagementScore: number;
    levelProgress: number;
    socialActivity: number;
}

export class RevenuePredictor {
    constructor(private apiClient: any) {}

    async predictLTV(userId: string, timeHorizon: number = 365): Promise<number> {
        const features = await this.extractRevenueFeatures(userId);
        
        try {
            const response = await this.apiClient.post('/ml/predict-ltv', {
                features,
                timeHorizon
            });
            
            return response.predictedLTV;
        } catch (error) {
            console.error('LTV prediction failed:', error);
            return 0;
        }
    }

    async segmentPlayersByValue(): Promise<Map<string, string[]>> {
        const response = await this.apiClient.get('/analytics/player-segments');
        
        return new Map([
            ['whales', response.whales],
            ['dolphins', response.dolphins],
            ['minnows', response.minnows],
            ['free_players', response.freePlayers]
        ]);
    }

    async optimizePricing(userId: string, item: string): Promise<number> {
        const response = await this.apiClient.post('/ml/optimize-pricing', {
            userId,
            item
        });
        
        return response.optimalPrice;
    }
}
```

## 4. Phase 3: A/B 테스트 (4주)

### 4.1 실험 관리 시스템

```typescript
// src/analytics/ABTestManager.ts
export interface Experiment {
    id: string;
    name: string;
    description: string;
    status: 'draft' | 'running' | 'paused' | 'completed';
    startDate: number;
    endDate?: number;
    targetAudience: string[];
    variants: ExperimentVariant[];
    metrics: string[];
    hypothesis: string;
}

export interface ExperimentVariant {
    id: string;
    name: string;
    traffic: number; // 0-100 percentage
    config: Record<string, any>;
}

export class ABTestManager {
    private cache = new Map<string, any>();

    constructor(
        private apiClient: any,
        private eventTracker: EventTracker
    ) {}

    async getVariant(experimentId: string, userId: string): Promise<string> {
        const cacheKey = `${experimentId}_${userId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await this.apiClient.post('/experiments/assign', {
                experimentId,
                userId
            });
            
            const variant = response.variant;
            this.cache.set(cacheKey, variant);
            
            this.eventTracker.track('experiment_exposure', {
                experiment_id: experimentId,
                variant_id: variant,
                user_id: userId
            });
            
            return variant;
        } catch (error) {
            console.error('Failed to get experiment variant:', error);
            return 'control'; // 기본값
        }
    }

    async trackConversion(
        experimentId: string, 
        userId: string, 
        metric: string, 
        value: number = 1
    ): Promise<void> {
        const variant = await this.getVariant(experimentId, userId);
        
        this.eventTracker.track('experiment_conversion', {
            experiment_id: experimentId,
            variant_id: variant,
            user_id: userId,
            metric,
            value
        });
    }

    async getExperimentResults(experimentId: string): Promise<any> {
        const response = await this.apiClient.get(`/experiments/${experimentId}/results`);
        return response.results;
    }

    async createExperiment(experiment: Omit<Experiment, 'id'>): Promise<string> {
        const response = await this.apiClient.post('/experiments', experiment);
        return response.experimentId;
    }
}
```

### 4.2 통계적 유의성 검증

```typescript
// src/analytics/StatisticalAnalysis.ts
export interface TestResult {
    variant: string;
    sampleSize: number;
    mean: number;
    standardError: number;
    confidenceInterval: [number, number];
    pValue: number;
    significant: boolean;
}

export class StatisticalAnalysis {
    calculateTTest(control: number[], treatment: number[]): {
        tStatistic: number;
        pValue: number;
        significant: boolean;
    } {
        const controlMean = this.mean(control);
        const treatmentMean = this.mean(treatment);
        const controlStd = this.standardDeviation(control);
        const treatmentStd = this.standardDeviation(treatment);
        
        const pooledStd = Math.sqrt(
            ((control.length - 1) * controlStd ** 2 + 
             (treatment.length - 1) * treatmentStd ** 2) /
            (control.length + treatment.length - 2)
        );
        
        const standardError = pooledStd * Math.sqrt(
            1 / control.length + 1 / treatment.length
        );
        
        const tStatistic = (treatmentMean - controlMean) / standardError;
        const degreesOfFreedom = control.length + treatment.length - 2;
        const pValue = this.tDistribution(Math.abs(tStatistic), degreesOfFreedom) * 2;
        
        return {
            tStatistic,
            pValue,
            significant: pValue < 0.05
        };
    }

    calculateSampleSize(
        baselineRate: number,
        minimumDetectableEffect: number,
        alpha: number = 0.05,
        power: number = 0.8
    ): number {
        const zAlpha = this.inverseNormal(1 - alpha / 2);
        const zBeta = this.inverseNormal(power);
        
        const p1 = baselineRate;
        const p2 = baselineRate * (1 + minimumDetectableEffect);
        
        const sampleSize = Math.ceil(
            2 * (zAlpha + zBeta) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) /
            (p2 - p1) ** 2
        );
        
        return sampleSize;
    }

    private mean(values: number[]): number {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    private standardDeviation(values: number[]): number {
        const avg = this.mean(values);
        const variance = values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / (values.length - 1);
        return Math.sqrt(variance);
    }
}
```

## 5. Phase 4: 대시보드 (3주)

### 5.1 실시간 KPI 모니터링

```typescript
// src/analytics/Dashboard.ts
export interface KPIMetric {
    name: string;
    value: number;
    previousValue: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
    target?: number;
}

export class DashboardManager {
    private wsConnection: WebSocket | null = null;
    private metrics = new Map<string, KPIMetric>();

    constructor(private apiClient: any) {}

    async initialize(): Promise<void> {
        await this.loadInitialMetrics();
        this.connectWebSocket();
    }

    private async loadInitialMetrics(): Promise<void> {
        const response = await this.apiClient.get('/dashboard/metrics');
        
        response.metrics.forEach((metric: KPIMetric) => {
            this.metrics.set(metric.name, metric);
        });
    }

    private connectWebSocket(): void {
        this.wsConnection = new WebSocket('wss://api.sweetpuzzle.com/analytics/realtime');
        
        this.wsConnection.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateMetric(data.metric, data.value);
        };
        
        this.wsConnection.onerror = (error) => {
            console.error('WebSocket error:', error);
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }

    private updateMetric(name: string, newValue: number): void {
        const existing = this.metrics.get(name);
        if (!existing) return;

        const previousValue = existing.value;
        const change = newValue - previousValue;
        const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
        
        const updatedMetric: KPIMetric = {
            ...existing,
            value: newValue,
            previousValue,
            change,
            changePercent,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
        
        this.metrics.set(name, updatedMetric);
        this.notifyDashboardUpdate(name, updatedMetric);
    }

    getRealtimeMetrics(): KPIMetric[] {
        return Array.from(this.metrics.values());
    }

    async generateReport(
        startDate: Date,
        endDate: Date,
        metrics: string[]
    ): Promise<any> {
        const response = await this.apiClient.post('/dashboard/report', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            metrics
        });
        
        return response.report;
    }
}
```

## 6. Phase 5: 고급 분석 (5주)

### 6.1 코호트 분석

```typescript
// src/analytics/CohortAnalysis.ts
export interface CohortData {
    cohortMonth: string;
    userCount: number;
    retentionRates: number[]; // Day 1, 7, 14, 30, 60, 90
    revenuePerUser: number[];
    cumulativeLTV: number;
}

export class CohortAnalyzer {
    constructor(private apiClient: any) {}

    async generateRetentionCohorts(
        startDate: Date,
        endDate: Date
    ): Promise<CohortData[]> {
        const response = await this.apiClient.post('/analytics/cohorts/retention', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });
        
        return response.cohorts;
    }

    async generateRevenueCohorts(
        startDate: Date,
        endDate: Date
    ): Promise<CohortData[]> {
        const response = await this.apiClient.post('/analytics/cohorts/revenue', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });
        
        return response.cohorts;
    }

    calculateCohortTrends(cohorts: CohortData[]): {
        retentionTrend: number;
        revenueTrend: number;
        ltvTrend: number;
    } {
        if (cohorts.length < 2) {
            return { retentionTrend: 0, revenueTrend: 0, ltvTrend: 0 };
        }

        const latest = cohorts[cohorts.length - 1];
        const previous = cohorts[cohorts.length - 2];
        
        const retentionTrend = this.calculateTrend(
            previous.retentionRates[6], // Day 30
            latest.retentionRates[6]
        );
        
        const revenueTrend = this.calculateTrend(
            previous.revenuePerUser[6],
            latest.revenuePerUser[6]
        );
        
        const ltvTrend = this.calculateTrend(
            previous.cumulativeLTV,
            latest.cumulativeLTV
        );
        
        return { retentionTrend, revenueTrend, ltvTrend };
    }

    private calculateTrend(oldValue: number, newValue: number): number {
        if (oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }
}
```

### 6.2 개인화 추천 시스템

```typescript
// src/analytics/PersonalizationEngine.ts
export interface UserProfile {
    userId: string;
    preferences: Record<string, number>;
    behavior: Record<string, number>;
    segments: string[];
    predictedLTV: number;
    churnRisk: number;
}

export class PersonalizationEngine {
    constructor(
        private apiClient: any,
        private eventTracker: EventTracker
    ) {}

    async getUserProfile(userId: string): Promise<UserProfile> {
        const response = await this.apiClient.get(`/personalization/profile/${userId}`);
        return response.profile;
    }

    async recommendContent(
        userId: string,
        contentType: 'levels' | 'offers' | 'challenges'
    ): Promise<any[]> {
        const profile = await this.getUserProfile(userId);
        
        const response = await this.apiClient.post('/personalization/recommend', {
            userId,
            contentType,
            profile
        });
        
        this.eventTracker.track('recommendation_served', {
            user_id: userId,
            content_type: contentType,
            recommendations: response.recommendations.map((r: any) => r.id)
        });
        
        return response.recommendations;
    }

    async optimizeGameplay(userId: string): Promise<{
        difficulty: number;
        powerUpSuggestions: string[];
        levelRecommendations: number[];
    }> {
        const profile = await this.getUserProfile(userId);
        
        const response = await this.apiClient.post('/personalization/optimize-gameplay', {
            userId,
            profile
        });
        
        return {
            difficulty: response.difficulty,
            powerUpSuggestions: response.powerUpSuggestions,
            levelRecommendations: response.levelRecommendations
        };
    }

    async trackPersonalizationEvent(
        userId: string,
        eventType: string,
        data: Record<string, any>
    ): Promise<void> {
        this.eventTracker.track('personalization_event', {
            user_id: userId,
            event_type: eventType,
            ...data
        });
    }
}
```

## 7. 구현 우선순위 및 마일스톤

### 7.1 핵심 마일스톤
```
Week 1-4: 기본 데이터 수집
- 이벤트 트래킹 시스템 완성
- Firebase Analytics 연동
- 세션 관리 구현

Week 5-10: 예측 분석
- 이탈 예측 모델 구축
- 매출 예측 시스템 개발
- ML 파이프라인 구성

Week 11-14: A/B 테스트
- 실험 관리 시스템 구현
- 통계적 검증 도구 개발
- 자동 결과 분석 구축

Week 15-17: 대시보드
- 실시간 KPI 모니터링
- 리포팅 시스템 구축
- 알림 기능 구현

Week 18-22: 고급 분석
- 코호트 분석 시스템
- 개인화 엔진 구축
- 수익 최적화 도구
```

### 7.2 성공 지표
- 데이터 수집 정확도 > 99%
- 예측 모델 정확도 > 85%
- A/B 테스트 처리 시간 < 100ms
- 대시보드 로딩 시간 < 2초
- 실시간 분석 지연 시간 < 5초

### 7.3 기술 스택
- **수집**: Firebase Analytics, Custom Events
- **저장**: BigQuery, Redis
- **분석**: Python/TensorFlow, Node.js
- **시각화**: React Dashboard, Chart.js
- **실시간**: WebSocket, Firebase Realtime Database