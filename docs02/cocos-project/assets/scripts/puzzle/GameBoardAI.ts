/**
 * [의도] GameBoard AI 패턴 통합 시스템
 * [책임] AIPatternGenerator와 GameBoard 연결, 실시간 패턴 적용, 학습 데이터 수집
 */

import { _decorator, Component } from 'cc';
import { GameBoard } from './GameBoard';
import { AIPatternGenerator, PlayerProfile } from '../ai/AIPatternGenerator';
import { PatternPrimitive, StagePattern } from '../ai/PatternTypes';
import { EventBus } from '../core/EventBus';

const { ccclass } = _decorator;

export interface GameStateSnapshot {
    timestamp: number;
    stageNumber: number;
    boardState: any;
    playerMoves: number;
    currentScore: number;
    timeElapsed: number;
}

export interface PatternApplicationResult {
    success: boolean;
    patternsApplied: string[];
    difficultyLevel: number;
    expectedPlayerPerformance: number;
    actualResult?: {
        playerSuccess: boolean;
        timeTaken: number;
        hintsUsed: number;
        mistakeCount: number;
    };
}

@ccclass('GameBoardAI')
export class GameBoardAI extends Component {
    private gameBoard: GameBoard = null!;
    private aiPatternGenerator: AIPatternGenerator = null!;
    private currentStagePattern: StagePattern | null = null;
    private playerProfile: PlayerProfile | null = null;
    
    // 학습 데이터 수집
    private gameStateHistory: GameStateSnapshot[] = [];
    private patternApplicationHistory: PatternApplicationResult[] = [];
    
    // 실시간 조정 시스템
    private isRealTimeAdjustmentEnabled: boolean = true;
    private performanceThreshold = 0.15; // 15% 편차 허용
    
    /**
     * [의도] GameBoardAI 초기화
     * [책임] AI 시스템과 게임보드 연동 설정
     */
    public initialize(gameBoard: GameBoard): void {
        this.gameBoard = gameBoard;
        this.aiPatternGenerator = new AIPatternGenerator();
        this.setupEventListeners();
        
        console.log('[GameBoardAI] AI 패턴 시스템 초기화 완료');
    }
    
    /**
     * [의도] 스테이지 시작 시 AI 패턴 적용
     * [책임] 현재 스테이지와 플레이어 프로필에 맞는 패턴 생성 및 적용
     */
    public async startStageWithAI(stage: number, playerProfile: PlayerProfile): Promise<void> {
        console.log(`[GameBoardAI] 스테이지 ${stage} AI 패턴 생성 시작`);
        
        this.playerProfile = playerProfile;
        
        try {
            // 99-02 기반 스테이지 패턴 생성
            this.currentStagePattern = this.aiPatternGenerator.generateStagePattern(
                stage, 
                playerProfile,
                `stage-${stage}-${Date.now()}`
            );
            
            console.log('[GameBoardAI] 생성된 패턴:', {
                id: this.currentStagePattern.id,
                primitiveCount: this.currentStagePattern.primitives.length,
                totalDifficulty: this.currentStagePattern.totalDifficulty,
                totalLearnability: this.currentStagePattern.totalLearnability,
                combinationComplexity: this.currentStagePattern.combinationComplexity
            });
            
            // 패턴을 게임보드에 적용
            const applicationResult = await this.applyPatternToGameBoard(this.currentStagePattern);
            
            // 패턴 적용 결과 기록
            this.patternApplicationHistory.push(applicationResult);
            
            // 게임 상태 스냅샷 저장
            this.captureGameStateSnapshot(stage);
            
            // 이벤트 발생
            const eventBus = EventBus.getInstance();
            eventBus.emit('ai:pattern-applied', {
                stage,
                pattern: this.currentStagePattern,
                applicationResult
            });
            
        } catch (error) {
            console.error('[GameBoardAI] 패턴 적용 실패:', error);
            // 실패 시 기본 패턴으로 폴백
            await this.applyFallbackPattern(stage);
        }
    }
    
    /**
     * [의도] AI 패턴을 게임보드에 실제 적용
     * [책임] 패턴 프리미티브를 게임 로직으로 변환하여 적용
     */
    private async applyPatternToGameBoard(stagePattern: StagePattern): Promise<PatternApplicationResult> {
        const appliedPatterns: string[] = [];
        
        try {
            // 각 패턴 프리미티브를 게임보드에 적용
            for (const primitive of stagePattern.primitives) {
                const applied = await this.applyPatternPrimitive(primitive);
                if (applied) {
                    appliedPatterns.push(primitive.id);
                }
            }
            
            // 적용 성공 결과 반환
            return {
                success: true,
                patternsApplied: appliedPatterns,
                difficultyLevel: stagePattern.totalDifficulty,
                expectedPlayerPerformance: stagePattern.totalLearnability
            };
            
        } catch (error) {
            console.error('[GameBoardAI] 패턴 적용 중 오류:', error);
            return {
                success: false,
                patternsApplied: appliedPatterns,
                difficultyLevel: 0,
                expectedPlayerPerformance: 0
            };
        }
    }
    
