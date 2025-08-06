/**
 * [의도] Sweet Puzzle 게임의 UI 시스템을 총괄 관리하는 매니저
 * [책임] 씬 전환, UI 상태 관리, 애니메이션 제어, 사용자 입력 처리
 */

import { _decorator, Component, Node, Canvas, find, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

// UI 씬 타입
export enum UIScene {
    SPLASH = 'splash',           // 스플래시 화면
    MAIN_MENU = 'main_menu',     // 메인 메뉴
    WORLD_MAP = 'world_map',     // 월드맵
    LEVEL_SELECT = 'level_select', // 레벨 선택
    GAME_PLAY = 'game_play',     // 게임플레이
    LEVEL_COMPLETE = 'level_complete', // 레벨 완료
    PAUSE = 'pause',             // 일시정지
    SETTINGS = 'settings',       // 설정
    SHOP = 'shop'               // 상점
}

// UI 전환 애니메이션 타입
export enum TransitionType {
    FADE = 'fade',
    SLIDE_LEFT = 'slide_left',
    SLIDE_RIGHT = 'slide_right',
    SLIDE_UP = 'slide_up',
    SLIDE_DOWN = 'slide_down',
    SCALE = 'scale',
    FLIP = 'flip'
}

// UI 상태 정보
export interface UIState {
    currentScene: UIScene;
    previousScene: UIScene | null;
    isTransitioning: boolean;
    modalStack: UIScene[];
    overlayStack: UIScene[];
}

@ccclass('UIManager')
export class UIManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: UIManager;
    
    @property(Canvas)
    private mainCanvas: Canvas = null!;
    
    @property(Node)
    private sceneContainer: Node = null!;
    
    @property(Node)
    private modalContainer: Node = null!;
    
    @property(Node)
    private overlayContainer: Node = null!;
    
    // UI 상태 관리
    private uiState: UIState = {
        currentScene: UIScene.SPLASH,
        previousScene: null,
        isTransitioning: false,
        modalStack: [],
        overlayStack: []
    };
    
    // 로드된 씬 노드들
    private loadedScenes: Map<UIScene, Node> = new Map();
    
    // 전환 애니메이션 설정
    private transitionDuration = 0.5;
    private defaultTransition = TransitionType.FADE;
    
    /**
     * [의도] 싱글톤 인스턴스 반환
     */
    public static getInstance(): UIManager {
        return this.instance;
    }
    
    /**
     * [의도] UI 매니저 초기화
     */
    onLoad(): void {
        UIManager.instance = this;
        
        // 캔버스 및 컨테이너 초기 설정
        this.setupCanvas();
        this.setupContainers();
        
        console.log('[UIManager] 초기화 완료');
    }
    
    /**
     * [의도] 캔버스 초기 설정
     */
    private setupCanvas(): void {
        if (!this.mainCanvas) {
            this.mainCanvas = this.getComponent(Canvas)!;
        }
        
        // 캔버스 크기 조정 모드 설정
        // this.mainCanvas.fitHeight = true;
        // this.mainCanvas.fitWidth = true;
    }
    
    /**
     * [의도] UI 컨테이너 설정
     */
    private setupContainers(): void {
        if (!this.sceneContainer) {
            this.sceneContainer = find('SceneContainer', this.node) || this.node;
        }
        
        if (!this.modalContainer) {
            this.modalContainer = find('ModalContainer', this.node) || this.createContainer('ModalContainer');
        }
        
        if (!this.overlayContainer) {
            this.overlayContainer = find('OverlayContainer', this.node) || this.createContainer('OverlayContainer');
        }
        
        // 컨테이너 Z-order 설정
        this.sceneContainer.setSiblingIndex(0);
        this.modalContainer.setSiblingIndex(1);
        this.overlayContainer.setSiblingIndex(2);
    }
    
    /**
     * [의도] 컨테이너 노드 생성
     */
    private createContainer(name: string): Node {
        const container = new Node(name);
        this.node.addChild(container);
        return container;
    }
    
    /**
     * [의도] 씬 전환
     */
    public async switchToScene(\n        targetScene: UIScene, \n        transition: TransitionType = this.defaultTransition,\n        data?: any\n    ): Promise<void> {\n        if (this.uiState.isTransitioning) {\n            console.warn('[UIManager] 이미 전환 중입니다');\n            return;\n        }\n        \n        if (this.uiState.currentScene === targetScene) {\n            console.warn(`[UIManager] 이미 ${targetScene} 씬입니다`);\n            return;\n        }\n        \n        console.log(`[UIManager] 씬 전환: ${this.uiState.currentScene} → ${targetScene}`);\n        \n        this.uiState.isTransitioning = true;\n        this.uiState.previousScene = this.uiState.currentScene;\n        \n        try {\n            // 타겟 씬 로드\n            const targetSceneNode = await this.loadScene(targetScene);\n            \n            // 현재 씬 가져오기\n            const currentSceneNode = this.getCurrentSceneNode();\n            \n            // 전환 애니메이션 실행\n            await this.playTransitionAnimation(\n                currentSceneNode, \n                targetSceneNode, \n                transition\n            );\n            \n            // 상태 업데이트\n            this.uiState.currentScene = targetScene;\n            \n            // 씬 활성화/비활성화\n            this.activateScene(targetSceneNode);\n            if (currentSceneNode) {\n                this.deactivateScene(currentSceneNode);\n            }\n            \n            // 씬 데이터 전달 (있는 경우)\n            if (data) {\n                this.sendDataToScene(targetSceneNode, data);\n            }\n            \n        } catch (error) {\n            console.error('[UIManager] 씬 전환 실패:', error);\n        } finally {\n            this.uiState.isTransitioning = false;\n        }\n    }\n    \n    /**\n     * [의도] 씬 로드 (필요시 동적 생성)\n     */\n    private async loadScene(scene: UIScene): Promise<Node> {\n        let sceneNode = this.loadedScenes.get(scene);\n        \n        if (!sceneNode) {\n            sceneNode = await this.createSceneNode(scene);\n            this.loadedScenes.set(scene, sceneNode);\n            \n            // 컨테이너에 추가\n            this.sceneContainer.addChild(sceneNode);\n            \n            // 초기에는 비활성화\n            sceneNode.active = false;\n        }\n        \n        return sceneNode;\n    }\n    \n    /**\n     * [의도] 씬 노드 생성\n     */\n    private async createSceneNode(scene: UIScene): Promise<Node> {\n        const sceneNode = new Node(scene);\n        \n        // 씬별 기본 설정\n        sceneNode.layer = this.node.layer;\n        sceneNode.setContentSize(this.node.getContentSize());\n        \n        // 씬별 컴포넌트 추가\n        switch (scene) {\n            case UIScene.SPLASH:\n                await this.setupSplashScene(sceneNode);\n                break;\n            case UIScene.MAIN_MENU:\n                await this.setupMainMenuScene(sceneNode);\n                break;\n            case UIScene.WORLD_MAP:\n                await this.setupWorldMapScene(sceneNode);\n                break;\n            case UIScene.LEVEL_SELECT:\n                await this.setupLevelSelectScene(sceneNode);\n                break;\n            case UIScene.GAME_PLAY:\n                await this.setupGamePlayScene(sceneNode);\n                break;\n            case UIScene.LEVEL_COMPLETE:\n                await this.setupLevelCompleteScene(sceneNode);\n                break;\n            case UIScene.PAUSE:\n                await this.setupPauseScene(sceneNode);\n                break;\n            case UIScene.SETTINGS:\n                await this.setupSettingsScene(sceneNode);\n                break;\n            case UIScene.SHOP:\n                await this.setupShopScene(sceneNode);\n                break;\n        }\n        \n        console.log(`[UIManager] ${scene} 씬 노드 생성 완료`);\n        return sceneNode;\n    }\n    \n    /**\n     * [의도] 현재 씬 노드 가져오기\n     */\n    private getCurrentSceneNode(): Node | null {\n        return this.loadedScenes.get(this.uiState.currentScene) || null;\n    }\n    \n    /**\n     * [의도] 전환 애니메이션 실행\n     */\n    private async playTransitionAnimation(\n        fromNode: Node | null,\n        toNode: Node,\n        transition: TransitionType\n    ): Promise<void> {\n        return new Promise((resolve) => {\n            // 타겟 노드 활성화 (애니메이션을 위해)\n            toNode.active = true;\n            \n            const duration = this.transitionDuration;\n            let animationCount = 0;\n            const totalAnimations = fromNode ? 2 : 1;\n            \n            const onAnimationComplete = () => {\n                animationCount++;\n                if (animationCount >= totalAnimations) {\n                    resolve();\n                }\n            };\n            \n            // 새 씬 진입 애니메이션\n            this.playEnterAnimation(toNode, transition, onAnimationComplete);\n            \n            // 이전 씬 퇴장 애니메이션\n            if (fromNode) {\n                this.playExitAnimation(fromNode, transition, onAnimationComplete);\n            }\n        });\n    }\n    \n    /**\n     * [의도] 진입 애니메이션\n     */\n    private playEnterAnimation(node: Node, transition: TransitionType, callback: () => void): void {\n        const duration = this.transitionDuration;\n        \n        switch (transition) {\n            case TransitionType.FADE:\n                node.getComponent('cc.UIOpacity')?.setOpacity(0) || (node.opacity = 0);\n                tween(node)\n                    .to(duration, { opacity: 255 })\n                    .call(callback)\n                    .start();\n                break;\n                \n            case TransitionType.SLIDE_LEFT:\n                node.setPosition(node.getContentSize().width, 0, 0);\n                tween(node)\n                    .to(duration, { position: new Vec3(0, 0, 0) })\n                    .call(callback)\n                    .start();\n                break;\n                \n            case TransitionType.SLIDE_RIGHT:\n                node.setPosition(-node.getContentSize().width, 0, 0);\n                tween(node)\n                    .to(duration, { position: new Vec3(0, 0, 0) })\n                    .call(callback)\n                    .start();\n                break;\n                \n            case TransitionType.SCALE:\n                node.setScale(0, 0, 1);\n                tween(node)\n                    .to(duration, { scale: new Vec3(1, 1, 1) })\n                    .call(callback)\n                    .start();\n                break;\n                \n            default:\n                callback();\n        }\n    }\n    \n    /**\n     * [의도] 퇴장 애니메이션\n     */\n    private playExitAnimation(node: Node, transition: TransitionType, callback: () => void): void {\n        const duration = this.transitionDuration;\n        \n        switch (transition) {\n            case TransitionType.FADE:\n                tween(node)\n                    .to(duration, { opacity: 0 })\n                    .call(callback)\n                    .start();\n                break;\n                \n            case TransitionType.SLIDE_LEFT:\n                tween(node)\n                    .to(duration, { position: new Vec3(-node.getContentSize().width, 0, 0) })\n                    .call(callback)\n                    .start();\n                break;\n                \n            case TransitionType.SLIDE_RIGHT:\n                tween(node)\n                    .to(duration, { position: new Vec3(node.getContentSize().width, 0, 0) })\n                    .call(callback)\n                    .start();\n                break;\n                \n            case TransitionType.SCALE:\n                tween(node)\n                    .to(duration, { scale: new Vec3(0, 0, 1) })\n                    .call(callback)\n                    .start();\n                break;\n                \n            default:\n                callback();\n        }\n    }\n    \n    /**\n     * [의도] 씬 활성화\n     */\n    private activateScene(sceneNode: Node): void {\n        sceneNode.active = true;\n        \n        // 씬 컴포넌트에 활성화 이벤트 전달\n        const sceneComponent = sceneNode.getComponent('BaseUIScene');\n        if (sceneComponent && typeof sceneComponent['onSceneEnter'] === 'function') {\n            sceneComponent['onSceneEnter']();\n        }\n    }\n    \n    /**\n     * [의도] 씬 비활성화\n     */\n    private deactivateScene(sceneNode: Node): void {\n        // 씬 컴포넌트에 비활성화 이벤트 전달\n        const sceneComponent = sceneNode.getComponent('BaseUIScene');\n        if (sceneComponent && typeof sceneComponent['onSceneExit'] === 'function') {\n            sceneComponent['onSceneExit']();\n        }\n        \n        sceneNode.active = false;\n    }\n    \n    /**\n     * [의도] 씬에 데이터 전달\n     */\n    private sendDataToScene(sceneNode: Node, data: any): void {\n        const sceneComponent = sceneNode.getComponent('BaseUIScene');\n        if (sceneComponent && typeof sceneComponent['onReceiveData'] === 'function') {\n            sceneComponent['onReceiveData'](data);\n        }\n    }\n    \n    /**\n     * [의도] 모달 창 표시\n     */\n    public async showModal(modalScene: UIScene, data?: any): Promise<void> {\n        const modalNode = await this.loadScene(modalScene);\n        \n        // 모달 컨테이너로 이동\n        modalNode.removeFromParent();\n        this.modalContainer.addChild(modalNode);\n        \n        // 모달 스택에 추가\n        this.uiState.modalStack.push(modalScene);\n        \n        // 모달 애니메이션\n        modalNode.active = true;\n        this.playEnterAnimation(modalNode, TransitionType.SCALE, () => {\n            console.log(`[UIManager] 모달 표시: ${modalScene}`);\n        });\n        \n        if (data) {\n            this.sendDataToScene(modalNode, data);\n        }\n    }\n    \n    /**\n     * [의도] 모달 창 닫기\n     */\n    public async closeModal(): Promise<void> {\n        if (this.uiState.modalStack.length === 0) {\n            console.warn('[UIManager] 닫을 모달이 없습니다');\n            return;\n        }\n        \n        const modalScene = this.uiState.modalStack.pop()!;\n        const modalNode = this.loadedScenes.get(modalScene);\n        \n        if (modalNode) {\n            this.playExitAnimation(modalNode, TransitionType.SCALE, () => {\n                modalNode.removeFromParent();\n                this.sceneContainer.addChild(modalNode);\n                modalNode.active = false;\n                console.log(`[UIManager] 모달 닫기: ${modalScene}`);\n            });\n        }\n    }\n    \n    /**\n     * [의도] 현재 UI 상태 조회\n     */\n    public getUIState(): UIState {\n        return { ...this.uiState };\n    }\n    \n    /**\n     * [의도] 이전 씬으로 돌아가기\n     */\n    public async goBack(transition?: TransitionType): Promise<void> {\n        if (this.uiState.previousScene) {\n            await this.switchToScene(\n                this.uiState.previousScene, \n                transition || this.getOppositeTransition(this.defaultTransition)\n            );\n        }\n    }\n    \n    /**\n     * [의도] 반대 방향 전환 애니메이션 반환\n     */\n    private getOppositeTransition(transition: TransitionType): TransitionType {\n        switch (transition) {\n            case TransitionType.SLIDE_LEFT: return TransitionType.SLIDE_RIGHT;\n            case TransitionType.SLIDE_RIGHT: return TransitionType.SLIDE_LEFT;\n            case TransitionType.SLIDE_UP: return TransitionType.SLIDE_DOWN;\n            case TransitionType.SLIDE_DOWN: return TransitionType.SLIDE_UP;\n            default: return transition;\n        }\n    }\n    \n    // === 씬별 설정 메서드들 ===\n    \n    private async setupSplashScene(node: Node): Promise<void> {\n        // 스플래시 씬 UI 구성\n        console.log('[UIManager] 스플래시 씬 설정');\n        // TODO: 스플래시 UI 컴포넌트 추가\n    }\n    \n    private async setupMainMenuScene(node: Node): Promise<void> {\n        // 메인 메뉴 씬 UI 구성\n        console.log('[UIManager] 메인 메뉴 씬 설정');\n        // TODO: 메인 메뉴 UI 컴포넌트 추가\n    }\n    \n    private async setupWorldMapScene(node: Node): Promise<void> {\n        // 월드맵 씬 UI 구성\n        console.log('[UIManager] 월드맵 씬 설정');\n        // TODO: 월드맵 UI 컴포넌트 추가\n    }\n    \n    private async setupLevelSelectScene(node: Node): Promise<void> {\n        // 레벨 선택 씬 UI 구성\n        console.log('[UIManager] 레벨 선택 씬 설정');\n        // TODO: 레벨 선택 UI 컴포넌트 추가\n    }\n    \n    private async setupGamePlayScene(node: Node): Promise<void> {\n        // 게임플레이 씬 UI 구성\n        console.log('[UIManager] 게임플레이 씬 설정');\n        // TODO: 게임플레이 UI 컴포넌트 추가\n    }\n    \n    private async setupLevelCompleteScene(node: Node): Promise<void> {\n        // 레벨 완료 씬 UI 구성\n        console.log('[UIManager] 레벨 완료 씬 설정');\n        // TODO: 레벨 완료 UI 컴포넌트 추가\n    }\n    \n    private async setupPauseScene(node: Node): Promise<void> {\n        // 일시정지 씬 UI 구성\n        console.log('[UIManager] 일시정지 씬 설정');\n        // TODO: 일시정지 UI 컴포넌트 추가\n    }\n    \n    private async setupSettingsScene(node: Node): Promise<void> {\n        // 설정 씬 UI 구성\n        console.log('[UIManager] 설정 씬 설정');\n        // TODO: 설정 UI 컴포넌트 추가\n    }\n    \n    private async setupShopScene(node: Node): Promise<void> {\n        // 상점 씬 UI 구성\n        console.log('[UIManager] 상점 씬 설정');\n        // TODO: 상점 UI 컴포넌트 추가\n    }\n}