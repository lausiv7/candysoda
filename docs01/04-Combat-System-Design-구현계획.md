# Shadow Archer 구현 계획서: 전투 시스템

## 1. 🎯 구현 목표

이 문서는 `docs/04-Combat-System-Design.md`에 정의된 **전투 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 소울라이크 특징을 가진 원거리/근접 전투 시스템과 모바일 최적화된 자동 타겟팅, 스태미나 관리, 패링/회피 시스템을 완성하여 몰입감 있는 전투 경험을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

전투 시스템 구현은 `assets/scripts/combat` 폴더를 중심으로 진행됩니다.

### 2.1. Combat Core (전투 핵심)

```
assets/scripts/combat/
├── CombatManager.ts                 # ✅ 전투 시스템 총괄 관리자
├── CombatController.ts              # ✅ 개별 엔티티 전투 제어
├── DamageCalculator.ts              # ✅ 데미지 계산 및 공식 관리
├── StatusEffectManager.ts           # ✅ 상태 효과 시스템 관리
└── CombatEvents.ts                  # ✅ 전투 관련 이벤트 정의
```

### 2.2. Weapons System (무기 시스템)

```
assets/scripts/combat/weapons/
├── WeaponBase.ts                    # ✅ 모든 무기의 기본 클래스
├── BowWeapon.ts                     # ✅ 활 무기 구현
├── MeleeWeapon.ts                   # ✅ 근접 무기 구현
├── WeaponManager.ts                 # ✅ 무기 관리 및 전환 시스템
└── ProjectileManager.ts             # ✅ 투사체 관리 시스템
```

### 2.3. Combat Components (전투 컴포넌트)

```
assets/scripts/combat/components/
├── HealthComponent.ts               # ✅ 체력 관리 컴포넌트
├── StaminaComponent.ts              # ✅ 스태미나 관리 컴포넌트
├── DefenseComponent.ts              # ✅ 방어 시스템 컴포넌트
├── AttackComponent.ts               # ✅ 공격 시스템 컴포넌트
└── StatusEffectComponent.ts         # ✅ 상태 효과 컴포넌트
```

### 2.4. Combat Actions (전투 액션)

