# 매칭 시스템 구현계획

## 문서 정보
- **문서명**: 매칭 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [핵심 시스템 구현](#3-핵심-시스템-구현)
4. [매칭 알고리즘](#4-매칭-알고리즘)
5. [서버 아키텍처](#5-서버-아키텍처)
6. [성능 최적화](#6-성능-최적화)

## 1. 구현 개요

### 1.1 기술 스택
- **매칭 서버**: Node.js + Express
- **큐 관리**: Redis
- **데이터베이스**: PostgreSQL
- **로드밸런싱**: NGINX
- **모니터링**: Prometheus + Grafana

### 1.2 시스템 목표
- **매칭 시간**: 평균 30초 이내
- **매칭 품질**: 90% 이상 균형잡힌 매치
- **동시 처리**: 10,000+ 동시 매칭 요청
- **가용성**: 99.9% 업타임

## 2. 개발 일정

### 2.1 Phase 1: 기반 시스템 (3주)
```typescript
const phase1Schedule = {
  week1: ['매칭 서버 기본 구조', '큐 시스템 구현'],
  week2: ['ELO 시스템', '기본 매칭 로직'],
  week3: ['데이터베이스 연동', '기본 테스트']
};
```

### 2.2 Phase 2: 고급 기능 (3주)
```typescript
const phase2Schedule = {
  week1: ['지역별 매칭', '네트워크 품질 고려'],
  week2: ['매칭 예측 AI', '대기시간 최적화'],
  week3: ['부정행위 방지', '통합 테스트']
};
```

### 2.3 Phase 3: 최적화 (2주)
```typescript
const phase3Schedule = {
  week1: ['성능 최적화', '로드 밸런싱'],
  week2: ['모니터링 시스템', '배포 준비']
};
```

## 3. 핵심 시스템 구현

### 3.1 매칭 매니저
```typescript
// [의도] 매칭 시스템의 중앙 관리자
// [책임] 매칭 요청 처리, 큐 관리, 매치 생성
export class MatchmakingManager {
  private queues: Map<string, MatchmakingQueue>;
  private activeMatches: Map<string, Match>;
  private ratingSystem: ELORatingSystem;
  
  constructor() {
    this.queues = new Map();
    this.activeMatches = new Map();
    this.ratingSystem = new ELORatingSystem();
    this.initializeQueues();
  }
  
  private initializeQueues(): void {
    // 지역별 큐 생성
    const regions = ['NA', 'EU', 'ASIA', 'SA'];
    regions.forEach(region => {
      this.queues.set(region, new MatchmakingQueue(region));
    });
  }
  
  async joinQueue(playerId: string, playerData: PlayerProfile): Promise<QueueResult> {
    const region = this.determineOptimalRegion(playerData);
    const queue = this.queues.get(region);
    
    if (!queue) {
      throw new Error(`Queue not found for region: ${region}`);
    }
    
    // 플레이어를 큐에 추가
    const queueEntry = await queue.addPlayer(playerId, playerData);
    
    // 매칭 시도
    await this.attemptMatching(region);
    
    return {
      success: true,
      queuePosition: queueEntry.position,
      estimatedWaitTime: this.calculateEstimatedWaitTime(region, playerData.rating)
    };
  }
  
  private async attemptMatching(region: string): Promise<void> {
    const queue = this.queues.get(region);
    if (!queue) return;
    
    const potentialMatches = await queue.findMatches();
    
    for (const match of potentialMatches) {
      if (this.validateMatch(match)) {
        await this.createMatch(match);
        await queue.removePlayersFromQueue(match.players);
      }
    }
  }
  
  private validateMatch(match: PotentialMatch): boolean {
    // 레이팅 차이 확인
    const ratingDiff = Math.abs(match.player1.rating - match.player2.rating);
    const maxDiff = this.calculateMaxRatingDifference(match.waitTime);
    
    if (ratingDiff > maxDiff) return false;
    
    // 네트워크 품질 확인
    const networkQuality = this.calculateNetworkQuality(match.player1, match.player2);
    if (networkQuality < 0.7) return false;
    
    return true;
  }
  
  private async createMatch(match: PotentialMatch): Promise<string> {
    const matchId = UUIDGenerator.generate();
    const gameMatch = new Match({
      id: matchId,
      players: [match.player1, match.player2],
      region: match.region,
      gameMode: GameMode.Ranked,
      createdAt: Date.now()
    });
    
    this.activeMatches.set(matchId, gameMatch);
    
    // 플레이어들에게 매치 알림
    await this.notifyPlayersOfMatch(match.players, matchId);
    
    return matchId;
  }
}
```

### 3.2 매칭 큐 시스템
```typescript
// [의도] 효율적인 매칭을 위한 큐 관리
// [책임] 플레이어 대기, 우선순위 관리, 매치 후보 생성
export class MatchmakingQueue {
  private players: Map<string, QueuedPlayer>;
  private priorityQueue: PriorityQueue<QueuedPlayer>;
  private region: string;
  
  constructor(region: string) {
    this.region = region;
    this.players = new Map();
    this.priorityQueue = new PriorityQueue((a, b) => {
      // 대기시간이 긴 플레이어가 우선순위 높음
      return b.waitTime - a.waitTime;
    });
  }
  
  async addPlayer(playerId: string, profile: PlayerProfile): Promise<QueueEntry> {
    const queuedPlayer: QueuedPlayer = {
      id: playerId,
      profile: profile,
      joinTime: Date.now(),
      waitTime: 0,
      matchCriteria: this.calculateMatchCriteria(profile)
    };
    
    this.players.set(playerId, queuedPlayer);
    this.priorityQueue.enqueue(queuedPlayer);
    
    return {
      position: this.priorityQueue.size(),
      player: queuedPlayer
    };
  }
  
  async findMatches(): Promise<PotentialMatch[]> {
    const matches: PotentialMatch[] = [];
    const candidates = this.priorityQueue.toArray();
    
    for (let i = 0; i < candidates.length - 1; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const player1 = candidates[i];
        const player2 = candidates[j];
        
        if (this.arePlayersCompatible(player1, player2)) {
          matches.push({
            player1,
            player2,
            region: this.region,
            waitTime: Math.max(player1.waitTime, player2.waitTime),
            quality: this.calculateMatchQuality(player1, player2)
          });
        }
      }
    }
    
    // 품질 순으로 정렬
    return matches.sort((a, b) => b.quality - a.quality);
  }
  
  private arePlayersCompatible(p1: QueuedPlayer, p2: QueuedPlayer): boolean {
    // 레이팅 호환성
    const ratingDiff = Math.abs(p1.profile.rating - p2.profile.rating);
    const maxDiff = this.getMaxRatingDiff(Math.max(p1.waitTime, p2.waitTime));
    
    if (ratingDiff > maxDiff) return false;
    
    // 네트워크 호환성
    const ping = this.estimatePing(p1.profile.location, p2.profile.location);
    if (ping > 150) return false; // 150ms 이상이면 매칭 안함
    
    return true;
  }
  
  private getMaxRatingDiff(waitTime: number): number {
    // 대기시간이 길수록 레이팅 차이 허용 범위 증가
    const baseRange = 100;
    const timeBonus = Math.floor(waitTime / 30000) * 50; // 30초마다 50 증가
    return Math.min(baseRange + timeBonus, 500); // 최대 500 차이
  }
  
  updateWaitTimes(): void {
    const now = Date.now();
    for (const player of this.players.values()) {
      player.waitTime = now - player.joinTime;
    }
  }
}
```

## 4. 매칭 알고리즘

### 4.1 ELO 레이팅 시스템
```typescript
// [의도] 플레이어 실력을 정확히 측정하는 레이팅 시스템
// [책임] 레이팅 계산, 업데이트, 시즌 리셋
export class ELORatingSystem {
  private readonly K_FACTOR = 32; // ELO K-factor
  private readonly INITIAL_RATING = 1200;
  
  calculateNewRatings(
    player1Rating: number,
    player2Rating: number,
    result: MatchResult
  ): { player1NewRating: number; player2NewRating: number } {
    
    const expectedScore1 = this.calculateExpectedScore(player1Rating, player2Rating);
    const expectedScore2 = 1 - expectedScore1;
    
    let actualScore1: number;
    let actualScore2: number;
    
    switch (result) {
      case MatchResult.Player1Win:
        actualScore1 = 1;
        actualScore2 = 0;
        break;
      case MatchResult.Player2Win:
        actualScore1 = 0;
        actualScore2 = 1;
        break;
      case MatchResult.Draw:
        actualScore1 = 0.5;
        actualScore2 = 0.5;
        break;
    }
    
    const player1NewRating = Math.round(
      player1Rating + this.K_FACTOR * (actualScore1 - expectedScore1)
    );
    const player2NewRating = Math.round(
      player2Rating + this.K_FACTOR * (actualScore2 - expectedScore2)
    );
    
    return { player1NewRating, player2NewRating };
  }
  
  private calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }
  
  // 시즌 리셋 (소프트 리셋)
  applySeasonReset(currentRating: number): number {
    const targetRating = this.INITIAL_RATING;
    const resetFactor = 0.75; // 75%는 유지, 25%는 초기값으로
    
    return Math.round(currentRating * resetFactor + targetRating * (1 - resetFactor));
  }
}
```

### 4.2 매칭 품질 계산
```typescript
// [의도] 매치의 균형성과 재미를 평가
// [책임] 품질 점수 계산, 예측 승률, 게임 재미도 평가
export class MatchQualityCalculator {
  calculateMatchQuality(player1: PlayerProfile, player2: PlayerProfile): number {
    let quality = 0;
    
    // 레이팅 균형성 (40% 가중치)
    const ratingBalance = this.calculateRatingBalance(player1.rating, player2.rating);
    quality += ratingBalance * 0.4;
    
    // 플레이 스타일 호환성 (30% 가중치)
    const styleCompatibility = this.calculateStyleCompatibility(player1, player2);
    quality += styleCompatibility * 0.3;
    
    // 네트워크 품질 (20% 가중치)
    const networkQuality = this.calculateNetworkQuality(player1, player2);
    quality += networkQuality * 0.2;
    
    // 경험 균형성 (10% 가중치)
    const experienceBalance = this.calculateExperienceBalance(player1, player2);
    quality += experienceBalance * 0.1;
    
    return Math.min(1.0, Math.max(0.0, quality));
  }
  
  private calculateRatingBalance(rating1: number, rating2: number): number {
    const diff = Math.abs(rating1 - rating2);
    const maxAcceptableDiff = 200;
    return Math.max(0, 1 - (diff / maxAcceptableDiff));
  }
  
  private calculateStyleCompatibility(p1: PlayerProfile, p2: PlayerProfile): number {
    // 공격성, 수비성, 스킬 사용 패턴 등을 종합
    const aggressionDiff = Math.abs(p1.playStyle.aggression - p2.playStyle.aggression);
    const skillDiff = Math.abs(p1.playStyle.skillUsage - p2.playStyle.skillUsage);
    
    const compatibility = 1 - (aggressionDiff + skillDiff) / 2;
    return Math.max(0, compatibility);
  }
}
```

## 5. 서버 아키텍처

### 5.1 마이크로서비스 구조
```typescript
// [의도] 확장 가능한 매칭 서버 아키텍처
// [책임] 서비스 분리, 로드 밸런싱, 장애 격리
interface MatchmakingArchitecture {
  gateway: APIGateway;
  services: {
    matchmakingService: MatchmakingService;
    ratingService: RatingService;
    queueService: QueueService;
    notificationService: NotificationService;
  };
  storage: {
    redis: RedisCluster;
    postgres: PostgreSQLCluster;
  };
  monitoring: {
    metrics: PrometheusMetrics;
    logging: StructuredLogger;
    tracing: DistributedTracing;
  };
}
```

### 5.2 큐 서버 클러스터
```typescript
// [의도] 고가용성 큐 관리 시스템
// [책임] 큐 분산, 장애 복구, 데이터 일관성
export class QueueServerCluster {
  private servers: QueueServer[];
  private loadBalancer: ConsistentHashRing;
  private healthChecker: HealthChecker;
  
  constructor(serverConfigs: ServerConfig[]) {
    this.servers = serverConfigs.map(config => new QueueServer(config));
    this.loadBalancer = new ConsistentHashRing(this.servers);
    this.healthChecker = new HealthChecker();
    this.setupHealthMonitoring();
  }
  
  async addPlayerToQueue(playerId: string, profile: PlayerProfile): Promise<void> {
    const server = this.loadBalancer.getServer(playerId);
    
    try {
      await server.addPlayer(playerId, profile);
    } catch (error) {
      // 장애 시 다른 서버로 재시도
      const backupServer = this.loadBalancer.getBackupServer(playerId);
      await backupServer.addPlayer(playerId, profile);
      
      // 실패한 서버 마킹
      this.healthChecker.markServerUnhealthy(server);
    }
  }
  
  private setupHealthMonitoring(): void {
    setInterval(async () => {
      for (const server of this.servers) {
        const isHealthy = await this.healthChecker.checkHealth(server);
        if (!isHealthy) {
          await this.handleServerFailure(server);
        }
      }
    }, 10000); // 10초마다 헬스체크
  }
  
  private async handleServerFailure(failedServer: QueueServer): Promise<void> {
    // 실패한 서버의 플레이어들을 다른 서버로 이주
    const players = await failedServer.getAllPlayers();
    
    for (const player of players) {
      const newServer = this.loadBalancer.getBackupServer(player.id);
      await newServer.addPlayer(player.id, player.profile);
    }
    
    // 로드밸런서에서 제거
    this.loadBalancer.removeServer(failedServer);
  }
}
```

## 6. 성능 최적화

### 6.1 메모리 최적화
```typescript
// [의도] 효율적인 메모리 사용으로 성능 향상
// [책임] 객체 풀링, 캐시 관리, 가비지 컬렉션 최적화
export class MatchmakingOptimizer {
  private playerPool: ObjectPool<QueuedPlayer>;
  private matchPool: ObjectPool<PotentialMatch>;
  private cacheManager: CacheManager;
  
  constructor() {
    this.playerPool = new ObjectPool({
      factory: () => new QueuedPlayer(),
      reset: (player) => player.reset(),
      initialSize: 1000,
      maxSize: 10000
    });
    
    this.cacheManager = new CacheManager({
      playerProfiles: { ttl: 300000, maxSize: 50000 }, // 5분, 5만개
      matchHistory: { ttl: 600000, maxSize: 100000 }   // 10분, 10만개
    });
  }
  
  optimizeMatchmaking(): void {
    // 배치 처리로 매칭 효율성 증대
    this.enableBatchMatching();
    
    // 예측적 캐싱
    this.enablePredictiveCaching();
    
    // 메모리 압축
    this.enableMemoryCompression();
  }
  
  private enableBatchMatching(): void {
    // 여러 매치를 한 번에 처리
    setInterval(() => {
      this.processBatchMatches();
    }, 5000); // 5초마다 배치 처리
  }
}
```

### 6.2 네트워크 최적화
```typescript
// [의도] 네트워크 지연 최소화 및 품질 보장
// [책임] 지역 라우팅, CDN 활용, 커넥션 풀링
export class NetworkOptimizer {
  private regionServers: Map<string, ServerCluster>;
  private cdnManager: CDNManager;
  private connectionPool: ConnectionPool;
  
  async optimizePlayerConnection(playerId: string): Promise<ServerEndpoint> {
    const playerLocation = await this.getPlayerLocation(playerId);
    const optimalRegion = this.findOptimalRegion(playerLocation);
    const serverCluster = this.regionServers.get(optimalRegion);
    
    // 가장 가까운 서버 선택
    const bestServer = await serverCluster.findBestServer(playerLocation);
    
    return {
      endpoint: bestServer.endpoint,
      region: optimalRegion,
      estimatedLatency: bestServer.latency
    };
  }
  
  private findOptimalRegion(location: PlayerLocation): string {
    const regionLatencies = new Map<string, number>();
    
    for (const [region, cluster] of this.regionServers) {
      const latency = this.calculateLatency(location, cluster.getLocation());
      regionLatencies.set(region, latency);
    }
    
    // 가장 낮은 지연시간의 지역 선택
    return Array.from(regionLatencies.entries())
      .reduce((best, current) => current[1] < best[1] ? current : best)[0];
  }
}
```

이 구현계획은 고성능, 고가용성을 가진 매칭 시스템 구축을 위한 핵심 요소들을 다루고 있습니다. 확장성과 안정성을 동시에 고려한 설계로 대규모 동시 사용자를 지원할 수 있습니다.