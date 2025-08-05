// [의도] Sweet Puzzle 게임의 기본 블록 클래스 구현
// [책임] 블록 타입 관리, 애니메이션, 터치 이벤트 처리, 상태 관리

export const BlockType = {
    RED: 'red',
    BLUE: 'blue', 
    GREEN: 'green',
    YELLOW: 'yellow',
    PURPLE: 'purple',
    ORANGE: 'orange',
    EMPTY: 'empty',
    OBSTACLE: 'obstacle'
};

export const BlockAnimationState = {
    IDLE: 'idle',
    SELECTED: 'selected',
    MATCHING: 'matching',
    FALLING: 'falling',
    DESTROYING: 'destroying'
};

export class Block {
    constructor(type = BlockType.EMPTY, x = 0, y = 0) {
        this.type = type;
        this.position = { x, y };
        this.animationState = BlockAnimationState.IDLE;
        this.isMatched = false;
        this.isMoving = false;
        this.isSelected = false;
        
        // HTML 요소 관련
        this.element = null;
        this.domId = `block_${x}_${y}`;
        
        // 애니메이션 관련
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.createElement();
    }
    
    createElement() {
        this.element = document.createElement('div');
        this.element.id = this.domId;
        this.element.className = `candy ${this.type}`;
        this.element.style.position = 'absolute';
        this.element.style.width = '40px';
        this.element.style.height = '40px';
        this.element.style.borderRadius = '8px';
        this.element.style.cursor = 'pointer';
        this.element.style.transition = 'all 0.3s ease';
        this.element.style.userSelect = 'none';
        
        // 이모지 설정
        this.element.textContent = this.getCandyEmoji(this.type);
        this.element.style.display = 'flex';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.fontSize = '1.5rem';
        
        this.setupEventListeners();
        this.updatePosition();
    }
    
    setupEventListeners() {
        this.element.addEventListener('mousedown', (e) => this.onTouchStart(e));
        this.element.addEventListener('mousemove', (e) => this.onTouchMove(e));
        this.element.addEventListener('mouseup', (e) => this.onTouchEnd(e));
        
        // 터치 이벤트 (모바일)
        this.element.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.element.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.element.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // 호버 효과
        this.element.addEventListener('mouseenter', () => this.onHover());
        this.element.addEventListener('mouseleave', () => this.onHoverEnd());
    }
    
    onTouchStart(event) {
        if (this.isMoving || this.type === BlockType.EMPTY || this.type === BlockType.OBSTACLE) {
            return;
        }
        
        event.preventDefault();
        
        // 게임 매니저에 이벤트 전달
        if (window.PuzzleManager) {
            window.PuzzleManager.onBlockTouchStart(this, event);
        }
        
        this.playSelectAnimation();
    }
    
    onTouchMove(event) {
        if (this.isMoving) return;
        
        event.preventDefault();
        
        if (window.PuzzleManager) {
            window.PuzzleManager.onBlockTouchMove(this, event);
        }
    }
    
    onTouchEnd(event) {
        if (this.isMoving) return;
        
        event.preventDefault();
        
        if (window.PuzzleManager) {
            window.PuzzleManager.onBlockTouchEnd(this, event);
        }
        
        this.clearSelection();
    }
    
    onHover() {
        if (this.isMoving || this.isSelected) return;
        
        this.element.style.transform = 'scale(1.05)';
        this.element.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
    }
    
    onHoverEnd() {
        if (this.isSelected) return;
        
        this.element.style.transform = 'scale(1.0)';
        this.element.style.boxShadow = 'none';
    }
    
