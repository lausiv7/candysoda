/**
 * [의도] Sweet Puzzle AI 기반 레벨 생성기
 * [책임] 플레이어 스킬과 게임 조건에 맞는 동적 레벨 생성, 난이도 조절, 검증
 */

import { _decorator, Component } from 'cc';
import { BlockType, BlockTypeHelper } from './BlockType';
import { Block } from './Block';

const { ccclass, property } = _decorator;

// 레벨 목표 타입
export enum ObjectiveType {
    SCORE = 'score',           // 목표 점수 달성
    COLLECTION = 'collection', // 특정 블록 수집
    CLEAR_OBSTACLES = 'clear_obstacles', // 장애물 제거
    CLEAR_JELLIES = 'clear_jellies',     // 젤리 제거
    BRING_DOWN = 'bring_down', // 아이템을 바닥으로 내리기
    TIME_CHALLENGE = 'time_challenge'    // 시간 제한 도전
}

// 난이도 레벨
export enum DifficultyLevel {
    TUTORIAL = 'tutorial',
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard',
    EXPERT = 'expert',
    NIGHTMARE = 'nightmare'
}

// 플레이어 스킬 레벨
export enum PlayerSkillLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate', 
    ADVANCED = 'advanced',
    EXPERT = 'expert'
}

// 레벨 목표 정의
export interface LevelObjective {
    type: ObjectiveType;
    target: string; // 'red_blocks', 'score', 'jellies' 등
    quantity: number;
    description: string;
    priority: number; // 1-10, 높을수록 우선순위
}

// 특수 블록 배치 정보
export interface SpecialBlockPlacement {
    type: BlockType;
    position: { x: number; y: number };
    power?: number;
}

// 장애물 배치 정보
export interface ObstaclePlacement {
    type: 'stone' | 'jelly' | 'ice' | 'chain';
    position: { x: number; y: number };
    strength?: number; // 제거하는데 필요한 매치 횟수
}

// AI 생성 파라미터
export interface AIGenerationParams {
    useGPT: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
    includeExplanation: boolean;
    validationStrength: 'weak' | 'medium' | 'strong';
}

// 레벨 설정 인터페이스  
export interface LevelConfig {
    id: string;
    worldId: string;
    levelNumber: number;
    
    // 보드 설정
    boardSize: { width: number; height: number };
    initialLayout: BlockType[][];
    
    // 게임 목표
    objectives: LevelObjective[];
    
    // 제한 조건
    maxMoves?: number;
    timeLimit?: number; // 초 단위
    
    // 별점 기준
    starThresholds: {
        oneStar: number;
        twoStar: number;
        threeStar: number;
    };
    
    // 특수 요소
    specialBlocks?: SpecialBlockPlacement[];
    obstacles?: ObstaclePlacement[];
    powerUps?: string[];
    
    // 난이도 정보
    difficulty: DifficultyLevel;
    estimatedPlayTime: number; // 초 단위
    
    // AI 생성 정보
    aiGenerated: boolean;
    generationParameters?: AIGenerationParams;
    
    // 메타데이터
    createdAt: string;
    validationScore: number; // 0-100
    balanceScore: number;    // 0-100  
    funScore: number;        // 0-100
}

// 생성 파라미터
export interface GenerationParameters {
    boardSize: { width: number; height: number };
    difficulty: DifficultyLevel;
    objectiveType: ObjectiveType;
    playerSkill: PlayerSkillLevel;
    
    // 제약 조건
    maxMoves?: number;
    timeLimit?: number;
    
    // 특수 요소 비율
    specialBlockRatio: number;    // 0-1
    obstacleRatio: number;        // 0-1
    colorVariety: number;         // 3-6
    
    // AI 설정
    aiParams?: AIGenerationParams;
    
    // 검증 설정
    validateSolvability: boolean;
    targetSuccessRate: number;    // 0-1
}

// 플레이어 통계
export interface PlayerStats {
    averageAttemptsPerLevel: number;
    successRate: number;
    averagePlayTimePerLevel: number;
    quitRate: number;
    boosterUsageRate: number;
    preferredObjectiveTypes: ObjectiveType[];
    skillProgression: number; // 0-100
}

