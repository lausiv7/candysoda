📘 게임 기획서 초안 목차 (모바일 3D 소울라이크 / 궁수의 전설 + 몬헌 스타일)
1. 🎮 게임 개요
게임명(가제)

장르 및 콘셉트

주요 특징 요약

대상 플랫폼 및 입력 방식

플레이어 조작 방식(한 손 조작 최적화)

2. ⚔️ 게임 시스템 기획
2.1 기본 시스템
스테이지 기반 진행 구조

전투 메커니즘 개요 (소울라이크 + 원거리/근접 무기 시스템)

체력 / 스태미나 / 궁극기 구조

2.2 전투 흐름
일반 전투 vs 보스전 구분

공격/회피/패링 타이밍 윈도우

자동 타겟팅 및 시점 고정 방식

2.3 성장 시스템
무기/장비 강화

보상 구조

일일 보스 도전 모드 (선택사항)

3. 🧱 아키텍처 구성도 및 기술 설계
3.1 전체 아키텍처 구성도
모듈별 구조 (입력, 렌더링, 전투, 애니메이션, AI, UI 등)

입력/출력 흐름

상태 머신 설계 (플레이어, 보스)

3.2 Cocos Creator 엔진 기반 기본 프레임
Scene 구성 (메인씬, 스테이지, 보스룸)

캐릭터 구조 (Player/Enemy Prefab 구조, 콜라이더, 히트박스)

카메라 & UI 설계 (쿼터뷰 고정 카메라 + HUD 구조)

4. 🧠 AI 기반 기능 설계 (Claude / GPT용)
4.1 AI 활용 개요
코딩 보조 대상 (AI 기반 전투 패턴, 행동 트리 생성 등)

Claude / GPT Prompt 활용 계획

4.2 Claude Prompt 예시
보스 행동 트리 생성 Prompt

공격 패턴 튜닝 Prompt

데미지 공식/난이도 자동 조정 Prompt

5. 🎭 보스 디자인 및 전투 설계
5.1 보스 캐릭터 예시 1: "광기의 궁수 벨트람"
공격 패턴 개요 (연사, 차지, 점프 회피, 위협 범위)

전투 페이즈 분할 (50% 이하 시 패턴 변화)

히트박스 및 무적 타이밍 구조

5.2 보스 AI 구조 설계
상태 기반 FSM (Idle / 탐색 / 공격 / 회피 / 특수패턴)

위험도 기반 선택 로직

Claude용 보스 행동 트리 Prompt 예시

6. 🗺️ 1스테이지 설계 (플레이타임 5~10분)
6.1 맵 구성
길이, 구간 수, 체크포인트

일반 몬스터 2종 + 패턴 예시

회복/보상 아이템 배치

6.2 플레이 흐름
튜토리얼 → 전투 구간 → 보스방 진입 → 보스 클리어

페이싱 설계 및 피로도 조절

7. 📈 게임 루프 및 반복 설계
7.1 전투 루프
탐색 → 조우 → 전투 → 보상 → 리턴

7.2 보상 루프
아이템 수집 → 강화 → 다음 단계 도전

7.3 재도전 및 리플레이 설계
회피 실패 시 짧은 로딩, 빠른 리턴

소울라이크 방식의 리소스 회수 가능 여부

8. 🎨 아트 및 사운드 방향성
3D 모델링 방향 (로우폴리? 하이폴리? 카툰렌더?)

타격감 강조 사운드 예시

UI 음향 피드백 / 보스 등장 연출

9. 📦 리소스 관리 및 제작 도구
3D 모델 툴 체인 (Blender → FBX → Cocos)

애니메이션 처리 (스테이트 머신, 이벤트 트리거)

사운드 / Sprite / 이펙트 관리

10. 🧪 테스트 및 QA 전략
디바이스별 최적화 계획 (모바일 GPU 등급별)

FPS/메모리 모니터링 기준

초기 데모 테스트 루틴

부록
Claude Prompt 모음집

UI/UX 흐름 와이어프레임

키 바인딩 맵 (모바일 한 손 기준)

기획 Q&A / 피드백 정리







# 📘 게임 기획서 초안 - "Shadow Archer" (가제)
*3D 쿼터뷰 소울라이크 / 궁수의 전설 + 몬헌 스타일 / Cocos Creator 기반*

---

## 1. 🎮 게임 개요

### 게임명 (가제)
**"Shadow Archer: Legends Reborn"**

### 장르 및 콘셉트
- **장르**: 3D 액션 RPG (소울라이크 + 보스 헌팅)
- **콘셉트**: 궁수의 전설을 현대적 3D로 재해석, 몬헌식 보스전 + 소울라이크 긴장감
- **핵심**: 정밀한 조준과 타이밍 기반 전투, 패턴 학습과 극복의 쾌감

