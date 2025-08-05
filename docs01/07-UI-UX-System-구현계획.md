# Shadow Archer 구현 계획서: UI/UX 시스템

## 1. 🎯 구현 목표

이 문서는 `docs/07-UI-UX-System.md`에 정의된 **UI/UX 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 모바일 환경에 최적화된 직관적인 UI/UX 시스템, 터치 기반 인터랙션, 적응형 UI 레이아웃, 접근성을 고려한 사용자 인터페이스를 완성하여 뛰어난 사용자 경험을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

UI/UX 시스템 구현은 `assets/scripts/ui` 폴더를 중심으로 진행됩니다.

### 2.1. UI Core (UI 핵심)

```
assets/scripts/ui/
├── UIManager.ts                     # ✅ UI 시스템 총괄 관리자
├── UIPanel.ts                       # ✅ 모든 UI 패널의 기본 클래스
├── UIEventBus.ts                    # ✅ UI 전용 이벤트 시스템
├── UIObjectPool.ts                  # ✅ UI 요소 오브젝트 풀링
└── UIThemeManager.ts                # ✅ UI 테마 및 스타일 관리
```

### 2.2. Game HUD (게임 HUD)

```
assets/scripts/ui/hud/
├── GameHUD.ts                       # ✅ 인게임 HUD 시스템
├── HealthBar.ts                     # ✅ 체력바 컴포넌트
├── StaminaBar.ts                    # ✅ 스태미나바 컴포넌트
├── MiniMap.ts                       # ✅ 미니맵 시스템
├── Crosshair.ts                     # ✅ 조준선 시스템
└── DamageIndicator.ts               # ✅ 데미지 표시 시스템
```

### 2.3. Menu System (메뉴 시스템)

```
assets/scripts/ui/menus/
├── MenuSystem.ts                    # ✅ 메뉴 관리 시스템
├── MainMenu.ts                      # ✅ 메인 메뉴
├── SettingsMenu.ts                  # ✅ 설정 메뉴
├── InventoryPanel.ts                # ✅ 인벤토리 UI
├── ShopPanel.ts                     # ✅ 상점 UI
└── SkillTreePanel.ts                # ✅ 스킬 트리 UI
```

### 2.4. Mobile Input (모바일 입력)

```
assets/scripts/ui/input/
├── MobileInputSystem.ts             # ✅ 모바일 입력 관리자
├── VirtualJoystick.ts               # ✅ 가상 조이스틱
├── TouchManager.ts                  # ✅ 터치 이벤트 관리
├── GestureRecognizer.ts             # ✅ 제스처 인식 시스템
└── HapticManager.ts                 # ✅ 햅틱 피드백 관리
```

### 2.5. UI Animation (UI 애니메이션)

