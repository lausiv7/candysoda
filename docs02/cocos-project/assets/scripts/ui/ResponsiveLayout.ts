/**
 * [의도] Sweet Puzzle 반응형 레이아웃 시스템 - 다양한 화면 크기와 해상도에 적응하는 UI 관리
 * [책임] 화면 크기 감지, 레이아웃 적응, 세이프 에리어 처리, 터치 영역 최적화
 */

import { _decorator, Component, Node, Canvas, view, Vec2, Size, Widget, Label, UITransform } from 'cc';
import { EventBus } from '../core/EventBus';
import { DesignSystem } from './DesignSystem';

const { ccclass, property } = _decorator;

// 화면 크기 카테고리
export enum ScreenCategory {
    SMALL = 'small',     // 480p 이하 (작은 스마트폰)
    MEDIUM = 'medium',   // 720p (일반 스마트폰)
    LARGE = 'large',     // 1080p (큰 스마트폰)
    XLARGE = 'xlarge'    // 1440p 이상 (태블릿)
}

// 화면 방향
export enum ScreenOrientation {
    PORTRAIT = 'portrait',      // 세로
    LANDSCAPE = 'landscape'     // 가로
}

// 화면 설정 정보
export interface ScreenConfig {
    category: ScreenCategory;
    orientation: ScreenOrientation;
    width: number;
    height: number;
    aspectRatio: number;
    scaleFactor: number;
    density: number;
    safeAreaInsets: SafeAreaInsets;
}

// 세이프 에리어 정보
export interface SafeAreaInsets {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

// 레이아웃 어댑터 인터페이스
export interface LayoutAdapter {
    adapt(screenConfig: ScreenConfig): void;
    getName(): string;
}

// 앵커 포인트
export enum AnchorPoint {
    TOP_LEFT = 'top_left',
    TOP_CENTER = 'top_center',
    TOP_RIGHT = 'top_right',
    CENTER_LEFT = 'center_left',
    CENTER = 'center',
    CENTER_RIGHT = 'center_right',
    BOTTOM_LEFT = 'bottom_left',
    BOTTOM_CENTER = 'bottom_center',
    BOTTOM_RIGHT = 'bottom_right'
}

@ccclass('ResponsiveLayout')
export class ResponsiveLayout extends Component {
    
    // 싱글톤 인스턴스
    private static instance: ResponsiveLayout | null = null;
    
    @property(Canvas)
    private canvas: Canvas = null!;
    
    // 현재 화면 설정
    private currentScreenConfig: ScreenConfig = {
        category: ScreenCategory.MEDIUM,
        orientation: ScreenOrientation.PORTRAIT,
        width: 720,
        height: 1280,
        aspectRatio: 0.5625,
        scaleFactor: 1.0,
        density: 1.0,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
    };
    
    // 레이아웃 어댑터들
    private layoutAdapters: Map<string, LayoutAdapter> = new Map();
    
    // 반응형 요소들
    private responsiveElements: Map<string, Node> = new Map();
    
    // 최소 터치 영역 크기
    private minTouchSize: number = 44;
    