### 주요 특징 요약
- **3D 쿼터뷰 고정 카메라**로 어지러움 없는 전투
- **한 손 조작 최적화** (조이스틱 + 탭/스와이프)
- **원거리/근접 무기 전환** 시스템
- **AI 기반 적응형 난이도** 조절
- **5-10분 단위 스테이지** 구성으로 모바일 플레이에 최적화

### 대상 플랫폼 및 입력 방식
- **주 플랫폼**: iOS, Android
- **부 플랫폼**: Web (테스트용)
- **입력**: 터치스크린 (가상 조이스틱 + 제스처)

### 플레이어 조작 방식 (한 손 조작 최적화)
- **왼손 엄지**: 가상 조이스틱 (이동)
- **오른손 엄지**: 
  - 탭: 기본 공격
  - 길게 누르기: 차지 공격
  - 스와이프: 회피/패링
  - 더블탭: 스킬 발동

---

## 2. ⚔️ 게임 시스템 기획

### 2.1 기본 시스템

#### 스테이지 기반 진행 구조
```
메인 허브 → 스테이지 선택 → 
튜토리얼 구간 (30초) → 일반 몬스터 구간 (2-3분) → 
보스방 진입 → 보스전 (3-5분) → 보상 및 복귀
```

#### 전투 메커니즘 개요
- **원거리 주무기**: 활, 석궁, 마법탄환
- **근접 보조무기**: 단검, 검, 방패
- **하이브리드 전투**: 상황에 따른 무기 전환 필수
- **소울라이크 요소**: 패턴 학습, 정확한 타이밍, 실패 시 재도전

#### 체력 / 스태미나 / 궁극기 구조
- **체력(HP)**: 100 기준, 회복 아이템으로만 회복 가능
- **스태미나(SP)**: 회피, 차지공격, 달리기에 소모, 자동 회복
- **포커스(Focus)**: 정밀 조준 모드, 시간 감속 효과
- **궁극기(Ultimate)**: 전투 중 축적, 강력한 필살기 발동

### 2.2 전투 흐름

#### 일반 전투 vs 보스전 구분
**일반 전투:**
- 2-4마리 동시 상대
- 빠른 처치와 이동 중심
- 스태미나 관리가 핵심

**보스전:**
- 1:1 대결
- 패턴 파악과 페이즈 구분
- 긴 호흡의 지구전

#### 공격/회피/패링 타이밍 윈도우
- **공격**: 0.2-0.5초 선딜레이, 무기별 차이
- **회피**: 0.1초 무적 프레임, 스태미나 20 소모
- **패링**: 0.15초 정확한 타이밍, 성공 시 반격 기회

#### 자동 타겟팅 및 시점 고정 방식
- **스마트 타겟팅**: 가장 위험한 적 우선 선택
- **카메라**: 쿼터뷰 고정, 보스전 시 약간의 줌인/아웃
- **조준 보정**: AI 기반 미세 조준 보정 (한 손 조작 고려)

### 2.3 성장 시스템

#### 무기/장비 강화
- **무기 레벨**: +1~+10, 공격력과 특수 효과 증가
- **장비 세트**: 활, 화살, 갑옷, 악세서리 조합 보너스
- **스킬 트리**: 원거리/근접/서바이벌 3개 분야

#### 보상 구조
- **스테이지 클리어**: 기본 재료 + 경험치
- **보스 클리어**: 희귀 재료 + 새로운 장비
- **완벽 클리어**: (무피해, 시간제한) 프리미엄 보상

#### 일일 보스 도전 모드 (선택사항)
- **일일 던전**: 매일 바뀌는 특수 보스
- **랭킹 시스템**: 클리어 타임 기준 순위
- **시즌 보상**: 주간/월간 특별 아이템

---

## 3. 🧱 아키텍처 구성도 및 기술 설계

### 3.1 전체 아키텍처 구성도

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Input Layer   │────│  Game Logic     │────│  Render Layer   │
│  - Touch Event  │    │  - Combat Sys   │    │  - 3D Renderer  │
│  - Gesture Rec  │    │  - AI System    │    │  - Particle FX  │
│  - Virtual Pad  │    │  - Physics      │    │  - Animation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                  ┌─────────────────┐
                  │   Data Layer    │
                  │  - Save/Load    │
                  │  - Settings     │
                  │  - Analytics    │
                  └─────────────────┘
```

#### 모듈별 구조
- **InputManager**: 터치 입력 → 게임 액션 변환
- **CombatSystem**: 전투 로직, 데미지 계산
- **AIController**: 적 행동 패턴, 보스 AI
- **AnimationController**: 캐릭터 애니메이션 상태머신
- **CameraController**: 쿼터뷰 카메라 제어
- **UIManager**: HUD, 메뉴, 대화창 관리

#### 상태 머신 설계

**플레이어 상태:**
```
Idle → Move → Attack → Dodge → Hit → Death
  ↑      ↓       ↓       ↓      ↓      ↓
  └──────┴───────┴───────┴──────┴──────┘
