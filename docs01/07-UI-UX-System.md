# UI/UX 시스템 설계

## 개요

Shadow Archer 모바일 3D 소울라이크 게임의 UI/UX 시스템 설계서입니다. 모바일 환경에 최적화된 직관적인 인터페이스와 사용자 경험을 제공하는 시스템을 다룹니다.

## 설계 원칙

### 모바일 우선 설계
- 한 손 조작 최적화
- 터치 친화적 UI 요소
- 반응형 레이아웃
- 접근성 고려

### 성능 최적화
- UI 요소 풀링
- 배치 렌더링
- 메모리 효율적 관리
- 60fps 목표 성능

## 시스템 아키텍처

### 1. UI 매니저 시스템

```typescript
// [의도] UI 시스템의 중앙 관리자로서 모든 UI 요소의 생명주기와 상태를 통제
// [책임] UI 패널 관리, UI 이벤트 처리, UI 상태 동기화, 성능 최적화
export class UIManager {
    private panels: Map<string, UIPanel> = new Map();
    private panelStack: UIPanel[] = [];
    private eventBus: UIEventBus;
    private uiPool: UIObjectPool;
    
    constructor() {
        this.eventBus = new UIEventBus();
        this.uiPool = new UIObjectPool();
        this.setupEventHandlers();
    }
    
    // UI 패널 등록 및 관리
    registerPanel(panelId: string, panel: UIPanel): void {
        this.panels.set(panelId, panel);
        panel.setManager(this);
    }
    
    // 패널 표시 (스택 관리)
    showPanel(panelId: string, data?: any): void {
        const panel = this.panels.get(panelId);
        if (!panel) return;
        
        // 현재 패널 비활성화
        if (this.panelStack.length > 0) {
            const currentPanel = this.panelStack[this.panelStack.length - 1];
            currentPanel.hide();
        }
        
        // 새 패널 활성화
        panel.show(data);
        this.panelStack.push(panel);
        
        this.eventBus.emit('panel_changed', { panelId, action: 'show' });
    }
    
    // 패널 숨기기
    hidePanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (!panel) return;
        
        panel.hide();
        const index = this.panelStack.indexOf(panel);
        if (index > -1) {
            this.panelStack.splice(index, 1);
        }
        
        // 이전 패널 활성화
        if (this.panelStack.length > 0) {
            const previousPanel = this.panelStack[this.panelStack.length - 1];
            previousPanel.show();
        }
        
        this.eventBus.emit('panel_changed', { panelId, action: 'hide' });
    }
    
    // 모든 패널 닫기
    closeAllPanels(): void {
        this.panelStack.forEach(panel => panel.hide());
        this.panelStack = [];
    }
    
    // UI 업데이트 (매 프레임)
    update(deltaTime: number): void {
        // 활성 패널들만 업데이트
        this.panelStack.forEach(panel => {
            if (panel.isActive()) {
                panel.update(deltaTime);
            }
        });
        
        // UI 애니메이션 업데이트
        this.updateAnimations(deltaTime);
    }
    
    private updateAnimations(deltaTime: number): void {
        // UI 트윈 애니메이션 처리
        TweenManager.getInstance().update(deltaTime);
    }
    
    private setupEventHandlers(): void {
        // 게임 이벤트 -> UI 업데이트
        EventBus.getInstance().on('player_health_changed', (health: number) => {
            this.eventBus.emit('update_health_ui', health);
        });
        
        EventBus.getInstance().on('player_stamina_changed', (stamina: number) => {
            this.eventBus.emit('update_stamina_ui', stamina);
        });
    }
}
```

### 2. UI 패널 기본 클래스

```typescript
// [의도] 모든 UI 패널의 기본 구조와 공통 기능을 제공
// [책임] 패널 생명주기 관리, 애니메이션 처리, 이벤트 바인딩
export abstract class UIPanel {
    protected node: Node;
    protected isVisible: boolean = false;
    protected manager: UIManager;
    protected animations: Map<string, Tween<Node>> = new Map();
    
    constructor(node: Node) {
        this.node = node;
        this.node.active = false;
        this.setupComponents();
        this.bindEvents();
    }
    
    setManager(manager: UIManager): void {
        this.manager = manager;
    }
    
    // 패널 표시
    show(data?: any): void {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.node.active = true;
        this.onShow(data);
        
        // 입장 애니메이션
        this.playShowAnimation();
    }
    
    // 패널 숨기기
    hide(): void {
        if (!this.isVisible) return;
        
        this.playHideAnimation(() => {
            this.isVisible = false;
            this.node.active = false;
            this.onHide();
        });
    }
    
    isActive(): boolean {
        return this.isVisible;
    }
    
    // 업데이트 (오버라이드 가능)
    update(deltaTime: number): void {
        // 서브클래스에서 구현
    }
    
    // 추상 메서드들 (서브클래스에서 구현)
    protected abstract setupComponents(): void;
    protected abstract bindEvents(): void;
    protected abstract onShow(data?: any): void;
    protected abstract onHide(): void;
    
    // 애니메이션 처리
    protected playShowAnimation(): void {
        this.node.setScale(0.8, 0.8, 1);
        this.node.getComponent(UIOpacity).opacity = 0;
        
        const scaleTween = tween(this.node)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' });
        
        const opacityTween = tween(this.node.getComponent(UIOpacity))
            .to(0.3, { opacity: 255 });
        
        Promise.all([scaleTween.start(), opacityTween.start()]);
    }
    
    protected playHideAnimation(callback?: () => void): void {
        const scaleTween = tween(this.node)
            .to(0.2, { scale: new Vec3(0.8, 0.8, 1) });
        
        const opacityTween = tween(this.node.getComponent(UIOpacity))
            .to(0.2, { opacity: 0 })
            .call(() => {
                if (callback) callback();
            });
        
        Promise.all([scaleTween.start(), opacityTween.start()]);
    }
}
```

