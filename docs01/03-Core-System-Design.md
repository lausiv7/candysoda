# 📋 03. 핵심 시스템 설계 (Core System Design)

*Shadow Archer 모바일 3D 소울라이크 게임의 핵심 시스템 아키텍처*

---

## 📖 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [게임 루프 시스템](#2-게임-루프-시스템)
3. [상태 관리 시스템](#3-상태-관리-시스템)
4. [이벤트 시스템](#4-이벤트-시스템)
5. [리소스 관리 시스템](#5-리소스-관리-시스템)
6. [씬 관리 시스템](#6-씬-관리-시스템)
7. [성능 최적화 시스템](#7-성능-최적화-시스템)

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 시스템 구조

```typescript
// [의도] 게임의 전체 시스템을 모듈화하여 관리하는 중앙 아키텍처
// [책임] 각 서브시스템 간의 의존성 관리 및 생명주기 제어

interface IGameSystem {
    readonly name: string;
    readonly priority: number;
    
    initialize(): Promise<void>;
    update(deltaTime: number): void;
    destroy(): void;
}

class GameSystemManager extends Component {
    private systems: Map<string, IGameSystem> = new Map();
    private updateOrder: IGameSystem[] = [];
    
    async initialize() {
        // 시스템 등록 순서 (의존성 고려)
        this.registerSystem(new ResourceManager());
        this.registerSystem(new SceneManager());
        this.registerSystem(new InputManager());
        this.registerSystem(new CombatSystem());
        this.registerSystem(new AISystem());
        this.registerSystem(new UISystem());
        this.registerSystem(new AudioSystem());
        
        // 모든 시스템 초기화
        for (const system of this.updateOrder) {
            await system.initialize();
        }
    }
    
    private registerSystem(system: IGameSystem) {
        this.systems.set(system.name, system);
        this.updateOrder.push(system);
        this.updateOrder.sort((a, b) => a.priority - b.priority);
    }
    
    update(deltaTime: number) {
        for (const system of this.updateOrder) {
            system.update(deltaTime);
        }
    }
}
```

### 1.2 시스템 간 통신 구조

```typescript
// [의도] 시스템 간 느슨한 결합을 위한 메시지 기반 통신
// [책임] 이벤트 발행/구독 패턴으로 시스템 간 데이터 교환

class EventBus extends Component {
    private static instance: EventBus;
    private listeners: Map<string, Function[]> = new Map();
    private eventQueue: GameEvent[] = [];
    
    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    
    subscribe<T>(eventType: string, callback: (data: T) => void) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(callback);
    }
    
    publish<T>(eventType: string, data: T) {
        const event: GameEvent = {
            type: eventType,
            data: data,
            timestamp: Date.now()
        };
        this.eventQueue.push(event);
    }
    
    processEvents() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift()!;
            const callbacks = this.listeners.get(event.type);
            if (callbacks) {
                callbacks.forEach(callback => callback(event.data));
            }
        }
    }
}

interface GameEvent {
    type: string;
    data: any;
    timestamp: number;
}
```

### 1.3 컴포넌트 시스템 설계

```typescript
// [의도] ECS(Entity-Component-System) 패턴 적용
// [책임] 재사용 가능한 컴포넌트 단위로 기능 모듈화

abstract class GameComponent extends Component {
    abstract readonly componentType: string;
    protected entity: GameObject;
    
    protected onLoad() {
        this.entity = this.node as GameObject;
        this.initialize();
    }
    
    abstract initialize(): void;
    abstract update(deltaTime: number): void;
}

// 체력 컴포넌트
class HealthComponent extends GameComponent {
    readonly componentType = "Health";
    
    @property(Number)
    maxHealth: number = 100;
    
    private currentHealth: number;
    
    initialize() {
        this.currentHealth = this.maxHealth;
    }
    
    takeDamage(amount: number): boolean {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        
        EventBus.getInstance().publish("HealthChanged", {
            entity: this.entity,
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth
        });
        
        if (this.currentHealth <= 0) {
            EventBus.getInstance().publish("EntityDied", { entity: this.entity });
            return true; // 죽음
        }
        return false;
    }
    
    heal(amount: number) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        EventBus.getInstance().publish("HealthChanged", {
            entity: this.entity,
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth
        });
    }
    
    update(deltaTime: number) {
        // 체력 관련 상태 업데이트
    }
}
```

---

## 2. 게임 루프 시스템

### 2.1 메인 게임 루프

```typescript
// [의도] 게임의 핵심 업데이트 루프를 관리하는 중앙 시스템
// [책임] 프레임별 업데이트 순서 제어 및 시간 관리

class GameLoop extends Component {
    private lastFrameTime: number = 0;
    private accumulator: number = 0;
    private readonly FIXED_TIMESTEP: number = 1/60; // 60 FPS
    private readonly MAX_DELTA: number = 0.25;
    
    private gameState: GameState = GameState.RUNNING;
    
    protected onLoad() {
        this.lastFrameTime = performance.now() / 1000;
    }
    
    protected update() {
        if (this.gameState !== GameState.RUNNING) return;
        
        const currentTime = performance.now() / 1000;
        let deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // 델타타임 제한 (스파이크 방지)
        deltaTime = Math.min(deltaTime, this.MAX_DELTA);
        this.accumulator += deltaTime;
        
        // 고정 간격 물리 업데이트
        while (this.accumulator >= this.FIXED_TIMESTEP) {
            this.fixedUpdate(this.FIXED_TIMESTEP);
            this.accumulator -= this.FIXED_TIMESTEP;
        }
        
        // 가변 간격 렌더링 업데이트
        this.variableUpdate(deltaTime);
        
        // 이벤트 처리
        EventBus.getInstance().processEvents();
    }
    
    private fixedUpdate(deltaTime: number) {
        // 물리, 충돌, AI 등 일정한 간격 필요한 시스템
        GameSystemManager.getInstance().fixedUpdate(deltaTime);
    }
    
    private variableUpdate(deltaTime: number) {
        // 렌더링, 애니메이션, UI 등 부드러운 프레임 필요한 시스템
        GameSystemManager.getInstance().variableUpdate(deltaTime);
    }
}

enum GameState {
    LOADING,
    MENU,
    RUNNING,
    PAUSED,
    GAME_OVER
}
```

### 2.2 시간 관리 시스템

```typescript
// [의도] 게임 시간 스케일링 및 일시정지 기능 제공
// [책임] 슬로우 모션, 일시정지 등 시간 조작 효과 관리

class TimeManager extends Component {
    private static instance: TimeManager;
    
    private _timeScale: number = 1.0;
    private _realTime: number = 0;
    private _gameTime: number = 0;
    private _deltaTime: number = 0;
    
    private pauseStack: string[] = []; // 중첩 일시정지 지원
    
    static getInstance(): TimeManager {
        return TimeManager.instance;
    }
    
    get timeScale(): number { return this._timeScale; }
    get deltaTime(): number { return this._deltaTime * this._timeScale; }
    get realDeltaTime(): number { return this._deltaTime; }
    get gameTime(): number { return this._gameTime; }
    get isPaused(): boolean { return this.pauseStack.length > 0; }
    
    updateTime(realDeltaTime: number) {
        this._deltaTime = realDeltaTime;
        this._realTime += realDeltaTime;
        
        if (!this.isPaused) {
            this._gameTime += realDeltaTime * this._timeScale;
        }
    }
    
    setTimeScale(scale: number, duration?: number) {
        this._timeScale = scale;
        
        if (duration) {
            this.scheduleOnce(() => {
                this._timeScale = 1.0;
            }, duration);
        }
    }
    
    pause(reason: string) {
        if (!this.pauseStack.includes(reason)) {
            this.pauseStack.push(reason);
            EventBus.getInstance().publish("GamePaused", { reason });
        }
    }
    
    resume(reason: string) {
        const index = this.pauseStack.indexOf(reason);
        if (index !== -1) {
            this.pauseStack.splice(index, 1);
            if (this.pauseStack.length === 0) {
                EventBus.getInstance().publish("GameResumed", { reason });
            }
        }
    }
    
    // 슬로우 모션 효과 (크리티컬 히트 등에서 사용)
    slowMotion(scale: number = 0.3, duration: number = 0.5) {
        this.setTimeScale(scale, duration);
        
        // 오디오도 함께 조정
        AudioManager.getInstance().setGlobalPitch(scale);
        this.scheduleOnce(() => {
            AudioManager.getInstance().setGlobalPitch(1.0);
        }, duration);
    }
}
```

---

## 3. 상태 관리 시스템

### 3.1 게임 상태 머신

```typescript
// [의도] 게임의 전체 상태(메뉴, 게임플레이, 일시정지 등)를 체계적으로 관리
// [책임] 상태 전환의 일관성 보장 및 상태별 로직 분리

abstract class GameState {
    abstract readonly stateName: string;
    
    abstract onEnter(previousState: GameState | null): Promise<void>;
    abstract onUpdate(deltaTime: number): void;
    abstract onExit(nextState: GameState): Promise<void>;
    abstract canTransitionTo(targetState: string): boolean;
}

class GameStateMachine extends Component {
    private currentState: GameState | null = null;
    private states: Map<string, GameState> = new Map();
    private isTransitioning: boolean = false;
    
    registerState(state: GameState) {
        this.states.set(state.stateName, state);
    }
    
    async transitionTo(stateName: string): Promise<boolean> {
        if (this.isTransitioning) return false;
        
        const targetState = this.states.get(stateName);
        if (!targetState) {
            console.error(`State '${stateName}' not found`);
            return false;
        }
        
        if (this.currentState && !this.currentState.canTransitionTo(stateName)) {
            console.warn(`Cannot transition from '${this.currentState.stateName}' to '${stateName}'`);
            return false;
        }
        
        this.isTransitioning = true;
        
        try {
            // 현재 상태 종료
            if (this.currentState) {
                await this.currentState.onExit(targetState);
            }
            
            const previousState = this.currentState;
            this.currentState = targetState;
            
            // 새 상태 시작
            await this.currentState.onEnter(previousState);
            
            EventBus.getInstance().publish("StateChanged", {
                previousState: previousState?.stateName,
                currentState: stateName
            });
            
            return true;
        } catch (error) {
            console.error(`State transition failed: ${error}`);
            return false;
        } finally {
            this.isTransitioning = false;
        }
    }
    
    update(deltaTime: number) {
        if (this.currentState && !this.isTransitioning) {
            this.currentState.onUpdate(deltaTime);
        }
    }
}

// 메인 메뉴 상태
class MainMenuState extends GameState {
    readonly stateName = "MainMenu";
    
    async onEnter(previousState: GameState | null): Promise<void> {
        // 메인 메뉴 씬 로드
        await SceneManager.getInstance().loadScene("MainMenu");
        
        // 메뉴 음악 재생
        AudioManager.getInstance().playBGM("menu_theme");
        
        // UI 초기화
        UIManager.getInstance().showScreen("MainMenuScreen");
    }
    
    onUpdate(deltaTime: number): void {
        // 메뉴 상태에서는 특별한 업데이트 로직 없음
    }
    
    async onExit(nextState: GameState): Promise<void> {
        // 메뉴 UI 정리
        UIManager.getInstance().hideScreen("MainMenuScreen");
    }
    
    canTransitionTo(targetState: string): boolean {
        return ["Gameplay", "Settings", "Credits"].includes(targetState);
    }
}
```

### 3.2 플레이어 상태 시스템

```typescript
// [의도] 플레이어 캐릭터의 행동 상태를 관리하는 FSM
// [책임] 애니메이션, 입력 처리, 능력 사용 가능성 제어

enum PlayerStateType {
    IDLE = "idle",
    MOVE = "move",
    ATTACK = "attack",
    CHARGE_ATTACK = "charge_attack",
    DODGE = "dodge",
    HIT = "hit",
    DEATH = "death",
    SKILL = "skill"
}

class PlayerState {
    readonly type: PlayerStateType;
    readonly canMove: boolean;
    readonly canAttack: boolean;
    readonly canDodge: boolean;
    readonly duration?: number;
    
    constructor(
        type: PlayerStateType,
        canMove: boolean = true,
        canAttack: boolean = true,
        canDodge: boolean = true,
        duration?: number
    ) {
        this.type = type;
        this.canMove = canMove;
        this.canAttack = canAttack;
        this.canDodge = canDodge;
        this.duration = duration;
    }
}

class PlayerController extends GameComponent {
    readonly componentType = "PlayerController";
    
    private stateMachine: Map<PlayerStateType, PlayerState> = new Map();
    private currentState: PlayerState;
    private stateTimer: number = 0;
    
    initialize() {
        this.setupStates();
        this.currentState = this.stateMachine.get(PlayerStateType.IDLE)!;
    }
    
    private setupStates() {
        this.stateMachine.set(PlayerStateType.IDLE, 
            new PlayerState(PlayerStateType.IDLE, true, true, true));
        
        this.stateMachine.set(PlayerStateType.MOVE, 
            new PlayerState(PlayerStateType.MOVE, true, true, true));
        
        this.stateMachine.set(PlayerStateType.ATTACK, 
            new PlayerState(PlayerStateType.ATTACK, false, false, false, 0.5));
        
        this.stateMachine.set(PlayerStateType.DODGE, 
            new PlayerState(PlayerStateType.DODGE, true, false, false, 0.3));
        
        this.stateMachine.set(PlayerStateType.HIT, 
            new PlayerState(PlayerStateType.HIT, false, false, false, 0.4));
    }
    
    update(deltaTime: number) {
        this.stateTimer += deltaTime;
        
        // 지속시간이 있는 상태의 자동 종료
        if (this.currentState.duration && this.stateTimer >= this.currentState.duration) {
            this.transitionToState(PlayerStateType.IDLE);
        }
        
        this.updateCurrentState(deltaTime);
    }
    
    transitionToState(newStateType: PlayerStateType): boolean {
        if (!this.canTransitionTo(newStateType)) {
            return false;
        }
        
        const newState = this.stateMachine.get(newStateType);
        if (!newState) return false;
        
        // 상태 전환
        this.onExitState(this.currentState);
        this.currentState = newState;
        this.stateTimer = 0;
        this.onEnterState(this.currentState);
        
        return true;
    }
    
    private canTransitionTo(targetState: PlayerStateType): boolean {
        // 죽음 상태에서는 아무곳으로도 전환 불가
        if (this.currentState.type === PlayerStateType.DEATH) {
            return false;
        }
        
        // 피격 상태는 일정 시간 후 자동 해제
        if (this.currentState.type === PlayerStateType.HIT && 
            this.stateTimer < this.currentState.duration!) {
            return targetState === PlayerStateType.DEATH;
        }
        
        return true;
    }
    
    private onEnterState(state: PlayerState) {
        // 애니메이션 변경
        const animator = this.getComponent(AnimationController);
        animator?.playAnimation(state.type);
        
        // 상태별 특수 로직
        switch (state.type) {
            case PlayerStateType.DODGE:
                this.enableInvincibility(0.1); // 0.1초 무적
                break;
            case PlayerStateType.ATTACK:
                this.enableAttackHitbox();
                break;
        }
        
        EventBus.getInstance().publish("PlayerStateChanged", {
            newState: state.type,
            canMove: state.canMove,
            canAttack: state.canAttack,
            canDodge: state.canDodge
        });
    }
    
    private onExitState(state: PlayerState) {
        switch (state.type) {
            case PlayerStateType.ATTACK:
                this.disableAttackHitbox();
                break;
        }
    }
}
```

---

## 4. 이벤트 시스템

### 4.1 이벤트 타입 정의

```typescript
// [의도] 게임 내 모든 이벤트를 타입 안전하게 관리
// [책임] 컴파일 타임 이벤트 검증 및 자동완성 지원

interface GameEventMap {
    // 플레이어 관련 이벤트
    "PlayerStateChanged": { newState: PlayerStateType; canMove: boolean; canAttack: boolean; canDodge: boolean };
    "PlayerDied": { playerId: string; deathCause: string };
    "PlayerLevelUp": { newLevel: number; skillPoints: number };
    
    // 전투 관련 이벤트
    "DamageDealt": { attacker: GameObject; target: GameObject; damage: number; isCritical: boolean };
    "EnemyDefeated": { enemy: GameObject; experience: number; loot: ItemData[] };
    "BossPhaseChanged": { bossId: string; newPhase: number; healthPercentage: number };
    
    // UI 관련 이벤트
    "ShowDamageText": { position: Vec3; damage: number; isCritical: boolean };
    "UpdateHealthBar": { currentHealth: number; maxHealth: number };
    "ShowNotification": { message: string; type: "info" | "warning" | "success" };
    
    // 시스템 관련 이벤트
    "SceneLoaded": { sceneName: string };
    "ResourceLoaded": { resourcePath: string; resourceType: string };
    "PerformanceWarning": { fps: number; memoryUsage: number };
}

// 타입 안전한 이벤트 버스
class TypedEventBus {
    private static instance: TypedEventBus;
    private listeners: Map<keyof GameEventMap, Function[]> = new Map();
    
    static getInstance(): TypedEventBus {
        if (!TypedEventBus.instance) {
            TypedEventBus.instance = new TypedEventBus();
        }
        return TypedEventBus.instance;
    }
    
    on<K extends keyof GameEventMap>(
        eventType: K,
        callback: (data: GameEventMap[K]) => void
    ): () => void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        this.listeners.get(eventType)!.push(callback);
        
        // 구독 해제 함수 반환
        return () => {
            const callbacks = this.listeners.get(eventType);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    emit<K extends keyof GameEventMap>(eventType: K, data: GameEventMap[K]) {
        const callbacks = this.listeners.get(eventType);
        if (callbacks) {
            // 콜백 실행 중 오류가 다른 콜백에 영향주지 않도록
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error for ${eventType}:`, error);
                }
            });
        }
    }
}
```

### 4.2 이벤트 기반 시스템 통신

```typescript
// [의도] 시스템 간 느슨한 결합을 통한 모듈성 향상
// [책임] 이벤트를 통한 시스템 간 안전한 통신 제공