```

**보스 상태:**
```
Patrol → Detect → Chase → Attack → Special → Stun → Death
   ↑       ↓       ↓       ↓        ↓       ↓      ↓
   └───────┴───────┴───────┴────────┴───────┴──────┘
```

### 3.2 Cocos Creator 엔진 기반 기본 프레임

#### Scene 구성
```typescript
// Scene 계층 구조
MainScene/
├── Environment/        // 3D 환경 오브젝트
│   ├── Terrain
│   ├── Props
│   └── Lighting
├── Characters/         // 캐릭터들
│   ├── Player
│   ├── Enemies
│   └── Boss
├── Effects/           // 이펙트
│   ├── Particles
│   ├── Projectiles
│   └── UI_Effects
├── UI/               // 사용자 인터페이스
│   ├── HUD
│   ├── Menus
│   └── Dialogs
└── Managers/         // 게임 매니저들
    ├── GameManager
    ├── CombatManager
    └── AudioManager
```

#### 캐릭터 구조 (Player/Enemy Prefab)
```typescript
// Player Prefab 구조
Player (Node3D)
├── Model (MeshRenderer)     // 3D 모델
├── Collider (BoxCollider)   // 충돌 감지
├── HitBox (Node3D)         // 공격 판정
│   └── AttackCollider
├── AnimationController      // 애니메이션 제어
├── StatusEffects           // 상태 이상 관리
└── Components/
    ├── PlayerController.ts
    ├── CombatComponent.ts
    ├── MovementComponent.ts
    └── InputHandler.ts
```

#### 카메라 & UI 설계
```typescript
// 카메라 설정
Camera (Node3D)
├── Position: (0, 10, 8)    // 쿼터뷰 위치
├── Rotation: (-35, 0, 0)   // 내려다보는 각도
├── FOV: 45                 // 시야각
└── CameraController.ts     // 부드러운 추적, 줌

// HUD 구조
Canvas/
├── HealthBar (Slider)      // 체력바
├── StaminaBar (Slider)     // 스태미나바
├── VirtualJoystick        // 가상 조이스틱
├── ActionButtons/          // 액션 버튼들
│   ├── AttackButton
│   ├── DodgeButton
│   └── SkillButton
└── Minimap (optional)     // 미니맵
```

---

## 4. 🧠 AI 기반 기능 설계 (Claude / GPT용)

### 4.1 AI 활용 개요

#### 코딩 보조 대상
1. **보스 행동 패턴 생성**: 페이즈별 AI 로직 자동 생성
2. **밸런싱 자동 조정**: 플레이 데이터 기반 난이도 튜닝
3. **콘텐츠 확장**: 새로운 적, 무기, 스킬 자동 생성
4. **디버깅 보조**: 코드 리뷰 및 최적화 제안

#### Claude / GPT Prompt 활용 계획
- **실시간 코딩 보조**: 복잡한 로직 구현 시 즉시 도움
- **리팩토링**: 코드 품질 개선 및 성능 최적화
- **테스트 케이스 생성**: 자동화된 테스트 코드 작성
- **문서화**: 코드 주석 및 기술 문서 자동 생성

### 4.2 Claude Prompt 예시

#### 보스 행동 트리 생성 Prompt
```
역할: Cocos Creator TypeScript 전문 개발자
상황: 3D 쿼터뷰 소울라이크 게임의 보스 AI 구현
요청: "광기의 궁수 벨트람" 보스의 3페이즈 행동 트리를 TypeScript로 구현

조건:
- State Machine 패턴 사용
- 체력 100%→70%→40%→0% 각 페이즈별 패턴 변화
- 플레이어와의 거리에 따른 행동 분기
- 쿨다운 시스템 포함
- Cocos Creator의 Node3D, Animation 컴포넌트 활용

패턴:
1페이즈: 기본 화살, 3연사, 점프 회피
2페이즈: + 관통 화살, 원형 공격
3페이즈: + 광역 화살비, 텔레포트

구현해주세요.
```

#### 공격 패턴 튜닝 Prompt
```
역할: 게임 밸런싱 전문가 + TypeScript 개발자
상황: 플레이어 승률이 85% (목표: 60-70%)
데이터: [공격 패턴별 회피 성공률, 평균 클리어 시간]
요청: 난이도 조정을 위한 매개변수 튜닝

분석 후 다음을 제공:
1. 어떤 패턴이 너무 쉬운지 분석
2. 매개변수 조정 제안 (속도, 데미지, 쿨다운)
3. TypeScript 코드로 수치 조정 구현
4. A/B 테스트를 위한 코드 구조

코드 스타일: Cocos Creator 기준
```

#### 데미지 공식/난이도 자동 조정 Prompt
```
역할: AI 기반 적응형 난이도 시스템 설계자
목표: 플레이어의 실력에 따라 실시간 난이도 조정

