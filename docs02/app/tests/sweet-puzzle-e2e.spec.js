// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Sweet Puzzle Phase 1 E2E Test Suite
 * 캔디소다 퍼즐 시스템의 모든 핵심 기능을 검증합니다.
 */

test.describe('Sweet Puzzle Phase 1 - Core Systems', () => {
  
  test.beforeEach(async ({ page }) => {
    // 게임 페이지로 이동
    await page.goto('/');
    
    // 페이지 로드 완료 대기
    await page.waitForLoadState('networkidle');
    
    // 게임 초기화 완료 대기
    await page.waitForFunction(() => window.game && window.game.gameState === 'player_turn');
    
    // 초기 상태 스크린샷
    await page.screenshot({ 
      path: 'test-results/screenshots/00-initial-state.png',
      fullPage: true 
    });
  });

  test.describe('1. 게임 초기화 및 UI 테스트', () => {
    
    test('1.1 게임 페이지 로드 및 초기 상태 확인', async ({ page }) => {
      // 제목 확인
      await expect(page.locator('h1')).toContainText('Sweet Puzzle');
      
      // 게임 보드 존재 확인
      const gameBoard = page.locator('#game-board');
      await expect(gameBoard).toBeVisible();
      
      // 초기 점수 및 이동 수 확인
      await expect(page.locator('#score')).toContainText('0');
      await expect(page.locator('#moves')).toContainText('0');
      
      // 스크린샷 캡처
      await page.screenshot({ 
        path: 'test-results/screenshots/01-1-game-loaded.png' 
      });
      
      // 게임 보드에 블록들이 렌더링되어 있는지 확인
      const blocks = page.locator('.candy');
      const blockCount = await blocks.count();
      expect(blockCount).toBeGreaterThan(50); // 8x8 = 64개 기대
      
      console.log(`✅ 게임 초기화 완료: ${blockCount}개 블록 렌더링됨`);
    });

    test('1.2 반응형 디자인 테스트', async ({ page }) => {
      // 데스크톱 크기
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.screenshot({ 
        path: 'test-results/screenshots/01-2-desktop-view.png' 
      });
      
      // 태블릿 크기
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.screenshot({ 
        path: 'test-results/screenshots/01-2-tablet-view.png' 
      });
      
      // 모바일 크기
      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({ 
        path: 'test-results/screenshots/01-2-mobile-view.png' 
      });
      
      // 게임 보드가 여전히 보이는지 확인
      await expect(page.locator('#game-board')).toBeVisible();
      
      console.log('✅ 반응형 디자인 테스트 완료');
    });
  });

  test.describe('2. 블록 선택 및 기본 상호작용 테스트', () => {
    
    test('2.1 블록 선택 기능 테스트', async ({ page }) => {
      // 첫 번째 블록 선택
      const firstBlock = page.locator('.candy').first();
      await firstBlock.click();
      
      // 선택 상태 스크린샷
      await page.screenshot({ 
        path: 'test-results/screenshots/02-1-block-selected.png' 
      });
      
      // 선택된 블록의 시각적 피드백 확인
      const selectedBlockStyle = await firstBlock.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      expect(selectedBlockStyle).toContain('scale'); // 확대 효과 확인
      
      console.log('✅ 블록 선택 기능 테스트 완료');
    });

    test('2.2 드래그 조작 테스트', async ({ page }) => {
      // 유효한 이동 찾기
      const validMoves = await page.evaluate(() => {
        return window.game.moveValidator.findAllValidMoves().slice(0, 3); // 처음 3개만
      });
      
      if (validMoves.length > 0) {
        const move = validMoves[0];
        const fromSelector = `[id="block_${move.from.x}_${move.from.y}"]`;
        const toSelector = `[id="block_${move.to.x}_${move.to.y}"]`;
        
        const fromBlock = page.locator(fromSelector);
        const toBlock = page.locator(toSelector);
        
        // 드래그 이동 수행
        await fromBlock.dragTo(toBlock);
        
        // 이동 후 스크린샷
        await page.screenshot({ 
          path: 'test-results/screenshots/02-2-after-drag-move.png' 
        });
        
        // 이동 수가 증가했는지 확인
        await expect(page.locator('#moves')).toContainText('1');
        
        console.log(`✅ 드래그 이동 완료: (${move.from.x},${move.from.y}) → (${move.to.x},${move.to.y})`);
      } else {
        console.log('⚠️ 유효한 이동이 없어 드래그 테스트를 건너뜁니다.');
      }
    });
  });

  test.describe('3. 매치 감지 및 처리 테스트', () => {
    
    test('3.1 기본 3매치 테스트', async ({ page }) => {
      // 유효한 이동 수행
      const validMoves = await page.evaluate(() => 
        window.game.moveValidator.findAllValidMoves()
      );
      
      if (validMoves.length > 0) {
        const bestMove = validMoves[0];
        
        // 이동 전 상태 캡처
        await page.screenshot({ 
          path: 'test-results/screenshots/03-1-before-match.png' 
        });
        
        // 이동 실행
        await page.evaluate((move) => {
          const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
          const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
          return window.game.attemptMove(fromBlock, toBlock);
        }, bestMove);
        
        // 매치 처리 완료 대기
        await page.waitForTimeout(2000);
        
        // 매치 후 상태 캡처
        await page.screenshot({ 
          path: 'test-results/screenshots/03-1-after-match.png' 
        });
        
        // 점수가 증가했는지 확인
        const score = await page.locator('#score').textContent();
        expect(parseInt(score)).toBeGreaterThan(0);
        
        console.log(`✅ 매치 처리 완료, 점수: ${score}`);
      }
    });

    test('3.2 연쇄 반응 테스트', async ({ page }) => {
      // 여러 번의 이동으로 연쇄 반응 유발 시도
      for (let i = 0; i < 5; i++) {
        const validMoves = await page.evaluate(() => 
          window.game.moveValidator.findAllValidMoves()
        );
        
        if (validMoves.length === 0) break;
        
        const move = validMoves[0];
        
        await page.evaluate((move) => {
          const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
          const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
          return window.game.attemptMove(fromBlock, toBlock);
        }, move);
        
        // 연쇄 반응 처리 대기
        await page.waitForTimeout(3000);
        
        // 연쇄 반응 스크린샷
        await page.screenshot({ 
          path: `test-results/screenshots/03-2-chain-reaction-${i + 1}.png` 
        });
        
        // 게임 상태 확인
        const gameState = await page.evaluate(() => window.game.gameState);
        if (gameState !== 'player_turn') {
          await page.waitForFunction(() => window.game.gameState === 'player_turn', 
            { timeout: 10000 });
        }
      }
      
      const finalScore = await page.locator('#score').textContent();
      console.log(`✅ 연쇄 반응 테스트 완료, 최종 점수: ${finalScore}`);
    });
  });

  test.describe('4. 중력 시스템 테스트', () => {
    
    test('4.1 블록 낙하 애니메이션 테스트', async ({ page }) => {
      // 매치 생성으로 블록 제거
      const validMoves = await page.evaluate(() => 
        window.game.moveValidator.findAllValidMoves()
      );
      
      if (validMoves.length > 0) {
        const move = validMoves[0];
        
        // 이동 실행
        await page.evaluate((move) => {
          const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
          const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
          return window.game.attemptMove(fromBlock, toBlock);
        }, move);
        
        // 중력 적용 중 스크린샷
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: 'test-results/screenshots/04-1-gravity-applying.png' 
        });
        
        // 중력 완료 후 스크린샷
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'test-results/screenshots/04-1-gravity-complete.png' 
        });
        
        // 보드가 채워져 있는지 확인
        const emptyBlocks = await page.evaluate(() => {
          let empty = 0;
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              const block = window.game.gameBoard.getBlock(x, y);
              if (!block || block.isEmpty()) empty++;
            }
          }
          return empty;
        });
        
        expect(emptyBlocks).toBe(0); // 빈 블록이 없어야 함
        console.log('✅ 중력 시스템 테스트 완료, 빈 블록 수:', emptyBlocks);
      }
    });
  });

  test.describe('5. 힌트 시스템 테스트', () => {
    
    test('5.1 수동 힌트 요청 테스트', async ({ page }) => {
      // 힌트 버튼 클릭
      await page.click('button:has-text("💡 Hint")');
      
      // 힌트 표시 대기
      await page.waitForTimeout(1500);
      
      // 힌트 상태 스크린샷
      await page.screenshot({ 
        path: 'test-results/screenshots/05-1-hint-displayed.png' 
      });
      
      console.log('✅ 수동 힌트 테스트 완료');
    });

    test('5.2 자동 힌트 시스템 테스트', async ({ page }) => {
      // 10초 대기하여 자동 힌트 발생 확인
      console.log('자동 힌트 대기 중... (10초)');
      
      await page.waitForTimeout(11000); // 10초 + 여유시간
      
      // 자동 힌트 스크린샷
      await page.screenshot({ 
        path: 'test-results/screenshots/05-2-auto-hint.png' 
      });
      
      console.log('✅ 자동 힌트 테스트 완료');
    });
  });

  test.describe('6. 게임 제어 기능 테스트', () => {
    
    test('6.1 게임 재시작 테스트', async ({ page }) => {
      // 몇 번의 이동 수행
      for (let i = 0; i < 3; i++) {
        const validMoves = await page.evaluate(() => 
          window.game.moveValidator.findAllValidMoves()
        );
        
        if (validMoves.length > 0) {
          const move = validMoves[0];
          await page.evaluate((move) => {
            const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
            const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
            return window.game.attemptMove(fromBlock, toBlock);
          }, move);
          
          await page.waitForTimeout(2000);
        }
      }
      
      // 재시작 전 상태 캡처
      await page.screenshot({ 
        path: 'test-results/screenshots/06-1-before-restart.png' 
      });
      
      // 재시작 버튼 클릭
      await page.click('button:has-text("🔄 Restart")');
      
      // 재시작 후 상태 캡처
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: 'test-results/screenshots/06-1-after-restart.png' 
      });
      
      // 점수와 이동 수가 초기화되었는지 확인
      await expect(page.locator('#score')).toContainText('0');
      await expect(page.locator('#moves')).toContainText('0');
      
      console.log('✅ 게임 재시작 테스트 완료');
    });

    test('6.2 보드 섞기 테스트', async ({ page }) => {
      // 섞기 전 보드 상태 캡처
      await page.screenshot({ 
        path: 'test-results/screenshots/06-2-before-shuffle.png' 
      });
      
      // 섞기 버튼 클릭
      await page.click('button:has-text("🔀 Shuffle")');
      
      // 섞기 완료 대기
      await page.waitForTimeout(2000);
      
      // 섞기 후 보드 상태 캡처
      await page.screenshot({ 
        path: 'test-results/screenshots/06-2-after-shuffle.png' 
      });
      
      // 유효한 이동이 존재하는지 확인
      const validMoves = await page.evaluate(() => 
        window.game.moveValidator.findAllValidMoves().length
      );
      
      expect(validMoves).toBeGreaterThan(0);
      console.log(`✅ 보드 섞기 테스트 완료, 유효한 이동 수: ${validMoves}`);
    });
  });

  test.describe('7. 디버그 시스템 테스트', () => {
    
    test('7.1 디버그 패널 테스트', async ({ page }) => {
      // 디버그 버튼 클릭
      await page.click('button:has-text("🐛 Debug")');
      
      // 디버그 패널이 표시되는지 확인
      await expect(page.locator('#debug-info')).toBeVisible();
      
      // 디버그 정보 스크린샷
      await page.screenshot({ 
        path: 'test-results/screenshots/07-1-debug-panel.png' 
      });
      
      // 디버그 정보 내용 확인
      const debugText = await page.locator('#debug-text').textContent();
      expect(debugText).toContain('Game State:');
      expect(debugText).toContain('Valid Moves:');
      
      console.log('✅ 디버그 패널 테스트 완료');
    });

    test('7.2 콘솔 API 테스트', async ({ page }) => {
      // 콘솔 함수들 테스트
      const testResults = await page.evaluate(() => {
        const results = {};
        
        // 게임 상태 확인
        results.gameState = window.game.gameState;
        
        // 유효한 이동 수 확인
        results.validMoves = window.game.moveValidator.findAllValidMoves().length;
        
        // 게임 통계 확인
        results.stats = window.game.getGameStats();
        
        return results;
      });
      
      expect(testResults.gameState).toBe('player_turn');
      expect(testResults.validMoves).toBeGreaterThan(0);
      expect(testResults.stats).toHaveProperty('score');
      
      console.log('✅ 콘솔 API 테스트 완료:', testResults);
    });
  });

  test.describe('8. 성능 및 안정성 테스트', () => {
    
    test('8.1 빠른 연속 조작 테스트', async ({ page }) => {
      console.log('빠른 연속 조작 테스트 시작...');
      
      // 10번의 빠른 연속 이동 시도
      for (let i = 0; i < 10; i++) {
        const validMoves = await page.evaluate(() => 
          window.game.moveValidator.findAllValidMoves()
        );
        
        if (validMoves.length > 0) {
          const move = validMoves[0];
          
          // 빠른 이동 실행 (대기 시간 최소화)
          await page.evaluate((move) => {
            const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
            const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
            return window.game.attemptMove(fromBlock, toBlock);
          }, move);
          
          // 짧은 대기 (연쇄 반응 처리)
          await page.waitForTimeout(500);
        }
      }
      
      // 안정성 확인 스크린샷
      await page.screenshot({ 
        path: 'test-results/screenshots/08-1-rapid-operations.png' 
      });
      
      // 게임이 여전히 정상 상태인지 확인
      const gameState = await page.evaluate(() => window.game.gameState);
      expect(gameState).toBe('player_turn');
      
      console.log('✅ 빠른 연속 조작 테스트 완료');
    });

    test('8.2 메모리 사용량 모니터링', async ({ page }) => {
      // Performance API를 사용한 메모리 사용량 측정
      const memoryBefore = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      // 여러 번의 게임 플레이
      for (let i = 0; i < 20; i++) {
        const validMoves = await page.evaluate(() => 
          window.game.moveValidator.findAllValidMoves()
        );
        
        if (validMoves.length > 0) {
          const move = validMoves[0];
          await page.evaluate((move) => {
            const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
            const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
            return window.game.attemptMove(fromBlock, toBlock);
          }, move);
          
          await page.waitForTimeout(1000);
        }
      }
      
      const memoryAfter = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (memoryBefore && memoryAfter) {
        const memoryIncrease = memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize;
        console.log(`메모리 사용량 변화: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
        
        // 메모리 누수가 심각하지 않은지 확인 (10MB 이하)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
      
      console.log('✅ 메모리 사용량 모니터링 완료');
    });
  });

  test.describe('9. 통합 게임플레이 테스트', () => {
    
    test('9.1 완전한 게임 세션 시뮬레이션', async ({ page }) => {
      console.log('완전한 게임 세션 시뮬레이션 시작...');
      
      const sessionStart = Date.now();
      let totalMoves = 0;
      let totalScore = 0;
      let chainReactions = 0;
      
      // 30회 이동 또는 5분 중 먼저 도달하는 조건까지
      while (totalMoves < 30 && (Date.now() - sessionStart) < 300000) {
        const validMoves = await page.evaluate(() => 
          window.game.moveValidator.findAllValidMoves()
        );
        
        if (validMoves.length === 0) {
          // 데드락 상황 - 보드 섞기
          await page.click('button:has-text("🔀 Shuffle")');
          await page.waitForTimeout(2000);
          continue;
        }
        
        // 최고 점수 이동 선택
        const bestMove = validMoves[0];
        
        const scoreBefore = await page.evaluate(() => 
          parseInt(window.game.gameStats.score)
        );
        
        // 이동 실행
        await page.evaluate((move) => {
          const fromBlock = window.game.gameBoard.getBlock(move.from.x, move.from.y);
          const toBlock = window.game.gameBoard.getBlock(move.to.x, move.to.y);
          return window.game.attemptMove(fromBlock, toBlock);
        }, bestMove);
        
        // 처리 완료 대기
        await page.waitForFunction(() => window.game.gameState === 'player_turn', 
          { timeout: 10000 });
        
        const scoreAfter = await page.evaluate(() => 
          parseInt(window.game.gameStats.score)
        );
        
        totalMoves++;
        totalScore = scoreAfter;
        
        if (scoreAfter - scoreBefore > 500) {
          chainReactions++; // 높은 점수는 연쇄 반응을 의미
        }
        
        // 주요 순간 스크린샷
        if (totalMoves % 5 === 0) {
          await page.screenshot({ 
            path: `test-results/screenshots/09-1-session-move-${totalMoves}.png` 
          });
        }
        
        await page.waitForTimeout(500); // 시각적 확인을 위한 대기
      }
      
      // 최종 세션 결과 스크린샷
      await page.screenshot({ 
        path: 'test-results/screenshots/09-1-session-complete.png',
        fullPage: true 
      });
      
      const sessionDuration = Date.now() - sessionStart;
      
      console.log(`✅ 게임 세션 완료:`);
      console.log(`   - 총 이동 수: ${totalMoves}`);
      console.log(`   - 최종 점수: ${totalScore}`);
      console.log(`   - 연쇄 반응: ${chainReactions}회`);
      console.log(`   - 플레이 시간: ${(sessionDuration / 1000).toFixed(1)}초`);
      
      // 기본적인 성과 검증
      expect(totalMoves).toBeGreaterThan(10);
      expect(totalScore).toBeGreaterThan(1000);
    });
  });
});