# UI/UX 시스템 설계

## 개요

Sweet Puzzle 게임의 사용자 인터페이스와 사용자 경험 설계 문서입니다. 모바일 우선 접근법으로 직관적이고 접근 가능한 UI/UX를 구현하여 모든 연령대의 사용자가 쉽게 게임을 즐길 수 있도록 설계합니다.

---

## 1. 🎨 디자인 시스템

### 컬러 팰릿 시스템

#### 색상 체계 정의
```typescript
// 색상 시스템 정의
export enum ColorTheme {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    INFO = 'info',
    NEUTRAL = 'neutral'
}

export interface ColorPalette {
    [ColorTheme.PRIMARY]: {
        50: string;   // 가장 밝은 색상
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;  // 기본 색상
        600: string;
        700: string;
        800: string;
        900: string;  // 가장 어두운 색상
    };
    [ColorTheme.SECONDARY]: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    // ... 다른 테마들
}

// Sweet Puzzle 컬러 팰릿
export const SWEET_PUZZLE_COLORS: ColorPalette = {
    [ColorTheme.PRIMARY]: {
        50: '#FFF5F7',   // 매우 연한 핑크
        100: '#FFE4E9',  // 연한 핑크
        200: '#FFCCD7',  // 밝은 핑크
        300: '#FF9FB3',  // 중간 핑크
        400: '#FF6B8A',  // 진한 핑크
        500: '#FF4081',  // 기본 핑크
        600: '#E91E63',  // 더 진한 핑크
        700: '#C2185B',  // 어두운 핑크
        800: '#AD1457',  // 매우 어두운 핑크
        900: '#880E4F'   // 가장 어두운 핑크
    },
    [ColorTheme.SECONDARY]: {
        50: '#F3E5F5',   // 매우 연한 보라
        100: '#E1BEE7',  // 연한 보라
        200: '#CE93D8',  // 밝은 보라
        300: '#BA68C8',  // 중간 보라
        400: '#AB47BC',  // 진한 보라
        500: '#9C27B0',  // 기본 보라
        600: '#8E24AA',  // 더 진한 보라
        700: '#7B1FA2',  // 어두운 보라
        800: '#6A1B9A',  // 매우 어두운 보라
        900: '#4A148C'   // 가장 어두운 보라
    },
    [ColorTheme.SUCCESS]: {
        50: '#E8F5E8',
        100: '#C8E6C9',
        200: '#A5D6A7',
        300: '#81C784',
        400: '#66BB6A',
        500: '#4CAF50',  // 기본 녹색
        600: '#43A047',
        700: '#388E3C',
        800: '#2E7D32',
        900: '#1B5E20'
    },
    [ColorTheme.WARNING]: {
        50: '#FFF8E1',
        100: '#FFECB3',
        200: '#FFE082',
        300: '#FFD54F',
        400: '#FFCA28',
        500: '#FFC107',  // 기본 노란색
        600: '#FFB300',
        700: '#FFA000',
        800: '#FF8F00',
        900: '#FF6F00'
    },
    [ColorTheme.ERROR]: {
        50: '#FFEBEE',
        100: '#FFCDD2',
        200: '#EF9A9A',
        300: '#E57373',
        400: '#EF5350',
        500: '#F44336',  // 기본 빨간색
        600: '#E53935',
        700: '#D32F2F',
        800: '#C62828',
        900: '#B71C1C'
    }
};

// 색상 관리 시스템
export class ColorManager {
    private currentTheme: 'light' | 'dark' = 'light';
    private colorPalette: ColorPalette = SWEET_PUZZLE_COLORS;
    
    getColor(theme: ColorTheme, shade: number = 500): string {
        return this.colorPalette[theme][shade];
    }
    
    setTheme(theme: 'light' | 'dark'): void {
        this.currentTheme = theme;
        this.updateThemeColors();
        EventBus.getInstance().emit('theme_changed', { theme });
    }
    
    private updateThemeColors(): void {
        const root = document.documentElement;
        
        if (this.currentTheme === 'dark') {
            root.style.setProperty('--bg-primary', '#121212');
            root.style.setProperty('--bg-secondary', '#1E1E1E');
            root.style.setProperty('--text-primary', '#FFFFFF');
            root.style.setProperty('--text-secondary', '#B3B3B3');
        } else {
            root.style.setProperty('--bg-primary', '#FFFFFF');
            root.style.setProperty('--bg-secondary', '#F5F5F5');
            root.style.setProperty('--text-primary', '#212121');
            root.style.setProperty('--text-secondary', '#757575');
        }
    }
}
```