class CombatEventHandler extends Component {
    private eventBus: TypedEventBus;
    private unsubscribers: (() => void)[] = [];
    
    protected onLoad() {
        this.eventBus = TypedEventBus.getInstance();
        this.setupEventListeners();
    }
    
    protected onDestroy() {
        // 메모리 누수 방지를 위한 구독 해제
        this.unsubscribers.forEach(unsub => unsub());
    }
    
    private setupEventListeners() {
        // 데미지 처리 이벤트 구독
        this.unsubscribers.push(
            this.eventBus.on("DamageDealt", (data) => {
                this.processDamage(data);
            })
        );
        
        // 적 처치 이벤트 구독
        this.unsubscribers.push(
            this.eventBus.on("EnemyDefeated", (data) => {
                this.handleEnemyDefeat(data);
            })
        );
    }
    
    private processDamage(data: GameEventMap["DamageDealt"]) {
        // 데미지 텍스트 표시 이벤트 발행
        this.eventBus.emit("ShowDamageText", {
            position: data.target.worldPosition,
            damage: data.damage,
            isCritical: data.isCritical
        });
        
        // 히트 이펙트 재생
        EffectManager.getInstance().playHitEffect(
            data.target.worldPosition, 
            data.isCritical ? "critical_hit" : "normal_hit"
        );
        
        // 카메라 흔들림 (강한 공격일 때)
        if (data.damage > 50) {
            CameraController.getInstance().shake(0.1, 0.3);
        }
    }
    
