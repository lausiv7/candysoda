/**
 * [의도] Sweet Puzzle 게임의 전체 진행 시스템을 통합 관리하는 중앙 오케스트레이터
 * [책임] 레벨 진행, 월드 관리, 플레이어 데이터, 보상 시스템을 총괄하여 일관된 게임 경험 제공
 */

import { _decorator, Component } from 'cc';
import { LevelManager, LevelConfig, LevelResult, LevelRecord } from './LevelManager';

const { ccclass } = _decorator;

// 월드 테마 정의
export enum WorldTheme {
    SWEET_FARM = 'sweet_farm',
    CHOCOLATE_FACTORY = 'chocolate_factory',
    ICE_CREAM_PARLOR = 'ice_cream_parlor',
    CANDY_CASTLE = 'candy_castle',
    MAGICAL_FOREST = 'magical_forest'
}

// 월드 정보 인터페이스
export interface WorldInfo {
    id: string;
    name: string;
    description: string;
    theme: WorldTheme;
    
    // 진행 정보
    totalLevels: number;
    unlockedLevels: number;
    completedLevels: number;
    starsCollected: number;
    totalPossibleStars: number;
    
    // 잠금 해제 조건
    unlockRequirements?: {
        previousWorldId?: string;
        minStarsRequired?: number;
        specialCondition?: string;
    };
    
    // 시각적 설정
    backgroundImage: string;
    musicTrack: string;
    colorPalette: string[];
    
    // 보상
    unlockReward?: { coins: number; gems: number; items?: string[] };
    completionReward?: { coins: number; gems: number; special?: string };
}

// 플레이어 진행 상황
export interface PlayerProgress {
    // 기본 정보
    playerId: string;
    playerName: string;
    level: number;
    experience: number;
    
    // 재화
    coins: number;
    gems: number;
    
    // 게임 진행
    currentWorld: string;
    currentLevel: number;
    totalStars: number;
    totalScore: number;
    
    // 통계
    totalPlayTime: number; // 분 단위
    gamesPlayed: number;
    averageStars: number;
    
    // 월드별 진행 상황
    worldProgress: Map<string, WorldProgress>;
    
    // 최근 플레이
    lastPlayedAt: number;
    lastCompletedLevel: string;
    
    // 설정
    preferences: PlayerPreferences;
}

export interface WorldProgress {
    worldId: string;
    isUnlocked: boolean;
    isCompleted: boolean;
    starsEarned: number;
    levelsCompleted: number;
    bestScore: number;
    totalPlayTime: number;
    unlockedAt?: number;
    completedAt?: number;
}

export interface PlayerPreferences {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
    language: string;
    difficulty: 'easy' | 'normal' | 'hard';
}

// 게임 세션 정보
export interface GameSession {
    sessionId: string;
    levelId: string;
    startTime: number;
    endTime?: number;
    result?: LevelResult;
    status: 'playing' | 'completed' | 'failed' | 'abandoned';
}

