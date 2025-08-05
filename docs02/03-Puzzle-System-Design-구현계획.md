# Sweet Puzzle 구현 계획서: 퍼즐 시스템

## 1. 🎯 구현 목표

이 문서는 `docs02/03-Puzzle-System-Design.md`에 정의된 **퍼즐 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 매치-3 퍼즐 메커니즘, AI 기반 레벨 생성, 특수 블록 시스템, 보드 관리 시스템을 완성하여 플레이어에게 무한한 퍼즐 경험을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

퍼즐 시스템 구현은 `assets/scripts/puzzle` 폴더를 중심으로 진행됩니다.

### 2.1. Puzzle Core (퍼즐 핵심)

```
assets/scripts/puzzle/
├── PuzzleManager.ts                 # ✅ 퍼즐 시스템 총괄 관리자
├── GameBoard.ts                     # ✅ 게임 보드 관리
├── Block.ts                         # ✅ 블록 기본 클래스
├── MatchDetector.ts                 # ✅ 매치 검출 시스템
├── MoveValidator.ts                 # ✅ 이동 검증 시스템
└── ComboSystem.ts                   # ✅ 연쇄 반응 처리
```

### 2.2. Special Blocks (특수 블록)

```
assets/scripts/puzzle/special/
├── SpecialBlock.ts                  # ✅ 특수 블록 기본 클래스
├── LineBlock.ts                     # ✅ 라인 블록 구현
├── BombBlock.ts                     # ✅ 폭탄 블록 구현
├── RainbowBlock.ts                  # ✅ 레인보우 블록 구현
├── SpecialBlockFactory.ts           # ✅ 특수 블록 생성 팩토리
└── SpecialBlockCombinator.ts        # ✅ 특수 블록 조합 시스템
```

### 2.3. AI Level Generation (AI 레벨 생성)

```
assets/scripts/puzzle/ai/
├── LevelGenerator.ts                # ✅ AI 레벨 생성기
├── LevelValidator.ts                # ✅ 레벨 검증 시스템
├── DifficultyCalculator.ts          # ✅ 난이도 계산기
├── AdaptiveDifficultySystem.ts      # ✅ 적응형 난이도 조절
└── AIPromptManager.ts               # ✅ AI 프롬프트 관리
```

### 2.4. Board Management (보드 관리)

```
assets/scripts/puzzle/board/
├── BoardGenerator.ts                # ✅ 보드 생성기
├── BoardShuffler.ts                 # ✅ 보드 섞기 시스템
├── DeadlockDetector.ts              # ✅ 데드락 감지
├── HintSystem.ts                    # ✅ 힌트 시스템
└── GravitySystem.ts                 # ✅ 중력 시스템
```

### 2.5. Physics & Animation (물리 & 애니메이션)

