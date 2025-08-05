# 실시간 네트워킹 구현계획

## 문서 정보
- **문서명**: 실시간 네트워킹 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [네트워크 아키텍처](#3-네트워크-아키텍처)
4. [동기화 시스템](#4-동기화-시스템)
5. [최적화 구현](#5-최적화-구현)

## 1. 구현 개요

### 1.1 기술 스택
- **클라이언트**: Cocos Creator 3.x + WebSocket
- **서버**: Node.js + Socket.io
- **프로토콜**: WebSocket (TCP), WebRTC (P2P)
- **데이터 압축**: MessagePack
- **보안**: JWT + RSA 암호화

### 1.2 성능 목표
- **지연시간**: 50ms 이하 (글로벌 평균)
- **동기화**: 16ms 주기 (60FPS)
- **처리량**: 서버당 1000+ 동시 매치
- **패킷 손실**: 0.1% 이하

## 2. 개발 일정

### 2.1 Phase 1: 기본 네트워킹 (3주)
```typescript
const phase1Tasks = {
  week1: ['WebSocket 연결', '기본 메시지 시스템'],
  week2: ['상태 동기화', '명령 전송'],
  week3: ['연결 관리', '재연결 로직']
};
```

### 2.2 Phase 2: 고급 기능 (3주)
```typescript
const phase2Tasks = {
  week1: ['지연 보상', '예측 시스템'],
  week2: ['충돌 해결', '롤백 시스템'],
  week3: ['최적화', '압축 시스템']
};
```

### 2.3 Phase 3: 안정화 (2주)
```typescript
const phase3Tasks = {
  week1: ['보안 강화', '부정행위 방지'],
  week2: ['성능 테스트', '배포 준비']
};
```

## 3. 네트워크 아키텍처

### 3.1 네트워크 매니저
```typescript
// [의도] 클라이언트 네트워킹의 중앙 관리자
// [책임] 연결 관리, 메시지 라우팅, 상태 동기화
export class NetworkManager {
  private socket: Socket;
  private connectionState: ConnectionState;
  private messageQueue: MessageQueue;
  private syncManager: StateSyncManager;
  private latencyManager: LatencyManager;
  
  constructor() {
    this.connectionState = ConnectionState.Disconnected;
    this.messageQueue = new MessageQueue();
    this.syncManager = new StateSyncManager();
    this.latencyManager = new LatencyManager();
  }
  
  async connect(serverEndpoint: string, authToken: string): Promise<boolean> {
    try {
      this.socket = io(serverEndpoint, {
        auth: { token: authToken },
        transports: ['websocket'],
        timeout: 5000,
        forceNew: true
      });
      
      this.setupEventHandlers();
      
      return new Promise((resolve) => {
        this.socket.on('connect', () => {
          this.connectionState = ConnectionState.Connected;
          this.startHeartbeat();
          resolve(true);
        });
        
        this.socket.on('connect_error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }
  
  private setupEventHandlers(): void {
    // 게임 상태 동기화
    this.socket.on('game_state', (data: GameStateMessage) => {
      this.syncManager.applyServerState(data);
    });
    
    // 플레이어 명령
    this.socket.on('player_command', (data: PlayerCommandMessage) => {
      this.handlePlayerCommand(data);
    });
    
    // 지연시간 측정
    this.socket.on('ping', (timestamp: number) => {
      this.socket.emit('pong', timestamp);
    });
    
    this.socket.on('pong', (timestamp: number) => {
      const latency = Date.now() - timestamp;
      this.latencyManager.updateLatency(latency);
    });
    
    // 연결 상태 관리
    this.socket.on('disconnect', (reason: string) => {
      this.connectionState = ConnectionState.Disconnected;
      this.handleDisconnection(reason);
    });
    
    this.socket.on('reconnect', () => {
      this.connectionState = ConnectionState.Connected;
      this.handleReconnection();
    });
  }
  
  sendCommand(command: GameCommand): void {
    if (this.connectionState !== ConnectionState.Connected) {
      this.messageQueue.enqueue(command);
      return;
    }
    
    const message: CommandMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      playerId: this.getPlayerId(),
      command: command,
      sequence: this.getNextSequence()
    };
    
    this.socket.emit('game_command', message);
  }
  
  private startHeartbeat(): void {
    setInterval(() => {
      if (this.connectionState === ConnectionState.Connected) {
        this.socket.emit('ping', Date.now());
      }
    }, 1000); // 1초마다 핑
  }
  
  private handleDisconnection(reason: string): void {
    console.warn('Disconnected:', reason);
    
    // 자동 재연결 시도
    if (reason !== 'client disconnect') {
      this.attemptReconnection();
    }
  }
  
  private async attemptReconnection(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 5;
    const baseDelay = 1000;
    
    while (attempts < maxAttempts && this.connectionState === ConnectionState.Disconnected) {
      attempts++;
      const delay = baseDelay * Math.pow(2, attempts - 1); // 지수 백오프
      
      console.log(`Reconnection attempt ${attempts}/${maxAttempts} in ${delay}ms`);
      
      await this.sleep(delay);
      
      try {
        this.socket.connect();
        break;
      } catch (error) {
        console.error(`Reconnection attempt ${attempts} failed:`, error);
      }
    }
    
    if (attempts >= maxAttempts) {
      this.connectionState = ConnectionState.Failed;
      this.onConnectionFailed?.();
    }
  }
}
```

### 3.2 서버 세션 관리
```typescript
// [의도] 서버사이드 게임 세션과 플레이어 연결 관리
// [책임] 세션 생성, 플레이어 관리, 메시지 브로드캐스트
export class GameSessionManager {
  private sessions: Map<string, GameSession>;
  private players: Map<string, PlayerConnection>;
  private messageProcessor: MessageProcessor;
  
  constructor() {
    this.sessions = new Map();
    this.players = new Map();
    this.messageProcessor = new MessageProcessor();
  }
  
  async createSession(matchId: string, playerIds: string[]): Promise<GameSession> {
    const session = new GameSession({
      id: matchId,
      playerIds: playerIds,
      createdAt: Date.now(),
      state: SessionState.Initializing
    });
    
    this.sessions.set(matchId, session);
    
    // 플레이어들을 세션에 추가
    for (const playerId of playerIds) {
      const playerConnection = this.players.get(playerId);
      if (playerConnection) {
        await this.addPlayerToSession(session, playerConnection);
      }
    }
    
    // 게임 시작
    await session.initialize();
    
    return session;
  }
  
  handlePlayerMessage(playerId: string, message: any): void {
    const playerConnection = this.players.get(playerId);
    if (!playerConnection) return;
    
    const session = this.sessions.get(playerConnection.sessionId);
    if (!session) return;
    
    // 메시지 검증
    if (!this.validateMessage(message, playerConnection)) {
      this.handleInvalidMessage(playerId, message);
      return;
    }
    
    // 메시지 처리
    this.messageProcessor.processMessage(session, playerId, message);
  }
  
  private async addPlayerToSession(
    session: GameSession, 
    playerConnection: PlayerConnection
  ): Promise<void> {
    playerConnection.sessionId = session.id;
    playerConnection.socket.join(session.id);
    
    // 초기 게임 상태 전송
    const initialState = await session.getInitialState(playerConnection.playerId);
    playerConnection.socket.emit('game_initialized', initialState);
  }
  
  broadcastToSession(sessionId: string, event: string, data: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // 세션의 모든 플레이어에게 브로드캐스트
    this.io.to(sessionId).emit(event, data);
  }
  
  private validateMessage(message: any, playerConnection: PlayerConnection): boolean {
    // 메시지 구조 검증
    if (!message.id || !message.timestamp || !message.command) {
      return false;
    }
    
    // 시퀀스 번호 검증 (순서 보장)
    if (message.sequence <= playerConnection.lastSequence) {
      return false;
    }
    
    // 타임스탬프 검증 (너무 오래된 메시지 거부)
    const now = Date.now();
    if (now - message.timestamp > 5000) { // 5초 이상 차이
      return false;
    }
    
    return true;
  }
}
```

## 4. 동기화 시스템

### 4.1 상태 동기화
```typescript
// [의도] 게임 상태의 실시간 동기화 관리
// [책임] 상태 변경 추적, 델타 압축, 클라이언트 업데이트
export class StateSynchronizer {
  private gameState: GameState;
  private lastSentState: GameState;
  private deltaCompressor: DeltaCompressor;
  private clientStates: Map<string, ClientState>;
  
  constructor() {
    this.gameState = new GameState();
    this.deltaCompressor = new DeltaCompressor();
    this.clientStates = new Map();
  }
  
  updateGameState(updates: StateUpdate[]): void {
    // 상태 업데이트 적용
    for (const update of updates) {
      this.applyStateUpdate(update);
    }
    
    // 변경사항이 있으면 클라이언트에 전송
    if (this.hasStateChanged()) {
      this.synchronizeClients();
    }
  }
  
  private synchronizeClients(): void {
    const delta = this.deltaCompressor.createDelta(
      this.lastSentState, 
      this.gameState
    );
    
    // 클라이언트별로 필요한 정보만 전송
    for (const [playerId, clientState] of this.clientStates) {
      const filteredDelta = this.filterDeltaForClient(delta, playerId);
      const compressed = this.deltaCompressor.compress(filteredDelta);
      
      this.sendToClient(playerId, {
        type: 'state_update',
        delta: compressed,
        timestamp: Date.now(),
        sequence: this.getNextSequence()
      });
    }
    
    // 마지막 전송 상태 업데이트
    this.lastSentState = this.gameState.clone();
  }
  
  private filterDeltaForClient(delta: StateDelta, playerId: string): StateDelta {
    // 플레이어가 볼 수 있는 정보만 필터링
    const visibleArea = this.getPlayerVisibleArea(playerId);
    
    return {
      units: delta.units.filter(unit => 
        this.isInVisibleArea(unit.position, visibleArea)
      ),
      buildings: delta.buildings.filter(building =>
        this.isInVisibleArea(building.position, visibleArea)
      ),
      effects: delta.effects.filter(effect =>
        this.isInVisibleArea(effect.position, visibleArea)
      ),
      playerData: this.filterPlayerData(delta.playerData, playerId)
    };
  }
  
  handleClientAcknowledgment(playerId: string, sequence: number): void {
    const clientState = this.clientStates.get(playerId);
    if (clientState) {
      clientState.lastAcknowledgedSequence = sequence;
      
      // 확인되지 않은 메시지 정리
      this.cleanupUnacknowledgedMessages(clientState);
    }
  }
}
```

### 4.2 명령 전송 시스템
```typescript
// [의도] 플레이어 명령의 안정적 전송과 처리
// [책임] 명령 큐잉, 순서 보장, 재전송 처리
export class CommandTransmissionSystem {
  private commandQueue: CommandQueue;
  private pendingCommands: Map<string, PendingCommand>;
  private sequenceNumber: number;
  
  constructor() {
    this.commandQueue = new CommandQueue();
    this.pendingCommands = new Map();
    this.sequenceNumber = 0;
  }
  
  sendCommand(command: GameCommand): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const commandId = this.generateCommandId();
      const sequence = ++this.sequenceNumber;
      
      const pendingCommand: PendingCommand = {
        id: commandId,
        command: command,
        sequence: sequence,
        timestamp: Date.now(),
        resolve: resolve,
        reject: reject,
        retryCount: 0
      };
      
      this.pendingCommands.set(commandId, pendingCommand);
      this.transmitCommand(pendingCommand);
      
      // 타임아웃 설정
      setTimeout(() => {
        if (this.pendingCommands.has(commandId)) {
          this.handleCommandTimeout(commandId);
        }
      }, 5000); // 5초 타임아웃
    });
  }
  
  private transmitCommand(pendingCommand: PendingCommand): void {
    const message: CommandMessage = {
      id: pendingCommand.id,
      sequence: pendingCommand.sequence,
      timestamp: pendingCommand.timestamp,
      command: pendingCommand.command,
      playerId: this.getPlayerId()
    };
    
    this.networkManager.send('game_command', message);
  }
  
  handleCommandAcknowledgment(commandId: string, result: CommandResult): void {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (pendingCommand) {
      pendingCommand.resolve(result);
      this.pendingCommands.delete(commandId);
    }
  }
  
  private handleCommandTimeout(commandId: string): void {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (!pendingCommand) return;
    
    if (pendingCommand.retryCount < 3) {
      // 재전송 시도
      pendingCommand.retryCount++;
      pendingCommand.timestamp = Date.now();
      this.transmitCommand(pendingCommand);
    } else {
      // 최대 재시도 횟수 초과
      pendingCommand.reject(new Error('Command transmission failed'));
      this.pendingCommands.delete(commandId);
    }
  }
  
  // 명령 큐 처리 (오프라인 상태에서 쌓인 명령들)
  processQueuedCommands(): void {
    while (!this.commandQueue.isEmpty()) {
      const command = this.commandQueue.dequeue();
      this.sendCommand(command);
    }
  }
}
```

### 4.3 지연 보상 시스템
```typescript
// [의도] 네트워크 지연을 보상하여 반응성 향상
// [책임] 지연 예측, 보상 적용, 롤백 처리
export class LatencyCompensationSystem {
  private latencyHistory: LatencyEntry[];
  private compensationBuffer: CompensationBuffer;
  private rollbackManager: RollbackManager;
  
  constructor() {
    this.latencyHistory = [];
    this.compensationBuffer = new CompensationBuffer();
    this.rollbackManager = new RollbackManager();
  }
  
  compensateCommand(command: GameCommand, clientTimestamp: number): GameCommand {
    const serverTimestamp = Date.now();
    const estimatedLatency = this.estimateLatency();
    
    // 클라이언트에서 명령이 실행된 실제 시간 추정
    const adjustedTimestamp = clientTimestamp + estimatedLatency / 2;
    
    // 위치 기반 명령의 경우 보간 적용
    if (command.type === CommandType.Move || command.type === CommandType.Attack) {
      return this.interpolatePositionalCommand(command, adjustedTimestamp);
    }
    
    return {
      ...command,
      timestamp: adjustedTimestamp,
      compensated: true
    };
  }
  
  private interpolatePositionalCommand(
    command: GameCommand, 
    timestamp: number
  ): GameCommand {
    if (command.type !== CommandType.Move) return command;
    
    const unit = this.gameState.getUnit(command.unitId);
    if (!unit) return command;
    
    // 유닛의 이동 기록에서 해당 시점의 위치 추정
    const interpolatedPosition = this.interpolatePosition(
      unit.positionHistory, 
      timestamp
    );
    
    return {
      ...command,
      position: interpolatedPosition,
      timestamp: timestamp
    };
  }
  
  private interpolatePosition(
    positionHistory: PositionHistory[], 
    timestamp: number
  ): Vector3 {
    // 이진 탐색으로 적절한 구간 찾기
    let left = 0;
    let right = positionHistory.length - 1;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (positionHistory[mid].timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left === 0) return positionHistory[0].position;
    if (left >= positionHistory.length) return positionHistory[positionHistory.length - 1].position;
    
    // 선형 보간
    const before = positionHistory[left - 1];
    const after = positionHistory[left];
    const factor = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
    
    return Vector3.lerp(before.position, after.position, factor);
  }
  
  private estimateLatency(): number {
    if (this.latencyHistory.length === 0) return 100; // 기본값
    
    // 최근 10개 샘플의 가중 평균
    const recentSamples = this.latencyHistory.slice(-10);
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < recentSamples.length; i++) {
      const weight = i + 1; // 최근 것일수록 높은 가중치
      weightedSum += recentSamples[i].latency * weight;
      totalWeight += weight;
    }
    
    return weightedSum / totalWeight;
  }
}
```

## 5. 최적화 구현

### 5.1 메시지 압축
```typescript
// [의도] 네트워크 대역폭 절약을 위한 메시지 압축
// [책임] 데이터 압축, 압축 해제, 성능 최적화
export class MessageCompressionSystem {
  private compressor: MessagePackCompressor;
  private dictionary: CompressionDictionary;
  private compressionStats: CompressionStats;
  
  constructor() {
    this.compressor = new MessagePackCompressor();
    this.dictionary = new CompressionDictionary();
    this.compressionStats = new CompressionStats();
  }
  
  compressMessage(message: NetworkMessage): CompressedMessage {
    const startTime = performance.now();
    
    // 딕셔너리 기반 압축
    const dictionaryCompressed = this.dictionary.compress(message);
    
    // MessagePack 압축
    const binaryData = this.compressor.pack(dictionaryCompressed);
    
    // 추가 압축 (gzip 스타일)
    const finalCompressed = this.compressor.deflate(binaryData);
    
    const compressionTime = performance.now() - startTime;
    const originalSize = JSON.stringify(message).length;
    const compressedSize = finalCompressed.length;
    
    this.compressionStats.record({
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      compressionTime
    });
    
    return {
      data: finalCompressed,
      originalSize,
      compressedSize,
      compressionType: 'msgpack+dict+deflate'
    };
  }
  
  decompressMessage(compressed: CompressedMessage): NetworkMessage {
    const startTime = performance.now();
    
    // 압축 해제 (역순)
    const inflated = this.compressor.inflate(compressed.data);
    const unpacked = this.compressor.unpack(inflated);
    const finalMessage = this.dictionary.decompress(unpacked);
    
    const decompressionTime = performance.now() - startTime;
    
    this.compressionStats.recordDecompression(decompressionTime);
    
    return finalMessage;
  }
  
  optimizeDictionary(): void {
    // 사용 빈도 기반으로 딕셔너리 최적화
    const usage = this.compressionStats.getUsageStats();
    this.dictionary.optimize(usage);
  }
}
```

### 5.2 연결 풀링
```typescript
// [의도] 효율적인 네트워크 연결 관리
// [책임] 연결 재사용, 풀 관리, 성능 최적화
export class ConnectionPoolManager {
  private pools: Map<string, ConnectionPool>;
  private poolConfig: PoolConfig;
  private healthChecker: ConnectionHealthChecker;
  
  constructor(config: PoolConfig) {
    this.pools = new Map();
    this.poolConfig = config;
    this.healthChecker = new ConnectionHealthChecker();
    this.initializePools();
  }
  
  private initializePools(): void {
    // 지역별 연결 풀 생성
    const regions = ['NA', 'EU', 'ASIA', 'SA'];
    
    regions.forEach(region => {
      const pool = new ConnectionPool({
        region: region,
        minConnections: this.poolConfig.minConnectionsPerRegion,
        maxConnections: this.poolConfig.maxConnectionsPerRegion,
        connectionTimeout: this.poolConfig.connectionTimeout,
        idleTimeout: this.poolConfig.idleTimeout
      });
      
      this.pools.set(region, pool);
    });
  }
  
  async getConnection(region: string): Promise<PooledConnection> {
    const pool = this.pools.get(region);
    if (!pool) {
      throw new Error(`No pool found for region: ${region}`);
    }
    
    let connection = await pool.acquire();
    
    // 연결 상태 확인
    if (!await this.healthChecker.isHealthy(connection)) {
      // 불량 연결 제거 및 새 연결 생성
      await pool.remove(connection);
      connection = await pool.acquire();
    }
    
    return connection;
  }
  
  releaseConnection(connection: PooledConnection): void {
    const pool = this.pools.get(connection.region);
    if (pool) {
      pool.release(connection);
    }
  }
  
  // 풀 상태 모니터링
  getPoolStats(): PoolStats[] {
    const stats: PoolStats[] = [];
    
    for (const [region, pool] of this.pools) {
      stats.push({
        region: region,
        totalConnections: pool.getTotalConnections(),
        activeConnections: pool.getActiveConnections(),
        idleConnections: pool.getIdleConnections(),
        pendingRequests: pool.getPendingRequests()
      });
    }
    
    return stats;
  }
  
  // 주기적 정리 작업
  performMaintenance(): void {
    for (const pool of this.pools.values()) {
      // 유휴 연결 정리
      pool.cleanupIdleConnections();
      
      // 불량 연결 제거
      pool.removeUnhealthyConnections();
      
      // 최소 연결 수 유지
      pool.ensureMinimumConnections();
    }
  }
}
```

### 5.3 대역폭 최적화
```typescript
// [의도] 네트워크 대역폭 사용량 최적화
// [책임] 데이터 필터링, 업데이트 빈도 조절, 적응적 품질
export class BandwidthOptimizer {
  private bandwidthMonitor: BandwidthMonitor;
  private adaptiveQuality: AdaptiveQualityManager;
  private updateScheduler: UpdateScheduler;
  
  constructor() {
    this.bandwidthMonitor = new BandwidthMonitor();
    this.adaptiveQuality = new AdaptiveQualityManager();
    this.updateScheduler = new UpdateScheduler();
  }
  
  optimizeForBandwidth(availableBandwidth: number): OptimizationSettings {
    const settings: OptimizationSettings = {
      updateFrequency: 60, // 기본 60Hz
      compressionLevel: 6,
      lodLevel: 1,
      maxMessageSize: 1024
    };
    
    // 대역폭에 따른 적응적 조정
    if (availableBandwidth < 1000000) { // 1Mbps 미만
      settings.updateFrequency = 30; // 30Hz로 감소
      settings.compressionLevel = 9; // 최대 압축
      settings.lodLevel = 2; // 낮은 품질
      settings.maxMessageSize = 512;
    } else if (availableBandwidth < 5000000) { // 5Mbps 미만
      settings.updateFrequency = 45; // 45Hz
      settings.compressionLevel = 7;
      settings.lodLevel = 1;
      settings.maxMessageSize = 768;
    }
    
    this.applyOptimizationSettings(settings);
    return settings;
  }
  
  private applyOptimizationSettings(settings: OptimizationSettings): void {
    // 업데이트 빈도 조정
    this.updateScheduler.setFrequency(settings.updateFrequency);
    
    // 압축 레벨 조정
    this.messageCompressor.setCompressionLevel(settings.compressionLevel);
    
    // LOD 레벨 조정
    this.adaptiveQuality.setLODLevel(settings.lodLevel);
  }
  
  filterUpdatesForBandwidth(
    updates: StateUpdate[], 
    availableBandwidth: number
  ): StateUpdate[] {
    // 중요도 기반 필터링
    const prioritizedUpdates = this.prioritizeUpdates(updates);
    const budgetPerUpdate = availableBandwidth / 60; // 60Hz 기준
    
    const filteredUpdates: StateUpdate[] = [];
    let currentBudget = budgetPerUpdate;
    
    for (const update of prioritizedUpdates) {
      const updateSize = this.estimateUpdateSize(update);
      
      if (updateSize <= currentBudget) {
        filteredUpdates.push(update);
        currentBudget -= updateSize;
      } else {
        // 예산 초과 시 중요도가 낮은 업데이트는 스킵
        break;
      }
    }
    
    return filteredUpdates;
  }
  
  private prioritizeUpdates(updates: StateUpdate[]): StateUpdate[] {
    return updates.sort((a, b) => {
      // 플레이어 관련 업데이트가 최우선
      if (a.type === UpdateType.Player && b.type !== UpdateType.Player) return -1;
      if (b.type === UpdateType.Player && a.type !== UpdateType.Player) return 1;
      
      // 전투 관련 업데이트가 두 번째 우선순위
      if (a.type === UpdateType.Combat && b.type !== UpdateType.Combat) return -1;
      if (b.type === UpdateType.Combat && a.type !== UpdateType.Combat) return 1;
      
      // 거리 기반 우선순위
      return a.distanceToPlayer - b.distanceToPlayer;
    });
  }
}
```

이 구현계획은 실시간 PvP 게임에 필요한 고성능 네트워킹 시스템을 구축하기 위한 핵심 요소들을 다루고 있습니다. 지연 보상, 상태 동기화, 대역폭 최적화 등을 통해 안정적이고 반응성 좋은 멀티플레이어 경험을 제공합니다.