    setType(newType) {
        this.type = newType;
        this.element.className = `candy ${this.type}`;
        this.element.textContent = this.getCandyEmoji(this.type);
        
        // 타입 변경 애니메이션
        this.element.style.transform = 'scale(1.2)';
        setTimeout(() => {
            this.element.style.transform = 'scale(1.0)';
        }, 200);
    }
    
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.domId = `block_${x}_${y}`;
        this.element.id = this.domId;
        this.updatePosition();
    }
    
    updatePosition() {
        if (!this.element) return;
        
        const cellSize = 45; // 픽셀
        const offsetX = 10;
        const offsetY = 10;
        
        this.element.style.left = `${offsetX + this.position.x * cellSize}px`;
        this.element.style.top = `${offsetY + this.position.y * cellSize}px`;
    }
    
    async moveTo(newX, newY, duration = 300) {
        return new Promise((resolve) => {
            this.isMoving = true;
            this.position.x = newX;
            this.position.y = newY;
            
            const cellSize = 45;
            const offsetX = 10;
            const offsetY = 10;
            
            const targetLeft = offsetX + newX * cellSize;
            const targetTop = offsetY + newY * cellSize;
            
            this.element.style.transition = `all ${duration}ms ease-out`;
            this.element.style.left = `${targetLeft}px`;
            this.element.style.top = `${targetTop}px`;
            
            setTimeout(() => {
                this.isMoving = false;
                this.element.style.transition = 'all 0.3s ease';
                resolve();
            }, duration);
        });
    }
    
    async playMatchAnimation() {
        return new Promise((resolve) => {
            this.isMatched = true;
            this.animationState = BlockAnimationState.MATCHING;
            
            // 매치 애니메이션: 확대 → 축소 → 사라짐
            this.element.style.animation = 'matchPop 0.4s ease-out';
            
            // 파티클 효과 (간단한 CSS 애니메이션)
            this.createMatchParticles();
            
            // 사운드 효과 (있다면)
            this.playMatchSound();
            
            setTimeout(() => {
                this.element.style.opacity = '0';
                this.element.style.transform = 'scale(0)';
                
                setTimeout(() => {
                    resolve();
                }, 100);
            }, 300);
        });
    }
    
    playSelectAnimation() {
        this.isSelected = true;
        this.animationState = BlockAnimationState.SELECTED;
        
        this.element.style.transform = 'scale(1.1)';
        this.element.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
        this.element.style.zIndex = '10';
    }
    
    clearSelection() {
        this.isSelected = false;
        this.animationState = BlockAnimationState.IDLE;
        
        this.element.style.transform = 'scale(1.0)';
        this.element.style.boxShadow = 'none';
        this.element.style.zIndex = '1';
    }
    
    async playFallAnimation(fromY, toY, duration = 300) {
        return new Promise((resolve) => {
            this.isMoving = true;
            this.animationState = BlockAnimationState.FALLING;
            
            const cellSize = 45;
            const offsetY = 10;
            const startTop = offsetY + fromY * cellSize;
            const endTop = offsetY + toY * cellSize;
            
            // 자유낙하 애니메이션 효과
            this.element.style.transition = `top ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            this.element.style.top = `${endTop}px`;
            
            // 착지 시 튕김 효과
            setTimeout(() => {
                this.element.style.transform = 'scaleY(0.8)';
                setTimeout(() => {
                    this.element.style.transform = 'scaleY(1.0)';
                    this.isMoving = false;
                    this.animationState = BlockAnimationState.IDLE;
                    resolve();
                }, 100);
            }, duration - 100);
        });
    }
    
    createMatchParticles() {
        // 간단한 파티클 효과
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.backgroundColor = this.getBlockColor(this.type);
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '20';
            
            const rect = this.element.getBoundingClientRect();
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2}px`;
            
            document.body.appendChild(particle);
            
            // 랜덤 방향으로 파티클 애니메이션
            const angle = (Math.PI * 2 * i) / 5;
            const distance = 30 + Math.random() * 20;
            const endX = rect.left + rect.width / 2 + Math.cos(angle) * distance;
            const endY = rect.top + rect.height / 2 + Math.sin(angle) * distance;
            
            particle.style.transition = 'all 0.5s ease-out';
            setTimeout(() => {
                particle.style.left = `${endX}px`;
                particle.style.top = `${endY}px`;
                particle.style.opacity = '0';
                particle.style.transform = 'scale(0)';
            }, 10);
            
            // 파티클 제거
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 500);
        }
    }
    
    playMatchSound() {
        // 사운드 재생 (Web Audio API 사용 가능)
        if (window.AudioManager) {
            window.AudioManager.playSound(`match_${this.type}`);
        }
    }
    
    getCandyEmoji(type) {
        const emojis = {
            [BlockType.RED]: '🍎',
            [BlockType.BLUE]: '🍇', 
            [BlockType.GREEN]: '🥝',
            [BlockType.YELLOW]: '🍌',
            [BlockType.PURPLE]: '🍆',
            [BlockType.ORANGE]: '🧡',
            [BlockType.EMPTY]: '',
            [BlockType.OBSTACLE]: '🧱'
        };
        
        return emojis[type] || '🍬';
    }
    
    getBlockColor(type) {
        const colors = {
            [BlockType.RED]: '#FF6B6B',
            [BlockType.BLUE]: '#4ECDC4',
            [BlockType.GREEN]: '#45B7D1',
            [BlockType.YELLOW]: '#FFA07A',
            [BlockType.PURPLE]: '#98D8C8',
            [BlockType.ORANGE]: '#FFB347',
            [BlockType.EMPTY]: '#FFFFFF',
            [BlockType.OBSTACLE]: '#8B4513'
        };
        
        return colors[type] || '#CCCCCC';
    }
    
    isEmpty() {
        return this.type === BlockType.EMPTY;
    }
    
    isObstacle() {
        return this.type === BlockType.OBSTACLE;
    }
    
    isSpecialBlock() {
        return false; // 기본 블록은 특수 블록이 아님
    }
    
    canMatch() {
        return !this.isEmpty() && !this.isObstacle() && !this.isSpecialBlock();
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
    
    clone() {
        const newBlock = new Block(this.type, this.position.x, this.position.y);
        return newBlock;
    }
    
    toString() {
        return `Block(${this.type}, ${this.position.x}, ${this.position.y})`;
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
@keyframes matchPop {
    0% { transform: scale(1.0); }
    50% { transform: scale(1.3); }
    100% { transform: scale(0.8); }
}

.candy {
    transition: all 0.3s ease;
}

.candy:hover {
    transform: scale(1.05) !important;
    box-shadow: 0 3px 10px rgba(0,0,0,0.2) !important;
}

.candy.red { background: #FF6B6B; }
.candy.blue { background: #4ECDC4; }
.candy.green { background: #45B7D1; }
.candy.yellow { background: #FFA07A; }
.candy.purple { background: #98D8C8; }
.candy.orange { background: #FFB347; }
.candy.empty { background: transparent; }
.candy.obstacle { background: #8B4513; }
`;

document.head.appendChild(style);