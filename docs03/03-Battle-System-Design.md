# Battle System Design
Royal Clash - 전투 시스템 설계

## 1. 전투 시스템 개요

### 1.1 전투 플로우
```
매치 시작 → 준비 단계 (10초) → 일반 전투 (3분) → 
더블 엘릭서 (1분) → 오버타임 (최대 1분) → 결과 처리
```

### 1.2 승패 조건
1. **킹 타워 파괴**: 즉시 승리 (3 크라운)
2. **더 많은 타워 파괴**: 1~2 크라운 승리
3. **더 많은 데미지**: 타워 수 동일 시 데미지 비교
4. **무승부**: 동일한 타워 + 동일한 데미지

### 1.3 경기 시간 및 단계
- **준비 단계**: 10초 (덱 확인, 전략 수립)
- **일반 전투**: 3분 (엘릭서 1초당 1.4 충전)
- **더블 엘릭서**: 1분 (엘릭서 2.8/초 충전)
- **오버타임**: 최대 1분 (첫 타워 파괴 시 종료)

## 2. 전장 설계

### 2.1 맵 구조 및 레이아웃
```
┌─────────────────────────────────────┐
│        Player 2 Territory           │
│  ┌─────┐    King    ┌─────┐        │
│  │Arena│   Tower    │Arena│        │
│  │Tower│            │Tower│        │
│  └─────┘            └─────┘        │
│                                     │
│ ════════ Bridge ════════════════════ │  <- River
│                                     │
│  ┌─────┐            ┌─────┐        │
│  │Arena│   King     │Arena│        │
│  │Tower│   Tower    │Tower│        │
│  └─────┘            └─────┘        │
│        Player 1 Territory           │
└─────────────────────────────────────┘

Map Dimensions:
- Width: 18 tiles
- Height: 32 tiles  
- Tile Size: 1 unit
- Player Territory: 16 tiles height each
```

### 2.2 타워 시스템
```typescript
// src/battle/TowerSystem.ts
export enum TowerType {
    KING_TOWER = 'king_tower',
    ARENA_TOWER = 'arena_tower'
}

export interface TowerData {
    id: string;
    type: TowerType;
    ownerId: string;
    position: Vec3;
    health: number;
    maxHealth: number;
    attackDamage: number;
    attackRange: number;
    attackSpeed: number; // attacks per second
    lastAttackTime: number;
    target: string | null;
    isDestroyed: boolean;
}

export class Tower extends Component {
    @property(TowerType)
    public towerType: TowerType = TowerType.ARENA_TOWER;
    
    @property
    public maxHealth: number = 2534; // Arena Tower
    
    @property 
    public attackDamage: number = 109;
    
    @property
    public attackRange: number = 7.5;
    
    @property
    public attackSpeed: number = 0.7; // attacks per second
    
    private currentHealth: number;
    private target: Unit | null = null;
    private lastAttackTime: number = 0;
    
    protected onLoad(): void {
        this.currentHealth = this.maxHealth;
        this.initializeTowerStats();
    }
    
    private initializeTowerStats(): void {
        if (this.towerType === TowerType.KING_TOWER) {
            this.maxHealth = 4824;
            this.attackDamage = 109;
            this.attackRange = 7.5;
            this.attackSpeed = 1.0;
        }
    }
    
    public update(deltaTime: number): void {
        if (this.isDestroyed) return;
        
        this.findTarget();
        this.attackTarget(deltaTime);
    }
    
    private findTarget(): void {
        const enemyUnits = BattleManager.instance.getEnemyUnits(this.getOwnerId());
        let closestUnit: Unit | null = null;
        let closestDistance = this.attackRange;
        
        for (const unit of enemyUnits) {
            const distance = Vec3.distance(this.node.worldPosition, unit.node.worldPosition);
            if (distance <= this.attackRange && distance < closestDistance) {
                closestUnit = unit;
                closestDistance = distance;
            }
        }
        
        this.target = closestUnit;
    }
    
    private attackTarget(deltaTime: number): void {
        if (!this.target) return;
        
        const currentTime = Date.now();
        const attackCooldown = 1000 / this.attackSpeed;
        
        if (currentTime - this.lastAttackTime >= attackCooldown) {
            this.performAttack();
            this.lastAttackTime = currentTime;
        }
    }
    
    private performAttack(): void {
        if (!this.target) return;
        
        // 투사체 생성
        const projectile = BattleManager.instance.createProjectile({
            startPosition: this.node.worldPosition,
            targetPosition: this.target.node.worldPosition,
            damage: this.attackDamage,
            speed: 15.0,
            ownerId: this.getOwnerId()
        });
        
        // 사운드 재생
        AudioManager.instance.playSFX('tower_attack');
    }
    
    public takeDamage(damage: number, attackerId: string): void {
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        
        // 데미지 표시
        this.showDamageNumber(damage);
        
        if (this.currentHealth <= 0) {
            this.destroyTower();
        }
        
        // 킹 타워 활성화 확인
        this.checkKingTowerActivation();
    }
    
    private destroyTower(): void {
        this.isDestroyed = true;
        
        // 파괴 이펙트
        EffectManager.instance.playEffect('tower_destruction', this.node.worldPosition);
        
        // 승점 지급
        BattleManager.instance.awardTowerDestruction(this.getEnemyId(), this.towerType);
        
        // 타워 비활성화
        this.node.active = false;
    }
}
```