    protected onLoad(): void {
        if (ResponsiveLayout.instance === null) {
            ResponsiveLayout.instance = this;
            this.initialize();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): ResponsiveLayout {
        if (!ResponsiveLayout.instance) {
            console.error('[ResponsiveLayout] Instance not initialized');
            return null;
        }
        return ResponsiveLayout.instance;
    }
    
    /**
     * [의도] 반응형 레이아웃 시스템 초기화
     */
    private initialize(): void {
        this.detectScreenConfig();
        this.setupLayoutAdapters();
        this.setupResizeCallback();
        this.registerResponsiveElements();
        this.applyResponsiveLayout();
        
        console.log('[ResponsiveLayout] 반응형 레이아웃 시스템 초기화 완료');
        console.log('[ResponsiveLayout] 화면 설정:', this.currentScreenConfig);
    }
    
    /**
     * [의도] 화면 설정 감지
     */
    private detectScreenConfig(): void {
        const frameSize = view.getFrameSize();
        const canvasSize = view.getCanvasSize();
        const devicePixelRatio = view.getDevicePixelRatio();
        
        const width = frameSize.width;
        const height = frameSize.height;
        const aspectRatio = width / height;
        
        // 화면 카테고리 결정
        let category: ScreenCategory;
        let scaleFactor: number;
        
        const maxDimension = Math.max(width, height);
        
        if (maxDimension <= 640) {
            category = ScreenCategory.SMALL;
            scaleFactor = 0.8;
        } else if (maxDimension <= 1080) {
            category = ScreenCategory.MEDIUM;
            scaleFactor = 1.0;
        } else if (maxDimension <= 1440) {
            category = ScreenCategory.LARGE;
            scaleFactor = 1.2;
        } else {
            category = ScreenCategory.XLARGE;
            scaleFactor = 1.4;
        }
        
        // 화면 방향 결정
        const orientation = aspectRatio > 1 ? ScreenOrientation.LANDSCAPE : ScreenOrientation.PORTRAIT;
        
        // 세이프 에리어 감지
        const safeAreaInsets = this.detectSafeArea();
        
        this.currentScreenConfig = {
            category,
            orientation,
            width,
            height,
            aspectRatio,
            scaleFactor,
            density: devicePixelRatio,
            safeAreaInsets
        };
    }
    
    /**
     * [의도] 세이프 에리어 감지
     */
    private detectSafeArea(): SafeAreaInsets {
        let safeAreaInsets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
        
        // 플랫폼별 세이프 에리어 감지
        try {
            // iOS Safe Area 감지
            if (window && (window as any).webkit?.messageHandlers?.safeArea) {
                const nativeSafeArea = this.getNativeSafeArea();
                if (nativeSafeArea) {
                    safeAreaInsets = nativeSafeArea;
                }
            }
            // 기본 추정치 (iPhone X 계열)
            else if (this.isIPhoneXSeries()) {
                safeAreaInsets = {
                    top: 44,
                    bottom: 34,
                    left: 0,
                    right: 0
                };
            }
            // Android 노치 처리
            else if (this.hasAndroidNotch()) {
                safeAreaInsets = {
                    top: 24,
                    bottom: 0,
                    left: 0,
                    right: 0
                };
            }
        } catch (error) {
            console.warn('[ResponsiveLayout] Safe area detection failed:', error);
        }
        
        return safeAreaInsets;
    }
    
    /**
     * [의도] 레이아웃 어댑터 설정
     */
    private setupLayoutAdapters(): void {
        // 게임 보드 레이아웃 어댑터
        this.layoutAdapters.set('gameBoard', new GameBoardLayoutAdapter());
        
        // 상단 UI 패널 어댑터
        this.layoutAdapters.set('topPanel', new TopPanelLayoutAdapter());
        
        // 하단 UI 패널 어댑터
        this.layoutAdapters.set('bottomPanel', new BottomPanelLayoutAdapter());
        
        // 버튼 그룹 어댑터
        this.layoutAdapters.set('buttonGroup', new ButtonGroupLayoutAdapter());
        
        // 팝업 어댑터
        this.layoutAdapters.set('popup', new PopupLayoutAdapter());
        
        console.log(`[ResponsiveLayout] ${this.layoutAdapters.size}개 레이아웃 어댑터 설정 완료`);
    }
    
    /**
     * [의도] 화면 크기 변경 콜백 설정
     */
    private setupResizeCallback(): void {
        view.setResizeCallback(() => {
            console.log('[ResponsiveLayout] 화면 크기 변경 감지');
            this.detectScreenConfig();
            this.applyResponsiveLayout();
            
            EventBus.getInstance().emit('screen_resized', {
                screenConfig: this.currentScreenConfig
            });
        });
    }
    
    /**
     * [의도] 반응형 요소들 등록
     */
    private registerResponsiveElements(): void {
        // 게임 보드
        const gameBoard = this.node.getChildByName('GameBoard');
        if (gameBoard) {
            this.responsiveElements.set('gameBoard', gameBoard);
        }
        
        // UI 패널들
        const topPanel = this.node.getChildByName('TopPanel');
        if (topPanel) {
            this.responsiveElements.set('topPanel', topPanel);
        }
        
        const bottomPanel = this.node.getChildByName('BottomPanel');
        if (bottomPanel) {
            this.responsiveElements.set('bottomPanel', bottomPanel);
        }
        
        console.log(`[ResponsiveLayout] ${this.responsiveElements.size}개 반응형 요소 등록`);
    }
    
    /**
     * [의도] 반응형 레이아웃 적용
     */
    public applyResponsiveLayout(): void {
        console.log('[ResponsiveLayout] 반응형 레이아웃 적용 시작');
        
        // 각 레이아웃 어댑터 실행
        for (const [name, adapter] of this.layoutAdapters) {
            try {
                adapter.adapt(this.currentScreenConfig);
                console.log(`[ResponsiveLayout] ${adapter.getName()} 어댑터 적용 완료`);
            } catch (error) {
                console.error(`[ResponsiveLayout] ${adapter.getName()} 어댑터 오류:`, error);
            }
        }
        
        // 폰트 크기 조정
        this.adjustFontSizes();
        
        // 터치 영역 크기 조정
        this.adjustTouchAreas();
        
        // 세이프 에리어 적용
        this.applySafeArea();
        
        EventBus.getInstance().emit('layout_applied', {
            screenConfig: this.currentScreenConfig
        });
        
        console.log('[ResponsiveLayout] 반응형 레이아웃 적용 완료');
    }
    
    /**
     * [의도] 폰트 크기 자동 조정
     */
    private adjustFontSizes(): void {
        const scaleFactor = this.currentScreenConfig.scaleFactor;
        const allLabels = this.node.getComponentsInChildren(Label);
        
        allLabels.forEach(label => {
            // 'responsive' 태그가 있는 라벨만 자동 조정
            if (label.node.name.includes('responsive') || label.node.name.includes('auto-scale')) {
                const originalSize = label.fontSize;
                const newSize = Math.floor(originalSize * scaleFactor);
                label.fontSize = Math.max(12, Math.min(newSize, 72)); // 12-72px 제한
            }
        });
    }
    
    /**
     * [의도] 터치 영역 크기 조정
     */
    private adjustTouchAreas(): void {
        // 모든 버튼과 터치 가능한 요소들의 최소 크기 보장
        const touchableElements = this.node.getComponentsInChildren(UITransform);
        
        touchableElements.forEach(transform => {
            if (transform.node.name.includes('button') || 
                transform.node.name.includes('touchable') ||
                transform.node.getComponent('cc.Button')) {
                
                const currentSize = transform.contentSize;
                const scaledMinSize = this.minTouchSize * this.currentScreenConfig.scaleFactor;
                
                if (currentSize.width < scaledMinSize || currentSize.height < scaledMinSize) {
                    const newSize = new Size(
                        Math.max(currentSize.width, scaledMinSize),
                        Math.max(currentSize.height, scaledMinSize)
                    );
                    transform.setContentSize(newSize);
                }
            }
        });
    }
    
    /**
     * [의도] 세이프 에리어 적용
     */
    private applySafeArea(): void {
        const insets = this.currentScreenConfig.safeAreaInsets;
        
        // 캔버스의 위젯 조정
        const canvasWidget = this.canvas.node.getComponent(Widget);
        if (canvasWidget) {
            canvasWidget.top = insets.top;
            canvasWidget.bottom = insets.bottom;
            canvasWidget.left = insets.left;
            canvasWidget.right = insets.right;
            canvasWidget.updateAlignment();
        }
        
        // 개별 요소들의 세이프 에리어 적용
        this.adjustElementsForSafeArea();
    }
    
    /**
     * [의도] 개별 요소들의 세이프 에리어 조정
     */
    private adjustElementsForSafeArea(): void {
        const insets = this.currentScreenConfig.safeAreaInsets;
        
        // 상단 패널
        const topPanel = this.responsiveElements.get('topPanel');
        if (topPanel) {
            const widget = topPanel.getComponent(Widget);
            if (widget) {
                widget.top = insets.top + 10; // 추가 마진
                widget.updateAlignment();
            }
        }
        
        // 하단 패널
        const bottomPanel = this.responsiveElements.get('bottomPanel');
        if (bottomPanel) {
            const widget = bottomPanel.getComponent(Widget);
            if (widget) {
                widget.bottom = insets.bottom + 10; // 추가 마진
                widget.updateAlignment();
            }
        }
    }
    
    /**
     * [의도] 현재 화면 설정 조회
     */
    getCurrentScreenConfig(): ScreenConfig {
        return { ...this.currentScreenConfig };
    }
    
    /**
     * [의도] 안전 영역을 고려한 위치 계산
     */
    adjustPositionForSafeArea(position: Vec2, anchor: AnchorPoint): Vec2 {
        const adjustedPosition = position.clone();
        const insets = this.currentScreenConfig.safeAreaInsets;
        
        switch (anchor) {
            case AnchorPoint.TOP_LEFT:
                adjustedPosition.x += insets.left;
                adjustedPosition.y -= insets.top;
                break;
            case AnchorPoint.TOP_CENTER:
                adjustedPosition.y -= insets.top;
                break;
            case AnchorPoint.TOP_RIGHT:
                adjustedPosition.x -= insets.right;
                adjustedPosition.y -= insets.top;
                break;
            case AnchorPoint.BOTTOM_LEFT:
                adjustedPosition.x += insets.left;
                adjustedPosition.y += insets.bottom;
                break;
            case AnchorPoint.BOTTOM_CENTER:
                adjustedPosition.y += insets.bottom;
                break;
            case AnchorPoint.BOTTOM_RIGHT:
                adjustedPosition.x -= insets.right;
                adjustedPosition.y += insets.bottom;
                break;
            // CENTER 관련은 세이프 에리어 영향 없음
        }
        
        return adjustedPosition;
    }
    
    // 유틸리티 메서드들
    private getNativeSafeArea(): SafeAreaInsets | null {
        // 네이티브 플랫폼에서 세이프 에리어 정보 가져오기
        // 실제 구현에서는 네이티브 브리지를 통해 가져와야 함
        return null;
    }
    
    private isIPhoneXSeries(): boolean {
        // iPhone X 계열 감지 로직
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const aspectRatio = this.currentScreenConfig.aspectRatio;
        
        return isIOS && (aspectRatio > 2.0 || aspectRatio < 0.5);
    }
    
    private hasAndroidNotch(): boolean {
        // Android 노치 감지 로직
        const userAgent = navigator.userAgent;
        const isAndroid = /Android/.test(userAgent);
        const aspectRatio = this.currentScreenConfig.aspectRatio;
        
        return isAndroid && (aspectRatio > 1.8 || aspectRatio < 0.55);
    }
}

// 게임 보드 레이아웃 어댑터
export class GameBoardLayoutAdapter implements LayoutAdapter {
    getName(): string {
        return 'GameBoard Layout Adapter';
    }
    
