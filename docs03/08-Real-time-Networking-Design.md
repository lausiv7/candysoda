# Real-time Networking Design
Royal Clash - 실시간 네트워킹 설계

## 1. 네트워킹 아키텍처

### 1.1 클라이언트-서버 모델
```
네트워크 아키텍처:
├── Authoritative Server (권위 서버)
│   ├── 모든 게임 로직은 서버에서 실행
│   ├── 클라이언트는 입력만 전송
│   ├── 서버가 게임 상태를 관리
│   └── 치팅 방지 및 공정성 보장
├── Client Prediction (클라이언트 예측)
│   ├── 로컬에서 즉시 반응 표시
│   ├── 서버 응답 대기 없이 UI 업데이트
│   ├── 네트워크 지연 시간 보상
│   └── 부드러운 게임플레이 경험
├── Server Reconciliation (서버 조정)
│   ├── 서버 결과로 클라이언트 상태 보정
│   ├── 예측 오류 수정
│   ├── 일관성 유지
│   └── 시각적 보간을 통한 부드러운 보정
└── Rollback Netcode (롤백 넷코드)
    ├── 네트워크 지연 보상
    ├── 입력 지연 최소화
    ├── 프레임별 상태 저장
    └── 과거 상태로 롤백 후 재계산
```

### 1.2 프로토콜 선택
```typescript
// src/network/NetworkProtocol.ts
export enum NetworkProtocol {
    TCP = 'tcp',           // 신뢰성 중요한 데이터
    UDP = 'udp',           // 실시간성 중요한 데이터
    WEBSOCKET = 'websocket' // 웹 클라이언트
}

export interface NetworkConfig {
    protocol: NetworkProtocol;
    port: number;
    maxConnections: number;
    timeout: number;
    heartbeatInterval: number;
    compressionEnabled: boolean;
}

export const NETWORK_CONFIGS: { [key: string]: NetworkConfig } = {
    'game_server': {
        protocol: NetworkProtocol.UDP,
        port: 7777,
        maxConnections: 10000,
        timeout: 30000,
        heartbeatInterval: 1000,
        compressionEnabled: true
    },
    'web_client': {
        protocol: NetworkProtocol.WEBSOCKET,
        port: 8080,
        maxConnections: 5000,
        timeout: 60000,
        heartbeatInterval: 2000,
        compressionEnabled: false
    },
    'matchmaking': {
        protocol: NetworkProtocol.TCP,
        port: 9090,
        maxConnections: 50000,
        timeout: 120000,
        heartbeatInterval: 5000,
        compressionEnabled: true
    }
};

export class NetworkManager {
    private connections: Map<string, NetworkConnection> = new Map();
    private messageHandlers: Map<string, MessageHandler> = new Map();
    private compressionEngine: CompressionEngine;
    
    constructor(config: NetworkConfig) {
        this.compressionEngine = new CompressionEngine(config.compressionEnabled);
        this.initializeProtocol(config);
    }
    
    private initializeProtocol(config: NetworkConfig): void {
        switch (config.protocol) {
            case NetworkProtocol.UDP:
                this.initializeUDP(config);
                break;
            case NetworkProtocol.WEBSOCKET:
                this.initializeWebSocket(config);
                break;
            case NetworkProtocol.TCP:
                this.initializeTCP(config);
                break;
        }
    }
    
    private initializeUDP(config: NetworkConfig): void {
        const dgram = require('dgram');
        const server = dgram.createSocket('udp4');
        
        server.on('message', (msg: Buffer, rinfo: any) => {
            this.handleMessage(msg, rinfo);
        });
        
        server.bind(config.port);
        console.log(`UDP server listening on port ${config.port}`);
    }
    
    private initializeWebSocket(config: NetworkConfig): void {
        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ port: config.port });
        
        wss.on('connection', (ws: any, req: any) => {
            const connectionId = this.generateConnectionId();
            const connection = new WebSocketConnection(connectionId, ws);
            
            this.connections.set(connectionId, connection);
            
            ws.on('message', (data: Buffer) => {
                this.handleWebSocketMessage(connectionId, data);
            });
            
            ws.on('close', () => {
                this.connections.delete(connectionId);
            });
        });
        
        console.log(`WebSocket server listening on port ${config.port}`);
    }
    
    public sendMessage(connectionId: string, message: NetworkMessage): void {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.warn(`Connection ${connectionId} not found`);
            return;
        }
        
        const serialized = this.serializeMessage(message);
        const compressed = this.compressionEngine.compress(serialized);
        
        connection.send(compressed);
    }
    
    public broadcastMessage(message: NetworkMessage, excludeIds?: string[]): void {
        const serialized = this.serializeMessage(message);
        const compressed = this.compressionEngine.compress(serialized);
        
        for (const [connectionId, connection] of this.connections.entries()) {
            if (excludeIds && excludeIds.includes(connectionId)) continue;
            
            connection.send(compressed);
        }
    }
    
    private handleMessage(data: Buffer, sender: any): void {
        try {
            const decompressed = this.compressionEngine.decompress(data);
            const message = this.deserializeMessage(decompressed);
            
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler.handle(message, sender);
            }
        } catch (error) {
            console.error('Message handling error:', error);
        }
    }
}
```

