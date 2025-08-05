# 🌪️ WindWalker 테스트 자동화 가이드

Claude Code + Playwright + MCP 기반 고도화된 테스트 자동화 시스템

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [3가지 테스트 모드](#3가지-테스트-모드)
3. [주요 기능](#주요-기능)
4. [설치 및 설정](#설치-및-설정)
5. [사용 방법](#사용-방법)
6. [테스트 세트 자동 생성](#테스트-세트-자동-생성)
7. [브라우저 기반 테스트 선택](#브라우저-기반-테스트-선택)
8. [Diff 기반 수정 시스템](#diff-기반-수정-시스템)
9. [자동 문서화 및 GitHub 통합](#자동-문서화-및-github-통합)
10. [트러블슈팅](#트러블슈팅)

## 시스템 개요

WindWalker 테스트 자동화 시스템은 다음과 같은 특징을 가집니다:

- **🎯 지능형 실패 분석**: 테스트 실패 원인을 자동으로 분석하고 분류
- **🔧 Diff 기반 수정**: 변경 전/후를 명확히 보여주는 수정 제안
- **📚 자동 문서화**: 테스트 결과와 수정 내역을 자동으로 문서화
- **🔄 GitHub 통합**: 성공적인 수정사항을 자동으로 커밋 및 푸시
- **🎭 다양한 실행 모드**: 사용자 선호도에 따른 3가지 모드

## 3가지 테스트 모드

### ✅ 1. 반자동 모드 (Semi-Auto)

```bash
./windwalker-test-suite.sh test semi-auto
```

**특징:**
- 테스트 실패 시 Claude가 수정 제안을 보여줌
- 사용자가 "수정할까요?"에 승인 후 자동 적용
- 안전하고 예측 가능한 방식
- **권장 사용 사례**: 프로덕션 환경, 중요한 테스트

**프로세스:**
1. 테스트 실행 → 실패 감지
2. 실패 원인 분석 및 수정 계획 생성
3. 사용자에게 diff와 함께 수정 제안 표시
4. 사용자 승인 대기
5. 승인 시 수정 적용 및 재테스트

### 🔁 2. 자동 복구 모드 (Auto)

```bash
./windwalker-test-suite.sh test auto
```

**특징:**
- 실패 시 Claude가 묻지 않고 자동으로 수정
- 성공할 때까지 반복 수정 시도
- 위험도가 높은 변경사항은 자동 제외
- **권장 사용 사례**: 개발 환경, CI/CD 파이프라인

**프로세스:**
1. 테스트 실행 → 실패 감지
2. 위험도 평가 (high risk 변경사항 제외)
3. 안전한 수정사항만 자동 적용
4. 최대 재시도 횟수까지 반복

### 💬 3. 대화형 모드 (Interactive)

```bash
./windwalker-test-suite.sh test interactive
```

**특징:**
- 사용자가 테스트 목적과 예상 동작을 설명
- Claude가 컨텍스트를 바탕으로 더 정교한 수정 계획 수립
- 대화를 통한 학습 및 개선
- **권장 사용 사례**: 복잡한 테스트 케이스, 디버깅

**프로세스:**
1. 테스트 실행 → 실패 감지
2. 사용자에게 컨텍스트 질문
3. 답변을 바탕으로 수정 계획 개선
4. 맞춤형 수정 적용

## 주요 기능

### 🔍 지능형 실패 분석

시스템이 자동으로 감지하는 실패 유형:

- **Timeout**: 페이지 로드 또는 요소 대기 시간 초과
- **Element Visibility**: UI 요소가 보이지 않는 문제
- **Connection**: Code Server 연결 실패
- **Selector**: CSS/XPath 셀렉터 문제
- **Extension Loading**: VS Code 확장 로딩 실패

### 📊 Diff 기반 수정 시스템

모든 수정사항은 다음과 같이 표시됩니다:

```diff
- timeout: 30000
+ timeout: 90000
```

**제공 정보:**
- 변경 파일 경로
- 변경 전/후 코드
- 변경 사유 설명
- 위험도 평가 (low/medium/high)
- 백업 파일 경로

## 설치 및 설정

### 1. 초기 환경 설정

```bash
cd /home/user/studio/test-auto-repair
./windwalker-test-suite.sh setup
```

### 2. 종속성 확인

```bash
./windwalker-test-suite.sh help
```

필요한 도구들:
- Node.js 18+
- npm
- Git (GitHub 푸시용, 선택사항)
- Playwright (자동 설치됨)

## 사용 방법

### 기본 테스트 실행

```bash
# 반자동 모드 (기본값)
./windwalker-test-suite.sh test

# 특정 모드 지정
./windwalker-test-suite.sh test auto
./windwalker-test-suite.sh test interactive
```

### 테스트 생성

```bash
# Playwright codegen으로 브라우저 녹화
./windwalker-test-suite.sh generate record

# 컴포넌트별 테스트 템플릿 생성
./windwalker-test-suite.sh generate template ChatComponent

# 브라우저 UI 테스트 선택기 생성
./windwalker-test-suite.sh generate ui
```

### 리포트 및 정리

```bash
# 최신 테스트 리포트 보기
./windwalker-test-suite.sh report

# 임시 파일 정리
./windwalker-test-suite.sh clean
```

## 테스트 세트 자동 생성

### Playwright Codegen 사용

1. **브라우저 녹화 시작**:
   ```bash
   ./windwalker-test-suite.sh generate record
   ```

2. **브라우저에서 동작 수행**:
   - 자동으로 Chrome이 열림
   - WindWalker 확장 테스트할 동작 수행
   - Ctrl+C로 녹화 종료

3. **생성된 테스트 파일**:
   ```
   tests/generated-test.spec.js
   ```

### 컴포넌트별 템플릿 생성

```bash
./windwalker-test-suite.sh generate template PreviewPanel
```

생성되는 템플릿:
```javascript
test.describe('PreviewPanel Tests', () => {
  test('PreviewPanel 컴포넌트 로드 테스트', async ({ page }) => {
    // TODO: PreviewPanel 관련 테스트 로직 구현
  });
});
```

## 브라우저 기반 테스트 선택

### HTML UI 테스트 선택기

```bash
./windwalker-test-suite.sh ui
```

**기능:**
- ✅ 테스트 항목별 체크박스 선택
- 🎯 카테고리별 그룹화 (Core, AI Chat, Preview, File Ops)
- 📊 실시간 테스트 상태 표시
- 🔄 선택적 테스트 실행
- 📋 결과 다운로드 및 공유

**사용 방법:**
1. 브라우저에서 UI가 자동으로 열림
2. 실행할 테스트 항목 선택
3. "Run Selected Tests" 클릭
4. 실시간으로 결과 확인

### 지원하는 브라우저 기능

- **테스트 선택**: 개별 또는 전체 선택
- **실시간 로그**: 콘솔 스타일 출력
- **결과 다운로드**: JSON 형태로 리포트 저장
- **공유 기능**: 클립보드 복사 또는 브라우저 공유 API

## Diff 기반 수정 시스템

### 수정 제안 예시

**타임아웃 문제 발생 시:**

```
🔧 테스트 실패 분석 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
실패 유형: timeout
실패 메시지: Page load or element timeout
파일: ./tests/windwalker-phase1.spec.js:43

💡 수정 제안:

1. Increase timeout values
   우선순위: high | 위험도: low
   📁 ./playwright.config.js:
      • Global timeout 증가 (60s → 90s)
        변경 전: timeout: 60000
        변경 후: timeout: 90000
   📁 ./tests/windwalker-phase1.spec.js:
      • 대기 시간 증가 (3s → 8s)
        변경 전: waitForTimeout(3000)
        변경 후: waitForTimeout(8000)

✅ 사용자가 수정을 승인했습니다. 적용 중...
```

### 적용된 변경사항 추적

```diff
--- a/playwright.config.js
+++ b/playwright.config.js
@@ -4,7 +4,7 @@ const { defineConfig, devices } = require('@playwright/test');
 
 module.exports = defineConfig({
   testDir: './tests',
-  timeout: 60000,
+  timeout: 90000,
   fullyParallel: false,
   forbidOnly: !!process.env.CI,
```

### 백업 및 롤백

- 모든 변경사항은 자동으로 백업됨
- 백업 파일: `파일명.backup.타임스탬프`
- 필요시 수동 롤백 가능

## 자동 문서화 및 GitHub 통합

### 생성되는 문서들

#### 1. 테스트 리포트 (reports/test-report-{timestamp}.md)

```markdown
# WindWalker 테스트 자동화 리포트

## 📊 실행 요약
- 실행 시간: 2024-07-31T12:00:00Z
- 모드: semi-auto
- 총 실행 횟수: 2
- 재시도 횟수: 1
- 최종 상태: PASSED

## 🔧 수정 시도
### 수정 시도 1
- 시간: 2024-07-31T12:05:00Z
- 모드: semi-auto
- 상태: success
```

#### 2. 변경 로그 (docs/CHANGELOG.md)

모든 자동 수정사항이 diff와 함께 기록됩니다.

#### 3. README 배지 업데이트

```markdown
![Test Status](https://img.shields.io/badge/tests-passing-green)
```

### GitHub 자동 푸시

성공적인 테스트 완료 시:

1. **자동 커밋**:
   ```
   ✅ 자동 테스트 passed - 1개 자동 수정 적용
   
   🤖 Generated with Claude Code Auto-Repair System
   
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

2. **자동 푸시**: origin/main 또는 origin/master로 푸시

3. **푸시 실패 시**: 수동 푸시 안내 메시지 표시

## 트러블슈팅

### 일반적인 문제들

#### 1. Code Server 연결 실패

**증상**: `ECONNREFUSED` 에러
**해결방법**:
```bash
# 수동으로 Code Server 시작
bash ../start-windwalker.sh

# 또는 테스트 스위트가 자동으로 시작
./windwalker-test-suite.sh test
```

#### 2. 확장 로딩 실패

**증상**: WindWalker 아이콘이 보이지 않음
**해결방법**:
- 자동 수정 시스템이 확장 재설치 시도
- 수동 확인: `~/.local/share/code-server/extensions/`

#### 3. Playwright 브라우저 없음

**증상**: `Browser executable not found`
**해결방법**:
```bash
npx playwright install chromium
```

#### 4. Git 푸시 권한 문제

**증상**: `Permission denied` 또는 `Authentication failed`
**해결방법**:
- GitHub 토큰 설정 확인
- SSH 키 설정 확인
- 수동 푸시로 대체

### 로그 분석

#### 자동 복구 루프 로그

```
[2024-07-31T12:00:00.000Z] 🚀 semi-auto 모드로 테스트 자동화 시작...
[2024-07-31T12:00:01.000Z] ℹ️ 테스트 실행 (1/3)
[2024-07-31T12:00:30.000Z] ❌ 테스트 실패 (종료 코드: 1)
[2024-07-31T12:00:31.000Z] ⚠️ 1개의 문제 발견, semi-auto 모드로 복구 시작...
[2024-07-31T12:00:32.000Z] ✅ Diff 기반 수정 완료
[2024-07-31T12:00:35.000Z] ℹ️ 테스트 실행 (2/3)
[2024-07-31T12:01:05.000Z] ✅ 모든 테스트 통과!
```

### 성능 최적화

#### 테스트 실행 시간 단축

1. **병렬 실행 비활성화**: WindWalker는 단일 인스턴스만 지원
2. **헤드리스 모드**: `HEADLESS=true` 환경변수 설정
3. **선택적 테스트**: UI를 통해 필요한 테스트만 실행

#### 자동 수정 정확도 개선

1. **충분한 대기 시간**: 네트워크 상황에 맞게 조정
2. **안정적인 셀렉터**: ID 기반 셀렉터 사용 권장
3. **단계별 검증**: 각 단계마다 상태 확인

## 결론

WindWalker 테스트 자동화 시스템은 다음과 같은 이점을 제공합니다:

- **🎯 높은 안정성**: 지능형 실패 분석과 자동 수정
- **📚 완전한 추적성**: 모든 변경사항의 diff 기록
- **🔄 원활한 워크플로**: GitHub 통합과 자동 문서화
- **🎭 유연한 실행**: 3가지 모드로 다양한 요구사항 지원

프로덕션 환경에서는 `semi-auto` 모드를, CI/CD에서는 `auto` 모드를, 복잡한 디버깅에는 `interactive` 모드를 권장합니다.

---

**🤖 이 가이드는 Claude Code를 통해 자동 생성되었습니다.**