# Progression System Design
Royal Clash - 진행 시스템 설계

## 1. 진행 시스템 개요

### 1.1 진행 구조
```
플레이어 진행 시스템:
├── 플레이어 레벨 (Player Level)
│   ├── 경험치 획득 및 레벨업
│   ├── 새로운 카드 및 기능 해금
│   └── 최대 레벨 50
├── 트로피 시스템 (Trophy System)
│   ├── 아레나 진행 (15개 아레나)
│   ├── 리그 시스템 (8개 리그)
│   └── 시즌 리셋 및 보상
├── 카드 컬렉션 (Card Collection)
│   ├── 카드 해금 및 수집
│   ├── 카드 레벨업 시스템
│   └── 마스터리 시스템
└── 성취 시스템 (Achievement System)
    ├── 일일/주간 퀘스트
    ├── 업적 및 도전과제
    └── 특별 이벤트 진행도
```

### 1.2 플레이어 레벨
- **최대 레벨**: 50레벨
- **경험치 소스**: 매치 승리, 카드 업그레이드, 퀘스트 완료
- **레벨업 보상**: 골드, 젬, 카드, 새로운 기능 해금
- **해금 시스템**: 특정 레벨에서 새로운 카드, 게임 모드, 기능 해금

### 1.3 언락 시스템
```typescript
// src/progression/UnlockSystem.ts
export interface UnlockCondition {
    type: 'player_level' | 'arena' | 'trophy_count' | 'card_collection' | 'achievement';
    value: number | string;
    description: string;
}

export interface Unlockable {
    id: string;
    name: string;
    type: 'card' | 'feature' | 'game_mode' | 'cosmetic' | 'building';
    conditions: UnlockCondition[];
    rewards?: Reward[];
    icon: string;
    description: string;
}

export const UNLOCK_PROGRESSION: Unlockable[] = [
    {
        id: 'archer',
        name: '궁수',
        type: 'card',
        conditions: [{ type: 'player_level', value: 1, description: '레벨 1 달성' }],
        icon: 'archer_icon',
        description: '원거리 공격이 가능한 기본 유닛입니다.'
    },
    {
        id: 'goblin_stadium',
        name: '고블린 스타디움',
        type: 'feature',
        conditions: [
            { type: 'player_level', value: 3, description: '레벨 3 달성' },
            { type: 'trophy_count', value: 400, description: '트로피 400개 획득' }
        ],
        icon: 'arena_2_icon',
        description: '새로운 아레나가 해금되었습니다!'
    },
    {
        id: 'clan_system',
        name: '클랜 시스템',
        type: 'feature',
        conditions: [{ type: 'player_level', value: 8, description: '레벨 8 달성' }],
        icon: 'clan_icon',
        description: '다른 플레이어들과 클랜을 결성하세요!'
    },
    {
        id: 'tournament_mode',
        name: '토너먼트',
        type: 'game_mode',
        conditions: [
            { type: 'player_level', value: 12, description: '레벨 12 달성' },
            { type: 'trophy_count', value: 2000, description: '트로피 2000개 획득' }
        ],
        icon: 'tournament_icon',
        description: '토너먼트에 참가하여 특별한 보상을 획득하세요!'
    }
];

export class UnlockSystem {
    public static checkUnlocks(playerData: PlayerData): Unlockable[] {
        const newUnlocks: Unlockable[] = [];
        
        for (const unlockable of UNLOCK_PROGRESSION) {
            if (this.isUnlocked(unlockable, playerData)) {
                if (!playerData.unlockedItems.includes(unlockable.id)) {
                    newUnlocks.push(unlockable);
                    playerData.unlockedItems.push(unlockable.id);
                }
            }
        }
        
        return newUnlocks;
    }
    
    private static isUnlocked(unlockable: Unlockable, playerData: PlayerData): boolean {
        return unlockable.conditions.every(condition => {
            switch (condition.type) {
                case 'player_level':
                    return playerData.level >= (condition.value as number);
                case 'trophy_count':
                    return playerData.trophies >= (condition.value as number);
                case 'arena':
                    return playerData.currentArena >= (condition.value as number);
                case 'card_collection':
                    return playerData.unlockedCards.length >= (condition.value as number);
                case 'achievement':
                    return playerData.completedAchievements.includes(condition.value as string);
                default:
                    return false;
            }
        });
    }
    
    public static getNextUnlocks(playerData: PlayerData, count: number = 3): Unlockable[] {
        const lockedItems = UNLOCK_PROGRESSION.filter(item => 
            !playerData.unlockedItems.includes(item.id)
        );
        
        return lockedItems
            .sort((a, b) => this.calculateUnlockDistance(a, playerData) - this.calculateUnlockDistance(b, playerData))
            .slice(0, count);
    }
    
    private static calculateUnlockDistance(unlockable: Unlockable, playerData: PlayerData): number {
        let totalDistance = 0;
        
        for (const condition of unlockable.conditions) {
            switch (condition.type) {
                case 'player_level':
                    totalDistance += Math.max(0, (condition.value as number) - playerData.level);
                    break;
                case 'trophy_count':
                    totalDistance += Math.max(0, (condition.value as number) - playerData.trophies) / 10;
                    break;
            }
        }
        
        return totalDistance;
    }
}
```