```
assets/scripts/ui/animation/
├── UIAnimationSystem.ts             # ✅ UI 애니메이션 관리자
├── TweenManager.ts                  # ✅ 트윈 애니메이션 시스템
├── TransitionEffects.ts             # ✅ 화면 전환 효과
└── UIParticleEffects.ts             # ✅ UI 파티클 효과
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/07-UI-UX-System.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 UI 아키텍처 구축 (가장 중요)**
*   **기간:** 6일
*   **목표:** UI 패널 관리와 기본적인 UI 요소 표시가 정상 작동한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `UIManager.ts`: UI 패널의 생명주기와 스택 관리를 구현합니다.
        ```typescript
        export class UIManager {
            private static instance: UIManager;
            private panelStack: UIPanel[] = [];
            private registeredPanels: Map<string, UIPanel> = new Map();
            private eventBus: UIEventBus;
            
            showPanel(panelId: string, data?: any, addToStack: boolean = true): void {
                const panel = this.registeredPanels.get(panelId);
                if (!panel) return;
                
                // 현재 패널 숨기기
                if (this.panelStack.length > 0 && addToStack) {
                    const currentPanel = this.panelStack[this.panelStack.length - 1];
                    currentPanel.hide();
                }
                
                // 새 패널 표시
                panel.show(data);
                
                if (addToStack) {
                    this.panelStack.push(panel);
                }
                
                this.eventBus.emit('panel_changed', { panelId, action: 'show' });
            }
        }
        ```
    2.  **[Task 1.2]** `UIPanel.ts`: 모든 UI 패널의 기본 구조와 애니메이션을 구현합니다.
    3.  **[Task 1.3]** `UIEventBus.ts`: UI 전용 이벤트 시스템으로 패널 간 통신을 구현합니다.
    4.  **[Task 1.4]** **기본 패널 테스트:** 간단한 메뉴 패널들이 정상적으로 표시되고 전환되는지 검증합니다.
    5.  **[Task 1.5]** `UIObjectPool.ts`: UI 요소의 재사용을 위한 오브젝트 풀링을 구현합니다.

### **Phase 2: 게임 HUD 시스템 구현**
*   **기간:** 5일
*   **목표:** 인게임에서 필요한 모든 HUD 요소가 실시간으로 업데이트된다.
*   **작업 내용:**
    1.  **[Task 2.1]** `GameHUD.ts`: 전투 중 표시되는 HUD의 전체 레이아웃과 업데이트를 구현합니다.
        ```typescript
        export class GameHUD extends UIPanel {
            private healthBar: HealthBar;
            private staminaBar: StaminaBar;
            private crosshair: Crosshair;
            private miniMap: MiniMap;
            private damageIndicators: DamageIndicator[] = [];
            
            protected onShow(data?: any): void {
                this.initializeHUDElements();
                this.bindGameEvents();
                this.startHUDUpdate();
            }
            
            private bindGameEvents(): void {
                EventBus.getInstance().on('player:health_changed', (data) => {
                    this.healthBar.updateHealth(data.health, data.maxHealth);
                });
                
                EventBus.getInstance().on('player:stamina_changed', (data) => {
                    this.staminaBar.updateStamina(data.stamina, data.maxStamina);
                });
                
                EventBus.getInstance().on('damage_dealt', (data) => {
                    this.showDamageIndicator(data.amount, data.position);
                });
            }
        }
        ```
    2.  **[Task 2.2]** `HealthBar.ts` & `StaminaBar.ts`: 부드러운 애니메이션과 경고 효과를 가진 상태바를 구현합니다.
    3.  **[Task 2.3]** `Crosshair.ts`: 타겟팅과 연동된 동적 조준선 시스템을 구현합니다.
    4.  **[Task 2.4]** `MiniMap.ts`: 실시간 미니맵과 웨이포인트 표시를 구현합니다.
    5.  **[Task 2.5]** `DamageIndicator.ts`: 플로팅 데미지 표시와 다양한 데미지 타입 시각화를 구현합니다.

### **Phase 3: 모바일 입력 시스템**
*   **기간:** 7일
*   **목표:** 터치 기반의 직관적인 게임 조작이 완벽하게 동작한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `MobileInputSystem.ts`: 터치 이벤트의 통합 관리와 제스처 인식을 구현합니다.
        ```typescript
        export class MobileInputSystem {
            private touchManager: TouchManager;
            private gestureRecognizer: GestureRecognizer;
            private virtualJoystick: VirtualJoystick;
            private hapticManager: HapticManager;
            
            initialize(): void {
                this.setupTouchHandlers();
                this.initializeGestureRecognition();
                this.virtualJoystick = new VirtualJoystick();
            }
            
            private onTouchStart(event: EventTouch): void {
                const touchPoint = event.getUILocation();
                
                // 가상 조이스틱 영역 체크
                if (this.virtualJoystick.isInJoystickArea(touchPoint)) {
                    this.virtualJoystick.handleTouchStart(event);
                    return;
                }
                
                // 제스처 인식 시작
                this.gestureRecognizer.startGesture(event);
                
                // 햅틱 피드백
                this.hapticManager.playTouchFeedback();
            }
        }
        ```
    2.  **[Task 3.2]** `VirtualJoystick.ts`: 부드러운 가상 조이스틱과 데드존 처리를 구현합니다.
    3.  **[Task 3.3]** `GestureRecognizer.ts`: 스와이프, 탭, 핀치, 길게 누르기 등의 제스처를 구현합니다.
    4.  **[Task 3.4]** `TouchManager.ts`: 멀티터치 지원과 터치 포인트 추적을 구현합니다.
    5.  **[Task 3.5]** `HapticManager.ts`: 다양한 상황에 맞는 햅틱 피드백을 구현합니다.
    6.  **[Task 3.6]** **입력 시스템 테스트:** 모든 터치 입력이 정확하고 반응성 있게 처리되는지 검증합니다.

### **Phase 4: 메뉴 및 인벤토리 시스템**
*   **기간:** 6일
*   **목표:** 복잡한 메뉴 네비게이션과 인벤토리 관리가 직관적으로 동작한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `MenuSystem.ts`: 메뉴 간 네비게이션과 히스토리 관리를 구현합니다.
        ```typescript
        export class MenuSystem {
            private menuHistory: string[] = [];
            private currentMenu: string | null = null;
            
            navigateToMenu(menuId: string, addToHistory: boolean = true): void {
                if (this.currentMenu && addToHistory) {
                    this.menuHistory.push(this.currentMenu);
                }
                
                this.currentMenu = menuId;
                UIManager.getInstance().showPanel(menuId);
                
                // 안드로이드 백 버튼 처리
                this.updateBackButtonHandler();
            }
            
            goBack(): boolean {
                if (this.menuHistory.length === 0) return false;
                
                const previousMenu = this.menuHistory.pop()!;
                this.currentMenu = previousMenu;
                UIManager.getInstance().showPanel(previousMenu);
                
                return true;
            }
        }
        ```
    2.  **[Task 4.2]** `InventoryPanel.ts`: 드래그 앤 드롭과 아이템 정렬이 가능한 인벤토리를 구현합니다.
    3.  **[Task 4.3]** `SettingsMenu.ts`: 그래픽, 오디오, 컨트롤 설정의 실시간 적용을 구현합니다.
    4.  **[Task 4.4]** **메뉴 애니메이션:** 부드러운 메뉴 전환과 시각적 피드백을 구현합니다.
    5.  **[Task 4.5]** **메뉴 시스템 테스트:** 복잡한 메뉴 네비게이션이 직관적이고 오류 없이 동작하는지 검증합니다.

### **Phase 5: UI 애니메이션 및 최적화**
*   **기간:** 4일
*   **목표:** 부드럽고 매력적인 UI 애니메이션과 성능 최적화를 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `UIAnimationSystem.ts`: 다양한 UI 애니메이션 패턴과 이징 함수를 구현합니다.
        ```typescript
        export class UIAnimationSystem {
            // 페이드 인 애니메이션
            fadeIn(node: Node, duration: number = 0.3): Promise<void> {
                return new Promise((resolve) => {
                    const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
                    opacity.opacity = 0;
                    node.active = true;
                    
                    tween(opacity)
                        .to(duration, { opacity: 255 }, { easing: 'sineOut' })
                        .call(() => resolve())
                        .start();
                });
            }
            
            // 스케일 팝 애니메이션
            popIn(node: Node, duration: number = 0.4): Promise<void> {
                return new Promise((resolve) => {
                    node.setScale(0, 0, 1);
                    node.active = true;
                    
                    tween(node)
                        .to(duration * 0.7, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'backOut' })
                        .to(duration * 0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
                        .call(() => resolve())
                        .start();
                });
            }
            
            // 리플 효과
            rippleEffect(node: Node, touchPosition: Vec2): void {
                const ripple = this.createRippleNode(touchPosition);
                node.addChild(ripple);
                
                const maxSize = Math.max(node.getComponent(UITransform).width, 
                                       node.getComponent(UITransform).height) * 2;
                
                tween(ripple.getComponent(UITransform))
                    .to(0.6, { contentSize: new Size(maxSize, maxSize) })
                    .start();
                    
                tween(ripple.getComponent(UIOpacity))
                    .to(0.6, { opacity: 0 })
                    .call(() => ripple.destroy())
                    .start();
            }
        }
        ```
    2.  **[Task 5.2]** `TransitionEffects.ts`: 화면 전환 시 사용할 다양한 시각 효과를 구현합니다.
    3.  **[Task 5.3]** **성능 최적화:** UI 렌더링 최적화와 메모리 사용량 최소화를 구현합니다.
    4.  **[Task 5.4]** **접근성 기능:** 색맹, 시각 장애를 고려한 UI 옵션을 구현합니다.
    5.  **[Task 5.5]** **UI 시스템 통합 테스트:** 모든 UI 시스템이 통합되어 완벽하게 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 적응형 UI 레이아웃

```typescript
// 다양한 화면 크기에 자동 적응하는 UI 시스템
export class AdaptiveLayoutManager {
    private screenSizeRanges: ScreenSizeRange[] = [
        { name: 'phone_portrait', minWidth: 320, maxWidth: 480, minHeight: 568, maxHeight: 1024 },
        { name: 'phone_landscape', minWidth: 568, maxWidth: 1024, minHeight: 320, maxHeight: 480 },
        { name: 'tablet_portrait', minWidth: 768, maxWidth: 1024, minHeight: 1024, maxHeight: 1366 },
        { name: 'tablet_landscape', minWidth: 1024, maxWidth: 1366, minHeight: 768, maxHeight: 1024 }
    ];
    
