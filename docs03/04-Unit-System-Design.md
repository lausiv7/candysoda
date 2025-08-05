# Unit System Design
Royal Clash - 유닛 시스템 설계

## 1. 유닛 시스템 개요

### 1.1 유닛 분류 체계
```
유닛 타입:
├── 지상 유닛 (Ground Units)
│   ├── 탱커 (Tank) - 높은 체력, 낮은 데미지
│   ├── 딜러 (DPS) - 높은 데미지, 중간 체력
│   ├── 서포터 (Support) - 버프/디버프 제공
│   └── 스웜 (Swarm) - 다수의 약한 유닛
├── 공중 유닛 (Air Units)
│   ├── 비행 (Flying) - 지상 공격 불가능한 타겟
│   ├── 드래곤 (Dragon) - 대형 공중 유닛
│   └── 비행 서포터 (Air Support)
├── 건물 유닛 (Building Units)
│   ├── 방어 건물 (Defense) - 공격형 건물
│   ├── 생산 건물 (Spawner) - 유닛 생성
│   └── 특수 건물 (Special) - 유틸리티 제공
└── 스펠 카드 (Spell Cards)
    ├── 직접 데미지 (Direct Damage)
    ├── 버프/디버프 (Buff/Debuff)
    └── 유틸리티 (Utility)
```

### 1.2 레어도 시스템
- **커먼 (Common)**: 기본 유닛, 쉽게 획득 및 업그레이드
- **레어 (Rare)**: 특수 능력을 가진 유닛
- **에픽 (Epic)**: 강력한 능력, 높은 엘릭서 비용
- **레전더리 (Legendary)**: 독특한 메커니즘, 게임 체인저

### 1.3 업그레이드 메커니즘
```typescript
// src/data/UpgradeSystem.ts
export interface UpgradeRequirement {
    level: number;
    cardsRequired: number;
    goldCost: number;
    playerLevelRequired: number;
}

export const UPGRADE_REQUIREMENTS: { [rarity: string]: UpgradeRequirement[] } = {
    'common': [
        { level: 2, cardsRequired: 2, goldCost: 5, playerLevelRequired: 1 },
        { level: 3, cardsRequired: 4, goldCost: 20, playerLevelRequired: 2 },
        { level: 4, cardsRequired: 10, goldCost: 50, playerLevelRequired: 3 },
        { level: 5, cardsRequired: 20, goldCost: 150, playerLevelRequired: 4 },
        { level: 6, cardsRequired: 50, goldCost: 300, playerLevelRequired: 5 },
        { level: 7, cardsRequired: 100, goldCost: 800, playerLevelRequired: 6 },
        { level: 8, cardsRequired: 200, goldCost: 1600, playerLevelRequired: 7 },
        { level: 9, cardsRequired: 400, goldCost: 3200, playerLevelRequired: 8 },
        { level: 10, cardsRequired: 800, goldCost: 6400, playerLevelRequired: 9 },
        { level: 11, cardsRequired: 1000, goldCost: 10000, playerLevelRequired: 10 },
        { level: 12, cardsRequired: 1500, goldCost: 20000, playerLevelRequired: 11 },
        { level: 13, cardsRequired: 2000, goldCost: 50000, playerLevelRequired: 12 }
    ],
    'rare': [
        { level: 2, cardsRequired: 2, goldCost: 50, playerLevelRequired: 3 },
        { level: 3, cardsRequired: 4, goldCost: 150, playerLevelRequired: 4 },
        { level: 4, cardsRequired: 10, goldCost: 400, playerLevelRequired: 5 },
        { level: 5, cardsRequired: 20, goldCost: 1000, playerLevelRequired: 6 },
        { level: 6, cardsRequired: 50, goldCost: 2000, playerLevelRequired: 7 },
        { level: 7, cardsRequired: 100, goldCost: 4000, playerLevelRequired: 8 },
        { level: 8, cardsRequired: 200, goldCost: 8000, playerLevelRequired: 9 },
        { level: 9, cardsRequired: 400, goldCost: 20000, playerLevelRequired: 10 },
        { level: 10, cardsRequired: 800, goldCost: 40000, playerLevelRequired: 11 },
        { level: 11, cardsRequired: 1000, goldCost: 100000, playerLevelRequired: 12 }
    ],
    'epic': [
        { level: 2, cardsRequired: 2, goldCost: 1000, playerLevelRequired: 6 },
        { level: 3, cardsRequired: 4, goldCost: 2000, playerLevelRequired: 7 },
        { level: 4, cardsRequired: 10, goldCost: 4000, playerLevelRequired: 8 },
        { level: 5, cardsRequired: 20, goldCost: 8000, playerLevelRequired: 9 },
        { level: 6, cardsRequired: 50, goldCost: 20000, playerLevelRequired: 10 },
        { level: 7, cardsRequired: 100, goldCost: 50000, playerLevelRequired: 11 },
        { level: 8, cardsRequired: 200, goldCost: 100000, playerLevelRequired: 12 }
    ],
    'legendary': [
        { level: 2, cardsRequired: 2, goldCost: 5000, playerLevelRequired: 9 },
        { level: 3, cardsRequired: 4, goldCost: 20000, playerLevelRequired: 10 },
        { level: 4, cardsRequired: 10, goldCost: 50000, playerLevelRequired: 11 },
        { level: 5, cardsRequired: 20, goldCost: 100000, playerLevelRequired: 12 }
    ]
};
```

## 2. 유닛 속성 시스템