### 1.3 연결 관리
```typescript
// src/network/ConnectionManager.ts
export class ConnectionManager {
    private connections: Map<string, GameConnection> = new Map();
    private connectionPool: ConnectionPool;
    private heartbeatManager: HeartbeatManager;
    private reconnectionManager: ReconnectionManager;
    
    constructor() {
        this.connectionPool = new ConnectionPool(1000);
        this.heartbeatManager = new HeartbeatManager(this);
        this.reconnectionManager = new ReconnectionManager(this);
        
        this.startConnectionMonitoring();
    }
    
    public createConnection(playerId: string, socket: any): GameConnection {
        const connection = new GameConnection(playerId, socket);
        
        connection.onDisconnect = (reason: string) => {
            this.handleDisconnection(playerId, reason);
        };
        
        connection.onReconnect = () => {
            this.handleReconnection(playerId);
        };
        
        this.connections.set(playerId, connection);
        this.heartbeatManager.startHeartbeat(playerId);
        
        console.log(`Connection established for player ${playerId}`);
        return connection;
    }
    
    public getConnection(playerId: string): GameConnection | null {
        return this.connections.get(playerId) || null;
    }
    
    public removeConnection(playerId: string): void {
        const connection = this.connections.get(playerId);
        if (connection) {
            this.heartbeatManager.stopHeartbeat(playerId);
            connection.close();
            this.connections.delete(playerId);
        }
    }
    
    private handleDisconnection(playerId: string, reason: string): void {
        console.log(`Player ${playerId} disconnected: ${reason}`);
        
        // 게임 중인 플레이어인지 확인
        const battleRoom = BattleManager.instance.getPlayerBattle(playerId);
        if (battleRoom) {
            // 재연결 대기 시간 설정 (30초)
            battleRoom.setPlayerDisconnected(playerId, 30000);
        }
        
        // 재연결 가능 상태로 표시
        this.reconnectionManager.enableReconnection(playerId, 300000); // 5분간 재연결 가능
        
        AnalyticsManager.instance.trackEvent('player_disconnected', {
            player_id: playerId,
            reason: reason,
            in_battle: !!battleRoom
        });
    }
    
    private handleReconnection(playerId: string): void {
        console.log(`Player ${playerId} reconnected`);
        
        const battleRoom = BattleManager.instance.getPlayerBattle(playerId);
        if (battleRoom) {
            // 게임 상태 동기화
            battleRoom.syncPlayerState(playerId);
            battleRoom.setPlayerReconnected(playerId);
        }
        
        AnalyticsManager.instance.trackEvent('player_reconnected', {
            player_id: playerId,
            reconnection_time: Date.now()
        });
    }
    
    private startConnectionMonitoring(): void {
        setInterval(() => {
            this.monitorConnections();
        }, 5000); // 5초마다 연결 상태 확인
    }
    
    private monitorConnections(): void {
        const now = Date.now();
        const timeoutThreshold = 30000; // 30초 타임아웃
        
        for (const [playerId, connection] of this.connections.entries()) {
            if (now - connection.lastActivity > timeoutThreshold) {
                console.log(`Connection timeout for player ${playerId}`);
                this.handleDisconnection(playerId, 'timeout');
                this.removeConnection(playerId);
            }
        }
    }
}

export class GameConnection {
    public playerId: string;
    public socket: any;
    public lastActivity: number;
    public isConnected: boolean;
    public latency: number;
    public packetLoss: number;
    
    public onDisconnect?: (reason: string) => void;
    public onReconnect?: () => void;
    
    constructor(playerId: string, socket: any) {
        this.playerId = playerId;
        this.socket = socket;
        this.lastActivity = Date.now();
        this.isConnected = true;
        this.latency = 0;
        this.packetLoss = 0;
        
        this.setupSocketHandlers();
    }
    
    private setupSocketHandlers(): void {
        this.socket.on('close', (code: number, reason: string) => {
            this.isConnected = false;
            if (this.onDisconnect) {
                this.onDisconnect(reason || 'connection_closed');
            }
        });
        
        this.socket.on('error', (error: Error) => {
            console.error(`Socket error for player ${this.playerId}:`, error);
            this.isConnected = false;
            if (this.onDisconnect) {
                this.onDisconnect('socket_error');
            }
        });
        
        this.socket.on('pong', (data: Buffer) => {
            const timestamp = data.readUInt32BE(0);
            this.latency = Date.now() - timestamp;
            this.updateLastActivity();
        });
    }
    
    public send(data: Buffer): boolean {
        if (!this.isConnected) {
            return false;
        }
        
        try {
            this.socket.send(data);
            return true;
        } catch (error) {
            console.error(`Send error for player ${this.playerId}:`, error);
            return false;
        }
    }
    
    public ping(): void {
        if (!this.isConnected) return;
        
        const timestamp = Buffer.allocUnsafe(4);
        timestamp.writeUInt32BE(Date.now(), 0);
        
        try {
            this.socket.ping(timestamp);
        } catch (error) {
            console.error(`Ping error for player ${this.playerId}:`, error);
        }
    }
    
    public updateLastActivity(): void {
        this.lastActivity = Date.now();
    }
    
    public close(): void {
        if (this.isConnected) {
            this.socket.close();
            this.isConnected = false;
        }
    }
}
```

