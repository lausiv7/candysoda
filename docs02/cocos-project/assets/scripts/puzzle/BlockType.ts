/**
 * [의도] Sweet Puzzle 게임의 블록 타입과 상태 정의
 * [책임] 블록의 종류, 애니메이션 상태, 특수 블록 타입을 체계적으로 관리
 */

export enum BlockType {
    EMPTY = 'empty',
    // 기본 블록들
    RED_APPLE = 'red_apple',      // 🍎
    GRAPE = 'grape',              // 🍇  
    KIWI = 'kiwi',               // 🥝
    BANANA = 'banana',           // 🍌
    EGGPLANT = 'eggplant',       // 🍆
    ORANGE = 'orange',           // 🧡
    // 일반적인 색상 블록들 (호환성 위해)
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow',
    PURPLE = 'purple',
    // 특수 블록들
    LINE_HORIZONTAL = 'line_horizontal',  // 4개 매치로 생성
    LINE_VERTICAL = 'line_vertical',      // 4개 매치로 생성
    BOMB = 'bomb',                        // 5개 매치로 생성 (3x3 폭발)
    RAINBOW = 'rainbow',                  // 6개+ 매치로 생성 (모든 같은 색 제거)
    // 장애물
    OBSTACLE = 'obstacle'
}

export enum BlockAnimationState {
    IDLE = 'idle',
    SELECTED = 'selected',
    SWAPPING = 'swapping',
    MATCHING = 'matching',
    FALLING = 'falling',
    SPAWNING = 'spawning',
    DESTROYING = 'destroying'
}

export enum SpecialBlockType {
    NONE = 'none',
    LINE_HORIZONTAL = 'line_horizontal',  // 4개 매치로 생성
    LINE_VERTICAL = 'line_vertical',      // 4개 매치로 생성
    BOMB = 'bomb',                        // 5개 매치로 생성 (3x3 폭발)
    RAINBOW = 'rainbow'                   // 6개+ 매치로 생성 (모든 같은 색 제거)
}

export interface BlockPosition {
    x: number;
    y: number;
}

export interface BlockMatchInfo {
    isMatched: boolean;
    matchType: 'horizontal' | 'vertical' | 'l_shape' | 't_shape' | 'cross';
    matchSize: number;
    matchedBlocks: BlockPosition[];
}

export interface BlockAnimationConfig {
    duration: number;
    easing: string;
    delay?: number;
    onComplete?: () => void;
}

/**
 * [의도] 블록 타입과 관련된 유틸리티 함수들
 * [책임] 블록 타입 변환, 검증, 랜덤 생성 등의 헬퍼 기능 제공
 */
export class BlockTypeHelper {
    
    /**
     * 일반 블록 타입 목록 (EMPTY 제외)
     */
    static readonly NORMAL_BLOCK_TYPES = [
        BlockType.RED_APPLE,
        BlockType.GRAPE,
        BlockType.KIWI,
        BlockType.BANANA,
        BlockType.EGGPLANT,
        BlockType.ORANGE,
        BlockType.RED,
        BlockType.BLUE,
        BlockType.GREEN,
        BlockType.YELLOW,
        BlockType.PURPLE
    ];

    /**
     * 특수 블록 타입 목록
     */
    static readonly SPECIAL_BLOCK_TYPES = [
        BlockType.LINE_HORIZONTAL,
        BlockType.LINE_VERTICAL,
        BlockType.BOMB,
        BlockType.RAINBOW
    ];

    /**
     * 블록 타입에 대응하는 이모지 반환
     */
    static getBlockEmoji(type: BlockType): string {
        const emojiMap: Record<BlockType, string> = {
            [BlockType.EMPTY]: '',
            [BlockType.RED_APPLE]: '🍎',
            [BlockType.GRAPE]: '🍇',
            [BlockType.KIWI]: '🥝',
            [BlockType.BANANA]: '🍌',
            [BlockType.EGGPLANT]: '🍆',
            [BlockType.ORANGE]: '🧡',
            [BlockType.RED]: '🔴',
            [BlockType.BLUE]: '🔵',
            [BlockType.GREEN]: '🟢',
            [BlockType.YELLOW]: '🟡',
            [BlockType.PURPLE]: '🟣',
            [BlockType.LINE_HORIZONTAL]: '━',
            [BlockType.LINE_VERTICAL]: '┃',
            [BlockType.BOMB]: '💣',
            [BlockType.RAINBOW]: '🌈',
            [BlockType.OBSTACLE]: '🧱'
        };
        return emojiMap[type] || '';
    }