// AI 프롬프트 클래스
class AIPrompt {
    private content: string;
    private feedback: string[] = [];
    
    constructor(content: string) {
        this.content = content;
    }
    
    addFeedback(issues: string[]): void {
        this.feedback.push(...issues);
    }
    
    toString(): string {
        let prompt = this.content;
        
        if (this.feedback.length > 0) {
            prompt += '\\n\\n이전 생성 시도에서 발견된 문제점들:\\n';
            prompt += this.feedback.map(f => `- ${f}`).join('\\n');
            prompt += '\\n\\n위 문제점들을 해결한 개선된 레벨을 생성해주세요.';
        }
        
        return prompt;
    }
}

// 레벨 검증 결과
export interface ValidationResult {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    scores: {
        solvability: number;    // 0-100
        balance: number;        // 0-100
        difficulty: number;     // 0-100
        funFactor: number;      // 0-100
    };
}

@ccclass('AILevelGenerator')
export class AILevelGenerator extends Component {
    @property
    private enableAIGeneration: boolean = true;
    
    @property
    private fallbackToTemplates: boolean = true;
    
    @property
    private maxGenerationAttempts: number = 5;
    
    private validator: LevelValidator = new LevelValidator();
    private templateLibrary: LevelTemplate[] = [];
    
    // 싱글톤 인스턴스
    private static instance: AILevelGenerator | null = null;
    
