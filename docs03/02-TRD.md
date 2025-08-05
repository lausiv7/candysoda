# Technical Requirements Document (TRD)
Royal Clash - 기술 요구사항 문서

## 1. 기술 아키텍처 개요

### 1.1 전체 시스템 구조
```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │   Mobile App    │  │   Web Client    │  │    Desktop      ││
│  │  (iOS/Android)  │  │      (PWA)      │  │   (Electron)    ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Cloudflare)  │
                    └─────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Gateway Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │  API Gateway    │  │  Auth Service   │  │ Match Service   ││
│  │   (Express.js)  │  │   (Firebase)    │  │   (Socket.io)   ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Service Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ Battle Server   │  │  Data Service   │  │Analytics Service││
│  │   (Node.js)     │  │ (PostgreSQL)    │  │   (ClickHouse)  ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Storage Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │   PostgreSQL    │  │      Redis      │  │      CDN        ││
│  │   (User Data)   │  │     (Cache)     │  │   (Assets)      ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 클라이언트-서버 모델
- **Authoritative Server**: 모든 게임 로직은 서버에서 처리
- **Client Prediction**: 클라이언트에서 입력 예측으로 반응성 향상
- **Server Reconciliation**: 서버 결과로 클라이언트 상태 보정
- **Rollback Netcode**: 네트워크 지연 보상을 위한 롤백 시스템

### 1.3 기술 스택 선택

**클라이언트**
- **게임 엔진**: Cocos Creator 3.8.x
- **언어**: TypeScript 4.9+
- **상태 관리**: MobX 또는 Redux Toolkit
- **네트워킹**: Socket.io Client
- **빌드 도구**: Webpack 5

**서버**
- **런타임**: Node.js 18+ (LTS)
- **프레임워크**: Express.js + Socket.io
- **언어**: TypeScript
- **ORM**: Prisma
- **실시간**: Socket.io, Bull Queue

**데이터베이스**
- **주 데이터베이스**: PostgreSQL 15
- **캐시**: Redis 7.0
- **분석**: ClickHouse (이벤트 로깅)
- **파일 저장**: AWS S3 호환 스토리지

**인프라**
- **클라우드**: AWS/GCP/Azure (멀티 클라우드)
- **컨테이너**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **모니터링**: Prometheus + Grafana

## 2. 클라이언트 아키텍처

### 2.1 Cocos Creator 3.x 구조

```typescript
// src/core/GameManager.ts
export class GameManager {
    private static _instance: GameManager;
    
    // 핵심 매니저들
    public sceneManager: SceneManager;
    public networkManager: NetworkManager;
    public audioManager: AudioManager;
    public uiManager: UIManager;
    public inputManager: InputManager;
    
    public static getInstance(): GameManager {
        if (!GameManager._instance) {
            GameManager._instance = new GameManager();
        }
        return GameManager._instance;
    }
    
    async initialize(): Promise<void> {
        await this.sceneManager.initialize();
        await this.networkManager.initialize();
        await this.audioManager.initialize();
        await this.uiManager.initialize();
        await this.inputManager.initialize();
    }
}
```

### 2.2 TypeScript 기반 개발

```typescript
// src/types/GameTypes.ts
export interface GameState {
    matchId: string;
    players: Player[];
    gameTime: number;
    elixir: ElixirState;
    towers: Tower[];
    units: Unit[];
    battlefield: Battlefield;
}

export interface Player {
    id: string;
    username: string;
    level: number;
    trophies: number;
    deck: Card[];
    currentElixir: number;
    isKingTowerActivated: boolean;
}

export interface Unit {
    id: string;
    cardId: string;
    ownerId: string;
    position: Vec3;
    health: number;
    maxHealth: number;
    attackDamage: number;
    movementSpeed: number;
    target: string | null;
    state: UnitState;
}

