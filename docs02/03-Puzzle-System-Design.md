# 퍼즐 시스템 설계

## 개요

Sweet Puzzle 게임의 핵심인 매치-3 퍼즐 시스템의 상세 설계서입니다. 직관적인 게임플레이와 전략적 깊이를 제공하는 퍼즐 메커니즘, AI 기반 레벨 생성, 특수 블록 시스템을 다룹니다.

---

## 1. 🧩 매치-3 게임 로직

### 기본 매칭 시스템

#### 블록 매칭 알고리즘
```typescript
// 블록 타입 정의
export enum BlockType {
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow',
    PURPLE = 'purple',
    ORANGE = 'orange',
    EMPTY = 'empty',
    OBSTACLE = 'obstacle'
}

// 매칭 검사 시스템
export class MatchDetector {
    private board: Block[][];
    private boardWidth: number;
    private boardHeight: number;
    
    constructor(board: Block[][]) {
        this.board = board;
        this.boardHeight = board.length;
        this.boardWidth = board[0].length;
    }
    
    // 모든 매치 찾기
    findAllMatches(): Match[] {
        const matches: Match[] = [];
        
        // 수평 매치 검사
        matches.push(...this.findHorizontalMatches());
        
        // 수직 매치 검사
        matches.push(...this.findVerticalMatches());
        
        // L/T 모양 매치 검사 (특수 블록 생성용)
        matches.push(...this.findShapeMatches());
        
        return this.removeDuplicateMatches(matches);
    }
    
    private findHorizontalMatches(): Match[] {
        const matches: Match[] = [];
        
        for (let row = 0; row < this.boardHeight; row++) {
            let matchStart = 0;
            let currentType = this.board[row][0].type;
            
            for (let col = 1; col <= this.boardWidth; col++) {
                const nextType = col < this.boardWidth ? this.board[row][col].type : BlockType.EMPTY;
                
                if (nextType !== currentType || col === this.boardWidth) {
                    const matchLength = col - matchStart;
                    
                    if (matchLength >= 3 && currentType !== BlockType.EMPTY && currentType !== BlockType.OBSTACLE) {
                        matches.push(new Match(
                            MatchType.HORIZONTAL,
                            this.getBlocksInRange(row, matchStart, row, col - 1),
                            matchLength
                        ));
                    }
                    
                    matchStart = col;
                    currentType = nextType;
                }
            }
        }
        
        return matches;
    }
    
    private findVerticalMatches(): Match[] {
        const matches: Match[] = [];
        
        for (let col = 0; col < this.boardWidth; col++) {
            let matchStart = 0;
            let currentType = this.board[0][col].type;
            
            for (let row = 1; row <= this.boardHeight; row++) {
                const nextType = row < this.boardHeight ? this.board[row][col].type : BlockType.EMPTY;
                
                if (nextType !== currentType || row === this.boardHeight) {
                    const matchLength = row - matchStart;
                    
                    if (matchLength >= 3 && currentType !== BlockType.EMPTY && currentType !== BlockType.OBSTACLE) {
                        matches.push(new Match(
                            MatchType.VERTICAL,
                            this.getBlocksInRange(matchStart, col, row - 1, col),
                            matchLength
                        ));
                    }
                    
                    matchStart = row;
                    currentType = nextType;
                }
            }
        }
        
        return matches;
    }
}
```

#### 블록 이동 검증
```typescript
export class MoveValidator {
    // 유효한 이동인지 검사
    isValidMove(from: Position, to: Position, board: Block[][]): boolean {
        // 1. 인접성 검사
        if (!this.isAdjacent(from, to)) {
            return false;
        }
        
        // 2. 빈 칸이나 장애물 이동 불가
        if (this.isEmptyOrObstacle(from, board) || this.isEmptyOrObstacle(to, board)) {
            return false;
        }
        
        // 3. 이동 후 매치 생성 여부 확인
        const tempBoard = this.simulateMove(from, to, board);
        const matches = new MatchDetector(tempBoard).findAllMatches();
        
        return matches.length > 0;
    }
    
    private isAdjacent(pos1: Position, pos2: Position): boolean {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    private simulateMove(from: Position, to: Position, board: Block[][]): Block[][] {
        const tempBoard = board.map(row => [...row]);
        
        // 블록 교환
        const temp = tempBoard[from.y][from.x];
        tempBoard[from.y][from.x] = tempBoard[to.y][to.x];
        tempBoard[to.y][to.x] = temp;
        
        return tempBoard;
    }
}
```

