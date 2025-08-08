/**
 * [의도] Sweet Puzzle 특수 블록 관리자
 * [책임] 특수 블록의 생성, 활성화, 조합 효과 관리와 게임 보드와의 통합
 */

import { _decorator, Component, Vec2, Node } from 'cc';
import { BlockType, BlockTypeHelper } from './BlockType';
import { Block } from './Block';
import { 
    SpecialBlock, 
    LineBlock, 
    BombBlock, 
    RainbowBlock, 
    SpecialBlockCombinator,
    ActivationResult,
    EffectType,
    LineDirection
} from './SpecialBlock';

const { ccclass, property } = _decorator;

// 특수 블록 생성 정보
export interface SpecialBlockCreation {
    position: Vec2;
    blockType: BlockType;
    power: number;
    sourceMatchType: string;
    sourceMatchSize: number;
}

// 특수 블록 활성화 이벤트
export interface SpecialBlockActivationEvent {
    position: Vec2;
    blockType: BlockType;
    result: ActivationResult;
    timestamp: number;
}

@ccclass('SpecialBlockManager')
export class SpecialBlockManager extends Component {
    @property
    private enableSpecialBlockPreview: boolean = true;
    
    @property
    private enableChainReactions: boolean = true;
    
    @property
    private maxChainDepth: number = 5;
    
    private combinator: SpecialBlockCombinator = new SpecialBlockCombinator();
    private activeSpecialBlocks: Map<string, SpecialBlock> = new Map();
    private activationQueue: SpecialBlockActivationEvent[] = [];
    
    // 싱글톤 인스턴스
    private static instance: SpecialBlockManager | null = null;
    
