/**
 * [의도] 게임플레이 메인 씬 UI 관리
 * [책임] 게임 보드 연결, HUD 표시, 게임 상태 UI 업데이트
 */

import { _decorator, Component, Node, Label, ProgressBar, Button, Vec3 } from 'cc';
import { BaseUIScene } from './BaseUIScene';
import { GameBoard } from '../puzzle/GameBoard';
import { ProgressionManager } from '../progression/ProgressionManager';
import { UIManager, UIScene } from './UIManager';

const { ccclass, property } = _decorator;

export interface GamePlayData {
    levelId: number;
    worldId: number;
    targetScore: number;
    maxMoves: number;
    levelType: string;
}

@ccclass('GamePlayScene')
export class GamePlayScene extends BaseUIScene {
    
    // UI 컴포넌트들
    @property(Label)
    private scoreLabel: Label = null!;
    
    @property(Label)
    private movesLabel: Label = null!;
    
    @property(Label)
    private targetLabel: Label = null!;
    
    @property(Label)
    private levelLabel: Label = null!;
    
    @property(ProgressBar)
    private scoreProgressBar: ProgressBar = null!;
    
    @property(Button)
    private pauseButton: Button = null!;
    
    @property(Button)
    private hintButton: Button = null!;
    
    @property(Button)
    private shuffleButton: Button = null!;
    
    @property(Node)
    private gameBoardContainer: Node = null!;
    
    @property(Node)
    private hudContainer: Node = null!;
    
    @property(Node)
    private starContainer: Node = null!;
    
    // 게임 상태
    private currentScore: number = 0;
    private remainingMoves: number = 0;
    private targetScore: number = 0;
    private levelData: GamePlayData | null = null;
    
    // 게임 보드 참조
    private gameBoard: GameBoard | null = null;
    
    /**
     * [의도] 게임플레이 씬 초기 설정
     */
    protected setupScene(): void {
        this.initializeGameBoard();
        this.setupHUD();
        this.resetGameState();
    }
    
    /**
     * [의도] 게임 보드 초기화
     */
    private initializeGameBoard(): void {
        if (this.gameBoardContainer) {
            // GameBoard 컴포넌트 추가 또는 가져오기
            this.gameBoard = this.gameBoardContainer.getComponent(GameBoard);
            
            if (!this.gameBoard) {
                this.gameBoard = this.gameBoardContainer.addComponent(GameBoard);
            }
            
            // 게임 보드 이벤트 연결
            this.gameBoard.onScoreUpdate = this.onScoreUpdate.bind(this);
            this.gameBoard.onMoveUsed = this.onMoveUsed.bind(this);
            this.gameBoard.onLevelComplete = this.onLevelComplete.bind(this);
            this.gameBoard.onLevelFailed = this.onLevelFailed.bind(this);
        }
    }
    
    /**
     * [의도] HUD UI 설정
     */
    private setupHUD(): void {
        if (this.hudContainer) {
            this.hudContainer.active = true;
        }
        
        // 별 표시 초기화
        this.updateStarDisplay(0);
    }
    
    /**
     * [의도] 이벤트 바인딩
     */
    protected bindEvents(): void {
        if (this.pauseButton) {
            this.pauseButton.node.on(Button.EventType.CLICK, this.onPauseClicked, this);
        }
        
        if (this.hintButton) {
            this.hintButton.node.on(Button.EventType.CLICK, this.onHintClicked, this);
        }
        
        if (this.shuffleButton) {
            this.shuffleButton.node.on(Button.EventType.CLICK, this.onShuffleClicked, this);
        }
    }
    
    /**
     * [의도] 이벤트 언바인딩
     */
    protected unbindEvents(): void {
        if (this.pauseButton) {
            this.pauseButton.node.off(Button.EventType.CLICK, this.onPauseClicked, this);
        }
        
        if (this.hintButton) {
            this.hintButton.node.off(Button.EventType.CLICK, this.onHintClicked, this);
        }
        
        if (this.shuffleButton) {
            this.shuffleButton.node.off(Button.EventType.CLICK, this.onShuffleClicked, this);
        }
    }
    
    /**
     * [의도] 데이터 업데이트 처리
     */
    protected handleDataUpdate(): void {
        if (this.sceneData) {
            this.levelData = this.sceneData as GamePlayData;
            this.startLevel(this.levelData);
        }
    }
    
    /**
     * [의도] 레벨 시작
     */
    private startLevel(levelData: GamePlayData): void {
        this.targetScore = levelData.targetScore;
        this.remainingMoves = levelData.maxMoves;
        this.currentScore = 0;
        
        // UI 업데이트
        this.updateUI();
        
        // 게임 보드 시작
        if (this.gameBoard) {
            this.gameBoard.startLevel(levelData);
        }
        
        console.log(`[GamePlayScene] 레벨 ${levelData.levelId} 시작`);
    }
    
    /**
     * [의도] UI 업데이트
     */
    private updateUI(): void {
        if (this.levelData) {
            // 레벨 정보
            if (this.levelLabel) {
                this.levelLabel.string = `레벨 ${this.levelData.levelId}`;
            }
            
            // 타겟 점수
            if (this.targetLabel) {
                this.targetLabel.string = `목표: ${this.targetScore.toLocaleString()}`;
            }
        }
        
        // 현재 점수
        if (this.scoreLabel) {
            this.scoreLabel.string = this.currentScore.toLocaleString();
        }
        
        // 남은 이동 수
        if (this.movesLabel) {
            this.movesLabel.string = `이동: ${this.remainingMoves}`;
        }
        
        // 점수 진행도
        if (this.scoreProgressBar) {
            const progress = Math.min(this.currentScore / this.targetScore, 1.0);
            this.scoreProgressBar.progress = progress;
        }
        
        // 별 표시 업데이트
        this.updateStarDisplay(this.calculateStars());
    }
    
