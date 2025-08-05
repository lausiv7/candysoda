// [의도] Sweet Puzzle 게임의 매치 감지 시스템 구현
// [책임] 3매치 이상 블록 패턴 감지, L/T 모양 매치 감지, 특수 블록 생성 조건 판단

import { BlockType } from './Block.js';

export const MatchType = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
    L_SHAPE: 'l_shape',
    T_SHAPE: 't_shape',
    CROSS: 'cross'
};

export class Match {
    constructor(type, blocks, length, score = 0) {
        this.type = type;
        this.blocks = blocks; // 매치된 블록들의 위치 배열
        this.length = length;
        this.score = score;
        this.specialBlockType = null; // 생성될 특수 블록 타입
    }
    
    getPositions() {
        return this.blocks.map(block => ({ x: block.position.x, y: block.position.y }));
    }
    
    getCenterPosition() {
        if (this.blocks.length === 0) return null;
        
        const avgX = this.blocks.reduce((sum, block) => sum + block.position.x, 0) / this.blocks.length;
        const avgY = this.blocks.reduce((sum, block) => sum + block.position.y, 0) / this.blocks.length;
        
        return { 
            x: Math.round(avgX), 
            y: Math.round(avgY) 
        };
    }
}

export class MatchDetector {
    constructor(gameBoard) {
        this.gameBoard = gameBoard;
        this.matchCache = new Map();
        this.lastBoardHash = '';
    }
    
    findAllMatches() {
        // 보드 상태 해시를 통한 캐싱 최적화
        const currentBoardHash = this.getBoardHash();
        if (this.lastBoardHash === currentBoardHash && this.matchCache.has(currentBoardHash)) {
            return this.matchCache.get(currentBoardHash);
        }
        
        const matches = [];
        
        // 수평 매치 검사
        matches.push(...this.findHorizontalMatches());
        
        // 수직 매치 검사  
        matches.push(...this.findVerticalMatches());
        
        // L/T 모양 복합 매치 검사
        matches.push(...this.findShapeMatches());
        
        // 중복 제거 및 우선순위 정렬
        const uniqueMatches = this.removeDuplicateMatches(matches);
        
        // 특수 블록 생성 조건 확인
        for (const match of uniqueMatches) {
            match.specialBlockType = this.determineSpecialBlockType(match);
            match.score = this.calculateMatchScore(match);
        }
        
        // 결과 캐싱
        this.matchCache.set(currentBoardHash, uniqueMatches);
        this.lastBoardHash = currentBoardHash;
        
        return uniqueMatches;
    }
    
    findHorizontalMatches() {
        const matches = [];
        
        for (let y = 0; y < this.gameBoard.height; y++) {
            let matchStart = 0;
            let currentType = null;
            let currentBlocks = [];
            
            for (let x = 0; x <= this.gameBoard.width; x++) {
                const block = x < this.gameBoard.width ? this.gameBoard.getBlock(x, y) : null;
                const blockType = block && block.canMatch() ? block.type : null;
                
                if (blockType === currentType && currentType !== null) {
                    // 같은 타입의 블록 계속 발견
                    currentBlocks.push(block);
                } else {
                    // 다른 타입이거나 끝에 도달
                    if (currentBlocks.length >= 3) {
                        matches.push(new Match(
                            MatchType.HORIZONTAL,
                            currentBlocks,
                            currentBlocks.length
                        ));
                    }
                    
                    // 새로운 매치 시작
                    matchStart = x;
                    currentType = blockType;
                    currentBlocks = blockType ? [block] : [];
                }
            }
        }
        
        return matches;
    }
    
