# Shadow Archer 구현 계획서: AI 시스템

## 1. 🎯 구현 목표

이 문서는 `docs/05-AI-System-Design.md`에 정의된 **AI 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 행동 트리 기반의 지능적인 적 AI, 보스 AI 패턴 시스템, 적응형 난이도 조절 시스템을 완성하여 플레이어에게 도전적이면서도 공정한 AI 경험을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

AI 시스템 구현은 `assets/scripts/ai` 폴더를 중심으로 진행됩니다.

### 2.1. AI Core (AI 핵심)

```
assets/scripts/ai/
├── AIManager.ts                     # ✅ AI 시스템 총괄 관리자
├── AIController.ts                  # ✅ 개별 AI 엔티티 제어
├── AIBlackboard.ts                  # ✅ AI 간 정보 공유 시스템
├── PathfindingManager.ts            # ✅ 경로 탐색 시스템
└── AIDebugger.ts                    # ✅ AI 디버깅 도구
```

### 2.2. Behavior Tree System (행동 트리)

```
assets/scripts/ai/behavior/
├── BehaviorTree.ts                  # ✅ 행동 트리 실행 엔진
├── BehaviorNode.ts                  # ✅ 행동 노드 기본 클래스
├── nodes/
│   ├── CompositeNodes.ts           # ✅ 복합 노드 (Selector, Sequence)
│   ├── DecoratorNodes.ts           # ✅ 데코레이터 노드 (Inverter, Repeater)
│   ├── ActionNodes.ts              # ✅ 액션 노드 (Move, Attack, Patrol)
│   └── ConditionNodes.ts           # ✅ 조건 노드 (CanSeePlayer, InRange)
└── BehaviorTreeBuilder.ts          # ✅ 행동 트리 빌더 패턴
```

### 2.3. AI Types (AI 타입별 구현)

```
assets/scripts/ai/types/
├── EnemyAI.ts                       # ✅ 일반 적 AI
├── BossAI.ts                        # ✅ 보스 AI
├── PatrolAI.ts                      # ✅ 순찰 AI
├── AggressiveAI.ts                  # ✅ 공격적 AI
└── DefensiveAI.ts                   # ✅ 방어적 AI
```

### 2.4. Advanced AI Systems (고급 AI 시스템)

