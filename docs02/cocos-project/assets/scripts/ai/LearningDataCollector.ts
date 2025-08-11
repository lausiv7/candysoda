/**
 * [의도] AI 학습 데이터 수집 및 분석 시스템
 * [책임] 플레이어 행동, 패턴 성과, 게임 상태 데이터 수집 및 분석
 */

import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { PlayerProfile, StageRequirement } from './AIPatternGenerator';
import { StagePattern, PatternPrimitive } from './PatternTypes';

const { ccclass } = _decorator;

export interface PlayerAction {
    timestamp: number;
    actionType: 'move' | 'hint' | 'pause' | 'restart' | 'special_use';
    actionData: any;
    gameContext: {
        stage: number;
        currentScore: number;
        timeElapsed: number;
        movesRemaining: number;
        boardState?: any;
    };
}

export interface PatternPerformanceData {
    patternId: string;
    patternTags: string[];
    difficultyLevel: number;
    learnabilityScore: number;
    applicationTimestamp: number;
    
    // 플레이어 성과
    playerSuccess: boolean;
    completionTime: number;
    attemptsRequired: number;
    hintsUsed: number;
    mistakesCount: number;
    
    // 학습 지표
    learningCurve: number; // 0~1, 학습 속도
    adaptationRate: number; // 0~1, 적응 정도
    confidenceLevel: number; // 0~1, 플레이어 자신감
}

export interface GameSessionData {
    sessionId: string;
    playerId: string;
    startTimestamp: number;
    endTimestamp: number;
    
    stagesPlayed: number[];
    totalScore: number;
    totalPlayTime: number;
    
    playerActions: PlayerAction[];
    patternPerformances: PatternPerformanceData[];
    
    sessionMetrics: {
        averageCompletionTime: number;
        hintsUsageRate: number;
        mistakeRate: number;
        progressionSpeed: number;
        engagementLevel: number; // 0~1
    };
}

export interface LearningInsight {
    insightType: 'difficulty_trend' | 'pattern_preference' | 'learning_plateau' | 'engagement_drop';
    confidence: number; // 0~1
    description: string;
    recommendedAction: string;
    supportingData: any;
    generatedAt: number;
}

export interface PlayerLearningProfile {
    playerId: string;
    totalGamesPlayed: number;
    totalPlayTime: number;
    
    // 학습 특성
    dominantLearningStyle: 'visual' | 'trial_error' | 'systematic' | 'intuitive';
    preferredDifficultyProgression: 'gradual' | 'challenging' | 'varied';
    optimalSessionLength: number; // minutes
    
    // 성과 패턴
    strongPatternTypes: string[];
    weakPatternTypes: string[];
    improvementAreas: string[];
    
    // 학습 곡선 데이터
    learningCurveData: {
        stage: number;
        averagePerformance: number;
        timestamp: number;
    }[];
    
    // 개인화 추천
    recommendedSettings: {
        difficultyMultiplier: number;
        hintFrequency: number;
        patternComplexityLimit: number;
        preferredPatternTags: string[];
    };
}

@ccclass('LearningDataCollector')
export class LearningDataCollector extends Component {
    
    // 현재 세션 데이터
    private currentSession: GameSessionData | null = null;
    private sessionStartTime: number = 0;
    
    // 데이터 저장소
    private gameSessionHistory: GameSessionData[] = [];
    private playerLearningProfiles: Map<string, PlayerLearningProfile> = new Map();
    
    // 실시간 수집 중인 데이터
    private currentPlayerActions: PlayerAction[] = [];
    private currentPatternPerformances: PatternPerformanceData[] = [];
    
    // 분석 설정
    private analysisConfig = {
        sessionHistoryLimit: 100,
        actionBufferSize: 1000,
        performanceAnalysisWindow: 10, // 최근 10게임
        insightGenerationThreshold: 5   // 최소 5게임 후 인사이트 생성
    };
    