### 2.1 기본 스탯 (HP, 공격력, 속도)
```typescript
// src/data/UnitStats.ts
export interface UnitStats {
    // 기본 능력치
    hitpoints: number;        // 체력
    damage: number;           // 공격력
    damagePerSecond: number;  // DPS (계산된 값)
    
    // 이동 및 공격
    movementSpeed: number;    // 이동 속도 (tiles/second)
    attackSpeed: number;      // 공격 속도 (attacks/second)
    attackRange: number;      // 공격 사거리 (tiles)
    
    // 특수 속성
    deployTime: number;       // 배치 후 활성화 시간
    lifetime: number;         // 지속 시간 (-1이면 무제한)
    count: number;           // 생성되는 유닛 수
    
    // 타겟팅
    targets: TargetType[];    // 공격 가능한 타겟 타입
    targetingPriority: TargetPriority; // 타겟 선택 우선순위
    
    // 데미지 타입
    damageType: DamageType;   // 물리, 마법, 시즈
    armorType: ArmorType;     // 경갑, 중갑, 마법저항
    
    // 특수 능력
    abilities: UnitAbility[]; // 특수 능력 목록
}

export enum TargetType {
    GROUND = 'ground',
    AIR = 'air',
    BUILDINGS = 'buildings'
}

export enum TargetPriority {
    CLOSEST = 'closest',
    LOWEST_HEALTH = 'lowest_health',
    HIGHEST_DAMAGE = 'highest_damage',
    BUILDINGS_FIRST = 'buildings_first'
}

export enum DamageType {
    PHYSICAL = 'physical',
    MAGICAL = 'magical',
    SIEGE = 'siege'
}

export enum ArmorType {
    LIGHT = 'light',
    HEAVY = 'heavy',
    MAGICAL = 'magical',
    BUILDING = 'building'
}
```

### 2.2 특수 능력
```typescript
// src/units/UnitAbilities.ts
export abstract class UnitAbility {
    public abstract readonly id: string;
    public abstract readonly name: string;
    public abstract readonly description: string;
    
    protected unit: Unit;
    protected cooldown: number = 0;
    protected lastActivation: number = 0;
    
    constructor(unit: Unit) {
        this.unit = unit;
    }
    
    public abstract canActivate(): boolean;
    public abstract activate(): void;
    
    public update(deltaTime: number): void {
        // 쿨다운 업데이트
        if (this.lastActivation > 0) {
            const elapsed = Date.now() - this.lastActivation;
            if (elapsed >= this.cooldown) {
                this.onCooldownComplete();
            }
        }
    }
    
    protected onCooldownComplete(): void {
        // 쿨다운 완료 시 처리
    }
}

// 분노 능력 (체력이 낮을 때 공속 증가)
export class RageAbility extends UnitAbility {
    public readonly id = 'rage';
    public readonly name = '분노';
    public readonly description = '체력이 35% 이하일 때 공격속도 40% 증가';
    
    private rageThreshold = 0.35;
    private speedMultiplier = 1.4;
    private isRageActive = false;
    
    public canActivate(): boolean {
        const healthPercent = this.unit.getCurrentHealth() / this.unit.getMaxHealth();
        return healthPercent <= this.rageThreshold && !this.isRageActive;
    }
    
    public activate(): void {
        this.isRageActive = true;
        this.unit.multiplyAttackSpeed(this.speedMultiplier);
        
        // 시각적 효과
        EffectManager.instance.attachEffect('rage_aura', this.unit.node);
        
        console.log(`${this.unit.getCardData().name}이(가) 분노 상태가 되었습니다!`);
    }
}

// 죽음의 피해 (죽을 때 주변에 피해)
export class DeathDamageAbility extends UnitAbility {
    public readonly id = 'death_damage';
    public readonly name = '죽음의 폭발';
    public readonly description = '죽을 때 주변 적에게 피해를 입힙니다';
    
    private damageRadius = 2.5;
    private damage = 200;
    
    public canActivate(): boolean {
        return this.unit.getCurrentHealth() <= 0;
    }
    
    public activate(): void {
        const position = this.unit.node.worldPosition;
        
        // 폭발 이펙트
        EffectManager.instance.playEffect('death_explosion', position);
        
        // 주변 적에게 피해
        const enemies = BattleManager.instance.getEnemyUnitsInRadius(
            this.unit.ownerId, 
            position, 
            this.damageRadius
        );
        
        for (const enemy of enemies) {
            DamageSystem.applyDamage(enemy, this.damage, this.unit);
        }
    }
}

// 분열 능력 (죽을 때 작은 유닛들로 분열)
export class SplitAbility extends UnitAbility {
    public readonly id = 'split';
    public readonly name = '분열';
    public readonly description = '죽을 때 작은 유닛 2개로 분열합니다';
    
    private spawnCardId = 'small_golem';
    private spawnCount = 2;
    
    public canActivate(): boolean {
        return this.unit.getCurrentHealth() <= 0;
    }
    
    public activate(): void {
        const position = this.unit.node.worldPosition;
        
        for (let i = 0; i < this.spawnCount; i++) {
            const spawnPos = new Vec3(
                position.x + (Math.random() - 0.5) * 2,
                position.y,
                position.z + (Math.random() - 0.5) * 2
            );
            
            BattleManager.instance.spawnUnit(
                this.spawnCardId,
                spawnPos,
                this.unit.ownerId,
                this.unit.level
            );
        }
        
        console.log(`${this.unit.getCardData().name}이(가) ${this.spawnCount}개로 분열했습니다!`);
    }
}
```

