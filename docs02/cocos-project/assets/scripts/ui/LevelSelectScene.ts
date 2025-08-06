/**
 * [의도] 레벨 선택 씬 UI 관리
 * [책임] 월드별 레벨 목록 표시, 잠금/해제 상태 관리, 레벨 상세 정보 표시
 */

import { _decorator, Component, Node, Label, Button, ScrollView, Sprite, Layout } from 'cc';
import { BaseUIScene } from './BaseUIScene';
import { LevelManager, LevelConfig } from '../progression/LevelManager';
import { ProgressionManager } from '../progression/ProgressionManager';
import { WorldManager } from '../progression/WorldManager';
import { UIManager, UIScene } from './UIManager';

const { ccclass, property } = _decorator;

export interface LevelSelectData {
    worldId: number;
}

@ccclass('LevelSelectScene')
export class LevelSelectScene extends BaseUIScene {
    
    // UI 컴포넌트들
    @property(Label)
    private worldTitleLabel: Label = null!;
    
    @property(Label)
    private worldDescriptionLabel: Label = null!;
    
    @property(ScrollView)
    private levelScrollView: ScrollView = null!;
    
    @property(Node)
    private levelContainer: Node = null!;
    
    @property(Button)
    private backButton: Button = null!;
    
    @property(Node)
    private levelInfoPanel: Node = null!;
    
    @property(Label)
    private levelInfoTitle: Label = null!;
    
    @property(Label)
    private levelInfoDescription: Label = null!;
    
    @property(Label)
    private levelInfoObjective: Label = null!;
    
    @property(Button)
    private playLevelButton: Button = null!;
    
    // 레벨 노드 프리팹
    @property(Node)
    private levelNodePrefab: Node = null!;
    
    // 상태 관리
    private currentWorldId: number = 1;
    private selectedLevelId: number | null = null;
    private levelNodes: Map<number, Node> = new Map();
    
    // 매니저 참조
    private levelManager: LevelManager | null = null;
    private progressionManager: ProgressionManager | null = null;
    private worldManager: WorldManager | null = null;
    
    /**
     * [의도] 레벨 선택 씬 초기 설정
     */
    protected setupScene(): void {
        this.initializeManagers();
        this.setupLevelInfoPanel();
        this.updateWorldInfo();
        this.createLevelNodes();
        this.setupScrollView();
    }
    
    /**
     * [의도] 매니저 초기화
     */
    private initializeManagers(): void {
        this.levelManager = LevelManager.getInstance();
        this.progressionManager = ProgressionManager.getInstance();
        this.worldManager = WorldManager.getInstance();
        
        if (!this.levelManager) {
            console.error('[LevelSelectScene] LevelManager 인스턴스를 찾을 수 없습니다');
        }
        
        if (!this.progressionManager) {
            console.error('[LevelSelectScene] ProgressionManager 인스턴스를 찾을 수 없습니다');
        }
        
        if (!this.worldManager) {
            console.error('[LevelSelectScene] WorldManager 인스턴스를 찾을 수 없습니다');
        }
    }
    
    /**
     * [의도] 레벨 정보 패널 초기 설정
     */
    private setupLevelInfoPanel(): void {
        if (this.levelInfoPanel) {
            this.levelInfoPanel.active = false;
        }
    }
    
    /**
     * [의도] 월드 정보 업데이트
     */
    private updateWorldInfo(): void {
        if (!this.worldManager) return;
        
        const worldInfo = this.worldManager.getWorldInfo(this.currentWorldId);
        
        // 월드 제목
        if (this.worldTitleLabel) {
            this.worldTitleLabel.string = worldInfo.name;
        }
        
        // 월드 설명
        if (this.worldDescriptionLabel) {
            this.worldDescriptionLabel.string = worldInfo.description;
        }
    }
    
    /**
     * [의도] 레벨 노드들 생성
     */
    private createLevelNodes(): void {
        if (!this.levelManager || !this.worldManager || !this.levelContainer) return;
        
        // 기존 노드들 정리
        this.clearLevelNodes();
        
        const worldInfo = this.worldManager.getWorldInfo(this.currentWorldId);
        
        // 그리드 레이아웃 설정
        const layout = this.levelContainer.getComponent(Layout) || this.levelContainer.addComponent(Layout);
        layout.type = Layout.Type.GRID;
        layout.resizeMode = Layout.ResizeMode.CONTAINER;
        layout.constraint = Layout.Constraint.FIXED_COL;
        layout.constraintNum = 5; // 5열 그리드
        layout.spacingX = 20;
        layout.spacingY = 20;
        
        // 레벨 노드 생성
        for (const levelId of worldInfo.levels) {
            const levelConfig = this.levelManager.getLevelConfig(levelId);
            if (levelConfig) {
                const levelNode = this.createLevelNode(levelConfig);
                this.levelContainer.addChild(levelNode);
                this.levelNodes.set(levelId, levelNode);
            }
        }
        
        console.log(`[LevelSelectScene] 월드 ${this.currentWorldId}의 ${worldInfo.levels.length}개 레벨 노드 생성 완료`);
    }
    
