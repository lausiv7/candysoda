// [의도] Sweet Puzzle 게임의 중력 시스템 및 연쇄 반응 처리
// [책임] 블록 낙하, 빈 공간 채우기, 연쇄 매칭 처리, 콤보 시스템 관리

import { Block, BlockType } from './Block.js';
import { MatchDetector } from './MatchDetector.js';

export const GravityState = {
    IDLE: 'idle',
    APPLYING: 'applying',
    FALLING: 'falling',
    SETTLING: 'settling'
};

export const ChainReactionState = {
    NONE: 'none',
    PROCESSING: 'processing',
    WAITING_FOR_GRAVITY: 'waiting_for_gravity',
    CHECKING_MATCHES: 'checking_matches'
};

export class BlockMovement {
    constructor(block, fromX, fromY, toX, toY, fallDistance, duration) {
        this.block = block;
        this.from = { x: fromX, y: fromY };
        this.to = { x: toX, y: toY };
        this.fallDistance = fallDistance;
        this.duration = duration;
        this.completed = false;
    }
}

export class GravityResult {
    constructor(movements = [], newBlocks = [], movedBlocks = 0) {
        this.movements = movements;
        this.newBlocks = newBlocks;
        this.movedBlocks = movedBlocks;
        this.totalFallDistance = 0;
        this.animationDuration = 0;
        
        // 통계 계산
        this.calculateStatistics();
    }
    
    calculateStatistics() {
        this.totalFallDistance = this.movements.reduce((sum, movement) => 
            sum + movement.fallDistance, 0);
        
        this.animationDuration = Math.max(...this.movements.map(m => m.duration), 0);
        this.movedBlocks = this.movements.length;
    }
}

export class ChainReactionResult {
    constructor(totalMatches = [], totalScore = 0, chainLength = 0, comboMultiplier = 1.0) {
        this.totalMatches = totalMatches;
        this.totalScore = totalScore;
        this.chainLength = chainLength;
        this.comboMultiplier = comboMultiplier;
        this.bonusScore = 0;
        this.specialBlocksCreated = [];
    }
}

export class GravitySystem {
    constructor(gameBoard) {
        this.gameBoard = gameBoard;
        this.matchDetector = new MatchDetector(gameBoard);
        
        // 상태 관리
        this.gravityState = GravityState.IDLE;
        this.chainReactionState = ChainReactionState.NONE;
        
        // 물리 설정
        this.fallSpeed = 8; // 픽셀/프레임
        this.baseAnimationDuration = 200; // 기본 애니메이션 시간 (ms)
        this.fallAcceleration = 1.2; // 낙하 가속도
        this.bounceEffect = 0.1; // 착지 시 튕김 효과
        
        // 연쇄 반응 설정
        this.maxChainLength = 10; // 무한 루프 방지
        this.comboMultiplier = 1.0;
        this.comboIncrement = 0.25; // 콤보당 25% 점수 증가
        
        // 블록 생성 설정
        this.normalBlockTypes = [
            BlockType.RED,
            BlockType.BLUE,
            BlockType.GREEN,
            BlockType.YELLOW,
            BlockType.PURPLE,
            BlockType.ORANGE
        ];
    }
    
    // 메인 중력 적용 함수
    async applyGravity() {
        if (this.gravityState !== GravityState.IDLE) {
            return new GravityResult();
        }
        
        this.gravityState = GravityState.APPLYING;
        
        const movements = [];
        const newBlocks = [];
        
        // 각 열에 대해 중력 적용
        for (let x = 0; x < this.gameBoard.width; x++) {
            const columnResult = await this.applyGravityToColumn(x);
            movements.push(...columnResult.movements);
            newBlocks.push(...columnResult.newBlocks);
        }
        
        const result = new GravityResult(movements, newBlocks);
        
        // 낙하 애니메이션 실행
        if (movements.length > 0) {
            this.gravityState = GravityState.FALLING;
            await this.executeGravityAnimations(movements);
            this.gravityState = GravityState.SETTLING;
            
            // 착지 효과
            await this.playLandingEffects(movements);
        }
        
        this.gravityState = GravityState.IDLE;
        return result;
    }
    