```
assets/scripts/puzzle/physics/
├── BlockPhysics.ts                  # ✅ 블록 물리 시스템
├── AnimationManager.ts              # ✅ 애니메이션 관리자
├── ParticleEffects.ts               # ✅ 파티클 효과
├── SoundEffects.ts                  # ✅ 사운드 효과
└── FeedbackSystem.ts                # ✅ 햅틱 피드백
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs02/03-Puzzle-System-Design.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 매치-3 시스템 구축 (가장 중요)**
*   **기간:** 10일
*   **목표:** 기본적인 매치-3 게임플레이가 완전히 동작한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `Block.ts`: 기본 블록 클래스와 블록 타입 시스템을 구현합니다.
        ```typescript
        export class Block extends cc.Component {
            private blockType: BlockType;
            private position: cc.Vec2;
            private animationState: BlockAnimationState;
            private isMatched: boolean = false;
            private isMoving: boolean = false;
            
            @property(cc.Sprite)
            sprite: cc.Sprite = null;
            
            @property(cc.Animation)
            animation: cc.Animation = null;
            
            onLoad() {
                this.setupTouchEvents();
                this.setupAnimations();
            }
            
            setBlockType(type: BlockType): void {
                this.blockType = type;
                this.updateSprite();
            }
            
            private setupTouchEvents(): void {
                this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
                this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
                this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            }
            
            private onTouchStart(event: cc.Event.EventTouch): void {
                if (this.isMoving) return;
                
                EventBus.getInstance().emit('block_touch_start', {
                    block: this,
                    position: this.position
                });
                
                this.playSelectAnimation();
            }
            
            async playMatchAnimation(): Promise<void> {
                return new Promise<void>((resolve) => {
                    this.isMatched = true;
                    
                    // 매치 애니메이션 재생
                    const scaleAnim = cc.tween(this.node)
                        .to(0.2, { scale: 1.2 })
                        .to(0.2, { scale: 0, opacity: 0 })
                        .call(() => {
                            resolve();
                        });
                    
                    scaleAnim.start();
                    
                    // 파티클 효과 재생
                    this.playMatchParticles();
                    
                    // 사운드 효과 재생
                    AudioManager.getInstance().playSound(`match_${this.blockType}`);
                });
            }
            
            async moveTo(targetPosition: cc.Vec2, duration: number = 0.3): Promise<void> {
                return new Promise<void>((resolve) => {
                    this.isMoving = true;
                    
                    cc.tween(this.node)
                        .to(duration, { position: targetPosition })
                        .call(() => {
                            this.isMoving = false;
                            this.position = targetPosition;
                            resolve();
                        })
                        .start();
                });
            }
        }
        ```
    2.  **[Task 1.2]** `GameBoard.ts`: 8x8 게임 보드의 기본 구조와 블록 배치를 구현합니다.
    3.  **[Task 1.3]** `MatchDetector.ts`: 수평, 수직, L자 매치 검출 알고리즘을 구현합니다.
    4.  **[Task 1.4]** `MoveValidator.ts`: 유효한 이동과 매치 생성 여부를 검증합니다.
    5.  **[Task 1.5]** **기본 매치 테스트:** 3개 이상 블록 매치가 정확히 검출되고 제거되는지 검증합니다.

### **Phase 2: 물리 시스템 및 애니메이션**
*   **기간:** 7일
*   **목표:** 부드러운 블록 낙하와 자연스러운 애니메이션이 구현된다.
*   **작업 내용:**
    1.  **[Task 2.1]** `GravitySystem.ts`: 블록 낙하와 빈 공간 채우기 시스템을 구현합니다.
        ```typescript
        export class GravitySystem {
            private fallSpeed: number = 500; // pixels per second
            private board: GameBoard;
            
            constructor(board: GameBoard) {
                this.board = board;
            }
            
            async applyGravity(): Promise<GravityResult> {
                const movements: BlockMovement[] = [];
                const newBlocks: Block[] = [];
                
                for (let col = 0; col < this.board.width; col++) {
                    const columnBlocks = this.getColumnBlocks(col);
                    const nonEmptyBlocks = columnBlocks.filter(block => !block.isEmpty());
                    
                    // 아래쪽부터 블록 재배치
                    for (let row = this.board.height - 1; row >= 0; row--) {
                        const targetIndex = this.board.height - 1 - row;
                        
                        if (targetIndex < nonEmptyBlocks.length) {
                            const fallingBlock = nonEmptyBlocks[targetIndex];
                            const originalRow = fallingBlock.getPosition().y;
                            
                            if (originalRow !== row) {
                                movements.push({
                                    block: fallingBlock,
                                    from: new cc.Vec2(col, originalRow),
                                    to: new cc.Vec2(col, row),
                                    duration: this.calculateFallTime(originalRow - row)
                                });
                            }
                            
                            this.board.setBlock(col, row, fallingBlock);
                        } else {
                            // 새로운 블록 생성
                            const newBlock = this.generateNewBlock(col, row);
                            this.board.setBlock(col, row, newBlock);
                            newBlocks.push(newBlock);
                            
                            movements.push({
                                block: newBlock,
                                from: new cc.Vec2(col, -1 - (targetIndex - nonEmptyBlocks.length)),
                                to: new cc.Vec2(col, row),
                                duration: this.calculateFallTime(row + 1 + (targetIndex - nonEmptyBlocks.length))
                            });
                        }
                    }
                }
                
                // 모든 이동 애니메이션을 병렬로 실행
                await this.executeMovements(movements);
                
                return {
                    movements: movements,
                    newBlocks: newBlocks,
                    hasMatches: await this.checkForNewMatches()
                };
            }
            
            private async executeMovements(movements: BlockMovement[]): Promise<void> {
                const promises = movements.map(movement => 
                    movement.block.moveTo(movement.to, movement.duration)
                );
                
                await Promise.all(promises);
            }
        }
        ```
    2.  **[Task 2.2]** `AnimationManager.ts`: 블록 애니메이션과 전환 효과를 관리합니다.
    3.  **[Task 2.3]** `ParticleEffects.ts`: 매치 시 파티클 효과와 시각적 피드백을 구현합니다.
    4.  **[Task 2.4]** `SoundEffects.ts`: 게임 액션에 맞는 사운드 효과를 통합합니다.
    5.  **[Task 2.5]** **물리 시스템 테스트:** 자연스러운 블록 낙하와 애니메이션이 정상 작동하는지 검증합니다.

### **Phase 3: 특수 블록 시스템**
*   **기간:** 8일
*   **목표:** 라인, 폭탄, 레인보우 특수 블록과 조합 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 3.1]** `SpecialBlock.ts`: 특수 블록의 기본 클래스와 활성화 메커니즘을 구현합니다.
        ```typescript
        export abstract class SpecialBlock extends Block {
            protected power: number;
            protected activationPattern: ActivationPattern;
            
            constructor() {
                super();
                this.isSpecialBlock = true;
            }
            
            abstract activate(board: GameBoard, position: cc.Vec2): Promise<ActivationResult>;
            abstract getPreviewEffect(board: GameBoard, position: cc.Vec2): cc.Vec2[];
            
            async triggerActivation(board: GameBoard, position: cc.Vec2): Promise<ActivationResult> {
                // 활성화 애니메이션 재생
                await this.playActivationAnimation();
                
                // 특수 효과 실행
                const result = await this.activate(board, position);
                
                // 결과 처리
                await this.processActivationResult(result, board);
                
                return result;
            }
            
            protected async playActivationAnimation(): Promise<void> {
                return new Promise<void>((resolve) => {
                    // 특수 블록별 고유 활성화 애니메이션
                    const glowEffect = cc.tween(this.node)
                        .to(0.1, { scale: 1.3 })
                        .to(0.1, { scale: 1.0 })
                        .to(0.1, { scale: 1.3 })
                        .to(0.1, { scale: 1.0 })
                        .call(() => resolve());
                    
                    glowEffect.start();
                    
                    // 특수 사운드 효과
                    AudioManager.getInstance().playSound('special_block_activate');
                    
                    // 화면 진동 효과
                    HapticManager.getInstance().vibrate('medium');
                });
            }
        }
        
        export class LineBlock extends SpecialBlock {
            private direction: LineDirection;
            
            constructor(direction: LineDirection) {
                super();
                this.direction = direction;
                this.power = 1;
            }
            
            async activate(board: GameBoard, position: cc.Vec2): Promise<ActivationResult> {
                const affectedPositions: cc.Vec2[] = [];
                
                if (this.direction === LineDirection.HORIZONTAL) {
                    // 가로줄 전체 제거
                    for (let col = 0; col < board.width; col++) {
                        const block = board.getBlock(col, position.y);
                        if (block && block.getType() !== BlockType.OBSTACLE) {
                            affectedPositions.push(new cc.Vec2(col, position.y));
                        }
                    }
                } else {
                    // 세로줄 전체 제거
                    for (let row = 0; row < board.height; row++) {
                        const block = board.getBlock(position.x, row);
                        if (block && block.getType() !== BlockType.OBSTACLE) {
                            affectedPositions.push(new cc.Vec2(position.x, row));
                        }
                    }
                }
                
                // 라인 제거 효과 애니메이션
                await this.playLineEffect(affectedPositions, this.direction);
                
                return {
                    affectedPositions: affectedPositions,
                    score: this.power * affectedPositions.length * 50,
                    effectType: EffectType.LINE_CLEAR,
                    chainMultiplier: 1.0
                };
            }
            
            private async playLineEffect(positions: cc.Vec2[], direction: LineDirection): Promise<void> {
                // 라인 방향으로 번개 효과 애니메이션
                const lightningEffect = this.createLightningEffect(positions, direction);
                await lightningEffect.play();
            }
        }
        ```
    2.  **[Task 3.2]** `BombBlock.ts`: 폭발 반경과 연쇄 폭발 시스템을 구현합니다.
    3.  **[Task 3.3]** `RainbowBlock.ts`: 색상 선택과 전체 색상 제거 메커니즘을 구현합니다.
    4.  **[Task 3.4]** `SpecialBlockCombinator.ts`: 특수 블록 간의 조합 효과를 구현합니다.
    5.  **[Task 3.5]** **특수 블록 테스트:** 모든 특수 블록의 효과와 조합이 올바르게 작동하는지 검증합니다.

### **Phase 4: AI 레벨 생성 시스템**
*   **기간:** 12일
*   **목표:** GPT-4 기반 동적 레벨 생성과 적응형 난이도 조절이 완성된다.
*   **작업 내용:**
    1.  **[Task 4.1]** `LevelGenerator.ts`: AI 기반 레벨 생성 시스템을 구현합니다.
        ```typescript
        export class LevelGenerator {
            private aiService: AIService;
            private validator: LevelValidator;
            private difficultyCalculator: DifficultyCalculator;
            
            constructor() {
                this.aiService = new AIService();
                this.validator = new LevelValidator();
                this.difficultyCalculator = new DifficultyCalculator();
            }
            
            async generateLevel(parameters: GenerationParameters): Promise<LevelConfig> {
                const prompt = this.buildGenerationPrompt(parameters);
                
                let attempts = 0;
                const maxAttempts = 5;
                
                while (attempts < maxAttempts) {
                    try {
                        // GPT-4에게 레벨 생성 요청
                        const aiResponse = await this.aiService.generateWithGPT4(prompt);
                        
                        // AI 응답 파싱
                        const levelConfig = this.parseAIResponse(aiResponse);
                        
                        // 레벨 유효성 검증
                        const validationResult = await this.validator.validateLevel(levelConfig);
                        
                        if (validationResult.isValid) {
                            // 난이도 점수 계산
                            const difficultyScore = this.difficultyCalculator.calculate(levelConfig);
                            levelConfig.difficulty = difficultyScore;
                            
                            return levelConfig;
                        }
                        
                        // 검증 실패 시 피드백으로 프롬프트 개선
                        prompt.addValidationFeedback(validationResult.issues);
                        attempts++;
                        
                    } catch (error) {
                        console.error('AI level generation failed:', error);
                        attempts++;
                    }
                }
                
                // AI 생성 실패 시 템플릿 기반 생성
                return this.generateFromTemplate(parameters);
            }
            
            private buildGenerationPrompt(params: GenerationParameters): AIPrompt {
                const playerProfile = PlayerManager.getInstance().getPlayerProfile();
                
                return new AIPrompt(`
# 매치-3 퍼즐 레벨 디자인 요청

당신은 Sweet Puzzle 게임의 전문 레벨 디자이너입니다. 
다음 조건에 맞는 매치-3 퍼즐 레벨을 JSON 형태로 설계해주세요.

## 게임 조건
- 보드 크기: ${params.boardSize.width}x${params.boardSize.height}
- 목표 난이도: ${params.targetDifficulty} (1-10 스케일)
- 레벨 타입: ${params.objectiveType}
- 플레이어 스킬 레벨: ${playerProfile.skillLevel}
- 이전 5레벨 성공률: ${playerProfile.recentSuccessRate}%

## 설계 요구사항
1. **해결 가능성**: 반드시 해결 가능한 퍼즐이어야 합니다
2. **적절한 도전**: ${params.targetDifficulty}에 맞는 도전 수준 제공
3. **특수 블록 활용**: 전략적 특수 블록 배치 기회 제공
4. **플레이어 성취감**: 적절한 보상과 진행감 제공

## 출력 형식
다음 JSON 구조로만 응답해주세요:

\`\`\`json
{
  "boardLayout": [
    [1, 2, 3, 4, 5, 6, 1, 2],
    // ... 8x8 배열, 숫자는 블록 타입 (1-6: 일반 블록, 0: 빈칸, 9: 장애물)
  ],
  "objectives": [
    {
      "type": "score",
      "target": 50000,
      "description": "50,000점 달성"
    }
  ],
  "maxMoves": 25,
  "specialElements": {
    "preplacedSpecialBlocks": [
      {"type": "line_horizontal", "position": [3, 4]},
      {"type": "bomb", "position": [5, 2]}
    ],
    "obstacles": [
      {"type": "ice", "position": [1, 1], "layers": 2}
    ]
  },
  "expectedSolution": "중앙의 특수 블록들을 조합하여 대량 점수 획득 후, 코너의 어려운 블록들을 정리하는 전략 필요"
}
\`\`\`

플레이어가 만족할 만한 도전적이면서도 공정한 레벨을 설계해주세요.
                `);
            }
            
            private parseAIResponse(response: string): LevelConfig {
                try {
                    // JSON 추출
                    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
                    if (!jsonMatch) {
                        throw new Error('No JSON found in AI response');
                    }
                    
                    const levelData = JSON.parse(jsonMatch[1]);
                    
                    // LevelConfig 객체로 변환
                    return {
                        id: this.generateLevelId(),
                        boardSize: {
                            width: levelData.boardLayout[0].length,
                            height: levelData.boardLayout.length
                        },
                        initialLayout: levelData.boardLayout,
                        objectives: levelData.objectives,
                        maxMoves: levelData.maxMoves,
                        specialBlocks: levelData.specialElements?.preplacedSpecialBlocks || [],
                        obstacles: levelData.specialElements?.obstacles || [],
                        aiGenerated: true,
                        generationTimestamp: Date.now(),
                        expectedSolution: levelData.expectedSolution
                    };
                } catch (error) {
                    throw new Error(`Failed to parse AI response: ${error.message}`);
                }
            }
        }
        ```
    2.  **[Task 4.2]** `LevelValidator.ts`: 생성된 레벨의 해결 가능성과 균형을 검증합니다.
    3.  **[Task 4.3]** `AdaptiveDifficultySystem.ts`: 플레이어 실력에 맞는 동적 난이도 조절을 구현합니다.
    4.  **[Task 4.4]** `AIPromptManager.ts`: AI 프롬프트 최적화와 학습 시스템을 구현합니다.
    5.  **[Task 4.5]** **AI 레벨 생성 테스트:** 다양한 조건에서 적절한 레벨이 생성되고 검증되는지 확인합니다.

### **Phase 5: 보드 관리 및 도우미 시스템**
*   **기간:** 6일
*   **목표:** 힌트, 셔플, 데드락 감지 등 플레이어 도우미 시스템이 완성된다.
*   **작업 내용:**
    1.  **[Task 5.1]** `DeadlockDetector.ts`: 가능한 이동이 없는 상황을 감지하고 해결합니다.
        ```typescript
        export class DeadlockDetector {
            private board: GameBoard;
            private moveValidator: MoveValidator;
            
            constructor(board: GameBoard) {
                this.board = board;
                this.moveValidator = new MoveValidator();
            }
            
            hasValidMoves(): boolean {
                // 모든 가능한 이동을 확인
                for (let row = 0; row < this.board.height; row++) {
                    for (let col = 0; col < this.board.width; col++) {
                        if (this.canMakeValidMove(col, row)) {
                            return true;
                        }
                    }
                }
                
                return false;
            }
            
            findAllPossibleMoves(): Move[] {
                const moves: Move[] = [];
                
                for (let row = 0; row < this.board.height; row++) {
                    for (let col = 0; col < this.board.width; col++) {
                        const blockMoves = this.findMovesForPosition(col, row);
                        moves.push(...blockMoves);
                    }
                }
                
                // 점수별로 정렬
                return moves.sort((a, b) => b.expectedScore - a.expectedScore);
            }
            
            private canMakeValidMove(col: number, row: number): boolean {
                const currentBlock = this.board.getBlock(col, row);
                
                if (!currentBlock || currentBlock.isEmpty() || currentBlock.isObstacle()) {
                    return false;
                }
                
                // 4방향으로 교환 시도
                const directions = [
                    { dx: 0, dy: -1 }, // 위
                    { dx: 1, dy: 0 },  // 오른쪽
                    { dx: 0, dy: 1 },  // 아래
                    { dx: -1, dy: 0 }  // 왼쪽
                ];
                
                for (const dir of directions) {
                    const newCol = col + dir.dx;
                    const newRow = row + dir.dy;
                    
                    if (this.board.isValidPosition(newCol, newRow)) {
                        const move = new Move(
                            new cc.Vec2(col, row),
                            new cc.Vec2(newCol, newRow)
                        );
                        
                        if (this.moveValidator.isValidMove(move, this.board)) {
                            return true;
                        }
                    }
                }
                
                return false;
            }
        }
        ```
    2.  **[Task 5.2]** `HintSystem.ts`: 최적의 이동을 제안하는 스마트 힌트 시스템을 구현합니다.
    3.  **[Task 5.3]** `BoardShuffler.ts`: 데드락 상황에서 보드를 재배치하는 시스템을 구현합니다.
    4.  **[Task 5.4]** `BoardGenerator.ts`: 균형잡힌 초기 보드 생성 알고리즘을 구현합니다.
    5.  **[Task 5.5]** **보드 관리 시스템 테스트:** 모든 도우미 시스템이 유기적으로 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 매치 검출 최적화

```typescript
// 고성능 매치 검출 알고리즘
export class OptimizedMatchDetector {
    private board: GameBoard;
    private matchCache: Map<string, Match[]> = new Map();
    