```
assets/scripts/ai/advanced/
├── AdaptiveDifficulty.ts            # ✅ 적응형 난이도 시스템
├── PlayerAnalyzer.ts               # ✅ 플레이어 행동 분석
├── AILearning.ts                   # ✅ AI 학습 시스템
└── EmotionSystem.ts                # ✅ AI 감정 시스템
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/05-AI-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 행동 트리 시스템 구축 (가장 중요)**
*   **기간:** 7일
*   **목표:** 행동 트리 기반 AI의 기본 구조와 실행 엔진을 완성한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `BehaviorNode.ts`: 모든 행동 노드의 기본 인터페이스와 상태를 정의합니다.
        ```typescript
        export enum NodeState {
            SUCCESS,
            FAILURE,
            RUNNING
        }
        
        export abstract class BehaviorNode {
            protected children: BehaviorNode[] = [];
            protected parent: BehaviorNode | null = null;
            
            abstract execute(blackboard: AIBlackboard): NodeState;
            
            addChild(child: BehaviorNode): void {
                this.children.push(child);
                child.parent = this;
            }
        }
        ```
    2.  **[Task 1.2]** `CompositeNodes.ts`: Selector, Sequence, Parallel 등 복합 노드를 구현합니다.
        ```typescript
        export class SelectorNode extends BehaviorNode {
            execute(blackboard: AIBlackboard): NodeState {
                for (const child of this.children) {
                    const result = child.execute(blackboard);
                    
                    if (result === NodeState.SUCCESS || result === NodeState.RUNNING) {
                        return result;
                    }
                }
                return NodeState.FAILURE;
            }
        }
        ```
    3.  **[Task 1.3]** `ActionNodes.ts`: Move, Attack, Patrol 등 기본 액션 노드를 구현합니다.
    4.  **[Task 1.4]** `ConditionNodes.ts`: CanSeePlayer, InRange, HealthLow 등 조건 노드를 구현합니다.
    5.  **[Task 1.5]** `BehaviorTree.ts`: 행동 트리 실행 엔진과 틱 시스템을 구현합니다.
    6.  **[Task 1.6]** **행동 트리 테스트:** 간단한 AI가 플레이어를 추적하고 공격하는 기본 행동을 검증합니다.

### **Phase 2: 기본 AI 컨트롤러 구현**
*   **기간:** 4일
*   **목표:** AI 엔티티의 기본 제어와 상태 관리 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `AIController.ts`: 개별 AI 엔티티의 생명주기와 상태를 관리합니다.
        ```typescript
        export class AIController extends Component {
            private behaviorTree: BehaviorTree;
            private blackboard: AIBlackboard;
            private currentState: AIState = AIState.IDLE;
            
            start(): void {
                this.behaviorTree = this.createBehaviorTree();
                this.blackboard = new AIBlackboard();
                this.initializeBlackboard();
            }
            
            update(deltaTime: number): void {
                if (this.behaviorTree) {
                    this.behaviorTree.tick(this.blackboard, deltaTime);
                }
                this.updatePerception(deltaTime);
            }
        }
        ```
    2.  **[Task 2.2]** `AIBlackboard.ts`: AI 간 정보 공유와 메모리 시스템을 구현합니다.
    3.  **[Task 2.3]** **인식 시스템:** 시야, 청각, 촉각 기반의 플레이어 감지 시스템을 구현합니다.
    4.  **[Task 2.4]** **상태 관리:** IDLE, PATROL, CHASE, ATTACK, RETREAT 등 AI 상태 전환을 구현합니다.
    5.  **[Task 2.5]** **AI 컨트롤러 테스트:** AI가 플레이어를 감지하고 상태에 따라 적절히 행동하는지 검증합니다.

### **Phase 3: 경로 탐색 시스템**
*   **기간:** 5일
*   **목표:** 3D 환경에서 효율적인 경로 탐색과 장애물 회피를 완성한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `PathfindingManager.ts`: A* 알고리즘 기반의 경로 탐색 시스템을 구현합니다.
        ```typescript
        export class PathfindingManager {
            private navMesh: NavMesh;
            private pathCache: Map<string, Vec3[]> = new Map();
            
            findPath(start: Vec3, goal: Vec3): Vec3[] | null {
                const cacheKey = `${start.toString()}-${goal.toString()}`;
                
                if (this.pathCache.has(cacheKey)) {
                    return this.pathCache.get(cacheKey);
                }
                
                const path = this.aStarSearch(start, goal);
                
                if (path) {
                    this.pathCache.set(cacheKey, path);
                }
                
                return path;
            }
        }
        ```
    2.  **[Task 3.2]** **NavMesh 생성:** 3D 레벨의 Navigation Mesh를 생성하고 관리합니다.
    3.  **[Task 3.3]** **동적 장애물:** 움직이는 장애물과 플레이어에 대한 실시간 경로 재계산을 구현합니다.
    4.  **[Task 3.4]** **경로 최적화:** 불필요한 웨이포인트 제거와 부드러운 경로 생성을 구현합니다.
    5.  **[Task 3.5]** **경로 탐색 테스트:** 복잡한 지형에서 AI가 효율적으로 플레이어에게 접근하는지 검증합니다.

### **Phase 4: 보스 AI 패턴 시스템**
*   **기간:** 6일
*   **목표:** 복잡한 패턴과 페이즈를 가진 보스 AI 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `BossAI.ts`: 보스 전용 AI 컨트롤러와 패턴 관리 시스템을 구현합니다.
        ```typescript
        export class BossAI extends AIController {
            private phases: BossPhase[] = [];
            private currentPhase: number = 0;
            private attackPatterns: AttackPattern[] = [];
            private patternCooldowns: Map<string, number> = new Map();
            
            protected createBehaviorTree(): BehaviorTree {
                return new BehaviorTreeBuilder()
                    .selector()
                        .condition('IsPhaseTransition')
                        .action('TransitionPhase')
                        .selector()
                            .condition('CanUseSpecialAttack')
                            .action('ExecuteSpecialAttack')
                            .sequence()
                                .condition('PlayerInRange')
                                .action('ExecuteAttackPattern')
                    .build();
            }
        }
        ```
    2.  **[Task 4.2]** **페이즈 시스템:** 체력에 따른 보스 페이즈 전환과 패턴 변화를 구현합니다.
    3.  **[Task 4.3]** **공격 패턴:** 연속 공격, 범위 공격, 특수 기술 등 다양한 공격 패턴을 구현합니다.
    4.  **[Task 4.4]** **보스 행동 예측:** 플레이어가 보스의 다음 행동을 예측할 수 있는 텔레그래프 시스템을 구현합니다.
    5.  **[Task 4.5]** **보스 AI 테스트:** 각 페이즈별 패턴 실행과 전환이 정상적으로 동작하는지 검증합니다.

### **Phase 5: 적응형 난이도 시스템**
*   **기간:** 4일
*   **목표:** 플레이어 실력에 따라 동적으로 조절되는 난이도 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `PlayerAnalyzer.ts`: 플레이어의 행동 패턴과 실력을 분석하는 시스템을 구현합니다.
        ```typescript
        export class PlayerAnalyzer {
            private playerStats: PlayerStats = {
                accuracy: 0,
                dodgeSuccess: 0,
                parrySuccess: 0,
                averageCombatDuration: 0,
                deathCount: 0
            };
            
            analyzePlayerPerformance(): DifficultyLevel {
                const skillScore = this.calculateSkillScore();
                
                if (skillScore > 0.8) return DifficultyLevel.HARD;
                if (skillScore > 0.6) return DifficultyLevel.MEDIUM;
                if (skillScore > 0.4) return DifficultyLevel.EASY;
                return DifficultyLevel.VERY_EASY;
            }
            
            private calculateSkillScore(): number {
                return (this.playerStats.accuracy * 0.3 +
                       this.playerStats.dodgeSuccess * 0.3 +
                       this.playerStats.parrySuccess * 0.2 +
                       (1 / (this.playerStats.deathCount + 1)) * 0.2);
            }
        }
        ```
    2.  **[Task 5.2]** `AdaptiveDifficulty.ts`: 실시간 난이도 조절 알고리즘을 구현합니다.
    3.  **[Task 5.3]** **AI 행동 조절:** 난이도에 따른 AI 공격력, 반응속도, 패턴 복잡도 조절을 구현합니다.
    4.  **[Task 5.4]** **점진적 조절:** 갑작스러운 난이도 변화가 아닌 부드러운 조절 시스템을 구현합니다.
    5.  **[Task 5.5]** **적응형 시스템 테스트:** 다양한 플레이어 실력에 대해 적절한 난이도 조절이 이루어지는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 행동 트리 빌더 패턴

```typescript
// 직관적인 행동 트리 구성을 위한 빌더 패턴
export class BehaviorTreeBuilder {
    private root: BehaviorNode | null = null;
    private nodeStack: BehaviorNode[] = [];
    
