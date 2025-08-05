# 전투 시스템 구현계획

## 문서 정보
- **문서명**: 전투 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [핵심 컴포넌트 구현](#3-핵심-컴포넌트-구현)
4. [배틀 매니저 구현](#4-배틀-매니저-구현)
5. [실시간 동기화 구현](#5-실시간-동기화-구현)
6. [테스팅 계획](#6-테스팅-계획)
7. [성능 최적화](#7-성능-최적화)
8. [배포 전략](#8-배포-전략)

## 1. 구현 개요

### 1.1 기술 스택
- **게임 엔진**: Cocos Creator 3.8.x
- **언어**: TypeScript
- **네트워킹**: WebSocket + UDP
- **상태 관리**: MobX State Tree
- **물리 엔진**: Built-in Physics (Cannon.js)

### 1.2 아키텍처 원칙
- **클라이언트-서버 권한 분리**: 서버가 최종 판단 권한
- **예측형 클라이언트**: 지연시간 최소화를 위한 클라이언트 예측
- **결정론적 시뮬레이션**: 재현 가능한 게임 로직
- **모듈화 설계**: 독립적이고 재사용 가능한 컴포넌트

## 2. 개발 일정

### 2.1 Phase 1: 핵심 인프라 (4주)
```typescript
// Week 1-2: 기본 프레임워크
const phase1Week1Tasks = [
  'BattleManager 기본 구조 구현',
  'GameState 관리 시스템',
  '네트워크 통신 기반 구조',
  'Entity-Component 시스템'
];

const phase1Week3Tasks = [
  '타워 시스템 구현',
  '엘릭서 시스템 구현',
  '기본 유닛 스폰 로직',
  '충돌 감지 시스템'
];
```

### 2.2 Phase 2: 전투 로직 (3주)
```typescript
const phase2Tasks = [
  '유닛 AI 기본 구현',
  '전투 계산 시스템',
  '스킬 시스템 구현',
  '실시간 동기화 로직'
];
```

### 2.3 Phase 3: 최적화 및 테스트 (3주)
```typescript
const phase3Tasks = [
  '성능 최적화',
  '네트워크 최적화',
  '통합 테스트',
  '밸런스 조정'
];
```

## 3. 핵심 컴포넌트 구현

### 3.1 GameEntity 기본 클래스
```typescript
// [의도] 게임 내 모든 객체의 기본 클래스 구현
// [책임] 생명주기 관리, 컴포넌트 시스템, 네트워크 동기화
export abstract class GameEntity {
  public readonly id: string;
  public readonly type: EntityType;
  protected components: Map<string, Component>;
  protected networkData: NetworkSyncData;
  
  constructor(id: string, type: EntityType) {
    this.id = id;
    this.type = type;
    this.components = new Map();
    this.networkData = {
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      isDirty: false
    };
  }
  
  // 컴포넌트 시스템
  addComponent<T extends Component>(component: T): T {
    this.components.set(component.type, component);
    component.setOwner(this);
    return component;
  }
  
  getComponent<T extends Component>(type: string): T | null {
    return this.components.get(type) as T || null;
  }
  
  // 업데이트 루프
  update(deltaTime: number): void {
    // 컴포넌트 업데이트
    for (const component of this.components.values()) {
      if (component.enabled) {
        component.update(deltaTime);
      }
    }
    
    // 추상 메서드 호출
    this.onUpdate(deltaTime);
    
    // 네트워크 동기화 체크
    if (this.networkData.isDirty) {
      this.syncToNetwork();
      this.networkData.isDirty = false;
    }
  }
  
  protected abstract onUpdate(deltaTime: number): void;
  
  // 네트워크 동기화
  protected syncToNetwork(): void {
    if (BattleManager.getInstance().isServer) {
      NetworkManager.broadcast('entity_update', {
        id: this.id,
        data: this.getNetworkData()
      });
    }
  }
  
  getNetworkData(): any {
    return {
      position: this.networkData.position,
      rotation: this.networkData.rotation,
      scale: this.networkData.scale
    };
  }
  
  applyNetworkData(data: any): void {
    this.networkData = { ...this.networkData, ...data };
    this.onNetworkDataApplied(data);
  }
  
  protected abstract onNetworkDataApplied(data: any): void;
}
```

### 3.2 Tower 클래스 구현
```typescript
// [의도] 게임의 핵심 목표물인 타워 시스템 구현
// [책임] 타워 상태 관리, 데미지 처리, 파괴 로직
export class Tower extends GameEntity {
  private health: HealthComponent;
  private targetingSystem: TargetingComponent;
  private attackSystem: AttackComponent;
  
  constructor(id: string, side: BattleSide, towerType: TowerType) {
    super(id, EntityType.Tower);
    
    // 컴포넌트 초기화
    this.health = this.addComponent(new HealthComponent({
      maxHealth: this.getTowerMaxHealth(towerType),
      currentHealth: this.getTowerMaxHealth(towerType),
      onDeath: () => this.onTowerDestroyed()
    }));
    
    this.targetingSystem = this.addComponent(new TargetingComponent({
      range: this.getTowerRange(towerType),
      targetFilter: (target) => target.side !== side
    }));
    
    this.attackSystem = this.addComponent(new AttackComponent({
      damage: this.getTowerDamage(towerType),
      attackSpeed: this.getTowerAttackSpeed(towerType),
      projectileType: ProjectileType.CannonBall
    }));
  }
  
  protected onUpdate(deltaTime: number): void {
    // 타겟 찾기 및 공격
    const target = this.targetingSystem.findTarget();
    if (target) {
      this.attackSystem.attackTarget(target);
    }
  }
  
  private onTowerDestroyed(): void {
    // 타워 파괴 이펙트
    EffectManager.playEffect('tower_destruction', this.networkData.position);
    
    // 게임 종료 체크
    BattleManager.getInstance().checkGameEnd();
    
    // 네트워크 브로드캐스트
    this.syncToNetwork();
  }
  
  takeDamage(damage: number, attacker?: GameEntity): void {
    this.health.takeDamage(damage);
    
    // 데미지 이펙트
    EffectManager.playEffect('tower_hit', this.networkData.position);
    
    // 네트워크 동기화
    this.networkData.isDirty = true;
  }
  
  getNetworkData(): any {
    return {
      ...super.getNetworkData(),
      health: this.health.currentHealth,
      maxHealth: this.health.maxHealth
    };
  }
  
  protected onNetworkDataApplied(data: any): void {
    if (data.health !== undefined) {
      this.health.setHealth(data.health);
    }
  }
}
```

### 3.3 Unit 클래스 구현
```typescript
// [의도] 전투 유닛의 기본 동작과 AI 구현
// [책임] 이동, 전투, 스킬 사용, 생명주기 관리
export class Unit extends GameEntity {
  private movement: MovementComponent;
  private combat: CombatComponent;
  private ai: AIComponent;
  private health: HealthComponent;
  
  constructor(id: string, unitData: UnitData, side: BattleSide) {
    super(id, EntityType.Unit);
    
    // 컴포넌트 초기화
    this.health = this.addComponent(new HealthComponent({
      maxHealth: unitData.health,
      currentHealth: unitData.health,
      onDeath: () => this.onUnitDeath()
    }));
    
    this.movement = this.addComponent(new MovementComponent({
      speed: unitData.speed,
      pathfinding: true
    }));
    
    this.combat = this.addComponent(new CombatComponent({
      damage: unitData.damage,
      range: unitData.range,
      attackSpeed: unitData.attackSpeed
    }));
    
    this.ai = this.addComponent(new AIComponent({
      behavior: unitData.aiType,
      side: side
    }));
  }
  
  protected onUpdate(deltaTime: number): void {
    // AI 행동 결정
    const aiDecision = this.ai.makeDecision();
    
    switch (aiDecision.action) {
      case AIAction.MoveToTarget:
        this.movement.moveTo(aiDecision.target);
        break;
        
      case AIAction.AttackTarget:
        this.combat.attackTarget(aiDecision.target);
        break;
        
      case AIAction.UseSkill:
        this.useSkill(aiDecision.skillId, aiDecision.target);
        break;
        
      case AIAction.Retreat:
        this.movement.retreat();
        break;
    }
  }
  
  private useSkill(skillId: string, target?: Vec3): void {
    const skill = SkillManager.getSkill(skillId);
    if (skill && skill.canUse(this)) {
      skill.use(this, target);
      
      // 네트워크 동기화
      NetworkManager.broadcast('skill_used', {
        unitId: this.id,
        skillId: skillId,
        target: target
      });
    }
  }
  
  private onUnitDeath(): void {
    // 사망 이펙트
    EffectManager.playEffect('unit_death', this.networkData.position);
    
    // 경험치 지급 (상대방에게)
    BattleManager.getInstance().awardExperience(this.getOpponentSide(), this.getExperienceReward());
    
    // 엔티티 제거
    BattleManager.getInstance().removeEntity(this.id);
  }
  
  getNetworkData(): any {
    return {
      ...super.getNetworkData(),
      health: this.health.currentHealth,
      target: this.ai.currentTarget?.id,
      state: this.ai.currentState
    };
  }
  
  protected onNetworkDataApplied(data: any): void {
    if (data.health !== undefined) {
      this.health.setHealth(data.health);
    }
    if (data.target !== undefined) {
      this.ai.setTarget(BattleManager.getInstance().getEntity(data.target));
    }
    if (data.state !== undefined) {
      this.ai.setState(data.state);
    }
  }
}
```

## 4. 배틀 매니저 구현

### 4.1 BattleManager 핵심 구조
```typescript
// [의도] 전투의 전체적인 흐름과 상태를 관리하는 중앙 매니저
// [책임] 게임 상태 관리, 엔티티 생명주기, 네트워크 동기화 조율
export class BattleManager {
  private static instance: BattleManager;
  private gameState: BattleState;
  private entities: Map<string, GameEntity>;
  private systems: GameSystem[];
  private networkManager: NetworkManager;
  private timeManager: TimeManager;
  
  private constructor() {
    this.entities = new Map();
    this.systems = [];
    this.initializeSystems();
  }
  
  static getInstance(): BattleManager {
    if (!BattleManager.instance) {
      BattleManager.instance = new BattleManager();
    }
    return BattleManager.instance;
  }
  
  private initializeSystems(): void {
    // 게임 시스템 초기화 순서 중요
    this.systems = [
      new TimeSystem(),
      new InputSystem(),
      new AISystem(),
      new MovementSystem(),
      new CombatSystem(),
      new EffectSystem(),
      new NetworkSyncSystem()
    ];
  }
  
  // 전투 시작
  async startBattle(battleConfig: BattleConfig): Promise<void> {
    // 게임 상태 초기화
    this.gameState = new BattleState(battleConfig);
    
    // 맵 로드
    await this.loadBattleMap(battleConfig.mapId);
    
    // 타워 배치
    this.spawnTowers(battleConfig);
    
    // 플레이어 준비 완료 대기
    await this.waitForPlayersReady();
    
    // 전투 시작
    this.gameState.phase = BattlePhase.Active;
    this.startGameLoop();
    
    // 네트워크 브로드캐스트
    this.networkManager.broadcast('battle_started', {
      timestamp: Date.now(),
      gameState: this.gameState.getNetworkData()
    });
  }
  
  // 게임 루프
  private startGameLoop(): void {
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;
    
    const gameLoop = () => {
      const deltaTime = this.timeManager.getDeltaTime();
      
      if (this.gameState.phase === BattlePhase.Active) {
        this.updateGame(deltaTime);
      }
      
      // 다음 프레임 스케줄링
      if (this.gameState.phase !== BattlePhase.Ended) {
        setTimeout(gameLoop, frameTime);
      }
    };
    
    gameLoop();
  }
  
  private updateGame(deltaTime: number): void {
    // 시스템 업데이트
    for (const system of this.systems) {
      system.update(deltaTime);
    }
    
    // 엔티티 업데이트
    for (const entity of this.entities.values()) {
      entity.update(deltaTime);
    }
    
    // 게임 상태 체크
    this.checkGameEndConditions();
    
    // 네트워크 동기화
    this.syncNetworkState();
  }
  
  // 카드 플레이 처리
  playCard(playerId: string, cardId: string, position: Vec3): boolean {
    const player = this.gameState.getPlayer(playerId);
    const card = CardDatabase.getCard(cardId);
    
    // 유효성 검증
    if (!this.validateCardPlay(player, card, position)) {
      return false;
    }
    
    // 엘릭서 소모
    player.spendElixir(card.elixirCost);
    
    // 유닛/스펠 생성
    if (card.type === CardType.Unit) {
      this.spawnUnit(card, position, player.side);
    } else if (card.type === CardType.Spell) {
      this.castSpell(card, position, player.side);
    }
    
    // 네트워크 브로드캐스트
    this.networkManager.broadcast('card_played', {
      playerId,
      cardId,
      position,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  private validateCardPlay(player: Player, card: Card, position: Vec3): boolean {
    // 엘릭서 충분한지 확인
    if (player.currentElixir < card.elixirCost) {
      return false;
    }
    
    // 플레이 가능 영역 확인
    if (!this.isValidPlayArea(position, player.side)) {
      return false;
    }
    
    // 카드별 특수 제한사항 확인
    return card.validatePlacement(position, this.gameState);
  }
  
  private spawnUnit(card: Card, position: Vec3, side: BattleSide): void {
    const unitData = card.getUnitData();
    const unit = new Unit(
      this.generateEntityId(),
      unitData,
      side
    );
    
    // 위치 설정
    unit.setPosition(position);
    
    // 엔티티 등록
    this.addEntity(unit);
    
    // 스폰 이펙트
    EffectManager.playEffect('unit_spawn', position);
  }
  
  private checkGameEndConditions(): void {
    const playerTowers = this.getTowersByType(TowerType.King, BattleSide.Player);
    const opponentTowers = this.getTowersByType(TowerType.King, BattleSide.Opponent);
    
    // 킹 타워 파괴 체크
    if (playerTowers.every(tower => tower.isDestroyed())) {
      this.endBattle(BattleSide.Opponent);
    } else if (opponentTowers.every(tower => tower.isDestroyed())) {
      this.endBattle(BattleSide.Player);
    }
    
    // 시간 종료 체크
    if (this.gameState.remainingTime <= 0) {
      this.endBattleByTime();
    }
  }
  
  private endBattle(winner: BattleSide): void {
    this.gameState.phase = BattlePhase.Ended;
    this.gameState.winner = winner;
    
    // 결과 계산
    const battleResult = this.calculateBattleResult();
    
    // 네트워크 브로드캐스트
    this.networkManager.broadcast('battle_ended', {
      winner,
      result: battleResult,
      timestamp: Date.now()
    });
    
    // 정리 작업
    this.cleanup();
  }
}
```

## 5. 실시간 동기화 구현

### 5.1 네트워크 동기화 시스템
```typescript
// [의도] 클라이언트 간 게임 상태의 실시간 동기화
// [책임] 상태 델타 계산, 압축 전송, 지연 보상, 충돌 해결
export class NetworkSyncSystem extends GameSystem {
  private lastSyncTimestamp: number = 0;
  private syncInterval: number = 50; // 20fps sync rate
  private deltaCompressionEnabled: boolean = true;
  
  update(deltaTime: number): void {
    if (BattleManager.getInstance().isServer) {
      this.serverUpdate(deltaTime);
    } else {
      this.clientUpdate(deltaTime);
    }
  }
  
  private serverUpdate(deltaTime: number): void {
    const now = Date.now();
    
    if (now - this.lastSyncTimestamp >= this.syncInterval) {
      this.broadcastGameState();
      this.lastSyncTimestamp = now;
    }
  }
  
  private broadcastGameState(): void {
    const gameState = BattleManager.getInstance().getGameState();
    const entities = BattleManager.getInstance().getAllEntities();
    
    if (this.deltaCompressionEnabled) {
      const delta = this.calculateStateDelta(gameState, entities);
      if (delta.hasChanges) {
        NetworkManager.broadcast('state_delta', {
          delta: delta.data,
          timestamp: Date.now(),
          sequence: this.getNextSequence()
        });
      }
    } else {
      NetworkManager.broadcast('full_state', {
        gameState: gameState.getNetworkData(),
        entities: entities.map(e => e.getNetworkData()),
        timestamp: Date.now()
      });
    }
  }
  
  private calculateStateDelta(gameState: BattleState, entities: GameEntity[]): StateDelta {
    const previousState = this.previousState;
    const delta: StateDelta = {
      hasChanges: false,
      data: {}
    };
    
    // 게임 상태 델타
    const gameStateDelta = this.calculateGameStateDelta(gameState, previousState?.gameState);
    if (gameStateDelta) {
      delta.data.gameState = gameStateDelta;
      delta.hasChanges = true;
    }
    
    // 엔티티 델타
    const entitiesDelta = this.calculateEntitiesDelta(entities, previousState?.entities);
    if (entitiesDelta.length > 0) {
      delta.data.entities = entitiesDelta;
      delta.hasChanges = true;
    }
    
    // 현재 상태 저장
    this.previousState = {
      gameState: gameState.clone(),
      entities: entities.map(e => e.clone())
    };
    
    return delta;
  }
  
  private clientUpdate(deltaTime: number): void {
    // 서버 상태와 클라이언트 예측 상태 조정
    this.reconcileServerState();
    
    // 클라이언트 예측 수행
    this.performClientPrediction(deltaTime);
  }
  
  private reconcileServerState(): void {
    const latestServerState = NetworkManager.getLatestServerState();
    if (!latestServerState) return;
    
    const clientState = BattleManager.getInstance().getGameState();
    const timeDiff = Date.now() - latestServerState.timestamp;
    
    // 서버 상태를 현재 시간으로 외삽
    const extrapolatedState = this.extrapolateState(latestServerState, timeDiff);
    
    // 클라이언트 상태와 비교하여 차이가 큰 경우 보정
    const stateDifference = this.calculateStateDifference(clientState, extrapolatedState);
    
    if (stateDifference > this.reconciliationThreshold) {
      this.applyServerStateCorrection(extrapolatedState);
    }
  }
  
  private performClientPrediction(deltaTime: number): void {
    // 로컬 입력에 대한 즉시 반응
    const pendingInputs = InputManager.getPendingInputs();
    
    for (const input of pendingInputs) {
      this.applyInputPrediction(input);
      
      // 서버에 입력 전송
      NetworkManager.send('input_command', {
        input: input,
        timestamp: Date.now(),
        sequence: input.sequence
      });
    }
  }
}
```

### 5.2 지연 보상 시스템
```typescript
// [의도] 네트워크 지연을 보상하여 공정한 게임플레이 보장
// [책임] RTT 측정, 지연 예측, 시간 동기화, 롤백 처리
export class LatencyCompensationSystem {
  private rttHistory: number[] = [];
  private averageRTT: number = 0;
  private jitter: number = 0;
  private timeOffset: number = 0;
  
  constructor() {
    this.startRTTMeasurement();
  }
  
  private startRTTMeasurement(): void {
    setInterval(() => {
      this.measureRTT();
    }, 1000); // 1초마다 RTT 측정
  }
  
  private async measureRTT(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await NetworkManager.ping();
      const rtt = Date.now() - startTime;
      
      this.updateRTTStatistics(rtt);
    } catch (error) {
      console.warn('RTT measurement failed:', error);
    }
  }
  
  private updateRTTStatistics(rtt: number): void {
    this.rttHistory.push(rtt);
    
    // 최근 10개 샘플만 유지
    if (this.rttHistory.length > 10) {
      this.rttHistory.shift();
    }
    
    // 평균 RTT 계산
    this.averageRTT = this.rttHistory.reduce((sum, val) => sum + val, 0) / this.rttHistory.length;
    
    // 지터 계산 (표준편차)
    const variance = this.rttHistory.reduce((sum, val) => sum + Math.pow(val - this.averageRTT, 2), 0) / this.rttHistory.length;
    this.jitter = Math.sqrt(variance);
  }
  
  // 서버 시간 동기화
  synchronizeServerTime(serverTimestamp: number, clientReceiveTime: number): void {
    const estimatedServerTime = serverTimestamp + (this.averageRTT / 2);
    this.timeOffset = estimatedServerTime - clientReceiveTime;
  }
  
  // 현재 서버 시간 추정
  getServerTime(): number {
    return Date.now() + this.timeOffset;
  }
  
  // 지연 보상된 히트 판정
  compensateHitDetection(hitTime: number, targetPosition: Vec3, targetVelocity: Vec3): Vec3 {
    const compensationTime = this.averageRTT / 2;
    
    // 타겟의 과거 위치 계산
    const compensatedPosition = {
      x: targetPosition.x - (targetVelocity.x * compensationTime / 1000),
      y: targetPosition.y - (targetVelocity.y * compensationTime / 1000),
      z: targetPosition.z
    };
    
    return compensatedPosition;
  }
  
  // 입력 지연 보상
  compensateInput(input: InputCommand): InputCommand {
    const compensatedInput = { ...input };
    
    // 입력 시간을 서버 시간으로 조정
    compensatedInput.timestamp = this.getServerTime();
    
    // 위치 기반 입력의 경우 지연 보상
    if (input.type === 'card_play' && input.position) {
      // 예측된 최적 위치로 조정
      compensatedInput.position = this.predictOptimalPosition(input.position, input.timestamp);
    }
    
    return compensatedInput;
  }
  
  private predictOptimalPosition(originalPosition: Vec3, inputTime: number): Vec3 {
    const now = this.getServerTime();
    const timeDiff = now - inputTime;
    
    // 게임 상황에 따른 위치 예측 로직
    // (예: 유닛 이동 패턴 분석, 최적 배치 위치 계산 등)
    
    return originalPosition; // 기본적으로는 원래 위치 반환
  }
}
```

## 6. 테스팅 계획

### 6.1 단위 테스트
```typescript
// [의도] 각 컴포넌트의 개별 기능 검증
// [책임] 로직 정확성, 경계값 테스트, 예외 상황 처리
describe('BattleSystem Unit Tests', () => {
  describe('Tower System', () => {
    let tower: Tower;
    
    beforeEach(() => {
      tower = new Tower('test-tower', BattleSide.Player, TowerType.Archer);
    });
    
    it('should initialize with correct health', () => {
      expect(tower.getHealth()).toBe(1000);
      expect(tower.getMaxHealth()).toBe(1000);
    });
    
    it('should take damage correctly', () => {
      tower.takeDamage(100);
      expect(tower.getHealth()).toBe(900);
    });
    
    it('should trigger destruction when health reaches 0', () => {
      const destroyCallback = jest.fn();
      tower.onDestroyed = destroyCallback;
      
      tower.takeDamage(1000);
      expect(tower.isDestroyed()).toBe(true);
      expect(destroyCallback).toHaveBeenCalled();
    });
    
    it('should not take damage beyond 0', () => {
      tower.takeDamage(1500);
      expect(tower.getHealth()).toBe(0);
    });
  });
  
  describe('Unit AI System', () => {
    let unit: Unit;
    let mockBattleManager: jest.Mocked<BattleManager>;
    
    beforeEach(() => {
      mockBattleManager = createMockBattleManager();
      unit = new Unit('test-unit', mockUnitData, BattleSide.Player);
    });
    
    it('should find nearest enemy target', () => {
      const enemies = [
        createMockUnit({ x: 10, y: 0 }),
        createMockUnit({ x: 5, y: 0 }),
        createMockUnit({ x: 15, y: 0 })
      ];
      
      mockBattleManager.getEnemiesInRange.mockReturnValue(enemies);
      
      const target = unit.findNearestTarget();
      expect(target.position.x).toBe(5);
    });
    
    it('should prioritize building targets over units', () => {
      const enemies = [
        createMockUnit({ x: 5, y: 0 }),
        createMockTower({ x: 10, y: 0 })
      ];
      
      mockBattleManager.getEnemiesInRange.mockReturnValue(enemies);
      
      const target = unit.findOptimalTarget();
      expect(target.type).toBe(EntityType.Tower);
    });
  });
});
```

### 6.2 통합 테스트
```typescript
// [의도] 시스템 간 상호작용 및 전체 게임 플로우 검증
// [책임] 전투 시나리오 테스트, 네트워크 동기화 검증
describe('Battle Integration Tests', () => {
  let battleManager: BattleManager;
  let mockNetworkManager: jest.Mocked<NetworkManager>;
  
  beforeEach(async () => {
    battleManager = BattleManager.getInstance();
    mockNetworkManager = createMockNetworkManager();
    await battleManager.startBattle(createTestBattleConfig());
  });
  
  describe('Card Play Flow', () => {
    it('should complete full card play sequence', async () => {
      const playerId = 'player1';
      const cardId = 'archer';
      const position = { x: 5, y: 0, z: 0 };
      
      // 카드 플레이
      const result = battleManager.playCard(playerId, cardId, position);
      expect(result).toBe(true);
      
      // 유닛 스폰 확인
      await waitForNextFrame();
      const spawnedUnits = battleManager.getUnitsAt(position, 1.0);
      expect(spawnedUnits.length).toBe(1);
      expect(spawnedUnits[0].type).toBe('archer');
      
      // 네트워크 브로드캐스트 확인
      expect(mockNetworkManager.broadcast).toHaveBeenCalledWith('card_played', {
        playerId,
        cardId,
        position,
        timestamp: expect.any(Number)
      });
    });
    
    it('should handle invalid card plays', () => {
      const playerId = 'player1';
      const cardId = 'expensive_card';
      const position = { x: 5, y: 0, z: 0 };
      
      // 엘릭서 부족 상황
      battleManager.getPlayer(playerId).setElixir(1);
      
      const result = battleManager.playCard(playerId, cardId, position);
      expect(result).toBe(false);
      
      // 유닛이 스폰되지 않았는지 확인
      const spawnedUnits = battleManager.getUnitsAt(position, 1.0);
      expect(spawnedUnits.length).toBe(0);
    });
  });
  
  describe('Battle End Conditions', () => {
    it('should end battle when king tower is destroyed', async () => {
      const kingTower = battleManager.getKingTower(BattleSide.Opponent);
      
      // 킹 타워 파괴
      kingTower.takeDamage(kingTower.getMaxHealth());
      
      await waitForNextFrame();
      
      expect(battleManager.isBattleEnded()).toBe(true);
      expect(battleManager.getWinner()).toBe(BattleSide.Player);
    });
    
    it('should end battle when time runs out', async () => {
      // 시간 설정
      battleManager.setRemainingTime(0);
      
      await waitForNextFrame();
      
      expect(battleManager.isBattleEnded()).toBe(true);
      expect(battleManager.getWinner()).toBeDefined();
    });
  });
});
```

### 6.3 성능 테스트
```typescript
// [의도] 시스템 성능 및 확장성 검증
// [책임] 프레임레이트 측정, 메모리 사용량 모니터링
describe('Performance Tests', () => {
  describe('Frame Rate Performance', () => {
    it('should maintain 60fps with 50 units', async () => {
      const battleManager = BattleManager.getInstance();
      const performanceMonitor = new PerformanceMonitor();
      
      // 50개 유닛 스폰
      for (let i = 0; i < 50; i++) {
        battleManager.spawnUnit('archer', getRandomPosition(), BattleSide.Player);
      }
      
      // 10초간 성능 측정
      performanceMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 10000));
      const results = performanceMonitor.stop();
      
      expect(results.averageFPS).toBeGreaterThan(55);
      expect(results.frameDrops).toBeLessThan(5);
    });
    
    it('should handle memory efficiently during long battles', async () => {
      const initialMemory = getMemoryUsage();
      
      // 30분간 가상 배틀 시뮬레이션
      await simulateLongBattle(30 * 60 * 1000);
      
      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // 메모리 증가량이 100MB 미만이어야 함
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
  
  describe('Network Performance', () => {
    it('should sync state within latency budget', async () => {
      const networkLatency = 100; // 100ms
      const mockNetwork = createMockNetworkWithLatency(networkLatency);
      
      // 상태 변경
      const startTime = Date.now();
      battleManager.playCard('player1', 'archer', { x: 5, y: 0, z: 0 });
      
      // 동기화 완료 대기
      await waitForNetworkSync();
      const syncTime = Date.now() - startTime;
      
      // 동기화 시간이 네트워크 지연의 2배 + 처리시간 이내여야 함
      expect(syncTime).toBeLessThan(networkLatency * 2 + 50);
    });
  });
});
```

## 7. 성능 최적화

### 7.1 렌더링 최적화
```typescript
// [의도] 게임의 시각적 성능 최적화
// [책임] 오브젝트 풀링, 컬링, LOD 시스템
export class RenderingOptimizer {
  private objectPools: Map<string, ObjectPool>;
  private cullingSystem: FrustumCullingSystem;
  private lodSystem: LODSystem;
  
  constructor() {
    this.initializeObjectPools();
    this.setupCullingSystem();
    this.configureLODSystem();
  }
  
  private initializeObjectPools(): void {
    this.objectPools = new Map();
    
    // 유닛 오브젝트 풀
    this.objectPools.set('units', new ObjectPool({
      factory: () => new UnitRenderer(),
      initialSize: 50,
      maxSize: 200
    }));
    
    // 이펙트 오브젝트 풀
    this.objectPools.set('effects', new ObjectPool({
      factory: () => new EffectRenderer(),
      initialSize: 30,
      maxSize: 100
    }));
    
    // 프로젝타일 오브젝트 풀
    this.objectPools.set('projectiles', new ObjectPool({
      factory: () => new ProjectileRenderer(),
      initialSize: 20,
      maxSize: 80
    }));
  }
  
  private setupCullingSystem(): void {
    this.cullingSystem = new FrustumCullingSystem({
      camera: BattleCamera.getInstance(),
      margin: 2.0 // 여유 공간
    });
    
    // 컬링 결과 캐싱
    this.cullingSystem.enableResultCaching(true);
  }
  
  private configureLODSystem(): void {
    this.lodSystem = new LODSystem();
    
    // LOD 레벨 정의
    this.lodSystem.addLODLevel({
      distance: 0,
      meshDetail: 'high',
      animationQuality: 'high',
      effectDetail: 'high'
    });
    
    this.lodSystem.addLODLevel({
      distance: 10,
      meshDetail: 'medium',
      animationQuality: 'medium',
      effectDetail: 'medium'
    });
    
    this.lodSystem.addLODLevel({
      distance: 20,
      meshDetail: 'low',
      animationQuality: 'low',
      effectDetail: 'low'
    });
  }
  
  optimizeFrame(): void {
    // 컬링 수행
    const visibleEntities = this.cullingSystem.cullEntities(
      BattleManager.getInstance().getAllEntities()
    );
    
    // LOD 적용
    for (const entity of visibleEntities) {
      const distance = this.calculateCameraDistance(entity);
      const lodLevel = this.lodSystem.getLODLevel(distance);
      entity.setLODLevel(lodLevel);
    }
    
    // 배치 렌더링
    this.performBatchRendering(visibleEntities);
  }
  
  private performBatchRendering(entities: GameEntity[]): void {
    // 재질별로 그룹화
    const materialGroups = this.groupByMaterial(entities);
    
    for (const [material, groupEntities] of materialGroups) {
      // 동일 재질 객체들을 한 번에 렌더링
      this.renderBatch(material, groupEntities);
    }
  }
}
```

### 7.2 메모리 최적화
```typescript
// [의도] 메모리 사용량 최적화 및 가비지 컬렉션 최소화
// [책임] 메모리 풀링, 참조 관리, 자동 정리
export class MemoryOptimizer {
  private memoryPools: Map<string, MemoryPool>;
  private referenceTracker: ReferenceTracker;
  private gcScheduler: GCScheduler;
  
  constructor() {
    this.initializeMemoryPools();
    this.setupReferenceTracking();
    this.configureGCScheduling();
  }
  
  private initializeMemoryPools(): void {
    this.memoryPools = new Map();
    
    // 벡터 객체 풀
    this.memoryPools.set('Vector3', new MemoryPool({
      factory: () => new Vec3(),
      reset: (obj) => obj.set(0, 0, 0),
      initialSize: 100,
      maxSize: 500
    }));
    
    // 이벤트 객체 풀
    this.memoryPools.set('GameEvent', new MemoryPool({
      factory: () => new GameEvent(),
      reset: (obj) => obj.reset(),
      initialSize: 50,
      maxSize: 200
    }));
  }
  
  // 메모리 풀에서 객체 할당
  allocate<T>(poolName: string): T {
    const pool = this.memoryPools.get(poolName);
    if (pool) {
      return pool.acquire() as T;
    }
    
    throw new Error(`Memory pool not found: ${poolName}`);
  }
  
  // 객체를 메모리 풀에 반환
  deallocate(poolName: string, obj: any): void {
    const pool = this.memoryPools.get(poolName);
    if (pool) {
      pool.release(obj);
    }
  }
  
  private setupReferenceTracking(): void {
    this.referenceTracker = new ReferenceTracker();
    
    // 순환 참조 자동 감지
    this.referenceTracker.enableCircularReferenceDetection();
    
    // 약한 참조 사용 권장
    this.referenceTracker.enableWeakReferenceRecommendation();
  }
  
  // 메모리 정리 수행
  performCleanup(): void {
    // 미사용 객체 정리
    this.cleanupUnusedObjects();
    
    // 이벤트 리스너 정리
    this.cleanupEventListeners();
    
    // 텍스처 캐시 정리
    this.cleanupTextureCache();
  }
  
  private cleanupUnusedObjects(): void {
    const entities = BattleManager.getInstance().getAllEntities();
    
    for (const entity of entities) {
      if (entity.isMarkedForDestruction()) {
        // 참조 정리
        this.referenceTracker.clearReferences(entity);
        
        // 컴포넌트 정리
        entity.destroyAllComponents();
        
        // 메모리 풀 반환
        if (entity.poolName) {
          this.deallocate(entity.poolName, entity);
        }
      }
    }
  }
}
```

## 8. 배포 전략

### 8.1 단계별 배포 계획
- **Alpha (내부 테스트)**: 핵심 기능 완성도 검증
- **Beta (제한된 외부 테스트)**: 밸런스 및 버그 수정
- **Soft Launch (일부 지역)**: 시장 반응 및 서버 안정성 검증
- **Global Launch**: 전 세계 출시

### 8.2 모니터링 및 롤백 계획
```typescript
// [의도] 배포 후 시스템 안정성 모니터링 및 문제 발생 시 롤백
// [책임] 메트릭 수집, 이상 감지, 자동 롤백
export class DeploymentMonitor {
  private healthChecks: HealthCheck[];
  private alertThresholds: AlertThreshold[];
  private rollbackTriggers: RollbackTrigger[];
  
  initializeMonitoring(): void {
    this.setupHealthChecks();
    this.configureAlertThresholds();
    this.setupRollbackTriggers();
  }
  
  private setupHealthChecks(): void {
    this.healthChecks = [
      {
        name: 'battle_system_health',
        check: () => this.checkBattleSystemHealth(),
        interval: 30000, // 30초마다
        timeout: 5000
      },
      {
        name: 'network_performance',
        check: () => this.checkNetworkPerformance(),
        interval: 60000, // 1분마다
        timeout: 10000
      }
    ];
  }
  
  private async checkBattleSystemHealth(): Promise<HealthStatus> {
    const activeBattles = BattleManager.getActiveBattleCount();
    const averageLatency = NetworkManager.getAverageLatency();
    const errorRate = ErrorTracker.getErrorRate();
    
    return {
      healthy: activeBattles > 0 && averageLatency < 100 && errorRate < 0.01,
      metrics: {
        activeBattles,
        averageLatency,
        errorRate
      }
    };
  }
  
  private setupRollbackTriggers(): void {
    this.rollbackTriggers = [
      {
        condition: 'error_rate > 5%',
        action: 'immediate_rollback',
        severity: 'critical'
      },
      {
        condition: 'user_satisfaction < 60%',
        action: 'scheduled_rollback',
        severity: 'high'
      }
    ];
  }
}
```

이 구현계획은 전투 시스템의 체계적인 개발과 안정적인 배포를 위한 포괄적인 가이드를 제공합니다. 각 단계별 세부 구현 사항과 품질 보증 방안을 통해 성공적인 게임 개발을 지원합니다.