### 중력 및 낙하 시스템

#### 물리 기반 낙하 시뮬레이션
```typescript
export class GravitySystem {
    private fallSpeed: number = 500; // pixels per second
    private bounceEffect: number = 0.1; // 착지 시 튕김 효과
    
    // 중력 적용 및 빈 공간 채우기
    applyGravity(board: Block[][]): GravityResult {
        const movements: BlockMovement[] = [];
        const newBlocks: Block[] = [];
        
        for (let col = 0; col < board[0].length; col++) {
            const columnBlocks = this.getColumnBlocks(board, col);
            const nonEmptyBlocks = columnBlocks.filter(block => block.type !== BlockType.EMPTY);
            
            // 아래쪽부터 블록 재배치
            for (let row = board.length - 1; row >= 0; row--) {
                const targetIndex = board.length - 1 - row;
                
                if (targetIndex < nonEmptyBlocks.length) {
                    const fallingBlock = nonEmptyBlocks[targetIndex];
                    const originalRow = fallingBlock.position.y;
                    
                    if (originalRow !== row) {
                        movements.push(new BlockMovement(
                            fallingBlock,
                            new Position(col, originalRow),
                            new Position(col, row),
                            this.calculateFallTime(originalRow - row)
                        ));
                    }
                    
                    board[row][col] = fallingBlock;
                    fallingBlock.position = new Position(col, row);
                } else {
                    // 새로운 블록 생성 필요
                    const newBlock = this.generateNewBlock(col, row);
                    board[row][col] = newBlock;
                    newBlocks.push(newBlock);
                    
                    // 화면 위에서 떨어지는 애니메이션
                    movements.push(new BlockMovement(
                        newBlock,
                        new Position(col, -1 - (targetIndex - nonEmptyBlocks.length)),
                        new Position(col, row),
                        this.calculateFallTime(row + 1 + (targetIndex - nonEmptyBlocks.length))
                    ));
                }
            }
        }
        
        return new GravityResult(movements, newBlocks);
    }
    
    private calculateFallTime(distance: number): number {
        // 물리적으로 더 자연스러운 낙하 시간 계산 (가속도 고려)
        return Math.sqrt(2 * distance / (this.fallSpeed / 100));
    }
    
    private generateNewBlock(col: number, row: number): Block {
        const randomType = this.getRandomBlockType();
        return new Block(randomType, new Position(col, row));
    }
}
```

### 연쇄 반응 처리

#### 콤보 시스템
```typescript
export class ComboSystem {
    private comboMultiplier: number = 1.0;
    private comboCounter: number = 0;
    
    // 연쇄 반응 처리
    async processChainReaction(initialMatches: Match[], board: Block[][]): Promise<ChainResult> {
        const allMatches: Match[] = [];
        const totalScore = { value: 0 };
        let currentMatches = initialMatches;
        this.comboCounter = 0;
        
        while (currentMatches.length > 0) {
            this.comboCounter++;
            this.comboMultiplier = 1.0 + (this.comboCounter - 1) * 0.2; // 20%씩 증가
            
            // 현재 매치들 처리
            allMatches.push(...currentMatches);
            const roundScore = this.calculateMatchScore(currentMatches);
            totalScore.value += Math.floor(roundScore * this.comboMultiplier);
            
            // 블록 제거
            this.removeMatchedBlocks(currentMatches, board);
            
            // 중력 적용
            const gravityResult = new GravitySystem().applyGravity(board);
            
            // 중력 애니메이션 대기
            await this.waitForGravityAnimation(gravityResult);
            
            // 새로운 매치 검사
            currentMatches = new MatchDetector(board).findAllMatches();
            
            // 무한 루프 방지
            if (this.comboCounter > 10) {
                console.warn('Too many combo chains, breaking to prevent infinite loop');
                break;
            }
        }
        
        return new ChainResult(allMatches, totalScore.value, this.comboCounter);
    }
    
    private calculateMatchScore(matches: Match[]): number {
        return matches.reduce((total, match) => {
            const baseScore = match.blocks.length * 10;
            const lengthBonus = Math.max(0, match.blocks.length - 3) * 20;
            return total + baseScore + lengthBonus;
        }, 0);
    }
}
```

