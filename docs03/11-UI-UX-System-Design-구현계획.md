# UI/UX 시스템 구현계획

## 문서 정보
- **문서명**: UI/UX 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [UI 프레임워크](#3-ui-프레임워크)
4. [모바일 최적화](#4-모바일-최적화)
5. [접근성 구현](#5-접근성-구현)

## 1. 구현 개요

### 1.1 기술 스택
- **UI 프레임워크**: Cocos Creator 3.x UI System
- **애니메이션**: Tween.js + Spine2D
- **폰트**: 동적 폰트 로딩 시스템
- **지역화**: i18next
- **접근성**: Custom Accessibility API

### 1.2 설계 목표
- **반응 시간**: 16ms 이하 (60FPS 유지)
- **메모리 사용**: UI 당 50MB 이하
- **로딩 시간**: 화면 전환 1초 이내
- **접근성**: WCAG 2.1 AA 준수

## 2. 개발 일정

### 2.1 Phase 1: 기본 UI 시스템 (4주)
```typescript
const phase1Tasks = {
  week1: ['UI 프레임워크 구축', '기본 컴포넌트'],
  week2: ['레이아웃 시스템', '테마 시스템'],
  week3: ['애니메이션 시스템', '상태 관리'],
  week4: ['게임 화면 구현', '테스트']
};
```

### 2.2 Phase 2: 고급 기능 (3주)
```typescript
const phase2Tasks = {
  week1: ['모바일 최적화', '터치 제스처'],
  week2: ['접근성 기능', '다국어 지원'],
  week3: ['성능 최적화', '메모리 관리']
};
```

### 2.3 Phase 3: 완성도 (2주)
```typescript
const phase3Tasks = {
  week1: ['UI 폴리싱', '사용성 테스트'],
  week2: ['최종 최적화', '런칭 준비']
};
```

## 3. UI 프레임워크

### 3.1 컴포넌트 시스템
```typescript
// [의도] 재사용 가능한 UI 컴포넌트 시스템
// [책임] 컴포넌트 생성, 상태 관리, 이벤트 처리
export abstract class UIComponent extends Node {
  protected componentId: string;
  protected state: ComponentState;
  protected eventManager: EventManager;
  protected animationController: AnimationController;
  
  constructor(config: ComponentConfig) {
    super();
    this.componentId = config.id || this.generateId();
    this.state = new ComponentState(config.initialState);
    this.eventManager = new EventManager();
    this.animationController = new AnimationController();
    
    this.initialize(config);
    this.setupEventListeners();
  }
  
  protected abstract initialize(config: ComponentConfig): void;
  
  protected setupEventListeners(): void {
    // 터치/클릭 이벤트
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    
    // 상태 변경 이벤트
    this.state.on('changed', this.onStateChanged, this);
  }
  
  setState(newState: Partial<ComponentState>): void {
    const oldState = this.state.clone();
    this.state.update(newState);
    
    this.onStateUpdated(oldState, this.state);
  }
  
  protected onStateUpdated(oldState: ComponentState, newState: ComponentState): void {
    // 상태 변경에 따른 UI 업데이트
    this.updateAppearance(newState);
    
    // 애니메이션 트리거
    if (this.shouldAnimate(oldState, newState)) {
      this.playStateTransition(oldState, newState);
    }
  }
  
  protected abstract updateAppearance(state: ComponentState): void;
  
  protected playStateTransition(
    from: ComponentState, 
    to: ComponentState
  ): Promise<void> {
    return this.animationController.playTransition(from, to);
  }
  
  // 터치 이벤트 처리
  protected onTouchStart(event: EventTouch): void {
    this.setState({ touched: true });
    this.playTouchStartAnimation();
  }
  
  protected onTouchEnd(event: EventTouch): void {
    this.setState({ touched: false });
    this.playTouchEndAnimation();
    
    if (this.isValidClick(event)) {
      this.onClick(event);
    }
  }
  
  protected abstract onClick(event: EventTouch): void;
  
  // 애니메이션 메서드
  protected playTouchStartAnimation(): void {
    tween(this.node)
      .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
      .start();
  }
  
  protected playTouchEndAnimation(): void {
    tween(this.node)
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .start();
  }
  
  // 메모리 관리
  destroy(): void {
    this.eventManager.removeAllListeners();
    this.animationController.stop();
    this.state.destroy();
    super.destroy();
  }
}

// 버튼 컴포넌트 구현
export class GameButton extends UIComponent {
  private label: Label;
  private background: Sprite;
  private icon: Sprite;
  
  protected initialize(config: ButtonConfig): void {
    this.createBackground(config.style);
    this.createLabel(config.text);
    
    if (config.icon) {
      this.createIcon(config.icon);
    }
    
    this.updateAppearance(this.state);
  }
  
  private createBackground(style: ButtonStyle): void {
    const bgNode = new Node('background');
    this.background = bgNode.addComponent(Sprite);
    
    // 9-slice 스프라이트 설정
    this.background.type = Sprite.Type.SLICED;
    this.background.spriteFrame = style.backgroundSprite;
    
    bgNode.setParent(this.node);
  }
  
  private createLabel(text: string): void {
    const labelNode = new Node('label');
    this.label = labelNode.addComponent(Label);
    
    this.label.string = text;
    this.label.fontSize = 24;
    this.label.color = Color.WHITE;
    
    labelNode.setParent(this.node);
  }
  
  protected updateAppearance(state: ComponentState): void {
    if (state.disabled) {
      this.background.color = Color.GRAY;
      this.label.color = new Color(200, 200, 200);
      this.node.getComponent(Button).interactable = false;
    } else if (state.highlighted) {
      this.background.color = new Color(255, 255, 150);
      this.label.color = Color.WHITE;
    } else {
      this.background.color = Color.WHITE;
      this.label.color = Color.WHITE;
    }
  }
  
  protected onClick(event: EventTouch): void {
    if (this.state.disabled) return;
    
    // 클릭 사운드 재생
    AudioManager.getInstance().playSFX('button_click');
    
    // 클릭 이벤트 발생
    this.eventManager.emit('clicked', { component: this, event });
  }
  
  setText(text: string): void {
    this.label.string = text;
  }
  
  setEnabled(enabled: boolean): void {
    this.setState({ disabled: !enabled });
  }
}
```

### 3.2 레이아웃 시스템
```typescript
// [의도] 반응형 레이아웃을 위한 자동 배치 시스템
// [책임] 화면 크기 대응, 요소 배치, 비율 관리
export class ResponsiveLayoutManager {
  private layoutContainers: Map<string, LayoutContainer>;
  private screenInfo: ScreenInfo;
  private designResolution: Size;
  
  constructor() {
    this.layoutContainers = new Map();
    this.screenInfo = this.getScreenInfo();
    this.designResolution = new Size(1920, 1080); // 기준 해상도
    
    // 화면 크기 변경 감지
    view.on('canvas-resize', this.onScreenResize, this);
  }
  
  createLayoutContainer(
    id: string, 
    config: LayoutConfig
  ): LayoutContainer {
    const container = new LayoutContainer(config);
    this.layoutContainers.set(id, container);
    
    // 초기 레이아웃 적용
    this.updateLayout(container);
    
    return container;
  }
  
  private onScreenResize(): void {
    this.screenInfo = this.getScreenInfo();
    
    // 모든 레이아웃 컨테이너 업데이트
    for (const container of this.layoutContainers.values()) {
      this.updateLayout(container);
    }
  }
  
  private updateLayout(container: LayoutContainer): void {
    const scale = this.calculateScale();
    const safeArea = this.getSafeArea();
    
    switch (container.layoutType) {
      case LayoutType.Flex:
        this.applyFlexLayout(container, scale, safeArea);
        break;
      case LayoutType.Grid:
        this.applyGridLayout(container, scale, safeArea);
        break;
      case LayoutType.Absolute:
        this.applyAbsoluteLayout(container, scale, safeArea);
        break;
    }
  }
  
  private applyFlexLayout(
    container: LayoutContainer, 
    scale: number, 
    safeArea: Rect
  ): void {
    const layout = container.getComponent(Layout);
    if (!layout) return;
    
    // 플렉스 방향에 따른 배치
    switch (container.flexDirection) {
      case FlexDirection.Row:
        this.arrangeHorizontally(container, scale, safeArea);
        break;
      case FlexDirection.Column:
        this.arrangeVertically(container, scale, safeArea);
        break;
    }
    
    // 여백 적용
    this.applyPadding(container, scale);
    
    // 정렬 적용
    this.applyAlignment(container);
  }
  
  private arrangeHorizontally(
    container: LayoutContainer, 
    scale: number, 
    safeArea: Rect
  ): void {
    const children = container.getChildren();
    const availableWidth = safeArea.width - container.padding.horizontal * scale;
    const spacing = container.spacing * scale;
    
    let totalFlexGrow = 0;
    let fixedWidth = 0;
    
    // 고정 크기와 flex 크기 계산
    for (const child of children) {
      const childLayout = child.getComponent(LayoutElement);
      if (childLayout) {
        if (childLayout.flexGrow > 0) {
          totalFlexGrow += childLayout.flexGrow;
        } else {
          fixedWidth += childLayout.preferredWidth * scale;
        }
      }
    }
    
    const flexWidth = (availableWidth - fixedWidth - spacing * (children.length - 1)) / totalFlexGrow;
    let currentX = -availableWidth / 2;
    
    // 자식 요소 배치
    for (const child of children) {
      const childLayout = child.getComponent(LayoutElement);
      let childWidth: number;
      
      if (childLayout && childLayout.flexGrow > 0) {
        childWidth = flexWidth * childLayout.flexGrow;
      } else {
        childWidth = (childLayout?.preferredWidth || child.getContentSize().width) * scale;
      }
      
      child.setPosition(currentX + childWidth / 2, 0);
      child.setContentSize(childWidth, child.getContentSize().height * scale);
      
      currentX += childWidth + spacing;
    }
  }
  
  // 세이프 에어리어 처리 (노치, 상태바 등)
  private getSafeArea(): Rect {
    const screenSize = view.getVisibleSize();
    const safeAreaInsets = this.getSafeAreaInsets();
    
    return new Rect(
      safeAreaInsets.left,
      safeAreaInsets.bottom,
      screenSize.width - safeAreaInsets.left - safeAreaInsets.right,
      screenSize.height - safeAreaInsets.top - safeAreaInsets.bottom
    );
  }
  
  private getSafeAreaInsets(): SafeAreaInsets {
    // 플랫폼별 세이프 에어리어 정보 획득
    if (sys.platform === sys.Platform.MOBILE_BROWSER) {
      return this.getBrowserSafeArea();
    } else if (sys.platform === sys.Platform.ANDROID) {
      return this.getAndroidSafeArea();
    } else if (sys.platform === sys.Platform.IOS) {
      return this.getIOSSafeArea();
    }
    
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

export class LayoutContainer extends Node {
  public layoutType: LayoutType;
  public flexDirection: FlexDirection;
  public justifyContent: JustifyContent;
  public alignItems: AlignItems;
  public padding: Padding;
  public spacing: number;
  
  constructor(config: LayoutConfig) {
    super();
    
    Object.assign(this, config);
    
    // Layout 컴포넌트 추가
    this.addComponent(Layout);
    this.updateLayoutComponent();
  }
  
  private updateLayoutComponent(): void {
    const layout = this.getComponent(Layout);
    
    switch (this.layoutType) {
      case LayoutType.Flex:
        layout.type = Layout.Type.HORIZONTAL;
        layout.spacingX = this.spacing;
        layout.spacingY = this.spacing;
        break;
      case LayoutType.Grid:
        layout.type = Layout.Type.GRID;
        break;
    }
    
    layout.paddingLeft = this.padding.left;
    layout.paddingRight = this.padding.right;
    layout.paddingTop = this.padding.top;
    layout.paddingBottom = this.padding.bottom;
  }
}
```

## 4. 모바일 최적화

### 4.1 터치 제스처 시스템
```typescript
// [의도] 모바일 기기의 다양한 터치 제스처 지원
// [책임] 제스처 인식, 이벤트 변환, 성능 최적화
export class GestureManager {
  private gestureRecognizers: Map<string, GestureRecognizer>;
  private touchTracker: TouchTracker;
  private performanceMonitor: PerformanceMonitor;
  
  constructor() {
    this.gestureRecognizers = new Map();
    this.touchTracker = new TouchTracker();
    this.performanceMonitor = new PerformanceMonitor();
    
    this.setupBasicGestures();
    this.setupEventListeners();
  }
  
  private setupBasicGestures(): void {
    // 탭 제스처
    this.addGestureRecognizer('tap', new TapGestureRecognizer({
      numberOfTapsRequired: 1,
      numberOfTouchesRequired: 1,
      maximumTapDuration: 300,
      maximumTapDistance: 20
    }));
    
    // 더블 탭 제스처
    this.addGestureRecognizer('doubleTap', new TapGestureRecognizer({
      numberOfTapsRequired: 2,
      numberOfTouchesRequired: 1,
      maximumTapDuration: 300,
      maximumDoubleTapInterval: 500
    }));
    
    // 롱 프레스 제스처
    this.addGestureRecognizer('longPress', new LongPressGestureRecognizer({
      minimumPressDuration: 500,
      allowableMovement: 10
    }));
    
    // 핀치 제스처
    this.addGestureRecognizer('pinch', new PinchGestureRecognizer({
      minimumNumberOfTouches: 2,
      maximumNumberOfTouches: 2
    }));
    
    // 스와이프 제스처
    this.addGestureRecognizer('swipe', new SwipeGestureRecognizer({
      numberOfTouchesRequired: 1,
      minimumDistance: 50,
      maximumDuration: 1000
    }));
  }
  
  private setupEventListeners(): void {
    const canvas = find('Canvas');
    
    canvas.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    canvas.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    canvas.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    canvas.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }
  
  private onTouchStart(event: EventTouch): void {
    const startTime = performance.now();
    
    // 터치 정보 추적
    this.touchTracker.addTouch(event.getID(), {
      startPosition: event.getLocation(),
      startTime: Date.now(),
      currentPosition: event.getLocation(),
      lastPosition: event.getLocation()
    });
    
    // 모든 제스처 인식기에 터치 시작 전달
    for (const recognizer of this.gestureRecognizers.values()) {
      recognizer.onTouchStart(event);
    }
    
    this.performanceMonitor.recordGestureProcessingTime(
      'touchStart', 
      performance.now() - startTime
    );
  }
  
  private onTouchMove(event: EventTouch): void {
    const touchData = this.touchTracker.getTouch(event.getID());
    if (!touchData) return;
    
    // 터치 데이터 업데이트
    touchData.lastPosition = touchData.currentPosition;
    touchData.currentPosition = event.getLocation();
    
    // 제스처 인식기에 터치 이동 전달
    for (const recognizer of this.gestureRecognizers.values()) {
      recognizer.onTouchMove(event);
    }
  }
  
  private onTouchEnd(event: EventTouch): void {
    const touchData = this.touchTracker.getTouch(event.getID());
    if (!touchData) return;
    
    // 제스처 인식기에 터치 종료 전달
    for (const recognizer of this.gestureRecognizers.values()) {
      recognizer.onTouchEnd(event);
    }
    
    // 터치 데이터 정리
    this.touchTracker.removeTouch(event.getID());
  }
  
  addGestureRecognizer(name: string, recognizer: GestureRecognizer): void {
    this.gestureRecognizers.set(name, recognizer);
    
    // 제스처 인식 시 이벤트 발생
    recognizer.on('recognized', (gesture: RecognizedGesture) => {
      this.onGestureRecognized(name, gesture);
    });
  }
  
  private onGestureRecognized(gestureName: string, gesture: RecognizedGesture): void {
    // 제스처별 처리
    switch (gestureName) {
      case 'swipe':
        this.handleSwipeGesture(gesture as SwipeGesture);
        break;
      case 'pinch':
        this.handlePinchGesture(gesture as PinchGesture);
        break;
      case 'longPress':
        this.handleLongPressGesture(gesture as LongPressGesture);
        break;
    }
    
    // 글로벌 제스처 이벤트 발생
    director.emit('gesture-recognized', gestureName, gesture);
  }
  
  private handleSwipeGesture(gesture: SwipeGesture): void {
    const direction = this.getSwipeDirection(gesture.velocity);
    
    // 방향별 처리
    switch (direction) {
      case SwipeDirection.Left:
        // 왼쪽 스와이프 - 이전 화면
        SceneManager.getInstance().navigateBack();
        break;
      case SwipeDirection.Right:
        // 오른쪽 스와이프 - 메뉴 열기
        UIManager.getInstance().openSideMenu();
        break;
      case SwipeDirection.Up:
        // 위쪽 스와이프 - 상세 정보
        UIManager.getInstance().showDetailView();
        break;
      case SwipeDirection.Down:
        // 아래쪽 스와이프 - 닫기
        UIManager.getInstance().closeCurrentModal();
        break;
    }
  }
}

// 탭 제스처 인식기
export class TapGestureRecognizer extends GestureRecognizer {
  private config: TapGestureConfig;
  private tapHistory: TapRecord[] = [];
  
  constructor(config: TapGestureConfig) {
    super();
    this.config = config;
  }
  
  onTouchEnd(event: EventTouch): void {
    const touchDuration = Date.now() - this.getTouchStartTime(event.getID());
    const touchDistance = this.getTouchDistance(event.getID());
    
    // 탭 조건 확인
    if (touchDuration <= this.config.maximumTapDuration && 
        touchDistance <= this.config.maximumTapDistance) {
      
      this.recordTap(event.getLocation(), Date.now());
      
      // 필요한 탭 수만큼 달성했는지 확인
      if (this.hasRequiredTaps()) {
        this.recognizeGesture({
          type: 'tap',
          position: event.getLocation(),
          numberOfTaps: this.config.numberOfTapsRequired,
          timestamp: Date.now()
        });
        
        this.resetTapHistory();
      }
    }
  }
  
  private hasRequiredTaps(): boolean {
    const recentTaps = this.getRecentTaps();
    return recentTaps.length >= this.config.numberOfTapsRequired;
  }
  
  private getRecentTaps(): TapRecord[] {
    const now = Date.now();
    const maxInterval = this.config.maximumDoubleTapInterval || 500;
    
    return this.tapHistory.filter(tap => 
      now - tap.timestamp <= maxInterval
    );
  }
}
```

### 4.2 성능 최적화 시스템
```typescript
// [의도] 모바일 기기의 제한된 자원에서 최적 성능 달성
// [책임] UI 풀링, 텍스처 관리, 메모리 최적화
export class UIPerformanceOptimizer {
  private uiPool: Map<string, UIPool>;
  private textureManager: TextureManager;
  private memoryMonitor: MemoryMonitor;
  private renderBatcher: RenderBatcher;
  
  constructor() {
    this.uiPool = new Map();
    this.textureManager = new TextureManager();
    this.memoryMonitor = new MemoryMonitor();
    this.renderBatcher = new RenderBatcher();
    
    this.initializeOptimizations();
  }
  
  private initializeOptimizations(): void {
    // UI 오브젝트 풀 생성
    this.createUIPools();
    
    // 텍스처 아틀라스 최적화
    this.optimizeTextureAtlases();
    
    // 렌더링 배칭 설정
    this.setupRenderBatching();
    
    // 메모리 모니터링 시작
    this.startMemoryMonitoring();
  }
  
  private createUIPools(): void {
    // 자주 사용되는 UI 요소들의 풀 생성
    const poolConfigs = [
      { name: 'button', prefab: 'Button', initialSize: 20, maxSize: 50 },
      { name: 'label', prefab: 'Label', initialSize: 30, maxSize: 100 },
      { name: 'cardItem', prefab: 'CardItem', initialSize: 16, maxSize: 32 },
      { name: 'listItem', prefab: 'ListItem', initialSize: 20, maxSize: 40 },
      { name: 'particle', prefab: 'ParticleEffect', initialSize: 10, maxSize: 30 }
    ];
    
    for (const config of poolConfigs) {
      const pool = new UIPool(config);
      this.uiPool.set(config.name, pool);
    }
  }
  
  getUIFromPool(poolName: string, config?: any): Node {
    const pool = this.uiPool.get(poolName);
    if (!pool) {
      console.warn(`UI pool not found: ${poolName}`);
      return null;
    }
    
    const uiNode = pool.get();
    
    // 설정 적용
    if (config && uiNode.getComponent(UIComponent)) {
      uiNode.getComponent(UIComponent).applyConfig(config);
    }
    
    return uiNode;
  }
  
  returnUIToPool(poolName: string, uiNode: Node): void {
    const pool = this.uiPool.get(poolName);
    if (pool) {
      // UI 초기화
      this.resetUINode(uiNode);
      pool.put(uiNode);
    }
  }
  
  private resetUINode(node: Node): void {
    // 이벤트 리스너 제거
    node.off(Node.EventType.TOUCH_START);
    node.off(Node.EventType.TOUCH_END);
    
    // 위치 및 스케일 초기화
    node.setPosition(Vec3.ZERO);
    node.setScale(Vec3.ONE);
    node.setRotationFromEuler(Vec3.ZERO);
    
    // 알파 초기화
    const uiOpacity = node.getComponent(UIOpacity);
    if (uiOpacity) {
      uiOpacity.opacity = 255;
    }
    
    // 자식 노드 정리
    for (const child of node.children) {
      child.removeFromParent();
    }
  }
  
  // 동적 텍스처 아틀라스 생성
  optimizeTextureAtlases(): void {
    // UI 텍스처들을 동적으로 아틀라스에 합치기
    const uiTextures = this.textureManager.getUITextures();
    const atlasSize = 2048; // 2K 아틀라스
    
    const atlas = this.textureManager.createDynamicAtlas(
      'ui_atlas',
      atlasSize,
      atlasSize
    );
    
    for (const texture of uiTextures) {
      if (texture.width <= 512 && texture.height <= 512) {
        atlas.addTexture(texture);
      }
    }
    
    atlas.build();
  }
  
  // 렌더링 배칭 최적화
  private setupRenderBatching(): void {
    // 같은 재질을 사용하는 UI 요소들을 배칭
    this.renderBatcher.enableAutoBatching();
    
    // UI 레이어별 배칭 설정
    this.renderBatcher.setBatchingRule('ui_background', {
      material: 'ui_default',
      maxBatchSize: 64
    });
    
    this.renderBatcher.setBatchingRule('ui_foreground', {
      material: 'ui_default',
      maxBatchSize: 32
    });
  }
  
  // 메모리 사용량 모니터링
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memoryUsage = this.memoryMonitor.getCurrentUsage();
      
      if (memoryUsage.ui > 100 * 1024 * 1024) { // 100MB 초과
        this.performMemoryCleanup();
      }
      
      // 텍스처 메모리 확인
      if (memoryUsage.texture > 200 * 1024 * 1024) { // 200MB 초과
        this.textureManager.performCleanup();
      }
    }, 5000); // 5초마다 체크
  }
  
  private performMemoryCleanup(): void {
    // 사용하지 않는 UI 풀 정리
    for (const [name, pool] of this.uiPool) {
      pool.cleanup();
    }
    
    // 캐시된 UI 프리팹 정리
    resources.releaseUnusedAssets();
    
    // 가비지 컬렉션 요청
    if (sys.isNative && (cc as any).sys.garbageCollect) {
      (cc as any).sys.garbageCollect();
    }
  }
  
  // 스크롤 뷰 최적화
  optimizeScrollView(scrollView: ScrollView): void {
    // 가상화 스크롤링 적용
    const virtualScroll = scrollView.node.addComponent(VirtualScrollView);
    
    virtualScroll.setItemTemplate(scrollView.content.children[0]);
    virtualScroll.setItemSize(scrollView.content.children[0].contentSize);
    virtualScroll.setBufferSize(5); // 화면 밖 5개까지만 유지
    
    // 스크롤 성능 최적화
    scrollView.horizontal = false; // 세로 스크롤만 사용
    scrollView.elastic = false; // 탄성 효과 비활성화 (성능 향상)
    scrollView.cancelInnerEvents = true; // 내부 이벤트 취소
  }
}

// UI 오브젝트 풀
export class UIPool {
  private pool: Node[] = [];
  private config: PoolConfig;
  private prefabCache: Prefab;
  
  constructor(config: PoolConfig) {
    this.config = config;
    this.loadPrefab();
    this.initializePool();
  }
  
  private async loadPrefab(): Promise<void> {
    this.prefabCache = await new Promise((resolve, reject) => {
      resources.load(`ui/${this.config.prefab}`, Prefab, (err, prefab) => {
        if (err) {
          reject(err);
        } else {
          resolve(prefab);
        }
      });
    });
  }
  
  private initializePool(): void {
    for (let i = 0; i < this.config.initialSize; i++) {
      const node = instantiate(this.prefabCache);
      node.active = false;
      this.pool.push(node);
    }
  }
  
  get(): Node {
    if (this.pool.length > 0) {
      const node = this.pool.pop();
      node.active = true;
      return node;
    }
    
    // 풀이 비어있으면 새로 생성
    if (this.getTotalCount() < this.config.maxSize) {
      const node = instantiate(this.prefabCache);
      node.active = true;
      return node;
    }
    
    // 최대 크기 초과 시 null 반환
    console.warn(`UI pool '${this.config.name}' exceeded maximum size`);
    return null;
  }
  
  put(node: Node): void {
    if (this.pool.length < this.config.maxSize) {
      node.active = false;
      node.removeFromParent();
      this.pool.push(node);
    } else {
      // 풀이 가득 찬 경우 노드 파괴
      node.destroy();
    }
  }
  
  cleanup(): void {
    // 사용하지 않는 노드들 정리
    const keepCount = Math.max(this.config.initialSize, this.pool.length / 2);
    
    while (this.pool.length > keepCount) {
      const node = this.pool.pop();
      node.destroy();
    }
  }
  
  getTotalCount(): number {
    return this.pool.length;
  }
}
```

## 5. 접근성 구현

### 5.1 접근성 매니저
```typescript
// [의도] 장애인 사용자를 위한 접근성 기능 제공
// [책임] 스크린 리더 지원, 키보드 네비게이션, 대체 텍스트
export class AccessibilityManager {
  private screenReader: ScreenReaderInterface;
  private keyboardNavigator: KeyboardNavigator;
  private colorBlindHelper: ColorBlindHelper;
  private voiceOverEnabled: boolean = false;
  
  constructor() {
    this.screenReader = new ScreenReaderInterface();
    this.keyboardNavigator = new KeyboardNavigator();
    this.colorBlindHelper = new ColorBlindHelper();
    
    this.initializeAccessibility();
  }
  
  private initializeAccessibility(): void {
    // 시스템 접근성 설정 확인
    this.checkSystemAccessibilitySettings();
    
    // 키보드 네비게이션 설정
    this.setupKeyboardNavigation();
    
    // 스크린 리더 지원 설정
    this.setupScreenReaderSupport();
    
    // 색맹 지원 설정
    this.setupColorBlindSupport();
  }
  
  private checkSystemAccessibilitySettings(): void {
    // iOS VoiceOver 감지
    if (sys.platform === sys.Platform.IOS) {
      this.voiceOverEnabled = this.isVoiceOverEnabled();
    }
    
    // Android TalkBack 감지
    if (sys.platform === sys.Platform.ANDROID) {
      this.voiceOverEnabled = this.isTalkBackEnabled();
    }
    
    if (this.voiceOverEnabled) {
      this.enableScreenReaderMode();
    }
  }
  
  private setupKeyboardNavigation(): void {
    // 키보드 이벤트 리스너 설정
    systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    
    // 포커스 가능한 UI 요소들 등록
    this.keyboardNavigator.scanFocusableElements();
  }
  
  private onKeyDown(event: EventKeyboard): void {
    switch (event.keyCode) {
      case macro.KEY.tab:
        if (event.shiftKey) {
          this.keyboardNavigator.focusPrevious();
        } else {
          this.keyboardNavigator.focusNext();
        }
        break;
      case macro.KEY.enter:
      case macro.KEY.space:
        this.keyboardNavigator.activateCurrentFocus();
        break;
      case macro.KEY.escape:
        this.keyboardNavigator.exitCurrentContext();
        break;
    }
  }
  
  // 접근 가능한 UI 요소 등록
  registerAccessibleElement(
    element: Node, 
    config: AccessibilityConfig
  ): void {
    const accessibilityComponent = element.getComponent(AccessibilityComponent) || 
                                 element.addComponent(AccessibilityComponent);
    
    accessibilityComponent.configure(config);
    
    // 키보드 네비게이션에 등록
    if (config.focusable) {
      this.keyboardNavigator.addFocusableElement(element);
    }
    
    // 스크린 리더에 등록
    if (config.accessibilityLabel) {
      this.screenReader.registerElement(element, config.accessibilityLabel);
    }
  }
  
  // 스크린 리더 공지사항
  announceToScreenReader(message: string, priority: AnnouncementPriority = AnnouncementPriority.Medium): void {
    if (!this.voiceOverEnabled) return;
    
    this.screenReader.announce(message, priority);
  }
  
  // 접근성 힌트 제공
  provideAccessibilityHint(element: Node, hint: string): void {
    const accessibilityComponent = element.getComponent(AccessibilityComponent);
    if (accessibilityComponent) {
      accessibilityComponent.setHint(hint);
    }
  }
  
  // 색맹 지원
  enableColorBlindSupport(type: ColorBlindType): void {
    this.colorBlindHelper.setColorBlindType(type);
    
    // UI 색상 조정
    this.adjustUIColorsForColorBlind();
    
    // 색상 대신 패턴/모양 사용
    this.enablePatternAlternatives();
  }
  
  private adjustUIColorsForColorBlind(): void {
    const colorMapping = this.colorBlindHelper.getColorMapping();
    
    // 모든 UI 요소의 색상 조정
    const allUINodes = this.getAllUINodes();
    
    for (const node of allUINodes) {
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        const adjustedColor = colorMapping.adjustColor(sprite.color);
        sprite.color = adjustedColor;
      }
      
      const label = node.getComponent(Label);
      if (label) {
        const adjustedColor = colorMapping.adjustColor(label.color);
        label.color = adjustedColor;
      }
    }
  }
  
  // 폰트 크기 조정 (시각 장애 지원)
  adjustFontSizeForVisualImpairment(scale: number): void {
    const allLabels = this.getAllLabels();
    
    for (const label of allLabels) {
      const originalSize = label.fontSize;
      label.fontSize = originalSize * scale;
    }
    
    // 레이아웃 재계산
    this.recalculateLayouts();
  }
  
  // 고대비 모드
  enableHighContrastMode(): void {
    const highContrastTheme = {
      background: Color.BLACK,
      foreground: Color.WHITE,
      highlight: Color.YELLOW,
      disabled: Color.GRAY
    };
    
    this.applyTheme(highContrastTheme);
  }
}

// 접근성 컴포넌트
export class AccessibilityComponent extends Component {
  public accessibilityLabel: string = '';
  public accessibilityHint: string = '';
  public accessibilityRole: AccessibilityRole = AccessibilityRole.Button;
  public isAccessibilityElement: boolean = true;
  public focusable: boolean = true;
  
  configure(config: AccessibilityConfig): void {
    Object.assign(this, config);
    this.updateAccessibilityAttributes();
  }
  
  private updateAccessibilityAttributes(): void {
    if (sys.platform === sys.Platform.IOS) {
      this.updateIOSAccessibility();
    } else if (sys.platform === sys.Platform.ANDROID) {
      this.updateAndroidAccessibility();
    }
  }
  
  private updateIOSAccessibility(): void {
    // iOS VoiceOver 속성 설정
    const nativeNode = this.node as any;
    
    nativeNode.isAccessibilityElement = this.isAccessibilityElement;
    nativeNode.accessibilityLabel = this.accessibilityLabel;
    nativeNode.accessibilityHint = this.accessibilityHint;
    nativeNode.accessibilityTraits = this.getIOSAccessibilityTraits();
  }
  
  private updateAndroidAccessibility(): void {
    // Android TalkBack 속성 설정
    const nativeNode = this.node as any;
    
    nativeNode.contentDescription = this.accessibilityLabel;
    nativeNode.focusable = this.focusable;
    nativeNode.clickable = this.accessibilityRole === AccessibilityRole.Button;
  }
  
  setLabel(label: string): void {
    this.accessibilityLabel = label;
    this.updateAccessibilityAttributes();
  }
  
  setHint(hint: string): void {
    this.accessibilityHint = hint;
    this.updateAccessibilityAttributes();
  }
  
  focus(): void {
    if (this.focusable) {
      // 포커스 시각 효과
      this.showFocusIndicator();
      
      // 스크린 리더에 포커스 알림
      AccessibilityManager.getInstance().announceToScreenReader(
        `${this.accessibilityLabel} focused`,
        AnnouncementPriority.High
      );
    }
  }
  
  private showFocusIndicator(): void {
    // 포커스 표시 효과 생성
    const focusIndicator = new Node('focus-indicator');
    const graphics = focusIndicator.addComponent(Graphics);
    
    const contentSize = this.node.getContentSize();
    graphics.strokeColor = Color.BLUE;
    graphics.lineWidth = 3;
    graphics.rect(-contentSize.width/2, -contentSize.height/2, contentSize.width, contentSize.height);
    graphics.stroke();
    
    focusIndicator.setParent(this.node);
    
    // 1초 후 제거
    setTimeout(() => {
      if (focusIndicator && focusIndicator.isValid) {
        focusIndicator.destroy();
      }
    }, 1000);
  }
}

// 키보드 네비게이션
export class KeyboardNavigator {
  private focusableElements: AccessibilityComponent[] = [];
  private currentFocusIndex: number = -1;
  
  addFocusableElement(element: Node): void {
    const accessibilityComponent = element.getComponent(AccessibilityComponent);
    if (accessibilityComponent && accessibilityComponent.focusable) {
      this.focusableElements.push(accessibilityComponent);
    }
  }
  
  focusNext(): void {
    if (this.focusableElements.length === 0) return;
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex].focus();
  }
  
  focusPrevious(): void {
    if (this.focusableElements.length === 0) return;
    
    this.currentFocusIndex = this.currentFocusIndex <= 0 ? 
      this.focusableElements.length - 1 : 
      this.currentFocusIndex - 1;
    
    this.focusableElements[this.currentFocusIndex].focus();
  }
  
  activateCurrentFocus(): void {
    if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableElements.length) {
      const element = this.focusableElements[this.currentFocusIndex];
      
      // 클릭 이벤트 시뮬레이션
      const clickEvent = new EventTouch([new Touch(0, 0, 0)], false);
      element.node.emit(Node.EventType.TOUCH_END, clickEvent);
    }
  }
  
  scanFocusableElements(): void {
    // 전체 씬에서 포커스 가능한 요소들 스캔
    this.focusableElements = [];
    
    const allNodes = find('Canvas').getComponentsInChildren(AccessibilityComponent);
    for (const component of allNodes) {
      if (component.focusable) {
        this.focusableElements.push(component);
      }
    }
    
    // Z-order에 따라 정렬
    this.focusableElements.sort((a, b) => {
      return a.node.getSiblingIndex() - b.node.getSiblingIndex();
    });
  }
}
```

이 구현계획은 모바일 게임에 최적화된 포괄적인 UI/UX 시스템을 구축하기 위한 핵심 요소들을 다루고 있습니다. 반응형 레이아웃, 터치 제스처, 성능 최적화, 접근성 지원을 통해 모든 사용자에게 우수한 사용자 경험을 제공합니다.