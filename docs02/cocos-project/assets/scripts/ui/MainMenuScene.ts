/**
 * [의도] 메인 메뉴 씬 UI 관리
 * [책임] 게임 시작, 설정, 크레딧 등 메인 메뉴 기능 제공
 */

import { _decorator, Component, Node, Label, Button, Sprite } from 'cc';
import { BaseUIScene } from './BaseUIScene';
import { UIManager, UIScene, TransitionType } from './UIManager';
import { ProgressionManager } from '../progression/ProgressionManager';

const { ccclass, property } = _decorator;

@ccclass('MainMenuScene')
export class MainMenuScene extends BaseUIScene {
    
    // UI 컴포넌트들
    @property(Label)
    private gameTitle: Label = null!;
    
    @property(Button)
    private playButton: Button = null!;
    
    @property(Button)
    private continueButton: Button = null!;
    
    @property(Button)
    private settingsButton: Button = null!;
    
    @property(Button)
    private shopButton: Button = null!;
    
    @property(Button)
    private creditsButton: Button = null!;
    
    @property(Label)
    private playerLevelLabel: Label = null!;
    
    @property(Label)
    private welcomeBackLabel: Label = null!;
    
    @property(Node)
    private backgroundEffects: Node = null!;
    
    // 매니저 참조
    private progressionManager: ProgressionManager | null = null;
    
    /**
     * [의도] 메인 메뉴 씬 초기 설정
     */
    protected setupScene(): void {
        this.initializeManagers();
        this.setupTitle();
        this.updatePlayerInfo();
        this.updateContinueButton();
        this.startBackgroundEffects();
    }
    
    /**
     * [의도] 매니저 초기화
     */
    private initializeManagers(): void {
        this.progressionManager = ProgressionManager.getInstance();
        
        if (!this.progressionManager) {
            console.error('[MainMenuScene] ProgressionManager 인스턴스를 찾을 수 없습니다');
        }
    }
    
    /**
     * [의도] 게임 타이틀 설정
     */
    private setupTitle(): void {
        if (this.gameTitle) {
            this.gameTitle.string = 'Sweet Puzzle';
            
            // 타이틀 애니메이션 효과 (간단한 펄스)
            this.animateTitle();
        }
    }
    
    /**
     * [의도] 타이틀 애니메이션
     */
    private animateTitle(): void {
        if (!this.gameTitle) return;
        
        const originalScale = this.gameTitle.node.scale.clone();
        let isScaling = false;
        
        const pulseEffect = () => {
            if (!this.isActive || !this.gameTitle) return;
            
            if (!isScaling) {
                isScaling = true;
                // 크기 증가
                this.gameTitle.node.setScale(originalScale.x * 1.05, originalScale.y * 1.05, 1);
                
                setTimeout(() => {
                    if (this.gameTitle) {
                        // 원래 크기로 복귀
                        this.gameTitle.node.setScale(originalScale);
                        isScaling = false;
                    }
                }, 1000);
            }
            
            // 3초마다 반복
            setTimeout(pulseEffect, 3000);
        };
        
        pulseEffect();
    }
    
