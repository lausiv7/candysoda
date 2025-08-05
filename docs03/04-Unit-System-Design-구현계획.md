# 유닛 시스템 구현계획

## 문서 정보
- **문서명**: 유닛 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [핵심 컴포넌트 구현](#3-핵심-컴포넌트-구현)
4. [AI 시스템 구현](#4-ai-시스템-구현)
5. [애니메이션 시스템](#5-애니메이션-시스템)
6. [성능 최적화](#6-성능-최적화)
7. [테스팅 전략](#7-테스팅-전략)
8. [배포 계획](#8-배포-계획)

## 1. 구현 개요

### 1.1 기술 스택
- **게임 엔진**: Cocos Creator 3.8.x
- **언어**: TypeScript
- **AI 라이브러리**: 커스텀 행동 트리 + 상태 머신
- **애니메이션**: Spine + Cocos Animation
- **물리**: Bullet Physics (3D) + Box2D (2D 충돌)

### 1.2 아키텍처 설계
```typescript
// [의도] 유닛 시스템의 전체 아키텍처 정의
// [책임] 컴포넌트 기반 설계, 확장성, 재사용성 보장
interface UnitSystemArchitecture {
  core: {
    unitManager: UnitManager;
    unitFactory: UnitFactory;
    componentSystem: ComponentSystem;
  };
  
  ai: {
    behaviorTreeManager: BehaviorTreeManager;
    stateMachine: StateMachineSystem;
    pathfinding: PathfindingSystem;
  };
  
  rendering: {
    animationController: AnimationController;
    effectManager: EffectManager;
    lodSystem: LODSystem;
  };
  
  networking: {
    unitSync: UnitSynchronizer;
    predictionSystem: ClientPredictionSystem;
  };
}
```

## 2. 개발 일정

### 2.1 Phase 1: 기반 시스템 (3주)
```typescript
const phase1Schedule = {
  week1: [
    'Unit 기본 클래스 구조 설계',
    'Component 시스템 구현',
    'UnitManager 기본 기능',
    '기본 스탯 시스템'
  ],
  week2: [
    'Movement Component 구현',
    'Health Component 구현',
    'Combat Component 구현',
    '기본 AI 상태머신'
  ],
  week3: [
    '유닛 팩토리 시스템',
    '기본 애니메이션 연동',
    '네트워크 동기화 기반 구조',
    '유닛 테스트 작성'
  ]
};
```

### 2.2 Phase 2: AI 시스템 (4주)
```typescript
const phase2Schedule = {
  week1: ['행동 트리 프레임워크', '기본 행동 노드들'],
  week2: ['패스파인딩 시스템', '타겟팅 시스템'],
  week3: ['고급 AI 행동', '그룹 AI 로직'],
  week4: ['AI 성능 최적화', 'AI 테스트 및 튜닝']
};
```

### 2.3 Phase 3: 고급 기능 (3주)
```typescript
const phase3Schedule = {
  week1: ['스킬 시스템', '버프/디버프 시스템'],
  week2: ['특수 능력 구현', '유닛 진화 시스템'],
  week3: ['최종 통합 테스트', '성능 최적화', '밸런스 튜닝']
};
```

## 3. 핵심 컴포넌트 구현

### 3.1 Unit 기본 클래스
```typescript
// [의도] 모든 유닛의 기본 클래스 구현
// [책임] 생명주기 관리, 컴포넌트 시스템, 네트워크 동기화
export class Unit extends Node {
  private readonly unitId: string;
  private readonly unitData: UnitData;
  private components: Map<string, UnitComponent>;
  private currentState: UnitState;
  private side: BattleSide;
  
  // 핵심 컴포넌트들
  private health: HealthComponent;
  private movement: MovementComponent;
  private combat: CombatComponent;
  private ai: AIComponent;
  private animation: AnimationComponent;
  
  constructor(unitData: UnitData, side: BattleSide) {
    super();
    this.unitId = UUIDGenerator.generate();
    this.unitData = unitData;
    this.side = side;
    this.components = new Map();
    this.currentState = UnitState.Spawning;
    
    this.initializeComponents();
    this.setupEventHandlers();
  }
  
  private initializeComponents(): void {
    // Health Component
    this.health = this.addComponent(new HealthComponent({
      maxHealth: this.unitData.baseHealth,
      currentHealth: this.unitData.baseHealth,
      armor: this.unitData.baseArmor,
      onDeath: () => this.handleDeath(),
      onDamage: (damage, source) => this.handleDamage(damage, source)
    }));
    
    // Movement Component
    this.movement = this.addComponent(new MovementComponent({
      speed: this.unitData.baseSpeed,
      acceleration: this.unitData.acceleration,
      rotationSpeed: this.unitData.rotationSpeed,
      pathfinding: true,
      avoidance: true
    }));
    
    // Combat Component
    this.combat = this.addComponent(new CombatComponent({
      damage: this.unitData.baseDamage,
      attackSpeed: this.unitData.attackSpeed,
      range: this.unitData.attackRange,
      attackType: this.unitData.attackType,
      projectileType: this.unitData.projectileType
    }));
    
    // AI Component
    this.ai = this.addComponent(new AIComponent({
      behaviorTree: this.createBehaviorTree(),
      sight: this.unitData.sightRange,
      aggroRange: this.unitData.aggroRange,
      side: this.side
    }));
    
    // Animation Component
    this.animation = this.addComponent(new AnimationComponent({
      skeletonData: this.unitData.animationData,
      defaultAnimation: 'idle',
      animationScale: this.unitData.animationScale
    }));
  }
  
  private createBehaviorTree(): BehaviorTree {
    const root = new SelectorNode('root');
    
    // 사망 체크
    root.addChild(new SequenceNode('death_check')
      .addChild(new ConditionNode('is_dead', () => this.health.isDead()))
      .addChild(new ActionNode('play_death', () => this.playDeathAnimation()))
    );
    
    // 전투 행동
    root.addChild(new SequenceNode('combat')
      .addChild(new ConditionNode('has_target', () => this.ai.hasTarget()))
      .addChild(new SelectorNode('combat_actions')
        .addChild(new SequenceNode('attack')
          .addChild(new ConditionNode('in_attack_range', () => this.ai.isTargetInRange()))
          .addChild(new ActionNode('attack_target', () => this.combat.attackTarget(this.ai.getTarget())))
        )
        .addChild(new ActionNode('move_to_target', () => this.movement.moveToTarget(this.ai.getTarget())))
      )
    );
    
    // 이동 행동
    root.addChild(new ActionNode('move_forward', () => this.movement.moveForward()));
    
    return new BehaviorTree(root);
  }
  
  // 컴포넌트 관리
  addComponent<T extends UnitComponent>(component: T): T {
    this.components.set(component.getType(), component);
    component.setOwner(this);
    component.initialize();
    return component;
  }
  
  getComponent<T extends UnitComponent>(type: string): T | null {
    return this.components.get(type) as T || null;
  }
  
  // 업데이트 루프
  update(deltaTime: number): void {
    if (this.currentState === UnitState.Dead) {
      return;
    }
    
    // 컴포넌트 업데이트
    for (const component of this.components.values()) {
      if (component.isEnabled()) {
        component.update(deltaTime);
      }
    }
    
    // 상태 업데이트
    this.updateState(deltaTime);
    
    // 네트워크 동기화
    if (this.needsNetworkSync()) {
      this.syncToNetwork();
    }
  }
  
  private updateState(deltaTime: number): void {
    switch (this.currentState) {
      case UnitState.Spawning:
        this.handleSpawningState(deltaTime);
        break;
      case UnitState.Idle:
        this.handleIdleState(deltaTime);
        break;
      case UnitState.Moving:
        this.handleMovingState(deltaTime);
        break;
      case UnitState.Attacking:
        this.handleAttackingState(deltaTime);
        break;
      case UnitState.Dying:
        this.handleDyingState(deltaTime);
        break;
    }
  }
  
  // 네트워크 동기화
  getNetworkData(): UnitNetworkData {
    return {
      id: this.unitId,
      position: this.node.position,
      rotation: this.node.eulerAngles.y,
      state: this.currentState,
      health: this.health.getCurrentHealth(),
      target: this.ai.getTarget()?.getUnitId(),
      animation: this.animation.getCurrentAnimation()
    };
  }
  
  applyNetworkData(data: UnitNetworkData): void {
    // 위치 보간
    this.movement.setTargetPosition(data.position);
    this.movement.setTargetRotation(data.rotation);
    
    // 상태 동기화
    if (data.state !== this.currentState) {
      this.setState(data.state);
    }
    
    // 체력 동기화
    if (Math.abs(data.health - this.health.getCurrentHealth()) > 1) {
      this.health.setHealth(data.health);
    }
    
    // 애니메이션 동기화
    if (data.animation !== this.animation.getCurrentAnimation()) {
      this.animation.playAnimation(data.animation);
    }
  }
}
```

### 3.2 Component 시스템
```typescript
// [의도] 유닛의 기능을 모듈화하여 재사용성과 확장성 제공
// [책임] 컴포넌트별 독립적 기능, 상호작용 인터페이스
export abstract class UnitComponent {
  protected owner: Unit;
  protected enabled: boolean = true;
  protected initialized: boolean = false;
  
  abstract getType(): string;
  
  setOwner(owner: Unit): void {
    this.owner = owner;
  }
  
  initialize(): void {
    if (!this.initialized) {
      this.onInitialize();
      this.initialized = true;
    }
  }
  
  abstract update(deltaTime: number): void;
  abstract onInitialize(): void;
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Health Component 구현
export class HealthComponent extends UnitComponent {
  private maxHealth: number;
  private currentHealth: number;
  private armor: number;
  private regeneration: number = 0;
  private onDeathCallback?: () => void;
  private onDamageCallback?: (damage: number, source?: Unit) => void;
  
  constructor(config: HealthConfig) {
    super();
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.currentHealth;
    this.armor = config.armor || 0;
    this.onDeathCallback = config.onDeath;
    this.onDamageCallback = config.onDamage;
  }
  
  getType(): string {
    return 'Health';
  }
  
  onInitialize(): void {
    // 초기화 로직
  }
  
  update(deltaTime: number): void {
    // 자연 회복
    if (this.regeneration > 0 && this.currentHealth < this.maxHealth) {
      this.heal(this.regeneration * deltaTime);
    }
  }
  
  takeDamage(damage: number, source?: Unit): void {
    // 아머 계산
    const actualDamage = this.calculateActualDamage(damage);
    
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
    
    // 콜백 호출
    if (this.onDamageCallback) {
      this.onDamageCallback(actualDamage, source);
    }
    
    // 사망 체크
    if (this.currentHealth <= 0 && this.onDeathCallback) {
      this.onDeathCallback();
    }
    
    // 이벤트 발생
    EventManager.emit('unit_damage_taken', {
      unit: this.owner,
      damage: actualDamage,
      source: source
    });
  }
  
  private calculateActualDamage(damage: number): number {
    // 아머 공식: 실제 데미지 = 원본 데미지 * (100 / (100 + 아머))
    return damage * (100 / (100 + this.armor));
  }
  
  heal(amount: number): void {
    const previousHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    
    const actualHealing = this.currentHealth - previousHealth;
    if (actualHealing > 0) {
      EventManager.emit('unit_healed', {
        unit: this.owner,
        amount: actualHealing
      });
    }
  }
  
  isDead(): boolean {
    return this.currentHealth <= 0;
  }
  
  getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth;
  }
}

// Movement Component 구현
export class MovementComponent extends UnitComponent {
  private speed: number;
  private acceleration: number;
  private rotationSpeed: number;
  private currentVelocity: Vec3 = Vec3.ZERO.clone();
  private targetPosition: Vec3 | null = null;
  private targetRotation: number | null = null;
  private pathfinder: Pathfinder | null = null;
  private currentPath: Vec3[] = [];
  private pathIndex: number = 0;
  
  constructor(config: MovementConfig) {
    super();
    this.speed = config.speed;
    this.acceleration = config.acceleration;
    this.rotationSpeed = config.rotationSpeed;
    
    if (config.pathfinding) {
      this.pathfinder = new Pathfinder();
    }
  }
  
  getType(): string {
    return 'Movement';
  }
  
  onInitialize(): void {
    if (this.pathfinder) {
      this.pathfinder.initialize(BattleManager.getInstance().getNavMesh());
    }
  }
  
  update(deltaTime: number): void {
    this.updateMovement(deltaTime);
    this.updateRotation(deltaTime);
    this.updatePathfinding(deltaTime);
  }
  
  private updateMovement(deltaTime: number): void {
    if (!this.targetPosition) return;
    
    const currentPos = this.owner.node.position;
    const direction = this.targetPosition.subtract(currentPos).normalize();
    const distance = Vec3.distance(currentPos, this.targetPosition);
    
    if (distance < 0.1) {
      // 목표 도달
      this.targetPosition = null;
      this.currentVelocity = Vec3.ZERO.clone();
      return;
    }
    
    // 가속도 적용
    const targetVelocity = direction.multiplyScalar(this.speed);
    this.currentVelocity = Vec3.lerp(
      this.currentVelocity,
      targetVelocity,
      this.acceleration * deltaTime
    );
    
    // 위치 업데이트
    const newPosition = currentPos.add(
      this.currentVelocity.multiplyScalar(deltaTime)
    );
    this.owner.node.setPosition(newPosition);
  }
  
  moveTo(position: Vec3): void {
    if (this.pathfinder) {
      // 패스파인딩 사용
      const path = this.pathfinder.findPath(
        this.owner.node.position,
        position
      );
      
      if (path.length > 0) {
        this.currentPath = path;
        this.pathIndex = 0;
        this.targetPosition = this.currentPath[0];
      }
    } else {
      // 직선 이동
      this.targetPosition = position;
    }
  }
  
  private updatePathfinding(deltaTime: number): void {
    if (this.currentPath.length === 0) return;
    
    const currentPos = this.owner.node.position;
    const currentTarget = this.currentPath[this.pathIndex];
    
    if (Vec3.distance(currentPos, currentTarget) < 0.5) {
      this.pathIndex++;
      
      if (this.pathIndex >= this.currentPath.length) {
        // 경로 완주
        this.currentPath = [];
        this.pathIndex = 0;
        this.targetPosition = null;
      } else {
        // 다음 웨이포인트로
        this.targetPosition = this.currentPath[this.pathIndex];
      }
    }
  }
  
  stop(): void {
    this.targetPosition = null;
    this.currentPath = [];
    this.pathIndex = 0;
    this.currentVelocity = Vec3.ZERO.clone();
  }
  
  getCurrentSpeed(): number {
    return this.currentVelocity.length();
  }
  
  isMoving(): boolean {
    return this.targetPosition !== null && this.getCurrentSpeed() > 0.1;
  }
}
```

## 4. AI 시스템 구현

### 4.1 행동 트리 시스템
```typescript
// [의도] 유연하고 확장 가능한 AI 행동 시스템 구현
// [책임] 행동 노드 정의, 실행 흐름 관리, 디버깅 지원
export abstract class BehaviorNode {
  protected children: BehaviorNode[] = [];
  protected name: string;
  protected status: NodeStatus = NodeStatus.Ready;
  
  constructor(name: string) {
    this.name = name;
  }
  
  abstract execute(context: AIContext): NodeStatus;
  
  addChild(child: BehaviorNode): BehaviorNode {
    this.children.push(child);
    return this;
  }
  
  getName(): string {
    return this.name;
  }
  
  getStatus(): NodeStatus {
    return this.status;
  }
  
  reset(): void {
    this.status = NodeStatus.Ready;
    for (const child of this.children) {
      child.reset();
    }
  }
}

// Selector Node (OR 노드)
export class SelectorNode extends BehaviorNode {
  execute(context: AIContext): NodeStatus {
    for (const child of this.children) {
      const result = child.execute(context);
      
      if (result === NodeStatus.Success) {
        this.status = NodeStatus.Success;
        return NodeStatus.Success;
      } else if (result === NodeStatus.Running) {
        this.status = NodeStatus.Running;
        return NodeStatus.Running;
      }
      // Failure인 경우 다음 자식 노드 시도
    }
    
    this.status = NodeStatus.Failure;
    return NodeStatus.Failure;
  }
}

// Sequence Node (AND 노드)
export class SequenceNode extends BehaviorNode {
  private currentChildIndex: number = 0;
  
  execute(context: AIContext): NodeStatus {
    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const result = this.children[i].execute(context);
      
      if (result === NodeStatus.Failure) {
        this.currentChildIndex = 0;
        this.status = NodeStatus.Failure;
        return NodeStatus.Failure;
      } else if (result === NodeStatus.Running) {
        this.currentChildIndex = i;
        this.status = NodeStatus.Running;
        return NodeStatus.Running;
      }
      // Success인 경우 다음 자식 노드로
    }
    
    this.currentChildIndex = 0;
    this.status = NodeStatus.Success;
    return NodeStatus.Success;
  }
  
  reset(): void {
    super.reset();
    this.currentChildIndex = 0;
  }
}

// Condition Node
export class ConditionNode extends BehaviorNode {
  private condition: (context: AIContext) => boolean;
  
  constructor(name: string, condition: (context: AIContext) => boolean) {
    super(name);
    this.condition = condition;
  }
  
  execute(context: AIContext): NodeStatus {
    const result = this.condition(context);
    this.status = result ? NodeStatus.Success : NodeStatus.Failure;
    return this.status;
  }
}

// Action Node
export class ActionNode extends BehaviorNode {
  private action: (context: AIContext) => NodeStatus;
  
  constructor(name: string, action: (context: AIContext) => NodeStatus) {
    super(name);
    this.action = action;
  }
  
  execute(context: AIContext): NodeStatus {
    this.status = this.action(context);
    return this.status;
  }
}
```

### 4.2 AI 컨텍스트 및 상태 관리
```typescript
// [의도] AI 의사결정에 필요한 모든 컨텍스트 정보 관리
// [책임] 게임 상태 접근, 센서 데이터, 메모리 관리
export class AIContext {
  public readonly unit: Unit;
  public readonly deltaTime: number;
  public readonly battleState: BattleState;
  
  private blackboard: Map<string, any>;
  private sensors: Map<string, AISensor>;
  private memory: AIMemory;
  
  constructor(unit: Unit, deltaTime: number) {
    this.unit = unit;
    this.deltaTime = deltaTime;
    this.battleState = BattleManager.getInstance().getBattleState();
    this.blackboard = new Map();
    this.sensors = new Map();
    this.memory = new AIMemory();
    
    this.initializeSensors();
  }
  
  private initializeSensors(): void {
    // 시야 센서
    this.sensors.set('vision', new VisionSensor(this.unit, {
      range: this.unit.getSightRange(),
      angle: 120, // 120도 시야각
      layerMask: LayerMask.ENEMIES | LayerMask.BUILDINGS
    }));
    
    // 근접 센서
    this.sensors.set('proximity', new ProximitySensor(this.unit, {
      range: this.unit.getAttackRange() * 1.2,
      updateFrequency: 0.1 // 100ms마다 업데이트
    }));
    
    // 데미지 센서
    this.sensors.set('damage', new DamageSensor(this.unit));
  }
  
  // 블랙보드 (단기 메모리)
  setBlackboardValue(key: string, value: any): void {
    this.blackboard.set(key, value);
  }
  
  getBlackboardValue<T>(key: string, defaultValue?: T): T {
    return this.blackboard.get(key) || defaultValue;
  }
  
  // 센서 데이터 접근
  getVisibleEnemies(): Unit[] {
    return this.sensors.get('vision')?.getDetectedUnits() || [];
  }
  
  getNearbyEnemies(): Unit[] {
    return this.sensors.get('proximity')?.getDetectedUnits() || [];
  }
  
  getLastAttacker(): Unit | null {
    return this.sensors.get('damage')?.getLastAttacker() || null;
  }
  
  // 게임 상태 쿼리 메서드들
  findNearestEnemy(): Unit | null {
    const enemies = this.getVisibleEnemies();
    if (enemies.length === 0) return null;
    
    const unitPos = this.unit.node.position;
    let nearest: Unit | null = null;
    let nearestDistance = Infinity;
    
    for (const enemy of enemies) {
      const distance = Vec3.distance(unitPos, enemy.node.position);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    
    return nearest;
  }
  
  findOptimalTarget(): Unit | null {
    const enemies = this.getVisibleEnemies();
    if (enemies.length === 0) return null;
    
    // 우선순위 기반 타겟 선택
    let bestTarget: Unit | null = null;
    let bestScore = -1;
    
    for (const enemy of enemies) {
      const score = this.calculateTargetScore(enemy);
      if (score > bestScore) {
        bestTarget = enemy;
        bestScore = score;
      }
    }
    
    return bestTarget;
  }
  
  private calculateTargetScore(target: Unit): number {
    let score = 0;
    
    // 거리 (가까울수록 높은 점수)
    const distance = Vec3.distance(this.unit.node.position, target.node.position);
    score += (100 - distance) / 100 * 30;
    
    // 체력 (낮을수록 높은 점수)
    const healthPercentage = target.getComponent<HealthComponent>('Health')?.getHealthPercentage() || 1;
    score += (1 - healthPercentage) * 40;
    
    // 위험도 (공격력이 높을수록 우선 제거)
    const combat = target.getComponent<CombatComponent>('Combat');
    if (combat) {
      score += combat.getDamage() / 100 * 20;
    }
    
    // 타입별 우선순위
    if (target.getUnitType() === UnitType.BUILDING) {
      score += 10; // 건물 우선 공격
    }
    
    return score;
  }
  
  // 메모리 관리
  rememberPosition(key: string, position: Vec3): void {
    this.memory.storePosition(key, position);
  }
  
  recallPosition(key: string): Vec3 | null {
    return this.memory.getPosition(key);
  }
  
  forgetOldMemories(): void {
    this.memory.cleanup(5000); // 5초 이상 된 기억 삭제
  }
}

// AI 메모리 시스템
export class AIMemory {
  private positions: Map<string, { position: Vec3, timestamp: number }>;
  private events: Map<string, { data: any, timestamp: number }>;
  
  constructor() {
    this.positions = new Map();
    this.events = new Map();
  }
  
  storePosition(key: string, position: Vec3): void {
    this.positions.set(key, {
      position: position.clone(),
      timestamp: Date.now()
    });
  }
  
  getPosition(key: string): Vec3 | null {
    const entry = this.positions.get(key);
    return entry ? entry.position.clone() : null;
  }
  
  storeEvent(key: string, data: any): void {
    this.events.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }
  
  getEvent(key: string): any {
    const entry = this.events.get(key);
    return entry ? entry.data : null;
  }
  
  cleanup(maxAge: number): void {
    const now = Date.now();
    
    for (const [key, entry] of this.positions) {
      if (now - entry.timestamp > maxAge) {
        this.positions.delete(key);
      }
    }
    
    for (const [key, entry] of this.events) {
      if (now - entry.timestamp > maxAge) {
        this.events.delete(key);
      }
    }
  }
}
```

## 5. 애니메이션 시스템

### 5.1 애니메이션 컨트롤러
```typescript
// [의도] 유닛의 애니메이션을 상태와 연동하여 자동 관리
// [책임] 애니메이션 전환, 블렌딩, 이벤트 처리
export class AnimationController {
  private skeleton: sp.Skeleton;
  private animationState: sp.AnimationState;
  private currentAnimation: string;
  private animationQueue: AnimationQueueItem[] = [];
  private blendingEnabled: boolean = true;
  private eventCallbacks: Map<string, (event: sp.EventObject) => void> = new Map();
  
  constructor(skeletonData: sp.SkeletonData) {
    this.skeleton = new sp.Skeleton(skeletonData);
    this.animationState = new sp.AnimationState(new sp.AnimationStateData(skeletonData));
    this.setupAnimationEvents();
  }
  
  private setupAnimationEvents(): void {
    this.animationState.setListener({
      complete: (trackEntry) => {
        this.onAnimationComplete(trackEntry);
      },
      event: (trackEntry, event) => {
        this.onAnimationEvent(trackEntry, event);
      },
      start: (trackEntry) => {
        this.onAnimationStart(trackEntry);
      },
      end: (trackEntry) => {
        this.onAnimationEnd(trackEntry);
      }
    });
  }
  
  playAnimation(
    animationName: string, 
    loop: boolean = true, 
    trackIndex: number = 0
  ): void {
    if (this.currentAnimation === animationName) return;
    
    const trackEntry = this.animationState.setAnimation(trackIndex, animationName, loop);
    
    if (this.blendingEnabled && this.currentAnimation) {
      // 부드러운 전환을 위한 믹스 설정
      const mixDuration = this.getTransitionDuration(this.currentAnimation, animationName);
      trackEntry.mixDuration = mixDuration;
    }
    
    this.currentAnimation = animationName;
  }
  
  queueAnimation(
    animationName: string, 
    loop: boolean = false, 
    delay: number = 0
  ): void {
    this.animationQueue.push({
      name: animationName,
      loop: loop,
      delay: delay,
      timestamp: Date.now()
    });
  }
  
  private getTransitionDuration(from: string, to: string): number {
    // 애니메이션 간 전환 시간 정의
    const transitionMap: { [key: string]: number } = {
      'idle_to_walk': 0.2,
      'walk_to_idle': 0.3,
      'idle_to_attack': 0.1,
      'attack_to_idle': 0.4,
      'walk_to_attack': 0.15,
      'attack_to_walk': 0.3,
      'any_to_death': 0.1,
      'any_to_hit': 0.05
    };
    
    const key = `${from}_to_${to}`;
    return transitionMap[key] || transitionMap['any_to_' + to] || 0.25;
  }
  
  update(deltaTime: number): void {
    // 애니메이션 상태 업데이트
    this.animationState.update(deltaTime);
    this.animationState.apply(this.skeleton);
    
    // 큐 처리
    this.processAnimationQueue();
  }
  
  private processAnimationQueue(): void {
    if (this.animationQueue.length === 0) return;
    
    const now = Date.now();
    const nextAnimation = this.animationQueue[0];
    
    if (now - nextAnimation.timestamp >= nextAnimation.delay * 1000) {
      this.animationQueue.shift();
      this.playAnimation(nextAnimation.name, nextAnimation.loop);
    }
  }
  
  private onAnimationComplete(trackEntry: sp.TrackEntry): void {
    // 완료된 애니메이션에 따른 처리
    const animationName = trackEntry.animation.name;
    
    switch (animationName) {
      case 'attack':
        // 공격 애니메이션 완료 시 idle로 전환
        this.playAnimation('idle');
        break;
        
      case 'death':
        // 사망 애니메이션 완료 시 유닛 제거
        this.owner?.markForDestruction();
        break;
        
      case 'skill':
        // 스킬 애니메이션 완료
        this.playAnimation('idle');
        break;
    }
  }
  
  private onAnimationEvent(trackEntry: sp.TrackEntry, event: sp.EventObject): void {
    const callback = this.eventCallbacks.get(event.data.name);
    if (callback) {
      callback(event);
    }
    
    // 기본 이벤트 처리
    switch (event.data.name) {
      case 'attack_hit':
        // 공격 히트 타이밍
        this.owner?.triggerAttackHit();
        break;
        
      case 'footstep':
        // 발소리 효과
        EffectManager.playEffect('footstep', this.owner.node.position);
        break;
        
      case 'spell_cast':
        // 스펠 시전
        this.owner?.castSpell();
        break;
    }
  }
  
  // 이벤트 콜백 등록
  registerEventCallback(eventName: string, callback: (event: sp.EventObject) => void): void {
    this.eventCallbacks.set(eventName, callback);
  }
  
  // 현재 애니메이션 정보
  getCurrentAnimation(): string {
    return this.currentAnimation;
  }
  
  isAnimationPlaying(animationName: string): boolean {
    return this.currentAnimation === animationName;
  }
  
  getAnimationProgress(): number {
    const trackEntry = this.animationState.getCurrent(0);
    if (trackEntry) {
      return trackEntry.trackTime / trackEntry.animationEnd;
    }
    return 0;
  }
}
```

### 5.2 상태 기반 애니메이션 매핑
```typescript
// [의도] 유닛 상태에 따른 자동 애니메이션 전환 시스템
// [책임] 상태-애니메이션 매핑, 조건부 전환, 우선순위 관리
export class StateAnimationMapper {
  private animationMap: Map<UnitState, AnimationRule>;
  private conditionalAnimations: ConditionalAnimation[];
  private priorityOverrides: Map<string, number>;
  
  constructor() {
    this.animationMap = new Map();
    this.conditionalAnimations = [];
    this.priorityOverrides = new Map();
    this.initializeAnimationRules();
  }
  
  private initializeAnimationRules(): void {
    // 기본 상태별 애니메이션 매핑
    this.animationMap.set(UnitState.Idle, {
      animation: 'idle',
      loop: true,
      priority: 1,
      conditions: []
    });
    
    this.animationMap.set(UnitState.Moving, {
      animation: 'walk',
      loop: true,
      priority: 2,
      conditions: [(unit) => unit.getComponent<MovementComponent>('Movement')?.isMoving()]
    });
    
    this.animationMap.set(UnitState.Attacking, {
      animation: 'attack',
      loop: false,
      priority: 5,
      conditions: [(unit) => unit.getComponent<CombatComponent>('Combat')?.isAttacking()]
    });
    
    this.animationMap.set(UnitState.Dying, {
      animation: 'death',
      loop: false,
      priority: 10,
      conditions: [(unit) => unit.getComponent<HealthComponent>('Health')?.isDead()]
    });
    
    // 조건부 애니메이션 정의
    this.conditionalAnimations = [
      {
        name: 'hit_reaction',
        animation: 'hit',
        loop: false,
        priority: 7,
        condition: (unit) => unit.wasRecentlyDamaged(500), // 500ms 이내 데미지
        duration: 0.5 // 0.5초 후 원래 애니메이션으로 복귀
      },
      {
        name: 'skill_cast',
        animation: 'skill',
        loop: false,
        priority: 8,
        condition: (unit) => unit.isCastingSkill(),
        duration: -1 // 애니메이션 완료까지
      },
      {
        name: 'victory_pose',
        animation: 'victory',
        loop: true,
        priority: 3,
        condition: (unit) => unit.isInVictoryState(),
        duration: -1
      }
    ];
  }
  
  getAppropriateAnimation(unit: Unit): AnimationChoice {
    let bestChoice: AnimationChoice = {
      animation: 'idle',
      loop: true,
      priority: 0
    };
    
    // 조건부 애니메이션 체크 (높은 우선순위)
    for (const conditional of this.conditionalAnimations) {
      if (conditional.condition(unit)) {
        if (conditional.priority > bestChoice.priority) {
          bestChoice = {
            animation: conditional.animation,
            loop: conditional.loop,
            priority: conditional.priority,
            duration: conditional.duration
          };
        }
      }
    }
    
    // 상태 기반 애니메이션 체크
    const currentState = unit.getCurrentState();
    const stateRule = this.animationMap.get(currentState);
    
    if (stateRule && stateRule.priority > bestChoice.priority) {
      // 조건 확인
      const conditionsMet = stateRule.conditions.every(condition => condition(unit));
      
      if (conditionsMet) {
        bestChoice = {
          animation: stateRule.animation,
          loop: stateRule.loop,
          priority: stateRule.priority
        };
      }
    }
    
    return bestChoice;
  }
  
  // 커스텀 애니메이션 규칙 추가
  addAnimationRule(state: UnitState, rule: AnimationRule): void {
    this.animationMap.set(state, rule);
  }
  
  addConditionalAnimation(conditional: ConditionalAnimation): void {
    this.conditionalAnimations.push(conditional);
    
    // 우선순위 순으로 정렬
    this.conditionalAnimations.sort((a, b) => b.priority - a.priority);
  }
  
  // 특정 애니메이션의 우선순위 일시적 변경
  setTemporaryPriority(animationName: string, priority: number, duration: number): void {
    this.priorityOverrides.set(animationName, priority);
    
    // 지정된 시간 후 제거
    setTimeout(() => {
      this.priorityOverrides.delete(animationName);
    }, duration * 1000);
  }
}

// 인터페이스 정의
interface AnimationRule {
  animation: string;
  loop: boolean;
  priority: number;
  conditions: ((unit: Unit) => boolean)[];
}

interface ConditionalAnimation {
  name: string;
  animation: string;
  loop: boolean;
  priority: number;
  condition: (unit: Unit) => boolean;
  duration: number; // -1이면 애니메이션 완료까지
}

interface AnimationChoice {
  animation: string;
  loop: boolean;
  priority: number;
  duration?: number;
}
```

계속해서 나머지 섹션들을 구현하겠습니다.