# Deck & Card System Design
Royal Clash - 덱/카드 시스템 설계

## 1. 덱 시스템 개요

### 1.1 덱 구성 규칙
```
덱 구성 요구사항:
├── 카드 개수: 정확히 8장
├── 중복 카드: 불가 (각 카드는 1장씩만)
├── 평균 엘릭서 비용: 1.0 ~ 5.0 권장
├── 밸런스 체크: 자동 검증 시스템
└── 덱 슬롯: 플레이어당 최대 5개 덱 저장 가능
```

### 1.2 카드 개수 제한
- **총 카드 수**: 8장 (고정)
- **레어도별 제한**: 없음 (밸런스는 엘릭서 비용으로 조절)
- **타입별 권장**: 유닛 5-6장, 스펠 2-3장, 건물 0-2장
- **비용 분배**: 저비용(1-2) 2장, 중비용(3-4) 4장, 고비용(5+) 2장 권장

### 1.3 비용 분배 전략
```typescript
// src/deck/DeckAnalyzer.ts
export interface DeckAnalysis {
    averageElixirCost: number;
    costDistribution: { [cost: number]: number };
    typeDistribution: { [type: string]: number };
    balanceScore: number;
    recommendations: string[];
    synergies: Synergy[];
    counters: Counter[];
}

export class DeckAnalyzer {
    public static analyzeDeck(deck: Card[]): DeckAnalysis {
        if (deck.length !== 8) {
            throw new Error('덱은 정확히 8장이어야 합니다.');
        }
        
        const analysis: DeckAnalysis = {
            averageElixirCost: this.calculateAverageElixirCost(deck),
            costDistribution: this.calculateCostDistribution(deck),
            typeDistribution: this.calculateTypeDistribution(deck),
            balanceScore: 0,
            recommendations: [],
            synergies: [],
            counters: []
        };
        
        analysis.balanceScore = this.calculateBalanceScore(analysis);
        analysis.recommendations = this.generateRecommendations(analysis, deck);
        analysis.synergies = this.findSynergies(deck);
        analysis.counters = this.findCounters(deck);
        
        return analysis;
    }
    
    private static calculateAverageElixirCost(deck: Card[]): number {
        const totalCost = deck.reduce((sum, card) => sum + card.elixirCost, 0);
        return Math.round((totalCost / deck.length) * 10) / 10;
    }
    
    private static calculateCostDistribution(deck: Card[]): { [cost: number]: number } {
        const distribution: { [cost: number]: number } = {};
        
        for (const card of deck) {
            distribution[card.elixirCost] = (distribution[card.elixirCost] || 0) + 1;
        }
        
        return distribution;
    }
    
    private static calculateTypeDistribution(deck: Card[]): { [type: string]: number } {
        const distribution: { [type: string]: number } = {};
        
        for (const card of deck) {
            distribution[card.type] = (distribution[card.type] || 0) + 1;
        }
        
        return distribution;
    }
    
    private static calculateBalanceScore(analysis: DeckAnalysis): number {
        let score = 100;
        
        // 평균 엘릭서 비용 검사
        if (analysis.averageElixirCost < 2.5) {
            score -= 20; // 너무 저비용
        } else if (analysis.averageElixirCost > 4.5) {
            score -= 30; // 너무 고비용
        }
        
        // 비용 분배 검사
        const lowCost = (analysis.costDistribution[1] || 0) + (analysis.costDistribution[2] || 0);
        const midCost = (analysis.costDistribution[3] || 0) + (analysis.costDistribution[4] || 0);
        const highCost = (analysis.costDistribution[5] || 0) + (analysis.costDistribution[6] || 0) + 
                         (analysis.costDistribution[7] || 0) + (analysis.costDistribution[8] || 0);
        
        if (lowCost < 1) score -= 15; // 저비용 카드 부족
        if (highCost > 3) score -= 20; // 고비용 카드 과다
        
        // 타입 분배 검사
        const units = analysis.typeDistribution['unit'] || 0;
        const spells = analysis.typeDistribution['spell'] || 0;
        const buildings = analysis.typeDistribution['building'] || 0;
        
        if (units < 4) score -= 15; // 유닛 부족
        if (spells < 1) score -= 10; // 스펠 부족
        if (buildings > 3) score -= 10; // 건물 과다
        
        return Math.max(0, score);
    }
    
    private static generateRecommendations(analysis: DeckAnalysis, deck: Card[]): string[] {
        const recommendations: string[] = [];
        
        if (analysis.averageElixirCost > 4.0) {
            recommendations.push('평균 엘릭서 비용이 높습니다. 저비용 카드를 추가하세요.');
        }
        
        if (analysis.averageElixirCost < 3.0) {
            recommendations.push('평균 엘릭서 비용이 낮습니다. 고비용 카드로 화력을 보강하세요.');
        }
        
        const spellCount = analysis.typeDistribution['spell'] || 0;
        if (spellCount === 0) {
            recommendations.push('스펠 카드가 없습니다. 파이어볼이나 화살을 추가하세요.');
        }
        
        if (!this.hasAntiAir(deck)) {
            recommendations.push('공중 유닛 대응 수단이 부족합니다.');
        }
        
        if (!this.hasTankKiller(deck)) {
            recommendations.push('고체력 유닛 처리 수단이 부족합니다.');
        }
        
        return recommendations;
    }
    
    private static hasAntiAir(deck: Card[]): boolean {
        return deck.some(card => {
            const stats = card.stats;
            return stats && stats.targets && 
                   stats.targets.includes(TargetType.AIR) &&
                   stats.attackRange && stats.attackRange > 3;
        });
    }
    
    private static hasTankKiller(deck: Card[]): boolean {
        return deck.some(card => {
            const stats = card.stats;
            return stats && stats.damage && stats.damage > 200;
        });
    }
}
```