    constructor(board: GameBoard) {
        this.board = board;
    }
    
    findAllMatches(): Match[] {
        const boardHash = this.getBoardHash();
        
        // 캐시된 결과 확인
        if (this.matchCache.has(boardHash)) {
            return this.matchCache.get(boardHash)!;
        }
        
        const matches: Match[] = [];
        
        // 수평 매치 검사 (최적화된 버전)
        matches.push(...this.findHorizontalMatchesOptimized());
        
        // 수직 매치 검사 (최적화된 버전)
        matches.push(...this.findVerticalMatchesOptimized());
        
        // L/T 모양 매치 검사
        matches.push(...this.findShapeMatches());
        
        // 중복 제거
        const uniqueMatches = this.removeDuplicateMatches(matches);
        
        // 결과 캐싱
        this.matchCache.set(boardHash, uniqueMatches);
        
        return uniqueMatches;
    }
    
    private findHorizontalMatchesOptimized(): Match[] {
        const matches: Match[] = [];
        
        for (let row = 0; row < this.board.height; row++) {
            let matchStart = 0;
            let currentType = this.board.getBlock(0, row)?.getType();
            
            for (let col = 1; col <= this.board.width; col++) {
                const nextType = col < this.board.width ? 
                    this.board.getBlock(col, row)?.getType() : null;
                
                if (nextType !== currentType || col === this.board.width) {
                    const matchLength = col - matchStart;
                    
                    if (matchLength >= 3 && this.isMatchableType(currentType)) {
                        const matchBlocks = this.getBlocksInRange(
                            matchStart, row, col - 1, row
                        );
                        
                        matches.push({
                            type: MatchType.HORIZONTAL,
                            blocks: matchBlocks,
                            length: matchLength,
                            score: this.calculateMatchScore(matchLength, currentType)
                        });
                    }
                    
                    matchStart = col;
                    currentType = nextType;
                }
            }
        }
        
        return matches;
    }
    