    findVerticalMatches() {
        const matches = [];
        
        for (let x = 0; x < this.gameBoard.width; x++) {
            let matchStart = 0;
            let currentType = null;
            let currentBlocks = [];
            
            for (let y = 0; y <= this.gameBoard.height; y++) {
                const block = y < this.gameBoard.height ? this.gameBoard.getBlock(x, y) : null;
                const blockType = block && block.canMatch() ? block.type : null;
                
                if (blockType === currentType && currentType !== null) {
                    // 같은 타입의 블록 계속 발견
                    currentBlocks.push(block);
                } else {
                    // 다른 타입이거나 끝에 도달
                    if (currentBlocks.length >= 3) {
                        matches.push(new Match(
                            MatchType.VERTICAL,
                            currentBlocks,
                            currentBlocks.length
                        ));
                    }
                    
                    // 새로운 매치 시작
                    matchStart = y;
                    currentType = blockType;
                    currentBlocks = blockType ? [block] : [];
                }
            }
        }
        
        return matches;
    }
    
    findShapeMatches() {
        const matches = [];
        
        // L자 및 T자 패턴 검사
        for (let y = 0; y < this.gameBoard.height; y++) {
            for (let x = 0; x < this.gameBoard.width; x++) {
                const centerBlock = this.gameBoard.getBlock(x, y);
                if (!centerBlock || !centerBlock.canMatch()) continue;
                
                // L자 패턴들 확인
                const lShapeMatches = this.findLShapeAt(x, y, centerBlock.type);
                matches.push(...lShapeMatches);
                
                // T자 패턴들 확인  
                const tShapeMatches = this.findTShapeAt(x, y, centerBlock.type);
                matches.push(...tShapeMatches);
                
                // 십자 패턴 확인
                const crossMatch = this.findCrossAt(x, y, centerBlock.type);
                if (crossMatch) {
                    matches.push(crossMatch);
                }
            }
        }
        
        return matches;
    }
    
    findLShapeAt(centerX, centerY, blockType) {
        const matches = [];
        const directions = [
            // L자 패턴 4가지 방향
            { horizontal: [1, 2], vertical: [1, 2] },     // 오른쪽-아래
            { horizontal: [-1, -2], vertical: [1, 2] },   // 왼쪽-아래  
            { horizontal: [1, 2], vertical: [-1, -2] },   // 오른쪽-위
            { horizontal: [-1, -2], vertical: [-1, -2] }  // 왼쪽-위
        ];
        
        for (const dir of directions) {
            const horizontalBlocks = this.getBlocksInDirection(centerX, centerY, dir.horizontal[0], 0, 2, blockType);
            const verticalBlocks = this.getBlocksInDirection(centerX, centerY, 0, dir.vertical[0], 2, blockType);
            
            if (horizontalBlocks.length >= 3 && verticalBlocks.length >= 3) {
                // 중복 제거하여 L자 블록들 결합
                const allBlocks = [
                    this.gameBoard.getBlock(centerX, centerY),
                    ...horizontalBlocks.slice(1), // 중심 블록 제외
                    ...verticalBlocks.slice(1)    // 중심 블록 제외
                ];
                
                matches.push(new Match(
                    MatchType.L_SHAPE,
                    allBlocks,
                    allBlocks.length
                ));
            }
        }
        
        return matches;
    }
    