### 2.3 타겟팅 우선순위
```typescript
// src/battle/TargetingBehavior.ts
export class TargetingBehavior {
    public static findBestTarget(unit: Unit): Unit | null {
        const enemies = BattleManager.instance.getEnemyUnitsInRange(
            unit.ownerId, 
            unit.node.worldPosition, 
            unit.getStats().attackRange
        );
        
        if (enemies.length === 0) return null;
        
        const priority = unit.getStats().targetingPriority;
        
        switch (priority) {
            case TargetPriority.CLOSEST:
                return this.findClosestTarget(unit, enemies);
                
            case TargetPriority.LOWEST_HEALTH:
                return this.findLowestHealthTarget(enemies);
                
            case TargetPriority.HIGHEST_DAMAGE:
                return this.findHighestDamageTarget(enemies);
                
            case TargetPriority.BUILDINGS_FIRST:
                return this.findBuildingsFirstTarget(unit, enemies);
                
            default:
                return this.findClosestTarget(unit, enemies);
        }
    }
    
    private static findClosestTarget(unit: Unit, targets: Unit[]): Unit {
        let closest = targets[0];
        let closestDistance = Vec3.distance(unit.node.worldPosition, closest.node.worldPosition);
        
        for (let i = 1; i < targets.length; i++) {
            const distance = Vec3.distance(unit.node.worldPosition, targets[i].node.worldPosition);
            if (distance < closestDistance) {
                closest = targets[i];
                closestDistance = distance;
            }
        }
        
        return closest;
    }
    
    private static findLowestHealthTarget(targets: Unit[]): Unit {
        let lowestHealth = targets[0];
        let lowestHealthValue = lowestHealth.getCurrentHealth();
        
        for (let i = 1; i < targets.length; i++) {
            const health = targets[i].getCurrentHealth();
            if (health < lowestHealthValue) {
                lowestHealth = targets[i];
                lowestHealthValue = health;
            }
        }
        
        return lowestHealth;
    }
    
    private static findBuildingsFirstTarget(unit: Unit, targets: Unit[]): Unit {
        // 먼저 건물 타겟 찾기
        const buildings = targets.filter(t => t.getCardData().type === 'building');
        if (buildings.length > 0) {
            return this.findClosestTarget(unit, buildings);
        }
        
        // 건물이 없으면 가장 가까운 유닛
        return this.findClosestTarget(unit, targets);
    }
}
```

### 2.4 공격 범위 및 타입
- **근접 공격 (Melee)**: 1.2 타일 (기사, 고블린 등)
- **원거리 공격 (Ranged)**: 4.5-6.5 타일 (궁수, 머스킷 등)
- **시즈 공격 (Siege)**: 7+ 타일 (박격포, 엑스보우 등)
- **스플래시 공격 (Splash)**: 범위 피해 (마법사, 용 등)

## 3. 유닛 카테고리별 설계

### 3.1 지상 유닛
```typescript
// src/data/cards/GroundUnits.ts
export const GROUND_UNITS: { [id: string]: CardData } = {
    'knight': {
        id: 'knight',
        name: '기사',
        type: 'unit',
        rarity: 'common',
        elixirCost: 3,
        faction: 'knight_order',
        stats: {
            hitpoints: 1344,
            damage: 158,
            movementSpeed: 1.2,
            attackSpeed: 1.2,
            attackRange: 1.2,
            deployTime: 1.0,
            targets: [TargetType.GROUND],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.PHYSICAL,
            armorType: ArmorType.HEAVY,
            abilities: []
        },
        description: '견고한 방어력을 가진 근접 전사입니다.',
        arena: 0
    },
    
    'archer': {
        id: 'archer',
        name: '궁수',
        type: 'unit',
        rarity: 'common',
        elixirCost: 3,
        faction: 'knight_order',
        stats: {
            hitpoints: 304,
            damage: 118,
            movementSpeed: 1.4,
            attackSpeed: 1.2,
            attackRange: 5.5,
            deployTime: 1.0,
            count: 2, // 2명이 함께 배치됨
            targets: [TargetType.GROUND, TargetType.AIR],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.PHYSICAL,
            armorType: ArmorType.LIGHT,
            abilities: []
        },
        description: '원거리에서 공중과 지상 유닛을 공격합니다.',
        arena: 0
    },
    
    'giant': {
        id: 'giant',
        name: '자이언트',
        type: 'unit',
        rarity: 'rare',
        elixirCost: 5,
        faction: 'knight_order',
        stats: {
            hitpoints: 3275,
            damage: 211,
            movementSpeed: 1.0,
            attackSpeed: 1.5,
            attackRange: 1.2,
            deployTime: 1.0,
            targets: [TargetType.BUILDINGS],
            targetingPriority: TargetPriority.BUILDINGS_FIRST,
            damageType: DamageType.PHYSICAL,
            armorType: ArmorType.HEAVY,
            abilities: []
        },
        description: '건물만을 공격하는 거대한 탱커입니다.',
        arena: 2
    },
    
    'wizard': {
        id: 'wizard',
        name: '마법사',
        type: 'unit',
        rarity: 'rare',
        elixirCost: 5,
        faction: 'mage_guild',
        stats: {
            hitpoints: 598,
            damage: 256,
            movementSpeed: 1.4,
            attackSpeed: 1.4,
            attackRange: 5.5,
            deployTime: 1.0,
            targets: [TargetType.GROUND, TargetType.AIR],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.MAGICAL,
            armorType: ArmorType.LIGHT,
            abilities: []
        },
        description: '범위 마법 공격으로 다수의 적을 공격합니다.',
        splashRadius: 1.5, // 범위 공격
        arena: 5
    }
};
```

