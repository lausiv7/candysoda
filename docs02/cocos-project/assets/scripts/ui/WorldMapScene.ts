/**
 * [의도] 월드맵 씬 UI 관리
 * [책임] 월드 선택, 진행도 표시, 월드별 테마 적용
 */

import { _decorator, Component, Node, Label, Button, ScrollView, Sprite, ProgressBar } from 'cc';
import { BaseUIScene } from './BaseUIScene';
import { WorldManager, WorldInfo, WorldTheme } from '../progression/WorldManager';
import { ProgressionManager } from '../progression/ProgressionManager';
import { UIManager, UIScene } from './UIManager';

const { ccclass, property } = _decorator;

export interface WorldMapData {
    currentWorldId: number;
    unlockedWorlds: number[];
    playerLevel: number;
}

@ccclass('WorldMapScene')
export class WorldMapScene extends BaseUIScene {
    
    // UI 컴포넌트들
    @property(ScrollView)
    private worldScrollView: ScrollView = null!;
    
    @property(Node)
    private worldContainer: Node = null!;
    
    @property(Label)
    private playerLevelLabel: Label = null!;
    
    @property(Label)
    private totalStarsLabel: Label = null!;
    
    @property(ProgressBar)
    private overallProgressBar: ProgressBar = null!;
    
    @property(Button)
    private settingsButton: Button = null!;
    
    @property(Button)
    private shopButton: Button = null!;
    
    @property(Button)
    private backButton: Button = null!;
    
    // 월드 노드 프리팹 (동적 생성용)
    @property(Node)
    private worldNodePrefab: Node = null!;
    
    // 매니저 참조
    private worldManager: WorldManager | null = null;
    private progressionManager: ProgressionManager | null = null;
    
    // 월드 노드들
    private worldNodes: Map<number, Node> = new Map();
    
    /**
     * [의도] 월드맵 씬 초기 설정
     */
    protected setupScene(): void {
        this.initializeManagers();
        this.createWorldNodes();
        this.updatePlayerInfo();
        this.setupScrollView();
    }
    
    /**
     * [의도] 매니저 초기화
     */
    private initializeManagers(): void {
        this.worldManager = WorldManager.getInstance();
        this.progressionManager = ProgressionManager.getInstance();
        
        if (!this.worldManager) {
            console.error('[WorldMapScene] WorldManager 인스턴스를 찾을 수 없습니다');
        }
        
        if (!this.progressionManager) {
            console.error('[WorldMapScene] ProgressionManager 인스턴스를 찾을 수 없습니다');
        }
    }
    
    /**
     * [의도] 월드 노드들 생성
     */
    private createWorldNodes(): void {
        if (!this.worldManager || !this.worldContainer) return;
        
        const worldCount = 5; // 총 5개 월드
        
        for (let worldId = 1; worldId <= worldCount; worldId++) {
            const worldNode = this.createWorldNode(worldId);
            this.worldContainer.addChild(worldNode);
            this.worldNodes.set(worldId, worldNode);
        }
        
        console.log(`[WorldMapScene] ${worldCount}개 월드 노드 생성 완료`);
    }
    
    /**
     * [의도] 개별 월드 노드 생성
     */
    private createWorldNode(worldId: number): Node {
        const worldNode = new Node(`World_${worldId}`);
        
        // 월드 정보 가져오기
        const worldInfo = this.worldManager!.getWorldInfo(worldId);
        const isUnlocked = this.isWorldUnlocked(worldId);
        const progress = this.getWorldProgress(worldId);
        
        // 월드 배경 설정
        const backgroundSprite = worldNode.addComponent(Sprite);
        this.setupWorldBackground(backgroundSprite, worldInfo.theme);
        
        // 월드 제목
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = worldInfo.name;
        titleLabel.fontSize = 24;
        worldNode.addChild(titleNode);
        titleNode.setPosition(0, 80, 0);
        
        // 진행도 표시
        const progressNode = new Node('Progress');
        const progressBar = progressNode.addComponent(ProgressBar);
        progressBar.progress = progress;
        worldNode.addChild(progressNode);
        progressNode.setPosition(0, -80, 0);
        
        // 진행도 텍스트
        const progressTextNode = new Node('ProgressText');
        const progressLabel = progressTextNode.addComponent(Label);
        progressLabel.string = `${Math.round(progress * 100)}%`;
        progressLabel.fontSize = 16;
        worldNode.addChild(progressTextNode);
        progressTextNode.setPosition(0, -110, 0);
        
        // 별 개수 표시
        const starsNode = new Node('Stars');
        const starsLabel = starsNode.addComponent(Label);
        const earnedStars = this.getWorldStars(worldId);
        const totalStars = worldInfo.levels.length * 3; // 레벨당 최대 3개 별
        starsLabel.string = `⭐ ${earnedStars}/${totalStars}`;
        starsLabel.fontSize = 18;
        worldNode.addChild(starsNode);
        starsNode.setPosition(0, 50, 0);
        
        // 클릭 이벤트
        const button = worldNode.addComponent(Button);
        button.node.on(Button.EventType.CLICK, () => {
            this.onWorldClicked(worldId);
        });
        
        // 잠금 상태 설정
        worldNode.active = isUnlocked;
        
        // 잠김 표시 (잠긴 월드용)
        if (!isUnlocked) {
            const lockNode = new Node('Lock');
            const lockLabel = lockNode.addComponent(Label);
            lockLabel.string = '🔒';
            lockLabel.fontSize = 48;
            worldNode.addChild(lockNode);
            
            // 해제 조건 표시
            const conditionNode = new Node('UnlockCondition');
            const conditionLabel = conditionNode.addComponent(Label);
            const requiredStars = this.getUnlockRequiredStars(worldId);
            conditionLabel.string = `별 ${requiredStars}개 필요`;
            conditionLabel.fontSize = 14;
            worldNode.addChild(conditionNode);
            conditionNode.setPosition(0, -140, 0);
        }
        
        // 월드별 위치 설정 (스크롤뷰용)
        const spacing = 300;
        worldNode.setPosition((worldId - 1) * spacing, 0, 0);
        
        return worldNode;
    }
    