    /**
     * [의도] 개별 레벨 노드 생성
     */
    private createLevelNode(levelConfig: LevelConfig): Node {
        const levelNode = new Node(`Level_${levelConfig.id}`);
        
        // 레벨 상태 확인
        const isUnlocked = this.isLevelUnlocked(levelConfig.id);
        const levelProgress = this.getLevelProgress(levelConfig.id);
        
        // 배경 스프라이트
        const backgroundSprite = levelNode.addComponent(Sprite);
        this.setupLevelBackground(backgroundSprite, levelConfig, isUnlocked, levelProgress);
        
        // 레벨 번호
        const numberNode = new Node('LevelNumber');
        const numberLabel = numberNode.addComponent(Label);
        numberLabel.string = levelConfig.id.toString();
        numberLabel.fontSize = 18;
        levelNode.addChild(numberNode);
        
        // 별 표시 (완료된 레벨만)
        if (levelProgress && levelProgress.completed) {
            const starsNode = new Node('Stars');
            const starsLabel = starsNode.addComponent(Label);
            starsLabel.string = '⭐'.repeat(levelProgress.starsEarned);
            starsLabel.fontSize = 12;
            levelNode.addChild(starsNode);
            starsNode.setPosition(0, -25, 0);
        }
        
        // 레벨 타입 표시
        const typeNode = new Node('LevelType');
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = this.getLevelTypeIcon(levelConfig.type);
        typeLabel.fontSize = 16;
        levelNode.addChild(typeNode);
        typeNode.setPosition(20, 20, 0);
        
        // 잠금 표시 (잠긴 레벨용)
        if (!isUnlocked) {
            const lockNode = new Node('Lock');
            const lockLabel = lockNode.addComponent(Label);
            lockLabel.string = '🔒';
            lockLabel.fontSize = 24;
            levelNode.addChild(lockNode);
        }
        
        // 클릭 이벤트
        const button = levelNode.addComponent(Button);
        button.node.on(Button.EventType.CLICK, () => {
            this.onLevelClicked(levelConfig.id);
        });
        
        // 노드 크기 설정
        levelNode.setContentSize(80, 80);
        
        return levelNode;
    }
    
    /**
     * [의도] 레벨 배경 설정
     */
    private setupLevelBackground(
        sprite: Sprite, 
        levelConfig: LevelConfig, 
        isUnlocked: boolean, 
        levelProgress: any
    ): void {
        let color = { r: 200, g: 200, b: 200 }; // 기본 회색
        
        if (!isUnlocked) {
            // 잠긴 레벨 - 어둡게
            color = { r: 100, g: 100, b: 100 };
        } else if (levelProgress?.completed) {
            // 완료된 레벨 - 별 개수에 따른 색상
            const colors = [
                { r: 255, g: 215, b: 0 },   // 1성 - 금색
                { r: 255, g: 165, b: 0 },   // 2성 - 주황색
                { r: 255, g: 105, b: 180 }  // 3성 - 핑크색
            ];
            color = colors[Math.min(levelProgress.starsEarned - 1, 2)] || colors[0];
        } else {
            // 해제됐지만 미완료 - 파란색
            color = { r: 135, g: 206, b: 250 };
        }
        
        sprite.color.set(color.r, color.g, color.b, 255);
    }
    
    /**
     * [의도] 레벨 타입별 아이콘 반환
     */
    private getLevelTypeIcon(levelType: string): string {
        const icons = {
            'score': '🎯',      // 점수 달성
            'collect': '🍎',    // 수집
            'obstacle': '🚧',   // 장애물
            'time': '⏰',       // 시간 제한
            'boss': '👑'        // 보스
        };
        return icons[levelType as keyof typeof icons] || '🎯';
    }
    
    /**
     * [의도] 스크롤뷰 설정
     */
    private setupScrollView(): void {
        if (!this.levelScrollView) return;
        
        // 수직 스크롤 설정
        this.levelScrollView.vertical = true;
        this.levelScrollView.horizontal = false;
    }
    
    /**
     * [의도] 레벨 노드들 정리
     */
    private clearLevelNodes(): void {
        this.levelNodes.forEach(node => {
            if (node && node.isValid) {
                node.destroy();
            }
        });
        this.levelNodes.clear();
        
        if (this.levelContainer) {
            this.levelContainer.removeAllChildren();
        }
    }
    