### 3.2 공중 유닛
```typescript
// src/data/cards/AirUnits.ts
export const AIR_UNITS: { [id: string]: CardData } = {
    'minions': {
        id: 'minions',
        name: '미니언',
        type: 'unit',
        rarity: 'common',
        elixirCost: 3,
        faction: 'undead_legion',
        stats: {
            hitpoints: 190,
            damage: 84,
            movementSpeed: 2.0,
            attackSpeed: 1.0,
            attackRange: 2.0,
            deployTime: 1.0,
            count: 3, // 3마리 소환
            targets: [TargetType.GROUND, TargetType.AIR],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.PHYSICAL,
            armorType: ArmorType.LIGHT,
            abilities: []
        },
        description: '빠른 속도의 공중 유닛입니다.',
        arena: 3
    },
    
    'baby_dragon': {
        id: 'baby_dragon',
        name: '아기 드래곤',
        type: 'unit',
        rarity: 'epic',
        elixirCost: 4,
        faction: 'mage_guild',
        stats: {
            hitpoints: 800,
            damage: 142,
            movementSpeed: 1.8,
            attackSpeed: 1.6,
            attackRange: 3.5,
            deployTime: 1.0,
            targets: [TargetType.GROUND, TargetType.AIR],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.MAGICAL,
            armorType: ArmorType.LIGHT,
            abilities: []
        },
        description: '화염 브레스로 범위 피해를 입힙니다.',
        splashRadius: 1.2,
        arena: 6
    },
    
    'balloon': {
        id: 'balloon',
        name: '풍선',
        type: 'unit',
        rarity: 'epic',
        elixirCost: 5,
        faction: 'rogue_alliance',
        stats: {
            hitpoints: 1050,
            damage: 600, // 높은 건물 데미지
            movementSpeed: 1.5,
            attackSpeed: 3.0, // 느린 공격속도
            attackRange: 1.0, // 근접 공격
            deployTime: 1.0,
            targets: [TargetType.BUILDINGS],
            targetingPriority: TargetPriority.BUILDINGS_FIRST,
            damageType: DamageType.SIEGE,
            armorType: ArmorType.LIGHT,
            abilities: ['death_damage'] // 죽을 때 폭발
        },
        description: '건물에 강력한 피해를 입히는 공중 유닛입니다.',
        arena: 6
    }
};
```

### 3.3 건물 유닛
```typescript
// src/data/cards/Buildings.ts
export const BUILDINGS: { [id: string]: CardData } = {
    'cannon': {
        id: 'cannon',
        name: '캐논',
        type: 'building',
        rarity: 'common',
        elixirCost: 3,
        faction: 'knight_order',
        stats: {
            hitpoints: 380,
            damage: 246,
            movementSpeed: 0, // 고정 건물
            attackSpeed: 0.85,
            attackRange: 5.5,
            deployTime: 1.0,
            lifetime: 40000, // 40초 지속
            targets: [TargetType.GROUND],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.SIEGE,
            armorType: ArmorType.BUILDING,
            abilities: []
        },
        description: '지상 유닛만을 공격하는 방어 건물입니다.',
        arena: 0
    },
    
    'tesla': {
        id: 'tesla',
        name: '테슬라',
        type: 'building',
        rarity: 'common',
        elixirCost: 4,
        faction: 'mage_guild',
        stats: {
            hitpoints: 450,
            damage: 128,
            movementSpeed: 0,
            attackSpeed: 1.1,
            attackRange: 5.5,
            deployTime: 1.0,
            lifetime: 40000,
            targets: [TargetType.GROUND, TargetType.AIR],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.MAGICAL,
            armorType: ArmorType.BUILDING,
            abilities: ['stealth'] // 적이 가까이 올 때까지 숨어있음
        },
        description: '숨어있다가 적을 공격하는 전기 타워입니다.',
        arena: 4
    },
    
    'goblin_hut': {
        id: 'goblin_hut',
        name: '고블린 오두막',
        type: 'building',
        rarity: 'rare',
        elixirCost: 5,
        faction: 'rogue_alliance',
        stats: {
            hitpoints: 800,
            damage: 0, // 직접 공격 안함
            movementSpeed: 0,
            attackSpeed: 0,
            attackRange: 0,
            deployTime: 1.0,
            lifetime: 60000, // 60초 지속
            targets: [],
            targetingPriority: TargetPriority.CLOSEST,
            damageType: DamageType.PHYSICAL,
            armorType: ArmorType.BUILDING,
            abilities: ['spawn_goblin'] // 주기적으로 고블린 생성
        },
        description: '주기적으로 고블린을 생성하는 건물입니다.',
        spawnInterval: 4500, // 4.5초마다 생성
        spawnCardId: 'spear_goblin',
        arena: 7
    }
};
```

