/**
 * [의도] Sweet Puzzle 적응형 난이도 조절 시스템
 * [책임] 실시간 플레이어 성과 분석 및 동적 난이도 조정, 개인화된 게임 경험 제공
 */

import { _decorator, Component } from 'cc';
import { DifficultyLevel, PlayerSkillLevel, LevelConfig, ObjectiveType } from './AILevelGenerator';

const { ccclass, property } = _decorator;

// 플레이어 성과 데이터
export interface PlayerPerformanceData {
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    recentSuccessRate: number;
    averageScore: number;
    averageTimePerLevel: number;
    boosterUsageFrequency: number;
    quitRateRecent: number;
    hintsUsed: number;
    shufflesUsed: number;
    lastPlayedDifficulty: DifficultyLevel;
    sessionStartTime: number;
    totalLevelsPlayed: number;
}

// 적응 설정
export interface AdaptationSettings {
    enableAdaptation: boolean;
    adaptationSensitivity: number;      // 0-1, 높을수록 빠른 조정
    minAdaptationThreshold: number;     // 조정 최소 임계값
    maxDifficultyChange: number;        // 한 번에 변경할 수 있는 최대 난이도 단계
    adaptationCooldown: number;         // 조정 사이 쿨다운 (ms)
    enablePredictiveAdjustment: boolean; // 예측적 조정 활성화
}

// 난이도 조정 결과
export interface DifficultyAdjustmentResult {
    previousDifficulty: DifficultyLevel;
    newDifficulty: DifficultyLevel;
    adjustmentReason: string;
    adjustmentStrength: number;         // -1 ~ 1
    confidence: number;                 // 0-1
    recommendedActions: string[];
    playerFeedback?: string;
}

// 플레이어 프로필
export interface PlayerProfile {
    playerId: string;
    skillLevel: PlayerSkillLevel;
    preferredDifficulty: DifficultyLevel;
    playStyle: 'casual' | 'strategic' | 'speedrun' | 'perfectionist';
    learningRate: number;               // 0-1
    frustrationTolerance: number;       // 0-1
    challengeSeekingLevel: number;      // 0-1
    sessionHistory: SessionData[];
    adaptationHistory: DifficultyAdjustmentResult[];
}

// 세션 데이터
export interface SessionData {
    sessionId: string;
    startTime: number;
    endTime: number;
    levelsCompleted: number;
    averageAttempts: number;
    totalScore: number;
    difficultiesPlayed: DifficultyLevel[];
    playerSatisfaction: number;         // 0-5
}

// 성과 분석 결과
export interface PerformanceAnalysis {
    overallTrend: 'improving' | 'declining' | 'stable';
    skillProgression: number;           // 0-100
    engagementLevel: number;            // 0-100
    frustractionLevel: number;          // 0-100
    optimalDifficulty: DifficultyLevel;
    recommendedObjectiveTypes: ObjectiveType[];
    strengths: string[];
    weaknesses: string[];
    insights: string[];
}

@ccclass('AdaptiveDifficultySystem')
export class AdaptiveDifficultySystem extends Component {
    @property
    private settings: AdaptationSettings = {
        enableAdaptation: true,
        adaptationSensitivity: 0.7,
        minAdaptationThreshold: 3,
        maxDifficultyChange: 1,
        adaptationCooldown: 300000, // 5분
        enablePredictiveAdjustment: true
    };
    
    private playerProfiles: Map<string, PlayerProfile> = new Map();
    private lastAdaptationTime: number = 0;
    private performanceBuffer: Map<string, PlayerPerformanceData[]> = new Map();
    
    // 싱글톤 인스턴스
    private static instance: AdaptiveDifficultySystem | null = null;
    