    protected onLoad(): void {
        if (SpecialBlockManager.instance === null) {
            SpecialBlockManager.instance = this;
            this.init();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): SpecialBlockManager {
        if (!SpecialBlockManager.instance) {
            console.error('[SpecialBlockManager] Instance not initialized yet');
            return null;
        }
        return SpecialBlockManager.instance;
    }
    
    private init(): void {
        console.log('[SpecialBlockManager] 특수 블록 매니저 초기화 완료');
    }
    
    /**
     * [의도] 매치 결과에 따라 특수 블록 생성
     */
    shouldCreateSpecialBlock(matchSize: number, matchType: string): SpecialBlockCreation | null {
        const specialBlockType = BlockTypeHelper.getSpecialBlockTypeFromMatch(matchSize, matchType);
        
        if (specialBlockType === BlockType.EMPTY) {
            return null;
        }
        
        // 생성 위치는 매치된 블록들의 중앙
        const power = this.calculateSpecialBlockPower(matchSize, matchType);
        
        return {
            position: new Vec2(0, 0), // 실제 위치는 호출자가 설정
            blockType: specialBlockType,
            power: power,
            sourceMatchType: matchType,
            sourceMatchSize: matchSize
        };
    }
    
    /**
     * [의도] 특수 블록을 게임 보드에 생성
     */
    createSpecialBlock(creation: SpecialBlockCreation, board: Block[][]): boolean {
        try {
            const { position, blockType, power } = creation;
            
            if (!this.isValidPosition(position, board)) {
                return false;
            }
            
            // 기존 블록을 특수 블록으로 교체
            const newBlock = new Block(blockType, position);
            board[position.y][position.x] = newBlock;
            
            // 특수 블록 컴포넌트 생성
            const specialBlock = this.createSpecialBlockComponent(blockType, power);
            if (specialBlock) {
                const key = `${position.x},${position.y}`;
                this.activeSpecialBlocks.set(key, specialBlock);
                
                console.log(`[SpecialBlockManager] 특수 블록 생성: ${blockType} at (${position.x},${position.y})`);
            }
            
            return true;
        } catch (error) {
            console.error('[SpecialBlockManager] 특수 블록 생성 실패:', error);
            return false;
        }
    }
    
    /**
     * [의도] 특수 블록 활성화 처리
     */
    activateSpecialBlock(position: Vec2, board: Block[][], targetPosition?: Vec2): ActivationResult {
        const block = board[position.y][position.x];
        
        if (!BlockTypeHelper.isSpecialBlock(block.type)) {
            return new ActivationResult([], 0, EffectType.LINE_CLEAR);
        }
        
        const key = `${position.x},${position.y}`;
        const specialBlock = this.activeSpecialBlocks.get(key);
        
        let result: ActivationResult;
        
        if (specialBlock) {
            // 컴포넌트를 통한 활성화
            result = specialBlock.activate(board, position);
        } else {
            // 타입별 직접 활성화
            result = this.activateByType(block.type, position, board, targetPosition);
        }
        
        // 활성화 이벤트 기록
        this.recordActivation(position, block.type, result);
        
        // 연쇄 반응 처리
        if (result.chainReaction && this.enableChainReactions) {
            result = this.processChainReactions(result, board);
        }
        
        return result;
    }
    
    /**
     * [의도] 두 특수 블록의 조합 효과 처리
     */
    activateSpecialBlockCombination(
        pos1: Vec2, 
        pos2: Vec2, 
        board: Block[][]
    ): ActivationResult {
        const block1 = board[pos1.y][pos1.x];
        const block2 = board[pos2.y][pos2.x];
        
        if (!BlockTypeHelper.isSpecialBlock(block1.type) || 
            !BlockTypeHelper.isSpecialBlock(block2.type)) {
            return new ActivationResult([], 0, EffectType.LINE_CLEAR);
        }
        
        // 중간점에서 조합 실행
        const centerPos = new Vec2(
            Math.floor((pos1.x + pos2.x) / 2),
            Math.floor((pos1.y + pos2.y) / 2)
        );
        
        const result = this.combinator.calculateCombination(
            block1.type, 
            block2.type, 
            centerPos, 
            board
        );
        
        // 조합 활성화 이벤트 기록
        this.recordActivation(centerPos, block1.type, result);
        
        console.log(`[SpecialBlockManager] 특수 블록 조합: ${block1.type} + ${block2.type} = ${result.score}점`);
        
        return result;
    }
    
    /**
     * [의도] 특수 블록 미리보기 효과 표시
     */
    getSpecialBlockPreview(position: Vec2, board: Block[][]): Vec2[] {
        if (!this.enableSpecialBlockPreview) {
            return [];
        }
        
        const block = board[position.y][position.x];
        if (!BlockTypeHelper.isSpecialBlock(block.type)) {
            return [];
        }
        
        const key = `${position.x},${position.y}`;
        const specialBlock = this.activeSpecialBlocks.get(key);
        
        if (specialBlock && specialBlock.getPreviewEffect) {
            return specialBlock.getPreviewEffect(board, position);
        }
        
        return this.getPreviewByType(block.type, position, board);
    }
    
    /**
     * [의도] 보드에서 활성 특수 블록 정리
     */
    cleanupSpecialBlocks(board: Block[][]): void {
        const keysToRemove: string[] = [];
        
        for (const [key, specialBlock] of this.activeSpecialBlocks) {
            const [x, y] = key.split(',').map(Number);
            
            if (!this.isValidPosition(new Vec2(x, y), board) ||
                !BlockTypeHelper.isSpecialBlock(board[y][x].type)) {
                keysToRemove.push(key);
            }
        }
        
        for (const key of keysToRemove) {
            this.activeSpecialBlocks.delete(key);
        }
        
        console.log(`[SpecialBlockManager] ${keysToRemove.length}개의 비활성 특수 블록 정리`);
    }
    
    /**
     * [의도] 특수 블록 통계 정보 반환
     */
    getSpecialBlockStats(): {
        totalActive: number;
        byType: Map<BlockType, number>;
        recentActivations: SpecialBlockActivationEvent[];
    } {
        const byType = new Map<BlockType, number>();
        
        for (const specialBlock of this.activeSpecialBlocks.values()) {
            // specialBlock에서 타입 정보 가져오기 (구현 필요)
            // const type = specialBlock.getBlockType();
            // byType.set(type, (byType.get(type) || 0) + 1);
        }
        
        return {
            totalActive: this.activeSpecialBlocks.size,
            byType: byType,
            recentActivations: this.activationQueue.slice(-10) // 최근 10개
        };
    }
    
    // === Private Helper Methods ===
    
    private createSpecialBlockComponent(blockType: BlockType, power: number): SpecialBlock | null {
        let component: SpecialBlock | null = null;
        
        switch (blockType) {
            case BlockType.LINE_HORIZONTAL:
                component = new LineBlock();
                (component as LineBlock).init(blockType, power, LineDirection.HORIZONTAL);
                break;
                
            case BlockType.LINE_VERTICAL:
                component = new LineBlock();
                (component as LineBlock).init(blockType, power, LineDirection.VERTICAL);
                break;
                
            case BlockType.BOMB:
                component = new BombBlock();
                (component as BombBlock).init(blockType, power, 1 + Math.floor(power / 2));
                break;
                
            case BlockType.RAINBOW:
                component = new RainbowBlock();
                (component as RainbowBlock).init(blockType, power);
                break;
        }
        
        return component;
    }
    
    private activateByType(
        blockType: BlockType, 
        position: Vec2, 
        board: Block[][], 
        targetPosition?: Vec2
    ): ActivationResult {
        switch (blockType) {
            case BlockType.LINE_HORIZONTAL:
                return this.activateLineBlock(position, board, LineDirection.HORIZONTAL);
                
            case BlockType.LINE_VERTICAL:
                return this.activateLineBlock(position, board, LineDirection.VERTICAL);
                
            case BlockType.BOMB:
                return this.activateBombBlock(position, board);
                
            case BlockType.RAINBOW:
                return this.activateRainbowBlock(position, board, targetPosition);
                
            default:
                return new ActivationResult([], 0, EffectType.LINE_CLEAR);
        }
    }
    
    private activateLineBlock(position: Vec2, board: Block[][], direction: LineDirection): ActivationResult {
        const affected: Vec2[] = [];
        
        if (direction === LineDirection.HORIZONTAL) {
            for (let col = 0; col < board[0].length; col++) {
                if (board[position.y][col].type !== BlockType.OBSTACLE) {
                    affected.push(new Vec2(col, position.y));
                }
            }
        } else {
            for (let row = 0; row < board.length; row++) {
                if (board[row][position.x].type !== BlockType.OBSTACLE) {
                    affected.push(new Vec2(position.x, row));
                }
            }
        }
        
        return new ActivationResult(affected, affected.length * 50, EffectType.LINE_CLEAR, true);
    }
    
    private activateBombBlock(position: Vec2, board: Block[][]): ActivationResult {
        const affected: Vec2[] = [];
        const radius = 1;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const targetX = position.x + dx;
                const targetY = position.y + dy;
                
                if (this.isValidPosition(new Vec2(targetX, targetY), board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        affected.push(new Vec2(targetX, targetY));
                    }
                }
            }
        }
        
