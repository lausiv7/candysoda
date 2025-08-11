/**
 * [의도] AI 패턴 생성 시스템의 패턴 뱅크 구현
 * [책임] 패턴 primitive 저장, 관리, 선택 로직
 * 99-02번 문서 기반: 학습 가능성 우선 설계로 공정한 패턴 제공
 */

import { 
    PatternPrimitive, 
    PatternTag, 
    PatternDifficulty,
    PlayerPatternData,
    SpawnRules,
    SupportSystems
} from './PatternTypes';

export class PatternBank {
    private primitives: Map<string, PatternPrimitive> = new Map();
    private patternsByTag: Map<PatternTag, PatternPrimitive[]> = new Map();
    private patternsByDifficulty: Map<PatternDifficulty, PatternPrimitive[]> = new Map();

    constructor() {
        this.initializePrimitiveBank();
        this.buildIndices();
    }

    /**
     * [의도] 99-02 문서 기반 기본 패턴 뱅크 초기화
     * [책임] 학습하기 쉬운 패턴부터 고난이도 패턴까지 체계적 구성
     */
    private initializePrimitiveBank(): void {
        const basicPatterns: PatternPrimitive[] = [
            // 학습하기 쉬운 패턴들 (learnability 0.8+)
            {
                id: 'line3_horizontal',
                tags: [PatternTag.LINE, PatternTag.COMBO_OPPORTUNITY],
                baseDifficulty: 1.2,
                learnability: 0.9,
                novelty: 0.1,
                params: { length: 3, direction: 'horizontal' },
                spawnRules: { maxSimultaneous: 2 },
                supportSystems: { visualTelegraph: true, hintAvailable: true }
            },
            {
                id: 'line3_vertical',
                tags: [PatternTag.LINE, PatternTag.COMBO_OPPORTUNITY],
                baseDifficulty: 1.2,
                learnability: 0.9,
                novelty: 0.1,
                params: { length: 3, direction: 'vertical' },
                spawnRules: { maxSimultaneous: 2 },
                supportSystems: { visualTelegraph: true, hintAvailable: true }
            },
            {
                id: 'cluster4_square',
                tags: [PatternTag.CLUSTER, PatternTag.AREA_CLEAR],
                baseDifficulty: 2.1,
                learnability: 0.8,
                novelty: 0.3,
                params: { size: 4, shape: 'square' },
                spawnRules: { requiresMinMoves: 5 },
                supportSystems: { visualTelegraph: true }
            },
            
            // 중간 난이도 패턴들 (learnability 0.5-0.7)
            {
                id: 'line5_diagonal',
                tags: [PatternTag.LINE, PatternTag.COMBO_OPPORTUNITY],
                baseDifficulty: 3.2,
                learnability: 0.7,
                novelty: 0.5,
                params: { length: 5, direction: 'diagonal' },
                spawnRules: { requiresMinMoves: 8, maxSimultaneous: 1 },
                supportSystems: { visualTelegraph: true, practiceMode: true }
            },
            {
                id: 'gravity_shift_diagonal',
                tags: [PatternTag.GRAVITY, PatternTag.TIMING_SENSITIVE],
                baseDifficulty: 4.5,
                learnability: 0.6,
                novelty: 0.7,
                params: { shiftDirection: 'diagonal', duration: 3 },
                spawnRules: { 
                    forbiddenWithTags: [PatternTag.TELEPORT], 
                    maxSimultaneous: 1 
                },
                supportSystems: { 
                    practiceMode: true, 
                    tutorialPhases: ['basic_gravity', 'timing_practice'] 
                }
            },
            
            // 고난이도 패턴들 (learnability 0.3-0.5)  
            {
                id: 'cluster9_complex',
                tags: [PatternTag.CLUSTER, PatternTag.AREA_CLEAR, PatternTag.SPATIAL_REASONING],
                baseDifficulty: 5.8,
                learnability: 0.5,
                novelty: 0.8,
                params: { size: 9, shape: 'complex' },
                spawnRules: { 
                    prerequisitePatterns: ['cluster4_square'], 
                    maxSimultaneous: 1 
                },
                supportSystems: { practiceMode: true, hintAvailable: true }
            },
            {
                id: 'teleport_maze',
                tags: [PatternTag.TELEPORT, PatternTag.SPATIAL_REASONING],
                baseDifficulty: 6.8,
                learnability: 0.4,
                novelty: 0.9,
                params: { teleportCount: 3, mazeComplexity: 'medium' },
                spawnRules: { 
                    prerequisitePatterns: ['gravity_shift_diagonal'], 
                    maxSimultaneous: 1 
                },
                supportSystems: { practiceMode: true, hintAvailable: true }
            }
        ];

        basicPatterns.forEach(pattern => {
            this.primitives.set(pattern.id, pattern);
        });
    }

