#!/bin/bash
# Firebase/Nix 환경에서 Playwright 브라우저 실행을 위한 라이브러리 경로 설정

echo "🔧 Nix 환경 브라우저 의존성 해결 스크립트"

# 필요한 라이브러리 경로들 수집
GLIB_PATH="/nix/store/3c275grvmby79gqgnjych830sld6bziw-glib-2.80.2/lib"
NSS_PATH="/nix/store/03h8f1wmpb86s9v8xd0lcb7jnp7nwm6l-idx-env-fhs/usr/lib"

# X11 라이브러리 경로 찾기
X11_PATHS=$(find /nix/store -name "*libX11*" -type d 2>/dev/null | grep "/lib$" | head -3)

# 모든 라이브러리 경로 조합
LIBRARY_PATHS="$GLIB_PATH:$NSS_PATH"
for path in $X11_PATHS; do
    LIBRARY_PATHS="$LIBRARY_PATHS:$path"
done

echo "📚 설정된 라이브러리 경로:"
echo "$LIBRARY_PATHS" | tr ':' '\n'

# 환경변수 설정 및 Playwright 테스트 실행
export LD_LIBRARY_PATH="$LIBRARY_PATHS:$LD_LIBRARY_PATH"
export PLAYWRIGHT_BROWSERS_PATH=/home/user/studio/test-auto-repair/browsers

echo "🚀 라이브러리 경로 설정 완료, Playwright 테스트 실행..."
npx playwright test --project=chromium "$@"