    findTShapeAt(centerX, centerY, blockType) {
        const matches = [];
        
        // T자 패턴 4가지 방향 (ㅗ, ㅜ, ㅏ, ㅓ)
        const patterns = [
            // ㅜ 패턴 (아래로 뻗은 T)
            { 
                main: { dx: 0, dy: 1, length: 2 }, 
                cross: [{ dx: -1, dy: 0, length: 1 }, { dx: 1, dy: 0, length: 1 }] 
            },
            // ㅗ 패턴 (위로 뻗은 T)
            { 
                main: { dx: 0, dy: -1, length: 2 }, 
                cross: [{ dx: -1, dy: 0, length: 1 }, { dx: 1, dy: 0, length: 1 }] 
            },
            // ㅏ 패턴 (오른쪽으로 뻗은 T)
            { 
                main: { dx: 1, dy: 0, length: 2 }, 
                cross: [{ dx: 0, dy: -1, length: 1 }, { dx: 0, dy: 1, length: 1 }] 
            },
            // ㅓ 패턴 (왼쪽으로 뻗은 T)
            { 
                main: { dx: -1, dy: 0, length: 2 }, 
                cross: [{ dx: 0, dy: -1, length: 1 }, { dx: 0, dy: 1, length: 1 }] 
            }
        ];
        
        for (const pattern of patterns) {
            const mainBlocks = this.getBlocksInDirection(
                centerX, centerY, 
                pattern.main.dx, pattern.main.dy, 
                pattern.main.length, blockType
            );
            
            if (mainBlocks.length < 3) continue;
            
            const crossBlocks = [];
            let validCross = true;
            
            for (const cross of pattern.cross) {
                const blocks = this.getBlocksInDirection(
                    centerX, centerY,
                    cross.dx, cross.dy,
                    cross.length, blockType
                );
                
                if (blocks.length < 2) { // 중심 + 1개 이상
                    validCross = false;
                    break;
                }
                
                crossBlocks.push(...blocks.slice(1)); // 중심 블록 제외
            }
            
            if (validCross) {
                const allBlocks = [
                    this.gameBoard.getBlock(centerX, centerY),
                    ...mainBlocks.slice(1), // 중심 블록 제외
                    ...crossBlocks
                ];
                
                matches.push(new Match(
                    MatchType.T_SHAPE,
                    allBlocks,
                    allBlocks.length
                ));
            }
        }
        
        return matches;
    }
    
    findCrossAt(centerX, centerY, blockType) {
        // 십자 패턴: 수평 3개 이상 + 수직 3개 이상
        const horizontalBlocks = [
            ...this.getBlocksInDirection(centerX, centerY, -1, 0, 2, blockType).slice(1), // 왼쪽
            this.gameBoard.getBlock(centerX, centerY), // 중심
            ...this.getBlocksInDirection(centerX, centerY, 1, 0, 2, blockType).slice(1)   // 오른쪽
        ].filter(block => block);
        
        const verticalBlocks = [
            ...this.getBlocksInDirection(centerX, centerY, 0, -1, 2, blockType).slice(1), // 위
            this.gameBoard.getBlock(centerX, centerY), // 중심 (중복)
            ...this.getBlocksInDirection(centerX, centerY, 0, 1, 2, blockType).slice(1)   // 아래
        ].filter(block => block);
        
        if (horizontalBlocks.length >= 3 && verticalBlocks.length >= 3) {
            // 중복 제거
            const allBlocks = [...new Set([...horizontalBlocks, ...verticalBlocks])];
            
            return new Match(
                MatchType.CROSS,
                allBlocks,
                allBlocks.length
            );
        }
        
        return null;
    }
    
    getBlocksInDirection(startX, startY, dx, dy, maxLength, requiredType) {
        const blocks = [];
        let x = startX;
        let y = startY;
        
        for (let i = 0; i <= maxLength; i++) {
            if (!this.gameBoard.isValidPosition(x, y)) break;
            
            const block = this.gameBoard.getBlock(x, y);
            if (!block || !block.canMatch() || block.type !== requiredType) {
                break;
            }
            
            blocks.push(block);
            x += dx;
            y += dy;
        }
        
        return blocks;
    }
    
    removeDuplicateMatches(matches) {
        // 블록 위치 기반으로 중복 매치 제거
        const uniqueMatches = [];
        const usedPositions = new Set();
        
        // 더 큰 매치를 우선시하기 위해 길이순으로 정렬
        matches.sort((a, b) => b.length - a.length);
        
        for (const match of matches) {
            const positions = match.getPositions();
            const positionKeys = positions.map(pos => `${pos.x},${pos.y}`);
            
            // 이미 사용된 위치가 있는지 확인
            const hasOverlap = positionKeys.some(key => usedPositions.has(key));
            
            if (!hasOverlap) {
                uniqueMatches.push(match);
                positionKeys.forEach(key => usedPositions.add(key));
            }
        }
        
        return uniqueMatches;
    }
    
