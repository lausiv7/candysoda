/**
 * [의도] Sweet Puzzle 보드 관리 시스템
 * [책임] 보드 생성, 레이아웃 관리, 데드락 방지, 힌트 시스템, 셔플 기능 통합 관리
 */

import { _decorator, Component, Vec2 } from 'cc';
import { BlockType, BlockTypeHelper } from './BlockType';
import { Block } from './Block';
import { MatchDetector } from './MatchDetector';

const { ccclass, property } = _decorator;

// 보드 제약 조건
export interface BoardConstraints {
    minMatches: number;
    maxMatches: number;
    colorDistribution: Map<BlockType, number>;
    obstaclePositions: Vec2[];
    specialBlockPositions: { position: Vec2; type: BlockType }[];
    symmetry?: 'horizontal' | 'vertical' | 'rotational' | 'none';
}

// 보드 생성 설정
export interface BoardGenerationSettings {
    width: number;
    height: number;
    colorCount: number;
    obstacleRatio: number;
    specialBlockRatio: number;
    preventInitialMatches: boolean;
    ensureSolvability: boolean;
    targetDifficulty: 'easy' | 'medium' | 'hard';
}

// 이동 정보
export interface Move {
    from: Vec2;
    to: Vec2;
    score: number;
    matchCount: number;
    specialBlocksCreated: number;
    chainPotential: number;
}

// 힌트 정보
export interface Hint {
    move: Move;
    description: string;
    priority: number;
    confidence: number;
    visualIndicators: Vec2[];
}

// 셔플 결과
export interface ShuffleResult {
    success: boolean;
    message: string;
    movesGenerated: number;
    boardState: BlockType[][];
    preservedPositions: Vec2[];
}

// 보드 분석 결과
export interface BoardAnalysis {
    totalMoves: number;
    averageMoveScore: number;
    specialBlockOpportunities: number;
    colorBalance: Map<BlockType, number>;
    difficultyScore: number;
    solvabilityScore: number;
    estimatedPlayTime: number;
    recommendations: string[];
}

@ccclass('BoardManager')
export class BoardManager extends Component {
    @property
    private preventDeadlocks: boolean = true;
    
    @property
    private enableHints: boolean = true;
    
    @property
    private hintCooldown: number = 10000; // 10초
    
    @property
    private maxShuffleAttempts: number = 5;
    
    private currentBoard: Block[][] = [];
    private boardWidth: number = 8;
    private boardHeight: number = 8;
    private lastHintTime: number = 0;
    private moveHistory: Move[] = [];
    private shuffleCount: number = 0;
    
    // 싱글톤 인스턴스
    private static instance: BoardManager | null = null;
    
    protected onLoad(): void {
        if (BoardManager.instance === null) {
            BoardManager.instance = this;
            this.init();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): BoardManager {
        if (!BoardManager.instance) {
            console.error('[BoardManager] Instance not initialized yet');
            return null;
        }
        return BoardManager.instance;
    }
    
    private init(): void {
        console.log('[BoardManager] 보드 관리 시스템 초기화 완료');
    }
    
    /**
     * [의도] 새로운 보드 생성 (메인 메서드)
     */
    generateBoard(settings: BoardGenerationSettings, constraints?: BoardConstraints): Block[][] {
        console.log(`[BoardManager] ${settings.width}x${settings.height} 보드 생성 시작`);
        
        this.boardWidth = settings.width;
        this.boardHeight = settings.height;
        
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
            try {
                const board = this.createRandomBoard(settings, constraints);
                
                if (this.validateBoard(board, settings)) {
                    this.currentBoard = board;
                    console.log(`[BoardManager] 보드 생성 성공 (${attempts + 1}번째 시도)`);
                    return board;
                }
                
                attempts++;
            } catch (error) {
                console.warn(`[BoardManager] 보드 생성 시도 ${attempts + 1} 실패:`, error);
                attempts++;
            }
        }
        
        // 실패 시 안전한 보드 생성
        console.warn('[BoardManager] 조건부 생성 실패, 안전 보드 생성');
        const safeBoard = this.createSafeBoard(settings);
        this.currentBoard = safeBoard;
        return safeBoard;
    }
    
