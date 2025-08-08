/**
 * [의도] Sweet Puzzle 특수 블록 시스템 구현
 * [책임] 특수 블록 생성, 활성화, 조합 효과 관리
 */

import { _decorator, Component, Vec2 } from 'cc';
import { BlockType } from './BlockType';
import { Block } from './Block';

const { ccclass, property } = _decorator;

// 특수 블록 활성화 패턴 정의
export enum ActivationPattern {
    SINGLE_CLICK = 'single_click',
    SWAP_ACTIVATION = 'swap_activation',
    AUTO_ACTIVATION = 'auto_activation'
}

// 효과 타입 정의
export enum EffectType {
    LINE_CLEAR = 'line_clear',
    EXPLOSION = 'explosion',
    COLOR_CLEAR = 'color_clear',
    CROSS_EXPLOSION = 'cross_explosion',
    MEGA_EXPLOSION = 'mega_explosion',
    RAINBOW_LINE = 'rainbow_line',
    RAINBOW_BOMB = 'rainbow_bomb',
    BOARD_CLEAR = 'board_clear'
}

// 라인 방향 정의
export enum LineDirection {
    HORIZONTAL = 'horizontal',
    VERTICAL = 'vertical'
}

// 활성화 결과 클래스
export class ActivationResult {
    public affectedPositions: Vec2[] = [];
    public score: number = 0;
    public effectType: EffectType;
    public chainReaction: boolean = false;
    public newSpecialBlocks: { position: Vec2; blockType: BlockType }[] = [];

    constructor(
        positions: Vec2[] = [], 
        score: number = 0, 
        effectType: EffectType = EffectType.LINE_CLEAR,
        chainReaction: boolean = false
    ) {
        this.affectedPositions = positions;
        this.score = score;
        this.effectType = effectType;
        this.chainReaction = chainReaction;
    }
}

// 조합 효과 클래스
export class CombinationEffect {
    public name: string;
    public executor: (board: Block[][], position: Vec2) => Vec2[];
    public score: number;
    public effectType: EffectType;

    constructor(
        name: string,
        executor: (board: Block[][], position: Vec2) => Vec2[],
        score: number,
        effectType: EffectType
    ) {
        this.name = name;
        this.executor = executor;
        this.score = score;
        this.effectType = effectType;
    }
}

// 추상 특수 블록 클래스
@ccclass('SpecialBlock')
export abstract class SpecialBlock extends Component {
    protected power: number = 1;
    protected activationPattern: ActivationPattern = ActivationPattern.SINGLE_CLICK;
    protected blockType: BlockType = BlockType.RED;
    protected position: Vec2 = new Vec2(0, 0);

    constructor() {
        super();
    }

    // 초기화
    init(blockType: BlockType, power: number = 1): void {
        this.blockType = blockType;
        this.power = power;
    }

    // 추상 메서드들
    abstract activate(board: Block[][], position: Vec2): ActivationResult;
    abstract getPreviewEffect(board: Block[][], position: Vec2): Vec2[];
    abstract canActivate(board: Block[][], position: Vec2): boolean;

    // 공통 유틸리티 메서드들
    protected isValidPosition(x: number, y: number, board: Block[][]): boolean {
        return x >= 0 && x < board[0].length && y >= 0 && y < board.length;
    }

    protected isNormalBlock(blockType: BlockType): boolean {
        return blockType !== BlockType.EMPTY && 
               blockType !== BlockType.OBSTACLE &&
               blockType !== BlockType.LINE_HORIZONTAL &&
               blockType !== BlockType.LINE_VERTICAL &&
               blockType !== BlockType.BOMB &&
               blockType !== BlockType.RAINBOW;
    }

    protected createExplosionPattern(center: Vec2, radius: number, board: Block[][]): Vec2[] {
        const positions: Vec2[] = [];
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const targetX = center.x + dx;
                const targetY = center.y + dy;
                
                if (this.isValidPosition(targetX, targetY, board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        positions.push(new Vec2(targetX, targetY));
                    }
                }
            }
        }
        
        return positions;
    }
}

