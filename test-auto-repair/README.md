# WindWalker 테스트 오토 리페어 루프

## 🎯 개요

WindWalker VS Code 확장의 자동화된 테스트 및 복구 시스템입니다. Playwright를 기반으로 하여 E2E 테스트를 실행하고, 실패 시 자동으로 문제를 진단하고 복구를 시도합니다.

## 🏗️ 아키텍처

### **핵심 구성 요소**
- **Playwright**: 브라우저 자동화 및 E2E 테스트
- **Auto-Repair Loop**: 테스트 실패 시 자동 복구 로직
- **Code Server Integration**: VS Code Code Server 환경과 통합
- **Smart Retry**: 지능적인 재시도 및 복구 메커니즘

### **디렉토리 구조**
```
test-auto-repair/
├── package.json              # 프로젝트 의존성
├── playwright.config.js      # Playwright 설정
├── auto-repair-loop.js       # 메인 오토 리페어 로직
├── run-auto-repair.sh        # 실행 스크립트
├── tests/
│   └── windwalker-phase1.spec.js  # Phase 1 테스트 시나리오
├── auto-repair-report.json   # 테스트 결과 리포트
└── playwright-report/        # Playwright HTML 리포트
```

## 🧪 테스트 시나리오 (Phase 1)

### **1. Extension Host 로딩 테스트**
- WindWalker 확장 활성화 로그 확인
- Extension Host 프로세스 상태 검증

### **2. UI 요소 가시성 테스트**
- 사이드바 WindWalker 아이콘 표시 확인
- Activity Bar에서 아이콘 클릭 가능성 검증

### **3. 패널 기능 테스트**
- WindWalker 패널 클릭 시 Welcome 뷰 표시
- 사이드바 패널 정상 로딩 확인

### **4. 명령어 실행 테스트**
- 명령 팔레트를 통한 "WindWalker: Hello World" 실행
- 알림 메시지 표시 확인

### **5. 워크스페이스 통합 테스트**
- VS Code 워크스페이스 로딩 확인
- 탐색기 패널에서 프로젝트 폴더 인식

## 🔧 자동 복구 기능

### **복구 가능한 문제 유형**

#### **1. Timeout 문제**
- **증상**: 페이지 로드 또는 요소 대기 시간 초과
- **복구**: 테스트 타임아웃 값 자동 증가
- **수정 파일**: `playwright.config.js`, 테스트 파일

#### **2. UI 요소 가시성 문제**  
- **증상**: WindWalker 아이콘이나 패널이 보이지 않음
- **복구**: 요소 대기 시간 증가, 셀렉터 수정
- **수정 파일**: 테스트 파일의 대기 시간 조정

#### **3. 연결 거부 문제**
- **증상**: Code Server 접속 불가 (ECONNREFUSED)
- **복구**: Code Server 자동 재시작
- **복구 과정**: 
  1. 기존 프로세스 종료
  2. start-windwalker.sh 재실행
  3. 서버 시작 대기

#### **4. 확장 로딩 실패**
- **증상**: WindWalker 확장이 로드되지 않음
- **복구**: 확장 재설치
- **복구 과정**:
  1. 기존 확장 디렉토리 삭제
  2. 소스에서 확장 디렉토리로 재복사
  3. Code Server 재시작

## 🚀 사용 방법

### **기본 실행**
```bash
cd /home/user/studio/test-auto-repair
./run-auto-repair.sh
```

### **개별 명령어**
```bash
# 의존성 설치
npm run install-deps

# 일반 테스트 (headless)
npm test

# 브라우저 표시 테스트
npm run test:headed

# 디버그 모드
npm run test:debug

# 오토 리페어 루프
npm run test:repair
```

### **수동 설정**
```bash
# 1. 의존성 설치
npm install
npx playwright install chromium

# 2. Code Server 시작 (별도 터미널)
cd /home/user/studio
./start-windwalker.sh

# 3. 테스트 실행
npx playwright test

# 4. 오토 리페어 루프 실행
node auto-repair-loop.js
```

## 📊 결과 및 리포트

### **자동 생성되는 리포트**

#### **1. auto-repair-report.json**
```json
{
  "timestamp": "2025-07-30T23:XX:XX.XXXZ",
  "totalRuns": 2,
  "retryCount": 1,
  "testResults": [...],
  "repairAttempts": [...],
  "finalStatus": "PASSED"
}
```

#### **2. Playwright HTML 리포트**
- 위치: `playwright-report/index.html`
- 브라우저에서 상세 테스트 결과 확인
- 스크린샷, 비디오, 트레이스 포함

#### **3. 실시간 콘솔 로그**
- 컬러 코딩된 상태 메시지
- 타임스탬프가 포함된 상세 로그
- 복구 시도 및 결과 표시

## ⚙️ 설정 커스터마이징

### **타임아웃 조정**
```javascript
// playwright.config.js
module.exports = defineConfig({
  timeout: 60000,        // 전체 테스트 타임아웃
  use: {
    baseURL: 'http://localhost:8082',
  },
  webServer: {
    timeout: 30000,      // Code Server 시작 대기
  }
});
```

### **재시도 횟수 변경**
```javascript
// auto-repair-loop.js
constructor() {
  this.maxRetries = 3;   // 최대 재시도 횟수
}
```

### **Code Server 포트 변경**
```javascript
// playwright.config.js
use: {
  baseURL: 'http://localhost:8082',  // 포트 변경
}
```

## 🐛 문제 해결

### **일반적인 문제들**

#### **1. Code Server 시작 실패**
```bash
# 수동 시작
cd /home/user/studio
./start-windwalker.sh

# 포트 충돌 확인
netstat -tlnp | grep 8082
```

#### **2. Playwright 설치 문제**
```bash
# 브라우저 재설치
npx playwright install chromium --force
```

#### **3. 확장 로딩 실패**
```bash
# 확장 수동 재설치
rm -rf ~/.local/share/code-server/extensions/windwalker-phase1
cp -r /home/user/studio/extensions/windwalker-phase1 ~/.local/share/code-server/extensions/
```

#### **4. 권한 문제**
```bash
# 실행 권한 확인
chmod +x run-auto-repair.sh
chmod +x auto-repair-loop.js
```

## 🔮 향후 개선 계획

### **Phase 2-4 확장**
- WebView 통신 테스트
- AI 서비스 연동 테스트
- 파일 시스템 통합 테스트

### **고급 복구 기능**
- 로그 기반 지능형 진단
- 성능 메트릭 모니터링
- 자동 회귀 테스트

### **CI/CD 통합**
- GitHub Actions 워크플로우
- 자동화된 릴리스 검증
- 성능 벤치마크 추적

## 📝 개발 노트

### **테스트 작성 가이드라인**
1. **명확한 테스트 의도**: 각 테스트의 목적을 명확히 기술
2. **안정적인 셀렉터**: ID나 고유 속성 우선 사용
3. **적절한 대기**: 요소 로딩 시간 고려
4. **독립성 보장**: 테스트 간 상태 공유 방지

### **복구 로직 확장 방법**
1. `analyzeFailures()` 메서드에 새로운 패턴 추가
2. 해당 복구 메서드 구현
3. `attemptRepair()` 스위치문에 케이스 추가

---

**🎉 테스트 기반 개발로 안정적인 WindWalker 확장을 구축하세요!**