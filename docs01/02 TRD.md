# 📋 Technical Requirements Document (TRD)
## Shadow Archer: 3D 쿼터뷰 소울라이크 모바일 게임

**Document Version**: 1.0  
**Date**: 2025-08-04  
**Project**: Shadow Archer (가제)  
**Target**: Cocos Creator + TypeScript 기반 개발

---

## 1. 📖 프로젝트 개요

### 1.1 게임 비전
- **장르**: 3D 액션 RPG (소울라이크 + 보스 헌팅)
- **플랫폼**: 모바일 우선 (iOS, Android), Web 보조
- **핵심 경험**: 정밀한 조준과 타이밍 기반 전투의 긴장감
- **개발 철학**: AI 코딩 보조를 활용한 효율적 개발

### 1.2 기술적 목표
- **성능**: 30fps 이상 안정적 유지 (저사양 기기 포함)
- **용량**: 최초 다운로드 150MB 이하
- **메모리**: 200MB 이하 사용량 유지
- **배터리**: 1시간 연속 플레이 시 20% 이하 소모

### 1.3 개발 제약사항
- **개발 기간**: 6개월 (MVP 기준)
- **팀 규모**: 1-2명 + AI 코딩 보조
- **예산**: 오픈소스 도구 중심, 최소 라이선스 비용

---

## 2. 🏗️ 시스템 아키텍처

### 2.1 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Mobile UI     │  │   Game Camera   │  │   Effects   │ │
│  │   - Touch Input │  │   - Quarter View│  │   - Particles│ │
│  │   - HUD/Menus   │  │   - Smooth Track│  │   - Lighting │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                     Game Logic Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Combat System  │  │   AI System     │  │ State Mgmt  │ │
│  │  - Weapon Types │  │   - Boss AI     │  │ - Game State│ │
│  │  - Hit Detection│  │   - Enemy AI    │  │ - Save/Load │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Engine Layer (Cocos Creator)           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  3D Renderer    │  │  Physics Engine │  │Audio Engine │ │
│  │  - WebGL/Metal  │  │  - Collision    │  │- 3D Sound   │ │
│  │  - Shadows      │  │  - Raycasting   │  │- Music      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Platform Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │     iOS         │  │    Android      │  │     Web     │ │
│  │  - Metal API    │  │  - Vulkan API   │  │  - WebGL    │ │
│  │  - Touch Input  │  │  - Touch Input  │  │  - Mouse    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 모듈 간 통신 구조

```typescript
// 이벤트 기반 모듈 통신
interface GameEventSystem {
    // Core Events
    on(event: 'player_move', callback: (position: Vec3) => void): void;
    on(event: 'enemy_hit', callback: (damage: number, target: Entity) => void): void;
    on(event: 'boss_phase_change', callback: (phase: number) => void): void;
    
    // UI Events  
    on(event: 'ui_button_press', callback: (buttonId: string) => void): void;
    on(event: 'health_changed', callback: (newHealth: number) => void): void;
    
    // System Events
    on(event: 'game_pause', callback: () => void): void;
    on(event: 'level_complete', callback: (score: number) => void): void;
    
    emit(event: string, ...args: any[]): void;
}
```

### 2.3 데이터 흐름 설계

```typescript
// 단방향 데이터 흐름 (Redux-like 패턴)
interface GameState {
    player: PlayerState;
    enemies: EnemyState[];
    ui: UIState;
    game: GameSessionState;
}

interface StateManager {
    getState(): GameState;
    dispatch(action: GameAction): void;
    subscribe(listener: (state: GameState) => void): void;
}

// 액션 기반 상태 변경
type GameAction = 
    | { type: 'PLAYER_MOVE', payload: { position: Vec3 } }
    | { type: 'PLAYER_ATTACK', payload: { weaponType: WeaponType } }
    | { type: 'ENEMY_SPAWN', payload: { enemyType: EnemyType, position: Vec3 } }
    | { type: 'BOSS_PHASE_CHANGE', payload: { phase: number } };
```

---

## 3. 🛠️ 기술 스택 선정

### 3.1 핵심 기술 스택