    /**
     * [의도] 학습 데이터 수집 시스템 초기화
     * [책임] 이벤트 리스너 설정, 데이터 저장소 초기화
     */
    public initialize(): void {
        this.setupEventListeners();
        this.loadStoredData();
        
        console.log('[LearningDataCollector] 학습 데이터 수집 시스템 초기화 완료');
    }
    
    /**
     * [의도] 새 게임 세션 시작
     * [책임] 세션 데이터 초기화, 수집 시작
     */
    public startGameSession(playerId: string): string {
        const sessionId = this.generateSessionId(playerId);
        this.sessionStartTime = Date.now();
        
        this.currentSession = {
            sessionId,
            playerId,
            startTimestamp: this.sessionStartTime,
            endTimestamp: 0,
            stagesPlayed: [],
            totalScore: 0,
            totalPlayTime: 0,
            playerActions: [],
            patternPerformances: [],
            sessionMetrics: {
                averageCompletionTime: 0,
                hintsUsageRate: 0,
                mistakeRate: 0,
                progressionSpeed: 0,
                engagementLevel: 0
            }
        };
        
        // 플레이어 행동 및 패턴 성과 버퍼 초기화
        this.currentPlayerActions = [];
        this.currentPatternPerformances = [];
        
        console.log(`[LearningDataCollector] 게임 세션 시작: ${sessionId}`);
        return sessionId;
    }
    
    /**
     * [의도] 플레이어 행동 기록
     * [책임] 실시간으로 플레이어의 모든 행동 수집
     */
    public recordPlayerAction(
        actionType: PlayerAction['actionType'], 
        actionData: any, 
        gameContext: PlayerAction['gameContext']
    ): void {
        const action: PlayerAction = {
            timestamp: Date.now(),
            actionType,
            actionData,
            gameContext: { ...gameContext }
        };
        
        this.currentPlayerActions.push(action);
        
        // 버퍼 크기 제한
        if (this.currentPlayerActions.length > this.analysisConfig.actionBufferSize) {
            this.currentPlayerActions.shift();
        }
        
        // 실시간 분석을 위한 이벤트 발생
        const eventBus = EventBus.getInstance();
        eventBus.emit('learning:action-recorded', action);
    }
    
    /**
     * [의도] 패턴 성과 데이터 기록
     * [책임] AI 패턴 적용 결과와 플레이어 성과 분석
     */
    public recordPatternPerformance(
        pattern: StagePattern,
        playerSuccess: boolean,
        performanceMetrics: {
            completionTime: number;
            attemptsRequired: number;
            hintsUsed: number;
            mistakesCount: number;
        }
    ): void {
        // 각 패턴 프리미티브에 대한 성과 기록
        for (const primitive of pattern.primitives) {
            const performanceData: PatternPerformanceData = {
                patternId: primitive.id,
                patternTags: [...primitive.tags],
                difficultyLevel: primitive.baseDifficulty,
                learnabilityScore: primitive.learnability,
                applicationTimestamp: Date.now(),
                
                playerSuccess,
                completionTime: performanceMetrics.completionTime,
                attemptsRequired: performanceMetrics.attemptsRequired,
                hintsUsed: performanceMetrics.hintsUsed,
                mistakesCount: performanceMetrics.mistakesCount,
                
                // 학습 지표 계산
                learningCurve: this.calculateLearningCurve(primitive.id, playerSuccess),
                adaptationRate: this.calculateAdaptationRate(primitive.tags, performanceMetrics),
                confidenceLevel: this.calculateConfidenceLevel(performanceMetrics)
            };
            
            this.currentPatternPerformances.push(performanceData);
        }
        
        console.log(`[LearningDataCollector] 패턴 성과 기록: ${pattern.primitives.length}개 프리미티브`);
    }
    