요구사항:
1. 플레이어 행동 패턴 분석 (회피 타이밍, 공격 정확도)
2. 실시간 데미지/체력 스케일링
3. 보스 공격 속도 미세 조정
4. 패턴 예측 가능성 조절

TypeScript + Cocos Creator로 구현:
- PlayerAnalytics 클래스
- DifficultyScaler 클래스  
- 실시간 적용 시스템

플레이어가 모르게 자연스럽게 조정되도록 설계해주세요.
```

---

## 5. 🎭 보스 디자인 및 전투 설계

### 5.1 보스 캐릭터 예시 1: "광기의 궁수 벨트람"

#### 보스 컨셉
- **배경**: 한때 전설적인 궁수였으나 금기의 화살에 의해 광기에 빠진 타락한 영웅
- **외형**: 검은 후드, 빛나는 붉은 눈, 어둠에 둘러싸인 활
- **테마**: 플레이어의 미래 모습 (타락 가능성)

#### 공격 패턴 개요

**1페이즈 (100%-70% HP):**
- **기본 화살**: 단발, 예측 가능한 궤도
- **3연사**: 부채꼴 형태, 0.3초 간격
- **점프 회피**: 플레이어 공격 시 후방 점프
- **위협 범위**: 중거리 유지

**2페이즈 (70%-40% HP):**
- **관통 화살**: 벽을 뚫고 지나가는 강력한 화살  
- **원형 공격**: 자신 중심 360도 화살 발사
- **추적 화살**: 플레이어를 따라오는 유도탄
- **패턴 속도**: 1페이즈보다 20% 증가

**3페이즈 (40%-0% HP):**
- **화살비**: 하늘에서 떨어지는 대량의 화살
- **텔레포트**: 맵 곳곳으로 순간이동 후 기습
- **분신술**: 3개의 잔상으로 혼란 유발
- **최후의 일격**: 체력 5% 이하에서 강력한 필살기

#### 전투 페이즈 분할
```typescript
enum BossPhase {
    PHASE_1 = 1,  // 70% 이상
    PHASE_2 = 2,  // 40-70%
    PHASE_3 = 3,  // 40% 이하
    DESPERATE = 4 // 5% 이하
}

// 페이즈 전환 시 특별 연출
onPhaseChange(newPhase: BossPhase) {
    this.playPhaseTransition(newPhase);
    this.updateAttackPatterns(newPhase);
    this.adjustMovementSpeed(newPhase);
}
```

#### 히트박스 및 무적 타이밍 구조
- **약점**: 머리 부분 (150% 데미지)
- **방어 부위**: 갑옷 부분 (50% 데미지)
- **무적 시간**: 
  - 페이즈 전환 시: 3초
  - 특수 공격 시: 0.5초
  - 피격 후: 0.1초

### 5.2 보스 AI 구조 설계

#### 상태 기반 FSM (Finite State Machine)
```typescript
enum BossState {
    IDLE = "idle",
    PATROL = "patrol", 
    DETECT = "detect",
    CHASE = "chase",
    ATTACK = "attack",
    DODGE = "dodge",
    SPECIAL = "special",
    STUN = "stun",
    DEATH = "death"
}

class BossAI extends Component {
    private currentState: BossState = BossState.IDLE;
    private stateTimer: number = 0;
    private playerDistance: number = 0;
    
    update(deltaTime: number) {
        this.updateState(deltaTime);
        this.executeCurrentState(deltaTime);
    }
}
```

#### 위험도 기반 선택 로직
```typescript
interface AttackOption {
    name: string;
    damage: number;
    cooldown: number;
    range: number;
    threatLevel: number;
    conditions: () => boolean;
}

selectBestAttack(): AttackOption {
    const availableAttacks = this.attacks.filter(attack => 
        attack.conditions() && this.isOffCooldown(attack)
    );
    
    // 플레이어 위치, 체력, 패턴 히스토리 고려
    return this.calculateOptimalAttack(availableAttacks);
}
```

#### Claude용 보스 행동 트리 Prompt 예시
```typescript
// 이 구조를 Claude에게 전달하여 자동 생성 요청
interface BossActionNode {
    id: string;
    type: "condition" | "action" | "sequence" | "selector";
    children?: BossActionNode[];
    execute?: (boss: BossAI, player: Player) => boolean;
}