    protected onLoad(): void {
        if (AdaptiveDifficultySystem.instance === null) {
            AdaptiveDifficultySystem.instance = this;
            this.init();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): AdaptiveDifficultySystem {
        if (!AdaptiveDifficultySystem.instance) {
            console.error('[AdaptiveDifficultySystem] Instance not initialized yet');
            return null;
        }
        return AdaptiveDifficultySystem.instance;
    }
    
    private init(): void {
        this.loadPlayerProfiles();
        console.log('[AdaptiveDifficultySystem] 적응형 난이도 시스템 초기화 완료');
    }
    
    /**
     * [의도] 실시간 성과 데이터 업데이트
     */
    updatePlayerPerformance(playerId: string, performanceData: PlayerPerformanceData): void {
        if (!this.settings.enableAdaptation) return;
        
        // 성과 버퍼 업데이트
        if (!this.performanceBuffer.has(playerId)) {
            this.performanceBuffer.set(playerId, []);
        }
        
        const buffer = this.performanceBuffer.get(playerId)!;
        buffer.push({
            ...performanceData,
            sessionStartTime: Date.now()
        });
        
        // 버퍼 크기 제한 (최근 50개 세션)
        if (buffer.length > 50) {
            buffer.shift();
        }
        
        console.log(`[AdaptiveDifficultySystem] 플레이어 ${playerId} 성과 데이터 업데이트`);
        
        // 실시간 분석 및 조정 검토
        this.evaluateAdaptationNeed(playerId, performanceData);
    }
    
    /**
     * [의도] 난이도 조정 필요성 평가
     */
    private evaluateAdaptationNeed(playerId: string, performance: PlayerPerformanceData): void {
        const currentTime = Date.now();
        
        // 쿨다운 확인
        if (currentTime - this.lastAdaptationTime < this.settings.adaptationCooldown) {
            return;
        }
        
        const adjustmentResult = this.calculateDifficultyAdjustment(playerId, performance);
        
        if (adjustmentResult && Math.abs(adjustmentResult.adjustmentStrength) >= this.settings.minAdaptationThreshold) {
            this.applyDifficultyAdjustment(playerId, adjustmentResult);
            this.lastAdaptationTime = currentTime;
        }
    }
    
    /**
     * [의도] 난이도 조정 계산
     */
    calculateDifficultyAdjustment(playerId: string, performance: PlayerPerformanceData): DifficultyAdjustmentResult | null {
        const profile = this.getOrCreatePlayerProfile(playerId);
        const analysis = this.analyzePlayerPerformance(playerId, performance);
        
        let adjustmentStrength = 0;
        let adjustmentReason = '';
        const recommendedActions: string[] = [];
        
        // 연속 실패 분석
        if (performance.consecutiveFailures >= 3) {
            const failureWeight = Math.min(performance.consecutiveFailures / 5, 1);
            adjustmentStrength -= failureWeight * this.settings.adaptationSensitivity;
            adjustmentReason = `${performance.consecutiveFailures}번 연속 실패로 인한 난이도 하향`;
            recommendedActions.push('이동 수 증가', '힌트 제공 빈도 증가');
        }
        
        // 연속 성공 분석
        if (performance.consecutiveSuccesses >= 5) {
            const successWeight = Math.min(performance.consecutiveSuccesses / 10, 1);
            adjustmentStrength += successWeight * this.settings.adaptationSensitivity;
            adjustmentReason = `${performance.consecutiveSuccesses}번 연속 성공으로 인한 난이도 상향`;
            recommendedActions.push('목표 점수 증가', '제한 시간 단축');
        }
        
        // 최근 성공률 분석
        if (performance.recentSuccessRate < 0.3) {
            adjustmentStrength -= 0.5 * this.settings.adaptationSensitivity;
            adjustmentReason += ` (성공률 ${Math.round(performance.recentSuccessRate * 100)}%)`;
            recommendedActions.push('특수 블록 증가', '장애물 감소');
        } else if (performance.recentSuccessRate > 0.9) {
            adjustmentStrength += 0.3 * this.settings.adaptationSensitivity;
            adjustmentReason += ` (성공률 ${Math.round(performance.recentSuccessRate * 100)}%)`;
            recommendedActions.push('복잡한 목표 추가', '시간 압박 증가');
        }
        
        // 부스터 사용 빈도 분석
        if (performance.boosterUsageFrequency > 0.8) {
            adjustmentStrength -= 0.3;
            adjustmentReason += ' (높은 부스터 의존도)';
            recommendedActions.push('기본 레벨 난이도 완화');
        }
        
        // 포기율 분석
        if (performance.quitRateRecent > 0.5) {
            adjustmentStrength -= 0.4;
            adjustmentReason += ' (높은 포기율)';
            recommendedActions.push('동기부여 요소 강화', '단계별 목표 세분화');
        }
        
        // 조정 강도 제한
        adjustmentStrength = Math.max(-1, Math.min(1, adjustmentStrength));
        
        if (Math.abs(adjustmentStrength) < 0.1) {
            return null; // 조정 불필요
        }
        
        const newDifficulty = this.calculateNewDifficulty(performance.lastPlayedDifficulty, adjustmentStrength);
        
        // 신뢰도 계산
        const confidence = this.calculateAdjustmentConfidence(playerId, adjustmentStrength, analysis);
        
        return {
            previousDifficulty: performance.lastPlayedDifficulty,
            newDifficulty,
            adjustmentReason,
            adjustmentStrength,
            confidence,
            recommendedActions,
            playerFeedback: this.generatePlayerFeedback(adjustmentStrength, analysis)
        };
    }
    
    /**
     * [의도] 플레이어 성과 종합 분석
     */
    analyzePlayerPerformance(playerId: string, currentPerformance: PlayerPerformanceData): PerformanceAnalysis {
        const buffer = this.performanceBuffer.get(playerId) || [];
        const profile = this.getOrCreatePlayerProfile(playerId);
        
        // 트렌드 분석
        const recentPerformances = buffer.slice(-10);
        const trend = this.calculatePerformanceTrend(recentPerformances);
        
        // 스킬 진행도 계산
        const skillProgression = this.calculateSkillProgression(buffer, profile);
        
        // 참여도 및 좌절감 계산
        const engagementLevel = this.calculateEngagementLevel(currentPerformance, profile);
        const frustrationLevel = this.calculateFrustrationLevel(currentPerformance, buffer);
        
        // 최적 난이도 추정
        const optimalDifficulty = this.estimateOptimalDifficulty(skillProgression, profile, currentPerformance);
        
        // 추천 목표 타입
        const recommendedObjectiveTypes = this.recommendObjectiveTypes(profile, currentPerformance);
        
        // 강점과 약점 분석
        const { strengths, weaknesses } = this.analyzePlayerStrengthsWeaknesses(buffer, profile);
        
        // 인사이트 생성
        const insights = this.generatePerformanceInsights(trend, skillProgression, engagementLevel, frustrationLevel);
        
        return {
            overallTrend: trend,
            skillProgression,
            engagementLevel,
            frustractionLevel: frustrationLevel,
            optimalDifficulty,
            recommendedObjectiveTypes,
            strengths,
            weaknesses,
            insights
        };
    }
    
    /**
     * [의도] 예측적 난이도 조정
     */
    predictiveDifficultyAdjustment(playerId: string, nextLevelType: ObjectiveType): LevelConfig | null {
        if (!this.settings.enablePredictiveAdjustment) return null;
        
        const profile = this.getOrCreatePlayerProfile(playerId);
        const buffer = this.performanceBuffer.get(playerId) || [];
        
        if (buffer.length < 5) return null; // 데이터 부족
        
        // 플레이어의 다음 레벨 성과 예측
        const predictedPerformance = this.predictNextLevelPerformance(buffer, nextLevelType);
        
        // 예측 성과가 좋지 않으면 사전 조정
        if (predictedPerformance.expectedSuccessRate < 0.4) {
            console.log(`[AdaptiveDifficultySystem] 예측적 난이도 하향 조정 (예상 성공률: ${Math.round(predictedPerformance.expectedSuccessRate * 100)}%)`);
            
            return this.generatePreAdjustedLevel(profile, nextLevelType, -0.3);
        }
        
        // 예측 성과가 너무 좋으면 도전 증가
        if (predictedPerformance.expectedSuccessRate > 0.95) {
            console.log(`[AdaptiveDifficultySystem] 예측적 난이도 상향 조정 (예상 성공률: ${Math.round(predictedPerformance.expectedSuccessRate * 100)}%)`);
            
            return this.generatePreAdjustedLevel(profile, nextLevelType, 0.2);
        }
        
        return null; // 조정 불필요
    }
    
    /**
     * [의도] 플레이어 만족도 피드백 처리
     */
    processSatisfactionFeedback(playerId: string, satisfactionLevel: number, feedback?: string): void {
        const profile = this.getOrCreatePlayerProfile(playerId);
        
        // 최근 세션에 만족도 기록
        if (profile.sessionHistory.length > 0) {
            const lastSession = profile.sessionHistory[profile.sessionHistory.length - 1];
            lastSession.playerSatisfaction = satisfactionLevel;
        }
        
        // 만족도 기반 적응 설정 조정
        if (satisfactionLevel <= 2) {
            // 매우 불만족 - 적응 민감도 증가
            this.settings.adaptationSensitivity = Math.min(1.0, this.settings.adaptationSensitivity + 0.1);
            console.log(`[AdaptiveDifficultySystem] 플레이어 불만족으로 인한 적응 민감도 증가: ${this.settings.adaptationSensitivity}`);
        } else if (satisfactionLevel >= 4) {
            // 매우 만족 - 현재 설정 유지 또는 약간 감소
            this.settings.adaptationSensitivity = Math.max(0.3, this.settings.adaptationSensitivity - 0.05);
        }
        
        // 피드백 텍스트 분석 (간단한 키워드 분석)
        if (feedback) {
            this.analyzeFeedbackText(playerId, feedback);
        }
    }
    
    // === Private Helper Methods ===
    
    private applyDifficultyAdjustment(playerId: string, adjustment: DifficultyAdjustmentResult): void {
        const profile = this.getOrCreatePlayerProfile(playerId);
        
        // 프로필에 조정 이력 기록
        profile.adaptationHistory.push(adjustment);
        
        // 적응 이력 크기 제한
        if (profile.adaptationHistory.length > 20) {
            profile.adaptationHistory.shift();
        }
        
        console.log(`[AdaptiveDifficultySystem] 플레이어 ${playerId} 난이도 조정:`, adjustment);
        
        // 실제 게임에서는 다음 레벨 생성 시 이 조정 사항을 반영
        this.savePlayerProfile(profile);
    }
    
    private calculateNewDifficulty(currentDifficulty: DifficultyLevel, adjustmentStrength: number): DifficultyLevel {
        const difficulties = [
            DifficultyLevel.TUTORIAL,
            DifficultyLevel.EASY,
            DifficultyLevel.MEDIUM,
            DifficultyLevel.HARD,
            DifficultyLevel.EXPERT,
            DifficultyLevel.NIGHTMARE
        ];
        
        const currentIndex = difficulties.indexOf(currentDifficulty);
        const adjustmentSteps = Math.round(adjustmentStrength * this.settings.maxDifficultyChange);
        const newIndex = Math.max(0, Math.min(difficulties.length - 1, currentIndex + adjustmentSteps));
        
        return difficulties[newIndex];
    }
    
    private calculateAdjustmentConfidence(playerId: string, adjustmentStrength: number, analysis: PerformanceAnalysis): number {
        const buffer = this.performanceBuffer.get(playerId) || [];
        
        let confidence = 0.5; // 기본 신뢰도
        
        // 데이터 양에 따른 신뢰도
        if (buffer.length >= 20) confidence += 0.3;
        else if (buffer.length >= 10) confidence += 0.2;
        else if (buffer.length >= 5) confidence += 0.1;
        
        // 트렌드 일관성에 따른 신뢰도
        if (analysis.overallTrend !== 'stable') {
            confidence += 0.2;
        }
        
        // 조정 강도에 따른 신뢰도 (극단적 조정은 신뢰도 감소)
        if (Math.abs(adjustmentStrength) > 0.8) {
            confidence -= 0.2;
        }
        
        return Math.max(0, Math.min(1, confidence));
    }
    
    private generatePlayerFeedback(adjustmentStrength: number, analysis: PerformanceAnalysis): string {
        if (adjustmentStrength < -0.5) {
            return '레벨이 조금 쉬워집니다. 더 재미있게 플레이하세요!';
        } else if (adjustmentStrength < -0.2) {
            return '약간의 도움을 드리겠습니다. 계속 도전하세요!';
        } else if (adjustmentStrength > 0.5) {
            return '실력이 늘었네요! 더 도전적인 레벨을 준비했습니다.';
        } else if (adjustmentStrength > 0.2) {
            return '좋은 실력이에요! 난이도를 조금 올려보겠습니다.';
        } else {
            return '현재 난이도가 딱 맞는 것 같습니다. 계속 즐겨주세요!';
        }
    }
    
    private calculatePerformanceTrend(recentPerformances: PlayerPerformanceData[]): 'improving' | 'declining' | 'stable' {
        if (recentPerformances.length < 3) return 'stable';
        
        const recent = recentPerformances.slice(-3);
        const earlier = recentPerformances.slice(-6, -3);
        
        if (earlier.length === 0) return 'stable';
        
        const recentAvg = recent.reduce((sum, p) => sum + p.recentSuccessRate, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, p) => sum + p.recentSuccessRate, 0) / earlier.length;
        
        const improvement = recentAvg - earlierAvg;
        
        if (improvement > 0.1) return 'improving';
        if (improvement < -0.1) return 'declining';
        return 'stable';
    }
    