### 2.3 경로 및 이동
```typescript
// src/battle/PathfindingSystem.ts
export class PathfindingSystem {
    private grid: number[][] = [];
    private width: number = 18;
    private height: number = 32;
    
    constructor() {
        this.initializeGrid();
    }
    
    private initializeGrid(): void {
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(0));
        
        // 강 영역 설정 (units can cross)
        for (let x = 0; x < this.width; x++) {
            this.grid[15][x] = 0; // Bridge line
            this.grid[16][x] = 0;
        }
    }
    
    public findPath(start: Vec2, end: Vec2): Vec2[] {
        // A* 알고리즘 구현
        const openSet: PathNode[] = [];
        const closedSet = new Set<string>();
        const startNode = new PathNode(start, 0, this.heuristic(start, end), null);
        
        openSet.push(startNode);
        
        while (openSet.length > 0) {
            // F 비용이 가장 낮은 노드 선택
            openSet.sort((a, b) => a.fCost - b.fCost);
            const currentNode = openSet.shift()!;
            
            if (this.isAtTarget(currentNode.position, end)) {
                return this.reconstructPath(currentNode);
            }
            
            closedSet.add(this.positionToKey(currentNode.position));
            
            // 인접 노드들 검사
            const neighbors = this.getNeighbors(currentNode.position);
            for (const neighborPos of neighbors) {
                const neighborKey = this.positionToKey(neighborPos);
                
                if (closedSet.has(neighborKey)) continue;
                if (!this.isWalkable(neighborPos)) continue;
                
                const gCost = currentNode.gCost + this.getMovementCost(currentNode.position, neighborPos);
                const hCost = this.heuristic(neighborPos, end);
                const neighborNode = new PathNode(neighborPos, gCost, hCost, currentNode);
                
                // 더 나은 경로인지 확인
                const existingNode = openSet.find(node => 
                    this.positionToKey(node.position) === neighborKey
                );
                
                if (!existingNode || gCost < existingNode.gCost) {
                    if (existingNode) {
                        openSet.splice(openSet.indexOf(existingNode), 1);
                    }
                    openSet.push(neighborNode);
                }
            }
        }
        
        return []; // 경로를 찾을 수 없음
    }
    
    private heuristic(a: Vec2, b: Vec2): number {
        // 맨하탄 거리 사용
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    private getNeighbors(pos: Vec2): Vec2[] {
        const neighbors: Vec2[] = [];
        const directions = [
            { x: 0, y: 1 },   // 위
            { x: 1, y: 0 },   // 오른쪽
            { x: 0, y: -1 },  // 아래
            { x: -1, y: 0 },  // 왼쪽
            { x: 1, y: 1 },   // 대각선
            { x: -1, y: 1 },
            { x: 1, y: -1 },
            { x: -1, y: -1 }
        ];
        
        for (const dir of directions) {
            const newPos = new Vec2(pos.x + dir.x, pos.y + dir.y);
            if (this.isInBounds(newPos)) {
                neighbors.push(newPos);
            }
        }
        
        return neighbors;
    }
    
    private isWalkable(pos: Vec2): boolean {
        if (!this.isInBounds(pos)) return false;
        return this.grid[pos.y][pos.x] === 0; // 0 = walkable
    }
    
    private isInBounds(pos: Vec2): boolean {
        return pos.x >= 0 && pos.x < this.width && 
               pos.y >= 0 && pos.y < this.height;
    }
}

class PathNode {
    public fCost: number;
    
    constructor(
        public position: Vec2,
        public gCost: number,
        public hCost: number,
        public parent: PathNode | null
    ) {
        this.fCost = gCost + hCost;
    }
}
```

### 2.4 특수 지형
- **강 (River)**: 중앙 분리선, 다리를 통해 건널 수 있음
- **배치 구역**: 플레이어별 유닛 배치 가능 영역
- **타워 사거리**: 타워 공격 범위 시각화
- **킹 타워 구역**: 킹 타워 주변 특별 방어 구역

## 3. 엘릭서(마나) 시스템