    /**
     * [의도] 스테이지 완료 기록
     * [책임] 스테이지별 성과 데이터 수집
     */
    public recordStageCompletion(
        stage: number,
        success: boolean,
        finalScore: number,
        playTime: number
    ): void {
        if (!this.currentSession) {
            console.warn('[LearningDataCollector] 활성 세션 없음');
            return;
        }
        
        this.currentSession.stagesPlayed.push(stage);
        this.currentSession.totalScore += finalScore;
        this.currentSession.totalPlayTime += playTime;
        
        // 스테이지별 학습 곡선 업데이트
        this.updateLearningCurve(this.currentSession.playerId, stage, success ? 1.0 : 0.0);
        
        console.log(`[LearningDataCollector] 스테이지 ${stage} 완료 기록: ${success ? '성공' : '실패'}`);
    }
    
    /**
     * [의도] 게임 세션 종료
     * [책임] 세션 데이터 완료, 분석 실행, 저장
     */
    public endGameSession(): GameSessionData | null {
        if (!this.currentSession) {
            console.warn('[LearningDataCollector] 종료할 활성 세션 없음');
            return null;
        }
        
        this.currentSession.endTimestamp = Date.now();
        
        // 수집된 액션과 성과 데이터를 세션에 복사
        this.currentSession.playerActions = [...this.currentPlayerActions];
        this.currentSession.patternPerformances = [...this.currentPatternPerformances];
        
        // 세션 메트릭 계산
        this.calculateSessionMetrics(this.currentSession);
        
        // 세션 히스토리에 저장
        this.gameSessionHistory.push(this.currentSession);
        
        // 히스토리 크기 제한
        if (this.gameSessionHistory.length > this.analysisConfig.sessionHistoryLimit) {
            this.gameSessionHistory.shift();
        }
        
        // 플레이어 학습 프로필 업데이트
        this.updatePlayerLearningProfile(this.currentSession);
        
        // 학습 인사이트 생성
        const insights = this.generateLearningInsights(this.currentSession.playerId);
        
        const completedSession = this.currentSession;
        this.currentSession = null;
        
        // 데이터 저장
        this.saveDataToStorage();
        
        // 이벤트 발생
        const eventBus = EventBus.getInstance();
        eventBus.emit('learning:session-completed', {
            session: completedSession,
            insights
        });
        
        console.log(`[LearningDataCollector] 게임 세션 종료: ${completedSession.sessionId}`);
        return completedSession;
    }
    
    /**
     * [의도] 학습 곡선 계산
     * [책임] 특정 패턴에 대한 플레이어의 학습 진행도 측정
     */
    private calculateLearningCurve(patternId: string, success: boolean): number {
        // 해당 패턴의 최근 성과 히스토리 조회
        const recentPerformances = this.currentPatternPerformances
            .filter(p => p.patternId === patternId)
            .slice(-5); // 최근 5회
        
        if (recentPerformances.length === 0) {
            return success ? 0.5 : 0.2; // 첫 시도 기본값
        }
        
        // 성공률과 시간 단축 경향 분석
        const successRate = recentPerformances.filter(p => p.playerSuccess).length / recentPerformances.length;
        const timeImprovement = this.calculateTimeImprovement(recentPerformances);
        
        return Math.min((successRate + timeImprovement) / 2, 1.0);
    }
    
    /**
     * [의도] 적응률 계산
     * [책임] 새로운 패턴 타입에 대한 플레이어 적응 속도 측정
     */
    private calculateAdaptationRate(patternTags: string[], metrics: any): number {
        // 해당 패턴 태그들에 대한 과거 경험 조회
        const tagExperience = patternTags.map(tag => {
            const tagPerformances = this.currentPatternPerformances
                .filter(p => p.patternTags.includes(tag));
            
            if (tagPerformances.length === 0) return 0.3; // 새로운 태그
            
            const recentAvgPerformance = tagPerformances
                .slice(-3)
                .reduce((sum, p) => sum + (p.playerSuccess ? 1 : 0), 0) / Math.min(tagPerformances.length, 3);
            
            return recentAvgPerformance;
        });
        
        const avgTagExperience = tagExperience.reduce((sum, exp) => sum + exp, 0) / tagExperience.length;
        
        // 힌트 사용량과 실수 횟수 고려
        const hintPenalty = Math.min(metrics.hintsUsed * 0.1, 0.3);
        const mistakePenalty = Math.min(metrics.mistakesCount * 0.05, 0.2);
        
        return Math.max(avgTagExperience - hintPenalty - mistakePenalty, 0);
    }
    