### 3. 인게임 HUD 시스템

```typescript
// [의도] 전투 중 필요한 핵심 UI 요소들을 실시간으로 표시
// [책임] 체력, 스태미나, 조준선, 미니맵, 스킬 쿨다운 등 게임플레이 UI 관리
export class GameHUD extends UIPanel {
    private healthBar: ProgressBar;
    private staminaBar: ProgressBar;
    private crosshair: Node;
    private miniMap: MiniMap;
    private skillButtons: SkillButton[] = [];
    private damageIndicators: DamageIndicator[] = [];
    
    protected setupComponents(): void {
        // 체력 바 설정
        this.healthBar = this.node.getChildByName('HealthBar').getComponent(ProgressBar);
        this.healthBar.progress = 1.0;
        
        // 스태미나 바 설정
        this.staminaBar = this.node.getChildByName('StaminaBar').getComponent(ProgressBar);
        this.staminaBar.progress = 1.0;
        
        // 조준선 설정
        this.crosshair = this.node.getChildByName('Crosshair');
        this.setupCrosshair();
        
        // 미니맵 설정
        this.miniMap = this.node.getChildByName('MiniMap').getComponent(MiniMap);
        
        // 스킬 버튼들 설정
        this.setupSkillButtons();
    }
    
    protected bindEvents(): void {
        // 플레이어 상태 변화 이벤트 처리
        this.manager.eventBus.on('update_health_ui', this.updateHealth.bind(this));
        this.manager.eventBus.on('update_stamina_ui', this.updateStamina.bind(this));
        this.manager.eventBus.on('show_damage', this.showDamageIndicator.bind(this));
        this.manager.eventBus.on('update_crosshair', this.updateCrosshair.bind(this));
    }
    
    protected onShow(data?: any): void {
        // HUD 표시 시 초기화
        this.updatePlayerStatus();
        this.miniMap.activate();
    }
    
    protected onHide(): void {
        // HUD 숨김 시 정리
        this.miniMap.deactivate();
        this.clearDamageIndicators();
    }
    
    update(deltaTime: number): void {
        super.update(deltaTime);
        
        // 미니맵 업데이트
        this.miniMap.update(deltaTime);
        
        // 데미지 인디케이터 업데이트
        this.updateDamageIndicators(deltaTime);
        
        // 스킬 쿨다운 업데이트
        this.updateSkillCooldowns(deltaTime);
    }
    
    // 체력 업데이트
    private updateHealth(health: number): void {
        const targetProgress = health / 100;
        
        // 부드러운 체력바 애니메이션
        tween(this.healthBar)
            .to(0.3, { progress: targetProgress })
            .start();
        
        // 체력이 낮을 때 경고 효과
        if (health < 30) {
            this.playLowHealthWarning();
        }
    }
    
    // 스태미나 업데이트
    private updateStamina(stamina: number): void {
        const targetProgress = stamina / 100;
        
        tween(this.staminaBar)
            .to(0.1, { progress: targetProgress })
            .start();
    }
    
    // 조준선 설정
    private setupCrosshair(): void {
        // 기본 조준선 스타일
        this.crosshair.getComponent(UIOpacity).opacity = 200;
        
        // 적 탐지 시 색상 변경
        const crosshairSprite = this.crosshair.getComponent(Sprite);
        crosshairSprite.color = Color.WHITE;
    }
    
    // 조준선 업데이트
    private updateCrosshair(data: { hasTarget: boolean, distance: number }): void {
        const crosshairSprite = this.crosshair.getComponent(Sprite);
        
        if (data.hasTarget) {
            // 타겟이 있을 때 빨간색으로 변경
            crosshairSprite.color = Color.RED;
            
            // 거리에 따른 크기 조정
            const scale = Math.max(0.8, 1.0 - data.distance * 0.01);
            this.crosshair.setScale(scale, scale, 1);
        } else {
            // 타겟이 없을 때 기본 상태
            crosshairSprite.color = Color.WHITE;
            this.crosshair.setScale(1, 1, 1);
        }
    }
    
    // 스킬 버튼 설정
    private setupSkillButtons(): void {
        const skillContainer = this.node.getChildByName('SkillContainer');
        
        for (let i = 0; i < 4; i++) {
            const skillNode = skillContainer.getChildByName(`Skill${i}`);
            const skillButton = new SkillButton(skillNode, i);
            this.skillButtons.push(skillButton);
        }
    }
    
    // 데미지 인디케이터 표시
    private showDamageIndicator(data: { damage: number, position: Vec3, type: string }): void {
        const indicator = this.getDamageIndicator();
        indicator.show(data.damage, data.position, data.type);
        this.damageIndicators.push(indicator);
    }
    
    private getDamageIndicator(): DamageIndicator {
        // 오브젝트 풀에서 가져오기
        return UIObjectPool.getInstance().getDamageIndicator();
    }
    
    private updateDamageIndicators(deltaTime: number): void {
        for (let i = this.damageIndicators.length - 1; i >= 0; i--) {
            const indicator = this.damageIndicators[i];
            indicator.update(deltaTime);
            
            if (indicator.isFinished()) {
                UIObjectPool.getInstance().returnDamageIndicator(indicator);
                this.damageIndicators.splice(i, 1);
            }
        }
    }
    
    // 저체력 경고 효과
    private playLowHealthWarning(): void {
        const healthBarBg = this.healthBar.node.parent;
        
        tween(healthBarBg)
            .to(0.5, { opacity: 100 })
            .to(0.5, { opacity: 255 })
            .union()
            .repeat(3)
            .start();
    }
    
    private updateSkillCooldowns(deltaTime: number): void {
        this.skillButtons.forEach(button => button.update(deltaTime));
    }
    
    private updatePlayerStatus(): void {
        // 플레이어 매니저에서 현재 상태 가져와서 UI 동기화
        const playerManager = GameManager.getInstance().getPlayerManager();
        this.updateHealth(playerManager.getHealth());
        this.updateStamina(playerManager.getStamina());
    }
    
    private clearDamageIndicators(): void {
        this.damageIndicators.forEach(indicator => {
            UIObjectPool.getInstance().returnDamageIndicator(indicator);
        });
        this.damageIndicators = [];
    }
}
```