---

## 2. 🎯 레벨 시스템

### 레벨 구조 정의

#### 레벨 데이터 모델
```typescript
// 레벨 목표 타입
export enum ObjectiveType {
    SCORE = 'score',           // 목표 점수 달성
    COLLECTION = 'collection', // 특정 블록 수집
    CLEAR_OBSTACLES = 'clear_obstacles', // 장애물 제거
    CLEAR_JELLIES = 'clear_jellies',     // 젤리 제거
    BRING_DOWN = 'bring_down', // 아이템을 바닥으로 내리기
    TIME_CHALLENGE = 'time_challenge'    // 시간 제한 도전
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
    powerUps?: PowerUpPlacement[];
    
    // 난이도 정보
    difficulty: DifficultyLevel;
    estimatedPlayTime: number; // 초 단위
    
    // AI 생성 정보
    aiGenerated: boolean;
    generationParameters?: AIGenerationParams;
}

export interface LevelObjective {
    type: ObjectiveType;
    target: string; // 'red_blocks', 'score', 'jellies' 등
    quantity: number;
    description: string;
}
```

#### 동적 레벨 생성기
```typescript
export class LevelGenerator {
    private aiService: AIService;
    private validator: LevelValidator;
    
    constructor() {
        this.aiService = new AIService();
        this.validator = new LevelValidator();
    }
    
    // AI 기반 레벨 생성
    async generateLevel(parameters: GenerationParameters): Promise<LevelConfig> {
        const prompt = this.buildGenerationPrompt(parameters);
        
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            try {
                // GPT-4에게 레벨 생성 요청
                const rawLevel = await this.aiService.generateLevel(prompt);
                
                // 생성된 레벨 파싱
                const levelConfig = this.parseLevelFromAI(rawLevel);
                
                // 레벨 유효성 검증
                const validation = await this.validator.validateLevel(levelConfig);
                
                if (validation.isValid) {
                    return levelConfig;
                }
                
                // 검증 실패 시 피드백을 통해 재생성
                prompt.addFeedback(validation.issues);
                attempts++;
                
            } catch (error) {
                console.error('Level generation failed:', error);
                attempts++;
            }
        }
        
        // AI 생성 실패 시 템플릿 기반 레벨 생성
        return this.generateFromTemplate(parameters);
    }
    
    private buildGenerationPrompt(params: GenerationParameters): AIPrompt {
        return new AIPrompt(`
당신은 매치-3 퍼즐 게임의 전문 레벨 디자이너입니다.
다음 조건에 맞는 레벨을 설계해주세요:

게임 조건:
- 보드 크기: ${params.boardSize.width}x${params.boardSize.height}
- 난이도: ${params.difficulty}
- 레벨 타입: ${params.objectiveType}
- 플레이어 스킬: ${params.playerSkill}

설계 원칙:
1. 해결 가능한 퍼즐이어야 합니다
2. ${params.difficulty} 난이도에 적합한 도전 수준
3. 특수 블록의 전략적 활용 기회 제공
4. 플레이어의 성취감을 위한 적절한 보상