// Claude Prompt:
// "위 인터페이스를 사용하여 벨트람 보스의 행동 트리를 생성해주세요.
//  조건: 플레이어와의 거리, 체력, 마지막 공격으로부터의 시간을 고려하여
//  가장 효과적인 공격 패턴을 선택하는 로직을 구현해주세요."
```

---

## 6. 🗺️ 1스테이지 설계 (플레이타임 5~10분)

### 6.1 맵 구성

#### 레벨 디자인 개요
- **전체 길이**: 약 200미터 (게임 단위)
- **구간 수**: 4개 주요 구간 + 보스방
- **체크포인트**: 각 구간 끝에 1개씩

#### 구간별 상세 설계

**구간 1: 튜토리얼 숲 (1-2분)**
- **목적**: 기본 조작법 학습
- **적**: 슬라임 2마리 (체력 30, 느린 이동)
- **학습 요소**: 이동, 기본 공격, 회피
- **환경**: 밝은 숲, 넓은 공간

**구간 2: 고블린 야영지 (2-3분)**
- **목적**: 다수 적 상대법 학습
- **적**: 고블린 전사 3마리, 고블린 궁수 1마리
- **학습 요소**: 타겟팅, 위치 선정, 스태미나 관리
- **환경**: 텐트와 모닥불, 엄폐물 활용

**구간 3: 험준한 절벽길 (1-2분)**
- **목적**: 환경 요소와 함께 전투
- **적**: 스켈레톤 전사 2마리
- **특징**: 좁은 길, 낭떠러지 주의
- **학습 요소**: 위치 선정의 중요성

**구간 4: 보스방 입구 (30초)**
- **목적**: 긴장감 조성 및 준비 시간
- **적**: 없음
- **요소**: 회복 아이템, 보스 정보 힌트
- **연출**: 보스방 문이 천천히 열림

**보스방: 고대 궁술장 (3-5분)**
- **크기**: 15x15미터 원형 공간
- **환경**: 고대 기둥들, 높낮이 차이
- **보스**: 광기의 궁수 벨트람
- **특징**: 3페이즈, 환경 활용 필수

#### 일반 몬스터 2종 + 패턴 예시

**1. 고블린 전사**
```typescript
class GoblinWarrior {
    hp: number = 50;
    speed: number = 3;
    attackRange: number = 2;
    
    patterns = [
        "charge_attack",    // 돌진 공격
        "swing_combo",      // 2연속 베기
        "defensive_stance"  // 방어 자세
    ];
}
```

**2. 스켈레톤 궁수**
```typescript
class SkeletonArcher {
    hp: number = 40;
    speed: number = 2;
    attackRange: number = 8;
    
    patterns = [
        "aimed_shot",       // 조준 사격
        "retreat_shoot",    // 후퇴하며 사격
        "arrow_rain"        // 화살비 (저확률)
    ];
}
```

#### 회복/보상 아이템 배치
- **체력 포션**: 각 구간마다 1개 (HP 50 회복)
- **스태미나 포션**: 구간 2, 4에 1개씩
- **화살 보충**: 구간별로 자동 보충
- **보물상자**: 구간 3 숨겨진 위치 (장비 강화 재료)

### 6.2 플레이 흐름

#### 전체 타임라인
```
00:00 - 게임 시작, 튜토리얼 시작
01:30 - 첫 번째 실제 전투 (고블린)
03:00 - 중간 체크포인트, 짧은 휴식
04:30 - 스켈레톤과의 까다로운 전투  
06:00 - 보스방 진입, 분위기 전환
06:30 - 보스전 시작
09:00 - 보스 클리어 (평균)
10:00 - 보상 화면, 다음 스테이지 언락
```

#### 페이싱 설계 및 피로도 조절
- **강도 곡선**: 낮음 → 중간 → 높음 → 휴식 → 최고조
- **휴식 구간**: 각 전투 후 10-15초 여유 시간
- **긴장완화**: 보스방 입구에서 준비 시간 제공
- **성취감**: 각 구간 클리어 시 만족스러운 효과음과 UI

---

## 7. 📈 게임 루프 및 반복 설계

### 7.1 전투 루프

#### 핵심 사이클 (30초 - 2분)
```
탐색 (10초) → 적 발견 (5초) → 전투 (60-90초) → 
승리 (5초) → 보상 (10초) → 다음 구간 이동 (10초)
```

#### 전투 내 미시 루프 (5-15초)
```
위치 선정 → 조준 → 공격 → 적 반응 관찰 → 
회피/패링 → 재위치 → 반복
```

### 7.2 보상 루프

#### 단기 보상 (매 전투마다)
- **경험치**: 10-50 (적 종류에 따라)
- **재료**: 화살, 치료약, 강화석
- **피드백**: 화려한 아이템 드롭 연출

#### 중기 보상 (스테이지 클리어)
- **새로운 장비**: 활, 화살, 방어구
- **스킬 포인트**: 성장 트리 해금
- **스토리 진행**: 새로운 지역, 캐릭터

#### 장기 보상 (주간/월간)
- **레어 아이템**: 유니크 무기, 세트 장비  
- **외형 커스터마이징**: 스킨, 이펙트
- **도전 모드**: 하드코어, 타임어택

### 7.3 재도전 및 리플레이 설계

#### 실패 시 빠른 복귀
```typescript
class RespawnSystem {
    onPlayerDeath() {
        // 3초 연출 후 즉시 체크포인트로 복귀
        this.showDeathAnimation(3000);
        this.respawnAtCheckpoint();
        // 보상: 경험치는 유지, 소모품만 차감
    }
}
```

#### 소울라이크 방식의 리소스 회수
- **영혼 시스템**: 사망 시 경험치 50% 손실
- **회수 기회**: 사망 지점에서 되찾기 가능
- **위험과 보상**: 회수하러 가는 길의 긴장감

#### 점진적 난이도 조절
- **어댑티브 AI**: 연속 실패 시 적 공격력 5% 감소
- **도움 시스템**: 3회 연속 실패 시 힌트 제공
- **선택적 쉬움**: 플레이어가 원할 때만 적용

---

## 8. 🎨 아트 및 사운드 방향성

### 8.1 비주얼 스타일

#### 3D 모델링 방향
- **스타일**: 세미 리얼리스틱 (로우폴리 + 고품질 텍스처)
- **폴리곤 수**: 캐릭터 2000-5000, 환경 500-2000
- **텍스처**: 1024x1024 디퓨즈 + 노멀맵
- **쉐이딩**: PBR (Physically Based Rendering) 간소화 버전
- **색상 팔레트**: 어두운 판타지 + 선명한 액센트 컬러

#### 캐릭터 디자인 철학
- **플레이어**: 후드를 쓴 신비로운 궁수, 성별 중립적
- **적들**: 각각 명확한 실루엣과 위험 레벨 구분
- **보스**: 압도적인 존재감, 3단계 변화 표현

#### 환경 아트
- **조명**: 동적 그림자 + 분위기 있는 앰비언트
- **파티클**: 마법적 화살, 타격 이펙트, 환경 연출
- **UI 일체감**: 게임 세계관과 조화로운 판타지 UI

### 8.2 사운드 디자인

#### 타격감 강조 사운드
```typescript
// 사운드 레이어링 시스템
interface HitSoundLayers {
    impact: AudioClip;      // 타격음 (펀치감)
    material: AudioClip;    // 재질음 (금속, 살, 나무)
    magic: AudioClip;       // 마법 이펙트
    distance: AudioClip;    // 거리감 표현
}