## 2. 경험치 및 레벨링

### 2.1 경험치 획득 방법
```typescript
// src/progression/ExperienceSystem.ts
export enum ExperienceSource {
    MATCH_WIN = 'match_win',
    MATCH_LOSS = 'match_loss',
    CARD_UPGRADE = 'card_upgrade',
    QUEST_COMPLETE = 'quest_complete',
    ACHIEVEMENT_UNLOCK = 'achievement_unlock',
    FIRST_WIN = 'first_win',
    DONATION = 'donation',
    SPECIAL_EVENT = 'special_event'
}

export interface ExperienceGain {
    source: ExperienceSource;
    baseAmount: number;
    multiplier?: number;
    bonusConditions?: BonusCondition[];
}

export const EXPERIENCE_VALUES: { [key in ExperienceSource]: ExperienceGain } = {
    [ExperienceSource.MATCH_WIN]: {
        source: ExperienceSource.MATCH_WIN,
        baseAmount: 20,
        bonusConditions: [
            { condition: 'perfect_game', bonus: 10, description: '완벽한 승리' },
            { condition: 'comeback_victory', bonus: 15, description: '역전승' }
        ]
    },
    [ExperienceSource.MATCH_LOSS]: {
        source: ExperienceSource.MATCH_LOSS,
        baseAmount: 5,
        bonusConditions: [
            { condition: 'close_match', bonus: 5, description: '박빙 승부' }
        ]
    },
    [ExperienceSource.CARD_UPGRADE]: {
        source: ExperienceSource.CARD_UPGRADE,
        baseAmount: 50,
        multiplier: 1.5, // 레어도에 따른 배수
        bonusConditions: [
            { condition: 'max_level', bonus: 100, description: '최대 레벨 달성' }
        ]
    },
    [ExperienceSource.QUEST_COMPLETE]: {
        source: ExperienceSource.QUEST_COMPLETE,
        baseAmount: 100
    },
    [ExperienceSource.FIRST_WIN]: {
        source: ExperienceSource.FIRST_WIN,
        baseAmount: 50
    },
    [ExperienceSource.DONATION]: {
        source: ExperienceSource.DONATION,
        baseAmount: 5
    }
};

export class ExperienceSystem {
    public static calculateExperienceGain(
        source: ExperienceSource,
        context?: ExperienceContext
    ): number {
        const expGain = EXPERIENCE_VALUES[source];
        let totalExp = expGain.baseAmount;
        
        // 기본 배수 적용
        if (expGain.multiplier && context?.multiplierValue) {
            totalExp *= (expGain.multiplier * context.multiplierValue);
        }
        
        // 보너스 조건 확인
        if (expGain.bonusConditions && context?.conditions) {
            for (const bonusCondition of expGain.bonusConditions) {
                if (context.conditions.includes(bonusCondition.condition)) {
                    totalExp += bonusCondition.bonus;
                }
            }
        }
        
        // 이벤트 배수 적용
        if (context?.eventMultiplier) {
            totalExp *= context.eventMultiplier;
        }
        
        return Math.floor(totalExp);
    }
    
    public static getRequiredExperience(level: number): number {
        // 레벨업에 필요한 경험치 계산 (지수 증가)
        const baseExp = 100;
        const growthFactor = 1.15;
        
        return Math.floor(baseExp * Math.pow(growthFactor, level - 1));
    }
    
    public static getTotalExperienceForLevel(targetLevel: number): number {
        let totalExp = 0;
        for (let level = 1; level < targetLevel; level++) {
            totalExp += this.getRequiredExperience(level);
        }
        return totalExp;
    }
    
    public static calculateLevelFromExperience(totalExp: number): { level: number, currentExp: number, requiredExp: number } {
        let currentLevel = 1;
        let expUsed = 0;
        
        while (true) {
            const requiredForNext = this.getRequiredExperience(currentLevel);
            
            if (expUsed + requiredForNext > totalExp) {
                break;
            }
            
            expUsed += requiredForNext;
            currentLevel++;
            
            if (currentLevel >= 50) break; // 최대 레벨 제한
        }
        
        const currentExp = totalExp - expUsed;
        const requiredExp = this.getRequiredExperience(currentLevel);
        
        return { level: currentLevel, currentExp, requiredExp };
    }
    
    public static getLevelUpRewards(level: number): Reward[] {
        const rewards: Reward[] = [
            { type: 'gold', amount: level * 100 + 500 }
        ];
        
        // 특별 레벨에서 추가 보상
        if (level % 5 === 0) {
            rewards.push({ type: 'gems', amount: Math.floor(level / 5) * 10 });
        }
        
        if (level % 10 === 0) {
            rewards.push({ type: 'card_pack', amount: 1, packType: 'silver' });
        }
        
        // 특정 레벨에서 특별 보상
        const specialRewards: { [level: number]: Reward[] } = {
            5: [{ type: 'gems', amount: 50 }],
            10: [{ type: 'card_pack', amount: 1, packType: 'gold' }],
            15: [{ type: 'gems', amount: 100 }],
            20: [{ type: 'card_pack', amount: 1, packType: 'magical' }],
            25: [{ type: 'gems', amount: 200 }],
            30: [{ type: 'card_pack', amount: 1, packType: 'super_magical' }],
            40: [{ type: 'gems', amount: 500 }],
            50: [
                { type: 'gems', amount: 1000 },
                { type: 'legendary_card', amount: 1 },
                { type: 'exclusive_emote', amount: 1 }
            ]
        };
        
        if (specialRewards[level]) {
            rewards.push(...specialRewards[level]);
        }
        
        return rewards;
    }
}

export interface ExperienceContext {
    multiplierValue?: number;
    conditions?: string[];
    eventMultiplier?: number;
}

export interface BonusCondition {
    condition: string;
    bonus: number;
    description: string;
}

export interface Reward {
    type: string;
    amount: number;
    packType?: string;
}
```