### 1.4 세션 관리
```typescript
// src/network/SessionManager.ts
export interface GameSession {
    sessionId: string;
    matchId: string;
    players: SessionPlayer[];
    startTime: number;
    lastSyncTime: number;
    gameState: GameState;
    serverTick: number;
    isActive: boolean;
}

export interface SessionPlayer {
    playerId: string;
    connectionId: string;
    isConnected: boolean;
    lastInputTime: number;
    inputBuffer: PlayerInput[];
    confirmationBuffer: InputConfirmation[];
}

export class SessionManager {
    private sessions: Map<string, GameSession> = new Map();
    private playerSessions: Map<string, string> = new Map(); // playerId -> sessionId
    private tickRate: number = 20; // 20 TPS
    private maxInputBuffer: number = 60; // 3초간의 입력 버퍼
    
    constructor() {
        this.startSessionTicker();
    }
    
    public createSession(matchId: string, player1Id: string, player2Id: string): GameSession {
        const sessionId = this.generateSessionId();
        
        const session: GameSession = {
            sessionId,
            matchId,
            players: [
                {
                    playerId: player1Id,
                    connectionId: player1Id,
                    isConnected: true,
                    lastInputTime: Date.now(),
                    inputBuffer: [],
                    confirmationBuffer: []
                },
                {
                    playerId: player2Id,
                    connectionId: player2Id,
                    isConnected: true,
                    lastInputTime: Date.now(),
                    inputBuffer: [],
                    confirmationBuffer: []
                }
            ],
            startTime: Date.now(),
            lastSyncTime: Date.now(),
            gameState: this.createInitialGameState(),
            serverTick: 0,
            isActive: true
        };
        
        this.sessions.set(sessionId, session);
        this.playerSessions.set(player1Id, sessionId);
        this.playerSessions.set(player2Id, sessionId);
        
        return session;
    }
    
    public getPlayerSession(playerId: string): GameSession | null {
        const sessionId = this.playerSessions.get(playerId);
        return sessionId ? this.sessions.get(sessionId) || null : null;
    }
    
    public processPlayerInput(playerId: string, input: PlayerInput): void {
        const session = this.getPlayerSession(playerId);
        if (!session) return;
        
        const player = session.players.find(p => p.playerId === playerId);
        if (!player) return;
        
        // 입력에 서버 틱과 타임스탬프 추가
        input.serverTick = session.serverTick;
        input.timestamp = Date.now();
        input.sequenceNumber = player.inputBuffer.length;
        
        // 입력 버퍼에 추가
        player.inputBuffer.push(input);
        player.lastInputTime = Date.now();
        
        // 버퍼 크기 제한
        if (player.inputBuffer.length > this.maxInputBuffer) {
            player.inputBuffer.shift();
        }
        
        // 즉시 입력 확인 전송
        this.sendInputConfirmation(playerId, input);
    }
    
    private sendInputConfirmation(playerId: string, input: PlayerInput): void {
        const confirmation: InputConfirmation = {
            sequenceNumber: input.sequenceNumber,
            serverTick: input.serverTick,
            timestamp: Date.now(),
            acknowledged: true
        };
        
        const message: NetworkMessage = {
            type: 'input_confirmation',
            payload: confirmation,
            timestamp: Date.now()
        };
        
        NetworkManager.instance.sendMessage(playerId, message);
    }
    
    private startSessionTicker(): void {
        const tickInterval = 1000 / this.tickRate;
        
        setInterval(() => {
            this.processTick();
        }, tickInterval);
    }
    
    private processTick(): void {
        for (const session of this.sessions.values()) {
            if (!session.isActive) continue;
            
            session.serverTick++;
            
            // 플레이어 입력 처리
            this.processSessionInputs(session);
            
            // 게임 상태 업데이트
            this.updateGameState(session);
            
            // 상태 동기화 (매 틱마다 전송하지 않고 필요시에만)
            if (session.serverTick % 2 === 0) { // 10Hz로 상태 전송
                this.synchronizeSession(session);
            }
        }
    }
    
    private processSessionInputs(session: GameSession): void {
        for (const player of session.players) {
            if (!player.isConnected || player.inputBuffer.length === 0) continue;
            
            // 현재 틱에 해당하는 입력들 처리
            const currentInputs = player.inputBuffer.filter(input => 
                input.serverTick <= session.serverTick
            );
            
            for (const input of currentInputs) {
                this.applyInputToGameState(session.gameState, input);
                
                // 처리된 입력을 버퍼에서 제거
                const index = player.inputBuffer.indexOf(input);
                if (index !== -1) {
                    player.inputBuffer.splice(index, 1);
                }
            }
        }
    }
    
    private applyInputToGameState(gameState: GameState, input: PlayerInput): void {
        switch (input.type) {
            case 'deploy_unit':
                BattleLogic.deployUnit(gameState, input.playerId, input.cardId, input.position);
                break;
                
            case 'cast_spell':
                BattleLogic.castSpell(gameState, input.playerId, input.spellId, input.position);
                break;
                
            case 'activate_ability':
                BattleLogic.activateAbility(gameState, input.playerId, input.abilityId);
                break;
        }
    }
    
    private synchronizeSession(session: GameSession): void {
        const syncMessage: NetworkMessage = {
            type: 'game_state_sync',
            payload: {
                sessionId: session.sessionId,
                serverTick: session.serverTick,
                gameState: this.compressGameState(session.gameState),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
        
        // 모든 플레이어에게 동기화 메시지 전송
        for (const player of session.players) {
            if (player.isConnected) {
                NetworkManager.instance.sendMessage(player.connectionId, syncMessage);
            }
        }
        
        session.lastSyncTime = Date.now();
    }
    
    private compressGameState(gameState: GameState): CompressedGameState {
        // 네트워크 전송을 위한 게임 상태 압축
        return {
            players: gameState.players.map(p => ({
                id: p.id,
                elixir: p.currentElixir,
                towers: p.towers.map(t => ({ id: t.id, health: t.health }))
            })),
            units: gameState.units.map(u => ({
                id: u.id,
                pos: [u.position.x, u.position.z],
                hp: u.health,
                state: u.state
            })),
            tick: gameState.tick
        };
    }
    
    public endSession(sessionId: string, reason: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        session.isActive = false;
        
        // 플레이어 세션 매핑 제거
        for (const player of session.players) {
            this.playerSessions.delete(player.playerId);
        }
        
        // 세션 종료 메시지 전송
        const endMessage: NetworkMessage = {
            type: 'session_ended',
            payload: { reason, finalState: session.gameState },
            timestamp: Date.now()
        };
        
        for (const player of session.players) {
            if (player.isConnected) {
                NetworkManager.instance.sendMessage(player.connectionId, endMessage);
            }
        }
        
        // 세션 정리
        setTimeout(() => {
            this.sessions.delete(sessionId);
        }, 10000); // 10초 후 완전 삭제
        
        console.log(`Session ${sessionId} ended: ${reason}`);
    }
}

export interface PlayerInput {
    type: 'deploy_unit' | 'cast_spell' | 'activate_ability';
    playerId: string;
    cardId?: string;
    spellId?: string;
    abilityId?: string;
    position?: { x: number; y: number };
    serverTick?: number;
    timestamp?: number;
    sequenceNumber?: number;
}

export interface InputConfirmation {
    sequenceNumber: number;
    serverTick: number;
    timestamp: number;
    acknowledged: boolean;
}

export interface CompressedGameState {
    players: Array<{
        id: string;
        elixir: number;
        towers: Array<{ id: string; health: number }>;
    }>;
    units: Array<{
        id: string;
        pos: [number, number];
        hp: number;
        state: string;
    }>;
    tick: number;
}
```