### 3.1 엘릭서 생성 및 소모
```typescript
// src/battle/ElixirSystem.ts
export class ElixirSystem {
    private currentElixir: number = 5; // 시작 엘릭서
    private maxElixir: number = 10;
    private elixirRegenRate: number = 1.4; // per second
    private lastRegenTime: number = 0;
    private isDoubleElixirTime: boolean = false;
    
    public update(deltaTime: number): void {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - this.lastRegenTime) / 1000;
        
        if (elapsedSeconds >= (1 / this.getEffectiveRegenRate())) {
            this.regenerateElixir();
            this.lastRegenTime = currentTime;
        }
    }
    
    private getEffectiveRegenRate(): number {
        return this.isDoubleElixirTime ? this.elixirRegenRate * 2 : this.elixirRegenRate;
    }
    
    private regenerateElixir(): void {
        if (this.currentElixir < this.maxElixir) {
            this.currentElixir = Math.min(this.maxElixir, this.currentElixir + 1);
            this.notifyElixirChange();
        }
    }
    
    public canAfford(cost: number): boolean {
        return this.currentElixir >= cost;
    }
    
    public spendElixir(cost: number): boolean {
        if (!this.canAfford(cost)) {
            return false;
        }
        
        this.currentElixir -= cost;
        this.notifyElixirChange();
        return true;
    }
    
    public setDoubleElixirTime(enabled: boolean): void {
        this.isDoubleElixirTime = enabled;
        
        if (enabled) {
            // 더블 엘릭서 시작 시 즉시 1 엘릭서 추가
            this.currentElixir = Math.min(this.maxElixir, this.currentElixir + 1);
            this.notifyElixirChange();
        }
    }
    
    private notifyElixirChange(): void {
        EventBus.emit('elixir:changed', {
            current: this.currentElixir,
            max: this.maxElixir,
            regenRate: this.getEffectiveRegenRate()
        });
    }
}
```

### 3.2 최대 용량 및 관리
- **시작 엘릭서**: 5 (게임 시작 시)
- **최대 용량**: 10
- **충전 속도**: 1.4/초 (일반), 2.8/초 (더블 엘릭서)
- **오버차지**: 불가 (최대 10 고정)

### 3.3 오버타임 메커니즘
```typescript
// src/battle/OvertimeManager.ts
export class OvertimeManager {
    private isOvertimeActive: boolean = false;
    private overtimeStartTime: number = 0;
    private overtimeDuration: number = 60000; // 1분
    
    public startOvertime(): void {
        this.isOvertimeActive = true;
        this.overtimeStartTime = Date.now();
        
        // 더블 엘릭서 활성화
        BattleManager.instance.setDoubleElixirTime(true);
        
        // UI 업데이트
        UIManager.instance.showOvertimeNotification();
        
        console.log('Overtime started!');
    }
    
    public update(): void {
        if (!this.isOvertimeActive) return;
        
        const elapsed = Date.now() - this.overtimeStartTime;
        const remaining = this.overtimeDuration - elapsed;
        
        if (remaining <= 0) {
            this.endOvertimeByTime();
        }
        
        // 남은 시간 UI 업데이트
        UIManager.instance.updateOvertimeTimer(Math.max(0, remaining / 1000));
    }
    
    public endOvertimeByTowerDestruction(winnerId: string): void {
        this.isOvertimeActive = false;
        BattleManager.instance.endMatch(winnerId, 'tower_destruction');
    }
    
    private endOvertimeByTime(): void {
        this.isOvertimeActive = false;
        BattleManager.instance.endMatch(null, 'time_limit'); // 무승부
    }
}
```

## 4. 전투 메커니즘

### 4.1 유닛 소환
```typescript
// src/battle/UnitDeployment.ts
export class UnitDeployment {
    public static deployUnit(playerId: string, cardId: string, position: Vec3): boolean {
        const player = BattleManager.instance.getPlayer(playerId);
        const cardData = DataManager.instance.getCardData(cardId);
        
        // 배치 유효성 검사
        if (!this.validateDeployment(playerId, cardId, position)) {
            return false;
        }
        
        // 엘릭서 소모
        if (!player.elixirSystem.spendElixir(cardData.elixirCost)) {
            return false;
        }
        
        // 유닛 생성
        const unit = this.createUnit(cardData, position, playerId);
        BattleManager.instance.addUnit(unit);
        
        // 배치 이펙트 및 사운드
        EffectManager.instance.playEffect('unit_deploy', position);
        AudioManager.instance.playSFX(`deploy_${cardData.type}`);
        
        // 네트워크 동기화
        NetworkManager.instance.sendBattleAction({
            type: 'unit_deployed',
            playerId,
            cardId,
            position,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    private static validateDeployment(playerId: string, cardId: string, position: Vec3): boolean {
        // 배치 영역 확인
        if (!this.isInDeploymentZone(playerId, position)) {
            return false;
        }
        
        // 건물 중복 배치 확인
        const cardData = DataManager.instance.getCardData(cardId);
        if (cardData.type === 'building') {
            if (this.isBuildingAlreadyDeployed(playerId, cardId)) {
                return false;
            }
        }
        
        // 배치 불가 지역 확인 (다른 유닛/건물과 겹침)
        if (this.isPositionBlocked(position)) {
            return false;
        }
        
        return true;
    }
    
    private static isInDeploymentZone(playerId: string, position: Vec3): boolean {
        const battlefieldHeight = 32;
        const playerSide = BattleManager.instance.getPlayerSide(playerId);
        
        if (playerSide === 'bottom') {
            return position.z <= battlefieldHeight / 2;
        } else {
            return position.z >= battlefieldHeight / 2;
        }
    }
}
```