## 2. 카드 시스템

### 2.1 카드 타입 분류
```typescript
// src/data/CardTypes.ts
export enum CardType {
    UNIT = 'unit',
    SPELL = 'spell',
    BUILDING = 'building'
}

export enum CardRarity {
    COMMON = 'common',
    RARE = 'rare', 
    EPIC = 'epic',
    LEGENDARY = 'legendary'
}

export interface CardData {
    // 기본 정보
    id: string;
    name: string;
    type: CardType;
    rarity: CardRarity;
    faction: string;
    
    // 게임플레이
    elixirCost: number;
    arena: number; // 해금 아레나
    
    // 능력치 (유닛/건물인 경우)
    stats?: UnitStats;
    
    // 설명
    description: string;
    flavorText?: string;
    
    // 시각적
    iconPath: string;
    modelPath?: string;
    animationPath?: string;
    
    // 메타데이터
    isEnabled: boolean;
    releaseDate?: string;
    lastBalance?: string;
}
```

### 2.2 비용 시스템
```typescript
// src/game/ElixirCostSystem.ts
export class ElixirCostSystem {
    private static readonly COST_MULTIPLIERS = {
        [CardRarity.COMMON]: 1.0,
        [CardRarity.RARE]: 1.1,
        [CardRarity.EPIC]: 1.2,
        [CardRarity.LEGENDARY]: 1.3
    };
    
    public static calculateBaseCost(stats: UnitStats, rarity: CardRarity): number {
        let baseCost = 0;
        
        // 체력 기반 비용
        baseCost += (stats.hitpoints || 0) / 400;
        
        // 공격력 기반 비용  
        baseCost += (stats.damage || 0) / 80;
        
        // 사거리 보정
        if (stats.attackRange && stats.attackRange > 5) {
            baseCost += 0.5; // 장거리 보정
        }
        
        // 이동속도 보정
        if (stats.movementSpeed && stats.movementSpeed > 1.5) {
            baseCost += 0.3; // 고속 보정
        }
        
        // 특수 능력 보정
        if (stats.abilities && stats.abilities.length > 0) {
            baseCost += stats.abilities.length * 0.4;
        }
        
        // 스플래시 공격 보정
        if ('splashRadius' in stats && stats.splashRadius > 0) {
            baseCost += 0.6;
        }
        
        // 레어도 보정
        baseCost *= this.COST_MULTIPLIERS[rarity];
        
        // 1-10 범위로 제한하고 반올림
        return Math.max(1, Math.min(10, Math.round(baseCost)));
    }
    
    public static validateElixirCost(cardData: CardData): boolean {
        if (!cardData.stats) return true; // 스펠 카드는 별도 검증
        
        const calculatedCost = this.calculateBaseCost(cardData.stats, cardData.rarity);
        const actualCost = cardData.elixirCost;
        
        // ±1 엘릭서 오차 허용
        return Math.abs(calculatedCost - actualCost) <= 1;
    }
}
```