## 2. 실시간 동기화

### 2.1 상태 동기화
```typescript
// src/network/StateSynchronization.ts
export class StateSynchronization {
    private lastSyncStates: Map<string, GameStateSnapshot> = new Map();
    private deltaCompressionEnabled: boolean = true;
    private compressionThreshold: number = 1024; // 1KB 이상일 때 압축
    
    public synchronizeGameState(session: GameSession, forceFullSync: boolean = false): void {
        const currentState = this.createGameStateSnapshot(session.gameState);
        const lastState = this.lastSyncStates.get(session.sessionId);
        
        let syncData: StateSyncData;
        
        if (forceFullSync || !lastState || !this.deltaCompressionEnabled) {
            // 전체 상태 동기화
            syncData = this.createFullSyncData(currentState, session.serverTick);
        } else {
            // 델타 동기화 (변경된 부분만)
            syncData = this.createDeltaSyncData(lastState, currentState, session.serverTick);
        }
        
        // 압축 여부 결정
        const rawData = JSON.stringify(syncData);
        const shouldCompress = rawData.length > this.compressionThreshold;
        
        if (shouldCompress) {
            syncData.compressed = true;
            syncData.data = this.compressData(rawData);
        }
        
        // 모든 플레이어에게 전송
        this.broadcastSyncData(session, syncData);
        
        // 마지막 동기화 상태 저장
        this.lastSyncStates.set(session.sessionId, currentState);
    }
    
    private createGameStateSnapshot(gameState: GameState): GameStateSnapshot {
        return {
            tick: gameState.tick,
            timestamp: Date.now(),
            players: gameState.players.map(p => ({
                id: p.id,
                elixir: p.currentElixir,
                maxElixir: p.maxElixir,
                kingTowerHealth: p.kingTower.health,
                leftTowerHealth: p.leftTower.health,
                rightTowerHealth: p.rightTower.health,
                kingTowerActivated: p.kingTowerActivated
            })),
            units: gameState.units.map(u => ({
                id: u.id,
                ownerId: u.ownerId,
                cardId: u.cardId,
                position: { x: u.position.x, y: u.position.y, z: u.position.z },
                rotation: { x: u.rotation.x, y: u.rotation.y, z: u.rotation.z },
                health: u.health,
                maxHealth: u.maxHealth,
                state: u.state,
                targetId: u.targetId
            })),
            projectiles: gameState.projectiles.map(p => ({
                id: p.id,
                position: p.position,
                velocity: p.velocity,
                damage: p.damage,
                ownerId: p.ownerId
            })),
            effects: gameState.effects.map(e => ({
                id: e.id,
                type: e.type,
                position: e.position,
                duration: e.remainingDuration
            }))
        };
    }
    
    private createDeltaSyncData(
        lastState: GameStateSnapshot,
        currentState: GameStateSnapshot,
        serverTick: number
    ): StateSyncData {
        const delta: StateDelta = {
            tick: serverTick,
            playerDeltas: this.calculatePlayerDeltas(lastState.players, currentState.players),
            unitDeltas: this.calculateUnitDeltas(lastState.units, currentState.units),
            projectileDeltas: this.calculateProjectileDeltas(lastState.projectiles, currentState.projectiles),
            effectDeltas: this.calculateEffectDeltas(lastState.effects, currentState.effects)
        };
        
        return {
            type: 'delta',
            tick: serverTick,
            data: delta,
            compressed: false
        };
    }
    
    private calculateUnitDeltas(
        lastUnits: UnitSnapshot[],
        currentUnits: UnitSnapshot[]
    ): UnitDelta[] {
        const deltas: UnitDelta[] = [];
        const lastUnitsMap = new Map(lastUnits.map(u => [u.id, u]));
        const currentUnitsMap = new Map(currentUnits.map(u => [u.id, u]));
        
        // 새로 생성된 유닛들
        for (const currentUnit of currentUnits) {
            if (!lastUnitsMap.has(currentUnit.id)) {
                deltas.push({
                    id: currentUnit.id,
                    type: 'created',
                    data: currentUnit
                });
            }
        }
        
        // 변경된 유닛들
        for (const currentUnit of currentUnits) {
            const lastUnit = lastUnitsMap.get(currentUnit.id);
            if (lastUnit) {
                const changes = this.calculateUnitChanges(lastUnit, currentUnit);
                if (Object.keys(changes).length > 0) {
                    deltas.push({
                        id: currentUnit.id,
                        type: 'updated',
                        data: changes
                    });
                }
            }
        }
        
        // 제거된 유닛들
        for (const lastUnit of lastUnits) {
            if (!currentUnitsMap.has(lastUnit.id)) {
                deltas.push({
                    id: lastUnit.id,
                    type: 'destroyed',
                    data: null
                });
            }
        }
        
        return deltas;
    }
    
    private calculateUnitChanges(lastUnit: UnitSnapshot, currentUnit: UnitSnapshot): Partial<UnitSnapshot> {
        const changes: Partial<UnitSnapshot> = {};
        
        // 위치 변경 확인 (일정 거리 이상 변경 시에만 동기화)
        const positionThreshold = 0.1;
        const positionChanged = 
            Math.abs(lastUnit.position.x - currentUnit.position.x) > positionThreshold ||
            Math.abs(lastUnit.position.z - currentUnit.position.z) > positionThreshold;
        
        if (positionChanged) {
            changes.position = currentUnit.position;
        }
        
        // 회전 변경 확인
        const rotationThreshold = 5; // 5도
        const rotationChanged = Math.abs(lastUnit.rotation.y - currentUnit.rotation.y) > rotationThreshold;
        
        if (rotationChanged) {
            changes.rotation = currentUnit.rotation;
        }
        
        // 체력 변경 확인
        if (lastUnit.health !== currentUnit.health) {
            changes.health = currentUnit.health;
        }
        
        // 상태 변경 확인
        if (lastUnit.state !== currentUnit.state) {
            changes.state = currentUnit.state;
        }
        
        // 타겟 변경 확인
        if (lastUnit.targetId !== currentUnit.targetId) {
            changes.targetId = currentUnit.targetId;
        }
        
        return changes;
    }
    
    private broadcastSyncData(session: GameSession, syncData: StateSyncData): void {
        const message: NetworkMessage = {
            type: 'state_sync',
            payload: syncData,
            timestamp: Date.now()
        };
        
        for (const player of session.players) {
            if (player.isConnected) {
                NetworkManager.instance.sendMessage(player.connectionId, message);
            }
        }
    }
    
    public processIncomingSyncData(playerId: string, syncData: StateSyncData): void {
        const session = SessionManager.instance.getPlayerSession(playerId);
        if (!session) return;
        
        let data = syncData.data;
        
        // 압축 해제
        if (syncData.compressed) {
            data = this.decompressData(data as string);
        }
        
        if (syncData.type === 'full') {
            this.applyFullSync(session, data as GameStateSnapshot);
        } else {
            this.applyDeltaSync(session, data as StateDelta);
        }
    }
    
    private applyDeltaSync(session: GameSession, delta: StateDelta): void {
        // 플레이어 상태 업데이트
        for (const playerDelta of delta.playerDeltas) {
            const player = session.gameState.players.find(p => p.id === playerDelta.id);
            if (player && playerDelta.data) {
                Object.assign(player, playerDelta.data);
            }
        }
        
        // 유닛 상태 업데이트
        for (const unitDelta of delta.unitDeltas) {
            switch (unitDelta.type) {
                case 'created':
                    this.createUnit(session.gameState, unitDelta.data as UnitSnapshot);
                    break;
                case 'updated':
                    this.updateUnit(session.gameState, unitDelta.id, unitDelta.data as Partial<UnitSnapshot>);
                    break;
                case 'destroyed':
                    this.destroyUnit(session.gameState, unitDelta.id);
                    break;
            }
        }
        
        session.gameState.tick = delta.tick;
    }
}

export interface GameStateSnapshot {
    tick: number;
    timestamp: number;
    players: PlayerSnapshot[];
    units: UnitSnapshot[];
    projectiles: ProjectileSnapshot[];
    effects: EffectSnapshot[];
}

export interface UnitSnapshot {
    id: string;
    ownerId: string;
    cardId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    health: number;
    maxHealth: number;
    state: string;
    targetId?: string;
}

export interface StateSyncData {
    type: 'full' | 'delta';
    tick: number;
    data: GameStateSnapshot | StateDelta;
    compressed: boolean;
}

export interface StateDelta {
    tick: number;
    playerDeltas: PlayerDelta[];
    unitDeltas: UnitDelta[];
    projectileDeltas: ProjectileDelta[];
    effectDeltas: EffectDelta[];
}

export interface UnitDelta {
    id: string;
    type: 'created' | 'updated' | 'destroyed';
    data: UnitSnapshot | Partial<UnitSnapshot> | null;
}
```

