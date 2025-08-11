/**
 * [의도] AI 패턴 생성 시스템의 기본 타입 정의
 * [책임] PatternPrimitive, StagePattern 등 AI 패턴 관련 모든 타입 정의
 * 99-02번 문서 기반: 학습 가능성과 조합 규칙을 중심으로 한 패턴 시스템
 */

export enum PatternTag {
    LINE = 'line',
    CLUSTER = 'cluster', 
    GRAVITY = 'gravity',
    TIMING_SENSITIVE = 'timing_sensitive',
    TELEPORT = 'teleport',
    SPATIAL_REASONING = 'spatial_reasoning',
    COMBO_OPPORTUNITY = 'combo_opportunity',
    AREA_CLEAR = 'area_clear'
}

export enum PatternDifficulty {
    EASY = 'easy',           // 1.0 - 2.0
    MEDIUM = 'medium',       // 2.1 - 4.0  
    HARD = 'hard',           // 4.1 - 6.0
    EXPERT = 'expert'        // 6.1+
}

export enum MasteryLevel {
    NOVICE = 'novice',       // 처음 경험
    LEARNING = 'learning',   // 학습 중 (1-3회 경험)
    COMPETENT = 'competent', // 숙련 (4-10회 경험)
    MASTER = 'master'        // 완전 마스터 (10회+ 성공)
}

export interface PatternParams {
    [key: string]: any;
    length?: number;
    direction?: string;
    size?: number;
    shape?: string;
    shiftDirection?: string;
    duration?: number;
    teleportCount?: number;
    mazeComplexity?: string;
}

export interface SpawnRules {
    requiresMinMoves?: number;
    forbiddenWithTags?: PatternTag[];
    prerequisitePatterns?: string[];
    maxSimultaneous?: number;
}

export interface SupportSystems {
    visualTelegraph?: boolean;
    hintAvailable?: boolean;
    practiceMode?: boolean;
    tutorialPhases?: string[];
}

export interface PatternPrimitive {
    id: string;
    tags: PatternTag[];
    baseDifficulty: number;
    learnability: number;      // 99-02 핵심: 0~1, 학습 용이성
    novelty: number;           // 0~1, 신규성 점수
    params: PatternParams;
    spawnRules: SpawnRules;
    supportSystems: SupportSystems;
}

export interface PatternExperience {
    patternId: string;
    encounterCount: number;
    successRate: number;
    averageTimeToSolve: number;
    learningProgression: number[];  // 시간별 성능 향상 곡선
    lastEncountered: Date;
    masteryLevel: MasteryLevel;
}

export interface StagePattern {
    id: string;
    primitives: PatternPrimitive[];
    totalDifficulty: number;
    totalLearnability: number;
    combinationComplexity: number;
    seed: string;
    stageNumber: number;
}

export interface PlayerPatternData {
    seenPatterns: Map<string, PatternExperience>;
    adaptabilityScore: number;      // 0~1, 새로운 패턴 적응 속도
    maxHandledComplexity: number;   // 처리 가능한 최대 복잡도
    preferredPatternTags: PatternTag[];
    averageLearningRate: number;    // 평균 학습 속도
}