@ccclass('ProgressionManager')
export class ProgressionManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: ProgressionManager;
    
    // 매니저 참조
    private levelManager: LevelManager = null!;
    
    // 게임 데이터
    private worlds: Map<string, WorldInfo> = new Map();
    private playerProgress: PlayerProgress = null!;
    private currentSession: GameSession | null = null;
    
    // 상태 관리
    private isInitialized: boolean = false;
    private dataVersion: string = '1.0.0';
    
    /**
     * [의도] 싱글톤 인스턴스 반환
     */
    public static getInstance(): ProgressionManager {
        if (!this.instance) {
            console.error('[ProgressionManager] 인스턴스가 생성되지 않았습니다. initialize()를 먼저 호출하세요.');
        }
        return this.instance;
    }
    
    /**
     * [의도] 진행 시스템 초기화
     */
    public initialize(levelManager: LevelManager): void {
        if (this.isInitialized) {
            console.warn('[ProgressionManager] 이미 초기화됨');
            return;
        }
        
        ProgressionManager.instance = this;
        this.levelManager = levelManager;
        
        this.initializeWorlds();
        this.loadPlayerProgress();
        this.validateGameState();
        
        this.isInitialized = true;
        console.log('[ProgressionManager] 초기화 완료');
    }
    
    /**
     * [의도] 월드 정보 초기화
     */
    private initializeWorlds(): void {
        console.log('[ProgressionManager] 월드 정보 초기화 중...');
        
        // World 1: Sweet Farm
        this.worlds.set('world_1', {
            id: 'world_1',
            name: 'Sweet Farm',
            description: '달콤한 사탕 농장에서 첫 번째 모험을 시작하세요!',
            theme: WorldTheme.SWEET_FARM,
            totalLevels: 20,
            unlockedLevels: 1,
            completedLevels: 0,
            starsCollected: 0,
            totalPossibleStars: 60, // 20레벨 × 3성
            backgroundImage: 'world_1_bg',
            musicTrack: 'world_1_theme',
            colorPalette: ['#FFB6C1', '#FFC0CB', '#FFE4E1', '#F0E68C'],
            unlockReward: { coins: 0, gems: 0 }, // 첫 월드는 보상 없음
            completionReward: { coins: 5000, gems: 50, special: 'world_1_trophy' }
        });
        
        // World 2: Chocolate Factory
        this.worlds.set('world_2', {
            id: 'world_2',
            name: 'Chocolate Factory',
            description: '신비로운 초콜릿 공장의 달콤한 비밀을 풀어보세요!',
            theme: WorldTheme.CHOCOLATE_FACTORY,
            totalLevels: 25,
            unlockedLevels: 0,
            completedLevels: 0,
            starsCollected: 0,
            totalPossibleStars: 75, // 25레벨 × 3성
            unlockRequirements: {
                previousWorldId: 'world_1',
                minStarsRequired: 30 // World 1에서 30개 별 필요
            },
            backgroundImage: 'world_2_bg',
            musicTrack: 'world_2_theme',
            colorPalette: ['#8B4513', '#A0522D', '#D2691E', '#CD853F'],
            unlockReward: { coins: 2000, gems: 20 },
            completionReward: { coins: 10000, gems: 100, special: 'world_2_trophy' }
        });
        
        // World 3: Ice Cream Parlor (향후 확장)
        this.worlds.set('world_3', {
            id: 'world_3',
            name: 'Ice Cream Parlor',
            description: '시원한 아이스크림 가게에서 여름을 만끽하세요!',
            theme: WorldTheme.ICE_CREAM_PARLOR,
            totalLevels: 30,
            unlockedLevels: 0,
            completedLevels: 0,
            starsCollected: 0,
            totalPossibleStars: 90,
            unlockRequirements: {
                previousWorldId: 'world_2',
                minStarsRequired: 50
            },
            backgroundImage: 'world_3_bg',
            musicTrack: 'world_3_theme',
            colorPalette: ['#87CEEB', '#ADD8E6', '#E0FFFF', '#F0F8FF'],
            unlockReward: { coins: 3000, gems: 30 },
            completionReward: { coins: 15000, gems: 150, special: 'world_3_trophy' }
        });
        
        console.log(`[ProgressionManager] ${this.worlds.size}개 월드 초기화 완료`);
    }
    
    /**
     * [의도] 플레이어 진행 데이터 로드
     */
    private loadPlayerProgress(): void {
        // TODO: 실제로는 로컬 스토리지나 서버에서 데이터 로드
        // 현재는 기본값으로 초기화
        
        this.playerProgress = {
            playerId: 'player_' + Date.now(),
            playerName: 'Sweet Player',
            level: 1,
            experience: 0,
            coins: 1000, // 시작 코인
            gems: 10,    // 시작 젬
            currentWorld: 'world_1',
            currentLevel: 1,
            totalStars: 0,
            totalScore: 0,
            totalPlayTime: 0,
            gamesPlayed: 0,
            averageStars: 0,
            worldProgress: new Map(),
            lastPlayedAt: Date.now(),
            lastCompletedLevel: '',
            preferences: {
                soundEnabled: true,
                musicEnabled: true,
                vibrationEnabled: true,
                language: 'ko',
                difficulty: 'normal'
            }
        };
        
        // 월드별 진행 상황 초기화
        for (const worldInfo of this.worlds.values()) {
            this.playerProgress.worldProgress.set(worldInfo.id, {
                worldId: worldInfo.id,
                isUnlocked: worldInfo.id === 'world_1', // 첫 월드만 해제
                isCompleted: false,
                starsEarned: 0,
                levelsCompleted: 0,
                bestScore: 0,
                totalPlayTime: 0
            });
        }
        
        console.log('[ProgressionManager] 플레이어 진행 데이터 로드 완료');
    }
    
    /**
     * [의도] 게임 상태 검증 및 동기화
     */
    private validateGameState(): void {
        // 월드 해제 상태 업데이트
        this.updateWorldUnlockStatus();
        
        // 월드별 통계 업데이트
        this.updateWorldStatistics();
        
        console.log('[ProgressionManager] 게임 상태 검증 완료');
    }
    
    /**
     * [의도] 레벨 시작
     */\n    public startLevel(levelId: string): { success: boolean; error?: string; session?: GameSession } {\n        if (!this.isInitialized) {\n            return { success: false, error: '진행 시스템이 초기화되지 않음' };\n        }\n        \n        const levelConfig = this.levelManager.getLevelConfig(levelId);\n        if (!levelConfig) {\n            return { success: false, error: '레벨을 찾을 수 없음' };\n        }\n        \n        // 레벨 해제 여부 확인\n        if (!this.isLevelUnlocked(levelId)) {\n            return { success: false, error: '레벨이 잠겨있음' };\n        }\n        \n        // 기존 세션 정리\n        if (this.currentSession && this.currentSession.status === 'playing') {\n            this.abandonCurrentSession();\n        }\n        \n        // 새 세션 시작\n        this.currentSession = {\n            sessionId: 'session_' + Date.now(),\n            levelId: levelId,\n            startTime: Date.now(),\n            status: 'playing'\n        };\n        \n        // 레벨 매니저에 시작 알림\n        const levelStarted = this.levelManager.startLevel(levelId);\n        if (!levelStarted) {\n            this.currentSession = null;\n            return { success: false, error: '레벨 시작 실패' };\n        }\n        \n        console.log(`[ProgressionManager] 레벨 시작: ${levelConfig.name}`);\n        return { success: true, session: this.currentSession };\n    }\n    \n    /**\n     * [의도] 레벨 완료 처리\n     */\n    public completeLevel(result: LevelResult): {\n        success: boolean;\n        stars: number;\n        isNewRecord: boolean;\n        rewards: any;\n        unlockedContent?: { levels?: string[]; worlds?: string[] };\n    } {\n        if (!this.currentSession || this.currentSession.status !== 'playing') {\n            console.error('[ProgressionManager] 활성 세션이 없음');\n            return { success: false, stars: 0, isNewRecord: false, rewards: null };\n        }\n        \n        // 세션 완료 처리\n        this.currentSession.endTime = Date.now();\n        this.currentSession.result = result;\n        this.currentSession.status = result.completed ? 'completed' : 'failed';\n        \n        // 레벨 매니저에서 완료 처리\n        const completionResult = this.levelManager.completeLevel(result);\n        \n        // 플레이어 진행 데이터 업데이트\n        this.updatePlayerProgress(result, completionResult);\n        \n        // 새로운 콘텐츠 해제 확인\n        const unlockedContent = this.checkForNewUnlocks(result.levelId, completionResult.stars);\n        \n        // 데이터 저장\n        this.savePlayerProgress();\n        \n        // 세션 정리\n        this.currentSession = null;\n        \n        console.log(`[ProgressionManager] 레벨 완료: ${completionResult.stars}성, 신기록: ${completionResult.isNewRecord}`);\n        \n        return { \n            success: true, \n            ...completionResult,\n            unlockedContent \n        };\n    }\n    \n    /**\n     * [의도] 레벨 해제 여부 확인\n     */\n    public isLevelUnlocked(levelId: string): boolean {\n        return this.levelManager.isLevelUnlocked(levelId);\n    }\n    \n    /**\n     * [의도] 월드 해제 여부 확인\n     */\n    public isWorldUnlocked(worldId: string): boolean {\n        const worldProgress = this.playerProgress.worldProgress.get(worldId);\n        return worldProgress ? worldProgress.isUnlocked : false;\n    }\n    \n    /**\n     * [의도] 월드 정보 조회\n     */\n    public getWorldInfo(worldId: string): WorldInfo | null {\n        return this.worlds.get(worldId) || null;\n    }\n    \n    /**\n     * [의도] 모든 월드 정보 조회\n     */\n    public getAllWorlds(): WorldInfo[] {\n        return Array.from(this.worlds.values());\n    }\n    \n    /**\n     * [의도] 월드의 레벨 목록 조회\n     */\n    public getWorldLevels(worldId: string): LevelConfig[] {\n        return this.levelManager.getLevelsForWorld(worldId);\n    }\n    \n    /**\n     * [의도] 플레이어 진행 상황 조회\n     */\n    public getPlayerProgress(): PlayerProgress {\n        return { ...this.playerProgress }; // 복사본 반환\n    }\n    \n    /**\n     * [의도] 플레이어 진행 데이터 업데이트\n     */\n    private updatePlayerProgress(result: LevelResult, completionResult: any): void {\n        // 기본 통계 업데이트\n        this.playerProgress.gamesPlayed++;\n        this.playerProgress.totalScore += result.score;\n        this.playerProgress.lastPlayedAt = Date.now();\n        \n        if (result.completed) {\n            this.playerProgress.totalStars += completionResult.stars;\n            this.playerProgress.lastCompletedLevel = result.levelId;\n            \n            // 경험치 획득\n            const expGained = completionResult.stars * 50 + Math.floor(result.score / 1000);\n            this.playerProgress.experience += expGained;\n            \n            // 레벨업 확인\n            this.checkPlayerLevelUp();\n        }\n        \n        // 월드별 진행 상황 업데이트\n        const levelConfig = this.levelManager.getLevelConfig(result.levelId)!;\n        const worldProgress = this.playerProgress.worldProgress.get(levelConfig.worldId)!;\n        \n        if (result.completed && completionResult.isNewRecord) {\n            worldProgress.starsEarned += completionResult.stars;\n            if (completionResult.stars > 0) {\n                worldProgress.levelsCompleted++;\n            }\n        }\n        \n        worldProgress.bestScore = Math.max(worldProgress.bestScore, result.score);\n        worldProgress.totalPlayTime += result.timeSpent / 60; // 분 단위 변환\n        \n        // 평균 별점 재계산\n        this.recalculateAverageStars();\n    }\n    \n    /**\n     * [의도] 새로운 콘텐츠 해제 확인\n     */\n    private checkForNewUnlocks(completedLevelId: string, stars: number): {\n        levels?: string[];\n        worlds?: string[];\n    } {\n        const unlockedContent: { levels?: string[]; worlds?: string[] } = {};\n        \n        // 다음 레벨 해제 확인 (LevelManager에서 처리됨)\n        const unlockedLevels: string[] = [];\n        \n        // 새 월드 해제 확인\n        const unlockedWorlds: string[] = [];\n        \n        for (const worldInfo of this.worlds.values()) {\n            if (!this.isWorldUnlocked(worldInfo.id) && this.checkWorldUnlockConditions(worldInfo)) {\n                this.unlockWorld(worldInfo.id);\n                unlockedWorlds.push(worldInfo.id);\n            }\n        }\n        \n        if (unlockedLevels.length > 0) unlockedContent.levels = unlockedLevels;\n        if (unlockedWorlds.length > 0) unlockedContent.worlds = unlockedWorlds;\n        \n        return unlockedContent;\n    }\n    \n    /**\n     * [의도] 월드 해제 조건 확인\n     */\n    private checkWorldUnlockConditions(worldInfo: WorldInfo): boolean {\n        if (!worldInfo.unlockRequirements) {\n            return true; // 조건이 없으면 해제 가능\n        }\n        \n        const req = worldInfo.unlockRequirements;\n        \n        // 이전 월드 완료 확인\n        if (req.previousWorldId) {\n            const prevWorldProgress = this.playerProgress.worldProgress.get(req.previousWorldId);\n            if (!prevWorldProgress || !prevWorldProgress.isCompleted) {\n                return false;\n            }\n        }\n        \n        // 필요 별 개수 확인\n        if (req.minStarsRequired) {\n            const currentStars = req.previousWorldId ? \n                this.playerProgress.worldProgress.get(req.previousWorldId)?.starsEarned || 0 :\n                this.playerProgress.totalStars;\n            \n            if (currentStars < req.minStarsRequired) {\n                return false;\n            }\n        }\n        \n        return true;\n    }\n    \n    /**\n     * [의도] 월드 해제 처리\n     */\n    private unlockWorld(worldId: string): void {\n        const worldProgress = this.playerProgress.worldProgress.get(worldId);\n        if (worldProgress) {\n            worldProgress.isUnlocked = true;\n            worldProgress.unlockedAt = Date.now();\n            \n            console.log(`[ProgressionManager] 새 월드 해제: ${worldId}`);\n        }\n    }\n    \n    /**\n     * [의도] 월드 해제 상태 업데이트\n     */\n    private updateWorldUnlockStatus(): void {\n        for (const worldInfo of this.worlds.values()) {\n            if (!this.isWorldUnlocked(worldInfo.id) && this.checkWorldUnlockConditions(worldInfo)) {\n                this.unlockWorld(worldInfo.id);\n            }\n        }\n    }\n    \n    /**\n     * [의도] 월드별 통계 업데이트\n     */\n    private updateWorldStatistics(): void {\n        for (const worldInfo of this.worlds.values()) {\n            const worldProgress = this.playerProgress.worldProgress.get(worldInfo.id);\n            if (!worldProgress) continue;\n            \n            // 레벨 매니저에서 월드 통계 조회\n            const worldStats = this.levelManager.getTotalStarsForWorld(worldInfo.id);\n            \n            // 월드 정보 업데이트\n            worldInfo.starsCollected = worldStats;\n            worldInfo.completedLevels = worldProgress.levelsCompleted;\n            \n            // 월드 완료 여부 확인\n            if (!worldProgress.isCompleted && worldProgress.levelsCompleted >= worldInfo.totalLevels) {\n                worldProgress.isCompleted = true;\n                worldProgress.completedAt = Date.now();\n                console.log(`[ProgressionManager] 월드 완료: ${worldInfo.name}`);\n            }\n        }\n    }\n    \n    /**\n     * [의도] 플레이어 레벨업 확인\n     */\n    private checkPlayerLevelUp(): void {\n        const requiredExp = this.getRequiredExperienceForLevel(this.playerProgress.level + 1);\n        \n        if (this.playerProgress.experience >= requiredExp) {\n            this.playerProgress.level++;\n            this.playerProgress.experience -= requiredExp;\n            \n            // 레벨업 보상\n            const levelUpReward = this.calculateLevelUpReward(this.playerProgress.level);\n            this.playerProgress.coins += levelUpReward.coins;\n            this.playerProgress.gems += levelUpReward.gems;\n            \n            console.log(`[ProgressionManager] 플레이어 레벨업: ${this.playerProgress.level}`);\n        }\n    }\n    \n    /**\n     * [의도] 레벨별 필요 경험치 계산\n     */\n    private getRequiredExperienceForLevel(level: number): number {\n        return level * 1000 + (level - 1) * 500; // 레벨이 오를수록 더 많은 경험치 필요\n    }\n    \n    /**\n     * [의도] 레벨업 보상 계산\n     */\n    private calculateLevelUpReward(level: number): { coins: number; gems: number } {\n        return {\n            coins: level * 100,\n            gems: Math.floor(level / 5) + 1\n        };\n    }\n    \n    /**\n     * [의도] 평균 별점 재계산\n     */\n    private recalculateAverageStars(): void {\n        const completedLevels = Array.from(this.playerProgress.worldProgress.values())\n            .reduce((sum, world) => sum + world.levelsCompleted, 0);\n        \n        this.playerProgress.averageStars = completedLevels > 0 ?\n            this.playerProgress.totalStars / completedLevels : 0;\n    }\n    \n    /**\n     * [의도] 현재 세션 포기 처리\n     */\n    private abandonCurrentSession(): void {\n        if (this.currentSession) {\n            this.currentSession.endTime = Date.now();\n            this.currentSession.status = 'abandoned';\n            console.log('[ProgressionManager] 세션 포기됨');\n        }\n    }\n    \n    /**\n     * [의도] 플레이어 데이터 저장\n     */\n    private savePlayerProgress(): void {\n        // TODO: 실제로는 로컬 스토리지나 서버에 저장\n        console.log('[ProgressionManager] 플레이어 데이터 저장됨');\n    }\n    \n    /**\n     * [의도] 게임 통계 조회\n     */\n    public getGameStatistics(): {\n        playerLevel: number;\n        totalStars: number;\n        totalScore: number;\n        worldsUnlocked: number;\n        worldsCompleted: number;\n        totalPlayTime: number;\n        gamesPlayed: number;\n        averageStars: number;\n    } {\n        const worldsUnlocked = Array.from(this.playerProgress.worldProgress.values())\n            .filter(world => world.isUnlocked).length;\n        \n        const worldsCompleted = Array.from(this.playerProgress.worldProgress.values())\n            .filter(world => world.isCompleted).length;\n        \n        return {\n            playerLevel: this.playerProgress.level,\n            totalStars: this.playerProgress.totalStars,\n            totalScore: this.playerProgress.totalScore,\n            worldsUnlocked,\n            worldsCompleted,\n            totalPlayTime: this.playerProgress.totalPlayTime,\n            gamesPlayed: this.playerProgress.gamesPlayed,\n            averageStars: this.playerProgress.averageStars\n        };\n    }\n}