### 2.3 레어도 및 등급
```typescript
// src/data/RaritySystem.ts
export interface RarityProperties {
    color: string;
    dropRate: number; // 카드팩에서의 드롭률
    upgradeMultiplier: number; // 업그레이드 비용 배수
    maxLevel: number;
    powerMultiplier: number; // 레벨당 능력치 증가율
}

export const RARITY_PROPERTIES: { [key in CardRarity]: RarityProperties } = {
    [CardRarity.COMMON]: {
        color: '#71AAD6',
        dropRate: 0.7,
        upgradeMultiplier: 1.0,
        maxLevel: 13,
        powerMultiplier: 0.10 // 레벨당 10% 증가
    },
    [CardRarity.RARE]: {
        color: '#F99D1C',
        dropRate: 0.2,
        upgradeMultiplier: 4.0,
        maxLevel: 11,
        powerMultiplier: 0.11 // 레벨당 11% 증가
    },
    [CardRarity.EPIC]: {
        color: '#D774C0',
        dropRate: 0.08,
        upgradeMultiplier: 20.0,
        maxLevel: 8,
        powerMultiplier: 0.12 // 레벨당 12% 증가
    },
    [CardRarity.LEGENDARY]: {
        color: '#FFF468',
        dropRate: 0.02,
        upgradeMultiplier: 100.0,
        maxLevel: 5,
        powerMultiplier: 0.15 // 레벨당 15% 증가
    }
};

export class RaritySystem {
    public static getCardPowerAtLevel(cardData: CardData, level: number): UnitStats | null {
        if (!cardData.stats) return null;
        
        const rarity = RARITY_PROPERTIES[cardData.rarity];
        const multiplier = 1 + (rarity.powerMultiplier * (level - 1));
        
        const scaledStats: UnitStats = { ...cardData.stats };
        
        // 체력과 공격력만 레벨에 따라 스케일링
        if (scaledStats.hitpoints) {
            scaledStats.hitpoints = Math.floor(scaledStats.hitpoints * multiplier);
        }
        
        if (scaledStats.damage) {
            scaledStats.damage = Math.floor(scaledStats.damage * multiplier);
        }
        
        // DPS 재계산
        if (scaledStats.damage && scaledStats.attackSpeed) {
            scaledStats.damagePerSecond = Math.floor(scaledStats.damage * scaledStats.attackSpeed);
        }
        
        return scaledStats;
    }
    
    public static getUpgradeCost(cardData: CardData, fromLevel: number, toLevel: number): number {
        const rarity = RARITY_PROPERTIES[cardData.rarity];
        const baseUpgrade = UPGRADE_REQUIREMENTS[cardData.rarity][toLevel - 2];
        
        if (!baseUpgrade) return 0;
        
        return baseUpgrade.goldCost;
    }
    
    public static getCardsRequiredForUpgrade(cardData: CardData, toLevel: number): number {
        const baseUpgrade = UPGRADE_REQUIREMENTS[cardData.rarity][toLevel - 2];
        return baseUpgrade ? baseUpgrade.cardsRequired : 0;
    }
}
```