```
assets/scripts/combat/actions/
├── AttackAction.ts                  # ✅ 공격 액션
├── DefenseAction.ts                 # ✅ 방어 액션 (패링, 블록)
├── DodgeAction.ts                   # ✅ 회피 액션
├── ChargeAction.ts                  # ✅ 차지 공격 액션
└── ComboAction.ts                   # ✅ 연계 공격 액션
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/04-Combat-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 전투 아키텍처 구축 (가장 중요)**
*   **기간:** 6일
*   **목표:** 플레이어가 적을 공격하고 데미지를 받는 기본 전투 루프가 정상 작동한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `ICombatEntity.ts`: 전투에 참여하는 모든 엔티티가 구현해야 할 인터페이스를 정의합니다.
        ```typescript
        interface ICombatEntity {
            readonly entityId: string;
            takeDamage(damage: DamageInfo): void;
            heal(amount: number): void;
            getCurrentHealth(): number;
            getMaxHealth(): number;
            isDead(): boolean;
        }
        ```
    2.  **[Task 1.2]** `HealthComponent.ts`: 체력 관리 로직과 데미지 처리를 구현합니다.
    3.  **[Task 1.3]** `DamageCalculator.ts`: 기본 데미지 계산 공식 (공격력, 방어력, 크리티컬)을 구현합니다.
    4.  **[Task 1.4]** `CombatController.ts`: 개별 엔티티의 전투 상태와 액션을 관리하는 컨트롤러를 구현합니다.
    5.  **[Task 1.5]** **기본 전투 테스트:** 플레이어 → 적 공격, 적 → 플레이어 공격이 정상적으로 데미지를 처리하는지 검증합니다.

### **Phase 2: 무기 시스템 구현**
*   **기간:** 5일
*   **목표:** 활과 근접 무기의 기본 공격 패턴과 차지 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `WeaponBase.ts`: 모든 무기의 공통 속성 (공격력, 공격 속도, 사거리)과 메서드를 정의합니다.
    2.  **[Task 2.2]** `BowWeapon.ts`: 활 무기의 차지 시스템, 화살 발사, 궤적 계산을 구현합니다.
        ```typescript
        class BowWeapon extends WeaponBase {
            private chargeLevel: number = 0;
            private maxChargeTime: number = 2.0;
            
            startCharge(): void {
                this.isCharging = true;
                this.chargeStartTime = Time.time;
            }
            
            releaseArrow(targetPos: Vec3): void {
                const damage = this.calculateChargeDamage();
                const arrow = this.createArrow(damage);
                arrow.fire(this.node.worldPosition, targetPos);
            }
        }
        ```
    3.  **[Task 2.3]** `MeleeWeapon.ts`: 근접 무기의 스윙 패턴, 히트박스, 연계 공격을 구현합니다.
    4.  **[Task 2.4]** `ProjectileManager.ts`: 화살과 같은 투사체의 물리 시뮬레이션, 궤적, 충돌 처리를 구현합니다.
    5.  **[Task 2.5]** **무기 테스트:** 각 무기 타입별 공격 패턴, 데미지 적용, 시각적 피드백이 정상 작동하는지 검증합니다.

### **Phase 3: 방어 및 회피 시스템**
*   **기간:** 4일
*   **목표:** 소울라이크 특징인 패링, 블록, 회피 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `DefenseAction.ts`: 방어 액션의 기본 구조와 성공/실패 판정을 구현합니다.
    2.  **[Task 3.2]** **패링 시스템:** 정확한 타이밍에 방어 시 적의 공격을 반격하는 패링 메커니즘을 구현합니다.
        ```typescript
        class ParryAction extends DefenseAction {
            private parryWindow: number = 0.3; // 300ms 패링 윈도우
            
            attemptParry(incomingAttack: AttackInfo): ParryResult {
                const timing = this.calculateTiming(incomingAttack);
                
                if (timing <= this.parryWindow) {
                    return ParryResult.SUCCESS;
                }
                return ParryResult.FAILED;
            }
        }
        ```
    3.  **[Task 3.3]** `DodgeAction.ts`: 회피 액션의 무적 프레임, 스태미나 소모, 이동 거리를 구현합니다.
    4.  **[Task 3.4]** `StaminaComponent.ts`: 모든 액션에 필요한 스태미나 관리 시스템을 구현합니다.
    5.  **[Task 3.5]** **방어 시스템 테스트:** 패링 타이밍, 회피 무적 프레임, 스태미나 관리가 정확히 동작하는지 검증합니다.

### **Phase 4: 상태 효과 및 버프/디버프 시스템**
*   **기간:** 4일
*   **목표:** 독, 빙결, 화상 등의 상태 효과와 버프/디버프 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `StatusEffect.ts`: 상태 효과의 기본 클래스와 지속시간, 효과 적용 로직을 구현합니다.
        ```typescript
        abstract class StatusEffect {
            protected duration: number;
            protected intensity: number;
            protected target: ICombatEntity;
            
            abstract apply(): void;
            abstract update(deltaTime: number): void;
            abstract remove(): void;
        }
        ```
    2.  **[Task 4.2]** **독 효과 (PoisonEffect):** 지속 데미지를 주는 독 상태 효과를 구현합니다.
    3.  **[Task 4.3]** **빙결 효과 (FreezeEffect):** 이동 속도 감소 및 동결 상태 효과를 구현합니다.
    4.  **[Task 4.4]** `StatusEffectManager.ts`: 여러 상태 효과의 중첩, 해제, 면역 처리를 관리합니다.
    5.  **[Task 4.5]** **상태 효과 테스트:** 각 상태 효과의 적용, 지속, 해제가 정상 작동하고 UI에 표시되는지 검증합니다.

### **Phase 5: 모바일 최적화 및 자동 타겟팅**
*   **기간:** 3일
*   **목표:** 모바일 환경에 최적화된 자동 타겟팅과 터치 기반 전투 인터페이스를 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `AutoTargetSystem.ts`: 거리, 각도, 위협도 기반의 자동 타겟팅 시스템을 구현합니다.
        ```typescript
        class AutoTargetSystem {
            findBestTarget(player: Node, enemies: Node[]): Node | null {
                let bestTarget = null;
                let bestScore = 0;
                
                for (const enemy of enemies) {
                    const score = this.calculateTargetScore(player, enemy);
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = enemy;
                    }
                }
                
                return bestTarget;
            }
            
            private calculateTargetScore(player: Node, enemy: Node): number {
                const distance = Vec3.distance(player.worldPosition, enemy.worldPosition);
                const angle = this.calculateAngle(player, enemy);
                const threat = enemy.getComponent(CombatController).getThreatLevel();
                
                return (1 / distance) * (1 / angle) * threat;
            }
        }
        ```
    2.  **[Task 5.2]** **터치 기반 전투:** 터치 제스처를 통한 공격, 방어, 회피 입력 시스템을 구현합니다.
    3.  **[Task 5.3]** **시각적 피드백:** 타겟팅 인디케이터, 데미지 표시, 상태 효과 시각화를 구현합니다.
    4.  **[Task 5.4]** **성능 최적화:** 전투 시스템의 메모리 사용량과 연산 비용을 모바일 환경에 맞게 최적화합니다.
    5.  **[Task 5.5]** **통합 테스트:** 전체 전투 시스템이 모바일 기기에서 60FPS로 안정적으로 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 데미지 계산 시스템

```typescript
// 데미지 계산의 핵심 공식
export class DamageCalculator {
    calculateDamage(attacker: ICombatEntity, target: ICombatEntity, weaponDamage: number): DamageInfo {
        const baseAttack = attacker.getAttackPower() + weaponDamage;
        const defense = target.getDefensePower();
        const criticalChance = attacker.getCriticalChance();
        
        // 기본 데미지 계산
        let finalDamage = Math.max(1, baseAttack - defense);
        
        // 크리티컬 적용
        if (Math.random() < criticalChance) {
            finalDamage *= attacker.getCriticalMultiplier();
            return new DamageInfo(finalDamage, DamageType.CRITICAL);
        }
        
        return new DamageInfo(finalDamage, DamageType.NORMAL);
    }
    