### 4. 메뉴 시스템

```typescript
// [의도] 게임의 모든 메뉴 화면을 관리하는 시스템
// [책임] 메인 메뉴, 설정, 인벤토리, 상점 등 메뉴 UI 처리
export class MenuSystem {
    private menuPanels: Map<MenuType, MenuPanel> = new Map();
    private currentMenu: MenuPanel | null = null;
    private menuHistory: MenuPanel[] = [];
    
    constructor(private uiManager: UIManager) {
        this.initializeMenus();
    }
    
    private initializeMenus(): void {
        // 메인 메뉴
        this.registerMenu(MenuType.MAIN, new MainMenuPanel());
        
        // 설정 메뉴
        this.registerMenu(MenuType.SETTINGS, new SettingsMenuPanel());
        
        // 인벤토리
        this.registerMenu(MenuType.INVENTORY, new InventoryPanel());
        
        // 상점
        this.registerMenu(MenuType.SHOP, new ShopPanel());
        
        // 스킬 트리
        this.registerMenu(MenuType.SKILL_TREE, new SkillTreePanel());
    }
    
    private registerMenu(type: MenuType, panel: MenuPanel): void {
        this.menuPanels.set(type, panel);
        this.uiManager.registerPanel(type.toString(), panel);
    }
    
    // 메뉴 열기
    openMenu(type: MenuType, data?: any): void {
        const panel = this.menuPanels.get(type);
        if (!panel) return;
        
        // 현재 메뉴를 히스토리에 추가
        if (this.currentMenu) {
            this.menuHistory.push(this.currentMenu);
        }
        
        // 새 메뉴 활성화
        this.currentMenu = panel;
        this.uiManager.showPanel(type.toString(), data);
        
        // 입력 처리 설정
        this.setupMenuInput(panel);
    }
    
    // 메뉴 닫기
    closeMenu(): void {
        if (!this.currentMenu) return;
        
        this.uiManager.hidePanel(this.currentMenu.constructor.name);
        
        // 이전 메뉴로 돌아가기
        if (this.menuHistory.length > 0) {
            this.currentMenu = this.menuHistory.pop();
            this.uiManager.showPanel(this.currentMenu.constructor.name);
        } else {
            this.currentMenu = null;
        }
    }
    
    // 뒤로 가기
    goBack(): void {
        this.closeMenu();
    }
    
    private setupMenuInput(panel: MenuPanel): void {
        // 백 버튼 처리 (안드로이드)
        input.on(Input.EventType.KEY_DOWN, (event: EventKeyboard) => {
            if (event.keyCode === KeyCode.ESCAPE || event.keyCode === KeyCode.BACK_SPACE) {
                this.goBack();
            }
        });
    }
}

// 메뉴 타입 열거형
export enum MenuType {
    MAIN = 'main',
    SETTINGS = 'settings',
    INVENTORY = 'inventory',
    SHOP = 'shop',
    SKILL_TREE = 'skill_tree',
    PAUSE = 'pause'
}
```