### 2.4 카드 효과 시스템
```typescript
// src/cards/CardEffects.ts
export enum EffectType {
    PASSIVE = 'passive',        // 지속적 효과
    ON_DEPLOY = 'on_deploy',   // 배치 시 발동
    ON_DEATH = 'on_death',     // 죽을 때 발동
    ON_DAMAGE = 'on_damage',   // 피해 입을 때 발동
    AURA = 'aura',             // 주변 유닛에게 영향
    TRIGGERED = 'triggered'     // 특정 조건에서 발동
}

export interface CardEffect {
    id: string;
    type: EffectType;
    description: string;
    
    // 발동 조건
    conditions?: EffectCondition[];
    
    // 효과 내용
    effects: EffectAction[];
    
    // 쿨다운 및 지속시간
    cooldown?: number;
    duration?: number;
    
    // 범위 (오라 효과의 경우)
    radius?: number;
    
    // 대상 필터
    targetFilter?: TargetFilter;
}

export interface EffectCondition {
    type: 'health_below' | 'enemy_nearby' | 'ally_count' | 'time_elapsed';
    value: number;
    comparison?: 'less_than' | 'greater_than' | 'equal_to';
}

export interface EffectAction {
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'spawn' | 'teleport';
    value?: number;
    duration?: number;
    target?: 'self' | 'nearby_allies' | 'nearby_enemies' | 'all_enemies';
    spawnCardId?: string;
    buffType?: BuffType;
}

export class CardEffectManager {
    private activeEffects: Map<string, ActiveEffect> = new Map();
    
    public applyCardEffect(unit: Unit, effect: CardEffect): void {
        switch (effect.type) {
            case EffectType.PASSIVE:
                this.applyPassiveEffect(unit, effect);
                break;
                
            case EffectType.ON_DEPLOY:
                this.applyOnDeployEffect(unit, effect);
                break;
                
            case EffectType.ON_DEATH:
                this.registerDeathEffect(unit, effect);
                break;
                
            case EffectType.AURA:
                this.applyAuraEffect(unit, effect);
                break;
                
            case EffectType.TRIGGERED:
                this.registerTriggeredEffect(unit, effect);
                break;
        }
    }
    
    private applyOnDeployEffect(unit: Unit, effect: CardEffect): void {
        for (const action of effect.effects) {
            this.executeEffectAction(unit, action);
        }
    }
    
    private applyAuraEffect(unit: Unit, effect: CardEffect): void {
        const activeEffect: ActiveEffect = {
            id: `${unit.id}_${effect.id}`,
            sourceUnit: unit,
            effect: effect,
            startTime: Date.now(),
            lastUpdate: Date.now()
        };
        
        this.activeEffects.set(activeEffect.id, activeEffect);
    }
    
    private executeEffectAction(source: Unit, action: EffectAction): void {
        const targets = this.findTargets(source, action.target);
        
        switch (action.type) {
            case 'damage':
                for (const target of targets) {
                    DamageSystem.applyDamage(target, action.value || 0, source);
                }
                break;
                
            case 'heal':
                for (const target of targets) {
                    target.heal(action.value || 0);
                }
                break;
                
            case 'buff':
                for (const target of targets) {
                    const buff = new Buff(action.buffType!, action.value || 0, action.duration || 0);
                    target.addBuff(buff);
                }
                break;
                
            case 'spawn':
                if (action.spawnCardId) {
                    const spawnPosition = this.calculateSpawnPosition(source);
                    BattleManager.instance.spawnUnit(
                        action.spawnCardId,
                        spawnPosition,
                        source.ownerId,
                        source.level
                    );
                }
                break;
        }
    }
    
    public update(deltaTime: number): void {
        const currentTime = Date.now();
        
        for (const [id, activeEffect] of this.activeEffects.entries()) {
            // 지속시간 확인
            if (activeEffect.effect.duration) {
                const elapsed = currentTime - activeEffect.startTime;
                if (elapsed >= activeEffect.effect.duration) {
                    this.removeEffect(id);
                    continue;
                }
            }
            
            // 오라 효과 업데이트
            if (activeEffect.effect.type === EffectType.AURA) {
                this.updateAuraEffect(activeEffect);
            }
        }
    }
    
    private updateAuraEffect(activeEffect: ActiveEffect): void {
        const sourceUnit = activeEffect.sourceUnit;
        const effect = activeEffect.effect;
        
        if (!sourceUnit.isAlive()) {
            this.removeEffect(activeEffect.id);
            return;
        }
        
        // 범위 내 타겟 find
        const targets = BattleManager.instance.getUnitsInRadius(
            sourceUnit.node.worldPosition,
            effect.radius || 3.0
        );
        
        // 필터링된 타겟에게 효과 적용
        const filteredTargets = this.filterTargets(targets, effect.targetFilter, sourceUnit);
        
        for (const target of filteredTargets) {
            for (const action of effect.effects) {
                this.executeEffectAction(sourceUnit, action);
            }
        }
    }
}

// 카드별 특수 효과 예시
export const CARD_EFFECTS: { [cardId: string]: CardEffect[] } = {
    'rage_barbarian': [{
        id: 'rage_on_low_health',
        type: EffectType.TRIGGERED,
        description: '체력이 35% 이하일 때 공격속도 40% 증가',
        conditions: [{
            type: 'health_below',
            value: 0.35
        }],
        effects: [{
            type: 'buff',
            target: 'self',
            buffType: BuffType.ATTACK_SPEED,
            value: 0.4,
            duration: -1 // 영구
        }]
    }],
    
    'healing_spirit': [{
        id: 'heal_aura',
        type: EffectType.AURA,
        description: '주변 아군의 체력을 초당 50씩 회복',
        radius: 4.0,
        targetFilter: {
            alliance: 'ally',
            types: ['unit']
        },
        effects: [{
            type: 'heal',
            target: 'nearby_allies',
            value: 50
        }]
    }],
    
    'bomb_goblin': [{
        id: 'death_explosion',
        type: EffectType.ON_DEATH,
        description: '죽을 때 주변에 200 데미지',
        effects: [{
            type: 'damage',
            target: 'nearby_enemies',
            value: 200
        }]
    }]
};
```

## 3. 덱 빌딩 시스템

