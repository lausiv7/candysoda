/**
 * [의도] 일시정지 및 옵션 모달 씬 UI 관리
 * [책임] 게임 일시정지, 설정 옵션, 게임 종료/재시작 기능
 */

import { _decorator, Component, Node, Label, Button, Slider } from 'cc';
import { BaseUIScene } from './BaseUIScene';
import { UIManager, UIScene } from './UIManager';

const { ccclass, property } = _decorator;

export interface PauseSceneData {
    type: 'pause' | 'retry' | 'gameover';
    currentScore?: number;
    remainingMoves?: number;
    levelId?: number;
}

@ccclass('PauseScene')
export class PauseScene extends BaseUIScene {
    
    // UI 컴포넌트들
    @property(Label)
    private titleLabel: Label = null!;
    
    @property(Label)
    private statusLabel: Label = null!;
    
    @property(Button)
    private resumeButton: Button = null!;
    
    @property(Button)
    private retryButton: Button = null!;
    
    @property(Button)
    private settingsButton: Button = null!;
    
    @property(Button)
    private exitButton: Button = null!;
    
    @property(Node)
    private settingsPanel: Node = null!;
    
    @property(Slider)
    private musicVolumeSlider: Slider = null!;
    
    @property(Slider)
    private sfxVolumeSlider: Slider = null!;
    
    @property(Button)
    private settingsCloseButton: Button = null!;
    
    // 상태 관리
    private pauseData: PauseSceneData | null = null;
    
    /**
     * [의도] 일시정지 씬 초기 설정
     */
    protected setupScene(): void {
        this.setupSettingsPanel();
        this.updateUI();
    }
    