export enum UnitState {
    SPAWNING = 'spawning',
    IDLE = 'idle',
    MOVING = 'moving',
    ATTACKING = 'attacking',
    DYING = 'dying',
    DEAD = 'dead'
}
```

### 2.3 모듈 구성

```
src/
├── core/                 # 핵심 시스템
│   ├── GameManager.ts
│   ├── SceneManager.ts
│   └── EventBus.ts
├── battle/               # 전투 시스템
│   ├── BattleManager.ts
│   ├── UnitController.ts
│   └── TowerController.ts
├── network/              # 네트워킹
│   ├── NetworkManager.ts
│   ├── MessageHandler.ts
│   └── ConnectionManager.ts
├── ui/                   # UI 시스템
│   ├── UIManager.ts
│   ├── components/
│   └── screens/
├── data/                 # 데이터 관리
│   ├── DataManager.ts
│   ├── CardData.ts
│   └── ConfigData.ts
└── utils/                # 유틸리티
    ├── MathUtils.ts
    ├── TimeUtils.ts
    └── ValidationUtils.ts
```

### 2.4 상태 관리

```typescript
// src/state/GameStore.ts
import { makeAutoObservable } from 'mobx';

export class GameStore {
    // 게임 상태
    gameState: GameState | null = null;
    isConnected: boolean = false;
    currentMatch: Match | null = null;
    
    // UI 상태
    activeScreen: string = 'menu';
    isLoading: boolean = false;
    errorMessage: string = '';
    
    constructor() {
        makeAutoObservable(this);
    }
    
    setGameState(state: GameState) {
        this.gameState = state;
    }
    
    setConnectionStatus(connected: boolean) {
        this.isConnected = connected;
    }
    
    showError(message: string) {
        this.errorMessage = message;
    }
}

export const gameStore = new GameStore();
```

## 3. 서버 아키텍처

### 3.1 게임 서버 구조

```typescript
// server/src/core/GameServer.ts
export class GameServer {
    private io: Server;
    private matchmaker: Matchmaker;
    private battleManager: BattleManager;
    private dataService: DataService;
    
    constructor() {
        this.io = new Server(httpServer, {
            cors: { origin: "*" },
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        this.matchmaker = new Matchmaker();
        this.battleManager = new BattleManager();
        this.dataService = new DataService();
    }
    
    async start(): Promise<void> {
        await this.dataService.initialize();
        await this.matchmaker.initialize();
        
        this.setupSocketHandlers();
        
        console.log('Game server started on port 3000');
    }
    
    private setupSocketHandlers(): void {
        this.io.on('connection', (socket) => {
            socket.on('matchmaking:join', (data) => {
                this.matchmaker.addPlayer(socket.id, data);
            });
            
            socket.on('battle:action', (data) => {
                this.battleManager.handlePlayerAction(socket.id, data);
            });
            
            socket.on('disconnect', () => {
                this.handleDisconnection(socket.id);
            });
        });
    }
}
```

### 3.2 매칭 서버

```typescript
// server/src/matchmaking/Matchmaker.ts
export class Matchmaker {
    private waitingPlayers: Map<string, MatchmakingPlayer> = new Map();
    private matchingQueue: MatchmakingPlayer[] = [];
    private redis: Redis;
    
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL);
        this.startMatchingLoop();
    }
    
    async addPlayer(playerId: string, playerData: any): Promise<void> {
        const player: MatchmakingPlayer = {
            id: playerId,
            trophies: playerData.trophies,
            level: playerData.level,
            joinTime: Date.now(),
            region: playerData.region
        };
        
        this.waitingPlayers.set(playerId, player);
        this.matchingQueue.push(player);
        
        console.log(`Player ${playerId} joined matchmaking queue`);
    }
    
    private async startMatchingLoop(): Promise<void> {
        setInterval(() => {
            this.processMatchmaking();
        }, 1000); // 1초마다 매칭 시도
    }
    
    private async processMatchmaking(): Promise<void> {
        if (this.matchingQueue.length < 2) return;
        
        // ELO 기반 매칭 알고리즘
        const matches = this.findMatches();
        
        for (const match of matches) {
            await this.createMatch(match.player1, match.player2);
        }
    }
    
