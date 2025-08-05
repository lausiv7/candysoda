#!/bin/bash

echo "🧪 WindWalker 테스트 오토 리페어 루프 시작..."

# 현재 디렉토리를 test-auto-repair로 변경
cd "$(dirname "$0")"

# Node.js 및 npm 버전 확인
echo "📋 환경 정보:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "현재 디렉토리: $(pwd)"

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
    echo "🎭 Playwright 브라우저 설치 중..."
    npx playwright install chromium
fi

# Playwright 설치 확인
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright가 설치되지 않았습니다."
    exit 1
fi

# Code Server 실행 상태 확인
echo "🔍 Code Server 상태 확인..."
if ! pgrep -f "code-server" > /dev/null; then
    echo "⚠️  Code Server가 실행되지 않았습니다. 시작합니다..."
    cd ..
    ./start-windwalker.sh &
    cd test-auto-repair
    echo "⏳ Code Server 시작 대기 중..."
    sleep 15
fi

# 포트 8082 접근 가능 여부 확인
if ! curl -s http://localhost:8082 > /dev/null; then
    echo "❌ Code Server (포트 8082)에 접근할 수 없습니다."
    echo "💡 start-windwalker.sh 스크립트를 먼저 실행해주세요."
    exit 1
fi

echo "✅ Code Server 실행 중 (포트 8082)"

# 테스트 오토 리페어 루프 실행
echo "🔄 테스트 오토 리페어 루프 시작..."
node auto-repair-loop.js

# 결과 확인
if [ $? -eq 0 ]; then
    echo "🎉 테스트 오토 리페어 루프 성공 완료!"
    
    # 리포트 파일이 있으면 요약 표시
    if [ -f "auto-repair-report.json" ]; then
        echo "📊 테스트 결과 요약:"
        echo "   - 리포트 파일: auto-repair-report.json"
        echo "   - Playwright 리포트: playwright-report/"
    fi
else
    echo "❌ 테스트 오토 리페어 루프 실패"
    echo "📋 로그 및 리포트를 확인하여 문제를 진단하세요."
    exit 1
fi