    /**
     * [의도] 설정 패널 초기화
     */
    private setupSettingsPanel(): void {
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
        
        // 볼륨 슬라이더 초기값 설정
        if (this.musicVolumeSlider) {
            this.musicVolumeSlider.progress = 0.8; // 기본 80%
        }
        
        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.progress = 0.9; // 기본 90%
        }
    }
    
    /**
     * [의도] UI 업데이트
     */
    private updateUI(): void {
        if (!this.pauseData) return;
        
        // 타입에 따른 제목 설정
        if (this.titleLabel) {
            const titles = {
                'pause': '일시정지',
                'retry': '재시도',
                'gameover': '게임오버'
            };
            this.titleLabel.string = titles[this.pauseData.type] || '일시정지';
        }
        
        // 상태 정보 표시
        if (this.statusLabel && this.pauseData.currentScore !== undefined) {
            const statusTexts = [];
            
            if (this.pauseData.currentScore !== undefined) {
                statusTexts.push(`현재 점수: ${this.pauseData.currentScore.toLocaleString()}`);
            }
            
            if (this.pauseData.remainingMoves !== undefined) {
                statusTexts.push(`남은 이동: ${this.pauseData.remainingMoves}`);
            }
            
            this.statusLabel.string = statusTexts.join('\n');
        }
        
        // 버튼 표시/숨김
        this.updateButtonVisibility();
    }
    
    /**
     * [의도] 버튼 표시 상태 업데이트
     */
    private updateButtonVisibility(): void {
        if (!this.pauseData) return;
        
        // 재시작 버튼은 일시정지에서만 표시
        if (this.resumeButton) {
            this.resumeButton.node.active = this.pauseData.type === 'pause';
        }
        
        // 재시도 버튼은 항상 표시
        if (this.retryButton) {
            this.retryButton.node.active = true;
        }
        
        // 설정 버튼은 항상 표시
        if (this.settingsButton) {
            this.settingsButton.node.active = true;
        }
        
        // 나가기 버튼은 항상 표시
        if (this.exitButton) {
            this.exitButton.node.active = true;
        }
    }
    
    /**
     * [의도] 이벤트 바인딩
     */
    protected bindEvents(): void {
        if (this.resumeButton) {
            this.resumeButton.node.on(Button.EventType.CLICK, this.onResumeClicked, this);
        }
        
        if (this.retryButton) {
            this.retryButton.node.on(Button.EventType.CLICK, this.onRetryClicked, this);
        }
        
        if (this.settingsButton) {
            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        
        if (this.exitButton) {
            this.exitButton.node.on(Button.EventType.CLICK, this.onExitClicked, this);
        }
        
        if (this.settingsCloseButton) {
            this.settingsCloseButton.node.on(Button.EventType.CLICK, this.onSettingsCloseClicked, this);
        }
        
        // 볼륨 슬라이더 이벤트
        if (this.musicVolumeSlider) {
            this.musicVolumeSlider.node.on('slide', this.onMusicVolumeChanged, this);
        }
        
        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.node.on('slide', this.onSfxVolumeChanged, this);
        }
    }
    
    /**
     * [의도] 이벤트 언바인딩
     */
    protected unbindEvents(): void {
        if (this.resumeButton) {
            this.resumeButton.node.off(Button.EventType.CLICK, this.onResumeClicked, this);
        }
        
        if (this.retryButton) {
            this.retryButton.node.off(Button.EventType.CLICK, this.onRetryClicked, this);
        }
        
        if (this.settingsButton) {
            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        
        if (this.exitButton) {
            this.exitButton.node.off(Button.EventType.CLICK, this.onExitClicked, this);
        }
        
        if (this.settingsCloseButton) {
            this.settingsCloseButton.node.off(Button.EventType.CLICK, this.onSettingsCloseClicked, this);
        }
        
        if (this.musicVolumeSlider) {
            this.musicVolumeSlider.node.off('slide', this.onMusicVolumeChanged, this);
        }
        
        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.node.off('slide', this.onSfxVolumeChanged, this);
        }
    }
    
    /**
     * [의도] 데이터 업데이트 처리
     */
    protected handleDataUpdate(): void {
        if (this.sceneData) {
            this.pauseData = this.sceneData as PauseSceneData;
            this.updateUI();
        }
    }
    
    // === 이벤트 핸들러들 ===
    
    /**
     * [의도] 게임 재시작 버튼 클릭
     */
    private onResumeClicked(): void {
        UIManager.getInstance().closeModal();
    }
    
    /**
     * [의도] 재시도 버튼 클릭
     */
    private onRetryClicked(): void {
        if (!this.pauseData?.levelId) return;
        
        UIManager.getInstance().closeModal();
        
        // 레벨 재시작
        setTimeout(() => {
            UIManager.getInstance().switchToScene(UIScene.GAME_PLAY, {
                levelId: this.pauseData!.levelId
            });
        }, 300);
    }
    
    /**
     * [의도] 설정 버튼 클릭
     */
    private onSettingsClicked(): void {
        if (this.settingsPanel) {
            this.settingsPanel.active = true;
        }
    }
    
    /**
     * [의도] 설정 패널 닫기 버튼 클릭
     */
    private onSettingsCloseClicked(): void {
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
    }
    
    /**
     * [의도] 나가기 버튼 클릭
     */
    private onExitClicked(): void {
        UIManager.getInstance().closeModal();
        
        // 월드맵으로 이동
        setTimeout(() => {
            UIManager.getInstance().switchToScene(UIScene.WORLD_MAP);
        }, 300);
    }
    
    /**
     * [의도] 음악 볼륨 변경
     */
    private onMusicVolumeChanged(): void {
        if (!this.musicVolumeSlider) return;
        
        const volume = this.musicVolumeSlider.progress;
        console.log(`[PauseScene] 음악 볼륨 변경: ${Math.round(volume * 100)}%`);
        
        // 실제 오디오 시스템에 볼륨 적용 (추후 구현)
        // AudioManager.getInstance().setMusicVolume(volume);
    }
    
    /**
     * [의도] 효과음 볼륨 변경
     */
    private onSfxVolumeChanged(): void {
        if (!this.sfxVolumeSlider) return;
        
        const volume = this.sfxVolumeSlider.progress;
        console.log(`[PauseScene] 효과음 볼륨 변경: ${Math.round(volume * 100)}%`);
        
        // 실제 오디오 시스템에 볼륨 적용 (추후 구현)
        // AudioManager.getInstance().setSfxVolume(volume);
    }
}