    private findMatches(): Array<{player1: MatchmakingPlayer, player2: MatchmakingPlayer}> {
        const matches: Array<{player1: MatchmakingPlayer, player2: MatchmakingPlayer}> = [];
        const processed = new Set<string>();
        
        for (let i = 0; i < this.matchingQueue.length; i++) {
            if (processed.has(this.matchingQueue[i].id)) continue;
            
            const player1 = this.matchingQueue[i];
            const player2 = this.findBestMatch(player1, processed);
            
            if (player2) {
                matches.push({ player1, player2 });
                processed.add(player1.id);
                processed.add(player2.id);
            }
        }
        
        // 처리된 플레이어들을 큐에서 제거
        this.matchingQueue = this.matchingQueue.filter(p => !processed.has(p.id));
        
        return matches;
    }
}
```

### 3.3 데이터베이스 설계

```sql
-- PostgreSQL 스키마 설계

-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    trophies INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 1000,
    gems INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 카드 마스터 테이블
CREATE TABLE cards (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'unit', 'spell', 'building'
    rarity VARCHAR(20) NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
    elixir_cost INTEGER NOT NULL,
    faction VARCHAR(30) NOT NULL,
    stats JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 카드 컬렉션
CREATE TABLE user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    card_id VARCHAR(50) REFERENCES cards(id),
    level INTEGER DEFAULT 1,
    count INTEGER DEFAULT 1,
    UNIQUE(user_id, card_id)
);

-- 덱 구성
CREATE TABLE decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    cards JSONB NOT NULL, -- [{"cardId": "knight", "level": 1}, ...]
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 매치 기록
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID REFERENCES users(id),
    player2_id UUID REFERENCES users(id),
    winner_id UUID REFERENCES users(id),
    duration INTEGER NOT NULL, -- 초 단위
    player1_trophies_change INTEGER DEFAULT 0,
    player2_trophies_change INTEGER DEFAULT 0,
    match_data JSONB, -- 상세 매치 데이터
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_trophies ON users(trophies DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
```

### 3.4 캐시 시스템

```typescript
// server/src/cache/CacheManager.ts
export class CacheManager {
    private redis: Redis;
    private localCache: Map<string, any> = new Map();
    
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
        });
    }
    
    async get(key: string): Promise<any> {
        // 1차: 로컬 캐시 확인
        if (this.localCache.has(key)) {
            return this.localCache.get(key);
        }
        
        // 2차: Redis 캐시 확인
        const redisValue = await this.redis.get(key);
        if (redisValue) {
            const parsed = JSON.parse(redisValue);
            this.localCache.set(key, parsed);
            return parsed;
        }
        
        return null;
    }
    
    async set(key: string, value: any, ttl: number = 3600): Promise<void> {
        // 로컬 캐시에 저장
        this.localCache.set(key, value);
        
        // Redis에 저장
        await this.redis.setex(key, ttl, JSON.stringify(value));
    }
    
    async invalidate(pattern: string): Promise<void> {
        // 로컬 캐시 무효화
        for (const key of this.localCache.keys()) {
            if (key.includes(pattern)) {
                this.localCache.delete(key);
            }
        }
        
        // Redis 캐시 무효화
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}
```

## 4. 실시간 통신

### 4.1 네트워크 프로토콜

```typescript
// shared/src/protocol/Messages.ts
export enum MessageType {
    // 매칭 관련
    MATCHMAKING_JOIN = 'matchmaking:join',
    MATCHMAKING_CANCEL = 'matchmaking:cancel',
    MATCH_FOUND = 'match:found',
    
    // 전투 관련
    BATTLE_START = 'battle:start',
    BATTLE_ACTION = 'battle:action',
    BATTLE_STATE = 'battle:state',
    BATTLE_END = 'battle:end',
    
    // 시스템
    PING = 'ping',
    PONG = 'pong',
    ERROR = 'error'
}

export interface BattleActionMessage {
    type: MessageType.BATTLE_ACTION;
    payload: {
        playerId: string;
        actionType: 'deploy_unit' | 'cast_spell';
        cardId: string;
        position: { x: number; y: number };
        timestamp: number;
    };
}