    private handleEnemyDefeat(data: GameEventMap["EnemyDefeated"]) {
        // 경험치 획득 처리
        PlayerProgression.getInstance().gainExperience(data.experience);
        
        // 아이템 드롭 처리
        ItemDropper.getInstance().dropItems(data.enemy.worldPosition, data.loot);
        
        // 처치 통계 업데이트
        GameStats.getInstance().incrementEnemyKills();
    }
}
```

---

## 5. 리소스 관리 시스템

### 5.1 동적 리소스 로딩

```typescript
// [의도] 메모리 효율적인 리소스 관리 및 동적 로딩
// [책임] 필요한 시점에 리소스 로드/언로드하여 메모리 최적화

interface ResourceHandle<T> {
    readonly path: string;
    readonly type: string;
    isLoaded: boolean;
    refCount: number;
    resource: T | null;
}

class ResourceManager extends Component {
    private static instance: ResourceManager;
    private loadedResources: Map<string, ResourceHandle<any>> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    
    static getInstance(): ResourceManager {
        return ResourceManager.instance;
    }
    
    async loadResource<T>(path: string, type: string): Promise<T> {
        // 이미 로드된 리소스는 참조 카운트만 증가
        if (this.loadedResources.has(path)) {
            const handle = this.loadedResources.get(path)!;
            handle.refCount++;
            return handle.resource as T;
        }
        
        // 로딩 중인 리소스는 같은 Promise 반환
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path)! as Promise<T>;
        }
        
        // 새로운 리소스 로딩
        const loadPromise = this.loadResourceInternal<T>(path, type);
        this.loadingPromises.set(path, loadPromise);
        
        try {
            const resource = await loadPromise;
            
            // 리소스 핸들 생성
            const handle: ResourceHandle<T> = {
                path,
                type,
                isLoaded: true,
                refCount: 1,
                resource
            };
            
            this.loadedResources.set(path, handle);
            this.loadingPromises.delete(path);
            
            TypedEventBus.getInstance().emit("ResourceLoaded", {
                resourcePath: path,
                resourceType: type
            });
            
            return resource;
        } catch (error) {
            this.loadingPromises.delete(path);
            throw error;
        }
    }
    
    private async loadResourceInternal<T>(path: string, type: string): Promise<T> {
        switch (type) {
            case "texture":
                return resources.load(path, ImageAsset) as Promise<T>;
            case "audio":
                return resources.load(path, AudioClip) as Promise<T>;
            case "prefab":
                return resources.load(path, Prefab) as Promise<T>;
            case "material":
                return resources.load(path, Material) as Promise<T>;
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }
    }
    
    releaseResource(path: string) {
        const handle = this.loadedResources.get(path);
        if (!handle) return;
        
        handle.refCount--;
        
        // 참조 카운트가 0이 되면 리소스 해제
        if (handle.refCount <= 0) {
            if (handle.resource) {
                // Cocos Creator 리소스 해제
                if (handle.resource.destroy) {
                    handle.resource.destroy();
                }
            }
            
            this.loadedResources.delete(path);
            console.log(`Resource released: ${path}`);
        }
    }
    
    // 메모리 압박 시 사용하지 않는 리소스 정리
    garbageCollect() {
        const unusedResources: string[] = [];
        
        this.loadedResources.forEach((handle, path) => {
            if (handle.refCount <= 0) {
                unusedResources.push(path);
            }
        });
        
        unusedResources.forEach(path => {
            this.releaseResource(path);
        });
        
        console.log(`Garbage collected ${unusedResources.length} resources`);
    }
}
```

### 5.2 스테이지별 리소스 관리

```typescript
// [의도] 스테이지 진행에 따른 효율적인 리소스 관리
// [책임] 필요한 리소스만 메모리에 유지하여 성능 최적화