    /**
     * [의도] 월드 배경 테마 설정
     */
    private setupWorldBackground(sprite: Sprite, theme: WorldTheme): void {
        // 테마별 색상 설정 (실제 구현에서는 이미지 리소스 사용)
        const colors = {
            [WorldTheme.SWEET_FARM]: { r: 144, g: 238, b: 144 },      // 연두색
            [WorldTheme.CHOCOLATE_FACTORY]: { r: 139, g: 69, b: 19 }, // 갈색
            [WorldTheme.ICE_CREAM_PARLOR]: { r: 173, g: 216, b: 230 }, // 하늘색
            [WorldTheme.CANDY_CASTLE]: { r: 221, g: 160, b: 221 },     // 연보라
            [WorldTheme.MAGICAL_FOREST]: { r: 34, g: 139, b: 34 }      // 숲 녹색
        };
        
        const color = colors[theme] || { r: 200, g: 200, b: 200 };
        sprite.color.set(color.r, color.g, color.b, 255);
    }
    
    /**
     * [의도] 스크롤뷰 설정
     */
    private setupScrollView(): void {
        if (!this.worldScrollView) return;
        
        // 수평 스크롤 설정
        this.worldScrollView.horizontal = true;
        this.worldScrollView.vertical = false;
        
        // 현재 월드로 스크롤 위치 설정
        const sceneData = this.sceneData as WorldMapData;
        if (sceneData?.currentWorldId) {
            this.scrollToWorld(sceneData.currentWorldId);
        }
    }
    
    /**
     * [의도] 특정 월드로 스크롤
     */
    private scrollToWorld(worldId: number): void {
        if (!this.worldScrollView) return;
        
        // 월드 위치 계산 및 스크롤
        const worldIndex = worldId - 1;
        const normalizedPosition = worldIndex / Math.max(4, 1); // 5개 월드 중 위치
        
        this.worldScrollView.scrollToOffset({ x: normalizedPosition, y: 0 }, 0.5);
    }
    
    /**
     * [의도] 플레이어 정보 업데이트
     */
    private updatePlayerInfo(): void {
        if (!this.progressionManager) return;
        
        const playerProgress = this.progressionManager.getPlayerProgress();
        
        // 플레이어 레벨
        if (this.playerLevelLabel) {
            this.playerLevelLabel.string = `레벨 ${playerProgress.level}`;
        }
        
        // 총 별 개수
        if (this.totalStarsLabel) {
            const totalStars = playerProgress.totalStarsEarned;
            this.totalStarsLabel.string = `⭐ ${totalStars}`;
        }
        
        // 전체 진행도
        if (this.overallProgressBar) {
            const completedLevels = Object.values(playerProgress.levelProgress)
                .filter(level => level.completed).length;
            const totalLevels = 45; // 전체 레벨 수
            this.overallProgressBar.progress = completedLevels / totalLevels;
        }
    }
    