출력 형식: JSON
{
  "boardLayout": number[][],
  "objectives": [...],
  "maxMoves": number,
  "specialElements": {...},
  "expectedSolution": "string"
}
        `);
    }
}
```

### 난이도 곡선 설계

#### 적응형 난이도 시스템
```typescript
export class AdaptiveDifficultySystem {
    private playerProfile: PlayerProfile;
    private difficultyCalculator: DifficultyCalculator;
    
    // 플레이어에게 최적화된 난이도 계산
    calculateOptimalDifficulty(playerStats: PlayerStats): DifficultyLevel {
        const factors = {
            successRate: this.calculateSuccessRate(playerStats),
            averageAttempts: playerStats.averageAttemptsPerLevel,
            playTime: playerStats.averagePlayTimePerLevel,
            quitRate: playerStats.quitRate,
            boosterUsage: playerStats.boosterUsageRate
        };
        
        // 가중치 기반 난이도 점수 계산
        const difficultyScore = 
            factors.successRate * 0.4 +           // 성공률 40%
            (1 / factors.averageAttempts) * 0.3 + // 시도 횟수 30%
            factors.playTime * 0.2 +              // 플레이 시간 20%
            (1 - factors.quitRate) * 0.1;         // 완주율 10%
        
        return this.mapScoreToDifficulty(difficultyScore);
    }
    
    // 실시간 난이도 조정
    async adjustLevelDifficulty(
        levelConfig: LevelConfig, 
        playerPerformance: PerformanceData
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
    
    private easifyLevel(level: LevelConfig, factor: number): LevelConfig {
        const adjustedLevel = { ...level };
        
        // 이동 수 증가
        if (adjustedLevel.maxMoves) {
            adjustedLevel.maxMoves = Math.ceil(adjustedLevel.maxMoves * factor);
        }
        
        // 장애물 감소
        if (adjustedLevel.obstacles) {
            const reduceCount = Math.floor(adjustedLevel.obstacles.length * 0.2);
            adjustedLevel.obstacles = adjustedLevel.obstacles.slice(0, -reduceCount);
        }
        
        return adjustedLevel;
    }
}
```

---

## 3. ⭐ 특수 블록 시스템

### 특수 블록 타입 정의

#### 특수 블록 클래스 계층
```typescript
export abstract class SpecialBlock extends Block {
    protected power: number;
    protected activationPattern: ActivationPattern;
    
    constructor(type: BlockType, power: number) {
        super(type, new Position(0, 0));
        this.power = power;
    }
    
    abstract activate(board: Block[][], position: Position): ActivationResult;
    abstract getPreviewEffect(board: Block[][], position: Position): Position[];
}

// 라인 블록 (4개 매치로 생성)
export class LineBlock extends SpecialBlock {
    private direction: LineDirection;
    
    constructor(direction: LineDirection) {
        super(BlockType.LINE, 1);
        this.direction = direction;
    }
    
    activate(board: Block[][], position: Position): ActivationResult {
        const affectedPositions: Position[] = [];
        
        if (this.direction === LineDirection.HORIZONTAL) {
            // 가로줄 전체 제거
            for (let col = 0; col < board[0].length; col++) {
                if (board[position.y][col].type !== BlockType.OBSTACLE) {
                    affectedPositions.push(new Position(col, position.y));
                }
            }
        } else {
            // 세로줄 전체 제거
            for (let row = 0; row < board.length; row++) {
                if (board[row][position.x].type !== BlockType.OBSTACLE) {
                    affectedPositions.push(new Position(position.x, row));
                }
            }
        }
        
        return new ActivationResult(affectedPositions, this.power * 50, EffectType.LINE_CLEAR);
    }
}

// 폭탄 블록 (5개 매치로 생성)
export class BombBlock extends SpecialBlock {
    private explosionRadius: number;
    
    constructor(radius: number = 1) {
        super(BlockType.BOMB, 2);
        this.explosionRadius = radius;
    }
    
    activate(board: Block[][], position: Position): ActivationResult {
        const affectedPositions: Position[] = [];
        
        // 폭발 반경 내 모든 블록 제거
        for (let dy = -this.explosionRadius; dy <= this.explosionRadius; dy++) {
            for (let dx = -this.explosionRadius; dx <= this.explosionRadius; dx++) {
                const targetX = position.x + dx;
                const targetY = position.y + dy;
                
                if (this.isValidPosition(targetX, targetY, board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        affectedPositions.push(new Position(targetX, targetY));
                    }
                }
            }
        }
        
        return new ActivationResult(
            affectedPositions, 
            this.power * affectedPositions.length * 20, 
            EffectType.EXPLOSION
        );
    }
}

// 레인보우 블록 (6개+ 매치로 생성)
export class RainbowBlock extends SpecialBlock {
    constructor() {
        super(BlockType.RAINBOW, 3);
    }
    
    activate(board: Block[][], position: Position): ActivationResult {
        // 클릭한 블록과 같은 색상의 모든 블록 제거
        const targetColor = this.getTargetColor(board, position);
        const affectedPositions: Position[] = [];
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (board[row][col].type === targetColor) {
                    affectedPositions.push(new Position(col, row));
                }
            }
        }
        
        return new ActivationResult(
            affectedPositions, 
            this.power * affectedPositions.length * 30, 
            EffectType.COLOR_CLEAR
        );
    }
    
    private getTargetColor(board: Block[][], position: Position): BlockType {
        // 가장 많은 블록의 색상 선택
        const colorCount = new Map<BlockType, number>();
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const blockType = board[row][col].type;
                if (this.isNormalBlock(blockType)) {
                    colorCount.set(blockType, (colorCount.get(blockType) || 0) + 1);
                }
            }
        }
        
        return Array.from(colorCount.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }
}
```