interface StageResourceManifest {
    textures: string[];
    models: string[];
    audio: string[];
    effects: string[];
    preloadPriority: number; // 0: 필수, 1: 중요, 2: 선택적
}

class StageResourceManager extends Component {
    private currentStageId: string = "";
    private resourceManifests: Map<string, StageResourceManifest> = new Map();
    private preloadQueue: Array<{path: string; type: string; priority: number}> = [];
    
    // 스테이지 리소스 매니페스트 등록
    registerStageManifest(stageId: string, manifest: StageResourceManifest) {
        this.resourceManifests.set(stageId, manifest);
    }
    
    async preloadStageResources(stageId: string): Promise<void> {
        const manifest = this.resourceManifests.get(stageId);
        if (!manifest) throw new Error(`No manifest found for stage: ${stageId}`);
        
        // 우선순위별로 리소스 로딩
        const loadTasks: Array<{path: string; type: string; priority: number}> = [];
        
        // 텍스처 추가
        manifest.textures.forEach(path => {
            loadTasks.push({path, type: "texture", priority: manifest.preloadPriority});
        });
        
        // 오디오 추가
        manifest.audio.forEach(path => {
            loadTasks.push({path, type: "audio", priority: manifest.preloadPriority});
        });
        
        // 프리팹 추가  
        manifest.models.forEach(path => {
            loadTasks.push({path, type: "prefab", priority: manifest.preloadPriority});
        });
        
        // 우선순위 정렬 (낮은 번호가 높은 우선순위)
        loadTasks.sort((a, b) => a.priority - b.priority);
        
        // 필수 리소스 (priority 0) 먼저 로딩
        const essentialTasks = loadTasks.filter(task => task.priority === 0);
        await this.loadResourceBatch(essentialTasks);
        
        // 나머지 리소스는 백그라운드에서 로딩
        const optionalTasks = loadTasks.filter(task => task.priority > 0);
        this.loadResourceBatch(optionalTasks); // await 없이 백그라운드 로딩
    }
    