| 구분 | 기술 | 선정 근거 | 대안 |
|------|------|-----------|------|
| **게임 엔진** | Cocos Creator 3.8+ | 모바일 최적화, TypeScript 지원, AI 코딩 친화적 | Unity (C# 학습 곡선), Godot (커뮤니티 규모) |
| **개발 언어** | TypeScript 4.1+ | AI 코딩 최적화, 타입 안정성, 개발 효율성 | JavaScript (타입 안전성 부족), C++ (개발 복잡도) |
| **상태 관리** | 커스텀 Redux-like | 게임 로직 예측 가능성, 디버깅 용이성 | MobX (복잡도), 직접 상태 (확장성 제한) |
| **빌드 도구** | Cocos Creator 내장 | 통합 빌드 파이프라인, 크로스 플랫폼 지원 | Webpack (설정 복잡도), Vite (게임 엔진 미지원) |

### 3.2 개발 도구 체인

```typescript
// 개발 환경 구성
interface DevelopmentToolchain {
    // 코드 에디터
    ide: "Visual Studio Code";
    extensions: [
        "Cocos Creator Extension",
        "TypeScript Hero", 
        "GitLens",
        "AI Coding Assistant"
    ];
    
    // 버전 관리
    vcs: "Git";
    repository: "GitHub";
    workflow: "GitHub Actions";
    
    // AI 코딩 도구
    aiTools: [
        "Claude Code",  // 메인 코딩 보조
        "GitHub Copilot", // 코드 자동완성
        "ChatGPT-4" // 아키텍처 리뷰
    ];
    
    // 테스팅 도구
    testing: {
        unitTest: "Jest + TypeScript",
        integration: "Cocos Creator Test Runner",
        performance: "Custom Performance Monitor"
    };
}
```

### 3.3 라이브러리 및 플러그인

```typescript
// 필수 라이브러리
interface ProjectDependencies {
    // 수학 연산
    math: "gl-matrix" | "Cocos Creator Built-in";
    
    // 유틸리티
    utils: {
        lodash: "4.17.21", // 데이터 처리
        uuid: "9.0.0",     // 고유 ID 생성
        eventemitter3: "4.0.7" // 이벤트 시스템
    };
    
    // 개발 도구
    devDependencies: {
        typescript: "4.1.0+",
        "@types/node": "latest",
        eslint: "latest",
        prettier: "latest"
    };
    
    // 런타임 (Cocos Creator 내장)
    runtime: {
        physics: "Cannon.js (Built-in)",
        audio: "Web Audio API Wrapper",
        graphics: "WebGL/Metal/Vulkan Renderer"
    };
}
```

---

## 4. 📱 플랫폼별 기술 요구사항

### 4.1 모바일 플랫폼 (iOS/Android)

#### 최소 하드웨어 요구사항
```typescript
interface MinimumRequirements {
    ios: {
        version: "iOS 12.0+";
        device: "iPhone 7 / iPad Air 2 이상";
        ram: "2GB+";
        storage: "200MB 여유공간";
        gpu: "A10 Bionic 이상";
    };
    
    android: {
        version: "Android 7.0 (API 24)+";
        ram: "3GB+";
        storage: "200MB 여유공간";
        gpu: "Adreno 530, Mali-G71 MP8 이상";
        opengl: "OpenGL ES 3.0+";
    };
}
```

#### 최적화 전략
```typescript
interface MobileOptimization {
    graphics: {
        // 해상도 스케일링
        dynamicResolution: "720p-1080p 범위에서 FPS 기반 조절";
        
        // 텍스처 압축
        textureCompression: {
            ios: "ASTC 4x4",
            android: "ETC2"
        };
        
        // LOD (Level of Detail)
        modelLOD: "거리 기반 3단계 LOD";
        
        // 라이팅
        lighting: "최대 4개 동적 광원, 나머지는 베이크드";
    };
    
    performance: {
        // 프레임레이트 관리
        targetFPS: "30fps (일반), 60fps (고사양)";
        
        // 메모리 관리
        memoryPool: "오브젝트 풀링으로 GC 부하 최소화";
        
        // 배터리 최적화
        cpuThrottling: "백그라운드 시 CPU 사용량 50% 감소";
    };
}
```

### 4.2 웹 플랫폼 (보조)

#### 브라우저 지원 범위
```typescript
interface WebSupport {
    browsers: {
        chrome: "90+";
        firefox: "88+";
        safari: "14+";
        edge: "90+";
    };
    
    features: {
        webgl: "WebGL 2.0 필수";
        audio: "Web Audio API";
        input: "Pointer Events / Touch Events";
        storage: "IndexedDB";
    };
    
    limitations: {
        performance: "모바일 대비 70% 성능";
        features: "진동, 푸시 알림 제외";
        storage: "50MB 제한";
    };
}
```

---

## 5. 🎯 성능 요구사항

### 5.1 프레임레이트 및 응답성

```typescript
interface PerformanceTargets {
    frameRate: {
        minimum: "25 FPS (저사양 기기)";
        target: "30 FPS (일반)";
        optimal: "60 FPS (고사양)";
        
        // 상황별 목표
        combat: "30 FPS 이상 (전투 중 필수)";
        ui: "60 FPS (메뉴, UI 조작)";
        loading: "제한 없음 (로딩 화면)";
    };
    
    inputLatency: {
        touch: "< 16ms (1프레임 이내)";
        action: "< 33ms (버튼 누름 → 액션 시작)";
        feedback: "< 50ms (타격감 피드백)";
    };
    
    loading: {
        startup: "< 3초 (첫 실행)";
        stage: "< 2초 (스테이지 로딩)";
        asset: "< 1초 (추가 에셋 로딩)";
    };
}
```

### 5.2 메모리 사용량 관리

```typescript
interface MemoryManagement {
    limits: {
        total: "200MB (최대 사용량)";
        textures: "80MB";
        audio: "30MB";
        scripts: "20MB";
        buffer: "70MB (여유 공간)";
    };
    
    strategies: {
        // 에셋 스트리밍
        assetStreaming: "스테이지별 동적 로딩/언로딩";
        
        // 오브젝트 풀링
        objectPooling: "자주 생성/삭제되는 오브젝트 재사용";
        
        // 텍스처 관리
        textureAtlas: "작은 텍스처들을 아틀라스로 통합";
        
        // 가비지 컬렉션
        gcOptimization: "대량 할당 방지, 프레임 분산 처리";
    };
}
```

### 5.3 네트워크 및 저장소

```typescript
interface DataManagement {
    storage: {
        local: {
            gameData: "5MB (세이브 파일, 설정)";
            cache: "20MB (임시 데이터)";
            assets: "150MB (게임 에셋)";
        };
        
        // 저장 전략
        persistence: "중요 데이터는 즉시 저장, 일반 데이터는 배치 저장";
    };
    
    network: {
        // 옵션: 향후 온라인 기능 대비
        api: "RESTful API 기반";
        format: "JSON (압축 적용)";
        timeout: "5초 (API 호출)";
        retry: "3회 재시도 후 오프라인 모드";
    };
}
```

---

## 6. 🔒 보안 및 안정성

### 6.1 데이터 보안

```typescript
interface SecurityRequirements {
    gameData: {
        // 세이브 파일 무결성
        saveValidation: "체크섬 기반 변조 감지";
        
        // 클라이언트 보안
        antiCheat: "기본적인 메모리 검증 (속도핵 방지)";
        
        // 민감 정보 보호  
        dataProtection: "로컬 저장 시 암호화 (AES-256)";
    };
    
    privacy: {
        // 개인정보 처리
        dataCollection: "최소한의 게임 통계만 수집";
        
        // GDPR/개인정보보호법 준수
        consent: "데이터 수집 사전 동의";
        
        // 아동 보호
        coppa: "13세 미만 개인정보 수집 금지";
    };
}
```

### 6.2 에러 처리 및 안정성

```typescript
interface StabilityRequirements {
    errorHandling: {
        // 크래시 방지
        crashPrevention: "예외 상황 우아한 처리";
        
        // 복구 메커니즘
        recovery: "자동 저장으로부터 복구";
        
        // 로그 수집
        logging: "크래시 정보 로컬 저장 (개인정보 제외)";
    };
    
    testing: {
        // 디바이스 테스트
        deviceTesting: "주요 기종별 호환성 테스트";
        
        // 스트레스 테스트
        stressTest: "30분 연속 플레이 안정성";
        
        // 메모리 누수 테스트
        memoryLeak: "1시간 플레이 후 메모리 사용량 안정성";
    };
}
```

---

## 7. 🎨 미디어 및 에셋 요구사항

### 7.1 3D 에셋 기준

```typescript
interface Asset3DStandards {
    models: {
        // 폴리곤 수 제한
        character: "2000-5000 tris";
        enemy: "1000-3000 tris";
        boss: "5000-8000 tris";
        environment: "500-2000 tris per object";
        
        // 최적화 기준
        uvMapping: "1024x1024 또는 512x512 텍스처";
        materials: "최대 2개 머티리얼 per 모델";
        bones: "최대 50개 본 (캐릭터)";
    };
    
    textures: {
        // 해상도 기준
        character: "1024x1024 (디퓨즈 + 노멀)";
        environment: "512x512";
        ui: "256x256 (아이콘), 512x512 (배경)";
        
        // 압축 포맷
        compression: {
            ios: "ASTC 4x4 (고품질), ASTC 6x6 (일반)";
            android: "ETC2 (고품질), ETC1 (호환성)";
            web: "S3TC/DXT (데스크톱), ETC1 (모바일)";
        };
    };
    
    animations: {
        // 프레임레이트
        frameRate: "30 FPS";
        
        // 압축
        compression: "키프레임 최적화, 불필요한 트랙 제거";
        
        // 길이 제한
        maxDuration: "10초 (일반), 30초 (시네마틱)";
    };
}
```

### 7.2 오디오 기준

```typescript
interface AudioStandards {
    music: {
        format: "OGG Vorbis";
        quality: "128 kbps 스테레오";
        loop: "완벽한 루프 포인트";
        length: "1-3분 (배경음악), 10-30초 (인트로)";
    };
    
    sfx: {
        format: "WAV → 빌드 시 OGG 변환";
        quality: "44.1kHz, 16-bit";
        channels: "모노 (효과음), 스테레오 (앰비언트)";
        length: "< 5초 (대부분), < 15초 (특수 효과)";
    };
    
    voice: {
        format: "OGG Vorbis";
        quality: "64 kbps 모노";
        processing: "노이즈 제거, 정규화";
        length: "< 10초 (일반), < 30초 (컷신)";
    };
    
    optimization: {
        // 동적 로딩
        streaming: "배경음악 스트리밍, 효과음 프리로드";
        
        // 압축 최적화
        compression: "무손실 → 손실 압축으로 50% 용량 절약";
        
        // 3D 오디오
        spatialAudio: "거리 기반 볼륨, 방향성 사운드";
    };
}
```

---

## 8. 🚀 배포 및 CI/CD

### 8.1 빌드 파이프라인

```typescript
interface BuildPipeline {
    development: {
        // 개발 빌드
        target: "빠른 빌드, 디버그 정보 포함";
        optimization: "최소한의 최적화";
        testing: "유닛 테스트 자동 실행";
    };
    
    staging: {
        // 스테이징 빌드
        target: "프로덕션과 동일한 최적화";
        testing: "통합 테스트, 성능 테스트";
        deployment: "내부 테스터용 배포";
    };
    
    production: {
        // 프로덕션 빌드
        optimization: "최대 최적화, 난독화";
        testing: "전체 테스트 스위트";
        deployment: "앱스토어/플레이스토어";
    };
}
```

### 8.2 배포 전략

```typescript
interface DeploymentStrategy {
    platforms: {
        ios: {
            store: "App Store";
            requirement: "iOS 앱 스토어 가이드라인 준수";
            testing: "TestFlight 베타 테스팅";
        };
        
        android: {
            store: "Google Play Store";
            requirement: "Play Console 정책 준수";
            testing: "Internal Testing → Closed Testing → Open Testing";
        };
        
        web: {
            hosting: "CDN 기반 배포";
            requirement: "Progressive Web App (PWA) 지원";
            testing: "주요 브라우저 호환성";
        };
    };
    
    rollout: {
        // 단계별 배포
        phaseOne: "내부 팀 테스트 (1주)";
        phaseTwo: "베타 테스터 (2주)";
        phaseThree: "소프트 런치 (지역 제한)";
        phaseFour: "글로벌 런치";
    };
}
```

---

## 9. 📊 모니터링 및 분석

### 9.1 성능 모니터링

```typescript
interface PerformanceMonitoring {
    realtime: {
        // 실시간 메트릭
        fps: "프레임레이트 추적";
        memory: "메모리 사용량 모니터링";
        cpu: "CPU 사용률 측정";
        battery: "배터리 소모량 추적";
    };
    
    analytics: {
        // 게임 플레이 분석
        sessionLength: "평균 플레이 시간";
        retention: "1일/7일/30일 재방문율";
        progression: "스테이지 클리어율";
        difficulty: "사망률, 재시도율";
    };
    
    technical: {
        // 기술적 메트릭
        crashRate: "크래시 발생률 < 0.1%";
        loadTime: "로딩 시간 분포";
        devicePerformance: "기종별 성능 차이";
    };
}
```

### 9.2 사용자 피드백 시스템

```typescript
interface FeedbackSystem {
    ingame: {
        // 게임 내 피드백
        rating: "스테이지 클리어 시 난이도 평가";
        crash: "크래시 발생 시 자동 리포트";
        bug: "버그 신고 기능";
    };
    
    external: {
        // 외부 채널
        appStore: "앱스토어 리뷰 모니터링";
        community: "Discord/Reddit 피드백 수집";
        support: "고객 지원 시스템";
    };
    
    analysis: {
        // 피드백 분석
        sentiment: "감정 분석을 통한 만족도 측정";
        priority: "피드백 우선순위 분류";
        actionable: "실행 가능한 개선사항 도출";
    };
}
```

---

## 10. 🎯 AI 코딩 통합 전략

### 10.1 AI 도구 활용 계획

```typescript
interface AICodingStrategy {
    development: {
        // 코드 생성
        boilerplate: "Claude Code로 기본 구조 생성";
        algorithms: "복잡한 AI 로직 구현 보조";
        optimization: "성능 최적화 제안";
        
        // 코드 리뷰
        review: "AI 기반 코드 품질 검사";
        refactor: "리팩토링 제안 및 구현";
        testing: "테스트 케이스 자동 생성";
    };
    
    design: {
        // 게임 밸런싱
        balancing: "플레이 데이터 기반 난이도 조절";
        content: "새로운 적/보스 패턴 생성";
        tuning: "수치 최적화 제안";
    };
    
    workflow: {
        // 개발 프로세스
        documentation: "코드 주석 및 문서 자동 생성";
        debugging: "버그 원인 분석 및 해결책 제시";
        learning: "새로운 기술 학습 및 적용 가이드";
    };
}
```

### 10.2 AI-Human 협업 워크플로우

```typescript
interface AICollaborationWorkflow {
    planning: {
        // 설계 단계
        human: "요구사항 정의, 아키텍처 결정";
        ai: "구현 방법 제안, 기술적 검토";
        collaboration: "설계 문서 공동 작성";
    };
    
    implementation: {
        // 구현 단계
        human: "핵심 로직 리뷰, 게임플레이 검증";
        ai: "코드 생성, 버그 수정, 최적화";
        collaboration: "페어 프로그래밍 스타일 개발";
    };
    
    testing: {
        // 테스트 단계
        human: "플레이 테스트, 사용자 경험 검증";
        ai: "자동화된 테스트, 성능 검증";
        collaboration: "테스트 케이스 설계 및 실행";
    };
}
```

---

## 11. 📅 개발 일정 및 마일스톤

### 11.1 개발 단계별 일정

```typescript
interface DevelopmentSchedule {
    phase1_foundation: {
        duration: "2주";
        deliverables: [
            "프로젝트 셋업 및 기본 구조",
            "Core System 모듈 설계",
            "플레이어 기본 조작 구현"
        ];
        aiTasks: [
            "보일러플레이트 코드 생성",
            "입력 시스템 구현 보조"
        ];
    };
    
    phase2_core: {
        duration: "6주";
        deliverables: [
            "전투 시스템 완성",
            "기본 AI 시스템",
            "1스테이지 프로토타입"
        ];
        aiTasks: [
            "전투 로직 구현",
            "적 AI 패턴 생성",
            "밸런싱 수치 최적화"
        ];
    };
    
    phase3_content: {
        duration: "8주";
        deliverables: [
            "3개 스테이지 완성",
            "보스 AI 시스템",
            "UI/UX 완성"
        ];
        aiTasks: [
            "보스 패턴 다양화",
            "UI 컴포넌트 구현",
            "사운드 시스템 통합"
        ];
    };
    
    phase4_polish: {
        duration: "6주";
        deliverables: [
            "성능 최적화",
            "버그 수정 및 안정성 개선",
            "앱스토어 배포 준비",
            "최종 테스트 및 QA"
        ];
        aiTasks: [
            "성능 병목 지점 분석 및 최적화",
            "자동화된 테스트 케이스 생성",
            "배포 스크립트 작성"
        ];
    };
}
```

### 11.2 핵심 마일스톤

```typescript
interface KeyMilestones {
    milestone1_mvp: {
        target: "4주차";
        criteria: [
            "플레이어 기본 조작 완성",
            "1개 적과 전투 가능",
            "간단한 UI 동작"
        ];
        success: "5분간 안정적인 플레이 가능";
    };
    
    milestone2_vertical_slice: {
        target: "10주차";  
        criteria: [
            "1스테이지 완전 플레이 가능",
            "보스 1개 완성",
            "기본 성장 시스템 동작"
        ];
        success: "완전한 게임 루프 체험 가능";
    };
    
    milestone3_alpha: {
        target: "18주차";
        criteria: [
            "3스테이지 + 3보스 완성",
            "모든 핵심 시스템 구현",
            "모바일 기기에서 안정적 실행"
        ];
        success: "알파 테스터 배포 가능";
    };
    
    milestone4_beta: {
        target: "22주차";
        criteria: [
            "모든 콘텐츠 완성",
            "성능 최적화 완료",
            "주요 버그 수정"
        ];
        success: "퍼블릭 베타 배포 가능";
    };
    
    milestone5_gold: {
        target: "26주차";
        criteria: [
            "앱스토어 심사 통과",
            "런치 준비 완료",
            "모니터링 시스템 가동"
        ];
        success: "상용 서비스 시작";
    };
}
```

---

## 12. 🔧 개발 환경 구성

### 12.1 필수 개발 도구

```typescript
interface DevelopmentEnvironment {
    system: {
        os: "Windows 10/11, macOS 12+, Linux Ubuntu 20.04+";
        hardware: {
            cpu: "Intel i5 8세대 / AMD Ryzen 5 이상";
            ram: "16GB 이상 권장";
            gpu: "OpenGL 4.1 / DirectX 11 지원";
            storage: "SSD 100GB 여유공간";
        };
    };
    
    software: {
        // 핵심 도구
        engine: "Cocos Creator 3.8.0+";
        editor: "Visual Studio Code";
        versionControl: "Git 2.30+";
        
        // AI 코딩 도구
        aiCoding: [
            "Claude Code (Primary)",
            "GitHub Copilot (Secondary)",
            "ChatGPT-4 (Architecture Review)"
        ];
        
        // 3D 에셋 도구
        modeling: "Blender 3.6+ (무료) / Maya (선택사항)";
        texturing: "Substance Painter (텍스처링)";
        animation: "Mixamo (리깅/애니메이션)";
        
        // 오디오 도구
        audio: "Audacity (무료) / Adobe Audition";
        music: "FL Studio / Logic Pro X";
    };
    
    cloudServices: {
        // 클라우드 개발 환경
        repository: "GitHub (프라이빗 리포지토리)";
        ci_cd: "GitHub Actions";
        storage: "GitHub LFS (대용량 에셋)";
        
        // 협업 도구
        communication: "Discord / Slack";
        projectManagement: "GitHub Projects / Trello";
        documentation: "Notion / GitBook";
    };
}
```

### 12.2 프로젝트 구조

```typescript
interface ProjectStructure {
    root: {
        "assets/": "게임 에셋 (3D 모델, 텍스처, 오디오)";
        "scripts/": "TypeScript 게임 로직";
        "scenes/": "Cocos Creator 씬 파일";
        "prefabs/": "재사용 가능한 프리팹";
        "settings/": "프로젝트 설정 파일";
    };
    
    scripts: {
        "core/": "핵심 시스템 (상태관리, 이벤트)";
        "combat/": "전투 관련 로직";
        "ai/": "적 AI 및 보스 패턴";
        "ui/": "사용자 인터페이스";
        "utils/": "유틸리티 함수들";
        "data/": "게임 데이터 및 설정";
        "tests/": "테스트 코드";
    };
    
    assets: {
        "models/": "3D 모델 파일 (.fbx, .gltf)";
        "textures/": "텍스처 이미지";
        "audio/": "사운드 및 음악 파일";
        "animations/": "애니메이션 클립";
        "materials/": "머티리얼 정의";
        "shaders/": "커스텀 쉐이더 (필요시)";
    };
}
```

---

## 13. 🧪 테스트 전략

### 13.1 테스트 레벨별 전략

```typescript
interface TestingStrategy {
    unitTesting: {
        framework: "Jest + TypeScript";
        coverage: "코드 커버리지 80% 이상";
        scope: [
            "게임 로직 함수",
            "수학 계산 (데미지, 이동)",
            "상태 변화 로직",
            "유틸리티 함수"
        ];
        automation: "CI/CD 파이프라인 통합";
    };
    
    integrationTesting: {
        framework: "Cocos Creator Test Runner";
        scope: [
            "모듈 간 상호작용",
            "에셋 로딩/언로딩",
            "씬 전환",
            "이벤트 시스템"
        ];
        frequency: "주간 자동 실행";
    };
    
    performanceTesting: {
        tools: "커스텀 성능 모니터";
        metrics: [
            "프레임레이트 안정성",
            "메모리 사용량 변화",
            "로딩 시간 측정",
            "배터리 소모량"
        ];
        benchmark: "타겟 디바이스에서 주간 테스트";
    };
    
    playTesting: {
        methodology: "사용자 중심 테스트";
        stages: [
            "내부 팀 테스트 (개발 중)",
            "알파 테스트 (핵심 기능 검증)",
            "베타 테스트 (전체 경험 검증)"
        ];
        feedback: "정량적 + 정성적 피드백 수집";
    };
}
```

### 13.2 품질 보증 (QA) 기준

```typescript
interface QualityAssurance {
    functionalQA: {
        // 기능 테스트
        gameplayMechanics: "모든 게임 기능 정상 동작";
        userInterface: "UI 요소 올바른 반응";
        progression: "게임 진행 차단 버그 없음";
        saveLoad: "저장/불러오기 100% 신뢰성";
    };
    
    compatibilityQA: {
        // 호환성 테스트
        devices: [
            "iPhone 12/13/14 시리즈",
            "Samsung Galaxy S21/S22/S23",
            "Google Pixel 6/7",
            "iPad Air/Pro (최근 3세대)"
        ];
        osVersions: [
            "iOS 15.0 ~ 17.0",
            "Android 10 ~ 14"
        ];
        screenSizes: "4.7인치 ~ 12.9인치 대응";
        orientations: "세로 모드 전용 (가로 모드 비활성화)";
    };
    
    performanceQA: {
        // 성능 기준
        frameRate: "30 FPS 이상 (95% 시간)";
        memoryUsage: "200MB 이하 유지";
        crashRate: "0.1% 미만";
        batteryDrain: "1시간당 20% 이하";
        
        // 스트레스 테스트
        longSession: "2시간 연속 플레이 안정성";
        rapidInput: "빠른 연속 입력 처리";
        memoryPressure: "메모리 부족 상황 대응";
    };
    
    localizationQA: {
        // 현지화 품질 (1차: 한국어/영어)
        textDisplay: "모든 텍스트 올바른 표시";
        fontSupport: "한글/영문 폰트 정상 렌더링";
        layoutAdaptation: "텍스트 길이 변화 대응";
        culturalAdaptation: "문화적 적절성 검토";
    };
}
```

---

## 14. 📋 위험 요소 및 대응책

### 14.1 기술적 위험 요소

```typescript
interface TechnicalRisks {
    performance: {
        risk: "저사양 기기에서 성능 부족";
        probability: "중간";
        impact: "높음";
        mitigation: [
            "초기부터 성능 우선 설계",
            "동적 품질 조절 시스템 구현",
            "정기적인 성능 프로파일링"
        ];
        contingency: "그래픽 품질 하향 조정 옵션";
    };
    
    compatibility: {
        risk: "플랫폼별 호환성 이슈";
        probability: "중간";
        impact: "중간";
        mitigation: [
            "개발 초기부터 멀티 플랫폼 테스트",
            "Cocos Creator 공식 지원 기능만 사용",
            "플랫폼별 조건부 컴파일"
        ];
        contingency: "문제 플랫폼 일시 배포 중단";
    };
    
    aiCodingDependency: {
        risk: "AI 도구 과의존으로 인한 개발 지연";
        probability: "낮음";
        impact: "중간";
        mitigation: [
            "핵심 로직은 수동 검토 필수",
            "AI 생성 코드 품질 가이드라인 수립",
            "전통적 개발 방법 병행"
        ];
        contingency: "AI 도구 없이도 개발 가능한 백업 계획";
    };
}
```

### 14.2 비즈니스 위험 요소

```typescript
interface BusinessRisks {
    market: {
        risk: "모바일 게임 시장 경쟁 심화";
        probability: "높음";
        impact: "높음";
        mitigation: [
            "차별화된 게임플레이 집중",
            "소셜 미디어 마케팅 활용",
            "인플루언서 협업"
        ];
        contingency: "PC/웹 플랫폼 확장";
    };
    
    appStore: {
        risk: "앱스토어 심사 리젝션";
        probability: "중간";
        impact: "높음";
        mitigation: [
            "심사 가이드라인 철저 준수",
            "사전 테스트 빌드 검토",
            "법무 검토 (개인정보, 결제 등)"
        ];
        contingency: "웹 버전 우선 출시";
    };
    
    team: {
        risk: "개발 팀 규모의 한계";
        probability: "중간";
        impact: "중간";
        mitigation: [
            "AI 도구 최대 활용",
            "오픈소스 라이브러리 적극 사용",
            "MVP 범위 엄격 관리"
        ];
        contingency: "외부 개발자 단기 계약";
    };
}
```

### 14.3 일정 관리 위험

```typescript
interface ScheduleRisks {
    featureCreep: {
        risk: "기능 추가 요구로 인한 일정 지연";
        probability: "높음";
        impact: "높음";
        mitigation: [
            "MVP 범위 명확히 정의",
            "기능 추가는 2.0 버전으로 연기",
            "주간 진행 상황 검토"
        ];
        contingency: "핵심 기능만으로 출시 후 업데이트";
    };
    
    technicalDebt: {
        risk: "기술 부채 누적으로 개발 속도 저하";
        probability: "중간";
        impact: "중간";
        mitigation: [
            "코드 리뷰 프로세스 엄격 적용",
            "정기적인 리팩토링 시간 확보",
            "AI 도구를 활용한 코드 품질 관리"
        ];
        contingency: "핵심 모듈 재작성";
    };
}
```

---

## 15. 📈 성공 지표 (KPI)

### 15.1 기술적 성공 지표

```typescript
interface TechnicalKPIs {
    performance: {
        // 성능 지표
        averageFPS: {
            target: "30 FPS 이상";
            measurement: "게임플레이 중 평균";
            frequency: "실시간 모니터링";
        };
        
        memoryUsage: {
            target: "150MB 이하 (평균)";
            measurement: "30분 플레이 세션";
            frequency: "일일 집계";
        };
        
        crashRate: {
            target: "0.1% 미만";
            measurement: "세션당 크래시 발생률";
            frequency: "주간 집계";
        };
        
        loadingTime: {
            target: "3초 이하 (앱 시작)";
            measurement: "콜드 스타트 기준";
            frequency: "빌드별 측정";
        };
    };
    
    quality: {
        // 품질 지표
        bugEscapeRate: {
            target: "5% 미만";
            measurement: "릴리즈 후 발견된 버그 / 전체 버그";
            frequency: "릴리즈별 집계";
        };
        
        codeCoverage: {
            target: "80% 이상";
            measurement: "유닛 테스트 커버리지";
            frequency: "빌드별 측정";
        };
        
        buildSuccess: {
            target: "95% 이상";
            measurement: "CI/CD 빌드 성공률";
            frequency: "일일 집계";
        };
    };
}
```

### 15.2 사용자 경험 지표

```typescript
interface UserExperienceKPIs {
    engagement: {
        // 사용자 참여도
        sessionLength: {
            target: "15분 이상 (평균)";
            measurement: "앱 실행부터 종료까지";
            frequency: "일일 집계";
        };
        
        retention: {
            day1: { target: "70% 이상" };
            day7: { target: "40% 이상" };
            day30: { target: "20% 이상" };
            measurement: "첫 실행 후 재방문율";
            frequency: "주간 집계";
        };
        
        completionRate: {
            tutorial: { target: "90% 이상" };
            firstStage: { target: "60% 이상" };
            firstBoss: { target: "30% 이상" };
            measurement: "각 단계별 완주율";
            frequency: "일일 집계";
        };
    };
    
    satisfaction: {
        // 사용자 만족도
        appStoreRating: {
            target: "4.0 이상";
            measurement: "앱스토어/플레이스토어 평점";
            frequency: "주간 모니터링";
        };
        
        nps: {
            target: "50 이상";
            measurement: "Net Promoter Score";
            frequency: "월간 설문";
        };
        
        supportTickets: {
            target: "사용자 100명당 1건 미만";
            measurement: "고객 지원 문의 건수";
            frequency: "주간 집계";
        };
    };
}
```

### 15.3 비즈니스 지표

```typescript
interface BusinessKPIs {
    growth: {
        // 성장 지표
        downloads: {
            target: "월 10,000 다운로드";
            measurement: "앱스토어 통계";
            frequency: "일일 집계";
        };
        
        activeUsers: {
            dau: { target: "1,000명" };    // Daily Active Users
            mau: { target: "10,000명" };   // Monthly Active Users
            measurement: "고유 사용자 수";
            frequency: "일일/월간 집계";
        };
        
        organicGrowth: {
            target: "다운로드의 60% 이상";
            measurement: "자연 유입 vs 유료 광고";
            frequency: "월간 분석";
        };
    };
    
    development: {
        // 개발 효율성
        velocityImprovement: {
            target: "AI 도구로 30% 개발 속도 향상";
            measurement: "기능당 개발 시간 비교";
            frequency: "스프린트별 측정";
        };
        
        codeQuality: {
            target: "AI 생성 코드 80% 이상 활용";
            measurement: "전체 코드 중 AI 기여도";
            frequency: "월간 분석";
        };
        
        bugFixTime: {
            target: "평균 24시간 이내";
            measurement: "버그 리포트부터 수정까지";
            frequency: "주간 집계";
        };
    };
}
```

---

## 16. 📚 참고 문서 및 리소스

### 16.1 기술 문서

```typescript
interface TechnicalReferences {
    engine: {
        // Cocos Creator 공식 문서
        official: "https://docs.cocos.com/creator/3.8/manual/";
        api: "https://docs.cocos.com/creator/3.8/api/";
        examples: "https://github.com/cocos/cocos-example-projects";
        community: "https://discuss.cocos2d-x.org/c/cocos-creator";
    };
    
    typescript: {
        // TypeScript 관련 자료
        handbook: "https://www.typescriptlang.org/docs/";
        bestPractices: "https://typescript-eslint.io/rules/";
        gameDevPatterns: "https://gameprogrammingpatterns.com/";
    };
    
    mobile: {
        // 모바일 게임 개발 가이드
        ios: "https://developer.apple.com/game-center/";
        android: "https://developer.android.com/games";
        performance: "https://developer.android.com/games/optimize";
        monetization: "https://developers.google.com/admob/unity/quick-start";
    };
    
    ai: {
        // AI 코딩 도구 문서
        claudeCode: "https://docs.anthropic.com/claude-code";
        copilot: "https://docs.github.com/copilot";
        bestPractices: "https://github.com/features/copilot/plans";
    };
}
```

### 16.2 학습 리소스

```typescript
interface LearningResources {
    gameDesign: {
        // 게임 디자인 이론
        books: [
            "The Art of Game Design - Jesse Schell",
            "Game Feel: A Game Designer's Guide - Steve Swink",
            "Rules of Play - Katie Salen & Eric Zimmerman"
        ];
        
        courses: [
            "Game Design Concepts (Coursera)",
            "Introduction to Game Development (Unity Learn)",
            "Mobile Game Development (Udemy)"
        ];
        
        blogs: [
            "Gamasutra Developer Blogs",
            "GDC Vault Presentations",
            "Indie Game Developer Stories"
        ];
    };
    
    technical: {
        // 기술 학습 자료
        3d: [
            "Blender Guru YouTube Channel",
            "Cocos Creator 3D Tutorial Series",
            "Real-Time Rendering Techniques"
        ];
        
        programming: [
            "Clean Code - Robert Martin",
            "TypeScript Deep Dive",
            "Game Programming Patterns"
        ];
        
        performance: [
            "High Performance Mobile Game Development",
            "Optimizing Unity Games for Mobile",
            "GPU Performance Optimization"
        ];
    };
    
    business: {
        // 비즈니스 측면
        marketing: [
            "Mobile Game Marketing Guide",
            "App Store Optimization (ASO)",
            "Indie Game Marketing on Social Media"
        ];
        
        analytics: [
            "Game Analytics Best Practices",
            "User Acquisition for Mobile Games",
            "Retention and Monetization Strategies"
        ];
    };
}
```

---

## 17. 🎯 결론 및 다음 단계

### 17.1 TRD 요약

이 기술 요구사항 문서는 **Shadow Archer** 프로젝트의 기술적 기반을 제공합니다:

**핵심 기술 결정:**
- ✅ **Cocos Creator + TypeScript**: AI 코딩 친화적, 모바일 최적화
- ✅ **3D 쿼터뷰**: 한 손 조작에 최적화된 카메라 시점
- ✅ **모듈형 아키텍처**: 독립적 개발 및 테스트 가능
- ✅ **성능 우선 설계**: 저사양 기기까지 고려한 최적화

**AI 협업 전략:**
- 🤖 **Claude Code**: 메인 개발 보조 도구
- 🤖 **패턴 기반 생성**: 보스 AI, 전투 시스템 자동 생성
- 🤖 **지속적 최적화**: 실시간 성능 분석 및 개선

### 17.2 다음 단계 계획

**즉시 진행 항목:**
1. **Core System Design** 문서 작성
2. **개발 환경 셋업** (Cocos Creator 프로젝트 생성)
3. **기본 프로젝트 구조** 구축

**제안하는 다음 문서:**
```typescript
interface NextDocuments {
    priority1: "Core System Design (입력, 상태관리, 게임루프)";
    priority2: "Combat System Design (무기, 전투, 타격감)";
    priority3: "AI System Design (적 AI, 보스 패턴)";
    priority4: "UI/UX System Design (모바일 최적화)";
    priority5: "Rendering & Animation System";
}
```

**어느 모듈부터 시작하시겠습니까?**

저는 **Core System Design**부터 시작하기를 추천합니다. 이것이 모든 다른 시스템의 기반이 되기 때문입니다.

---

**문서 승인 및 다음 단계:**
- [ ] TRD 검토 및 승인
- [ ] 개발 환경 구성
- [ ] Core System Design 문서 작성 시작
- [ ] 첫 번째 프로토타입 개발 계획

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.*