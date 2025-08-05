# Sweet Puzzle 구현 계획서: UI/UX 시스템

## 1. 🎯 구현 목표

이 문서는 `docs02/06-UI-UX-System-Design.md`에 정의된 **UI/UX 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 직관적이고 접근 가능한 사용자 인터페이스, 반응형 레이아웃, 접근성 기능, 애니메이션 시스템을 완성하여 모든 사용자가 편안하고 즐거운 게임 경험을 할 수 있도록 합니다.

---

## 2. 📁 구현 대상 핵심 파일

UI/UX 시스템 구현은 `assets/scripts/ui` 폴더를 중심으로 진행됩니다.

### 2.1. UI Core (UI 핵심)

```
assets/scripts/ui/
├── UIManager.ts                     # ✅ UI 시스템 총괄 관리자
├── ScreenManager.ts                 # ✅ 화면 관리 시스템
├── UIAnimationManager.ts            # ✅ UI 애니메이션 관리
├── InputManager.ts                  # ✅ 입력 관리 시스템
└── UIEventDispatcher.ts             # ✅ UI 이벤트 처리
```

### 2.2. Design System (디자인 시스템)

```
assets/scripts/ui/design/
├── ColorManager.ts                  # ✅ 색상 시스템 관리
├── TypographyManager.ts             # ✅ 타이포그래피 관리
├── ComponentLibrary.ts              # ✅ UI 컴포넌트 라이브러리
├── ThemeManager.ts                  # ✅ 테마 관리 시스템
└── StyleGuide.ts                    # ✅ 스타일 가이드 구현
```

### 2.3. Responsive Layout (반응형 레이아웃)

```
assets/scripts/ui/responsive/
├── ResponsiveLayoutManager.ts       # ✅ 반응형 레이아웃 관리
├── ScreenSizeDetector.ts            # ✅ 화면 크기 감지
├── SafeAreaManager.ts               # ✅ 세이프 에리어 관리
├── OrientationManager.ts            # ✅ 화면 회전 관리
└── LayoutAdapter.ts                 # ✅ 레이아웃 어댑터
```

### 2.4. Accessibility (접근성 시스템)

```
assets/scripts/ui/accessibility/
├── AccessibilityManager.ts          # ✅ 접근성 관리자
├── ScreenReader.ts                  # ✅ 스크린 리더 지원
├── ColorBlindnessManager.ts         # ✅ 색맹 지원 시스템
├── HighContrastMode.ts              # ✅ 고대비 모드
└── KeyboardNavigation.ts            # ✅ 키보드 네비게이션
```

### 2.5. Components (UI 컴포넌트)