### 2.2 레벨업 보상
```typescript
// src/progression/LevelRewards.ts
export class LevelRewardSystem {
    private static readonly LEVEL_MILESTONES = [1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50];
    
    public static processLevelUp(oldLevel: number, newLevel: number): LevelUpResult {
        const rewards: Reward[] = [];
        const unlocks: Unlockable[] = [];
        
        for (let level = oldLevel + 1; level <= newLevel; level++) {
            // 기본 레벨업 보상
            rewards.push(...ExperienceSystem.getLevelUpRewards(level));
            
            // 해금 확인
            const levelUnlocks = this.checkLevelUnlocks(level);
            unlocks.push(...levelUnlocks);
        }
        
        return {
            oldLevel,
            newLevel,
            rewards,
            unlocks,
            isSignificantLevelUp: this.isSignificantLevelUp(newLevel)
        };
    }
    
    private static checkLevelUnlocks(level: number): Unlockable[] {
        return UNLOCK_PROGRESSION.filter(unlock => 
            unlock.conditions.some(condition => 
                condition.type === 'player_level' && condition.value === level
            )
        );
    }
    
    private static isSignificantLevelUp(level: number): boolean {
        return this.LEVEL_MILESTONES.includes(level);
    }
    
    public static getProgressToNextMilestone(currentLevel: number): MilestoneProgress {
        const nextMilestone = this.LEVEL_MILESTONES.find(milestone => milestone > currentLevel);
        
        if (!nextMilestone) {
            return {
                currentLevel,
                nextMilestone: 50,
                progress: 1.0,
                isMaxLevel: true
            };
        }
        
        const previousMilestone = this.LEVEL_MILESTONES
            .reverse()
            .find(milestone => milestone <= currentLevel) || 1;
        
        const progress = (currentLevel - previousMilestone) / (nextMilestone - previousMilestone);
        
        return {
            currentLevel,
            nextMilestone,
            progress: Math.min(1.0, Math.max(0.0, progress)),
            isMaxLevel: currentLevel >= 50
        };
    }
}

export interface LevelUpResult {
    oldLevel: number;
    newLevel: number;
    rewards: Reward[];
    unlocks: Unlockable[];
    isSignificantLevelUp: boolean;
}

export interface MilestoneProgress {
    currentLevel: number;
    nextMilestone: number;
    progress: number;
    isMaxLevel: boolean;
}
```