    async applyGravityToColumn(columnX) {
        const movements = [];
        const newBlocks = [];
        
        // 현재 열의 비어있지 않은 블록들 수집
        const existingBlocks = [];
        for (let y = this.gameBoard.height - 1; y >= 0; y--) {
            const block = this.gameBoard.getBlock(columnX, y);
            if (block && !block.isEmpty() && !block.isObstacle() && !block.isMoving) {
                existingBlocks.push(block);
                // 원래 위치를 빈 블록으로 설정
                this.gameBoard.setBlock(columnX, y, new Block(BlockType.EMPTY, columnX, y));
            }
        }
        
        // 아래부터 블록 재배치
        let targetY = this.gameBoard.height - 1;
        
        // 기존 블록들을 아래부터 배치
        for (const block of existingBlocks) {
            const originalY = block.position.y;
            
            if (originalY !== targetY) {
                // 이동이 필요한 경우
                const fallDistance = targetY - originalY;
                const duration = this.calculateFallDuration(fallDistance);
                
                movements.push(new BlockMovement(
                    block, 
                    columnX, originalY,
                    columnX, targetY,
                    fallDistance,
                    duration
                ));
            }
            
            // 보드에 블록 재배치
            this.gameBoard.setBlock(columnX, targetY, block);
            targetY--;
        }
        
        // 빈 공간에 새 블록 생성
        while (targetY >= 0) {
            const newBlockType = this.generateRandomBlockType();
            const newBlock = new Block(newBlockType, columnX, targetY);
            
            // 화면 위에서 떨어지는 시작 위치 계산
            const dropStartY = -1 - (this.gameBoard.height - 1 - targetY);
            const fallDistance = targetY - dropStartY;
            const duration = this.calculateFallDuration(fallDistance);
            
            movements.push(new BlockMovement(
                newBlock,
                columnX, dropStartY,
                columnX, targetY,
                fallDistance,
                duration
            ));
            
            this.gameBoard.setBlock(columnX, targetY, newBlock);
            newBlocks.push(newBlock);
            
            targetY--;
        }
        
        return { movements, newBlocks };
    }
    
    async executeGravityAnimations(movements) {
        const animationPromises = [];
        
        for (const movement of movements) {
            // 새로 생성된 블록의 경우 시작 위치 설정
            if (movement.from.y < 0) {
                const cellSize = 45; // Block.js와 동일한 셀 크기
                const offsetY = 10;
                movement.block.element.style.top = `${offsetY + movement.from.y * cellSize}px`;
                
                // DOM에 추가 (아직 추가되지 않은 경우)
                if (!movement.block.element.parentNode) {
                    this.gameBoard.container.appendChild(movement.block.element);
                }
            }
            
            // 낙하 애니메이션 실행
            const animationPromise = movement.block.playFallAnimation(
                movement.from.y, 
                movement.to.y, 
                movement.duration
            );
            
            animationPromises.push(animationPromise);
        }
        
        // 모든 애니메이션 완료 대기
        await Promise.all(animationPromises);
        
        // 이동 완료 표시
        movements.forEach(movement => {
            movement.completed = true;
        });
    }
    
    async playLandingEffects(movements) {
        // 착지 시 시각적/음향 효과
        const promises = [];
        
        for (const movement of movements) {
            if (movement.fallDistance > 2) { // 일정 거리 이상 떨어진 경우만
                promises.push(this.playLandingEffect(movement.block, movement.to));
            }
        }
        
        await Promise.all(promises);
    }
    
    async playLandingEffect(block, position) {
        return new Promise((resolve) => {
            // 착지 시 작은 진동 효과
            const originalTransform = block.element.style.transform;
            
            block.element.style.transform = 'scaleY(0.9)';
            
            setTimeout(() => {
                block.element.style.transform = originalTransform || 'scaleY(1.0)';
                
                // 먼지 파티클 효과 (선택적)
                this.createLandingParticles(block, position);
                
                resolve();
            }, 100);
        });
    }
    