    /**
     * [의도] 자신감 수준 계산
     * [책임] 플레이어의 게임 플레이 자신감 측정
     */
    private calculateConfidenceLevel(metrics: any): number {
        // 빠른 완료 시간과 적은 힌트 사용은 높은 자신감을 의미
        const speedConfidence = Math.max(0, (120 - metrics.completionTime) / 120); // 2분 기준
        const hintConfidence = Math.max(0, (5 - metrics.hintsUsed) / 5); // 힌트 5개 기준
        const mistakeConfidence = Math.max(0, (3 - metrics.mistakesCount) / 3); // 실수 3번 기준
        
        return (speedConfidence + hintConfidence + mistakeConfidence) / 3;
    }
    
    /**
     * [의도] 시간 개선도 계산
     * [책임] 동일 패턴에 대한 완료 시간 개선 추이 분석
     */
    private calculateTimeImprovement(performances: PatternPerformanceData[]): number {
        if (performances.length < 2) return 0.5;
        
        const times = performances.map(p => p.completionTime);
        const firstTime = times[0];
        const lastTime = times[times.length - 1];
        
        if (firstTime <= lastTime) return 0.3; // 시간이 늘어남
        
        const improvement = (firstTime - lastTime) / firstTime;
        return Math.min(improvement, 1.0);
    }
    
    /**
     * [의도] 세션 메트릭 계산
     * [책임] 세션 전체의 종합적인 성과 지표 계산
     */
    private calculateSessionMetrics(session: GameSessionData): void {
        if (session.patternPerformances.length === 0) {
            return; // 데이터 부족
        }
        
        const performances = session.patternPerformances;
        
        // 평균 완료 시간
        session.sessionMetrics.averageCompletionTime = 
            performances.reduce((sum, p) => sum + p.completionTime, 0) / performances.length;
        
        // 힌트 사용률
        const totalHints = performances.reduce((sum, p) => sum + p.hintsUsed, 0);
        session.sessionMetrics.hintsUsageRate = totalHints / performances.length;
        
        // 실수율
        const totalMistakes = performances.reduce((sum, p) => sum + p.mistakesCount, 0);
        session.sessionMetrics.mistakeRate = totalMistakes / performances.length;
        
        // 진행 속도 (스테이지 수 / 플레이 시간(분))
        session.sessionMetrics.progressionSpeed = 
            session.stagesPlayed.length / (session.totalPlayTime / 60000);
        
        // 참여도 (성공률 + 자신감 + 적응률의 평균)
        const avgConfidence = performances.reduce((sum, p) => sum + p.confidenceLevel, 0) / performances.length;
        const avgAdaptation = performances.reduce((sum, p) => sum + p.adaptationRate, 0) / performances.length;
        const successRate = performances.filter(p => p.playerSuccess).length / performances.length;
        
        session.sessionMetrics.engagementLevel = (avgConfidence + avgAdaptation + successRate) / 3;
    }
    
