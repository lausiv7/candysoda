// [의도] Sweet Puzzle 게임의 이동 검증 시스템 구현
// [책임] 블록 이동 유효성 검사, 인접성 확인, 매치 생성 예측, 힌트 시스템 지원

import { BlockType } from './Block.js';
import { MatchDetector } from './MatchDetector.js';

export const MoveType = {
    SWAP: 'swap',
    SPECIAL_ACTIVATION: 'special_activation'
};

export const MoveResult = {
    VALID: 'valid',
    INVALID_NOT_ADJACENT: 'invalid_not_adjacent',
    INVALID_EMPTY_BLOCK: 'invalid_empty_block',
    INVALID_OBSTACLE: 'invalid_obstacle',
    INVALID_NO_MATCH: 'invalid_no_match',
    INVALID_SAME_POSITION: 'invalid_same_position'
};

export class Move {
    constructor(fromX, fromY, toX, toY, type = MoveType.SWAP) {
        this.from = { x: fromX, y: fromY };
        this.to = { x: toX, y: toY };
        this.type = type;
        this.expectedMatches = [];
        this.score = 0;
    }
    
    toString() {
        return `Move(${this.from.x},${this.from.y} -> ${this.to.x},${this.to.y})`;
    }
    
    equals(other) {
        return (
            this.from.x === other.from.x &&
            this.from.y === other.from.y &&
            this.to.x === other.to.x &&
            this.to.y === other.to.y
        ) || (
            // 역방향 이동도 같은 것으로 간주
            this.from.x === other.to.x &&
            this.from.y === other.to.y &&
            this.to.x === other.from.x &&
            this.to.y === other.from.y
        );
    }
}

export class ValidationResult {
    constructor(isValid, result, message = '', expectedMatches = []) {
        this.isValid = isValid;
        this.result = result;
        this.message = message;
        this.expectedMatches = expectedMatches;
        this.score = 0;
    }
}

export class MoveValidator {
    constructor(gameBoard) {
        this.gameBoard = gameBoard;
        this.matchDetector = new MatchDetector(gameBoard);
        
        // 성능 최적화를 위한 캐싱
        this.validationCache = new Map();
        this.lastBoardHash = '';
    }
    
    // 메인 이동 검증 함수
    validateMove(fromX, fromY, toX, toY) {
        const move = new Move(fromX, fromY, toX, toY);
        
        // 기본 유효성 검사
        const basicValidation = this.performBasicValidation(move);
        if (!basicValidation.isValid) {
            return basicValidation;
        }
        
        // 매치 생성 여부 확인
        const matchValidation = this.validateMatchCreation(move);
        if (!matchValidation.isValid) {
            return matchValidation;
        }
        
        return new ValidationResult(
            true, 
            MoveResult.VALID, 
            'Valid move',
            matchValidation.expectedMatches
        );
    }
    