    private getBoardHash(): string {
        // 보드 상태의 해시값 생성 (빠른 비교용)
        let hash = '';
        for (let row = 0; row < this.board.height; row++) {
            for (let col = 0; col < this.board.width; col++) {
                const block = this.board.getBlock(col, row);
                hash += block ? block.getType().toString() : '0';
            }
        }
        return hash;
    }
}
```

### 4.2. 특수 블록 팩토리 시스템

```typescript
// 특수 블록 생성 팩토리
export class SpecialBlockFactory {
    private static instance: SpecialBlockFactory;
    
    static getInstance(): SpecialBlockFactory {
        if (!this.instance) {
            this.instance = new SpecialBlockFactory();
        }
        return this.instance;
    }
    
    createSpecialBlock(matchLength: number, matchType: MatchType, baseColor: BlockType): SpecialBlock | null {
        switch (matchLength) {
            case 4:
                // 4개 매치 시 라인 블록 생성
                const direction = matchType === MatchType.HORIZONTAL ? 
                    LineDirection.VERTICAL : LineDirection.HORIZONTAL;
                return new LineBlock(direction, baseColor);
                
            case 5:
                // 5개 매치 시 색상 폭탄 생성
                return new ColorBomb(baseColor);
                
            default:
                if (matchLength >= 6) {
                    // 6개 이상 매치 시 레인보우 블록 생성
                    return new RainbowBlock();
                }
                break;
        }
        
        return null;
    }
    