    /**
     * 랜덤한 일반 블록 타입 생성
     */
    static getRandomBlockType(): BlockType {
        const randomIndex = Math.floor(Math.random() * this.NORMAL_BLOCK_TYPES.length);
        return this.NORMAL_BLOCK_TYPES[randomIndex];
    }

    /**
     * 블록 타입이 일반 블록인지 확인
     */
    static isNormalBlock(type: BlockType): boolean {
        return this.NORMAL_BLOCK_TYPES.includes(type);
    }

    /**
     * 두 블록이 같은 타입인지 확인 (매치 가능 여부)
     */
    static canMatch(type1: BlockType, type2: BlockType): boolean {
        return type1 === type2 && 
               type1 !== BlockType.EMPTY && 
               this.isNormalBlock(type1);
    }

    /**
     * 블록이 특수 블록인지 확인
     */
    static isSpecialBlock(type: BlockType): boolean {
        return this.SPECIAL_BLOCK_TYPES.includes(type);
    }

    /**
     * 블록이 장애물인지 확인
     */
    static isObstacle(type: BlockType): boolean {
        return type === BlockType.OBSTACLE;
    }

    /**
     * 블록이 이동 가능한지 확인
     */
    static isMovable(type: BlockType): boolean {
        return type !== BlockType.EMPTY && 
               type !== BlockType.OBSTACLE;
    }

    /**
     * 특수 블록 생성 조건 확인 (매치 크기와 형태에 따라)
     */
    static getSpecialBlockTypeFromMatch(matchSize: number, matchType: string): BlockType {
        if (matchSize >= 6) {
            return BlockType.RAINBOW;
        } else if (matchSize === 5) {
            return BlockType.BOMB;
        } else if (matchSize === 4) {
            if (matchType === 'horizontal') {
                return BlockType.LINE_VERTICAL; // 가로 매치 시 세로 라인 생성
            } else if (matchType === 'vertical') {
                return BlockType.LINE_HORIZONTAL; // 세로 매치 시 가로 라인 생성
            }
        }
        return BlockType.EMPTY; // 특수 블록 생성 조건 미충족
    }

    /**
     * L/T 모양 매치에서 특수 블록 생성 (교차점에 폭탄 생성)
     */
    static getSpecialBlockFromShapeMatch(matchType: string): BlockType {
        if (matchType === 'l_shape' || matchType === 't_shape' || matchType === 'cross') {
            return BlockType.BOMB;
        }
        return BlockType.EMPTY;
    }

    /**
     * 특수 블록 생성 조건 확인 (레거시 호환성)
     */
    static getSpecialBlockType(matchSize: number, matchType: string): SpecialBlockType {
        const blockType = this.getSpecialBlockTypeFromMatch(matchSize, matchType);
        
        switch (blockType) {
            case BlockType.RAINBOW:
                return SpecialBlockType.RAINBOW;
            case BlockType.BOMB:
                return SpecialBlockType.BOMB;
            case BlockType.LINE_HORIZONTAL:
                return SpecialBlockType.LINE_HORIZONTAL;
            case BlockType.LINE_VERTICAL:
                return SpecialBlockType.LINE_VERTICAL;
            default:
                return SpecialBlockType.NONE;
        }
    }

    /**
     * 기본 색상 블록들만 반환 (특수 블록 제외)
     */
    static getBasicColorTypes(): BlockType[] {
        return [
            BlockType.RED,
            BlockType.BLUE,
            BlockType.GREEN,
            BlockType.YELLOW,
            BlockType.PURPLE,
            BlockType.ORANGE
        ];
    }

    /**
     * 매치 우선순위 계산 (특수 블록이 더 높은 우선순위)
     */
    static getMatchPriority(type: BlockType): number {
        if (type === BlockType.RAINBOW) return 4;
        if (type === BlockType.BOMB) return 3;
        if (type === BlockType.LINE_HORIZONTAL || type === BlockType.LINE_VERTICAL) return 2;
        if (this.isNormalBlock(type)) return 1;
        return 0;
    }
}