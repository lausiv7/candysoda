#!/bin/bash

# [의도] Sweet Puzzle 프로젝트 개발 환경을 자동으로 설정하는 스크립트
# [책임] Docker 환경 구축, 의존성 설치, 초기 설정 완료

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 프로젝트 루트 확인
if [[ ! -f "CLAUDE.md" ]]; then
    log_error "CLAUDE.md 파일을 찾을 수 없습니다. docs02/app/ 디렉토리에서 실행해주세요."
    exit 1
fi

log_info "🍭 Sweet Puzzle 개발 환경 설정을 시작합니다..."

# 1. 시스템 요구사항 확인
log_info "📋 시스템 요구사항 확인 중..."

# Node.js 확인
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되지 않았습니다. Node.js 18+ 버전을 설치해주세요."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 버전이 너무 낮습니다. (현재: v$NODE_VERSION, 필요: v18+)"
    exit 1
fi

log_success "Node.js $(node -v) 확인 완료"

# Docker 확인
if ! command -v docker &> /dev/null; then
    log_warning "Docker가 설치되지 않았습니다. 로컬 개발 모드로 진행합니다."
    DOCKER_AVAILABLE=false
else
    log_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) 확인 완료"
    DOCKER_AVAILABLE=true
fi

# 2. 프로젝트 의존성 설치
log_info "📦 프로젝트 의존성 설치 중..."

# package.json 생성
cat > dev-environment/package.json << 'EOF'
{
  "name": "sweet-puzzle-dev",
  "version": "1.0.0",
  "description": "Sweet Puzzle 캔디 크러시 스타일 퍼즐 게임 개발 환경",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "build": "webpack --mode=production"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "nodemon": "^3.0.2",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1"
  },
  "keywords": ["puzzle-game", "candy-crush", "match-3", "mobile-game"],
  "author": "Sweet Puzzle Team",
  "license": "MIT"
}
EOF

# npm 설치
cd dev-environment
if [ -f "package.json" ]; then
    log_info "📦 npm 패키지 설치 중..."
    npm install
    log_success "npm 패키지 설치 완료"
fi
cd ..

# 3. Docker 환경 설정 (사용 가능한 경우)
if [ "$DOCKER_AVAILABLE" = true ]; then
    log_info "🐳 Docker 개발 환경 설정 중..."
    
    # docker-compose.yml 생성
    cat > dev-environment/docker-compose.yml << 'EOF'
version: '3.8'

services:
  sweet-puzzle-dev:
    build: .
    container_name: sweet-puzzle-game
    ports:
      - "3000:3000"      # 게임 서버
      - "8080:8080"      # 개발 도구
    volumes:
      - ../src:/app/src
      - ../test-setup:/app/tests
      - ../reports:/app/reports
    environment:
      - NODE_ENV=development
      - PORT=3000
      - GAME_MODE=development
    command: npm run dev
    networks:
      - sweet-puzzle-network

  nginx-proxy:
    image: nginx:alpine
    container_name: sweet-puzzle-proxy
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - sweet-puzzle-dev
    networks:
      - sweet-puzzle-network

networks:
  sweet-puzzle-network:
    driver: bridge
EOF

    # Dockerfile 생성
    cat > dev-environment/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000 8080

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 개발 서버 시작
CMD ["npm", "run", "dev"]
EOF

    # Nginx 설정
    cat > dev-environment/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream sweet_puzzle_app {
        server sweet-puzzle-dev:3000;
    }

    server {
        listen 80;
        server_name localhost;

        # 정적 파일 서빙
        location /static/ {
            alias /app/src/assets/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API 프록시
        location /api/ {
            proxy_pass http://sweet_puzzle_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # 메인 애플리케이션
        location / {
            proxy_pass http://sweet_puzzle_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # WebSocket 지원
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF

    log_success "Docker 환경 설정 완료"
fi

# 4. 개발 서버 설정
log_info "🚀 개발 서버 설정 중..."

cat > dev-environment/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src')));

// API 라우트
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        game: 'Sweet Puzzle'
    });
});

app.get('/api/game/config', (req, res) => {
    res.json({
        gameTitle: 'Sweet Puzzle',
        version: '1.0.0',
        maxLevel: 500,
        boardSize: { width: 8, height: 8 },
        candyTypes: ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
    });
});

// 메인 게임 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`🍭 Sweet Puzzle 개발 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`🌐 게임 URL: http://localhost:${PORT}`);
    console.log(`💻 API 헬스체크: http://localhost:${PORT}/api/health`);
});
EOF

log_success "개발 서버 설정 완료"

# 5. 기본 게임 파일 생성
log_info "🎮 기본 게임 파일 생성 중..."

# HTML 메인 파일
cat > src/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Puzzle - 캔디 크러시 스타일 퍼즐 게임</title>
    <link rel="stylesheet" href="css/game.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#FF6B6B">
</head>
<body>
    <div id="game-container">
        <header class="game-header">
            <h1>🍭 Sweet Puzzle</h1>
            <div class="score-display">
                <span>점수: <span id="score">0</span></span>
                <span>레벨: <span id="level">1</span></span>
            </div>
        </header>
        
        <main class="game-main">
            <div id="game-board" class="game-board">
                <!-- 퍼즐 게임 보드가 여기에 동적으로 생성됩니다 -->
            </div>
            
            <div class="game-ui">
                <button id="start-game" class="btn btn-primary">게임 시작</button>
                <button id="pause-game" class="btn btn-secondary">일시정지</button>
                <button id="reset-game" class="btn btn-warning">다시시작</button>
            </div>
        </main>
        
        <footer class="game-footer">
            <p>🤖 Sweet Puzzle v1.0.0 - Claude Code로 개발됨</p>
        </footer>
    </div>
    
    <script src="js/game-engine.js"></script>
    <script src="js/puzzle-logic.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
