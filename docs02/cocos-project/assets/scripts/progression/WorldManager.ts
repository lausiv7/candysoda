/**
 * [의도] Sweet Puzzle 게임의 월드맵 시스템을 전담 관리
 * [책임] 월드 데이터 관리, 월드간 내비게이션, 테마 적용, 월드별 특수 기능
 */

import { _decorator, Component } from 'cc';
import { WorldTheme, WorldInfo } from './ProgressionManager';

const { ccclass } = _decorator;

// 월드별 특수 기능
export enum WorldFeature {
    DAILY_BONUS = 'daily_bonus',         // 일일 보너스
    SPECIAL_BLOCKS = 'special_blocks',   // 특수 블록
    TIME_CHALLENGE = 'time_challenge',   // 시간 도전
    BOSS_BATTLE = 'boss_battle',         // 보스 전투
    COLLECTIBLES = 'collectibles',       // 수집품
    POWER_UPS = 'power_ups'             // 파워업
}

// 월드 테마 설정
export interface WorldThemeConfig {
    theme: WorldTheme;
    displayName: string;
    description: string;
    
    // 시각적 설정
    backgroundImage: string;
    backgroundMusic: string;
    ambientSounds: string[];
    colorPalette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
    
    // 블록 스킨
    blockSkins: {
        [key: string]: string; // blockType -> spriteFrame path
    };
    
    // 파티클 효과
    particleEffects: {
        match: string;
        combo: string;
        levelComplete: string;
    };
    
    // 특수 기능
    features: WorldFeature[];
    
    // 난이도 조정
    difficultyModifier: number; // 1.0 = 기본, 1.2 = 20% 어려움
}

// 월드 진행 단계
export enum WorldProgressStage {
    LOCKED = 'locked',           // 잠김
    UNLOCKED = 'unlocked',       // 해제됨
    IN_PROGRESS = 'in_progress', // 진행 중
    COMPLETED = 'completed',     // 완료
    MASTERED = 'mastered'        // 마스터 (모든 3성)
}

// 월드 성취도
export interface WorldAchievement {
    id: string;
    name: string;
    description: string;
    condition: string;
    reward: { coins: number; gems: number; special?: string };
    isUnlocked: boolean;
    unlockedAt?: number;
}

@ccclass('WorldManager')
export class WorldManager extends Component {
    
    private worlds: Map<string, WorldInfo> = new Map();
    private worldThemes: Map<WorldTheme, WorldThemeConfig> = new Map();
    private worldAchievements: Map<string, WorldAchievement[]> = new Map();
    
    private currentWorldId: string = 'world_1';
    private isInitialized: boolean = false;
    