### 4.2 타겟팅 시스템
```typescript
// src/battle/TargetingSystem.ts
export enum TargetPriority {
    GROUND_ONLY = 'ground_only',
    AIR_ONLY = 'air_only',
    GROUND_AND_AIR = 'ground_and_air',
    BUILDINGS_ONLY = 'buildings_only'
}

export class TargetingSystem {
    public static findTarget(unit: Unit): Unit | null {
        const enemies = BattleManager.instance.getEnemyUnits(unit.ownerId);
        const validTargets = enemies.filter(enemy => this.canTarget(unit, enemy));
        
        if (validTargets.length === 0) return null;
        
        // 타겟팅 우선순위 적용
        return this.selectBestTarget(unit, validTargets);
    }
    
    private static canTarget(attacker: Unit, target: Unit): boolean {
        const attackerData = attacker.getCardData();
        const targetData = target.getCardData();
        
        // 사거리 확인
        const distance = Vec3.distance(attacker.node.worldPosition, target.node.worldPosition);
        if (distance > attackerData.attackRange) {
            return false;
        }
        
        // 타겟 타입 확인
        switch (attackerData.targetPriority) {
            case TargetPriority.GROUND_ONLY:
                return targetData.movement === 'ground';
                
            case TargetPriority.AIR_ONLY:
                return targetData.movement === 'air';
                
            case TargetPriority.BUILDINGS_ONLY:
                return targetData.type === 'building';
                
            case TargetPriority.GROUND_AND_AIR:
                return targetData.movement === 'ground' || targetData.movement === 'air';
                
            default:
                return true;
        }
    }
    
    private static selectBestTarget(attacker: Unit, targets: Unit[]): Unit {
        const attackerData = attacker.getCardData();
        
        // 특별한 타겟팅 로직
        if (attackerData.targetingBehavior === 'closest') {
            return this.findClosestTarget(attacker, targets);
        }
        
        if (attackerData.targetingBehavior === 'lowest_health') {
            return this.findLowestHealthTarget(targets);
        }
        
        if (attackerData.targetingBehavior === 'highest_damage') {
            return this.findHighestDamageTarget(targets);
        }
        
        // 기본: 가장 가까운 타겟
        return this.findClosestTarget(attacker, targets);
    }
    
    private static findClosestTarget(attacker: Unit, targets: Unit[]): Unit {
        let closestTarget = targets[0];
        let closestDistance = Vec3.distance(
            attacker.node.worldPosition, 
            closestTarget.node.worldPosition
        );
        
        for (let i = 1; i < targets.length; i++) {
            const distance = Vec3.distance(
                attacker.node.worldPosition, 
                targets[i].node.worldPosition
            );
            
            if (distance < closestDistance) {
                closestTarget = targets[i];
                closestDistance = distance;
            }
        }
        
        return closestTarget;
    }
}
```