EOF

# CSS 스타일
mkdir -p src/css
cat > src/css/game.css << 'EOF'
/* Sweet Puzzle 게임 스타일 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

#game-container {
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    padding: 20px;
    max-width: 500px;
    width: 90%;
}

.game-header {
    text-align: center;
    margin-bottom: 20px;
}

.game-header h1 {
    color: #FF6B6B;
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.score-display {
    display: flex;
    justify-content: space-around;
    background: #f8f9fa;
    padding: 10px;
    border-radius: 10px;
    font-weight: bold;
    color: #495057;
}

.game-board {
    width: 400px;
    height: 400px;
    margin: 20px auto;
    border: 3px solid #FF6B6B;
    border-radius: 15px;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    gap: 2px;
    background: #f8f9fa;
    padding: 10px;
}

.candy {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.candy:hover {
    transform: scale(1.1);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.candy.red { background: #FF6B6B; }
.candy.blue { background: #4ECDC4; }
.candy.green { background: #45B7D1; }
.candy.yellow { background: #FFA07A; }
.candy.purple { background: #98D8C8; }
.candy.orange { background: #FFB347; }

.game-ui {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin: 20px 0;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 25px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background: #FF6B6B;
    color: white;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-warning {
    background: #ffc107;
    color: #212529;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.game-footer {
    text-align: center;
    color: #6c757d;
    font-size: 0.9rem;
}

/* 반응형 디자인 */
@media (max-width: 600px) {
    .game-board {
        width: 300px;
        height: 300px;
    }
    
    .game-header h1 {
        font-size: 2rem;
    }
    
    .candy {
        font-size: 1.2rem;
    }
}
EOF

# JavaScript 기본 구조
mkdir -p src/js
cat > src/js/main.js << 'EOF'
// [의도] Sweet Puzzle 게임의 메인 실행 로직
// [책임] 게임 초기화, 이벤트 리스너 설정, 게임 루프 관리

document.addEventListener('DOMContentLoaded', function() {
    console.log('🍭 Sweet Puzzle 게임 로딩 중...');
    
    // 게임 상태
    let gameState = {
        score: 0,
        level: 1,
        isPlaying: false,
        board: null
    };
    
    // DOM 요소 참조
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const startBtn = document.getElementById('start-game');
    const pauseBtn = document.getElementById('pause-game');
    const resetBtn = document.getElementById('reset-game');
    
    // 이벤트 리스너 설정
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', pauseGame);
    resetBtn.addEventListener('click', resetGame);
    
    // 게임 시작
    function startGame() {
        console.log('게임 시작!');
        gameState.isPlaying = true;
        initializeBoard();
        updateUI();
    }
    
    // 게임 일시정지
    function pauseGame() {
        console.log('게임 일시정지');
        gameState.isPlaying = !gameState.isPlaying;
    }
    
    // 게임 리셋
    function resetGame() {
        console.log('게임 리셋');
        gameState = { score: 0, level: 1, isPlaying: false, board: null };
        updateUI();
        clearBoard();
    }
    
    // 보드 초기화
    function initializeBoard() {
        clearBoard();
        
        // 8x8 그리드 생성
        for (let i = 0; i < 64; i++) {
            const candy = document.createElement('div');
            candy.className = 'candy';
            candy.dataset.index = i;
            
            // 랜덤 캔디 타입 할당
            const candyTypes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
            const randomType = candyTypes[Math.floor(Math.random() * candyTypes.length)];
            candy.classList.add(randomType);
            candy.textContent = getCandyEmoji(randomType);
            
            // 클릭 이벤트 추가
            candy.addEventListener('click', () => handleCandyClick(candy));
            
            gameBoard.appendChild(candy);
        }
    }
    
    // 보드 클리어
    function clearBoard() {
        gameBoard.innerHTML = '';
    }
    
    // 캔디 클릭 처리
    function handleCandyClick(candy) {
        if (!gameState.isPlaying) return;
        
        console.log('캔디 클릭:', candy.dataset.index);
        // TODO: 3매치 로직 구현
    }
    
    // 캔디 이모지 반환
    function getCandyEmoji(type) {
        const emojis = {
            red: '🍎',
            blue: '🍇',
            green: '🥝',
            yellow: '🍌',
            purple: '🍆',
            orange: '🧡'
        };
        return emojis[type] || '🍬';
    }
    
    // UI 업데이트
    function updateUI() {
        scoreElement.textContent = gameState.score;
        levelElement.textContent = gameState.level;
    }
    
    // 초기 UI 설정
    updateUI();
    
    console.log('✅ Sweet Puzzle 게임 초기화 완료');
});
EOF

log_success "기본 게임 파일 생성 완료"

# 6. 최종 검증
log_info "🔍 설정 검증 중..."

# 필수 파일 존재 확인
REQUIRED_FILES=(
    "CLAUDE.md"
    "develop-guide.md"
    "dev-environment/package.json"
    "dev-environment/server.js"
    "src/index.html"
    "src/css/game.css"
    "src/js/main.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "✓ $file"
    else
        log_error "✗ $file (누락)"
    fi
done

# 7. 설정 완료 메시지
echo ""
log_success "🎉 Sweet Puzzle 개발 환경 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 개발 서버 시작: ./start-puzzle-system-dev.sh"
echo "2. 테스트 환경 활성화: ./enable-test-repair-loop.sh"
echo "3. 개발 모니터링: ./monitor-game-development.sh"
echo ""
echo "개발 서버 URL: http://localhost:3000"
echo "API 헬스체크: http://localhost:3000/api/health"
echo ""
log_info "Happy coding! 🍭✨"