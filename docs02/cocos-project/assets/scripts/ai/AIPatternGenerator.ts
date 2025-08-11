/**
 * [의도] AI 기반 퍼즐 패턴 생성기 핵심 구현
 * [책임] 99-02 문서 설계를 바탕으로 학습 가능한 개인화 패턴 생성
 * Sweet Puzzle 기존 게임보드와 호환되는 패턴 데이터 생성
 */

import { PatternBank } from './PatternBank';
import { 
    PatternPrimitive, 
    StagePattern, 
    PlayerPatternData,
    PatternTag 
} from './PatternTypes';

export interface PlayerProfile {
    id: string;
    totalGamesPlayed: number;
    averageScore: number;
    currentSkillLevel: number;        // 0~1
    patternData?: PlayerPatternData;
    recentPerformance: number[];      // 최근 5게임 성과
}

export interface StageRequirement {
    stage: number;
    targetDifficulty: number;
    targetWinRate: number;    // 99-01 문서 기반 구간별 목표 승률
    minPatterns: number;
    maxPatterns: number;
}

export interface GenerationConfig {
    noveltyWeight: number;        // 0~1, 새로운 패턴 선호도
    learnabilityThreshold: number; // 0~1, 최소 학습성 요구
    adaptabilityBonus: number;    // 0~1, 플레이어 적응도 보너스
    complexityLimit: number;      // 최대 조합 복잡도
}

export class AIPatternGenerator {
    private patternBank: PatternBank;
    private rng: any; // SeededRandom 구현 필요시 확장
    private config: GenerationConfig;

    constructor() {
        this.patternBank = new PatternBank();
        this.config = {
            noveltyWeight: 0.2,        // 99-02 권장값
            learnabilityThreshold: 0.3,
            adaptabilityBonus: 0.3,
            complexityLimit: 8.0
        };
    }

    /**
     * [의도] 99-02 핵심: 학습 가능성 중심 스테이지 패턴 생성
     * [책임] 플레이어 맞춤형 패턴 조합으로 공정한 도전 제공
     */
    public generateStagePattern(
        stage: number, 
        playerProfile: PlayerProfile, 
        seed?: string
    ): StagePattern {
        // 시드 기반 난수 생성기 초기화 (재현 가능한 패턴을 위해)
        this.initializeRNG(seed || this.generateSeed(stage, playerProfile.id));

        // 99-01 문서 기반 스테이지 요구사항 계산
        const requirement = this.computeStageRequirement(stage, playerProfile);
        
        // 99-02: 플레이어 적응도 기반 난이도 조정
        const personalizedDifficulty = this.computePersonalizedDifficulty(
            requirement.targetDifficulty, 
            playerProfile
        );

        // 학습 가능한 패턴들 선택
        const selectedPatterns = this.selectOptimalPatterns(
            personalizedDifficulty,
            playerProfile,
            requirement
        );

        // 99-02: 학습 가능성 보장 검증
        const validatedPatterns = this.ensureLearnability(selectedPatterns, playerProfile);
        
        // 조합 복잡도 검증
        const finalPatterns = this.validateCombinationComplexity(validatedPatterns, playerProfile);

        // 스테이지 패턴 조립
        return this.assembleStagePattern(finalPatterns, stage, seed || '');
    }