    adapt(screenConfig: ScreenConfig): void {
        const gameBoard = ResponsiveLayout.getInstance().node.getChildByName('GameBoard');
        if (!gameBoard) return;
        
        const availableWidth = screenConfig.width * 0.9; // 90% 사용
        const availableHeight = screenConfig.height * 0.6; // 60% 사용
        
        // 보드 크기 계산 (정사각형 유지)
        const boardSize = Math.min(availableWidth, availableHeight) * screenConfig.scaleFactor;
        
        const transform = gameBoard.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(boardSize, boardSize);
        }
        
        // 화면 방향에 따른 위치 조정
        if (screenConfig.orientation === ScreenOrientation.PORTRAIT) {
            gameBoard.setPosition(0, screenConfig.height * 0.1);
        } else {
            gameBoard.setPosition(-screenConfig.width * 0.1, 0);
        }
    }
}

// 상단 패널 레이아웃 어댑터
export class TopPanelLayoutAdapter implements LayoutAdapter {
    getName(): string {
        return 'Top Panel Layout Adapter';
    }
    
    adapt(screenConfig: ScreenConfig): void {
        const topPanel = ResponsiveLayout.getInstance().responsiveElements.get('topPanel');
        if (!topPanel) return;
        
        const widget = topPanel.getComponent(Widget);
        if (widget) {
            widget.top = screenConfig.safeAreaInsets.top + 10;
            widget.left = screenConfig.safeAreaInsets.left;
            widget.right = screenConfig.safeAreaInsets.right;
            widget.updateAlignment();
        }
    }
}

// 하단 패널 레이아웃 어댑터
export class BottomPanelLayoutAdapter implements LayoutAdapter {
    getName(): string {
        return 'Bottom Panel Layout Adapter';
    }
    