### 2.3 새로운 능력 해제
```typescript
// src/progression/FeatureUnlocks.ts
export interface Feature {
    id: string;
    name: string;
    description: string;
    unlockLevel: number;
    category: 'gameplay' | 'social' | 'progression' | 'customization';
    tutorial?: string;
    icon: string;
}

export const FEATURE_UNLOCKS: Feature[] = [
    {
        id: 'deck_slots',
        name: '덱 슬롯 확장',
        description: '추가 덱을 저장할 수 있는 슬롯이 해금됩니다.',
        unlockLevel: 5,
        category: 'gameplay',
        tutorial: 'deck_management_tutorial',
        icon: 'deck_icon'
    },
    {
        id: 'clan_system',
        name: '클랜',
        description: '클랜에 가입하여 다른 플레이어들과 협력하세요.',
        unlockLevel: 8,
        category: 'social',
        tutorial: 'clan_tutorial',
        icon: 'clan_icon'
    },
    {
        id: 'friendly_battles',
        name: '친선 경기',
        description: '친구들과 연습 경기를 할 수 있습니다.',
        unlockLevel: 6,
        category: 'social',
        tutorial: 'friendly_battle_tutorial',
        icon: 'friendly_battle_icon'
    },
    {
        id: 'spectator_mode',
        name: '관전 모드',
        description: '다른 플레이어의 경기를 관전할 수 있습니다.',
        unlockLevel: 10,
        category: 'social',
        icon: 'spectator_icon'
    },
    {
        id: 'tournaments',
        name: '토너먼트',
        description: '토너먼트에 참가하여 특별한 보상을 획득하세요.',
        unlockLevel: 12,
        category: 'gameplay',
        tutorial: 'tournament_tutorial',
        icon: 'tournament_icon'
    },
    {
        id: 'emotes',
        name: '이모티콘',
        description: '경기 중 이모티콘으로 감정을 표현하세요.',
        unlockLevel: 3,
        category: 'customization',
        tutorial: 'emotes_tutorial',
        icon: 'emote_icon'
    },
    {
        id: 'statistics',
        name: '통계',
        description: '자세한 게임 통계를 확인할 수 있습니다.',
        unlockLevel: 15,
        category: 'progression',
        icon: 'stats_icon'
    },
    {
        id: 'replays',
        name: '리플레이',
        description: '경기 리플레이를 저장하고 시청할 수 있습니다.',
        unlockLevel: 18,
        category: 'progression',
        tutorial: 'replay_tutorial',
        icon: 'replay_icon'
    }
];

export class FeatureUnlockSystem {
    public static getUnlockedFeatures(playerLevel: number): Feature[] {
        return FEATURE_UNLOCKS.filter(feature => feature.unlockLevel <= playerLevel);
    }
    
    public static getNextFeatureUnlocks(playerLevel: number, count: number = 3): Feature[] {
        return FEATURE_UNLOCKS
            .filter(feature => feature.unlockLevel > playerLevel)
            .sort((a, b) => a.unlockLevel - b.unlockLevel)
            .slice(0, count);
    }
    
    public static processFeatureUnlock(feature: Feature): FeatureUnlockResult {
        // 튜토리얼 시작
        if (feature.tutorial) {
            TutorialManager.instance.startTutorial(feature.tutorial);
        }
        
        // 알림 표시
        NotificationManager.instance.showFeatureUnlock(feature);
        
        // 분석 이벤트
        AnalyticsManager.instance.trackEvent('feature_unlocked', {
            feature_id: feature.id,
            feature_name: feature.name,
            unlock_level: feature.unlockLevel,
            category: feature.category
        });
        
        return {
            feature,
            hasTutorial: !!feature.tutorial,
            shouldShowNotification: true
        };
    }
}

export interface FeatureUnlockResult {
    feature: Feature;
    hasTutorial: boolean;
    shouldShowNotification: boolean;
}
```

