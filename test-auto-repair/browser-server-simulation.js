#!/usr/bin/env node
/**
 * Firebase Studio에서 Docker 없이 브라우저 서버 시뮬레이션
 * 실제 시스템 Chromium을 사용하되, API 서버 형태로 래핑
 */

const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');

class BrowserServerSimulation {
  constructor(port = 8090) {
    this.port = port;
    this.chromiumPath = '/google/idx/builtins/bin/chromium';
    this.server = null;
    this.wsServer = null;
    this.browsers = new Map();
  }

  async start() {
    console.log('🎭 브라우저 서버 시뮬레이션 시작...');
    
    // HTTP API 서버
    this.server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      
      if (req.method === 'POST' && req.url === '/launch') {
        this.handleLaunchBrowser(req, res);
      } else if (req.method === 'GET' && req.url === '/status') {
        res.end(JSON.stringify({ 
          status: 'running', 
          browsers: this.browsers.size,
          chromiumPath: this.chromiumPath
        }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    // WebSocket 서버
    this.wsServer = new WebSocket.Server({ 
      server: this.server,
      path: '/ws' 
    });

    this.wsServer.on('connection', (ws) => {
      console.log('🔌 WebSocket 클라이언트 연결됨');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: error.message 
          }));
        }
      });
    });

    this.server.listen(this.port, () => {
      console.log(`🚀 브라우저 서버가 포트 ${this.port}에서 실행 중`);
      console.log(`HTTP: http://localhost:${this.port}`);
      console.log(`WebSocket: ws://localhost:${this.port}/ws`);
    });
  }

  async handleLaunchBrowser(req, res) {
    try {
      console.log('🌐 Chromium 브라우저 시작 시도...');
      
      // Chromium 실행 시도 (headless)
      const browser = spawn(this.chromiumPath, [
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--single-process',
        '--remote-debugging-port=9222',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DISPLAY: ':99', // 가상 디스플레이
          CHROME_DEVEL_SANDBOX: '/dev/null'
        }
      });

      const browserId = Date.now().toString();
      this.browsers.set(browserId, browser);

      // 브라우저 출력 모니터링
      browser.stdout.on('data', (data) => {
        console.log(`[Browser ${browserId}] ${data.toString()}`);
      });

      browser.stderr.on('data', (data) => {
        console.error(`[Browser ${browserId} Error] ${data.toString()}`);
      });

      browser.on('close', (code) => {
        console.log(`[Browser ${browserId}] 종료됨 (code: ${code})`);
        this.browsers.delete(browserId);
      });

      browser.on('error', (error) => {
        console.error(`[Browser ${browserId}] 실행 오류:`, error);
        res.statusCode = 500;
        res.end(JSON.stringify({ 
          error: 'Browser launch failed', 
          details: error.message 
        }));
        return;
      });

      // 성공 응답
      setTimeout(() => {
        res.end(JSON.stringify({
          browserId,
          debuggingPort: 9222,
          wsEndpoint: `ws://localhost:9222/devtools/browser/${browserId}`,
          status: 'launched'
        }));
      }, 2000);

    } catch (error) {
      console.error('브라우저 시작 실패:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: 'Launch failed', 
        details: error.message 
      }));
    }
  }

  handleWebSocketMessage(ws, message) {
    console.log('📨 WebSocket 메시지:', message);
    
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
        
      case 'browser_command':
        // 브라우저 명령 처리
        ws.send(JSON.stringify({ 
          type: 'command_result', 
          success: true,
          result: 'Command executed (simulated)'
        }));
        break;
        
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  async stop() {
    console.log('🛑 브라우저 서버 중지 중...');
    
    // 모든 브라우저 프로세스 종료
    for (const [id, browser] of this.browsers) {
      console.log(`브라우저 ${id} 종료 중...`);
      browser.kill('SIGTERM');
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.server) {
      this.server.close();
    }
  }
}

// 직접 실행 시 서버 시작
if (require.main === module) {
  const server = new BrowserServerSimulation();
  
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
  
  server.start().catch(console.error);
}

module.exports = BrowserServerSimulation;