    private calculateSkillProgression(buffer: PlayerPerformanceData[], profile: PlayerProfile): number {
        if (buffer.length < 5) return 50; // 기본값
        
        const early = buffer.slice(0, Math.floor(buffer.length / 2));
        const recent = buffer.slice(Math.floor(buffer.length / 2));
        
        const earlySuccessRate = early.reduce((sum, p) => sum + p.recentSuccessRate, 0) / early.length;
        const recentSuccessRate = recent.reduce((sum, p) => sum + p.recentSuccessRate, 0) / recent.length;
        
        const baseProgression = 50;
        const improvement = (recentSuccessRate - earlySuccessRate) * 100;
        
        return Math.max(0, Math.min(100, baseProgression + improvement));
    }
    
    private calculateEngagementLevel(performance: PlayerPerformanceData, profile: PlayerProfile): number {
        let engagement = 50;
        
        // 세션 시간 분석
        const sessionDuration = Date.now() - performance.sessionStartTime;
        if (sessionDuration > 600000) engagement += 20; // 10분 이상
        if (sessionDuration > 1800000) engagement += 10; // 30분 이상
        
        // 레벨 완료 수
        if (performance.totalLevelsPlayed > 5) engagement += 15;
        if (performance.totalLevelsPlayed > 10) engagement += 10;
        
        // 포기율 역산
        engagement -= performance.quitRateRecent * 30;
        
        return Math.max(0, Math.min(100, engagement));
    }
    