    /**
     * [의도] 데드락 상황 감지 및 해결
     */
    checkAndResolveDeadlock(): boolean {
        if (!this.preventDeadlocks) return false;
        
        const possibleMoves = this.findAllPossibleMoves(this.currentBoard);
        
        if (possibleMoves.length === 0) {
            console.log('[BoardManager] 데드락 감지, 자동 해결 시작');
            return this.resolveDeadlock();
        }
        
        return true; // 정상 상태
    }
    
    /**
     * [의도] 힌트 제공 시스템
     */
    getHint(): Hint | null {
        if (!this.enableHints) return null;
        
        const currentTime = Date.now();
        if (currentTime - this.lastHintTime < this.hintCooldown) {
            console.log('[BoardManager] 힌트 쿨다운 중');
            return null;
        }
        
        const possibleMoves = this.findAllPossibleMoves(this.currentBoard);
        if (possibleMoves.length === 0) {
            console.log('[BoardManager] 힌트를 위한 이동이 없습니다');
            return null;
        }
        
        // 최적 이동 선택
        const bestMove = this.selectBestMove(possibleMoves);
        const hint = this.createHint(bestMove);
        
        this.lastHintTime = currentTime;
        console.log(`[BoardManager] 힌트 제공: ${hint.description}`);
        
        return hint;
    }
    
    /**
     * [의도] 보드 셔플 시스템
     */
    shuffleBoard(): ShuffleResult {
        console.log('[BoardManager] 보드 셔플 시작');
        
        this.shuffleCount++;
        
        for (let attempt = 0; attempt < this.maxShuffleAttempts; attempt++) {
            const shuffleResult = this.performShuffle(attempt);
            
            if (shuffleResult.success) {
                this.currentBoard = shuffleResult.boardState.map(row =>
                    row.map((type, col) => new Block(type, new Vec2(col, 0)))
                );
                
                console.log(`[BoardManager] 셔플 성공 (${attempt + 1}번째 시도)`);
                return shuffleResult;
            }
        }
        
        console.warn('[BoardManager] 셔플 실패, 새 보드 생성');
        return {
            success: false,
            message: '셔플 실패, 새로운 보드가 필요합니다',
            movesGenerated: 0,
            boardState: [],
            preservedPositions: []
        };
    }
    
    /**
     * [의도] 보드 분석 및 품질 평가
     */
    analyzeBoard(board: Block[][]): BoardAnalysis {
        const moves = this.findAllPossibleMoves(board);
        const colorCounts = this.calculateColorDistribution(board);
        
        const totalMoves = moves.length;
        const averageMoveScore = moves.reduce((sum, move) => sum + move.score, 0) / Math.max(totalMoves, 1);
        const specialBlockOpportunities = moves.filter(move => move.specialBlocksCreated > 0).length;
        
        const difficultyScore = this.calculateBoardDifficulty(board, moves);
        const solvabilityScore = this.calculateSolvabilityScore(board, moves);
        const estimatedPlayTime = this.estimatePlayTime(moves, difficultyScore);
        
        const recommendations = this.generateBoardRecommendations(
            totalMoves, 
            averageMoveScore, 
            specialBlockOpportunities,
            difficultyScore
        );
        
        return {
            totalMoves,
            averageMoveScore,
            specialBlockOpportunities,
            colorBalance: colorCounts,
            difficultyScore,
            solvabilityScore,
            estimatedPlayTime,
            recommendations
        };
    }
    
    /**
     * [의도] 특정 패턴의 보드 생성
     */
    generatePatternBoard(pattern: 'checkerboard' | 'spiral' | 'diamond' | 'cross', settings: BoardGenerationSettings): Block[][] {
        console.log(`[BoardManager] ${pattern} 패턴 보드 생성`);
        
        const board: Block[][] = [];
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, settings.colorCount);
        
        for (let row = 0; row < settings.height; row++) {
            board[row] = [];
            for (let col = 0; col < settings.width; col++) {
                let blockType: BlockType;
                
                switch (pattern) {
                    case 'checkerboard':
                        blockType = this.getCheckerboardColor(row, col, colors);
                        break;
                    case 'spiral':
                        blockType = this.getSpiralColor(row, col, settings, colors);
                        break;
                    case 'diamond':
                        blockType = this.getDiamondColor(row, col, settings, colors);
                        break;
                    case 'cross':
                        blockType = this.getCrossColor(row, col, settings, colors);
                        break;
                    default:
                        blockType = colors[Math.floor(Math.random() * colors.length)];
                }
                
                board[row][col] = new Block(blockType, new Vec2(col, row));
            }
        }
        