    /**
     * [의도] 월드 매니저 초기화
     */
    public initialize(worldsData: Map<string, WorldInfo>): void {\n        if (this.isInitialized) {\n            console.warn('[WorldManager] 이미 초기화됨');\n            return;\n        }\n        \n        this.worlds = new Map(worldsData);\n        this.initializeWorldThemes();\n        this.initializeWorldAchievements();\n        \n        this.isInitialized = true;\n        console.log(`[WorldManager] 초기화 완료: ${this.worlds.size}개 월드 관리`);\n    }\n    \n    /**\n     * [의도] 월드 테마 설정 초기화\n     */\n    private initializeWorldThemes(): void {\n        // Sweet Farm 테마\n        this.worldThemes.set(WorldTheme.SWEET_FARM, {\n            theme: WorldTheme.SWEET_FARM,\n            displayName: '달콤한 농장',\n            description: '신선한 과일과 달콤한 사탕이 가득한 평화로운 농장',\n            backgroundImage: 'backgrounds/sweet_farm_bg',\n            backgroundMusic: 'music/sweet_farm_theme',\n            ambientSounds: ['sounds/birds', 'sounds/wind', 'sounds/farm'],\n            colorPalette: {\n                primary: '#FFB6C1',   // 라이트 핑크\n                secondary: '#FFC0CB', // 핑크\n                accent: '#F0E68C',    // 카키\n                background: '#FFE4E1' // 미스티 로즈\n            },\n            blockSkins: {\n                red_apple: 'blocks/farm/apple',\n                grape: 'blocks/farm/grape',\n                kiwi: 'blocks/farm/kiwi',\n                banana: 'blocks/farm/banana',\n                eggplant: 'blocks/farm/eggplant',\n                orange: 'blocks/farm/orange'\n            },\n            particleEffects: {\n                match: 'particles/farm_sparkle',\n                combo: 'particles/farm_explosion',\n                levelComplete: 'particles/farm_celebration'\n            },\n            features: [WorldFeature.DAILY_BONUS, WorldFeature.COLLECTIBLES],\n            difficultyModifier: 1.0\n        });\n        \n        // Chocolate Factory 테마\n        this.worldThemes.set(WorldTheme.CHOCOLATE_FACTORY, {\n            theme: WorldTheme.CHOCOLATE_FACTORY,\n            displayName: '초콜릿 공장',\n            description: '달콤한 초콜릿이 만들어지는 신비로운 공장',\n            backgroundImage: 'backgrounds/chocolate_factory_bg',\n            backgroundMusic: 'music/chocolate_factory_theme',\n            ambientSounds: ['sounds/machinery', 'sounds/steam', 'sounds/chocolate'],\n            colorPalette: {\n                primary: '#8B4513',   // 새들 브라운\n                secondary: '#A0522D', // 시에나\n                accent: '#CD853F',    // 페루\n                background: '#D2691E' // 초콜릿\n            },\n            blockSkins: {\n                red_apple: 'blocks/factory/chocolate_apple',\n                grape: 'blocks/factory/chocolate_grape',\n                kiwi: 'blocks/factory/chocolate_kiwi',\n                banana: 'blocks/factory/chocolate_banana',\n                eggplant: 'blocks/factory/chocolate_eggplant',\n                orange: 'blocks/factory/chocolate_orange'\n            },\n            particleEffects: {\n                match: 'particles/chocolate_melt',\n                combo: 'particles/chocolate_splash',\n                levelComplete: 'particles/chocolate_fountain'\n            },\n            features: [WorldFeature.SPECIAL_BLOCKS, WorldFeature.POWER_UPS],\n            difficultyModifier: 1.2\n        });\n        \n        // Ice Cream Parlor 테마\n        this.worldThemes.set(WorldTheme.ICE_CREAM_PARLOR, {\n            theme: WorldTheme.ICE_CREAM_PARLOR,\n            displayName: '아이스크림 가게',\n            description: '시원하고 달콤한 아이스크림의 천국',\n            backgroundImage: 'backgrounds/ice_cream_parlor_bg',\n            backgroundMusic: 'music/ice_cream_parlor_theme',\n            ambientSounds: ['sounds/ice_machine', 'sounds/customers', 'sounds/bell'],\n            colorPalette: {\n                primary: '#87CEEB',   // 스카이 블루\n                secondary: '#ADD8E6', // 라이트 블루\n                accent: '#F0F8FF',    // 앨리스 블루\n                background: '#E0FFFF' // 라이트 시안\n            },\n            blockSkins: {\n                red_apple: 'blocks/parlor/strawberry_ice',\n                grape: 'blocks/parlor/grape_ice',\n                kiwi: 'blocks/parlor/kiwi_ice',\n                banana: 'blocks/parlor/banana_ice',\n                eggplant: 'blocks/parlor/blueberry_ice',\n                orange: 'blocks/parlor/orange_ice'\n            },\n            particleEffects: {\n                match: 'particles/ice_sparkle',\n                combo: 'particles/ice_explosion',\n                levelComplete: 'particles/ice_celebration'\n            },\n            features: [WorldFeature.TIME_CHALLENGE, WorldFeature.SPECIAL_BLOCKS],\n            difficultyModifier: 1.3\n        });\n        \n        // Candy Castle 테마\n        this.worldThemes.set(WorldTheme.CANDY_CASTLE, {\n            theme: WorldTheme.CANDY_CASTLE,\n            displayName: '사탕 성',\n            description: '마법같은 사탕으로 만들어진 환상의 성',\n            backgroundImage: 'backgrounds/candy_castle_bg',\n            backgroundMusic: 'music/candy_castle_theme',\n            ambientSounds: ['sounds/magic', 'sounds/castle', 'sounds/fairy'],\n            colorPalette: {\n                primary: '#FF69B4',   // 핫 핑크\n                secondary: '#FF1493', // 딥 핑크\n                accent: '#FFB6C1',    // 라이트 핑크\n                background: '#FFF0F5' // 라벤더 블러쉬\n            },\n            blockSkins: {\n                red_apple: 'blocks/castle/ruby_candy',\n                grape: 'blocks/castle/amethyst_candy',\n                kiwi: 'blocks/castle/emerald_candy',\n                banana: 'blocks/castle/gold_candy',\n                eggplant: 'blocks/castle/sapphire_candy',\n                orange: 'blocks/castle/topaz_candy'\n            },\n            particleEffects: {\n                match: 'particles/magic_sparkle',\n                combo: 'particles/magic_explosion',\n                levelComplete: 'particles/magic_celebration'\n            },\n            features: [WorldFeature.BOSS_BATTLE, WorldFeature.POWER_UPS],\n            difficultyModifier: 1.5\n        });\n        \n        // Magical Forest 테마\n        this.worldThemes.set(WorldTheme.MAGICAL_FOREST, {\n            theme: WorldTheme.MAGICAL_FOREST,\n            displayName: '마법의 숲',\n            description: '신비로운 생물들과 마법의 열매가 자라는 숲',\n            backgroundImage: 'backgrounds/magical_forest_bg',\n            backgroundMusic: 'music/magical_forest_theme',\n            ambientSounds: ['sounds/forest', 'sounds/creatures', 'sounds/magic_nature'],\n            colorPalette: {\n                primary: '#228B22',   // 포레스트 그린\n                secondary: '#32CD32', // 라임 그린\n                accent: '#90EE90',    // 라이트 그린\n                background: '#F0FFF0' // 허니듀\n            },\n            blockSkins: {\n                red_apple: 'blocks/forest/magic_apple',\n                grape: 'blocks/forest/magic_grape',\n                kiwi: 'blocks/forest/magic_kiwi',\n                banana: 'blocks/forest/magic_banana',\n                eggplant: 'blocks/forest/magic_eggplant',\n                orange: 'blocks/forest/magic_orange'\n            },\n            particleEffects: {\n                match: 'particles/nature_sparkle',\n                combo: 'particles/nature_explosion',\n                levelComplete: 'particles/nature_celebration'\n            },\n            features: [WorldFeature.COLLECTIBLES, WorldFeature.BOSS_BATTLE, WorldFeature.TIME_CHALLENGE],\n            difficultyModifier: 1.4\n        });\n        \n        console.log(`[WorldManager] ${this.worldThemes.size}개 테마 초기화 완료`);\n    }\n    \n    /**\n     * [의도] 월드별 성취도 초기화\n     */\n    private initializeWorldAchievements(): void {\n        // World 1: Sweet Farm 성취도\n        this.worldAchievements.set('world_1', [\n            {\n                id: 'farm_newcomer',\n                name: '농장 새내기',\n                description: '첫 번째 레벨 완료',\n                condition: 'complete_level_1',\n                reward: { coins: 500, gems: 5 },\n                isUnlocked: false\n            },\n            {\n                id: 'farm_expert',\n                name: '농장 전문가',\n                description: '농장의 모든 레벨을 3성으로 완료',\n                condition: 'all_levels_3_star',\n                reward: { coins: 5000, gems: 50, special: 'farm_master_trophy' },\n                isUnlocked: false\n            },\n            {\n                id: 'fruit_collector',\n                name: '과일 수집가',\n                description: '농장에서 1000개의 과일 수집',\n                condition: 'collect_1000_fruits',\n                reward: { coins: 2000, gems: 20 },\n                isUnlocked: false\n            }\n        ]);\n        \n        // World 2: Chocolate Factory 성취도\n        this.worldAchievements.set('world_2', [\n            {\n                id: 'factory_worker',\n                name: '공장 직원',\n                description: '초콜릿 공장 첫 레벨 완료',\n                condition: 'complete_first_factory_level',\n                reward: { coins: 1000, gems: 10 },\n                isUnlocked: false\n            },\n            {\n                id: 'chocolate_master',\n                name: '초콜릿 마스터',\n                description: '공장의 모든 레벨을 완료',\n                condition: 'complete_all_factory_levels',\n                reward: { coins: 7500, gems: 75, special: 'chocolate_master_trophy' },\n                isUnlocked: false\n            }\n        ]);\n        \n        console.log(`[WorldManager] ${this.worldAchievements.size}개 월드의 성취도 초기화 완료`);\n    }\n    \n    /**\n     * [의도] 월드 정보 조회\n     */\n    public getWorldInfo(worldId: string): WorldInfo | null {\n        return this.worlds.get(worldId) || null;\n    }\n    \n    /**\n     * [의도] 월드 테마 설정 조회\n     */\n    public getWorldTheme(theme: WorldTheme): WorldThemeConfig | null {\n        return this.worldThemes.get(theme) || null;\n    }\n    \n    /**\n     * [의도] 월드의 현재 진행 단계 확인\n     */\n    public getWorldProgressStage(worldId: string, playerProgress: any): WorldProgressStage {\n        const worldInfo = this.worlds.get(worldId);\n        if (!worldInfo) return WorldProgressStage.LOCKED;\n        \n        const worldProgress = playerProgress.worldProgress?.get(worldId);\n        if (!worldProgress) return WorldProgressStage.LOCKED;\n        \n        if (!worldProgress.isUnlocked) {\n            return WorldProgressStage.LOCKED;\n        }\n        \n        if (worldProgress.isCompleted) {\n            // 모든 레벨이 3성인지 확인\n            const allThreeStars = worldProgress.starsEarned >= worldInfo.totalPossibleStars;\n            return allThreeStars ? WorldProgressStage.MASTERED : WorldProgressStage.COMPLETED;\n        }\n        \n        if (worldProgress.levelsCompleted > 0) {\n            return WorldProgressStage.IN_PROGRESS;\n        }\n        \n        return WorldProgressStage.UNLOCKED;\n    }\n    \n    /**\n     * [의도] 월드별 성취도 조회\n     */\n    public getWorldAchievements(worldId: string): WorldAchievement[] {\n        return this.worldAchievements.get(worldId) || [];\n    }\n    \n    /**\n     * [의도] 성취도 해제 확인\n     */\n    public checkAchievementUnlock(worldId: string, condition: string, playerData: any): WorldAchievement[] {\n        const achievements = this.worldAchievements.get(worldId) || [];\n        const newlyUnlocked: WorldAchievement[] = [];\n        \n        for (const achievement of achievements) {\n            if (!achievement.isUnlocked && this.evaluateAchievementCondition(achievement.condition, playerData)) {\n                achievement.isUnlocked = true;\n                achievement.unlockedAt = Date.now();\n                newlyUnlocked.push(achievement);\n                \n                console.log(`[WorldManager] 성취도 해제: ${achievement.name}`);\n            }\n        }\n        \n        return newlyUnlocked;\n    }\n    \n    /**\n     * [의도] 성취도 조건 평가\n     */\n    private evaluateAchievementCondition(condition: string, playerData: any): boolean {\n        // 실제로는 더 복잡한 조건 평가 로직이 필요\n        // 현재는 간단한 예시만 구현\n        \n        switch (condition) {\n            case 'complete_level_1':\n                return playerData.completedLevels?.includes('world_1_level_01') || false;\n                \n            case 'all_levels_3_star':\n                // 해당 월드의 모든 레벨이 3성인지 확인\n                return false; // TODO: 구현 필요\n                \n            case 'collect_1000_fruits':\n                return (playerData.fruitsCollected || 0) >= 1000;\n                \n            default:\n                return false;\n        }\n    }\n    \n    /**\n     * [의도] 현재 월드 설정\n     */\n    public setCurrentWorld(worldId: string): boolean {\n        if (!this.worlds.has(worldId)) {\n            console.error(`[WorldManager] 존재하지 않는 월드: ${worldId}`);\n            return false;\n        }\n        \n        this.currentWorldId = worldId;\n        console.log(`[WorldManager] 현재 월드 변경: ${worldId}`);\n        return true;\n    }\n    \n    /**\n     * [의도] 현재 월드 조회\n     */\n    public getCurrentWorldId(): string {\n        return this.currentWorldId;\n    }\n    \n    /**\n     * [의도] 월드 내비게이션 (이전/다음 월드)\n     */\n    public getAdjacentWorlds(worldId: string): { previous?: string; next?: string } {\n        const worldIds = Array.from(this.worlds.keys()).sort();\n        const currentIndex = worldIds.indexOf(worldId);\n        \n        if (currentIndex === -1) {\n            return {};\n        }\n        \n        return {\n            previous: currentIndex > 0 ? worldIds[currentIndex - 1] : undefined,\n            next: currentIndex < worldIds.length - 1 ? worldIds[currentIndex + 1] : undefined\n        };\n    }\n    \n    /**\n     * [의도] 월드별 통계 조회\n     */\n    public getWorldStatistics(worldId: string, playerProgress: any): {\n        progressStage: WorldProgressStage;\n        completionPercentage: number;\n        starsPercentage: number;\n        averageScore: number;\n        totalPlayTime: number;\n        achievementsUnlocked: number;\n        totalAchievements: number;\n    } {\n        const worldInfo = this.worlds.get(worldId);\n        const worldProgress = playerProgress.worldProgress?.get(worldId);\n        const achievements = this.worldAchievements.get(worldId) || [];\n        \n        if (!worldInfo || !worldProgress) {\n            return {\n                progressStage: WorldProgressStage.LOCKED,\n                completionPercentage: 0,\n                starsPercentage: 0,\n                averageScore: 0,\n                totalPlayTime: 0,\n                achievementsUnlocked: 0,\n                totalAchievements: achievements.length\n            };\n        }\n        \n        const progressStage = this.getWorldProgressStage(worldId, playerProgress);\n        const completionPercentage = (worldProgress.levelsCompleted / worldInfo.totalLevels) * 100;\n        const starsPercentage = (worldProgress.starsEarned / worldInfo.totalPossibleStars) * 100;\n        const achievementsUnlocked = achievements.filter(a => a.isUnlocked).length;\n        \n        return {\n            progressStage,\n            completionPercentage,\n            starsPercentage,\n            averageScore: worldProgress.bestScore,\n            totalPlayTime: worldProgress.totalPlayTime,\n            achievementsUnlocked,\n            totalAchievements: achievements.length\n        };\n    }\n    \n    /**\n     * [의도] 모든 월드 목록 조회 (정렬된)\n     */\n    public getAllWorldsSorted(): WorldInfo[] {\n        return Array.from(this.worlds.values())\n            .sort((a, b) => a.id.localeCompare(b.id));\n    }\n}