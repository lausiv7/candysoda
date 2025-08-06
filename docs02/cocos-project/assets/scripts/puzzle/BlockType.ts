/**
 * [의도] Sweet Puzzle 게임의 블록 타입과 상태 정의
 * [책임] 블록의 종류, 애니메이션 상태, 특수 블록 타입을 체계적으로 관리
 */

export enum BlockType {
    EMPTY = 'empty',
    RED_APPLE = 'red_apple',      // 🍎
    GRAPE = 'grape',              // 🍇  
    KIWI = 'kiwi',               // 🥝
    BANANA = 'banana',           // 🍌
    EGGPLANT = 'eggplant',       // 🍆
    ORANGE = 'orange'            // 🧡
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
        BlockType.ORANGE
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
            [BlockType.ORANGE]: '🧡'
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
     * 특수 블록 생성 조건 확인
     */
    static getSpecialBlockType(matchSize: number, matchType: string): SpecialBlockType {
        if (matchSize >= 6) {
            return SpecialBlockType.RAINBOW;
        } else if (matchSize === 5) {
            return SpecialBlockType.BOMB;
        } else if (matchSize === 4) {
            if (matchType === 'horizontal') {
                return SpecialBlockType.LINE_VERTICAL; // 가로 매치 시 세로 라인 생성
            } else if (matchType === 'vertical') {
                return SpecialBlockType.LINE_HORIZONTAL; // 세로 매치 시 가로 라인 생성
            }
        }
        return SpecialBlockType.NONE;
    }
}