```
assets/scripts/ui/components/
├── Button.ts                        # ✅ 버튼 컴포넌트
├── Panel.ts                         # ✅ 패널 컴포넌트
├── Dialog.ts                        # ✅ 대화상자 컴포넌트
├── LoadingIndicator.ts              # ✅ 로딩 인디케이터
├── ProgressBar.ts                   # ✅ 진행 바 컴포넌트
├── Toast.ts                         # ✅ 토스트 알림
├── TabView.ts                       # ✅ 탭 뷰 컴포넌트
└── ScrollView.ts                    # ✅ 스크롤 뷰 컴포넌트
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs02/06-UI-UX-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 디자인 시스템 기반 구축 (가장 중요)**
*   **기간:** 8일
*   **목표:** 일관된 디자인 시스템과 기본 UI 컴포넌트가 완성된다.
*   **작업 내용:**
    1.  **[Task 1.1]** `ColorManager.ts`: 색상 팔레트와 테마 시스템을 구현합니다.
        ```typescript
        export class ColorManager {
            private static instance: ColorManager;
            private currentTheme: ThemeType = ThemeType.LIGHT;
            private colorPalettes: Map<ThemeType, ColorPalette> = new Map();
            private customColors: Map<string, string> = new Map();
            
            static getInstance(): ColorManager {
                if (!this.instance) {
                    this.instance = new ColorManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.setupColorPalettes();
                this.loadCustomColors();
                this.applySystemTheme();
            }
            
            private setupColorPalettes(): void {
                // 라이트 테마 색상
                this.colorPalettes.set(ThemeType.LIGHT, {
                    primary: {
                        50: '#FFF5F7',
                        100: '#FFE4E9',
                        200: '#FFCCD7',
                        300: '#FF9FB3',
                        400: '#FF6B8A',
                        500: '#FF4081',  // 기본 핑크
                        600: '#E91E63',
                        700: '#C2185B',
                        800: '#AD1457',
                        900: '#880E4F'
                    },
                    secondary: {
                        50: '#F3E5F5',
                        100: '#E1BEE7',
                        200: '#CE93D8',
                        300: '#BA68C8',
                        400: '#AB47BC',
                        500: '#9C27B0',  // 기본 보라
                        600: '#8E24AA',
                        700: '#7B1FA2',
                        800: '#6A1B9A',
                        900: '#4A148C'
                    },
                    background: {
                        primary: '#FFFFFF',
                        secondary: '#F8F9FA',
                        tertiary: '#F1F3F4'
                    },
                    text: {
                        primary: '#212121',
                        secondary: '#757575',
                        disabled: '#BDBDBD',
                        hint: '#9E9E9E'
                    },
                    surface: {
                        primary: '#FFFFFF',
                        secondary: '#F5F5F5',
                        tertiary: '#EEEEEE'
                    }
                });
                
                // 다크 테마 색상
                this.colorPalettes.set(ThemeType.DARK, {
                    primary: {
                        50: '#FFEBEE',
                        100: '#FFCDD2',
                        200: '#EF9A9A',
                        300: '#E57373',
                        400: '#EF5350',
                        500: '#F44336',  // 다크모드 기본색
                        600: '#E53935',
                        700: '#D32F2F',
                        800: '#C62828',
                        900: '#B71C1C'
                    },
                    secondary: {
                        50: '#E8EAF6',
                        100: '#C5CAE9',
                        200: '#9FA8DA',
                        300: '#7986CB',
                        400: '#5C6BC0',
                        500: '#3F51B5',
                        600: '#3949AB',
                        700: '#303F9F',
                        800: '#283593',
                        900: '#1A237E'
                    },
                    background: {
                        primary: '#121212',
                        secondary: '#1E1E1E',
                        tertiary: '#2D2D2D'
                    },
                    text: {
                        primary: '#FFFFFF',
                        secondary: '#B3B3B3',
                        disabled: '#666666',
                        hint: '#888888'
                    },
                    surface: {
                        primary: '#1E1E1E',
                        secondary: '#2D2D2D',
                        tertiary: '#3D3D3D'
                    }
                });
            }
            
            getColor(colorKey: string, shade: number = 500): cc.Color {
                const palette = this.colorPalettes.get(this.currentTheme);
                if (!palette) {
                    return cc.Color.WHITE;
                }
                
                const colorPath = colorKey.split('.');
                let colorValue = palette;
                
                for (const path of colorPath) {
                    colorValue = colorValue[path];
                    if (!colorValue) {
                        return cc.Color.WHITE;
                    }
                }
                
                // 색상 값이 객체인 경우 (primary, secondary 등)
                if (typeof colorValue === 'object' && colorValue[shade]) {
                    return cc.Color.fromHEX(new cc.Color(), colorValue[shade]);
                }
                
                // 직접 색상 값인 경우
                if (typeof colorValue === 'string') {
                    return cc.Color.fromHEX(new cc.Color(), colorValue);
                }
                
                return cc.Color.WHITE;
            }
            
            setTheme(theme: ThemeType): void {
                if (this.currentTheme === theme) {
                    return;
                }
                
                this.currentTheme = theme;
                this.applyThemeColors();
                
                // 테마 변경 이벤트
                EventBus.getInstance().emit('theme_changed', {
                    newTheme: theme,
                    previousTheme: this.currentTheme
                });
                
                // 사용자 설정 저장
                PlayerPrefs.getInstance().setString('ui_theme', theme);
            }
            
            private applyThemeColors(): void {
                const palette = this.colorPalettes.get(this.currentTheme);
                if (!palette) return;
                
                // CSS 변수 업데이트 (웹 플랫폼용)
                if (cc.sys.platform === cc.sys.WECHAT_GAME || cc.sys.platform === cc.sys.WEB_DESKTOP) {
                    const root = document.documentElement;
                    
                    root.style.setProperty('--color-primary', palette.primary[500]);
                    root.style.setProperty('--color-secondary', palette.secondary[500]);
                    root.style.setProperty('--color-background', palette.background.primary);
                    root.style.setProperty('--color-text', palette.text.primary);
                    root.style.setProperty('--color-surface', palette.surface.primary);
                }
                
                // 모든 UI 컴포넌트에 테마 적용
                this.updateAllUIComponents();
            }
            
            private updateAllUIComponents(): void {
                const allNodes = cc.find('Canvas').getChildrenByName('');
                this.updateNodeColors(allNodes);
            }
            
            private updateNodeColors(nodes: cc.Node[]): void {
                for (const node of nodes) {
                    // 컴포넌트별 색상 업데이트
                    const themeComponent = node.getComponent('ThemeComponent');
                    if (themeComponent) {
                        themeComponent.updateTheme(this.currentTheme);
                    }
                    
                    // 자식 노드들도 재귀적으로 업데이트
                    if (node.children.length > 0) {
                        this.updateNodeColors(node.children);
                    }
                }
            }
            
            // 고대비 모드 지원
            enableHighContrast(enabled: boolean): void {
                if (enabled) {
                    // 고대비 색상으로 오버라이드
                    this.customColors.set('text.primary', '#000000');
                    this.customColors.set('background.primary', '#FFFFFF');
                    this.customColors.set('primary.500', '#0000FF');
                    this.customColors.set('secondary.500', '#FF0000');
                } else {
                    // 커스텀 색상 제거
                    this.customColors.clear();
                }
                
                this.applyThemeColors();
                
                EventBus.getInstance().emit('high_contrast_changed', {
                    enabled: enabled
                });
            }
        }
        ```
    2.  **[Task 1.2]** `TypographyManager.ts`: 폰트 시스템과 텍스트 스타일을 구현합니다.
    3.  **[Task 1.3]** `ComponentLibrary.ts`: 재사용 가능한 UI 컴포넌트 라이브러리를 구현합니다.
    4.  **[Task 1.4]** `Button.ts`: 다양한 스타일의 버튼 컴포넌트를 구현합니다.
    5.  **[Task 1.5]** **디자인 시스템 테스트:** 일관된 스타일과 컴포넌트가 정상 작동하는지 검증합니다.

### **Phase 2: 반응형 레이아웃 시스템**
*   **기간:** 7일
*   **목표:** 다양한 화면 크기와 해상도에 적응하는 레이아웃이 완성된다.
*   **작업 내용:**
    1.  **[Task 2.1]** `ResponsiveLayoutManager.ts`: 반응형 레이아웃의 핵심 관리를 구현합니다.
        ```typescript
        export class ResponsiveLayoutManager {
            private static instance: ResponsiveLayoutManager;
            private screenConfig: ScreenConfiguration;
            private layoutAdapters: Map<string, LayoutAdapter> = new Map();
            private breakpoints: BreakpointConfig;
            private currentBreakpoint: BreakpointType;
            
            static getInstance(): ResponsiveLayoutManager {
                if (!this.instance) {
                    this.instance = new ResponsiveLayoutManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.setupBreakpoints();
                this.detectScreenConfiguration();
                this.setupLayoutAdapters();
                this.applyResponsiveLayout();
                this.setupOrientationListener();
            }
            
            private setupBreakpoints(): void {
                this.breakpoints = {
                    xs: { minWidth: 0, maxWidth: 575 },      // 모바일 세로
                    sm: { minWidth: 576, maxWidth: 767 },    // 모바일 가로
                    md: { minWidth: 768, maxWidth: 991 },    // 태블릿
                    lg: { minWidth: 992, maxWidth: 1199 },   // 작은 데스크톱
                    xl: { minWidth: 1200, maxWidth: 9999 }   // 큰 데스크톱
                };
            }
            
            private detectScreenConfiguration(): void {
                const frameSize = cc.view.getFrameSize();
                const designResolution = cc.view.getDesignResolutionSize();
                const devicePixelRatio = window.devicePixelRatio || 1;
                
                this.screenConfig = {
                    width: frameSize.width,
                    height: frameSize.height,
                    designWidth: designResolution.width,
                    designHeight: designResolution.height,
                    aspectRatio: frameSize.width / frameSize.height,
                    devicePixelRatio: devicePixelRatio,
                    orientation: frameSize.width > frameSize.height ? 'landscape' : 'portrait',
                    safeArea: this.detectSafeArea()
                };
                
                // 현재 브레이크포인트 결정
                this.currentBreakpoint = this.determineBreakpoint(frameSize.width);
            }
            
            private determineBreakpoint(width: number): BreakpointType {
                for (const [name, config] of Object.entries(this.breakpoints)) {
                    if (width >= config.minWidth && width <= config.maxWidth) {
                        return name as BreakpointType;
                    }
                }
                return 'md'; // 기본값
            }
            
            private setupLayoutAdapters(): void {
                // 게임 메인 화면 어댑터
                this.layoutAdapters.set('main_game', new MainGameLayoutAdapter());
                
                // 메뉴 화면 어댑터
                this.layoutAdapters.set('menu', new MenuLayoutAdapter());
                
                // 팝업 어댑터
                this.layoutAdapters.set('popup', new PopupLayoutAdapter());
                
                // HUD 어댑터
                this.layoutAdapters.set('hud', new HUDLayoutAdapter());
            }
            
            applyResponsiveLayout(): void {
                // 현재 화면의 모든 레이아웃 어댑터 적용
                for (const [name, adapter] of this.layoutAdapters) {
                    try {
                        adapter.adapt(this.screenConfig, this.currentBreakpoint);
                    } catch (error) {
                        console.error(`Failed to apply layout adapter ${name}:`, error);
                    }
                }
                
                // 글꼴 크기 조정
                this.adjustFontSizes();
                
                // 터치 영역 크기 조정
                this.adjustTouchAreas();
                
                // 레이아웃 변경 이벤트
                EventBus.getInstance().emit('layout_changed', {
                    screenConfig: this.screenConfig,
                    breakpoint: this.currentBreakpoint
                });
            }
            
            private adjustFontSizes(): void {
                const scaleFactor = this.calculateFontScaleFactor();
                const textNodes = this.findAllTextNodes();
                
                for (const node of textNodes) {
                    const label = node.getComponent(cc.Label);
                    if (label && label.node.name.includes('responsive')) {
                        const originalSize = label.fontSize;
                        const newSize = Math.max(12, Math.floor(originalSize * scaleFactor));
                        label.fontSize = newSize;
                    }
                }
            }
            
            private calculateFontScaleFactor(): number {
                const baseWidth = 768; // 기준 해상도
                const currentWidth = this.screenConfig.width;
                
                let scaleFactor = currentWidth / baseWidth;
                
                // 브레이크포인트별 조정
                switch (this.currentBreakpoint) {
                    case 'xs':
                        scaleFactor *= 0.8;
                        break;
                    case 'sm':
                        scaleFactor *= 0.9;
                        break;
                    case 'lg':
                        scaleFactor *= 1.1;
                        break;
                    case 'xl':
                        scaleFactor *= 1.2;
                        break;
                }
                
                return Math.max(0.6, Math.min(1.4, scaleFactor));
            }
            
            private adjustTouchAreas(): void {
                const minTouchSize = this.getMinTouchSize();
                const buttons = this.findAllButtons();
                
                for (const button of buttons) {
                    const currentSize = button.node.getContentSize();
                    
                    if (currentSize.width < minTouchSize || currentSize.height < minTouchSize) {
                        // 터치 영역 확장 (투명한 히트박스)
                        this.expandTouchArea(button.node, minTouchSize);
                    }
                }
            }
            
            private getMinTouchSize(): number {
                // 플랫폼별 최소 터치 영역
                switch (cc.sys.platform) {
                    case cc.sys.ANDROID:
                    case cc.sys.IPHONE:
                    case cc.sys.IPAD:
                        return 44; // 44pt (iOS 가이드라인)
                    default:
                        return 32; // 32px (데스크톱)
                }
            }
            
            private setupOrientationListener(): void {
                // 화면 회전 감지
                cc.view.setResizeCallback(() => {
                    const previousBreakpoint = this.currentBreakpoint;
                    this.detectScreenConfiguration();
                    
                    // 브레이크포인트가 변경된 경우에만 레이아웃 재적용
                    if (this.currentBreakpoint !== previousBreakpoint) {
                        this.applyResponsiveLayout();
                    }
                });
                
                // 모바일 기기의 방향 변경 감지
                if (cc.sys.isMobile) {
                    window.addEventListener('orientationchange', () => {
                        // 방향 변경 후 약간의 지연을 두고 레이아웃 재적용
                        setTimeout(() => {
                            this.detectScreenConfiguration();
                            this.applyResponsiveLayout();
                        }, 100);
                    });
                }
            }
        }
        
        // 메인 게임 화면 레이아웃 어댑터
        export class MainGameLayoutAdapter implements LayoutAdapter {
            adapt(screenConfig: ScreenConfiguration, breakpoint: BreakpointType): void {
                const gameBoard = cc.find('Canvas/GameBoard');
                const topHUD = cc.find('Canvas/TopHUD');
                const bottomHUD = cc.find('Canvas/BottomHUD');
                
                if (!gameBoard || !topHUD || !bottomHUD) return;
                
                // 브레이크포인트별 레이아웃 조정
                switch (breakpoint) {
                    case 'xs':
                    case 'sm':
                        this.applyMobileLayout(gameBoard, topHUD, bottomHUD, screenConfig);
                        break;
                    case 'md':
                        this.applyTabletLayout(gameBoard, topHUD, bottomHUD, screenConfig);
                        break;
                    case 'lg':
                    case 'xl':
                        this.applyDesktopLayout(gameBoard, topHUD, bottomHUD, screenConfig);
                        break;
                }
            }
            
            private applyMobileLayout(
                gameBoard: cc.Node, 
                topHUD: cc.Node, 
                bottomHUD: cc.Node, 
                screenConfig: ScreenConfiguration
            ): void {
                // 세로 화면 최적화
                const availableHeight = screenConfig.height - screenConfig.safeArea.top - screenConfig.safeArea.bottom;
                const hudHeight = 80;
                const boardHeight = availableHeight - (hudHeight * 2) - 40; // 여백 40px
                
                // 게임 보드 크기 및 위치
                const boardSize = Math.min(screenConfig.width * 0.9, boardHeight);
                gameBoard.setContentSize(boardSize, boardSize);
                gameBoard.setPosition(0, (hudHeight - 20));
                
                // 상단 HUD
                topHUD.setPosition(0, (availableHeight / 2) - (hudHeight / 2) - screenConfig.safeArea.top);
                
                // 하단 HUD
                bottomHUD.setPosition(0, -(availableHeight / 2) + (hudHeight / 2) + screenConfig.safeArea.bottom);
            }
        }
        ```
    2.  **[Task 2.2]** `SafeAreaManager.ts`: 노치와 홈 인디케이터 대응을 구현합니다.
    3.  **[Task 2.3]** `ScreenSizeDetector.ts`: 다양한 화면 크기 감지와 분류를 구현합니다.
    4.  **[Task 2.4]** `LayoutAdapter.ts`: 화면별 맞춤형 레이아웃 어댑터를 구현합니다.
    5.  **[Task 2.5]** **반응형 시스템 테스트:** 다양한 화면에서 레이아웃이 적절히 조정되는지 검증합니다.

### **Phase 3: 접근성 시스템 구현**
*   **기간:** 6일
*   **목표:** 시각 장애인과 색맹 사용자를 위한 접근성 기능이 완성된다.
*   **작업 내용:**
    1.  **[Task 3.1]** `AccessibilityManager.ts`: 접근성 기능의 통합 관리를 구현합니다.
        ```typescript
        export class AccessibilityManager {
            private static instance: AccessibilityManager;
            private isScreenReaderEnabled: boolean = false;
            private isHighContrastEnabled: boolean = false;
            private colorBlindnessType: ColorBlindnessType = ColorBlindnessType.NONE;
            private screenReader: ScreenReader;
            private focusManager: FocusManager;
            
            static getInstance(): AccessibilityManager {
                if (!this.instance) {
                    this.instance = new AccessibilityManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.detectAccessibilityFeatures();
                this.setupScreenReader();
                this.setupFocusManager();
                this.loadUserPreferences();
                this.registerGameEventHandlers();
            }
            
            private detectAccessibilityFeatures(): void {
                // iOS VoiceOver 감지
                if (cc.sys.os === cc.sys.OS_IOS) {
                    // iOS 네이티브 코드를 통한 VoiceOver 상태 확인
                    const isVoiceOverRunning = this.checkiOSVoiceOver();
                    this.setScreenReaderEnabled(isVoiceOverRunning);
                }
                
                // Android TalkBack 감지
                if (cc.sys.os === cc.sys.OS_ANDROID) {
                    const isTalkBackEnabled = this.checkAndroidTalkBack();
                    this.setScreenReaderEnabled(isTalkBackEnabled);
                }
                
                // 웹 브라우저의 접근성 API 확인
                if (cc.sys.platform === cc.sys.WECHAT_GAME || cc.sys.platform === cc.sys.WEB_DESKTOP) {
                    this.checkWebAccessibilityAPIs();
                }
            }
            
            setScreenReaderEnabled(enabled: boolean): void {
                if (this.isScreenReaderEnabled === enabled) return;
                
                this.isScreenReaderEnabled = enabled;
                
                if (enabled) {
                    this.enableScreenReaderSupport();
                } else {
                    this.disableScreenReaderSupport();
                }
                
                EventBus.getInstance().emit('screen_reader_changed', {
                    enabled: enabled
                });
            }
            
            private enableScreenReaderSupport(): void {
                // 모든 UI 요소에 접근성 라벨 추가
                this.addAccessibilityLabels();
                
                // 키보드 네비게이션 활성화
                this.focusManager.enableKeyboardNavigation();
                
                // 음성 피드백 시스템 활성화
                this.screenReader.setEnabled(true);
                
                // 게임 상태 변화 음성 안내 활성화
                this.enableVoiceGuidance();
            }
            
            private addAccessibilityLabels(): void {
                // 게임 보드의 모든 블록에 라벨 추가
                this.labelGameBlocks();
                
                // UI 버튼들에 라벨 추가
                this.labelUIButtons();
                
                // 게임 상태 정보에 라벨 추가
                this.labelGameStatus();
            }
            
            private labelGameBlocks(): void {
                const gameBoard = cc.find('Canvas/GameBoard');
                if (!gameBoard) return;
                
                const blocks = gameBoard.getComponentsInChildren('Block');
                blocks.forEach((block, index) => {
                    const row = Math.floor(index / 8);
                    const col = index % 8;
                    const blockType = block.getBlockType();
                    const color = this.getBlockColorName(blockType);
                    
                    this.setAccessibilityLabel(
                        block.node,
                        `${color} 블록, ${row + 1}행 ${col + 1}열`
                    );
                    
                    this.setAccessibilityHint(
                        block.node,
                        '탭하여 선택, 드래그하여 이동'
                    );
                    
                    // 특수 블록인 경우 추가 정보
                    if (block.isSpecialBlock()) {
                        const specialType = block.getSpecialType();
                        this.setAccessibilityLabel(
                            block.node,
                            `${this.getSpecialBlockName(specialType)} 특수 블록, ${row + 1}행 ${col + 1}열`
                        );
                        
                        this.setAccessibilityHint(
                            block.node,
                            `${this.getSpecialBlockDescription(specialType)}`
                        );
                    }
                });
            }
            
            announceText(text: string, priority: AnnouncementPriority = AnnouncementPriority.NORMAL): void {
                if (!this.isScreenReaderEnabled) return;
                
                this.screenReader.announce(text, priority);
            }
            
            private enableVoiceGuidance(): void {
                // 매치 성공 시 음성 안내
                EventBus.getInstance().on('blocks_matched', (data) => {
                    const matchCount = data.blocks.length;
                    const blockType = data.blockType;
                    const color = this.getBlockColorName(blockType);
                    
                    this.announceText(`${color} 블록 ${matchCount}개 매치 성공!`);
                });
                
                // 특수 블록 생성 시 음성 안내
                EventBus.getInstance().on('special_block_created', (data) => {
                    const specialType = data.specialType;
                    const specialName = this.getSpecialBlockName(specialType);
                    
                    this.announceText(`${specialName} 생성됨!`, AnnouncementPriority.HIGH);
                });
                
                // 레벨 완료 시 음성 안내
                EventBus.getInstance().on('level_completed', (data) => {
                    const score = data.score;
                    const stars = data.stars;
                    
                    this.announceText(
                        `레벨 완료! 점수: ${score}, 별 ${stars}개 획득`,
                        AnnouncementPriority.HIGH
                    );
                });
                
                // 게임 오버 시 음성 안내
                EventBus.getInstance().on('game_over', () => {
                    this.announceText(
                        '게임 오버. 다시 시도하시겠습니까?',
                        AnnouncementPriority.HIGH
                    );
                });
            }
            
            // 색맹 지원 기능
            setColorBlindnessType(type: ColorBlindnessType): void {
                if (this.colorBlindnessType === type) return;
                
                this.colorBlindnessType = type;
                
                // 색상 필터 적용
                ColorBlindnessManager.getInstance().setColorBlindnessType(type);
                
                // 패턴 오버레이 활성화
                if (type !== ColorBlindnessType.NONE) {
                    this.enablePatternOverlays();
                } else {
                    this.disablePatternOverlays();
                }
                
                EventBus.getInstance().emit('color_blindness_changed', {
                    type: type
                });
            }
            
            private enablePatternOverlays(): void {
                const gameBoard = cc.find('Canvas/GameBoard');
                if (!gameBoard) return;
                
                const blocks = gameBoard.getComponentsInChildren('Block');
                blocks.forEach((block) => {
                    const blockType = block.getBlockType();
                    const patternType = this.getPatternForBlockType(blockType);
                    
                    // 패턴 오버레이 추가
                    this.addPatternOverlay(block.node, patternType);
                });
            }
            
            private getPatternForBlockType(blockType: BlockType): PatternType {
                const patterns = {
                    [BlockType.RED]: PatternType.SOLID,
                    [BlockType.BLUE]: PatternType.STRIPES,
                    [BlockType.GREEN]: PatternType.DOTS,
                    [BlockType.YELLOW]: PatternType.DIAGONAL,
                    [BlockType.PURPLE]: PatternType.CROSS,
                    [BlockType.ORANGE]: PatternType.GRID
                };
                
                return patterns[blockType] || PatternType.SOLID;
            }
        }
        ```
    2.  **[Task 3.2]** `ScreenReader.ts`: 스크린 리더와 음성 안내 시스템을 구현합니다.
    3.  **[Task 3.3]** `ColorBlindnessManager.ts`: 색맹 지원과 패턴 오버레이를 구현합니다.
    4.  **[Task 3.4]** `KeyboardNavigation.ts`: 키보드를 통한 게임조작을 구현합니다.
    5.  **[Task 3.5]** **접근성 시스템 테스트:** 접근성 기능이 실제로 사용자에게 도움이 되는지 검증합니다.

### **Phase 4: 애니메이션 및 인터랙션**
*   **기간:** 7일
*   **목표:** 부드럽고 직관적인 UI 애니메이션과 피드백이 완성된다.
*   **작업 내용:**
    1.  **[Task 4.1]** `UIAnimationManager.ts`: UI 애니메이션의 통합 관리를 구현합니다.
        ```typescript
        export class UIAnimationManager {
            private static instance: UIAnimationManager;
            private animationQueue: UIAnimation[] = [];
            private activeAnimations: Map<string, cc.Tween> = new Map();
            private animationSettings: AnimationSettings;
            
            static getInstance(): UIAnimationManager {
                if (!this.instance) {
                    this.instance = new UIAnimationManager();
                }
                return this.instance;
            }
            
            initialize(): void {
                this.loadAnimationSettings();
                this.setupAnimationPresets();
            }
            
            private loadAnimationSettings(): void {
                const userPrefs = PlayerPrefs.getInstance();
                
                this.animationSettings = {
                    enableAnimations: userPrefs.getBool('ui_animations_enabled', true),
                    animationSpeed: userPrefs.getFloat('ui_animation_speed', 1.0),
                    reduceMotion: userPrefs.getBool('ui_reduce_motion', false),
                    enableParticles: userPrefs.getBool('ui_particles_enabled', true)
                };
                
                // 접근성 설정에 따른 조정
                if (this.animationSettings.reduceMotion) {
                    this.animationSettings.animationSpeed *= 0.5;
                    this.animationSettings.enableParticles = false;
                }
            }
            
            // 페이드 인 애니메이션
            fadeIn(node: cc.Node, duration: number = 0.3, delay: number = 0): Promise<void> {
                return new Promise<void>((resolve) => {
                    if (!this.animationSettings.enableAnimations) {
                        node.opacity = 255;
                        resolve();
                        return;
                    }
                    
                    node.opacity = 0;
                    
                    const tween = cc.tween(node)
                        .delay(delay)
                        .to(duration * this.animationSettings.animationSpeed, { opacity: 255 })
                        .call(() => {
                            this.activeAnimations.delete(node.uuid);
                            resolve();
                        });
                    
                    this.activeAnimations.set(node.uuid, tween);
                    tween.start();
                });
            }
            
            // 스케일 애니메이션
            scaleIn(node: cc.Node, duration: number = 0.3, overshoot: number = 1.1): Promise<void> {
                return new Promise<void>((resolve) => {
                    if (!this.animationSettings.enableAnimations) {
                        node.scale = 1;
                        resolve();
                        return;
                    }
                    
                    node.scale = 0;
                    
                    const tween = cc.tween(node)
                        .to(duration * 0.7 * this.animationSettings.animationSpeed, { scale: overshoot })
                        .to(duration * 0.3 * this.animationSettings.animationSpeed, { scale: 1 })
                        .call(() => {
                            this.activeAnimations.delete(node.uuid);
                            resolve();
                        });
                    
                    this.activeAnimations.set(node.uuid, tween);
                    tween.start();
                });
            }
            
            // 슬라이드 인 애니메이션
            slideIn(
                node: cc.Node, 
                direction: SlideDirection, 
                duration: number = 0.4,
                distance: number = 300
            ): Promise<void> {
                return new Promise<void>((resolve) => {
                    if (!this.animationSettings.enableAnimations) {
                        resolve();
                        return;
                    }
                    
                    const originalPosition = node.position.clone();
                    let startPosition: cc.Vec3;
                    
                    switch (direction) {
                        case SlideDirection.FROM_LEFT:
                            startPosition = cc.v3(originalPosition.x - distance, originalPosition.y, 0);
                            break;
                        case SlideDirection.FROM_RIGHT:
                            startPosition = cc.v3(originalPosition.x + distance, originalPosition.y, 0);
                            break;
                        case SlideDirection.FROM_TOP:
                            startPosition = cc.v3(originalPosition.x, originalPosition.y + distance, 0);
                            break;
                        case SlideDirection.FROM_BOTTOM:
                            startPosition = cc.v3(originalPosition.x, originalPosition.y - distance, 0);
                            break;
                    }
                    
                    node.position = startPosition;
                    
                    const tween = cc.tween(node)
                        .to(duration * this.animationSettings.animationSpeed, { position: originalPosition })
                        .call(() => {
                            this.activeAnimations.delete(node.uuid);
                            resolve();
                        });
                    
                    this.activeAnimations.set(node.uuid, tween);
                    tween.start();
                });
            }
            
            // 버튼 터치 애니메이션
            buttonPress(node: cc.Node): Promise<void> {
                return new Promise<void>((resolve) => {
                    if (!this.animationSettings.enableAnimations) {
                        resolve();
                        return;
                    }
                    
                    const originalScale = node.scale;
                    
                    const tween = cc.tween(node)
                        .to(0.1 * this.animationSettings.animationSpeed, { scale: originalScale * 0.95 })
                        .to(0.1 * this.animationSettings.animationSpeed, { scale: originalScale * 1.05 })
                        .to(0.1 * this.animationSettings.animationSpeed, { scale: originalScale })
                        .call(() => {
                            this.activeAnimations.delete(node.uuid);
                            resolve();
                        });
                    
                    this.activeAnimations.set(node.uuid, tween);
                    tween.start();
                });
            }
            
            // 숫자 카운트업 애니메이션
            countUp(labelNode: cc.Node, fromValue: number, toValue: number, duration: number = 1.0): Promise<void> {
                return new Promise<void>((resolve) => {
                    const label = labelNode.getComponent(cc.Label);
                    if (!label) {
                        resolve();
                        return;
                    }
                    
                    if (!this.animationSettings.enableAnimations) {
                        label.string = toValue.toString();
                        resolve();
                        return;
                    }
                    
                    let currentValue = fromValue;
                    const difference = toValue - fromValue;
                    const steps = 60; // 60 FPS
                    const increment = difference / (duration * this.animationSettings.animationSpeed * steps);
                    
                    const updateCounter = () => {
                        currentValue += increment;
                        
                        if ((increment > 0 && currentValue >= toValue) || 
                            (increment < 0 && currentValue <= toValue)) {
                            currentValue = toValue;
                            label.string = Math.floor(currentValue).toString();
                            resolve();
                            return;
                        }
                        
                        label.string = Math.floor(currentValue).toString();
                        
                        // 다음 프레임에서 계속
                        requestAnimationFrame(updateCounter);
                    };
                    
                    updateCounter();
                });
            }
            
            // 파티클 효과와 함께하는 축하 애니메이션
            celebrate(centerPosition: cc.Vec3, intensity: number = 1.0): void {
                if (!this.animationSettings.enableAnimations || !this.animationSettings.enableParticles) {
                    return;
                }
                
                // 컨페티 파티클 효과
                this.createConfettiEffect(centerPosition, intensity);
                
                // 화면 진동 효과
                this.shakeScreen(0.3, intensity * 10);
                
                // 스타 버스트 효과
                this.createStarBurst(centerPosition, intensity);
            }
            
            private createConfettiEffect(position: cc.Vec3, intensity: number): void {
                const confettiCount = Math.floor(20 * intensity);
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
                
                for (let i = 0; i < confettiCount; i++) {
                    const confetti = new cc.Node('confetti');
                    const sprite = confetti.addComponent(cc.Sprite);
                    
                    // 랜덤 색상 적용
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    sprite.node.color = cc.Color.fromHEX(new cc.Color(), randomColor);
                    
                    // 초기 위치
                    confetti.position = position;
                    
                    // 랜덤 방향과 속도
                    const angle = Math.random() * Math.PI * 2;
                    const speed = (50 + Math.random() * 100) * intensity;
                    const targetX = position.x + Math.cos(angle) * speed;
                    const targetY = position.y + Math.sin(angle) * speed;
                    
                    // 컨페티 애니메이션
                    cc.tween(confetti)
                        .parallel(
                            cc.tween().to(1.5, { position: cc.v3(targetX, targetY - 200, 0) }),
                            cc.tween().by(1.5, { angle: 720 }),
                            cc.tween().to(1.5, { opacity: 0 })
                        )
                        .call(() => {
                            confetti.removeFromParent();
                        })
                        .start();
                    
                    cc.find('Canvas').addChild(confetti);
                }
            }
            
            private shakeScreen(duration: number, intensity: number): void {
                const canvas = cc.find('Canvas');
                if (!canvas) return;
                
                const originalPosition = canvas.position.clone();
                const shakeCount = Math.floor(duration * 30); // 30 FPS
                
                for (let i = 0; i < shakeCount; i++) {
                    const shakeX = (Math.random() - 0.5) * intensity;
                    const shakeY = (Math.random() - 0.5) * intensity;
                    
                    cc.tween(canvas)
                        .delay(i * (duration / shakeCount))
                        .to(duration / shakeCount / 2, { 
                            position: cc.v3(originalPosition.x + shakeX, originalPosition.y + shakeY, 0) 
                        })
                        .to(duration / shakeCount / 2, { position: originalPosition })
                        .start();
                }
            }
        }
        ```
    2.  **[Task 4.2]** `InputManager.ts`: 터치와 제스처 인식을 구현합니다.
    3.  **[Task 4.3]** **햅틱 피드백 시스템:** 터치 피드백과 진동을 구현합니다.
    4.  **[Task 4.4]** **로딩 및 전환 애니메이션:** 화면 전환과 로딩 애니메이션을 구현합니다.
    5.  **[Task 4.5]** **애니메이션 시스템 테스트:** 모든 애니메이션이 부드럽고 적절히 작동하는지 검증합니다.

### **Phase 5: 고급 UI 기능**
*   **기간:** 4일
*   **목표:** 고급 UI 컴포넌트와 인터랙션이 완성된다.
*   **작업 내용:**
    1.  **[Task 5.1]** **다이얼로그 시스템:** 모달과 비모달 다이얼로그를 구현합니다.
    2.  **[Task 5.2]** **알림 시스템:** 토스트, 배너, 팝업 알림을 구현합니다.
    3.  **[Task 5.3]** **설정 화면:** 접근성과 UI 설정을 관리하는 화면을 구현합니다.
    4.  **[Task 5.4]** **성능 최적화:** UI 렌더링과 애니메이션 성능을 최적화합니다.
    5.  **[Task 5.5]** **통합 UI 시스템 테스트:** 모든 UI 기능이 통합되어 완벽하게 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 테마 시스템

```typescript
// 동적 테마 전환 시스템
export class ThemeManager {
    private themes: Map<string, Theme> = new Map();
    
    registerTheme(name: string, theme: Theme): void {
        this.themes.set(name, theme);
    }
    
    async applyTheme(themeName: string): Promise<void> {
        const theme = this.themes.get(themeName);
        if (!theme) return;
        
        // 애니메이션과 함께 테마 전환
        await this.animateThemeTransition(theme);
        
        // 색상 적용
        ColorManager.getInstance().applyThemeColors(theme.colors);
        
        // 폰트 적용
        TypographyManager.getInstance().applyThemeFonts(theme.typography);
    }
}
```

### 4.2. 성능 최적화

```typescript
// UI 렌더링 최적화
export class UIPerformanceOptimizer {
    private renderPool: Map<string, cc.Node[]> = new Map();
    
    optimizeUIRendering(): void {
        // 보이지 않는 UI 요소 비활성화
        this.cullInvisibleElements();
        
        // UI 요소 풀링
        this.enableUIPooling();
        
        // 배치 렌더링
        this.enableBatchRendering();
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **설계 문서 완벽 준수:** `06-UI-UX-System-Design.md`에 정의된 모든 UI/UX 기능을 정확히 구현합니다.

2.  **접근성 우선:** 모든 사용자가 편리하게 이용할 수 있는 포용적 디자인을 구현합니다.

3.  **성능 최적화:** 부드러운 60FPS UI 애니메이션과 빠른 반응성을 보장합니다.

4.  **일관성 유지:** 디자인 시스템을 통한 일관된 사용자 경험을 제공합니다.

5.  **플랫폼 최적화:** 각 플랫폼의 특성에 맞는 최적화된 UI/UX를 제공합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **UI 반응 시간:** 터치 입력 후 100ms 이내 반응
- **애니메이션 프레임률:** 안정적 60FPS 유지  
- **화면 전환 시간:** 300ms 이내 완료
- **메모리 사용량:** UI 시스템이 30MB 이하 사용

### 6.2. 검증 기준
- 모든 화면 크기에서 적절한 레이아웃 제공
- 접근성 기능이 실제로 도움이 됨
- 색맹 사용자도 게임을 완전히 즐길 수 있음
- 스크린 리더가 모든 요소를 정확히 읽음
- 다양한 기기에서 일관된 사용자 경험 제공

이 구현 계획을 통해 Sweet Puzzle의 UI/UX 시스템을 완성하여 모든 사용자가 편안하고 즐거운 게임 경험을 할 수 있는 최고 수준의 인터페이스를 제공할 수 있을 것입니다.