    /**
     * [의도] 게임 상태 초기화
     */
    private resetGameState(): void {
        this.currentScore = 0;
        this.remainingMoves = 0;
        this.targetScore = 0;
        this.updateUI();
    }
    
    /**
     * [의도] 점수 업데이트 콜백
     */
    private onScoreUpdate(score: number, delta: number): void {
        this.currentScore = score;
        this.updateUI();
        
        // 점수 증가 애니메이션
        this.animateScoreIncrease(delta);
    }
    
    /**
     * [의도] 이동 사용 콜백
     */
    private onMoveUsed(): void {
        this.remainingMoves = Math.max(0, this.remainingMoves - 1);
        this.updateUI();
        
        // 이동 수 부족 경고
        if (this.remainingMoves <= 3) {
            this.showLowMovesWarning();
        }
    }
    
    /**
     * [의도] 레벨 완료 콜백
     */
    private onLevelComplete(finalScore: number): void {
        const stars = this.calculateStars();
        
        // 진행 매니저에 결과 전달
        const progressionManager = ProgressionManager.getInstance();
        if (progressionManager && this.levelData) {
            progressionManager.completeLevel(this.levelData.levelId, {
                score: finalScore,
                starsEarned: stars,
                movesUsed: this.levelData.maxMoves - this.remainingMoves,
                completed: true
            });
        }
        
        // 완료 씬으로 전환
        setTimeout(() => {
            UIManager.getInstance().switchToScene(UIScene.LEVEL_COMPLETE, {
                score: finalScore,
                stars: stars,
                levelId: this.levelData?.levelId,
                worldId: this.levelData?.worldId
            });
        }, 1500);
    }
    
    /**
     * [의도] 레벨 실패 콜백
     */
    private onLevelFailed(): void {
        // 실패 처리 로직
        console.log('[GamePlayScene] 레벨 실패');
        
        // 재시도 옵션 표시
        this.showRetryOptions();
    }
    
    /**
     * [의도] 별점 계산
     */
    private calculateStars(): number {
        if (this.currentScore < this.targetScore) return 0;
        
        const ratio = this.currentScore / this.targetScore;
        const efficiency = this.remainingMoves / (this.levelData?.maxMoves || 1);
        
        if (ratio >= 2.2 && efficiency >= 0.3) return 3;
        if (ratio >= 1.5) return 2;
        return 1;
    }
    
    /**
     * [의도] 별 표시 업데이트
     */
    private updateStarDisplay(stars: number): void {
        if (!this.starContainer) return;
        
        // 별 노드들 업데이트 (3개 별 가정)
        for (let i = 0; i < 3; i++) {
            const starNode = this.starContainer.children[i];
            if (starNode) {
                starNode.active = i < stars;
                
                // 별 획득 애니메이션
                if (i < stars) {
                    this.animateStarEarned(starNode, i * 0.2);
                }
            }
        }
    }
    
    /**
     * [의도] 점수 증가 애니메이션
     */
    private animateScoreIncrease(delta: number): void {
        // 간단한 스케일 애니메이션
        if (this.scoreLabel) {
            const originalScale = this.scoreLabel.node.scale.clone();
            this.scoreLabel.node.setScale(1.2, 1.2, 1.0);
            
            setTimeout(() => {
                if (this.scoreLabel) {
                    this.scoreLabel.node.setScale(originalScale);
                }
            }, 150);
        }
    }
    
    /**
     * [의도] 별 획득 애니메이션
     */
    private animateStarEarned(starNode: Node, delay: number): void {
        setTimeout(() => {
            starNode.setScale(0, 0, 1);
            starNode.active = true;
            
            // 스케일 애니메이션 (Tween 대체용)
            const duration = 300;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const scale = progress * 1.2 * (2.0 - progress); // 탄성 효과
                
                starNode.setScale(scale, scale, 1);
                
                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }, delay * 1000);
    }
    
    /**
     * [의도] 이동 수 부족 경고
     */
    private showLowMovesWarning(): void {
        // 이동 수 라벨 색상 변경 또는 깜빡임 효과
        if (this.movesLabel) {
            // 간단한 깜빡임 효과
            let blinkCount = 0;
            const blinkInterval = setInterval(() => {
                this.movesLabel.node.active = !this.movesLabel.node.active;
                blinkCount++;
                
                if (blinkCount >= 6) {
                    clearInterval(blinkInterval);
                    this.movesLabel.node.active = true;
                }
            }, 200);
        }
    }
    
    /**
     * [의도] 재시도 옵션 표시
     */
    private showRetryOptions(): void {
        // 모달로 재시도 옵션 표시
        UIManager.getInstance().showModal(UIScene.PAUSE, {
            type: 'retry',
            levelId: this.levelData?.levelId
        });
    }
    
    // === 버튼 이벤트 핸들러 ===
    
    private onPauseClicked(): void {
        UIManager.getInstance().showModal(UIScene.PAUSE, {
            type: 'pause',
            currentScore: this.currentScore,
            remainingMoves: this.remainingMoves
        });
    }
    
    private onHintClicked(): void {
        if (this.gameBoard) {
            this.gameBoard.showHint();
        }
    }
    
    private onShuffleClicked(): void {
        if (this.gameBoard && this.remainingMoves > 0) {
            this.gameBoard.shuffleBoard();
            this.onMoveUsed(); // 셔플도 이동으로 간주
        }
    }
}