### 3.1 덱 편집 인터페이스
```typescript
// src/ui/DeckBuilder.ts
export class DeckBuilder extends Component {
    @property(Node)
    private deckSlots: Node[] = [];
    
    @property(Node)
    private cardCollection: Node = null!;
    
    @property(Node)
    private deckAnalysisPanel: Node = null!;
    
    @property(Prefab)
    private cardSlotPrefab: Prefab = null!;
    
    private currentDeck: Card[] = [];
    private selectedDeckIndex: number = 0;
    private availableCards: Card[] = [];
    
    protected onLoad(): void {
        this.initializeDeckBuilder();
        this.loadUserDecks();
        this.loadAvailableCards();
    }
    
    private initializeDeckBuilder(): void {
        // 덱 슬롯 초기화
        for (let i = 0; i < 8; i++) {
            const slot = instantiate(this.cardSlotPrefab);
            slot.parent = this.deckSlots[0].parent;
            
            const deckSlot = slot.getComponent(DeckSlot);
            deckSlot.slotIndex = i;
            deckSlot.onCardAdded = this.onCardAddedToDeck.bind(this);
            deckSlot.onCardRemoved = this.onCardRemovedFromDeck.bind(this);
        }
        
        // 컬렉션 패널 초기화
        this.initializeCollection();
    }
    
    private initializeCollection(): void {
        // 카드를 레어도별, 비용별로 정렬
        const sortedCards = this.availableCards.sort((a, b) => {
            if (a.rarity !== b.rarity) {
                const rarityOrder = [CardRarity.LEGENDARY, CardRarity.EPIC, CardRarity.RARE, CardRarity.COMMON];
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            }
            return a.elixirCost - b.elixirCost;
        });
        
        // 카드 슬롯 생성
        for (const card of sortedCards) {
            const cardSlot = this.createCardSlot(card);
            cardSlot.parent = this.cardCollection;
        }
    }
    
    private createCardSlot(card: Card): Node {
        const slot = instantiate(this.cardSlotPrefab);
        const cardSlot = slot.getComponent(CardSlot);
        
        cardSlot.setCard(card);
        cardSlot.isDraggable = true;
        cardSlot.onDragStart = this.onCardDragStart.bind(this);
        cardSlot.onDragEnd = this.onCardDragEnd.bind(this);
        
        return slot;
    }
    
    private onCardAddedToDeck(card: Card, slotIndex: number): void {
        if (this.currentDeck.length >= 8) {
            this.showMessage('덱이 가득 찼습니다.');
            return;
        }
        
        if (this.currentDeck.includes(card)) {
            this.showMessage('이미 덱에 포함된 카드입니다.');
            return;
        }
        
        this.currentDeck[slotIndex] = card;
        this.updateDeckAnalysis();
        this.saveDeck();
    }
    
    private onCardRemovedFromDeck(slotIndex: number): void {
        if (this.currentDeck[slotIndex]) {
            delete this.currentDeck[slotIndex];
            this.updateDeckAnalysis();
            this.saveDeck();
        }
    }
    
    private updateDeckAnalysis(): void {
        const completeDeck = this.currentDeck.filter(card => card !== undefined);
        
        if (completeDeck.length === 8) {
            const analysis = DeckAnalyzer.analyzeDeck(completeDeck);
            this.displayDeckAnalysis(analysis);
        } else {
            this.displayIncompleteAnalysis(completeDeck.length);
        }
    }
    
    private displayDeckAnalysis(analysis: DeckAnalysis): void {
        // 평균 엘릭서 비용 표시
        const avgCostLabel = this.deckAnalysisPanel.getChildByName('AvgCost').getComponent(Label);
        avgCostLabel.string = `평균 비용: ${analysis.averageElixirCost}`;
        
        // 밸런스 점수 표시
        const balanceLabel = this.deckAnalysisPanel.getChildByName('Balance').getComponent(Label);
        balanceLabel.string = `밸런스: ${analysis.balanceScore}/100`;
        
        // 색상으로 점수 표시
        if (analysis.balanceScore >= 80) {
            balanceLabel.color = Color.GREEN;
        } else if (analysis.balanceScore >= 60) {
            balanceLabel.color = Color.YELLOW;
        } else {
            balanceLabel.color = Color.RED;
        }
        
        // 추천사항 표시
        const recommendationsPanel = this.deckAnalysisPanel.getChildByName('Recommendations');
        this.clearRecommendations(recommendationsPanel);
        
        for (const recommendation of analysis.recommendations) {
            this.addRecommendation(recommendationsPanel, recommendation);
        }
        
        // 시너지 표시
        this.displaySynergies(analysis.synergies);
    }
    
    private displaySynergies(synergies: Synergy[]): void {
        const synergiesPanel = this.deckAnalysisPanel.getChildByName('Synergies');
        this.clearSynergies(synergiesPanel);
        
        for (const synergy of synergies) {
            const synergyNode = this.createSynergyDisplay(synergy);
            synergyNode.parent = synergiesPanel;
        }
    }
    
    public generateRandomDeck(): void {
        const allCards = this.availableCards.filter(card => 
            UserDataManager.instance.hasCard(card.id)
        );
        
        // 밸런스를 고려한 랜덤 덱 생성
        const randomDeck: Card[] = [];
        
        // 저비용 카드 2장
        const lowCostCards = allCards.filter(card => card.elixirCost <= 2);
        for (let i = 0; i < 2 && lowCostCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * lowCostCards.length);
            randomDeck.push(lowCostCards.splice(randomIndex, 1)[0]);
        }
        
        // 중비용 카드 4장
        const midCostCards = allCards.filter(card => card.elixirCost >= 3 && card.elixirCost <= 4);
        for (let i = 0; i < 4 && midCostCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * midCostCards.length);
            randomDeck.push(midCostCards.splice(randomIndex, 1)[0]);
        }
        
        // 고비용 카드 2장
        const highCostCards = allCards.filter(card => card.elixirCost >= 5);
        for (let i = 0; i < 2 && highCostCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * highCostCards.length);
            randomDeck.push(highCostCards.splice(randomIndex, 1)[0]);
        }
        
        // 부족한 슬롯을 남은 카드로 채움
        const remainingCards = allCards.filter(card => !randomDeck.includes(card));
        while (randomDeck.length < 8 && remainingCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * remainingCards.length);
            randomDeck.push(remainingCards.splice(randomIndex, 1)[0]);
        }
        
        this.setDeck(randomDeck);
    }
    
    public copyDeckFromCode(deckCode: string): void {
        try {
            const deck = DeckCodec.decodeDeck(deckCode);
            
            if (this.validateDeckCards(deck)) {
                this.setDeck(deck);
                this.showMessage('덱이 성공적으로 복사되었습니다.');
            } else {
                this.showMessage('소유하지 않은 카드가 포함되어 있습니다.');
            }
        } catch (error) {
            this.showMessage('잘못된 덱 코드입니다.');
        }
    }
    
    public exportDeckCode(): string {
        if (this.currentDeck.length !== 8) {
            this.showMessage('완성된 덱만 공유할 수 있습니다.');
            return '';
        }
        
        return DeckCodec.encodeDeck(this.currentDeck);
    }
    
    private validateDeckCards(deck: Card[]): boolean {
        return deck.every(card => UserDataManager.instance.hasCard(card.id));
    }
    
    private setDeck(deck: Card[]): void {
        this.currentDeck = [...deck];
        this.updateDeckSlots();
        this.updateDeckAnalysis();
        this.saveDeck();
    }
}
```