export interface BattleStateMessage {
    type: MessageType.BATTLE_STATE;
    payload: {
        matchId: string;
        gameTime: number;
        players: PlayerState[];
        units: UnitState[];
        towers: TowerState[];
        tick: number;
    };
}
```

### 4.2 동기화 전략

```typescript
// server/src/battle/BattleRoom.ts
export class BattleRoom {
    private gameState: GameState;
    private tickRate: number = 20; // 20 TPS
    private tickInterval: NodeJS.Timeout;
    private players: Map<string, Socket> = new Map();
    
    constructor(private matchId: string, player1: Socket, player2: Socket) {
        this.players.set(player1.id, player1);
        this.players.set(player2.id, player2);
        
        this.initializeGameState();
        this.startGameLoop();
    }
    
    private startGameLoop(): void {
        this.tickInterval = setInterval(() => {
            this.updateGameState();
            this.broadcastGameState();
        }, 1000 / this.tickRate);
    }
    
    private updateGameState(): void {
        // 물리 시뮬레이션 업데이트
        this.updateUnits();
        this.updateTowers();
        this.updateProjectiles();
        
        // 충돌 감지
        this.processCollisions();
        
        // 게임 규칙 적용
        this.applyGameRules();
        
        // 승패 조건 확인
        this.checkWinConditions();
    }
    
    private broadcastGameState(): void {
        const stateMessage: BattleStateMessage = {
            type: MessageType.BATTLE_STATE,
            payload: {
                matchId: this.matchId,
                gameTime: this.gameState.gameTime,
                players: this.gameState.players,
                units: this.gameState.units,
                towers: this.gameState.towers,
                tick: this.gameState.tick
            }
        };
        
        this.broadcast(stateMessage);
    }
    
    handlePlayerAction(playerId: string, action: BattleActionMessage): void {
        // 액션 검증
        if (!this.validateAction(playerId, action)) {
            return;
        }
        
        // 액션 적용
        this.applyAction(playerId, action.payload);
        
        // 즉시 브로드캐스트 (중요한 액션의 경우)
        if (this.isImportantAction(action.payload.actionType)) {
            this.broadcastGameState();
        }
    }
}
```

### 4.3 지연 시간 최적화

```typescript
// client/src/network/NetworkManager.ts
export class NetworkManager {
    private socket: Socket;
    private latency: number = 0;
    private serverTimeOffset: number = 0;
    