    /**
     * [의도] 플레이어 학습 프로필 업데이트
     * [책임] 세션 데이터를 바탕으로 장기적인 학습 프로필 갱신
     */
    private updatePlayerLearningProfile(session: GameSessionData): void {
        let profile = this.playerLearningProfiles.get(session.playerId);
        
        if (!profile) {
            profile = this.createNewPlayerProfile(session.playerId);
        }
        
        // 게임 통계 업데이트
        profile.totalGamesPlayed += session.stagesPlayed.length;
        profile.totalPlayTime += session.totalPlayTime;
        
        // 학습 스타일 분석
        profile.dominantLearningStyle = this.analyzeLearningStyle(session);
        
        // 선호 난이도 진행 분석
        profile.preferredDifficultyProgression = this.analyzeDifficultyPreference(session);
        
        // 최적 세션 길이 계산
        profile.optimalSessionLength = Math.max(5, Math.min(session.totalPlayTime / 60000, 30));
        
        // 패턴 강점/약점 분석
        this.updatePatternStrengthsWeaknesses(profile, session.patternPerformances);
        
        // 학습 곡선 데이터 업데이트
        this.updateProfileLearningCurve(profile, session);
        
        // 개인화 추천 업데이트
        this.updatePersonalizedRecommendations(profile, session);
        
        this.playerLearningProfiles.set(session.playerId, profile);
        
        console.log(`[LearningDataCollector] 플레이어 ${session.playerId} 학습 프로필 업데이트`);
    }
    
    /**
     * [의도] 학습 인사이트 생성
     * [책임] 수집된 데이터를 분석하여 의미있는 학습 인사이트 도출
     */
    private generateLearningInsights(playerId: string): LearningInsight[] {
        const insights: LearningInsight[] = [];
        const profile = this.playerLearningProfiles.get(playerId);
        
        if (!profile || profile.totalGamesPlayed < this.analysisConfig.insightGenerationThreshold) {
            return insights; // 데이터 부족
        }
        
        // 난이도 트렌드 분석
        const difficultyInsight = this.analyzeDifficultyTrend(profile);
        if (difficultyInsight) insights.push(difficultyInsight);
        
        // 패턴 선호도 분석
        const preferenceInsight = this.analyzePatternPreference(profile);
        if (preferenceInsight) insights.push(preferenceInsight);
        
        // 학습 정체 감지
        const plateauInsight = this.detectLearningPlateau(profile);
        if (plateauInsight) insights.push(plateauInsight);
        
        // 참여도 하락 감지
        const engagementInsight = this.detectEngagementDrop(playerId);
        if (engagementInsight) insights.push(engagementInsight);
        
        console.log(`[LearningDataCollector] 플레이어 ${playerId}에 대한 ${insights.length}개 인사이트 생성`);
        return insights;
    }
    
    /**
     * [의도] 새 플레이어 프로필 생성
     * [책임] 신규 플레이어의 기본 학습 프로필 초기화
     */
    private createNewPlayerProfile(playerId: string): PlayerLearningProfile {
        return {
            playerId,
            totalGamesPlayed: 0,
            totalPlayTime: 0,
            
            dominantLearningStyle: 'trial_error',
            preferredDifficultyProgression: 'gradual',
            optimalSessionLength: 15,
            
            strongPatternTypes: [],
            weakPatternTypes: [],
            improvementAreas: [],
            
            learningCurveData: [],
            
            recommendedSettings: {
                difficultyMultiplier: 1.0,
                hintFrequency: 3,
                patternComplexityLimit: 3.0,
                preferredPatternTags: ['line', 'cluster']
            }
        };
    }
    
    /**
     * [의도] 학습 스타일 분석
     * [책임] 플레이어의 게임 플레이 패턴을 통해 학습 스타일 식별
     */
    private analyzeLearningStyle(session: GameSessionData): PlayerLearningProfile['dominantLearningStyle'] {
        const actions = session.playerActions;
        const hintsUsed = session.sessionMetrics.hintsUsageRate;
        const mistakes = session.sessionMetrics.mistakeRate;
        
        // 시각적 학습자: 힌트를 자주 사용
        if (hintsUsed > 2) return 'visual';
        
        // 체계적 학습자: 실수가 적고 일정한 패턴
        if (mistakes < 1 && session.sessionMetrics.averageCompletionTime > 60) return 'systematic';
        
        // 직관적 학습자: 빠른 완료, 적은 힌트
        if (session.sessionMetrics.averageCompletionTime < 45 && hintsUsed < 1) return 'intuitive';
        
        // 기본값: 시행착오 학습자
        return 'trial_error';
    }
    