        return new ActivationResult(affected, affected.length * 75, EffectType.EXPLOSION, true);
    }
    
    private activateRainbowBlock(position: Vec2, board: Block[][], targetPosition?: Vec2): ActivationResult {
        let targetColor: BlockType | null = null;
        
        // 대상 색상 결정
        if (targetPosition && this.isValidPosition(targetPosition, board)) {
            const targetBlock = board[targetPosition.y][targetPosition.x];
            if (BlockTypeHelper.isNormalBlock(targetBlock.type)) {
                targetColor = targetBlock.type;
            }
        }
        
        // 대상이 없으면 가장 많은 색상 선택
        if (!targetColor) {
            targetColor = this.getMostCommonColor(board);
        }
        
        if (!targetColor) {
            return new ActivationResult([], 0, EffectType.COLOR_CLEAR);
        }
        
        // 같은 색상의 모든 블록 수집
        const affected: Vec2[] = [];
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (board[row][col].type === targetColor) {
                    affected.push(new Vec2(col, row));
                }
            }
        }
        
        return new ActivationResult(affected, affected.length * 100, EffectType.COLOR_CLEAR, true);
    }
    
    private getPreviewByType(blockType: BlockType, position: Vec2, board: Block[][]): Vec2[] {
        switch (blockType) {
            case BlockType.LINE_HORIZONTAL:
                return this.getLinePreview(position, board, LineDirection.HORIZONTAL);
            case BlockType.LINE_VERTICAL:
                return this.getLinePreview(position, board, LineDirection.VERTICAL);
            case BlockType.BOMB:
                return this.getBombPreview(position, board);
            case BlockType.RAINBOW:
                return this.getRainbowPreview(position, board);
            default:
                return [];
        }
    }
    
    private getLinePreview(position: Vec2, board: Block[][], direction: LineDirection): Vec2[] {
        const preview: Vec2[] = [];
        
        if (direction === LineDirection.HORIZONTAL) {
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
    
    private getBombPreview(position: Vec2, board: Block[][]): Vec2[] {
        const preview: Vec2[] = [];
        const radius = 1;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const targetX = position.x + dx;
                const targetY = position.y + dy;
                
                if (this.isValidPosition(new Vec2(targetX, targetY), board)) {
                    if (board[targetY][targetX].type !== BlockType.OBSTACLE) {
                        preview.push(new Vec2(targetX, targetY));
                    }
                }
            }
        }
        
        return preview;
    }
    
    private getRainbowPreview(position: Vec2, board: Block[][]): Vec2[] {
        const mostCommon = this.getMostCommonColor(board);
        if (!mostCommon) return [];
        
        const preview: Vec2[] = [];
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (board[row][col].type === mostCommon) {
                    preview.push(new Vec2(col, row));
                }
            }
        }
        
        return preview;
    }
    
    private calculateSpecialBlockPower(matchSize: number, matchType: string): number {
        let basePower = Math.max(1, matchSize - 3);
        
        // 특수 형태 매치 보너스
        if (matchType === 'l_shape' || matchType === 't_shape') {
            basePower += 1;
        } else if (matchType === 'cross') {
            basePower += 2;
        }
        
        return basePower;
    }
    
    private processChainReactions(result: ActivationResult, board: Block[][]): ActivationResult {
        let chainDepth = 0;
        let totalResult = result;
        
        while (totalResult.chainReaction && chainDepth < this.maxChainDepth) {
            // 연쇄 반응으로 인한 추가 특수 블록 활성화 감지
            const chainResult = this.detectChainReactions(totalResult, board);
            
            if (chainResult.affectedPositions.length === 0) {
                break;
            }
            
            totalResult.affectedPositions.push(...chainResult.affectedPositions);
            totalResult.score += chainResult.score;
            chainDepth++;
        }
        
        totalResult.chainReaction = chainDepth > 0;
        
        return totalResult;
    }
    
    private detectChainReactions(result: ActivationResult, board: Block[][]): ActivationResult {
        // 간단한 구현: 영향 받은 위치에서 추가 특수 블록 찾기
        const additionalAffected: Vec2[] = [];
        let additionalScore = 0;
        
        for (const pos of result.affectedPositions) {
            if (this.isValidPosition(pos, board)) {
                const block = board[pos.y][pos.x];
                if (BlockTypeHelper.isSpecialBlock(block.type)) {
                    const chainResult = this.activateSpecialBlock(pos, board);
                    additionalAffected.push(...chainResult.affectedPositions);
                    additionalScore += chainResult.score;
                }
            }
        }
        
        return new ActivationResult(additionalAffected, additionalScore, EffectType.EXPLOSION);
    }
    
    private recordActivation(position: Vec2, blockType: BlockType, result: ActivationResult): void {
        const event: SpecialBlockActivationEvent = {
            position: position,
            blockType: blockType,
            result: result,
            timestamp: Date.now()
        };
        
        this.activationQueue.push(event);
        
        // 큐 크기 제한
        if (this.activationQueue.length > 100) {
            this.activationQueue.shift();
        }
    }
    
    private getMostCommonColor(board: Block[][]): BlockType | null {
        const colorCount = new Map<BlockType, number>();
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const blockType = board[row][col].type;
                if (BlockTypeHelper.isNormalBlock(blockType)) {
                    colorCount.set(blockType, (colorCount.get(blockType) || 0) + 1);
                }
            }
        }
        
        if (colorCount.size === 0) return null;
        
        return Array.from(colorCount.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    private isValidPosition(position: Vec2, board: Block[][]): boolean {
        return position.x >= 0 && 
               position.x < board[0].length && 
               position.y >= 0 && 
               position.y < board.length;
    }
}