    protected onLoad(): void {
        if (AILevelGenerator.instance === null) {
            AILevelGenerator.instance = this;
            this.init();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): AILevelGenerator {
        if (!AILevelGenerator.instance) {
            console.error('[AILevelGenerator] Instance not initialized yet');
            return null;
        }
        return AILevelGenerator.instance;
    }
    
    private init(): void {
        this.loadTemplateLibrary();
        console.log('[AILevelGenerator] AI 레벨 생성기 초기화 완료');
    }
    
    /**
     * [의도] AI 기반 레벨 생성 (메인 메서드)
     */
    async generateLevel(parameters: GenerationParameters): Promise<LevelConfig> {
        console.log(`[AILevelGenerator] 레벨 생성 시작: ${parameters.difficulty} 난이도`);
        
        if (!this.enableAIGeneration || !parameters.aiParams?.useGPT) {
            return this.generateFromTemplate(parameters);
        }
        
        const prompt = this.buildGenerationPrompt(parameters);
        let attempts = 0;
        
        while (attempts < this.maxGenerationAttempts) {
            try {
                // AI 서비스로 레벨 생성 요청 (시뮬레이션)
                const rawLevel = await this.simulateAIGeneration(prompt, parameters);
                
                // 생성된 레벨 파싱
                const levelConfig = this.parseLevelFromAI(rawLevel, parameters);
                
                // 레벨 유효성 검증
                const validation = await this.validator.validateLevel(levelConfig);
                
                if (validation.isValid && validation.scores.solvability >= 70) {
                    levelConfig.validationScore = validation.scores.solvability;
                    levelConfig.balanceScore = validation.scores.balance;
                    levelConfig.funScore = validation.scores.funFactor;
                    
                    console.log(`[AILevelGenerator] AI 레벨 생성 성공 (${attempts + 1}번째 시도)`);
                    return levelConfig;
                }
                
                // 검증 실패 시 피드백을 통해 재생성
                prompt.addFeedback(validation.issues);
                attempts++;
                
            } catch (error) {
                console.error(`[AILevelGenerator] 레벨 생성 실패 (${attempts + 1}번째 시도):`, error);
                attempts++;
            }
        }
        
        console.warn('[AILevelGenerator] AI 생성 실패, 템플릿 기반 레벨 생성');
        return this.generateFromTemplate(parameters);
    }
    
    /**
     * [의도] 플레이어에게 최적화된 난이도 계산
     */
    calculateOptimalDifficulty(playerStats: PlayerStats): DifficultyLevel {
        const factors = {
            successRate: playerStats.successRate,
            averageAttempts: 1 / Math.max(playerStats.averageAttemptsPerLevel, 1),
            playTime: Math.min(playerStats.averagePlayTimePerLevel / 300, 1), // 5분 기준 정규화
            quitRate: 1 - playerStats.quitRate,
            skillProgression: playerStats.skillProgression / 100
        };
        
        // 가중치 기반 난이도 점수 계산
        const difficultyScore = 
            factors.successRate * 0.3 +           // 성공률 30%
            factors.averageAttempts * 0.2 +       // 시도 횟수 20%
            factors.playTime * 0.1 +              // 플레이 시간 10%
            factors.quitRate * 0.2 +              // 완주율 20%
            factors.skillProgression * 0.2;       // 스킬 진행도 20%
        
        return this.mapScoreToDifficulty(difficultyScore);
    }
    
    /**
     * [의도] 실시간 난이도 조정
     */
    async adjustLevelDifficulty(
        levelConfig: LevelConfig, 
        playerPerformance: {
            consecutiveFailures: number;
            recentSuccessRate: number;
            averageScore: number;
            timeSpent: number;
        }
    ): Promise<LevelConfig> {
        
        if (playerPerformance.consecutiveFailures >= 3) {
            // 연속 실패 시 난이도 하향 조정
            return this.easifyLevel(levelConfig, 0.8);
        }
        
        if (playerPerformance.recentSuccessRate > 0.9) {
            // 너무 쉬우면 난이도 상향 조정
            return this.hardifyLevel(levelConfig, 1.2);
        }
        
        return levelConfig;
    }
    
    /**
     * [의도] 레벨 다양성 생성 (시리즈 생성)
     */
    async generateLevelSeries(
        worldId: string,
        levelCount: number,
        baseParameters: GenerationParameters
    ): Promise<LevelConfig[]> {
        const levels: LevelConfig[] = [];
        
        for (let i = 0; i < levelCount; i++) {
            const adjustedParams = this.adjustParametersForSeries(baseParameters, i, levelCount);
            adjustedParams.difficulty = this.calculateProgressiveDifficulty(i, levelCount, baseParameters.difficulty);
            
            const level = await this.generateLevel(adjustedParams);
            level.id = `${worldId}_level_${i + 1}`;
            level.worldId = worldId;
            level.levelNumber = i + 1;
            
            levels.push(level);
            
            // 생성 간격 (AI API 제한 고려)
            await this.delay(100);
        }
        
        console.log(`[AILevelGenerator] ${levelCount}개 레벨 시리즈 생성 완료`);
        return levels;
    }
    
    // === Private Helper Methods ===
    
    private buildGenerationPrompt(parameters: GenerationParameters): AIPrompt {
        const prompt = `
당신은 매치-3 퍼즐 게임의 전문 레벨 디자이너입니다.
다음 조건에 맞는 Sweet Puzzle 레벨을 설계해주세요:

## 게임 조건
- 보드 크기: ${parameters.boardSize.width}x${parameters.boardSize.height}
- 난이도: ${parameters.difficulty}
- 레벨 타입: ${parameters.objectiveType}
- 플레이어 스킬: ${parameters.playerSkill}
- 최대 이동 수: ${parameters.maxMoves || '제한없음'}
- 색상 종류: ${parameters.colorVariety}개

## 설계 원칙
1. 해결 가능한 퍼즐이어야 합니다
2. ${parameters.difficulty} 난이도에 적합한 도전 수준을 제공해야 합니다
3. 특수 블록의 전략적 활용 기회를 제공해야 합니다 (${Math.round(parameters.specialBlockRatio * 100)}% 비율)
4. 플레이어의 성취감을 위한 적절한 보상을 제공해야 합니다
5. 목표 성공률: ${Math.round(parameters.targetSuccessRate * 100)}%

## 블록 타입
- 기본 블록: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE
- 특수 블록: LINE_HORIZONTAL, LINE_VERTICAL, BOMB, RAINBOW
- 장애물: OBSTACLE

## 출력 형식
다음 JSON 형식으로 응답해주세요:
{
  "boardLayout": [
    ["RED", "BLUE", "GREEN", ...],
    ["YELLOW", "PURPLE", "RED", ...],
    ...
  ],
  "objectives": [
    {
      "type": "${parameters.objectiveType}",
      "target": "점수 또는 블록 타입",
      "quantity": 숫자,
      "description": "목표 설명"
    }
  ],
  "maxMoves": ${parameters.maxMoves || 25},
  "specialBlocks": [
    {
      "type": "특수 블록 타입",
      "position": {"x": 0, "y": 0},
      "power": 1
    }
  ],
  "obstacles": [
    {
      "type": "stone",
      "position": {"x": 0, "y": 0}, 
      "strength": 1
    }
  ],
  "starThresholds": {
    "oneStar": 1000,
    "twoStar": 2000,
    "threeStar": 3000
  },
  "estimatedPlayTime": 180,
  "explanation": "레벨 설계 의도와 전략"
}`;

        return new AIPrompt(prompt);
    }
    
    private async simulateAIGeneration(prompt: AIPrompt, parameters: GenerationParameters): Promise<any> {
        // AI 서비스 호출 시뮬레이션 (실제로는 OpenAI API 호출)
        console.log('[AILevelGenerator] AI 생성 시뮬레이션 중...');
        
        await this.delay(1000); // API 호출 시뮬레이션
        
        // 난이도별 시뮬레이션 데이터 생성
        const simulatedResponse = this.generateSimulatedAIResponse(parameters);
        
        return simulatedResponse;
    }
    
    private generateSimulatedAIResponse(parameters: GenerationParameters): any {
        const { boardSize, difficulty, objectiveType } = parameters;
        
        // 보드 레이아웃 생성
        const boardLayout: BlockType[][] = [];
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, parameters.colorVariety);
        
        for (let row = 0; row < boardSize.height; row++) {
            boardLayout[row] = [];
            for (let col = 0; col < boardSize.width; col++) {
                if (Math.random() < parameters.obstacleRatio) {
                    boardLayout[row][col] = BlockType.OBSTACLE;
                } else {
                    boardLayout[row][col] = colors[Math.floor(Math.random() * colors.length)];
                }
            }
        }
        
        // 목표 생성
        const objectives: LevelObjective[] = [];
        if (objectiveType === ObjectiveType.SCORE) {
            objectives.push({
                type: ObjectiveType.SCORE,
                target: 'total_score',
                quantity: this.calculateTargetScore(difficulty),
                description: '목표 점수를 달성하세요',
                priority: 10
            });
        } else if (objectiveType === ObjectiveType.COLLECTION) {
            const targetColor = colors[Math.floor(Math.random() * colors.length)];
            objectives.push({
                type: ObjectiveType.COLLECTION,
                target: targetColor,
                quantity: this.calculateTargetCollection(difficulty),
                description: `${BlockTypeHelper.getBlockEmoji(targetColor)} 블록을 수집하세요`,
                priority: 10
            });
        }
        
        // 특수 블록 배치
        const specialBlocks: SpecialBlockPlacement[] = [];
        const specialCount = Math.floor(boardSize.width * boardSize.height * parameters.specialBlockRatio);
        for (let i = 0; i < specialCount; i++) {
            specialBlocks.push({
                type: this.getRandomSpecialBlockType(),
                position: {
                    x: Math.floor(Math.random() * boardSize.width),
                    y: Math.floor(Math.random() * boardSize.height)
                },
                power: Math.floor(Math.random() * 3) + 1
            });
        }
        
        return {
            boardLayout,
            objectives,
            maxMoves: parameters.maxMoves || this.calculateDefaultMoves(difficulty),
            specialBlocks,
            obstacles: [],
            starThresholds: this.calculateStarThresholds(difficulty, objectives),
            estimatedPlayTime: this.calculateEstimatedPlayTime(difficulty),
            explanation: `${difficulty} 난이도의 ${objectiveType} 타입 레벨입니다.`
        };
    }
    