    /**
     * [의도] 빠른 검색을 위한 인덱스 구축
     * [책임] 태그별, 난이도별 패턴 분류
     */
    private buildIndices(): void {
        // 태그별 인덱스 구축
        Object.values(PatternTag).forEach(tag => {
            this.patternsByTag.set(tag, []);
        });

        // 난이도별 인덱스 구축  
        Object.values(PatternDifficulty).forEach(difficulty => {
            this.patternsByDifficulty.set(difficulty, []);
        });

        // 패턴들을 인덱스에 분류
        for (const pattern of this.primitives.values()) {
            // 태그별 분류
            pattern.tags.forEach(tag => {
                this.patternsByTag.get(tag)?.push(pattern);
            });

            // 난이도별 분류
            const difficulty = this.getDifficultyCategory(pattern.baseDifficulty);
            this.patternsByDifficulty.get(difficulty)?.push(pattern);
        }
    }

    /**
     * [의도] 99-02 핵심: 학습 가능성 우선 패턴 선택
     * [책임] 플레이어 프로필에 맞는 학습 가능한 패턴들 반환
     */
    public selectLearnablePatterns(
        difficultyBudget: number, 
        playerData?: PlayerPatternData
    ): PatternPrimitive[] {
        const available = Array.from(this.primitives.values());
        const selected: PatternPrimitive[] = [];
        let remainingBudget = difficultyBudget;

        // 99-02: 학습 가능성 우선 필터링
        const learnable = available.filter(pattern => 
            this.isLearnableForPlayer(pattern, playerData)
        );

        // 학습성 기준으로 정렬 (높은 학습성 우선)
        learnable.sort((a, b) => b.learnability - a.learnability);

        // 예산 내에서 조합 규칙을 고려한 선택
        while (remainingBudget > 0 && learnable.length > 0) {
            const candidate = this.selectBestCandidate(learnable, selected, remainingBudget);
            if (candidate && candidate.baseDifficulty <= remainingBudget) {
                selected.push(candidate);
                remainingBudget -= candidate.baseDifficulty;
                learnable.splice(learnable.indexOf(candidate), 1);
            } else {
                break;
            }
        }

        return selected;
    }

    /**
     * [의도] 99-02 학습 가능성 검증
     * [책임] 플레이어가 해당 패턴을 학습할 수 있는지 판단
     */
    private isLearnableForPlayer(
        pattern: PatternPrimitive, 
        playerData?: PlayerPatternData
    ): boolean {
        if (!playerData) {
            // 신규 플레이어는 높은 학습성 패턴만 허용
            return pattern.learnability >= 0.7;
        }

        const playerExperience = playerData.seenPatterns.get(pattern.id);
        
        // 99-02: 새 패턴은 적응도에 따라 학습성 임계값 조정
        if (!playerExperience) {
            const adaptabilityThreshold = 0.6 - (playerData.adaptabilityScore * 0.3);
            return pattern.learnability >= adaptabilityThreshold;
        }

        // 이미 경험한 패턴은 마스터리 레벨에 따라 판단
        return true; // 경험한 패턴은 항상 사용 가능
    }

    /**
     * [의도] 조합 규칙을 고려한 최적 후보 선택
     * [책임] spawn rules와 combination complexity 검증
     */
    private selectBestCandidate(
        candidates: PatternPrimitive[],
        alreadySelected: PatternPrimitive[],
        remainingBudget: number
    ): PatternPrimitive | null {
        for (const candidate of candidates) {
            if (this.validateCombination(candidate, alreadySelected) && 
                candidate.baseDifficulty <= remainingBudget) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * [의도] 99-02 조합 규칙 검증
     * [책임] 패턴 간 충돌 방지 및 전제 조건 확인
     */
    private validateCombination(
        candidate: PatternPrimitive,
        selected: PatternPrimitive[]
    ): boolean {
        const rules = candidate.spawnRules;

        // 금지된 태그 조합 확인
        if (rules.forbiddenWithTags) {
            for (const selectedPattern of selected) {
                const hasConflict = rules.forbiddenWithTags.some(forbiddenTag =>
                    selectedPattern.tags.includes(forbiddenTag)
                );
                if (hasConflict) return false;
            }
        }

        // 동시 사용 개수 제한 확인
        if (rules.maxSimultaneous !== undefined) {
            const sameTypeCount = selected.filter(p => 
                p.tags.some(tag => candidate.tags.includes(tag))
            ).length;
            if (sameTypeCount >= rules.maxSimultaneous) return false;
        }

        return true;
    }

    /**
     * [의도] 난이도 수치를 카테고리로 분류
     * [책임] 패턴 난이도 분류 기준 적용
     */
    private getDifficultyCategory(difficulty: number): PatternDifficulty {
        if (difficulty <= 2.0) return PatternDifficulty.EASY;
        if (difficulty <= 4.0) return PatternDifficulty.MEDIUM; 
        if (difficulty <= 6.0) return PatternDifficulty.HARD;
        return PatternDifficulty.EXPERT;
    }

    // Public API methods
    public getPatternById(id: string): PatternPrimitive | undefined {
        return this.primitives.get(id);
    }

    public getPatternsByTag(tag: PatternTag): PatternPrimitive[] {
        return this.patternsByTag.get(tag) || [];
    }

    public getPatternsByDifficulty(difficulty: PatternDifficulty): PatternPrimitive[] {
        return this.patternsByDifficulty.get(difficulty) || [];
    }

    public getAllPatterns(): PatternPrimitive[] {
        return Array.from(this.primitives.values());
    }

    public getPatternCount(): number {
        return this.primitives.size;
    }
}