### 4.3 데미지 계산
```typescript
// src/battle/DamageSystem.ts
export class DamageSystem {
    public static calculateDamage(attacker: Unit, target: Unit): number {
        const attackerData = attacker.getCardData();
        const targetData = target.getCardData();
        
        let baseDamage = attackerData.damage;
        
        // 레벨 보정
        const levelMultiplier = this.getLevelMultiplier(attacker.level);
        baseDamage *= levelMultiplier;
        
        // 타입 상성 계산
        const typeMultiplier = this.getTypeMultiplier(attackerData.damageType, targetData.armorType);
        baseDamage *= typeMultiplier;
        
        // 크리티컬 히트 확인
        if (this.isCriticalHit(attackerData.criticalChance)) {
            baseDamage *= attackerData.criticalMultiplier || 2.0;
        }
        
        // 랜덤 편차 (±5%)
        const randomFactor = 0.95 + (Math.random() * 0.1);
        baseDamage *= randomFactor;
        
        return Math.floor(baseDamage);
    }
    
    private static getLevelMultiplier(level: number): number {
        // 레벨당 10% 증가
        return 1.0 + (level - 1) * 0.1;
    }
    
    private static getTypeMultiplier(damageType: string, armorType: string): number {
        const typeChart: { [key: string]: { [key: string]: number } } = {
            'physical': {
                'light': 1.2,
                'heavy': 0.8,
                'magical': 1.0
            },
            'magical': {
                'light': 1.0,
                'heavy': 1.2,
                'magical': 0.8
            },
            'siege': {
                'light': 0.8,
                'heavy': 1.0,
                'building': 2.0
            }
        };
        
        return typeChart[damageType]?.[armorType] || 1.0;
    }
    
    private static isCriticalHit(criticalChance: number): boolean {
        return Math.random() < (criticalChance || 0);
    }
    
    public static applyDamage(target: Unit, damage: number, attacker: Unit): void {
        target.takeDamage(damage);
        
        // 데미지 표시
        this.showDamageNumber(target.node.worldPosition, damage);
        
        // 공격 이펙트
        EffectManager.instance.playEffect('hit_effect', target.node.worldPosition);
        
        // 사운드 효과
        AudioManager.instance.playSFX('unit_hit');
        
        // 반격 확인 (일부 유닛의 특수 능력)
        this.checkCounterAttack(target, attacker);
    }
}
```

### 4.4 상성 시스템
```typescript
// src/data/UnitInteractions.ts
export const UNIT_INTERACTIONS = {
    // 기본 상성
    'knight': {
        strongAgainst: ['goblin', 'archer', 'skeleton'],
        weakAgainst: ['wizard', 'dragon', 'pekka'],
        counters: ['swarm_units']
    },
    
    'archer': {
        strongAgainst: ['air_units', 'wizard'],
        weakAgainst: ['knight', 'tank_units'],
        counters: ['flying_units']
    },
    
    'wizard': {
        strongAgainst: ['swarm_units', 'knight'],
        weakAgainst: ['archer', 'assassin'],
        counters: ['group_units']
    },
    
    'dragon': {
        strongAgainst: ['ground_units', 'buildings'],
        weakAgainst: ['air_defense', 'archer'],
        counters: ['ground_armies']
    }
};

export class UnitInteractionSystem {
    public static getEffectivenessMultiplier(attackerType: string, targetType: string): number {
        const interaction = UNIT_INTERACTIONS[attackerType];
        if (!interaction) return 1.0;
        
        if (interaction.strongAgainst.includes(targetType)) {
            return 1.5; // 50% 더 효과적
        }
        
        if (interaction.weakAgainst.includes(targetType)) {
            return 0.67; // 33% 덜 효과적
        }
        
        return 1.0; // 보통
    }
    
    public static getCounterRecommendations(enemyDeck: string[]): string[] {
        const recommendations: string[] = [];
        
        for (const enemyCardId of enemyDeck) {
            const counters = this.getCountersFor(enemyCardId);
            recommendations.push(...counters);
        }
        
        // 중복 제거 및 빈도순 정렬
        const counterFrequency = new Map<string, number>();
        for (const counter of recommendations) {
            counterFrequency.set(counter, (counterFrequency.get(counter) || 0) + 1);
        }
        
        return Array.from(counterFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);
    }
    
    private static getCountersFor(cardId: string): string[] {
        // 각 카드에 대한 카운터 카드들 반환
        const counters: { [key: string]: string[] } = {
            'knight': ['wizard', 'archer_horde', 'skeleton_army'],
            'archer': ['knight', 'fireball', 'arrows'],
            'dragon': ['archer', 'air_defense', 'lightning'],
            'swarm_units': ['wizard', 'fireball', 'arrows']
        };
        
        return counters[cardId] || [];
    }
}
```

## 5. 스펠 카드 시스템