    determineSpecialBlockType(match) {
        // 매치 길이와 패턴에 따른 특수 블록 결정
        switch (match.type) {
            case MatchType.HORIZONTAL:
            case MatchType.VERTICAL:
                if (match.length === 4) {
                    return 'line_block';
                } else if (match.length === 5) {
                    return 'color_bomb';
                } else if (match.length >= 6) {
                    return 'rainbow_block';
                }
                break;
                
            case MatchType.L_SHAPE:
            case MatchType.T_SHAPE:
                return 'bomb_block';
                
            case MatchType.CROSS:
                return 'cross_line_block';
        }
        
        return null;
    }
    
    calculateMatchScore(match) {
        const baseScore = match.length * 100;
        const lengthBonus = Math.max(0, match.length - 3) * 50;
        
        let typeBonus = 0;
        switch (match.type) {
            case MatchType.L_SHAPE:
            case MatchType.T_SHAPE:
                typeBonus = 200;
                break;
            case MatchType.CROSS:
                typeBonus = 500;
                break;
        }
        
        return baseScore + lengthBonus + typeBonus;
    }
    
    // 이동 후 매치 생성 확인 (MoveValidator에서 사용)
    wouldCreateMatch(fromX, fromY, toX, toY) {
        // 임시로 블록 교환
        const tempBoard = this.cloneBoard();
        const block1 = tempBoard.getBlock(fromX, fromY);
        const block2 = tempBoard.getBlock(toX, toY);
        
        tempBoard.swapBlocks(fromX, fromY, toX, toY);
        
        // 교환된 위치에서 매치 확인
        const detector = new MatchDetector(tempBoard);
        const matches = detector.findAllMatches();
        
        return matches.length > 0;
    }
    
    cloneBoard() {
        // 보드 상태 복사 (시뮬레이션용)
        const clonedBoard = Object.create(Object.getPrototypeOf(this.gameBoard));
        clonedBoard.width = this.gameBoard.width;
        clonedBoard.height = this.gameBoard.height;
        clonedBoard.board = [];
        
        for (let y = 0; y < this.gameBoard.height; y++) {
            clonedBoard.board[y] = [];
            for (let x = 0; x < this.gameBoard.width; x++) {
                const originalBlock = this.gameBoard.getBlock(x, y);
                clonedBoard.board[y][x] = originalBlock ? originalBlock.clone() : null;
            }
        }
        
        // 필요한 메서드들 복사
        clonedBoard.getBlock = this.gameBoard.getBlock.bind(clonedBoard);
        clonedBoard.swapBlocks = this.gameBoard.swapBlocks.bind(clonedBoard);
        clonedBoard.isValidPosition = this.gameBoard.isValidPosition.bind(clonedBoard);
        
        return clonedBoard;
    }
    
    getBoardHash() {
        // 보드 상태의 해시값 생성 (빠른 비교용)
        let hash = '';
        for (let y = 0; y < this.gameBoard.height; y++) {
            for (let x = 0; x < this.gameBoard.width; x++) {
                const block = this.gameBoard.getBlock(x, y);
                hash += block && !block.isEmpty() ? block.type.charAt(0) : '0';
            }
        }
        return hash;
    }
    
    clearCache() {
        this.matchCache.clear();
        this.lastBoardHash = '';
    }
    
    // 디버깅용 매치 정보 출력
    printMatches(matches) {
        console.log('=== Found Matches ===');
        matches.forEach((match, index) => {
            console.log(`Match ${index + 1}:`);
            console.log(`  Type: ${match.type}`);
            console.log(`  Length: ${match.length}`);
            console.log(`  Score: ${match.score}`);
            console.log(`  Special Block: ${match.specialBlockType || 'None'}`);
            console.log(`  Positions:`, match.getPositions());
        });
        console.log('====================');
    }
}