/**
 * [의도] 레벨 완료 씬 UI 관리
 * [책임] 완료 결과 표시, 보상 지급, 별점 애니메이션, 다음 단계 안내
 */

import { _decorator, Component, Node, Label, Button, Sprite, tween, Vec3 } from 'cc';
import { BaseUIScene } from './BaseUIScene';
import { ProgressionManager } from '../progression/ProgressionManager';
import { UIManager, UIScene, TransitionType } from './UIManager';

const { ccclass, property } = _decorator;

export interface LevelCompleteData {
    score: number;
    stars: number;
    levelId: number;
    worldId: number;
    isNewRecord?: boolean;
    rewards?: {
        coins: number;
        gems: number;
        experience: number;
        specialItems?: string[];
    };
}

@ccclass('LevelCompleteScene')
export class LevelCompleteScene extends BaseUIScene {
    
    // UI 컴포넌트들
    @property(Label)
    private congratsLabel: Label = null!;
    
    @property(Label)
    private levelLabel: Label = null!;
    
    @property(Label)
    private scoreLabel: Label = null!;
    
    @property(Label)
    private newRecordLabel: Label = null!;
    
    @property(Node)
    private starsContainer: Node = null!;
    
    @property(Node)
    private rewardsContainer: Node = null!;
    
    @property(Label)
    private coinsRewardLabel: Label = null!;
    
    @property(Label)
    private gemsRewardLabel: Label = null!;
    
    @property(Label)
    private experienceRewardLabel: Label = null!;
    
    @property(Button)
    private nextLevelButton: Button = null!;
    
    @property(Button)
    private retryButton: Button = null!;
    
    @property(Button)
    private worldMapButton: Button = null!;
    
    @property(Node)
    private celebrationEffects: Node = null!;
    
    // 애니메이션 제어
    private animationComplete: boolean = false;
    private levelCompleteData: LevelCompleteData | null = null;
    
    // 매니저 참조
    private progressionManager: ProgressionManager | null = null;
    
    /**
     * [의도] 레벨 완료 씬 초기 설정
     */
    protected setupScene(): void {
        this.initializeManagers();
        this.resetScene();
        this.setupInitialState();
    }
    
    /**
     * [의도] 매니저 초기화
     */
    private initializeManagers(): void {
        this.progressionManager = ProgressionManager.getInstance();
        
        if (!this.progressionManager) {
            console.error('[LevelCompleteScene] ProgressionManager 인스턴스를 찾을 수 없습니다');
        }
    }
    
    /**
     * [의도] 씬 초기 상태 설정
     */
    private setupInitialState(): void {
        // 모든 요소를 숨긴 상태로 시작
        this.hideAllElements();
        
        // 별들 초기 상태 설정
        this.setupStars();
        
        // 축하 효과 준비
        this.prepareCelebrationEffects();
    }
    
    /**
     * [의도] 모든 UI 요소 숨기기
     */
    private hideAllElements(): void {
        const elementsToHide = [
            this.congratsLabel?.node,
            this.levelLabel?.node,
            this.scoreLabel?.node,
            this.newRecordLabel?.node,
            this.starsContainer,
            this.rewardsContainer,
            this.nextLevelButton?.node,
            this.retryButton?.node,
            this.worldMapButton?.node
        ];
        
        elementsToHide.forEach(element => {
            if (element) {
                element.active = false;
                element.setScale(0, 0, 1);
            }
        });
    }
    
    /**
     * [의도] 별 노드들 초기 설정
     */
    private setupStars(): void {
        if (!this.starsContainer) return;
        
        // 3개의 별 노드 생성
        this.starsContainer.removeAllChildren();
        
        for (let i = 0; i < 3; i++) {
            const starNode = new Node(`Star_${i + 1}`);
            const starLabel = starNode.addComponent(Label);
            starLabel.string = '⭐';
            starLabel.fontSize = 48;
            
            // 초기에는 투명하고 작게
            starNode.active = false;
            starNode.setScale(0, 0, 1);
            
            this.starsContainer.addChild(starNode);
            
            // 별 간격 조정
            starNode.setPosition((i - 1) * 80, 0, 0);
        }
    }
    
    /**
     * [의도] 축하 효과 준비
     */
    private prepareCelebrationEffects(): void {
        if (this.celebrationEffects) {
            this.celebrationEffects.active = false;
        }
    }
    
    /**
     * [의도] 씬 리셋
     */
    private resetScene(): void {
        this.animationComplete = false;
        this.levelCompleteData = null;
    }
    
    /**
     * [의도] 이벤트 바인딩
     */
    protected bindEvents(): void {
        if (this.nextLevelButton) {
            this.nextLevelButton.node.on(Button.EventType.CLICK, this.onNextLevelClicked, this);
        }
        
        if (this.retryButton) {
            this.retryButton.node.on(Button.EventType.CLICK, this.onRetryClicked, this);
        }
        
        if (this.worldMapButton) {
            this.worldMapButton.node.on(Button.EventType.CLICK, this.onWorldMapClicked, this);
        }
    }
    