    performBasicValidation(move) {
        // 1. 같은 위치 이동 확인
        if (move.from.x === move.to.x && move.from.y === move.to.y) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_SAME_POSITION,
                'Cannot move to the same position'
            );
        }
        
        // 2. 유효한 보드 위치 확인
        if (!this.isValidPosition(move.from.x, move.from.y) || 
            !this.isValidPosition(move.to.x, move.to.y)) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_NOT_ADJACENT,
                'Invalid board position'
            );
        }
        
        // 3. 인접성 확인
        if (!this.isAdjacent(move.from, move.to)) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_NOT_ADJACENT,
                'Blocks must be adjacent'
            );
        }
        
        // 4. 빈 블록이나 장애물 확인
        const fromBlock = this.gameBoard.getBlock(move.from.x, move.from.y);
        const toBlock = this.gameBoard.getBlock(move.to.x, move.to.y);
        
        if (!fromBlock || fromBlock.isEmpty()) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_EMPTY_BLOCK,
                'Cannot move empty block'
            );
        }
        
        if (!toBlock || toBlock.isEmpty()) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_EMPTY_BLOCK,
                'Cannot move to empty position'
            );
        }
        
        if (fromBlock.isObstacle() || toBlock.isObstacle()) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_OBSTACLE,
                'Cannot move obstacle blocks'
            );
        }
        
        return new ValidationResult(true, MoveResult.VALID, 'Basic validation passed');
    }
    
    validateMatchCreation(move) {
        // 임시로 블록 교환하여 매칭 확인
        const simulatedMatches = this.simulateMove(move);
        
        if (simulatedMatches.length === 0) {
            return new ValidationResult(
                false, 
                MoveResult.INVALID_NO_MATCH,
                'Move does not create any matches'
            );
        }
        
        // 점수 계산
        const score = this.calculateMoveScore(simulatedMatches);
        
        const result = new ValidationResult(
            true, 
            MoveResult.VALID,
            `Move creates ${simulatedMatches.length} match(es)`,
            simulatedMatches
        );
        result.score = score;
        
        return result;
    }
    
    simulateMove(move) {
        // 보드 상태 임시 복사
        const originalBoard = this.cloneBoard();
        
        // 블록 교환 시뮬레이션
        this.gameBoard.swapBlocks(move.from.x, move.from.y, move.to.x, move.to.y);
        
        // 매치 검사
        const matches = this.matchDetector.findAllMatches();
        
        // 원래 상태로 복구
        this.gameBoard.swapBlocks(move.to.x, move.to.y, move.from.x, move.from.y);
        
        return matches;
    }
    
    cloneBoard() {
        // 현재 보드 상태 저장 (복구용)
        const boardState = [];
        for (let y = 0; y < this.gameBoard.height; y++) {
            boardState[y] = [];
            for (let x = 0; x < this.gameBoard.width; x++) {
                const block = this.gameBoard.getBlock(x, y);
                boardState[y][x] = block ? block.type : BlockType.EMPTY;
            }
        }
        return boardState;
    }
    
    isValidPosition(x, y) {
        return this.gameBoard.isValidPosition(x, y);
    }
    
    isAdjacent(pos1, pos2) {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        
        // 상하좌우 인접만 허용 (대각선 불허)
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    calculateMoveScore(matches) {
        let totalScore = 0;
        
        for (const match of matches) {
            // 기본 점수: 매치된 블록 수 × 10
            const baseScore = match.length * 10;
            
            // 길이 보너스: 3개 초과시 추가 점수
            const lengthBonus = Math.max(0, match.length - 3) * 20;
            
            // 특수 패턴 보너스
            let patternBonus = 0;
            switch (match.type) {
                case 'l_shape':
                case 't_shape':
                    patternBonus = 50;
                    break;
                case 'cross':
                    patternBonus = 100;
                    break;
            }
            
            totalScore += baseScore + lengthBonus + patternBonus;
        }
        
        return totalScore;
    }
    
    // 힌트 시스템용: 가능한 모든 이동 찾기
    findAllValidMoves() {
        const validMoves = [];
        
        for (let y = 0; y < this.gameBoard.height; y++) {
            for (let x = 0; x < this.gameBoard.width; x++) {
                const block = this.gameBoard.getBlock(x, y);
                
                if (!block || block.isEmpty() || block.isObstacle()) {
                    continue;
                }
                
                // 4방향으로 이동 시도
                const directions = [
                    { dx: 0, dy: -1 }, // 위
                    { dx: 1, dy: 0 },  // 오른쪽
                    { dx: 0, dy: 1 },  // 아래
                    { dx: -1, dy: 0 }  // 왼쪽
                ];
                
                for (const dir of directions) {
                    const toX = x + dir.dx;
                    const toY = y + dir.dy;
                    
                    if (this.isValidPosition(toX, toY)) {
                        const validation = this.validateMove(x, y, toX, toY);
                        if (validation.isValid) {
                            const move = new Move(x, y, toX, toY);
                            move.expectedMatches = validation.expectedMatches;
                            move.score = validation.score;
                            validMoves.push(move);
                        }
                    }
                }
            }
        }
        
        return validMoves;
    }
    
    // 최고 점수의 이동 추천 (힌트용)
    getBestMove() {
        const validMoves = this.findAllValidMoves();
        
        if (validMoves.length === 0) {
            return null;
        }
        
        // 점수순으로 정렬
        validMoves.sort((a, b) => b.score - a.score);
        
        return validMoves[0];
    }
    
    // 특정 목표에 도움이 되는 이동 찾기
    findMovesForObjective(objectiveType, targetValue) {
        const validMoves = this.findAllValidMoves();
        const objectiveMoves = [];
        
        for (const move of validMoves) {
            let contributes = false;
            
            switch (objectiveType) {
                case 'collect_color':
                    // 특정 색상 블록 수집에 도움이 되는 이동
                    contributes = this.moveHelpsColorCollection(move, targetValue);
                    break;
                    
                case 'clear_obstacles':
                    // 장애물 제거에 도움이 되는 이동
                    contributes = this.moveHelpsObstacleClear(move);
                    break;
                    
                case 'score':
                    // 점수 달성에 도움이 되는 이동 (고득점 우선)
                    contributes = move.score >= 100;
                    break;
            }
            
            if (contributes) {
                objectiveMoves.push(move);
            }
        }
        
        return objectiveMoves.sort((a, b) => b.score - a.score);
    }
    
    moveHelpsColorCollection(move, targetColor) {
        for (const match of move.expectedMatches) {
            for (const block of match.blocks) {
                if (block.type === targetColor) {
                    return true;
                }
            }
        }
        return false;
    }
    
    moveHelpsObstacleClear(move) {
        // 장애물 근처의 매치는 장애물 제거에 도움
        for (const match of move.expectedMatches) {
            for (const block of match.blocks) {
                const adjacentPositions = [
                    { x: block.position.x - 1, y: block.position.y },
                    { x: block.position.x + 1, y: block.position.y },
                    { x: block.position.x, y: block.position.y - 1 },
                    { x: block.position.x, y: block.position.y + 1 }
                ];
                
                for (const pos of adjacentPositions) {
                    if (this.isValidPosition(pos.x, pos.y)) {
                        const adjacentBlock = this.gameBoard.getBlock(pos.x, pos.y);
                        if (adjacentBlock && adjacentBlock.isObstacle()) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    // 데드락 감지 (가능한 이동이 없는 상황)
    hasValidMoves() {
        const validMoves = this.findAllValidMoves();
        return validMoves.length > 0;
    }
    
    // 캐시 관리
    clearCache() {
        this.validationCache.clear();
        this.lastBoardHash = '';
    }
    
    updateBoard(newGameBoard) {
        this.gameBoard = newGameBoard;
        this.matchDetector = new MatchDetector(newGameBoard);
        this.clearCache();
    }
    
    // 디버깅용 함수들
    printValidMoves() {
        const validMoves = this.findAllValidMoves();
        console.log('=== Valid Moves ===');
        validMoves.forEach((move, index) => {
            console.log(`${index + 1}. ${move.toString()} (Score: ${move.score})`);
            console.log(`   Expected matches: ${move.expectedMatches.length}`);
        });
        console.log(`Total valid moves: ${validMoves.length}`);
        console.log('==================');
    }
    
    validateMoveWithDetails(fromX, fromY, toX, toY) {
        const validation = this.validateMove(fromX, fromY, toX, toY);
        
        console.log('=== Move Validation Details ===');
        console.log(`Move: (${fromX},${fromY}) -> (${toX},${toY})`);
        console.log(`Valid: ${validation.isValid}`);
        console.log(`Result: ${validation.result}`);
        console.log(`Message: ${validation.message}`);
        console.log(`Expected matches: ${validation.expectedMatches.length}`);
        console.log(`Score: ${validation.score}`);
        console.log('==============================');
        
        return validation;
    }
}