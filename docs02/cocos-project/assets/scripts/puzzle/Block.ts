/**
 * [의도] Sweet Puzzle 게임의 기본 블록 클래스를 Cocos Creator 환경에서 구현
 * [책임] 블록 노드 관리, 애니메이션, 터치 이벤트 처리, 상태 관리
 */

import { _decorator, Component, Node, Sprite, Label, tween, Vec3, EventTouch, SpriteFrame } from 'cc';
import { BlockType, BlockAnimationState, SpecialBlockType, BlockPosition, BlockMatchInfo, BlockAnimationConfig, BlockTypeHelper } from './BlockType';

const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    
    @property(Sprite)
    private blockSprite: Sprite = null!;
    
    @property(Label)
    private blockLabel: Label = null!;
    
    @property([SpriteFrame])
    private blockSprites: SpriteFrame[] = [];
    
    // 블록 속성
    private _blockType: BlockType = BlockType.EMPTY;
    private _specialType: SpecialBlockType = SpecialBlockType.NONE;
    private _position: BlockPosition = { x: 0, y: 0 };
    private _animationState: BlockAnimationState = BlockAnimationState.IDLE;
    
    // 상태 플래그
    private _isMatched: boolean = false;
    private _isMoving: boolean = false;
    private _isSelected: boolean = false;
    private _isAnimating: boolean = false;
    
    // 매치 정보
    private _matchInfo: BlockMatchInfo | null = null;
    
    // 애니메이션 큐
    private _animationQueue: (() => Promise<void>)[] = [];
    
    // 이벤트 콜백
    public onTouchStartCallback?: (block: Block, event: EventTouch) => void;
    public onTouchMoveCallback?: (block: Block, event: EventTouch) => void;
    public onTouchEndCallback?: (block: Block, event: EventTouch) => void;
    
    get blockType(): BlockType { return this._blockType; }
    get specialType(): SpecialBlockType { return this._specialType; }
    get position(): BlockPosition { return this._position; }
    get animationState(): BlockAnimationState { return this._animationState; }
    get isMatched(): boolean { return this._isMatched; }
    get isMoving(): boolean { return this._isMoving; }
    get isSelected(): boolean { return this._isSelected; }
    get isAnimating(): boolean { return this._isAnimating; }
    get matchInfo(): BlockMatchInfo | null { return this._matchInfo; }
    
    /**
     * [의도] 블록 초기화
     * [책임] 블록 타입 설정, 위치 설정, 이벤트 리스너 등록
     */
    public initialize(type: BlockType, x: number, y: number): void {
        this._blockType = type;
        this._position = { x, y };
        this._animationState = BlockAnimationState.IDLE;
        
        this.setupVisuals();
        this.setupEventListeners();
        this.updatePosition();
        
        console.log(`[Block] 초기화 완료: ${type} at (${x}, ${y})`);
    }
    
    /**
     * [의도] 블록 시각적 요소 설정
     * [책임] 스프라이트, 라벨 업데이트
     */
    private setupVisuals(): void {
        // 이모지로 블록 표시 (임시, 나중에 스프라이트로 교체)
        if (this.blockLabel) {
            this.blockLabel.string = BlockTypeHelper.getBlockEmoji(this._blockType);
        }
        
        // 스프라이트 설정 (스프라이트 에셋이 있는 경우)
        if (this.blockSprite && this.blockSprites.length > 0) {
            const spriteIndex = this.getSpriteIndex();
            if (spriteIndex >= 0 && spriteIndex < this.blockSprites.length) {
                this.blockSprite.spriteFrame = this.blockSprites[spriteIndex];
            }
        }
        
        // 특수 블록 시각 효과
        this.updateSpecialBlockVisual();
    }
    
    /**
     * [의도] 블록 타입에 따른 스프라이트 인덱스 반환
     */
    private getSpriteIndex(): number {
        switch (this._blockType) {
            case BlockType.RED_APPLE: return 0;
            case BlockType.GRAPE: return 1;
            case BlockType.KIWI: return 2;
            case BlockType.BANANA: return 3;
            case BlockType.EGGPLANT: return 4;
            case BlockType.ORANGE: return 5;
            default: return -1;
        }
    }
    
    /**
     * [의도] 터치 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
    
    /**
     * [의도] 터치 시작 이벤트 처리
     */
    private onTouchStart(event: EventTouch): void {
        if (this._isMoving || this._blockType === BlockType.EMPTY) {
            return;
        }
        
        console.log(`[Block] 터치 시작: ${this._blockType} at (${this._position.x}, ${this._position.y})`);
        
        this.playSelectAnimation();
        
        if (this.onTouchStartCallback) {
            this.onTouchStartCallback(this, event);
        }
    }
    
    /**
     * [의도] 터치 이동 이벤트 처리
     */
    private onTouchMove(event: EventTouch): void {
        if (this._isMoving) return;
        
        if (this.onTouchMoveCallback) {
            this.onTouchMoveCallback(this, event);
        }
    }
    
    /**
     * [의도] 터치 종료 이벤트 처리
     */
    private onTouchEnd(event: EventTouch): void {
        if (this._isMoving) return;
        
        console.log(`[Block] 터치 종료: ${this._blockType} at (${this._position.x}, ${this._position.y})`);
        
        this.playDeselectAnimation();
        
        if (this.onTouchEndCallback) {
            this.onTouchEndCallback(this, event);
        }
    }
    
    /**
     * [의도] 블록 위치 업데이트
     * [책임] 논리적 위치를 실제 노드 위치로 변환
     */
    public updatePosition(): void {
        const BLOCK_SIZE = 60; // 블록 크기
        const OFFSET_X = -240; // 보드 중심 오프셋
        const OFFSET_Y = 180;
        
        const worldX = OFFSET_X + this._position.x * BLOCK_SIZE;
        const worldY = OFFSET_Y - this._position.y * BLOCK_SIZE;
        
        this.node.setPosition(worldX, worldY, 0);
    }
    
    /**
     * [의도] 블록 타입 변경
     */
    public setBlockType(type: BlockType): void {
        this._blockType = type;
        this.setupVisuals();
    }
    
    /**
     * [의도] 특수 블록 타입 설정
     */
    public setSpecialType(type: SpecialBlockType): void {
        this._specialType = type;
        this.updateSpecialBlockVisual();
    }
    
    /**
     * [의도] 특수 블록 시각 효과 업데이트
     */
    private updateSpecialBlockVisual(): void {
        // 특수 블록에 따른 시각 효과 (파티클, 테두리 등)
        switch (this._specialType) {
            case SpecialBlockType.LINE_HORIZONTAL:
                this.node.getComponent(Sprite)!.color = cc.Color.CYAN;
                break;
            case SpecialBlockType.LINE_VERTICAL:
                this.node.getComponent(Sprite)!.color = cc.Color.MAGENTA;
                break;
            case SpecialBlockType.BOMB:
                this.node.getComponent(Sprite)!.color = cc.Color.RED;
                break;
            case SpecialBlockType.RAINBOW:
                this.node.getComponent(Sprite)!.color = cc.Color.WHITE;
                break;
            default:
                this.node.getComponent(Sprite)!.color = cc.Color.WHITE;
                break;
        }
    }
    
    /**
     * [의도] 선택 애니메이션 재생
     */
    public async playSelectAnimation(): Promise<void> {
        return new Promise((resolve) => {
            this._isSelected = true;
            this._animationState = BlockAnimationState.SELECTED;
            
            tween(this.node)
                .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
                .call(() => {
                    console.log(`[Block] 선택 애니메이션 완료: ${this._blockType}`);
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * [의도] 선택 해제 애니메이션 재생
     */
    public async playDeselectAnimation(): Promise<void> {
        return new Promise((resolve) => {
            this._isSelected = false;
            this._animationState = BlockAnimationState.IDLE;
            
            tween(this.node)
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    console.log(`[Block] 선택 해제 애니메이션 완료: ${this._blockType}`);
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * [의도] 매치 애니메이션 재생
     */
    public async playMatchAnimation(): Promise<void> {
        return new Promise((resolve) => {
            this._isMatched = true;
            this._animationState = BlockAnimationState.MATCHING;
            
            // 매치 파티클 생성
            this.createMatchParticles();
            
            tween(this.node)
                .to(0.2, { scale: new Vec3(1.3, 1.3, 1) })
                .to(0.2, { scale: new Vec3(0, 0, 1) })
                .call(() => {
                    console.log(`[Block] 매치 애니메이션 완료: ${this._blockType}`);
                    this._animationState = BlockAnimationState.DESTROYING;
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * [의도] 낙하 애니메이션 재생
     */
    public async playFallAnimation(targetY: number, duration: number = 0.3): Promise<void> {
        return new Promise((resolve) => {
            this._isMoving = true;
            this._animationState = BlockAnimationState.FALLING;
            
            const BLOCK_SIZE = 60;
            const OFFSET_Y = 180;
            const worldTargetY = OFFSET_Y - targetY * BLOCK_SIZE;
            
            tween(this.node)
                .to(duration, { position: new Vec3(this.node.position.x, worldTargetY, 0) })
                .call(() => {
                    this._position.y = targetY;
                    this._isMoving = false;
                    this._animationState = BlockAnimationState.IDLE;
                    console.log(`[Block] 낙하 애니메이션 완료: ${this._blockType} to y=${targetY}`);
                    resolve();
                })
                .start();
        });
    }
    
    /**
     * [의도] 교환 애니메이션 재생
     */
    public async playSwapAnimation(targetBlock: Block, duration: number = 0.3): Promise<void> {
        return new Promise((resolve) => {
            this._isMoving = true;
            this._animationState = BlockAnimationState.SWAPPING;
            
            const targetPos = targetBlock.node.position.clone();
            const currentPos = this.node.position.clone();
            
            // 두 블록이 동시에 위치 교환
            const thisBlockTween = tween(this.node)
                .to(duration, { position: targetPos });
            
            const targetBlockTween = tween(targetBlock.node)
                .to(duration, { position: currentPos });
            
            Promise.all([
                new Promise<void>((res) => thisBlockTween.call(() => res()).start()),
                new Promise<void>((res) => targetBlockTween.call(() => res()).start())
            ]).then(() => {
                // 논리적 위치 교환\n                const tempPos = this._position;\n                this._position = targetBlock._position;\n                targetBlock._position = tempPos;\n                \n                this._isMoving = false;\n                targetBlock._isMoving = false;\n                this._animationState = BlockAnimationState.IDLE;\n                targetBlock._animationState = BlockAnimationState.IDLE;\n                \n                console.log(`[Block] 교환 애니메이션 완료: ${this._blockType} <-> ${targetBlock._blockType}`);\n                resolve();\n            });\n        });\n    }\n    \n    /**\n     * [의도] 매치 파티클 생성\n     */\n    private createMatchParticles(): void {\n        // TODO: 파티클 시스템으로 폭발 효과 생성\n        console.log(`[Block] 매치 파티클 생성: ${this._blockType}`);\n    }\n    \n    /**\n     * [의도] 블록 제거\n     */\n    public destroy(): void {\n        this.node.off(Node.EventType.TOUCH_START);\n        this.node.off(Node.EventType.TOUCH_MOVE);\n        this.node.off(Node.EventType.TOUCH_END);\n        this.node.off(Node.EventType.TOUCH_CANCEL);\n        \n        this.node.destroy();\n        console.log(`[Block] 블록 제거됨: ${this._blockType}`);\n    }\n    \n    /**\n     * [의도] 블록 정보를 문자열로 반환 (디버깅용)\n     */\n    public toString(): string {\n        return `Block(${this._blockType}, ${this._position.x},${this._position.y}, ${this._animationState})`;\n    }\n}