// 타격 시 동적 사운드 믹싱
onHitConnect(target: Enemy, weapon: Weapon) {
    const soundMix = this.calculateHitSound(target.material, weapon.type);
    this.playLayeredSound(soundMix);
}
```

#### 음향 카테고리별 설계

**전투 사운드:**
- **활 시위**: 장력감 있는 "끼잉~" 소리
- **화살 발사**: "휘잉" + 바람 소리
- **명중**: 재질별 차별화된 타격음
- **회피**: 바람 가르는 "휴잇" 소리

**환경 사운드:**
- **발걸음**: 지형별 차별화 (흙, 돌, 나뭇잎)
- **앰비언트**: 지역별 특색 (새소리, 바람, 동굴 울림)
- **상호작용**: 문 열기, 상자 열기, 아이템 획득

**UI 사운드:**
- **메뉴 이동**: 부드러운 "휴잇" 소리
- **버튼 클릭**: 만족스러운 "클릭" 소리
- **레벨업**: 웅장한 상승 사운드
- **알림**: 주의를 끌지만 거슬리지 않는 톤

#### 보스 등장 연출 사운드
```typescript
class BossIntroductionAudio {
    async playBossEntrance(boss: Boss) {
        // 1단계: 침묵 (1초)
        await this.fadeOutAmbient(1000);
        
        // 2단계: 보스 테마 인트로 (3초)
        this.playBossThemeIntro(boss.themeMusic);
        
        // 3단계: 전투 음악 시작
        await this.transitionToCombatMusic(2000);
    }
}
```

---

## 9. 📦 리소스 관리 및 제작 도구

### 9.1 3D 에셋 파이프라인

#### 모델링 툴체인
```
Blender (모델링) → FBX Export → Cocos Creator Import → 
최적화 (LOD, 텍스처 압축) → 빌드 패키징
```

#### 애니메이션 처리 워크플로우
```typescript
// Cocos Creator 애니메이션 상태 머신
class CharacterAnimationController {
    private animationGraph: AnimationGraph;
    
    setupAnimationStates() {
        this.animationGraph.addState("idle", idleClip);
        this.animationGraph.addState("walk", walkClip);
        this.animationGraph.addState("attack", attackClip);
        this.animationGraph.addState("dodge", dodgeClip);
        
        // 전환 조건 설정
        this.addTransition("idle", "walk", "speed > 0.1");
        this.addTransition("walk", "attack", "attack_triggered");
    }
}
```

#### 텍스처 및 머티리얼 관리
- **텍스처 아틀라스**: 같은 테마의 텍스처들을 하나로 합치기
- **압축 설정**: 
  - Android: ETC2
  - iOS: ASTC
  - Web: S3TC/DXT
- **밉맵**: 거리에 따른 자동 해상도 조절

### 9.2 오디오 리소스 관리

#### 사운드 포맷 및 압축
- **음악**: OGG Vorbis (스테레오, 128kbps)
- **효과음**: WAV (모노, 44.1kHz) → 빌드 시 압축
- **음성**: OGG (모노, 64kbps)

#### 동적 오디오 로딩 시스템
```typescript
class AudioResourceManager {
    private audioCache: Map<string, AudioClip> = new Map();
    