    /**
     * [의도] 99-01 문서 기반 구간별 스테이지 요구사항 계산
     * [책임] 공정한 난이도 곡선에 따른 목표 승률과 난이도 설정
     */
    private computeStageRequirement(stage: number, playerProfile: PlayerProfile): StageRequirement {
        // 99-01 구간별 목표 승률
        let targetWinRate: number;
        let baseDifficulty: number;

        if (stage <= 5) {
            // 튜토리얼 구간: 80-95%
            targetWinRate = 0.80 + (Math.random() * 0.15);
            baseDifficulty = 2.0 + (stage - 1) * 0.3;
        } else if (stage <= 20) {
            // 첫 과금 포인트: 55-75%
            targetWinRate = 0.55 + (Math.random() * 0.20);
            baseDifficulty = 3.5 + (stage - 6) * 0.4;
        } else if (stage <= 40) {
            // 장비 강화 필요: 40-60%
            targetWinRate = 0.40 + (Math.random() * 0.20);
            baseDifficulty = 6.0 + (stage - 21) * 0.3;
        } else {
            // 엔드게임: 35-50%
            targetWinRate = 0.35 + (Math.random() * 0.15);
            baseDifficulty = 10.0 + (stage - 41) * 0.2;
        }

        return {
            stage,
            targetDifficulty: baseDifficulty,
            targetWinRate,
            minPatterns: 1,
            maxPatterns: Math.min(3, Math.floor(stage / 5) + 1)
        };
    }

    /**
     * [의도] 99-02 개인화 난이도 계산
     * [책임] 플레이어 적응도와 학습 능력을 반영한 맞춤형 난이도 조정
     */
    private computePersonalizedDifficulty(
        baseDifficulty: number, 
        playerProfile: PlayerProfile
    ): number {
        const patternData = playerProfile.patternData;
        if (!patternData) {
            // 신규 플레이어는 기본 난이도의 80%로 시작
            return baseDifficulty * 0.8;
        }

        // 99-02: 플레이어 적응도 반영
        const adaptabilityFactor = 0.7 + (patternData.adaptabilityScore * 0.6);
        const complexityFactor = Math.min(patternData.maxHandledComplexity / 5.0, 1.5);
        
        // 최근 성과 반영
        const recentPerformanceAvg = this.calculateRecentPerformanceAverage(playerProfile);
        const performanceFactor = 0.8 + (recentPerformanceAvg * 0.4);

        // 개인화된 난이도 계산
        let personalizedDifficulty = baseDifficulty * adaptabilityFactor * complexityFactor * performanceFactor;
        
        // 99-02: 안전 범위 내로 제한 (기본 난이도의 50% ~ 150%)
        personalizedDifficulty = Math.max(
            baseDifficulty * 0.5, 
            Math.min(personalizedDifficulty, baseDifficulty * 1.5)
        );

        return personalizedDifficulty;
    }

    /**
     * [의도] 최적 패턴 조합 선택
     * [책임] 난이도 예산 내에서 학습 가능한 최적 패턴들 선택
     */
    private selectOptimalPatterns(
        targetDifficulty: number,
        playerProfile: PlayerProfile,
        requirement: StageRequirement
    ): PatternPrimitive[] {
        // PatternBank에서 학습 가능한 패턴들 선택
        const candidates = this.patternBank.selectLearnablePatterns(
            targetDifficulty, 
            playerProfile.patternData
        );

        // 99-02: 신규성과 학습성 균형 최적화
        const optimizedSelection = this.optimizePatternBalance(
            candidates,
            targetDifficulty,
            playerProfile
        );

        // 패턴 개수 제한 적용
        return optimizedSelection.slice(0, requirement.maxPatterns);
    }

    /**
     * [의도] 99-02 신규성과 학습성의 균형 최적화
     * [책임] 플레이어가 지루하지 않으면서도 학습 가능한 패턴 조합 선택
     */
    private optimizePatternBalance(
        candidates: PatternPrimitive[],
        targetDifficulty: number,
        playerProfile: PlayerProfile
    ): PatternPrimitive[] {
        const optimized: PatternPrimitive[] = [];
        let remainingBudget = targetDifficulty;

        // 학습성과 신규성을 고려한 점수 계산
        const scoredPatterns = candidates.map(pattern => ({
            pattern,
            score: this.calculatePatternScore(pattern, playerProfile)
        })).sort((a, b) => b.score - a.score);

        for (const { pattern } of scoredPatterns) {
            if (pattern.baseDifficulty <= remainingBudget) {
                optimized.push(pattern);
                remainingBudget -= pattern.baseDifficulty;
            }
        }

        return optimized;
    }