    /**
     * [의도] 이벤트 언바인딩
     */
    protected unbindEvents(): void {
        if (this.nextLevelButton) {
            this.nextLevelButton.node.off(Button.EventType.CLICK, this.onNextLevelClicked, this);
        }
        
        if (this.retryButton) {
            this.retryButton.node.off(Button.EventType.CLICK, this.onRetryClicked, this);
        }
        
        if (this.worldMapButton) {
            this.worldMapButton.node.off(Button.EventType.CLICK, this.onWorldMapClicked, this);
        }
    }
    
    /**
     * [의도] 데이터 업데이트 처리
     */
    protected handleDataUpdate(): void {
        if (this.sceneData) {
            this.levelCompleteData = this.sceneData as LevelCompleteData;
            this.startResultAnimation();
        }
    }
    
    /**
     * [의도] 결과 애니메이션 시작
     */
    private async startResultAnimation(): Promise<void> {
        if (!this.levelCompleteData) return;
        
        console.log('[LevelCompleteScene] 결과 애니메이션 시작');
        
        try {
            // 1. 축하 메시지 표시
            await this.animateCongratsMessage();
            
            // 2. 레벨 정보 표시
            await this.animateLevelInfo();
            
            // 3. 점수 애니메이션
            await this.animateScore();
            
            // 4. 별 애니메이션
            await this.animateStars();
            
            // 5. 보상 애니메이션
            await this.animateRewards();
            
            // 6. 버튼 표시
            await this.animateButtons();
            
            // 7. 축하 효과
            this.showCelebrationEffects();
            
            this.animationComplete = true;
            console.log('[LevelCompleteScene] 결과 애니메이션 완료');
            
        } catch (error) {
            console.error('[LevelCompleteScene] 애니메이션 오류:', error);
            this.animationComplete = true;
        }
    }
    
    /**
     * [의도] 축하 메시지 애니메이션
     */
    private animateCongratsMessage(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.congratsLabel || !this.levelCompleteData) {
                resolve();
                return;
            }
            
            // 성과에 따른 축하 메시지
            const messages = ['레벨 완료!', '훌륭해요!', '완벽해요!'];
            const message = messages[Math.min(this.levelCompleteData.stars - 1, 2)] || messages[0];
            
            this.congratsLabel.string = message;
            this.congratsLabel.node.active = true;
            
            // 스케일 애니메이션
            tween(this.congratsLabel.node)
                .to(0.5, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }
    
    /**
     * [의도] 레벨 정보 애니메이션
     */
    private animateLevelInfo(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.levelLabel || !this.levelCompleteData) {
                resolve();
                return;
            }
            
            this.levelLabel.string = `레벨 ${this.levelCompleteData.levelId}`;
            this.levelLabel.node.active = true;
            
            tween(this.levelLabel.node)
                .to(0.3, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }
    
    /**
     * [의도] 점수 애니메이션
     */
    private animateScore(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.scoreLabel || !this.levelCompleteData) {
                resolve();
                return;
            }
            
            this.scoreLabel.node.active = true;
            this.scoreLabel.node.setScale(1, 1, 1);
            
            // 숫자 카운팅 애니메이션
            const targetScore = this.levelCompleteData.score;
            const duration = 1.0;
            const startTime = Date.now();
            