    async preloadStageAudio(stageId: string) {
        const audioList = this.getStageAudioList(stageId);
        for (const audioPath of audioList) {
            const clip = await this.loadAudioClip(audioPath);
            this.audioCache.set(audioPath, clip);
        }
    }
    
    playSound(soundId: string, volume: number = 1.0) {
        const clip = this.audioCache.get(soundId);
        if (clip) {
            AudioSource.playOneShot(clip, volume);
        }
    }
}
```

### 9.3 이펙트 시스템

#### 파티클 이펙트 설계
```typescript
// 화살 궤적 이펙트
class ArrowTrailEffect {
    createArrowTrail(startPos: Vec3, endPos: Vec3, arrowType: ArrowType) {
        const trailSystem = this.node.getComponent(ParticleSystem);
        
        // 화살 종류별 다른 이펙트
        switch(arrowType) {
            case ArrowType.FIRE:
                trailSystem.startColor = Color.RED;
                this.addSparks(startPos, endPos);
                break;
            case ArrowType.ICE:
                trailSystem.startColor = Color.CYAN;
                this.addFrostEffect(endPos);
                break;
        }
    }
}
```

#### 타격 이펙트 시스템
- **히트 스탑**: 0.1초 프레임 정지로 타격감 강화
- **화면 흔들림**: 강한 공격 시 카메라 진동
- **슬로우 모션**: 크리티컬 히트 시 0.5초 슬로우

---

## 10. 🧪 테스트 및 QA 전략

### 10.1 디바이스별 최적화 계획

#### 모바일 GPU 등급별 설정
```typescript
enum DevicePerformanceTier {
    LOW = 1,    // 3년 이상 된 기기
    MID = 2,    // 1-3년 된 기기  
    HIGH = 3    // 최신 플래그십
}

class GraphicsSettings {
    applySettingsForDevice(tier: DevicePerformanceTier) {
        switch(tier) {
            case DevicePerformanceTier.LOW:
                this.shadowQuality = ShadowQuality.OFF;
                this.particleDensity = 0.5;
                this.textureQuality = TextureQuality.LOW;
                break;
            case DevicePerformanceTier.MID:
                this.shadowQuality = ShadowQuality.SIMPLE;
                this.particleDensity = 0.8;
                this.textureQuality = TextureQuality.MEDIUM;
                break;
            case DevicePerformanceTier.HIGH:
                this.shadowQuality = ShadowQuality.HIGH;
                this.particleDensity = 1.0;
                this.textureQuality = TextureQuality.HIGH;
                break;
        }
    }
}
```

### 10.2 성능 모니터링

#### FPS/메모리 모니터링 기준
```typescript
class PerformanceMonitor {
    private fpsHistory: number[] = [];
    private memoryUsage: number = 0;
    
    update() {
        const currentFPS = this.calculateFPS();
        this.fpsHistory.push(currentFPS);
        
        // 성능 임계값 체크
        if (currentFPS < 30) {
            this.triggerPerformanceOptimization();
        }
        
        // 메모리 사용량 모니터링
        this.memoryUsage = this.getCurrentMemoryUsage();
        if (this.memoryUsage > 200) { // 200MB 초과 시
            this.triggerGarbageCollection();
        }
    }
}
```

#### 자동 품질 조정 시스템
- **동적 해상도**: FPS가 30 이하로 떨어지면 해상도 자동 감소
- **이펙트 간소화**: 성능 부족 시 파티클 개수 감소
- **LOD 조정**: 거리에 따른 모델 품질 자동 조절

### 10.3 초기 데모 테스트 루틴

#### 테스트 시나리오
1. **첫 실행 테스트**: 튜토리얼 완주 (목표: 90% 완주율)
2. **조작성 테스트**: 한 손 조작으로 보스 클리어 (목표: 60% 성공률)
3. **재미 지속성**: 10회 플레이 후 만족도 (목표: 7/10 이상)
4. **성능 안정성**: 30분 연속 플레이 시 크래시 없음

#### A/B 테스트 계획
```typescript
class ABTestManager {
    private testGroups = {
        controlGroup: {
            difficultyScale: 1.0,
            tutorialLength: "full"
        },
        testGroupA: {
            difficultyScale: 0.8,    // 더 쉽게
            tutorialLength: "full"
        },
        testGroupB: {
            difficultyScale: 1.0,
            tutorialLength: "short"   // 짧은 튜토리얼
        }
    };
    
    assignUserToGroup(userId: string): TestGroup {
        return this.hashUserId(userId) % 3;
    }
}
```

---

## 부록

### A. Claude Prompt 모음집

#### A.1 코드 리뷰 및 최적화 Prompt
```
역할: TypeScript + Cocos Creator 전문가
파일: [코드 파일 내용]
요청: 다음 관점에서 코드 리뷰 및 개선안 제시