// 라인 블록 (4개 매치로 생성)
@ccclass('LineBlock')
export class LineBlock extends SpecialBlock {
    private direction: LineDirection = LineDirection.HORIZONTAL;

    init(blockType: BlockType, power: number = 1, direction: LineDirection = LineDirection.HORIZONTAL): void {
        super.init(blockType, power);
        this.direction = direction;
        this.activationPattern = ActivationPattern.SINGLE_CLICK;
    }

    activate(board: Block[][], position: Vec2): ActivationResult {
        const affectedPositions: Vec2[] = [];

        if (this.direction === LineDirection.HORIZONTAL) {
            // 가로줄 전체 제거
            for (let col = 0; col < board[0].length; col++) {
                if (board[position.y][col].type !== BlockType.OBSTACLE) {
                    affectedPositions.push(new Vec2(col, position.y));
                }
            }
        } else {
            // 세로줄 전체 제거
            for (let row = 0; row < board.length; row++) {
                if (board[row][position.x].type !== BlockType.OBSTACLE) {
                    affectedPositions.push(new Vec2(position.x, row));
                }
            }
        }

        const score = this.power * affectedPositions.length * 50;
        
        return new ActivationResult(
            affectedPositions, 
            score, 
            EffectType.LINE_CLEAR,
            true // 연쇄 반응 가능
        );
    }

    getPreviewEffect(board: Block[][], position: Vec2): Vec2[] {
        const preview: Vec2[] = [];

        if (this.direction === LineDirection.HORIZONTAL) {
            for (let col = 0; col < board[0].length; col++) {
                if (board[position.y][col].type !== BlockType.OBSTACLE) {
                    preview.push(new Vec2(col, position.y));
                }
            }
        } else {
            for (let row = 0; row < board.length; row++) {
                if (board[row][position.x].type !== BlockType.OBSTACLE) {
                    preview.push(new Vec2(position.x, row));
                }
            }
        }

        return preview;
    }

    canActivate(board: Block[][], position: Vec2): boolean {
        return this.isValidPosition(position.x, position.y, board) &&
               board[position.y][position.x].type === this.blockType;
    }
}

// 폭탄 블록 (5개 매치로 생성)
@ccclass('BombBlock')
export class BombBlock extends SpecialBlock {
    private explosionRadius: number = 1;

    init(blockType: BlockType, power: number = 2, radius: number = 1): void {
        super.init(blockType, power);
        this.explosionRadius = radius;
        this.activationPattern = ActivationPattern.SINGLE_CLICK;
    }

    activate(board: Block[][], position: Vec2): ActivationResult {
        const affectedPositions = this.createExplosionPattern(position, this.explosionRadius, board);
        const score = this.power * affectedPositions.length * 20;

        return new ActivationResult(
            affectedPositions,
            score,
            EffectType.EXPLOSION,
            true // 연쇄 반응 가능
        );
    }

    getPreviewEffect(board: Block[][], position: Vec2): Vec2[] {
        return this.createExplosionPattern(position, this.explosionRadius, board);
    }

    canActivate(board: Block[][], position: Vec2): boolean {
        return this.isValidPosition(position.x, position.y, board) &&
               board[position.y][position.x].type === this.blockType;
    }
}

// 레인보우 블록 (6개+ 매치로 생성)
@ccclass('RainbowBlock')
export class RainbowBlock extends SpecialBlock {
    init(blockType: BlockType, power: number = 3): void {
        super.init(blockType, power);
        this.activationPattern = ActivationPattern.SWAP_ACTIVATION;
    }

