/**
 * [의도] Sweet Puzzle 게임의 레벨 관리 시스템 구현
 * [책임] 레벨 데이터 관리, 레벨 진행 추적, 별점 계산, 레벨 완료 처리
 */

import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

// 레벨 타입 정의
export enum LevelType {
    SCORE = 'score',           // 점수 달성
    COLLECTION = 'collection', // 블록 수집
    OBSTACLE = 'obstacle',     // 장애물 제거
    TIME_LIMIT = 'time_limit', // 시간 제한
    BOSS = 'boss'             // 보스 레벨
}

// 레벨 목표 인터페이스
export interface LevelObjective {
    type: 'score' | 'collect' | 'clear_obstacle' | 'time_limit';
    target: number;
    description: string;
    current?: number;
}

// 레벨 구성 정보
export interface LevelConfig {
    id: string;
    levelNumber: number;
    worldId: string;
    name: string;
    description: string;
    
    // 게임플레이 설정
    type: LevelType;
    maxMoves: number;
    timeLimit?: number; // 초 단위
    
    // 목표 설정
    objectives: LevelObjective[];
    
    // 별점 임계값
    starThresholds: {
        oneStar: number;   // 기본 완료
        twoStar: number;   // 좋은 성과
        threeStar: number; // 완벽한 성과
    };
    
    // 보상 설정
    rewards: {
        completion: { coins: number; gems?: number; experience?: number };
        twoStar: { coins: number; gems?: number };
        threeStar: { coins: number; gems: number; special?: string };
    };
    
    // 특수 설정
    specialFeatures?: string[];
    difficultyRating: number; // 1-10
    
    // 잠금 해제 조건
    unlockRequirements?: {
        previousLevel?: number;
        totalStars?: number;
        worldCompletion?: string;
    };
}

// 레벨 플레이 결과
export interface LevelResult {
    levelId: string;
    score: number;
    movesUsed: number;
    timeSpent: number; // 초
    objectivesCompleted: boolean[];
    completed: boolean;
    timestamp: number;
}

// 레벨 기록
export interface LevelRecord {
    bestScore: number;
    bestStars: number;
    totalAttempts: number;
    firstCompletedAt: number;
    lastPlayedAt: number;
    fastestTime?: number;
    fewestMoves?: number;
}

@ccclass('LevelManager')
export class LevelManager extends Component {
    
    private levels: Map<string, LevelConfig> = new Map();
    private playerRecords: Map<string, LevelRecord> = new Map();
    
    // 현재 플레이 중인 레벨 정보
    private currentLevel: LevelConfig | null = null;
    private currentLevelStartTime: number = 0;
    private currentObjectiveProgress: number[] = [];
    