### 3.4 스펠 카드
```typescript
// src/data/cards/Spells.ts
export const SPELLS: { [id: string]: CardData } = {
    'fireball': {
        id: 'fireball',
        name: '파이어볼',
        type: 'spell',
        rarity: 'rare',
        elixirCost: 4,
        faction: 'mage_guild',
        stats: {
            damage: 325,
            effectRadius: 2.5,
            targets: [TargetType.GROUND, TargetType.AIR],
            damageType: DamageType.MAGICAL
        },
        description: '범위 내의 모든 적에게 강력한 피해를 입힙니다.',
        arena: 1
    },
    
    'arrows': {
        id: 'arrows',
        name: '화살',
        type: 'spell',
        rarity: 'common',
        elixirCost: 3,
        faction: 'knight_order',
        stats: {
            damage: 107,
            effectRadius: 4.0,
            targets: [TargetType.GROUND, TargetType.AIR],
            damageType: DamageType.PHYSICAL
        },
        description: '넓은 범위의 약한 유닛들을 처치합니다.',
        arena: 0
    },
    
    'rage': {
        id: 'rage',
        name: '분노',
        type: 'spell',
        rarity: 'epic',
        elixirCost: 2,
        faction: 'rogue_alliance',
        stats: {
            effectRadius: 5.0,
            duration: 8000, // 8초
            speedMultiplier: 1.4,
            attackSpeedMultiplier: 1.4,
            targets: [TargetType.GROUND, TargetType.AIR]
        },
        description: '아군 유닛들의 속도와 공격속도를 증가시킵니다.',
        arena: 6
    },
    
    'freeze': {
        id: 'freeze',
        name: '빙결',
        type: 'spell',
        rarity: 'epic',
        elixirCost: 4,
        faction: 'mage_guild',
        stats: {
            effectRadius: 3.0,
            duration: 5000, // 5초
            targets: [TargetType.GROUND, TargetType.AIR, TargetType.BUILDINGS]
        },
        description: '적 유닛과 건물을 일시정지시킵니다.',
        arena: 8
    }
};
```

## 4. 유닛 AI 시스템

### 4.1 행동 패턴
```typescript
// src/ai/UnitAI.ts
export enum UnitState {
    SPAWNING = 'spawning',
    IDLE = 'idle',
    MOVING = 'moving',
    ATTACKING = 'attacking',
    SPECIAL = 'special',
    DYING = 'dying'
}

export class UnitAI extends Component {
    private currentState: UnitState = UnitState.SPAWNING;
    private target: Unit | null = null;
    private destination: Vec3 | null = null;
    private lastStateChange: number = 0;
    private pathfinder: PathfindingSystem;
    private currentPath: Vec3[] = [];
    private pathIndex: number = 0;
    
    protected onLoad(): void {
        this.pathfinder = new PathfindingSystem();
        this.changeState(UnitState.SPAWNING);
    }
    
    public update(deltaTime: number): void {
        switch (this.currentState) {
            case UnitState.SPAWNING:
                this.updateSpawning(deltaTime);
                break;
            case UnitState.IDLE:
                this.updateIdle(deltaTime);
                break;
            case UnitState.MOVING:
                this.updateMoving(deltaTime);
                break;
            case UnitState.ATTACKING:
                this.updateAttacking(deltaTime);
                break;
            case UnitState.SPECIAL:
                this.updateSpecial(deltaTime);
                break;
        }
    }
    
    private updateSpawning(deltaTime: number): void {
        const spawnTime = this.getComponent(Unit).getStats().deployTime * 1000;
        if (Date.now() - this.lastStateChange >= spawnTime) {
            this.changeState(UnitState.IDLE);
        }
    }
    
    private updateIdle(deltaTime: number): void {
        // 타겟 찾기
        this.target = TargetingBehavior.findBestTarget(this.getComponent(Unit));
        
        if (this.target) {
            const distance = Vec3.distance(this.node.worldPosition, this.target.node.worldPosition);
            const attackRange = this.getComponent(Unit).getStats().attackRange;
            
            if (distance <= attackRange) {
                this.changeState(UnitState.ATTACKING);
            } else {
                this.setDestination(this.target.node.worldPosition);
                this.changeState(UnitState.MOVING);
            }
        } else {
            // 타겟이 없으면 자동 진격
            this.findNextDestination();
            if (this.destination) {
                this.changeState(UnitState.MOVING);
            }
        }
    }
    
    private updateMoving(deltaTime: number): void {
        if (!this.destination) {
            this.changeState(UnitState.IDLE);
            return;
        }
        
        // 경로 따라 이동
        if (this.currentPath.length > 0) {
            this.followPath(deltaTime);
        }
        
        // 목적지 도착 확인
        const distance = Vec3.distance(this.node.worldPosition, this.destination);
        if (distance < 0.5) {
            this.destination = null;
            this.currentPath = [];
            this.changeState(UnitState.IDLE);
        }
        
        // 이동 중에도 공격 가능한 타겟이 있는지 확인
        this.target = TargetingBehavior.findBestTarget(this.getComponent(Unit));
        if (this.target) {
            const targetDistance = Vec3.distance(this.node.worldPosition, this.target.node.worldPosition);
            const attackRange = this.getComponent(Unit).getStats().attackRange;
            
            if (targetDistance <= attackRange) {
                this.changeState(UnitState.ATTACKING);
            }
        }
    }
    
    private updateAttacking(deltaTime: number): void {
        if (!this.target || this.target.isDead()) {
            this.target = null;
            this.changeState(UnitState.IDLE);
            return;
        }
        
        // 타겟이 사거리 밖으로 나갔는지 확인
        const distance = Vec3.distance(this.node.worldPosition, this.target.node.worldPosition);
        const attackRange = this.getComponent(Unit).getStats().attackRange;
        
        if (distance > attackRange) {
            this.setDestination(this.target.node.worldPosition);
            this.changeState(UnitState.MOVING);
            return;
        }
        
        // 공격 실행
        this.performAttack();
    }
    
    private changeState(newState: UnitState): void {
        this.currentState = newState;
        this.lastStateChange = Date.now();
        
        // 상태 변경 시 처리
        switch (newState) {
            case UnitState.SPAWNING:
                this.playAnimation('spawn');
                break;
            case UnitState.IDLE:
                this.playAnimation('idle');
                break;
            case UnitState.MOVING:
                this.playAnimation('move');
                break;
            case UnitState.ATTACKING:
                this.playAnimation('attack');
                break;
        }
    }
    
    private setDestination(destination: Vec3): void {
        this.destination = destination;
        
        // 경로 계산
        const start = new Vec2(this.node.worldPosition.x, this.node.worldPosition.z);
        const end = new Vec2(destination.x, destination.z);
        
        const path2D = this.pathfinder.findPath(start, end);
        this.currentPath = path2D.map(p => new Vec3(p.x, this.node.worldPosition.y, p.y));
        this.pathIndex = 0;
    }
    
    private followPath(deltaTime: number): void {
        if (this.pathIndex >= this.currentPath.length) return;
        
        const currentTarget = this.currentPath[this.pathIndex];
        const moveSpeed = this.getComponent(Unit).getStats().movementSpeed;
        
        // 현재 타겟 포인트로 이동
        const direction = Vec3.subtract(new Vec3(), currentTarget, this.node.worldPosition);
        direction.normalize();
        
        const movement = Vec3.multiplyScalar(new Vec3(), direction, moveSpeed * deltaTime);
        this.node.worldPosition = Vec3.add(new Vec3(), this.node.worldPosition, movement);
        
        // 현재 타겟 포인트에 도달했는지 확인
        const distance = Vec3.distance(this.node.worldPosition, currentTarget);
        if (distance < 0.3) {
            this.pathIndex++;
        }
        
        // 방향 설정
        if (movement.length() > 0.01) {
            const angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
            this.node.eulerAngles = new Vec3(0, angle, 0);
        }
    }
    
    private performAttack(): void {
        const unit = this.getComponent(Unit);
        const stats = unit.getStats();
        const currentTime = Date.now();
        
        // 공격 쿨다운 확인
        const attackCooldown = 1000 / stats.attackSpeed;
        if (currentTime - unit.lastAttackTime < attackCooldown) {
            return;
        }
        
        // 공격 실행
        if (this.target) {
            unit.attack(this.target);
            unit.lastAttackTime = currentTime;
        }
    }
    
    private findNextDestination(): void {
        const unit = this.getComponent(Unit);
        const ownerId = unit.ownerId;
        
        // 기본적으로 적 킹 타워 방향으로 이동
        const enemyKingTower = BattleManager.instance.getEnemyKingTower(ownerId);
        if (enemyKingTower) {
            this.setDestination(enemyKingTower.node.worldPosition);
        }
    }
}
```