### 타이포그래피 시스템

#### 폰트 계층 구조
```typescript
export enum FontWeight {
    THIN = 100,
    LIGHT = 300,
    REGULAR = 400,
    MEDIUM = 500,
    SEMIBOLD = 600,
    BOLD = 700,
    EXTRABOLD = 800,
    BLACK = 900
}

export enum FontSize {
    XS = 12,
    SM = 14,
    BASE = 16,
    LG = 18,
    XL = 20,
    XL2 = 24,
    XL3 = 30,
    XL4 = 36,
    XL5 = 48,
    XL6 = 60,
    XL7 = 72,
    XL8 = 96,
    XL9 = 128
}

export interface TypographyStyle {
    fontSize: FontSize;
    fontWeight: FontWeight;
    lineHeight: number;
    letterSpacing?: number;
}

// 타이포그래피 스타일 정의
export const TYPOGRAPHY_STYLES: Record<string, TypographyStyle> = {
    // 헤딩 스타일
    'h1': {
        fontSize: FontSize.XL6,
        fontWeight: FontWeight.BOLD,
        lineHeight: 1.2,
        letterSpacing: -0.02
    },
    'h2': {
        fontSize: FontSize.XL5,
        fontWeight: FontWeight.BOLD,
        lineHeight: 1.25,
        letterSpacing: -0.01
    },
    'h3': {
        fontSize: FontSize.XL4,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.3
    },
    'h4': {
        fontSize: FontSize.XL3,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.35
    },
    
    // 본문 스타일
    'body-large': {
        fontSize: FontSize.LG,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.5
    },
    'body': {
        fontSize: FontSize.BASE,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.5
    },
    'body-small': {
        fontSize: FontSize.SM,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.4
    },
    
    // 버튼 스타일
    'button-large': {
        fontSize: FontSize.LG,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.2
    },
    'button': {
        fontSize: FontSize.BASE,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.2
    },
    'button-small': {
        fontSize: FontSize.SM,
        fontWeight: FontWeight.MEDIUM,
        lineHeight: 1.2
    },
    
    // 특수 스타일
    'caption': {
        fontSize: FontSize.XS,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.3
    },
    'overline': {
        fontSize: FontSize.XS,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.2,
        letterSpacing: 0.1
    }
};

export class TypographyManager {
    static applyStyle(element: HTMLElement, styleName: string): void {
        const style = TYPOGRAPHY_STYLES[styleName];
        if (!style) {
            console.warn(`Typography style '${styleName}' not found`);
            return;
        }
        
        element.style.fontSize = `${style.fontSize}px`;
        element.style.fontWeight = style.fontWeight.toString();
        element.style.lineHeight = style.lineHeight.toString();
        
        if (style.letterSpacing !== undefined) {
            element.style.letterSpacing = `${style.letterSpacing}em`;
        }
    }
}
```

### 컴포넌트 라이브러리