    /**
     * [의도] 난이도 선호도 분석
     * [책임] 플레이어가 선호하는 난이도 진행 방식 식별
     */
    private analyzeDifficultyPreference(session: GameSessionData): PlayerLearningProfile['preferredDifficultyProgression'] {
        const performances = session.patternPerformances;
        
        if (performances.length === 0) return 'gradual';
        
        // 다양한 난이도 패턴에서의 성과 분석
        const difficultyRanges = {
            easy: performances.filter(p => p.difficultyLevel < 3),
            medium: performances.filter(p => p.difficultyLevel >= 3 && p.difficultyLevel < 6),
            hard: performances.filter(p => p.difficultyLevel >= 6)
        };
        
        const easySuccess = difficultyRanges.easy.length > 0 
            ? difficultyRanges.easy.filter(p => p.playerSuccess).length / difficultyRanges.easy.length 
            : 0;
        
        const hardSuccess = difficultyRanges.hard.length > 0 
            ? difficultyRanges.hard.filter(p => p.playerSuccess).length / difficultyRanges.hard.length 
            : 0;
        
        // 어려운 패턴에서도 좋은 성과를 보이면 도전적 선호
        if (hardSuccess > 0.7) return 'challenging';
        
        // 다양한 난이도에서 고른 성과를 보이면 다양성 선호
        if (Math.abs(easySuccess - hardSuccess) < 0.2) return 'varied';
        
        // 기본값: 점진적 선호
        return 'gradual';
    }
    
    /**
     * [의도] 패턴 강점/약점 업데이트
     * [책임] 패턴 유형별 성과 분석을 통한 강점/약점 식별
     */
    private updatePatternStrengthsWeaknesses(
        profile: PlayerLearningProfile, 
        performances: PatternPerformanceData[]
    ): void {
        const tagPerformanceMap = new Map<string, { success: number, total: number }>();
        
        // 태그별 성과 집계
        performances.forEach(p => {
            p.patternTags.forEach(tag => {
                if (!tagPerformanceMap.has(tag)) {
                    tagPerformanceMap.set(tag, { success: 0, total: 0 });
                }
                const tagData = tagPerformanceMap.get(tag)!;
                if (p.playerSuccess) tagData.success++;
                tagData.total++;
            });
        });
        
        // 강점/약점 분류 (성공률 기준)
        profile.strongPatternTypes = [];
        profile.weakPatternTypes = [];
        
        tagPerformanceMap.forEach((data, tag) => {
            const successRate = data.success / data.total;
            if (successRate >= 0.8) {
                profile.strongPatternTypes.push(tag);
            } else if (successRate < 0.5) {
                profile.weakPatternTypes.push(tag);
            }
        });
    }
    
    /**
     * [의도] 학습 곡선 업데이트
     * [책임] 스테이지별 학습 진행도 데이터 추가
     */
    private updateLearningCurve(playerId: string, stage: number, performance: number): void {
        const profile = this.playerLearningProfiles.get(playerId);
        if (!profile) return;
        
        profile.learningCurveData.push({
            stage,
            averagePerformance: performance,
            timestamp: Date.now()
        });
        
        // 데이터 크기 제한 (최근 50개 스테이지)
        if (profile.learningCurveData.length > 50) {
            profile.learningCurveData.shift();
        }
    }
    