        // 즉시 매치 제거
        this.removeImmediateMatches(board);
        
        this.currentBoard = board;
        return board;
    }
    
    /**
     * [의도] 보드 대칭성 적용
     */
    applySymmetry(board: Block[][], symmetryType: 'horizontal' | 'vertical' | 'rotational'): Block[][] {
        const symmetricBoard = board.map(row => [...row]);
        
        switch (symmetryType) {
            case 'horizontal':
                this.applyHorizontalSymmetry(symmetricBoard);
                break;
            case 'vertical':
                this.applyVerticalSymmetry(symmetricBoard);
                break;
            case 'rotational':
                this.applyRotationalSymmetry(symmetricBoard);
                break;
        }
        
        return symmetricBoard;
    }
    
    // === Private Helper Methods ===
    
    private createRandomBoard(settings: BoardGenerationSettings, constraints?: BoardConstraints): Block[][] {
        const board: Block[][] = [];
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, settings.colorCount);
        
        for (let row = 0; row < settings.height; row++) {
            board[row] = [];
            
            for (let col = 0; col < settings.width; col++) {
                const position = new Vec2(col, row);
                
                // 장애물 배치 확인
                if (this.shouldPlaceObstacle(position, settings, constraints)) {
                    board[row][col] = new Block(BlockType.OBSTACLE, position);
                    continue;
                }
                
                // 특수 블록 배치 확인
                if (this.shouldPlaceSpecialBlock(position, settings, constraints)) {
                    const specialType = this.getRandomSpecialBlockType();
                    board[row][col] = new Block(specialType, position);
                    continue;
                }
                
                // 일반 블록 배치
                let blockType: BlockType;
                let attempts = 0;
                
                do {
                    blockType = this.getWeightedRandomColor(colors, constraints);
                    attempts++;
                } while (
                    settings.preventInitialMatches && 
                    attempts < 10 && 
                    this.wouldCreateImmediateMatch(board, col, row, blockType)
                );
                
                board[row][col] = new Block(blockType, position);
            }
        }
        
        return board;
    }
    
    private validateBoard(board: Block[][], settings: BoardGenerationSettings): boolean {
        // 즉시 매치가 있는지 확인
        if (settings.preventInitialMatches) {
            const immediateMatches = new MatchDetector(board).findAllMatches();
            if (immediateMatches.length > 0) {
                return false;
            }
        }
        
        // 해결 가능한지 확인
        if (settings.ensureSolvability) {
            const possibleMoves = this.findAllPossibleMoves(board);
            if (possibleMoves.length === 0) {
                return false;
            }
        }
        
        // 색상 분포 확인
        const colorBalance = this.calculateColorDistribution(board);
        const minColorCount = Math.floor(board.length * board[0].length * 0.1); // 최소 10%
        
        for (const count of colorBalance.values()) {
            if (count < minColorCount) {
                return false;
            }
        }
        
        return true;
    }
    
    private createSafeBoard(settings: BoardGenerationSettings): Block[][] {
        const board: Block[][] = [];
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, Math.min(settings.colorCount, 4));
        
        for (let row = 0; row < settings.height; row++) {
            board[row] = [];
            for (let col = 0; col < settings.width; col++) {
                // 간단한 체크보드 패턴으로 안전한 보드 생성
                const colorIndex = (row + col) % colors.length;
                const blockType = colors[colorIndex];
                board[row][col] = new Block(blockType, new Vec2(col, row));
            }
        }
        
        return board;
    }
    
    private findAllPossibleMoves(board: Block[][]): Move[] {
        const moves: Move[] = [];
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const currentPos = new Vec2(col, row);
                const adjacentPositions = this.getAdjacentPositions(currentPos, board);
                
                for (const adjacentPos of adjacentPositions) {
                    if (this.isValidSwap(currentPos, adjacentPos, board)) {
                        const move = this.evaluateMove(currentPos, adjacentPos, board);
                        if (move.matchCount > 0) {
                            moves.push(move);
                        }
                    }
                }
            }
        }
        
        return moves;
    }
    
    private isValidSwap(pos1: Vec2, pos2: Vec2, board: Block[][]): boolean {
        const block1 = board[pos1.y][pos1.x];
        const block2 = board[pos2.y][pos2.x];
        
        // 빈 블록이나 장애물은 교환 불가
        if (block1.type === BlockType.EMPTY || block1.type === BlockType.OBSTACLE ||
            block2.type === BlockType.EMPTY || block2.type === BlockType.OBSTACLE) {
            return false;
        }
        
        return true;
    }
    
    private evaluateMove(from: Vec2, to: Vec2, board: Block[][]): Move {
        // 임시로 블록 교환
        const tempBoard = board.map(row => [...row]);
        const temp = tempBoard[from.y][from.x];
        tempBoard[from.y][from.x] = tempBoard[to.y][to.x];
        tempBoard[to.y][to.x] = temp;
        
        // 매치 검사
        const matches = new MatchDetector(tempBoard).findAllMatches();
        const matchCount = matches.reduce((sum, match) => sum + match.blocks.length, 0);
        
        // 점수 계산
        let score = matchCount * 10;
        
        // 특수 블록 생성 가능성
        let specialBlocksCreated = 0;
        for (const match of matches) {
            if (match.blocks.length >= 4) {
                specialBlocksCreated++;
                score += 50;
            }
            if (match.blocks.length >= 5) {
                specialBlocksCreated++;
                score += 100;
            }
        }
        
        // 연쇄 반응 가능성
        const chainPotential = this.calculateChainPotential(tempBoard, matches);
        score += chainPotential * 20;
        
        return {
            from,
            to,
            score,
            matchCount,
            specialBlocksCreated,
            chainPotential
        };
    }
    
    private selectBestMove(moves: Move[]): Move {
        // 점수별로 정렬
        moves.sort((a, b) => b.score - a.score);
        
        // 상위 30% 중에서 랜덤 선택 (완전히 최적이 아닌 힌트 제공)
        const topMovesCount = Math.max(1, Math.floor(moves.length * 0.3));
        const topMoves = moves.slice(0, topMovesCount);
        
        return topMoves[Math.floor(Math.random() * topMoves.length)];
    }
    
    private createHint(move: Move): Hint {
        let description = '';
        let priority = 5;
        
        if (move.specialBlocksCreated > 0) {
            description = '특수 블록을 만들 수 있는 이동입니다!';
            priority = 8;
        } else if (move.chainPotential > 2) {
            description = '연쇄 반응을 일으킬 수 있는 이동입니다!';
            priority = 7;
        } else if (move.matchCount >= 6) {
            description = '큰 매치를 만들 수 있는 이동입니다!';
            priority = 6;
        } else {
            description = '좋은 이동입니다!';
            priority = 5;
        }
        
        return {
            move,
            description,
            priority,
            confidence: Math.min(1, move.score / 100),
            visualIndicators: [move.from, move.to]
        };
    }
    
    private resolveDeadlock(): boolean {
        console.log('[BoardManager] 데드락 해결 시도');
        
        // 1. 셔플 시도
        const shuffleResult = this.performShuffle(0);
        if (shuffleResult.success && shuffleResult.movesGenerated > 0) {
            this.currentBoard = shuffleResult.boardState.map(row =>
                row.map((type, col) => new Block(type, new Vec2(col, 0)))
            );
            return true;
        }
        
        // 2. 전략적 블록 교체
        return this.performStrategicReplacement();
    }
    
    private performShuffle(attempt: number): ShuffleResult {
        const shufflableBlocks = this.collectShufflableBlocks(this.currentBoard);
        
        if (shufflableBlocks.length === 0) {
            return {
                success: false,
                message: 'No blocks to shuffle',
                movesGenerated: 0,
                boardState: [],
                preservedPositions: []
            };
        }
        
        // Fisher-Yates 셔플
        for (let i = shufflableBlocks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shufflableBlocks[i], shufflableBlocks[j]] = [shufflableBlocks[j], shufflableBlocks[i]];
        }
        
        // 새 보드 상태 생성
        const newBoardState: BlockType[][] = this.currentBoard.map(row =>
            row.map(block => block.type)
        );
        
        let blockIndex = 0;
        const preservedPositions: Vec2[] = [];
        
        for (let row = 0; row < newBoardState.length; row++) {
            for (let col = 0; col < newBoardState[row].length; col++) {
                if (this.isShufflablePosition(this.currentBoard[row][col])) {
                    newBoardState[row][col] = shufflableBlocks[blockIndex].type;
                    blockIndex++;
                } else {
                    preservedPositions.push(new Vec2(col, row));
                }
            }
        }
        
        // 즉시 매치 제거
        const tempBoard = newBoardState.map(row =>
            row.map((type, col) => new Block(type, new Vec2(col, 0)))
        );
        this.removeImmediateMatches(tempBoard);
        
        // 가능한 이동 확인
        const possibleMoves = this.findAllPossibleMoves(tempBoard);
        
        return {
            success: possibleMoves.length > 0,
            message: possibleMoves.length > 0 ? 'Shuffle successful' : 'Shuffle failed - no moves available',
            movesGenerated: possibleMoves.length,
            boardState: tempBoard.map(row => row.map(block => block.type)),
            preservedPositions
        };
    }
    
    private performStrategicReplacement(): boolean {
        // 보드의 모서리 블록들을 전략적으로 교체
        const replacementPositions = this.findReplacementPositions();
        const colors = BlockTypeHelper.getBasicColorTypes().slice(0, 5);
        
        for (const pos of replacementPositions) {
            // 인접 블록과 다른 색상으로 교체
            const adjacentColors = this.getAdjacentColors(pos, this.currentBoard);
            const availableColors = colors.filter(color => !adjacentColors.has(color));
            
            if (availableColors.length > 0) {
                const newColor = availableColors[Math.floor(Math.random() * availableColors.length)];
                this.currentBoard[pos.y][pos.x] = new Block(newColor, pos);
            }
        }
        
        // 이동 가능성 재확인
        const possibleMoves = this.findAllPossibleMoves(this.currentBoard);
        return possibleMoves.length > 0;
    }
    
    // 보드 패턴 생성 메서드들
    private getCheckerboardColor(row: number, col: number, colors: BlockType[]): BlockType {
        return colors[(row + col) % colors.length];
    }
    
    private getSpiralColor(row: number, col: number, settings: BoardGenerationSettings, colors: BlockType[]): BlockType {
        const centerX = Math.floor(settings.width / 2);
        const centerY = Math.floor(settings.height / 2);
        const distance = Math.abs(row - centerY) + Math.abs(col - centerX);
        return colors[distance % colors.length];
    }
    
    private getDiamondColor(row: number, col: number, settings: BoardGenerationSettings, colors: BlockType[]): BlockType {
        const centerX = Math.floor(settings.width / 2);
        const centerY = Math.floor(settings.height / 2);
        const distance = Math.max(Math.abs(row - centerY), Math.abs(col - centerX));
        return colors[distance % colors.length];
    }
    
    private getCrossColor(row: number, col: number, settings: BoardGenerationSettings, colors: BlockType[]): BlockType {
        const centerX = Math.floor(settings.width / 2);
        const centerY = Math.floor(settings.height / 2);
        
        if (row === centerY || col === centerX) {
            return colors[0]; // 십자 중심선은 첫 번째 색상
        }
        
        return colors[(row + col) % (colors.length - 1) + 1];
    }
    
    // 대칭성 적용 메서드들
    private applyHorizontalSymmetry(board: Block[][]): void {
        const height = board.length;
        const width = board[0].length;
        
        for (let row = 0; row < Math.floor(height / 2); row++) {
            for (let col = 0; col < width; col++) {
                const mirrorRow = height - 1 - row;
                board[mirrorRow][col] = new Block(board[row][col].type, new Vec2(col, mirrorRow));
            }
        }
    }
    
    private applyVerticalSymmetry(board: Block[][]): void {
        const height = board.length;
        const width = board[0].length;
        
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < Math.floor(width / 2); col++) {
                const mirrorCol = width - 1 - col;
                board[row][mirrorCol] = new Block(board[row][col].type, new Vec2(mirrorCol, row));
            }
        }
    }
    
    private applyRotationalSymmetry(board: Block[][]): void {
        const height = board.length;
        const width = board[0].length;
        
        for (let row = 0; row < Math.floor(height / 2); row++) {
            for (let col = 0; col < width; col++) {
                const rotatedRow = height - 1 - row;
                const rotatedCol = width - 1 - col;
                board[rotatedRow][rotatedCol] = new Block(board[row][col].type, new Vec2(rotatedCol, rotatedRow));
            }
        }
    }
    
    // 유틸리티 메서드들
    private shouldPlaceObstacle(position: Vec2, settings: BoardGenerationSettings, constraints?: BoardConstraints): boolean {
        if (constraints?.obstaclePositions) {
            return constraints.obstaclePositions.some(pos => pos.equals(position));
        }
        
        return Math.random() < settings.obstacleRatio;
    }
    
    private shouldPlaceSpecialBlock(position: Vec2, settings: BoardGenerationSettings, constraints?: BoardConstraints): boolean {
        if (constraints?.specialBlockPositions) {
            return constraints.specialBlockPositions.some(item => item.position.equals(position));
        }
        
        return Math.random() < settings.specialBlockRatio;
    }
    
    private getRandomSpecialBlockType(): BlockType {
        const types = [BlockType.LINE_HORIZONTAL, BlockType.LINE_VERTICAL, BlockType.BOMB, BlockType.RAINBOW];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    private getWeightedRandomColor(colors: BlockType[], constraints?: BoardConstraints): BlockType {
        if (constraints?.colorDistribution) {
            // 가중치가 있는 경우 가중치 기반 선택
            const weightedColors: BlockType[] = [];
            
            for (const [color, weight] of constraints.colorDistribution) {
                for (let i = 0; i < weight; i++) {
                    weightedColors.push(color);
                }
            }
            
            if (weightedColors.length > 0) {
                return weightedColors[Math.floor(Math.random() * weightedColors.length)];
            }
        }
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    private wouldCreateImmediateMatch(board: Block[][], col: number, row: number, blockType: BlockType): boolean {
        // 수평 매치 체크
        let horizontalCount = 1;
        
        // 왼쪽 확인
        for (let c = col - 1; c >= 0 && board[row][c]?.type === blockType; c--) {
            horizontalCount++;
        }
        
        // 오른쪽 확인
        for (let c = col + 1; c < (board[row]?.length || 0) && board[row][c]?.type === blockType; c++) {
            horizontalCount++;
        }
        
        if (horizontalCount >= 3) return true;
        
        // 수직 매치 체크
        let verticalCount = 1;
        
        // 위쪽 확인
        for (let r = row - 1; r >= 0 && board[r]?.[col]?.type === blockType; r--) {
            verticalCount++;
        }
        
        // 아래쪽 확인
        for (let r = row + 1; r < board.length && board[r]?.[col]?.type === blockType; r++) {
            verticalCount++;
        }
        
        return verticalCount >= 3;
    }
    
    private removeImmediateMatches(board: Block[][]): void {
        const matches = new MatchDetector(board).findAllMatches();
        
        for (const match of matches) {
            for (const block of match.blocks) {
                const randomColor = BlockTypeHelper.getRandomBlockType();
                board[block.position.y][block.position.x] = new Block(randomColor, block.position);
            }
        }
    }
    
    private calculateColorDistribution(board: Block[][]): Map<BlockType, number> {
        const distribution = new Map<BlockType, number>();
        
        for (const row of board) {
            for (const block of row) {
                if (BlockTypeHelper.isNormalBlock(block.type)) {
                    distribution.set(block.type, (distribution.get(block.type) || 0) + 1);
                }
            }
        }
        
        return distribution;
    }
    
    private calculateBoardDifficulty(board: Block[][], moves: Move[]): number {
        let difficulty = 50; // 기본 난이도
        
        // 이동 수에 따른 난이도
        if (moves.length < 5) difficulty += 30;
        else if (moves.length < 10) difficulty += 15;
        else if (moves.length > 20) difficulty -= 10;
        
        // 평균 점수에 따른 난이도
        const avgScore = moves.reduce((sum, move) => sum + move.score, 0) / Math.max(moves.length, 1);
        if (avgScore < 30) difficulty += 20;
        else if (avgScore > 100) difficulty -= 15;
        
        return Math.max(0, Math.min(100, difficulty));
    }
    
    private calculateSolvabilityScore(board: Block[][], moves: Move[]): number {
        let score = 80;
        
        // 이동 가능성
        if (moves.length === 0) score = 0;
        else if (moves.length < 3) score -= 30;
        else if (moves.length > 15) score += 10;
        
        // 색상 분포 균형성
        const colorCounts = this.calculateColorDistribution(board);
        const totalBlocks = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
        const idealRatio = 1 / colorCounts.size;
        
        for (const count of colorCounts.values()) {
            const actualRatio = count / totalBlocks;
            const deviation = Math.abs(actualRatio - idealRatio);
            score -= deviation * 50; // 편차가 클수록 점수 감소
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    private estimatePlayTime(moves: Move[], difficultyScore: number): number {
        const baseMoveTime = 3; // 초 per move
        const difficultyMultiplier = 1 + (difficultyScore / 100);
        
        return Math.floor(moves.length * baseMoveTime * difficultyMultiplier);
    }
    
    private generateBoardRecommendations(totalMoves: number, avgScore: number, specialOpportunities: number, difficulty: number): string[] {
        const recommendations: string[] = [];
        
        if (totalMoves < 5) {
            recommendations.push('이동 가능성이 부족합니다. 색상 분포를 조정하세요.');
        }
        
        if (avgScore < 40) {
            recommendations.push('평균 점수가 낮습니다. 특수 블록 기회를 늘리세요.');
        }
        
        if (specialOpportunities === 0) {
            recommendations.push('특수 블록 생성 기회가 없습니다. 보드 레이아웃을 조정하세요.');
        }
        
        if (difficulty > 80) {
            recommendations.push('난이도가 너무 높습니다. 이동 가능성을 늘리세요.');
        } else if (difficulty < 30) {
            recommendations.push('난이도가 너무 낮습니다. 도전적인 요소를 추가하세요.');
        }
        
        return recommendations;
    }
    
    private calculateChainPotential(board: Block[][], matches: any[]): number {
        // 간단한 연쇄 가능성 계산
        return matches.length > 1 ? matches.length : 0;
    }
    
    private getAdjacentPositions(position: Vec2, board: Block[][]): Vec2[] {
        const positions: Vec2[] = [];
        const directions = [
            new Vec2(0, -1), // 위
            new Vec2(1, 0),  // 오른쪽
            new Vec2(0, 1),  // 아래
            new Vec2(-1, 0)  // 왼쪽
        ];
        
        for (const dir of directions) {
            const newPos = new Vec2(position.x + dir.x, position.y + dir.y);
            if (this.isValidPosition(newPos, board)) {
                positions.push(newPos);
            }
        }
        
        return positions;
    }
    
    private isValidPosition(position: Vec2, board: Block[][]): boolean {
        return position.x >= 0 && position.x < board[0].length &&
               position.y >= 0 && position.y < board.length;
    }
    
    private collectShufflableBlocks(board: Block[][]): Block[] {
        const blocks: Block[] = [];
        
        for (const row of board) {
            for (const block of row) {
                if (this.isShufflablePosition(block)) {
                    blocks.push(block);
                }
            }
        }
        
        return blocks;
    }
    
    private isShufflablePosition(block: Block): boolean {
        return BlockTypeHelper.isNormalBlock(block.type) ||
               BlockTypeHelper.isSpecialBlock(block.type);
    }
    
    private findReplacementPositions(): Vec2[] {
        const positions: Vec2[] = [];
        
        // 모서리와 모든 모서리 근처 위치 찾기
        for (let row = 0; row < this.boardHeight; row++) {
            for (let col = 0; col < this.boardWidth; col++) {
                if (row === 0 || row === this.boardHeight - 1 || 
                    col === 0 || col === this.boardWidth - 1) {
                    positions.push(new Vec2(col, row));
                }
            }
        }
        
        return positions;
    }
    
    private getAdjacentColors(position: Vec2, board: Block[][]): Set<BlockType> {
        const colors = new Set<BlockType>();
        const adjacentPositions = this.getAdjacentPositions(position, board);
        
        for (const pos of adjacentPositions) {
            const blockType = board[pos.y][pos.x].type;
            if (BlockTypeHelper.isNormalBlock(blockType)) {
                colors.add(blockType);
            }
        }
        
        return colors;
    }
}