    private parseLevelFromAI(rawLevel: any, parameters: GenerationParameters): LevelConfig {
        const levelConfig: LevelConfig = {
            id: `ai_generated_${Date.now()}`,
            worldId: 'generated',
            levelNumber: 1,
            
            boardSize: parameters.boardSize,
            initialLayout: rawLevel.boardLayout || this.generateDefaultBoard(parameters.boardSize),
            
            objectives: rawLevel.objectives || [],
            
            maxMoves: rawLevel.maxMoves,
            timeLimit: parameters.timeLimit,
            
            starThresholds: rawLevel.starThresholds || {
                oneStar: 1000,
                twoStar: 2000,
                threeStar: 3000
            },
            
            specialBlocks: rawLevel.specialBlocks || [],
            obstacles: rawLevel.obstacles || [],
            powerUps: [],
            
            difficulty: parameters.difficulty,
            estimatedPlayTime: rawLevel.estimatedPlayTime || 180,
            
            aiGenerated: true,
            generationParameters: parameters.aiParams,
            
            createdAt: new Date().toISOString(),
            validationScore: 0,
            balanceScore: 0,
            funScore: 0
        };
        
        return levelConfig;
    }
    
    private generateFromTemplate(parameters: GenerationParameters): LevelConfig {
        console.log('[AILevelGenerator] 템플릿 기반 레벨 생성');
        
        // 적합한 템플릿 찾기
        const template = this.findBestTemplate(parameters);
        
        if (template) {
            return this.customizeTemplate(template, parameters);
        }
        
        // 템플릿이 없으면 기본 레벨 생성
        return this.generateBasicLevel(parameters);
    }
    