    /**
     * [의도] 개인화 추천 업데이트
     * [책임] 학습 데이터를 바탕으로 개인화된 게임 설정 추천
     */
    private updatePersonalizedRecommendations(
        profile: PlayerLearningProfile, 
        session: GameSessionData
    ): void {
        const metrics = session.sessionMetrics;
        
        // 난이도 배수 조정
        if (metrics.engagementLevel > 0.8) {
            profile.recommendedSettings.difficultyMultiplier = Math.min(1.2, profile.recommendedSettings.difficultyMultiplier + 0.1);
        } else if (metrics.engagementLevel < 0.4) {
            profile.recommendedSettings.difficultyMultiplier = Math.max(0.8, profile.recommendedSettings.difficultyMultiplier - 0.1);
        }
        
        // 힌트 빈도 조정
        if (metrics.hintsUsageRate > 3) {
            profile.recommendedSettings.hintFrequency = Math.max(1, profile.recommendedSettings.hintFrequency - 1);
        } else if (metrics.hintsUsageRate < 1) {
            profile.recommendedSettings.hintFrequency = Math.min(5, profile.recommendedSettings.hintFrequency + 1);
        }
        
        // 선호 패턴 태그 업데이트
        profile.recommendedSettings.preferredPatternTags = [...profile.strongPatternTypes];
        if (profile.recommendedSettings.preferredPatternTags.length === 0) {
            profile.recommendedSettings.preferredPatternTags = ['line', 'cluster']; // 기본값
        }
    }
    
    /**
     * [의도] 난이도 트렌드 인사이트 분석
     */
    private analyzeDifficultyTrend(profile: PlayerLearningProfile): LearningInsight | null {
        if (profile.learningCurveData.length < 5) return null;
        
        const recentData = profile.learningCurveData.slice(-5);
        const trend = this.calculateTrend(recentData.map(d => d.averagePerformance));
        
        if (trend > 0.1) {
            return {
                insightType: 'difficulty_trend',
                confidence: 0.8,
                description: '플레이어의 실력이 꾸준히 향상되고 있습니다.',
                recommendedAction: '난이도를 점진적으로 증가시켜 도전 의욕을 유지하세요.',
                supportingData: { trend, recentPerformance: recentData },
                generatedAt: Date.now()
            };
        } else if (trend < -0.1) {
            return {
                insightType: 'difficulty_trend',
                confidence: 0.7,
                description: '플레이어의 성과가 하락하는 추세입니다.',
                recommendedAction: '난이도를 낮추고 지원 기능을 늘려보세요.',
                supportingData: { trend, recentPerformance: recentData },
                generatedAt: Date.now()
            };
        }
        
        return null;
    }
    
    /**
     * [의도] 패턴 선호도 인사이트 분석
     */
    private analyzePatternPreference(profile: PlayerLearningProfile): LearningInsight | null {
        if (profile.strongPatternTypes.length === 0) return null;
        
        return {
            insightType: 'pattern_preference',
            confidence: 0.9,
            description: `플레이어는 ${profile.strongPatternTypes.join(', ')} 패턴에 강점을 보입니다.`,
            recommendedAction: '강점 패턴을 활용한 새로운 도전을 제공하세요.',
            supportingData: { 
                strengths: profile.strongPatternTypes, 
                weaknesses: profile.weakPatternTypes 
            },
            generatedAt: Date.now()
        };
    }
    
    /**
     * [의도] 학습 정체 감지
     */
    private detectLearningPlateau(profile: PlayerLearningProfile): LearningInsight | null {
        if (profile.learningCurveData.length < 10) return null;
        
        const recentData = profile.learningCurveData.slice(-10);
        const variance = this.calculateVariance(recentData.map(d => d.averagePerformance));
        
        if (variance < 0.05) { // 성과가 정체된 경우
            return {
                insightType: 'learning_plateau',
                confidence: 0.7,
                description: '플레이어의 학습이 정체 상태에 있습니다.',
                recommendedAction: '새로운 패턴 유형이나 도전 과제를 도입해보세요.',
                supportingData: { variance, plateauPeriod: recentData.length },
                generatedAt: Date.now()
            };
        }
        
        return null;
    }
    