    async initialize(): Promise<void> {
        this.socket = io(SERVER_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        
        this.setupHandlers();
        await this.calibrateTime();
    }
    
    private async calibrateTime(): Promise<void> {
        const samples: number[] = [];
        
        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();
            
            await new Promise((resolve) => {
                this.socket.emit('ping', { timestamp: startTime });
                this.socket.once('pong', (data) => {
                    const endTime = Date.now();
                    const roundTripTime = endTime - startTime;
                    const serverTime = data.serverTimestamp;
                    
                    this.latency = roundTripTime / 2;
                    this.serverTimeOffset = serverTime - endTime + this.latency;
                    
                    samples.push(this.latency);
                    resolve(null);
                });
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 안정적인 지연시간 계산 (중간값 사용)
        samples.sort((a, b) => a - b);
        this.latency = samples[Math.floor(samples.length / 2)];
    }
    
    getServerTime(): number {
        return Date.now() + this.serverTimeOffset;
    }
    
    sendAction(action: any): void {
        action.clientTimestamp = Date.now();
        action.predictedServerTime = this.getServerTime();
        
        this.socket.emit('battle:action', action);
    }
}
```

### 4.4 연결 안정성

```typescript
// client/src/network/ConnectionManager.ts
export class ConnectionManager {
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private isReconnecting: boolean = false;
    
    constructor(private networkManager: NetworkManager) {
        this.setupConnectionHandlers();
    }
    
    private setupConnectionHandlers(): void {
        this.networkManager.socket.on('connect', () => {
            console.log('Connected to server');
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            
            // 재연결 후 상태 복구
            this.restoreGameState();
        });
        
        this.networkManager.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            
            if (reason === 'io server disconnect') {
                // 서버가 연결을 끊음 - 재연결 시도 안함
                return;
            }
            
            this.attemptReconnection();
        });
        
        this.networkManager.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.attemptReconnection();
        });
    }
    
    private async attemptReconnection(): Promise<void> {
        if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        
        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        
        this.networkManager.socket.connect();
        
        // 지수 백오프
        this.reconnectDelay *= 2;
    }
    
    private async restoreGameState(): Promise<void> {
        // 현재 매치 상태 요청
        const currentMatch = gameStore.currentMatch;
        if (currentMatch) {
            this.networkManager.socket.emit('battle:rejoin', {
                matchId: currentMatch.id,
                playerId: gameStore.playerId
            });
        }
    }
}
```

## 5. 성능 요구사항

### 5.1 클라이언트 성능
- **프레임레이트**: 60 FPS 유지 (모바일 기준)
- **메모리 사용량**: 최대 512MB (모바일)
- **배터리 소모**: 1시간 플레이 시 20% 이하
- **로딩 시간**: 초기 로딩 5초 이하, 매치 시작 3초 이하
- **APK/IPA 크기**: 150MB 이하

### 5.2 서버 성능
- **동시 접속자**: 100,000명 지원
- **매치 처리**: 초당 1,000개 매치 동시 진행
- **응답 시간**: API 응답 100ms 이하
- **처리량**: 초당 10,000 요청 처리
- **업타임**: 99.9% 가용성

### 5.3 네트워크 성능
- **지연 시간**: 50ms 이하 (같은 지역 내)
- **패킷 손실률**: 0.1% 이하
- **대역폭**: 플레이어당 5KB/s 이하
- **동기화 정확도**: 16ms 이내 동기화

### 5.4 확장성 계획
- **수평 확장**: 마이크로서비스 아키텍처
- **지역별 서버**: 글로벌 3개 지역 서버
- **로드 밸런싱**: 트래픽 기반 자동 스케일링
- **CDN 활용**: 정적 자원 글로벌 배포

## 6. 보안 및 치팅 방지

### 6.1 서버 검증
```typescript
// server/src/validation/ActionValidator.ts
export class ActionValidator {
    validateDeployUnit(playerId: string, action: DeployUnitAction): boolean {
        const player = this.getPlayer(playerId);
        
        // 엘릭서 확인
        if (player.currentElixir < action.elixirCost) {
            return false;
        }
        
        // 카드 소유 확인
        if (!player.deck.includes(action.cardId)) {
            return false;
        }
        
        // 배치 위치 확인
        if (!this.isValidDeploymentPosition(playerId, action.position)) {
            return false;
        }
        
        // 쿨다운 확인
        if (this.isCardOnCooldown(playerId, action.cardId)) {
            return false;
        }
        
        return true;
    }
    
    private isValidDeploymentPosition(playerId: string, position: Vec2): boolean {
        // 플레이어 영역 내에서만 배치 가능
        const playerSide = this.getPlayerSide(playerId);
        
        if (playerSide === 'bottom') {
            return position.y <= BATTLEFIELD_HEIGHT / 2;
        } else {
            return position.y >= BATTLEFIELD_HEIGHT / 2;
        }
    }
}
```

### 6.2 암호화 및 인증
```typescript
// server/src/auth/AuthService.ts
export class AuthService {
    private jwt = require('jsonwebtoken');
    private bcrypt = require('bcrypt');
    
    async authenticateToken(token: string): Promise<User | null> {
        try {
            const decoded = this.jwt.verify(token, process.env.JWT_SECRET);
            const user = await this.userService.findById(decoded.userId);
            return user;
        } catch (error) {
            return null;
        }
    }
    
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return await this.bcrypt.hash(password, saltRounds);
    }
    
    async validatePassword(password: string, hash: string): Promise<boolean> {
        return await this.bcrypt.compare(password, hash);
    }
    
    generateToken(userId: string): string {
        return this.jwt.sign(
            { userId, timestamp: Date.now() },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }
}
```

### 6.3 치팅 탐지
```typescript
// server/src/anticheat/CheatDetector.ts
export class CheatDetector {
    private suspiciousActivities: Map<string, number> = new Map();
    
