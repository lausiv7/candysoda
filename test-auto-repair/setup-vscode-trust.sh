#!/bin/bash

# VS Code Workspace Trust 설정 비활성화 스크립트

echo "🔧 VS Code Workspace Trust 설정 비활성화 중..."

# VS Code 설정 디렉토리
VSCODE_DIR="/home/pdy1453/.local/share/code-server/User"
SETTINGS_FILE="$VSCODE_DIR/settings.json"

# 디렉토리 생성
mkdir -p "$VSCODE_DIR"

# 기존 설정 백업
if [ -f "$SETTINGS_FILE" ]; then
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📋 기존 설정 백업 완료"
fi

# Trust 관련 설정 추가/수정
cat > "$SETTINGS_FILE" << 'EOF'
{
    "security.workspace.trust.enabled": false,
    "security.workspace.trust.startupPrompt": "never",
    "security.workspace.trust.banner": "never",
    "security.workspace.trust.emptyWindow": false,
    "extensions.autoUpdate": false,
    "extensions.autoCheckUpdates": false,
    "update.mode": "none",
    "telemetry.telemetryLevel": "off",
    "workbench.enableExperiments": false,
    "workbench.settings.enableNaturalLanguageSearch": false,
    "extensions.ignoreRecommendations": true,
    "window.confirmBeforeClose": "never",
    "files.hotExit": "off",
    "workbench.startupEditor": "none"
}
EOF

echo "✅ VS Code 설정 업데이트 완료: $SETTINGS_FILE"

# Workspace 설정도 추가
WORKSPACE_DIR="/home/pdy1453/studio"
WORKSPACE_SETTINGS_DIR="$WORKSPACE_DIR/.vscode"
WORKSPACE_SETTINGS_FILE="$WORKSPACE_SETTINGS_DIR/settings.json"

mkdir -p "$WORKSPACE_SETTINGS_DIR"

cat > "$WORKSPACE_SETTINGS_FILE" << 'EOF'
{
    "security.workspace.trust.enabled": false,
    "security.workspace.trust.startupPrompt": "never"
}
EOF

echo "✅ 워크스페이스 설정 업데이트 완료: $WORKSPACE_SETTINGS_FILE"

# Trust 파일 직접 생성 (워크스페이스를 미리 신뢰함)
TRUST_DB_DIR="/home/pdy1453/.local/share/code-server/User/workspaceStorage"
mkdir -p "$TRUST_DB_DIR"

# trusted-domains.json 생성
TRUSTED_DOMAINS_FILE="/home/pdy1453/.local/share/code-server/User/trusted-domains.json"
cat > "$TRUSTED_DOMAINS_FILE" << 'EOF'
[
    "localhost",
    "127.0.0.1",
    "0.0.0.0"
]
EOF

echo "✅ 신뢰할 도메인 설정 완료: $TRUSTED_DOMAINS_FILE"

echo "🎉 VS Code Trust 설정 비활성화 완료!"
echo "   - Workspace Trust: 비활성화"
echo "   - 시작 프롬프트: 비활성화"  
echo "   - 자동 업데이트: 비활성화"
echo "   - 텔레메트리: 비활성화"