    /**
     * [의도] 참여도 하락 감지
     */
    private detectEngagementDrop(playerId: string): LearningInsight | null {
        const recentSessions = this.gameSessionHistory
            .filter(s => s.playerId === playerId)
            .slice(-3);
        
        if (recentSessions.length < 3) return null;
        
        const engagementTrend = this.calculateTrend(
            recentSessions.map(s => s.sessionMetrics.engagementLevel)
        );
        
        if (engagementTrend < -0.2) {
            return {
                insightType: 'engagement_drop',
                confidence: 0.8,
                description: '플레이어의 게임 참여도가 감소하고 있습니다.',
                recommendedAction: '게임 경험을 새롭게 하는 요소를 추가하거나 휴식을 제안하세요.',
                supportingData: { 
                    trend: engagementTrend, 
                    recentEngagement: recentSessions.map(s => s.sessionMetrics.engagementLevel) 
                },
                generatedAt: Date.now()
            };
        }
        
        return null;
    }
    
    // 유틸리티 메서드들
    
    private generateSessionId(playerId: string): string {
        return `session-${playerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    private calculateTrend(values: number[]): number {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n + 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
        const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }
    
    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }
    
    private updateProfileLearningCurve(profile: PlayerLearningProfile, session: GameSessionData): void {
        // 세션 평균 성과를 프로필에 추가
        const avgPerformance = session.sessionMetrics.engagementLevel;
        const avgStage = session.stagesPlayed.reduce((sum, stage) => sum + stage, 0) / session.stagesPlayed.length;
        
        profile.learningCurveData.push({
            stage: Math.round(avgStage),
            averagePerformance: avgPerformance,
            timestamp: Date.now()
        });
    }
    
    private setupEventListeners(): void {
        const eventBus = EventBus.getInstance();
        
        // AI 패턴 적용 이벤트
        eventBus.on('ai:pattern-applied', (data: any) => {
            // AI 패턴 적용 시 추가 데이터 수집 로직
        });
        
        // 플레이어 행동 이벤트들
        eventBus.on('player:move', (data: any) => {
            this.recordPlayerAction('move', data, data.gameContext);
        });
        
        eventBus.on('player:hint-used', (data: any) => {
            this.recordPlayerAction('hint', data, data.gameContext);
        });
        
        eventBus.on('player:game-paused', (data: any) => {
            this.recordPlayerAction('pause', data, data.gameContext);
        });
        
        console.log('[LearningDataCollector] 이벤트 리스너 설정 완료');
    }
    
    private loadStoredData(): void {
        // LocalStorage나 서버에서 저장된 데이터 로드
        // 현재는 메모리 기반으로 구현
        console.log('[LearningDataCollector] 저장된 학습 데이터 로드');
    }
    
    private saveDataToStorage(): void {
        // 수집된 데이터를 LocalStorage나 서버에 저장
        // 현재는 로그만 출력
        console.log('[LearningDataCollector] 학습 데이터 저장 완료');
    }
    
    // Public API for external access
    
    public getPlayerProfile(playerId: string): PlayerLearningProfile | null {
        return this.playerLearningProfiles.get(playerId) || null;
    }
    
    public getSessionHistory(playerId: string, limit: number = 10): GameSessionData[] {
        return this.gameSessionHistory
            .filter(s => s.playerId === playerId)
            .slice(-limit);
    }
    
    public getCurrentSessionData(): GameSessionData | null {
        return this.currentSession;
    }
    
    public exportAllData(): any {
        return {
            sessionHistory: this.gameSessionHistory,
            playerProfiles: Object.fromEntries(this.playerLearningProfiles),
            currentSession: this.currentSession,
            exportTimestamp: Date.now()
        };
    }
    
    public resetPlayerData(playerId: string): void {
        this.playerLearningProfiles.delete(playerId);
        this.gameSessionHistory = this.gameSessionHistory.filter(s => s.playerId !== playerId);
        console.log(`[LearningDataCollector] 플레이어 ${playerId} 데이터 초기화`);
    }
}