            const updateScore = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / (duration * 1000), 1.0);
                
                const currentScore = Math.floor(targetScore * progress);
                this.scoreLabel.string = `점수: ${currentScore.toLocaleString()}`;
                
                if (progress < 1.0) {
                    requestAnimationFrame(updateScore);
                } else {
                    // 신기록 표시
                    if (this.levelCompleteData?.isNewRecord && this.newRecordLabel) {
                        this.newRecordLabel.node.active = true;
                        tween(this.newRecordLabel.node)
                            .to(0.3, { scale: new Vec3(1, 1, 1) })
                            .start();
                    }
                    resolve();
                }
            };
            
            updateScore();
        });
    }
    
    /**
     * [의도] 별 애니메이션
     */
    private animateStars(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.starsContainer || !this.levelCompleteData) {
                resolve();
                return;
            }
            
            const starsToShow = this.levelCompleteData.stars;
            let animatedStars = 0;
            
            const animateNextStar = () => {
                if (animatedStars >= starsToShow) {
                    resolve();
                    return;
                }
                
                const starNode = this.starsContainer.children[animatedStars];
                if (starNode) {
                    starNode.active = true;
                    
                    // 탄성 애니메이션
                    tween(starNode)
                        .to(0.3, { scale: new Vec3(1.5, 1.5, 1) })
                        .to(0.2, { scale: new Vec3(1, 1, 1) })
                        .call(() => {
                            animatedStars++;
                            setTimeout(animateNextStar, 200);
                        })
                        .start();
                }
            };
            
            animateNextStar();
        });
    }
    
    /**
     * [의도] 보상 애니메이션
     */
    private animateRewards(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.rewardsContainer || !this.levelCompleteData?.rewards) {
                resolve();
                return;
            }
            
            const rewards = this.levelCompleteData.rewards;
            
            // 보상 정보 업데이트
            if (this.coinsRewardLabel) {
                this.coinsRewardLabel.string = `+${rewards.coins} 코인`;
            }
            
            if (this.gemsRewardLabel) {
                this.gemsRewardLabel.string = `+${rewards.gems} 젬`;
            }
            
            if (this.experienceRewardLabel) {
                this.experienceRewardLabel.string = `+${rewards.experience} EXP`;
            }
            
            // 컨테이너 표시
            this.rewardsContainer.active = true;
            
            tween(this.rewardsContainer)
                .to(0.5, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }
    
    /**
     * [의도] 버튼 애니메이션
     */
    private animateButtons(): Promise<void> {
        return new Promise((resolve) => {
            const buttons = [
                this.nextLevelButton?.node,
                this.retryButton?.node,
                this.worldMapButton?.node
            ].filter(button => button !== null);
            
            let animatedButtons = 0;
            
            const animateNextButton = () => {
                if (animatedButtons >= buttons.length) {
                    resolve();
                    return;
                }
                
                const button = buttons[animatedButtons];
                if (button) {
                    button.active = true;
                    
                    tween(button)
                        .to(0.2, { scale: new Vec3(1, 1, 1) })
                        .call(() => {
                            animatedButtons++;
                            setTimeout(animateNextButton, 100);
                        })
                        .start();
                }
            };
            
            // 다음 레벨 버튼 활성화 여부 확인
            this.updateNextLevelButton();
            
            animateNextButton();
        });
    }
    
    /**
     * [의도] 다음 레벨 버튼 상태 업데이트
     */
    private updateNextLevelButton(): void {
        if (!this.nextLevelButton || !this.levelCompleteData || !this.progressionManager) return;
        
        const nextLevelId = this.levelCompleteData.levelId + 1;
        const playerProgress = this.progressionManager.getPlayerProgress();
        const nextLevelProgress = playerProgress.levelProgress[nextLevelId];
        
        // 다음 레벨이 해제되었는지 확인
        const isNextLevelUnlocked = nextLevelProgress !== undefined || nextLevelId <= 45;
        
        this.nextLevelButton.interactable = isNextLevelUnlocked;
        
        if (!isNextLevelUnlocked) {
            // 버튼 텍스트 변경
            const buttonLabel = this.nextLevelButton.node.getChildByName('Label')?.getComponent(Label);
            if (buttonLabel) {
                buttonLabel.string = '모든 레벨 완료!';
            }
        }
    }
    
    /**
     * [의도] 축하 효과 표시
     */
    private showCelebrationEffects(): void {
        if (!this.celebrationEffects || !this.levelCompleteData) return;
        
        // 3성 달성 시에만 특별 효과
        if (this.levelCompleteData.stars >= 3) {
            this.celebrationEffects.active = true;
            
            // 파티클이나 특수 효과 애니메이션 (간단한 깜빡임으로 대체)
            let blinkCount = 0;
            const blinkInterval = setInterval(() => {
                this.celebrationEffects.active = !this.celebrationEffects.active;
                blinkCount++;
                
                if (blinkCount >= 10) {
                    clearInterval(blinkInterval);
                    this.celebrationEffects.active = false;
                }
            }, 300);
        }
    }
    
    // === 이벤트 핸들러들 ===
    
    /**
     * [의도] 다음 레벨 버튼 클릭 처리
     */
    private onNextLevelClicked(): void {
        if (!this.levelCompleteData || !this.animationComplete) return;
        
        const nextLevelId = this.levelCompleteData.levelId + 1;
        
        // 다음 레벨로 이동
        UIManager.getInstance().switchToScene(UIScene.LEVEL_SELECT, {
            worldId: this.levelCompleteData.worldId,
            selectedLevelId: nextLevelId
        }, TransitionType.SLIDE_LEFT);
    }
    
    /**
     * [의도] 재시도 버튼 클릭 처리
     */
    private onRetryClicked(): void {
        if (!this.levelCompleteData || !this.animationComplete) return;
        
        // 현재 레벨 재시도
        UIManager.getInstance().switchToScene(UIScene.GAME_PLAY, {
            levelId: this.levelCompleteData.levelId,
            worldId: this.levelCompleteData.worldId
        }, TransitionType.FADE);
    }
    
    /**
     * [의도] 월드맵 버튼 클릭 처리
     */
    private onWorldMapClicked(): void {
        if (!this.levelCompleteData || !this.animationComplete) return;
        
        // 월드맵으로 이동
        UIManager.getInstance().switchToScene(UIScene.WORLD_MAP, {
            currentWorldId: this.levelCompleteData.worldId
        }, TransitionType.SLIDE_DOWN);
    }
    
    /**
     * [의도] 씬 정리
     */
    protected cleanupScene(): void {
        // 실행 중인 애니메이션 정리
        if (this.starsContainer) {
            this.starsContainer.children.forEach(star => {
                tween(star).stop();
            });
        }
        
        // 기타 정리 작업
        this.animationComplete = false;
        this.levelCompleteData = null;
    }
}