    adaptUIToScreen(): void {
        const screenSize = view.getVisibleSize();
        const deviceRange = this.getDeviceRange(screenSize);
        
        // UI 스케일 조정
        const baseScale = this.calculateBaseScale(screenSize);
        Canvas.instance.node.setScale(baseScale, baseScale, 1);
        
        // 안전 영역 적용 (노치, 홈 인디케이터 등)
        this.applySafeArea();
        
        // 레이아웃별 UI 요소 조정
        this.adjustUIElements(deviceRange);
    }
    
    private calculateBaseScale(screenSize: Size): number {
        const referenceWidth = 1080; // 기준 해상도
        const referenceHeight = 1920;
        
        const scaleX = screenSize.width / referenceWidth;
        const scaleY = screenSize.height / referenceHeight;
        
        // 작은 쪽에 맞춰 스케일링하여 UI가 잘리지 않도록 함
        return Math.min(scaleX, scaleY);
    }
}
```

### 4.2. 스마트 터치 영역 관리

```typescript
// 터치하기 쉬운 크기와 간격을 자동으로 조정
export class TouchAreaManager {
    private readonly MIN_TOUCH_SIZE = 44; // iOS HIG 기준
    private readonly MIN_TOUCH_SPACING = 8;
    
    optimizeTouchArea(button: Node): void {
        const uiTransform = button.getComponent(UITransform);
        const currentSize = uiTransform.contentSize;
        
        // 최소 터치 크기 보장
        const optimalWidth = Math.max(currentSize.width, this.MIN_TOUCH_SIZE);
        const optimalHeight = Math.max(currentSize.height, this.MIN_TOUCH_SIZE);
        
        // 터치 영역 확장 (시각적 크기는 유지하면서 히트 영역만 확장)
        if (currentSize.width < this.MIN_TOUCH_SIZE || currentSize.height < this.MIN_TOUCH_SIZE) {
            this.expandHitArea(button, optimalWidth, optimalHeight);
        }
        
        // 주변 버튼과의 간격 체크
        this.ensureProperSpacing(button);
    }
    
