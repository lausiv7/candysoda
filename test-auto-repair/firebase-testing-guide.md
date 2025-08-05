# Firebase 환경에서 WindWalker Phase 1 테스트 가이드

## 🔍 현재 상황 분석

Firebase Studio(Nix) 환경에서는 시스템 라이브러리 부족으로 Playwright 브라우저 실행이 제한됩니다. 하지만 여러 대안적 방법으로 테스트를 수행할 수 있습니다.

## 📊 HTML 테스트 리포트 확인 방법

### 방법 1: 간단한 HTTP 서버로 리포트 서빙

```bash
cd /home/user/studio/test-auto-repair

# 1. 테스트 실행 (실패해도 리포트 생성됨)
npx playwright test --reporter=html || true

# 2. 간단한 HTTP 서버 시작
python3 -m http.server 8090 --directory playwright-report &

# 3. 브라우저에서 접속
echo "리포트 URL: http://localhost:8090"
```

### 방법 2: VS Code Live Server 사용

```bash
# 1. VS Code에서 playwright-report 폴더 열기
code /home/user/studio/test-auto-repair/playwright-report

# 2. index.html 우클릭 → "Open with Live Server"
# 또는 포트를 직접 지정
```

### 방법 3: 리포트를 Markdown으로 변환

```bash
# HTML 리포트를 텍스트로 변환하는 스크립트 생성
cat > convert-report.js << 'EOF'
const fs = require('fs');
const path = require('path');

function convertHtmlReport() {
  const reportDir = './playwright-report';
  const indexPath = path.join(reportDir, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('HTML 리포트를 찾을 수 없습니다.');
    return;
  }
  
  const html = fs.readFileSync(indexPath, 'utf8');
  
  // 간단한 HTML 파싱으로 테스트 결과 추출
  const testResults = html.match(/<div[^>]*class="test[^"]*"[^>]*>[\s\S]*?<\/div>/g) || [];
  
  let markdown = '# Playwright 테스트 결과\n\n';
  
  testResults.forEach((result, index) => {
    const title = result.match(/>([^<]+)</)?.[1] || `테스트 ${index + 1}`;
    const status = result.includes('passed') ? '✅ PASS' : '❌ FAIL';
    markdown += `## ${title}\n**상태**: ${status}\n\n`;
  });
  
  fs.writeFileSync('./test-results.md', markdown);
  console.log('테스트 결과가 test-results.md에 저장되었습니다.');
}

convertHtmlReport();
EOF

node convert-report.js
```

## 🎯 브라우저 기반 테스트 선택 방법

### 1. 테스트 선택 UI 실행

```bash
cd /home/user/studio/test-auto-repair

# 테스트 선택 UI 생성 및 실행
./windwalker-test-suite.sh ui

# 또는 직접 생성
node test-generator.js ui

# HTTP 서버로 UI 서빙
python3 -m http.server 8091 --directory . &
echo "테스트 선택 UI: http://localhost:8091/test-selector-ui.html"
```

### 2. UI에서 테스트 선택 및 실행

1. **브라우저에서 `http://localhost:8091/test-selector-ui.html` 접속**
2. **테스트 카테고리별 선택**:
   - ✅ Core Extension Tests
   - 🤖 AI Chat Tests  
   - 🖥️ Preview Tests
   - 📁 File Operations
3. **"Run Selected Tests" 클릭**
4. **실시간 결과 모니터링**

### 3. 선택적 테스트 실행 스크립트

```bash
# 특정 테스트만 실행하는 스크립트 생성
cat > run-selected-tests.sh << 'EOF'
#!/bin/bash

echo "WindWalker Phase 1 선택적 테스트 실행"
echo "=================================="

PS3="실행할 테스트를 선택하세요: "
options=(
    "Extension 활성화 테스트"
    "사이드바 아이콘 테스트" 
    "Hello World 명령어 테스트"
    "전체 테스트 실행"
    "종료"
)

select opt in "${options[@]}"
do
    case $opt in
        "Extension 활성화 테스트")
            npx playwright test --grep "Extension Host가 로드되는지"
            break
            ;;
        "사이드바 아이콘 테스트")
            npx playwright test --grep "사이드바 아이콘이 표시되는지"
            break
            ;;
        "Hello World 명령어 테스트")
            npx playwright test --grep "Hello World 명령어"
            break
            ;;
        "전체 테스트 실행")
            npx playwright test
            break
            ;;
        "종료")
            break
            ;;
        *) echo "잘못된 선택입니다.";;
    esac
done
EOF

chmod +x run-selected-tests.sh
./run-selected-tests.sh
```

## 🔧 수동 테스트 방법

### 1. WindWalker Phase 1 확장 수동 검증

