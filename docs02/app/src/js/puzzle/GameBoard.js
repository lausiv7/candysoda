// [의도] Sweet Puzzle 게임의 8x8 게임 보드 관리 클래스
// [책임] 보드 상태 관리, 블록 배치, 보드 렌더링, 보드 조작 기능

import { Block, BlockType } from './Block.js';

export class GameBoard {
    constructor(width = 8, height = 8, containerId = 'game-board') {
        this.width = width;
        this.height = height;
        this.containerId = containerId;
        
        // 2차원 배열로 보드 상태 관리
        this.board = [];
        this.container = null;
        
        // 보드 설정
        this.cellSize = 45; // 픽셀
        this.padding = 10;
        
        // 상태 관리
        this.isLocked = false; // 보드 조작 잠금
        this.selectedBlock = null;
        
        this.initializeBoard();
        this.setupContainer();
    }
    
    initializeBoard() {
        // 빈 보드 생성
        this.board = [];
        for (let y = 0; y < this.height; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.board[y][x] = new Block(BlockType.EMPTY, x, y);
            }
        }
    }
    
    setupContainer() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`GameBoard container with id "${this.containerId}" not found`);
            return;
        }
        
        // 컨테이너 스타일 설정
        this.container.style.position = 'relative';
        this.container.style.width = `${this.width * this.cellSize + this.padding * 2}px`;
        this.container.style.height = `${this.height * this.cellSize + this.padding * 2}px`;
        this.container.style.border = '3px solid #FF6B6B';
        this.container.style.borderRadius = '15px';
        this.container.style.background = '#f8f9fa';
        this.container.style.margin = '20px auto';
        this.container.style.padding = `${this.padding}px`;
        
        // 그리드 배경 추가
        this.addGridBackground();
        
        // 터치 이벤트 처리를 위한 이벤트 리스너
        this.setupBoardEventListeners();
    }
    
    addGridBackground() {
        // CSS로 그리드 패턴 추가
        const gridStyle = `
            background-image: 
                linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
            background-size: ${this.cellSize}px ${this.cellSize}px;
        `;
        
        this.container.style.cssText += gridStyle;
    }
    
    setupBoardEventListeners() {
        // 보드 전체에 대한 이벤트 처리
        this.container.addEventListener('dragstart', (e) => e.preventDefault());
        this.container.addEventListener('selectstart', (e) => e.preventDefault());
    }
    
    generateRandomBoard() {
        const normalTypes = [
            BlockType.RED, 
            BlockType.BLUE, 
            BlockType.GREEN, 
            BlockType.YELLOW, 
            BlockType.PURPLE, 
            BlockType.ORANGE
        ];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let blockType;
                let attempts = 0;
                const maxAttempts = 10;
                
                do {
                    blockType = normalTypes[Math.floor(Math.random() * normalTypes.length)];
                    attempts++;
                } while (
                    attempts < maxAttempts && 
                    this.wouldCreateImmediateMatch(x, y, blockType)
                );
                
                this.setBlock(x, y, new Block(blockType, x, y));
            }
        }
        
        this.renderBoard();
    }
    
    wouldCreateImmediateMatch(x, y, blockType) {
        // 수평 매치 체크 (왼쪽 2개)
        if (x >= 2) {
            if (this.getBlock(x - 1, y)?.type === blockType && 
                this.getBlock(x - 2, y)?.type === blockType) {
                return true;
            }
        }
        
        // 수직 매치 체크 (위쪽 2개)
        if (y >= 2) {
            if (this.getBlock(x, y - 1)?.type === blockType && 
                this.getBlock(x, y - 2)?.type === blockType) {
                return true;
            }
        }
        
        return false;
    }
    
    setBlock(x, y, block) {
        if (!this.isValidPosition(x, y)) {
            console.warn(`Invalid position: (${x}, ${y})`);
            return false;
        }
        
        // 기존 블록 제거
        if (this.board[y][x]) {
            this.board[y][x].destroy();
        }
        
        // 새 블록 설정
        this.board[y][x] = block;
        if (block) {
            block.setPosition(x, y);
        }
        
        return true;
    }
    
    getBlock(x, y) {
        if (!this.isValidPosition(x, y)) {
            return null;
        }
        return this.board[y][x];
    }
    
    swapBlocks(x1, y1, x2, y2) {
        if (!this.isValidPosition(x1, y1) || !this.isValidPosition(x2, y2)) {
            return false;
        }
        
        const block1 = this.board[y1][x1];
        const block2 = this.board[y2][x2];
        
        // 위치 교환
        this.board[y1][x1] = block2;
        this.board[y2][x2] = block1;
        
        // 블록의 위치 정보 업데이트
        if (block1) {
            block1.setPosition(x2, y2);
        }
        if (block2) {
            block2.setPosition(x1, y1);
        }
        
        return true;
    }
    
    async animateSwap(x1, y1, x2, y2, duration = 300) {
        const block1 = this.getBlock(x1, y1);
        const block2 = this.getBlock(x2, y2);
        
        if (!block1 || !block2) {
            return false;
        }
        
        // 애니메이션과 함께 교환
        const promise1 = block1.moveTo(x2, y2, duration);
        const promise2 = block2.moveTo(x1, y1, duration);
        
        // 보드 상태 업데이트
        this.swapBlocks(x1, y1, x2, y2);
        
        await Promise.all([promise1, promise2]);
        return true;
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    isAdjacent(x1, y1, x2, y2) {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    renderBoard() {
        // 컨테이너 비우기
        this.container.innerHTML = '';
        
        // 모든 블록 렌더링
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const block = this.board[y][x];
                if (block && !block.isEmpty()) {
                    this.container.appendChild(block.element);
                }
            }
        }
    }
    
    removeMatchedBlocks(matchedPositions) {
        const removedBlocks = [];
        
        for (const pos of matchedPositions) {
            const block = this.getBlock(pos.x, pos.y);
            if (block && !block.isEmpty()) {
                removedBlocks.push(block);
                this.setBlock(pos.x, pos.y, new Block(BlockType.EMPTY, pos.x, pos.y));
            }
        }
        
        return removedBlocks;
    }
    
    async applyGravity() {
        const movements = [];
        const newBlocks = [];
        
        // 각 열에 대해 중력 적용
        for (let x = 0; x < this.width; x++) {
            const columnBlocks = [];
            
            // 현재 열의 비어있지 않은 블록들 수집
            for (let y = this.height - 1; y >= 0; y--) {
                const block = this.getBlock(x, y);
                if (block && !block.isEmpty() && !block.isObstacle()) {
                    columnBlocks.push(block);
                }
            }
            
            // 아래부터 블록 재배치
            let targetY = this.height - 1;
            
            for (const block of columnBlocks) {
                const originalY = block.position.y;
                
                if (originalY !== targetY) {
                    // 이동이 필요한 경우
                    movements.push({
                        block: block,
                        fromY: originalY,
                        toY: targetY,
                        x: x
                    });
                    
                    // 보드 상태 업데이트
                    this.setBlock(x, originalY, new Block(BlockType.EMPTY, x, originalY));
                    this.setBlock(x, targetY, block);
                }
                
                targetY--;
            }
            
            // 빈 공간에 새 블록 생성
            while (targetY >= 0) {
                const newBlockType = this.getRandomBlockType();
                const newBlock = new Block(newBlockType, x, targetY);
                
                this.setBlock(x, targetY, newBlock);
                newBlocks.push(newBlock);
                
                // 화면 위에서 떨어지는 애니메이션을 위한 이동 정보
                movements.push({
                    block: newBlock,
                    fromY: -1 - (this.height - 1 - targetY),
                    toY: targetY,
                    x: x
                });
                
                targetY--;
            }
        }
        
        // 모든 이동 애니메이션 실행
        await this.executeGravityAnimations(movements);
        
        return {
            movements: movements,
            newBlocks: newBlocks
        };
    }
    
    async executeGravityAnimations(movements) {
        const animationPromises = [];
        
        for (const movement of movements) {
            const { block, fromY, toY, x } = movement;
            
            // 새로 생성된 블록의 경우 시작 위치 설정
            if (fromY < 0) {
                const cellSize = this.cellSize;
                const offsetY = this.padding;
                block.element.style.top = `${offsetY + fromY * cellSize}px`;
                this.container.appendChild(block.element);
            }
            
            // 낙하 애니메이션 실행
            const fallDuration = Math.abs(toY - fromY) * 50 + 200; // 거리에 비례한 시간
            animationPromises.push(block.playFallAnimation(fromY, toY, fallDuration));
        }
        
        await Promise.all(animationPromises);
    }
    
    getRandomBlockType() {
        const normalTypes = [
            BlockType.RED,
            BlockType.BLUE,
            BlockType.GREEN,
            BlockType.YELLOW,
            BlockType.PURPLE,
            BlockType.ORANGE
        ];
        
        return normalTypes[Math.floor(Math.random() * normalTypes.length)];
    }
    
    getAllBlocks() {
        const blocks = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const block = this.getBlock(x, y);
                if (block && !block.isEmpty()) {
                    blocks.push(block);
                }
            }
        }
        return blocks;
    }
    
    getColumn(x) {
        const column = [];
        for (let y = 0; y < this.height; y++) {
            column.push(this.getBlock(x, y));
        }
        return column;
    }
    
    getRow(y) {
        const row = [];
        for (let x = 0; x < this.width; x++) {
            row.push(this.getBlock(x, y));
        }
        return row;
    }
    
    lockBoard() {
        this.isLocked = true;
        this.container.style.pointerEvents = 'none';
    }
    
    unlockBoard() {
        this.isLocked = false;
        this.container.style.pointerEvents = 'auto';
    }
    
    clearBoard() {
        // 모든 블록 제거
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.board[y][x]) {
                    this.board[y][x].destroy();
                    this.board[y][x] = new Block(BlockType.EMPTY, x, y);
                }
            }
        }
        
        // 컨테이너 비우기
        this.container.innerHTML = '';
    }
    
    getBoardState() {
        // 디버깅용 보드 상태 반환
        const state = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                const block = this.getBlock(x, y);
                row.push(block ? block.type : BlockType.EMPTY);
            }
            state.push(row);
        }
        return state;
    }
    
    setBoardFromState(state) {
        // 주어진 상태로 보드 설정
        this.clearBoard();
        
        for (let y = 0; y < Math.min(state.length, this.height); y++) {
            for (let x = 0; x < Math.min(state[y].length, this.width); x++) {
                const blockType = state[y][x];
                if (blockType !== BlockType.EMPTY) {
                    const block = new Block(blockType, x, y);
                    this.setBlock(x, y, block);
                }
            }
        }
        
        this.renderBoard();
    }
    
    printBoard() {
        // 콘솔에 보드 상태 출력 (디버깅용)
        console.log('=== Board State ===');
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const block = this.getBlock(x, y);
                if (block && !block.isEmpty()) {
                    row += block.type.charAt(0).toUpperCase() + ' ';
                } else {
                    row += '. ';
                }
            }
            console.log(`${y}: ${row}`);
        }
        console.log('==================');
    }
    
    destroy() {
        this.clearBoard();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}