### 3.2 추천 덱 시스템
```typescript
// src/deck/DeckRecommendation.ts
export class DeckRecommendationSystem {
    private static readonly META_DECKS: { [metaType: string]: Card[] } = {
        'beatdown': [], // 중장갑 탱커 + 지원 유닛
        'control': [], // 방어 건물 + 스펠
        'cycle': [], // 저비용 고속 순환
        'bridge_spam': [], // 빠른 공격 유닛들
        'siege': [], // 공성 무기 중심
        'bait': [], // 스펠 유도 덱
        'golem': [], // 골렘 중심 중장갑
        'hog_cycle': [] // 호그 라이더 사이클
    };
    
    public static getRecommendedDecks(userCards: Card[], playerStyle: string): DeckRecommendation[] {
        const recommendations: DeckRecommendation[] = [];
        
        // 메타 덱 추천
        for (const [metaType, metaDeck] of Object.entries(this.META_DECKS)) {
            const compatibility = this.calculateDeckCompatibility(metaDeck, userCards);
            
            if (compatibility.ownedCards >= 6) { // 최소 6장 소유
                recommendations.push({
                    type: 'meta',
                    name: this.getMetaDeckName(metaType),
                    deck: metaDeck,
                    compatibility: compatibility,
                    difficulty: this.getDeckDifficulty(metaType),
                    description: this.getMetaDeckDescription(metaType)
                });
            }
        }
        
        // 플레이 스타일 기반 추천
        const styleRecommendations = this.getStyleBasedRecommendations(userCards, playerStyle);
        recommendations.push(...styleRecommendations);
        
        // AI 기반 커스텀 덱 생성
        const aiRecommendations = await this.generateAIRecommendations(userCards);
        recommendations.push(...aiRecommendations);
        
        // 점수순 정렬
        return recommendations.sort((a, b) => b.compatibility.score - a.compatibility.score);
    }
    
    private static calculateDeckCompatibility(metaDeck: Card[], userCards: Card[]): DeckCompatibility {
        const userCardIds = new Set(userCards.map(card => card.id));
        const ownedCards = metaDeck.filter(card => userCardIds.has(card.id)).length;
        const missingCards = metaDeck.filter(card => !userCardIds.has(card.id));
        
        const baseScore = (ownedCards / metaDeck.length) * 100;
        
        // 레어도에 따른 점수 보정
        let rarityPenalty = 0;
        for (const missing of missingCards) {
            switch (missing.rarity) {
                case CardRarity.LEGENDARY:
                    rarityPenalty += 20;
                    break;
                case CardRarity.EPIC:
                    rarityPenalty += 10;
                    break;
                case CardRarity.RARE:
                    rarityPenalty += 5;
                    break;
                default:
                    rarityPenalty += 2;
            }
        }
        
        return {
            score: Math.max(0, baseScore - rarityPenalty),
            ownedCards,
            missingCards,
            totalCards: metaDeck.length
        };
    }
    
    private static async generateAIRecommendations(userCards: Card[]): Promise<DeckRecommendation[]> {
        const prompt = `
        다음 카드들을 보유한 플레이어를 위한 최적의 덱을 3개 추천해주세요:
        
        보유 카드: ${userCards.map(card => `${card.name}(${card.elixirCost})`).join(', ')}
        
        각 덱에 대해 다음 정보를 JSON 형태로 제공해주세요:
        - 덱 구성 (8장의 카드 ID)
        - 덱 이름
        - 전략 설명
        - 난이도 (1-5)
        - 주요 시너지
        
        응답 형식:
        {
          "recommendations": [
            {
              "name": "덱 이름",
              "cards": ["card1", "card2", ...],
              "strategy": "전략 설명",
              "difficulty": 3,
              "synergies": ["시너지1", "시너지2"]
            }
          ]
        }
        `;
        
        try {
            const response = await ClaudeAPI.generateResponse(prompt);
            const aiResult = JSON.parse(response);
            
            return aiResult.recommendations.map((rec: any) => ({
                type: 'ai_generated',
                name: rec.name,
                deck: rec.cards.map((cardId: string) => 
                    userCards.find(card => card.id === cardId)
                ).filter(Boolean),
                compatibility: { score: 100, ownedCards: 8, missingCards: [], totalCards: 8 },
                difficulty: rec.difficulty,
                description: rec.strategy,
                synergies: rec.synergies
            }));
        } catch (error) {
            console.error('AI 덱 추천 실패:', error);
            return [];
        }
    }
    
    public static getDeckCounters(deck: Card[]): CounterAnalysis {
        const weaknesses: string[] = [];
        const strongAgainst: string[] = [];
        const recommendations: string[] = [];
        
        // 덱 구성 분석
        const hasAntiAir = deck.some(card => this.canTargetAir(card));
        const hasTankKiller = deck.some(card => this.isHighDamage(card));
        const hasAreaDamage = deck.some(card => this.hasAreaDamage(card));
        const avgCost = deck.reduce((sum, card) => sum + card.elixirCost, 0) / deck.length;
        
        // 약점 분석
        if (!hasAntiAir) {
            weaknesses.push('공중 유닛 (미니언 호드, 드래곤 등)');
            recommendations.push('궁수나 마법사를 추가하세요');
        }
        
        if (!hasTankKiller) {
            weaknesses.push('고체력 유닛 (자이언트, 골렘 등)');
            recommendations.push('높은 DPS 유닛이나 건물을 추가하세요');
        }
        
        if (!hasAreaDamage) {
            weaknesses.push('스웜 유닛 (고블린 배럴, 스켈레톤 군대 등)');
            recommendations.push('스플래시 데미지 카드를 추가하세요');
        }
        
        if (avgCost > 4.0) {
            weaknesses.push('빠른 공격 (호그 라이더, 고블린 배럴 등)');
            recommendations.push('저비용 카드로 방어력을 보강하세요');
        }
        
        // 강점 분석
        if (hasAreaDamage) {
            strongAgainst.push('스웜 유닛');
        }
        
        if (hasTankKiller) {
            strongAgainst.push('중장갑 유닛');
        }
        
        if (avgCost < 3.5) {
            strongAgainst.push('고비용 덱');
        }
        
        return {
            weaknesses,
            strongAgainst,
            recommendations,
            overallRating: this.calculateOverallRating(deck)
        };
    }
}

export interface DeckRecommendation {
    type: 'meta' | 'style' | 'ai_generated';
    name: string;
    deck: Card[];
    compatibility: DeckCompatibility;
    difficulty: number;
    description: string;
    synergies?: string[];
}

export interface DeckCompatibility {
    score: number;
    ownedCards: number;
    missingCards: Card[];
    totalCards: number;
}

export interface CounterAnalysis {
    weaknesses: string[];
    strongAgainst: string[];
    recommendations: string[];
    overallRating: number;
}
```