    selector(): BehaviorTreeBuilder {
        const node = new SelectorNode();
        this.addNode(node);
        return this;
    }
    
    sequence(): BehaviorTreeBuilder {
        const node = new SequenceNode();
        this.addNode(node);
        return this;
    }
    
    condition(conditionName: string): BehaviorTreeBuilder {
        const node = ConditionNodeFactory.create(conditionName);
        this.addNode(node);
        return this;
    }
    
    action(actionName: string): BehaviorTreeBuilder {
        const node = ActionNodeFactory.create(actionName);
        this.addNode(node);
        return this;
    }
    
    build(): BehaviorTree {
        return new BehaviorTree(this.root!);
    }
}

// 사용 예시
const bossTree = new BehaviorTreeBuilder()
    .selector()
        .sequence() // 체력이 낮을 때 특수 패턴
            .condition('HealthBelow50Percent')
            .action('RageMode')
        .selector() // 일반 공격 패턴
            .condition('PlayerInMeleeRange')
            .action('MeleeAttack')
            .condition('PlayerInRangedRange')
            .action('RangedAttack')
    .build();
```

### 4.2. 감각 시스템 구현

```typescript
// AI의 인식 능력을 시뮬레이션하는 감각 시스템
export class SenseSystem extends Component {
    private visionAngle: number = 60; // 시야각
    private visionRange: number = 20; // 시야 거리
    private hearingRange: number = 15; // 청각 범위
    