## 3. 트로피 시스템

### 3.1 트로피 획득/손실
```typescript
// src/progression/TrophyProgression.ts
export class TrophyProgression {
    public static calculateTrophyProgression(
        currentTrophies: number,
        matchResult: 'win' | 'loss',
        opponentTrophies: number
    ): TrophyChangeResult {
        
        const calculation: TrophyCalculation = {
            baseTrophy: currentTrophies,
            opponentTrophy: opponentTrophies,
            playerLevel: 0, // 실제로는 플레이어 데이터에서 가져옴
            opponentLevel: 0,
            winProbability: EloSystem.calculateWinProbability(currentTrophies, opponentTrophies),
            result: matchResult
        };
        
        const trophyChange = TrophySystem.calculateTrophyChange(calculation);
        const newTrophies = Math.max(0, currentTrophies + trophyChange);
        
        // 아레나 변경 확인
        const oldArena = TrophySystem.getArenaFromTrophies(currentTrophies);
        const newArena = TrophySystem.getArenaFromTrophies(newTrophies);
        const arenaChanged = oldArena.name !== newArena.name;
        
        // 리그 변경 확인
        const oldLeague = LeagueSystem.getLeagueFromTrophies(currentTrophies);
        const newLeague = LeagueSystem.getLeagueFromTrophies(newTrophies);
        const leagueChanged = oldLeague.type !== newLeague.type;
        
        return {
            oldTrophies: currentTrophies,
            newTrophies: newTrophies,
            trophyChange: trophyChange,
            oldArena: oldArena,
            newArena: newArena,
            arenaChanged: arenaChanged,
            oldLeague: oldLeague,
            newLeague: newLeague,
            leagueChanged: leagueChanged,
            seasonBest: newTrophies > currentTrophies ? newTrophies : undefined
        };
    }
    
    public static getArenaProgression(): ArenaProgression[] {
        return [
            {
                arenaId: 0,
                name: '트레이닝 캠프',
                minTrophies: 0,
                maxTrophies: 399,
                unlockedCards: ['knight', 'archer', 'goblins', 'giant', 'wizard'],
                rewards: { gold: 3, cards: 1 },
                theme: 'training',
                description: '게임의 기초를 배우는 곳입니다.'
            },
            {
                arenaId: 1,
                name: '고블린 스타디움',
                minTrophies: 400,
                maxTrophies: 799,
                unlockedCards: ['spear_goblins', 'baby_dragon', 'witch'],
                rewards: { gold: 6, cards: 2 },
                theme: 'goblin',
                description: '고블린들의 본거지입니다.'
            },
            {
                arenaId: 2,
                name: '본 핏',
                minTrophies: 800,
                maxTrophies: 1199,
                unlockedCards: ['skeleton_army', 'tombstone', 'bomb_tower'],
                rewards: { gold: 9, cards: 3 },
                theme: 'bone',
                description: '해골들이 춤추는 무시무시한 아레나입니다.'
            }
            // ... 추가 아레나들
        ];
    }
    
    public static getTrophyMilestones(): TrophyMilestone[] {
        return [
            { trophies: 1000, reward: { type: 'gems', amount: 100 }, title: '브론즈 마스터' },
            { trophies: 2000, reward: { type: 'legendary_card', amount: 1 }, title: '실버 마스터' },
            { trophies: 3000, reward: { type: 'gems', amount: 500 }, title: '골드 마스터' },
            { trophies: 4000, reward: { type: 'exclusive_emote', amount: 1 }, title: '플래티넘 마스터' },
            { trophies: 5000, reward: { type: 'gems', amount: 1000 }, title: '다이아몬드 마스터' },
            { trophies: 6000, reward: { type: 'legendary_chest', amount: 1 }, title: '마스터' },
            { trophies: 7000, reward: { type: 'gems', amount: 2000 }, title: '그랜드마스터' },
            { trophies: 8000, reward: { type: 'ultimate_champion_chest', amount: 1 }, title: '얼티메이트 챔피언' }
        ];
    }
}

export interface TrophyChangeResult {
    oldTrophies: number;
    newTrophies: number;
    trophyChange: number;
    oldArena: Arena;
    newArena: Arena;
    arenaChanged: boolean;
    oldLeague: League;
    newLeague: League;
    leagueChanged: boolean;
    seasonBest?: number;
}

export interface ArenaProgression {
    arenaId: number;
    name: string;
    minTrophies: number;
    maxTrophies: number;
    unlockedCards: string[];
    rewards: { gold: number; cards: number };
    theme: string;
    description: string;
}

export interface TrophyMilestone {
    trophies: number;
    reward: Reward;
    title: string;
}
```