```bash
# 1. Code Server 시작
./start-windwalker.sh

# 2. 브라우저에서 접속
echo "Code Server: http://localhost:8082"

# 3. 수동 테스트 체크리스트 출력
cat > manual-test-checklist.md << 'EOF'
# WindWalker Phase 1 수동 테스트 체크리스트

## ✅ 기본 확장 로딩 테스트

### 1. 확장 활성화 확인
- [ ] VS Code 로딩 완료 후 정보 메시지 표시
- [ ] 콘솔에 "WindWalker Phase 1 활성화됨!" 로그 확인
- [ ] 활동 바에 WindWalker 아이콘(터미널 모양) 표시

### 2. 사이드바 패널 테스트
- [ ] WindWalker 아이콘 클릭 시 사이드바 열림
- [ ] "Welcome" 뷰 표시 확인
- [ ] "AI Chat" 뷰 표시 확인
- [ ] Welcome 뷰에 "WindWalker 활성화됨", "Phase 1 테스트 성공" 항목 표시

### 3. AI Chat WebView 테스트
- [ ] AI Chat 패널 클릭 시 WebView 로드
- [ ] "WindWalker AI Chat 로딩 중..." 메시지 표시
- [ ] 로딩 완료 후 "연결됨 - 메시지를 입력하세요" 상태 표시
- [ ] 입력 필드와 전송 버튼 활성화

### 4. 양방향 통신 테스트
- [ ] "hello" 입력 시 "Hello! WindWalker Phase 1이 정상적으로 작동하고 있습니다! 🚀" 응답
- [ ] "test" 입력 시 "테스트 성공! 확장과 웹뷰 간의 양방향 통신이 완벽하게 작동합니다! ✅" 응답  
- [ ] 기타 메시지에 대해 에코 응답 확인

### 5. 명령어 팔레트 테스트
- [ ] Ctrl+Shift+P로 명령 팔레트 열기
- [ ] "WindWalker: Hello World" 명령어 검색
- [ ] 명령어 실행 시 정보 메시지 표시

## 🐛 발견된 문제 기록

| 항목 | 예상 동작 | 실제 동작 | 심각도 |
|------|----------|----------|--------|
|      |          |          |        |

## 📊 테스트 결과 요약

- **통과**: ___/11 항목
- **실패**: ___/11 항목  
- **전체 성공률**: ___%

EOF

echo "수동 테스트 체크리스트가 생성되었습니다: manual-test-checklist.md"
```

### 2. 개발자 도구를 통한 디버깅

```javascript
// 브라우저 개발자 도구 콘솔에서 실행할 스크립트

// 1. 확장 로딩 상태 확인
console.log('=== WindWalker Extension 상태 확인 ===');
console.log('활동 바 아이콘:', document.querySelector('[title*="WindWalker"]'));
console.log('사이드바 패널:', document.querySelector('.sidebar-pane'));

// 2. WebView 통신 테스트
const testWebViewCommunication = () => {
  const chatInput = document.querySelector('#chat-input');
  const sendButton = document.querySelector('#send-button');
  
  if (chatInput && sendButton) {
    chatInput.value = 'debug test';
    sendButton.click();
    console.log('WebView 통신 테스트 메시지 전송');
  } else {
    console.error('Chat UI 요소를 찾을 수 없습니다');
  }
};

// 3. 확장 로그 모니터링
const monitorExtensionLogs = () => {
  const originalLog = console.log;
  console.log = (...args) => {
    if (args.some(arg => typeof arg === 'string' && arg.includes('WindWalker'))) {
      console.warn('🎯 WindWalker Log:', ...args);
    }
    originalLog.apply(console, args);
  };
};

// 실행
testWebViewCommunication();
monitorExtensionLogs();
```

## 📱 모바일/원격 접근 방법

Firebase Studio 환경에서 외부 접근을 위한 터널링:

```bash
# ngrok을 통한 외부 접근 (설치되어 있다면)
ngrok http 8082

# 또는 간단한 SSH 터널링
ssh -R 8082:localhost:8082 user@remote-server
```

## 🎯 테스트 결과 수집 및 분석

```bash
# 테스트 결과 종합 스크립트
cat > collect-test-results.sh << 'EOF'
#!/bin/bash

echo "WindWalker Phase 1 테스트 결과 수집"
echo "================================="

RESULTS_DIR="./test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

# 1. Playwright 결과 복사
if [ -d "playwright-report" ]; then
    cp -r playwright-report "$RESULTS_DIR/"
    echo "✅ Playwright HTML 리포트 수집됨"
fi

# 2. 수동 테스트 체크리스트 복사
if [ -f "manual-test-checklist.md" ]; then
    cp manual-test-checklist.md "$RESULTS_DIR/"
    echo "✅ 수동 테스트 체크리스트 수집됨"
fi

# 3. 시스템 로그 수집
echo "시스템 정보 및 로그 수집 중..."
{
    echo "# 시스템 정보"
    echo "날짜: $(date)"
    echo "Node.js: $(node --version)"
    echo "npm: $(npm --version)"
    echo ""
    
    echo "# Code Server 프로세스"
    ps aux | grep code-server || echo "Code Server 프로세스 없음"
    echo ""
    
    echo "# 포트 사용 현황"  
    netstat -tlnp | grep -E ':(8082|8090|8091)' || echo "관련 포트 사용 없음"
    
} > "$RESULTS_DIR/system-info.txt"

# 4. 확장 상태 확인
if [ -d "/home/user/.local/share/code-server/extensions" ]; then
    ls -la /home/user/.local/share/code-server/extensions > "$RESULTS_DIR/extensions-list.txt"
    echo "✅ 확장 목록 수집됨"
fi

echo ""
echo "📊 테스트 결과가 다음 디렉토리에 수집되었습니다:"
echo "   $RESULTS_DIR"
echo ""
echo "📁 포함된 파일들:"
ls -la "$RESULTS_DIR"

EOF

chmod +x collect-test-results.sh
```

이제 다음 명령어로 Phase 1 테스트를 종합적으로 수행할 수 있습니다:

```bash
# 1. 자동 테스트 (가능한 범위에서)
./windwalker-test-suite.sh test semi-auto

# 2. 수동 테스트 준비
./collect-test-results.sh

# 3. 브라우저 UI 테스트
./windwalker-test-suite.sh ui
```

Firebase 환경의 제약에도 불구하고 이 방법들을 통해 Phase 1의 완전한 검증이 가능합니다! 🎯