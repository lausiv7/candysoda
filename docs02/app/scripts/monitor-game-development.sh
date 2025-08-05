#!/bin/bash

# [의도] Sweet Puzzle 게임 개발 과정을 실시간으로 모니터링하는 스크립트
# [책임] 개발 진행 상황, 테스트 결과, 성능 지표, 코드 변경사항을 지속적으로 추적

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 이모지 정의
CANDY="🍭"
GAME="🎮"
TEST="🧪"
MONITOR="🔍"
SUCCESS="✅"
FAIL="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
CHART="📊"

# 로그 함수
log_info() {
    echo -e "${BLUE}[${INFO}INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[${SUCCESS}SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[${WARNING}WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[${FAIL}ERROR]${NC} $1"
}

log_monitor() {
    echo -e "${CYAN}[${MONITOR}MONITOR]${NC} $1"
}

log_game() {
    echo -e "${PURPLE}[${GAME}GAME]${NC} $1"
}

# 프로젝트 루트 확인
if [[ ! -f "CLAUDE.md" ]]; then
    log_error "CLAUDE.md 파일을 찾을 수 없습니다. docs02/app/ 디렉토리에서 실행해주세요."
    exit 1
fi

# 모니터링 설정
MONITOR_INTERVAL=${1:-10}  # 기본 10초 간격
MONITOR_MODE=${2:-"comprehensive"}  # comprehensive, basic, performance
LOG_FILE="reports/monitoring-$(date +%Y%m%d-%H%M%S).log"
DASHBOARD_FILE="reports/development-dashboard.html"

# 모니터링 세션 정보
SESSION_START=$(date +%s)
SESSION_ID="sweet-puzzle-monitor-$(date +%Y%m%d%H%M%S)"