    private async loadResourceBatch(tasks: Array<{path: string; type: string; priority: number}>) {
        const resourceManager = ResourceManager.getInstance();
        const loadPromises = tasks.map(task => 
            resourceManager.loadResource(task.path, task.type).catch(error => {
                console.warn(`Failed to load resource: ${task.path}`, error);
                return null;
            })
        );
        
        await Promise.all(loadPromises);
    }
    
    // 이전 스테이지 리소스 해제
    async switchToStage(newStageId: string) {
        // 이전 스테이지 리소스 해제
        if (this.currentStageId) {
            await this.unloadStageResources(this.currentStageId);
        }
        
        // 새 스테이지 리소스 로딩
        await this.preloadStageResources(newStageId);
        this.currentStageId = newStageId;
    }
    
    private async unloadStageResources(stageId: string) {
        const manifest = this.resourceManifests.get(stageId);
        if (!manifest) return;
        
        const resourceManager = ResourceManager.getInstance();
        
        // 모든 리소스 참조 해제
        [...manifest.textures, ...manifest.audio, ...manifest.models, ...manifest.effects]
            .forEach(path => {
                resourceManager.releaseResource(path);
            });
    }
}
```

---

## 6. 씬 관리 시스템

### 6.1 씬 전환 시스템

```typescript
// [의도] 부드러운 씬 전환과 로딩 상태 관리
// [책임] 씬 전환 시 필요한 리소스 관리 및 전환 효과 제공