### 특수 블록 조합 시스템

#### 블록 조합 효과
```typescript
export class SpecialBlockCombinator {
    // 두 특수 블록의 조합 효과 계산
    calculateCombination(block1: SpecialBlock, block2: SpecialBlock): CombinationEffect {
        const combo = `${block1.type}_${block2.type}`;
        
        switch (combo) {
            case 'LINE_LINE':
                return this.createCrossExplosion();
                
            case 'LINE_BOMB':
                return this.createLineBombCombo();
                
            case 'BOMB_BOMB':
                return this.createMegaExplosion();
                
            case 'RAINBOW_LINE':
                return this.createRainbowLineCombo();
                
            case 'RAINBOW_BOMB':
                return this.createRainbowBombCombo();
                
            case 'RAINBOW_RAINBOW':
                return this.createBoardClear();
                
            default:
                return this.createDefaultCombo(block1, block2);
        }
    }
    
    private createCrossExplosion(): CombinationEffect {
        return new CombinationEffect(
            'cross_explosion',
            (board: Block[][], position: Position) => {
                const affected: Position[] = [];
                
                // 십자 모양으로 전체 라인 제거
                for (let col = 0; col < board[0].length; col++) {
                    affected.push(new Position(col, position.y));
                }
                for (let row = 0; row < board.length; row++) {
                    affected.push(new Position(position.x, row));
                }
                
                return affected;
            },
            1000,
            EffectType.CROSS_EXPLOSION
        );
    }
    
    private createMegaExplosion(): CombinationEffect {
        return new CombinationEffect(
            'mega_explosion',
            (board: Block[][], position: Position) => {
                const affected: Position[] = [];
                const radius = 3; // 더 큰 폭발 반경
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const targetX = position.x + dx;
                        const targetY = position.y + dy;
                        
                        if (this.isValidPosition(targetX, targetY, board)) {
                            affected.push(new Position(targetX, targetY));
                        }
                    }
                }
                
                return affected;
            },
            2000,
            EffectType.MEGA_EXPLOSION
        );
    }
}
```

---

## 4. 🎲 보드 생성 및 관리

### 랜덤 보드 생성