    private loadTemplateLibrary(): void {
        // 템플릿 라이브러리 로드 (실제로는 파일이나 DB에서)
        this.templateLibrary = [
            {
                id: 'basic_score',
                difficulty: DifficultyLevel.EASY,
                objectiveType: ObjectiveType.SCORE,
                boardTemplate: this.createBasicScoreTemplate(),
                description: '기본 점수 달성 레벨'
            },
            {
                id: 'collection_medium',
                difficulty: DifficultyLevel.MEDIUM,
                objectiveType: ObjectiveType.COLLECTION,
                boardTemplate: this.createCollectionTemplate(),
                description: '블록 수집 레벨'
            }
            // 더 많은 템플릿들...
        ];
        
        console.log(`[AILevelGenerator] ${this.templateLibrary.length}개 템플릿 로드 완료`);
    }
    
    private mapScoreToDifficulty(score: number): DifficultyLevel {
        if (score >= 0.9) return DifficultyLevel.EXPERT;
        if (score >= 0.75) return DifficultyLevel.HARD;
        if (score >= 0.5) return DifficultyLevel.MEDIUM;
        if (score >= 0.25) return DifficultyLevel.EASY;
        return DifficultyLevel.TUTORIAL;
    }
    
    private easifyLevel(level: LevelConfig, factor: number): LevelConfig {
        const adjustedLevel = { ...level };
        
        // 이동 수 증가
        if (adjustedLevel.maxMoves) {
            adjustedLevel.maxMoves = Math.ceil(adjustedLevel.maxMoves / factor);
        }
        
        // 장애물 감소
        if (adjustedLevel.obstacles) {
            const reduceCount = Math.floor(adjustedLevel.obstacles.length * 0.2);
            adjustedLevel.obstacles = adjustedLevel.obstacles.slice(0, -reduceCount);
        }
        
        // 별점 기준 완화
        adjustedLevel.starThresholds = {
            oneStar: Math.floor(adjustedLevel.starThresholds.oneStar * 0.8),
            twoStar: Math.floor(adjustedLevel.starThresholds.twoStar * 0.8),
            threeStar: Math.floor(adjustedLevel.starThresholds.threeStar * 0.8)
        };
        
        return adjustedLevel;
    }
    
    private hardifyLevel(level: LevelConfig, factor: number): LevelConfig {
        const adjustedLevel = { ...level };
        
        // 이동 수 감소
        if (adjustedLevel.maxMoves) {
            adjustedLevel.maxMoves = Math.floor(adjustedLevel.maxMoves / factor);
        }
        
        // 별점 기준 강화
        adjustedLevel.starThresholds = {
            oneStar: Math.ceil(adjustedLevel.starThresholds.oneStar * factor),
            twoStar: Math.ceil(adjustedLevel.starThresholds.twoStar * factor),
            threeStar: Math.ceil(adjustedLevel.starThresholds.threeStar * factor)
        };
        
        return adjustedLevel;
    }
    
