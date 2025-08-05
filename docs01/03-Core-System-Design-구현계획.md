# Shadow Archer 구현 계획서: 코어 시스템 아키텍처

## 1. 🎯 구현 목표

이 문서는 `docs/03-Core-System-Design.md`에 정의된 **게임 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 모든 게임 시스템이 이벤트 기반으로 통신하고, 컴포넌트 기반 아키텍처를 통해 확장 가능하며, 성능 최적화된 모바일 3D 소울라이크 게임의 핵심 시스템을 완성합니다.

---

## 2. 📁 구현 대상 핵심 파일

코어 시스템 구현은 `assets/scripts/core` 폴더를 중심으로 진행됩니다.

### 2.1. Core Architecture (핵심 아키텍처)

```
assets/scripts/core/
├── GameManager.ts                   # ✅ 게임 전체 생명주기 관리
├── SystemManager.ts                 # ✅ 모든 게임 시스템의 중앙 관리자
├── EventBus.ts                      # ✅ 전역 이벤트 통신 시스템
├── ComponentSystem.ts               # ✅ 컴포넌트 기반 아키텍처 관리
└── ResourceManager.ts               # ✅ 리소스 로딩 및 캐싱 시스템
```

### 2.2. Base Components (기본 컴포넌트)

```
assets/scripts/core/components/
├── GameComponent.ts                 # ✅ 모든 게임 컴포넌트의 기본 클래스
├── UpdateableComponent.ts           # ✅ 업데이트 가능한 컴포넌트 베이스
├── NetworkComponent.ts              # ✅ 네트워크 동기화 컴포넌트
└── PoolableComponent.ts             # ✅ 오브젝트 풀링 지원 컴포넌트
```

### 2.3. System Interfaces (시스템 인터페이스)

```
assets/scripts/core/interfaces/
├── IGameSystem.ts                   # ✅ 게임 시스템 인터페이스
├── IUpdateable.ts                   # ✅ 업데이트 가능한 객체 인터페이스
├── IInitializable.ts                # ✅ 초기화 가능한 객체 인터페이스
└── IPoolable.ts                     # ✅ 풀링 가능한 객체 인터페이스
```

### 2.4. Utilities (유틸리티)

```
assets/scripts/core/utils/
├── ObjectPool.ts                    # ✅ 범용 오브젝트 풀
├── Logger.ts                        # ✅ 로깅 시스템
├── MathUtils.ts                     # ✅ 수학 유틸리티
└── TimeManager.ts                   # ✅ 시간 관리 시스템
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/03-Core-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 아키텍처 구축 (가장 중요)**
*   **기간:** 5일
*   **목표:** 게임 시스템 간 기본적인 통신과 생명주기 관리가 정상 작동한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `IGameSystem.ts`: 모든 게임 시스템이 구현해야 할 기본 인터페이스를 정의합니다.
        ```typescript
        interface IGameSystem {
            readonly name: string;
            initialize(): Promise<void>;
            start(): void;
            update(deltaTime: number): void;
            shutdown(): void;
        }
        ```
    2.  **[Task 1.2]** `EventBus.ts`: 타입 안전한 이벤트 시스템을 구현하여 모든 시스템 간 통신 기반을 마련합니다.
    3.  **[Task 1.3]** `SystemManager.ts`: 모든 게임 시스템을 등록하고 생명주기를 관리하는 중앙 관리자를 구현합니다.
    4.  **[Task 1.4]** `GameManager.ts`: 게임 전체 상태와 흐름을 관리하는 싱글톤 매니저를 구현합니다.
    5.  **[Task 1.5]** **핵심 통신 검증:** 더미 시스템들을 만들어 SystemManager 등록 → 초기화 → 업데이트 → 이벤트 통신 전체 흐름을 테스트합니다.

### **Phase 2: 컴포넌트 시스템 구축**
*   **기간:** 3일
*   **목표:** 재사용 가능한 컴포넌트 기반 아키텍처를 완성한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `GameComponent.ts`: Cocos Creator의 Component를 확장한 기본 게임 컴포넌트 클래스를 구현합니다.
    2.  **[Task 2.2]** `ComponentSystem.ts`: 컴포넌트 등록, 검색, 의존성 관리 시스템을 구현합니다.
    3.  **[Task 2.3]** `UpdateableComponent.ts`: 매 프레임 업데이트가 필요한 컴포넌트의 베이스 클래스를 구현합니다.
    4.  **[Task 2.4]** **컴포넌트 테스트:** 샘플 컴포넌트들을 만들어 등록, 검색, 업데이트, 의존성 주입이 정상 작동하는지 검증합니다.

### **Phase 3: 리소스 관리 시스템**
*   **기간:** 4일
*   **목표:** 효율적인 리소스 로딩, 캐싱, 해제 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `ResourceManager.ts`: Cocos Creator의 resources API를 래핑한 리소스 관리자를 구현합니다.
    2.  **[Task 3.2]** 비동기 리소스 로딩과 프로그레스 콜백 시스템을 구현합니다.
    3.  **[Task 3.3]** 리소스 캐싱 및 자동 해제 정책을 구현합니다.
    4.  **[Task 3.4]** **리소스 테스트:** 대용량 리소스 로딩, 메모리 사용량 모니터링, 자동 해제 기능을 테스트합니다.

### **Phase 4: 성능 최적화 시스템**
*   **기간:** 3일
*   **목표:** 모바일 환경에 최적화된 성능 관리 시스템을 구현한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `ObjectPool.ts`: 범용 오브젝트 풀 시스템을 구현하여 가비지 컬렉션을 최소화합니다.
    2.  **[Task 4.2]** `TimeManager.ts`: 프레임레이트 관리 및 시간 스케일링 시스템을 구현합니다.
    3.  **[Task 4.3]** **성능 모니터링:** 메모리 사용량, FPS, 드로우콜 등을 실시간 모니터링하는 시스템을 구현합니다.
    4.  **[Task 4.4]** **성능 최적화 검증:** 다양한 모바일 기기에서 60FPS 유지 및 메모리 효율성을 테스트합니다.

### **Phase 5: 유틸리티 및 디버깅 도구**
*   **기간:** 2일
*   **목표:** 개발 효율성을 높이는 유틸리티와 디버깅 도구를 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `Logger.ts`: 레벨별 로깅 시스템 및 파일 출력 기능을 구현합니다.
    2.  **[Task 5.2]** `MathUtils.ts`: 게임에서 자주 사용되는 수학 함수들을 구현합니다.
    3.  **[Task 5.3]** **개발자 도구:** 런타임에서 시스템 상태를 확인할 수 있는 디버그 패널을 구현합니다.
    4.  **[Task 5.4]** **전체 통합 테스트:** 모든 코어 시스템이 함께 동작하는 완전한 통합 테스트를 수행합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. GameManager 핵심 구현

```typescript
// GameManager의 핵심 생명주기 관리
export class GameManager {
    private static instance: GameManager;
    private systemManager: SystemManager;
    private currentState: GameState = GameState.LOADING;
    
