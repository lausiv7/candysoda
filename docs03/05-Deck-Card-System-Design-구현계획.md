# 덱/카드 시스템 구현계획

## 문서 정보
- **문서명**: 덱/카드 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [카드 시스템 구현](#3-카드-시스템-구현)
4. [덱 관리 시스템](#4-덱-관리-시스템)
5. [카드 컬렉션 시스템](#5-카드-컬렉션-시스템)
6. [카드 업그레이드 시스템](#6-카드-업그레이드-시스템)
7. [UI 구현](#7-ui-구현)
8. [테스팅 계획](#8-테스팅-계획)

## 1. 구현 개요

### 1.1 기술 스택
- **데이터 저장**: SQLite (로컬) + Firebase Firestore (클라우드)
- **상태 관리**: MobX State Tree
- **UI 프레임워크**: Cocos Creator UI System
- **데이터 검증**: Joi Schema Validation
- **동기화**: Firebase Real-time Database

### 1.2 시스템 아키텍처
```typescript
// [의도] 카드/덱 시스템의 전체 아키텍처 정의
// [책임] 데이터 흐름, 상태 관리, 동기화 처리
interface CardSystemArchitecture {
  data: {
    cardDatabase: CardDatabase;
    playerCollection: PlayerCardCollection;
    deckManager: DeckManager;
  };
  
  logic: {
    cardEffects: CardEffectSystem;
    deckValidator: DeckValidator;
    upgradeCalculator: UpgradeCalculator;
  };
  
  ui: {
    collectionView: CollectionViewController;
    deckBuilder: DeckBuilderController;
    cardPreview: CardPreviewController;
  };
  
  sync: {
    collectionSync: CollectionSynchronizer;
    deckSync: DeckSynchronizer;
  };
}
```

## 2. 개발 일정

### 2.1 Phase 1: 기반 시스템 (3주)
```typescript
const phase1Tasks = {
  week1: [
    'Card 데이터 구조 설계',
    'CardDatabase 구현',
    'PlayerCardCollection 기본 구조',
    'Card 스키마 정의'
  ],
  week2: [
    'DeckManager 기본 기능',
    '덱 검증 시스템',
    '카드 효과 프레임워크',
    '기본 UI 컴포넌트'
  ],
  week3: [
    '카드 컬렉션 로직',
    '업그레이드 시스템 기반',
    '로컬 저장소 연동',
    '단위 테스트 작성'
  ]
};
```

### 2.2 Phase 2: 고급 기능 (4주)
```typescript
const phase2Tasks = {
  week1: ['덱 빌더 UI', '카드 필터링/검색'],
  week2: ['카드 업그레이드 로직', '진화 시스템'],
  week3: ['클라우드 동기화', '오프라인 지원'],
  week4: ['카드 애니메이션', '이펙트 시스템']
};
```

### 2.3 Phase 3: 최적화 및 완성 (2주)
```typescript
const phase3Tasks = {
  week1: ['성능 최적화', '메모리 관리'],
  week2: ['통합 테스트', 'UI/UX 개선']
};
```

## 3. 카드 시스템 구현

### 3.1 Card 기본 클래스
```typescript
// [의도] 모든 카드의 기본 데이터 구조와 행동 정의
// [책임] 카드 메타데이터, 효과 정의, 유효성 검증
export class Card {
  public readonly id: string;
  public readonly name: string;
  public readonly type: CardType;
  public readonly rarity: CardRarity;
  public readonly elixirCost: number;
  public readonly description: string;
  public readonly iconPath: string;
  
  // 레벨별 스탯
  private levelStats: Map<number, CardStats>;
  private effects: CardEffect[];
  private tags: Set<CardTag>;
  
  constructor(cardData: CardData) {
    this.id = cardData.id;
    this.name = cardData.name;
    this.type = cardData.type;
    this.rarity = cardData.rarity;
    this.elixirCost = cardData.elixirCost;
    this.description = cardData.description;
    this.iconPath = cardData.iconPath;
    
    this.levelStats = new Map();
    this.effects = [];
    this.tags = new Set(cardData.tags || []);
    
    this.initializeLevelStats(cardData.baseStats, cardData.growthRates);
    this.initializeEffects(cardData.effects);
  }
  
  private initializeLevelStats(baseStats: CardStats, growthRates: GrowthRates): void {
    const maxLevel = this.getMaxLevel();
    
    for (let level = 1; level <= maxLevel; level++) {
      const stats = this.calculateStatsForLevel(baseStats, growthRates, level);
      this.levelStats.set(level, stats);
    }
  }
  
  private calculateStatsForLevel(base: CardStats, growth: GrowthRates, level: number): CardStats {
    const levelMultiplier = Math.pow(growth.multiplier, level - 1);
    
    return {
      health: Math.floor(base.health * levelMultiplier),
      damage: Math.floor(base.damage * levelMultiplier),
      speed: base.speed, // 속도는 보통 레벨업으로 변하지 않음
      range: base.range,
      attackSpeed: base.attackSpeed,
      // 특수 스탯들
      ...Object.keys(base)
        .filter(key => !['health', 'damage', 'speed', 'range', 'attackSpeed'].includes(key))
        .reduce((acc, key) => {
          acc[key] = base[key] * levelMultiplier;
          return acc;
        }, {})
    };
  }
  
  private initializeEffects(effectsData: CardEffectData[]): void {
    for (const effectData of effectsData) {
      const effect = CardEffectFactory.createEffect(effectData);
      this.effects.push(effect);
    }
  }
  
  // 레벨별 스탯 조회
  getStatsAtLevel(level: number): CardStats {
    const clampedLevel = Math.max(1, Math.min(level, this.getMaxLevel()));
    return this.levelStats.get(clampedLevel)!;
  }
  
  // 최대 레벨 계산
  getMaxLevel(): number {
    const maxLevels = {
      [CardRarity.Common]: 14,
      [CardRarity.Rare]: 12,
      [CardRarity.Epic]: 9,
      [CardRarity.Legendary]: 6
    };
    
    return maxLevels[this.rarity];
  }
  
  // 카드 효과 실행
  applyEffects(context: GameContext): void {
    for (const effect of this.effects) {
      if (effect.canApply(context)) {
        effect.apply(context);
      }
    }
  }
  
  // 배치 가능 여부 확인
  canPlayAt(position: Vec3, gameContext: GameContext): boolean {
    // 엘릭서 확인
    if (gameContext.player.currentElixir < this.elixirCost) {
      return false;
    }
    
    // 배치 영역 확인
    if (!this.isValidPlacementArea(position, gameContext)) {
      return false;
    }
    
    // 카드별 특수 조건 확인
    return this.checkSpecialConditions(position, gameContext);
  }
  
  private isValidPlacementArea(position: Vec3, context: GameContext): boolean {
    const battleField = context.battleField;
    const playerSide = context.player.side;
    
    switch (this.type) {
      case CardType.Unit:
        return battleField.isPlayerDeployArea(position, playerSide);
      
      case CardType.Building:
        return battleField.isBuildingArea(position, playerSide);
      
      case CardType.Spell:
        return battleField.isSpellTargetArea(position);
      
      default:
        return false;
    }
  }
  
  private checkSpecialConditions(position: Vec3, context: GameContext): boolean {
    // 카드별 특수 조건 체크
    if (this.tags.has(CardTag.RequiresTarget)) {
      return context.battleField.hasValidTargetAt(position, this.getTargetFilter());
    }
    
    if (this.tags.has(CardTag.NoOverlap)) {
      return !context.battleField.hasUnitAt(position, 2.0); // 2유닛 반경 내 다른 유닛 없음
    }
    
    return true;
  }
  
  // 네트워크 직렬화
  serialize(): CardSerializedData {
    return {
      id: this.id,
      type: this.type,
      rarity: this.rarity,
      elixirCost: this.elixirCost,
      tags: Array.from(this.tags)
    };
  }
  
  // 카드 복제 (메모리 최적화용)
  clone(): Card {
    const cardData = {
      id: this.id,
      name: this.name,
      type: this.type,
      rarity: this.rarity,
      elixirCost: this.elixirCost,
      description: this.description,
      iconPath: this.iconPath,
      baseStats: this.levelStats.get(1)!,
      growthRates: this.calculateGrowthRates(),
      effects: this.effects.map(e => e.serialize()),
      tags: Array.from(this.tags)
    };
    
    return new Card(cardData);
  }
}
```

### 3.2 카드 효과 시스템
```typescript
// [의도] 카드의 다양한 효과를 체계적으로 관리
// [책임] 효과 정의, 실행, 조합, 지속시간 관리
export abstract class CardEffect {
  protected readonly id: string;
  protected readonly name: string;
  protected readonly description: string;
  protected duration: number; // -1이면 영구적
  protected stackable: boolean;
  
  constructor(data: CardEffectData) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.duration = data.duration || -1;
    this.stackable = data.stackable || false;
  }
  
  abstract canApply(context: GameContext): boolean;
  abstract apply(context: GameContext): void;
  abstract remove(context: GameContext): void;
  
  getDuration(): number {
    return this.duration;
  }
  
  isStackable(): boolean {
    return this.stackable;
  }
  
  serialize(): CardEffectData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      duration: this.duration,
      stackable: this.stackable
    };
  }
}

// 즉시 효과 (예: 데미지, 힐링)
export class InstantEffect extends CardEffect {
  private effectType: InstantEffectType;
  private value: number;
  private targetFilter: TargetFilter;
  
  constructor(data: InstantEffectData) {
    super(data);
    this.effectType = data.effectType;
    this.value = data.value;
    this.targetFilter = data.targetFilter;
  }
  
  canApply(context: GameContext): boolean {
    const targets = this.findTargets(context);
    return targets.length > 0;
  }
  
  apply(context: GameContext): void {
    const targets = this.findTargets(context);
    
    for (const target of targets) {
      switch (this.effectType) {
        case InstantEffectType.Damage:
          target.takeDamage(this.value, context.source);
          break;
          
        case InstantEffectType.Heal:
          target.heal(this.value);
          break;
          
        case InstantEffectType.Knockback:
          this.applyKnockback(target, context);
          break;
          
        case InstantEffectType.Stun:
          target.applyStatusEffect(new StunEffect(this.value));
          break;
      }
    }
  }
  
  remove(context: GameContext): void {
    // 즉시 효과는 제거할 것이 없음
  }
  
  private findTargets(context: GameContext): GameEntity[] {
    return context.battleField.findEntities(this.targetFilter);
  }
  
  private applyKnockback(target: GameEntity, context: GameContext): void {
    const direction = target.position.subtract(context.position).normalize();
    const knockbackForce = direction.multiplyScalar(this.value);
    target.applyForce(knockbackForce);
  }
}

// 지속 효과 (예: 버프, 디버프)
export class PersistentEffect extends CardEffect {
  private modifier: StatModifier;
  private tickInterval: number;
  private tickDamage: number;
  
  constructor(data: PersistentEffectData) {
    super(data);
    this.modifier = data.modifier;
    this.tickInterval = data.tickInterval || 0;
    this.tickDamage = data.tickDamage || 0;
  }
  
  canApply(context: GameContext): boolean {
    const target = context.target;
    return target && !target.hasEffect(this.id);
  }
  
  apply(context: GameContext): void {
    const target = context.target;
    if (!target) return;
    
    // 스탯 수정자 적용
    if (this.modifier) {
      target.applyStatModifier(this.modifier);
    }
    
    // 지속 데미지/힐링 설정
    if (this.tickInterval > 0) {
      target.addPeriodicEffect({
        id: this.id,
        interval: this.tickInterval,
        effect: () => {
          if (this.tickDamage > 0) {
            target.takeDamage(this.tickDamage);
          } else if (this.tickDamage < 0) {
            target.heal(-this.tickDamage);
          }
        },
        duration: this.duration
      });
    }
    
    // 효과 등록
    target.addActiveEffect(this);
  }
  
  remove(context: GameContext): void {
    const target = context.target;
    if (!target) return;
    
    // 스탯 수정자 제거
    if (this.modifier) {
      target.removeStatModifier(this.modifier);
    }
    
    // 지속 효과 제거
    target.removePeriodicEffect(this.id);
    target.removeActiveEffect(this.id);
  }
}

// 카드 효과 팩토리
export class CardEffectFactory {
  private static effectTypes: Map<string, typeof CardEffect> = new Map();
  
  static registerEffectType(typeName: string, effectClass: typeof CardEffect): void {
    this.effectTypes.set(typeName, effectClass);
  }
  
  static createEffect(data: CardEffectData): CardEffect {
    const EffectClass = this.effectTypes.get(data.type);
    if (!EffectClass) {
      throw new Error(`Unknown effect type: ${data.type}`);
    }
    
    return new EffectClass(data);
  }
  
  static initializeBuiltInEffects(): void {
    this.registerEffectType('instant', InstantEffect);
    this.registerEffectType('persistent', PersistentEffect);
    this.registerEffectType('conditional', ConditionalEffect);
    this.registerEffectType('area', AreaEffect);
    this.registerEffectType('chain', ChainEffect);
  }
}
```

## 4. 덱 관리 시스템

### 4.1 Deck 클래스
```typescript
// [의도] 플레이어의 덱 구성과 관리를 담당
// [책임] 덱 유효성 검증, 카드 배치, 덱 최적화
export class Deck {
  public readonly id: string;
  public name: string;
  public cards: PlayerCard[];
  public readonly maxSize: number = 8;
  public lastModified: Date;
  public wins: number = 0;
  public losses: number = 0;
  
  private averageElixirCost: number = 0;
  private isValid: boolean = false;
  private validationErrors: string[] = [];
  
  constructor(deckData: DeckData) {
    this.id = deckData.id || UUIDGenerator.generate();
    this.name = deckData.name || 'New Deck';
    this.cards = [...deckData.cards] || [];
    this.lastModified = new Date(deckData.lastModified || Date.now());
    this.wins = deckData.wins || 0;
    this.losses = deckData.losses || 0;
    
    this.updateDeckStats();
  }
  
  // 카드 추가
  addCard(card: PlayerCard): boolean {
    if (this.cards.length >= this.maxSize) {
      return false;
    }
    
    // 중복 카드 체크 (같은 카드는 한 장만)
    if (this.hasCard(card.cardId)) {
      return false;
    }
    
    this.cards.push(card);
    this.updateDeckStats();
    this.markModified();
    
    return true;
  }
  
  // 카드 제거
  removeCard(cardId: string): boolean {
    const index = this.cards.findIndex(card => card.cardId === cardId);
    if (index === -1) {
      return false;
    }
    
    this.cards.splice(index, 1);
    this.updateDeckStats();
    this.markModified();
    
    return true;
  }
  
  // 카드 교체
  replaceCard(oldCardId: string, newCard: PlayerCard): boolean {
    const index = this.cards.findIndex(card => card.cardId === oldCardId);
    if (index === -1) {
      return false;
    }
    
    // 새 카드가 이미 덱에 있는지 확인
    if (newCard.cardId !== oldCardId && this.hasCard(newCard.cardId)) {
      return false;
    }
    
    this.cards[index] = newCard;
    this.updateDeckStats();
    this.markModified();
    
    return true;
  }
  
  // 덱 유효성 검증
  validate(): DeckValidationResult {
    this.validationErrors = [];
    
    // 카드 수 확인
    if (this.cards.length !== this.maxSize) {
      this.validationErrors.push(`Deck must contain exactly ${this.maxSize} cards`);
    }
    
    // 중복 카드 확인
    const cardIds = new Set();
    for (const card of this.cards) {
      if (cardIds.has(card.cardId)) {
        this.validationErrors.push(`Duplicate card found: ${card.cardId}`);
      }
      cardIds.add(card.cardId);
    }
    
    // 엘릭서 코스트 밸런스 확인
    if (this.averageElixirCost > 5.0) {
      this.validationErrors.push('Average elixir cost is too high');
    } else if (this.averageElixirCost < 2.5) {
      this.validationErrors.push('Average elixir cost is too low');
    }
    
    // 카드 타입 밸런스 확인
    const cardTypes = this.analyzeCardTypes();
    if (cardTypes.spells > 4) {
      this.validationErrors.push('Too many spell cards');
    }
    if (cardTypes.buildings > 3) {
      this.validationErrors.push('Too many building cards');
    }
    if (cardTypes.units < 3) {
      this.validationErrors.push('Not enough unit cards');
    }
    
    this.isValid = this.validationErrors.length === 0;
    
    return {
      isValid: this.isValid,
      errors: [...this.validationErrors],
      warnings: this.generateWarnings()
    };
  }
  
  private updateDeckStats(): void {
    if (this.cards.length === 0) {
      this.averageElixirCost = 0;
      return;
    }
    
    const totalCost = this.cards.reduce((sum, card) => {
      const cardData = CardDatabase.getCard(card.cardId);
      return sum + cardData.elixirCost;
    }, 0);
    
    this.averageElixirCost = totalCost / this.cards.length;
  }
  
  private analyzeCardTypes(): CardTypeAnalysis {
    const analysis: CardTypeAnalysis = {
      units: 0,
      buildings: 0,
      spells: 0
    };
    
    for (const card of this.cards) {
      const cardData = CardDatabase.getCard(card.cardId);
      switch (cardData.type) {
        case CardType.Unit:
          analysis.units++;
          break;
        case CardType.Building:
          analysis.buildings++;
          break;
        case CardType.Spell:
          analysis.spells++;
          break;
      }
    }
    
    return analysis;
  }
  
  private generateWarnings(): string[] {
    const warnings: string[] = [];
    
    // 고비용 카드 경고
    const highCostCards = this.cards.filter(card => {
      const cardData = CardDatabase.getCard(card.cardId);
      return cardData.elixirCost >= 6;
    });
    
    if (highCostCards.length > 2) {
      warnings.push('Consider reducing high-cost cards for better cycle');
    }
    
    // 저비용 카드 부족 경고
    const lowCostCards = this.cards.filter(card => {
      const cardData = CardDatabase.getCard(card.cardId);
      return cardData.elixirCost <= 2;
    });
    
    if (lowCostCards.length < 2) {
      warnings.push('Consider adding more low-cost cards for cycling');
    }
    
    // 에어 유닛 대응 경고
    const antiAirCards = this.cards.filter(card => {
      const cardData = CardDatabase.getCard(card.cardId);
      return cardData.tags.has(CardTag.AntiAir);
    });
    
    if (antiAirCards.length === 0) {
      warnings.push('No anti-air cards detected');
    }
    
    return warnings;
  }
  
  // 덱 분석
  analyzeSynergies(): DeckSynergyAnalysis {
    const synergies: DeckSynergy[] = [];
    
    // 카드 간 시너지 분석
    for (let i = 0; i < this.cards.length; i++) {
      for (let j = i + 1; j < this.cards.length; j++) {
        const card1 = CardDatabase.getCard(this.cards[i].cardId);
        const card2 = CardDatabase.getCard(this.cards[j].cardId);
        
        const synergyScore = this.calculateSynergy(card1, card2);
        if (synergyScore > 0.5) {
          synergies.push({
            card1: card1.id,
            card2: card2.id,
            type: this.determineSynergyType(card1, card2),
            score: synergyScore
          });
        }
      }
    }
    
    return {
      synergies: synergies,
      totalSynergyScore: synergies.reduce((sum, s) => sum + s.score, 0),
      recommendations: this.generateSynergyRecommendations(synergies)
    };
  }
  
  private calculateSynergy(card1: Card, card2: Card): number {
    let score = 0;
    
    // 태그 기반 시너지
    const sharedTags = this.getSharedTags(card1, card2);
    score += sharedTags.length * 0.2;
    
    // 엘릭서 보완성
    const costBalance = Math.abs(card1.elixirCost - card2.elixirCost);
    if (costBalance >= 2 && costBalance <= 4) {
      score += 0.3; // 적절한 코스트 밸런스
    }
    
    // 역할 보완성
    if (this.areComplementaryRoles(card1, card2)) {
      score += 0.4;
    }
    
    return Math.min(score, 1.0);
  }
  
  // 덱 최적화 제안
  suggestOptimizations(): DeckOptimization[] {
    const optimizations: DeckOptimization[] = [];
    
    const analysis = this.analyzeSynergies();
    const validation = this.validate();
    
    // 약한 카드 교체 제안
    const weakCards = this.identifyWeakCards();
    for (const weakCard of weakCards) {
      const alternatives = this.findAlternativeCards(weakCard);
      if (alternatives.length > 0) {
        optimizations.push({
          type: 'REPLACE_WEAK_CARD',
          description: `Consider replacing ${weakCard.name} with a stronger alternative`,
          currentCard: weakCard.id,
          suggestedCards: alternatives.map(c => c.id),
          expectedImprovement: 0.15
        });
      }
    }
    
    // 시너지 향상 제안
    if (analysis.totalSynergyScore < 2.0) {
      const synergyCards = this.findSynergyCards();
      optimizations.push({
        type: 'IMPROVE_SYNERGY',
        description: 'Add cards that work well together',
        suggestedCards: synergyCards.map(c => c.id),
        expectedImprovement: 0.25
      });
    }
    
    // 밸런스 개선 제안
    if (validation.warnings.length > 0) {
      optimizations.push({
        type: 'IMPROVE_BALANCE',
        description: 'Improve deck balance',
        suggestedChanges: validation.warnings,
        expectedImprovement: 0.20
      });
    }
    
    return optimizations;
  }
  
  // 덱 복사
  clone(newName?: string): Deck {
    const deckData: DeckData = {
      id: UUIDGenerator.generate(),
      name: newName || `${this.name} (Copy)`,
      cards: this.cards.map(card => ({ ...card })),
      lastModified: Date.now(),
      wins: 0,
      losses: 0
    };
    
    return new Deck(deckData);
  }
  
  // 통계 업데이트
  recordBattleResult(won: boolean): void {
    if (won) {
      this.wins++;
    } else {
      this.losses++;
    }
    this.markModified();
  }
  
  getWinRate(): number {
    const totalGames = this.wins + this.losses;
    return totalGames > 0 ? this.wins / totalGames : 0;
  }
  
  private markModified(): void {
    this.lastModified = new Date();
  }
  
  private hasCard(cardId: string): boolean {
    return this.cards.some(card => card.cardId === cardId);
  }
  
  // 직렬화
  serialize(): DeckSerializedData {
    return {
      id: this.id,
      name: this.name,
      cards: this.cards.map(card => card.serialize()),
      lastModified: this.lastModified.getTime(),
      wins: this.wins,
      losses: this.losses,
      averageElixirCost: this.averageElixirCost
    };
  }
}
```

### 4.2 덱 관리자
```typescript
// [의도] 플레이어의 모든 덱을 관리하는 중앙 시스템
// [책임] 덱 생성/수정/삭제, 활성 덱 관리, 동기화
export class DeckManager {
  private decks: Map<string, Deck> = new Map();
  private activeDeckId: string | null = null;
  private maxDecks: number = 5;
  private eventEmitter: EventEmitter;
  
  constructor() {
    this.eventEmitter = new EventEmitter();
  }
  
  // 덱 생성
  async createDeck(name: string, cards?: PlayerCard[]): Promise<Deck> {
    if (this.decks.size >= this.maxDecks) {
      throw new Error('Maximum number of decks reached');
    }
    
    const deckData: DeckData = {
      id: UUIDGenerator.generate(),
      name: name,
      cards: cards || [],
      lastModified: Date.now(),
      wins: 0,
      losses: 0
    };
    
    const deck = new Deck(deckData);
    this.decks.set(deck.id, deck);
    
    // 첫 번째 덱이면 활성 덱으로 설정
    if (this.decks.size === 1) {
      this.activeDeckId = deck.id;
    }
    
    // 이벤트 발생
    this.eventEmitter.emit('deck_created', { deck });
    
    // 저장
    await this.saveDeck(deck);
    
    return deck;
  }
  
  // 덱 삭제
  async deleteDeck(deckId: string): Promise<boolean> {
    const deck = this.decks.get(deckId);
    if (!deck) {
      return false;
    }
    
    this.decks.delete(deckId);
    
    // 활성 덱이었다면 다른 덱으로 변경
    if (this.activeDeckId === deckId) {
      const remainingDecks = Array.from(this.decks.keys());
      this.activeDeckId = remainingDecks.length > 0 ? remainingDecks[0] : null;
    }
    
    // 이벤트 발생
    this.eventEmitter.emit('deck_deleted', { deckId });
    
    // 저장소에서 삭제
    await this.deleteDeckFromStorage(deckId);
    
    return true;
  }
  
  // 덱 수정
  async updateDeck(deckId: string, updates: Partial<DeckData>): Promise<boolean> {
    const deck = this.decks.get(deckId);
    if (!deck) {
      return false;
    }
    
    // 업데이트 적용
    if (updates.name !== undefined) {
      deck.name = updates.name;
    }
    if (updates.cards !== undefined) {
      deck.cards = [...updates.cards];
      deck.updateDeckStats();
    }
    
    deck.markModified();
    
    // 이벤트 발생
    this.eventEmitter.emit('deck_updated', { deck });
    
    // 저장
    await this.saveDeck(deck);
    
    return true;
  }
  
  // 활성 덱 설정
  setActiveDeck(deckId: string): boolean {
    if (!this.decks.has(deckId)) {
      return false;
    }
    
    const previousActiveDeck = this.activeDeckId;
    this.activeDeckId = deckId;
    
    // 이벤트 발생
    this.eventEmitter.emit('active_deck_changed', {
      previousDeckId: previousActiveDeck,
      newDeckId: deckId
    });
    
    return true;
  }
  
  // 활성 덱 조회
  getActiveDeck(): Deck | null {
    return this.activeDeckId ? this.decks.get(this.activeDeckId) || null : null;
  }
  
  // 모든 덱 조회
  getAllDecks(): Deck[] {
    return Array.from(this.decks.values());
  }
  
  // 덱 검색
  searchDecks(query: string): Deck[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDecks().filter(deck =>
      deck.name.toLowerCase().includes(lowerQuery)
    );
  }
  
  // 덱 정렬
  sortDecks(sortBy: DeckSortCriteria): Deck[] {
    const decks = this.getAllDecks();
    
    switch (sortBy) {
      case DeckSortCriteria.Name:
        return decks.sort((a, b) => a.name.localeCompare(b.name));
      
      case DeckSortCriteria.WinRate:
        return decks.sort((a, b) => b.getWinRate() - a.getWinRate());
      
      case DeckSortCriteria.LastUsed:
        return decks.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      
      case DeckSortCriteria.ElixirCost:
        return decks.sort((a, b) => a.averageElixirCost - b.averageElixirCost);
      
      default:
        return decks;
    }
  }
  
  // 덱 추천
  async recommendDecks(playerData: PlayerData): Promise<DeckRecommendation[]> {
    const recommendations: DeckRecommendation[] = [];
    
    // 플레이어 스타일 분석
    const playStyle = await this.analyzePlayerStyle(playerData);
    
    // 메타 기반 추천
    const metaDecks = await this.getMetaDecks();
    for (const metaDeck of metaDecks) {
      if (this.isDeckSuitableForPlayer(metaDeck, playStyle)) {
        recommendations.push({
          deck: metaDeck,
          reason: 'Popular in current meta',
          confidence: 0.8,
          requiredCards: this.getMissingCards(metaDeck, playerData.collection)
        });
      }
    }
    
    // 카드 컬렉션 기반 추천
    const collectionDecks = await this.generateDecksFromCollection(playerData.collection);
    recommendations.push(...collectionDecks);
    
    // 정렬 (신뢰도 순)
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
  
  // 저장 관련 메서드들
  private async saveDeck(deck: Deck): Promise<void> {
    await LocalStorage.setItem(`deck_${deck.id}`, deck.serialize());
    
    // 클라우드 동기화
    if (NetworkManager.isOnline()) {
      await CloudStorage.saveDeck(deck.serialize());
    }
  }
  
  private async deleteDeckFromStorage(deckId: string): Promise<void> {
    await LocalStorage.removeItem(`deck_${deckId}`);
    
    // 클라우드에서도 삭제
    if (NetworkManager.isOnline()) {
      await CloudStorage.deleteDeck(deckId);
    }
  }
  
  // 초기화 (앱 시작 시)
  async initialize(): Promise<void> {
    // 로컬 저장소에서 덱 로드
    await this.loadDecksFromLocal();
    
    // 클라우드 동기화
    if (NetworkManager.isOnline()) {
      await this.syncWithCloud();
    }
  }
  
  private async loadDecksFromLocal(): Promise<void> {
    const deckKeys = await LocalStorage.getKeysStartingWith('deck_');
    
    for (const key of deckKeys) {
      try {
        const deckData = await LocalStorage.getItem(key);
        const deck = new Deck(deckData);
        this.decks.set(deck.id, deck);
      } catch (error) {
        console.error(`Failed to load deck from ${key}:`, error);
      }
    }
    
    // 활성 덱 설정
    const activeDeckId = await LocalStorage.getItem('active_deck_id');
    if (activeDeckId && this.decks.has(activeDeckId)) {
      this.activeDeckId = activeDeckId;
    } else if (this.decks.size > 0) {
      this.activeDeckId = Array.from(this.decks.keys())[0];
    }
  }
  
  private async syncWithCloud(): Promise<void> {
    try {
      const cloudDecks = await CloudStorage.getDecks();
      
      for (const cloudDeck of cloudDecks) {
        const localDeck = this.decks.get(cloudDeck.id);
        
        if (!localDeck) {
          // 클라우드에만 있는 덱
          const deck = new Deck(cloudDeck);
          this.decks.set(deck.id, deck);
        } else if (cloudDeck.lastModified > localDeck.lastModified.getTime()) {
          // 클라우드가 더 최신
          const updatedDeck = new Deck(cloudDeck);
          this.decks.set(updatedDeck.id, updatedDeck);
        } else if (cloudDeck.lastModified < localDeck.lastModified.getTime()) {
          // 로컬이 더 최신
          await CloudStorage.saveDeck(localDeck.serialize());
        }
      }
    } catch (error) {
      console.error('Failed to sync decks with cloud:', error);
    }
  }
  
  // 이벤트 리스너
  on(event: string, callback: Function): void {
    this.eventEmitter.on(event, callback);
  }
  
  off(event: string, callback: Function): void {
    this.eventEmitter.off(event, callback);
  }
}
```

이 구현계획은 카드/덱 시스템의 핵심 기능들을 체계적으로 정의하고 있습니다. 확장성과 유지보수성을 고려한 설계로, 향후 새로운 카드나 기능 추가가 용이하도록 구성되어 있습니다.