    private calculateTargetScore(difficulty: DifficultyLevel): number {
        const baseScore = 1000;
        const multipliers = {
            [DifficultyLevel.TUTORIAL]: 0.5,
            [DifficultyLevel.EASY]: 1.0,
            [DifficultyLevel.MEDIUM]: 1.5,
            [DifficultyLevel.HARD]: 2.0,
            [DifficultyLevel.EXPERT]: 2.5,
            [DifficultyLevel.NIGHTMARE]: 3.0
        };
        
        return Math.floor(baseScore * (multipliers[difficulty] || 1.0));
    }
    
    private calculateTargetCollection(difficulty: DifficultyLevel): number {
        const baseColl = 10;
        const multipliers = {
            [DifficultyLevel.TUTORIAL]: 0.5,
            [DifficultyLevel.EASY]: 1.0,
            [DifficultyLevel.MEDIUM]: 1.2,
            [DifficultyLevel.HARD]: 1.5,
            [DifficultyLevel.EXPERT]: 2.0,
            [DifficultyLevel.NIGHTMARE]: 2.5
        };
        
        return Math.floor(baseColl * (multipliers[difficulty] || 1.0));
    }
    
    private getRandomSpecialBlockType(): BlockType {
        const types = [BlockType.LINE_HORIZONTAL, BlockType.LINE_VERTICAL, BlockType.BOMB, BlockType.RAINBOW];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    private calculateDefaultMoves(difficulty: DifficultyLevel): number {
        const baseMoves = {
            [DifficultyLevel.TUTORIAL]: 30,
            [DifficultyLevel.EASY]: 25,
            [DifficultyLevel.MEDIUM]: 20,
            [DifficultyLevel.HARD]: 15,
            [DifficultyLevel.EXPERT]: 12,
            [DifficultyLevel.NIGHTMARE]: 10
        };
        
        return baseMoves[difficulty] || 20;
    }
    
    private calculateStarThresholds(difficulty: DifficultyLevel, objectives: LevelObjective[]): any {
        const baseScore = this.calculateTargetScore(difficulty);
        
        return {
            oneStar: Math.floor(baseScore * 0.6),
            twoStar: Math.floor(baseScore * 0.8),
            threeStar: baseScore
        };
    }
    
    private calculateEstimatedPlayTime(difficulty: DifficultyLevel): number {
        const baseTimes = {
            [DifficultyLevel.TUTORIAL]: 60,
            [DifficultyLevel.EASY]: 120,
            [DifficultyLevel.MEDIUM]: 180,
            [DifficultyLevel.HARD]: 240,
            [DifficultyLevel.EXPERT]: 300,
            [DifficultyLevel.NIGHTMARE]: 420
        };
        
        return baseTimes[difficulty] || 180;
    }
    
    private generateDefaultBoard(boardSize: { width: number; height: number }): BlockType[][] {
        const board: BlockType[][] = [];
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, 5);
        
        for (let row = 0; row < boardSize.height; row++) {
            board[row] = [];
            for (let col = 0; col < boardSize.width; col++) {
                board[row][col] = colors[Math.floor(Math.random() * colors.length)];
            }
        }
        
        return board;
    }
    
    private findBestTemplate(parameters: GenerationParameters): LevelTemplate | null {
        return this.templateLibrary.find(template =>
            template.difficulty === parameters.difficulty &&
            template.objectiveType === parameters.objectiveType
        ) || null;
    }
    
    private customizeTemplate(template: LevelTemplate, parameters: GenerationParameters): LevelConfig {
        // 템플릿을 파라미터에 맞게 커스터마이즈
        return {
            id: `template_${template.id}_${Date.now()}`,
            worldId: 'generated',
            levelNumber: 1,
            
            boardSize: parameters.boardSize,
            initialLayout: template.boardTemplate,
            
            objectives: this.generateObjectivesFromTemplate(template, parameters),
            
            maxMoves: parameters.maxMoves || this.calculateDefaultMoves(parameters.difficulty),
            timeLimit: parameters.timeLimit,
            
            starThresholds: {
                oneStar: 800,
                twoStar: 1600,
                threeStar: 2400
            },
            
            specialBlocks: [],
            obstacles: [],
            powerUps: [],
            
            difficulty: parameters.difficulty,
            estimatedPlayTime: this.calculateEstimatedPlayTime(parameters.difficulty),
            
            aiGenerated: false,
            generationParameters: parameters.aiParams,
            
            createdAt: new Date().toISOString(),
            validationScore: 85,
            balanceScore: 80,
            funScore: 75
        };
    }
    
