// [의도] Sweet Puzzle 게임의 전체 퍼즐 시스템 오케스트레이션
// [책임] 모든 퍼즐 컴포넌트 통합, 게임 상태 관리, 사용자 입력 처리, 게임 플로우 제어

import { GameBoard } from './GameBoard.js';
import { MatchDetector } from './MatchDetector.js';
import { MoveValidator } from './MoveValidator.js';
import { GravitySystem } from './GravitySystem.js';
import { Block, BlockType } from './Block.js';

export const GameState = {
    IDLE: 'idle',
    PLAYER_TURN: 'player_turn',
    VALIDATING_MOVE: 'validating_move',
    PROCESSING_MATCH: 'processing_match',
    APPLYING_GRAVITY: 'applying_gravity',
    CHAIN_REACTION: 'chain_reaction',
    GAME_OVER: 'game_over',
    PAUSED: 'paused'
};

export const InputState = {
    NONE: 'none',
    BLOCK_SELECTED: 'block_selected',
    DRAGGING: 'dragging'
};

export class GameStats {
    constructor() {
        this.score = 0;
        this.movesUsed = 0;
        this.totalMatches = 0;
        this.longestChain = 0;
        this.specialBlocksCreated = 0;
        this.startTime = Date.now();
        this.endTime = null;
    }
    
    getPlayTime() {
        const endTime = this.endTime || Date.now();
        return endTime - this.startTime;
    }
    
    addScore(points) {
        this.score += points;
    }
    
    useMove() {
        this.movesUsed++;
    }
    
    addMatch(chainLength = 1) {
        this.totalMatches++;
        this.longestChain = Math.max(this.longestChain, chainLength);
    }
}

export class PuzzleManager {
    constructor(containerId = 'game-board', options = {}) {
        // 기본 설정
        this.options = {
            boardWidth: 8,
            boardHeight: 8,
            maxMoves: 30,
            enableHints: true,
            enableAnimations: true,
            autoStart: true,
            ...options
        };
        
        // 게임 컴포넌트 초기화
        this.gameBoard = new GameBoard(
            this.options.boardWidth, 
            this.options.boardHeight, 
            containerId
        );
        this.matchDetector = new MatchDetector(this.gameBoard);
        this.moveValidator = new MoveValidator(this.gameBoard);
        this.gravitySystem = new GravitySystem(this.gameBoard);
        
        // 게임 상태
        this.gameState = GameState.IDLE;
        this.inputState = InputState.NONE;
        this.gameStats = new GameStats();
        
        // 입력 관리
        this.selectedBlock = null;
        this.dragStartPosition = null;
        this.currentMove = null;
        
        // 힌트 시스템
        this.hintTimeout = null;
        this.hintDelay = 10000; // 10초 후 힌트 표시
        
        // 이벤트 콜백
        this.onScoreUpdate = null;
        this.onMoveUpdate = null;
        this.onGameOver = null;
        this.onLevelComplete = null;
        
        // 전역 참조 설정 (Block.js에서 사용)
        window.PuzzleManager = this;
        
        this.initializeGame();
    }
    
    initializeGame() {
        console.log('Initializing Sweet Puzzle game...');
        
        // 게임 보드 생성
        this.gameBoard.generateRandomBoard();
        
        // 초기 매치 제거 (시작 시 즉시 매치 방지)
        this.removeInitialMatches();
        
        // 게임 상태 설정
        this.gameState = GameState.PLAYER_TURN;
        this.resetHintTimer();
        
        console.log('Game initialized successfully');
        this.logGameState();
    }
    