#### 기본 UI 컴포넌트
```typescript
// 버튼 컴포넌트
export enum ButtonVariant {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    OUTLINE = 'outline',
    GHOST = 'ghost',
    LINK = 'link'
}

export enum ButtonSize {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
    XLARGE = 'xlarge'
}

export interface ButtonProps {
    variant: ButtonVariant;
    size: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    icon?: string;
    iconPosition?: 'left' | 'right';
    onClick?: () => void;
    children: string;
}

export class UIButton extends cc.Component {
    @property(cc.Label)
    label: cc.Label = null;
    
    @property(cc.Sprite)
    background: cc.Sprite = null;
    
    @property(cc.Sprite)
    icon: cc.Sprite = null;
    
    @property(cc.Animation)
    animation: cc.Animation = null;
    
    private buttonProps: ButtonProps;
    private originalScale: number = 1;
    private isPressed: boolean = false;
    
    onLoad() {
        this.setupTouchEvents();
        this.originalScale = this.node.scale;
    }
    
    public configure(props: ButtonProps): void {
        this.buttonProps = props;
        this.updateAppearance();
        this.updateSize();
        this.updateContent();
    }
    
    private setupTouchEvents(): void {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    
    private onTouchStart(event: cc.Event.EventTouch): void {
        if (this.buttonProps.disabled || this.buttonProps.loading) {
            return;
        }
        
        this.isPressed = true;
        this.playPressAnimation();
        AudioManager.getInstance().playSound('button_press');
    }
    
    private onTouchEnd(event: cc.Event.EventTouch): void {
        if (!this.isPressed) return;
        
        this.isPressed = false;
        this.playReleaseAnimation();
        
        if (!this.buttonProps.disabled && !this.buttonProps.loading) {
            this.buttonProps.onClick?.();
            AudioManager.getInstance().playSound('button_click');
        }
    }
    
    private playPressAnimation(): void {
        cc.tween(this.node)
            .to(0.1, { scale: this.originalScale * 0.95 })
            .start();
    }
    
    private playReleaseAnimation(): void {
        cc.tween(this.node)
            .to(0.1, { scale: this.originalScale * 1.05 })
            .to(0.1, { scale: this.originalScale })
            .start();
    }
    
    private updateAppearance(): void {
        const colorManager = ColorManager.getInstance();
        
        switch (this.buttonProps.variant) {
            case ButtonVariant.PRIMARY:
                this.background.color = cc.Color.fromHEX(new cc.Color(), colorManager.getColor(ColorTheme.PRIMARY));
                this.label.node.color = cc.Color.WHITE;
                break;
                
            case ButtonVariant.SECONDARY:
                this.background.color = cc.Color.fromHEX(new cc.Color(), colorManager.getColor(ColorTheme.SECONDARY));
                this.label.node.color = cc.Color.WHITE;
                break;
                
            case ButtonVariant.OUTLINE:
                this.background.color = cc.Color.TRANSPARENT;
                this.label.node.color = cc.Color.fromHEX(new cc.Color(), colorManager.getColor(ColorTheme.PRIMARY));
                // 테두리 스타일 적용
                break;
        }
        
        // 비활성화 상태 스타일
        if (this.buttonProps.disabled) {
            this.background.color = cc.Color.GRAY;
            this.label.node.color = cc.Color.fromHEX(new cc.Color(), '#999999');
            this.node.opacity = 128;
        } else {
            this.node.opacity = 255;
        }
    }
}
```

---

## 2. 📱 반응형 레이아웃

### 화면 크기 적응 시스템