    private generateBasicLevel(parameters: GenerationParameters): LevelConfig {
        return {
            id: `basic_${Date.now()}`,
            worldId: 'generated',
            levelNumber: 1,
            
            boardSize: parameters.boardSize,
            initialLayout: this.generateDefaultBoard(parameters.boardSize),
            
            objectives: [{
                type: ObjectiveType.SCORE,
                target: 'total_score',
                quantity: this.calculateTargetScore(parameters.difficulty),
                description: '목표 점수를 달성하세요',
                priority: 10
            }],
            
            maxMoves: this.calculateDefaultMoves(parameters.difficulty),
            timeLimit: parameters.timeLimit,
            
            starThresholds: this.calculateStarThresholds(parameters.difficulty, []),
            
            specialBlocks: [],
            obstacles: [],
            powerUps: [],
            
            difficulty: parameters.difficulty,
            estimatedPlayTime: this.calculateEstimatedPlayTime(parameters.difficulty),
            
            aiGenerated: false,
            
            createdAt: new Date().toISOString(),
            validationScore: 70,
            balanceScore: 70,
            funScore: 70
        };
    }
    
    private createBasicScoreTemplate(): BlockType[][] {
        // 8x8 기본 점수 템플릿
        return Array(8).fill(null).map(() =>
            Array(8).fill(null).map(() =>
                BlockTypeHelper.getBasicColorTypes()[Math.floor(Math.random() * 5)]
            )
        );
    }
    
    private createCollectionTemplate(): BlockType[][] {
        // 8x8 수집 템플릿 (특정 색상이 더 많음)
        const template: BlockType[][] = [];
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, 5);
        const targetColor = colors[0]; // 빨간색을 타겟으로
        
        for (let row = 0; row < 8; row++) {
            template[row] = [];
            for (let col = 0; col < 8; col++) {
                if (Math.random() < 0.3) {
                    template[row][col] = targetColor;
                } else {
                    template[row][col] = colors[Math.floor(Math.random() * colors.length)];
                }
            }
        }
        
        return template;
    }
    
    private generateObjectivesFromTemplate(template: LevelTemplate, parameters: GenerationParameters): LevelObjective[] {
        if (template.objectiveType === ObjectiveType.SCORE) {
            return [{
                type: ObjectiveType.SCORE,
                target: 'total_score',
                quantity: this.calculateTargetScore(parameters.difficulty),
                description: '목표 점수를 달성하세요',
                priority: 10
            }];
        } else if (template.objectiveType === ObjectiveType.COLLECTION) {
            return [{
                type: ObjectiveType.COLLECTION,
                target: BlockType.RED,
                quantity: this.calculateTargetCollection(parameters.difficulty),
                description: '🔴 블록을 수집하세요',
                priority: 10
            }];
        }
        
        return [];
    }
    
    private adjustParametersForSeries(baseParams: GenerationParameters, index: number, total: number): GenerationParameters {
        const progress = index / (total - 1);
        
        return {
            ...baseParams,
            specialBlockRatio: baseParams.specialBlockRatio + progress * 0.1,
            obstacleRatio: baseParams.obstacleRatio + progress * 0.05,
            colorVariety: Math.min(6, baseParams.colorVariety + Math.floor(progress * 2))
        };
    }
    
    private calculateProgressiveDifficulty(index: number, total: number, baseDifficulty: DifficultyLevel): DifficultyLevel {
        if (index === 0) return DifficultyLevel.TUTORIAL;
        
        const progress = index / (total - 1);
        const difficulties = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD];
        
        const diffIndex = Math.floor(progress * difficulties.length);
        return difficulties[Math.min(diffIndex, difficulties.length - 1)];
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 레벨 템플릿 인터페이스
interface LevelTemplate {
    id: string;
    difficulty: DifficultyLevel;
    objectiveType: ObjectiveType;
    boardTemplate: BlockType[][];
    description: string;
}