    createSpecialBlockFromPattern(pattern: MatchPattern): SpecialBlock | null {
        switch (pattern.shape) {
            case MatchShape.L_SHAPE:
            case MatchShape.T_SHAPE:
                // L자나 T자 패턴 시 폭탄 블록 생성
                return new BombBlock(1, pattern.centerColor);
                
            case MatchShape.CROSS:
                // 십자 패턴 시 더블 라인 블록 생성
                return new CrossLineBlock(pattern.centerColor);
                
            default:
                return null;
        }
    }
    
    // 특수 블록 조합 효과 계산
    calculateCombinationEffect(block1: SpecialBlock, block2: SpecialBlock): CombinationEffect {
        const combination = `${block1.getSpecialType()}_${block2.getSpecialType()}`;
        
        switch (combination) {
            case 'LINE_LINE':
                return new CrossExplosionEffect();
                
            case 'LINE_BOMB':
                return new LineBombEffect();
                
            case 'BOMB_BOMB':
                return new MegaExplosionEffect();
                
            case 'RAINBOW_LINE':
                return new RainbowLineEffect();
                
            case 'RAINBOW_BOMB':
                return new RainbowBombEffect();
                
            case 'RAINBOW_RAINBOW':
                return new BoardClearEffect();
                
            default:
                return new DefaultCombinationEffect(block1, block2);
        }
    }
}
```

### 4.3. 연쇄 반응 처리 시스템

```typescript
// 연쇄 반응 처리기
export class ChainReactionProcessor {
    private board: GameBoard;
    private comboMultiplier: number = 1.0;
    private maxChainDepth: number = 10;
    