#### 균형잡힌 보드 생성기
```typescript
export class BoardGenerator {
    private colorDistribution: Map<BlockType, number>;
    private minimumMatches: number = 0; // 시작 시 즉시 매치 방지
    
    constructor() {
        this.setupColorDistribution();
    }
    
    // 새로운 보드 생성
    generateBoard(width: number, height: number, constraints?: BoardConstraints): Block[][] {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            const board = this.createRandomBoard(width, height, constraints);
            
            if (this.isValidBoard(board)) {
                return board;
            }
            
            attempts++;
        }
        
        // 실패 시 안전한 보드 생성
        return this.createSafeBoard(width, height);
    }
    
    private createRandomBoard(width: number, height: number, constraints?: BoardConstraints): Block[][] {
        const board: Block[][] = [];
        
        for (let row = 0; row < height; row++) {
            board[row] = [];
            
            for (let col = 0; col < width; col++) {
                let blockType: BlockType;
                let attempts = 0;
                
                do {
                    blockType = this.getWeightedRandomType();
                    attempts++;
                } while (
                    attempts < 10 && 
                    this.wouldCreateImmediateMatch(board, col, row, blockType)
                );
                
                board[row][col] = new Block(blockType, new Position(col, row));
            }
        }
        
        return board;
    }
    
    private wouldCreateImmediateMatch(
        board: Block[][], 
        col: number, 
        row: number, 
        blockType: BlockType
    ): boolean {
        // 수평 매치 체크
        let horizontalCount = 1;
        
        // 왼쪽 확인
        for (let c = col - 1; c >= 0 && board[row][c]?.type === blockType; c--) {
            horizontalCount++;
        }
        
        // 오른쪽 확인
        for (let c = col + 1; c < board[row].length && board[row][c]?.type === blockType; c++) {
            horizontalCount++;
        }
        
        if (horizontalCount >= 3) return true;
        
        // 수직 매치 체크
        let verticalCount = 1;
        
        // 위쪽 확인
        for (let r = row - 1; r >= 0 && board[r]?.[col]?.type === blockType; r--) {
            verticalCount++;
        }
        
        // 아래쪽 확인 (아직 생성되지 않은 영역)
        for (let r = row + 1; r < board.length && board[r]?.[col]?.type === blockType; r++) {
            verticalCount++;
        }
        
        return verticalCount >= 3;
    }
}
```

### 데드락 방지 시스템

#### 가능한 이동 검사
```typescript
export class DeadlockDetector {
    // 보드에 가능한 이동이 있는지 검사
    hasValidMoves(board: Block[][]): boolean {
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (this.canMakeValidMove(board, col, row)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private canMakeValidMove(board: Block[][], col: number, row: number): boolean {
        const currentBlock = board[row][col];
        
        if (currentBlock.type === BlockType.EMPTY || currentBlock.type === BlockType.OBSTACLE) {
            return false;
        }
        
        // 4방향으로 교환 시도
        const directions = [
            { dx: 0, dy: -1 }, // 위
            { dx: 1, dy: 0 },  // 오른쪽
            { dx: 0, dy: 1 },  // 아래
            { dx: -1, dy: 0 }  // 왼쪽
        ];
        
        for (const dir of directions) {
            const newCol = col + dir.dx;
            const newRow = row + dir.dy;
            
            if (this.isValidPosition(newCol, newRow, board)) {
                if (this.wouldCreateMatchAfterSwap(board, col, row, newCol, newRow)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 힌트 시스템용 가능한 이동 찾기
    findPossibleMoves(board: Block[][]): Move[] {
        const possibleMoves: Move[] = [];
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const moves = this.findMovesForPosition(board, col, row);
                possibleMoves.push(...moves);
            }
        }
        
        return possibleMoves;
    }
}
```

### 힌트 시스템