    activate(board: Block[][], position: Vec2): ActivationResult {
        // 교환 대상 블록의 색상을 찾아 해당 색상의 모든 블록 제거
        const targetColor = this.getTargetColor(board, position);
        const affectedPositions: Vec2[] = [];

        if (targetColor === BlockType.EMPTY || targetColor === BlockType.OBSTACLE) {
            // 대상이 없으면 가장 많은 색상 선택
            const mostCommonColor = this.getMostCommonColor(board);
            if (mostCommonColor) {
                return this.clearAllBlocksOfType(board, mostCommonColor);
            }
        } else {
            return this.clearAllBlocksOfType(board, targetColor);
        }

        return new ActivationResult(affectedPositions, 0, EffectType.COLOR_CLEAR);
    }

    private clearAllBlocksOfType(board: Block[][], targetType: BlockType): ActivationResult {
        const affectedPositions: Vec2[] = [];

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (board[row][col].type === targetType) {
                    affectedPositions.push(new Vec2(col, row));
                }
            }
        }

        const score = this.power * affectedPositions.length * 30;
        
        return new ActivationResult(
            affectedPositions,
            score,
            EffectType.COLOR_CLEAR,
            true
        );
    }

    getPreviewEffect(board: Block[][], position: Vec2): Vec2[] {
        const targetColor = this.getTargetColor(board, position);
        const preview: Vec2[] = [];

        if (targetColor && targetColor !== BlockType.EMPTY && targetColor !== BlockType.OBSTACLE) {
            for (let row = 0; row < board.length; row++) {
                for (let col = 0; col < board[row].length; col++) {
                    if (board[row][col].type === targetColor) {
                        preview.push(new Vec2(col, row));
                    }
                }
            }
        }

        return preview;
    }

    canActivate(board: Block[][], position: Vec2): boolean {
        return this.isValidPosition(position.x, position.y, board);
    }

    private getTargetColor(board: Block[][], position: Vec2): BlockType | null {
        // 인접한 블록 중 일반 블록 찾기
        const directions = [
            new Vec2(0, -1), new Vec2(1, 0), new Vec2(0, 1), new Vec2(-1, 0)
        ];

        for (const dir of directions) {
            const targetX = position.x + dir.x;
            const targetY = position.y + dir.y;

            if (this.isValidPosition(targetX, targetY, board)) {
                const blockType = board[targetY][targetX].type;
                if (this.isNormalBlock(blockType)) {
                    return blockType;
                }
            }
        }

        return null;
    }

    private getMostCommonColor(board: Block[][]): BlockType | null {
        const colorCount = new Map<BlockType, number>();

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const blockType = board[row][col].type;
                if (this.isNormalBlock(blockType)) {
                    colorCount.set(blockType, (colorCount.get(blockType) || 0) + 1);
                }
            }
        }

        if (colorCount.size === 0) return null;

        return Array.from(colorCount.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }
}

// 특수 블록 조합 시스템
@ccclass('SpecialBlockCombinator')
export class SpecialBlockCombinator extends Component {
    
    // 두 특수 블록의 조합 효과 계산
    calculateCombination(
        block1Type: BlockType, 
        block2Type: BlockType, 
        position: Vec2, 
        board: Block[][]
    ): ActivationResult {
        const combo = `${block1Type}_${block2Type}`;

        switch (combo) {
            case `${BlockType.LINE_HORIZONTAL}_${BlockType.LINE_VERTICAL}`:
            case `${BlockType.LINE_VERTICAL}_${BlockType.LINE_HORIZONTAL}`:
                return this.createCrossExplosion(position, board);

            case `${BlockType.LINE_HORIZONTAL}_${BlockType.BOMB}`:
            case `${BlockType.LINE_VERTICAL}_${BlockType.BOMB}`:
            case `${BlockType.BOMB}_${BlockType.LINE_HORIZONTAL}`:
            case `${BlockType.BOMB}_${BlockType.LINE_VERTICAL}`:
                return this.createLineBombCombo(position, board, block1Type, block2Type);

            case `${BlockType.BOMB}_${BlockType.BOMB}`:
                return this.createMegaExplosion(position, board);

            case `${BlockType.RAINBOW}_${BlockType.LINE_HORIZONTAL}`:
            case `${BlockType.RAINBOW}_${BlockType.LINE_VERTICAL}`:
            case `${BlockType.LINE_HORIZONTAL}_${BlockType.RAINBOW}`:
            case `${BlockType.LINE_VERTICAL}_${BlockType.RAINBOW}`:
                return this.createRainbowLineCombo(position, board);

            case `${BlockType.RAINBOW}_${BlockType.BOMB}`:
            case `${BlockType.BOMB}_${BlockType.RAINBOW}`:
                return this.createRainbowBombCombo(position, board);

            case `${BlockType.RAINBOW}_${BlockType.RAINBOW}`:
                return this.createBoardClear(position, board);

            default:
                return this.createDefaultCombo(block1Type, block2Type, position, board);
        }
    }

