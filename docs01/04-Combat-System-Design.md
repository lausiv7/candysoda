# ⚔️ 04. 전투 시스템 설계 (Combat System Design)

*Shadow Archer 모바일 3D 소울라이크 게임의 전투 메커니즘 설계*

---

## 📖 목차

1. [전투 시스템 개요](#1-전투-시스템-개요)
2. [무기 시스템](#2-무기-시스템)  
3. [데미지 시스템](#3-데미지-시스템)
4. [상태 효과 시스템](#4-상태-효과-시스템)
5. [콤보 시스템](#5-콤보-시스템)
6. [방어 시스템](#6-방어-시스템)
7. [타겟팅 시스템](#7-타겟팅-시스템)
8. [밸런싱 시스템](#8-밸런싱-시스템)

---

## 1. 전투 시스템 개요

### 1.1 전투 철학

```typescript
// [의도] 소울라이크의 긴장감과 모바일의 편의성을 조화시킨 전투 시스템
// [책임] 패턴 학습, 타이밍 기반 전투의 핵심 로직 제공

enum CombatPhase {
    POSITIONING = "positioning",    // 위치 선정
    ENGAGEMENT = "engagement",      // 교전 시작
    EXECUTION = "execution",        // 공격/회피 실행
    RECOVERY = "recovery"           // 후속 조치
}

class CombatSystem extends Component {
    private static instance: CombatSystem;
    private currentPhase: CombatPhase = CombatPhase.POSITIONING;
    private combatParticipants: Set<CombatActor> = new Set();
    private combatZone: Rect = new Rect();
    
    static getInstance(): CombatSystem {
        return CombatSystem.instance;
    }
    
    // 전투 시작
    initiateCombat(player: Player, enemies: Enemy[]) {
        this.combatParticipants.clear();
        this.combatParticipants.add(player);
        enemies.forEach(enemy => this.combatParticipants.add(enemy));
        
        this.currentPhase = CombatPhase.POSITIONING;
        this.setupCombatZone();
        
        TypedEventBus.getInstance().emit("CombatStarted", {
            participantCount: this.combatParticipants.size,
            combatZone: this.combatZone
        });
    }
    
    // 전투 업데이트
    update(deltaTime: number) {
        this.updateCombatPhase(deltaTime);
        this.processCombatActions(deltaTime);
        this.checkCombatEnd();
    }
    
    private updateCombatPhase(deltaTime: number) {
        switch (this.currentPhase) {
            case CombatPhase.POSITIONING:
                this.handlePositioning(deltaTime);
                break;
            case CombatPhase.ENGAGEMENT:
                this.handleEngagement(deltaTime);
                break;
            case CombatPhase.EXECUTION:
                this.handleExecution(deltaTime);
                break;
            case CombatPhase.RECOVERY:
                this.handleRecovery(deltaTime);
                break;
        }
    }
}
```

### 1.2 전투 액터 시스템

```typescript
// [의도] 플레이어와 적을 통합하여 관리하는 전투 액터 기반 시스템
// [책임] 모든 전투 참여자의 공통 인터페이스 및 상호작용 로직

interface ICombatActor {
    readonly actorId: string;
    readonly actorType: ActorType;
    readonly position: Vec3;
    
    // 전투 능력치
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    
    // 전투 상태
    isAlive: boolean;
    isInvulnerable: boolean;
    currentWeapon: IWeapon | null;
    
    // 전투 액션
    attack(target: ICombatActor, weaponType: WeaponType): Promise<AttackResult>;
    takeDamage(damage: DamageData): boolean;
    dodge(direction: Vec3): boolean;
    block(attackDirection: Vec3): boolean;
}

enum ActorType {
    PLAYER = "player",
    ENEMY = "enemy", 
    BOSS = "boss",
    NPC = "npc"
}

abstract class CombatActor extends Component implements ICombatActor {
    @property(String)
    actorId: string = "";
    
    @property({ type: Enum(ActorType) })
    actorType: ActorType = ActorType.ENEMY;
    
    // 기본 능력치
    @property(Number)
    maxHealth: number = 100;
    
    @property(Number)
    maxStamina: number = 100;
    
    protected _health: number;
    protected _stamina: number;
    protected _isInvulnerable: boolean = false;
    protected _currentWeapon: IWeapon | null = null;
    
    // 전투 상태 효과
    protected statusEffects: Map<string, StatusEffect> = new Map();
    
    get health(): number { return this._health; }
    get stamina(): number { return this._stamina; }
    get isAlive(): boolean { return this._health > 0; }
    get isInvulnerable(): boolean { return this._isInvulnerable; }
    get currentWeapon(): IWeapon | null { return this._currentWeapon; }
    get position(): Vec3 { return this.node.worldPosition; }
    
    protected onLoad() {
        this._health = this.maxHealth;
        this._stamina = this.maxStamina;
        this.initialize();
    }
    
    protected abstract initialize(): void;
    
    // 공격 실행
    async attack(target: ICombatActor, weaponType: WeaponType): Promise<AttackResult> {
        if (!this.canAttack(weaponType)) {
            return { success: false, reason: "Cannot attack" };
        }
        
        const weapon = this.getWeapon(weaponType);
        if (!weapon) {
            return { success: false, reason: "No weapon equipped" };
        }
        
        // 스태미나 소모
        if (!this.consumeStamina(weapon.staminaCost)) {
            return { success: false, reason: "Insufficient stamina" };
        }
        
        // 공격 애니메이션 및 타이밍
        await this.playAttackAnimation(weapon);
        
        // 사거리 및 각도 체크
        if (!this.isTargetInRange(target, weapon)) {
            return { success: false, reason: "Target out of range" };
        }
        
        // 데미지 계산 및 적용
        const damage = this.calculateDamage(weapon, target);
        const hitResult = target.takeDamage(damage);
        
        // 공격 효과 이벤트
        TypedEventBus.getInstance().emit("DamageDealt", {
            attacker: this.node,
            target: target.node,
            damage: damage.amount,
            isCritical: damage.isCritical
        });
        
        return {
            success: true,
            damageDealt: damage.amount,
            isCritical: damage.isCritical,
            targetKilled: !target.isAlive
        };
    }
    
    // 피해 받기
    takeDamage(damageData: DamageData): boolean {
        if (!this.isAlive || this.isInvulnerable) {
            return false;
        }
        
        // 방어력 적용
        const finalDamage = this.applyDefense(damageData);
        
        // 체력 감소
        this._health = Math.max(0, this._health - finalDamage.amount);
        
        // 피격 반응
        this.onTakeDamage(finalDamage);
        
        // 죽음 처리
        if (this._health <= 0) {
            this.onDeath();
            return true; // 죽음 발생
        }
        
        return false;
    }
    
    // 회피
    dodge(direction: Vec3): boolean {
        if (!this.canDodge()) {
            return false;
        }
        
        if (!this.consumeStamina(20)) { // 회피 스태미나 비용
            return false;
        }
        
        // 회피 실행
        this.executeDodge(direction);
        
        return true;
    }
    
    protected abstract canAttack(weaponType: WeaponType): boolean;
    protected abstract canDodge(): boolean;
    protected abstract getWeapon(weaponType: WeaponType): IWeapon | null;
    protected abstract calculateDamage(weapon: IWeapon, target: ICombatActor): DamageData;
    protected abstract applyDefense(damageData: DamageData): DamageData;
    protected abstract onTakeDamage(damage: DamageData): void;
    protected abstract onDeath(): void;
}
```

---

## 2. 무기 시스템

### 2.1 무기 인터페이스 및 기본 구조

```typescript
// [의도] 원거리/근접 무기를 통합 관리하는 무기 시스템
// [책임] 무기별 고유 특성과 공격 패턴 정의

enum WeaponType {
    // 원거리 무기
    BOW = "bow",
    CROSSBOW = "crossbow",
    MAGIC_BOW = "magic_bow",
    
    // 근접 무기
    DAGGER = "dagger",
    SWORD = "sword",
    SHIELD = "shield"
}

enum AttackType {
    SINGLE_SHOT = "single_shot",      // 단발
    CHARGE_SHOT = "charge_shot",      // 차지 공격
    RAPID_FIRE = "rapid_fire",        // 연사
    MELEE_COMBO = "melee_combo",      // 근접 콤보
    SPECIAL_SKILL = "special_skill"   // 특수 기술
}

interface IWeapon {
    readonly weaponId: string;
    readonly weaponType: WeaponType;
    readonly name: string;
    
    // 기본 스탯
    baseDamage: number;
    criticalChance: number;
    criticalMultiplier: number;
    range: number;
    attackSpeed: number;
    staminaCost: number;
    
    // 특수 속성
    specialEffects: WeaponEffect[];
    upgradeLevel: number;
    durability: number;
    
    // 공격 실행
    executeAttack(attacker: ICombatActor, target: ICombatActor, attackType: AttackType): Promise<AttackResult>;
    canExecuteAttack(attacker: ICombatActor, attackType: AttackType): boolean;
    getAttackPattern(attackType: AttackType): AttackPattern;
}

abstract class Weapon extends Component implements IWeapon {
    @property(String)
    weaponId: string = "";
    
    @property(String)  
    name: string = "";
    
    @property({ type: Enum(WeaponType) })
    weaponType: WeaponType = WeaponType.BOW;
    
    @property(Number)
    baseDamage: number = 20;
    
    @property({ range: [0, 1] })
    criticalChance: number = 0.1;
    
    @property({ min: 1.5 })
    criticalMultiplier: number = 2.0;
    
    @property(Number)
    range: number = 10;
    
    @property(Number)
    attackSpeed: number = 1.0;
    
    @property(Number)
    staminaCost: number = 15;
    
    @property(Number)
    upgradeLevel: number = 0;
    
    specialEffects: WeaponEffect[] = [];
    durability: number = 100;
    
    abstract executeAttack(attacker: ICombatActor, target: ICombatActor, attackType: AttackType): Promise<AttackResult>;
    abstract canExecuteAttack(attacker: ICombatActor, attackType: AttackType): boolean;
    abstract getAttackPattern(attackType: AttackType): AttackPattern;
    
    // 무기 강화
    upgrade(): boolean {
        if (this.upgradeLevel >= 10) return false;
        
        this.upgradeLevel++;
        this.baseDamage *= 1.1;
        this.criticalChance = Math.min(0.5, this.criticalChance + 0.02);
        
        return true;
    }
    
    // 내구도 감소
    reduceDurability(amount: number = 1) {
        this.durability = Math.max(0, this.durability - amount);
        if (this.durability <= 0) {
            this.onWeaponBroken();
        }
    }
    
    protected onWeaponBroken() {
        // 무기 파괴 처리
        TypedEventBus.getInstance().emit("WeaponBroken", {
            weaponId: this.weaponId,
            weaponType: this.weaponType
        });
    }
}
```

### 2.2 활 무기 시스템

```typescript
// [의도] 게임의 핵심 무기인 활의 상세한 공격 시스템
// [책임] 조준, 차지, 발사의 3단계 활 공격 메커니즘

class Bow extends Weapon {
    @property(Number)
    chargeTime: number = 1.0; // 최대 차지 시간
    
    @property(Number)
    maxChargeMultiplier: number = 2.5; // 최대 차지 데미지 배율
    
    @property(Prefab)
    arrowPrefab: Prefab = null!;
    
    private currentCharge: number = 0;
    private isCharging: boolean = false;
    private aimDirection: Vec3 = Vec3.ZERO;
    
    protected onLoad() {
        this.weaponType = WeaponType.BOW;
    }
    
    async executeAttack(attacker: ICombatActor, target: ICombatActor, attackType: AttackType): Promise<AttackResult> {
        switch (attackType) {
            case AttackType.SINGLE_SHOT:
                return this.executeSingleShot(attacker, target);
            case AttackType.CHARGE_SHOT:
                return this.executeChargeShot(attacker, target);
            case AttackType.RAPID_FIRE:
                return this.executeRapidFire(attacker, target);
            default:
                return { success: false, reason: "Invalid attack type for bow" };
        }
    }
    
    canExecuteAttack(attacker: ICombatActor, attackType: AttackType): boolean {
        // 스태미나 체크
        const staminaCost = this.getStaminaCostForAttack(attackType);
        if (attacker.stamina < staminaCost) return false;
        
        // 사거리 체크 (원거리 무기)
        const distance = Vec3.distance(attacker.position, target.position);
        return distance <= this.range;
    }
    
    getAttackPattern(attackType: AttackType): AttackPattern {
        switch (attackType) {
            case AttackType.SINGLE_SHOT:
                return {
                    windupTime: 0.2,
                    activeTime: 0.1,
                    recoveryTime: 0.3,
                    hitboxes: [this.createArrowHitbox()]
                };
            case AttackType.CHARGE_SHOT:
                return {
                    windupTime: this.chargeTime,
                    activeTime: 0.1,
                    recoveryTime: 0.5,
                    hitboxes: [this.createChargedArrowHitbox()]
                };
            default:
                return this.getDefaultAttackPattern();
        }
    }
    
    private async executeSingleShot(attacker: ICombatActor, target: ICombatActor): Promise<AttackResult> {
        // 화살 생성
        const arrow = this.createArrow(attacker.position, target.position);
        
        // 즉시 발사
        arrow.fire(this.baseDamage, 1.0); // 차지 배율 1.0
        
        // 애니메이션 재생
        this.playShootAnimation("single_shot");
        
        return {
            success: true,
            damageDealt: this.baseDamage,
            isCritical: Math.random() < this.criticalChance,
            projectile: arrow
        };
    }
    
    private async executeChargeShot(attacker: ICombatActor, target: ICombatActor): Promise<AttackResult> {
        // 차지 시작
        this.startCharging();
        
        // 차지 완료 대기
        await this.waitForCharge();
        
        // 강화된 화살 생성
        const arrow = this.createArrow(attacker.position, target.position);
        const chargeMultiplier = this.getCurrentChargeMultiplier();
        
        // 차지된 데미지로 발사
        arrow.fire(this.baseDamage * chargeMultiplier, chargeMultiplier);
        
        // 차지샷 애니메이션
        this.playShootAnimation("charge_shot");
        
        // 차지 초기화
        this.stopCharging();
        
        return {
            success: true,
            damageDealt: this.baseDamage * chargeMultiplier,
            isCritical: Math.random() < (this.criticalChance * chargeMultiplier),
            projectile: arrow
        };
    }
    
    private async executeRapidFire(attacker: ICombatActor, target: ICombatActor): Promise<AttackResult> {
        const shotCount = 3;
        const shotInterval = 0.15; // 0.15초 간격
        const arrows: Arrow[] = [];
        
        for (let i = 0; i < shotCount; i++) {
            const arrow = this.createArrow(attacker.position, target.position);
            const damage = this.baseDamage * 0.7; // 연사는 개별 데미지 감소
            
            arrow.fire(damage, 0.7);
            arrows.push(arrow);
            
            if (i < shotCount - 1) {
                await this.delay(shotInterval);
            }
        }
        
        this.playShootAnimation("rapid_fire");
        
        return {
            success: true,
            damageDealt: this.baseDamage * 0.7 * shotCount,
            isCritical: false, // 연사는 크리티컬 없음
            projectiles: arrows
        };
    }
    
    // 차지 관련 메서드
    startCharging() {
        this.isCharging = true;
        this.currentCharge = 0;
        
        // 차지 UI 표시
        TypedEventBus.getInstance().emit("StartCharging", {
            maxChargeTime: this.chargeTime,
            maxMultiplier: this.maxChargeMultiplier
        });
    }
    
    updateCharge(deltaTime: number) {
        if (!this.isCharging) return;
        
        this.currentCharge = Math.min(this.chargeTime, this.currentCharge + deltaTime);
        
        // 차지 진행률 UI 업데이트
        TypedEventBus.getInstance().emit("UpdateCharge", {
            chargeProgress: this.currentCharge / this.chargeTime,
            chargeMultiplier: this.getCurrentChargeMultiplier()
        });
    }
    
    stopCharging() {
        this.isCharging = false;
        this.currentCharge = 0;
        
        TypedEventBus.getInstance().emit("StopCharging", {});
    }
    
    getCurrentChargeMultiplier(): number {
        const chargeRatio = this.currentCharge / this.chargeTime;
        return 1.0 + (this.maxChargeMultiplier - 1.0) * chargeRatio;
    }
    
    private createArrow(startPos: Vec3, targetPos: Vec3): Arrow {
        // 오브젝트 풀에서 화살 가져오기
        const arrowNode = PoolManager.getInstance().spawn<Arrow>("arrows");
        
        if (!arrowNode) {
            // 풀이 비어있으면 새로 생성
            const newArrow = instantiate(this.arrowPrefab);
            return newArrow.getComponent(Arrow)!;
        }
        
        const arrow = arrowNode.getComponent(Arrow)!;
        
        // 화살 방향 계산
        const direction = targetPos.subtract(startPos).normalize();
        arrow.initialize(startPos, direction, this.getArrowSpeed(), this.baseDamage);
        
        return arrow;
    }
    
    private getArrowSpeed(): number {
        return 20; // 기본 화살 속도
    }
    
    private getStaminaCostForAttack(attackType: AttackType): number {
        switch (attackType) {
            case AttackType.SINGLE_SHOT:
                return this.staminaCost;
            case AttackType.CHARGE_SHOT:
                return this.staminaCost * 1.5;
            case AttackType.RAPID_FIRE:
                return this.staminaCost * 2;
            default:
                return this.staminaCost;
        }
    }
}
```

### 2.3 화살 시스템

```typescript
// [의도] 물리 기반 발사체 시스템으로 현실적인 궤도 구현
// [책임] 화살의 이동, 충돌, 데미지 처리

class Arrow extends Component implements IPoolable {
    @property(Number)
    speed: number = 20;
    
    @property(Number)
    gravity: number = 9.8;
    
    @property(Number)
    penetrationPower: number = 1; // 관통력
    
    private velocity: Vec3 = Vec3.ZERO;
    private damage: number = 0;
    private chargeMultiplier: number = 1.0;
    private hitTargets: Set<ICombatActor> = new Set();
    private lifetime: number = 5;
    private timeAlive: number = 0;
    private trail: ParticleSystem | null = null;
    
    // IPoolable 구현
    reset() {
        this.node.position = Vec3.ZERO;
        this.velocity = Vec3.ZERO;
        this.damage = 0;
        this.chargeMultiplier = 1.0;
        this.hitTargets.clear();
        this.timeAlive = 0;
        
        if (this.trail) {
            this.trail.stop();
        }
    }
    
    onSpawn() {
        this.timeAlive = 0;
        if (this.trail) {
            this.trail.play();
        }
    }
    
    onDespawn() {
        if (this.trail) {
            this.trail.stop();
        }
    }
    
    initialize(startPos: Vec3, direction: Vec3, speed: number, damage: number) {
        this.node.position = startPos;
        this.velocity = direction.multiplyScalar(speed);
        this.speed = speed;
        this.damage = damage;
        
        // 화살 방향 설정 (화살이 날아가는 방향을 보도록)
        this.node.lookAt(startPos.add(direction));
        
        // 궤적 이펙트 시작
        this.startTrailEffect();
    }
    
    fire(damage: number, chargeMultiplier: number) {
        this.damage = damage;
        this.chargeMultiplier = chargeMultiplier;
        
        // 차지된 정도에 따라 이펙트 강화
        if (chargeMultiplier > 1.5) {
            this.enhanceArrowEffect();
        }
    }
    
    protected update(deltaTime: number) {
        if (!this.node.active) return;
        
        this.updateMovement(deltaTime);
        this.checkCollisions();
        this.updateLifetime(deltaTime);
    }
    
    private updateMovement(deltaTime: number) {
        // 중력 적용
        this.velocity.y -= this.gravity * deltaTime;
        
        // 위치 업데이트
        const movement = this.velocity.multiplyScalar(deltaTime);
        this.node.position = this.node.position.add(movement);
        
        // 화살이 날아가는 방향을 보도록 회전
        const nextPos = this.node.position.add(this.velocity.multiplyScalar(0.1));
        this.node.lookAt(nextPos);
    }
    
    private checkCollisions() {
        // 물리 레이캐스트로 충돌 감지
        const rayStart = this.node.position;
        const rayDirection = this.velocity.normalize();
        const rayDistance = this.velocity.length() * 0.016; // 1프레임 이동거리
        
        const hitResults = PhysicsSystem.instance.raycast(rayStart, rayDirection, rayDistance, 
            CollisionLayers.ENEMY | CollisionLayers.ENVIRONMENT);
        
        if (hitResults.length > 0) {
            const closestHit = hitResults[0];
            this.handleCollision(closestHit);
        }
    }
    
    private handleCollision(hit: RaycastResult) {
        const hitObject = hit.collider.node;
        const combatActor = hitObject.getComponent("CombatActor") as ICombatActor;
        
        if (combatActor && !this.hitTargets.has(combatActor)) {
            // 아직 맞지 않은 대상이면 데미지 적용
            this.dealDamage(combatActor, hit);
            this.hitTargets.add(combatActor);
            
            // 관통력이 없으면 화살 소멸
            if (this.penetrationPower <= 1) {
                this.onHitTarget();
                return;
            } else {
                this.penetrationPower--;
            }
        } else if (!combatActor) {
            // 환경 오브젝트에 맞으면 화살 박히기
            this.stickToSurface(hit);
            return;
        }
    }
    
    private dealDamage(target: ICombatActor, hit: RaycastResult) {
        // 기본 데미지 계산
        let finalDamage = this.damage * this.chargeMultiplier;
        
        // 크리티컬 체크 (헤드샷 등)
        const isCritical = this.checkCriticalHit(target, hit);
        if (isCritical) {
            finalDamage *= 2.0;
        }
        
        // 데미지 데이터 생성
        const damageData: DamageData = {
            amount: finalDamage,
            type: DamageType.PIERCING,
            source: this.node,
            isCritical: isCritical,
            hitPosition: hit.point,
            hitDirection: this.velocity.normalize()
        };
        
        // 데미지 적용
        const killed = target.takeDamage(damageData);
        
        // 히트 이펙트
        this.playHitEffect(hit.point, isCritical);
        
        // 데미지 이벤트 발행
        TypedEventBus.getInstance().emit("DamageDealt", {
            attacker: this.node,
            target: target.node,
            damage: finalDamage,
            isCritical: isCritical
        });
        
        if (killed) {
            TypedEventBus.getInstance().emit("EnemyDefeated", {
                enemy: target.node,
                experience: this.calculateExperience(target),
                loot: this.generateLoot(target)
            });
        }
    }
    
    private checkCriticalHit(target: ICombatActor, hit: RaycastResult): boolean {
        // 히트박스별 크리티컬 판정
        const hitboxName = hit.collider.node.name.toLowerCase();
        
        if (hitboxName.includes("head")) {
            return Math.random() < 0.8; // 헤드샷 80% 크리티컬
        } else if (hitboxName.includes("weak")) {
            return Math.random() < 0.5; // 약점 50% 크리티컬
        }
        
        return Math.random() < 0.1; // 일반 부위 10% 크리티컬
    }
    
    private onHitTarget() {
        // 타격 시 화살 소멸
        this.playDestroyEffect();
        this.returnToPool();
    }
    
    private stickToSurface(hit: RaycastResult) {
        // 표면에 화살 박기
        this.node.position = hit.point;
        this.velocity = Vec3.ZERO;
        
        // 잠시 후 사라지도록 스케줄
        this.scheduleOnce(() => {
            this.returnToPool();
        }, 3);
    }
    
    private returnToPool() {
        PoolManager.getInstance().despawn("arrows", this.node as any);
    }
    
    private updateLifetime(deltaTime: number) {
        this.timeAlive += deltaTime;
        if (this.timeAlive >= this.lifetime) {
            this.returnToPool();
        }
    }
    
    private startTrailEffect() {
        this.trail = this.node.getChildByName("Trail")?.getComponent(ParticleSystem);
        if (this.trail) {
            this.trail.play();
        }
    }
    
    private enhanceArrowEffect() {
        // 차지된 화살의 특수 이펙트
        const glowEffect = this.node.getChildByName("Glow");
        if (glowEffect) {
            glowEffect.active = true;
        }
        
        if (this.trail) {
            // 궤적 이펙트 강화
            this.trail.startSize = this.trail.startSize * this.chargeMultiplier;
            this.trail.startColor = Color.YELLOW; // 차지샷은 노란색
        }
    }
    
    private playHitEffect(position: Vec3, isCritical: boolean) {
        const effectName = isCritical ? "critical_hit" : "arrow_hit";
        EffectManager.getInstance().playEffect(effectName, position);
    }
    
    private playDestroyEffect() {
        EffectManager.getInstance().playEffect("arrow_break", this.node.position);
    }
}
```

---

## 3. 데미지 시스템

### 3.1 데미지 계산 시스템

```typescript
// [의도] 복합적인 데미지 계산 로직을 체계적으로 관리
// [책임] 기본 데미지, 크리티컬, 속성, 방어력 등을 종합한 최종 데미지 산출

enum DamageType {
    PHYSICAL = "physical",      // 물리 데미지
    PIERCING = "piercing",      // 관통 데미지  
    FIRE = "fire",             // 화염 데미지
    ICE = "ice",               // 냉기 데미지
    LIGHTNING = "lightning",    // 번개 데미지
    POISON = "poison",         // 독 데미지
    TRUE = "true"              // 고정 데미지 (방어 무시)
}

interface DamageData {
    amount: number;
    type: DamageType;
    source: Node;
    isCritical: boolean;
    hitPosition: Vec3;
    hitDirection: Vec3;
    penetration?: number;       // 방어 관통
    statusEffect?: StatusEffect; // 상태 이상
}

interface DamageModifier {
    readonly name: string;
    readonly priority: number;  // 적용 순서 (낮을수록 먼저)
    apply(damage: DamageData, target: ICombatActor): DamageData;
}

class DamageCalculator extends Component {
    private static instance: DamageCalculator;
    private damageModifiers: DamageModifier[] = [];
    
    static getInstance(): DamageCalculator {
        return DamageCalculator.instance;
    }
    
    // 기본 데미지 계산
    calculateBaseDamage(
        attacker: ICombatActor, 
        weapon: IWeapon, 
        target: ICombatActor,
        attackType: AttackType
    ): DamageData {
        
        // 기본 데미지 = 무기 데미지 + 공격자 스탯 보너스
        let baseDamage = weapon.baseDamage + this.getAttackerDamageBonus(attacker);
        
        // 공격 타입별 보정
        baseDamage *= this.getAttackTypeMultiplier(attackType);
        
        // 크리티컬 판정
        const isCritical = Math.random() < weapon.criticalChance;
        if (isCritical) {
            baseDamage *= weapon.criticalMultiplier;
        }
        
        // 거리별 데미지 보정 (원거리 무기)
        if (this.isRangedWeapon(weapon.weaponType)) {
            const distance = Vec3.distance(attacker.position, target.position);
            baseDamage *= this.getDistanceDamageMultiplier(distance, weapon.range);
        }
        
        return {
            amount: baseDamage,
            type: this.getWeaponDamageType(weapon),
            source: attacker.node,
            isCritical: isCritical,
            hitPosition: target.position,
            hitDirection: target.position.subtract(attacker.position).normalize()
        };
    }
    
    // 최종 데미지 계산 (모든 보정 적용)
    calculateFinalDamage(damageData: DamageData, target: ICombatActor): DamageData {
        let finalDamage = { ...damageData };
        
        // 데미지 수정자들을 우선순위 순으로 적용
        this.damageModifiers
            .sort((a, b) => a.priority - b.priority)
            .forEach(modifier => {
                finalDamage = modifier.apply(finalDamage, target);
            });
        
        // 방어력 적용
        finalDamage = this.applyDefense(finalDamage, target);
        
        // 최소 데미지 보장
        finalDamage.amount = Math.max(1, finalDamage.amount);
        
        return finalDamage;
    }
    
    private getAttackerDamageBonus(attacker: ICombatActor): number {
        // 공격자의 스탯 기반 데미지 보너스
        const stats = attacker.getComponent("CharacterStats") as CharacterStats;
        if (!stats) return 0;
        
        return stats.strength * 0.5 + stats.dexterity * 0.3;
    }
    
    private getAttackTypeMultiplier(attackType: AttackType): number {
        switch (attackType) {
            case AttackType.SINGLE_SHOT:
                return 1.0;
            case AttackType.CHARGE_SHOT:
                return 1.5; // 차지샷은 50% 추가 데미지
            case AttackType.RAPID_FIRE:
                return 0.7; // 연사는 개별 데미지 감소
            case AttackType.MELEE_COMBO:
                return 1.2;
            case AttackType.SPECIAL_SKILL:
                return 2.0;
            default:
                return 1.0;
        }
    }
    
    private getDistanceDamageMultiplier(distance: number, weaponRange: number): number {
        // 최적 거리에서 최대 데미지, 너무 가깝거나 멀면 감소
        const optimalDistance = weaponRange * 0.7;
        
        if (distance <= optimalDistance) {
            // 너무 가까우면 데미지 감소 (최소 70%)
            return Math.max(0.7, distance / optimalDistance);
        } else {
            // 너무 멀면 데미지 감소
            const falloffStart = optimalDistance;
            const falloffEnd = weaponRange;
            const falloffRatio = (distance - falloffStart) / (falloffEnd - falloffStart);
            return Math.max(0.3, 1.0 - falloffRatio * 0.7);
        }
    }
    
    private applyDefense(damageData: DamageData, target: ICombatActor): DamageData {
        const defense = this.getTargetDefense(target, damageData.type);
        
        // 방어 관통 적용
        const effectiveDefense = Math.max(0, defense - (damageData.penetration || 0));
        
        // 방어력 적용 (방어력 / (방어력 + 100) 공식)
        const damageReduction = effectiveDefense / (effectiveDefense + 100);
        const finalAmount = damageData.amount * (1 - damageReduction);
        
        return {
            ...damageData,
            amount: finalAmount
        };
    }
    
    private getTargetDefense(target: ICombatActor, damageType: DamageType): number {
        const stats = target.getComponent("CharacterStats") as CharacterStats;
        if (!stats) return 0;
        
        // 데미지 타입별 방어력
        switch (damageType) {
            case DamageType.PHYSICAL:
                return stats.physicalDefense;
            case DamageType.PIERCING:
                return stats.physicalDefense * 0.5; // 관통은 물리 방어력 절반만 적용
            case DamageType.FIRE:
                return stats.fireResistance;
            case DamageType.ICE:
                return stats.iceResistance;
            case DamageType.LIGHTNING:
                return stats.lightningResistance;
            case DamageType.POISON:
                return stats.poisonResistance;
            case DamageType.TRUE:
                return 0; // 고정 데미지는 방어 무시
            default:
                return stats.physicalDefense;
        }
    }
    
    // 데미지 수정자 등록
    registerDamageModifier(modifier: DamageModifier) {
        this.damageModifiers.push(modifier);
    }
    
    unregisterDamageModifier(modifierName: string) {
        this.damageModifiers = this.damageModifiers.filter(m => m.name !== modifierName);
    }
}
```

### 3.2 데미지 수정자 시스템

```typescript
// [의도] 다양한 상황별 데미지 보정 로직을 모듈화
// [책임] 버프/디버프, 특수 효과, 환경 요소 등의 데미지 수정

// 크리티컬 데미지 수정자
class CriticalDamageModifier implements DamageModifier {
    readonly name = "CriticalDamage";
    readonly priority = 1;
    
    apply(damage: DamageData, target: ICombatActor): DamageData {
        if (!damage.isCritical) return damage;
        
        // 크리티컬 시 특수 효과
        const enhancedDamage = { ...damage };
        
        // 크리티컬 시 상태 이상 확률 증가
        if (Math.random() < 0.3) {
            enhancedDamage.statusEffect = {
                type: StatusEffectType.BLEEDING,
                duration: 3,
                intensity: 1
            };
        }
        
        return enhancedDamage;
    }
}

// 버프/디버프 데미지 수정자
class BuffDebuffModifier implements DamageModifier {
    readonly name = "BuffDebuff";
    readonly priority = 2;
    
    apply(damage: DamageData, target: ICombatActor): DamageData {
        const attacker = damage.source.getComponent("CombatActor") as ICombatActor;
        if (!attacker) return damage;
        
        let multiplier = 1.0;
        
        // 공격자 버프 확인
        const attackerBuffs = this.getActiveBuffs(attacker);
        attackerBuffs.forEach(buff => {
            if (buff.type === StatusEffectType.DAMAGE_BOOST) {
                multiplier *= (1 + buff.intensity * 0.2);
            }
        });
        
        // 대상 디버프 확인
        const targetDebuffs = this.getActiveDebuffs(target);
        targetDebuffs.forEach(debuff => {
            if (debuff.type === StatusEffectType.VULNERABILITY) {
                multiplier *= (1 + debuff.intensity * 0.3);
            }
        });
        
        return {
            ...damage,
            amount: damage.amount * multiplier
        };
    }
    
    private getActiveBuffs(actor: ICombatActor): StatusEffect[] {
        const statusComponent = actor.getComponent("StatusEffectComponent");
        return statusComponent ? statusComponent.getActiveBuffs() : [];
    }
    
    private getActiveDebuffs(actor: ICombatActor): StatusEffect[] {
        const statusComponent = actor.getComponent("StatusEffectComponent");
        return statusComponent ? statusComponent.getActiveDebuffs() : [];
    }
}

// 환경 데미지 수정자
class EnvironmentalModifier implements DamageModifier {
    readonly name = "Environmental";
    readonly priority = 3;
    
    apply(damage: DamageData, target: ICombatActor): DamageData {
        const environment = EnvironmentManager.getInstance().getCurrentEnvironment();
        let multiplier = 1.0;
        
        // 환경별 데미지 보정
        switch (environment.type) {
            case EnvironmentType.RAIN:
                if (damage.type === DamageType.LIGHTNING) {
                    multiplier *= 1.5; // 비 오는 날 번개 데미지 증가
                }
                break;
            case EnvironmentType.FIRE:
                if (damage.type === DamageType.FIRE) {
                    multiplier *= 1.3; // 화염 지대에서 화염 데미지 증가
                } else if (damage.type === DamageType.ICE) {
                    multiplier *= 0.7; // 화염 지대에서 냉기 데미지 감소
                }
                break;
            case EnvironmentType.ICE:
                if (damage.type === DamageType.ICE) {
                    multiplier *= 1.3;
                } else if (damage.type === DamageType.FIRE) {
                    multiplier *= 0.7;
                }
                break;
        }
        
        return {
            ...damage,
            amount: damage.amount * multiplier
        };
    }
}
```

---

## 4. 상태 효과 시스템

### 4.1 상태 효과 기반 구조

```typescript
// [의도] 다양한 상태 이상과 버프를 통합 관리하는 시스템
// [책임] 상태 효과의 적용, 지속, 해제 및 상호작용 처리

enum StatusEffectType {
    // 디버프
    POISON = "poison",
    BLEEDING = "bleeding", 
    FREEZE = "freeze",
    STUN = "stun",
    SLOW = "slow",
    VULNERABILITY = "vulnerability",
    
    // 버프
    DAMAGE_BOOST = "damage_boost",
    SPEED_BOOST = "speed_boost",
    REGENERATION = "regeneration",
    INVULNERABILITY = "invulnerability",
    CRITICAL_BOOST = "critical_boost"
}

interface StatusEffect {
    readonly id: string;
    readonly type: StatusEffectType;
    readonly name: string;
    duration: number;
    intensity: number;
    tickInterval?: number;    // DoT/HoT 간격
    stackable: boolean;       // 중첩 가능 여부
    maxStacks?: number;       // 최대 중첩 수
    
    onApply(target: ICombatActor): void;
    onTick(target: ICombatActor, deltaTime: number): void;
    onRemove(target: ICombatActor): void;
    canStack(other: StatusEffect): boolean;
}

abstract class BaseStatusEffect implements StatusEffect {
    readonly id: string;
    readonly type: StatusEffectType;
    readonly name: string;
    duration: number;
    intensity: number;
    tickInterval?: number;
    stackable: boolean = false;
    maxStacks?: number;
    
    private lastTickTime: number = 0;
    
    constructor(type: StatusEffectType, name: string, duration: number, intensity: number = 1) {
        this.id = `${type}_${Date.now()}_${Math.random()}`;
        this.type = type;
        this.name = name;
        this.duration = duration;
        this.intensity = intensity;
    }
    
    abstract onApply(target: ICombatActor): void;
    abstract onTick(target: ICombatActor, deltaTime: number): void;
    abstract onRemove(target: ICombatActor): void;
    
    canStack(other: StatusEffect): boolean {
        return this.stackable && this.type === other.type;
    }
    
    update(target: ICombatActor, deltaTime: number) {
        // 지속시간 감소
        this.duration -= deltaTime;
        
        // 틱 처리
        if (this.tickInterval) {
            this.lastTickTime += deltaTime;
            if (this.lastTickTime >= this.tickInterval) {
                this.onTick(target, deltaTime);
                this.lastTickTime = 0;
            }
        }
        
        // 만료 확인
        return this.duration > 0;
    }
}

// 독 상태 효과
class PoisonEffect extends BaseStatusEffect {
    constructor(duration: number, intensity: number) {
        super(StatusEffectType.POISON, "독", duration, intensity);
        this.tickInterval = 1.0; // 1초마다 데미지
        this.stackable = true;
        this.maxStacks = 3;
    }
    
    onApply(target: ICombatActor): void {
        // 독 적용 시각 효과  
        EffectManager.getInstance().playEffect("poison_applied", target.position);
        
        // UI에 상태 표시
        TypedEventBus.getInstance().emit("StatusEffectApplied", {
            target: target.node,
            effectType: this.type,
            duration: this.duration,
            intensity: this.intensity
        });
    }
    
    onTick(target: ICombatActor, deltaTime: number): void {
        // 초당 최대 체력의 2% * 강도만큼 데미지
        const damage = target.maxHealth * 0.02 * this.intensity;
        
        const damageData: DamageData = {
            amount: damage,
            type: DamageType.POISON,
            source: target.node, // 자기 자신이 소스
            isCritical: false,
            hitPosition: target.position,
            hitDirection: Vec3.ZERO
        };
        
        target.takeDamage(damageData);
        
        // 독 데미지 이펙트
        EffectManager.getInstance().playEffect("poison_damage", target.position);
    }
    
    onRemove(target: ICombatActor): void {
        // 독 해제 이펙트
        EffectManager.getInstance().playEffect("poison_removed", target.position);
        
        TypedEventBus.getInstance().emit("StatusEffectRemoved", {
            target: target.node,
            effectType: this.type
        });
    }
}

// 빙결 상태 효과
class FreezeEffect extends BaseStatusEffect {
    private originalSpeed: number = 0;
    
    constructor(duration: number, intensity: number) {
        super(StatusEffectType.FREEZE, "빙결", duration, intensity);
        this.stackable = false; // 빙결은 중첩 불가
    }
    
    onApply(target: ICombatActor): void {
        // 이동속도 저장 및 감소
        const movement = target.getComponent("MovementComponent");
        if (movement) {
            this.originalSpeed = movement.moveSpeed;
            movement.moveSpeed *= (1 - this.intensity * 0.5); // 강도에 따라 속도 감소
        }
        
        // 빙결 시각 효과
        EffectManager.getInstance().playEffect("freeze_applied", target.position);
        
        // 빙결 파티클 지속 효과
        const freezeParticle = EffectManager.getInstance().playPersistentEffect("freeze_aura", target.node);
        this.node.setUserData("freezeParticle", freezeParticle);
        
        TypedEventBus.getInstance().emit("StatusEffectApplied", {
            target: target.node,
            effectType: this.type,
            duration: this.duration,
            intensity: this.intensity
        });
    }
    
    onTick(target: ICombatActor, deltaTime: number): void {
        // 빙결은 지속 데미지는 없지만 시각 효과 유지
    }
    
    onRemove(target: ICombatActor): void {
        // 이동속도 복원
        const movement = target.getComponent("MovementComponent");
        if (movement && this.originalSpeed > 0) {
            movement.moveSpeed = this.originalSpeed;
        }
        
        // 빙결 파티클 제거
        const freezeParticle = this.node.getUserData("freezeParticle");
        if (freezeParticle) {
            EffectManager.getInstance().stopPersistentEffect(freezeParticle);
        }
        
        EffectManager.getInstance().playEffect("freeze_removed", target.position);
        
        TypedEventBus.getInstance().emit("StatusEffectRemoved", {
            target: target.node,
            effectType: this.type
        });
    }
}
```

### 4.2 상태 효과 관리 컴포넌트

```typescript
// [의도] 개체별 상태 효과를 관리하는 컴포넌트
// [책임] 상태 효과의 적용, 업데이트, 제거 및 상호작용 처리

class StatusEffectComponent extends GameComponent {
    readonly componentType = "StatusEffect";
    
    private activeEffects: Map<string, StatusEffect> = new Map();
    private effectsByType: Map<StatusEffectType, StatusEffect[]> = new Map();
    
    initialize() {
        // 상태 효과 정리를 위한 이벤트 구독
        TypedEventBus.getInstance().on("EntityDied", (data) => {
            if (data.entity === this.node) {
                this.clearAllEffects();
            }
        });
    }
    
    update(deltaTime: number) {
        // 모든 활성 상태 효과 업데이트
        const expiredEffects: string[] = [];
        
        this.activeEffects.forEach((effect, id) => {
            const stillActive = effect.update(this.entity as ICombatActor, deltaTime);
            if (!stillActive) {
                expiredEffects.push(id);
            }
        });
        
        // 만료된 효과 제거
        expiredEffects.forEach(id => {
            this.removeEffect(id);
        });
    }
    
    // 상태 효과 적용
    applyEffect(effect: StatusEffect): boolean {
        const existingByType = this.effectsByType.get(effect.type) || [];
        
        // 중첩 가능한 효과인지 확인
        if (effect.stackable && existingByType.length > 0) {
            // 최대 중첩 수 확인
            if (effect.maxStacks && existingByType.length >= effect.maxStacks) {
                // 가장 오래된 효과 제거 후 새 효과 적용
                const oldestEffect = existingByType[0];
                this.removeEffect(oldestEffect.id);
            }
            
            // 중첩 적용
            this.addEffect(effect);
            return true;
        } else if (!effect.stackable && existingByType.length > 0) {
            // 중첩 불가능한 효과는 기존 효과를 갱신
            const existingEffect = existingByType[0];
            if (effect.intensity >= existingEffect.intensity) {
                this.removeEffect(existingEffect.id);
                this.addEffect(effect);
                return true;
            }
            return false; // 더 약한 효과는 적용 안됨
        } else {
            // 새로운 효과 적용
            this.addEffect(effect);
            return true;
        }
    }
    
    private addEffect(effect: StatusEffect) {
        // 효과 목록에 추가
        this.activeEffects.set(effect.id, effect);
        
        // 타입별 목록에 추가
        if (!this.effectsByType.has(effect.type)) {
            this.effectsByType.set(effect.type, []);
        }
        this.effectsByType.get(effect.type)!.push(effect);
        
        // 효과 적용
        effect.onApply(this.entity as ICombatActor);
    }
    
    // 상태 효과 제거
    removeEffect(effectId: string): boolean {
        const effect = this.activeEffects.get(effectId);
        if (!effect) return false;
        
        // 효과 제거 처리
        effect.onRemove(this.entity as ICombatActor);
        
        // 목록에서 제거
        this.activeEffects.delete(effectId);
        
        const typeList = this.effectsByType.get(effect.type);
        if (typeList) {
            const index = typeList.findIndex(e => e.id === effectId);
            if (index !== -1) {
                typeList.splice(index, 1);
                if (typeList.length === 0) {
                    this.effectsByType.delete(effect.type);
                }
            }
        }
        
        return true;
    }
    
    // 타입별 상태 효과 제거
    removeEffectsByType(type: StatusEffectType): number {
        const effects = this.effectsByType.get(type) || [];
        let removedCount = 0;
        
        effects.forEach(effect => {
            if (this.removeEffect(effect.id)) {
                removedCount++;
            }
        });
        
        return removedCount;
    }
    
    // 모든 상태 효과 제거
    clearAllEffects() {
        const effectIds = Array.from(this.activeEffects.keys());
        effectIds.forEach(id => this.removeEffect(id));
    }
    
    // 상태 효과 확인
    hasEffect(type: StatusEffectType): boolean {
        return this.effectsByType.has(type) && this.effectsByType.get(type)!.length > 0;
    }
    
    getEffect(type: StatusEffectType): StatusEffect | null {
        const effects = this.effectsByType.get(type);
        return effects && effects.length > 0 ? effects[0] : null;
    }
    
    getEffectStack(type: StatusEffectType): StatusEffect[] {
        return this.effectsByType.get(type) || [];
    }
    
    getActiveBuffs(): StatusEffect[] {
        const buffs: StatusEffect[] = [];
        this.activeEffects.forEach(effect => {
            if (this.isBuffEffect(effect.type)) {
                buffs.push(effect);
            }
        });
        return buffs;
    }
    
    getActiveDebuffs(): StatusEffect[] {
        const debuffs: StatusEffect[] = [];
        this.activeEffects.forEach(effect => {
            if (!this.isBuffEffect(effect.type)) {
                debuffs.push(effect);
            }
        });
        return debuffs;
    }
    
    private isBuffEffect(type: StatusEffectType): boolean {
        const buffTypes = [
            StatusEffectType.DAMAGE_BOOST,
            StatusEffectType.SPEED_BOOST,
            StatusEffectType.REGENERATION,
            StatusEffectType.INVULNERABILITY,
            StatusEffectType.CRITICAL_BOOST
        ];
        
        return buffTypes.includes(type);
    }
    
    // 디버그용 상태 정보
    getStatusSummary(): { [type: string]: number } {
        const summary: { [type: string]: number } = {};
        
        this.effectsByType.forEach((effects, type) => {
            summary[type] = effects.length;
        });
        
        return summary;
    }
}
```

---

## 5. 콤보 시스템

### 5.1 콤보 메커니즘

```typescript
// [의도] 연속 공격과 타이밍 기반 콤보 시스템
// [책임] 콤보 카운트, 데미지 보너스, 특수 효과 관리

interface ComboAction {
    readonly actionType: AttackType;
    readonly inputWindow: number;      // 입력 허용 시간
    readonly damageMultiplier: number; // 데미지 배율
    readonly nextActions: ComboAction[]; // 다음 가능한 액션들
}

class ComboSystem extends Component {
    private static instance: ComboSystem;
    
    private currentCombo: number = 0;
    private maxCombo: number = 0;
    private comboTimer: number = 0;
    private readonly COMBO_TIMEOUT: number = 2.0; // 2초 후 콤보 리셋
    
    private comboChain: ComboAction[] = [];
    private currentChainIndex: number = 0;
    private isWaitingForInput: boolean = false;
    private inputWindowTimer: number = 0;
    
    static getInstance(): ComboSystem {
        return ComboSystem.instance;
    }
    
    protected onLoad() {
        this.setupComboChains();
    }
    
    protected update(deltaTime: number) {
        this.updateComboTimer(deltaTime);
        this.updateInputWindow(deltaTime);
    }
    
    // 콤보 체인 설정
    private setupComboChains() {
        // 기본 활 콤보: 단발 -> 연사 -> 차지샷
        const rapidFireAction: ComboAction = {
            actionType: AttackType.RAPID_FIRE,
            inputWindow: 0.5,
            damageMultiplier: 1.2,
            nextActions: []
        };
        
        const chargeShotAction: ComboAction = {
            actionType: AttackType.CHARGE_SHOT,
            inputWindow: 0.8,
            damageMultiplier: 1.5,
            nextActions: []
        };
        
        rapidFireAction.nextActions = [chargeShotAction];
        
        const singleShotAction: ComboAction = {
            actionType: AttackType.SINGLE_SHOT,
            inputWindow: 0.6,
            damageMultiplier: 1.0,
            nextActions: [rapidFireAction]
        };
        
        this.comboChain = [singleShotAction];
    }
    
    // 공격 시도 (콤보 체크)
    attemptAttack(attackType: AttackType, attacker: ICombatActor): boolean {
        const currentTime = Date.now();
        
        // 콤보 체인 중인지 확인
        if (this.isWaitingForInput) {
            return this.processComboInput(attackType, attacker);
        } else {
            // 새로운 콤보 시작
            return this.startCombo(attackType, attacker);
        }
    }
    
    private startCombo(attackType: AttackType, attacker: ICombatActor): boolean {
        // 첫 번째 액션 확인
        const firstAction = this.comboChain.find(action => action.actionType === attackType);
        if (!firstAction) {
            return false; // 콤보 시작 불가능한 액션
        }
        
        // 콤보 시작
        this.currentCombo = 1;
        this.comboTimer = this.COMBO_TIMEOUT;
        this.currentChainIndex = 0;
        
        // 다음 입력 대기
        if (firstAction.nextActions.length > 0) {
            this.isWaitingForInput = true;
            this.inputWindowTimer = firstAction.inputWindow;
        }
        
        // 콤보 시작 이벤트
        TypedEventBus.getInstance().emit("ComboStarted", {
            attacker: attacker.node,
            comboCount: this.currentCombo,
            attackType: attackType
        });
        
        return true;
    }
    
    private processComboInput(attackType: AttackType, attacker: ICombatActor): boolean {
        if (!this.isWaitingForInput || this.inputWindowTimer <= 0) {
            this.resetCombo();
            return false;
        }
        
        // 현재 체인에서 가능한 다음 액션 확인
        const currentAction = this.getCurrentComboAction();
        if (!currentAction) {
            this.resetCombo();
            return false;
        }
        
        const nextAction = currentAction.nextActions.find(action => action.actionType === attackType);
        if (!nextAction) {
            this.resetCombo();
            return false;
        }
        
        // 콤보 성공
        this.currentCombo++;
        this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
        this.comboTimer = this.COMBO_TIMEOUT;
        this.currentChainIndex++;
        
        // 다음 입력 대기 설정
        if (nextAction.nextActions.length > 0) {
            this.inputWindowTimer = nextAction.inputWindow;
        } else {
            this.isWaitingForInput = false;
            this.inputWindowTimer = 0;
        }
        
        // 콤보 지속 이벤트
        TypedEventBus.getInstance().emit("ComboContinued", {
            attacker: attacker.node,
            comboCount: this.currentCombo,
            attackType: attackType,
            damageMultiplier: nextAction.damageMultiplier
        });
        
        return true;
    }
    
    private updateComboTimer(deltaTime: number) {
        if (this.currentCombo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.endCombo();
            }
        }
    }
    
    private updateInputWindow(deltaTime: number) {
        if (this.isWaitingForInput) {
            this.inputWindowTimer -= deltaTime;
            if (this.inputWindowTimer <= 0) {
                this.endCombo();
            }
        }
    }
    
    private getCurrentComboAction(): ComboAction | null {
        if (this.currentChainIndex >= this.comboChain.length) {
            return null;
        }
        
        let currentAction = this.comboChain[0];
        for (let i = 1; i <= this.currentChainIndex && i < this.comboChain.length; i++) {
            if (currentAction.nextActions.length > 0) {
                currentAction = currentAction.nextActions[0]; // 첫 번째 다음 액션
            }
        }
        
        return currentAction;
    }
    
    private endCombo() {
        if (this.currentCombo > 0) {
            TypedEventBus.getInstance().emit("ComboEnded", {
                finalComboCount: this.currentCombo,
                maxComboReached: this.currentCombo === this.maxCombo
            });
        }
        
        this.resetCombo();
    }
    
    private resetCombo() {
        this.currentCombo = 0;
        this.comboTimer = 0;
        this.currentChainIndex = 0;
        this.isWaitingForInput = false;
        this.inputWindowTimer = 0;
    }
    
    // 현재 콤보 정보
    getCurrentCombo(): number {
        return this.currentCombo;
    }
    
    getMaxCombo(): number {
        return this.maxCombo;
    }
    
    isComboActive(): boolean {
        return this.currentCombo > 0;
    }
    
    getComboMultiplier(): number {
        if (this.currentCombo <= 1) return 1.0;
        
        // 콤보에 따른 데미지 배율 증가
        return 1.0 + (this.currentCombo - 1) * 0.1; // 콤보당 10% 증가
    }
    
    // 콤보 관련 보너스
    getCriticalBonus(): number {
        if (this.currentCombo >= 5) {
            return 0.2; // 5콤보 이상 시 크리티컬 확률 20% 증가
        }
        return 0;
    }
    
    getSpeedBonus(): number {
        if (this.currentCombo >= 3) {
            return 0.15; // 3콤보 이상 시 공격속도 15% 증가
        }
        return 0;
    }
}
```

---

## 6. 방어 시스템

### 6.1 회피 시스템

```typescript
// [의도] 소울라이크의 핵심인 정밀한 타이밍 기반 회피 시스템
// [책임] 회피 판정, 무적 프레임, 스태미나 관리

enum DodgeType {
    ROLL = "roll",           // 구르기
    DASH = "dash",           // 대시
    BACKSTEP = "backstep"    // 백스텝
}

class DodgeSystem extends Component {
    @property(Number)
    dodgeDistance: number = 3;
    
    @property(Number)
    dodgeDuration: number = 0.5;
    
    @property(Number)
    invulnerabilityFrames: number = 0.2; // 무적 시간
    
    @property(Number)
    staminaCost: number = 25;
    
    private isDodging: boolean = false;
    private dodgeTimer: number = 0;
    private invulnerabilityTimer: number = 0;
    private dodgeDirection: Vec3 = Vec3.ZERO;
    private startPosition: Vec3 = Vec3.ZERO;
    private targetPosition: Vec3 = Vec3.ZERO;
    
    // 회피 실행
    executeDodge(direction: Vec3, dodgeType: DodgeType = DodgeType.ROLL): boolean {
        if (this.isDodging) return false;
        
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (!actor || actor.stamina < this.staminaCost) {
            return false;
        }
        
        // 스태미나 소모
        actor.stamina -= this.staminaCost;
        
        // 회피 설정
        this.isDodging = true;
        this.dodgeTimer = this.dodgeDuration;
        this.invulnerabilityTimer = this.invulnerabilityFrames;
        this.dodgeDirection = direction.normalize();
        this.startPosition = this.node.position;
        this.targetPosition = this.startPosition.add(this.dodgeDirection.multiplyScalar(this.dodgeDistance));
        
        // 무적 상태 적용
        this.applyInvulnerability();
        
        // 회피 애니메이션
        this.playDodgeAnimation(dodgeType);
        
        // 회피 이벤트
        TypedEventBus.getInstance().emit("DodgeExecuted", {
            actor: this.node,
            direction: direction,
            type: dodgeType
        });
        
        return true;
    }
    
    protected update(deltaTime: number) {
        if (this.isDodging) {
            this.updateDodge(deltaTime);
        }
        
        if (this.invulnerabilityTimer > 0) {
            this.updateInvulnerability(deltaTime);
        }
    }
    
    private updateDodge(deltaTime: number) {
        this.dodgeTimer -= deltaTime;
        
        if (this.dodgeTimer > 0) {
            // 회피 이동 처리 (이즈 인-아웃 커브 적용)
            const progress = 1 - (this.dodgeTimer / this.dodgeDuration);
            const easedProgress = this.easeInOutQuad(progress);
            
            const currentPos = Vec3.lerp(this.startPosition, this.targetPosition, easedProgress);
            this.node.position = currentPos;
            
            // 장애물 충돌 체크
            this.checkObstacleCollision();
        } else {
            // 회피 완료
            this.completeDodge();
        }
    }
    
    private updateInvulnerability(deltaTime: number) {
        this.invulnerabilityTimer -= deltaTime;
        
        if (this.invulnerabilityTimer <= 0) {
            this.removeInvulnerability();
        }
    }
    
    private applyInvulnerability() {
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (actor) {
            actor.isInvulnerable = true;
        }
        
        // 무적 시각 효과 (깜빡임)
        this.startInvulnerabilityEffect();
    }
    
    private removeInvulnerability() {
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (actor) {
            actor.isInvulnerable = false;
        }
        
        // 무적 효과 종료
        this.stopInvulnerabilityEffect();
    }
    
    private completeDodge() {
        this.isDodging = false;
        this.node.position = this.targetPosition;
        
        // 회피 완료 이벤트
        TypedEventBus.getInstance().emit("DodgeCompleted", {
            actor: this.node,
            finalPosition: this.targetPosition
        });
    }
    
    private checkObstacleCollision() {
        // 레이캐스트로 장애물 확인
        const rayStart = this.node.position;
        const rayDirection = this.dodgeDirection;
        const rayDistance = 0.5;
        
        const hits = PhysicsSystem.instance.raycast(rayStart, rayDirection, rayDistance, 
            CollisionLayers.ENVIRONMENT);
        
        if (hits.length > 0) {
            // 장애물에 막히면 회피 조기 종료
            this.targetPosition = hits[0].point.subtract(rayDirection.multiplyScalar(0.2));
            this.completeDodge();
        }
    }
    
    private playDodgeAnimation(dodgeType: DodgeType) {
        const animator = this.getComponent(AnimationController);
        if (animator) {
            animator.playAnimation(dodgeType, false);
        }
    }
    
    private startInvulnerabilityEffect() {
        // 캐릭터 깜빡임 효과
        const renderer = this.getComponent(MeshRenderer);
        if (renderer) {
            tween(renderer.material)
                .to(0.1, { opacity: 0.3 })
                .to(0.1, { opacity: 1.0 })
                .repeatForever()
                .start();
        }
    }
    
    private stopInvulnerabilityEffect() {
        const renderer = this.getComponent(MeshRenderer);
        if (renderer) {
            Tween.stopAllByTarget(renderer.material);
            renderer.material.opacity = 1.0;
        }
    }
    
    private easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    // 회피 가능 여부 확인
    canDodge(): boolean {
        if (this.isDodging) return false;
        
        const actor = this.getComponent("CombatActor") as ICombatActor;
        return actor && actor.stamina >= this.staminaCost;
    }
    
    // 현재 상태 확인
    isDodgeActive(): boolean {
        return this.isDodging;
    }
    
    isInvulnerable(): boolean {
        return this.invulnerabilityTimer > 0;
    }
    
    // 퍼펙트 회피 판정 (공격 직전에 회피 시 보너스)
    checkPerfectDodge(incomingAttackTime: number): boolean {
        const dodgeStartTime = Date.now();
        const timingWindow = 0.2; // 200ms 타이밍 윈도우
        
        if (Math.abs(incomingAttackTime - dodgeStartTime) <= timingWindow * 1000) {
            // 퍼펙트 회피 성공
            this.onPerfectDodge();
            return true;
        }
        
        return false;
    }
    
    private onPerfectDodge() {
        // 퍼펙트 회피 보너스
        // 1. 스태미나 일부 회복
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (actor) {
            actor.stamina = Math.min(actor.maxStamina, actor.stamina + 15);
        }
        
        // 2. 시간 감속 효과
        TimeManager.getInstance().slowMotion(0.5, 0.3);
        
        // 3. 특수 이펙트
        EffectManager.getInstance().playEffect("perfect_dodge", this.node.position);
        
        // 4. 이벤트 발행
        TypedEventBus.getInstance().emit("PerfectDodgeExecuted", {
            actor: this.node
        });
    }
}
```

### 6.2 패링 시스템

```typescript
// [의도] 고난이도 타이밍 기반 패링 시스템으로 반격 기회 제공
// [책임] 패링 판정, 반격 윈도우, 스태미나 관리

class ParrySystem extends Component {
    @property(Number)
    parryWindow: number = 0.3; // 패링 성공 윈도우
    
    @property(Number)
    parryStaminaCost: number = 20;
    
    @property(Number)
    counterAttackWindow: number = 1.5; // 반격 가능 시간
    
    private isParrying: boolean = false;
    private parryTimer: number = 0;
    private canCounterAttack: boolean = false;
    private counterTimer: number = 0;
    
    // 패링 시도
    attemptParry(): boolean {
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (!actor || actor.stamina < this.parryStaminaCost || this.isParrying) {
            return false;
        }
        
        // 스태미나 소모
        actor.stamina -= this.parryStaminaCost;
        
        // 패링 상태 시작
        this.isParrying = true;
        this.parryTimer = this.parryWindow;
        
        // 패링 애니메이션
        this.playParryAnimation();
        
        TypedEventBus.getInstance().emit("ParryAttempted", {
            actor: this.node
        });
        
        return true;
    }
    
    protected update(deltaTime: number) {
        if (this.isParrying) {
            this.updateParry(deltaTime);
        }
        
        if (this.canCounterAttack) {
            this.updateCounterWindow(deltaTime);
        }
    }
    
    private updateParry(deltaTime: number) {
        this.parryTimer -= deltaTime;
        
        if (this.parryTimer <= 0) {
            this.endParry();
        }
    }
    
    private updateCounterWindow(deltaTime: number) {
        this.counterTimer -= deltaTime;
        
        if (this.counterTimer <= 0) {
            this.endCounterWindow();
        }
    }
    
    // 적의 공격을 패링으로 받았을 때
    onReceiveAttack(attackData: DamageData): boolean {
        if (!this.isParrying) {
            return false; // 패링 실패
        }
        
        // 패링 성공
        this.onSuccessfulParry(attackData);
        return true;
    }
    
    private onSuccessfulParry(attackData: DamageData) {
        // 패링 성공 처리
        this.isParrying = false;
        this.canCounterAttack = true;
        this.counterTimer = this.counterAttackWindow;
        
        // 공격자 스턴 적용
        const attacker = attackData.source.getComponent("CombatActor") as ICombatActor;
        if (attacker) {
            this.applyStunToAttacker(attacker);
        }
        
        // 패링 성공 이펙트
        EffectManager.getInstance().playEffect("parry_success", this.node.position);
        
        // 시간 감속 (패링 성공의 임팩트)
        TimeManager.getInstance().slowMotion(0.3, 0.5);
        
        // 스태미나 보너스
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (actor) {
            actor.stamina = Math.min(actor.maxStamina, actor.stamina + 30);
        }
        
        TypedEventBus.getInstance().emit("ParrySuccessful", {
            defender: this.node,
            attacker: attackData.source,
            counterWindowDuration: this.counterAttackWindow
        });
    }
    
    private applyStunToAttacker(attacker: ICombatActor) {
        const statusComponent = attacker.getComponent("StatusEffectComponent");
        if (statusComponent) {
            const stunEffect = new StunEffect(1.0, 1); // 1초 스턴
            statusComponent.applyEffect(stunEffect);
        }
    }
    
    private endParry() {
        this.isParrying = false;
        
        TypedEventBus.getInstance().emit("ParryEnded", {
            actor: this.node,
            successful: false
        });
    }
    
    private endCounterWindow() {
        this.canCounterAttack = false;
        
        TypedEventBus.getInstance().emit("CounterWindowEnded", {
            actor: this.node
        });
    }
    
    // 반격 실행
    executeCounterAttack(target: ICombatActor): boolean {
        if (!this.canCounterAttack) {
            return false;
        }
        
        const actor = this.getComponent("CombatActor") as ICombatActor;
        if (!actor || !actor.currentWeapon) {
            return false;
        }
        
        // 반격은 크리티컬 확정 + 추가 데미지
        const counterDamage = actor.currentWeapon.baseDamage * 1.5;
        
        const damageData: DamageData = {
            amount: counterDamage,
            type: DamageType.PHYSICAL,
            source: this.node,
            isCritical: true, // 반격은 항상 크리티컬
            hitPosition: target.position,
            hitDirection: target.position.subtract(actor.position).normalize()
        };
        
        target.takeDamage(damageData);
        
        // 반격 이펙트
        EffectManager.getInstance().playEffect("counter_attack", target.position);
        
        // 반격 기회 소모
        this.endCounterWindow();
        
        TypedEventBus.getInstance().emit("CounterAttackExecuted", {
            attacker: this.node,
            target: target.node,
            damage: counterDamage
        });
        
        return true;
    }
    
    private playParryAnimation() {
        const animator = this.getComponent(AnimationController);
        if (animator) {
            animator.playAnimation("parry", false);
        }
    }
    
    // 상태 확인
    isParryActive(): boolean {
        return this.isParrying;
    }
    
    canExecuteCounterAttack(): boolean {
        return this.canCounterAttack;
    }
    
    getCounterTimeRemaining(): number {
        return this.canCounterAttack ? this.counterTimer : 0;
    }
}

// 스턴 상태 효과
class StunEffect extends BaseStatusEffect {
    constructor(duration: number, intensity: number) {
        super(StatusEffectType.STUN, "기절", duration, intensity);
        this.stackable = false;
    }
    
    onApply(target: ICombatActor): void {
        // 모든 액션 불가
        const controller = target.getComponent("PlayerController") || target.getComponent("AIController");
        if (controller) {
            controller.setDisabled(true);
        }
        
        // 스턴 이펙트
        EffectManager.getInstance().playPersistentEffect("stun_effect", target.node);
        
        TypedEventBus.getInstance().emit("StatusEffectApplied", {
            target: target.node,
            effectType: this.type,
            duration: this.duration,
            intensity: this.intensity
        });
    }
    
    onTick(target: ICombatActor, deltaTime: number): void {
        // 스턴 중에는 특별한 틱 처리 없음
    }
    
    onRemove(target: ICombatActor): void {
        // 액션 복구
        const controller = target.getComponent("PlayerController") || target.getComponent("AIController");
        if (controller) {
            controller.setDisabled(false);
        }
        
        // 스턴 이펙트 제거
        EffectManager.getInstance().stopPersistentEffect("stun_effect", target.node);
        
        TypedEventBus.getInstance().emit("StatusEffectRemoved", {
            target: target.node,
            effectType: this.type
        });
    }
}
```

---

## 7. 타겟팅 시스템

### 7.1 자동 타겟팅 시스템

```typescript
// [의도] 모바일 환경에 최적화된 스마트 자동 타겟팅
// [책임] 적 우선순위 결정, 자동 조준, 타겟 전환

enum TargetPriority {
    DISTANCE = "distance",        // 거리 우선
    HEALTH = "health",           // 체력 우선 (낮은 체력)
    THREAT = "threat",           // 위험도 우선
    PLAYER_CHOICE = "player"     // 플레이어 지정
}

interface TargetInfo {
    target: ICombatActor;
    distance: number;
    healthRatio: number;
    threatLevel: number;
    priority: number;
    isVisible: boolean;
    lastSeen: number;
}

class TargetingSystem extends Component {
    private static instance: TargetingSystem;
    
    @property(Number)
    maxTargetRange: number = 15;
    
    @property(Number)
    targetSwitchCooldown: number = 0.3;
    
    private currentTarget: ICombatActor | null = null;
    private availableTargets: Map<string, TargetInfo> = new Map();
    private targetPriority: TargetPriority = TargetPriority.THREAT;
    private lastTargetSwitchTime: number = 0;
    private isAutoTargeting: boolean = true;
    
    static getInstance(): TargetingSystem {
        return TargetingSystem.instance;
    }
    
    protected onLoad() {
        // 적 생성/제거 이벤트 구독
        TypedEventBus.getInstance().on("EnemySpawned", (data) => {
            this.registerTarget(data.enemy);
        });
        
        TypedEventBus.getInstance().on("EnemyDefeated", (data) => {
            this.unregisterTarget(data.enemy);
        });
    }
    
    protected update(deltaTime: number) {
        this.updateTargetInfo();
        this.validateCurrentTarget();
        
        if (this.isAutoTargeting) {
            this.updateAutoTargeting();
        }
    }
    
    // 타겟 등록
    registerTarget(enemy: Node) {
        const combatActor = enemy.getComponent("CombatActor") as ICombatActor;
        if (!combatActor) return;
        
        const playerPos = PlayerManager.getInstance().getPlayerPosition();
        const distance = Vec3.distance(playerPos, enemy.worldPosition);
        
        const targetInfo: TargetInfo = {
            target: combatActor,
            distance: distance,
            healthRatio: combatActor.health / combatActor.maxHealth,
            threatLevel: this.calculateThreatLevel(combatActor),
            priority: 0,
            isVisible: true,
            lastSeen: Date.now()
        };
        
        this.availableTargets.set(combatActor.actorId, targetInfo);
    }
    
    // 타겟 제거
    unregisterTarget(enemy: Node) {
        const combatActor = enemy.getComponent("CombatActor") as ICombatActor;
        if (!combatActor) return;
        
        this.availableTargets.delete(combatActor.actorId);
        
        if (this.currentTarget === combatActor) {
            this.currentTarget = null;
            this.selectBestTarget();
        }
    }
    
    // 타겟 정보 업데이트
    private updateTargetInfo() {
        const playerPos = PlayerManager.getInstance().getPlayerPosition();
        
        this.availableTargets.forEach((info, id) => {
            if (!info.target.isAlive) {
                this.availableTargets.delete(id);
                return;
            }
            
            // 거리 업데이트
            info.distance = Vec3.distance(playerPos, info.target.position);
            
            // 체력 비율 업데이트
            info.healthRatio = info.target.health / info.target.maxHealth;
            
            // 위험도 업데이트
            info.threatLevel = this.calculateThreatLevel(info.target);
            
            // 가시성 체크
            info.isVisible = this.checkLineOfSight(playerPos, info.target.position);
            if (info.isVisible) {
                info.lastSeen = Date.now();
            }
            
            // 우선순위 계산
            info.priority = this.calculatePriority(info);
        });
    }
    
    // 위험도 계산
    private calculateThreatLevel(target: ICombatActor): number {
        let threat = 0;
        
        // 기본 위험도 (적 타입별)
        switch (target.actorType) {
            case ActorType.ENEMY:
                threat = 1;
                break;
            case ActorType.BOSS:
                threat = 5;
                break;
        }
        
        // 거리 기반 위험도 (가까울수록 위험)
        const distance = Vec3.distance(PlayerManager.getInstance().getPlayerPosition(), target.position);
        threat += Math.max(0, 3 - distance);
        
        // 공격중인 적은 위험도 증가
        const enemyAI = target.getComponent("AIController");
        if (enemyAI && enemyAI.isAttacking()) {
            threat += 2;
        }
        
        // 플레이어를 타겟팅 중인 적
        if (enemyAI && enemyAI.getCurrentTarget() === PlayerManager.getInstance().getPlayer()) {
            threat += 1;
        }
        
        return threat;
    }
    
    // 우선순위 계산
    private calculatePriority(info: TargetInfo): number {
        let priority = 0;
        
        switch (this.targetPriority) {
            case TargetPriority.DISTANCE:
                priority = 10 - info.distance; // 가까울수록 높은 우선순위
                break;
                
            case TargetPriority.HEALTH:
                priority = 10 * (1 - info.healthRatio); // 체력 낮을수록 높은 우선순위
                break;
                
            case TargetPriority.THREAT:
                priority = info.threatLevel;
                break;
        }
        
        // 가시성 보너스
        if (info.isVisible) {
            priority += 2;
        }
        
        // 범위 밖이면 우선순위 감소
        if (info.distance > this.maxTargetRange) {
            priority *= 0.3;
        }
        
        return priority;
    }
    
    // 자동 타겟팅 업데이트
    private updateAutoTargeting() {
        const currentTime = Date.now();
        
        if (currentTime - this.lastTargetSwitchTime < this.targetSwitchCooldown * 1000) {
            return;
        }
        
        // 현재 타겟이 없거나 최적이 아니면 새로운 타겟 선택
        if (!this.currentTarget || !this.isCurrentTargetOptimal()) {
            this.selectBestTarget();
        }
    }
    
    // 최적의 타겟 선택
    selectBestTarget() {
        let bestTarget: TargetInfo | null = null;
        let bestPriority = -1;
        
        this.availableTargets.forEach(info => {
            if (info.priority > bestPriority && info.distance <= this.maxTargetRange) {
                bestPriority = info.priority;
                bestTarget = info;
            }
        });
        
        if (bestTarget && bestTarget.target !== this.currentTarget) {
            this.setCurrentTarget(bestTarget.target);
        }
    }
    
    // 현재 타겟 설정
    setCurrentTarget(target: ICombatActor | null) {
        const previousTarget = this.currentTarget;
        this.currentTarget = target;
        this.lastTargetSwitchTime = Date.now();
        
        // 타겟 변경 이벤트
        TypedEventBus.getInstance().emit("TargetChanged", {
            previousTarget: previousTarget?.node || null,
            newTarget: target?.node || null
        });
        
        // UI 업데이트
        if (target) {
            UIManager.getInstance().showTargetIndicator(target.node);
        } else {
            UIManager.getInstance().hideTargetIndicator();
        }
    }
    
    // 현재 타겟 유효성 검사
    private validateCurrentTarget() {
        if (!this.currentTarget) return;
        
        if (!this.currentTarget.isAlive) {
            this.setCurrentTarget(null);
            return;
        }
        
        const distance = Vec3.distance(
            PlayerManager.getInstance().getPlayerPosition(),
            this.currentTarget.position
        );
        
        if (distance > this.maxTargetRange * 1.5) { // 약간의 버퍼 적용
            this.setCurrentTarget(null);
        }
    }
    
    // 현재 타겟이 최적인지 확인
    private isCurrentTargetOptimal(): boolean {
        if (!this.currentTarget) return false;
        
        const currentInfo = this.availableTargets.get(this.currentTarget.actorId);
        if (!currentInfo) return false;
        
        // 다른 타겟이 현재 타겟보다 훨씬 높은 우선순위를 가지는지 확인
        let maxOtherPriority = 0;
        this.availableTargets.forEach((info, id) => {
            if (id !== this.currentTarget!.actorId) {
                maxOtherPriority = Math.max(maxOtherPriority, info.priority);
            }
        });
        
        // 다른 타겟의 우선순위가 현재 타겟보다 크게 높으면 전환
        return currentInfo.priority >= maxOtherPriority - 2;
    }
    
    // 시야 체크
    private checkLineOfSight(from: Vec3, to: Vec3): boolean {
        const direction = to.subtract(from).normalize();
        const distance = Vec3.distance(from, to);
        
        const hits = PhysicsSystem.instance.raycast(from, direction, distance, 
            CollisionLayers.ENVIRONMENT);
        
        return hits.length === 0; // 장애물이 없으면 보임
    }
    
    // 수동 타겟 선택
    selectTargetAtPosition(screenPosition: Vec2): boolean {
        const camera = CameraController.getInstance().getCamera();
        const ray = camera.screenPointToRay(screenPosition.x, screenPosition.y);
        
        const hits = PhysicsSystem.instance.raycast(ray.origin, ray.direction, this.maxTargetRange,
            CollisionLayers.ENEMY);
        
        if (hits.length > 0) {
            const hitActor = hits[0].collider.node.getComponent("CombatActor") as ICombatActor;
            if (hitActor) {
                this.setCurrentTarget(hitActor);
                this.isAutoTargeting = false; // 수동 타겟팅 모드로 전환
                
                // 일정 시간 후 자동 타겟팅 복귀
                this.scheduleOnce(() => {
                    this.isAutoTargeting = true;
                }, 3);
                
                return true;
            }
        }
        
        return false;
    }
    
    // 타겟팅 우선순위 변경
    setTargetPriority(priority: TargetPriority) {
        this.targetPriority = priority;
        this.selectBestTarget(); // 즉시 재계산
    }
    
    // 현재 타겟 반환
    getCurrentTarget(): ICombatActor | null {
        return this.currentTarget;
    }
    
    // 가장 가까운 적 반환
    getNearestEnemy(): ICombatActor | null {
        let nearest: ICombatActor | null = null;
        let nearestDistance = Infinity;
        
        this.availableTargets.forEach(info => {
            if (info.distance < nearestDistance) {
                nearestDistance = info.distance;
                nearest = info.target;
            }
        });
        
        return nearest;
    }
    
    // 타겟 개수 반환
    getTargetCount(): number {
        return this.availableTargets.size;
    }
}
```

---

## 8. 밸런싱 시스템

### 8.1 적응형 난이도 시스템

```typescript
// [의도] 플레이어 실력에 따라 동적으로 난이도를 조정하는 AI 시스템
// [책임] 플레이어 행동 분석 및 실시간 게임 밸런스 조정

interface PlayerPerformanceMetrics {
    averageReactionTime: number;    // 평균 반응속도
    dodgeSuccessRate: number;       // 회피 성공률
    accuracyRate: number;           // 명중률
    comboContinuityRate: number;    // 콤보 지속률
    deathCount: number;             // 사망 횟수
    clearTime: number;              // 클리어 시간
    perfectDodgeRate: number;       // 완벽 회피율
    parrySuccessRate: number;       // 패링 성공률
}

interface DifficultyModifiers {
    enemyHealthMultiplier: number;     // 적 체력 배율
    enemyDamageMultiplier: number;     // 적 공격력 배율
    enemySpeedMultiplier: number;      // 적 속도 배율
    enemyAccuracyMultiplier: number;   // 적 명중률 배율
    playerDamageMultiplier: number;    // 플레이어 공격력 배율
    staminaRegenMultiplier: number;    // 스태미나 회복 배율
    dropRateMultiplier: number;        // 아이템 드롭률 배율
}

class AdaptiveDifficultySystem extends Component {
    private static instance: AdaptiveDifficultySystem;
    
    private playerMetrics: PlayerPerformanceMetrics;
    private currentModifiers: DifficultyModifiers;
    private baselineMetrics: PlayerPerformanceMetrics;
    
    private recentPerformance: number[] = []; // 최근 10게임 성과
    private adjustmentCooldown: number = 0;
    private readonly ADJUSTMENT_INTERVAL = 30; // 30초마다 조정
    
    static getInstance(): AdaptiveDifficultySystem {
        return AdaptiveDifficultySystem.instance;
    }
    
    protected onLoad() {
        this.initializeMetrics();
        this.setupEventListeners();
    }
    
    protected update(deltaTime: number) {
        this.adjustmentCooldown -= deltaTime;
        
        if (this.adjustmentCooldown <= 0) {
            this.analyzePerformanceAndAdjust();
            this.adjustmentCooldown = this.ADJUSTMENT_INTERVAL;
        }
    }
    
    private initializeMetrics() {
        this.playerMetrics = {
            averageReactionTime: 0.5,
            dodgeSuccessRate: 0.7,
            accuracyRate: 0.6,
            comboContinuityRate: 0.4,
            deathCount: 0,
            clearTime: 0,
            perfectDodgeRate: 0.1,
            parrySuccessRate: 0.3
        };
        
        this.baselineMetrics = { ...this.playerMetrics };
        
        this.currentModifiers = {
            enemyHealthMultiplier: 1.0,
            enemyDamageMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemyAccuracyMultiplier: 1.0,
            playerDamageMultiplier: 1.0,
            staminaRegenMultiplier: 1.0,
            dropRateMultiplier: 1.0
        };
    }
    
    private setupEventListeners() {
        // 플레이어 행동 이벤트 수집
        TypedEventBus.getInstance().on("DodgeExecuted", (data) => {
            this.recordDodgeAttempt();
        });
        
        TypedEventBus.getInstance().on("PerfectDodgeExecuted", (data) => {
            this.recordPerfectDodge();
        });
        
        TypedEventBus.getInstance().on("ParrySuccessful", (data) => {
            this.recordSuccessfulParry();
        });
        
        TypedEventBus.getInstance().on("DamageDealt", (data) => {
            this.recordAttackHit();
        });
        
        TypedEventBus.getInstance().on("PlayerDied", (data) => {
            this.recordPlayerDeath();
        });
        
        TypedEventBus.getInstance().on("StageCompleted", (data) => {
            this.recordStageCompletion(data.clearTime);
        });
    }
    
    // 성과 분석 및 난이도 조정
    private analyzePerformanceAndAdjust() {
        const performanceScore = this.calculatePerformanceScore();
        const targetScore = 0.7; // 목표 성과 점수 (70%)
        
        // 성과 점수에 따른 조정
        if (performanceScore > 0.85) {
            // 너무 쉬움 - 난이도 증가
            this.increaseDifficulty(0.1);
        } else if (performanceScore < 0.55) {
            // 너무 어려움 - 난이도 감소
            this.decreaseDifficulty(0.1);
        }
        
        // 최근 성과 기록
        this.recentPerformance.push(performanceScore);
        if (this.recentPerformance.length > 10) {
            this.recentPerformance.shift();
        }
        
        // 지속적인 실패 패턴 감지
        this.detectStuckPattern();
    }
    
    private calculatePerformanceScore(): number {
        let score = 0;
        let weights = 0;
        
        // 생존율 (가장 중요)
        const survivalRate = 1 - Math.min(1, this.playerMetrics.deathCount / 5);
        score += survivalRate * 0.4;
        weights += 0.4;
        
        // 회피 성공률
        score += this.playerMetrics.dodgeSuccessRate * 0.2;
        weights += 0.2;
        
        // 명중률
        score += this.playerMetrics.accuracyRate * 0.2;
        weights += 0.2;
        
        // 반응속도 (빠를수록 좋음)
        const reactionScore = Math.max(0, 1 - this.playerMetrics.averageReactionTime);
        score += reactionScore * 0.1;
        weights += 0.1;
        
        // 콤보 지속률
        score += this.playerMetrics.comboContinuityRate * 0.1;
        weights += 0.1;
        
        return score / weights;
    }
    
    private increaseDifficulty(intensity: number) {
        // 적 능력치 향상
        this.currentModifiers.enemyHealthMultiplier += intensity * 0.2;
        this.currentModifiers.enemyDamageMultiplier += intensity * 0.15;
        this.currentModifiers.enemySpeedMultiplier += intensity * 0.1;
        this.currentModifiers.enemyAccuracyMultiplier += intensity * 0.1;
        
        // 드롭률 보상 증가
        this.currentModifiers.dropRateMultiplier += intensity * 0.2;
        
        // 최대값 제한
        this.clampModifiers();
        
        console.log(`Difficulty increased by ${intensity}`);
        TypedEventBus.getInstance().emit("DifficultyAdjusted", {
            direction: "increased",
            intensity: intensity,
            newModifiers: this.currentModifiers
        });
    }
    
    private decreaseDifficulty(intensity: number) {
        // 적 능력치 감소
        this.currentModifiers.enemyHealthMultiplier -= intensity * 0.2;
        this.currentModifiers.enemyDamageMultiplier -= intensity * 0.15;
        this.currentModifiers.enemySpeedMultiplier -= intensity * 0.1;
        
        // 플레이어 지원 증가
        this.currentModifiers.playerDamageMultiplier += intensity * 0.1;
        this.currentModifiers.staminaRegenMultiplier += intensity * 0.15;
        
        // 최소값 제한
        this.clampModifiers();
        
        console.log(`Difficulty decreased by ${intensity}`);
        TypedEventBus.getInstance().emit("DifficultyAdjusted", {
            direction: "decreased",
            intensity: intensity,
            newModifiers: this.currentModifiers
        });
    }
    
    private clampModifiers() {
        // 수정자들을 적절한 범위로 제한
        this.currentModifiers.enemyHealthMultiplier = Math.max(0.5, Math.min(2.0, this.currentModifiers.enemyHealthMultiplier));
        this.currentModifiers.enemyDamageMultiplier = Math.max(0.3, Math.min(1.5, this.currentModifiers.enemyDamageMultiplier));
        this.currentModifiers.enemySpeedMultiplier = Math.max(0.7, Math.min(1.3, this.currentModifiers.enemySpeedMultiplier));
        this.currentModifiers.enemyAccuracyMultiplier = Math.max(0.5, Math.min(1.5, this.currentModifiers.enemyAccuracyMultiplier));
        this.currentModifiers.playerDamageMultiplier = Math.max(0.8, Math.min(1.5, this.currentModifiers.playerDamageMultiplier));
        this.currentModifiers.staminaRegenMultiplier = Math.max(0.8, Math.min(2.0, this.currentModifiers.staminaRegenMultiplier));
        this.currentModifiers.dropRateMultiplier = Math.max(1.0, Math.min(3.0, this.currentModifiers.dropRateMultiplier));
    }
    
    // 막힘 패턴 감지 (연속 실패)
    private detectStuckPattern() {
        if (this.recentPerformance.length < 5) return;
        
        const recentAverage = this.recentPerformance.slice(-5).reduce((a, b) => a + b, 0) / 5;
        
        if (recentAverage < 0.3) {
            // 연속으로 성과가 매우 낮음 - 긴급 지원
            this.applyEmergencyAssistance();
        }
    }
    
    private applyEmergencyAssistance() {
        console.log("Applying emergency assistance");
        
        // 일시적 강력한 지원
        this.currentModifiers.playerDamageMultiplier = Math.min(1.8, this.currentModifiers.playerDamageMultiplier + 0.3);
        this.currentModifiers.enemyDamageMultiplier = Math.max(0.4, this.currentModifiers.enemyDamageMultiplier - 0.2);
        this.currentModifiers.staminaRegenMultiplier = Math.min(2.5, this.currentModifiers.staminaRegenMultiplier + 0.5);
        
        // 특수 아이템 지급
        ItemManager.getInstance().giveEmergencySupply();
        
        TypedEventBus.getInstance().emit("EmergencyAssistanceApplied", {
            reason: "stuck_pattern",
            modifiers: this.currentModifiers
        });
    }
    
    // 메트릭 기록 함수들
    private recordDodgeAttempt() {
        // 회피 시도 기록 로직
    }
    
    private recordPerfectDodge() {
        // 완벽 회피 기록 로직
    }
    
    private recordSuccessfulParry() {
        // 성공적 패링 기록 로직
    }
    
    private recordAttackHit() {
        // 공격 명중 기록 로직
    }
    
    private recordPlayerDeath() {
        this.playerMetrics.deathCount++;
    }
    
    private recordStageCompletion(clearTime: number) {
        this.playerMetrics.clearTime = clearTime;
    }
    
    // 현재 난이도 수정자 반환
    getCurrentModifiers(): DifficultyModifiers {
        return { ...this.currentModifiers };
    }
    
    // 수동 난이도 조정 (개발/테스트용)
    setDifficultyModifier(modifierName: keyof DifficultyModifiers, value: number) {
        this.currentModifiers[modifierName] = value;
        this.clampModifiers();
    }
    
    // 난이도 초기화
    resetDifficulty() {
        this.currentModifiers = {
            enemyHealthMultiplier: 1.0,
            enemyDamageMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemyAccuracyMultiplier: 1.0,
            playerDamageMultiplier: 1.0,
            staminaRegenMultiplier: 1.0,
            dropRateMultiplier: 1.0
        };
    }
}
```

---

## 🔗 관련 문서

- [03. 핵심 시스템 설계](./03-Core-System-Design.md)
- [05. AI 시스템 설계](./05-AI-System-Design.md)
- [06. 렌더링 및 애니메이션](./06-Rendering-Animation.md)
- [07. UI/UX 시스템 설계](./07-UI-UX-System.md)

---

**이 문서는 Shadow Archer 게임의 전투 시스템을 정의합니다. 소울라이크의 정밀한 전투와 모바일의 편의성을 조화시킨 시스템입니다.**