#### 다양한 해상도 지원
```typescript
// 화면 크기 카테고리 정의
export enum ScreenCategory {
    SMALL = 'small',     // 480p 이하
    MEDIUM = 'medium',   // 720p
    LARGE = 'large',     // 1080p
    XLARGE = 'xlarge'    // 1440p 이상
}

export interface ScreenConfig {
    category: ScreenCategory;
    width: number;
    height: number;
    aspectRatio: number;
    scaleFactor: number;
}

export class ResponsiveLayoutManager extends cc.Component {
    private currentScreenConfig: ScreenConfig;
    private layoutAdapters: Map<string, LayoutAdapter> = new Map();
    
    onLoad() {
        this.detectScreenConfig();
        this.setupLayoutAdapters();
        this.applyResponsiveLayout();
        
        // 화면 회전 감지
        cc.view.setResizeCallback(() => {
            this.detectScreenConfig();
            this.applyResponsiveLayout();
        });
    }
    
    private detectScreenConfig(): void {
        const frameSize = cc.view.getFrameSize();
        const width = frameSize.width;
        const height = frameSize.height;
        const aspectRatio = width / height;
        
        let category: ScreenCategory;
        let scaleFactor: number;
        
        if (width <= 480) {
            category = ScreenCategory.SMALL;
            scaleFactor = 0.8;
        } else if (width <= 720) {
            category = ScreenCategory.MEDIUM;
            scaleFactor = 1.0;
        } else if (width <= 1080) {
            category = ScreenCategory.LARGE;
            scaleFactor = 1.2;
        } else {
            category = ScreenCategory.XLARGE;
            scaleFactor = 1.4;
        }
        
        this.currentScreenConfig = {
            category,
            width,
            height,
            aspectRatio,
            scaleFactor
        };
    }
    
    private setupLayoutAdapters(): void {
        // 게임 보드 레이아웃 어댑터
        this.layoutAdapters.set('gameBoard', new GameBoardLayoutAdapter());
        
        // UI 패널 레이아웃 어댑터
        this.layoutAdapters.set('uiPanel', new UIPanelLayoutAdapter());
        
        // 버튼 그룹 레이아웃 어댑터
        this.layoutAdapters.set('buttonGroup', new ButtonGroupLayoutAdapter());
        
        // 팝업 레이아웃 어댑터
        this.layoutAdapters.set('popup', new PopupLayoutAdapter());
    }
    
    private applyResponsiveLayout(): void {
        for (const [name, adapter] of this.layoutAdapters) {
            adapter.adapt(this.currentScreenConfig);
        }
        
        // 글꼴 크기 조정
        this.adjustFontSizes();
        
        // 터치 영역 크기 조정
        this.adjustTouchAreas();
        
        EventBus.getInstance().emit('layout_changed', {
            screenConfig: this.currentScreenConfig
        });
    }
    
    private adjustFontSizes(): void {
        const scaleFactor = this.currentScreenConfig.scaleFactor;
        const labels = this.node.getComponentsInChildren(cc.Label);
        
        labels.forEach(label => {
            if (label.node.name.includes('responsive')) {
                const originalSize = label.fontSize;
                label.fontSize = Math.floor(originalSize * scaleFactor);
            }
        });
    }
    
    private adjustTouchAreas(): void {
        const minTouchSize = 44; // 최소 터치 영역 (pt)
        const buttons = this.node.getComponentsInChildren(UIButton);
        
        buttons.forEach(button => {
            const size = button.node.getContentSize();
            const scaledSize = Math.max(size.width * this.currentScreenConfig.scaleFactor, minTouchSize);
            
            if (size.width < minTouchSize) {
                button.node.setContentSize(scaledSize, scaledSize);
            }
        });
    }
}

// 게임 보드 레이아웃 어댑터
export class GameBoardLayoutAdapter implements LayoutAdapter {
    adapt(screenConfig: ScreenConfig): void {
        const gameBoard = cc.find('GameBoard');
        if (!gameBoard) return;
        
        const availableWidth = screenConfig.width * 0.9; // 90% 사용
        const availableHeight = screenConfig.height * 0.6; // 60% 사용
        
        // 보드 크기 계산 (정사각형 유지)
        const boardSize = Math.min(availableWidth, availableHeight);
        gameBoard.setContentSize(boardSize, boardSize);
        
        // 보드 위치 조정
        if (screenConfig.aspectRatio > 1.5) {
            // 세로가 긴 화면 (일반적인 모바일)
            gameBoard.setPosition(0, screenConfig.height * 0.1);
        } else {
            // 가로가 긴 화면 (태블릿)
            gameBoard.setPosition(-screenConfig.width * 0.1, 0);
        }
        
        // 블록 크기 조정
        this.adjustBlockSizes(gameBoard, boardSize);
    }
    
    private adjustBlockSizes(gameBoard: cc.Node, boardSize: number): void {
        const blockSize = boardSize / 8; // 8x8 보드 기준
        const blocks = gameBoard.getComponentsInChildren(cc.Sprite);
        
        blocks.forEach(block => {
            if (block.node.name.includes('block')) {
                block.node.setContentSize(blockSize, blockSize);
            }
        });
    }
}
```

### 세이프 에리어 관리