    constructor(board: GameBoard) {
        this.board = board;
    }
    
    async processChainReaction(initialMatches: Match[]): Promise<ChainResult> {
        const allMatches: Match[] = [];
        const specialBlocksCreated: SpecialBlock[] = [];
        let totalScore = 0;
        let chainDepth = 0;
        let currentMatches = initialMatches;
        
        while (currentMatches.length > 0 && chainDepth < this.maxChainDepth) {
            chainDepth++;
            this.comboMultiplier = 1.0 + (chainDepth - 1) * 0.25; // 25%씩 증가
            
            // 현재 매치들 처리
            allMatches.push(...currentMatches);
            
            // 점수 계산 (콤보 배율 적용)
            const roundScore = this.calculateRoundScore(currentMatches);
            totalScore += Math.floor(roundScore * this.comboMultiplier);
            
            // 특수 블록 생성 확인
            const newSpecialBlocks = this.checkSpecialBlockCreation(currentMatches);
            specialBlocksCreated.push(...newSpecialBlocks);
            
            // 매치된 블록들 제거 및 특수 블록 배치
            await this.removeMatchedBlocks(currentMatches);
            await this.placeSpecialBlocks(newSpecialBlocks);
            
            // 중력 적용
            const gravityResult = await this.applyGravity();
            
            // 새로운 매치 검사
            currentMatches = this.findNewMatches();
            
            // 연쇄 반응 이벤트 발생
            EventBus.getInstance().emit('chain_reaction_step', {
                chainDepth: chainDepth,
                matches: currentMatches.length,
                score: roundScore,
                multiplier: this.comboMultiplier
            });
            
            // 짧은 지연 (시각적 효과를 위해)
            await this.waitForAnimations();
        }
        
        // 연쇄 완료 이벤트
        EventBus.getInstance().emit('chain_reaction_complete', {
            totalChains: chainDepth,
            totalScore: totalScore,
            specialBlocksCreated: specialBlocksCreated.length
        });
        
        return {
            totalMatches: allMatches,
            totalScore: totalScore,
            chainDepth: chainDepth,
            specialBlocksCreated: specialBlocksCreated,
            finalMultiplier: this.comboMultiplier
        };
    }
    