### 5.1 즉시 효과 스펠
```typescript
// src/battle/SpellSystem.ts
export abstract class Spell {
    protected cardData: CardData;
    protected caster: string;
    
    constructor(cardData: CardData, casterId: string) {
        this.cardData = cardData;
        this.caster = casterId;
    }
    
    public abstract cast(targetPosition: Vec3): void;
    protected abstract applyEffect(targets: Unit[]): void;
}

export class FireballSpell extends Spell {
    public cast(targetPosition: Vec3): void {
        // 폭발 이펙트
        EffectManager.instance.playEffect('fireball_explosion', targetPosition);
        AudioManager.instance.playSFX('fireball_cast');
        
        // 범위 내 타겟 찾기
        const targets = this.findTargetsInRadius(targetPosition, this.cardData.effectRadius);
        this.applyEffect(targets);
    }
    
    protected applyEffect(targets: Unit[]): void {
        for (const target of targets) {
            if (target.ownerId === this.caster) continue; // 아군 무시
            
            const damage = this.cardData.damage;
            DamageSystem.applyDamage(target, damage, null);
        }
    }
    
    private findTargetsInRadius(center: Vec3, radius: number): Unit[] {
        const allUnits = BattleManager.instance.getAllUnits();
        return allUnits.filter(unit => {
            const distance = Vec3.distance(unit.node.worldPosition, center);
            return distance <= radius;
        });
    }
}

export class ArrowsSpell extends Spell {
    public cast(targetPosition: Vec3): void {
        // 화살 이펙트
        EffectManager.instance.playEffect('arrows_rain', targetPosition);
        AudioManager.instance.playSFX('arrows_cast');
        
        const targets = this.findTargetsInRadius(targetPosition, this.cardData.effectRadius);
        this.applyEffect(targets);
    }
    
    protected applyEffect(targets: Unit[]): void {
        for (const target of targets) {
            if (target.ownerId === this.caster) continue;
            
            // 소형 유닛에게 더 효과적
            let damage = this.cardData.damage;
            if (target.getCardData().hitpoints <= 200) {
                damage *= 2; // 소형 유닛 즉사
            }
            
            DamageSystem.applyDamage(target, damage, null);
        }
    }
}
```

### 5.2 지속 효과 스펠
```typescript
// src/battle/PersistentSpells.ts
export class RageSpell extends Spell {
    private duration: number = 8000; // 8초
    private speedMultiplier: number = 1.4; // 40% 속도 증가
    private attackSpeedMultiplier: number = 1.4;
    
    public cast(targetPosition: Vec3): void {
        EffectManager.instance.playEffect('rage_aura', targetPosition);
        AudioManager.instance.playSFX('rage_cast');
        
        const targets = this.findTargetsInRadius(targetPosition, this.cardData.effectRadius);
        this.applyEffect(targets);
    }
    
    protected applyEffect(targets: Unit[]): void {
        for (const target of targets) {
            if (target.ownerId !== this.caster) continue; // 아군만 적용
            
            this.applyRageBuff(target);
        }
    }
    
    private applyRageBuff(unit: Unit): void {
        const buff = new RageBuff(this.duration, this.speedMultiplier, this.attackSpeedMultiplier);
        unit.addBuff(buff);
        
        // 시각적 효과
        EffectManager.instance.attachEffect('rage_aura', unit.node);
    }
}

export class FreezeSpell extends Spell {
    private duration: number = 5000; // 5초
    
    public cast(targetPosition: Vec3): void {
        EffectManager.instance.playEffect('freeze_blast', targetPosition);
        AudioManager.instance.playSFX('freeze_cast');
        
        const targets = this.findTargetsInRadius(targetPosition, this.cardData.effectRadius);
        this.applyEffect(targets);
    }
    
    protected applyEffect(targets: Unit[]): void {
        for (const target of targets) {
            if (target.ownerId === this.caster) continue; // 적군만 적용
            
            this.applyFreezeBuff(target);
        }
    }
    
    private applyFreezeBuff(unit: Unit): void {
        const debuff = new FreezeBuff(this.duration);
        unit.addBuff(debuff);
        
        // 얼음 효과
        EffectManager.instance.attachEffect('frozen_effect', unit.node);
    }
}
```

### 5.3 범위 및 타겟팅
- **원형 범위**: 파이어볼, 화살, 독 등
- **직선 범위**: 라이트닝, 로켓 등
- **전체 범위**: 미러, 클론 등
- **단일 타겟**: 변이, 치유 등

## 6. 특수 게임 메커니즘

### 6.1 킹 타워 활성화
```typescript
// src/battle/KingTowerActivation.ts
export class KingTowerActivation {
    public static checkActivation(playerId: string, damageSource: Vec3): void {
        const player = BattleManager.instance.getPlayer(playerId);
        if (player.isKingTowerActivated) return;
        
        const kingTower = player.getKingTower();
        const activationRadius = 6.0; // 킹 타워 주변 6타일
        
        const distance = Vec3.distance(kingTower.node.worldPosition, damageSource);
        
        if (distance <= activationRadius) {
            this.activateKingTower(playerId);
        }
    }
    
    private static activateKingTower(playerId: string): void {
        const player = BattleManager.instance.getPlayer(playerId);
        player.isKingTowerActivated = true;
        
        // 킹 타워 공격 시작
        const kingTower = player.getKingTower();
        kingTower.setActive(true);
        
        // 활성화 이펙트
        EffectManager.instance.playEffect('king_tower_activation', kingTower.node.worldPosition);
        AudioManager.instance.playSFX('king_tower_activate');
        
        // UI 알림
        UIManager.instance.showKingTowerActivation(playerId);
        
        console.log(`King Tower activated for player ${playerId}`);
    }
}
```