    private calculateFrustrationLevel(performance: PlayerPerformanceData, buffer: PlayerPerformanceData[]): number {
        let frustration = 0;
        
        // 연속 실패
        frustration += performance.consecutiveFailures * 10;
        
        // 부스터 남용
        if (performance.boosterUsageFrequency > 0.7) frustration += 20;
        
        // 힌트 남용
        if (performance.hintsUsed > 3) frustration += 15;
        
        // 포기율
        frustration += performance.quitRateRecent * 25;
        
        return Math.max(0, Math.min(100, frustration));
    }
    
    private estimateOptimalDifficulty(skillProgression: number, profile: PlayerProfile, performance: PlayerPerformanceData): DifficultyLevel {
        // 스킬 진행도 기반 기본 난이도
        let baseLevel = DifficultyLevel.EASY;
        
        if (skillProgression >= 80) baseLevel = DifficultyLevel.EXPERT;
        else if (skillProgression >= 65) baseLevel = DifficultyLevel.HARD;
        else if (skillProgression >= 45) baseLevel = DifficultyLevel.MEDIUM;
        else if (skillProgression >= 25) baseLevel = DifficultyLevel.EASY;
        else baseLevel = DifficultyLevel.TUTORIAL;
        
        // 성과에 따른 조정
        if (performance.recentSuccessRate < 0.3) {
            baseLevel = this.decreaseDifficulty(baseLevel);
        } else if (performance.recentSuccessRate > 0.9) {
            baseLevel = this.increaseDifficulty(baseLevel);
        }
        
        return baseLevel;
    }
    