#### 노치/홈 인디케이터 대응
```typescript
export class SafeAreaManager {
    private static instance: SafeAreaManager;
    private safeAreaInsets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    
    static getInstance(): SafeAreaManager {
        if (!this.instance) {
            this.instance = new SafeAreaManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.detectSafeArea();
        this.applySafeAreaConstraints();
    }
    
    private detectSafeArea(): void {
        // iOS Safe Area 감지
        if (cc.sys.os === cc.sys.OS_IOS) {
            // iOS 11+ 에서 사용 가능한 safeAreaInsets 활용
            const safeArea = this.getNativeSafeArea();
            if (safeArea) {
                this.safeAreaInsets = safeArea;
            } else {
                // 기본값 설정 (iPhone X 계열)
                this.safeAreaInsets = {
                    top: 44,
                    bottom: 34,
                    left: 0,
                    right: 0
                };
            }
        }
        
        // Android 노치 감지
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            const androidInsets = this.getAndroidSafeArea();
            if (androidInsets) {
                this.safeAreaInsets = androidInsets;
            }
        }
    }
    
    private applySafeAreaConstraints(): void {
        const canvas = cc.find('Canvas');
        if (!canvas) return;
        
        const widget = canvas.getComponent(cc.Widget);
        if (widget) {
            widget.top = this.safeAreaInsets.top;
            widget.bottom = this.safeAreaInsets.bottom;
            widget.left = this.safeAreaInsets.left;
            widget.right = this.safeAreaInsets.right;
            widget.updateAlignment();
        }
        
        // 상단 UI 요소들 조정
        this.adjustTopUI();
        
        // 하단 UI 요소들 조정
        this.adjustBottomUI();
    }
    
    private adjustTopUI(): void {
        const topPanel = cc.find('Canvas/TopPanel');
        if (topPanel) {
            const widget = topPanel.getComponent(cc.Widget);
            if (widget) {
                widget.top = this.safeAreaInsets.top + 10; // 추가 마진
                widget.updateAlignment();
            }
        }
        
        // 상태바 영역 UI 조정
        const statusBar = cc.find('Canvas/StatusBar');
        if (statusBar) {
            statusBar.y -= this.safeAreaInsets.top;
        }
    }
    
    private adjustBottomUI(): void {
        const bottomPanel = cc.find('Canvas/BottomPanel');
        if (bottomPanel) {
            const widget = bottomPanel.getComponent(cc.Widget);
            if (widget) {
                widget.bottom = this.safeAreaInsets.bottom + 10; // 추가 마진
                widget.updateAlignment();
            }
        }
        
        // 홈 인디케이터 영역 고려
        const homeIndicator = cc.find('Canvas/HomeIndicator');
        if (homeIndicator) {
            homeIndicator.y += this.safeAreaInsets.bottom;
        }
    }
    
    getSafeAreaInsets(): SafeAreaInsets {
        return { ...this.safeAreaInsets };
    }
    
    // 안전 영역을 고려한 위치 계산
    adjustPosition(position: cc.Vec2, anchor: AnchorPoint): cc.Vec2 {
        const adjustedPosition = position.clone();
        
        switch (anchor) {
            case AnchorPoint.TOP_LEFT:
                adjustedPosition.x += this.safeAreaInsets.left;
                adjustedPosition.y -= this.safeAreaInsets.top;
                break;
            case AnchorPoint.TOP_RIGHT:
                adjustedPosition.x -= this.safeAreaInsets.right;
                adjustedPosition.y -= this.safeAreaInsets.top;
                break;
            case AnchorPoint.BOTTOM_LEFT:
                adjustedPosition.x += this.safeAreaInsets.left;
                adjustedPosition.y += this.safeAreaInsets.bottom;
                break;
            case AnchorPoint.BOTTOM_RIGHT:
                adjustedPosition.x -= this.safeAreaInsets.right;
                adjustedPosition.y += this.safeAreaInsets.bottom;
                break;
        }
        
        return adjustedPosition;
    }
}
```

---

## 3. ♿ 접근성 시스템

### 스크린 리더 지원

