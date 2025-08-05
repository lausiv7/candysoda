# UI/UX 시스템 설계

## 문서 정보
- **문서명**: UI/UX 시스템 설계
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [UI/UX 시스템 개요](#1-uiux-시스템-개요)
2. [기술 스택](#2-기술-스택)
3. [디자인 시스템](#3-디자인-시스템)
4. [화면 구성 및 네비게이션](#4-화면-구성-및-네비게이션)
5. [배틀 UI 시스템](#5-배틀-ui-시스템)
6. [모바일 UX 최적화](#6-모바일-ux-최적화)
7. [접근성 및 다국어 지원](#7-접근성-및-다국어-지원)
8. [성능 최적화](#8-성능-최적화)
9. [사용자 피드백 시스템](#9-사용자-피드백-시스템)
10. [UI 테스팅 및 분석](#10-ui-테스팅-및-분석)

## 1. UI/UX 시스템 개요

### 1.1 핵심 목표
- **직관적 모바일 인터페이스**: 한 손 조작에 최적화된 UI 설계
- **빠른 학습 곡선**: 신규 사용자도 쉽게 이해할 수 있는 UX
- **몰입감 있는 배틀 경험**: 실시간 전투에 집중할 수 있는 UI
- **접근성 보장**: 다양한 사용자층이 사용할 수 있는 인클루시브 디자인
- **크로스 플랫폼 일관성**: 다양한 디바이스에서 일관된 경험

### 1.2 디자인 철학
```typescript
// [의도] UI/UX 시스템의 핵심 철학과 가이드라인 정의
// [책임] 일관된 디자인 언어, 사용자 중심 설계, 브랜드 아이덴티티 통합
interface DesignPhilosophy {
  principles: DesignPrinciple[];
  guidelines: UIGuideline[];
  brandIdentity: BrandIdentity;
  userCentric: UserCentricDesign;
  
  // 디자인 일관성 검증
  validateDesignConsistency(component: UIComponent): ValidationResult;
  // 접근성 준수 확인
  checkAccessibility(screen: UIScreen): AccessibilityReport;
  // 사용성 평가
  evaluateUsability(userFlow: UserFlow): UsabilityScore;
}
```

## 2. 기술 스택

### 2.1 UI 프레임워크
- **Cocos Creator UI**: 게임 엔진 통합 UI 시스템
- **Fairygui**: 고급 UI 편집 및 애니메이션
- **Lottie**: 복잡한 애니메이션 및 이펙트
- **Spine**: 캐릭터 및 UI 애니메이션

### 2.2 디자인 도구 연동
```typescript
// [의도] 디자인 도구와 개발 환경의 원활한 연동 지원
// [책임] 에셋 파이프라인, 버전 관리, 자동화된 리소스 처리
interface DesignToolIntegration {
  figmaAPI: FigmaAPIClient;
  assetProcessor: AssetProcessor;
  themeManager: ThemeManager;
  localizationManager: LocalizationManager;
  
  // Figma에서 UI 컴포넌트 동기화
  syncFromFigma(projectId: string): Promise<UIAssetBundle>;
  // 테마별 리소스 생성
  generateThemeAssets(theme: Theme): Promise<AssetBundle>;
  // 다국어 텍스트 업데이트
  updateLocalizedStrings(): Promise<void>;
}
```

## 3. 디자인 시스템

### 3.1 컬러 시스템
```typescript
// [의도] 일관되고 접근성을 고려한 컬러 팔레트 시스템
// [책임] 브랜드 컬러 관리, 대비비 보장, 다크모드 지원
class ColorSystem {
  private primaryColors: ColorPalette;
  private semanticColors: SemanticColorSet;
  private accessibilityChecker: AccessibilityChecker;
  
  // 주요 브랜드 컬러
  primary = {
    blue_100: '#E3F2FD',
    blue_500: '#2196F3',
    blue_900: '#0D47A1'
  };
  
  // 의미적 컬러
  semantic = {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3'
  };
  
  // 게임 전용 컬러
  gameColors = {
    gold: '#FFD700',
    gem: '#9C27B0',
    legendary: '#FF6F00',
    epic: '#673AB7',
    rare: '#3F51B5',
    common: '#9E9E9E'
  };
  
  getColorWithOpacity(color: string, opacity: number): string {
    // 색상에 투명도 적용
    return this.applyOpacity(color, opacity);
  }
  
  validateContrast(foreground: string, background: string): boolean {
    // WCAG 2.1 AA 기준 대비비 검증
    const contrastRatio = this.calculateContrastRatio(foreground, background);
    return contrastRatio >= 4.5;
  }
  
  generateDarkTheme(): ColorTheme {
    // 다크 테마 색상 자동 생성
    return this.createDarkVariations(this.primaryColors);
  }
}
```

### 3.2 타이포그래피 시스템
```typescript
// [의도] 가독성과 계층구조를 고려한 텍스트 스타일 시스템
// [책임] 폰트 관리, 크기 체계, 다국어 폰트 지원
class TypographySystem {
  private fontFamilies: FontFamilySet;
  private textStyles: TextStyleSet;
  private localizationSupport: LocalizationSupport;
  
  // 폰트 크기 스케일 (모바일 최적화)
  fontSizes = {
    xs: 12,   // 작은 라벨, 힌트
    sm: 14,   // 본문, 설명
    base: 16, // 기본 텍스트
    lg: 18,   // 중요한 정보
    xl: 20,   // 제목
    '2xl': 24, // 큰 제목
    '3xl': 30, // 메인 타이틀
    '4xl': 36  // 히어로 텍스트
  };
  
  // 텍스트 스타일 정의
  textStyles = {
    h1: {
      fontSize: this.fontSizes['3xl'],
      fontWeight: 'bold',
      lineHeight: 1.2,
      letterSpacing: -0.02
    },
    h2: {
      fontSize: this.fontSizes['2xl'],
      fontWeight: 'bold',
      lineHeight: 1.3
    },
    body: {
      fontSize: this.fontSizes.base,
      fontWeight: 'normal',
      lineHeight: 1.5
    },
    caption: {
      fontSize: this.fontSizes.sm,
      fontWeight: 'normal',
      lineHeight: 1.4,
      opacity: 0.7
    }
  };
  
  getLocalizedFont(language: string): FontFamily {
    // 언어별 최적 폰트 반환
    const fontMap = {
      'ko': 'NotoSansKR',
      'ja': 'NotoSansJP',
      'zh': 'NotoSansSC',
      'en': 'Roboto'
    };
    
    return fontMap[language] || fontMap['en'];
  }
  
  calculateOptimalFontSize(text: string, containerWidth: number): number {
    // 컨테이너 크기에 맞는 최적 폰트 크기 계산
    return this.fontSizeCalculator.calculate(text, containerWidth);
  }
}
```

### 3.3 컴포넌트 라이브러리
```typescript
// [의도] 재사용 가능한 UI 컴포넌트 라이브러리 구축
// [책임] 컴포넌트 일관성, 상태 관리, 테마 지원
class ComponentLibrary {
  private components: Map<string, UIComponent>;
  private themeProvider: ThemeProvider;
  private stateManager: ComponentStateManager;
  
  // 기본 컴포넌트
  registerBaseComponents(): void {
    this.registerComponent('Button', new ButtonComponent());
    this.registerComponent('Card', new CardComponent());
    this.registerComponent('Modal', new ModalComponent());
    this.registerComponent('ProgressBar', new ProgressBarComponent());
    this.registerComponent('Toggle', new ToggleComponent());
  }
  
  // 게임 전용 컴포넌트
  registerGameComponents(): void {
    this.registerComponent('UnitCard', new UnitCardComponent());
    this.registerComponent('BattleHUD', new BattleHUDComponent());
    this.registerComponent('ResourceDisplay', new ResourceDisplayComponent());
    this.registerComponent('LeaderboardEntry', new LeaderboardEntryComponent());
  }
  
  createComponent(type: string, props: ComponentProps): UIComponent {
    const ComponentClass = this.components.get(type);
    if (!ComponentClass) {
      throw new Error(`Component ${type} not found`);
    }
    
    const component = new ComponentClass(props);
    
    // 테마 적용
    this.themeProvider.applyTheme(component);
    
    // 상태 관리 연결
    this.stateManager.bindComponent(component);
    
    return component;
  }
}

// 기본 버튼 컴포넌트 예시
class ButtonComponent implements UIComponent {
  private state: ButtonState;
  private theme: ButtonTheme;
  
  constructor(props: ButtonProps) {
    this.state = {
      isPressed: false,
      isDisabled: props.disabled || false,
      isLoading: false
    };
    
    this.setupEventHandlers();
    this.applyTheme(props.variant || 'primary');
  }
  
  private applyTheme(variant: ButtonVariant): void {
    const themeVariants = {
      primary: {
        backgroundColor: '#2196F3',
        textColor: '#FFFFFF',
        borderRadius: 8,
        padding: { horizontal: 16, vertical: 12 }
      },
      secondary: {
        backgroundColor: 'transparent',
        textColor: '#2196F3',
        borderColor: '#2196F3',
        borderWidth: 2,
        borderRadius: 8,
        padding: { horizontal: 16, vertical: 12 }
      },
      danger: {
        backgroundColor: '#F44336',
        textColor: '#FFFFFF',
        borderRadius: 8,
        padding: { horizontal: 16, vertical: 12 }
      }
    };
    
    this.theme = themeVariants[variant];
  }
  
  render(): UINode {
    return {
      type: 'Button',
      style: this.getComputedStyle(),
      children: [
        {
          type: 'Text',
          content: this.props.text,
          style: this.getTextStyle()
        }
      ],
      events: this.getEventHandlers()
    };
  }
}
```

## 4. 화면 구성 및 네비게이션

### 4.1 화면 아키텍처
```typescript
// [의도] 게임의 전체 화면 구조와 네비게이션 플로우 정의
// [책임] 화면 간 전환, 상태 관리, 데이터 흐름 제어
class ScreenArchitecture {
  private screenStack: ScreenStack;
  private navigationController: NavigationController;
  private stateManager: GlobalStateManager;
  
  // 메인 화면들
  screens = {
    // 인증 및 온보딩
    splash: new SplashScreen(),
    login: new LoginScreen(),
    tutorial: new TutorialScreen(),
    
    // 메인 게임 화면
    home: new HomeScreen(),
    battle: new BattleScreen(),
    collection: new CollectionScreen(),
    shop: new ShopScreen(),
    profile: new ProfileScreen(),
    
    // 모달 화면들
    settings: new SettingsModal(),
    cardDetails: new CardDetailsModal(),
    battleResult: new BattleResultModal()
  };
  
  // 네비게이션 플로우 정의
  navigationFlows = {
    onboarding: ['splash', 'login', 'tutorial', 'home'],
    mainGame: ['home', 'battle', 'battleResult', 'home'],
    collection: ['home', 'collection', 'cardDetails'],
    shop: ['home', 'shop', 'purchase']
  };
  
  async navigateToScreen(screenId: string, params?: NavigationParams): Promise<void> {
    const targetScreen = this.screens[screenId];
    if (!targetScreen) {
      throw new Error(`Screen ${screenId} not found`);
    }
    
    // 현재 화면 일시정지
    await this.pauseCurrentScreen();
    
    // 화면 전환 애니메이션
    await this.playTransitionAnimation(screenId);
    
    // 새 화면 활성화
    await this.activateScreen(targetScreen, params);
    
    // 네비게이션 히스토리 업데이트
    this.navigationController.pushScreen(screenId, params);
  }
  
  async goBack(): Promise<void> {
    const previousScreen = this.navigationController.popScreen();
    if (previousScreen) {
      await this.navigateToScreen(previousScreen.id, previousScreen.params);
    }
  }
}
```

### 4.2 홈 화면 설계
```typescript
// [의도] 게임의 중심 허브 역할을 하는 홈 화면 구성
// [책임] 주요 기능 접근, 플레이어 상태 표시, 소셜 요소 통합
class HomeScreen extends BaseScreen {
  private playerInfoWidget: PlayerInfoWidget;
  private quickActionButtons: QuickActionButton[];
  private newsWidget: NewsWidget;
  private socialWidget: SocialWidget;
  
  protected async onLoad(): Promise<void> {
    await this.setupLayout();
    await this.loadPlayerData();
    await this.initializeWidgets();
  }
  
  private async setupLayout(): Promise<void> {
    this.layout = {
      header: {
        height: '15%',
        components: [
          this.playerInfoWidget,
          new CurrencyDisplayWidget(),
          new SettingsButton()
        ]
      },
      
      mainContent: {
        height: '60%',
        components: [
          {
            type: 'Grid',
            columns: 2,
            spacing: 16,
            children: [
              new QuickBattleButton(),
              new CollectionButton(),
              new ShopButton(),
              new ClanButton()
            ]
          }
        ]
      },
      
      bottomSection: {
        height: '25%',
        components: [
          this.newsWidget,
          new DailyMissionsWidget(),
          new EventsWidget()
        ]
      }
    };
  }
  
  private createQuickActionButtons(): QuickActionButton[] {
    return [
      {
        id: 'quick_battle',
        icon: 'battle_icon',
        title: '빠른 대전',
        subtitle: '랭크 매치',
        action: () => this.startQuickBattle(),
        badgeCount: 0
      },
      {
        id: 'collection',
        icon: 'cards_icon',
        title: '컬렉션',
        subtitle: '카드 관리',
        action: () => this.openCollection(),
        badgeCount: this.getNewCardsCount()
      },
      {
        id: 'shop',
        icon: 'shop_icon',
        title: '상점',
        subtitle: '카드 구매',
        action: () => this.openShop(),
        badgeCount: this.getSpecialOffersCount()
      },
      {
        id: 'clan',
        icon: 'clan_icon',
        title: '클랜',
        subtitle: '클랜 전투',
        action: () => this.openClan(),
        badgeCount: this.getClanNotifications()
      }
    ];
  }
}
```

### 4.3 네비게이션 패턴
```typescript
// [의도] 일관되고 직관적인 네비게이션 패턴 구현
// [책임] 화면 전환 애니메이션, 제스처 지원, 뒤로가기 처리
class NavigationPatterns {
  private gestureRecognizer: GestureRecognizer;
  private animationController: AnimationController;
  private historyManager: NavigationHistoryManager;
  
  // 네비게이션 애니메이션 타입
  transitionTypes = {
    push: 'slide_left',      // 다음 화면으로
    pop: 'slide_right',      // 이전 화면으로
    modal: 'slide_up',       // 모달 팝업
    dismiss: 'slide_down',   // 모달 닫기
    fade: 'fade',           // 페이드 전환
    scale: 'scale'          // 스케일 전환
  };
  
  async performTransition(
    from: UIScreen, 
    to: UIScreen, 
    type: TransitionType
  ): Promise<void> {
    const animation = this.animationController.createTransition(type);
    
    // 동시 애니메이션 실행
    await Promise.all([
      this.animateOut(from, animation.out),
      this.animateIn(to, animation.in)
    ]);
  }
  
  setupGestureNavigation(): void {
    // 스와이프 뒤로가기
    this.gestureRecognizer.onSwipeRight = (event) => {
      if (this.canGoBack() && event.startX < 50) {
        this.goBack();
      }
    };
    
    // 모달 닫기 (아래로 스와이프)
    this.gestureRecognizer.onSwipeDown = (event) => {
      if (this.isCurrentScreenModal() && event.deltaY > 100) {
        this.dismissModal();
      }
    };
    
    // 탭 네비게이션 (하단 탭바)
    this.gestureRecognizer.onTap = (event) => {
      const tabIndex = this.getTabIndexFromPosition(event.position);
      if (tabIndex >= 0) {
        this.switchToTab(tabIndex);
      }
    };
  }
}
```

## 5. 배틀 UI 시스템

### 5.1 실시간 배틀 HUD
```typescript
// [의도] 실시간 전투 중 핵심 정보를 효과적으로 표시하는 HUD
// [책임] 게임 상태 시각화, 카드 관리, 조작 인터페이스 제공
class BattleHUD extends UIComponent {
  private elixirBar: ElixirBarComponent;
  private handCards: HandCardsComponent;
  private towerHealth: TowerHealthComponent;
  private battleTimer: BattleTimerComponent;
  
  async initialize(battleContext: BattleContext): Promise<void> {
    await this.setupLayout();
    await this.bindBattleEvents();
    await this.initializeComponents(battleContext);
  }
  
  private async setupLayout(): Promise<void> {
    this.layout = {
      // 상단 정보 영역
      topHUD: {
        position: { x: 0, y: 0 },
        size: { width: '100%', height: 80 },
        components: [
          this.battleTimer,
          new PlayerInfoComponent(),
          new OpponentInfoComponent()
        ]
      },
      
      // 중앙 게임 영역 (투명)
      gameArea: {
        position: { x: 0, y: 80 },
        size: { width: '100%', height: 'calc(100% - 200px)' },
        interactive: true,
        components: [
          new TargetingIndicator(),
          new SpellPreviewComponent(),
          new DamageNumbersComponent()
        ]
      },
      
      // 하단 조작 영역
      bottomHUD: {
        position: { x: 0, y: 'calc(100% - 120px)' },
        size: { width: '100%', height: 120 },
        components: [
          this.elixirBar,
          this.handCards,
          new EmoteButton()
        ]
      }
    };
  }
  
  private createElixirBar(): ElixirBarComponent {
    return new ElixirBarComponent({
      maxElixir: 10,
      regenRate: 1.0, // per second
      position: { x: 20, y: 20 },
      size: { width: 200, height: 8 },
      
      onElixirChange: (current: number, max: number) => {
        this.updateCardAffordability(current);
      },
      
      style: {
        backgroundColor: '#4A148C',
        fillColor: '#E91E63',
        borderRadius: 4,
        glow: true
      }
    });
  }
  
  private createHandCards(): HandCardsComponent {
    return new HandCardsComponent({
      maxCards: 4,
      position: { x: '10%', y: '85%' },
      size: { width: '80%', height: 100 },
      
      onCardSelect: (card: Card) => {
        this.enterCardPlacementMode(card);
      },
      
      onCardDrag: (card: Card, position: Vector2) => {
        this.showPlacementPreview(card, position);
      },
      
      onCardDrop: (card: Card, position: Vector2) => {
        this.attemptCardPlay(card, position);
      },
      
      cardStyle: {
        width: 70,
        height: 90,
        spacing: 10,
        hoverScale: 1.1,
        selectedScale: 1.2
      }
    });
  }
}
```

### 5.2 카드 플레이 인터페이스
```typescript
// [의도] 직관적이고 정확한 카드 플레이 경험 제공
// [책임] 드래그앤드롭, 타겟팅, 플레이 가능 영역 표시
class CardPlayInterface {
  private dragHandler: DragHandler;
  private targetingSystem: TargetingSystem;
  private placementValidator: PlacementValidator;
  
  initializeCardPlay(): void {
    this.dragHandler.onDragStart = (card: Card, startPos: Vector2) => {
      // 카드 드래그 시작
      this.showPlayableArea(card);
      this.highlightAffordableActions(card);
      this.startDragPreview(card, startPos);
    };
    
    this.dragHandler.onDragMove = (card: Card, currentPos: Vector2) => {
      // 드래그 중 미리보기 업데이트
      const isValidPosition = this.placementValidator.isValidPosition(card, currentPos);
      
      if (isValidPosition) {
        this.showValidPlacementIndicator(currentPos);
        this.previewCardEffect(card, currentPos);
      } else {
        this.showInvalidPlacementIndicator(currentPos);
      }
    };
    
    this.dragHandler.onDragEnd = (card: Card, endPos: Vector2) => {
      // 카드 플레이 시도
      this.hideAllIndicators();
      
      const placement = this.placementValidator.validatePlacement(card, endPos);
      if (placement.isValid) {
        this.playCard(card, placement.position);
      } else {
        this.returnCardToHand(card);
        this.showPlacementError(placement.error);
      }
    };
  }
  
  private showPlayableArea(card: Card): void {
    const playableArea = this.calculatePlayableArea(card);
    
    // 플레이 가능 영역 하이라이트
    this.createAreaHighlight({
      area: playableArea,
      color: card.side === 'player' ? '#4CAF50' : '#F44336',
      opacity: 0.3,
      animation: 'pulse'
    });
    
    // 금지 영역 표시
    const forbiddenAreas = this.calculateForbiddenAreas(card);
    for (const area of forbiddenAreas) {
      this.createAreaHighlight({
        area,
        color: '#F44336',
        opacity: 0.5,
        pattern: 'diagonal_lines'
      });
    }
  }
  
  private previewCardEffect(card: Card, position: Vector2): void {
    if (card.type === 'spell') {
      this.showSpellRadius(card, position);
    } else if (card.type === 'unit') {
      this.showUnitPlacementGhost(card, position);
    }
    
    // 영향받을 유닛들 하이라이트
    const affectedUnits = this.getAffectedUnits(card, position);
    for (const unit of affectedUnits) {
      this.highlightUnit(unit, card.effect > 0 ? 'positive' : 'negative');
    }
  }
}
```

### 5.3 실시간 피드백 시스템
```typescript
// [의도] 플레이어 액션에 대한 즉각적이고 명확한 피드백 제공
// [책임] 데미지 표시, 이펙트 애니메이션, 상태 변화 알림
class BattleFeedbackSystem {
  private damageNumbers: DamageNumberSystem;
  private statusEffects: StatusEffectSystem;
  private audioManager: AudioManager;
  
  showDamageNumber(damage: number, position: Vector2, type: DamageType): void {
    const damageNumber = this.damageNumbers.create({
      value: damage,
      position,
      color: this.getDamageColor(type),
      fontSize: this.getDamageFontSize(damage),
      animation: this.getDamageAnimation(type)
    });
    
    // 애니메이션 실행
    damageNumber.animate([
      { scale: 0, opacity: 0, duration: 0 },
      { scale: 1.2, opacity: 1, duration: 0.1 },
      { scale: 1, opacity: 1, duration: 0.1 },
      { scale: 0.8, opacity: 0, y: position.y - 50, duration: 0.3 }
    ]);
  }
  
  private getDamageColor(type: DamageType): string {
    const colors = {
      normal: '#FFFFFF',
      critical: '#FFD700',
      heal: '#4CAF50',
      poison: '#9C27B0',
      fire: '#FF5722'
    };
    
    return colors[type] || colors.normal;
  }
  
  showStatusEffect(unit: Unit, effect: StatusEffect): void {
    const statusIcon = this.statusEffects.createIcon({
      type: effect.type,
      position: this.getUnitStatusPosition(unit),
      duration: effect.duration,
      stackCount: effect.stackCount
    });
    
    // 상태 이펙트 애니메이션
    statusIcon.animate({
      entrance: 'bounce_in',
      loop: 'pulse',
      exit: 'fade_out'
    });
    
    // 상태 이펙트별 파티클 효과
    this.playStatusParticles(unit, effect);
  }
  
  showCriticalHit(position: Vector2): void {
    // 크리티컬 히트 이펙트
    this.createScreenShake(0.2, 100);
    this.createExplosionEffect(position);
    this.audioManager.play('critical_hit_sound');
    
    // 화면 플래시 효과
    this.createFlashEffect('#FFD700', 0.3);
  }
  
  showCardPlayFeedback(card: Card, success: boolean): void {
    if (success) {
      // 성공 피드백
      this.createSuccessRipple(card.position);
      this.audioManager.play('card_play_success');
      
      // 엘릭서 소모 애니메이션
      this.animateElixirConsumption(card.cost);
    } else {
      // 실패 피드백
      this.createErrorShake(card.position);
      this.audioManager.play('card_play_fail');
      
      // 에러 메시지 표시
      this.showTooltip('엘릭서가 부족합니다!', card.position);
    }
  }
}
```

## 6. 모바일 UX 최적화

### 6.1 터치 인터페이스 최적화
```typescript
// [의도] 모바일 터치 환경에 최적화된 사용자 인터페이스
// [책임] 터치 영역 최적화, 제스처 인식, 한 손 조작 지원
class TouchOptimization {
  private touchAreaManager: TouchAreaManager;
  private gestureRecognizer: GestureRecognizer;
  private oneHandModeManager: OneHandModeManager;
  
  // 터치 영역 최소 크기 (44x44pt - iOS HIG 권장)
  private readonly MIN_TOUCH_SIZE = 44;
  
  optimizeTouchAreas(): void {
    // 모든 인터랙티브 요소의 터치 영역 확장
    const interactiveElements = this.findInteractiveElements();
    
    for (const element of interactiveElements) {
      const currentSize = element.getBounds();
      
      if (currentSize.width < this.MIN_TOUCH_SIZE || 
          currentSize.height < this.MIN_TOUCH_SIZE) {
        
        // 터치 영역 확장 (시각적 크기는 유지)
        element.setTouchArea({
          width: Math.max(currentSize.width, this.MIN_TOUCH_SIZE),
          height: Math.max(currentSize.height, this.MIN_TOUCH_SIZE)
        });
      }
    }
  }
  
  setupGestureRecognition(): void {
    // 스와이프 제스처
    this.gestureRecognizer.registerSwipe({
      direction: 'left',
      minDistance: 50,
      maxDuration: 300,
      onSwipe: (event) => this.handleSwipeLeft(event)
    });
    
    // 핀치 줌 제스처
    this.gestureRecognizer.registerPinch({
      minScale: 0.5,
      maxScale: 2.0,
      onPinch: (event) => this.handlePinchZoom(event)
    });
    
    // 길게 누르기 제스처
    this.gestureRecognizer.registerLongPress({
      duration: 500,
      onLongPress: (event) => this.handleLongPress(event)
    });
  }
  
  enableOneHandMode(): void {
    // 한 손 조작 모드 설정
    this.oneHandModeManager.configure({
      reachableArea: this.calculateReachableArea(),
      floatingActions: true,
      gestureShortcuts: true
    });
    
    // 주요 액션을 하단으로 이동
    this.moveActionsToReachableArea();
    
    // 플로팅 액션 버튼 활성화
    this.enableFloatingActionButton();
  }
  
  private calculateReachableArea(): Rectangle {
    const screenHeight = this.getScreenHeight();
    const thumbReach = screenHeight * 0.7; // 엄지 도달 범위
    
    return {
      x: 0,
      y: screenHeight - thumbReach,
      width: this.getScreenWidth(),
      height: thumbReach
    };
  }
}
```

### 6.2 반응형 레이아웃
```typescript
// [의도] 다양한 화면 크기와 해상도에 대응하는 적응형 UI
// [책임] 화면 크기별 레이아웃 조정, 안전 영역 처리, 밀도 대응
class ResponsiveLayout {
  private breakpoints: BreakpointSet;
  private safeAreaManager: SafeAreaManager;
  private densityAdapter: DensityAdapter;
  
  // 화면 크기별 브레이크포인트
  breakpoints = {
    xs: { maxWidth: 480 },    // 작은 폰
    sm: { maxWidth: 768 },    // 큰 폰, 작은 태블릿
    md: { maxWidth: 1024 },   // 태블릿
    lg: { maxWidth: 1200 },   // 큰 태블릿
    xl: { minWidth: 1201 }    // 데스크톱
  };
  
  getCurrentBreakpoint(): BreakpointType {
    const screenWidth = this.getScreenWidth();
    
    if (screenWidth <= this.breakpoints.xs.maxWidth) return 'xs';
    if (screenWidth <= this.breakpoints.sm.maxWidth) return 'sm';
    if (screenWidth <= this.breakpoints.md.maxWidth) return 'md';
    if (screenWidth <= this.breakpoints.lg.maxWidth) return 'lg';
    return 'xl';
  }
  
  adaptLayoutForBreakpoint(layout: Layout, breakpoint: BreakpointType): Layout {
    const adaptedLayout = { ...layout };
    
    switch (breakpoint) {
      case 'xs':
        // 작은 화면: 단일 컬럼, 큰 터치 영역
        adaptedLayout.columns = 1;
        adaptedLayout.padding = 16;
        adaptedLayout.buttonSize = 'large';
        break;
        
      case 'sm':
        // 중간 화면: 2컬럼, 표준 터치 영역
        adaptedLayout.columns = 2;
        adaptedLayout.padding = 20;
        adaptedLayout.buttonSize = 'medium';
        break;
        
      case 'md':
      case 'lg':
        // 태블릿: 3컬럼, 더 많은 정보 표시
        adaptedLayout.columns = 3;
        adaptedLayout.padding = 24;
        adaptedLayout.buttonSize = 'medium';
        adaptedLayout.showExtendedInfo = true;
        break;
    }
    
    return adaptedLayout;
  }
  
  handleSafeArea(): void {
    const safeArea = this.safeAreaManager.getSafeArea();
    
    // 노치나 상태바를 피해 레이아웃 조정
    this.adjustTopMargin(safeArea.top);
    this.adjustBottomMargin(safeArea.bottom);
    
    // iPhone X 계열의 홈 인디케이터 고려
    if (safeArea.bottom > 0) {
      this.adjustBottomButtonsForHomeIndicator();
    }
  }
}
```

### 6.3 성능 최적화
```typescript
// [의도] 모바일 환경의 제한된 리소스에서 최적 성능 보장
// [책임] 메모리 관리, 렌더링 최적화, 배터리 효율성
class MobilePerformanceOptimizer {
  private memoryManager: MemoryManager;
  private renderOptimizer: RenderOptimizer;
  private batteryManager: BatteryManager;
  
  optimizeForMobile(): void {
    // UI 렌더링 최적화
    this.setupEfficientRendering();
    
    // 메모리 사용량 최적화
    this.optimizeMemoryUsage();
    
    // 배터리 소모 최적화
    this.optimizeBatteryUsage();
  }
  
  private setupEfficientRendering(): void {
    // 오브젝트 풀링으로 GC 부하 감소
    this.renderOptimizer.enableObjectPooling();
    
    // 화면 밖 요소는 렌더링 중단
    this.renderOptimizer.enableFrustumCulling();
    
    // LOD(Level of Detail) 시스템 활성화
    this.renderOptimizer.enableLODSystem();
    
    // 배치 렌더링으로 드로우콜 최적화
    this.renderOptimizer.enableBatchRendering();
  }
  
  private optimizeMemoryUsage(): void {
    // 텍스처 압축 및 최적화
    this.memoryManager.enableTextureCompression();
    
    // 미사용 리소스 자동 해제
    this.memoryManager.enableAutoCleanup();
    
    // 메모리 사용량 모니터링
    this.memoryManager.startMemoryMonitoring({
      warningThreshold: 0.8,  // 80% 사용 시 경고
      criticalThreshold: 0.9, // 90% 사용 시 긴급 정리
      onWarning: () => this.performLightCleanup(),
      onCritical: () => this.performAggressiveCleanup()
    });
  }
  
  private optimizeBatteryUsage(): void {
    // 프레임레이트 적응적 조절
    this.batteryManager.enableAdaptiveFrameRate({
      targetFPS: 60,
      minFPS: 30,
      batteryLevelThreshold: 0.2
    });
    
    // 백그라운드에서 불필요한 업데이트 중단
    this.batteryManager.onAppBackground(() => {
      this.pauseNonEssentialUpdates();
    });
    
    // 저전력 모드 감지 및 대응
    this.batteryManager.onLowPowerMode(() => {
      this.enablePowerSavingMode();
    });
  }
}
```

## 7. 접근성 및 다국어 지원

### 7.1 접근성 기능
```typescript
// [의도] 모든 사용자가 게임을 즐길 수 있도록 접근성 보장
// [책임] 시각/청각/운동 장애 지원, 보조 기술 호환성
class AccessibilityManager {
  private screenReader: ScreenReaderSupport;
  private colorBlindness: ColorBlindnessSupport;
  private motorImpairment: MotorImpairmentSupport;
  
  initializeAccessibility(): void {
    // 스크린 리더 지원
    this.setupScreenReaderSupport();
    
    // 색맹 지원
    this.setupColorBlindnessSupport();
    
    // 운동 장애 지원
    this.setupMotorImpairmentSupport();
    
    // 청각 장애 지원
    this.setupHearingImpairmentSupport();
  }
  
  private setupScreenReaderSupport(): void {
    // 모든 UI 요소에 적절한 레이블 추가
    this.addAccessibilityLabels();
    
    // 화면 내용 변화 알림
    this.screenReader.announceChanges({
      politeness: 'polite', // 또는 'assertive'
      onContentChange: (content) => this.announceContent(content)
    });
    
    // 네비게이션 힌트 제공
    this.screenReader.addNavigationHints({
      swipeRight: '다음 요소로 이동',
      swipeLeft: '이전 요소로 이동',
      doubleTap: '활성화',
      twoFingerTap: '게임 일시정지'
    });
  }
  
  private setupColorBlindnessSupport(): void {
    // 색맹 친화적 컬러 팔레트 제공
    this.colorBlindness.addColorBlindnessFilters([
      'protanopia',   // 적색맹
      'deuteranopia', // 녹색맹
      'tritanopia'    // 청색맹
    ]);
    
    // 색상 외 추가 시각적 단서 제공
    this.colorBlindness.addAlternativeIndicators({
      shapes: true,    // 모양으로 구분
      patterns: true,  // 패턴으로 구분
      symbols: true,   // 심볼로 구분
      animation: true  // 애니메이션으로 구분
    });
  }
  
  private setupMotorImpairmentSupport(): void {
    // 더 큰 터치 영역 제공
    this.motorImpairment.enlargeTouchAreas(1.5);
    
    // 드래그 대신 탭으로 카드 플레이 가능
    this.motorImpairment.enableTapToPlay();
    
    // 홀드 시간 조정 가능
    this.motorImpairment.enableAdjustableHoldTime();
    
    // 실수 방지를 위한 확인 다이얼로그
    this.motorImpairment.enableConfirmationDialogs();
  }
  
  // 접근성 텍스트 생성
  generateAccessibilityText(component: UIComponent): string {
    switch (component.type) {
      case 'Card':
        return `${component.name} 카드, 비용 ${component.cost} 엘릭서, ${component.description}`;
      
      case 'Button':
        return `${component.label} 버튼${component.disabled ? ', 비활성화됨' : ''}`;
      
      case 'ProgressBar':
        return `${component.label}, ${component.percentage}% 완료`;
      
      default:
        return component.accessibilityLabel || component.label || '';
    }
  }
}
```

### 7.2 다국어 지원 시스템
```typescript
// [의도] 글로벌 사용자를 위한 포괄적 다국어 지원
// [책임] 텍스트 번역, 문화적 적응, 레이아웃 조정
class LocalizationSystem {
  private translationManager: TranslationManager;
  private cultureAdapter: CultureAdapter;
  private layoutManager: LocalizedLayoutManager;
  
  private supportedLanguages = [
    { code: 'ko', name: '한국어', rtl: false },
    { code: 'en', name: 'English', rtl: false },
    { code: 'ja', name: '日本語', rtl: false },
    { code: 'zh-CN', name: '简体中文', rtl: false },
    { code: 'zh-TW', name: '繁體中文', rtl: false },
    { code: 'ar', name: 'العربية', rtl: true },
    { code: 'es', name: 'Español', rtl: false },
    { code: 'pt', name: 'Português', rtl: false }
  ];
  
  async initializeLocalization(): Promise<void> {
    // 사용자 선호 언어 감지
    const preferredLanguage = await this.detectUserLanguage();
    
    // 번역 파일 로드
    await this.loadTranslations(preferredLanguage);
    
    // 문화적 적응 설정
    await this.setupCulturalAdaptation(preferredLanguage);
    
    // RTL 언어 지원
    if (this.isRTLLanguage(preferredLanguage)) {
      await this.enableRTLLayout();
    }
  }
  
  async loadTranslations(languageCode: string): Promise<void> {
    const translationFiles = [
      'common.json',      // 공통 텍스트
      'ui.json',         // UI 텍스트
      'cards.json',      // 카드 이름/설명
      'tutorial.json',   // 튜토리얼
      'errors.json'      // 에러 메시지
    ];
    
    for (const file of translationFiles) {
      const translations = await this.loadTranslationFile(languageCode, file);
      this.translationManager.addTranslations(languageCode, translations);
    }
  }
  
  translate(key: string, params?: Record<string, any>): string {
    const currentLanguage = this.getCurrentLanguage();
    let translation = this.translationManager.get(currentLanguage, key);
    
    // 번역이 없으면 기본 언어(영어) 사용
    if (!translation) {
      translation = this.translationManager.get('en', key);
    }
    
    // 여전히 없으면 키 반환
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    // 매개변수 치환
    if (params) {
      translation = this.substituteParameters(translation, params);
    }
    
    return translation;
  }
  
  private async setupCulturalAdaptation(languageCode: string): Promise<void> {
    const cultureConfig = await this.getCultureConfig(languageCode);
    
    // 숫자 형식
    this.cultureAdapter.setNumberFormat(cultureConfig.numberFormat);
    
    // 날짜/시간 형식
    this.cultureAdapter.setDateTimeFormat(cultureConfig.dateTimeFormat);
    
    // 통화 형식
    this.cultureAdapter.setCurrencyFormat(cultureConfig.currencyFormat);
    
    // 문화적으로 민감한 콘텐츠 필터링
    this.cultureAdapter.applyContentFilter(cultureConfig.contentFilter);
  }
  
  // 동적 텍스트 크기 조정
  adjustTextSizeForLanguage(text: string, baseSize: number): number {
    const currentLanguage = this.getCurrentLanguage();
    
    // 언어별 텍스트 크기 조정 비율
    const sizeMultipliers = {
      'ja': 0.9,    // 일본어는 더 작게
      'zh-CN': 0.9, // 중국어(간체)는 더 작게
      'zh-TW': 0.9, // 중국어(번체)는 더 작게
      'ar': 1.1,    // 아랍어는 더 크게
      'ko': 1.0,    // 한국어는 기본 크기
      'en': 1.0     // 영어는 기본 크기
    };
    
    const multiplier = sizeMultipliers[currentLanguage] || 1.0;
    return Math.round(baseSize * multiplier);
  }
}
```

## 8. 성능 최적화

### 8.1 UI 렌더링 최적화
```typescript
// [의도] UI 렌더링 성능을 극대화하여 부드러운 사용자 경험 제공
// [책임] 드로우콜 최적화, 메모리 효율성, 프레임 드롭 방지
class UIRenderingOptimizer {
  private batchRenderer: BatchRenderer;
  private textureAtlas: TextureAtlasManager;
  private uiObjectPool: UIObjectPool;
  
  optimizeRendering(): void {
    // UI 요소 배치 렌더링 설정
    this.setupBatchRendering();
    
    // 텍스처 아틀라스 최적화
    this.optimizeTextureAtlas();
    
    // UI 오브젝트 풀링
    this.setupObjectPooling();
    
    // 불필요한 렌더링 제거
    this.enableCulling();
  }
  
  private setupBatchRendering(): void {
    // 같은 재질의 UI 요소들을 묶어서 렌더링
    this.batchRenderer.configure({
      maxBatchSize: 1000,
      sortByMaterial: true,
      sortByDepth: true,
      dynamicBatching: true
    });
    
    // UI 요소들을 렌더링 그룹별로 분류
    this.groupUIElementsForBatching();
  }
  
  private optimizeTextureAtlas(): void {
    // UI 스프라이트들을 큰 텍스처로 통합
    this.textureAtlas.createAtlas({
      name: 'ui_common',
      size: 2048,
      sprites: [
        'button_normal',
        'button_pressed',
        'card_frame',
        'progress_bar',
        'icon_gold',
        'icon_gem'
      ]
    });
    
    // 동적 폰트 아틀라스 생성
    this.textureAtlas.createDynamicFontAtlas({
      size: 1024,
      fontSize: [12, 14, 16, 18, 20, 24, 30, 36],
      characters: this.getRequiredCharacters()
    });
  }
  
  private setupObjectPooling(): void {
    // 자주 생성/삭제되는 UI 요소들 풀링
    this.uiObjectPool.createPool('DamageNumber', {
      initialSize: 50,
      maxSize: 200,
      factory: () => new DamageNumberComponent()
    });
    
    this.uiObjectPool.createPool('FloatingText', {
      initialSize: 20,
      maxSize: 100,
      factory: () => new FloatingTextComponent()
    });
    
    this.uiObjectPool.createPool('ParticleEffect', {
      initialSize: 30,
      maxSize: 150,
      factory: () => new ParticleEffectComponent()
    });
  }
  
  // 화면 밖 UI 요소 렌더링 제외
  private enableCulling(): void {
    const frustumCuller = new FrustumCuller();
    
    frustumCuller.setCullCallback((element: UIElement) => {
      const bounds = element.getBounds();
      const screenBounds = this.getScreenBounds();
      
      // 화면과 겹치지 않으면 렌더링 제외
      return !bounds.intersects(screenBounds);
    });
  }
}
```

### 8.2 메모리 관리
```typescript
// [의도] UI 관련 메모리 사용량을 효율적으로 관리
// [책임] 메모리 누수 방지, 자동 정리, 사용량 모니터링
class UIMemoryManager {
  private memoryMonitor: MemoryMonitor;
  private resourceCleaner: ResourceCleaner;
  private cacheManager: UICacheManager;
  
  initializeMemoryManagement(): void {
    // 메모리 사용량 모니터링 시작
    this.startMemoryMonitoring();
    
    // 자동 리소스 정리 설정
    this.setupAutoCleanup();
    
    // UI 캐시 관리
    this.setupCacheManagement();
  }
  
  private startMemoryMonitoring(): void {
    this.memoryMonitor.startMonitoring({
      interval: 5000, // 5초마다 체크
      thresholds: {
        warning: 0.7,  // 70% 사용 시 경고
        critical: 0.85 // 85% 사용 시 강제 정리
      },
      
      onWarning: (usage) => {
        console.warn(`UI Memory usage high: ${usage * 100}%`);
        this.performLightCleanup();
      },
      
      onCritical: (usage) => {
        console.error(`UI Memory usage critical: ${usage * 100}%`);
        this.performAggressiveCleanup();
      }
    });
  }
  
  private performLightCleanup(): void {
    // 불필요한 캐시 정리
    this.cacheManager.clearUnusedCache();
    
    // 비활성 UI 요소 정리
    this.resourceCleaner.cleanupInactiveElements();
    
    // 오래된 텍스처 해제
    this.resourceCleaner.releaseOldTextures(60000); // 1분 이상 미사용
  }
  
  private performAggressiveCleanup(): void {
    // 모든 캐시 정리
    this.cacheManager.clearAllCache();
    
    // 현재 화면 외 모든 UI 정리
    this.resourceCleaner.cleanupOffscreenUI();
    
    // 가비지 컬렉션 강제 실행
    this.forceGarbageCollection();
    
    // 텍스처 압축 실행
    this.compressTextures();
  }
  
  // UI 요소의 라이프사이클 관리
  manageUILifecycle(element: UIElement): void {
    // 생성 시 등록
    this.registerElement(element);
    
    // 소멸 시 자동 정리
    element.onDestroy(() => {
      this.unregisterElement(element);
      this.cleanupElementResources(element);
    });
    
    // 비활성화 시 리소스 해제
    element.onDeactivate(() => {
      this.releaseElementResources(element);
    });
    
    // 활성화 시 리소스 복원
    element.onActivate(() => {
      this.restoreElementResources(element);
    });
  }
}
```

## 9. 사용자 피드백 시스템

### 9.1 햅틱 피드백
```typescript
// [의도] 촉각적 피드백을 통한 몰입감 있는 사용자 경험 제공
// [책임] 상황별 햅틱 패턴, 강도 조절, 배터리 효율성 고려
class HapticFeedbackSystem {
  private hapticEngine: HapticEngine;
  private patternLibrary: HapticPatternLibrary;
  private userPreferences: HapticPreferences;
  
  initializeHapticFeedback(): void {
    // 디바이스 햅틱 지원 확인
    if (!this.hapticEngine.isSupported()) {
      console.log('Haptic feedback not supported on this device');
      return;
    }
    
    // 햅틱 패턴 라이브러리 로드
    this.loadHapticPatterns();
    
    // 사용자 설정 적용
    this.applyUserPreferences();
  }
  
  private loadHapticPatterns(): void {
    // 기본 햅틱 패턴들
    this.patternLibrary.addPattern('light_tap', {
      type: 'impact',
      intensity: 'light',
      duration: 10
    });
    
    this.patternLibrary.addPattern('medium_tap', {
      type: 'impact',
      intensity: 'medium',
      duration: 15
    });
    
    this.patternLibrary.addPattern('heavy_tap', {
      type: 'impact',
      intensity: 'heavy',
      duration: 20
    });
    
    // 게임 전용 패턴들
    this.patternLibrary.addPattern('card_play', {
      type: 'selection',
      intensity: 'medium'
    });
    
    this.patternLibrary.addPattern('battle_win', {
      type: 'success',
      pattern: [100, 50, 100, 50, 200]
    });
    
    this.patternLibrary.addPattern('battle_lose', {
      type: 'failure',
      pattern: [200, 100, 200]
    });
    
    this.patternLibrary.addPattern('critical_hit', {
      type: 'impact',
      intensity: 'heavy',
      pattern: [50, 30, 100]
    });
  }
  
  // 상황별 햅틱 피드백 실행
  playHapticForEvent(eventType: GameEventType, context?: any): void {
    if (!this.userPreferences.enabled) return;
    
    let patternName: string;
    
    switch (eventType) {
      case 'card_select':
        patternName = 'light_tap';
        break;
      case 'card_play':
        patternName = 'card_play';
        break;
      case 'unit_spawn':
        patternName = 'medium_tap';
        break;
      case 'tower_damage':
        patternName = 'heavy_tap';
        break;
      case 'battle_victory':
        patternName = 'battle_win';
        break;
      case 'battle_defeat':
        patternName = 'battle_lose';
        break;
      case 'critical_hit':
        patternName = 'critical_hit';
        break;
      default:
        return;
    }
    
    this.playPattern(patternName);
  }
  
  private playPattern(patternName: string): void {
    const pattern = this.patternLibrary.getPattern(patternName);
    if (pattern) {
      this.hapticEngine.play(pattern);
    }
  }
}
```

### 9.2 오디오 피드백
```typescript
// [의도] 상황에 맞는 오디오 피드백으로 사용자 경험 향상
// [책임] 사운드 이펙트 관리, 공간음향, 동적 믹싱
class AudioFeedbackSystem {
  private audioManager: AudioManager;
  private soundLibrary: SoundLibrary;
  private spatialAudio: SpatialAudioEngine;
  
  initializeAudioFeedback(): void {
    // 오디오 엔진 초기화
    this.audioManager.initialize({
      sampleRate: 44100,
      bufferSize: 512,
      maxVoices: 32
    });
    
    // 사운드 라이브러리 로드
    this.loadSoundLibrary();
    
    // 공간 음향 설정
    this.setupSpatialAudio();
  }
  
  private loadSoundLibrary(): void {
    const sounds = [
      // UI 사운드
      { id: 'button_click', file: 'ui/button_click.wav', volume: 0.7 },
      { id: 'card_select', file: 'ui/card_select.wav', volume: 0.6 },
      { id: 'card_play', file: 'ui/card_play.wav', volume: 0.8 },
      
      // 전투 사운드
      { id: 'unit_spawn', file: 'battle/unit_spawn.wav', volume: 0.8 },
      { id: 'sword_hit', file: 'battle/sword_hit.wav', volume: 0.9 },
      { id: 'arrow_shoot', file: 'battle/arrow_shoot.wav', volume: 0.7 },
      { id: 'explosion', file: 'battle/explosion.wav', volume: 1.0 },
      
      // 결과 사운드
      { id: 'victory_fanfare', file: 'result/victory.wav', volume: 0.9 },
      { id: 'defeat_sound', file: 'result/defeat.wav', volume: 0.8 },
      
      // 알림 사운드
      { id: 'notification', file: 'ui/notification.wav', volume: 0.6 },
      { id: 'error', file: 'ui/error.wav', volume: 0.7 }
    ];
    
    for (const sound of sounds) {
      this.soundLibrary.load(sound.id, sound.file, sound.volume);
    }
  }
  
  playAudioForEvent(eventType: GameEventType, position?: Vector3): void {
    let soundId: string;
    let options: AudioPlayOptions = {};
    
    switch (eventType) {
      case 'button_click':
        soundId = 'button_click';
        break;
      case 'card_select':
        soundId = 'card_select';
        break;
      case 'card_play':
        soundId = 'card_play';
        break;
      case 'unit_spawn':
        soundId = 'unit_spawn';
        options.position = position;
        break;
      case 'unit_attack':
        soundId = 'sword_hit';
        options.position = position;
        options.randomPitch = 0.2; // 피치 변조로 단조로움 방지
        break;
      case 'spell_cast':
        soundId = 'explosion';
        options.position = position;
        options.delay = 0.1; // 약간의 지연으로 임팩트 증가
        break;
      default:
        return;
    }
    
    this.audioManager.play(soundId, options);
  }
  
  // 동적 오디오 믹싱
  updateAudioMix(gameState: GameState): void {
    // 전투 중에는 UI 사운드 볼륨 감소
    if (gameState.inBattle) {
      this.audioManager.setGroupVolume('ui', 0.5);
      this.audioManager.setGroupVolume('battle', 1.0);
    } else {
      this.audioManager.setGroupVolume('ui', 1.0);
      this.audioManager.setGroupVolume('battle', 0.8);
    }
    
    // 메뉴에서는 배경음악 증가
    if (gameState.currentScreen === 'home') {
      this.audioManager.setGroupVolume('music', 0.8);
    } else {
      this.audioManager.setGroupVolume('music', 0.6);
    }
  }
}
```

## 10. UI 테스팅 및 분석

### 10.1 자동화된 UI 테스트
```typescript
// [의도] UI의 기능성과 일관성을 자동으로 검증
// [책임] 기능 테스트, 회귀 테스트, 성능 테스트 자동화
class UITestingFramework {
  private testRunner: TestRunner;
  private screenshotComparator: ScreenshotComparator;
  private performanceProfiler: PerformanceProfiler;
  
  async runUITests(): Promise<TestResult[]> {
    const testSuites = [
      this.createFunctionalTests(),
      this.createVisualRegressionTests(),
      this.createPerformanceTests(),
      this.createAccessibilityTests()
    ];
    
    const results: TestResult[] = [];
    
    for (const suite of testSuites) {
      const suiteResult = await this.testRunner.runSuite(suite);
      results.push(suiteResult);
    }
    
    return results;
  }
  
  private createFunctionalTests(): TestSuite {
    return {
      name: 'Functional UI Tests',
      tests: [
        {
          name: 'Card Selection',
          test: async () => {
            // 카드 선택 테스트
            const battleScreen = await this.openBattleScreen();
            const handCards = battleScreen.getHandCards();
            
            for (const card of handCards) {
              await this.simulateCardTap(card);
              assert(card.isSelected(), 'Card should be selected after tap');
            }
          }
        },
        {
          name: 'Card Drag and Drop',
          test: async () => {
            // 카드 드래그 앤 드롭 테스트
            const battleScreen = await this.openBattleScreen();
            const card = battleScreen.getFirstCard();
            const dropPosition = { x: 400, y: 300 };
            
            await this.simulateCardDrag(card, dropPosition);
            
            // 카드가 올바른 위치에 플레이되었는지 확인
            const playedCard = battleScreen.getPlayedCardAt(dropPosition);
            assert(playedCard !== null, 'Card should be played at drop position');
          }
        }
      ]
    };
  }
  
  private createVisualRegressionTests(): TestSuite {
    return {
      name: 'Visual Regression Tests',
      tests: [
        {
          name: 'Home Screen Layout',
          test: async () => {
            const homeScreen = await this.openHomeScreen();
            const screenshot = await this.takeScreenshot();
            
            const referenceImage = await this.loadReferenceImage('home_screen.png');
            const similarity = await this.screenshotComparator.compare(
              screenshot, 
              referenceImage
            );
            
            assert(similarity > 0.95, 'Home screen layout should match reference');
          }
        }
      ]
    };
  }
  
  private createPerformanceTests(): TestSuite {
    return {
      name: 'UI Performance Tests',
      tests: [
        {
          name: 'Battle Screen Frame Rate',
          test: async () => {
            const battleScreen = await this.openBattleScreen();
            
            // 30초간 프레임률 측정
            this.performanceProfiler.startProfiling();
            await this.simulateBattleFor(30000);
            const metrics = this.performanceProfiler.stopProfiling();
            
            assert(metrics.averageFPS >= 55, 'Battle should maintain 55+ FPS');
            assert(metrics.frameDrops < 5, 'Should have less than 5 frame drops');
          }
        }
      ]
    };
  }
}
```

### 10.2 사용자 행동 분석
```typescript
// [의도] 실제 사용자의 UI 사용 패턴을 분석하여 개선점 발굴
// [책임] 사용자 상호작용 추적, 히트맵 생성, UX 메트릭 수집
class UserBehaviorAnalytics {
  private interactionTracker: InteractionTracker;
  private heatmapGenerator: HeatmapGenerator;
  private uxMetricsCollector: UXMetricsCollector;
  
  initializeAnalytics(): void {
    // 사용자 상호작용 추적 시작
    this.startInteractionTracking();
    
    // UX 메트릭 수집 설정
    this.setupUXMetrics();
    
    // 히트맵 데이터 수집
    this.startHeatmapCollection();
  }
  
  private startInteractionTracking(): void {
    // 모든 UI 요소의 상호작용 추적
    this.interactionTracker.trackAll({
      events: ['tap', 'long_press', 'drag', 'pinch', 'swipe'],
      includePosition: true,
      includeTimestamp: true,
      includeDuration: true
    });
    
    // 특별히 관심있는 이벤트들
    this.interactionTracker.trackSpecial([
      {
        event: 'card_play_attempt',
        data: ['card_id', 'success', 'failure_reason', 'position']
      },
      {
        event: 'screen_transition',
        data: ['from_screen', 'to_screen', 'transition_time', 'method']
      },
      {
        event: 'error_encountered',
        data: ['error_type', 'screen', 'user_action', 'recovery_method']
      }
    ]);
  }
  
  private setupUXMetrics(): void {
    // 주요 UX 메트릭들 정의
    this.uxMetricsCollector.defineMetrics([
      {
        name: 'task_completion_rate',
        description: '사용자가 의도한 작업을 완료한 비율',
        calculation: 'completed_tasks / attempted_tasks'
      },
      {
        name: 'time_to_first_interaction',
        description: '화면 로드 후 첫 상호작용까지의 시간',
        target: '< 2 seconds'
      },
      {
        name: 'error_recovery_time',
        description: '에러 발생 후 정상 상태로 복구까지의 시간',
        target: '< 5 seconds'
      },
      {
        name: 'navigation_efficiency',
        description: '목표 화면 도달까지의 클릭 수',
        target: '< 3 clicks for common tasks'
      }
    ]);
  }
  
  async generateUXReport(): Promise<UXAnalyticsReport> {
    const report: UXAnalyticsReport = {
      period: this.getReportPeriod(),
      
      // 상호작용 통계
      interactions: await this.analyzeInteractions(),
      
      // 사용자 여정 분석
      userJourneys: await this.analyzeUserJourneys(),
      
      // 에러 및 문제점 분석
      errorAnalysis: await this.analyzeErrors(),
      
      // 성능 메트릭
      performanceMetrics: await this.collectPerformanceMetrics(),
      
      // 개선 권장사항
      recommendations: await this.generateRecommendations()
    };
    
    return report;
  }
  
  private async analyzeUserJourneys(): Promise<UserJourneyAnalysis> {
    const journeys = await this.interactionTracker.getUserJourneys();
    
    return {
      mostCommonPaths: this.findMostCommonPaths(journeys),
      dropOffPoints: this.identifyDropOffPoints(journeys),
      conversionFunnels: this.analyzeConversionFunnels(journeys),
      timeSpentPerScreen: this.calculateTimePerScreen(journeys)
    };
  }
  
  private async generateRecommendations(): Promise<UXRecommendation[]> {
    const recommendations: UXRecommendation[] = [];
    
    // 높은 드롭오프율을 보이는 화면 개선
    const highDropOffScreens = await this.getHighDropOffScreens();
    for (const screen of highDropOffScreens) {
      recommendations.push({
        priority: 'high',
        category: 'navigation',
        title: `${screen} 화면 사용성 개선`,
        description: `${screen} 화면에서 높은 이탈률이 관찰됩니다.`,
        suggestions: [
          '로딩 시간 단축',
          '더 명확한 안내 메시지 제공',
          '핵심 액션 버튼을 더 눈에 띄게 배치'
        ]
      });
    }
    
    // 자주 발생하는 에러 해결
    const commonErrors = await this.getCommonErrors();
    for (const error of commonErrors) {
      recommendations.push({
        priority: 'medium',
        category: 'error_prevention',
        title: `${error.type} 에러 방지`,
        description: `${error.frequency}회 발생한 ${error.type} 에러 방지`,
        suggestions: [
          '입력 검증 강화',
          '사용자 가이드 개선',
          '에러 메시지 명확화'
        ]
      });
    }
    
    return recommendations;
  }
}
```

## 결론

이 UI/UX 시스템 설계는 Royal Clash 게임이 모바일 환경에서 최적의 사용자 경험을 제공할 수 있도록 종합적인 접근 방식을 제시합니다.

주요 특징:
- **모바일 최적화**: 터치 인터페이스와 한 손 조작에 특화된 설계
- **직관적 인터페이스**: 쉬운 학습 곡선과 명확한 정보 구조
- **접근성 보장**: 다양한 사용자층을 고려한 포용적 디자인
- **성능 최적화**: 제한된 모바일 리소스에서도 부드러운 경험
- **데이터 기반 개선**: 사용자 행동 분석을 통한 지속적 UX 개선

이 설계를 통해 플레이어들은 직관적이고 반응성이 뛰어난 인터페이스를 통해 게임에 몰입할 수 있으며, 개발팀은 체계적인 UI 시스템으로 효율적인 개발과 유지보수가 가능해집니다.