    async initialize(): Promise<void> {
        // 1. 시스템 매니저 초기화
        this.systemManager = new SystemManager();
        
        // 2. 코어 시스템들 등록
        this.systemManager.registerSystem(new InputSystem());
        this.systemManager.registerSystem(new RenderSystem());
        this.systemManager.registerSystem(new PhysicsSystem());
        
        // 3. 시스템 초기화 순서 관리
        await this.systemManager.initializeAll();
        
        // 4. 게임 상태 변경
        this.changeState(GameState.MAIN_MENU);
    }
}
```

### 4.2. EventBus 타입 안전성

```typescript
// 타입 안전한 이벤트 시스템
interface GameEvents {
    'player:health_changed': { health: number; maxHealth: number };
    'combat:damage_dealt': { damage: number; target: string };
    'system:initialized': { systemName: string };
}

export class EventBus {
    on<T extends keyof GameEvents>(
        event: T, 
        callback: (data: GameEvents[T]) => void
    ): void {
        // 타입 안전한 이벤트 등록
    }
    
    emit<T extends keyof GameEvents>(
        event: T, 
        data: GameEvents[T]
    ): void {
        // 타입 안전한 이벤트 발송
    }
}
```

### 4.3. 컴포넌트 의존성 주입

```typescript
// 의존성 주입을 통한 컴포넌트 간 통신
export class HealthComponent extends GameComponent {
    @Inject('CombatSystem')
    private combatSystem: CombatSystem;
    
    @Inject('UISystem')
    private uiSystem: UISystem;
    
    takeDamage(amount: number): void {
        this.health -= amount;
        
        // 이벤트 발송으로 다른 시스템에 알림
        EventBus.getInstance().emit('player:health_changed', {
            health: this.health,
            maxHealth: this.maxHealth
        });
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **아키텍처 문서 완벽 준수:** `03-Core-System-Design.md`에 정의된 모든 설계 원칙과 패턴을 충실히 구현합니다.

2.  **단계별 검증:** 각 Phase 완료 시마다 해당 시스템이 독립적으로 그리고 다른 시스템과 연동하여 완벽하게 동작하는지 검증합니다.

3.  **성능 우선:** 모바일 환경을 고려하여 모든 구현에서 메모리 효율성과 실행 성능을 최우선으로 합니다.

4.  **확장성 보장:** 향후 추가될 게임 시스템들이 쉽게 통합될 수 있도록 인터페이스와 아키텍처를 설계합니다.

5.  **타입 안전성:** TypeScript의 타입 시스템을 최대한 활용하여 런타임 오류를 컴파일 타임에 방지합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **프레임레이트:** 60FPS 안정적 유지 (최소 50FPS)
- **메모리 사용량:** 500MB 이하 (미드레인지 모바일 기기 기준)
- **시스템 초기화 시간:** 3초 이내
- **리소스 로딩 시간:** 5초 이내 (초기 로딩)

### 6.2. 검증 기준
- 모든 시스템 간 이벤트 통신이 1프레임 내 처리
- 오브젝트 풀링으로 가비지 컬렉션 발생량 90% 감소
- 메모리 누수 없이 10분간 연속 실행 가능
- 다양한 모바일 기기에서 동일한 성능 보장

이 구현 계획을 체계적으로 따르면, Shadow Archer 게임의 견고하고 확장 가능한 코어 시스템 아키텍처를 성공적으로 완성할 수 있을 것입니다.