### 2.2 명령 전송
```typescript
// src/network/CommandTransmission.ts
export class CommandTransmission {
    private commandQueue: Map<string, QueuedCommand[]> = new Map();
    private reliableCommands: Set<string> = new Set([
        'deploy_unit', 'cast_spell', 'match_result'
    ]);
    private commandTimeout: number = 5000; // 5초
    
    public sendCommand(playerId: string, command: GameCommand): void {
        const session = SessionManager.instance.getPlayerSession(playerId);
        if (!session) return;
        
        // 명령에 시퀀스 번호 및 타임스탬프 추가
        command.sequenceNumber = this.generateSequenceNumber(playerId);
        command.timestamp = Date.now();
        command.playerId = playerId;
        
        // 신뢰성이 필요한 명령인지 확인
        const isReliable = this.reliableCommands.has(command.type);
        
        if (isReliable) {
            this.sendReliableCommand(playerId, command);
        } else {
            this.sendUnreliableCommand(playerId, command);
        }
    }
    
    private sendReliableCommand(playerId: string, command: GameCommand): void {
        const queuedCommand: QueuedCommand = {
            command,
            attempts: 0,
            maxAttempts: 3,
            nextRetryTime: Date.now() + 1000,
            acknowledged: false
        };
        
        // 큐에 추가
        if (!this.commandQueue.has(playerId)) {
            this.commandQueue.set(playerId, []);
        }
        this.commandQueue.get(playerId)!.push(queuedCommand);
        
        // 즉시 전송
        this.transmitCommand(playerId, command);
        
        // 재전송 타이머 설정
        this.scheduleRetransmission(playerId, command.sequenceNumber!);
    }
    
    private sendUnreliableCommand(playerId: string, command: GameCommand): void {
        // 단순 전송 (재전송 없음)
        this.transmitCommand(playerId, command);
    }
    
    private transmitCommand(playerId: string, command: GameCommand): void {
        const message: NetworkMessage = {
            type: 'game_command',
            payload: command,
            timestamp: Date.now()
        };
        
        NetworkManager.instance.sendMessage(playerId, message);
        
        console.log(`Command sent to ${playerId}: ${command.type} (seq: ${command.sequenceNumber})`);
    }
    
    public processCommandAcknowledgment(playerId: string, ack: CommandAcknowledgment): void {
        const queue = this.commandQueue.get(playerId);
        if (!queue) return;
        
        const commandIndex = queue.findIndex(qc => 
            qc.command.sequenceNumber === ack.sequenceNumber
        );
        
        if (commandIndex !== -1) {
            const queuedCommand = queue[commandIndex];
            queuedCommand.acknowledged = true;
            
            // 큐에서 제거
            queue.splice(commandIndex, 1);
            
            console.log(`Command acknowledged: ${queuedCommand.command.type} (seq: ${ack.sequenceNumber})`);
        }
    }
    
    private scheduleRetransmission(playerId: string, sequenceNumber: number): void {
        setTimeout(() => {
            this.attemptRetransmission(playerId, sequenceNumber);
        }, 1000);
    }
    
    private attemptRetransmission(playerId: string, sequenceNumber: number): void {
        const queue = this.commandQueue.get(playerId);
        if (!queue) return;
        
        const queuedCommand = queue.find(qc => 
            qc.command.sequenceNumber === sequenceNumber && !qc.acknowledged
        );
        
        if (!queuedCommand) return;
        
        const now = Date.now();
        
        // 타임아웃 확인
        if (now - queuedCommand.command.timestamp! > this.commandTimeout) {
            console.warn(`Command timeout: ${queuedCommand.command.type} (seq: ${sequenceNumber})`);
            this.removeQueuedCommand(playerId, sequenceNumber);
            return;
        }
        
        // 재전송 시도
        if (queuedCommand.attempts < queuedCommand.maxAttempts && now >= queuedCommand.nextRetryTime) {
            queuedCommand.attempts++;
            queuedCommand.nextRetryTime = now + (1000 * Math.pow(2, queuedCommand.attempts)); // 지수 백오프
            
            this.transmitCommand(playerId, queuedCommand.command);
            console.log(`Command retransmitted: ${queuedCommand.command.type} (attempt ${queuedCommand.attempts})`);
            
            // 다음 재전송 스케줄
            this.scheduleRetransmission(playerId, sequenceNumber);
        } else if (queuedCommand.attempts >= queuedCommand.maxAttempts) {
            console.error(`Command failed after ${queuedCommand.maxAttempts} attempts: ${queuedCommand.command.type}`);
            this.removeQueuedCommand(playerId, sequenceNumber);
        }
    }
    
    private removeQueuedCommand(playerId: string, sequenceNumber: number): void {
        const queue = this.commandQueue.get(playerId);
        if (!queue) return;
        
        const index = queue.findIndex(qc => qc.command.sequenceNumber === sequenceNumber);
        if (index !== -1) {
            queue.splice(index, 1);
        }
    }
    
    public processIncomingCommand(senderId: string, command: GameCommand): void {
        const session = SessionManager.instance.getPlayerSession(senderId);
        if (!session) return;
        
        // 명령 검증
        if (!this.validateCommand(senderId, command)) {
            console.warn(`Invalid command from ${senderId}: ${command.type}`);
            return;
        }
        
        // 신뢰성이 필요한 명령인 경우 응답 전송
        if (this.reliableCommands.has(command.type)) {
            this.sendAcknowledgment(senderId, command.sequenceNumber!);
        }
        
        // 명령 실행
        this.executeCommand(session, command);
    }
    
    private validateCommand(playerId: string, command: GameCommand): boolean {
        const session = SessionManager.instance.getPlayerSession(playerId);
        if (!session) return false;
        
        // 플레이어가 세션에 속해 있는지 확인
        const isParticipant = session.players.some(p => p.playerId === playerId);
        if (!isParticipant) return false;
        
        // 명령 타입별 검증
        switch (command.type) {
            case 'deploy_unit':
                return this.validateDeployCommand(session, command as DeployUnitCommand);
            case 'cast_spell':
                return this.validateSpellCommand(session, command as CastSpellCommand);
            default:
                return true;
        }
    }
    
    private validateDeployCommand(session: GameSession, command: DeployUnitCommand): boolean {
        const player = session.gameState.players.find(p => p.id === command.playerId);
        if (!player) return false;
        
        // 엘릭서 충분한지 확인
        const cardData = DataManager.instance.getCardData(command.cardId);
        if (player.currentElixir < cardData.elixirCost) {
            return false;
        }
        
        // 배치 위치 유효한지 확인
        if (!BattleLogic.isValidDeploymentPosition(player.id, command.position)) {
            return false;
        }
        
        return true;
    }
    
    private sendAcknowledgment(playerId: string, sequenceNumber: number): void {
        const ack: CommandAcknowledgment = {
            sequenceNumber,
            timestamp: Date.now(),
            status: 'acknowledged'
        };
        
        const message: NetworkMessage = {
            type: 'command_ack',
            payload: ack,
            timestamp: Date.now()
        };
        
        NetworkManager.instance.sendMessage(playerId, message);
    }
    
    private executeCommand(session: GameSession, command: GameCommand): void {
        switch (command.type) {
            case 'deploy_unit':
                BattleLogic.deployUnit(
                    session.gameState, 
                    command.playerId, 
                    (command as DeployUnitCommand).cardId, 
                    (command as DeployUnitCommand).position
                );
                break;
                
            case 'cast_spell':
                BattleLogic.castSpell(
                    session.gameState,
                    command.playerId,
                    (command as CastSpellCommand).spellId,
                    (command as CastSpellCommand).position
                );
                break;
        }
    }
}

export interface GameCommand {
    type: string;
    playerId?: string;
    sequenceNumber?: number;
    timestamp?: number;
}

export interface DeployUnitCommand extends GameCommand {
    type: 'deploy_unit';
    cardId: string;
    position: { x: number; y: number };
}

export interface CastSpellCommand extends GameCommand {
    type: 'cast_spell';
    spellId: string;
    position: { x: number; y: number };
}

export interface QueuedCommand {
    command: GameCommand;
    attempts: number;
    maxAttempts: number;
    nextRetryTime: number;
    acknowledged: boolean;
}

export interface CommandAcknowledgment {
    sequenceNumber: number;
    timestamp: number;
    status: 'acknowledged' | 'failed';
}
```

이 실시간 네트워킹 설계는 클래시 로얄과 같은 경쟁적 실시간 PvP 게임의 까다로운 네트워킹 요구사항을 충족하면서도, 현대적인 네트워크 최적화 기법과 안정성 보장 메커니즘을 통합한 포괄적인 시스템입니다.