    adapt(screenConfig: ScreenConfig): void {
        const bottomPanel = ResponsiveLayout.getInstance().responsiveElements.get('bottomPanel');
        if (!bottomPanel) return;
        
        const widget = bottomPanel.getComponent(Widget);
        if (widget) {
            widget.bottom = screenConfig.safeAreaInsets.bottom + 10;
            widget.left = screenConfig.safeAreaInsets.left;
            widget.right = screenConfig.safeAreaInsets.right;
            widget.updateAlignment();
        }
    }
}

// 버튼 그룹 레이아웃 어댑터
export class ButtonGroupLayoutAdapter implements LayoutAdapter {
    getName(): string {
        return 'Button Group Layout Adapter';
    }
    
    adapt(screenConfig: ScreenConfig): void {
        // 버튼 그룹들의 크기와 간격 조정
        const buttonGroups = ResponsiveLayout.getInstance().node.getChildByName('ButtonGroups');
        if (!buttonGroups) return;
        
        const children = buttonGroups.children;
        children.forEach(child => {
            if (child.name.includes('button')) {
                const transform = child.getComponent(UITransform);
                if (transform) {
                    const originalSize = transform.contentSize;
                    const scaleFactor = screenConfig.scaleFactor;
                    transform.setContentSize(
                        originalSize.width * scaleFactor,
                        originalSize.height * scaleFactor
                    );
                }
            }
        });
    }
}

// 팝업 레이아웃 어댑터
export class PopupLayoutAdapter implements LayoutAdapter {
    getName(): string {
        return 'Popup Layout Adapter';
    }
    
    adapt(screenConfig: ScreenConfig): void {
        // 팝업 크기를 화면 크기에 맞게 조정
        const popups = ResponsiveLayout.getInstance().node.getComponentsInChildren(UITransform);
        
        popups.forEach(transform => {
            if (transform.node.name.includes('popup') || transform.node.name.includes('modal')) {
                const maxWidth = screenConfig.width * 0.9;
                const maxHeight = screenConfig.height * 0.8;
                
                const currentSize = transform.contentSize;
                const newSize = new Size(
                    Math.min(currentSize.width * screenConfig.scaleFactor, maxWidth),
                    Math.min(currentSize.height * screenConfig.scaleFactor, maxHeight)
                );
                
                transform.setContentSize(newSize);
            }
        });
    }
}