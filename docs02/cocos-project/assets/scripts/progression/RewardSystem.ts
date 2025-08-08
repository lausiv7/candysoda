/**
 * [의도] Sweet Puzzle 보상 시스템 - 일일 미션, 성취, 시즌 패스 등 모든 보상을 통합 관리
 * [책임] 동적 미션 생성, 성취 달성 추적, 보상 지급, 시즌별 콘텐츠 관리
 */

import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { CurrencyManager, CurrencyType } from './CurrencyManager';

const { ccclass, property } = _decorator;

// 보상 타입
export enum RewardType {
    COINS = 'coins',
    GEMS = 'gems',
    BOOSTERS = 'boosters',
    SPECIAL_ITEM = 'special_item',
    EXPERIENCE = 'experience',
    SPECIAL_TITLE = 'special_title',
    AVATAR_FRAME = 'avatar_frame',
    EMOJI = 'emoji'
}

// 미션 타입
export enum MissionType {
    PLAY_LEVELS = 'play_levels',
    COLLECT_STARS = 'collect_stars',
    MATCH_COLORS = 'match_colors',
    CREATE_SPECIALS = 'create_specials',
    USE_BOOSTERS = 'use_boosters',
    SCORE_POINTS = 'score_points',
    COMBO_ACHIEVE = 'combo_achieve',
    TIME_CHALLENGE = 'time_challenge'
}

// 난이도 레벨
export enum Difficulty {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard'
}

// 보상 인터페이스
export interface Reward {
    type: RewardType;
    itemId: string;
    quantity: number;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

// 일일 미션 구조
export interface DailyMission {
    id: string;
    name: string;
    description: string;
    type: MissionType;
    targetValue: number;
    currentProgress: number;
    rewards: Reward[];
    difficulty: Difficulty;
    isCompleted: boolean;
    expiresAt: number;
}

// 미션 템플릿
export interface MissionTemplate {
    id: string;
    name: string;
    description: string;
    type: MissionType;
    difficulty: Difficulty;
    baseTarget: number;
    rewards: Reward[];
    weight: number; // 선택 확률 가중치
}

// 성취 시스템
export enum AchievementCategory {
    PROGRESS = 'progress',
    SKILL = 'skill',
    SOCIAL = 'social',
    TIME = 'time',
    SECRET = 'secret'
}

export enum TriggerType {
    LEVELS_COMPLETED = 'levels_completed',
    STARS_COLLECTED = 'stars_collected',
    CONSECUTIVE_THREE_STARS = 'consecutive_three_stars',
    COMBO_ACHIEVED = 'combo_achieved',
    MINIMUM_MOVES_CLEAR = 'minimum_moves_clear',
    PLAY_TIME = 'play_time',
    DAILY_LOGIN = 'daily_login'
}

export interface AchievementTrigger {
    type: TriggerType;
    threshold: number;
    timeframe?: number; // 특정 시간 내에 달성해야 하는 경우
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    category: AchievementCategory;
    trigger: AchievementTrigger;
    reward: Reward;
    isHidden: boolean;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// 시즌 시스템
export interface Season {
    id: string;
    name: string;
    description: string;
    theme: string;
    startDate: number;
    endDate: number;
    maxLevel: number;
    premiumPassPrice: number;
    isActive: boolean;
}

export interface SeasonProgress {
    seasonId: string;
    level: number;
    xp: number;
    hasPremiumPass: boolean;
    claimedFreeRewards: Set<number>;
    claimedPremiumRewards: Set<number>;
}

// 플레이어 프로필
export interface PlayerProfile {
    playerId: string;
    level: number;
    totalStars: number;
    averageStarsPerLevel: number;
    totalPlayTime: number;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    playStyle: 'casual' | 'competitive' | 'perfectionist';
}

@ccclass('RewardSystem')
export class RewardSystem extends Component {
    
    // 싱글톤 인스턴스
    private static instance: RewardSystem | null = null;
    