#### 음성 안내 시스템
```typescript
export class AccessibilityManager {
    private static instance: AccessibilityManager;
    private screenReader: ScreenReader;
    private isScreenReaderEnabled: boolean = false;
    private focusManager: AccessibilityFocusManager;
    
    static getInstance(): AccessibilityManager {
        if (!this.instance) {
            this.instance = new AccessibilityManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.detectScreenReader();
        this.setupFocusManager();
        this.registerAccessibilityEvents();
    }
    
    private detectScreenReader(): void {
        // iOS VoiceOver 감지
        if (cc.sys.os === cc.sys.OS_IOS) {
            this.isScreenReaderEnabled = cc.sys.capabilities.hasOwnProperty('accessibility');
        }
        
        // Android TalkBack 감지
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Android 네이티브 코드를 통한 TalkBack 상태 확인
            this.isScreenReaderEnabled = this.checkAndroidTalkBack();
        }
        
        if (this.isScreenReaderEnabled) {
            this.initializeScreenReaderSupport();
        }
    }
    
    private initializeScreenReaderSupport(): void {
        this.screenReader = new ScreenReader();
        
        // 모든 UI 요소에 접근성 라벨 추가
        this.addAccessibilityLabels();
        
        // 키보드 네비게이션 활성화
        this.enableKeyboardNavigation();
        
        // 음성 피드백 시스템 활성화
        this.enableVoiceFeedback();
    }
    
    public announceText(text: string, priority: AnnouncementPriority = AnnouncementPriority.NORMAL): void {
        if (!this.isScreenReaderEnabled) return;
        
        this.screenReader.announce(text, priority);
    }
    
    public setAccessibilityLabel(node: cc.Node, label: string): void {
        if (!node) return;
        
        // 접근성 라벨을 노드에 저장
        node['accessibilityLabel'] = label;
        
        // 네이티브 플랫폼에 접근성 정보 전달
        if (cc.sys.isNative) {
            this.setNativeAccessibilityLabel(node, label);
        }
    }
    
    public setAccessibilityHint(node: cc.Node, hint: string): void {
        if (!node) return;
        
        node['accessibilityHint'] = hint;
        
        if (cc.sys.isNative) {
            this.setNativeAccessibilityHint(node, hint);
        }
    }
    
    private addAccessibilityLabels(): void {
        // 게임 보드 블록들
        const gameBoard = cc.find('Canvas/GameBoard');
        if (gameBoard) {
            const blocks = gameBoard.getComponentsInChildren(cc.Sprite);
            blocks.forEach((block, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                const color = this.getBlockColor(block);
                this.setAccessibilityLabel(block.node, `${color} 블록, ${row + 1}행 ${col + 1}열`);
                this.setAccessibilityHint(block.node, '탭하여 선택, 드래그하여 이동');
            });
        }
        
        // UI 버튼들
        const buttons = cc.find('Canvas').getComponentsInChildren(UIButton);
        buttons.forEach(button => {
            const buttonText = button.getComponentInChildren(cc.Label)?.string || '버튼';
            this.setAccessibilityLabel(button.node, buttonText);
            this.setAccessibilityHint(button.node, '탭하여 실행');
        });
        
        // 점수 및 상태 정보
        const scoreLabel = cc.find('Canvas/TopPanel/Score');
        if (scoreLabel) {
            this.setAccessibilityLabel(scoreLabel, '현재 점수');
        }
        
        const movesLabel = cc.find('Canvas/TopPanel/Moves');
        if (movesLabel) {
            this.setAccessibilityLabel(movesLabel, '남은 이동 횟수');
        }
    }
    
    private enableVoiceFeedback(): void {
        // 게임 이벤트에 대한 음성 피드백
        EventBus.getInstance().on('match_made', (data) => {
            const matchCount = data.matchCount;
            const blockType = data.blockType;
            this.announceText(`${blockType} 블록 ${matchCount}개 매치!`);
        });
        
        EventBus.getInstance().on('level_completed', (data) => {
            const score = data.score;
            const moves = data.movesUsed;
            this.announceText(`레벨 완료! 점수: ${score}, 사용한 이동: ${moves}회`, AnnouncementPriority.HIGH);
        });
        
        EventBus.getInstance().on('game_over', (data) => {
            this.announceText('게임 오버. 다시 시도하시겠습니까?', AnnouncementPriority.HIGH);
        });
        
        EventBus.getInstance().on('power_up_activated', (data) => {
            const powerUpName = data.powerUpName;
            this.announceText(`${powerUpName} 파워업 활성화!`);
        });
    }
}

// 스크린 리더 클래스
export class ScreenReader {
    private speechSynthesis: SpeechSynthesis;
    private currentVoice: SpeechSynthesisVoice;
    private speechQueue: SpeechRequest[] = [];
    private isSpeaking: boolean = false;
    
    constructor() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.speechSynthesis = window.speechSynthesis;
            this.setupVoice();
        }
    }
    
    private setupVoice(): void {
        const voices = this.speechSynthesis.getVoices();
        
        // 한국어 음성 찾기
        this.currentVoice = voices.find(voice => 
            voice.lang.startsWith('ko') || voice.name.includes('Korean')
        ) || voices[0];
    }
    
    announce(text: string, priority: AnnouncementPriority = AnnouncementPriority.NORMAL): void {
        const request: SpeechRequest = {
            text: text,
            priority: priority,
            timestamp: Date.now()
        };
        
        if (priority === AnnouncementPriority.HIGH) {
            // 높은 우선순위는 현재 음성을 중단하고 즉시 재생
            this.speechSynthesis.cancel();
            this.speechQueue.unshift(request);
        } else {
            this.speechQueue.push(request);
        }
        
        this.processSpeechQueue();
    }
    
    private processSpeechQueue(): void {
        if (this.isSpeaking || this.speechQueue.length === 0) {
            return;
        }
        
        const request = this.speechQueue.shift();
        if (!request) return;
        
        const utterance = new SpeechSynthesisUtterance(request.text);
        utterance.voice = this.currentVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
            this.isSpeaking = true;
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            // 다음 항목 처리
            setTimeout(() => this.processSpeechQueue(), 100);
        };
        
        utterance.onerror = () => {
            this.isSpeaking = false;
            console.error('Speech synthesis error');
        };
        
        this.speechSynthesis.speak(utterance);
    }
}
```