    async removeInitialMatches() {
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            const matches = this.matchDetector.findAllMatches();
            
            if (matches.length === 0) {
                break; // 매치가 없으면 완료
            }
            
            console.log(`Removing ${matches.length} initial matches (attempt ${attempts + 1})`);
            
            // 매치된 블록들을 새로운 블록으로 교체
            for (const match of matches) {
                for (const block of match.blocks) {
                    const pos = block.position;
                    let newType;
                    let typeAttempts = 0;
                    
                    do {
                        newType = this.gravitySystem.generateRandomBlockType();
                        typeAttempts++;
                    } while (
                        typeAttempts < 10 && 
                        this.gameBoard.wouldCreateImmediateMatch(pos.x, pos.y, newType)
                    );
                    
                    const newBlock = new Block(newType, pos.x, pos.y);
                    this.gameBoard.setBlock(pos.x, pos.y, newBlock);
                }
            }
            
            this.gameBoard.renderBoard();
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('Could not remove all initial matches after maximum attempts');
        }
    }
    
    // 사용자 입력 처리
    onBlockTouchStart(block, event) {
        if (this.gameState !== GameState.PLAYER_TURN) {
            return;
        }
        
        this.clearHintTimer();
        
        if (this.selectedBlock && this.selectedBlock !== block) {
            // 다른 블록이 선택된 상태에서 새 블록 선택 시 이동 시도
            this.attemptMove(this.selectedBlock, block);
        } else {
            // 블록 선택
            this.selectBlock(block);
        }
    }
    
    onBlockTouchMove(block, event) {
        if (this.inputState !== InputState.BLOCK_SELECTED || !this.selectedBlock) {
            return;
        }
        
        // 드래그 방향 감지
        const touch = event.touches ? event.touches[0] : event;
        if (!this.dragStartPosition) {
            this.dragStartPosition = { x: touch.clientX, y: touch.clientY };
            return;
        }
        
        const deltaX = touch.clientX - this.dragStartPosition.x;
        const deltaY = touch.clientY - this.dragStartPosition.y;
        const threshold = 20; // 최소 드래그 거리
        
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
            this.inputState = InputState.DRAGGING;
            
            // 드래그 방향에 따른 인접 블록 찾기
            const direction = this.getDragDirection(deltaX, deltaY);
            const targetBlock = this.getAdjacentBlock(this.selectedBlock, direction);
            
            if (targetBlock) {
                this.attemptMove(this.selectedBlock, targetBlock);
            }
        }
    }
    
    onBlockTouchEnd(block, event) {
        if (this.inputState === InputState.DRAGGING) {
            this.inputState = InputState.NONE;
            this.dragStartPosition = null;
        }
        
        this.resetHintTimer();
    }
    
    selectBlock(block) {
        // 이전 선택 해제
        if (this.selectedBlock) {
            this.selectedBlock.clearSelection();
        }
        
        // 새로운 블록 선택
        this.selectedBlock = block;
        this.inputState = InputState.BLOCK_SELECTED;
        this.dragStartPosition = null;
        
        console.log(`Block selected at (${block.position.x}, ${block.position.y})`);
    }
    
    clearSelection() {
        if (this.selectedBlock) {
            this.selectedBlock.clearSelection();
            this.selectedBlock = null;
        }
        this.inputState = InputState.NONE;
        this.dragStartPosition = null;
    }
    
    async attemptMove(fromBlock, toBlock) {
        if (this.gameState !== GameState.PLAYER_TURN) {
            return;
        }
        
        this.gameState = GameState.VALIDATING_MOVE;
        
        const fromPos = fromBlock.position;
        const toPos = toBlock.position;
        
        console.log(`Attempting move: (${fromPos.x},${fromPos.y}) -> (${toPos.x},${toPos.y})`);
        
        // 이동 유효성 검사
        const validation = this.moveValidator.validateMove(fromPos.x, fromPos.y, toPos.x, toPos.y);
        
        if (!validation.isValid) {
            console.log(`Invalid move: ${validation.message}`);
            
            // 잘못된 이동 시각적 피드백
            await this.playInvalidMoveAnimation(fromBlock, toBlock);
            
            this.clearSelection();
            this.gameState = GameState.PLAYER_TURN;
            this.resetHintTimer();
            return;
        }
        
        // 유효한 이동 처리
        await this.executeMove(fromBlock, toBlock, validation.expectedMatches);
    }
    
    async executeMove(fromBlock, toBlock, expectedMatches) {
        this.gameStats.useMove();
        this.clearSelection();
        
        // 이동 수 업데이트
        if (this.onMoveUpdate) {
            this.onMoveUpdate(this.gameStats.movesUsed, this.options.maxMoves);
        }
        
        // 블록 교환 애니메이션
        const fromPos = fromBlock.position;
        const toPos = toBlock.position;
        
        await this.gameBoard.animateSwap(fromPos.x, fromPos.y, toPos.x, toPos.y);
        
        // 매치 처리 및 연쇄 반응
        await this.processMatchesAndChains(expectedMatches);
        
        // 게임 종료 조건 확인
        if (this.checkGameEndConditions()) {
            return;
        }
        
        // 데드락 확인
        if (!this.moveValidator.hasValidMoves()) {
            console.log('No valid moves available - shuffling board');
            await this.shuffleBoard();
        }
        
        this.gameState = GameState.PLAYER_TURN;
        this.resetHintTimer();
    }
    
    async processMatchesAndChains(initialMatches) {
        if (initialMatches.length === 0) {
            return;
        }
        
        this.gameState = GameState.PROCESSING_MATCH;
        
        // 연쇄 반응 처리
        const chainResult = await this.gravitySystem.processChainReaction(initialMatches);
        
        // 점수 업데이트
        this.gameStats.addScore(chainResult.totalScore);
        this.gameStats.addMatch(chainResult.chainLength);
        
        // 통계 업데이트
        if (chainResult.specialBlocksCreated.length > 0) {
            this.gameStats.specialBlocksCreated += chainResult.specialBlocksCreated.length;
        }
        
        // UI 업데이트
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.gameStats.score);
        }
        
        // 콤보 효과 표시
        if (chainResult.chainLength > 1) {
            await this.showComboEffect(chainResult.chainLength, chainResult.comboMultiplier);
        }
        
        console.log(`Chain reaction completed: ${chainResult.chainLength} chains, ${chainResult.totalScore} points`);
    }
    
    checkGameEndConditions() {
        // 이동 수 초과 확인
        if (this.gameStats.movesUsed >= this.options.maxMoves) {
            this.endGame(false, 'No moves left');
            return true;
        }
        
        // 목표 달성 확인 (추후 레벨 시스템에서 확장)
        // TODO: 레벨별 목표 확인 로직
        
        return false;
    }
    
    async shuffleBoard() {
        console.log('Shuffling board...');
        
        // 섞기 애니메이션 효과
        this.gameBoard.lockBoard();
        
        // TODO: 실제 보드 섞기 구현
        // 현재는 새로운 보드 생성
        this.gameBoard.generateRandomBoard();
        await this.removeInitialMatches();
        
        this.gameBoard.unlockBoard();
        
        console.log('Board shuffled');
    }
    
    // 유틸리티 함수들
    getDragDirection(deltaX, deltaY) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }
    
    getAdjacentBlock(block, direction) {
        const pos = block.position;
        let targetX = pos.x;
        let targetY = pos.y;
        
        switch (direction) {
            case 'up': targetY--; break;
            case 'down': targetY++; break;
            case 'left': targetX--; break;
            case 'right': targetX++; break;
        }
        
        return this.gameBoard.getBlock(targetX, targetY);
    }
    
    async playInvalidMoveAnimation(fromBlock, toBlock) {
        // 잘못된 이동 시 짧은 진동 효과
        const originalTransform = fromBlock.element.style.transform;
        
        fromBlock.element.style.transform = 'translateX(-2px)';
        await this.wait(50);
        fromBlock.element.style.transform = 'translateX(2px)';
        await this.wait(50);
        fromBlock.element.style.transform = originalTransform;
    }
    
    async showComboEffect(chainLength, multiplier) {
        // 콤보 효과 표시
        const comboText = document.createElement('div');
        comboText.className = 'combo-effect';
        comboText.textContent = `${chainLength}x COMBO! (${multiplier.toFixed(1)}x)`;
        comboText.style.position = 'absolute';
        comboText.style.top = '50%';
        comboText.style.left = '50%';
        comboText.style.transform = 'translate(-50%, -50%)';
        comboText.style.fontSize = '2rem';
        comboText.style.fontWeight = 'bold';
        comboText.style.color = '#FFD700';
        comboText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        comboText.style.zIndex = '100';
        comboText.style.pointerEvents = 'none';
        
        this.gameBoard.container.appendChild(comboText);
        
        // 애니메이션
        comboText.style.animation = 'comboEffect 2s ease-out forwards';
        
        setTimeout(() => {
            if (comboText.parentNode) {
                comboText.parentNode.removeChild(comboText);
            }
        }, 2000);
    }
    
    // 힌트 시스템
    resetHintTimer() {
        if (!this.options.enableHints) return;
        
        this.clearHintTimer();
        this.hintTimeout = setTimeout(() => {
            this.showHint();
        }, this.hintDelay);
    }
    
    clearHintTimer() {
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }
    }
    
    showHint() {
        if (this.gameState !== GameState.PLAYER_TURN) {
            return;
        }
        
        const bestMove = this.moveValidator.getBestMove();
        if (bestMove) {
            const fromBlock = this.gameBoard.getBlock(bestMove.from.x, bestMove.from.y);
            const toBlock = this.gameBoard.getBlock(bestMove.to.x, bestMove.to.y);
            
            // 힌트 애니메이션
            this.playHintAnimation(fromBlock, toBlock);
            
            console.log(`Hint: Move (${bestMove.from.x},${bestMove.from.y}) to (${bestMove.to.x},${bestMove.to.y})`);
        } else {
            console.log('No hint available - consider shuffling');
        }
    }
    
    playHintAnimation(fromBlock, toBlock) {
        // 간단한 힌트 애니메이션
        const animate = (block) => {
            const original = block.element.style.boxShadow;
            block.element.style.boxShadow = '0 0 15px rgba(255, 255, 0, 0.8)';
            
            setTimeout(() => {
                block.element.style.boxShadow = original;
            }, 1000);
        };
        
        animate(fromBlock);
        setTimeout(() => animate(toBlock), 200);
    }
    
    // 게임 제어
    pauseGame() {
        if (this.gameState === GameState.PLAYER_TURN) {
            this.gameState = GameState.PAUSED;
            this.clearHintTimer();
            this.gameBoard.lockBoard();
        }
    }
    
    resumeGame() {
        if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYER_TURN;
            this.gameBoard.unlockBoard();
            this.resetHintTimer();
        }
    }
    
    endGame(success, reason) {
        this.gameState = GameState.GAME_OVER;
        this.gameStats.endTime = Date.now();
        this.clearHintTimer();
        this.gameBoard.lockBoard();
        
        console.log(`Game ended: ${success ? 'Success' : 'Failure'} - ${reason}`);
        console.log('Final stats:', this.gameStats);
        
        if (this.onGameOver) {
            this.onGameOver(success, reason, this.gameStats);
        }
    }
    
    restartGame() {
        this.gameStats = new GameStats();
        this.clearSelection();
        this.gameBoard.unlockBoard();
        this.initializeGame();
    }
    
    // 디버깅 및 개발 도구
    logGameState() {
        console.log('=== Game State ===');
        console.log(`Game State: ${this.gameState}`);
        console.log(`Input State: ${this.inputState}`);
        console.log(`Score: ${this.gameStats.score}`);
        console.log(`Moves: ${this.gameStats.movesUsed}/${this.options.maxMoves}`);
        console.log(`Selected Block: ${this.selectedBlock ? this.selectedBlock.toString() : 'None'}`);
        console.log('==================');
    }
    
    getGameStats() {
        return { ...this.gameStats };
    }
    
    async testMove(fromX, fromY, toX, toY) {
        console.log(`Testing move: (${fromX},${fromY}) -> (${toX},${toY})`);
        const validation = this.moveValidator.validateMoveWithDetails(fromX, fromY, toX, toY);
        return validation;
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 정리
    destroy() {
        this.clearHintTimer();
        this.gameBoard.destroy();
        if (window.PuzzleManager === this) {
            window.PuzzleManager = null;
        }
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
@keyframes comboEffect {
    0% { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.5); 
    }
    20% { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1.2); 
    }
    80% { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1.0); 
    }
    100% { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.8); 
    }
}

.combo-effect {
    font-family: 'Arial', sans-serif;
    user-select: none;
}
`;

document.head.appendChild(style);