    // 상태 효과 데미지
    calculateStatusDamage(effect: StatusEffect, target: ICombatEntity): number {
        const baseDamage = effect.getBaseDamage();
        const resistance = target.getStatusResistance(effect.getType());
        
        return Math.max(0, baseDamage * (1 - resistance));
    }
}
```

### 4.2. 스태미나 기반 액션 시스템

```typescript
// 스태미나를 소모하는 모든 액션의 기본 구조
export abstract class StaminaAction {
    protected staminaCost: number;
    protected executionTime: number;
    protected cooldownTime: number;
    
    canExecute(entity: ICombatEntity): boolean {
        const stamina = entity.getComponent(StaminaComponent);
        return stamina.getCurrentStamina() >= this.staminaCost && 
               !this.isOnCooldown();
    }
    
    async execute(entity: ICombatEntity): Promise<void> {
        if (!this.canExecute(entity)) return;
        
        // 스태미나 소모
        const stamina = entity.getComponent(StaminaComponent);
        stamina.consume(this.staminaCost);
        
        // 액션 실행
        await this.performAction(entity);
        
        // 쿨다운 시작
        this.startCooldown();
    }
    
    protected abstract performAction(entity: ICombatEntity): Promise<void>;
}
```

### 4.3. 투사체 물리 시뮬레이션

```typescript
// 화살의 현실적인 물리 시뮬레이션
export class Arrow extends Node {
    private velocity: Vec3;
    private gravity: number = -9.81;
    private airResistance: number = 0.01;
    
    fire(startPos: Vec3, targetPos: Vec3, power: number): void {
        this.setWorldPosition(startPos);
        
        // 포물선 궤적 계산
        const trajectory = this.calculateTrajectory(startPos, targetPos, power);
        this.velocity = trajectory.initialVelocity;
        
        // 물리 업데이트 시작
        this.schedule(this.updatePhysics, 0);
    }
    
    private updatePhysics(dt: number): void {
        // 중력 적용
        this.velocity.y += this.gravity * dt;
        
        // 공기 저항 적용
        this.velocity.multiplyScalar(1 - this.airResistance * dt);
        
        // 위치 업데이트
        const deltaPos = this.velocity.clone().multiplyScalar(dt);
        this.setWorldPosition(this.worldPosition.add(deltaPos));
        
        // 충돌 체크
        this.checkCollisions();
        
        // 화살 회전 (비행 방향)
        this.lookAt(this.worldPosition.add(this.velocity.normalize()));
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **전투 설계 문서 완벽 준수:** `04-Combat-System-Design.md`에 정의된 모든 전투 메커니즘과 밸런싱을 정확히 구현합니다.

2.  **소울라이크 특성 구현:** 패링, 회피, 스태미나 관리 등 소울라이크 게임의 핵심 특징을 정확히 재현합니다.

3.  **모바일 최적화:** 터치 기반 조작과 자동 타겟팅을 통해 모바일 환경에서도 직관적인 전투가 가능하도록 합니다.

4.  **시각적 피드백:** 모든 전투 액션에 명확한 시각적, 청각적 피드백을 제공하여 플레이어가 상황을 쉽게 파악할 수 있도록 합니다.

5.  **성능 최적화:** 복잡한 전투 계산과 다수의 엔티티 처리를 모바일 환경에서 60FPS로 유지할 수 있도록 최적화합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **프레임레이트:** 다수 적과의 전투 중에도 60FPS 유지
- **반응성:** 입력에서 액션 실행까지 100ms 이내
- **정확성:** 히트박스 판정 정확도 99% 이상
- **메모리:** 전투 시스템 전체 메모리 사용량 100MB 이하

### 6.2. 검증 기준
- 10마리 이상의 적과 동시 전투 시에도 성능 저하 없음
- 패링 타이밍 윈도우 300ms 정확도 보장
- 투사체 궤적 계산의 물리적 정확성 검증
- 상태 효과 중첩 시에도 안정적인 처리
- 다양한 모바일 기기에서 일관된 전투 경험 제공

이 구현 계획을 통해 Shadow Archer의 핵심인 전투 시스템을 완성하여 플레이어에게 몰입감 있고 도전적인 소울라이크 전투 경험을 제공할 수 있을 것입니다.