    createLandingParticles(block, position) {
        // 간단한 착지 파티클 효과
        for (let i = 0; i < 3; i++) {
            const particle = document.createElement('div');
            particle.className = 'landing-particle';
            particle.style.position = 'absolute';
            particle.style.width = '2px';
            particle.style.height = '2px';
            particle.style.backgroundColor = '#DDD';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '5';
            
            const cellSize = 45;
            const offsetX = 10;
            const offsetY = 10;
            
            const startX = offsetX + position.x * cellSize + 20 + (Math.random() - 0.5) * 10;
            const startY = offsetY + position.y * cellSize + 40;
            
            particle.style.left = `${startX}px`;
            particle.style.top = `${startY}px`;
            
            this.gameBoard.container.appendChild(particle);
            
            // 파티클 애니메이션
            particle.style.transition = 'all 0.3s ease-out';
            setTimeout(() => {
                particle.style.left = `${startX + (Math.random() - 0.5) * 20}px`;
                particle.style.top = `${startY + 10}px`;
                particle.style.opacity = '0';
                particle.style.transform = 'scale(0)';
            }, 10);
            
            // 파티클 제거
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 350);
        }
    }
    
    // 연쇄 반응 처리
    async processChainReaction(initialMatches) {
        if (this.chainReactionState !== ChainReactionState.NONE) {
            return new ChainReactionResult();
        }
        
        this.chainReactionState = ChainReactionState.PROCESSING;
        
        const allMatches = [];
        const specialBlocksCreated = [];
        let totalScore = 0;
        let chainLength = 0;
        let currentMatches = [...initialMatches];
        
        this.comboMultiplier = 1.0;
        
        while (currentMatches.length > 0 && chainLength < this.maxChainLength) {
            chainLength++;
            this.comboMultiplier = 1.0 + (chainLength - 1) * this.comboIncrement;
            
            // 현재 매치들 처리
            allMatches.push(...currentMatches);
            
            // 점수 계산
            const roundScore = this.calculateMatchScore(currentMatches);
            totalScore += Math.floor(roundScore * this.comboMultiplier);
            
            // 특수 블록 생성 확인
            const newSpecialBlocks = this.createSpecialBlocks(currentMatches);
            specialBlocksCreated.push(...newSpecialBlocks);
            
            // 매치된 블록들 제거
            await this.removeMatchedBlocks(currentMatches);
            
            // 중력 적용 및 애니메이션 대기
            this.chainReactionState = ChainReactionState.WAITING_FOR_GRAVITY;
            const gravityResult = await this.applyGravity();
            
            // 새로운 매치 검사
            this.chainReactionState = ChainReactionState.CHECKING_MATCHES;
            this.matchDetector.clearCache(); // 캐시 클리어
            currentMatches = this.matchDetector.findAllMatches();
            
            // 잠시 대기 (시각적 효과를 위해)
            if (currentMatches.length > 0) {
                await this.wait(300);
            }
        }
        
        // 콤보 보너스 계산
        const bonusScore = this.calculateComboBonus(chainLength, totalScore);
        totalScore += bonusScore;
        
        this.chainReactionState = ChainReactionState.NONE;
        
        const result = new ChainReactionResult(allMatches, totalScore, chainLength, this.comboMultiplier);
        result.bonusScore = bonusScore;
        result.specialBlocksCreated = specialBlocksCreated;
        
        return result;
    }
    
    async removeMatchedBlocks(matches) {
        const removalPromises = [];
        
        for (const match of matches) {
            for (const block of match.blocks) {
                // 매치 애니메이션 재생
                removalPromises.push(block.playMatchAnimation());
                
                // 보드에서 블록 제거 예약
                setTimeout(() => {
                    const pos = block.position;
                    this.gameBoard.setBlock(pos.x, pos.y, new Block(BlockType.EMPTY, pos.x, pos.y));
                }, 300); // 애니메이션 완료 후 제거
            }
        }
        
        await Promise.all(removalPromises);
    }
    
    createSpecialBlocks(matches) {
        const specialBlocks = [];
        
        for (const match of matches) {
            if (match.specialBlockType) {
                const centerPos = match.getCenterPosition();
                if (centerPos) {
                    // 특수 블록 생성 로직 (현재는 기본 구현)
                    console.log(`Creating special block: ${match.specialBlockType} at (${centerPos.x}, ${centerPos.y})`);
                    // TODO: 실제 특수 블록 생성 구현
                }
            }
        }
        
        return specialBlocks;
    }
    
    calculateMatchScore(matches) {
        let score = 0;
        
        for (const match of matches) {
            score += match.score || (match.length * 100);
        }
        
        return score;
    }
    
    calculateComboBonus(chainLength, baseScore) {
        if (chainLength <= 1) return 0;
        
        // 연쇄 길이에 따른 보너스 (기하급수적 증가)
        const chainBonus = Math.pow(chainLength - 1, 1.5) * 100;
        
        return Math.floor(chainBonus);
    }
    
    calculateFallDuration(fallDistance) {
        // 낙하 거리에 비례한 애니메이션 시간 계산
        const baseDuration = this.baseAnimationDuration;
        const distanceFactor = Math.sqrt(Math.abs(fallDistance)) * 50;
        
        return Math.min(baseDuration + distanceFactor, 1000); // 최대 1초
    }
    
    generateRandomBlockType() {
        const availableTypes = this.normalBlockTypes.filter(type => {
            // 현재 보드 상황에 따른 가중치 적용 가능
            return true;
        });
        
        return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
    
    // 유틸리티 함수들
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 보드 상태 확인
    isStable() {
        return this.gravityState === GravityState.IDLE && 
               this.chainReactionState === ChainReactionState.NONE;
    }
    
    // 설정 업데이트
    updateSettings(settings) {
        if (settings.fallSpeed !== undefined) {
            this.fallSpeed = settings.fallSpeed;
        }
        if (settings.maxChainLength !== undefined) {
            this.maxChainLength = settings.maxChainLength;
        }
        if (settings.comboIncrement !== undefined) {
            this.comboIncrement = settings.comboIncrement;
        }
    }
    
    // 보드 참조 업데이트
    updateBoard(newGameBoard) {
        this.gameBoard = newGameBoard;
        this.matchDetector = new MatchDetector(newGameBoard);
    }
    
    // 디버깅 함수들
    getState() {
        return {
            gravityState: this.gravityState,
            chainReactionState: this.chainReactionState,
            comboMultiplier: this.comboMultiplier,
            isStable: this.isStable()
        };
    }
    
    async simulateChainReaction(matches) {
        // 실제 보드를 건드리지 않고 연쇄 반응 시뮬레이션
        console.log('=== Chain Reaction Simulation ===');
        console.log(`Initial matches: ${matches.length}`);
        
        let chainLength = 0;
        let currentMatches = [...matches];
        
        while (currentMatches.length > 0 && chainLength < this.maxChainLength) {
            chainLength++;
            console.log(`Chain ${chainLength}: ${currentMatches.length} matches`);
            
            // 다음 연쇄는 실제 구현에서 결정됨
            break;
        }
        
        console.log(`Predicted chain length: ${chainLength}`);
        console.log('================================');
        
        return chainLength;
    }
}