### 6.2 오버타임 규칙
- **시작 조건**: 정규 시간 종료 후 동점
- **지속 시간**: 최대 1분
- **종료 조건**: 첫 번째 타워 파괴 또는 시간 종료
- **특수 효과**: 더블 엘릭서 시간 지속

### 6.3 동점 처리
```typescript
// src/battle/TiebreakSystem.ts
export class TiebreakSystem {
    public static resolveTie(): { winner: string | null, reason: string } {
        const player1 = BattleManager.instance.getPlayer('player1');
        const player2 = BattleManager.instance.getPlayer('player2');
        
        // 1. 타워 개수 비교
        const p1Towers = this.countRemainingTowers(player1);
        const p2Towers = this.countRemainingTowers(player2);
        
        if (p1Towers > p2Towers) {
            return { winner: 'player1', reason: 'more_towers' };
        } else if (p2Towers > p1Towers) {
            return { winner: 'player2', reason: 'more_towers' };
        }
        
        // 2. 타워 체력 비교
        const p1TowerHealth = this.getTotalTowerHealth(player1);
        const p2TowerHealth = this.getTotalTowerHealth(player2);
        
        if (p1TowerHealth > p2TowerHealth) {
            return { winner: 'player1', reason: 'tower_health' };
        } else if (p2TowerHealth > p1TowerHealth) {
            return { winner: 'player2', reason: 'tower_health' };
        }
        
        // 3. 킹 타워 체력 비교
        const p1KingHealth = player1.getKingTower().getCurrentHealth();
        const p2KingHealth = player2.getKingTower().getCurrentHealth();
        
        if (p1KingHealth > p2KingHealth) {
            return { winner: 'player1', reason: 'king_health' };
        } else if (p2KingHealth > p1KingHealth) {
            return { winner: 'player2', reason: 'king_health' };
        }
        
        // 4. 완전 무승부
        return { winner: null, reason: 'perfect_tie' };
    }
    
    private static countRemainingTowers(player: Player): number {
        let count = 0;
        
        if (!player.getKingTower().isDestroyed) count++;
        if (!player.getLeftArenaTower().isDestroyed) count++;
        if (!player.getRightArenaTower().isDestroyed) count++;
        
        return count;
    }
    
    private static getTotalTowerHealth(player: Player): number {
        let totalHealth = 0;
        
        const towers = [
            player.getKingTower(),
            player.getLeftArenaTower(),
            player.getRightArenaTower()
        ];
        
        for (const tower of towers) {
            if (!tower.isDestroyed) {
                totalHealth += tower.getCurrentHealth();
            }
        }
        
        return totalHealth;
    }
}
```

## 7. 밸런스 시스템

### 7.1 밸런스 철학
- **카운터 플레이**: 모든 전략에는 대응책이 존재
- **엘릭서 효율성**: 같은 엘릭서로 더 효과적인 대응 가능
- **다양성 촉진**: 메타의 다양성을 유지
- **접근성**: 신규 플레이어도 이해하기 쉬운 밸런스