    /**
     * [의도] 개별 패턴 프리미티브를 게임보드에 적용
     * [책임] 패턴 타입에 따른 구체적인 게임 로직 적용
     */
    private async applyPatternPrimitive(primitive: PatternPrimitive): Promise<boolean> {
        console.log(`[GameBoardAI] 패턴 프리미티브 적용: ${primitive.id}`);
        
        try {
            // 패턴 태그에 따른 적용 로직
            for (const tag of primitive.tags) {
                switch (tag) {
                    case 'line':
                        await this.applyLinePattern(primitive);
                        break;
                    case 'cluster':
                        await this.applyClusterPattern(primitive);
                        break;
                    case 'gravity':
                        await this.applyGravityPattern(primitive);
                        break;
                    case 'timing_sensitive':
                        await this.applyTimingPattern(primitive);
                        break;
                    case 'teleport':
                        await this.applyTeleportPattern(primitive);
                        break;
                    case 'spatial_reasoning':
                        await this.applySpatialPattern(primitive);
                        break;
                    default:
                        console.warn(`[GameBoardAI] 알 수 없는 패턴 태그: ${tag}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error(`[GameBoardAI] 패턴 프리미티브 적용 실패 (${primitive.id}):`, error);
            return false;
        }
    }
    
    /**
     * [의도] 라인 패턴 적용
     * [책임] 수평/수직 라인 매칭 기회 생성
     */
    private async applyLinePattern(primitive: PatternPrimitive): Promise<void> {
        const params = primitive.params as any;
        const direction = params.direction || 'horizontal';
        const length = params.length || 3;
        
        console.log(`[GameBoardAI] 라인 패턴 적용: ${direction} 길이 ${length}`);
        
        // 게임보드에서 라인 패턴 생성 가능한 위치 찾기
        const suitablePositions = this.findLinePatternPositions(direction, length);
        
        if (suitablePositions.length > 0) {
            // 첫 번째 적합한 위치에 패턴 설정
            await this.setupLinePatternAtPosition(suitablePositions[0], direction, length);
        }
    }
    
    /**
     * [의도] 클러스터 패턴 적용
     * [책임] 클러스터 매칭 기회 생성
     */
    private async applyClusterPattern(primitive: PatternPrimitive): Promise<void> {
        const params = primitive.params as any;
        const size = params.size || 4;
        const shape = params.shape || 'square';
        
        console.log(`[GameBoardAI] 클러스터 패턴 적용: ${shape} 크기 ${size}`);
        
        // 클러스터 패턴 생성 로직
        const suitablePositions = this.findClusterPatternPositions(size, shape);
        
        if (suitablePositions.length > 0) {
            await this.setupClusterPatternAtPosition(suitablePositions[0], size, shape);
        }
    }
    
    /**
     * [의도] 중력 패턴 적용
     * [책임] 특수한 중력 효과나 시퀀스 설정
     */
    private async applyGravityPattern(primitive: PatternPrimitive): Promise<void> {
        const params = primitive.params as any;
        const shiftDirection = params.shiftDirection || 'down';
        const duration = params.duration || 3;
        
        console.log(`[GameBoardAI] 중력 패턴 적용: ${shiftDirection} 지속시간 ${duration}초`);
        
        // 특수 중력 효과 설정 (향후 확장)
        // 현재는 로그만 출력
    }
    
    /**
     * [의도] 타이밍 패턴 적용
     * [책임] 시간 제한이 있는 패턴 설정
     */
    private async applyTimingPattern(primitive: PatternPrimitive): Promise<void> {
        console.log(`[GameBoardAI] 타이밍 패턴 적용: 시간 민감 패턴`);
        // 타이밍 기반 패턴 로직 (향후 확장)
    }
    
    /**
     * [의도] 텔레포트 패턴 적용
     * [책임] 블록 이동이나 특수 효과 설정
     */
    private async applyTeleportPattern(primitive: PatternPrimitive): Promise<void> {
        console.log(`[GameBoardAI] 텔레포트 패턴 적용`);
        // 텔레포트 효과 로직 (향후 확장)
    }
    
    /**
     * [의도] 공간 추론 패턴 적용
     * [책임] 복잡한 공간 관계를 요구하는 패턴 설정
     */
    private async applySpatialPattern(primitive: PatternPrimitive): Promise<void> {
        console.log(`[GameBoardAI] 공간 추론 패턴 적용`);
        // 공간 추론 패턴 로직 (향후 확장)
    }
    
    /**
     * [의도] 라인 패턴 적용 가능한 위치 찾기
     * [책임] 게임보드에서 라인 패턴을 만들 수 있는 위치 식별
     */
    private findLinePatternPositions(direction: string, length: number): any[] {
        // 현재 게임보드 상태를 분석하여 적합한 위치 찾기
        // 간단한 구현으로 임의 위치 반환
        return [{ x: 3, y: 3 }]; // 보드 중앙 예시
    }
    
    /**
     * [의도] 클러스터 패턴 적용 가능한 위치 찾기 
     * [책임] 게임보드에서 클러스터 패턴을 만들 수 있는 위치 식별
     */
    private findClusterPatternPositions(size: number, shape: string): any[] {
        // 클러스터 패턴 위치 찾기 로직
        return [{ x: 4, y: 4 }]; // 보드 중앙 예시
    }
    
    /**
     * [의도] 지정된 위치에 라인 패턴 설정
     * [책임] 실제 게임보드에 라인 패턴 구성
     */
    private async setupLinePatternAtPosition(position: any, direction: string, length: number): Promise<void> {
        console.log(`[GameBoardAI] 위치 (${position.x}, ${position.y})에 라인 패턴 설정`);
        // 실제 블록 배치 로직 (향후 GameBoard와 연동하여 구현)
    }
    
    /**
     * [의도] 지정된 위치에 클러스터 패턴 설정
     * [책임] 실제 게임보드에 클러스터 패턴 구성
     */
    private async setupClusterPatternAtPosition(position: any, size: number, shape: string): Promise<void> {
        console.log(`[GameBoardAI] 위치 (${position.x}, ${position.y})에 클러스터 패턴 설정`);
        // 실제 블록 배치 로직 (향후 GameBoard와 연동하여 구현)
    }
    
    /**
     * [의도] 폴백 패턴 적용
     * [책임] AI 패턴 실패 시 기본 안전한 패턴 적용
     */
    private async applyFallbackPattern(stage: number): Promise<void> {
        console.log(`[GameBoardAI] 스테이지 ${stage}에 폴백 패턴 적용`);
        
        // 기본적인 3매치 패턴 생성
        const fallbackResult: PatternApplicationResult = {
            success: true,
            patternsApplied: ['fallback_3match'],
            difficultyLevel: 1.0,
            expectedPlayerPerformance: 0.8
        };
        
        this.patternApplicationHistory.push(fallbackResult);
    }
    
    /**
     * [의도] 게임 상태 스냅샷 캡처
     * [책임] 현재 게임 상태를 학습 데이터로 저장
     */
    private captureGameStateSnapshot(stage: number): void {
        const snapshot: GameStateSnapshot = {
            timestamp: Date.now(),
            stageNumber: stage,
            boardState: this.gameBoard ? this.gameBoard.board : null,
            playerMoves: 0, // 실제 게임에서 추적
            currentScore: 0, // 실제 게임에서 추적
            timeElapsed: 0   // 실제 게임에서 추적
        };
        
        this.gameStateHistory.push(snapshot);
        
        // 메모리 관리를 위해 최근 100개만 유지
        if (this.gameStateHistory.length > 100) {
            this.gameStateHistory.shift();
        }
    }
    
    /**
     * [의도] 실시간 난이도 조정
     * [책임] 플레이어 성과에 따른 실시간 패턴 조정
     */
    public adjustDifficultyInRealTime(playerPerformance: number): void {
        if (!this.isRealTimeAdjustmentEnabled || !this.currentStagePattern) {
            return;
        }
        
        const expectedPerformance = this.currentStagePattern.totalLearnability;
        const performanceDelta = playerPerformance - expectedPerformance;
        
        console.log(`[GameBoardAI] 성과 비교: 예상 ${expectedPerformance}, 실제 ${playerPerformance}, 차이 ${performanceDelta}`);
        
        if (Math.abs(performanceDelta) > this.performanceThreshold) {
            if (performanceDelta > 0) {
                // 플레이어가 예상보다 잘함 - 난이도 증가
                this.increaseDifficulty();
            } else {
                // 플레이어가 예상보다 못함 - 난이도 감소
                this.decreaseDifficulty();
            }
        }
    }
    
    /**
     * [의도] 난이도 증가
     * [책임] 현재 패턴의 복잡도 증가
     */
    private increaseDifficulty(): void {
        console.log('[GameBoardAI] 난이도 증가 조정');
        // AI 생성기 설정 조정
        const currentConfig = this.aiPatternGenerator.getConfig();
        this.aiPatternGenerator.updateConfig({
            ...currentConfig,
            complexityLimit: currentConfig.complexityLimit * 1.1,
            noveltyWeight: Math.min(currentConfig.noveltyWeight * 1.2, 1.0)
        });
    }
    
    /**
     * [의도] 난이도 감소
     * [책임] 현재 패턴의 복잡도 감소
     */
    private decreaseDifficulty(): void {
        console.log('[GameBoardAI] 난이도 감소 조정');
        // AI 생성기 설정 조정
        const currentConfig = this.aiPatternGenerator.getConfig();
        this.aiPatternGenerator.updateConfig({
            ...currentConfig,
            complexityLimit: currentConfig.complexityLimit * 0.9,
            learnabilityThreshold: Math.min(currentConfig.learnabilityThreshold * 1.1, 0.8)
        });
    }
    
    /**
     * [의도] 플레이어 성과 분석
     * [책임] 게임 완료 후 학습 데이터 분석 및 프로필 업데이트
     */
    public analyzePlayerPerformance(gameResult: any): void {
        if (!this.currentStagePattern || !this.playerProfile) {
            return;
        }
        
        const performanceAnalysis = {
            expectedDifficulty: this.currentStagePattern.totalDifficulty,
            actualPerformance: gameResult.success ? 1.0 : 0.0,
            timeTaken: gameResult.timeElapsed || 0,
            hintsUsed: gameResult.hintsUsed || 0,
            mistakeCount: gameResult.mistakes || 0
        };
        
        // 패턴 적용 결과 업데이트
        const lastApplication = this.patternApplicationHistory[this.patternApplicationHistory.length - 1];
        if (lastApplication) {
            lastApplication.actualResult = {
                playerSuccess: gameResult.success,
                timeTaken: performanceAnalysis.timeTaken,
                hintsUsed: performanceAnalysis.hintsUsed,
                mistakeCount: performanceAnalysis.mistakeCount
            };
        }
        
        // 이벤트 발생
        const eventBus = EventBus.getInstance();
        eventBus.emit('ai:performance-analyzed', {
            stagePattern: this.currentStagePattern,
            performanceAnalysis,
            playerProfile: this.playerProfile
        });
        
        console.log('[GameBoardAI] 플레이어 성과 분석 완료:', performanceAnalysis);
    }
    
    /**
     * [의도] 학습 데이터 내보내기
     * [책임] 수집된 데이터를 외부 시스템으로 전달
     */
    public exportLearningData(): any {
        return {
            gameStateHistory: this.gameStateHistory,
            patternApplicationHistory: this.patternApplicationHistory,
            currentConfig: this.aiPatternGenerator ? this.aiPatternGenerator.getConfig() : null,
            exportTimestamp: Date.now()
        };
    }
    
    /**
     * [의도] 이벤트 리스너 설정
     * [책임] 게임 이벤트에 대한 AI 시스템 반응 설정
     */
    private setupEventListeners(): void {
        const eventBus = EventBus.getInstance();
        
        // 게임 완료 이벤트
        eventBus.on('game:completed', (result: any) => {
            this.analyzePlayerPerformance(result);
        });
        
        // 플레이어 행동 이벤트
        eventBus.on('player:move', (moveData: any) => {
            // 실시간 성과 추적 (향후 구현)
        });
        
        // 매치 완료 이벤트
        eventBus.on('match:completed', (matchResult: any) => {
            // 매치 기반 성과 분석 (향후 구현)
        });
        
        console.log('[GameBoardAI] 이벤트 리스너 설정 완료');
    }
    
    /**
     * [의도] 현재 패턴 정보 반환
     * [책임] 디버깅 및 UI 표시용 패턴 정보 제공
     */
    public getCurrentPatternInfo(): any {
        return {
            stagePattern: this.currentStagePattern,
            applicationHistory: this.patternApplicationHistory.slice(-5), // 최근 5개
            gameStateHistory: this.gameStateHistory.slice(-5), // 최근 5개
            isRealTimeAdjustmentEnabled: this.isRealTimeAdjustmentEnabled,
            aiConfig: this.aiPatternGenerator ? this.aiPatternGenerator.getConfig() : null
        };
    }
    
    /**
     * [의도] AI 시스템 리셋
     * [책임] 새 게임 시작 시 AI 상태 초기화
     */
    public resetAISystem(): void {
        this.currentStagePattern = null;
        this.gameStateHistory = [];
        this.patternApplicationHistory = [];
        
        console.log('[GameBoardAI] AI 시스템 리셋 완료');
    }
}