1. 성능 최적화 (메모리, CPU 사용량)
2. 코드 가독성 및 유지보수성
3. Cocos Creator 베스트 프랙티스 준수
4. 모바일 환경 고려사항
5. 잠재적 버그 위험성

개선된 코드와 함께 변경 이유를 설명해주세요.
```

#### A.2 새로운 적 캐릭터 생성 Prompt
```
역할: 게임 디자이너 + AI 프로그래머
요청: 다음 조건에 맞는 새로운 적 캐릭터 설계

배경 설정: [게임 세계관]
난이도: [쉬움/보통/어려움]
컨셉: [간단한 아이디어]

생성할 내용:
1. 캐릭터 컨셉 아트 설명
2. 공격 패턴 3-5가지
3. TypeScript AI 클래스 구현
4. 밸런싱 수치 (체력, 공격력, 속도)
5. 플레이어 대응 전략 힌트

Cocos Creator 컴포넌트 구조로 구현해주세요.
```

#### A.3 UI/UX 개선 Prompt
```
역할: 모바일 UX 전문가
현재 상황: [스크린샷 또는 설명]
문제점: [사용자 피드백]

요청:
1. 한 손 조작 최적화 관점에서 문제 분석
2. 접근성 개선 방안
3. 시각적 피드백 강화 방법
4. TypeScript + Cocos Creator UI 구현
5. A/B 테스트용 대안 디자인

모바일 게임 UX 모범사례를 반영해주세요.
```

### B. UI/UX 흐름 와이어프레임

#### B.1 메인 메뉴 구조
```
┌─────────────────────────────────┐
│         Shadow Archer          │
│                                 │
│     [새 게임]    [이어하기]     │
│                                 │
│     [설정]      [도전모드]      │
│                                 │
│           [종료]                │
└─────────────────────────────────┘
```

#### B.2 인게임 HUD 레이아웃
```
체력바 ████████░░ (80%)    궁극기 ████░░░░░░ (40%)
스태미나 ██████████ (100%)

                [맵 중앙]
               [캐릭터들]

[조이스틱]              [공격 버튼]
                        [스킬 버튼]
                        [회피 버튼]
```

### C. 키 바인딩 맵 (모바일 한 손 기준)

#### C.1 기본 조작
- **왼쪽 엄지**: 가상 조이스틱 (이동)
- **오른쪽 엄지**: 멀티 제스처 영역
  - 탭: 기본 공격
  - 길게 누르기 (0.5초+): 강공격 차지
  - 위로 스와이프: 점프/회피
  - 아래로 스와이프: 방어/패링
  - 더블탭: 스킬/궁극기

#### C.2 고급 조작 (숙련자용)
- **두 손가락 피치**: 카메라 줌 (옵션)
- **세 손가락 탭**: 일시정지
- **긴 스와이프**: 방향 전환 공격

### D. 기획 Q&A / 피드백 정리

#### D.1 자주 묻는 질문

**Q: 왜 1인칭이 아닌 쿼터뷰를 선택했나요?**
A: 모바일 환경에서 한 손 조작 시 1인칭은 어지러움과 조작 어려움을 야기합니다. 쿼터뷰는 전술적 판단과 패턴 읽기에 유리하며, 소울라이크 장르의 핵심인 '패턴 학습'에 더 적합합니다.

**Q: TypeScript로 개발하면 성능이 느리지 않나요?**
A: Cocos Creator는 런타임에 네이티브 코드로 컴파일되며, 3D 렌더링은 C++ 엔진이 처리합니다. 게임 로직만 TypeScript로 작성하므로 성능 영향은 미미하며, 개발 효율성이 훨씬 높습니다.

**Q: 소울라이크 장르가 모바일에서도 재미있을까요?**
A: 짧은 세션 플레이에 맞게 조정한다면 충분히 가능합니다. 5-10분 단위의 도전, 빠른 리스폰, 점진적 성장 시스템으로 모바일 사용자의 플레이 패턴에 맞춰 설계했습니다.

#### D.2 개발 과정에서 고려할 점

1. **접근성**: 색맹, 청각 장애인을 위한 UI 옵션
2. **현지화**: 다국어 지원을 위한 텍스트 관리 시스템  
3. **수익화**: 강제가 아닌 선택적 광고 시청 보상
4. **커뮤니티**: 플레이어 간 기록 공유 시스템
5. **확장성**: 새로운 스테이지, 보스 추가를 위한 모듈 구조

---

**이 기획서는 Claude Code와 함께 지속적으로 발전시켜 나갈 예정입니다. 
개발 과정에서 새로운 아이디어나 기술적 도전이 생기면 언제든 AI의 도움을 받아 
더 나은 게임으로 만들어 나가겠습니다.** 🎮✨