    /**
     * [의도] 플레이어 정보 업데이트
     */
    private updatePlayerInfo(): void {
        if (!this.progressionManager) return;
        
        const playerProgress = this.progressionManager.getPlayerProgress();
        
        // 플레이어 레벨 표시
        if (this.playerLevelLabel) {\n            this.playerLevelLabel.string = `레벨 ${playerProgress.level}`;\n        }\n        \n        // 웰컴백 메시지\n        if (this.welcomeBackLabel && playerProgress.level > 1) {\n            this.welcomeBackLabel.string = `어서 오세요, ${this.getPlayerTitle(playerProgress.level)}님!`;\n            this.welcomeBackLabel.node.active = true;\n        } else if (this.welcomeBackLabel) {\n            this.welcomeBackLabel.node.active = false;\n        }\n    }\n    \n    /**\n     * [의도] 플레이어 레벨에 따른 칭호 반환\n     */\n    private getPlayerTitle(level: number): string {\n        if (level >= 20) return '마스터';\n        if (level >= 15) return '전문가';\n        if (level >= 10) return '숙련자';\n        if (level >= 5) return '초보자';\n        return '새내기';\n    }\n    \n    /**\n     * [의도] 계속하기 버튼 상태 업데이트\n     */\n    private updateContinueButton(): void {\n        if (!this.continueButton || !this.progressionManager) return;\n        \n        const playerProgress = this.progressionManager.getPlayerProgress();\n        const hasProgress = Object.keys(playerProgress.levelProgress).length > 0;\n        \n        // 진행 상황이 있으면 계속하기 버튼 활성화\n        this.continueButton.node.active = hasProgress;\n        this.continueButton.interactable = hasProgress;\n        \n        if (hasProgress) {\n            // 마지막 플레이한 레벨 정보 표시\n            const lastLevel = this.getLastPlayedLevel(playerProgress);\n            const buttonLabel = this.continueButton.node.getChildByName('Label')?.getComponent(Label);\n            if (buttonLabel && lastLevel) {\n                buttonLabel.string = `계속하기 (레벨 ${lastLevel})`;\n            }\n        }\n    }\n    \n    /**\n     * [의도] 마지막 플레이한 레벨 찾기\n     */\n    private getLastPlayedLevel(playerProgress: any): number | null {\n        const levelIds = Object.keys(playerProgress.levelProgress)\n            .map(id => parseInt(id))\n            .sort((a, b) => b - a); // 내림차순 정렬\n        \n        // 완료되지 않은 가장 높은 레벨 또는 마지막 완료 레벨의 다음 레벨\n        for (const levelId of levelIds) {\n            const levelProgress = playerProgress.levelProgress[levelId];\n            if (!levelProgress.completed) {\n                return levelId;\n            }\n        }\n        \n        // 모든 레벨이 완료된 경우 다음 레벨\n        return levelIds.length > 0 ? levelIds[0] + 1 : 1;\n    }\n    \n    /**\n     * [의도] 배경 효과 시작\n     */\n    private startBackgroundEffects(): void {\n        if (!this.backgroundEffects) return;\n        \n        // 간단한 배경 애니메이션 효과\n        let rotation = 0;\n        const rotateBackground = () => {\n            if (!this.isActive || !this.backgroundEffects) return;\n            \n            rotation += 0.5;\n            this.backgroundEffects.setRotationFromEuler(0, 0, rotation);\n            \n            requestAnimationFrame(rotateBackground);\n        };\n        \n        rotateBackground();\n    }\n    \n    /**\n     * [의도] 이벤트 바인딩\n     */\n    protected bindEvents(): void {\n        if (this.playButton) {\n            this.playButton.node.on(Button.EventType.CLICK, this.onPlayClicked, this);\n        }\n        \n        if (this.continueButton) {\n            this.continueButton.node.on(Button.EventType.CLICK, this.onContinueClicked, this);\n        }\n        \n        if (this.settingsButton) {\n            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsClicked, this);\n        }\n        \n        if (this.shopButton) {\n            this.shopButton.node.on(Button.EventType.CLICK, this.onShopClicked, this);\n        }\n        \n        if (this.creditsButton) {\n            this.creditsButton.node.on(Button.EventType.CLICK, this.onCreditsClicked, this);\n        }\n    }\n    \n    /**\n     * [의도] 이벤트 언바인딩\n     */\n    protected unbindEvents(): void {\n        if (this.playButton) {\n            this.playButton.node.off(Button.EventType.CLICK, this.onPlayClicked, this);\n        }\n        \n        if (this.continueButton) {\n            this.continueButton.node.off(Button.EventType.CLICK, this.onContinueClicked, this);\n        }\n        \n        if (this.settingsButton) {\n            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsClicked, this);\n        }\n        \n        if (this.shopButton) {\n            this.shopButton.node.off(Button.EventType.CLICK, this.onShopClicked, this);\n        }\n        \n        if (this.creditsButton) {\n            this.creditsButton.node.off(Button.EventType.CLICK, this.onCreditsClicked, this);\n        }\n    }\n    \n    /**\n     * [의도] 데이터 업데이트 처리\n     */\n    protected handleDataUpdate(): void {\n        this.updatePlayerInfo();\n        this.updateContinueButton();\n    }\n    \n    // === 이벤트 핸들러들 ===\n    \n    /**\n     * [의도] 새 게임 시작 버튼 클릭\n     */\n    private onPlayClicked(): void {\n        UIManager.getInstance().switchToScene(\n            UIScene.WORLD_MAP, \n            { currentWorldId: 1 },\n            TransitionType.FADE\n        );\n    }\n    \n    /**\n     * [의도] 계속하기 버튼 클릭\n     */\n    private onContinueClicked(): void {\n        if (!this.progressionManager) return;\n        \n        const playerProgress = this.progressionManager.getPlayerProgress();\n        const lastLevel = this.getLastPlayedLevel(playerProgress);\n        \n        if (lastLevel) {\n            // 해당 레벨의 월드 찾기\n            const worldId = this.getWorldIdForLevel(lastLevel);\n            \n            UIManager.getInstance().switchToScene(\n                UIScene.LEVEL_SELECT,\n                { \n                    worldId: worldId,\n                    selectedLevelId: lastLevel \n                },\n                TransitionType.SLIDE_LEFT\n            );\n        } else {\n            // 진행 상황이 없으면 첫 번째 월드로\n            this.onPlayClicked();\n        }\n    }\n    \n    /**\n     * [의도] 레벨에 해당하는 월드 ID 반환\n     */\n    private getWorldIdForLevel(levelId: number): number {\n        if (levelId <= 20) return 1;  // 월드 1: 레벨 1-20\n        if (levelId <= 45) return 2;  // 월드 2: 레벨 21-45\n        return 1; // 기본값\n    }\n    \n    /**\n     * [의도] 설정 버튼 클릭\n     */\n    private onSettingsClicked(): void {\n        UIManager.getInstance().switchToScene(\n            UIScene.SETTINGS,\n            null,\n            TransitionType.SLIDE_UP\n        );\n    }\n    \n    /**\n     * [의도] 상점 버튼 클릭\n     */\n    private onShopClicked(): void {\n        UIManager.getInstance().switchToScene(\n            UIScene.SHOP,\n            null,\n            TransitionType.SCALE\n        );\n    }\n    \n    /**\n     * [의도] 크레딧 버튼 클릭\n     */\n    private onCreditsClicked(): void {\n        // 크레딧 정보를 모달로 표시\n        const creditsInfo = {\n            title: 'Sweet Puzzle',\n            version: '1.0.0',\n            developer: 'Sweet Games Studio',\n            credits: [\n                '기획: 게임 기획자',\n                '개발: TypeScript/Cocos Creator',\n                '디자인: UI/UX 디자이너',\n                '음악: 사운드 디자이너'\n            ]\n        };\n        \n        console.log('[MainMenuScene] 크레딧 정보:', creditsInfo);\n        \n        // 실제 구현에서는 크레딧 모달 씬을 만들어서 표시\n        // UIManager.getInstance().showModal(UIScene.CREDITS, creditsInfo);\n    }\n    \n    /**\n     * [의도] 씬 정리\n     */\n    protected cleanupScene(): void {\n        // 배경 애니메이션 정리는 isActive 체크로 자동 처리됨\n    }\n}