    /**
     * [의도] 이벤트 바인딩
     */
    protected bindEvents(): void {
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackClicked, this);
        }
        
        if (this.playLevelButton) {
            this.playLevelButton.node.on(Button.EventType.CLICK, this.onPlayLevelClicked, this);
        }
    }
    
    /**
     * [의도] 이벤트 언바인딩
     */
    protected unbindEvents(): void {
        if (this.backButton) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackClicked, this);
        }
        
        if (this.playLevelButton) {
            this.playLevelButton.node.off(Button.EventType.CLICK, this.onPlayLevelClicked, this);
        }
        
        // 레벨 노드 이벤트 정리
        this.levelNodes.forEach(node => {
            const button = node.getComponent(Button);
            if (button) {
                button.node.off(Button.EventType.CLICK);
            }
        });
    }
    
    /**
     * [의도] 데이터 업데이트 처리
     */
    protected handleDataUpdate(): void {
        const sceneData = this.sceneData as LevelSelectData;
        if (sceneData?.worldId !== this.currentWorldId) {
            this.currentWorldId = sceneData?.worldId || 1;
            this.updateWorldInfo();
            this.createLevelNodes();
        }
    }
    
    /**
     * [의도] 레벨 정보 패널 표시
     */
    private showLevelInfo(levelId: number): void {
        if (!this.levelManager || !this.levelInfoPanel) return;
        
        const levelConfig = this.levelManager.getLevelConfig(levelId);
        if (!levelConfig) return;
        
        // 레벨 정보 업데이트
        if (this.levelInfoTitle) {
            this.levelInfoTitle.string = `레벨 ${levelId}`;
        }
        
        if (this.levelInfoDescription) {
            this.levelInfoDescription.string = levelConfig.description || '달콤한 캔디를 매칭하여 목표를 달성하세요!';
        }
        
        if (this.levelInfoObjective) {
            const objective = this.getLevelObjectiveText(levelConfig);
            this.levelInfoObjective.string = objective;
        }
        
        // 플레이 버튼 활성화/비활성화
        if (this.playLevelButton) {
            const isUnlocked = this.isLevelUnlocked(levelId);
            this.playLevelButton.interactable = isUnlocked;
        }
        
        // 패널 표시
        this.levelInfoPanel.active = true;
        this.selectedLevelId = levelId;
    }
    
    /**
     * [의도] 레벨 정보 패널 숨기기
     */
    private hideLevelInfo(): void {
        if (this.levelInfoPanel) {
            this.levelInfoPanel.active = false;
        }
        this.selectedLevelId = null;
    }
    
    /**
     * [의도] 레벨 목표 텍스트 생성
     */
    private getLevelObjectiveText(levelConfig: LevelConfig): string {
        const objectives = [];
        
        if (levelConfig.targetScore > 0) {
            objectives.push(`점수: ${levelConfig.targetScore.toLocaleString()}`);
        }
        
        if (levelConfig.maxMoves > 0) {
            objectives.push(`최대 이동: ${levelConfig.maxMoves}`);
        }
        
        if (levelConfig.timeLimit > 0) {
            objectives.push(`시간 제한: ${levelConfig.timeLimit}초`);
        }
        
        // 레벨 타입별 추가 목표
        switch (levelConfig.type) {
            case 'collect':
                objectives.push('특정 블록 수집');
                break;
            case 'obstacle':
                objectives.push('장애물 제거');
                break;
            case 'boss':
                objectives.push('보스 클리어');
                break;
        }
        
        return objectives.join('\\n');
    }
    
    // === 헬퍼 메서드들 ===
    
    /**
     * [의도] 레벨 잠금 해제 상태 확인
     */
    private isLevelUnlocked(levelId: number): boolean {
        if (!this.progressionManager) return false;
        
        const playerProgress = this.progressionManager.getPlayerProgress();
        
        // 레벨 1은 항상 해제
        if (levelId === 1) return true;
        
        // 이전 레벨이 완료되었는지 확인
        const previousLevelProgress = playerProgress.levelProgress[levelId - 1];
        return previousLevelProgress?.completed || false;
    }
    
    /**
     * [의도] 레벨 진행 상황 가져오기
     */
    private getLevelProgress(levelId: number): any {
        if (!this.progressionManager) return null;
        
        const playerProgress = this.progressionManager.getPlayerProgress();
        return playerProgress.levelProgress[levelId] || null;
    }
    
    // === 이벤트 핸들러들 ===
    
    /**
     * [의도] 레벨 클릭 처리
     */
    private onLevelClicked(levelId: number): void {
        if (!this.isLevelUnlocked(levelId)) {
            console.log(`[LevelSelectScene] 레벨 ${levelId}는 아직 잠겨있습니다`);
            return;
        }
        
        this.showLevelInfo(levelId);
    }
    
    /**
     * [의도] 레벨 플레이 버튼 클릭 처리
     */
    private onPlayLevelClicked(): void {
        if (!this.selectedLevelId || !this.levelManager) return;
        
        const levelConfig = this.levelManager.getLevelConfig(this.selectedLevelId);
        if (!levelConfig) return;
        
        // 게임플레이 씬으로 전환
        UIManager.getInstance().switchToScene(UIScene.GAME_PLAY, {
            levelId: this.selectedLevelId,
            worldId: this.currentWorldId,
            targetScore: levelConfig.targetScore,
            maxMoves: levelConfig.maxMoves,
            levelType: levelConfig.type
        });
    }
    
    /**
     * [의도] 뒤로가기 버튼 클릭 처리
     */
    private onBackClicked(): void {
        UIManager.getInstance().switchToScene(UIScene.WORLD_MAP, {
            currentWorldId: this.currentWorldId
        });
    }
    
    /**
     * [의도] 씬 정리
     */
    protected cleanupScene(): void {
        this.clearLevelNodes();
        this.hideLevelInfo();
    }
}