    /**
     * [의도] 레벨 매니저 초기화
     */\n    public initialize(): void {\n        this.generateDefaultLevels();\n        this.loadPlayerRecords();\n        \n        console.log(`[LevelManager] 초기화 완료: ${this.levels.size}개 레벨 로드됨`);\n    }\n    \n    /**\n     * [의도] 기본 레벨들 생성\n     */\n    private generateDefaultLevels(): void {\n        console.log('[LevelManager] 기본 레벨 생성 중...');\n        \n        // World 1: Sweet Farm (20레벨)\n        for (let i = 1; i <= 20; i++) {\n            const levelConfig = this.createLevel({\n                levelNumber: i,\n                worldId: 'world_1',\n                name: `Sweet Farm ${i}`,\n                description: `레벨 ${i}: 달콤한 농장에서의 퍼즐 도전`,\n                type: this.getLevelTypeForNumber(i),\n                maxMoves: this.calculateMaxMoves(i),\n                objectives: this.generateObjectives(i),\n                starThresholds: this.calculateStarThresholds(i),\n                rewards: this.calculateRewards(i),\n                difficultyRating: Math.min(i, 5) // 1-5 난이도\n            });\n            \n            this.levels.set(levelConfig.id, levelConfig);\n        }\n        \n        // World 2: Chocolate Factory (25레벨)\n        for (let i = 1; i <= 25; i++) {\n            const levelConfig = this.createLevel({\n                levelNumber: i,\n                worldId: 'world_2',\n                name: `Chocolate Factory ${i}`,\n                description: `레벨 ${i}: 초콜릿 공장의 달콤한 비밀`,\n                type: this.getLevelTypeForNumber(i),\n                maxMoves: this.calculateMaxMoves(i + 20), // 더 어려운 설정\n                objectives: this.generateObjectives(i + 20),\n                starThresholds: this.calculateStarThresholds(i + 20),\n                rewards: this.calculateRewards(i + 20),\n                difficultyRating: Math.min(i + 3, 8),\n                unlockRequirements: {\n                    previousLevel: i === 1 ? 20 : i - 1, // 이전 레벨 완료 필요\n                    totalStars: i === 1 ? 30 : undefined // 첫 레벨은 월드1에서 30개 별 필요\n                }\n            });\n            \n            this.levels.set(levelConfig.id, levelConfig);\n        }\n    }\n    \n    /**\n     * [의도] 레벨 설정 생성 헬퍼\n     */\n    private createLevel(params: {\n        levelNumber: number;\n        worldId: string;\n        name: string;\n        description: string;\n        type: LevelType;\n        maxMoves: number;\n        objectives: LevelObjective[];\n        starThresholds: { oneStar: number; twoStar: number; threeStar: number };\n        rewards: any;\n        difficultyRating: number;\n        unlockRequirements?: any;\n    }): LevelConfig {\n        const id = `${params.worldId}_level_${params.levelNumber.toString().padStart(2, '0')}`;\n        \n        return {\n            id,\n            levelNumber: params.levelNumber,\n            worldId: params.worldId,\n            name: params.name,\n            description: params.description,\n            type: params.type,\n            maxMoves: params.maxMoves,\n            objectives: params.objectives,\n            starThresholds: params.starThresholds,\n            rewards: params.rewards,\n            difficultyRating: params.difficultyRating,\n            unlockRequirements: params.unlockRequirements\n        };\n    }\n    \n    /**\n     * [의도] 레벨 번호에 따른 타입 결정\n     */\n    private getLevelTypeForNumber(levelNumber: number): LevelType {\n        if (levelNumber % 10 === 0) {\n            return LevelType.BOSS; // 10의 배수는 보스 레벨\n        } else if (levelNumber % 5 === 0) {\n            return LevelType.TIME_LIMIT; // 5의 배수는 시간 제한\n        } else if (levelNumber % 3 === 0) {\n            return LevelType.COLLECTION; // 3의 배수는 수집\n        } else if (levelNumber % 7 === 0) {\n            return LevelType.OBSTACLE; // 7의 배수는 장애물\n        } else {\n            return LevelType.SCORE; // 나머지는 점수\n        }\n    }\n    \n    /**\n     * [의도] 레벨에 따른 최대 이동 수 계산\n     */\n    private calculateMaxMoves(levelNumber: number): number {\n        const baseMoves = 25;\n        const increment = Math.floor(levelNumber / 5) * 2;\n        return baseMoves + increment;\n    }\n    \n    /**\n     * [의도] 레벨 목표 생성\n     */\n    private generateObjectives(levelNumber: number): LevelObjective[] {\n        const objectives: LevelObjective[] = [];\n        \n        // 기본 점수 목표는 항상 포함\n        objectives.push({\n            type: 'score',\n            target: 1000 + (levelNumber * 500),\n            description: `${1000 + (levelNumber * 500)}점 달성`\n        });\n        \n        // 레벨 타입에 따른 추가 목표\n        const levelType = this.getLevelTypeForNumber(levelNumber);\n        switch (levelType) {\n            case LevelType.COLLECTION:\n                objectives.push({\n                    type: 'collect',\n                    target: 15 + Math.floor(levelNumber / 3),\n                    description: `사과 ${15 + Math.floor(levelNumber / 3)}개 수집`\n                });\n                break;\n                \n            case LevelType.OBSTACLE:\n                objectives.push({\n                    type: 'clear_obstacle',\n                    target: 5 + Math.floor(levelNumber / 5),\n                    description: `얼음 블록 ${5 + Math.floor(levelNumber / 5)}개 제거`\n                });\n                break;\n                \n            case LevelType.TIME_LIMIT:\n                objectives.push({\n                    type: 'time_limit',\n                    target: Math.max(60, 120 - levelNumber * 2),\n                    description: `${Math.max(60, 120 - levelNumber * 2)}초 내 완료`\n                });\n                break;\n        }\n        \n        return objectives;\n    }\n    \n    /**\n     * [의도] 별점 임계값 계산\n     */\n    private calculateStarThresholds(levelNumber: number): {\n        oneStar: number; twoStar: number; threeStar: number;\n    } {\n        const baseScore = 1000 + (levelNumber * 500);\n        \n        return {\n            oneStar: baseScore,           // 기본 목표 달성\n            twoStar: baseScore * 1.5,     // 1.5배\n            threeStar: baseScore * 2.2    // 2.2배\n        };\n    }\n    \n    /**\n     * [의도] 레벨 보상 계산\n     */\n    private calculateRewards(levelNumber: number) {\n        const baseCoins = 100 + (levelNumber * 50);\n        const baseGems = Math.floor(levelNumber / 5);\n        \n        return {\n            completion: {\n                coins: baseCoins,\n                experience: 10 + levelNumber\n            },\n            twoStar: {\n                coins: Math.floor(baseCoins * 0.5),\n                gems: Math.max(1, baseGems)\n            },\n            threeStar: {\n                coins: baseCoins,\n                gems: baseGems + 2,\n                special: levelNumber % 10 === 0 ? 'trophy' : undefined\n            }\n        };\n    }\n    \n    /**\n     * [의도] 레벨 정보 조회\n     */\n    public getLevelConfig(levelId: string): LevelConfig | null {\n        return this.levels.get(levelId) || null;\n    }\n    \n    /**\n     * [의도] 월드의 모든 레벨 조회\n     */\n    public getLevelsForWorld(worldId: string): LevelConfig[] {\n        const worldLevels: LevelConfig[] = [];\n        \n        for (const level of this.levels.values()) {\n            if (level.worldId === worldId) {\n                worldLevels.push(level);\n            }\n        }\n        \n        return worldLevels.sort((a, b) => a.levelNumber - b.levelNumber);\n    }\n    \n    /**\n     * [의도] 레벨 시작\n     */\n    public startLevel(levelId: string): boolean {\n        const levelConfig = this.levels.get(levelId);\n        if (!levelConfig) {\n            console.error(`[LevelManager] 레벨을 찾을 수 없음: ${levelId}`);\n            return false;\n        }\n        \n        this.currentLevel = levelConfig;\n        this.currentLevelStartTime = Date.now();\n        this.currentObjectiveProgress = new Array(levelConfig.objectives.length).fill(0);\n        \n        console.log(`[LevelManager] 레벨 시작: ${levelConfig.name}`);\n        return true;\n    }\n    \n    /**\n     * [의도] 목표 진행 상황 업데이트\n     */\n    public updateObjectiveProgress(objectiveIndex: number, progress: number): void {\n        if (!this.currentLevel || objectiveIndex >= this.currentObjectiveProgress.length) {\n            return;\n        }\n        \n        this.currentObjectiveProgress[objectiveIndex] = progress;\n        \n        // 목표 달성 확인\n        const objective = this.currentLevel.objectives[objectiveIndex];\n        if (progress >= objective.target) {\n            console.log(`[LevelManager] 목표 달성: ${objective.description}`);\n        }\n    }\n    \n    /**\n     * [의도] 레벨 완료 처리\n     */\n    public completeLevel(result: LevelResult): { stars: number; isNewRecord: boolean; rewards: any } {\n        if (!this.currentLevel) {\n            console.error('[LevelManager] 현재 진행 중인 레벨이 없음');\n            return { stars: 0, isNewRecord: false, rewards: null };\n        }\n        \n        const levelId = this.currentLevel.id;\n        const stars = this.calculateStars(result, this.currentLevel);\n        \n        // 기존 기록 확인\n        const existingRecord = this.playerRecords.get(levelId);\n        const isNewRecord = !existingRecord || stars > existingRecord.bestStars || result.score > existingRecord.bestScore;\n        \n        // 기록 업데이트\n        const updatedRecord: LevelRecord = {\n            bestScore: Math.max(result.score, existingRecord?.bestScore || 0),\n            bestStars: Math.max(stars, existingRecord?.bestStars || 0),\n            totalAttempts: (existingRecord?.totalAttempts || 0) + 1,\n            firstCompletedAt: existingRecord?.firstCompletedAt || result.timestamp,\n            lastPlayedAt: result.timestamp,\n            fastestTime: existingRecord?.fastestTime ? \n                Math.min(result.timeSpent, existingRecord.fastestTime) : result.timeSpent,\n            fewestMoves: existingRecord?.fewestMoves ? \n                Math.min(result.movesUsed, existingRecord.fewestMoves) : result.movesUsed\n        };\n        \n        this.playerRecords.set(levelId, updatedRecord);\n        \n        // 보상 계산\n        const rewards = this.calculateLevelRewards(this.currentLevel, stars, isNewRecord);\n        \n        console.log(`[LevelManager] 레벨 완료: ${this.currentLevel.name}, ${stars}성, 신기록: ${isNewRecord}`);\n        \n        // 현재 레벨 초기화\n        this.currentLevel = null;\n        this.currentLevelStartTime = 0;\n        this.currentObjectiveProgress = [];\n        \n        return { stars, isNewRecord, rewards };\n    }\n    \n    /**\n     * [의도] 별점 계산\n     */\n    private calculateStars(result: LevelResult, level: LevelConfig): number {\n        let stars = 0;\n        \n        // 기본 완료 확인 (1성)\n        const allObjectivesCompleted = result.objectivesCompleted.every((completed, index) => {\n            const objective = level.objectives[index];\n            return completed || this.currentObjectiveProgress[index] >= objective.target;\n        });\n        \n        if (allObjectivesCompleted) {\n            stars = 1;\n        }\n        \n        // 점수 기준 별점 (2성, 3성)\n        if (result.score >= level.starThresholds.twoStar) {\n            stars = 2;\n        }\n        \n        if (result.score >= level.starThresholds.threeStar) {\n            stars = 3;\n        }\n        \n        // 효율성 보너스\n        if (stars >= 2 && result.movesUsed <= level.maxMoves * 0.8) {\n            stars = Math.max(stars, 2);\n        }\n        \n        if (stars >= 2 && result.movesUsed <= level.maxMoves * 0.6) {\n            stars = 3;\n        }\n        \n        return stars;\n    }\n    \n    /**\n     * [의도] 레벨 완료 보상 계산\n     */\n    private calculateLevelRewards(level: LevelConfig, stars: number, isNewRecord: boolean): any {\n        const rewards: any = { coins: 0, gems: 0, experience: 0, items: [] };\n        \n        // 기본 완료 보상\n        if (stars >= 1) {\n            rewards.coins += level.rewards.completion.coins;\n            rewards.experience += level.rewards.completion.experience || 0;\n        }\n        \n        // 2성 보상\n        if (stars >= 2) {\n            rewards.coins += level.rewards.twoStar.coins;\n            rewards.gems += level.rewards.twoStar.gems || 0;\n        }\n        \n        // 3성 보상\n        if (stars >= 3) {\n            rewards.coins += level.rewards.threeStar.coins;\n            rewards.gems += level.rewards.threeStar.gems;\n            \n            if (level.rewards.threeStar.special) {\n                rewards.items.push(level.rewards.threeStar.special);\n            }\n        }\n        \n        // 신기록 보너스\n        if (isNewRecord) {\n            rewards.coins = Math.floor(rewards.coins * 1.2);\n            rewards.experience += 50;\n        }\n        \n        return rewards;\n    }\n    \n    /**\n     * [의도] 레벨 잠금 해제 확인\n     */\n    public isLevelUnlocked(levelId: string): boolean {\n        const level = this.levels.get(levelId);\n        if (!level) return false;\n        \n        // 첫 번째 레벨은 항상 해제\n        if (level.levelNumber === 1 && level.worldId === 'world_1') {\n            return true;\n        }\n        \n        // 잠금 해제 조건 확인\n        if (level.unlockRequirements) {\n            const req = level.unlockRequirements;\n            \n            // 이전 레벨 완료 확인\n            if (req.previousLevel) {\n                const prevLevelId = `${level.worldId}_level_${req.previousLevel.toString().padStart(2, '0')}`;\n                const prevRecord = this.playerRecords.get(prevLevelId);\n                if (!prevRecord || prevRecord.bestStars === 0) {\n                    return false;\n                }\n            }\n            \n            // 총 별 개수 확인\n            if (req.totalStars) {\n                const totalStars = this.getTotalStarsForWorld(level.worldId === 'world_2' ? 'world_1' : level.worldId);\n                if (totalStars < req.totalStars) {\n                    return false;\n                }\n            }\n        }\n        \n        return true;\n    }\n    \n    /**\n     * [의도] 월드의 총 별 개수 계산\n     */\n    public getTotalStarsForWorld(worldId: string): number {\n        let totalStars = 0;\n        \n        for (const level of this.levels.values()) {\n            if (level.worldId === worldId) {\n                const record = this.playerRecords.get(level.id);\n                if (record) {\n                    totalStars += record.bestStars;\n                }\n            }\n        }\n        \n        return totalStars;\n    }\n    \n    /**\n     * [의도] 플레이어 기록 로드\n     */\n    private loadPlayerRecords(): void {\n        // TODO: 실제로는 로컬 스토리지나 서버에서 로드\n        console.log('[LevelManager] 플레이어 기록 로드 (임시 구현)');\n    }\n    \n    /**\n     * [의도] 플레이어 기록 저장\n     */\n    public savePlayerRecords(): void {\n        // TODO: 실제로는 로컬 스토리지나 서버에 저장\n        console.log('[LevelManager] 플레이어 기록 저장');\n    }\n    \n    /**\n     * [의도] 레벨 통계 정보 반환\n     */\n    public getLevelStats(): {\n        totalLevels: number;\n        completedLevels: number;\n        totalStars: number;\n        averageStars: number;\n    } {\n        const totalLevels = this.levels.size;\n        let completedLevels = 0;\n        let totalStars = 0;\n        \n        for (const record of this.playerRecords.values()) {\n            if (record.bestStars > 0) {\n                completedLevels++;\n                totalStars += record.bestStars;\n            }\n        }\n        \n        return {\n            totalLevels,\n            completedLevels,\n            totalStars,\n            averageStars: completedLevels > 0 ? totalStars / completedLevels : 0\n        };\n    }\n}