    /**
     * [의도] 패턴 점수 계산 (학습성 + 신규성 + 플레이어 선호도)
     * [책임] 99-02 기준에 따른 종합적 패턴 평가
     */
    private calculatePatternScore(pattern: PatternPrimitive, playerProfile: PlayerProfile): number {
        let score = 0;

        // 기본 학습성 점수 (높을수록 좋음)
        score += pattern.learnability * 40;

        // 99-02: 신규성 점수 (적절한 신규성 선호)
        score += pattern.novelty * this.config.noveltyWeight * 30;

        // 플레이어 경험 반영
        const patternData = playerProfile.patternData;
        if (patternData) {
            const experience = patternData.seenPatterns.get(pattern.id);
            if (!experience) {
                // 새로운 패턴: 적응도에 따라 점수 조정
                score += patternData.adaptabilityScore * 20;
            } else {
                // 경험 있는 패턴: 마스터리 레벨에 따라 점수 조정
                const masteryBonus = {
                    'novice': 5,
                    'learning': 10,
                    'competent': 15,
                    'master': 25
                };
                score += masteryBonus[experience.masteryLevel] || 5;
            }

            // 선호 태그 보너스
            const preferredTagBonus = pattern.tags.filter(tag => 
                patternData.preferredPatternTags.includes(tag)
            ).length * 8;
            score += preferredTagBonus;
        }

        return score;
    }

    /**
     * [의도] 99-02 학습 가능성 보장
     * [책임] 선택된 패턴들이 플레이어가 학습할 수 있는 수준인지 최종 검증
     */
    private ensureLearnability(
        patterns: PatternPrimitive[], 
        playerProfile: PlayerProfile
    ): PatternPrimitive[] {
        if (patterns.length === 0) {
            // 패턴이 없는 경우 기본 쉬운 패턴 하나 추가
            const easyPattern = this.patternBank.getAllPatterns().find(p => p.learnability >= 0.8);
            return easyPattern ? [easyPattern] : patterns;
        }

        const ensured = [...patterns];

        // 99-02: 전체 조합의 평균 학습성 검증
        const averageLearnability = patterns.reduce((sum, p) => sum + p.learnability, 0) / patterns.length;
        const minRequiredLearnability = playerProfile.patternData 
            ? this.config.learnabilityThreshold 
            : 0.7; // 신규 플레이어는 더 높은 학습성 요구

        if (averageLearnability < minRequiredLearnability) {
            // 학습성이 부족한 경우, 가장 어려운 패턴을 더 쉬운 것으로 교체
            ensured.sort((a, b) => a.learnability - b.learnability);
            const hardestPattern = ensured[0];
            
            // 더 학습하기 쉬운 대체 패턴 찾기
            const easierAlternative = this.patternBank.getAllPatterns().find(p => 
                p.learnability > hardestPattern.learnability + 0.1 && // 임계값 완화
                p.baseDifficulty <= hardestPattern.baseDifficulty * 1.2 // 난이도 범위 확장
            );

            if (easierAlternative) {
                ensured[0] = easierAlternative;
            } else {
                // 대체 패턴을 찾지 못한 경우, 가장 학습하기 쉬운 패턴으로 교체
                const easiestPattern = this.patternBank.getAllPatterns()
                    .sort((a, b) => b.learnability - a.learnability)[0];
                if (easiestPattern && easiestPattern.learnability > hardestPattern.learnability) {
                    ensured[0] = easiestPattern;
                }
            }
        }

        return ensured;
    }