    /**
     * [의도] 이벤트 바인딩
     */
    protected bindEvents(): void {
        if (this.settingsButton) {
            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        
        if (this.shopButton) {
            this.shopButton.node.on(Button.EventType.CLICK, this.onShopClicked, this);
        }
        
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackClicked, this);
        }
    }
    
    /**
     * [의도] 이벤트 언바인딩
     */
    protected unbindEvents(): void {
        if (this.settingsButton) {
            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        
        if (this.shopButton) {
            this.shopButton.node.off(Button.EventType.CLICK, this.onShopClicked, this);
        }
        
        if (this.backButton) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackClicked, this);
        }
        
        // 월드 노드 이벤트 정리
        this.worldNodes.forEach((node, worldId) => {
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
        this.updatePlayerInfo();
        this.refreshWorldNodes();
    }
    
    /**
     * [의도] 월드 노드들 새로고침
     */
    private refreshWorldNodes(): void {
        this.worldNodes.forEach((node, worldId) => {
            const isUnlocked = this.isWorldUnlocked(worldId);
            const progress = this.getWorldProgress(worldId);
            
            // 잠금 상태 업데이트
            node.active = isUnlocked;
            
            // 진행도 업데이트
            const progressBar = node.getChildByName('Progress')?.getComponent(ProgressBar);
            if (progressBar) {
                progressBar.progress = progress;
            }
            
            // 진행도 텍스트 업데이트
            const progressLabel = node.getChildByName('ProgressText')?.getComponent(Label);
            if (progressLabel) {
                progressLabel.string = `${Math.round(progress * 100)}%`;
            }
            
            // 별 개수 업데이트
            const starsLabel = node.getChildByName('Stars')?.getComponent(Label);
            if (starsLabel) {
                const earnedStars = this.getWorldStars(worldId);
                const totalStars = this.worldManager?.getWorldInfo(worldId).levels.length * 3 || 0;
                starsLabel.string = `⭐ ${earnedStars}/${totalStars}`;
            }
        });
    }
    
    // === 헬퍼 메서드들 ===
    
    /**
     * [의도] 월드 잠금 해제 상태 확인
     */
    private isWorldUnlocked(worldId: number): boolean {
        if (!this.progressionManager) return false;
        
        const sceneData = this.sceneData as WorldMapData;
        return sceneData?.unlockedWorlds?.includes(worldId) || false;
    }
    
    /**
     * [의도] 월드 진행도 계산
     */
    private getWorldProgress(worldId: number): number {
        if (!this.progressionManager || !this.worldManager) return 0;
        
        const worldInfo = this.worldManager.getWorldInfo(worldId);
        const playerProgress = this.progressionManager.getPlayerProgress();
        
        let completedLevels = 0;
        
        for (const levelId of worldInfo.levels) {
            const levelProgress = playerProgress.levelProgress[levelId];
            if (levelProgress?.completed) {
                completedLevels++;
            }
        }
        
        return completedLevels / worldInfo.levels.length;
    }
    
    /**
     * [의도] 월드에서 획득한 별 개수
     */
    private getWorldStars(worldId: number): number {
        if (!this.progressionManager || !this.worldManager) return 0;
        
        const worldInfo = this.worldManager.getWorldInfo(worldId);
        const playerProgress = this.progressionManager.getPlayerProgress();
        
        let totalStars = 0;
        
        for (const levelId of worldInfo.levels) {
            const levelProgress = playerProgress.levelProgress[levelId];
            if (levelProgress) {
                totalStars += levelProgress.starsEarned;
            }
        }
        
        return totalStars;
    }
    
    /**
     * [의도] 월드 해제 필요 별 개수
     */
    private getUnlockRequiredStars(worldId: number): number {
        // 월드별 해제 조건 (월드1은 기본 해제)
        const requirements = [0, 0, 15, 35, 60, 90]; // 각 월드별 필요 별 개수
        return requirements[worldId] || 999;
    }
    
    // === 이벤트 핸들러들 ===
    
    /**
     * [의도] 월드 클릭 처리
     */
    private onWorldClicked(worldId: number): void {
        if (!this.isWorldUnlocked(worldId)) {
            // 잠긴 월드 클릭 시 경고
            console.log(`[WorldMapScene] 월드 ${worldId}는 아직 잠겨있습니다`);
            return;
        }
        
        // 레벨 선택 씬으로 이동
        UIManager.getInstance().switchToScene(UIScene.LEVEL_SELECT, {
            worldId: worldId
        });
    }
    
    private onSettingsClicked(): void {
        UIManager.getInstance().switchToScene(UIScene.SETTINGS);
    }
    
    private onShopClicked(): void {
        UIManager.getInstance().switchToScene(UIScene.SHOP);
    }
    
    private onBackClicked(): void {
        UIManager.getInstance().switchToScene(UIScene.MAIN_MENU);
    }
}