### 7.2 조정 메커니즘
```typescript
// src/balance/BalanceManager.ts
export class BalanceManager {
    private balanceData: Map<string, BalanceModifier> = new Map();
    
    public applyBalanceModifier(cardId: string, modifier: BalanceModifier): void {
        this.balanceData.set(cardId, modifier);
        
        // 모든 해당 카드 인스턴스에 적용
        const activeUnits = BattleManager.instance.getUnitsByCardId(cardId);
        for (const unit of activeUnits) {
            this.applyModifierToUnit(unit, modifier);
        }
    }
    
    private applyModifierToUnit(unit: Unit, modifier: BalanceModifier): void {
        const stats = unit.getStats();
        
        if (modifier.healthMultiplier) {
            stats.maxHealth *= modifier.healthMultiplier;
            stats.currentHealth = Math.min(stats.currentHealth, stats.maxHealth);
        }
        
        if (modifier.damageMultiplier) {
            stats.damage *= modifier.damageMultiplier;
        }
        
        if (modifier.speedMultiplier) {
            stats.movementSpeed *= modifier.speedMultiplier;
        }
        
        if (modifier.attackSpeedMultiplier) {
            stats.attackSpeed *= modifier.attackSpeedMultiplier;
        }
        
        unit.updateStats(stats);
    }
    
    public getWinRateData(cardId: string, timeframe: number): WinRateData {
        // 분석 시스템에서 승률 데이터 조회
        return AnalyticsManager.instance.getCardWinRate(cardId, timeframe);
    }
    
    public generateBalanceRecommendations(): BalanceRecommendation[] {
        const recommendations: BalanceRecommendation[] = [];
        const allCards = DataManager.instance.getAllCards();
        
        for (const card of allCards) {
            const winRate = this.getWinRateData(card.id, 7); // 최근 7일
            const usageRate = this.getUsageRate(card.id, 7);
            
            if (winRate.winRate > 0.65 && usageRate > 0.3) {
                // 너무 강함 - 너프 필요
                recommendations.push({
                    cardId: card.id,
                    type: 'nerf',
                    severity: this.calculateSeverity(winRate.winRate, usageRate),
                    suggestedChanges: this.generateNerfSuggestions(card)
                });
            } else if (winRate.winRate < 0.35 && usageRate < 0.05) {
                // 너무 약함 - 버프 필요
                recommendations.push({
                    cardId: card.id,
                    type: 'buff',
                    severity: this.calculateSeverity(1 - winRate.winRate, 1 - usageRate),
                    suggestedChanges: this.generateBuffSuggestions(card)
                });
            }
        }
        
        return recommendations;
    }
}

interface BalanceModifier {
    healthMultiplier?: number;
    damageMultiplier?: number;
    speedMultiplier?: number;
    attackSpeedMultiplier?: number;
    elixirCostChange?: number;
}

interface BalanceRecommendation {
    cardId: string;
    type: 'buff' | 'nerf';
    severity: 'low' | 'medium' | 'high';
    suggestedChanges: string[];
}
```

### 7.3 AI 기반 밸런스 검증
```typescript
// src/ai/BalanceAI.ts
export class BalanceAI {
    private static readonly CLAUDE_PROMPT_TEMPLATE = `
    게임 밸런스 분석을 수행해주세요.

    게임 정보:
    - 장르: 실시간 전략 PvP (클래시 로얄 스타일)
    - 카드 개수: {cardCount}
    - 분석 기간: {timeframe}일

    카드 데이터:
    {cardData}

    승률 및 사용률 데이터:
    {winRateData}

    분석 요청사항:
    1. 현재 메타에서 과도하게 강한 카드 식별
    2. 사용률이 낮은 카드의 문제점 분석
    3. 카드 간 상성 밸런스 평가
    4. 구체적인 밸런스 조정 제안 (수치 포함)

    응답 형식:
    JSON 형태로 다음 구조를 따라주세요:
    {
      "overperforming_cards": [
        {
          "card_id": "string",
          "reason": "string",
          "suggested_nerfs": [
            {
              "stat": "health|damage|speed|cost",
              "change": "percentage_or_absolute_value",
              "justification": "string"
            }
          ]
        }
      ],
      "underperforming_cards": [...],
      "meta_analysis": "string",
      "priority_changes": [...]
    }
    `;
    
    public static async analyzeBalance(gameData: GameBalanceData): Promise<BalanceAnalysis> {
        const prompt = this.CLAUDE_PROMPT_TEMPLATE
            .replace('{cardCount}', gameData.cardCount.toString())
            .replace('{timeframe}', gameData.timeframe.toString())
            .replace('{cardData}', JSON.stringify(gameData.cardData, null, 2))
            .replace('{winRateData}', JSON.stringify(gameData.winRateData, null, 2));
        
        try {
            const response = await ClaudeAPI.generateResponse(prompt);
            const analysis = JSON.parse(response) as BalanceAnalysis;
            
            // 결과 검증 및 후처리
            return this.validateAndProcessAnalysis(analysis);
        } catch (error) {
            console.error('Balance AI analysis failed:', error);
            return this.getFallbackAnalysis(gameData);
        }
    }
    
    private static validateAndProcessAnalysis(analysis: BalanceAnalysis): BalanceAnalysis {
        // AI 응답 검증 로직
        for (const card of analysis.overperforming_cards) {
            for (const nerf of card.suggested_nerfs) {
                // 너프 정도가 너무 극단적이지 않은지 확인
                if (typeof nerf.change === 'string' && nerf.change.includes('%')) {
                    const percentage = parseInt(nerf.change.replace('%', ''));
                    if (Math.abs(percentage) > 20) {
                        nerf.change = percentage > 0 ? '20%' : '-20%';
                        nerf.justification += ' (조정값이 AI에 의해 20%로 제한됨)';
                    }
                }
            }
        }
        
        return analysis;
    }
}
```

이 전투 시스템 설계는 클래시 로얄의 핵심 메커니즘을 기반으로 하면서도, AI 기반 밸런스 조정과 현대적인 게임 개발 기법을 통합한 종합적인 시스템입니다.