### 5. 인벤토리 UI 시스템

```typescript
// [의도] 플레이어의 아이템 관리를 위한 직관적인 인벤토리 인터페이스 제공
// [책임] 아이템 표시, 드래그 앤 드롭, 정렬, 필터링, 아이템 상세 정보 표시
export class InventoryPanel extends UIPanel {
    private itemSlots: ItemSlot[] = [];
    private selectedSlot: ItemSlot | null = null;
    private itemInfoPanel: ItemInfoPanel;
    private filterButtons: Button[] = [];
    private sortButton: Button;
    private currentFilter: ItemType = ItemType.ALL;
    private dragPreview: Node;
    
    protected setupComponents(): void {
        // 아이템 슬롯 그리드 생성
        this.createItemSlots();
        
        // 아이템 정보 패널
        this.itemInfoPanel = new ItemInfoPanel(
            this.node.getChildByName('ItemInfoPanel')
        );
        
        // 필터 버튼들
        this.setupFilterButtons();
        
        // 정렬 버튼
        this.sortButton = this.node.getChildByName('SortButton').getComponent(Button);
        
        // 드래그 프리뷰 노드
        this.dragPreview = this.node.getChildByName('DragPreview');
        this.dragPreview.active = false;
    }
    
    protected bindEvents(): void {
        // 인벤토리 데이터 변경 이벤트
        EventBus.getInstance().on('inventory_updated', this.refreshInventory.bind(this));
        
        // 필터 버튼 이벤트
        this.filterButtons.forEach((button, index) => {
            button.node.on(Button.EventType.CLICK, () => {
                this.setFilter(index as ItemType);
            });
        });
        
        // 정렬 버튼 이벤트
        this.sortButton.node.on(Button.EventType.CLICK, this.sortItems.bind(this));
    }
    
    protected onShow(data?: any): void {
        this.refreshInventory();
        this.itemInfoPanel.hide();
    }
    
    protected onHide(): void {
        this.selectedSlot = null;
        this.itemInfoPanel.hide();
    }
    
    private createItemSlots(): void {
        const slotContainer = this.node.getChildByName('SlotContainer');
        const slotPrefab = this.node.getChildByName('SlotPrefab');
        
        // 8x6 그리드 생성
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 8; col++) {
                const slotNode = instantiate(slotPrefab);
                slotNode.parent = slotContainer;
                
                // 위치 설정
                const x = col * 80 - 280; // 슬롯 간격 80
                const y = 200 - row * 80;
                slotNode.setPosition(x, y, 0);
                
                const slot = new ItemSlot(slotNode, row * 8 + col);
                slot.onItemSelected = this.onItemSlotSelected.bind(this);
                slot.onItemDragStart = this.onItemDragStart.bind(this);
                slot.onItemDragEnd = this.onItemDragEnd.bind(this);
                
                this.itemSlots.push(slot);
            }
        }
        
        slotPrefab.destroy();
    }
    
    private setupFilterButtons(): void {
        const filterContainer = this.node.getChildByName('FilterContainer');
        
        const filterTypes = [
            ItemType.ALL,
            ItemType.WEAPON,
            ItemType.ARMOR,
            ItemType.CONSUMABLE,
            ItemType.MATERIAL
        ];
        
        filterTypes.forEach((type, index) => {
            const buttonNode = filterContainer.getChildByName(`Filter${index}`);
            const button = buttonNode.getComponent(Button);
            this.filterButtons.push(button);
        });
    }
    
    private refreshInventory(): void {
        const inventory = GameManager.getInstance().getInventoryManager();
        const items = inventory.getFilteredItems(this.currentFilter);
        
        // 모든 슬롯 초기화
        this.itemSlots.forEach(slot => slot.clear());
        
        // 아이템 배치
        items.forEach((item, index) => {
            if (index < this.itemSlots.length) {
                this.itemSlots[index].setItem(item);
            }
        });
    }
    
    private setFilter(filterType: ItemType): void {
        this.currentFilter = filterType;
        
        // 필터 버튼 상태 업데이트
        this.filterButtons.forEach((button, index) => {
            const isActive = index === filterType;
            button.interactable = !isActive;
            
            // 시각적 피드백
            const buttonBg = button.node.getComponent(Sprite);
            buttonBg.color = isActive ? Color.YELLOW : Color.WHITE;
        });
        
        this.refreshInventory();
    }
    
    private sortItems(): void {
        const inventory = GameManager.getInstance().getInventoryManager();
        inventory.sortItems();
        this.refreshInventory();
        
        // 정렬 완료 피드백
        this.playButtonFeedback(this.sortButton.node);
    }
    
    private onItemSlotSelected(slot: ItemSlot): void {
        // 이전 선택 해제
        if (this.selectedSlot) {
            this.selectedSlot.setSelected(false);
        }
        
        // 새 선택
        this.selectedSlot = slot;
        slot.setSelected(true);
        
        // 아이템 정보 표시
        if (slot.hasItem()) {
            this.itemInfoPanel.showItem(slot.getItem());
        } else {
            this.itemInfoPanel.hide();
        }
    }
    
    private onItemDragStart(slot: ItemSlot, position: Vec3): void {
        if (!slot.hasItem()) return;
        
        // 드래그 프리뷰 활성화
        this.dragPreview.active = true;
        this.dragPreview.setWorldPosition(position);
        
        // 프리뷰 이미지 설정
        const item = slot.getItem();
        const previewSprite = this.dragPreview.getComponent(Sprite);
        previewSprite.spriteFrame = item.icon;
        
        // 반투명 효과
        const opacity = this.dragPreview.getComponent(UIOpacity);
        opacity.opacity = 180;
    }
    
    private onItemDragEnd(fromSlot: ItemSlot, toSlot: ItemSlot): void {
        this.dragPreview.active = false;
        
        if (!fromSlot.hasItem() || fromSlot === toSlot) return;
        
        // 아이템 교환
        const fromItem = fromSlot.getItem();
        const toItem = toSlot.getItem();
        
        // 인벤토리 데이터 업데이트
        const inventory = GameManager.getInstance().getInventoryManager();
        inventory.swapItems(fromSlot.getIndex(), toSlot.getIndex());
        
        // UI 업데이트
        fromSlot.setItem(toItem);
        toSlot.setItem(fromItem);
        
        // 교환 완료 효과
        this.playSlotSwapEffect(fromSlot, toSlot);
    }
    
    private playButtonFeedback(buttonNode: Node): void {
        tween(buttonNode)
            .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }
    
    private playSlotSwapEffect(slot1: ItemSlot, slot2: ItemSlot): void {
        // 슬롯 강조 효과
        const highlight1 = slot1.node.getChildByName('Highlight');
        const highlight2 = slot2.node.getChildByName('Highlight');
        
        [highlight1, highlight2].forEach(highlight => {
            const opacity = highlight.getComponent(UIOpacity);
            opacity.opacity = 0;
            highlight.active = true;
            
            tween(opacity)
                .to(0.2, { opacity: 255 })
                .to(0.3, { opacity: 0 })
                .call(() => highlight.active = false)
                .start();
        });
    }
}
```