// 레벨 검증기 클래스
class LevelValidator {
    async validateLevel(level: LevelConfig): Promise<ValidationResult> {
        const issues: string[] = [];
        const suggestions: string[] = [];
        
        // 기본 구조 검증
        if (!level.boardSize || level.boardSize.width < 6 || level.boardSize.height < 6) {
            issues.push('보드 크기가 너무 작습니다 (최소 6x6)');
        }
        
        if (!level.objectives || level.objectives.length === 0) {
            issues.push('레벨 목표가 설정되지 않았습니다');
        }
        
        if (!level.maxMoves || level.maxMoves < 5) {
            issues.push('최대 이동 수가 너무 적습니다');
        }
        
        // 해결 가능성 검증 (간단한 휴리스틱)
        const solvabilityScore = this.calculateSolvabilityScore(level);
        const balanceScore = this.calculateBalanceScore(level);
        const difficultyScore = this.calculateDifficultyScore(level);
        const funScore = this.calculateFunScore(level);
        
        if (solvabilityScore < 50) {
            issues.push('레벨이 너무 어려워 해결하기 어려울 수 있습니다');
            suggestions.push('이동 수를 늘리거나 장애물을 줄이세요');
        }
        
        if (balanceScore < 50) {
            issues.push('레벨 밸런스가 좋지 않습니다');
            suggestions.push('색상 분포를 더 균등하게 조정하세요');
        }
        
        return {
            isValid: issues.length === 0 || solvabilityScore >= 70,
            issues,
            suggestions,
            scores: {
                solvability: solvabilityScore,
                balance: balanceScore,
                difficulty: difficultyScore,
                funFactor: funScore
            }
        };
    }
    
    private calculateSolvabilityScore(level: LevelConfig): number {
        let score = 80; // 기본 점수
        
        // 이동 수 대비 목표 점수
        const moveEfficiency = level.maxMoves / (level.objectives[0]?.quantity || 1000);
        if (moveEfficiency < 0.01) score -= 30;
        else if (moveEfficiency < 0.02) score -= 10;
        
        // 장애물 비율
        const totalCells = level.boardSize.width * level.boardSize.height;
        const obstacleRatio = (level.obstacles?.length || 0) / totalCells;
        if (obstacleRatio > 0.3) score -= 20;
        
        return Math.max(0, Math.min(100, score));
    }
    
    private calculateBalanceScore(level: LevelConfig): number {
        // 색상 분포, 특수 블록 배치 등을 종합적으로 평가
        let score = 75;
        
        // 특수 블록 비율
        const totalCells = level.boardSize.width * level.boardSize.height;
        const specialRatio = (level.specialBlocks?.length || 0) / totalCells;
        if (specialRatio > 0.2) score -= 10; // 너무 많음
        if (specialRatio < 0.05) score += 5; // 적당함
        
        return Math.max(0, Math.min(100, score));
    }
    
    private calculateDifficultyScore(level: LevelConfig): number {
        // 설정된 난이도와 실제 레벨 복잡도의 일치도
        const difficultyValues = {
            [DifficultyLevel.TUTORIAL]: 20,
            [DifficultyLevel.EASY]: 40,
            [DifficultyLevel.MEDIUM]: 60,
            [DifficultyLevel.HARD]: 80,
            [DifficultyLevel.EXPERT]: 90,
            [DifficultyLevel.NIGHTMARE]: 100
        };
        
        return difficultyValues[level.difficulty] || 50;
    }
    
    private calculateFunScore(level: LevelConfig): number {
        // 재미 요소 평가 (특수 블록, 다양성 등)
        let score = 60;
        
        if (level.specialBlocks && level.specialBlocks.length > 0) score += 20;
        if (level.objectives && level.objectives.length > 1) score += 10;
        if (level.estimatedPlayTime > 60 && level.estimatedPlayTime < 300) score += 10;
        
        return Math.max(0, Math.min(100, score));
    }
}