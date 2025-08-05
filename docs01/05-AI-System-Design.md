# 🧠 05. AI 시스템 설계 (AI System Design)

*Shadow Archer 모바일 3D 소울라이크 게임의 AI 시스템 및 적응형 게임플레이*

---

## 📖 목차

1. [AI 시스템 개요](#1-ai-시스템-개요)
2. [적 AI 시스템](#2-적-ai-시스템)
3. [보스 AI 시스템](#3-보스-ai-시스템)
4. [행동 트리 시스템](#4-행동-트리-시스템)
5. [적응형 난이도 시스템](#5-적응형-난이도-시스템)
6. [AI 기반 콘텐츠 생성](#6-ai-기반-콘텐츠-생성)
7. [성능 최적화](#7-성능-최적화)

---

## 1. AI 시스템 개요

### 1.1 AI 시스템 철학

```typescript
// [의도] 플레이어의 실력에 맞춰 동적으로 조정되는 지능형 AI 시스템
// [책임] 도전적이면서도 공정한 게임 경험 제공

enum AIType {
    BASIC_ENEMY = "basic_enemy",    // 기본 적
    ELITE_ENEMY = "elite_enemy",    // 정예 적
    BOSS = "boss",                  // 보스
    ENVIRONMENTAL = "environmental" // 환경 AI (함정, 이벤트)
}

enum AIState {
    IDLE = "idle",
    PATROL = "patrol",
    ALERT = "alert",
    COMBAT = "combat",
    RETREAT = "retreat",
    DEATH = "death"
}

interface AIContext {
    // 환경 정보
    playerPosition: Vec3;
    playerDistance: number;
    playerVisible: boolean;
    playerHealth: number;
    
    // AI 상태
    currentHealth: number;
    lastAction: string;
    actionCooldowns: Map<string, number>;
    
    // 전투 정보
    alliesInRange: IAIController[];
    obstaclesNearby: GameObject[];
    safePositions: Vec3[];
}

abstract class AIController extends Component {
    protected aiType: AIType;
    protected currentState: AIState = AIState.IDLE;
    protected context: AIContext;
    protected difficulty: number = 1.0;
    
    // AI 업데이트 주기 (성능 최적화)
    protected updateInterval: number = 0.1; // 10 FPS
    protected lastUpdateTime: number = 0;
    
    abstract initialize(): void;
    abstract updateAI(deltaTime: number): void;
    abstract onStateChange(oldState: AIState, newState: AIState): void;
    abstract calculateNextAction(): AIAction;
    
    protected update(deltaTime: number) {
        this.lastUpdateTime += deltaTime;
        
        if (this.lastUpdateTime >= this.updateInterval) {
            this.updateContext();
            this.updateAI(this.lastUpdateTime);
            this.lastUpdateTime = 0;
        }
    }
    
    protected updateContext() {
        const player = PlayerManager.getInstance().getPlayer();
        
        this.context = {
            playerPosition: player.worldPosition,
            playerDistance: Vec3.distance(this.node.worldPosition, player.worldPosition),
            playerVisible: this.checkLineOfSight(player.worldPosition),
            playerHealth: player.getComponent("HealthComponent").getCurrentHealth(),
            
            currentHealth: this.getComponent("HealthComponent").getCurrentHealth(),
            lastAction: this.getLastAction(),
            actionCooldowns: this.getActionCooldowns(),
            
            alliesInRange: this.findAlliesInRange(10),
            obstaclesNearby: this.findObstaclesNearby(5),
            safePositions: this.findSafePositions()
        };
    }
}
```

### 1.2 AI 매니저 시스템

```typescript
// [의도] 모든 AI 개체를 중앙에서 관리하는 시스템
// [책임] AI 성능 최적화, 우선순위 관리, 상호작용 조정

class AIManager extends Component {
    private static instance: AIManager;
    
    private activeAIs: Map<string, AIController> = new Map();
    private aiUpdateQueue: AIController[] = [];
    private maxAIUpdatesPerFrame: number = 5; // 프레임당 최대 AI 업데이트 수
    
    private playerProxy: PlayerProxy; // 플레이어 정보 캐시
    
    static getInstance(): AIManager {
        return AIManager.instance;
    }
    
    protected onLoad() {
        this.playerProxy = new PlayerProxy();
        this.setupPerformanceOptimizations();
    }
    
    // AI 등록
    registerAI(ai: AIController) {
        this.activeAIs.set(ai.node.uuid, ai);
        this.aiUpdateQueue.push(ai);
        
        // 거리 기반 우선순위 정렬
        this.sortAIsByPriority();
    }
    
    // AI 제거
    unregisterAI(ai: AIController) {
        this.activeAIs.delete(ai.node.uuid);
        const index = this.aiUpdateQueue.indexOf(ai);
        if (index !== -1) {
            this.aiUpdateQueue.splice(index, 1);
        }
    }
    
    protected update(deltaTime: number) {
        this.updatePlayerProxy();
        this.processAIUpdates(deltaTime);
        this.manageAIInteractions();
    }
    
    private processAIUpdates(deltaTime: number) {
        // 프레임당 제한된 수의 AI만 업데이트
        let updatesThisFrame = 0;
        
        for (const ai of this.aiUpdateQueue) {
            if (updatesThisFrame >= this.maxAIUpdatesPerFrame) {
                break;
            }
            
            if (this.shouldUpdateAI(ai)) {
                ai.updateAI(deltaTime);
                updatesThisFrame++;
            }
        }
        
        // 다음 프레임을 위해 큐 로테이션
        this.rotateAIQueue();
    }
    
    private shouldUpdateAI(ai: AIController): boolean {
        const distance = Vec3.distance(ai.node.worldPosition, this.playerProxy.position);
        
        // 거리별 업데이트 빈도 조절
        if (distance < 10) return true;      // 가까운 AI: 매 프레임
        if (distance < 20) return Math.random() < 0.7; // 중간 거리: 70% 확률
        if (distance < 50) return Math.random() < 0.3; // 먼 거리: 30% 확률
        
        return false; // 너무 멀면 업데이트 안함
    }
    
    private sortAIsByPriority() {
        this.aiUpdateQueue.sort((a, b) => {
            const distanceA = Vec3.distance(a.node.worldPosition, this.playerProxy.position);
            const distanceB = Vec3.distance(b.node.worldPosition, this.playerProxy.position);
            
            // 가까운 AI가 높은 우선순위
            return distanceA - distanceB;
        });
    }
    
    // AI 간 협력 관리
    private manageAIInteractions() {
        // AI들 간의 협력 공격, 포지셔닝 등을 관리
        this.coordinateGroupAttacks();
        this.preventAIOverlap();
        this.sharePlayerInformation();
    }
    
    private coordinateGroupAttacks() {
        const combatAIs = Array.from(this.activeAIs.values())
            .filter(ai => ai.getCurrentState() === AIState.COMBAT);
        
        if (combatAIs.length > 1) {
            // 동시 공격 방지 (한 번에 하나씩 공격)
            this.staggerAttacks(combatAIs);
        }
    }
}

// 플레이어 정보 캐시 (성능 최적화)
class PlayerProxy {
    position: Vec3 = Vec3.ZERO;
    health: number = 100;
    isAlive: boolean = true;
    lastKnownPosition: Vec3 = Vec3.ZERO;
    
    private updateInterval: number = 0.05; // 20 FPS로 업데이트
    private lastUpdateTime: number = 0;
    
    update(deltaTime: number) {
        this.lastUpdateTime += deltaTime;
        
        if (this.lastUpdateTime >= this.updateInterval) {
            const player = PlayerManager.getInstance().getPlayer();
            
            this.position = player.worldPosition;
            this.health = player.getComponent("HealthComponent").getCurrentHealth();
            this.isAlive = this.health > 0;
            
            if (this.isAlive) {
                this.lastKnownPosition = this.position;
            }
            
            this.lastUpdateTime = 0;
        }
    }
}
```

---

## 2. 적 AI 시스템

### 2.1 기본 적 AI

```typescript
// [의도] 간단하지만 효과적인 기본 적 AI 구현
// [책임] 기본적인 추적, 공격, 회피 행동

class BasicEnemyAI extends AIController {
    @property(Number)
    detectionRange: number = 8;
    
    @property(Number)
    attackRange: number = 2;
    
    @property(Number)
    fleeHealthThreshold: number = 0.2; // 20% 이하에서 도망
    
    private patrol: PatrolBehavior;
    private combat: CombatBehavior;
    private alertness: number = 0; // 0-1, 경계 수준
    
    initialize() {
        this.aiType = AIType.BASIC_ENEMY;
        this.patrol = new PatrolBehavior(this);
        this.combat = new CombatBehavior(this);
    }
    
    updateAI(deltaTime: number) {
        this.updateAlertness(deltaTime);
        
        switch (this.currentState) {
            case AIState.IDLE:
                this.handleIdleState();
                break;
            case AIState.PATROL:
                this.handlePatrolState(deltaTime);
                break;
            case AIState.ALERT:
                this.handleAlertState(deltaTime);
                break;
            case AIState.COMBAT:
                this.handleCombatState(deltaTime);
                break;
            case AIState.RETREAT:
                this.handleRetreatState(deltaTime);
                break;
        }
    }
    
    private handleIdleState() {
        // 플레이어 감지
        if (this.context.playerDistance <= this.detectionRange && this.context.playerVisible) {
            this.changeState(AIState.ALERT);
        } else {
            // 가끔 순찰 시작
            if (Math.random() < 0.1) {
                this.changeState(AIState.PATROL);
            }
        }
    }
    
    private handlePatrolState(deltaTime: number) {
        // 플레이어 감지 시 경계 상태로
        if (this.context.playerDistance <= this.detectionRange && this.context.playerVisible) {
            this.changeState(AIState.ALERT);
            return;
        }
        
        // 순찰 행동 실행
        this.patrol.execute(deltaTime);
        
        // 순찰 완료 시 대기
        if (this.patrol.isComplete()) {
            this.changeState(AIState.IDLE);
        }
    }
    
    private handleAlertState(deltaTime: number) {
        // 경계 상태에서 플레이어 추적
        if (this.context.playerVisible) {
            this.alertness += deltaTime * 2; // 경계 수준 증가
            
            if (this.alertness >= 1.0) {
                this.changeState(AIState.COMBAT);
            } else {
                // 플레이어 방향으로 이동
                this.moveTowardsPlayer(deltaTime);
            }
        } else {
            this.alertness -= deltaTime; // 경계 수준 감소
            
            if (this.alertness <= 0) {
                this.changeState(AIState.PATROL);
            }
        }
    }
    
    private handleCombatState(deltaTime: number) {
        // 체력이 낮으면 도망
        const healthRatio = this.context.currentHealth / this.getMaxHealth();
        if (healthRatio <= this.fleeHealthThreshold) {
            this.changeState(AIState.RETREAT);
            return;
        }
        
        // 플레이어가 너무 멀면 추적
        if (this.context.playerDistance > this.detectionRange * 1.5) {
            this.changeState(AIState.PATROL);
            return;
        }
        
        // 전투 행동 실행
        this.combat.execute(deltaTime);
    }
    
    private handleRetreatState(deltaTime: number) {
        // 안전한 위치로 도망
        const safePosition = this.findNearestSafePosition();
        if (safePosition) {
            this.moveToPosition(safePosition, deltaTime);
        }
        
        // 체력이 회복되거나 충분한 거리를 벌렸으면 다시 전투
        const healthRatio = this.context.currentHealth / this.getMaxHealth();
        if (healthRatio > this.fleeHealthThreshold + 0.2 || 
            this.context.playerDistance > this.detectionRange * 2) {
            this.changeState(AIState.COMBAT);
        }
    }
    
    calculateNextAction(): AIAction {
        switch (this.currentState) {
            case AIState.COMBAT:
                return this.calculateCombatAction();
            case AIState.ALERT:
                return { type: "move", target: this.context.playerPosition };
            case AIState.RETREAT:
                return { type: "flee", target: this.findNearestSafePosition() };
            default:
                return { type: "wait", duration: 1 };
        }
    }
    
    private calculateCombatAction(): AIAction {
        // 공격 범위 내에 있으면 공격
        if (this.context.playerDistance <= this.attackRange) {
            return { type: "attack", target: this.context.playerPosition };
        }
        
        // 너무 가까우면 뒤로 물러나기
        if (this.context.playerDistance < this.attackRange * 0.5) {
            return { type: "retreat", target: this.findRetreatPosition() };
        }
        
        // 적당한 거리면 접근
        return { type: "move", target: this.context.playerPosition };
    }
}
```

### 2.2 정예 적 AI

```typescript
// [의도] 더 복잡한 행동 패턴을 가진 정예 적 AI
// [책임] 고급 전술, 환경 활용, 플레이어 패턴 학습

class EliteEnemyAI extends AIController {
    @property(Number)
    learningRate: number = 0.1; // 플레이어 패턴 학습 속도
    
    private playerPatternAnalyzer: PlayerPatternAnalyzer;
    private tacticalPlanner: TacticalPlanner;
    private environmentalAwareness: EnvironmentalAI;
    
    // 플레이어 행동 예측
    private playerPredictedPosition: Vec3 = Vec3.ZERO;
    private playerMovementPattern: MovementPattern = MovementPattern.UNPREDICTABLE;
    
    initialize() {
        this.aiType = AIType.ELITE_ENEMY;
        this.playerPatternAnalyzer = new PlayerPatternAnalyzer(this.learningRate);
        this.tacticalPlanner = new TacticalPlanner(this);
        this.environmentalAwareness = new EnvironmentalAI(this);
    }
    
    updateAI(deltaTime: number) {
        // 플레이어 패턴 분석
        this.playerPatternAnalyzer.analyzePlayerBehavior(this.context, deltaTime);
        
        // 환경 분석
        this.environmentalAwareness.analyzeEnvironment(this.context);
        
        // 전술 계획 수립
        const tacticalPlan = this.tacticalPlanner.createPlan(this.context);
        
        // 계획 실행
        this.executeTacticalPlan(tacticalPlan, deltaTime);
    }
    
    calculateNextAction(): AIAction {
        // 예측된 플레이어 위치 기반 행동 결정
        this.playerPredictedPosition = this.playerPatternAnalyzer.predictPlayerPosition(0.5); // 0.5초 후 예측
        
        const tacticalAction = this.tacticalPlanner.getBestAction(this.context);
        
        // 환경 요소 고려
        const environmentalModifier = this.environmentalAwareness.getEnvironmentalModifier(tacticalAction);
        
        return this.combineActions(tacticalAction, environmentalModifier);
    }
    
    private executeTacticalPlan(plan: TacticalPlan, deltaTime: number) {
        switch (plan.primaryObjective) {
            case TacticalObjective.AMBUSH:
                this.executeAmbush(plan, deltaTime);
                break;
            case TacticalObjective.FLANK:
                this.executeFlank(plan, deltaTime);
                break;
            case TacticalObjective.CONTROL_SPACE:
                this.executeSpaceControl(plan, deltaTime);
                break;
            case TacticalObjective.EXPLOIT_WEAKNESS:
                this.executeWeaknessExploitation(plan, deltaTime);
                break;
        }
    }
    
    private executeAmbush(plan: TacticalPlan, deltaTime: number) {
        // 엄폐물 뒤에 숨어서 기다리기
        const ambushPosition = plan.targetPosition;
        
        if (Vec3.distance(this.node.worldPosition, ambushPosition) > 1) {
            this.moveToPosition(ambushPosition, deltaTime);
        } else {
            // 플레이어가 근처에 오면 기습 공격
            if (this.context.playerDistance <= plan.triggerRange) {
                this.executeSpecialAttack("ambush_strike");
            }
        }
    }
    
    private executeFlank(plan: TacticalPlan, deltaTime: number) {
        // 플레이어의 측면으로 이동
        const flankPosition = this.calculateFlankPosition(plan.targetPosition);
        this.moveToPosition(flankPosition, deltaTime);
        
        // 측면 공격 각도에 도달하면 공격
        if (this.isInFlankPosition()) {
            this.executeSpecialAttack("flank_attack");
        }
    }
}

// 플레이어 패턴 분석기
class PlayerPatternAnalyzer {
    private movementHistory: Vec3[] = [];
    private actionHistory: PlayerAction[] = [];
    private learningRate: number;
    
    private readonly HISTORY_SIZE = 30; // 30개 행동 기록
    
    constructor(learningRate: number) {
        this.learningRate = learningRate;
    }
    
    analyzePlayerBehavior(context: AIContext, deltaTime: number) {
        // 플레이어 이동 기록
        this.movementHistory.push(context.playerPosition);
        if (this.movementHistory.length > this.HISTORY_SIZE) {
            this.movementHistory.shift();
        }
        
        // 플레이어 행동 분석
        const currentAction = this.detectPlayerAction(context);
        if (currentAction) {
            this.actionHistory.push(currentAction);
            if (this.actionHistory.length > this.HISTORY_SIZE) {
                this.actionHistory.shift();
            }
        }
    }
    
    predictPlayerPosition(timeAhead: number): Vec3 {
        if (this.movementHistory.length < 3) {
            return this.movementHistory[this.movementHistory.length - 1] || Vec3.ZERO;
        }
        
        // 선형 예측 (간단한 방법)
        const recent = this.movementHistory.slice(-3);
        const velocity = recent[2].subtract(recent[1]);
        
        return recent[2].add(velocity.multiplyScalar(timeAhead));
    }
    
    getPlayerMovementPattern(): MovementPattern {
        if (this.movementHistory.length < 10) {
            return MovementPattern.UNPREDICTABLE;
        }
        
        // 이동 패턴 분석
        const movements = this.movementHistory.slice(-10);
        let totalDistance = 0;
        let directionChanges = 0;
        
        for (let i = 1; i < movements.length; i++) {
            const distance = Vec3.distance(movements[i], movements[i-1]);
            totalDistance += distance;
            
            if (i >= 2) {
                const angle1 = this.calculateAngle(movements[i-2], movements[i-1]);
                const angle2 = this.calculateAngle(movements[i-1], movements[i]);
                
                if (Math.abs(angle1 - angle2) > Math.PI / 4) {
                    directionChanges++;
                }
            }
        }
        
        const avgDistance = totalDistance / (movements.length - 1);
        const changeRatio = directionChanges / (movements.length - 2);
        
        if (avgDistance < 0.5) return MovementPattern.STATIONARY;
        if (changeRatio < 0.2) return MovementPattern.LINEAR;
        if (changeRatio > 0.7) return MovementPattern.ERRATIC;
        
        return MovementPattern.PREDICTABLE;
    }
    
    private detectPlayerAction(context: AIContext): PlayerAction | null {
        // 플레이어의 현재 행동을 추론
        // 이는 실제로는 플레이어 컴포넌트에서 이벤트를 받아야 함
        return null; // 구현 필요
    }
}

enum MovementPattern {
    STATIONARY = "stationary",
    LINEAR = "linear",
    PREDICTABLE = "predictable",
    ERRATIC = "erratic",
    UNPREDICTABLE = "unpredictable"
}

enum TacticalObjective {
    AMBUSH = "ambush",
    FLANK = "flank",
    CONTROL_SPACE = "control_space",
    EXPLOIT_WEAKNESS = "exploit_weakness"
}

interface TacticalPlan {
    primaryObjective: TacticalObjective;
    targetPosition: Vec3;
    triggerRange: number;
    expectedDuration: number;
    fallbackPlan?: TacticalPlan;
}
```

---

## 3. 보스 AI 시스템

### 3.1 보스 AI 기반 구조

```typescript
// [의도] 복잡하고 도전적인 보스 전투를 위한 고급 AI 시스템
// [책임] 페이즈 관리, 패턴 다양화, 적응형 난이도 조절

enum BossPhase {
    PHASE_1 = 1,
    PHASE_2 = 2, 
    PHASE_3 = 3,
    ENRAGE = 4
}

interface BossPattern {
    readonly name: string;
    readonly phase: BossPhase;
    readonly cooldown: number;
    readonly conditions: (context: AIContext) => boolean;
    readonly weight: number; // 선택 확률 가중치
    
    execute(boss: BossAI, context: AIContext): Promise<void>;
    canExecute(boss: BossAI, context: AIContext): boolean;
}

abstract class BossAI extends AIController {
    @property(Number)
    maxHealth: number = 1000;
    
    protected currentPhase: BossPhase = BossPhase.PHASE_1;
    protected patterns: Map<string, BossPattern> = new Map();
    protected patternHistory: string[] = []; // 최근 사용한 패턴들
    protected patternCooldowns: Map<string, number> = new Map();
    
    // 적응형 난이도
    protected playerPerformance: PlayerPerformanceTracker;
    protected difficultyScaler: DifficultyScaler;
    
    // 보스 전용 상태
    protected isInvulnerable: boolean = false;
    protected isChanneling: boolean = false;
    protected currentPattern: BossPattern | null = null;
    
    initialize() {
        this.aiType = AIType.BOSS;
        this.playerPerformance = new PlayerPerformanceTracker();
        this.difficultyScaler = new DifficultyScaler();
        
        this.setupPatterns();
        this.setupPhaseTransitions();
    }
    
    updateAI(deltaTime: number) {
        this.updatePatternCooldowns(deltaTime);
        this.updatePhase();
        this.playerPerformance.update(this.context, deltaTime);
        
        // 현재 패턴 실행 중이면 대기
        if (this.isChanneling && this.currentPattern) {
            return;
        }
        
        // 다음 패턴 선택 및 실행
        const nextPattern = this.selectNextPattern();
        if (nextPattern) {
            this.executePattern(nextPattern);
        }
    }
    
    calculateNextAction(): AIAction {
        if (this.currentPattern) {
            return { type: "pattern", pattern: this.currentPattern };
        }
        
        // 기본 행동 (위치 조정)
        return this.calculatePositioning();
    }
    
    protected selectNextPattern(): BossPattern | null {
        const availablePatterns = Array.from(this.patterns.values())
            .filter(pattern => this.canUsePattern(pattern));
        
        if (availablePatterns.length === 0) {
            return null;
        }
        
        // 가중치 기반 랜덤 선택 (최근 사용한 패턴 제외)
        const weightedPatterns = availablePatterns
            .filter(pattern => !this.wasRecentlyUsed(pattern.name))
            .map(pattern => ({
                pattern,
                weight: this.calculatePatternWeight(pattern)
            }));
        
        return this.selectWeightedRandom(weightedPatterns);
    }
    
    private calculatePatternWeight(pattern: BossPattern): number {
        let weight = pattern.weight;
        
        // 플레이어 성능에 따른 가중치 조정
        const performance = this.playerPerformance.getCurrentPerformance();
        
        if (performance.dodgeSuccessRate > 0.8) {
            // 플레이어가 너무 잘 피하면 예측하기 어려운 패턴 선호
            if (pattern.name.includes("unpredictable")) {
                weight *= 1.5;
            }
        }
        
        if (performance.healthRatio < 0.3) {
            // 플레이어 체력이 낮으면 마무리 패턴 선호
            if (pattern.name.includes("finisher")) {
                weight *= 2.0;
            }
        }
        
        // 페이즈에 맞는 패턴 가중치 증가
        if (pattern.phase === this.currentPhase) {
            weight *= 1.2;
        }
        
        return weight;
    }
    
    protected async executePattern(pattern: BossPattern) {
        this.currentPattern = pattern;
        this.isChanneling = true;
        
        // 패턴 사용 기록
        this.patternHistory.push(pattern.name);
        if (this.patternHistory.length > 5) {
            this.patternHistory.shift();
        }
        
        // 쿨다운 설정
        this.patternCooldowns.set(pattern.name, pattern.cooldown);
        
        try {
            // 패턴 실행
            await pattern.execute(this, this.context);
        } catch (error) {
            console.error(`Boss pattern execution failed: ${error}`);
        } finally {
            this.isChanneling = false;
            this.currentPattern = null;
        }
    }
    
    protected updatePhase() {
        const healthRatio = this.context.currentHealth / this.maxHealth;
        let newPhase = this.currentPhase;
        
        if (healthRatio <= 0.25 && this.currentPhase < BossPhase.ENRAGE) {
            newPhase = BossPhase.ENRAGE;
        } else if (healthRatio <= 0.4 && this.currentPhase < BossPhase.PHASE_3) {
            newPhase = BossPhase.PHASE_3;
        } else if (healthRatio <= 0.7 && this.currentPhase < BossPhase.PHASE_2) {
            newPhase = BossPhase.PHASE_2;
        }
        
        if (newPhase !== this.currentPhase) {
            this.transitionToPhase(newPhase);
        }
    }
    
    protected transitionToPhase(newPhase: BossPhase) {
        const oldPhase = this.currentPhase;
        this.currentPhase = newPhase;
        
        // 페이즈 전환 이벤트
        TypedEventBus.getInstance().emit("BossPhaseChanged", {
            bossId: this.node.uuid,
            oldPhase: oldPhase,
            newPhase: newPhase,
            healthPercentage: (this.context.currentHealth / this.maxHealth) * 100
        });
        
        // 페이즈별 특수 효과
        this.onPhaseTransition(oldPhase, newPhase);
    }
    
    protected abstract setupPatterns(): void;
    protected abstract setupPhaseTransitions(): void;
    protected abstract onPhaseTransition(oldPhase: BossPhase, newPhase: BossPhase): void;
    protected abstract calculatePositioning(): AIAction;
}
```

### 3.2 구체적인 보스 구현 - "광기의 궁수 벨트람"

```typescript
// [의도] 게임의 첫 번째 보스인 벨트람의 구체적인 AI 구현
// [책임] 궁수 타입 보스의 독특한 패턴과 전술 제공

class BeltramBossAI extends BossAI {
    // 벨트람 전용 상태
    private arrowCount: number = 30; // 화살 개수
    private isReloading: boolean = false;
    private teleportCooldown: number = 0;
    
    protected setupPatterns() {
        // 1페이즈 패턴들
        this.patterns.set("basic_shot", new BasicShotPattern());
        this.patterns.set("triple_shot", new TripleShotPattern());
        this.patterns.set("jump_back", new JumpBackPattern());
        
        // 2페이즈 패턴들
        this.patterns.set("piercing_arrow", new PiercingArrowPattern());
        this.patterns.set("circle_shot", new CircleShotPattern());
        this.patterns.set("homing_arrow", new HomingArrowPattern());
        
        // 3페이즈 패턴들
        this.patterns.set("arrow_rain", new ArrowRainPattern());
        this.patterns.set("teleport_strike", new TeleportStrikePattern());
        this.patterns.set("shadow_clone", new ShadowClonePattern());
        
        // 분노 페이즈 패턴들
        this.patterns.set("desperate_barrage", new DesperateBarragePattern());
        this.patterns.set("final_shot", new FinalShotPattern());
    }
    
    protected setupPhaseTransitions() {
        // 페이즈 전환 시 특수 연출 설정
    }
    
    protected onPhaseTransition(oldPhase: BossPhase, newPhase: BossPhase) {
        switch (newPhase) {
            case BossPhase.PHASE_2:
                this.onEnterPhase2();
                break;
            case BossPhase.PHASE_3:
                this.onEnterPhase3();
                break;
            case BossPhase.ENRAGE:
                this.onEnterEnragePhase();
                break;
        }
    }
    
    private onEnterPhase2() {
        // 2페이즈 진입 연출
        this.isInvulnerable = true;
        
        // 특수 대사 및 이펙트
        this.playDialogue("phase2_enter");
        this.playEffect("dark_aura");
        
        // 3초 후 무적 해제
        this.scheduleOnce(() => {
            this.isInvulnerable = false;
        }, 3);
        
        // 공격 속도 증가
        this.difficultyScaler.increaseAttackSpeed(1.2);
    }
    
    private onEnterPhase3() {
        // 3페이즈 진입 - 순간이동 능력 해금
        this.teleportCooldown = 0;
        this.playDialogue("phase3_enter");
        this.playEffect("teleport_unlock");
        
        // 화살 재장전
        this.arrowCount = 50;
        this.difficultyScaler.increaseAttackSpeed(1.4);
    }
    
    private onEnterEnragePhase() {
        // 분노 페이즈 - 모든 능력 강화
        this.playDialogue("enrage_enter");
        this.playEffect("enrage_aura");
        
        this.difficultyScaler.increaseAttackSpeed(1.8);
        this.difficultyScaler.increaseDamage(1.5);
        
        // 화살 무제한
        this.arrowCount = -1; // -1은 무제한을 의미
    }
    
    protected calculatePositioning(): AIAction {
        // 플레이어와의 최적 거리 유지 (8-12 미터)
        const optimalDistance = 10;
        
        if (this.context.playerDistance < 6) {
            // 너무 가까우면 뒤로 이동
            return {
                type: "move_away",
                target: this.calculateRetreatPosition(),
                speed: 1.5
            };
        } else if (this.context.playerDistance > 15) {
            // 너무 멀면 다가가기
            return {
                type: "move_closer",
                target: this.context.playerPosition,
                speed: 1.0
            };
        }
        
        // 적당한 거리면 측면 이동
        return {
            type: "strafe",
            target: this.calculateStrafePosition(),
            speed: 1.2
        };
    }
    
    private calculateRetreatPosition(): Vec3 {
        const retreatDirection = this.node.worldPosition
            .subtract(this.context.playerPosition)
            .normalize();
        
        return this.node.worldPosition.add(retreatDirection.multiplyScalar(5));
    }
    
    private calculateStrafePosition(): Vec3 {
        const playerDir = this.context.playerPosition
            .subtract(this.node.worldPosition)
            .normalize();
        
        // 플레이어에 수직인 방향으로 이동
        const strafeDir = new Vec3(-playerDir.z, 0, playerDir.x);
        
        // 좌우 랜덤 선택
        if (Math.random() < 0.5) {
            strafeDir.multiplyScalar(-1);
        }
        
        return this.node.worldPosition.add(strafeDir.multiplyScalar(3));
    }
}

// 구체적인 보스 패턴 구현들
class BasicShotPattern implements BossPattern {
    readonly name = "basic_shot";
    readonly phase = BossPhase.PHASE_1;
    readonly cooldown = 1.5;
    readonly weight = 1.0;
    
    conditions(context: AIContext): boolean {
        return context.playerDistance <= 15;
    }
    
    canExecute(boss: BossAI, context: AIContext): boolean {
        return this.conditions(context) && boss.getArrowCount() > 0;
    }
    
    async execute(boss: BossAI, context: AIContext): Promise<void> {
        // 조준 애니메이션
        boss.playAnimation("aim", 0.3);
        await boss.wait(0.3);
        
        // 화살 발사
        const arrow = boss.createArrow();
        arrow.setTarget(context.playerPosition);
        arrow.setSpeed(20);
        arrow.setDamage(25);
        arrow.fire();
        
        boss.playSound("arrow_shot");
        boss.consumeArrow();
        
        // 후딜레이
        boss.playAnimation("shot_recovery", 0.4);
        await boss.wait(0.4);
    }
}

class ArrowRainPattern implements BossPattern {
    readonly name = "arrow_rain";
    readonly phase = BossPhase.PHASE_3;
    readonly cooldown = 8.0;
    readonly weight = 2.0;
    
    conditions(context: AIContext): boolean {
        return true; // 언제나 사용 가능
    }
    
    canExecute(boss: BossAI, context: AIContext): boolean {
        return boss.getArrowCount() >= 10;
    }
    
    async execute(boss: BossAI, context: AIContext): Promise<void> {
        // 화살비 예고 표시
        boss.playAnimation("arrow_rain_charge", 2.0);
        boss.playSound("arrow_rain_charge");
        
        // 플레이어 주변에 경고 표시
        const warningArea = boss.createWarningArea(context.playerPosition, 8);
        warningArea.show(2.0);
        
        await boss.wait(2.0);
        
        // 화살비 실행
        const arrowCount = 15;
        for (let i = 0; i < arrowCount; i++) {
            const randomOffset = new Vec3(
                (Math.random() - 0.5) * 16,
                0,
                (Math.random() - 0.5) * 16
            );
            
            const targetPos = context.playerPosition.add(randomOffset);
            
            // 하늘에서 떨어지는 화살
            const arrow = boss.createArrow();
            arrow.setStartPosition(targetPos.add(new Vec3(0, 20, 0)));
            arrow.setTarget(targetPos);
            arrow.setSpeed(15);
            arrow.setDamage(30);
            arrow.setGravity(true);
            arrow.fire();
            
            boss.consumeArrow();
            
            // 0.1초 간격으로 발사
            await boss.wait(0.1);
        }
        
        boss.playSound("arrow_rain_impact");
    }
}
```

---

## 4. 행동 트리 시스템

### 4.1 행동 트리 구조

```typescript
// [의도] 유연하고 확장 가능한 AI 행동 정의 시스템
// [책임] AI의 복잡한 의사결정을 트리 구조로 체계화

enum NodeType {
    COMPOSITE = "composite",    // 복합 노드 (Selector, Sequence)
    DECORATOR = "decorator",    // 데코레이터 노드 (Repeater, Inverter)
    LEAF = "leaf"              // 리프 노드 (Action, Condition)
}

enum NodeStatus {
    SUCCESS = "success",
    FAILURE = "failure", 
    RUNNING = "running"
}

abstract class BehaviorTreeNode {
    protected parent: BehaviorTreeNode | null = null;
    protected children: BehaviorTreeNode[] = [];
    
    abstract execute(context: AIContext): NodeStatus;
    abstract reset(): void;
    
    addChild(child: BehaviorTreeNode) {
        child.parent = this;
        this.children.push(child);
    }
    
    removeChild(child: BehaviorTreeNode) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }
}

// 선택자 노드 (OR 로직)
class SelectorNode extends BehaviorTreeNode {
    private currentChildIndex: number = 0;
    
    execute(context: AIContext): NodeStatus {
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const status = this.children[i].execute(context);
            
            if (status === NodeStatus.SUCCESS) {
                this.reset();
                return NodeStatus.SUCCESS;
            } else if (status === NodeStatus.RUNNING) {
                this.currentChildIndex = i;
                return NodeStatus.RUNNING;
            }
            // FAILURE인 경우 다음 자식으로 넘어감
        }
        
        this.reset();
        return NodeStatus.FAILURE;
    }
    
    reset() {
        this.currentChildIndex = 0;
        this.children.forEach(child => child.reset());
    }
}

// 시퀀스 노드 (AND 로직)
class SequenceNode extends BehaviorTreeNode {
    private currentChildIndex: number = 0;
    
    execute(context: AIContext): NodeStatus {
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const status = this.children[i].execute(context);
            
            if (status === NodeStatus.FAILURE) {
                this.reset();
                return NodeStatus.FAILURE;
            } else if (status === NodeStatus.RUNNING) {
                this.currentChildIndex = i;
                return NodeStatus.RUNNING;
            }
            // SUCCESS인 경우 다음 자식으로 넘어감
        }
        
        this.reset();
        return NodeStatus.SUCCESS;
    }
    
    reset() {
        this.currentChildIndex = 0;
        this.children.forEach(child => child.reset());
    }
}

// 조건 노드
abstract class ConditionNode extends BehaviorTreeNode {
    execute(context: AIContext): NodeStatus {
        return this.checkCondition(context) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
    }
    
    reset() {
        // 조건 노드는 상태가 없으므로 리셋할 것이 없음
    }
    
    abstract checkCondition(context: AIContext): boolean;
}

// 액션 노드
abstract class ActionNode extends BehaviorTreeNode {
    protected isRunning: boolean = false;
    
    execute(context: AIContext): NodeStatus {
        if (!this.isRunning) {
            this.startAction(context);
            this.isRunning = true;
        }
        
        const status = this.updateAction(context);
        
        if (status !== NodeStatus.RUNNING) {
            this.isRunning = false;
        }
        
        return status;
    }
    
    reset() {
        this.isRunning = false;
        this.onReset();
    }
    
    abstract startAction(context: AIContext): void;
    abstract updateAction(context: AIContext): NodeStatus;
    abstract onReset(): void;
}
```

### 4.2 구체적인 노드 구현들

```typescript
// [의도] 게임에서 실제 사용할 구체적인 행동 트리 노드들
// [책임] AI의 기본 행동들을 노드로 구현

// 플레이어가 시야에 있는지 확인
class IsPlayerVisibleCondition extends ConditionNode {
    checkCondition(context: AIContext): boolean {
        return context.playerVisible && context.playerDistance <= 15;
    }
}

// 플레이어가 공격 범위에 있는지 확인
class IsPlayerInRangeCondition extends ConditionNode {
    constructor(private range: number) {
        super();
    }
    
    checkCondition(context: AIContext): boolean {
        return context.playerDistance <= this.range;
    }
}

// 체력이 임계값 이하인지 확인
class IsHealthLowCondition extends ConditionNode {
    constructor(private threshold: number) {
        super();
    }
    
    checkCondition(context: AIContext): boolean {
        // AI 컨트롤러에서 최대 체력을 가져와야 함
        const maxHealth = 100; // 실제로는 AI에서 가져와야 함
        return (context.currentHealth / maxHealth) <= this.threshold;
    }
}

// 플레이어 추적 액션
class ChasePlayerAction extends ActionNode {
    private ai: AIController;
    private moveSpeed: number;
    
    constructor(ai: AIController, moveSpeed: number = 1.0) {
        super();
        this.ai = ai;
        this.moveSpeed = moveSpeed;
    }
    
    startAction(context: AIContext): void {
        // 추적 시작 애니메이션 또는 사운드
        this.ai.playAnimation("run");
    }
    
    updateAction(context: AIContext): NodeStatus {
        if (context.playerDistance <= 1.5) {
            return NodeStatus.SUCCESS; // 충분히 가까워짐
        }
        
        // 플레이어 방향으로 이동
        const direction = context.playerPosition
            .subtract(this.ai.node.worldPosition)
            .normalize();
        
        const movement = direction.multiplyScalar(this.moveSpeed * 0.016); // 60 FPS 기준
        this.ai.node.worldPosition = this.ai.node.worldPosition.add(movement);
        
        // 플레이어 방향으로 회전
        this.ai.node.lookAt(context.playerPosition);
        
        return NodeStatus.RUNNING;
    }
    
    onReset(): void {
        this.ai.playAnimation("idle");
    }
}

// 공격 액션
class AttackPlayerAction extends ActionNode {
    private ai: AIController;
    private attackDuration: number;
    private attackTimer: number = 0;
    
    constructor(ai: AIController, attackDuration: number = 1.0) {
        super();
        this.ai = ai;
        this.attackDuration = attackDuration;
    }
    
    startAction(context: AIContext): void {
        this.attackTimer = 0;
        this.ai.playAnimation("attack");
        this.ai.playSound("attack_sound");
        
        // 공격 판정 (실제로는 더 복잡한 로직 필요)
        if (context.playerDistance <= 2.5) {
            this.dealDamageToPlayer(50);
        }
    }
    
    updateAction(context: AIContext): NodeStatus {
        this.attackTimer += 0.016; // 델타타임 추정
        
        if (this.attackTimer >= this.attackDuration) {
            return NodeStatus.SUCCESS;
        }
        
        return NodeStatus.RUNNING;
    }
    
    onReset(): void {
        this.attackTimer = 0;
    }
    
    private dealDamageToPlayer(damage: number) {
        // 실제 데미지 처리 로직
        const player = PlayerManager.getInstance().getPlayer();
        const healthComponent = player.getComponent("HealthComponent");
        healthComponent?.takeDamage(damage);
    }
}

// 순찰 액션
class PatrolAction extends ActionNode {
    private ai: AIController;
    private patrolPoints: Vec3[] = [];
    private currentTargetIndex: number = 0;
    private patrolSpeed: number;
    
    constructor(ai: AIController, patrolPoints: Vec3[], patrolSpeed: number = 0.5) {
        super();
        this.ai = ai;
        this.patrolPoints = patrolPoints;
        this.patrolSpeed = patrolSpeed;
    }
    
    startAction(context: AIContext): void {
        this.ai.playAnimation("walk");
    }
    
    updateAction(context: AIContext): NodeStatus {
        if (this.patrolPoints.length === 0) {
            return NodeStatus.SUCCESS;
        }
        
        const targetPoint = this.patrolPoints[this.currentTargetIndex];
        const distance = Vec3.distance(this.ai.node.worldPosition, targetPoint);
        
        if (distance <= 1.0) {
            // 다음 순찰 지점으로
            this.currentTargetIndex = (this.currentTargetIndex + 1) % this.patrolPoints.length;
            
            if (this.currentTargetIndex === 0) {
                // 한 바퀴 완료
                return NodeStatus.SUCCESS;
            }
        }
        
        // 순찰 지점으로 이동
        const direction = targetPoint.subtract(this.ai.node.worldPosition).normalize();
        const movement = direction.multiplyScalar(this.patrolSpeed * 0.016);
        this.ai.node.worldPosition = this.ai.node.worldPosition.add(movement);
        
        this.ai.node.lookAt(targetPoint);
        
        return NodeStatus.RUNNING;
    }
    
    onReset(): void {
        this.currentTargetIndex = 0;
        this.ai.playAnimation("idle");
    }
}
```

### 4.3 행동 트리 빌더

```typescript
// [의도] 행동 트리를 쉽게 구성할 수 있는 빌더 패턴
// [책임] 복잡한 AI 행동을 직관적으로 정의할 수 있는 인터페이스 제공

class BehaviorTreeBuilder {
    private root: BehaviorTreeNode | null = null;
    private currentNode: BehaviorTreeNode | null = null;
    
    // 선택자 노드 시작
    selector(): BehaviorTreeBuilder {
        const selector = new SelectorNode();
        this.addNode(selector);
        return this;
    }
    
    // 시퀀스 노드 시작
    sequence(): BehaviorTreeBuilder {
        const sequence = new SequenceNode();
        this.addNode(sequence);
        return this;
    }
    
    // 조건 추가
    condition(conditionFn: (context: AIContext) => boolean): BehaviorTreeBuilder {
        const condition = new class extends ConditionNode {
            checkCondition(context: AIContext): boolean {
                return conditionFn(context);
            }
        };
        
        this.addNode(condition);
        return this;
    }
    
    // 액션 추가
    action(actionFn: {
        start: (context: AIContext) => void;
        update: (context: AIContext) => NodeStatus;
        reset?: () => void;
    }): BehaviorTreeBuilder {
        const action = new class extends ActionNode {
            startAction(context: AIContext): void {
                actionFn.start(context);
            }
            
            updateAction(context: AIContext): NodeStatus {
                return actionFn.update(context);
            }
            
            onReset(): void {
                if (actionFn.reset) {
                    actionFn.reset();
                }
            }
        };
        
        this.addNode(action);
        return this;
    }
    
    // 사전 정의된 조건들
    isPlayerVisible(): BehaviorTreeBuilder {
        return this.condition(context => context.playerVisible);
    }
    
    isPlayerInRange(range: number): BehaviorTreeBuilder {
        return this.condition(context => context.playerDistance <= range);
    }
    
    isHealthLow(threshold: number): BehaviorTreeBuilder {
        return this.condition(context => {
            const maxHealth = 100; // 실제로는 AI에서 가져와야 함
            return (context.currentHealth / maxHealth) <= threshold;
        });
    }
    
    // 그룹 종료
    end(): BehaviorTreeBuilder {
        if (this.currentNode && this.currentNode.parent) {
            this.currentNode = this.currentNode.parent;
        }
        return this;
    }
    
    // 트리 빌드
    build(): BehaviorTreeNode {
        return this.root!;
    }
    
    private addNode(node: BehaviorTreeNode) {
        if (!this.root) {
            this.root = node;
            this.currentNode = node;
        } else if (this.currentNode) {
            this.currentNode.addChild(node);
            this.currentNode = node;
        }
    }
}

// 사용 예시: 기본 적 AI 행동 트리
function createBasicEnemyBehaviorTree(ai: AIController): BehaviorTreeNode {
    return new BehaviorTreeBuilder()
        .selector()
            // 체력이 낮으면 도망
            .sequence()
                .isHealthLow(0.3)
                .action({
                    start: (context) => {
                        ai.playAnimation("flee");
                    },
                    update: (context) => {
                        // 도망 로직
                        const fleeDirection = ai.node.worldPosition
                            .subtract(context.playerPosition)
                            .normalize();
                        
                        const movement = fleeDirection.multiplyScalar(1.5 * 0.016);
                        ai.node.worldPosition = ai.node.worldPosition.add(movement);
                        
                        return context.playerDistance > 15 ? NodeStatus.SUCCESS : NodeStatus.RUNNING;
                    }
                })
            .end()
            
            // 플레이어가 가까이 있으면 공격
            .sequence()
                .isPlayerVisible()
                .isPlayerInRange(3)
                .action({
                    start: (context) => {
                        ai.playAnimation("attack");
                    },
                    update: (context) => {
                        // 공격 로직
                        return NodeStatus.SUCCESS;
                    }
                })
            .end()
            
            // 플레이어가 보이면 추적
            .sequence()
                .isPlayerVisible()
                .action({
                    start: (context) => {
                        ai.playAnimation("run");
                    },
                    update: (context) => {
                        // 추적 로직
                        const direction = context.playerPosition
                            .subtract(ai.node.worldPosition)
                            .normalize();
                        
                        const movement = direction.multiplyScalar(1.0 * 0.016);
                        ai.node.worldPosition = ai.node.worldPosition.add(movement);
                        
                        return context.playerDistance <= 3 ? NodeStatus.SUCCESS : NodeStatus.RUNNING;
                    }
                })
            .end()
            
            // 기본 순찰
            .action({
                start: (context) => {
                    ai.playAnimation("walk");
                },
                update: (context) => {
                    // 순찰 로직
                    return NodeStatus.RUNNING;
                }
            })
        .end()
        .build();
}
```

---

## 5. 적응형 난이도 시스템

### 5.1 플레이어 성능 추적

```typescript
// [의도] 플레이어의 게임 실력을 실시간으로 분석하는 시스템
// [책임] 다양한 게임플레이 지표를 수집하고 분석하여 적응형 난이도 조절의 기초 데이터 제공

interface PerformanceMetrics {
    // 생존 관련
    deathCount: number;
    timeSinceLastDeath: number;
    averageHealthRatio: number;
    
    // 전투 관련
    dodgeSuccessRate: number;
    parrySuccessRate: number;
    hitAccuracy: number;
    averageReactionTime: number;
    
    // 진행 관련
    stageCompletionTime: number;
    retryCount: number;
    
    // 고급 지표
    comboContinuity: number;
    resourceManagement: number; // 아이템, 스태미나 효율성
    explorationRate: number;    // 숨겨진 아이템 발견율
}

class PlayerPerformanceTracker extends Component {
    private metrics: PerformanceMetrics;
    private recentActions: PlayerAction[] = [];
    private performanceHistory: PerformanceSnapshot[] = [];
    
    private readonly ACTION_HISTORY_SIZE = 100;
    private readonly PERFORMANCE_SNAPSHOT_INTERVAL = 30; // 30초마다
    
    protected onLoad() {
        this.initializeMetrics();
        this.setupEventListeners();
    }
    
    private initializeMetrics() {
        this.metrics = {
            deathCount: 0,
            timeSinceLastDeath: 0,
            averageHealthRatio: 1.0,
            dodgeSuccessRate: 0.5,
            parrySuccessRate: 0.3,
            hitAccuracy: 0.6,
            averageReactionTime: 0.5,
            stageCompletionTime: 0,
            retryCount: 0,
            comboContinuity: 0.4,
            resourceManagement: 0.7,
            explorationRate: 0.5
        };
    }
    
    private setupEventListeners() {
        const eventBus = TypedEventBus.getInstance();
        
        eventBus.on("PlayerDied", () => {
            this.onPlayerDeath();
        });
        
        eventBus.on("DodgeExecuted", (data) => {
            this.recordDodgeAttempt(data.successful);
        });
        
        eventBus.on("ParryExecuted", (data) => {
            this.recordParryAttempt(data.successful);
        });
        
        eventBus.on("AttackHit", (data) => {
            this.recordAttackHit(data.hit);
        });
        
        eventBus.on("StageCompleted", (data) => {
            this.onStageCompleted(data.completionTime);
        });
    }
    
    update(context: AIContext, deltaTime: number) {
        this.metrics.timeSinceLastDeath += deltaTime;
        this.updateHealthRatio(context.playerHealth / 100); // 최대 체력 100 가정
        this.analyzeRecentActions();
        
        // 주기적 성능 스냅샷
        if (this.shouldTakeSnapshot()) {
            this.takePerformanceSnapshot();
        }
    }
    
    private onPlayerDeath() {
        this.metrics.deathCount++;
        this.metrics.timeSinceLastDeath = 0;
        this.metrics.retryCount++;
        
        // 연속 사망에 대한 패널티
        if (this.metrics.timeSinceLastDeath < 60) { // 1분 이내 재사망
            this.adjustMetricsForQuickDeath();
        }
    }
    
    private recordDodgeAttempt(successful: boolean) {
        const recentDodges = this.recentActions
            .filter(action => action.type === "dodge" && 
                   Date.now() - action.timestamp < 30000); // 최근 30초
        
        const successCount = recentDodges.filter(action => action.successful).length;
        const totalCount = recentDodges.length + 1;
        
        this.metrics.dodgeSuccessRate = (successCount + (successful ? 1 : 0)) / totalCount;
        
        this.recentActions.push({
            type: "dodge",
            successful: successful,
            timestamp: Date.now()
        });
    }
    
    private recordParryAttempt(successful: boolean) {
        // 패링 성공률 계산 (회피와 유사한 로직)
        const recentParries = this.recentActions
            .filter(action => action.type === "parry" && 
                   Date.now() - action.timestamp < 30000);
        
        const successCount = recentParries.filter(action => action.successful).length;
        const totalCount = recentParries.length + 1;
        
        this.metrics.parrySuccessRate = (successCount + (successful ? 1 : 0)) / totalCount;
        
        this.recentActions.push({
            type: "parry",
            successful: successful,
            timestamp: Date.now()
        });
    }
    
    private recordAttackHit(hit: boolean) {
        const recentAttacks = this.recentActions
            .filter(action => action.type === "attack" && 
                   Date.now() - action.timestamp < 30000);
        
        const hitCount = recentAttacks.filter(action => action.successful).length;
        const totalCount = recentAttacks.length + 1;
        
        this.metrics.hitAccuracy = (hitCount + (hit ? 1 : 0)) / totalCount;
        
        this.recentActions.push({
            type: "attack",
            successful: hit,
            timestamp: Date.now()
        });
    }
    
    private analyzeRecentActions() {
        // 반응 시간 분석
        this.analyzeReactionTime();
        
        // 콤보 지속성 분석
        this.analyzeComboContinuity();
        
        // 리소스 관리 분석
        this.analyzeResourceManagement();
    }
    
    private analyzeReactionTime() {
        // 위험 상황에서의 반응 시간 측정
        const recentDodges = this.recentActions
            .filter(action => action.type === "dodge")
            .slice(-10); // 최근 10회
        
        if (recentDodges.length > 0) {
            // 실제로는 적의 공격 시작부터 회피까지의 시간을 측정해야 함
            // 여기서는 간소화된 버전
            let totalReactionTime = 0;
            recentDodges.forEach(dodge => {
                totalReactionTime += dodge.reactionTime || 0.5; // 기본값
            });
            
            this.metrics.averageReactionTime = totalReactionTime / recentDodges.length;
        }
    }
    
    private analyzeComboContinuity() {
        // 연속 공격의 지속성 분석
        const recentCombos = this.getRecentComboData();
        
        if (recentCombos.length > 0) {
            const averageComboLength = recentCombos.reduce((sum, combo) => sum + combo.length, 0) / recentCombos.length;
            this.metrics.comboContinuity = Math.min(1.0, averageComboLength / 10); // 10콤보를 최대로 가정
        }
    }
    
    private analyzeResourceManagement() {
        // 체력, 스태미나, 아이템 사용 효율성 분석
        const player = PlayerManager.getInstance().getPlayer();
        const healthComponent = player.getComponent("HealthComponent");
        const staminaComponent = player.getComponent("StaminaComponent");
        
        // 체력 유지 능력
        const healthEfficiency = healthComponent.getCurrentHealth() / healthComponent.getMaxHealth();
        
        // 스태미나 관리 능력 (스태미나 고갈 빈도)
        const staminaEfficiency = 1.0 - (staminaComponent.getExhaustionCount() / 100); // 최근 100회 중 고갈 횟수
        
        this.metrics.resourceManagement = (healthEfficiency + staminaEfficiency) / 2;
    }
    
    // 성능 점수 계산 (0-1 범위)
    calculateOverallPerformance(): number {
        const weights = {
            survival: 0.3,      // 생존 능력
            combat: 0.4,        // 전투 능력  
            efficiency: 0.3     // 효율성
        };
        
        // 생존 점수
        const survivalScore = Math.min(1.0, 300 / (this.metrics.deathCount + 1)) * 
                             Math.min(1.0, this.metrics.averageHealthRatio + 0.2);
        
        // 전투 점수
        const combatScore = (
            this.metrics.dodgeSuccessRate * 0.3 +
            this.metrics.parrySuccessRate * 0.2 +
            this.metrics.hitAccuracy * 0.3 +
            (1.0 - Math.min(1.0, this.metrics.averageReactionTime)) * 0.2
        );
        
        // 효율성 점수
        const efficiencyScore = (
            this.metrics.comboContinuity * 0.4 +
            this.metrics.resourceManagement * 0.4 +
            this.metrics.explorationRate * 0.2
        );
        
        return survivalScore * weights.survival +
               combatScore * weights.combat +
               efficiencyScore * weights.efficiency;
    }
    
    getCurrentPerformance(): PerformanceMetrics {
        return { ...this.metrics };
    }
}

interface PlayerAction {
    type: string;
    successful: boolean;
    timestamp: number;
    reactionTime?: number;
}

interface PerformanceSnapshot {
    timestamp: number;
    overallScore: number;
    metrics: PerformanceMetrics;
}
```

### 5.2 동적 난이도 조절

```typescript
// [의도] 플레이어 성능에 따라 실시간으로 게임 난이도를 조절
// [책임] 적절한 도전 수준을 유지하여 최적의 게임 경험 제공

class DynamicDifficultySystem extends Component {
    private static instance: DynamicDifficultySystem;
    
    private performanceTracker: PlayerPerformanceTracker;
    private currentDifficultyLevel: number = 1.0; // 1.0 = 기본 난이도
    private targetDifficultyLevel: number = 1.0;
    
    private difficultyModifiers: DifficultyModifiers = {
        enemyHealthMultiplier: 1.0,
        enemyDamageMultiplier: 1.0,
        enemySpeedMultiplier: 1.0,
        enemyAccuracyMultiplier: 1.0,
        playerDamageMultiplier: 1.0,
        dropRateMultiplier: 1.0
    };
    
    private adjustmentCooldown: number = 0;
    private readonly ADJUSTMENT_INTERVAL = 15; // 15초마다 조정
    private readonly MAX_ADJUSTMENT_PER_CYCLE = 0.1; // 한 번에 최대 10% 조정
    
    static getInstance(): DynamicDifficultySystem {
        return DynamicDifficultySystem.instance;
    }
    
    protected onLoad() {
        this.performanceTracker = this.getComponent(PlayerPerformanceTracker);
    }
    
    protected update(deltaTime: number) {
        this.adjustmentCooldown -= deltaTime;
        
        if (this.adjustmentCooldown <= 0) {
            this.evaluateAndAdjustDifficulty();
            this.adjustmentCooldown = this.ADJUSTMENT_INTERVAL;
        }
        
        // 목표 난이도로 점진적 조정
        this.smoothDifficultyTransition(deltaTime);
    }
    
    private evaluateAndAdjustDifficulty() {
        const performance = this.performanceTracker.calculateOverallPerformance();
        const idealPerformance = 0.65; // 목표 성능 (65%)
        
        const performanceDelta = performance - idealPerformance;
        
        // 성능이 목표보다 높으면 난이도 증가, 낮으면 감소
        if (Math.abs(performanceDelta) > 0.1) { // 10% 이상 차이날 때만 조정
            const adjustment = -performanceDelta * 0.5; // 50% 비율로 조정
            this.targetDifficultyLevel += Math.sign(adjustment) * 
                Math.min(Math.abs(adjustment), this.MAX_ADJUSTMENT_PER_CYCLE);
            
            // 난이도 범위 제한 (0.3 ~ 2.0)
            this.targetDifficultyLevel = Math.max(0.3, Math.min(2.0, this.targetDifficultyLevel));
            
            console.log(`Difficulty adjustment: Performance=${performance.toFixed(2)}, Target=${this.targetDifficultyLevel.toFixed(2)}`);
        }
    }
    
    private smoothDifficultyTransition(deltaTime: number) {
        if (Math.abs(this.currentDifficultyLevel - this.targetDifficultyLevel) > 0.01) {
            const adjustmentSpeed = 0.5; // 초당 0.5씩 조정
            const direction = Math.sign(this.targetDifficultyLevel - this.currentDifficultyLevel);
            
            this.currentDifficultyLevel += direction * adjustmentSpeed * deltaTime;
            
            // 타겟에 도달했는지 확인
            if ((direction > 0 && this.currentDifficultyLevel >= this.targetDifficultyLevel) ||
                (direction < 0 && this.currentDifficultyLevel <= this.targetDifficultyLevel)) {
                this.currentDifficultyLevel = this.targetDifficultyLevel;
            }
            
            this.updateDifficultyModifiers();
        }
    }
    
    private updateDifficultyModifiers() {
        const difficultyFactor = this.currentDifficultyLevel;
        
        // 적 능력치 조정
        this.difficultyModifiers.enemyHealthMultiplier = 0.7 + (difficultyFactor * 0.6); // 0.7 ~ 1.9
        this.difficultyModifiers.enemyDamageMultiplier = 0.5 + (difficultyFactor * 0.7); // 0.5 ~ 1.9
        this.difficultyModifiers.enemySpeedMultiplier = 0.8 + (difficultyFactor * 0.4);   // 0.8 ~ 1.6
        this.difficultyModifiers.enemyAccuracyMultiplier = 0.6 + (difficultyFactor * 0.6); // 0.6 ~ 1.8
        
        // 플레이어 지원 조정 (난이도가 낮을 때 더 강하게)
        this.difficultyModifiers.playerDamageMultiplier = 2.0 - (difficultyFactor * 0.7); // 1.3 ~ 2.0
        this.difficultyModifiers.dropRateMultiplier = 3.0 - (difficultyFactor * 1.5);     // 1.5 ~ 3.0
        
        // 변경 사항을 다른 시스템에 알림
        TypedEventBus.getInstance().emit("DifficultyAdjusted", {
            newLevel: this.currentDifficultyLevel,
            modifiers: this.difficultyModifiers
        });
    }
    
    // 특수 상황에 대한 즉시 조정
    onPlayerStuck() {
        // 플레이어가 같은 곳에서 여러 번 죽으면 즉시 난이도 하락
        this.targetDifficultyLevel = Math.max(0.3, this.targetDifficultyLevel - 0.2);
        console.log("Player appears stuck, reducing difficulty");
    }
    
    onPlayerDominant() {
        // 플레이어가 너무 쉽게 진행하면 난이도 상승
        this.targetDifficultyLevel = Math.min(2.0, this.targetDifficultyLevel + 0.15);
        console.log("Player is dominating, increasing difficulty");
    }
    
    // 현재 난이도 수정자 반환
    getDifficultyModifiers(): DifficultyModifiers {
        return { ...this.difficultyModifiers };
    }
    
    getCurrentDifficultyLevel(): number {
        return this.currentDifficultyLevel;
    }
    
    // 수동 난이도 설정 (치트 또는 테스트용)
    setDifficultyLevel(level: number) {
        this.targetDifficultyLevel = Math.max(0.3, Math.min(2.0, level));
    }
}

interface DifficultyModifiers {
    enemyHealthMultiplier: number;
    enemyDamageMultiplier: number;
    enemySpeedMultiplier: number;
    enemyAccuracyMultiplier: number;
    playerDamageMultiplier: number;
    dropRateMultiplier: number;
}
```

---

## 6. AI 기반 콘텐츠 생성

### 6.1 AI 기반 보스 패턴 생성

```typescript
// [의도] AI를 활용하여 새로운 보스 패턴을 동적으로 생성
// [책임] 기존 패턴을 기반으로 변형된 새로운 패턴 창조

interface PatternTemplate {
    basePattern: string;
    variations: PatternVariation[];
    constraints: PatternConstraints;
    difficultyRange: { min: number; max: number };
}

interface PatternVariation {
    parameter: string;
    minValue: number;
    maxValue: number;
    step: number;
}

interface PatternConstraints {
    maxDamage: number;
    minCooldown: number;
    maxDuration: number;
    requiredAnimations: string[];
}

class AIPatternGenerator extends Component {
    private patternTemplates: Map<string, PatternTemplate> = new Map();
    private generatedPatterns: Map<string, BossPattern> = new Map();
    private patternEvaluator: PatternEvaluator;
    
    protected onLoad() {
        this.patternEvaluator = new PatternEvaluator();
        this.setupPatternTemplates();
    }
    
    private setupPatternTemplates() {
        // 기본 사격 패턴 템플릿
        this.patternTemplates.set("projectile_attack", {
            basePattern: "projectile_attack",
            variations: [
                { parameter: "projectileCount", minValue: 1, maxValue: 5, step: 1 },
                { parameter: "spreadAngle", minValue: 0, maxValue: 90, step: 15 },
                { parameter: "projectileSpeed", minValue: 10, maxValue: 30, step: 5 },
                { parameter: "damage", minValue: 20, maxValue: 60, step: 10 }
            ],
            constraints: {
                maxDamage: 80,
                minCooldown: 1.0,
                maxDuration: 3.0,
                requiredAnimations: ["aim", "shoot"]
            },
            difficultyRange: { min: 0.5, max: 2.0 }
        });
        
        // 텔레포트 공격 패턴 템플릿
        this.patternTemplates.set("teleport_attack", {
            basePattern: "teleport_attack",
            variations: [
                { parameter: "teleportCount", minValue: 1, maxValue: 3, step: 1 },
                { parameter: "attackDelay", minValue: 0.2, maxValue: 1.0, step: 0.2 },
                { parameter: "teleportRange", minValue: 5, maxValue: 15, step: 2 },
                { parameter: "damage", minValue: 30, maxValue: 80, step: 10 }
            ],
            constraints: {
                maxDamage: 100,
                minCooldown: 3.0,
                maxDuration: 5.0,
                requiredAnimations: ["teleport_out", "teleport_in", "attack"]
            },
            difficultyRange: { min: 1.0, max: 2.5 }
        });
    }
    
    // 새로운 패턴 생성
    generatePattern(templateName: string, targetDifficulty: number): BossPattern | null {
        const template = this.patternTemplates.get(templateName);
        if (!template) return null;
        
        // 난이도 범위 확인
        if (targetDifficulty < template.difficultyRange.min || 
            targetDifficulty > template.difficultyRange.max) {
            return null;
        }
        
        // 변형 매개변수 생성
        const patternParams = this.generatePatternParameters(template, targetDifficulty);
        
        // 패턴 생성
        const generatedPattern = this.createPatternFromTemplate(template, patternParams);
        
        // 품질 평가
        const quality = this.patternEvaluator.evaluatePattern(generatedPattern, targetDifficulty);
        
        if (quality.score >= 0.7) { // 70% 이상 품질
            const patternId = `generated_${templateName}_${Date.now()}`;
            this.generatedPatterns.set(patternId, generatedPattern);
            return generatedPattern;
        }
        
        return null;
    }
    
    private generatePatternParameters(template: PatternTemplate, targetDifficulty: number): Map<string, number> {
        const params = new Map<string, number>();
        
        template.variations.forEach(variation => {
            // 난이도에 따른 매개변수 조정
            const difficultyRatio = (targetDifficulty - template.difficultyRange.min) / 
                                   (template.difficultyRange.max - template.difficultyRange.min);
            
            let value: number;
            
            if (variation.parameter.includes("damage") || 
                variation.parameter.includes("count") ||
                variation.parameter.includes("speed")) {
                // 데미지, 개수, 속도는 난이도에 비례
                value = variation.minValue + (variation.maxValue - variation.minValue) * difficultyRatio;
            } else if (variation.parameter.includes("delay") || 
                      variation.parameter.includes("cooldown")) {
                // 딜레이, 쿨다운은 난이도에 반비례
                value = variation.maxValue - (variation.maxValue - variation.minValue) * difficultyRatio;
            } else {
                // 기타 매개변수는 랜덤
                value = variation.minValue + Math.random() * (variation.maxValue - variation.minValue);
            }
            
            // 스텝에 맞춰 반올림
            value = Math.round(value / variation.step) * variation.step;
            value = Math.max(variation.minValue, Math.min(variation.maxValue, value));
            
            params.set(variation.parameter, value);
        });
        
        return params;
    }
    
    private createPatternFromTemplate(template: PatternTemplate, params: Map<string, number>): BossPattern {
        switch (template.basePattern) {
            case "projectile_attack":
                return this.createProjectileAttackPattern(params);
            case "teleport_attack":
                return this.createTeleportAttackPattern(params);
            default:
                throw new Error(`Unknown pattern template: ${template.basePattern}`);
        }
    }
    
    private createProjectileAttackPattern(params: Map<string, number>): BossPattern {
        const projectileCount = params.get("projectileCount") || 1;
        const spreadAngle = params.get("spreadAngle") || 0;
        const projectileSpeed = params.get("projectileSpeed") || 20;
        const damage = params.get("damage") || 30;
        
        return {
            name: `generated_projectile_${projectileCount}_${spreadAngle}`,
            phase: BossPhase.PHASE_1,
            cooldown: Math.max(1.0, 3.0 - (projectileCount * 0.5)),
            weight: 1.0,
            
            conditions: (context: AIContext) => {
                return context.playerDistance <= 15 && context.playerVisible;
            },
            
            canExecute: (boss: BossAI, context: AIContext) => {
                return this.conditions(context);
            },
            
            execute: async (boss: BossAI, context: AIContext) => {
                // 조준 애니메이션
                boss.playAnimation("aim", 0.5);
                await boss.wait(0.5);
                
                // 발사체 생성 및 발사
                const angleStep = projectileCount > 1 ? spreadAngle / (projectileCount - 1) : 0;
                const startAngle = -spreadAngle / 2;
                
                for (let i = 0; i < projectileCount; i++) {
                    const angle = startAngle + (i * angleStep);
                    const direction = this.calculateDirectionWithAngle(
                        context.playerPosition.subtract(boss.node.worldPosition), 
                        angle
                    );
                    
                    const projectile = boss.createProjectile();
                    projectile.setDirection(direction);
                    projectile.setSpeed(projectileSpeed);
                    projectile.setDamage(damage);
                    projectile.fire();
                    
                    // 연속 발사 간격
                    if (i < projectileCount - 1) {
                        await boss.wait(0.1);
                    }
                }
                
                boss.playSound("projectile_attack");
            }
        };
    }
    
    // 패턴 품질 평가 및 학습
    updatePatternPerformance(patternId: string, performanceData: PatternPerformanceData) {
        const pattern = this.generatedPatterns.get(patternId);
        if (!pattern) return;
        
        // 패턴 성능 데이터 기록
        this.patternEvaluator.recordPerformance(pattern, performanceData);
        
        // 성능이 좋지 않은 패턴은 제거
        if (performanceData.playerSatisfaction < 0.3) {
            this.generatedPatterns.delete(patternId);
            console.log(`Removed low-quality pattern: ${patternId}`);
        }
    }
}

class PatternEvaluator {
    private performanceHistory: Map<string, PatternPerformanceData[]> = new Map();
    
    evaluatePattern(pattern: BossPattern, targetDifficulty: number): PatternQuality {
        let score = 0.5; // 기본 점수
        
        // 난이도 적합성 평가
        const estimatedDifficulty = this.estimatePatternDifficulty(pattern);
        const difficultyMatch = 1 - Math.abs(estimatedDifficulty - targetDifficulty) / 2;
        score += difficultyMatch * 0.3;
        
        // 패턴 복잡성 평가
        const complexity = this.evaluatePatternComplexity(pattern);
        score += complexity * 0.2;
        
        // 유니크성 평가 (기존 패턴과 얼마나 다른가)
        const uniqueness = this.evaluatePatternUniqueness(pattern);
        score += uniqueness * 0.3;
        
        // 실행 가능성 평가
        const feasibility = this.evaluatePatternFeasibility(pattern);
        score += feasibility * 0.2;
        
        return {
            score: Math.max(0, Math.min(1, score)),
            estimatedDifficulty: estimatedDifficulty,
            complexity: complexity,
            uniqueness: uniqueness,
            feasibility: feasibility
        };
    }
    
    private estimatePatternDifficulty(pattern: BossPattern): number {
        // 패턴의 예상 난이도를 계산
        // 실제로는 더 복잡한 분석이 필요
        return 1.0; // 임시 구현
    }
    
    recordPerformance(pattern: BossPattern, performance: PatternPerformanceData) {
        if (!this.performanceHistory.has(pattern.name)) {
            this.performanceHistory.set(pattern.name, []);
        }
        
        this.performanceHistory.get(pattern.name)!.push(performance);
        
        // 최근 10회 성능만 유지
        const history = this.performanceHistory.get(pattern.name)!;
        if (history.length > 10) {
            history.shift();
        }
    }
}

interface PatternQuality {
    score: number;
    estimatedDifficulty: number;
    complexity: number;
    uniqueness: number;
    feasibility: number;
}

interface PatternPerformanceData {
    playerSatisfaction: number;     // 0-1, 플레이어 만족도
    completionTime: number;         // 패턴 완료 시간
    playerDamageReceived: number;   // 플레이어가 받은 데미지
    dodgeAttempts: number;         // 회피 시도 횟수
    successfulDodges: number;      // 성공한 회피 횟수
}
```

---

## 7. 성능 최적화

### 7.1 AI 성능 최적화

```typescript
// [의도] AI 시스템의 성능을 최적화하여 부드러운 게임플레이 보장
// [책임] CPU 부하 분산, 메모리 사용량 최적화, 불필요한 계산 제거

class AIPerformanceOptimizer extends Component {
    private static instance: AIPerformanceOptimizer;
    
    private aiUpdateBudget: number = 5; // 프레임당 최대 AI 업데이트 수
    private aiUpdateQueue: AIController[] = [];
    private currentUpdateIndex: number = 0;
    
    // LOD (Level of Detail) 시스템
    private lodDistances = {
        HIGH: 10,    // 10미터 이내: 전체 AI 실행
        MEDIUM: 25,  // 25미터 이내: 간소화된 AI
        LOW: 50,     // 50미터 이내: 최소한의 AI
        DISABLED: 100 // 100미터 이상: AI 비활성화
    };
    
    static getInstance(): AIPerformanceOptimizer {
        return AIPerformanceOptimizer.instance;
    }
    
    // AI 등록
    registerAI(ai: AIController) {
        this.aiUpdateQueue.push(ai);
        this.sortAIByPriority();
    }
    
    // AI 제거
    unregisterAI(ai: AIController) {
        const index = this.aiUpdateQueue.indexOf(ai);
        if (index !== -1) {
            this.aiUpdateQueue.splice(index, 1);
            
            // 현재 인덱스 조정
            if (this.currentUpdateIndex > index) {
                this.currentUpdateIndex--;
            }
        }
    }
    
    protected update(deltaTime: number) {
        this.distributeAIUpdates(deltaTime);
        this.manageLOD();
        
        // 주기적으로 우선순위 재정렬
        if (Math.random() < 0.01) { // 1% 확률로
            this.sortAIByPriority();
        }
    }
    
    private distributeAIUpdates(deltaTime: number) {
        let updatesThisFrame = 0;
        const totalAIs = this.aiUpdateQueue.length;
        
        if (totalAIs === 0) return;
        
        while (updatesThisFrame < this.aiUpdateBudget && updatesThisFrame < totalAIs) {
            const ai = this.aiUpdateQueue[this.currentUpdateIndex];
            
            if (ai && ai.node && ai.node.active) {
                const lodLevel = this.calculateLOD(ai);
                
                if (lodLevel !== LODLevel.DISABLED) {
                    this.updateAIWithLOD(ai, deltaTime, lodLevel);
                    updatesThisFrame++;
                }
            }
            
            this.currentUpdateIndex = (this.currentUpdateIndex + 1) % totalAIs;
        }
    }
    
    private calculateLOD(ai: AIController): LODLevel {
        const player = PlayerManager.getInstance().getPlayer();
        const distance = Vec3.distance(ai.node.worldPosition, player.worldPosition);
        
        if (distance <= this.lodDistances.HIGH) {
            return LODLevel.HIGH;
        } else if (distance <= this.lodDistances.MEDIUM) {
            return LODLevel.MEDIUM;
        } else if (distance <= this.lodDistances.LOW) {
            return LODLevel.LOW;
        } else {
            return LODLevel.DISABLED;
        }
    }
    
    private updateAIWithLOD(ai: AIController, deltaTime: number, lodLevel: LODLevel) {
        switch (lodLevel) {
            case LODLevel.HIGH:
                // 전체 AI 로직 실행
                ai.updateAI(deltaTime);
                break;
                
            case LODLevel.MEDIUM:
                // 간소화된 AI 로직 (일부 기능 스킵)
                ai.updateAISimplified(deltaTime);
                break;
                
            case LODLevel.LOW:
                // 최소한의 AI 로직 (기본 상태만 업데이트)
                ai.updateAIMinimal(deltaTime);
                break;
                
            case LODLevel.DISABLED:
                // AI 비활성화
                ai.pauseAI();
                break;
        }
    }
    
    private sortAIByPriority() {
        const player = PlayerManager.getInstance().getPlayer();
        
        this.aiUpdateQueue.sort((a, b) => {
            // 거리 기반 우선순위
            const distanceA = Vec3.distance(a.node.worldPosition, player.worldPosition);
            const distanceB = Vec3.distance(b.node.worldPosition, player.worldPosition);
            
            // AI 타입별 우선순위
            const priorityA = this.getAIPriority(a.getAIType());
            const priorityB = this.getAIPriority(b.getAIType());
            
            // 우선순위가 다르면 우선순위 우선, 같으면 거리 우선
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // 높은 우선순위 먼저
            }
            
            return distanceA - distanceB; // 가까운 거리 먼저
        });
    }
    
    private getAIPriority(aiType: AIType): number {
        switch (aiType) {
            case AIType.BOSS: return 10;
            case AIType.ELITE_ENEMY: return 5;
            case AIType.BASIC_ENEMY: return 1;
            case AIType.ENVIRONMENTAL: return 0;
            default: return 0;
        }
    }
    
    // 성능 통계
    getPerformanceStats(): AIPerformanceStats {
        return {
            activeAICount: this.aiUpdateQueue.length,
            aiUpdateBudget: this.aiUpdateBudget,
            currentUpdateIndex: this.currentUpdateIndex,
            lodDistribution: this.calculateLODDistribution()
        };
    }
    
    private calculateLODDistribution(): { [key: string]: number } {
        const distribution = {
            [LODLevel.HIGH]: 0,
            [LODLevel.MEDIUM]: 0,
            [LODLevel.LOW]: 0,
            [LODLevel.DISABLED]: 0
        };
        
        this.aiUpdateQueue.forEach(ai => {
            const lod = this.calculateLOD(ai);
            distribution[lod]++;
        });
        
        return distribution;
    }
}

enum LODLevel {
    HIGH = "high",
    MEDIUM = "medium", 
    LOW = "low",
    DISABLED = "disabled"
}

interface AIPerformanceStats {
    activeAICount: number;
    aiUpdateBudget: number;
    currentUpdateIndex: number;
    lodDistribution: { [key: string]: number };
}

// AI 컨트롤러 기본 클래스에 LOD 메서드 추가
abstract class OptimizedAIController extends AIController {
    private lodLevel: LODLevel = LODLevel.HIGH;
    private isPaused: boolean = false;
    
    // 전체 AI 업데이트 (기존)
    abstract updateAI(deltaTime: number): void;
    
    // 간소화된 AI 업데이트
    updateAISimplified(deltaTime: number): void {
        // 기본 상태 업데이트만 수행
        this.updateBasicState(deltaTime);
        
        // 복잡한 의사결정 스킵
        if (this.currentState === AIState.COMBAT) {
            this.executeSimpleCombat(deltaTime);
        }
    }
    
    // 최소한의 AI 업데이트
    updateAIMinimal(deltaTime: number): void {
        // 상태만 유지, 실제 행동 없음
        this.updateBasicState(deltaTime);
    }
    
    // AI 일시정지
    pauseAI(): void {
        this.isPaused = true;
        // 애니메이션도 일시정지
        const animator = this.getComponent(AnimationController);
        if (animator) {
            animator.pause();
        }
    }
    
    // AI 재개
    resumeAI(): void {
        this.isPaused = false;
        const animator = this.getComponent(AnimationController);
        if (animator) {
            animator.resume();
        }
    }
    
    protected updateBasicState(deltaTime: number) {
        // 기본 상태 전환 로직만 수행
        if (this.context.playerDistance <= this.detectionRange) {
            if (this.currentState === AIState.IDLE || this.currentState === AIState.PATROL) {
                this.changeState(AIState.ALERT);
            }
        }
    }
    
    protected executeSimpleCombat(deltaTime: number) {
        // 간소화된 전투 로직
        if (this.context.playerDistance <= this.attackRange) {
            // 기본 공격만 수행
            this.executeBasicAttack();
        } else {
            // 단순히 플레이어 방향으로 이동
            this.moveTowardsPlayer(deltaTime);
        }
    }
}
```

### 7.2 메모리 최적화

```typescript
// [의도] AI 시스템의 메모리 사용량을 최적화
// [책임] 메모리 누수 방지, 오브젝트 풀링, 가비지 컬렉션 최소화

class AIMemoryManager extends Component {
    private static instance: AIMemoryManager;
    
    // 오브젝트 풀들
    private behaviorTreeNodePool: ObjectPool<BehaviorTreeNode>;
    private aiContextPool: ObjectPool<AIContext>;
    private actionPool: ObjectPool<AIAction>;
    
    // 메모리 사용량 추적
    private memoryUsage: MemoryUsageStats = {
        behaviorTrees: 0,
        aiContexts: 0,
        actions: 0,
        total: 0
    };
    
    static getInstance(): AIMemoryManager {
        return AIMemoryManager.instance;
    }
    
    protected onLoad() {
        this.initializeObjectPools();
        this.setupMemoryMonitoring();
    }
    
    private initializeObjectPools() {
        // 행동 트리 노드 풀
        this.behaviorTreeNodePool = new ObjectPool<BehaviorTreeNode>(
            () => this.createBehaviorTreeNode(),
            (node) => this.resetBehaviorTreeNode(node),
            50, // 초기 크기
            200 // 최대 크기
        );
        
        // AI 컨텍스트 풀
        this.aiContextPool = new ObjectPool<AIContext>(
            () => this.createAIContext(),
            (context) => this.resetAIContext(context),
            20,
            100
        );
        
        // 액션 풀
        this.actionPool = new ObjectPool<AIAction>(
            () => this.createAIAction(),
            (action) => this.resetAIAction(action),
            30,
            150
        );
    }
    
    // 행동 트리 노드 대여
    borrowBehaviorTreeNode<T extends BehaviorTreeNode>(nodeType: new() => T): T {
        const node = this.behaviorTreeNodePool.borrow() as T;
        this.memoryUsage.behaviorTrees++;
        return node;
    }
    
    // 행동 트리 노드 반납
    returnBehaviorTreeNode(node: BehaviorTreeNode) {
        this.behaviorTreeNodePool.return(node);
        this.memoryUsage.behaviorTrees--;
    }
    
    // AI 컨텍스트 대여
    borrowAIContext(): AIContext {
        const context = this.aiContextPool.borrow();
        this.memoryUsage.aiContexts++;
        return context;
    }
    
    // AI 컨텍스트 반납
    returnAIContext(context: AIContext) {
        this.aiContextPool.return(context);
        this.memoryUsage.aiContexts--;
    }
    
    // 액션 대여
    borrowAIAction(): AIAction {
        const action = this.actionPool.borrow();
        this.memoryUsage.actions++;
        return action;
    }
    
    // 액션 반납
    returnAIAction(action: AIAction) {
        this.actionPool.return(action);
        this.memoryUsage.actions--;
    }
    
    private createBehaviorTreeNode(): BehaviorTreeNode {
        // 기본 더미 노드 생성
        return new class extends BehaviorTreeNode {
            execute(context: AIContext): NodeStatus {
                return NodeStatus.SUCCESS;
            }
            reset(): void {}
        };
    }
    
    private resetBehaviorTreeNode(node: BehaviorTreeNode) {
        node.reset();
        // 부모-자식 관계 정리
        node.children.length = 0;
        node.parent = null;
    }
    
    private createAIContext(): AIContext {
        return {
            playerPosition: Vec3.ZERO,
            playerDistance: 0,
            playerVisible: false,
            playerHealth: 100,
            currentHealth: 100,
            lastAction: "",
            actionCooldowns: new Map(),
            alliesInRange: [],
            obstaclesNearby: [],
            safePositions: []
        };
    }
    
    private resetAIContext(context: AIContext) {
        context.playerPosition = Vec3.ZERO;
        context.playerDistance = 0;
        context.playerVisible = false;
        context.playerHealth = 100;
        context.currentHealth = 100;
        context.lastAction = "";
        context.actionCooldowns.clear();
        context.alliesInRange.length = 0;
        context.obstaclesNearby.length = 0;
        context.safePositions.length = 0;
    }
    
    private createAIAction(): AIAction {
        return {
            type: "idle",
            duration: 0
        };
    }
    
    private resetAIAction(action: AIAction) {
        action.type = "idle";
        action.duration = 0;
        action.target = undefined;
    }
    
    // 메모리 정리
    cleanup() {
        // 사용하지 않는 오브젝트들 정리
        this.behaviorTreeNodePool.cleanup();
        this.aiContextPool.cleanup();
        this.actionPool.cleanup();
        
        // 가비지 컬렉션 힌트
        if (window.gc) {
            window.gc();
        }
    }
    
    // 메모리 사용량 보고
    getMemoryUsage(): MemoryUsageStats {
        this.memoryUsage.total = this.memoryUsage.behaviorTrees + 
                                this.memoryUsage.aiContexts + 
                                this.memoryUsage.actions;
        return { ...this.memoryUsage };
    }
    
    private setupMemoryMonitoring() {
        // 5초마다 메모리 정리
        this.schedule(() => {
            this.cleanup();
        }, 5);
        
        // 10초마다 메모리 사용량 로그
        this.schedule(() => {
            const usage = this.getMemoryUsage();
            console.log(`AI Memory Usage - Total: ${usage.total}, Trees: ${usage.behaviorTrees}, Contexts: ${usage.aiContexts}, Actions: ${usage.actions}`);
        }, 10);
    }
}

interface MemoryUsageStats {
    behaviorTrees: number;
    aiContexts: number;
    actions: number;
    total: number;
}

// 제네릭 오브젝트 풀
class ObjectPool<T> {
    private pool: T[] = [];
    private createFn: () => T;
    private resetFn: (obj: T) => void;
    private maxSize: number;
    
    constructor(
        createFn: () => T,
        resetFn: (obj: T) => void,
        initialSize: number = 10,
        maxSize: number = 100
    ) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        
        // 초기 객체들 생성
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    borrow(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        } else {
            return this.createFn();
        }
    }
    
    return(obj: T) {
        if (this.pool.length < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
        }
        // 풀이 가득 찬 경우 객체는 GC에 맡김
    }
    
    cleanup() {
        // 풀 크기를 절반으로 줄임
        const targetSize = Math.floor(this.pool.length / 2);
        this.pool.splice(0, this.pool.length - targetSize);
    }
    
    getSize(): number {
        return this.pool.length;
    }
}

interface AIAction {
    type: string;
    target?: Vec3;
    duration?: number;
    data?: any;
}
```

---

## 🔗 관련 문서

- [03. 핵심 시스템 설계](./03-Core-System-Design.md)
- [04. 전투 시스템 설계](./04-Combat-System-Design.md)
- [06. 렌더링 및 애니메이션](./06-Rendering-Animation.md)
- [09. 데이터 관리 시스템](./09-Data-Management.md)

---

**이 문서는 Shadow Archer 게임의 AI 시스템을 정의합니다. 플레이어에게 도전적이면서도 공정한 경험을 제공하는 지능형 AI 시스템입니다.**