### 6. 모바일 최적화 입력 시스템

```typescript
// [의도] 모바일 환경에 최적화된 터치 입력 및 제스처 처리 시스템
// [책임] 터치 이벤트 처리, 가상 조이스틱, 제스처 인식, 햅틱 피드백
export class MobileInputSystem {
    private virtualJoystick: VirtualJoystick;
    private touchManager: TouchManager;
    private gestureRecognizer: GestureRecognizer;
    private hapticManager: HapticManager;
    
    constructor() {
        this.initializeComponents();
        this.setupTouchEvents();
    }
    
    private initializeComponents(): void {
        // 가상 조이스틱
        this.virtualJoystick = new VirtualJoystick();
        
        // 터치 매니저
        this.touchManager = new TouchManager();
        
        // 제스처 인식기
        this.gestureRecognizer = new GestureRecognizer();
        
        // 햅틱 피드백
        this.hapticManager = new HapticManager();
    }
    
    private setupTouchEvents(): void {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart.bind(this));
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove.bind(this));
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd.bind(this));
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel.bind(this));
    }
    
    private onTouchStart(event: EventTouch): void {
        const touchId = event.getID();
        const location = event.getUILocation();
        
        // 터치 포인트 등록
        this.touchManager.addTouch(touchId, location);
        
        // 가상 조이스틱 영역 체크
        this.virtualJoystick.handleTouchStart(touchId, location);
        
        // 제스처 시작 감지
        this.gestureRecognizer.onTouchStart(touchId, location);
        
        // 햅틱 피드백
        this.hapticManager.playTouchFeedback();
    }
    
    private onTouchMove(event: EventTouch): void {
        const touchId = event.getID();
        const location = event.getUILocation();
        
        // 터치 위치 업데이트
        this.touchManager.updateTouch(touchId, location);
        
        // 가상 조이스틱 처리
        this.virtualJoystick.handleTouchMove(touchId, location);
        
        // 제스처 추적
        this.gestureRecognizer.onTouchMove(touchId, location);
    }
    
    private onTouchEnd(event: EventTouch): void {
        const touchId = event.getID();
        const location = event.getUILocation();
        
        // 제스처 종료 처리
        const gesture = this.gestureRecognizer.onTouchEnd(touchId, location);
        if (gesture) {
            this.handleGesture(gesture);
        }
        
        // 가상 조이스틱 해제
        this.virtualJoystick.handleTouchEnd(touchId, location);
        
        // 터치 포인트 제거
        this.touchManager.removeTouch(touchId);
    }
    
    private onTouchCancel(event: EventTouch): void {
        const touchId = event.getID();
        
        // 모든 관련 처리 취소
        this.gestureRecognizer.onTouchCancel(touchId);
        this.virtualJoystick.handleTouchCancel(touchId);
        this.touchManager.removeTouch(touchId);
    }
    
    private handleGesture(gesture: GestureData): void {
        switch (gesture.type) {
            case GestureType.TAP:
                this.handleTap(gesture);
                break;
            case GestureType.DOUBLE_TAP:
                this.handleDoubleTap(gesture);
                break;
            case GestureType.LONG_PRESS:
                this.handleLongPress(gesture);
                break;
            case GestureType.SWIPE:
                this.handleSwipe(gesture);
                break;
            case GestureType.PINCH:
                this.handlePinch(gesture);
                break;
        }
    }
    
    private handleTap(gesture: GestureData): void {
        // 탭 이벤트 처리
        EventBus.getInstance().emit('input_tap', {
            position: gesture.position,
            force: gesture.force
        });
        
        this.hapticManager.playLightFeedback();
    }
    
    private handleDoubleTap(gesture: GestureData): void {
        // 더블탭 이벤트 처리 (대시, 스킬 사용 등)
        EventBus.getInstance().emit('input_double_tap', {
            position: gesture.position
        });
        
        this.hapticManager.playMediumFeedback();
    }
    
    private handleLongPress(gesture: GestureData): void {
        // 길게 누르기 (차지 공격, 메뉴 열기 등)
        EventBus.getInstance().emit('input_long_press', {
            position: gesture.position,
            duration: gesture.duration
        });
        
        this.hapticManager.playHeavyFeedback();
    }
    
    private handleSwipe(gesture: GestureData): void {
        // 스와이프 (회피, 스킬 등)
        EventBus.getInstance().emit('input_swipe', {
            direction: gesture.direction,
            velocity: gesture.velocity,
            distance: gesture.distance
        });
        
        this.hapticManager.playMediumFeedback();
    }
    
    private handlePinch(gesture: GestureData): void {
        // 핀치 줌 (카메라 줌 등)
        EventBus.getInstance().emit('input_pinch', {
            scale: gesture.scale,
            center: gesture.center
        });
    }
}

// 가상 조이스틱 클래스
export class VirtualJoystick {
    private joystickNode: Node;
    private knobNode: Node;
    private activeTouch: number = -1;
    private deadZone: number = 0.1;
    private maxDistance: number = 100;
    private currentInput: Vec2 = new Vec2();
    
    constructor() {
        this.setupJoystick();
    }
    
    private setupJoystick(): void {
        // 조이스틱 UI 노드 찾기
        this.joystickNode = find('Canvas/UI/VirtualJoystick');
        this.knobNode = this.joystickNode.getChildByName('Knob');
        
        // 초기 상태 설정
        this.joystickNode.active = false;
    }
    
    handleTouchStart(touchId: number, location: Vec2): boolean {
        if (this.activeTouch !== -1) return false;
        
        // 조이스틱 영역 체크 (화면 왼쪽 하단)
        const screenSize = view.getVisibleSize();
        const joystickArea = new Rect(0, 0, screenSize.width * 0.3, screenSize.height * 0.4);
        
        if (joystickArea.contains(location)) {
            this.activeTouch = touchId;
            
            // 조이스틱 위치 설정
            this.joystickNode.setWorldPosition(location.x, location.y, 0);
            this.joystickNode.active = true;
            
            // 노브 초기화
            this.knobNode.setPosition(0, 0, 0);
            
            return true;
        }
        
        return false;
    }
    
    handleTouchMove(touchId: number, location: Vec2): void {
        if (this.activeTouch !== touchId) return;
        
        // 조이스틱 중심에서의 거리 계산
        const joystickPos = this.joystickNode.getWorldPosition();
        const offset = new Vec2(location.x - joystickPos.x, location.y - joystickPos.y);
        const distance = offset.length();
        
        // 최대 거리 제한
        if (distance > this.maxDistance) {
            offset.normalize();
            offset.multiplyScalar(this.maxDistance);
        }
        
        // 노브 위치 업데이트
        this.knobNode.setPosition(offset.x, offset.y, 0);
        
        // 입력 값 계산
        this.currentInput.set(offset.x / this.maxDistance, offset.y / this.maxDistance);
        
        // 데드존 적용
        if (this.currentInput.length() < this.deadZone) {
            this.currentInput.set(0, 0);
        }
        
        // 입력 이벤트 발송
        EventBus.getInstance().emit('joystick_input', this.currentInput);
    }
    
    handleTouchEnd(touchId: number, location: Vec2): void {
        if (this.activeTouch !== touchId) return;
        
        // 조이스틱 비활성화
        this.activeTouch = -1;
        this.joystickNode.active = false;
        this.currentInput.set(0, 0);
        
        // 입력 중지 이벤트
        EventBus.getInstance().emit('joystick_input', this.currentInput);
    }
    
    handleTouchCancel(touchId: number): void {
        if (this.activeTouch === touchId) {
            this.handleTouchEnd(touchId, new Vec2());
        }
    }
    
    getCurrentInput(): Vec2 {
        return this.currentInput.clone();
    }
}
```