### 4.2 타겟팅 로직
```typescript
// src/ai/AdvancedTargeting.ts
export class AdvancedTargeting {
    public static findOptimalTarget(unit: Unit): Unit | null {
        const enemies = BattleManager.instance.getEnemyUnitsInRange(
            unit.ownerId,
            unit.node.worldPosition,
            unit.getStats().attackRange
        );
        
        if (enemies.length === 0) return null;
        
        // 위협도 기반 타겟 선택
        const threats = this.calculateThreatScores(unit, enemies);
        
        // 가장 높은 위협도를 가진 타겟 선택
        let bestTarget = enemies[0];
        let highestThreat = threats[0];
        
        for (let i = 1; i < enemies.length; i++) {
            if (threats[i] > highestThreat) {
                bestTarget = enemies[i];
                highestThreat = threats[i];
            }
        }
        
        return bestTarget;
    }
    
    private static calculateThreatScores(attacker: Unit, targets: Unit[]): number[] {
        const scores: number[] = [];
        
        for (const target of targets) {
            let score = 0;
            
            // 기본 위협도 (공격력 기반)
            score += target.getStats().damage * 0.3;
            
            // 거리 보정 (가까울수록 높은 점수)
            const distance = Vec3.distance(attacker.node.worldPosition, target.node.worldPosition);
            score += (10 - distance) * 5;
            
            // 체력 보정 (낮은 체력일수록 높은 점수 - 킬 우선)
            const healthPercent = target.getCurrentHealth() / target.getMaxHealth();
            score += (1 - healthPercent) * 20;
            
            // 타입별 보정
            if (target.getCardData().type === 'building') {
                score += 15; // 건물 우선 공격
            }
            
            if (this.canOneShot(attacker, target)) {
                score += 25; // 한 방에 죽일 수 있으면 높은 우선순위
            }
            
            // 상성 보정
            const effectiveness = UnitInteractionSystem.getEffectivenessMultiplier(
                attacker.getCardData().id,
                target.getCardData().id
            );
            score *= effectiveness;
            
            scores.push(score);
        }
        
        return scores;
    }
    
    private static canOneShot(attacker: Unit, target: Unit): boolean {
        const damage = DamageSystem.calculateDamage(attacker, target);
        return damage >= target.getCurrentHealth();
    }
}
```