enum SceneType {
    MAIN_MENU = "MainMenu",
    STAGE_SELECT = "StageSelect", 
    GAMEPLAY = "Gameplay",
    BOSS_ROOM = "BossRoom",
    LOADING = "Loading"
}

interface SceneTransitionData {
    targetScene: SceneType;
    transitionType: "fade" | "slide" | "none";
    duration: number;
    loadingTips?: string[];
}

class SceneManager extends Component {
    private static instance: SceneManager;
    private currentScene: SceneType = SceneType.MAIN_MENU;
    private isTransitioning: boolean = false;
    private loadingProgress: number = 0;
    
    static getInstance(): SceneManager {
        return SceneManager.instance;
    }
    
    async transitionToScene(data: SceneTransitionData): Promise<void> {
        if (this.isTransitioning) {
            console.warn("Scene transition already in progress");
            return;
        }
        
        this.isTransitioning = true;
        
        try {
            // 전환 효과 시작
            if (data.transitionType !== "none") {
                await this.playTransitionOut(data.transitionType, data.duration * 0.5);
            }
            
            // 로딩 화면 표시 (필요한 경우)
            if (this.needsLoadingScreen(data.targetScene)) {
                await this.showLoadingScreen(data.loadingTips);
            }
            
            // 씬 로딩
            await this.loadScene(data.targetScene);
            
            // 전환 효과 완료
            if (data.transitionType !== "none") {
                await this.playTransitionIn(data.transitionType, data.duration * 0.5);
            }
            
            this.currentScene = data.targetScene;
            
            TypedEventBus.getInstance().emit("SceneLoaded", {
                sceneName: data.targetScene
            });
            
        } finally {
            this.isTransitioning = false;
        }
    }
    
    private async loadScene(sceneType: SceneType): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // 스테이지별 리소스 프리로드
                if (sceneType === SceneType.GAMEPLAY || sceneType === SceneType.BOSS_ROOM) {
                    const stageId = this.getCurrentStageId();
                    await StageResourceManager.getInstance().preloadStageResources(stageId);
                }
                
                // 실제 씬 로딩
                director.loadScene(sceneType, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    private needsLoadingScreen(targetScene: SceneType): boolean {
        // 게임플레이 씬은 로딩 화면 필요
        return targetScene === SceneType.GAMEPLAY || targetScene === SceneType.BOSS_ROOM;
    }
    
    private async showLoadingScreen(tips?: string[]): Promise<void> {
        // 로딩 UI 표시
        const loadingUI = UIManager.getInstance().showScreen("LoadingScreen");
        
        // 로딩 팁 표시
        if (tips && tips.length > 0) {
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            loadingUI.setLoadingTip(randomTip);
        }
        
        // 로딩 진행률 시뮬레이션 (실제 로딩과 연동)
        await this.animateLoadingProgress();
    }
    
    private async animateLoadingProgress(): Promise<void> {
        return new Promise(resolve => {
            const updateProgress = () => {
                this.loadingProgress = Math.min(1.0, this.loadingProgress + 0.02);
                
                const loadingUI = UIManager.getInstance().getScreen("LoadingScreen");
                loadingUI?.updateProgress(this.loadingProgress);
                
                if (this.loadingProgress >= 1.0) {
                    resolve();
                } else {
                    requestAnimationFrame(updateProgress);
                }
            };
            
            updateProgress();
        });
    }
    
    private async playTransitionOut(type: "fade" | "slide", duration: number): Promise<void> {
        const transitionOverlay = UIManager.getInstance().getTransitionOverlay();
        
        switch (type) {
            case "fade":
                await transitionOverlay.fadeOut(duration);
                break;
            case "slide":
                await transitionOverlay.slideOut(duration);
                break;
        }
    }
    
    private async playTransitionIn(type: "fade" | "slide", duration: number): Promise<void> {
        const transitionOverlay = UIManager.getInstance().getTransitionOverlay();
        
        switch (type) {
            case "fade":
                await transitionOverlay.fadeIn(duration);
                break;
            case "slide":
                await transitionOverlay.slideIn(duration);
                break;
        }
    }
    
    getCurrentScene(): SceneType {
        return this.currentScene;
    }
    
    private getCurrentStageId(): string {
        // 현재 진행 중인 스테이지 ID 반환
        return GameProgressManager.getInstance().getCurrentStageId();
    }
}
```

---

## 7. 성능 최적화 시스템

### 7.1 성능 모니터링

```typescript
// [의도] 실시간 성능 모니터링 및 자동 최적화
// [책임] FPS, 메모리, 배터리 사용량 추적 및 동적 품질 조정

interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    drawCalls: number;
    triangleCount: number;
    textureMemory: number;
}

class PerformanceMonitor extends Component {
    private static instance: PerformanceMonitor;
    