### 3.2 아레나 시스템
```typescript
// src/progression/ArenaSystem.ts
export class ArenaSystem {
    private static readonly ARENA_BACKGROUNDS = [
        'training_camp_bg', 'goblin_stadium_bg', 'bone_pit_bg', 'barbarian_bowl_bg',
        'pekka_playhouse_bg', 'spell_valley_bg', 'builders_workshop_bg', 'royal_stadium_bg',
        'frozen_peak_bg', 'jungle_arena_bg', 'hog_mountain_bg', 'electro_valley_bg',
        'spiky_stadium_bg', 'ladder_tournament_bg', 'royal_championship_bg'
    ];
    
    public static getArenaRewards(arenaLevel: number): ArenaRewards {
        const baseGold = 50 + (arenaLevel * 25);
        const baseCards = 1 + Math.floor(arenaLevel / 3);
        
        return {
            victoryGold: baseGold,
            victoryCards: baseCards,
            chestUpgradeChance: Math.min(0.1 + (arenaLevel * 0.02), 0.5),
            specialChestChance: Math.min(0.05 + (arenaLevel * 0.01), 0.2),
            gemBonusChance: arenaLevel >= 10 ? 0.1 : 0
        };
    }
    
    public static processArenaPromotion(
        oldArena: Arena,
        newArena: Arena,
        playerId: string
    ): ArenaPromotionResult {
        const rewards: Reward[] = [
            { type: 'gold', amount: 1000 + (newArena.minTrophies / 10) },
            { type: 'gems', amount: 50 + (newArena.minTrophies / 100) }
        ];
        
        // 새로 해금된 카드
        const newCards = this.getArenaUnlockCards(newArena.name);
        
        // 특별 보상 (특정 아레나)
        const specialRewards = this.getSpecialArenaRewards(newArena.name);
        if (specialRewards.length > 0) {
            rewards.push(...specialRewards);
        }
        
        // 아레나 승급 애니메이션 및 효과
        this.playArenaPromotionAnimation(oldArena, newArena);
        
        AnalyticsManager.instance.trackEvent('arena_promotion', {
            player_id: playerId,
            old_arena: oldArena.name,
            new_arena: newArena.name,
            new_trophy_count: newArena.minTrophies
        });
        
        return {
            oldArena,
            newArena,
            rewards,
            newCards,
            hasSpecialRewards: specialRewards.length > 0
        };
    }
    
    private static getArenaUnlockCards(arenaName: string): string[] {
        const arenaCardUnlocks: { [arena: string]: string[] } = {
            '고블린 스타디움': ['spear_goblins', 'baby_dragon'],
            '본 핏': ['skeleton_army', 'witch', 'tombstone'],
            '바바리안 볼': ['barbarians', 'rage', 'hog_rider'],
            'P.E.K.K.A 플레이하우스': ['pekka', 'minion_horde', 'heal'],
            '스펠 밸리': ['freeze', 'valkyrie', 'musketeer'],
            '빌더스 워크샵': ['x_bow', 'fireball', 'tesla'],
            '로얄 스타디움': ['royal_giant', 'elite_barbarians', 'mirror'],
            '프로즌 피크': ['ice_wizard', 'tornado', 'clone'],
            '정글 아레나': ['lumberjack', 'poison', 'graveyard'],
            '호그 마운틴': ['miner', 'princess', 'ice_spirit'],
            '일렉트로 밸리': ['electro_wizard', 'inferno_dragon', 'sparky'],
            '스피키 스타디움': ['mega_knight', 'bandit', 'night_witch'],
            '래더 토너먼트': ['ghost', 'royal_recruits', 'magic_archer'],
            '로얄 챔피언십': ['champion_cards'] // 특별 챔피언 카드들
        };
        
        return arenaCardUnlocks[arenaName] || [];
    }
    
    private static getSpecialArenaRewards(arenaName: string): Reward[] {
        const specialRewards: { [arena: string]: Reward[] } = {
            '스펠 밸리': [{ type: 'magical_chest', amount: 1 }],
            '로얄 스타디움': [{ type: 'super_magical_chest', amount: 1 }],
            '호그 마운틴': [{ type: 'legendary_chest', amount: 1 }],
            '로얄 챔피언십': [
                { type: 'legendary_chest', amount: 2 },
                { type: 'exclusive_tower_skin', amount: 1 }
            ]
        };
        
        return specialRewards[arenaName] || [];
    }
    
    public static canDropFromArena(currentArena: Arena, newTrophies: number): boolean {
        // 특정 아레나 이하로는 떨어지지 않음 (보호 시스템)
        const protectedArenas = [
            '트레이닝 캠프', '고블린 스타디움', '본 핏', '바바리안 볼'
        ];
        
        if (protectedArenas.includes(currentArena.name)) {
            return false;
        }
        
        // 레전드 아레나는 시즌 리셋 시에만 떨어짐
        if (currentArena.name === '로얄 챔피언십') {
            return false;
        }
        
        return true;
    }
}

export interface ArenaRewards {
    victoryGold: number;
    victoryCards: number;
    chestUpgradeChance: number;
    specialChestChance: number;
    gemBonusChance: number;
}

export interface ArenaPromotionResult {
    oldArena: Arena;
    newArena: Arena;
    rewards: Reward[];
    newCards: string[];
    hasSpecialRewards: boolean;
}
```