    private expandHitArea(button: Node, width: number, height: number): void {
        // 투명한 히트 영역 생성
        const hitArea = new Node('HitArea');
        const hitTransform = hitArea.addComponent(UITransform);
        hitTransform.setContentSize(width, height);
        
        // 기존 버튼을 히트 영역의 자식으로 만들어 시각적 크기는 유지
        button.parent.addChild(hitArea);
        button.parent = hitArea;
        
        // 이벤트 처리를 히트 영역으로 이동
        const buttonComponent = button.getComponent(Button);
        hitArea.addComponent(Button);
        hitArea.getComponent(Button).clickEvents = buttonComponent.clickEvents;
    }
}
```

### 4.3. UI 상태 기반 애니메이션

```typescript
// UI 요소의 상태 변화에 따른 자동 애니메이션
export class UIStateAnimator {
    private stateAnimations: Map<string, StateAnimation> = new Map();
    
    registerStateAnimation(elementId: string, states: UIState[]): void {
        this.stateAnimations.set(elementId, new StateAnimation(states));
    }
    
    transitionToState(elementId: string, newState: string, duration: number = 0.3): void {
        const animation = this.stateAnimations.get(elementId);
        if (!animation) return;
        
        const element = find(elementId);
        if (!element) return;
        
        const currentState = animation.getCurrentState();
        const targetState = animation.getState(newState);
        
        if (!targetState) return;
        
        // 상태 간 보간 애니메이션
        this.interpolateStates(element, currentState, targetState, duration);
        animation.setCurrentState(newState);
    }
    