    private metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        drawCalls: 0,
        triangleCount: 0,
        textureMemory: 0
    };
    
    private frameTimeHistory: number[] = [];
    private readonly HISTORY_SIZE = 60; // 1초간 기록
    private readonly WARNING_THRESHOLD = {
        fps: 30,
        memoryUsage: 200, // MB
        frameTime: 33.33 // ms
    };
    
    private qualityLevel: number = 2; // 0: Low, 1: Medium, 2: High
    
    static getInstance(): PerformanceMonitor {
        return PerformanceMonitor.instance;
    }
    
    protected update() {
        this.updateMetrics();
        this.checkPerformanceThresholds();
        this.optimizeIfNeeded();
    }
    
    private updateMetrics() {
        // FPS 계산
        const currentTime = performance.now();
        const frameTime = currentTime - (this.lastFrameTime || currentTime);
        this.lastFrameTime = currentTime;
        
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
            this.frameTimeHistory.shift();
        }
        
        // 평균 FPS 계산
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        this.metrics.fps = 1000 / avgFrameTime;
        this.metrics.frameTime = avgFrameTime;
        
        // 메모리 사용량 (추정)
        this.metrics.memoryUsage = this.estimateMemoryUsage();
        
        // 렌더링 통계
        const renderStats = this.getRenderingStats();
        this.metrics.drawCalls = renderStats.drawCalls;
        this.metrics.triangleCount = renderStats.triangleCount;
    }
    
    private checkPerformanceThresholds() {
        let needsOptimization = false;
        
        if (this.metrics.fps < this.WARNING_THRESHOLD.fps) {
            console.warn(`Low FPS detected: ${this.metrics.fps.toFixed(1)}`);
            needsOptimization = true;
        }
        
        if (this.metrics.memoryUsage > this.WARNING_THRESHOLD.memoryUsage) {
            console.warn(`High memory usage: ${this.metrics.memoryUsage}MB`);
            needsOptimization = true;
        }
        
        if (needsOptimization) {
            TypedEventBus.getInstance().emit("PerformanceWarning", {
                fps: this.metrics.fps,
                memoryUsage: this.metrics.memoryUsage
            });
        }
    }
    
    private optimizeIfNeeded() {
        // 3프레임 연속 낮은 성능이면 품질 낮추기
        const recentFPS = this.frameTimeHistory.slice(-3);
        const isConsistentlyLow = recentFPS.every(frameTime => 1000/frameTime < this.WARNING_THRESHOLD.fps);
        
        if (isConsistentlyLow && this.qualityLevel > 0) {
            this.lowerQualityLevel();
        }
        
        // 성능이 개선되면 품질 복구
        if (this.metrics.fps > 50 && this.qualityLevel < 2) {
            this.scheduleOnce(() => {
                if (this.metrics.fps > 45) { // 5초 후에도 좋은 성능 유지시
                    this.raiseQualityLevel();
                }
            }, 5);
        }
    }
    
    private lowerQualityLevel() {
        this.qualityLevel = Math.max(0, this.qualityLevel - 1);
        this.applyQualitySettings();
        console.log(`Quality lowered to level ${this.qualityLevel}`);
    }
    
    private raiseQualityLevel() {
        this.qualityLevel = Math.min(2, this.qualityLevel + 1);
        this.applyQualitySettings();
        console.log(`Quality raised to level ${this.qualityLevel}`);
    }
    
    private applyQualitySettings() {
        const settings = this.getQualitySettings(this.qualityLevel);
        
        // 렌더링 설정 적용
        RenderingSystem.getInstance().applyQualitySettings(settings);
        
        // 파티클 시스템 최적화
        EffectManager.getInstance().setParticleDensity(settings.particleDensity);
        
        // 그림자 품질 조정
        LightingSystem.getInstance().setShadowQuality(settings.shadowQuality);
    }
    
    private getQualitySettings(level: number) {
        const qualityConfigs = [
            // Low Quality
            {
                shadowQuality: 0,
                particleDensity: 0.3,
                textureQuality: 0.5,
                lodBias: 2.0,
                maxLights: 2
            },
            // Medium Quality  
            {
                shadowQuality: 1,
                particleDensity: 0.7,
                textureQuality: 0.8,
                lodBias: 1.0,
                maxLights: 4
            },
            // High Quality
            {
                shadowQuality: 2,
                particleDensity: 1.0,
                textureQuality: 1.0,
                lodBias: 0.5,
                maxLights: 8
            }
        ];
        
        return qualityConfigs[level];
    }
    
    private estimateMemoryUsage(): number {
        // 메모리 사용량 추정 로직
        let totalMemory = 0;
        
        // 텍스처 메모리
        totalMemory += ResourceManager.getInstance().getTextureMemoryUsage();
        
        // 오디오 메모리
        totalMemory += AudioManager.getInstance().getAudioMemoryUsage();
        
        // 기타 추정값
        totalMemory += 50; // Base memory usage
        
        return totalMemory;
    }
    
    private getRenderingStats() {
        // Cocos Creator의 렌더링 통계 정보 수집
        return {
            drawCalls: game.renderType === Game.RENDER_TYPE_WEBGL ? 
                cc.renderer._stats.drawCalls : 0,
            triangleCount: cc.renderer._stats.triangleCount || 0
        };
    }
    
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }
}
```

### 7.2 오브젝트 풀링 시스템

```typescript
// [의도] 자주 생성/파괴되는 오브젝트의 메모리 할당 최적화
// [책임] 화살, 이펙트, 적 등의 재사용 가능한 오브젝트 풀 관리

interface IPoolable {
    reset(): void;
    onSpawn(): void;
    onDespawn(): void;
}