    private recommendObjectiveTypes(profile: PlayerProfile, performance: PlayerPerformanceData): ObjectiveType[] {
        const recommendations: ObjectiveType[] = [];
        
        // 성공률에 따른 추천
        if (performance.recentSuccessRate > 0.8) {
            recommendations.push(ObjectiveType.TIME_CHALLENGE, ObjectiveType.CLEAR_OBSTACLES);
        } else {
            recommendations.push(ObjectiveType.SCORE, ObjectiveType.COLLECTION);
        }
        
        // 플레이 스타일에 따른 추천
        if (profile.playStyle === 'strategic') {
            recommendations.push(ObjectiveType.CLEAR_OBSTACLES, ObjectiveType.BRING_DOWN);
        } else if (profile.playStyle === 'speedrun') {
            recommendations.push(ObjectiveType.TIME_CHALLENGE);
        }
        
        return [...new Set(recommendations)]; // 중복 제거
    }
    
    private analyzePlayerStrengthsWeaknesses(buffer: PlayerPerformanceData[], profile: PlayerProfile): { strengths: string[]; weaknesses: string[] } {
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        
        if (buffer.length < 3) return { strengths, weaknesses };
        
        const avgSuccessRate = buffer.reduce((sum, p) => sum + p.recentSuccessRate, 0) / buffer.length;
        const avgBoosterUsage = buffer.reduce((sum, p) => sum + p.boosterUsageFrequency, 0) / buffer.length;
        
        if (avgSuccessRate > 0.7) {
            strengths.push('높은 레벨 완주율');
        } else if (avgSuccessRate < 0.4) {
            weaknesses.push('레벨 완주에 어려움');
        }
        
        if (avgBoosterUsage < 0.3) {
            strengths.push('부스터 없이도 좋은 실력');
        } else if (avgBoosterUsage > 0.7) {
            weaknesses.push('부스터 의존도 높음');
        }
        
        return { strengths, weaknesses };
    }
    