    // 미션 시스템
    private missionTemplates: MissionTemplate[] = [];
    private dailyMissions: Map<string, DailyMission> = new Map();
    
    // 성취 시스템
    private achievements: Map<string, Achievement> = new Map();
    private playerAchievements: Set<string> = new Set();
    private achievementProgress: Map<string, number> = new Map();
    
    // 시즌 시스템
    private currentSeason: Season | null = null;
    private seasonProgress: Map<string, SeasonProgress> = new Map();
    
    // 플레이어 데이터
    private playerProfile: PlayerProfile | null = null;
    
    protected onLoad(): void {
        if (RewardSystem.instance === null) {
            RewardSystem.instance = this;
            this.initializeSystem();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): RewardSystem {
        if (!RewardSystem.instance) {
            console.error('[RewardSystem] Instance not initialized');
            return null;
        }
        return RewardSystem.instance;
    }
    
    /**
     * [의도] 보상 시스템 초기화
     */
    private initializeSystem(): void {
        this.initializeMissionTemplates();
        this.initializeAchievements();
        this.initializeCurrentSeason();
        this.loadPlayerData();
        
        console.log('[RewardSystem] 보상 시스템 초기화 완료');
    }
    
    /**
     * [의도] 미션 템플릿 초기화
     */
    private initializeMissionTemplates(): void {
        this.missionTemplates = [
            // 쉬운 미션들
            {
                id: 'play_levels_easy',
                name: '게임 플레이',
                description: '{target}개 레벨을 플레이하세요',
                type: MissionType.PLAY_LEVELS,
                difficulty: Difficulty.EASY,
                baseTarget: 3,
                rewards: [{ type: RewardType.COINS, itemId: 'coins', quantity: 500 }],
                weight: 10
            },
            {
                id: 'collect_stars_easy',
                name: '별 수집가',
                description: '{target}개의 별을 획득하세요',
                type: MissionType.COLLECT_STARS,
                difficulty: Difficulty.EASY,
                baseTarget: 5,
                rewards: [{ type: RewardType.COINS, itemId: 'coins', quantity: 800 }],
                weight: 8
            },
            {
                id: 'match_colors_easy',
                name: '색상 매치',
                description: '빨간색 블록 {target}개를 매치하세요',
                type: MissionType.MATCH_COLORS,
                difficulty: Difficulty.EASY,
                baseTarget: 50,
                rewards: [{ type: RewardType.BOOSTERS, itemId: 'color_bomb', quantity: 2 }],
                weight: 9
            },
            
            // 중간 미션들
            {
                id: 'create_specials_medium',
                name: '특수 블록 마스터',
                description: '특수 블록을 {target}개 생성하세요',
                type: MissionType.CREATE_SPECIALS,
                difficulty: Difficulty.MEDIUM,
                baseTarget: 8,
                rewards: [{ type: RewardType.GEMS, itemId: 'gems', quantity: 20 }],
                weight: 6
            },
            {
                id: 'combo_achieve_medium',
                name: '콤보 달성자',
                description: '{target} 콤보를 달성하세요',
                type: MissionType.COMBO_ACHIEVE,
                difficulty: Difficulty.MEDIUM,
                baseTarget: 10,
                rewards: [{ type: RewardType.COINS, itemId: 'coins', quantity: 1500 }],
                weight: 5
            },
            
            // 어려운 미션들
            {
                id: 'score_points_hard',
                name: '점수 도전자',
                description: '{target}점을 달성하세요',
                type: MissionType.SCORE_POINTS,
                difficulty: Difficulty.HARD,
                baseTarget: 100000,
                rewards: [{ type: RewardType.GEMS, itemId: 'gems', quantity: 50 }],
                weight: 3
            },
            {
                id: 'time_challenge_hard',
                name: '시간 도전',
                description: '시간 제한 레벨을 {target}개 클리어하세요',
                type: MissionType.TIME_CHALLENGE,
                difficulty: Difficulty.HARD,
                baseTarget: 3,
                rewards: [
                    { type: RewardType.GEMS, itemId: 'gems', quantity: 30 },
                    { type: RewardType.SPECIAL_ITEM, itemId: 'time_bonus', quantity: 1 }
                ],
                weight: 2
            }
        ];
        
        console.log(`[RewardSystem] ${this.missionTemplates.length}개 미션 템플릿 로드 완료`);
    }
    
    /**
     * [의도] 성취 시스템 초기화
     */
    private initializeAchievements(): void {
        // 진행 기반 성취
        const levelMilestones = [10, 25, 50, 100, 250, 500];
        levelMilestones.forEach(milestone => {
            this.achievements.set(`levels_completed_${milestone}`, {
                id: `levels_completed_${milestone}`,
                name: `레벨 마스터 ${milestone}`,
                description: `${milestone}개의 레벨을 완료하세요`,
                category: AchievementCategory.PROGRESS,
                trigger: { type: TriggerType.LEVELS_COMPLETED, threshold: milestone },
                reward: { 
                    type: RewardType.GEMS, 
                    itemId: 'gems', 
                    quantity: Math.floor(milestone / 10) * 10 
                },
                isHidden: false,
                rarity: milestone >= 250 ? 'legendary' : milestone >= 100 ? 'epic' : 'rare'
            });
        });
        
        // 별 수집 성취
        const starMilestones = [50, 150, 300, 600, 1200];
        starMilestones.forEach(milestone => {
            this.achievements.set(`stars_collected_${milestone}`, {
                id: `stars_collected_${milestone}`,
                name: `별 수집가 ${milestone}`,
                description: `${milestone}개의 별을 수집하세요`,
                category: AchievementCategory.PROGRESS,
                trigger: { type: TriggerType.STARS_COLLECTED, threshold: milestone },
                reward: { 
                    type: RewardType.COINS, 
                    itemId: 'coins', 
                    quantity: milestone * 10 
                },
                isHidden: false,
                rarity: milestone >= 600 ? 'legendary' : milestone >= 300 ? 'epic' : 'rare'
            });
        });
        
        // 스킬 기반 성취
        this.achievements.set('perfect_streak_10', {
            id: 'perfect_streak_10',
            name: '완벽주의자',
            description: '연속 10레벨을 3성으로 클리어하세요',
            category: AchievementCategory.SKILL,
            trigger: { type: TriggerType.CONSECUTIVE_THREE_STARS, threshold: 10 },
            reward: { type: RewardType.SPECIAL_TITLE, itemId: 'perfectionist', quantity: 1 },
            isHidden: false,
            rarity: 'epic'
        });
        
        this.achievements.set('combo_master_15', {
            id: 'combo_master_15',
            name: '콤보 마스터',
            description: '15콤보를 달성하세요',
            category: AchievementCategory.SKILL,
            trigger: { type: TriggerType.COMBO_ACHIEVED, threshold: 15 },
            reward: { type: RewardType.GEMS, itemId: 'gems', quantity: 50 },
            isHidden: false,
            rarity: 'rare'
        });
        
        // 숨겨진 성취
        this.achievements.set('secret_first_try', {
            id: 'secret_first_try',
            name: '천재의 직감',
            description: '첫 시도에 3성으로 클리어한 레벨이 5개 이상',
            category: AchievementCategory.SECRET,
            trigger: { type: TriggerType.MINIMUM_MOVES_CLEAR, threshold: 5 },
            reward: { 
                type: RewardType.AVATAR_FRAME, 
                itemId: 'genius_frame', 
                quantity: 1,
                rarity: 'legendary'
            },
            isHidden: true,
            rarity: 'legendary'
        });
        
        console.log(`[RewardSystem] ${this.achievements.size}개 성취 초기화 완료`);
    }
    
    /**
     * [의도] 현재 시즌 초기화
     */
    private initializeCurrentSeason(): void {
        this.currentSeason = {
            id: 'season_1_spring',
            name: '달콤한 봄 축제',
            description: '봄의 달콤한 향기가 가득한 시즌',
            theme: 'spring_festival',
            startDate: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7일 전 시작
            endDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30일 후 종료
            maxLevel: 50,
            premiumPassPrice: 500, // 젬
            isActive: true
        };
        
        console.log(`[RewardSystem] 현재 시즌: ${this.currentSeason.name}`);
    }
    
    /**
     * [의도] 오늘의 일일 미션 생성
     */
    generateDailyMissions(playerId: string): DailyMission[] {
        const today = new Date().toDateString();
        const existingKey = `${playerId}_${today}`;
        
        // 이미 오늘 미션이 생성되었으면 반환
        if (this.dailyMissions.has(existingKey)) {
            return [this.dailyMissions.get(existingKey)];
        }
        
        // 새로운 미션 생성
        const selectedTemplates = this.selectMissionTemplates();
        const missions: DailyMission[] = [];
        
        selectedTemplates.forEach((template, index) => {
            const scaledTarget = this.scaleTargetToPlayer(template.baseTarget, template.difficulty);
            
            const mission: DailyMission = {
                id: `${playerId}_${today}_${index}`,
                name: template.name,
                description: template.description.replace('{target}', scaledTarget.toString()),
                type: template.type,
                targetValue: scaledTarget,
                currentProgress: 0,
                rewards: template.rewards,
                difficulty: template.difficulty,
                isCompleted: false,
                expiresAt: new Date().setHours(23, 59, 59, 999)
            };
            
            missions.push(mission);
            this.dailyMissions.set(mission.id, mission);
        });
        
        console.log(`[RewardSystem] 플레이어 ${playerId}의 일일 미션 ${missions.length}개 생성`);
        return missions;
    }
    
    /**
     * [의도] 미션 템플릿 선택 (난이도별 균형)
     */
    private selectMissionTemplates(): MissionTemplate[] {
        const selected: MissionTemplate[] = [];
        
        // 쉬운 미션 2개
        const easyTemplates = this.missionTemplates.filter(t => t.difficulty === Difficulty.EASY);
        selected.push(...this.weightedRandomSelect(easyTemplates, 2));
        
        // 중간 미션 1개
        const mediumTemplates = this.missionTemplates.filter(t => t.difficulty === Difficulty.MEDIUM);
        selected.push(...this.weightedRandomSelect(mediumTemplates, 1));
        
        // 어려운 미션 1개 (플레이어 레벨이 충분한 경우)
        if (this.playerProfile && this.playerProfile.level >= 10) {
            const hardTemplates = this.missionTemplates.filter(t => t.difficulty === Difficulty.HARD);
            selected.push(...this.weightedRandomSelect(hardTemplates, 1));
        }
        
        return selected;
    }
    
    /**
     * [의도] 가중치 기반 랜덤 선택
     */
    private weightedRandomSelect(templates: MissionTemplate[], count: number): MissionTemplate[] {
        const selected: MissionTemplate[] = [];
        const availableTemplates = [...templates];
        
        for (let i = 0; i < count && availableTemplates.length > 0; i++) {
            const totalWeight = availableTemplates.reduce((sum, t) => sum + t.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (let j = 0; j < availableTemplates.length; j++) {
                random -= availableTemplates[j].weight;
                if (random <= 0) {
                    selected.push(availableTemplates[j]);
                    availableTemplates.splice(j, 1);
                    break;
                }
            }
        }
        
        return selected;
    }
    
    /**
     * [의도] 플레이어 레벨에 맞춘 목표값 조정
     */
    private scaleTargetToPlayer(baseTarget: number, difficulty: Difficulty): number {
        if (!this.playerProfile) return baseTarget;
        
        const playerLevel = this.playerProfile.level;
        const skillMultiplier = Math.max(0.5, this.playerProfile.averageStarsPerLevel / 3);
        
        let scalingFactor = 1.0;
        
        switch (difficulty) {
            case Difficulty.EASY:
                scalingFactor = 0.8 + (playerLevel * 0.02);
                break;
            case Difficulty.MEDIUM:
                scalingFactor = 1.0 + (playerLevel * 0.03);
                break;
            case Difficulty.HARD:
                scalingFactor = 1.2 + (playerLevel * 0.05);
                break;
        }
        
        return Math.floor(baseTarget * scalingFactor * skillMultiplier);
    }
    
    /**
     * [의도] 미션 진행도 업데이트
     */
    updateMissionProgress(playerId: string, missionType: MissionType, progress: number): void {
        const today = new Date().toDateString();
        const missionKey = `${playerId}_${today}`;
        
        // 해당 타입의 미션 찾기
        for (const [key, mission] of this.dailyMissions) {
            if (key.startsWith(missionKey) && mission.type === missionType && !mission.isCompleted) {
                mission.currentProgress = Math.min(mission.currentProgress + progress, mission.targetValue);
                
                // 완료 체크
                if (mission.currentProgress >= mission.targetValue) {
                    mission.isCompleted = true;
                    this.completeMission(mission);
                }
            }
        }
    }
    
    /**
     * [의도] 미션 완료 처리
     */
    private completeMission(mission: DailyMission): void {
        console.log(`[RewardSystem] 미션 완료: ${mission.name}`);
        
        // 보상 지급
        for (const reward of mission.rewards) {
            this.awardReward(reward);
        }
        
        // 경험치 추가 지급
        const expBonus = this.calculateMissionExpBonus(mission.difficulty);
        this.awardSeasonXP(mission.id.split('_')[0], expBonus);
        
        // 이벤트 발생
        EventBus.getInstance().emit('mission_completed', {
            mission: mission,
            rewards: mission.rewards
        });
    }
    
    /**
     * [의도] 성취 달성 확인
     */
    checkAchievements(playerId: string, trigger: TriggerType, value: number): Achievement[] {
        const unlockedAchievements: Achievement[] = [];
        
        for (const [id, achievement] of this.achievements) {
            if (this.playerAchievements.has(id)) continue; // 이미 달성함
            
            if (achievement.trigger.type === trigger && value >= achievement.trigger.threshold) {
                this.playerAchievements.add(id);
                unlockedAchievements.push(achievement);
                
                // 보상 지급
                this.awardReward(achievement.reward);
                
                console.log(`[RewardSystem] 성취 달성: ${achievement.name}`);
                
                // 이벤트 발생
                EventBus.getInstance().emit('achievement_unlocked', {
                    achievement: achievement,
                    playerId: playerId
                });
            }
        }
        
        return unlockedAchievements;
    }
    
    /**
     * [의도] 시즌 경험치 지급
     */
    awardSeasonXP(playerId: string, amount: number): void {
        if (!this.currentSeason) return;
        
        let progress = this.seasonProgress.get(playerId);
        if (!progress) {
            progress = {
                seasonId: this.currentSeason.id,
                level: 1,
                xp: 0,
                hasPremiumPass: false,
                claimedFreeRewards: new Set(),
                claimedPremiumRewards: new Set()
            };
            this.seasonProgress.set(playerId, progress);
        }
        
        const oldLevel = progress.level;
        progress.xp += amount;
        
        // 레벨업 체크
        while (progress.xp >= this.getXPRequiredForLevel(progress.level + 1) && 
               progress.level < this.currentSeason.maxLevel) {
            progress.xp -= this.getXPRequiredForLevel(progress.level + 1);
            progress.level++;
        }
        
        // 레벨업 발생시 보상 지급
        if (progress.level > oldLevel) {
            this.awardSeasonLevelRewards(playerId, progress, oldLevel + 1, progress.level);
            
            EventBus.getInstance().emit('season_level_up', {
                playerId: playerId,
                oldLevel: oldLevel,
                newLevel: progress.level,
                seasonId: this.currentSeason.id
            });
        }
    }
    
    /**
     * [의도] 시즌 레벨 보상 지급
     */
    private awardSeasonLevelRewards(playerId: string, progress: SeasonProgress, fromLevel: number, toLevel: number): void {
        for (let level = fromLevel; level <= toLevel; level++) {
            // 무료 보상
            const freeReward = this.getSeasonReward(level, false);
            if (freeReward) {
                this.awardReward(freeReward);
                progress.claimedFreeRewards.add(level);
            }
            
            // 프리미엄 보상 (패스 소유시)
            if (progress.hasPremiumPass) {
                const premiumReward = this.getSeasonReward(level, true);
                if (premiumReward) {
                    this.awardReward(premiumReward);
                    progress.claimedPremiumRewards.add(level);
                }
            }
        }
    }
    
    /**
     * [의도] 시즌 레벨별 보상 정의
     */
    private getSeasonReward(level: number, isPremium: boolean): Reward | null {
        if (isPremium) {
            // 프리미엄 보상 (더 풍부한 보상)
            if (level % 10 === 0) {
                return { type: RewardType.GEMS, itemId: 'gems', quantity: 100 };
            } else if (level % 5 === 0) {
                return { type: RewardType.SPECIAL_ITEM, itemId: 'premium_booster', quantity: 3 };
            } else {
                return { type: RewardType.COINS, itemId: 'coins', quantity: 1000 };
            }
        } else {
            // 무료 보상
            if (level % 10 === 0) {
                return { type: RewardType.GEMS, itemId: 'gems', quantity: 25 };
            } else if (level % 5 === 0) {
                return { type: RewardType.BOOSTERS, itemId: 'free_booster', quantity: 1 };
            } else {
                return { type: RewardType.COINS, itemId: 'coins', quantity: 200 };
            }
        }
    }
    
    /**
     * [의도] 보상 지급 처리
     */
    private awardReward(reward: Reward): void {
        switch (reward.type) {
            case RewardType.COINS:
                CurrencyManager.getInstance().addCurrency(CurrencyType.COINS, reward.quantity);
                break;
            case RewardType.GEMS:
                CurrencyManager.getInstance().addCurrency(CurrencyType.GEMS, reward.quantity);
                break;
            default:
                console.log(`[RewardSystem] 특수 보상 지급: ${reward.type} x${reward.quantity}`);
                break;
        }
    }
    
    /**
     * [의도] 시즌 레벨업에 필요한 경험치 계산
     */
    private getXPRequiredForLevel(level: number): number {
        return Math.floor(100 + (level - 1) * 50 + Math.pow(level - 1, 1.2) * 25);
    }
    
    /**
     * [의도] 미션 완료 경험치 보너스 계산
     */
    private calculateMissionExpBonus(difficulty: Difficulty): number {
        switch (difficulty) {
            case Difficulty.EASY: return 50;
            case Difficulty.MEDIUM: return 100;
            case Difficulty.HARD: return 200;
            default: return 50;
        }
    }
    
    /**
     * [의도] 플레이어 데이터 로드
     */
    private loadPlayerData(): void {
        // TODO: 실제로는 저장된 데이터 로드
        this.playerProfile = {
            playerId: 'player_1',
            level: 15,
            totalStars: 120,
            averageStarsPerLevel: 2.4,
            totalPlayTime: 3600, // 60분
            skillLevel: 'intermediate',
            playStyle: 'casual'
        };
        
        console.log('[RewardSystem] 플레이어 데이터 로드 완료');
    }
    
    /**
     * [의도] 현재 일일 미션 조회
     */
    getDailyMissions(playerId: string): DailyMission[] {
        return this.generateDailyMissions(playerId);
    }
    
    /**
     * [의도] 달성한 성취 목록 조회
     */
    getUnlockedAchievements(): Achievement[] {
        return Array.from(this.playerAchievements).map(id => this.achievements.get(id)!);
    }
    
    /**
     * [의도] 현재 시즌 정보 조회
     */
    getCurrentSeason(): Season | null {
        return this.currentSeason;
    }
    
    /**
     * [의도] 플레이어 시즌 진행도 조회
     */
    getSeasonProgress(playerId: string): SeasonProgress | null {
        return this.seasonProgress.get(playerId) || null;
    }
}