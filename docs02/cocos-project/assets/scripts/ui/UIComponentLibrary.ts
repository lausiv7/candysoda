/**
 * [의도] Sweet Puzzle UI 컴포넌트 라이브러리 - 재사용 가능한 UI 컴포넌트들의 통합 관리
 * [책임] 버튼, 패널, 모달, 카드 등 공통 UI 컴포넌트 생성 및 스타일링, 일관된 디자인 보장
 */

import { _decorator, Component, Node, Prefab, instantiate, Button, Label, Sprite, UITransform, Vec3, Color, tween, Tween, find } from 'cc';
import { EventBus } from '../core/EventBus';
import { DesignSystem, ColorTheme, FontSize, FontWeight } from './DesignSystem';
import { ResponsiveLayout } from './ResponsiveLayout';
import { AccessibilityManager, AccessibilityNodeInfo } from './AccessibilityManager';

const { ccclass, property } = _decorator;

// 컴포넌트 타입 정의
export enum ComponentType {
    PRIMARY_BUTTON = 'primary_button',
    SECONDARY_BUTTON = 'secondary_button',
    ICON_BUTTON = 'icon_button',
    TEXT_BUTTON = 'text_button',
    PANEL = 'panel',
    MODAL = 'modal',
    CARD = 'card',
    PROGRESS_BAR = 'progress_bar',
    SLIDER = 'slider',
    TOGGLE = 'toggle',
    INPUT_FIELD = 'input_field',
    DROPDOWN = 'dropdown',
    TOOLTIP = 'tooltip',
    NOTIFICATION = 'notification',
    LOADING_SPINNER = 'loading_spinner'
}

// 컴포넌트 크기
export enum ComponentSize {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
    EXTRA_LARGE = 'extra_large'
}

// 컴포넌트 변형
export enum ComponentVariant {
    DEFAULT = 'default',
    OUTLINED = 'outlined',
    FILLED = 'filled',
    TEXT = 'text',
    GHOST = 'ghost'
}

// 알림 타입
export enum NotificationType {
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    INFO = 'info'
}

// 컴포넌트 설정 인터페이스
export interface ComponentConfig {
    type: ComponentType;
    size?: ComponentSize;
    variant?: ComponentVariant;
    theme?: ColorTheme;
    text?: string;
    icon?: string;
    disabled?: boolean;
    width?: number;
    height?: number;
    position?: Vec3;
    onClick?: () => void;
    accessibility?: AccessibilityNodeInfo;
}

// 버튼 설정
export interface ButtonConfig extends ComponentConfig {
    rippleEffect?: boolean;
    loading?: boolean;
    badge?: string | number;
}

// 패널 설정
export interface PanelConfig extends ComponentConfig {
    title?: string;
    closable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    transparent?: boolean;
}

// 모달 설정
export interface ModalConfig extends ComponentConfig {
    title?: string;
    content?: string;
    showOverlay?: boolean;
    closableByOverlay?: boolean;
    actions?: Array<{
        text: string;
        variant: ComponentVariant;
        onClick: () => void;
    }>;
}

// 진행 바 설정
export interface ProgressBarConfig extends ComponentConfig {
    progress: number; // 0-1
    animated?: boolean;
    showLabel?: boolean;
    labelFormat?: string;
}

// 알림 설정
export interface NotificationConfig extends ComponentConfig {
    notificationType: NotificationType;
    duration?: number;
    closable?: boolean;
    action?: {
        text: string;
        onClick: () => void;
    };
}

@ccclass('UIComponentLibrary')
export class UIComponentLibrary extends Component {
    
    // 싱글톤 인스턴스
    private static instance: UIComponentLibrary | null = null;
    
    @property(Node)
    private componentContainer: Node = null!;
    
    // 디자인 시스템 참조
    private designSystem: DesignSystem = null!;
    private responsiveLayout: ResponsiveLayout = null!;
    private accessibilityManager: AccessibilityManager = null!;
    
    // 컴포넌트 프리팹 캐시
    private componentPrefabs: Map<ComponentType, Node> = new Map();
    
    // 활성 컴포넌트 추적
    private activeComponents: Map<string, Node> = new Map();
    
    // 컴포넌트 ID 카운터
    private componentIdCounter: number = 0;
    