### 색상 대비 시스템

#### 색맹 지원 및 고대비 모드
```typescript
export enum ColorBlindnessType {
    NONE = 'none',
    PROTANOPIA = 'protanopia',     // 적색맹
    DEUTERANOPIA = 'deuteranopia', // 녹색맹
    TRITANOPIA = 'tritanopia',     // 청색맹
    PROTANOMALY = 'protanomaly',   // 적색약
    DEUTERANOMALY = 'deuteranomaly', // 녹색약
    TRITANOMALY = 'tritanomaly'    // 청색약
}

export class ColorBlindnessManager {
    private static instance: ColorBlindnessManager;
    private currentType: ColorBlindnessType = ColorBlindnessType.NONE;
    private isHighContrastMode: boolean = false;
    private colorFilters: Map<ColorBlindnessType, ColorFilter> = new Map();
    
    static getInstance(): ColorBlindnessManager {
        if (!this.instance) {
            this.instance = new ColorBlindnessManager();
        }
        return this.instance;
    }
    
    initialize(): void {
        this.setupColorFilters();
        this.loadUserPreferences();
    }
    
    setColorBlindnessType(type: ColorBlindnessType): void {
        this.currentType = type;
        this.applyColorFilters();
        this.saveUserPreferences();
        
        EventBus.getInstance().emit('color_blindness_changed', { type });
    }
    
    setHighContrastMode(enabled: boolean): void {
        this.isHighContrastMode = enabled;
        this.applyHighContrastColors();
        this.saveUserPreferences();
        
        EventBus.getInstance().emit('high_contrast_changed', { enabled });
    }
    
    private setupColorFilters(): void {
        // 적색맹 필터
        this.colorFilters.set(ColorBlindnessType.PROTANOPIA, {
            transform: (color: cc.Color) => {
                // 적색 채널을 녹색과 청색으로 재분배
                const r = 0.567 * color.r + 0.433 * color.g;
                const g = 0.558 * color.r + 0.442 * color.g;
                const b = 0.242 * color.g + 0.758 * color.b;
                return new cc.Color(r, g, b, color.a);
            }
        });
        
        // 녹색맹 필터
        this.colorFilters.set(ColorBlindnessType.DEUTERANOPIA, {
            transform: (color: cc.Color) => {
                const r = 0.625 * color.r + 0.375 * color.g;
                const g = 0.7 * color.r + 0.3 * color.g;
                const b = 0.3 * color.g + 0.7 * color.b;
                return new cc.Color(r, g, b, color.a);
            }
        });
        
        // 청색맹 필터
        this.colorFilters.set(ColorBlindnessType.TRITANOPIA, {
            transform: (color: cc.Color) => {
                const r = 0.95 * color.r + 0.05 * color.g;
                const g = 0.433 * color.g + 0.567 * color.b;
                const b = 0.475 * color.g + 0.525 * color.b;
                return new cc.Color(r, g, b, color.a);
            }
        });
    }
    
    private applyColorFilters(): void {
        if (this.currentType === ColorBlindnessType.NONE) {
            this.resetToOriginalColors();
            return;
        }
        
        const filter = this.colorFilters.get(this.currentType);
        if (!filter) return;
        
        // 게임 보드의 모든 블록 색상 변경
        const gameBoard = cc.find('Canvas/GameBoard');
        if (gameBoard) {
            const blockSprites = gameBoard.getComponentsInChildren(cc.Sprite);
            blockSprites.forEach(sprite => {
                if (sprite.node.name.includes('block')) {
                    const originalColor = this.getOriginalColor(sprite.node);
                    const filteredColor = filter.transform(originalColor);
                    sprite.color = filteredColor;
                }
            });
        }
        
        // UI 요소들의 색상도 변경
        this.applyFilterToUIElements(filter);
    }
    
    private applyHighContrastColors(): void {
        const gameBoard = cc.find('Canvas/GameBoard');
        if (!gameBoard) return;
        
        const blockSprites = gameBoard.getComponentsInChildren(cc.Sprite);
        
        if (this.isHighContrastMode) {
            // 고대비 색상 적용
            const highContrastColors = [
                cc.Color.BLACK,      // 검정
                cc.Color.WHITE,      // 흰색
                cc.Color.RED,        // 빨강
                cc.Color.YELLOW,     // 노랑
                cc.Color.BLUE,       // 파랑
                cc.Color.MAGENTA     // 자홍
            ];
            
            blockSprites.forEach((sprite, index) => {
                if (sprite.node.name.includes('block')) {
                    const colorIndex = this.getBlockTypeIndex(sprite.node);
                    sprite.color = highContrastColors[colorIndex % highContrastColors.length];
                    
                    // 추가적인 패턴/텍스처 적용
                    this.addPatternToBlock(sprite.node, colorIndex);
                }
            });
        } else {
            // 원래 색상으로 복원
            this.resetToOriginalColors();
        }
    }
    
    private addPatternToBlock(blockNode: cc.Node, patternIndex: number): void {
        // 색상 외에 패턴으로도 구분할 수 있도록 텍스처 추가
        const patterns = [
            'block_pattern_solid',
            'block_pattern_stripes',
            'block_pattern_dots',
            'block_pattern_diagonal',
            'block_pattern_cross',
            'block_pattern_grid'
        ];
        
        const patternSprite = blockNode.getChildByName('pattern');
        if (patternSprite) {
            const sprite = patternSprite.getComponent(cc.Sprite);
            const patternTexture = patterns[patternIndex % patterns.length];
            // 텍스처 로드 및 적용
            cc.resources.load(`textures/patterns/${patternTexture}`, cc.SpriteFrame, (err, spriteFrame) => {
                if (!err && sprite) {
                    sprite.spriteFrame = spriteFrame;
                    sprite.node.opacity = 150; // 반투명으로 적용
                }
            });
        }
    }
    
    // 색상 대비 비율 계산
    private calculateContrastRatio(color1: cc.Color, color2: cc.Color): number {
        const luminance1 = this.calculateLuminance(color1);
        const luminance2 = this.calculateLuminance(color2);
        
        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }
    
    private calculateLuminance(color: cc.Color): number {
        const r = this.sRGBtoLinear(color.r / 255);
        const g = this.sRGBtoLinear(color.g / 255);
        const b = this.sRGBtoLinear(color.b / 255);
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    private sRGBtoLinear(value: number): number {
        if (value <= 0.03928) {
            return value / 12.92;
        } else {
            return Math.pow((value + 0.055) / 1.055, 2.4);
        }
    }
    
    // WCAG AA 기준 (4.5:1) 준수 확인
    public checkColorCompliance(foreground: cc.Color, background: cc.Color): boolean {
        const contrastRatio = this.calculateContrastRatio(foreground, background);
        return contrastRatio >= 4.5;
    }
}
```

Sweet Puzzle의 UI/UX 시스템은 모든 사용자가 편안하고 직관적으로 게임을 즐길 수 있도록 설계되었습니다. 반응형 레이아웃, 접근성 기능, 그리고 개인화된 설정을 통해 다양한 환경과 요구사항에 맞는 최적의 사용자 경험을 제공합니다.