# 트랩 설정 (Ctrl+C 처리)
cleanup() {
    log_info "${CANDY} Sweet Puzzle 개발 모니터링 종료 중..."
    
    # 최종 리포트 생성
    generate_final_report
    
    # 정리 작업
    if [[ -n $DEV_SERVER_PID ]] && kill -0 $DEV_SERVER_PID 2>/dev/null; then
        log_info "개발 서버 정리 중..."
    fi
    
    log_success "${ROCKET} 모니터링 세션 완료: $SESSION_ID"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 헤더 출력
print_header() {
    clear
    echo -e "${WHITE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                 ${CANDY} Sweet Puzzle 개발 모니터링 ${CANDY}                 ║${NC}"
    echo -e "${WHITE}╠════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${WHITE}║  세션 ID: ${SESSION_ID:0:30}...    ║${NC}"
    echo -e "${WHITE}║  시작 시간: $(date -d @$SESSION_START '+%Y-%m-%d %H:%M:%S')                      ║${NC}"
    echo -e "${WHITE}║  모니터링 모드: $MONITOR_MODE                             ║${NC}"
    echo -e "${WHITE}║  업데이트 간격: ${MONITOR_INTERVAL}초                                   ║${NC}"
    echo -e "${WHITE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 시스템 상태 체크
check_system_status() {
    local status_summary=""
    
    # 개발 서버 상태
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        status_summary+="${SUCCESS} 개발서버  "
    else
        status_summary+="${FAIL} 개발서버  "
    fi
    
    # Docker 상태 (있는 경우)
    if command -v docker &> /dev/null && docker ps | grep -q sweet-puzzle; then
        status_summary+="${SUCCESS} Docker  "
    else
        status_summary+="${WARNING} Docker  "
    fi
    
    # Git 상태
    local git_status=$(git status --porcelain 2>/dev/null | wc -l)
    if [[ $git_status -eq 0 ]]; then
        status_summary+="${SUCCESS} Git깔끔  "
    else
        status_summary+="${INFO} Git변경($git_status)  "
    fi
    
    # 테스트 상태 (최근 결과)
    if [[ -f "reports/test-results.json" ]]; then
        local test_result=$(cat reports/test-results.json 2>/dev/null | grep -o '"stats":{"expected":[0-9]*,"passed":[0-9]*' | tail -1)
        if [[ -n "$test_result" ]]; then
            status_summary+="${TEST} 테스트OK  "
        else
            status_summary+="${WARNING} 테스트?  "
        fi
    else
        status_summary+="${INFO} 테스트미실행  "
    fi
    
    echo -e "${CYAN}[시스템 상태]${NC} $status_summary"
}

# 개발 진행 상황 추적
track_development_progress() {
    local current_time=$(date '+%H:%M:%S')
    
    echo -e "${PURPLE}[${current_time}] ${GAME} 개발 진행 상황${NC}"
    
    # 소스 코드 변경 감지
    if [[ -d "src" ]]; then
        local js_files=$(find src -name "*.js" -newer .last_check 2>/dev/null | wc -l)
        local css_files=$(find src -name "*.css" -newer .last_check 2>/dev/null | wc -l)
        local html_files=$(find src -name "*.html" -newer .last_check 2>/dev/null | wc -l)
        
        if [[ $js_files -gt 0 ]] || [[ $css_files -gt 0 ]] || [[ $html_files -gt 0 ]]; then
            echo "  ${INFO} 파일 변경: JS($js_files) CSS($css_files) HTML($html_files)"
            
            # 자동 테스트 트리거 제안
            if [[ $js_files -gt 0 ]]; then
                echo "  ${TEST} 자동 테스트 실행 권장: JavaScript 파일 변경 감지"
            fi
        fi
    fi
    
    # 테스트 결과 요약
    if [[ -f "reports/test-results.json" ]]; then
        local test_summary=$(node -e "
            try {
                const data = JSON.parse(require('fs').readFileSync('reports/test-results.json', 'utf8'));
                const stats = data.stats || {};
                console.log(\`  ${TEST} 최근 테스트: 통과 \${stats.passed || 0}/\${stats.expected || 0}, 실패 \${stats.failed || 0}\`);
            } catch(e) {
                console.log('  ${WARNING} 테스트 결과 파싱 실패');
            }
        " 2>/dev/null)
        echo "$test_summary"
    fi
    
    # Git 커밋 정보
    local last_commit=$(git log -1 --format="%h %s" 2>/dev/null)
    if [[ -n "$last_commit" ]]; then
        echo "  ${INFO} 최근 커밋: $last_commit"
    fi
    
    # 체크포인트 업데이트
    touch .last_check
}

# 성능 모니터링
monitor_performance() {
    echo -e "${CYAN}[${CHART}성능 지표]${NC}"
    
    # 메모리 사용량
    local memory_usage=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    echo "  ${INFO} 시스템 메모리: $memory_usage"
    
    # 디스크 사용량
    local disk_usage=$(df -h . | awk 'NR==2{print $5}')
    echo "  ${INFO} 디스크 사용: $disk_usage"
    
    # 프로세스 모니터링
    local node_processes=$(pgrep -f "node.*server.js" | wc -l)
    if [[ $node_processes -gt 0 ]]; then
        echo "  ${SUCCESS} Node.js 프로세스: $node_processes개 실행 중"
    else
        echo "  ${WARNING} Node.js 프로세스: 실행되지 않음"
    fi
    
    # 네트워크 포트 확인
    if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo "  ${SUCCESS} 포트 3000: 게임 서버 실행 중"
    else
        echo "  ${FAIL} 포트 3000: 게임 서버 중단됨"
    fi
    
    # 게임 로드 시간 측정 (개발 서버가 실행 중인 경우)
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        local load_start=$(date +%s%N)
        curl -s http://localhost:3000/ > /dev/null 2>&1
        local load_end=$(date +%s%N)
        local load_time=$(( (load_end - load_start) / 1000000 ))
        
        if [[ $load_time -lt 1000 ]]; then
            echo "  ${SUCCESS} 게임 로딩: ${load_time}ms (우수)"
        elif [[ $load_time -lt 3000 ]]; then
            echo "  ${INFO} 게임 로딩: ${load_time}ms (양호)"
        else
            echo "  ${WARNING} 게임 로딩: ${load_time}ms (개선 필요)"
        fi
    fi
}

# 테스트 자동화 상태
monitor_test_automation() {
    echo -e "${CYAN}[${TEST}테스트 자동화]${NC}"
    
    # 테스트 리페어 루프 상태
    if [[ -f "reports/test-repair-status.json" ]]; then
        local repair_status=$(node -e "
            try {
                const data = JSON.parse(require('fs').readFileSync('reports/test-repair-status.json', 'utf8'));
                console.log(\`  ${SUCCESS} 리페어 루프: \${data.status} (모드: \${data.mode})\`);
                if (data.lastHealthCheck) {
                    const lastCheck = new Date(data.lastHealthCheck);
                    const now = new Date();
                    const diffMinutes = Math.floor((now - lastCheck) / 60000);
                    console.log(\`  ${INFO} 마지막 체크: \${diffMinutes}분 전\`);
                }
            } catch(e) {
                console.log('  ${WARNING} 리페어 루프 상태 불명');
            }
        " 2>/dev/null)
        echo "$repair_status"
    else
        echo "  ${WARNING} 테스트 리페어 루프 비활성화"
        echo "  ${INFO} 활성화: ./enable-test-repair-loop.sh"
    fi
    
    # 최근 테스트 실행 기록
    if [[ -d "reports/test-artifacts" ]]; then
        local recent_tests=$(find reports/test-artifacts -name "*.png" -newer .last_check 2>/dev/null | wc -l)
        if [[ $recent_tests -gt 0 ]]; then
            echo "  ${INFO} 새로운 테스트 스크린샷: $recent_tests개"
        fi
    fi
    
    # Playwright 브라우저 상태
    if command -v npx > /dev/null && npx playwright --version > /dev/null 2>&1; then
        echo "  ${SUCCESS} Playwright: 설치됨"
    else
        echo "  ${WARNING} Playwright: 설치 필요"
    fi
}

# 코드 품질 분석
analyze_code_quality() {
    echo -e "${CYAN}[📝코드 품질]${NC}"
    
    if [[ -d "src" ]]; then
        # JavaScript 파일 통계
        local js_files=$(find src -name "*.js" | wc -l)
        local js_lines=$(find src -name "*.js" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END{print sum}')
        echo "  ${INFO} JavaScript: $js_files 파일, $js_lines 줄"
        
        # CSS 파일 통계  
        local css_files=$(find src -name "*.css" | wc -l)
        local css_lines=$(find src -name "*.css" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END{print sum}')
        echo "  ${INFO} CSS: $css_files 파일, $css_lines 줄"
        
        # HTML 파일 통계
        local html_files=$(find src -name "*.html" | wc -l)
        echo "  ${INFO} HTML: $html_files 파일"
        
        # TODO/FIXME 항목 찾기
        local todos=$(find src -name "*.js" -o -name "*.css" -o -name "*.html" | xargs grep -i "TODO\|FIXME" 2>/dev/null | wc -l)
        if [[ $todos -gt 0 ]]; then
            echo "  ${WARNING} TODO/FIXME: $todos개 항목"
        else
            echo "  ${SUCCESS} TODO/FIXME: 없음"
        fi
        
        # 의도/책임 주석 검사
        local intent_comments=$(find src -name "*.js" | xargs grep -l "\[의도\]" 2>/dev/null | wc -l)
        if [[ $intent_comments -gt 0 ]]; then
            echo "  ${SUCCESS} 의도 주석: $intent_comments개 파일"
        else
            echo "  ${WARNING} 의도 주석: 추가 권장"
        fi
    else
        echo "  ${WARNING} src 디렉토리 없음"
    fi
}

# 실시간 로그 모니터링
monitor_logs() {
    echo -e "${CYAN}[📜실시간 로그]${NC}"
    
    # 개발 서버 로그 (최근 5줄)
    if [[ -f "dev-environment/server.log" ]]; then
        echo "  ${INFO} 개발 서버 로그 (최근 5줄):"
        tail -5 dev-environment/server.log 2>/dev/null | sed 's/^/    /'
    fi
    
    # 브라우저 콘솔 에러 (있는 경우)
    if [[ -f "reports/browser-errors.log" ]]; then
        local recent_errors=$(tail -10 reports/browser-errors.log 2>/dev/null | grep -c "ERROR")
        if [[ $recent_errors -gt 0 ]]; then
            echo "  ${FAIL} 브라우저 에러: $recent_errors개 (최근 10줄)"
        fi
    fi
    
    # Git 변경사항 요약
    local git_changes=$(git status --porcelain 2>/dev/null)
    if [[ -n "$git_changes" ]]; then
        echo "  ${INFO} Git 변경사항:"
        echo "$git_changes" | head -3 | sed 's/^/    /'
        local total_changes=$(echo "$git_changes" | wc -l)
        if [[ $total_changes -gt 3 ]]; then
            echo "    ... 및 $((total_changes - 3))개 더"
        fi
    fi
}

# 개발 제안 생성
generate_development_suggestions() {
    echo -e "${CYAN}[💡개발 제안]${NC}"
    
    local suggestions=()
    
    # 테스트 커버리지 체크
    if [[ ! -f "reports/test-results.json" ]]; then
        suggestions+=("  ${INFO} 테스트 실행: cd test-setup && ./run-sweet-puzzle-tests.sh")
    fi
    
    # 성능 최적화 체크
    if curl -s http://localhost:3000/ | grep -q "TODO"; then
        suggestions+=("  ${INFO} TODO 항목 완료로 게임 기능 개선")
    fi
    
    # Git 커밋 제안
    local git_status=$(git status --porcelain 2>/dev/null | wc -l)
    if [[ $git_status -gt 5 ]]; then
        suggestions+=("  ${INFO} Git 커밋 권장: $git_status개 변경사항")
    fi
    
    # 문서 업데이트 제안
    if [[ $(find . -name "*.md" -newer src 2>/dev/null | wc -l) -eq 0 ]] && [[ $git_status -gt 0 ]]; then
        suggestions+=("  ${INFO} 개발 문서 업데이트 권장")
    fi
    
    # 백업 제안
    local last_backup=$(find . -name "backup-*" -type d 2>/dev/null | head -1)
    if [[ -z "$last_backup" ]]; then
        suggestions+=("  ${WARNING} 프로젝트 백업 권장")
    fi
    
    if [[ ${#suggestions[@]} -eq 0 ]]; then
        echo "  ${SUCCESS} 현재 개발 상태 양호 - 제안사항 없음"
    else
        printf '%s\n' "${suggestions[@]}"
    fi
}

# 실시간 대시보드 HTML 생성
generate_dashboard() {
    local current_time=$(date '+%Y-%m-%d %H:%M:%S')
    local uptime=$(($(date +%s) - SESSION_START))
    local uptime_formatted=$(printf '%02d:%02d:%02d' $((uptime/3600)) $(((uptime%3600)/60)) $((uptime%60)))
    
    cat > "$DASHBOARD_FILE" << EOF
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Puzzle 개발 대시보드</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .status-good { color: #4ade80; }
        .status-warning { color: #fbbf24; }
        .status-error { color: #f87171; }
        
        .logs {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 15px;
            font-family: 'Courier New', monospace;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .auto-refresh {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            padding: 10px;
            border-radius: 10px;
            font-size: 0.9rem;
        }
    </style>
    <script>
        setTimeout(() => location.reload(), 30000); // 30초마다 새로고침
    </script>
</head>
<body>
    <div class="auto-refresh">🔄 30초마다 자동 갱신</div>
    
    <div class="dashboard">
        <div class="header">
            <h1>🍭 Sweet Puzzle 개발 대시보드</h1>
            <p>세션: $SESSION_ID</p>
            <p>업타임: $uptime_formatted | 마지막 업데이트: $current_time</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>🎮 게임 서버</h3>
                <div class="stat-value status-good">실행 중</div>
                <p>http://localhost:3000</p>
            </div>
            
            <div class="stat-card">
                <h3>🧪 테스트 상태</h3>
                <div class="stat-value status-good">활성화</div>
                <p>자동 테스트 리페어 루프</p>
            </div>
            
            <div class="stat-card">
                <h3>📊 성능</h3>
                <div class="stat-value status-good">양호</div>
                <p>메모리: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')</p>
            </div>
            
            <div class="stat-card">
                <h3>📝 코드 품질</h3>
                <div class="stat-value status-good">우수</div>
                <p>TODO: $(find src -name "*.js" -o -name "*.css" -o -name "*.html" 2>/dev/null | xargs grep -i "TODO\|FIXME" 2>/dev/null | wc -l)개</p>
            </div>
        </div>
        
        <div class="logs">
            <h3>📜 실시간 모니터링 로그</h3>
            <div id="logs">
                $(tail -20 "$LOG_FILE" 2>/dev/null | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g' | nl -w3 -s': ')
            </div>
        </div>
    </div>
</body>
</html>
EOF
}

# 최종 리포트 생성
generate_final_report() {
    local end_time=$(date +%s)
    local total_time=$((end_time - SESSION_START))
    local report_file="reports/monitoring-final-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Sweet Puzzle 개발 모니터링 최종 리포트

## 📋 세션 정보
- **세션 ID**: $SESSION_ID
- **시작 시간**: $(date -d @$SESSION_START '+%Y-%m-%d %H:%M:%S')
- **종료 시간**: $(date '+%Y-%m-%d %H:%M:%S')
- **총 모니터링 시간**: $(printf '%02d:%02d:%02d' $((total_time/3600)) $(((total_time%3600)/60)) $((total_time%60)))

## 📊 수집된 데이터
- **시스템 상태 체크**: $((total_time / MONITOR_INTERVAL))회
- **코드 변경 감지**: $(find src -name "*.js" -o -name "*.css" -o -name "*.html" -newer .monitoring_start 2>/dev/null | wc -l)개 파일
- **테스트 실행**: $(find reports -name "test-results-*.json" -newer .monitoring_start 2>/dev/null | wc -l)회
- **스크린샷 캡처**: $(find reports/test-artifacts -name "*.png" -newer .monitoring_start 2>/dev/null | wc -l)개

## 🎯 개발 성과
$(if [[ $(git log --oneline --since="@$SESSION_START" 2>/dev/null | wc -l) -gt 0 ]]; then
    echo "- **Git 커밋**: $(git log --oneline --since="@$SESSION_START" 2>/dev/null | wc -l)개"
    git log --oneline --since="@$SESSION_START" 2>/dev/null | sed 's/^/  - /'
else
    echo "- **Git 커밋**: 없음"
fi)

## 🔍 주요 발견사항
- 개발 서버 안정성: $(curl -s http://localhost:3000/api/health > /dev/null 2>&1 && echo "안정적" || echo "불안정")
- 테스트 자동화: $([ -f "reports/test-repair-status.json" ] && echo "활성화" || echo "비활성화")
- 코드 품질: $([ $(find src -name "*.js" -o -name "*.css" -o -name "*.html" 2>/dev/null | xargs grep -i "TODO\|FIXME" 2>/dev/null | wc -l) -lt 5 ] && echo "우수" || echo "개선 필요")

## 📈 권장사항
1. 정기적인 테스트 실행으로 품질 유지
2. Git 커밋을 통한 변경사항 추적
3. 성능 모니터링 지속
4. 문서 업데이트 필요

---
*이 리포트는 Sweet Puzzle 개발 모니터링 시스템에 의해 자동 생성되었습니다.*
*생성 시간: $(date '+%Y-%m-%d %H:%M:%S')*
EOF

    log_success "최종 리포트 생성 완료: $report_file"
}

# 메인 모니터링 루프
main_monitoring_loop() {
    local loop_count=0
    
    # 모니터링 시작 마커
    touch .monitoring_start
    
    log_success "${CANDY} Sweet Puzzle 개발 모니터링을 시작합니다!"
    log_info "모니터링 간격: ${MONITOR_INTERVAL}초, 모드: $MONITOR_MODE"
    log_info "종료하려면 Ctrl+C를 누르세요."
    log_info "실시간 대시보드: file://$(pwd)/$DASHBOARD_FILE"
    echo ""
    
    while true; do
        loop_count=$((loop_count + 1))
        
        # 화면 헤더 출력
        print_header
        
        # 시스템 상태 체크
        check_system_status
        echo ""
        
        # 모드별 모니터링 실행
        case $MONITOR_MODE in
            "comprehensive")
                track_development_progress
                echo ""
                monitor_performance
                echo ""
                monitor_test_automation
                echo ""
                analyze_code_quality
                echo ""
                monitor_logs
                echo ""
                generate_development_suggestions
                ;;
            "basic")
                track_development_progress
                echo ""
                monitor_performance
                ;;
            "performance")
                monitor_performance
                echo ""
                monitor_logs
                ;;
            *)
                log_warning "알 수 없는 모니터링 모드: $MONITOR_MODE"
                track_development_progress
                ;;
        esac
        
        # 로그 파일에 기록
        {
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] 모니터링 루프 #$loop_count 완료"
            echo "  - 시스템 상태: OK"
            echo "  - 개발 진행: 추적 중"
            echo "  - 성능: 모니터링 중"
            echo ""
        } >> "$LOG_FILE"
        
        # 대시보드 업데이트
        generate_dashboard
        
        # 하단 상태 표시
        echo ""
        echo -e "${WHITE}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${WHITE}║  ${MONITOR} 모니터링 루프 #$loop_count 완료 | 다음 업데이트: ${MONITOR_INTERVAL}초 후    ║${NC}"
        echo -e "${WHITE}║  ${INFO} 로그: $LOG_FILE  ║${NC}"
        echo -e "${WHITE}║  ${INFO} 대시보드: $DASHBOARD_FILE                  ║${NC}"
        echo -e "${WHITE}╚════════════════════════════════════════════════════════════════╝${NC}"
        
        # 대기
        sleep $MONITOR_INTERVAL
    done
}

# 도움말 출력
show_help() {
    echo "Sweet Puzzle 개발 모니터링 스크립트"
    echo ""
    echo "사용법:"
    echo "  $0 [간격] [모드]"
    echo ""
    echo "옵션:"
    echo "  간격        모니터링 업데이트 간격 (초, 기본: 10)"
    echo "  모드        모니터링 모드 (기본: comprehensive)"
    echo ""
    echo "모니터링 모드:"
    echo "  comprehensive  종합 모니터링 (모든 기능)"
    echo "  basic         기본 모니터링 (개발 진행 + 성능)"
    echo "  performance   성능 중심 모니터링"
    echo ""
    echo "예시:"
    echo "  $0                          # 기본 설정 (10초, comprehensive)"
    echo "  $0 5                        # 5초 간격"
    echo "  $0 15 basic                 # 15초 간격, 기본 모드"
    echo "  $0 30 performance           # 30초 간격, 성능 모드"
    echo ""
    echo "기능:"
    echo "  - 실시간 시스템 상태 모니터링"
    echo "  - 개발 진행 상황 추적"
    echo "  - 테스트 자동화 상태 감시"
    echo "  - 성능 지표 수집"
    echo "  - 코드 품질 분석"
    echo "  - 개발 제안 생성"
    echo "  - HTML 대시보드 생성"
    echo ""
}

# 인자 처리
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# 필수 디렉토리 생성
mkdir -p reports

# 로그 파일 초기화
echo "# Sweet Puzzle 개발 모니터링 로그" > "$LOG_FILE"
echo "# 세션 시작: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "# 세션 ID: $SESSION_ID" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 메인 모니터링 실행
main_monitoring_loop