### 3.3 덱 검증 및 최적화
```typescript
// src/deck/DeckValidator.ts
export class DeckValidator {
    public static validateDeck(deck: Card[]): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];
        
        // 기본 규칙 검증
        if (deck.length !== 8) {
            errors.push('덱은 정확히 8장이어야 합니다.');
            return { isValid: false, errors, warnings, suggestions };
        }
        
        // 중복 카드 검증
        const cardIds = deck.map(card => card.id);
        const uniqueCardIds = new Set(cardIds);
        if (cardIds.length !== uniqueCardIds.size) {
            errors.push('중복된 카드가 있습니다.');
        }
        
        // 엘릭서 비용 검증
        const avgCost = deck.reduce((sum, card) => sum + card.elixirCost, 0) / deck.length;
        if (avgCost > 5.0) {
            warnings.push('평균 엘릭서 비용이 너무 높습니다. (5.0 초과)');
            suggestions.push('저비용 카드를 추가하여 평균 비용을 낮추세요.');
        } else if (avgCost < 2.0) {
            warnings.push('평균 엘릭서 비용이 너무 낮습니다. (2.0 미만)');
            suggestions.push('고비용 카드를 추가하여 화력을 보강하세요.');
        }
        
        // 타입 분배 검증
        const typeCount = this.countCardTypes(deck);
        
        if (typeCount.unit < 4) {
            warnings.push('유닛 카드가 부족합니다. (4장 미만)');
            suggestions.push('더 많은 유닛 카드를 추가하세요.');
        }
        
        if (typeCount.spell === 0) {
            warnings.push('스펠 카드가 없습니다.');
            suggestions.push('파이어볼이나 화살 같은 스펠을 추가하세요.');
        }
        
        if (typeCount.building > 3) {
            warnings.push('건물 카드가 너무 많습니다. (3장 초과)');
            suggestions.push('일부 건물을 유닛으로 교체하세요.');
        }
        
        // 특수 검증
        this.validateSpecialRequirements(deck, warnings, suggestions);
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    
    private static countCardTypes(deck: Card[]): { [type: string]: number } {
        const count = { unit: 0, spell: 0, building: 0 };
        
        for (const card of deck) {
            count[card.type] = (count[card.type] || 0) + 1;
        }
        
        return count;
    }
    
    private static validateSpecialRequirements(deck: Card[], warnings: string[], suggestions: string[]): void {
        // 공중 대응 확인
        const hasAntiAir = deck.some(card => 
            card.stats?.targets?.includes(TargetType.AIR) && 
            (card.stats.attackRange || 0) > 3
        );
        
        if (!hasAntiAir) {
            warnings.push('공중 유닛에 대한 대응책이 부족합니다.');
            suggestions.push('궁수, 마법사, 테슬라 등을 추가하세요.');
        }
        
        // 탱커 처리 확인
        const hasTankKiller = deck.some(card => 
            (card.stats?.damage || 0) > 200 || 
            card.type === CardType.BUILDING
        );
        
        if (!hasTankKiller) {
            warnings.push('고체력 유닛 처리 수단이 부족합니다.');
            suggestions.push('높은 DPS 유닛이나 방어 건물을 추가하세요.');
        }
        
        // 스웜 처리 확인
        const hasAreaDamage = deck.some(card => 
            'splashRadius' in (card.stats || {}) ||
            card.type === CardType.SPELL
        );
        
        if (!hasAreaDamage) {
            warnings.push('다수 유닛 처리 수단이 부족합니다.');
            suggestions.push('마법사, 파이어볼, 화살 등을 추가하세요.');
        }
        
        // 승리 조건 확인
        const hasWinCondition = deck.some(card => 
            this.isWinCondition(card)
        );
        
        if (!hasWinCondition) {
            warnings.push('명확한 승리 조건이 없습니다.');
            suggestions.push('자이언트, 호그 라이더 등 주요 공격 카드를 추가하세요.');
        }
    }
    
    private static isWinCondition(card: Card): boolean {
        const winConditionCards = [
            'giant', 'golem', 'hog_rider', 'balloon', 'lava_hound',
            'royal_giant', 'x_bow', 'mortar', 'graveyard'
        ];
        
        return winConditionCards.includes(card.id);
    }
    
    public static optimizeDeck(deck: Card[], availableCards: Card[]): Card[] {
        let optimizedDeck = [...deck];
        const analysis = DeckAnalyzer.analyzeDeck(optimizedDeck);
        
        // 평균 비용이 너무 높은 경우
        if (analysis.averageElixirCost > 4.2) {
            optimizedDeck = this.reduceDeckCost(optimizedDeck, availableCards);
        }
        
        // 평균 비용이 너무 낮은 경우
        if (analysis.averageElixirCost < 2.8) {
            optimizedDeck = this.increaseDeckPower(optimizedDeck, availableCards);
        }
        
        // 타입 밸런스 조정
        optimizedDeck = this.balanceCardTypes(optimizedDeck, availableCards);
        
        return optimizedDeck;
    }
    
    private static reduceDeckCost(deck: Card[], availableCards: Card[]): Card[] {
        const highCostCards = deck.filter(card => card.elixirCost >= 5);
        const lowCostAlternatives = availableCards.filter(card => 
            card.elixirCost <= 3 && !deck.includes(card)
        );
        
        if (highCostCards.length > 0 && lowCostAlternatives.length > 0) {
            const newDeck = [...deck];
            const replaceIndex = newDeck.indexOf(highCostCards[0]);
            newDeck[replaceIndex] = lowCostAlternatives[0];
            return newDeck;
        }
        
        return deck;
    }
    
    private static balanceCardTypes(deck: Card[], availableCards: Card[]): Card[] {
        const typeCount = this.countCardTypes(deck);
        
        // 스펠이 없으면 추가
        if (typeCount.spell === 0) {
            const spells = availableCards.filter(card => 
                card.type === CardType.SPELL && !deck.includes(card)
            );
            
            if (spells.length > 0) {
                const newDeck = [...deck];
                // 가장 비싼 유닛을 스펠로 교체
                const expensiveUnits = newDeck
                    .filter(card => card.type === CardType.UNIT)
                    .sort((a, b) => b.elixirCost - a.elixirCost);
                
                if (expensiveUnits.length > 0) {
                    const replaceIndex = newDeck.indexOf(expensiveUnits[0]);
                    newDeck[replaceIndex] = spells[0];
                    return newDeck;
                }
            }
        }
        
        return deck;
    }
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
```

이 덱/카드 시스템 설계는 클래시 로얄의 핵심 메커니즘인 덱 구성과 카드 관리를 포괄적으로 다루면서, AI 기반 추천 시스템과 고급 분석 기능을 통합한 현대적인 시스템입니다.