    private createCrossExplosion(position: Vec2, board: Block[][]): ActivationResult {
        const affected: Vec2[] = [];

        // 십자 모양으로 전체 라인 제거
        for (let col = 0; col < board[0].length; col++) {
            if (board[position.y][col].type !== BlockType.OBSTACLE) {
                affected.push(new Vec2(col, position.y));
            }
        }
        for (let row = 0; row < board.length; row++) {
            if (board[row][position.x].type !== BlockType.OBSTACLE) {
                affected.push(new Vec2(position.x, row));
            }
        }

        return new ActivationResult(
            affected,
            1000 + affected.length * 50,
            EffectType.CROSS_EXPLOSION,
            true
        );
    }

    private createMegaExplosion(position: Vec2, board: Block[][]): ActivationResult {
        const affected: Vec2[] = [];
        const radius = 3; // 더 큰 폭발 반경

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const targetX = position.x + dx;
                const targetY = position.y + dy;

                if (this.isValidPosition(targetX, targetY, board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        affected.push(new Vec2(targetX, targetY));
                    }
                }
            }
        }

        return new ActivationResult(
            affected,
            2000 + affected.length * 100,
            EffectType.MEGA_EXPLOSION,
            true
        );
    }

    private createLineBombCombo(
        position: Vec2, 
        board: Block[][], 
        type1: BlockType, 
        type2: BlockType
    ): ActivationResult {
        const affected: Vec2[] = [];
        
        // 라인 방향 결정
        const isHorizontalLine = type1 === BlockType.LINE_HORIZONTAL || type2 === BlockType.LINE_HORIZONTAL;
        
        if (isHorizontalLine) {
            // 가로 라인 + 각 블록에서 폭발
            for (let col = 0; col < board[0].length; col++) {
                if (board[position.y][col].type !== BlockType.OBSTACLE) {
                    affected.push(new Vec2(col, position.y));
                    
                    // 각 위치에서 작은 폭발
                    const explosionPositions = this.createExplosionPattern(
                        new Vec2(col, position.y), 1, board
                    );
                    affected.push(...explosionPositions);
                }
            }
        } else {
            // 세로 라인 + 각 블록에서 폭발
            for (let row = 0; row < board.length; row++) {
                if (board[row][position.x].type !== BlockType.OBSTACLE) {
                    affected.push(new Vec2(position.x, row));
                    
                    // 각 위치에서 작은 폭발
                    const explosionPositions = this.createExplosionPattern(
                        new Vec2(position.x, row), 1, board
                    );
                    affected.push(...explosionPositions);
                }
            }
        }

        // 중복 제거
        const uniquePositions = this.removeDuplicatePositions(affected);

        return new ActivationResult(
            uniquePositions,
            1500 + uniquePositions.length * 75,
            EffectType.LINE_CLEAR,
            true
        );
    }

    private createRainbowLineCombo(position: Vec2, board: Block[][]): ActivationResult {
        // 모든 색상을 라인으로 변환
        const affected: Vec2[] = [];
        const newSpecialBlocks: { position: Vec2; blockType: BlockType }[] = [];

        const colors = [BlockType.RED, BlockType.BLUE, BlockType.GREEN, BlockType.YELLOW, BlockType.PURPLE, BlockType.ORANGE];
        
        for (const color of colors) {
            for (let row = 0; row < board.length; row++) {
                for (let col = 0; col < board[row].length; col++) {
                    if (board[row][col].type === color) {
                        affected.push(new Vec2(col, row));
                        
                        // 해당 위치에 라인 블록 생성 예약
                        const lineType = Math.random() < 0.5 ? 
                            BlockType.LINE_HORIZONTAL : BlockType.LINE_VERTICAL;
                        newSpecialBlocks.push({
                            position: new Vec2(col, row),
                            blockType: lineType
                        });
                    }
                }
            }
        }

        const result = new ActivationResult(
            affected,
            3000 + affected.length * 100,
            EffectType.RAINBOW_LINE,
            true
        );
        result.newSpecialBlocks = newSpecialBlocks;

        return result;
    }

    private createRainbowBombCombo(position: Vec2, board: Block[][]): ActivationResult {
        // 모든 색상을 폭탄으로 변환
        const affected: Vec2[] = [];
        const newSpecialBlocks: { position: Vec2; blockType: BlockType }[] = [];

        const colors = [BlockType.RED, BlockType.BLUE, BlockType.GREEN, BlockType.YELLOW, BlockType.PURPLE, BlockType.ORANGE];
        
        for (const color of colors) {
            for (let row = 0; row < board.length; row++) {
                for (let col = 0; col < board[row].length; col++) {
                    if (board[row][col].type === color) {
                        affected.push(new Vec2(col, row));
                        
                        // 해당 위치에 폭탄 블록 생성 예약
                        newSpecialBlocks.push({
                            position: new Vec2(col, row),
                            blockType: BlockType.BOMB
                        });
                    }
                }
            }
        }

        const result = new ActivationResult(
            affected,
            5000 + affected.length * 150,
            EffectType.RAINBOW_BOMB,
            true
        );
        result.newSpecialBlocks = newSpecialBlocks;

        return result;
    }

    private createBoardClear(position: Vec2, board: Block[][]): ActivationResult {
        // 보드의 모든 블록 제거 (장애물 제외)
        const affected: Vec2[] = [];

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (board[row][col].type !== BlockType.OBSTACLE && 
                    board[row][col].type !== BlockType.EMPTY) {
                    affected.push(new Vec2(col, row));
                }
            }
        }

        return new ActivationResult(
            affected,
            10000 + affected.length * 200,
            EffectType.BOARD_CLEAR,
            false // 더 이상 연쇄 반응 없음
        );
    }

    private createDefaultCombo(
        type1: BlockType, 
        type2: BlockType, 
        position: Vec2, 
        board: Block[][]
    ): ActivationResult {
        // 기본 조합: 둘 다 활성화
        const affected: Vec2[] = [];
        
        // 3x3 영역 제거
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const targetX = position.x + dx;
                const targetY = position.y + dy;
                
                if (this.isValidPosition(targetX, targetY, board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        affected.push(new Vec2(targetX, targetY));
                    }
                }
            }
        }

        return new ActivationResult(
            affected,
            500 + affected.length * 25,
            EffectType.EXPLOSION,
            true
        );
    }

    private createExplosionPattern(center: Vec2, radius: number, board: Block[][]): Vec2[] {
        const positions: Vec2[] = [];
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const targetX = center.x + dx;
                const targetY = center.y + dy;
                
                if (this.isValidPosition(targetX, targetY, board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        positions.push(new Vec2(targetX, targetY));
                    }
                }
            }
        }
        
        return positions;
    }

    private isValidPosition(x: number, y: number, board: Block[][]): boolean {
        return x >= 0 && x < board[0].length && y >= 0 && y < board.length;
    }

    private removeDuplicatePositions(positions: Vec2[]): Vec2[] {
        const unique: Vec2[] = [];
        const seen = new Set<string>();

        for (const pos of positions) {
            const key = `${pos.x},${pos.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(pos);
            }
        }

        return unique;
    }
}