    canSeeTarget(target: Node): boolean {
        const distance = Vec3.distance(this.node.worldPosition, target.worldPosition);
        
        if (distance > this.visionRange) return false;
        
        // 시야각 체크
        const forward = this.node.forward;
        const toTarget = target.worldPosition.subtract(this.node.worldPosition).normalize();
        const angle = Vec3.angle(forward, toTarget) * (180 / Math.PI);
        
        if (angle > this.visionAngle / 2) return false;
        
        // 장애물 체크 (레이캐스팅)
        return !this.isObstructed(target);
    }
    
    canHearTarget(target: Node, noiseLevel: number): boolean {
        const distance = Vec3.distance(this.node.worldPosition, target.worldPosition);
        const hearingDistance = this.hearingRange * noiseLevel;
        
        return distance <= hearingDistance;
    }
    
    private isObstructed(target: Node): boolean {
        const ray = new geometry.Ray(
            this.node.worldPosition.x,
            this.node.worldPosition.y,
            this.node.worldPosition.z,
            target.worldPosition.x - this.node.worldPosition.x,
            target.worldPosition.y - this.node.worldPosition.y,
            target.worldPosition.z - this.node.worldPosition.z
        );
        
        const result = PhysicsSystem.instance.raycastClosest(ray);
        return result && result.collider.node !== target;
    }
}
```

### 4.3. AI 상태 머신 통합

```typescript
// 행동 트리와 상태 머신을 결합한 하이브리드 AI
export class HybridAIController extends AIController {
    private stateMachine: AIStateMachine;
    private stateSpecificTrees: Map<AIState, BehaviorTree> = new Map();
    
    protected initializeAI(): void {
        this.stateMachine = new AIStateMachine();
        
        // 상태별 행동 트리 생성
        this.stateSpecificTrees.set(AIState.PATROL, this.createPatrolTree());
        this.stateSpecificTrees.set(AIState.CHASE, this.createChaseTree());
        this.stateSpecificTrees.set(AIState.COMBAT, this.createCombatTree());
        this.stateSpecificTrees.set(AIState.SEARCH, this.createSearchTree());
        
        // 상태 전환 조건 설정
        this.setupStateTransitions();
    }
    
    update(deltaTime: number): void {
        // 상태 머신 업데이트
        this.stateMachine.update(deltaTime);
        
        // 현재 상태에 맞는 행동 트리 실행
        const currentState = this.stateMachine.getCurrentState();
        const behaviorTree = this.stateSpecificTrees.get(currentState);
        
        if (behaviorTree) {
            behaviorTree.tick(this.blackboard, deltaTime);
        }
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **AI 설계 문서 완벽 준수:** `05-AI-System-Design.md`에 정의된 모든 AI 행동과 시스템을 정확히 구현합니다.

2.  **성능 최적화:** 다수의 AI가 동시에 실행되어도 60FPS를 유지할 수 있도록 최적화합니다.

3.  **예측 가능한 행동:** AI의 행동이 플레이어에게 이해 가능하고 공정하게 느껴지도록 구현합니다.

4.  **디버깅 도구:** AI 행동을 시각화하고 튜닝할 수 있는 개발자 도구를 제공합니다.

5.  **확장성:** 새로운 AI 타입과 행동을 쉽게 추가할 수 있는 모듈러 구조를 유지합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **AI 업데이트 빈도:** 20ms마다 AI 상태 업데이트
- **경로 탐색:** 50개 노드 경로를 5ms 이내 계산
- **동시 AI 수:** 20개 AI 동시 실행 시에도 60FPS 유지
- **반응 시간:** AI가 플레이어 행동에 200ms 이내 반응

### 6.2. 검증 기준
- 행동 트리 실행이 예측 가능하고 일관성 있음
- AI가 지형과 장애물을 적절히 인식하고 회피
- 보스 AI 패턴이 플레이어에게 공정한 도전 제공
- 적응형 난이도가 플레이어 실력에 맞게 조절됨
- AI 디버깅 정보가 개발자에게 유용한 인사이트 제공

이 구현 계획을 통해 Shadow Archer의 AI 시스템을 완성하여 플레이어에게 지능적이고 도전적인 적대적 경험을 제공할 수 있을 것입니다.