### 4.3 이동 알고리즘
```typescript
// src/ai/MovementController.ts
export class MovementController extends Component {
    private currentVelocity: Vec3 = new Vec3();
    private desiredVelocity: Vec3 = new Vec3();
    private avoidanceRadius: number = 1.0;
    private separationWeight: number = 1.5;
    private alignmentWeight: number = 0.8;
    private cohesionWeight: number = 0.5;
    
    public update(deltaTime: number): void {
        this.updateFlocking(deltaTime);
        this.updateMovement(deltaTime);
    }
    
    private updateFlocking(deltaTime: number): void {
        const unit = this.getComponent(Unit);
        const nearbyUnits = this.getNearbyAlliedUnits();
        
        if (nearbyUnits.length === 0) return;
        
        // Flocking 행동 계산
        const separation = this.calculateSeparation(nearbyUnits);
        const alignment = this.calculateAlignment(nearbyUnits);
        const cohesion = this.calculateCohesion(nearbyUnits);
        
        // 가중치 적용
        Vec3.multiplyScalar(separation, separation, this.separationWeight);
        Vec3.multiplyScalar(alignment, alignment, this.alignmentWeight);
        Vec3.multiplyScalar(cohesion, cohesion, this.cohesionWeight);
        
        // 최종 원하는 속도 계산
        this.desiredVelocity = Vec3.add(new Vec3(), separation, alignment);
        this.desiredVelocity = Vec3.add(this.desiredVelocity, this.desiredVelocity, cohesion);
        
        // 속도 제한
        const maxSpeed = unit.getStats().movementSpeed;
        if (this.desiredVelocity.length() > maxSpeed) {
            this.desiredVelocity.normalize();
            Vec3.multiplyScalar(this.desiredVelocity, this.desiredVelocity, maxSpeed);
        }
    }
    
    private calculateSeparation(nearbyUnits: Unit[]): Vec3 {
        const separation = new Vec3();
        let count = 0;
        
        for (const other of nearbyUnits) {
            const distance = Vec3.distance(this.node.worldPosition, other.node.worldPosition);
            
            if (distance > 0 && distance < this.avoidanceRadius) {
                // 다른 유닛으로부터 멀어지는 방향
                const diff = Vec3.subtract(new Vec3(), this.node.worldPosition, other.node.worldPosition);
                diff.normalize();
                Vec3.divideScalar(diff, diff, distance); // 거리가 가까울수록 강한 힘
                
                Vec3.add(separation, separation, diff);
                count++;
            }
        }
        
        if (count > 0) {
            Vec3.divideScalar(separation, separation, count);
            separation.normalize();
        }
        
        return separation;
    }
    
    private calculateAlignment(nearbyUnits: Unit[]): Vec3 {
        const alignment = new Vec3();
        let count = 0;
        
        for (const other of nearbyUnits) {
            const distance = Vec3.distance(this.node.worldPosition, other.node.worldPosition);
            
            if (distance > 0 && distance < this.avoidanceRadius * 2) {
                const otherMovement = other.getComponent(MovementController);
                if (otherMovement) {
                    Vec3.add(alignment, alignment, otherMovement.currentVelocity);
                    count++;
                }
            }
        }
        
        if (count > 0) {
            Vec3.divideScalar(alignment, alignment, count);
            alignment.normalize();
        }
        
        return alignment;
    }
    
    private calculateCohesion(nearbyUnits: Unit[]): Vec3 {
        const center = new Vec3();
        let count = 0;
        
        for (const other of nearbyUnits) {
            const distance = Vec3.distance(this.node.worldPosition, other.node.worldPosition);
            
            if (distance > 0 && distance < this.avoidanceRadius * 3) {
                Vec3.add(center, center, other.node.worldPosition);
                count++;
            }
        }
        
        if (count > 0) {
            Vec3.divideScalar(center, center, count);
            const cohesion = Vec3.subtract(new Vec3(), center, this.node.worldPosition);
            cohesion.normalize();
            return cohesion;
        }
        
        return new Vec3();
    }
    
    private updateMovement(deltaTime: number): void {
        // 부드러운 속도 변화
        const steerForce = Vec3.subtract(new Vec3(), this.desiredVelocity, this.currentVelocity);
        const maxSteerForce = 2.0;
        
        if (steerForce.length() > maxSteerForce) {
            steerForce.normalize();
            Vec3.multiplyScalar(steerForce, steerForce, maxSteerForce);
        }
        
        Vec3.add(this.currentVelocity, this.currentVelocity, 
                Vec3.multiplyScalar(new Vec3(), steerForce, deltaTime));
        
        // 위치 업데이트
        const movement = Vec3.multiplyScalar(new Vec3(), this.currentVelocity, deltaTime);
        this.node.worldPosition = Vec3.add(new Vec3(), this.node.worldPosition, movement);
    }
    
    private getNearbyAlliedUnits(): Unit[] {
        const unit = this.getComponent(Unit);
        const alliedUnits = BattleManager.instance.getAlliedUnits(unit.ownerId);
        
        return alliedUnits.filter(other => {
            if (other === unit) return false;
            
            const distance = Vec3.distance(this.node.worldPosition, other.node.worldPosition);
            return distance <= this.avoidanceRadius * 3;
        });
    }
}
```