### 7. UI 애니메이션 및 트윈 시스템

```typescript
// [의도] UI 요소들의 부드럽고 직관적인 애니메이션을 관리
// [책임] 트윈 애니메이션, 시퀀스 애니메이션, 이징 함수, 애니메이션 큐 관리
export class UIAnimationSystem {
    private activeTweens: Map<string, ITween<any>[]> = new Map();
    private animationQueue: AnimationQueueItem[] = [];
    private isProcessingQueue: boolean = false;
    
    constructor() {
        this.setupEasingFunctions();
    }
    
    // 페이드 인 애니메이션
    fadeIn(node: Node, duration: number = 0.3, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            opacity.opacity = 0;
            node.active = true;
            
            const tweenId = this.generateTweenId(node, 'fadeIn');
            const fadeTween = tween(opacity)
                .delay(delay)
                .to(duration, { opacity: 255 }, { easing: 'sineOut' })
                .call(() => {
                    this.removeTween(tweenId);
                    resolve();
                });
            
            this.addTween(tweenId, fadeTween);
            fadeTween.start();
        });
    }
    
    // 페이드 아웃 애니메이션
    fadeOut(node: Node, duration: number = 0.3, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            
            const tweenId = this.generateTweenId(node, 'fadeOut');
            const fadeTween = tween(opacity)
                .delay(delay)
                .to(duration, { opacity: 0 }, { easing: 'sineIn' })
                .call(() => {
                    node.active = false;
                    this.removeTween(tweenId);
                    resolve();
                });
            
            this.addTween(tweenId, fadeTween);
            fadeTween.start();
        });
    }
    
    // 스케일 애니메이션 (팝업 효과)
    popIn(node: Node, duration: number = 0.4, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            node.setScale(0, 0, 1);
            node.active = true;
            
            const tweenId = this.generateTweenId(node, 'popIn');
            const scaleTween = tween(node)
                .delay(delay)
                .to(duration * 0.7, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'backOut' })
                .to(duration * 0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
                .call(() => {
                    this.removeTween(tweenId);
                    resolve();
                });
            
            this.addTween(tweenId, scaleTween);
            scaleTween.start();
        });
    }
    
    // 스케일 아웃 애니메이션
    popOut(node: Node, duration: number = 0.3, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            const tweenId = this.generateTweenId(node, 'popOut');
            const scaleTween = tween(node)
                .delay(delay)
                .to(duration, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
                .call(() => {
                    node.active = false;
                    this.removeTween(tweenId);
                    resolve();
                });
            
            this.addTween(tweenId, scaleTween);
            scaleTween.start();
        });
    }
    
    // 슬라이드 인 애니메이션
    slideIn(node: Node, direction: SlideDirection, duration: number = 0.5, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            const screenSize = view.getVisibleSize();
            const startPos = this.getSlideStartPosition(direction, screenSize);
            const endPos = node.getPosition();
            
            node.setPosition(startPos);
            node.active = true;
            
            const tweenId = this.generateTweenId(node, 'slideIn');
            const slideTween = tween(node)
                .delay(delay)
                .to(duration, { position: endPos }, { easing: 'cubicOut' })
                .call(() => {
                    this.removeTween(tweenId);
                    resolve();
                });
            
            this.addTween(tweenId, slideTween);
            slideTween.start();
        });
    }
    
    // 번지는 효과 (리플)
    rippleEffect(node: Node, touchPosition: Vec2, duration: number = 0.6): void {
        // 리플 이팩트 노드 생성
        const rippleNode = new Node('Ripple');
        rippleNode.parent = node;
        
        // 터치 위치에 배치
        const localPos = node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(touchPosition.x, touchPosition.y, 0));
        rippleNode.setPosition(localPos);
        
        // 원형 스프라이트 추가
        const sprite = rippleNode.addComponent(Sprite);
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        const transform = rippleNode.addComponent(UITransform);
        transform.setContentSize(0, 0);
        
        const opacity = rippleNode.addComponent(UIOpacity);
        opacity.opacity = 100;
        
        // 애니메이션
        const maxSize = Math.max(node.getComponent(UITransform).width, node.getComponent(UITransform).height) * 2;
        
        Promise.all([
            new Promise<void>((resolve) => {
                tween(transform)
                    .to(duration, { contentSize: new Size(maxSize, maxSize) }, { easing: 'cubicOut' })
                    .call(resolve)
                    .start();
            }),
            new Promise<void>((resolve) => {
                tween(opacity)
                    .to(duration, { opacity: 0 }, { easing: 'cubicOut' })
                    .call(resolve)
                    .start();
            })
        ]).then(() => {
            rippleNode.destroy();
        });
    }
    
    // 시퀀스 애니메이션
    sequence(animations: (() => Promise<void>)[]): Promise<void> {
        return animations.reduce((promise, animation) => {
            return promise.then(() => animation());
        }, Promise.resolve());
    }
    
    // 병렬 애니메이션
    parallel(animations: (() => Promise<void>)[]): Promise<void> {
        return Promise.all(animations.map(animation => animation())).then(() => {});
    }
    
    // 애니메이션 일시 정지
    pauseAllAnimations(): void {
        this.activeTweens.forEach((tweens) => {
            tweens.forEach(tween => {
                // Cocos Creator 트윈은 일시정지 기능이 제한적이므로 
                // 커스텀 구현이 필요할 수 있음
            });
        });
    }
    
    // 애니메이션 재개
    resumeAllAnimations(): void {
        // 마찬가지로 커스텀 구현 필요
    }
    
    // 특정 노드의 모든 애니메이션 정지
    stopAnimations(node: Node): void {
        const nodeId = node.uuid;
        const tweens = this.activeTweens.get(nodeId);
        
        if (tweens) {
            tweens.forEach(tween => {
                tween.stop();
            });
            this.activeTweens.delete(nodeId);
        }
    }
    
    // 모든 애니메이션 정지
    stopAllAnimations(): void {
        this.activeTweens.forEach((tweens) => {
            tweens.forEach(tween => tween.stop());
        });
        this.activeTweens.clear();
    }
    
    private setupEasingFunctions(): void {
        // 커스텀 이징 함수들 등록
        // Cocos Creator의 기본 이징 함수들을 확장
    }
    
    private generateTweenId(node: Node, animationType: string): string {
        return `${node.uuid}_${animationType}_${Date.now()}`;
    }
    
    private addTween(id: string, tween: ITween<any>): void {
        const nodeId = id.split('_')[0];
        
        if (!this.activeTweens.has(nodeId)) {
            this.activeTweens.set(nodeId, []);
        }
        
        this.activeTweens.get(nodeId)!.push(tween);
    }
    
    private removeTween(id: string): void {
        const nodeId = id.split('_')[0];
        const tweens = this.activeTweens.get(nodeId);
        
        if (tweens) {
            const index = tweens.findIndex(tween => 
                tween.toString().includes(id.split('_')[1])
            );
            
            if (index > -1) {
                tweens.splice(index, 1);
            }
            
            if (tweens.length === 0) {
                this.activeTweens.delete(nodeId);
            }
        }
    }
    
    private getSlideStartPosition(direction: SlideDirection, screenSize: Size): Vec3 {
        switch (direction) {
            case SlideDirection.LEFT:
                return new Vec3(-screenSize.width, 0, 0);
            case SlideDirection.RIGHT:
                return new Vec3(screenSize.width, 0, 0);
            case SlideDirection.UP:
                return new Vec3(0, screenSize.height, 0);
            case SlideDirection.DOWN:
                return new Vec3(0, -screenSize.height, 0);
            default:
                return new Vec3(0, 0, 0);
        }
    }
}

// 슬라이드 방향 열거형
export enum SlideDirection {
    LEFT = 'left',
    RIGHT = 'right',
    UP = 'up',
    DOWN = 'down'
}

// 애니메이션 큐 아이템 인터페이스
interface AnimationQueueItem {
    animation: () => Promise<void>;
    priority: number;
    delay: number;
}
```