    /**
     * [의도] 조합 복잡도 검증 및 조정
     * [책임] 패턴들의 조합이 플레이어에게 과도하지 않은지 확인
     */
    private validateCombinationComplexity(
        patterns: PatternPrimitive[], 
        playerProfile: PlayerProfile
    ): PatternPrimitive[] {
        const combinationComplexity = this.calculateCombinationComplexity(patterns);
        const playerComplexityLimit = playerProfile.patternData?.maxHandledComplexity || 3.0;

        if (combinationComplexity > playerComplexityLimit) {
            // 복잡도가 너무 높은 경우, 패턴 수 줄이기
            return this.simplifyCombination(patterns, playerComplexityLimit);
        }

        return patterns;
    }

    /**
     * [의도] 조합 복잡도 계산
     * [책임] 여러 패턴이 함께 사용될 때의 복잡성 정량화
     */
    private calculateCombinationComplexity(patterns: PatternPrimitive[]): number {
        let complexity = 0;
        
        // 기본 난이도 합계
        complexity += patterns.reduce((sum, p) => sum + p.baseDifficulty, 0);
        
        // 서로 다른 태그 조합의 복잡성 추가
        const uniqueTags = new Set<PatternTag>();
        patterns.forEach(p => p.tags.forEach(tag => uniqueTags.add(tag)));
        complexity += uniqueTags.size * 0.5;
        
        // 동시성 페널티 (패턴이 많을수록 복잡)
        complexity += patterns.length * 0.3;

        return complexity;
    }

    /**
     * [의도] 복잡한 조합을 단순화
     * [책임] 플레이어 한계 내로 패턴 조합 복잡도 조정
     */
    private simplifyCombination(
        patterns: PatternPrimitive[], 
        maxComplexity: number
    ): PatternPrimitive[] {
        // 학습성이 높은 패턴들을 우선으로 유지
        const sortedByLearnability = [...patterns].sort((a, b) => b.learnability - a.learnability);
        const simplified: PatternPrimitive[] = [];
        let currentComplexity = 0;

        for (const pattern of sortedByLearnability) {
            const newComplexity = this.calculateCombinationComplexity([...simplified, pattern]);
            if (newComplexity <= maxComplexity) {
                simplified.push(pattern);
                currentComplexity = newComplexity;
            }
        }

        return simplified.length > 0 ? simplified : [sortedByLearnability[0]]; // 최소 1개는 유지
    }

    /**
     * [의도] 최종 스테이지 패턴 조립
     * [책임] 검증된 패턴들을 StagePattern 객체로 구성
     */
    private assembleStagePattern(
        patterns: PatternPrimitive[], 
        stage: number, 
        seed: string
    ): StagePattern {
        const totalDifficulty = patterns.reduce((sum, p) => sum + p.baseDifficulty, 0);
        const totalLearnability = patterns.reduce((sum, p) => sum + p.learnability, 0) / patterns.length;
        const combinationComplexity = this.calculateCombinationComplexity(patterns);

        return {
            id: `stage-${stage}-${seed.substring(0, 8)}`,
            primitives: patterns,
            totalDifficulty,
            totalLearnability,
            combinationComplexity,
            seed,
            stageNumber: stage
        };
    }

    // 유틸리티 메서드들

    private initializeRNG(seed: string): void {
        // 간단한 시드 기반 의사 난수 생성기
        // 실제 구현에서는 더 정교한 RNG 사용 권장
        this.rng = {
            seed: this.hashCode(seed),
            next: function() {
                this.seed = ((this.seed * 9301 + 49297) % 233280);
                return this.seed / 233280;
            }
        };
    }

    private generateSeed(stage: number, playerId: string): string {
        return `${playerId}-${stage}-${Date.now()}`;
    }

    private hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    private calculateRecentPerformanceAverage(playerProfile: PlayerProfile): number {
        if (playerProfile.recentPerformance.length === 0) return 0.5;
        return playerProfile.recentPerformance.reduce((sum, p) => sum + p, 0) / playerProfile.recentPerformance.length;
    }

    // Public API 확장
    public updateConfig(newConfig: Partial<GenerationConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public getConfig(): GenerationConfig {
        return { ...this.config };
    }

    public getPatternBank(): PatternBank {
        return this.patternBank;
    }
}