### 4.4 전투 행동
```typescript
// src/ai/CombatBehavior.ts
export class CombatBehavior extends Component {
    private combatState: string = 'aggressive';
    private retreatThreshold: number = 0.3; // 30% 체력 이하에서 후퇴
    private groupUpRadius: number = 3.0;
    
    public update(deltaTime: number): void {
        const unit = this.getComponent(Unit);
        
        // 전투 상황 분석
        this.analyzeCombatSituation();
        
        // 상황에 따른 행동 결정
        switch (this.combatState) {
            case 'aggressive':
                this.executeAggressiveBehavior();
                break;
            case 'defensive':
                this.executeDefensiveBehavior();
                break;
            case 'retreat':
                this.executeRetreatBehavior();
                break;
            case 'support':
                this.executeSupportBehavior();
                break;
        }
    }
    
    private analyzeCombatSituation(): void {
        const unit = this.getComponent(Unit);
        const healthPercent = unit.getCurrentHealth() / unit.getMaxHealth();
        
        // 체력 기반 상태 변경
        if (healthPercent <= this.retreatThreshold) {
            this.combatState = 'retreat';
            return;
        }
        
        // 주변 상황 분석
        const nearbyEnemies = this.getNearbyEnemies();
        const nearbyAllies = this.getNearbyAllies();
        
        const enemyCount = nearbyEnemies.length;
        const allyCount = nearbyAllies.length;
        
        // 수적 열세/우세에 따른 전술 변경
        if (enemyCount > allyCount + 1) {
            this.combatState = 'defensive';
        } else if (allyCount > enemyCount + 1) {
            this.combatState = 'aggressive';
        } else {
            // 유닛 타입에 따른 기본 행동
            const cardData = unit.getCardData();
            if (cardData.id === 'healer' || cardData.id === 'buffer') {
                this.combatState = 'support';
            } else {
                this.combatState = 'aggressive';
            }
        }
    }
    
    private executeAggressiveBehavior(): void {
        const unit = this.getComponent(Unit);
        const ai = unit.getComponent(UnitAI);
        
        // 가장 위험한 적 타겟팅
        const target = AdvancedTargeting.findOptimalTarget(unit);
        if (target) {
            ai.setTarget(target);
        }
        
        // 공격적인 위치 선택 (적에게 더 가까이)
        this.moveTowardsEnemies();
    }
    
    private executeDefensiveBehavior(): void {
        const unit = this.getComponent(Unit);
        
        // 아군과 뭉치기
        this.groupUpWithAllies();
        
        // 가장 가까운 적만 공격 (무리하지 않음)
        const closestEnemy = this.getClosestEnemy();
        if (closestEnemy) {
            const distance = Vec3.distance(unit.node.worldPosition, closestEnemy.node.worldPosition);
            const attackRange = unit.getStats().attackRange;
            
            if (distance <= attackRange) {
                unit.getComponent(UnitAI).setTarget(closestEnemy);
            }
        }
    }
    
    private executeRetreatBehavior(): void {
        const unit = this.getComponent(Unit);
        
        // 아군 타워나 아군 무리 쪽으로 후퇴
        const safePosition = this.findSafePosition();
        if (safePosition) {
            unit.getComponent(UnitAI).setDestination(safePosition);
        }
        
        // 후퇴 중에도 사거리 내 적은 공격
        const nearbyEnemies = this.getNearbyEnemies();
        const attackRange = unit.getStats().attackRange;
        
        for (const enemy of nearbyEnemies) {
            const distance = Vec3.distance(unit.node.worldPosition, enemy.node.worldPosition);
            if (distance <= attackRange) {
                unit.getComponent(UnitAI).setTarget(enemy);
                break;
            }
        }
    }
    
    private executeSupportBehavior(): void {
        const unit = this.getComponent(Unit);
        
        // 가장 도움이 필요한 아군 찾기
        const alliedUnits = this.getNearbyAllies();
        let mostNeedyAlly: Unit | null = null;
        let lowestHealthPercent = 1.0;
        
        for (const ally of alliedUnits) {
            const healthPercent = ally.getCurrentHealth() / ally.getMaxHealth();
            if (healthPercent < lowestHealthPercent) {
                mostNeedyAlly = ally;
                lowestHealthPercent = healthPercent;
            }
        }
        
        // 도움이 필요한 아군 근처로 이동
        if (mostNeedyAlly) {
            const distance = Vec3.distance(unit.node.worldPosition, mostNeedyAlly.node.worldPosition);
            if (distance > 2.0) {
                unit.getComponent(UnitAI).setDestination(mostNeedyAlly.node.worldPosition);
            }
        }
        
        // 서포트 스킬 사용 (힐, 버프 등)
        this.useSupportAbilities();
    }
    
    private getNearbyEnemies(): Unit[] {
        const unit = this.getComponent(Unit);
        return BattleManager.instance.getEnemyUnitsInRadius(
            unit.ownerId,
            unit.node.worldPosition,
            5.0
        );
    }
    
    private getNearbyAllies(): Unit[] {
        const unit = this.getComponent(Unit);
        return BattleManager.instance.getAlliedUnitsInRadius(
            unit.ownerId,
            unit.node.worldPosition,
            5.0
        );
    }
    
    private findSafePosition(): Vec3 | null {
        const unit = this.getComponent(Unit);
        
        // 아군 킹 타워 방향으로 후퇴
        const allyKingTower = BattleManager.instance.getAllyKingTower(unit.ownerId);
        if (allyKingTower) {
            const direction = Vec3.subtract(new Vec3(), 
                allyKingTower.node.worldPosition, 
                unit.node.worldPosition
            );
            direction.normalize();
            
            return Vec3.add(new Vec3(), 
                unit.node.worldPosition, 
                Vec3.multiplyScalar(new Vec3(), direction, 3.0)
            );
        }
        
        return null;
    }
}
```

이 유닛 시스템 설계는 클래시 로얄의 복잡하고 다양한 유닛 메커니즘을 기반으로 하면서도, 고급 AI 시스템과 현대적인 게임 개발 기법을 통합한 종합적인 시스템입니다.