## 성능 최적화

### UI 오브젝트 풀링
- UI 요소 재사용으로 메모리 할당 최소화
- 데미지 인디케이터, 파티클 효과 등에 적용
- 동적 UI 생성 시 성능 향상

### 배치 렌더링
- UI 요소들의 배치 처리로 드로우콜 감소
- 동일한 텍스처를 사용하는 UI 요소들 그룹화
- 투명도 정렬 최적화

### 적응형 UI 품질
- 디바이스 성능에 따른 UI 품질 조정
- 저사양 기기에서 애니메이션 간소화
- 해상도별 UI 스케일링

## 접근성 고려사항

### 시각적 접근성
- 색상 대비 최적화
- 폰트 크기 조정 옵션
- 색맹 사용자를 위한 색상 옵션

### 조작 접근성
- 터치 영역 크기 최적화 (최소 44px)
- 한 손 조작 지원
- 음성 피드백 옵션

## 테스트 전략

### 디바이스별 테스트
- 다양한 화면 크기 대응
- 성능 측정 및 최적화
- 터치 반응성 테스트

### 사용성 테스트
- 사용자 시나리오 기반 테스트
- UI 플로우 검증
- 접근성 테스트

이 UI/UX 시스템 설계는 모바일 3D 소울라이크 게임에 최적화된 직관적이고 반응성 있는 사용자 인터페이스를 제공합니다.