    analyzePlayerAction(playerId: string, action: any): boolean {
        const player = this.getPlayer(playerId);
        const suspicionScore = this.calculateSuspicionScore(player, action);
        
        this.suspiciousActivities.set(playerId, 
            (this.suspiciousActivities.get(playerId) || 0) + suspicionScore
        );
        
        // 임계값 초과 시 추가 검증
        if (this.suspiciousActivities.get(playerId)! > 100) {
            this.flagForReview(playerId, action);
            return false;
        }
        
        return true;
    }
    
    private calculateSuspicionScore(player: Player, action: any): number {
        let score = 0;
        
        // 비정상적으로 빠른 액션
        if (this.isActionTooFast(player, action)) {
            score += 50;
        }
        
        // 불가능한 정확도
        if (this.isPerfectAccuracy(player)) {
            score += 30;
        }
        
        // 비정상적인 반응 시간
        if (this.isReactionTimeUnnatural(player, action)) {
            score += 40;
        }
        
        return score;
    }
}
```

### 6.4 데이터 무결성
```typescript
// server/src/security/DataIntegrity.ts
export class DataIntegrityManager {
    private crypto = require('crypto');
    
    generateChecksum(data: any): string {
        const serialized = JSON.stringify(data, Object.keys(data).sort());
        return this.crypto.createHash('sha256').update(serialized).digest('hex');
    }
    
    validateChecksum(data: any, expectedChecksum: string): boolean {
        const actualChecksum = this.generateChecksum(data);
        return actualChecksum === expectedChecksum;
    }
    
    encryptSensitiveData(data: string): string {
        const cipher = this.crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    
    decryptSensitiveData(encryptedData: string): string {
        const decipher = this.crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
```

## 7. 개발 환경 및 도구

### 7.1 개발 도구
- **IDE**: Visual Studio Code + Cocos Creator
- **버전 관리**: Git + GitHub
- **패키지 관리**: npm/yarn
- **테스트**: Jest + Cypress
- **린터**: ESLint + Prettier
- **타입 체크**: TypeScript Compiler

### 7.2 버전 관리 전략
```bash
# 브랜치 전략 (Git Flow)
main            # 프로덕션 배포 브랜치
├── develop     # 개발 통합 브랜치
├── feature/*   # 기능 개발 브랜치
├── release/*   # 릴리스 준비 브랜치
└── hotfix/*    # 긴급 수정 브랜치

# 커밋 메시지 규칙
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 도구 수정
```

### 7.3 CI/CD 파이프라인
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker build -t royal-clash .
          docker push $DOCKER_REGISTRY/royal-clash:latest
          kubectl apply -f k8s/
```

### 7.4 테스트 환경
```typescript
// tests/battle/BattleManager.test.ts
describe('BattleManager', () => {
    let battleManager: BattleManager;
    let mockPlayer1: Player;
    let mockPlayer2: Player;
    
    beforeEach(() => {
        battleManager = new BattleManager();
        mockPlayer1 = createMockPlayer('player1');
        mockPlayer2 = createMockPlayer('player2');
    });
    
    describe('deployUnit', () => {
        it('should deploy unit when valid', () => {
            const action = {
                cardId: 'knight',
                position: { x: 5, y: 2 },
                elixirCost: 3
            };
            
            const result = battleManager.deployUnit(mockPlayer1.id, action);
            
            expect(result.success).toBe(true);
            expect(mockPlayer1.currentElixir).toBe(7); // 10 - 3
        });
        
        it('should reject deployment with insufficient elixir', () => {
            mockPlayer1.currentElixir = 2;
            
            const action = {
                cardId: 'knight',
                position: { x: 5, y: 2 },
                elixirCost: 3
            };
            
            const result = battleManager.deployUnit(mockPlayer1.id, action);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_ELIXIR');
        });
    });
});
```

이 TRD 문서는 Royal Clash 게임의 기술적 구현을 위한 포괄적인 가이드로, 실시간 PvP 게임의 복잡성을 고려한 견고한 아키텍처를 제시합니다.