    private generatePerformanceInsights(trend: string, skillProgression: number, engagement: number, frustration: number): string[] {
        const insights: string[] = [];
        
        if (trend === 'improving') {
            insights.push('실력이 꾸준히 향상되고 있습니다');
        } else if (trend === 'declining') {
            insights.push('최근 어려움을 겪고 있는 것 같습니다');
        }
        
        if (engagement > 70) {
            insights.push('게임에 대한 몰입도가 매우 높습니다');
        }
        
        if (frustration > 60) {
            insights.push('최근 좌절감이 높아 보입니다. 난이도 조정을 고려하세요');
        }
        
        if (skillProgression > 80) {
            insights.push('전문가 수준의 실력을 보여주고 있습니다');
        }
        
        return insights;
    }
    
    private predictNextLevelPerformance(buffer: PlayerPerformanceData[], nextLevelType: ObjectiveType): { expectedSuccessRate: number; confidence: number } {
        // 간단한 선형 회귀를 통한 예측 (실제로는 더 복잡한 ML 모델 사용 가능)
        const recentBuffer = buffer.slice(-5);
        
        if (recentBuffer.length < 3) {
            return { expectedSuccessRate: 0.5, confidence: 0.3 };
        }
        
        const avgSuccessRate = recentBuffer.reduce((sum, p) => sum + p.recentSuccessRate, 0) / recentBuffer.length;
        const trend = this.calculatePerformanceTrend(recentBuffer);
        
        let expectedRate = avgSuccessRate;
        
        if (trend === 'improving') {
            expectedRate += 0.1;
        } else if (trend === 'declining') {
            expectedRate -= 0.1;
        }
        
        const confidence = recentBuffer.length / 5; // 데이터가 많을수록 신뢰도 증가
        
        return {
            expectedSuccessRate: Math.max(0, Math.min(1, expectedRate)),
            confidence: Math.max(0.3, Math.min(1, confidence))
        };
    }
    