    private interpolateStates(element: Node, from: UIState, to: UIState, duration: number): void {
        // 위치 애니메이션
        if (from.position !== to.position) {
            tween(element).to(duration, { position: to.position }).start();
        }
        
        // 스케일 애니메이션
        if (from.scale !== to.scale) {
            tween(element).to(duration, { scale: to.scale }).start();
        }
        
        // 투명도 애니메이션
        const opacity = element.getComponent(UIOpacity);
        if (opacity && from.opacity !== to.opacity) {
            tween(opacity).to(duration, { opacity: to.opacity }).start();
        }
        
        // 색상 애니메이션
        const sprite = element.getComponent(Sprite);
        if (sprite && !from.color.equals(to.color)) {
            tween(sprite).to(duration, { color: to.color }).start();
        }
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **UI/UX 설계 문서 완벽 준수:** `07-UI-UX-System.md`에 정의된 모든 UI 컴포넌트와 상호작용을 정확히 구현합니다.

2.  **모바일 UX 최적화:** 터치 인터페이스에 최적화된 직관적이고 반응성 있는 UI를 구현합니다.

3.  **성능 우선:** UI 렌더링과 애니메이션이 게임 성능에 영향을 주지 않도록 최적화합니다.

4.  **접근성 고려:** 다양한 사용자가 편리하게 사용할 수 있는 포용적 디자인을 구현합니다.

5.  **일관성 유지:** 모든 UI 요소가 일관된 디자인 언어와 상호작용 패턴을 따르도록 합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **UI 렌더링:** UI 업데이트가 게임 프레임레이트에 2% 이상 영향 없음
- **터치 반응성:** 터치 입력에서 UI 반응까지 50ms 이내
- **메모리 효율성:** UI 시스템 전체 메모리 사용량 50MB 이하
- **애니메이션 부드러움:** 모든 UI 애니메이션이 60FPS로 실행

### 6.2. 검증 기준
- 복잡한 메뉴에서도 즉각적인 반응성 보장
- 다양한 화면 크기에서 일관된 사용자 경험 제공
- 터치 정확도 99% 이상 (의도하지 않은 터치 오작동 1% 이하)
- UI 오브젝트 풀링으로 동적 UI 생성 비용 90% 절감
- 접근성 기능이 정상적으로 동작하여 포용적 사용자 경험 제공

이 구현 계획을 통해 Shadow Archer의 UI/UX 시스템을 완성하여 플레이어에게 직관적이고 몰입감 있는 사용자 인터페이스 경험을 제공할 수 있을 것입니다.