#### 스마트 힌트 제공
```typescript
export class HintSystem {
    private hintCooldown: number = 10000; // 10초
    private lastHintTime: number = 0;
    
    // 최적의 힌트 제공
    getBestHint(board: Block[][]): Hint | null {
        if (!this.canShowHint()) {
            return null;
        }
        
        const possibleMoves = new DeadlockDetector().findPossibleMoves(board);
        
        if (possibleMoves.length === 0) {
            return null;
        }
        
        // 이동을 점수별로 평가
        const scoredMoves = possibleMoves.map(move => ({
            move,
            score: this.evaluateMove(board, move)
        }));
        
        // 최고 점수의 이동 선택
        scoredMoves.sort((a, b) => b.score - a.score);
        const bestMove = scoredMoves[0].move;
        
        this.lastHintTime = Date.now();
        
        return new Hint(
            bestMove.from,
            bestMove.to,
            this.getHintMessage(bestMove, scoredMoves[0].score),
            HintType.BEST_MOVE
        );
    }
    
    private evaluateMove(board: Block[][], move: Move): number {
        // 임시로 이동 실행
        const tempBoard = this.simulateMove(board, move);
        const matches = new MatchDetector(tempBoard).findAllMatches();
        
        let score = 0;
        
        // 기본 매치 점수
        for (const match of matches) {
            score += match.blocks.length * 10;
            
            // 특수 블록 생성 보너스
            if (match.blocks.length >= 4) {
                score += 50;
            }
            if (match.blocks.length >= 5) {
                score += 100;
            }
        }
        
        // 연쇄 반응 가능성 평가
        score += this.estimateChainPotential(tempBoard) * 20;
        
        // 목표 달성 기여도
        score += this.evaluateObjectiveContribution(matches) * 30;
        
        return score;
    }
    
    private canShowHint(): boolean {
        return Date.now() - this.lastHintTime >= this.hintCooldown;
    }
}
```

### 셔플 기능

#### 보드 재배치 시스템
```typescript
export class BoardShuffler {
    // 데드락 상황에서 보드 섞기
    shuffleBoard(board: Block[][]): ShuffleResult {
        const nonObstacleBlocks = this.collectShufflableBlocks(board);
        
        if (nonObstacleBlocks.length === 0) {
            return new ShuffleResult(false, 'No blocks to shuffle');
        }
        
        // Fisher-Yates 셔플 알고리즘
        for (let i = nonObstacleBlocks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nonObstacleBlocks[i], nonObstacleBlocks[j]] = [nonObstacleBlocks[j], nonObstacleBlocks[i]];
        }
        
        // 섞인 블록들을 보드에 재배치
        let blockIndex = 0;
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (this.isShufflablePosition(board[row][col])) {
                    board[row][col] = nonObstacleBlocks[blockIndex];
                    board[row][col].position = new Position(col, row);
                    blockIndex++;
                }
            }
        }
        
        // 즉시 매치 제거
        this.removeImmediateMatches(board);
        
        // 가능한 이동이 있는지 확인
        const hasValidMoves = new DeadlockDetector().hasValidMoves(board);
        
        return new ShuffleResult(hasValidMoves, hasValidMoves ? 'Shuffle successful' : 'Shuffle failed');
    }
    
    private collectShufflableBlocks(board: Block[][]): Block[] {
        const blocks: Block[] = [];
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (this.isShufflablePosition(board[row][col])) {
                    blocks.push(board[row][col]);
                }
            }
        }
        
        return blocks;
    }
    
    private isShufflablePosition(block: Block): boolean {
        return block.type !== BlockType.EMPTY && 
               block.type !== BlockType.OBSTACLE &&
               !block.isSpecialBlock();
    }
}
```

Sweet Puzzle의 퍼즐 시스템은 전통적인 매치-3 게임의 재미를 기반으로 하되, AI 기반 레벨 생성과 적응형 난이도 조절을 통해 개인화된 게임 경험을 제공합니다. 각 플레이어의 실력과 선호에 맞춘 최적의 도전을 지속적으로 제공하여 장기간 즐길 수 있는 퍼즐 게임을 구현합니다.