    private generatePreAdjustedLevel(profile: PlayerProfile, objectiveType: ObjectiveType, adjustment: number): LevelConfig {
        // 이 메서드는 AILevelGenerator와 연동되어야 함
        // 간단한 조정 예시만 표시
        const baseDifficulty = profile.preferredDifficulty;
        const adjustedDifficulty = adjustment > 0 ? this.increaseDifficulty(baseDifficulty) : this.decreaseDifficulty(baseDifficulty);
        
        return {
            id: `adaptive_${Date.now()}`,
            worldId: 'adaptive',
            levelNumber: 1,
            boardSize: { width: 8, height: 8 },
            initialLayout: [],
            objectives: [{
                type: objectiveType,
                target: 'adaptive_target',
                quantity: 1000,
                description: '적응형 목표',
                priority: 10
            }],
            maxMoves: 20,
            starThresholds: {
                oneStar: 800,
                twoStar: 1600,
                threeStar: 2400
            },
            difficulty: adjustedDifficulty,
            estimatedPlayTime: 180,
            aiGenerated: true,
            createdAt: new Date().toISOString(),
            validationScore: 75,
            balanceScore: 75,
            funScore: 75
        };
    }
    
    private analyzeFeedbackText(playerId: string, feedback: string): void {
        const lowercaseFeedback = feedback.toLowerCase();
        
        // 간단한 키워드 분석
        if (lowercaseFeedback.includes('어려운') || lowercaseFeedback.includes('힘든')) {
            this.settings.adaptationSensitivity = Math.min(1.0, this.settings.adaptationSensitivity + 0.05);
        }
        
        if (lowercaseFeedback.includes('쉬운') || lowercaseFeedback.includes('간단한')) {
            this.settings.adaptationSensitivity = Math.min(1.0, this.settings.adaptationSensitivity + 0.05);
        }
        
        if (lowercaseFeedback.includes('재미없') || lowercaseFeedback.includes('지루한')) {
            // 재미 요소 강화 필요 (실제로는 게임 메커니즘 조정)
            console.log(`[AdaptiveDifficultySystem] 플레이어 ${playerId} 재미 요소 개선 필요`);
        }
    }
    
    private getOrCreatePlayerProfile(playerId: string): PlayerProfile {
        if (!this.playerProfiles.has(playerId)) {
            const newProfile: PlayerProfile = {
                playerId,
                skillLevel: PlayerSkillLevel.BEGINNER,
                preferredDifficulty: DifficultyLevel.EASY,
                playStyle: 'casual',
                learningRate: 0.5,
                frustrationTolerance: 0.5,
                challengeSeekingLevel: 0.5,
                sessionHistory: [],
                adaptationHistory: []
            };
            this.playerProfiles.set(playerId, newProfile);
        }
        
        return this.playerProfiles.get(playerId)!;
    }
    
    private loadPlayerProfiles(): void {
        // 실제로는 파일이나 DB에서 로드
        console.log('[AdaptiveDifficultySystem] 플레이어 프로필 로드 완료');
    }
    
    private savePlayerProfile(profile: PlayerProfile): void {
        // 실제로는 파일이나 DB에 저장
        this.playerProfiles.set(profile.playerId, profile);
    }
    
    private increaseDifficulty(current: DifficultyLevel): DifficultyLevel {
        const levels = [DifficultyLevel.TUTORIAL, DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD, DifficultyLevel.EXPERT, DifficultyLevel.NIGHTMARE];
        const currentIndex = levels.indexOf(current);
        return levels[Math.min(levels.length - 1, currentIndex + 1)];
    }
    
    private decreaseDifficulty(current: DifficultyLevel): DifficultyLevel {
        const levels = [DifficultyLevel.TUTORIAL, DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD, DifficultyLevel.EXPERT, DifficultyLevel.NIGHTMARE];
        const currentIndex = levels.indexOf(current);
        return levels[Math.max(0, currentIndex - 1)];
    }
}