    private calculateRoundScore(matches: Match[]): number {
        return matches.reduce((total, match) => {
            const baseScore = match.length * 100;
            const lengthBonus = Math.max(0, match.length - 3) * 50;
            const typeBonus = this.getBlockTypeBonus(match.blocks[0].getType());
            return total + baseScore + lengthBonus + typeBonus;
        }, 0);
    }
    
    private checkSpecialBlockCreation(matches: Match[]): SpecialBlock[] {
        const specialBlocks: SpecialBlock[] = [];
        
        for (const match of matches) {
            const specialBlock = SpecialBlockFactory.getInstance()
                .createSpecialBlock(match.length, match.type, match.blocks[0].getType());
            
            if (specialBlock) {
                // 특수 블록을 매치의 중앙에 배치
                const centerPosition = this.calculateMatchCenter(match);
                specialBlock.setPosition(centerPosition);
                specialBlocks.push(specialBlock);
            }
        }
        
        return specialBlocks;
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **설계 문서 완벽 준수:** `03-Puzzle-System-Design.md`에 정의된 모든 퍼즐 메커니즘을 정확히 구현합니다.

2.  **성능 최적화:** 매치 검출과 애니메이션이 60FPS에서 부드럽게 동작해야 합니다.

3.  **AI 품질 관리:** GPT-4 생성 레벨의 품질과 일관성을 보장하는 검증 시스템을 구축합니다.

4.  **사용자 경험:** 직관적인 터치 인터랙션과 만족스러운 시각/청각 피드백을 제공합니다.

5.  **확장성 고려:** 새로운 특수 블록이나 게임 모드를 쉽게 추가할 수 있는 구조를 유지합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **매치 검출 속도:** 8x8 보드에서 5ms 이내 완료
- **애니메이션 프레임률:** 안정적 60FPS 유지
- **AI 레벨 생성 시간:** 평균 3초 이내 완료
- **메모리 사용량:** 퍼즐 시스템이 50MB 이하 사용

### 6.2. 검증 기준
- 모든 매치 패턴이 정확히 검출되고 처리됨
- 특수 블록 조합 효과가 예상대로 동작함
- AI 생성 레벨의 90% 이상이 해결 가능함
- 데드락 상황이 자동으로 감지되고 해결됨
- 다양한 기기에서 일관된 게임플레이 경험 제공

이 구현 계획을 통해 Sweet Puzzle의 퍼즐 시스템을 완성하여 플레이어에게 무한하고 개인화된 퍼즐 경험을 제공할 수 있을 것입니다.