class ObjectPool<T extends Node & IPoolable> {
    private pool: T[] = [];
    private activeObjects: Set<T> = new Set();
    private prefab: Prefab;
    private parent: Node;
    private maxSize: number;
    
    constructor(prefab: Prefab, parent: Node, initialSize: number = 10, maxSize: number = 100) {
        this.prefab = prefab;
        this.parent = parent;
        this.maxSize = maxSize;
        
        // 초기 오브젝트 생성
        for (let i = 0; i < initialSize; i++) {
            this.createNewObject();
        }
    }
    
    private createNewObject(): T {
        const obj = instantiate(this.prefab) as T;
        obj.parent = this.parent;
        obj.active = false;
        this.pool.push(obj);
        return obj;
    }
    
    spawn(): T | null {
        let obj: T;
        
        if (this.pool.length > 0) {
            obj = this.pool.pop()!;
        } else {
            // 풀이 비어있고 최대 크기에 도달했으면 null 반환
            if (this.activeObjects.size >= this.maxSize) {
                console.warn("Object pool reached maximum size");
                return null;
            }
            obj = this.createNewObject();
        }
        
        obj.active = true;
        obj.reset();
        obj.onSpawn();
        this.activeObjects.add(obj);
        
        return obj;
    }
    
    despawn(obj: T) {
        if (!this.activeObjects.has(obj)) {
            console.warn("Trying to despawn object not from this pool");
            return;
        }
        
        obj.onDespawn();
        obj.active = false;
        this.activeObjects.delete(obj);
        this.pool.push(obj);
    }
    
    despawnAll() {
        const objectsToReturn = Array.from(this.activeObjects);
        objectsToReturn.forEach(obj => this.despawn(obj));
    }
    
    getActiveCount(): number {
        return this.activeObjects.size;
    }
    
    getPoolSize(): number {
        return this.pool.length;
    }
}

// 글로벌 오브젝트 풀 매니저
class PoolManager extends Component {
    private static instance: PoolManager;
    private pools: Map<string, ObjectPool<any>> = new Map();
    
    static getInstance(): PoolManager {
        return PoolManager.instance;
    }
    
    createPool<T extends Node & IPoolable>(
        poolName: string,
        prefab: Prefab,
        parent: Node,
        initialSize: number = 10,
        maxSize: number = 100
    ): ObjectPool<T> {
        if (this.pools.has(poolName)) {
            console.warn(`Pool ${poolName} already exists`);
            return this.pools.get(poolName)!;
        }
        
        const pool = new ObjectPool<T>(prefab, parent, initialSize, maxSize);
        this.pools.set(poolName, pool);
        return pool;
    }
    
    getPool<T extends Node & IPoolable>(poolName: string): ObjectPool<T> | null {
        return this.pools.get(poolName) || null;
    }
    
    spawn<T extends Node & IPoolable>(poolName: string): T | null {
        const pool = this.pools.get(poolName);
        return pool ? pool.spawn() : null;
    }
    
    despawn<T extends Node & IPoolable>(poolName: string, obj: T) {
        const pool = this.pools.get(poolName);
        if (pool) {
            pool.despawn(obj);
        }
    }
    
    // 모든 풀의 통계 정보
    getPoolStats(): { [poolName: string]: { active: number; pooled: number } } {
        const stats: { [poolName: string]: { active: number; pooled: number } } = {};
        
        this.pools.forEach((pool, name) => {
            stats[name] = {
                active: pool.getActiveCount(),
                pooled: pool.getPoolSize()
            };
        });
        
        return stats;
    }
}

// 화살 오브젝트 예시
class Arrow extends Component implements IPoolable {
    private velocity: Vec3 = new Vec3();
    private damage: number = 10;
    private lifetime: number = 5; // 5초 후 자동 회수
    private timeAlive: number = 0;
    
    reset() {
        this.node.position = Vec3.ZERO;
        this.velocity = Vec3.ZERO;
        this.timeAlive = 0;
        this.damage = 10;
    }
    
    onSpawn() {
        // 스폰될 때 초기화
        this.timeAlive = 0;
    }
    
    onDespawn() {
        // 회수될 때 정리
    }
    
    initialize(startPos: Vec3, direction: Vec3, speed: number, damage: number) {
        this.node.position = startPos;
        this.velocity = direction.normalize().multiplyScalar(speed);
        this.damage = damage;
    }
    
    protected update(deltaTime: number) {
        // 이동
        this.node.position = this.node.position.add(this.velocity.multiplyScalar(deltaTime));
        
        // 생존 시간 체크
        this.timeAlive += deltaTime;
        if (this.timeAlive >= this.lifetime) {
            this.returnToPool();
        }
        
        // 충돌 체크
        this.checkCollisions();
    }
    
    private checkCollisions() {
        // 충돌 감지 로직
        // 충돌 시 데미지 처리 후 풀로 반환
    }
    
    private returnToPool() {
        PoolManager.getInstance().despawn("arrows", this.node as any);
    }
}
```

---

## 🔗 관련 문서

- [04. 전투 시스템 설계](./04-Combat-System-Design.md)
- [05. AI 시스템 설계](./05-AI-System-Design.md)
- [07. UI/UX 시스템 설계](./07-UI-UX-System.md)
- [09. 데이터 관리 시스템](./09-Data-Management.md)

---

**이 문서는 Shadow Archer 게임의 핵심 시스템 아키텍처를 정의합니다. 모든 다른 시스템들이 이 기반 위에서 구축됩니다.**