### 3.3 시즌 보상
```typescript
// src/progression/SeasonRewards.ts
export class SeasonRewardSystem {
    public static calculateSeasonEndRewards(finalTrophies: number, seasonBest: number): SeasonEndRewards {
        const league = LeagueSystem.getLeagueFromTrophies(seasonBest); // 시즌 최고 기록 기준
        const division = LeagueSystem.getDivisionFromTrophies(seasonBest, league);
        
        const baseRewards = [...league.seasonRewards];
        
        // 디비전 보너스
        const divisionBonus = this.getDivisionBonus(division, league);
        if (divisionBonus.length > 0) {
            baseRewards.push(...divisionBonus);
        }
        
        // 시즌 베스트 보너스
        const bestTrophyBonus = this.getBestTrophyBonus(seasonBest);
        if (bestTrophyBonus.length > 0) {
            baseRewards.push(...bestTrophyBonus);
        }
        
        // 드래프트 체스트 (레전드 리그만)
        let draftChestTiers = 0;
        if (league.type === LeagueType.LEGEND) {
            draftChestTiers = this.calculateDraftChestTiers(seasonBest);
        }
        
        return {
            league: league,
            division: division,
            seasonBest: seasonBest,
            finalTrophies: finalTrophies,
            resetTrophies: SeasonManager.calculateSeasonReset(finalTrophies),
            rewards: baseRewards,
            draftChestTiers: draftChestTiers,
            leagueIcon: this.getLeagueIcon(league, division),
            title: this.getSeasonTitle(league, division)
        };
    }
    
    private static getDivisionBonus(division: number, league: League): Reward[] {
        if (league.divisions === 1) return [];
        
        const bonusPerDivision = {
            [LeagueType.BRONZE]: { gold: 500, gems: 10 },
            [LeagueType.SILVER]: { gold: 1000, gems: 25 },
            [LeagueType.GOLD]: { gold: 2000, gems: 50 },
            [LeagueType.PLATINUM]: { gold: 3000, gems: 100 },
            [LeagueType.DIAMOND]: { gold: 5000, gems: 200 },
            [LeagueType.MASTER]: { gold: 10000, gems: 500 }
        };
        
        const bonus = bonusPerDivision[league.type];
        if (!bonus) return [];
        
        return [
            { type: 'gold', amount: bonus.gold * division },
            { type: 'gems', amount: bonus.gems * division }
        ];
    }
    
    private static getBestTrophyBonus(seasonBest: number): Reward[] {
        const bonusTiers = [
            { threshold: 10000, reward: { type: 'legendary_chest', amount: 3 } },
            { threshold: 9000, reward: { type: 'legendary_chest', amount: 2 } },
            { threshold: 8000, reward: { type: 'legendary_chest', amount: 1 } },
            { threshold: 7500, reward: { type: 'magical_chest', amount: 3 } },
            { threshold: 7000, reward: { type: 'magical_chest', amount: 2 } },
            { threshold: 6500, reward: { type: 'magical_chest', amount: 1 } }
        ];
        
        for (const tier of bonusTiers) {
            if (seasonBest >= tier.threshold) {
                return [tier.reward as Reward];
            }
        }
        
        return [];
    }
    
    private static calculateDraftChestTiers(seasonBest: number): number {
        // 레전드 리그 트로피에 따른 드래프트 체스트 티어 계산
        const baseTrophies = 7000;
        const tierSize = 300;
        
        if (seasonBest < baseTrophies) return 0;
        
        return Math.min(10, Math.floor((seasonBest - baseTrophies) / tierSize) + 1);
    }
    
    public static generateDraftChestChoices(tiers: number): DraftChestChoice[] {
        const choices: DraftChestChoice[] = [];
        
        for (let tier = 1; tier <= tiers; tier++) {
            const tierRewards = this.generateTierRewards(tier);
            choices.push({
                tier: tier,
                options: tierRewards,
                canSelect: 1 // 각 티어에서 1개씩 선택
            });
        }
        
        return choices;
    }
    
    private static generateTierRewards(tier: number): Reward[] {
        const baseRewards: Reward[][] = [
            // 낮은 티어 보상들
            [
                { type: 'gold', amount: 5000 },
                { type: 'gems', amount: 250 },
                { type: 'epic_card', amount: 10 }
            ],
            // 중간 티어 보상들
            [
                { type: 'gold', amount: 10000 },
                { type: 'legendary_card', amount: 1 },
                { type: 'magical_chest', amount: 1 }
            ],
            // 높은 티어 보상들
            [
                { type: 'gems', amount: 1000 },
                { type: 'legendary_chest', amount: 1 },
                { type: 'exclusive_emote', amount: 1 }
            ]
        ];
        
        const rewardIndex = Math.min(Math.floor((tier - 1) / 3), baseRewards.length - 1);
        return baseRewards[rewardIndex];
    }
    
    public static getSeasonProgressRewards(): SeasonProgressReward[] {
        return [
            {
                tier: 1,
                trophyRequirement: 4000,
                reward: { type: 'gold', amount: 1000 },
                title: 'Challenger I'
            },
            {
                tier: 2,
                trophyRequirement: 4300,
                reward: { type: 'gems', amount: 50 },
                title: 'Challenger II'
            },
            {
                tier: 3,
                trophyRequirement: 4600,
                reward: { type: 'magical_chest', amount: 1 },
                title: 'Challenger III'
            },
            {
                tier: 4,
                trophyRequirement: 5000,
                reward: { type: 'legendary_card', amount: 1 },
                title: 'Master I'
            },
            {
                tier: 5,
                trophyRequirement: 5300,
                reward: { type: 'gems', amount: 100 },
                title: 'Master II'
            },
            {
                tier: 6,
                trophyRequirement: 5600,
                reward: { type: 'legendary_chest', amount: 1 },
                title: 'Master III'
            },
            {
                tier: 7,
                trophyRequirement: 6000,
                reward: { type: 'gems', amount: 250 },
                title: 'Champion'
            },
            {
                tier: 8,
                trophyRequirement: 6300,
                reward: { type: 'ultimate_champion_chest', amount: 1 },
                title: 'Grand Champion'
            },
            {
                tier: 9,
                trophyRequirement: 6600,
                reward: { type: 'gems', amount: 500 },
                title: 'Royal Champion'
            },
            {
                tier: 10,
                trophyRequirement: 7000,
                reward: { type: 'legendary_chest', amount: 2 },
                title: 'Ultimate Champion'
            }
        ];
    }
}

export interface SeasonEndRewards {
    league: League;
    division: number;
    seasonBest: number;
    finalTrophies: number;
    resetTrophies: number;
    rewards: Reward[];
    draftChestTiers: number;
    leagueIcon: string;
    title: string;
}

export interface DraftChestChoice {
    tier: number;
    options: Reward[];
    canSelect: number;
}

export interface SeasonProgressReward {
    tier: number;
    trophyRequirement: number;
    reward: Reward;
    title: string;
}
```

이 진행 시스템 설계는 클래시 로얄의 깊이 있는 진행 메커니즘을 기반으로 하면서도, 현대적인 게임 설계 원칙과 플레이어 유지 전략을 통합한 포괄적인 시스템입니다.