    protected onLoad(): void {
        if (UIComponentLibrary.instance === null) {
            UIComponentLibrary.instance = this;
            this.initialize();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): UIComponentLibrary {
        if (!UIComponentLibrary.instance) {
            console.error('[UIComponentLibrary] Instance not initialized');
            return null;
        }
        return UIComponentLibrary.instance;
    }
    
    /**
     * [의도] UI 컴포넌트 라이브러리 초기화
     */
    private initialize(): void {
        this.setupReferences();
        this.createComponentPrefabs();
        this.setupContainer();
        
        console.log('[UIComponentLibrary] UI 컴포넌트 라이브러리 초기화 완료');
    }
    
    /**
     * [의도] 참조 설정
     */
    private setupReferences(): void {
        this.designSystem = DesignSystem.getInstance();
        this.responsiveLayout = ResponsiveLayout.getInstance();
        this.accessibilityManager = AccessibilityManager.getInstance();
        
        if (!this.componentContainer) {
            this.componentContainer = find('ComponentContainer', this.node) || this.node;
        }
    }
    
    /**
     * [의도] 컴포넌트 프리팹 생성
     */
    private createComponentPrefabs(): void {
        // 기본 컴포넌트 프리팹들 생성
        this.createButtonPrefabs();
        this.createPanelPrefabs();
        this.createModalPrefabs();
        this.createProgressBarPrefab();
        this.createNotificationPrefabs();
        this.createOtherComponentPrefabs();
        
        console.log(`[UIComponentLibrary] ${this.componentPrefabs.size}개 컴포넌트 프리팹 생성 완료`);
    }
    
    /**
     * [의도] 버튼 프리팹들 생성
     */
    private createButtonPrefabs(): void {
        // Primary 버튼
        const primaryButton = this.createBasicButtonPrefab(ComponentType.PRIMARY_BUTTON);
        this.componentPrefabs.set(ComponentType.PRIMARY_BUTTON, primaryButton);
        
        // Secondary 버튼
        const secondaryButton = this.createBasicButtonPrefab(ComponentType.SECONDARY_BUTTON);
        this.componentPrefabs.set(ComponentType.SECONDARY_BUTTON, secondaryButton);
        
        // Icon 버튼
        const iconButton = this.createIconButtonPrefab();
        this.componentPrefabs.set(ComponentType.ICON_BUTTON, iconButton);
        
        // Text 버튼
        const textButton = this.createBasicButtonPrefab(ComponentType.TEXT_BUTTON);
        this.componentPrefabs.set(ComponentType.TEXT_BUTTON, textButton);
    }
    
    /**
     * [의도] 기본 버튼 프리팹 생성
     */
    private createBasicButtonPrefab(type: ComponentType): Node {
        const buttonNode = new Node(`${type}_prefab`);
        
        // UITransform 추가
        const transform = buttonNode.addComponent(UITransform);
        transform.setContentSize(200, 60);
        
        // Button 컴포넌트 추가
        const button = buttonNode.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.95;
        
        // Sprite 배경 추가
        const sprite = buttonNode.addComponent(Sprite);
        
        // 라벨 노드 생성
        const labelNode = new Node('Label');
        buttonNode.addChild(labelNode);
        
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setAnchorPoint(0.5, 0.5);
        
        const label = labelNode.addComponent(Label);
        label.string = 'Button';
        label.fontSize = FontSize.BASE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        
        buttonNode.active = false;
        return buttonNode;
    }
    
    /**
     * [의도] 아이콘 버튼 프리팹 생성
     */
    private createIconButtonPrefab(): Node {
        const buttonNode = new Node('icon_button_prefab');
        
        const transform = buttonNode.addComponent(UITransform);
        transform.setContentSize(48, 48);
        
        const button = buttonNode.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        
        const sprite = buttonNode.addComponent(Sprite);
        
        // 아이콘 노드
        const iconNode = new Node('Icon');
        buttonNode.addChild(iconNode);
        
        const iconTransform = iconNode.addComponent(UITransform);
        iconTransform.setContentSize(24, 24);
        iconTransform.setAnchorPoint(0.5, 0.5);
        
        const iconSprite = iconNode.addComponent(Sprite);
        
        buttonNode.active = false;
        return buttonNode;
    }
    
    /**
     * [의도] 패널 프리팹들 생성
     */
    private createPanelPrefabs(): void {
        const panelNode = new Node('panel_prefab');
        
        const transform = panelNode.addComponent(UITransform);
        transform.setContentSize(400, 300);
        
        const sprite = panelNode.addComponent(Sprite);
        
        // 제목 바
        const titleBar = new Node('TitleBar');
        panelNode.addChild(titleBar);
        
        const titleTransform = titleBar.addComponent(UITransform);
        titleTransform.setContentSize(400, 40);
        titleTransform.setAnchorPoint(0.5, 1);
        titleTransform.setPosition(0, 150, 0);
        
        const titleSprite = titleBar.addComponent(Sprite);
        
        // 제목 라벨
        const titleLabel = new Node('TitleLabel');
        titleBar.addChild(titleLabel);
        
        const titleLabelTransform = titleLabel.addComponent(UITransform);
        titleLabelTransform.setAnchorPoint(0, 0.5);
        titleLabelTransform.setPosition(-190, 0, 0);
        
        const titleLabelComp = titleLabel.addComponent(Label);
        titleLabelComp.string = 'Panel Title';
        titleLabelComp.fontSize = FontSize.LG;
        
        // 닫기 버튼
        const closeButton = new Node('CloseButton');
        titleBar.addChild(closeButton);
        
        const closeButtonTransform = closeButton.addComponent(UITransform);
        closeButtonTransform.setContentSize(32, 32);
        closeButtonTransform.setAnchorPoint(1, 0.5);
        closeButtonTransform.setPosition(190, 0, 0);
        
        const closeButtonComp = closeButton.addComponent(Button);
        const closeButtonSprite = closeButton.addComponent(Sprite);
        
        // 내용 영역
        const contentArea = new Node('ContentArea');
        panelNode.addChild(contentArea);
        
        const contentTransform = contentArea.addComponent(UITransform);
        contentTransform.setContentSize(380, 240);
        contentTransform.setAnchorPoint(0.5, 0.5);
        contentTransform.setPosition(0, -10, 0);
        
        panelNode.active = false;
        this.componentPrefabs.set(ComponentType.PANEL, panelNode);
    }
    
    /**
     * [의도] 모달 프리팹들 생성
     */
    private createModalPrefabs(): void {
        const modalNode = new Node('modal_prefab');
        
        const transform = modalNode.addComponent(UITransform);
        transform.setContentSize(500, 400);
        
        // 오버레이 배경
        const overlay = new Node('Overlay');
        modalNode.addChild(overlay);
        
        const overlayTransform = overlay.addComponent(UITransform);
        overlayTransform.setContentSize(1920, 1080); // 전체 화면
        overlayTransform.setAnchorPoint(0.5, 0.5);
        overlayTransform.setPosition(0, 0, -1);
        
        const overlaySprite = overlay.addComponent(Sprite);
        overlaySprite.color = new Color(0, 0, 0, 128); // 반투명 검정
        
        // 모달 내용
        const modalContent = new Node('ModalContent');
        modalNode.addChild(modalContent);
        
        const contentTransform = modalContent.addComponent(UITransform);
        contentTransform.setContentSize(500, 400);
        contentTransform.setAnchorPoint(0.5, 0.5);
        
        const contentSprite = modalContent.addComponent(Sprite);
        
        // 제목
        const titleNode = new Node('Title');
        modalContent.addChild(titleNode);
        
        const titleTransform = titleNode.addComponent(UITransform);
        titleTransform.setAnchorPoint(0.5, 1);
        titleTransform.setPosition(0, 180, 0);
        
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = 'Modal Title';
        titleLabel.fontSize = FontSize.XL2;
        
        // 내용 텍스트
        const contentText = new Node('ContentText');
        modalContent.addChild(contentText);
        
        const contentTextTransform = contentText.addComponent(UITransform);
        contentTextTransform.setContentSize(450, 200);
        contentTextTransform.setAnchorPoint(0.5, 0.5);
        contentTextTransform.setPosition(0, 0, 0);
        
        const contentLabel = contentText.addComponent(Label);
        contentLabel.string = 'Modal content goes here...';
        contentLabel.fontSize = FontSize.BASE;
        
        // 액션 버튼 컨테이너
        const actionsContainer = new Node('ActionsContainer');
        modalContent.addChild(actionsContainer);
        
        const actionsTransform = actionsContainer.addComponent(UITransform);
        actionsTransform.setContentSize(400, 60);
        actionsTransform.setAnchorPoint(0.5, 0);
        actionsTransform.setPosition(0, -180, 0);
        
        modalNode.active = false;
        this.componentPrefabs.set(ComponentType.MODAL, modalNode);
    }
    
    /**
     * [의도] 진행 바 프리팹 생성
     */
    private createProgressBarPrefab(): void {
        const progressNode = new Node('progress_bar_prefab');
        
        const transform = progressNode.addComponent(UITransform);
        transform.setContentSize(300, 20);
        
        // 배경
        const background = new Node('Background');
        progressNode.addChild(background);
        
        const bgTransform = background.addComponent(UITransform);
        bgTransform.setContentSize(300, 20);
        bgTransform.setAnchorPoint(0.5, 0.5);
        
        const bgSprite = background.addComponent(Sprite);
        
        // 진행 바
        const progressBar = new Node('ProgressBar');
        progressNode.addChild(progressBar);
        
        const progressTransform = progressBar.addComponent(UITransform);
        progressTransform.setContentSize(0, 18);
        progressTransform.setAnchorPoint(0, 0.5);
        progressTransform.setPosition(-150, 0, 0);
        
        const progressSprite = progressBar.addComponent(Sprite);
        
        // 라벨
        const labelNode = new Node('Label');
        progressNode.addChild(labelNode);
        
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setAnchorPoint(0.5, 0.5);
        labelTransform.setPosition(0, 0, 1);
        
        const label = labelNode.addComponent(Label);
        label.string = '0%';
        label.fontSize = FontSize.SM;
        
        progressNode.active = false;
        this.componentPrefabs.set(ComponentType.PROGRESS_BAR, progressNode);
    }
    
    /**
     * [의도] 알림 프리팹들 생성
     */
    private createNotificationPrefabs(): void {
        const notificationNode = new Node('notification_prefab');
        
        const transform = notificationNode.addComponent(UITransform);
        transform.setContentSize(400, 80);
        
        const sprite = notificationNode.addComponent(Sprite);
        
        // 아이콘
        const iconNode = new Node('Icon');
        notificationNode.addChild(iconNode);
        
        const iconTransform = iconNode.addComponent(UITransform);
        iconTransform.setContentSize(32, 32);
        iconTransform.setAnchorPoint(0, 0.5);
        iconTransform.setPosition(-180, 0, 0);
        
        const iconSprite = iconNode.addComponent(Sprite);
        
        // 메시지
        const messageNode = new Node('Message');
        notificationNode.addChild(messageNode);
        
        const messageTransform = messageNode.addComponent(UITransform);
        messageTransform.setContentSize(300, 60);
        messageTransform.setAnchorPoint(0, 0.5);
        messageTransform.setPosition(-140, 0, 0);
        
        const messageLabel = messageNode.addComponent(Label);
        messageLabel.string = 'Notification message';
        messageLabel.fontSize = FontSize.BASE;
        
        // 닫기 버튼
        const closeButton = new Node('CloseButton');
        notificationNode.addChild(closeButton);
        
        const closeTransform = closeButton.addComponent(UITransform);
        closeTransform.setContentSize(24, 24);
        closeTransform.setAnchorPoint(1, 0.5);
        closeTransform.setPosition(190, 20, 0);
        
        const closeButtonComp = closeButton.addComponent(Button);
        const closeSprite = closeButton.addComponent(Sprite);
        
        notificationNode.active = false;
        this.componentPrefabs.set(ComponentType.NOTIFICATION, notificationNode);
    }
    
    /**
     * [의도] 기타 컴포넌트 프리팹들 생성
     */
    private createOtherComponentPrefabs(): void {
        // 로딩 스피너
        const spinnerNode = new Node('loading_spinner_prefab');
        const spinnerTransform = spinnerNode.addComponent(UITransform);
        spinnerTransform.setContentSize(48, 48);
        const spinnerSprite = spinnerNode.addComponent(Sprite);
        spinnerNode.active = false;
        this.componentPrefabs.set(ComponentType.LOADING_SPINNER, spinnerNode);
        
        // 툴팁
        const tooltipNode = new Node('tooltip_prefab');
        const tooltipTransform = tooltipNode.addComponent(UITransform);
        tooltipTransform.setContentSize(200, 40);
        const tooltipSprite = tooltipNode.addComponent(Sprite);
        
        const tooltipLabel = new Node('Label');
        tooltipNode.addChild(tooltipLabel);
        const tooltipLabelTransform = tooltipLabel.addComponent(UITransform);
        tooltipLabelTransform.setAnchorPoint(0.5, 0.5);
        const tooltipLabelComp = tooltipLabel.addComponent(Label);
        tooltipLabelComp.string = 'Tooltip';
        tooltipLabelComp.fontSize = FontSize.SM;
        
        tooltipNode.active = false;
        this.componentPrefabs.set(ComponentType.TOOLTIP, tooltipNode);
    }
    
    /**
     * [의도] 컨테이너 설정
     */
    private setupContainer(): void {
        if (!this.componentContainer) {
            this.componentContainer = new Node('ComponentContainer');
            this.node.addChild(this.componentContainer);
        }
    }
    
    /**
     * [의도] 버튼 생성
     */
    public createButton(config: ButtonConfig): Node {
        const prefab = this.componentPrefabs.get(config.type);
        if (!prefab) {
            console.error(`[UIComponentLibrary] Button prefab not found: ${config.type}`);
            return null;
        }
        
        const button = instantiate(prefab);
        const componentId = this.generateComponentId();
        button.name = `${config.type}_${componentId}`;
        
        this.configureButton(button, config);
        this.applyCommonStyles(button, config);
        this.setupAccessibility(button, config.accessibility);
        
        this.componentContainer.addChild(button);
        this.activeComponents.set(componentId, button);
        
        button.active = true;
        return button;
    }
    
    /**
     * [의도] 버튼 구성
     */
    private configureButton(button: Node, config: ButtonConfig): void {
        const buttonComp = button.getComponent(Button);
        const labelNode = button.getChildByName('Label');
        const iconNode = button.getChildByName('Icon');
        
        // 텍스트 설정
        if (config.text && labelNode) {
            const label = labelNode.getComponent(Label);
            if (label) {
                label.string = config.text;
                this.applyButtonTextStyle(label, config);
            }
        }
        
        // 클릭 이벤트 설정
        if (config.onClick && buttonComp) {
            buttonComp.node.on(Button.EventType.CLICK, () => {
                if (config.rippleEffect) {
                    this.playRippleEffect(button);
                }
                config.onClick();
            });
        }
        
        // 비활성화 상태
        if (config.disabled) {
            buttonComp.interactable = false;
            this.applyDisabledStyle(button);
        }
        
        // 로딩 상태
        if (config.loading) {
            this.showButtonLoading(button);
        }
        
        // 배지
        if (config.badge) {
            this.addButtonBadge(button, config.badge);
        }
        
        // 스타일 적용
        this.applyButtonStyle(button, config);
    }
    
    /**
     * [의도] 버튼 텍스트 스타일 적용
     */
    private applyButtonTextStyle(label: Label, config: ButtonConfig): void {
        const size = config.size || ComponentSize.MEDIUM;
        
        switch (size) {
            case ComponentSize.SMALL:
                label.fontSize = FontSize.SM;
                break;
            case ComponentSize.MEDIUM:
                label.fontSize = FontSize.BASE;
                break;
            case ComponentSize.LARGE:
                label.fontSize = FontSize.LG;
                break;
            case ComponentSize.EXTRA_LARGE:
                label.fontSize = FontSize.XL;
                break;
        }
        
        // 테마별 색상 적용
        const theme = config.theme || ColorTheme.PRIMARY;
        if (this.designSystem) {
            label.color = this.designSystem.getColor(theme, 500);
        }
    }
    
    /**
     * [의도] 버튼 스타일 적용
     */
    private applyButtonStyle(button: Node, config: ButtonConfig): void {
        const sprite = button.getComponent(Sprite);
        if (!sprite) return;
        
        const theme = config.theme || ColorTheme.PRIMARY;
        const variant = config.variant || ComponentVariant.DEFAULT;
        const size = config.size || ComponentSize.MEDIUM;
        
        // 크기 설정
        this.applyButtonSize(button, size);
        
        // 변형별 스타일
        switch (variant) {
            case ComponentVariant.FILLED:
                sprite.color = this.designSystem.getColor(theme, 500);
                break;
            case ComponentVariant.OUTLINED:
                sprite.color = Color.TRANSPARENT;
                // 테두리 효과 구현 필요
                break;
            case ComponentVariant.TEXT:
                sprite.color = Color.TRANSPARENT;
                break;
            case ComponentVariant.GHOST:
                sprite.color = this.designSystem.getColor(theme, 100);
                break;
            default:
                sprite.color = this.designSystem.getColor(theme, 500);
        }
    }
    
    /**
     * [의도] 버튼 크기 적용
     */
    private applyButtonSize(button: Node, size: ComponentSize): void {
        const transform = button.getComponent(UITransform);
        if (!transform) return;
        
        let width: number, height: number;
        
        switch (size) {
            case ComponentSize.SMALL:
                width = 120; height = 36;
                break;
            case ComponentSize.MEDIUM:
                width = 160; height = 44;
                break;
            case ComponentSize.LARGE:
                width = 200; height = 52;
                break;
            case ComponentSize.EXTRA_LARGE:
                width = 240; height = 60;
                break;
            default:
                width = 160; height = 44;
        }
        
        transform.setContentSize(width, height);
    }
    
    /**
     * [의도] 패널 생성
     */
    public createPanel(config: PanelConfig): Node {
        const prefab = this.componentPrefabs.get(ComponentType.PANEL);
        if (!prefab) return null;
        
        const panel = instantiate(prefab);
        const componentId = this.generateComponentId();
        panel.name = `panel_${componentId}`;
        
        this.configurePanel(panel, config);
        this.applyCommonStyles(panel, config);
        this.setupAccessibility(panel, config.accessibility);
        
        this.componentContainer.addChild(panel);
        this.activeComponents.set(componentId, panel);
        
        panel.active = true;
        return panel;
    }
    
    /**
     * [의도] 패널 구성
     */
    private configurePanel(panel: Node, config: PanelConfig): void {
        const titleLabel = panel.getChildByPath('TitleBar/TitleLabel')?.getComponent(Label);
        if (titleLabel && config.title) {
            titleLabel.string = config.title;
        }
        
        const closeButton = panel.getChildByPath('TitleBar/CloseButton');
        if (closeButton) {
            if (config.closable === false) {
                closeButton.active = false;
            } else {
                closeButton.getComponent(Button)?.node.on(Button.EventType.CLICK, () => {
                    this.closePanel(panel);
                });
            }
        }
        
        // 드래그 가능 설정
        if (config.draggable) {
            this.makePanelDraggable(panel);
        }
        
        // 리사이즈 가능 설정  
        if (config.resizable) {
            this.makePanelResizable(panel);
        }
        
        // 투명도 설정
        if (config.transparent) {
            const sprite = panel.getComponent(Sprite);
            if (sprite) {
                const color = sprite.color.clone();
                color.a = 200;
                sprite.color = color;
            }
        }
    }
    
    /**
     * [의도] 모달 생성
     */
    public createModal(config: ModalConfig): Node {
        const prefab = this.componentPrefabs.get(ComponentType.MODAL);
        if (!prefab) return null;
        
        const modal = instantiate(prefab);
        const componentId = this.generateComponentId();
        modal.name = `modal_${componentId}`;
        
        this.configureModal(modal, config);
        this.applyCommonStyles(modal, config);
        this.setupAccessibility(modal, config.accessibility);
        
        this.componentContainer.addChild(modal);
        this.activeComponents.set(componentId, modal);
        
        // 모달 표시 애니메이션
        this.showModalWithAnimation(modal);
        
        return modal;
    }
    
    /**
     * [의도] 모달 구성
     */
    private configureModal(modal: Node, config: ModalConfig): void {
        const titleLabel = modal.getChildByPath('ModalContent/Title')?.getComponent(Label);
        if (titleLabel && config.title) {
            titleLabel.string = config.title;
        }
        
        const contentLabel = modal.getChildByPath('ModalContent/ContentText')?.getComponent(Label);
        if (contentLabel && config.content) {
            contentLabel.string = config.content;
        }
        
        // 오버레이 클릭으로 닫기
        if (config.closableByOverlay !== false) {
            const overlay = modal.getChildByName('Overlay');
            if (overlay) {
                const overlayButton = overlay.addComponent(Button);
                overlayButton.node.on(Button.EventType.CLICK, () => {
                    this.closeModal(modal);
                });
            }
        }
        
        // 액션 버튼들 생성
        if (config.actions && config.actions.length > 0) {
            this.createModalActionButtons(modal, config.actions);
        }
    }
    
    /**
     * [의도] 진행 바 생성
     */
    public createProgressBar(config: ProgressBarConfig): Node {
        const prefab = this.componentPrefabs.get(ComponentType.PROGRESS_BAR);
        if (!prefab) return null;
        
        const progressBar = instantiate(prefab);
        const componentId = this.generateComponentId();
        progressBar.name = `progress_bar_${componentId}`;
        
        this.configureProgressBar(progressBar, config);
        this.applyCommonStyles(progressBar, config);
        this.setupAccessibility(progressBar, config.accessibility);
        
        this.componentContainer.addChild(progressBar);
        this.activeComponents.set(componentId, progressBar);
        
        progressBar.active = true;
        return progressBar;
    }
    
    /**
     * [의도] 진행 바 구성
     */
    private configureProgressBar(progressBar: Node, config: ProgressBarConfig): void {
        const progress = Math.max(0, Math.min(1, config.progress));
        
        // 진행 바 크기 설정
        const progressBarNode = progressBar.getChildByName('ProgressBar');
        if (progressBarNode) {
            const transform = progressBarNode.getComponent(UITransform);
            const totalWidth = progressBar.getComponent(UITransform).contentSize.width;
            const progressWidth = totalWidth * progress;
            
            if (config.animated) {
                // 애니메이션으로 진행
                tween(transform)
                    .to(0.5, { contentSize: { width: progressWidth } })
                    .start();
            } else {
                transform.setContentSize(progressWidth, transform.contentSize.height);
            }
        }
        
        // 라벨 업데이트
        const labelNode = progressBar.getChildByName('Label');
        if (labelNode && config.showLabel !== false) {
            const label = labelNode.getComponent(Label);
            const format = config.labelFormat || '{progress}%';
            const progressPercent = Math.round(progress * 100);
            label.string = format.replace('{progress}', progressPercent.toString());
        }
    }
    
    /**
     * [의도] 알림 생성
     */
    public createNotification(config: NotificationConfig): Node {
        const prefab = this.componentPrefabs.get(ComponentType.NOTIFICATION);
        if (!prefab) return null;
        
        const notification = instantiate(prefab);
        const componentId = this.generateComponentId();
        notification.name = `notification_${componentId}`;
        
        this.configureNotification(notification, config);
        this.applyCommonStyles(notification, config);
        this.setupAccessibility(notification, config.accessibility);
        
        this.componentContainer.addChild(notification);
        this.activeComponents.set(componentId, notification);
        
        // 알림 표시 애니메이션
        this.showNotificationWithAnimation(notification, config);
        
        return notification;
    }
    
    /**
     * [의도] 알림 구성
     */
    private configureNotification(notification: Node, config: NotificationConfig): void {
        // 타입별 아이콘과 색상 설정
        this.applyNotificationTypeStyle(notification, config.notificationType);
        
        // 메시지 설정
        const messageLabel = notification.getChildByName('Message')?.getComponent(Label);
        if (messageLabel && config.text) {
            messageLabel.string = config.text;
        }
        
        // 닫기 버튼
        const closeButton = notification.getChildByName('CloseButton');
        if (closeButton) {
            if (config.closable === false) {
                closeButton.active = false;
            } else {
                closeButton.getComponent(Button)?.node.on(Button.EventType.CLICK, () => {
                    this.closeNotification(notification);
                });
            }
        }
        
        // 자동 닫기
        if (config.duration && config.duration > 0) {
            this.scheduleCall(() => {
                this.closeNotification(notification);
            }, config.duration);
        }
    }
    
    // === 유틸리티 메서드들 ===
    
    /**
     * [의도] 공통 스타일 적용
     */
    private applyCommonStyles(component: Node, config: ComponentConfig): void {
        const transform = component.getComponent(UITransform);
        
        // 크기 설정
        if (config.width && config.height) {
            transform.setContentSize(config.width, config.height);
        }
        
        // 위치 설정
        if (config.position) {
            component.setPosition(config.position);
        }
        
        // 반응형 적용
        if (this.responsiveLayout) {
            this.responsiveLayout.applyResponsiveLayout();
        }
    }
    
    /**
     * [의도] 접근성 설정
     */
    private setupAccessibility(component: Node, accessibility?: AccessibilityNodeInfo): void {
        if (!this.accessibilityManager || !accessibility) return;
        
        this.accessibilityManager.setAccessibilityInfo(component, accessibility);
    }
    
    /**
     * [의도] 컴포넌트 ID 생성
     */
    private generateComponentId(): string {
        return `component_${++this.componentIdCounter}`;
    }
    
    /**
     * [의도] 리플 효과 재생
     */
    private playRippleEffect(button: Node): void {
        // 리플 효과 구현 (Cocos Creator 애니메이션)
        console.log('[UIComponentLibrary] Ripple effect played');
    }
    
    /**
     * [의도] 패널 닫기
     */
    private closePanel(panel: Node): void {
        tween(panel)
            .to(0.3, { scale: new Vec3(0, 0, 1) })
            .call(() => {
                panel.destroy();
                this.removeFromActiveComponents(panel);
            })
            .start();
    }
    
    /**
     * [의도] 모달 닫기
     */
    private closeModal(modal: Node): void {
        tween(modal)
            .to(0.2, { scale: new Vec3(0, 0, 1) })
            .call(() => {
                modal.destroy();
                this.removeFromActiveComponents(modal);
            })
            .start();
    }
    
    /**
     * [의도] 활성 컴포넌트에서 제거
     */
    private removeFromActiveComponents(component: Node): void {
        for (const [id, node] of this.activeComponents) {
            if (node === component) {
                this.activeComponents.delete(id);
                break;
            }
        }
    }
    
    /**
     * [의도] 모달 표시 애니메이션
     */
    private showModalWithAnimation(modal: Node): void {
        modal.scale = new Vec3(0, 0, 1);
        tween(modal)
            .to(0.3, { scale: new Vec3(1, 1, 1) })
            .start();
    }
    
    /**
     * [의도] 알림 표시 애니메이션
     */
    private showNotificationWithAnimation(notification: Node, config: NotificationConfig): void {
        notification.setPosition(-500, notification.position.y, 0);
        tween(notification)
            .to(0.4, { position: new Vec3(0, notification.position.y, 0) })
            .start();
    }
    
    /**
     * [의도] 알림 닫기
     */
    private closeNotification(notification: Node): void {
        tween(notification)
            .to(0.3, { position: new Vec3(500, notification.position.y, 0) })
            .call(() => {
                notification.destroy();
                this.removeFromActiveComponents(notification);
            })
            .start();
    }
    
    /**
     * [의도] 알림 타입별 스타일 적용
     */
    private applyNotificationTypeStyle(notification: Node, type: NotificationType): void {
        const sprite = notification.getComponent(Sprite);
        const iconSprite = notification.getChildByName('Icon')?.getComponent(Sprite);
        
        if (!sprite) return;
        
        switch (type) {
            case NotificationType.SUCCESS:
                sprite.color = this.designSystem.getColor(ColorTheme.SUCCESS, 500);
                break;
            case NotificationType.WARNING:
                sprite.color = this.designSystem.getColor(ColorTheme.WARNING, 500);
                break;
            case NotificationType.ERROR:
                sprite.color = this.designSystem.getColor(ColorTheme.ERROR, 500);
                break;
            case NotificationType.INFO:
                sprite.color = this.designSystem.getColor(ColorTheme.INFO, 500);
                break;
        }
    }
    
    // === 추가 유틸리티 메서드들 ===
    
    private applyDisabledStyle(button: Node): void {
        const sprite = button.getComponent(Sprite);
        if (sprite) {
            const color = sprite.color.clone();
            color.a = 100;
            sprite.color = color;
        }
    }
    
    private showButtonLoading(button: Node): void {
        // 로딩 스피너 추가 구현
        console.log('[UIComponentLibrary] Button loading state shown');
    }
    
    private addButtonBadge(button: Node, badge: string | number): void {
        // 배지 추가 구현
        console.log('[UIComponentLibrary] Button badge added:', badge);
    }
    
    private makePanelDraggable(panel: Node): void {
        // 드래그 기능 구현
        console.log('[UIComponentLibrary] Panel made draggable');
    }
    
    private makePanelResizable(panel: Node): void {
        // 리사이즈 기능 구현
        console.log('[UIComponentLibrary] Panel made resizable');
    }
    
    private createModalActionButtons(modal: Node, actions: any[]): void {
        // 모달 액션 버튼 생성 구현
        console.log('[UIComponentLibrary] Modal action buttons created');
    }
    
    /**
     * [의도] 모든 활성 컴포넌트 정리
     */
    public cleanup(): void {
        for (const [id, component] of this.activeComponents) {
            if (component && component.isValid) {
                component.destroy();
            }
        }
        this.activeComponents.clear();
        console.log('[UIComponentLibrary] All active components cleaned up');
    }
}