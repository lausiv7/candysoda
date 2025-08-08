/**
 * [의도] Sweet Puzzle 이벤트 시스템 - 한정 이벤트, 시즌 챌린지, 토너먼트 등 특별 콘텐츠 관리
 * [책임] 이벤트 스케줄링, 진행률 추적, 이벤트별 보상 시스템, 시간 기반 이벤트 관리
 */

import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { RewardSystem, Reward, RewardType } from './RewardSystem';
import { CurrencyManager, CurrencyType } from './CurrencyManager';

const { ccclass, property } = _decorator;

// 이벤트 타입
export enum EventType {
    COLLECTION = 'collection',           // 수집 이벤트
    TOURNAMENT = 'tournament',           // 토너먼트
    SPECIAL_LEVELS = 'special_levels',   // 특별 레벨
    DOUBLE_REWARDS = 'double_rewards',   // 더블 보상
    BOSS_RUSH = 'boss_rush',            // 보스 러시
    WEEKEND_CHALLENGE = 'weekend_challenge', // 주말 챌린지
    SEASONAL_FESTIVAL = 'seasonal_festival'  // 시즌 축제
}

// 이벤트 상태
export enum EventStatus {
    SCHEDULED = 'scheduled',    // 예정됨
    ACTIVE = 'active',         // 진행 중
    COMPLETED = 'completed',   // 완료됨
    EXPIRED = 'expired'        // 만료됨
}

// 게임 액션 타입
export enum ActionType {
    LEVEL_COMPLETED = 'level_completed',
    BLOCK_MATCH = 'block_match',
    SPECIAL_BLOCK_CREATED = 'special_block_created',
    COMBO_ACHIEVED = 'combo_achieved',
    BOOSTER_USED = 'booster_used',
    SCORE_ACHIEVED = 'score_achieved'
}

// 시즌 테마
export enum SeasonTheme {
    SPRING_FESTIVAL = 'spring_festival',
    SUMMER_VACATION = 'summer_vacation',
    AUTUMN_HARVEST = 'autumn_harvest',
    WINTER_WONDERLAND = 'winter_wonderland',
    VALENTINE_DAY = 'valentine_day',
    HALLOWEEN = 'halloween',
    CHRISTMAS = 'christmas'
}

// 이벤트 구성 정보
export interface EventConfig {
    id: string;
    type: EventType;
    name: string;
    description: string;
    theme: SeasonTheme;
    
    // 시간 설정
    startTime: number;
    endTime: number;
    duration: number; // ms
    
    // 참가 조건
    requirements: {
        minLevel?: number;
        unlockedWorlds?: string[];
        previousEventCompletion?: string;
    };
    
    // 이벤트 파라미터
    parameters: Record<string, any>;
    
    // 보상 설정
    rewards: EventReward[];
    
    // 시각적 설정
    bannerImage: string;
    backgroundColor: string;
    musicTrack: string;
}

// 이벤트 보상
export interface EventReward {
    tier: number;
    name: string;
    description: string;
    requirements: Record<string, number>;
    rewards: Reward[];
    isSpecial: boolean;
}

// 게임 액션 데이터
export interface GameAction {
    type: ActionType;
    playerId: string;
    levelId?: string;
    timestamp: number;
    data: Record<string, any>;
}

// 이벤트 진행 결과
export interface EventUpdateResult {
    eventId: string;
    progressMade: boolean;
    isCompleted: boolean;
    newTier: number;
    progressPercentage: number;
    rewardsEarned: Reward[];
}

// 수집 이벤트 데이터
export interface CollectionEventData {
    targetItems: Map<string, number>;
    playerProgress: Map<string, Map<string, number>>;
    bonusMultiplier: number;
}

// 토너먼트 이벤트 데이터
export interface TournamentData {
    participants: Map<string, TournamentParticipant>;
    leaderboard: TournamentParticipant[];
    prizePool: Reward[];
    isRanked: boolean;
}

export interface TournamentParticipant {
    playerId: string;
    playerName: string;
    score: number;
    levelsCompleted: number;
    averageStars: number;
    rank: number;
    joinedAt: number;
}

// 주간 챌린지 시스템
export interface WeeklyChallenge {
    id: string;
    seasonTheme: SeasonTheme;
    weekNumber: number;
    stages: ChallengeStage[];
    grandReward: Reward;
    startDate: number;
    endDate: number;
}

export interface ChallengeStage {
    id: string;
    name: string;
    description: string;
    targetValue: number;
    currentProgress: number;
    reward: Reward;
    isCompleted: boolean;
    dependsOn?: string; // 이전 스테이지 ID
}

@ccclass('EventManager')
export class EventManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: EventManager | null = null;
    
    // 이벤트 관리
    private activeEvents: Map<string, GameEvent> = new Map();
    private eventSchedule: EventConfig[] = [];
    private eventHistory: Map<string, EventConfig> = new Map();
    
    // 주간 챌린지
    private currentWeeklyChallenge: WeeklyChallenge | null = null;
    private challengeProgress: Map<string, ChallengeProgress> = new Map();
    
    // 플레이어 참여 데이터
    private playerEventData: Map<string, Map<string, any>> = new Map();
    
    protected onLoad(): void {
        if (EventManager.instance === null) {
            EventManager.instance = this;
            this.initializeSystem();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): EventManager {
        if (!EventManager.instance) {
            console.error('[EventManager] Instance not initialized');
            return null;
        }
        return EventManager.instance;
    }
    
    /**
     * [의도] 이벤트 시스템 초기화
     */
    private initializeSystem(): void {
        this.scheduleEvents();
        this.initializeWeeklyChallenge();
        this.startEventMonitoring();
        
        console.log('[EventManager] 이벤트 시스템 초기화 완료');
    }
    
    /**
     * [의도] 이벤트 스케줄 설정
     */
    private scheduleEvents(): void {
        const now = Date.now();
        
        // 봄 축제 이벤트
        this.eventSchedule.push({
            id: 'spring_festival_2025',
            type: EventType.SEASONAL_FESTIVAL,
            name: '달콤한 봄 축제',
            description: '봄꽃이 만개한 캔디 랜드에서 특별한 모험을 떠나보세요!',
            theme: SeasonTheme.SPRING_FESTIVAL,
            startTime: now + (1 * 24 * 60 * 60 * 1000), // 1일 후 시작
            endTime: now + (8 * 24 * 60 * 60 * 1000),   // 8일 후 종료 (7일간)
            duration: 7 * 24 * 60 * 60 * 1000,
            requirements: {
                minLevel: 5
            },
            parameters: {
                targetColors: ['pink', 'yellow', 'green'],
                bonusMultiplier: 1.5,
                specialLevels: ['spring_1', 'spring_2', 'spring_3']
            },
            rewards: [
                {
                    tier: 1,
                    name: '꽃잎 수집가',
                    description: '핑크색 블록 500개 수집',
                    requirements: { pink_blocks: 500 },
                    rewards: [{ type: RewardType.COINS, itemId: 'coins', quantity: 5000 }],
                    isSpecial: false
                },
                {
                    tier: 2,
                    name: '봄의 정원사',
                    description: '모든 색상 블록 200개씩 수집',
                    requirements: { pink_blocks: 200, yellow_blocks: 200, green_blocks: 200 },
                    rewards: [{ type: RewardType.GEMS, itemId: 'gems', quantity: 100 }],
                    isSpecial: false
                },
                {
                    tier: 3,
                    name: '봄 축제의 여왕',
                    description: '특별 레벨 모두 3성 클리어',
                    requirements: { special_levels_three_stars: 3 },
                    rewards: [
                        { type: RewardType.GEMS, itemId: 'gems', quantity: 200 },
                        { type: RewardType.SPECIAL_ITEM, itemId: 'spring_crown', quantity: 1 }
                    ],
                    isSpecial: true
                }
            ],
            bannerImage: 'spring_festival_banner',
            backgroundColor: '#FFB6C1',
            musicTrack: 'spring_festival_theme'
        });
        
        // 주말 챌린지
        this.eventSchedule.push({
            id: 'weekend_challenge_march',
            type: EventType.WEEKEND_CHALLENGE,
            name: '주말 스페셜 챌린지',
            description: '주말 동안 특별한 도전과 더 많은 보상!',
            theme: SeasonTheme.SPRING_FESTIVAL,
            startTime: this.getNextFridayEvening(),
            endTime: this.getNextSundayNight(),
            duration: 2 * 24 * 60 * 60 * 1000, // 2일
            requirements: {},
            parameters: {
                doubleRewards: true,
                specialMissions: true,
                bonusHeartRecovery: true
            },
            rewards: [
                {
                    tier: 1,
                    name: '주말 워리어',
                    description: '주말 동안 10레벨 완료',
                    requirements: { levels_completed: 10 },
                    rewards: [{ type: RewardType.COINS, itemId: 'coins', quantity: 3000 }],
                    isSpecial: false
                }
            ],
            bannerImage: 'weekend_challenge_banner',
            backgroundColor: '#FF4500',
            musicTrack: 'weekend_energy_theme'
        });
        
        console.log(`[EventManager] ${this.eventSchedule.length}개 이벤트 스케줄 설정`);
    }
    
    /**
     * [의도] 주간 챌린지 초기화
     */
    private initializeWeeklyChallenge(): void {
        const weekNumber = this.getCurrentWeekNumber();
        
        this.currentWeeklyChallenge = {
            id: `weekly_challenge_${weekNumber}`,
            seasonTheme: SeasonTheme.SPRING_FESTIVAL,
            weekNumber: weekNumber,
            stages: [
                {
                    id: 'stage_1_blocks',
                    name: '블록 매치 마스터',
                    description: '500개의 블록을 매치하세요',
                    targetValue: 500,
                    currentProgress: 0,
                    reward: { type: RewardType.COINS, itemId: 'coins', quantity: 2000 },
                    isCompleted: false
                },
                {
                    id: 'stage_2_combos',
                    name: '콤보 달성자',
                    description: '5콤보를 10번 달성하세요',
                    targetValue: 10,
                    currentProgress: 0,
                    reward: { type: RewardType.BOOSTERS, itemId: 'combo_booster', quantity: 3 },
                    isCompleted: false,
                    dependsOn: 'stage_1_blocks'
                },
                {
                    id: 'stage_3_specials',
                    name: '특수 블록 생성자',
                    description: '특수 블록을 20개 생성하세요',
                    targetValue: 20,
                    currentProgress: 0,
                    reward: { type: RewardType.GEMS, itemId: 'gems', quantity: 75 },
                    isCompleted: false,
                    dependsOn: 'stage_2_combos'
                }
            ],
            grandReward: { type: RewardType.SPECIAL_ITEM, itemId: 'weekly_trophy', quantity: 1 },
            startDate: this.getWeekStartDate(),
            endDate: this.getWeekEndDate()
        };
        
        console.log(`[EventManager] 주간 챌린지 ${weekNumber}주차 초기화`);
    }
    
    /**
     * [의도] 이벤트 모니터링 시작
     */
    private startEventMonitoring(): void {
        setInterval(() => {
            this.checkEventSchedule();
            this.updateActiveEvents();
            this.cleanupExpiredEvents();
        }, 60 * 1000); // 1분마다 체크
        
        console.log('[EventManager] 이벤트 모니터링 시작');
    }
    
    /**
     * [의도] 이벤트 스케줄 확인 및 시작
     */
    private checkEventSchedule(): void {
        const now = Date.now();
        
        for (const eventConfig of this.eventSchedule) {
            if (eventConfig.startTime <= now && 
                eventConfig.endTime > now && 
                !this.activeEvents.has(eventConfig.id)) {
                
                this.startEvent(eventConfig);
            }
        }
    }
    
    /**
     * [의도] 이벤트 시작
     */
    startEvent(eventConfig: EventConfig): boolean {
        console.log(`[EventManager] 이벤트 시작: ${eventConfig.name}`);
        
        const gameEvent = this.createEventFromConfig(eventConfig);
        this.activeEvents.set(eventConfig.id, gameEvent);
        
        // 전체 플레이어에게 알림
        EventBus.getInstance().emit('event_started', {
            eventConfig: eventConfig,
            gameEvent: gameEvent
        });
        
        return true;
    }
    
    /**
     * [의도] 설정에서 게임 이벤트 생성
     */
    private createEventFromConfig(config: EventConfig): GameEvent {
        switch (config.type) {
            case EventType.COLLECTION:
                return new CollectionEvent(config);
            case EventType.TOURNAMENT:
                return new TournamentEvent(config);
            case EventType.WEEKEND_CHALLENGE:
                return new WeekendChallengeEvent(config);
            case EventType.SEASONAL_FESTIVAL:
                return new SeasonalFestivalEvent(config);
            default:
                return new BaseGameEvent(config);
        }
    }
    
    /**
     * [의도] 플레이어 액션에 따른 이벤트 진행도 업데이트
     */
    updateEventProgress(action: GameAction): EventUpdateResult[] {
        const results: EventUpdateResult[] = [];
        
        // 활성 이벤트 처리
        for (const [eventId, event] of this.activeEvents) {
            if (event.canPlayerParticipate(action.playerId)) {
                const result = event.processAction(action);
                if (result.progressMade) {
                    results.push(result);
                    
                    if (result.isCompleted) {
                        this.handleEventCompletion(event, action.playerId, result);
                    }
                }
            }
        }
        
        // 주간 챌린지 처리
        if (this.currentWeeklyChallenge) {
            this.updateWeeklyChallengeProgress(action);
        }
        
        return results;
    }
    
    /**
     * [의도] 주간 챌린지 진행도 업데이트
     */
    private updateWeeklyChallengeProgress(action: GameAction): void {
        if (!this.currentWeeklyChallenge) return;
        
        for (const stage of this.currentWeeklyChallenge.stages) {
            if (stage.isCompleted) continue;
            
            // 의존성 확인
            if (stage.dependsOn) {
                const dependentStage = this.currentWeeklyChallenge.stages.find(s => s.id === stage.dependsOn);
                if (!dependentStage || !dependentStage.isCompleted) {
                    continue;
                }
            }
            
            let progressAdded = 0;
            
            // 스테이지 타입별 진행도 계산
            switch (stage.id.split('_')[1]) {
                case '1': // 블록 매치
                    if (action.type === ActionType.BLOCK_MATCH) {
                        progressAdded = action.data.blocksMatched || 0;
                    }
                    break;
                case '2': // 콤보
                    if (action.type === ActionType.COMBO_ACHIEVED && action.data.combo >= 5) {
                        progressAdded = 1;
                    }
                    break;
                case '3': // 특수 블록
                    if (action.type === ActionType.SPECIAL_BLOCK_CREATED) {
                        progressAdded = 1;
                    }
                    break;
            }
            
            if (progressAdded > 0) {
                stage.currentProgress = Math.min(stage.currentProgress + progressAdded, stage.targetValue);
                
                if (stage.currentProgress >= stage.targetValue && !stage.isCompleted) {
                    stage.isCompleted = true;
                    this.completeWeeklyChallengeStage(stage, action.playerId);
                }
            }
        }
        
        // 전체 챌린지 완료 확인
        if (this.isWeeklyChallengeCompleted()) {
            this.completeWeeklyChallenge(action.playerId);
        }
    }
    
    /**
     * [의도] 주간 챌린지 스테이지 완료 처리
     */
    private completeWeeklyChallengeStage(stage: ChallengeStage, playerId: string): void {
        console.log(`[EventManager] 주간 챌린지 스테이지 완료: ${stage.name}`);
        
        // 보상 지급
        RewardSystem.getInstance().awardReward(stage.reward);
        
        EventBus.getInstance().emit('weekly_challenge_stage_completed', {
            stage: stage,
            playerId: playerId
        });
    }
    
    /**
     * [의도] 주간 챌린지 전체 완료 처리
     */
    private completeWeeklyChallenge(playerId: string): void {
        if (!this.currentWeeklyChallenge) return;
        
        console.log(`[EventManager] 주간 챌린지 완료: ${this.currentWeeklyChallenge.weekNumber}주차`);
        
        // 그랜드 보상 지급
        RewardSystem.getInstance().awardReward(this.currentWeeklyChallenge.grandReward);
        
        EventBus.getInstance().emit('weekly_challenge_completed', {
            challenge: this.currentWeeklyChallenge,
            playerId: playerId
        });
    }
    
    /**
     * [의도] 이벤트 완료 처리
     */
    private handleEventCompletion(event: GameEvent, playerId: string, result: EventUpdateResult): void {
        console.log(`[EventManager] 이벤트 완료: ${event.config.name}`);
        
        // 완료 보상 지급
        for (const reward of result.rewardsEarned) {
            RewardSystem.getInstance().awardReward(reward);
        }
        
        EventBus.getInstance().emit('event_completed', {
            event: event,
            playerId: playerId,
            result: result
        });
    }
    
    /**
     * [의도] 활성 이벤트 업데이트
     */
    private updateActiveEvents(): void {
        const now = Date.now();
        
        for (const [eventId, event] of this.activeEvents) {
            if (event.config.endTime <= now) {
                this.endEvent(eventId);
            }
        }
    }
    
    /**
     * [의도] 이벤트 종료
     */
    private endEvent(eventId: string): void {
        const event = this.activeEvents.get(eventId);
        if (!event) return;
        
        console.log(`[EventManager] 이벤트 종료: ${event.config.name}`);
        
        this.activeEvents.delete(eventId);
        this.eventHistory.set(eventId, event.config);
        
        EventBus.getInstance().emit('event_ended', {
            eventId: eventId,
            config: event.config
        });
    }
    
    /**
     * [의도] 만료된 이벤트 정리
     */
    private cleanupExpiredEvents(): void {
        const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30일 전
        
        for (const [eventId, config] of this.eventHistory) {
            if (config.endTime < cutoffTime) {
                this.eventHistory.delete(eventId);
            }
        }
    }
    
    /**
     * [의도] 현재 활성 이벤트 조회
     */
    getActiveEvents(): Map<string, GameEvent> {
        return new Map(this.activeEvents);
    }
    
    /**
     * [의도] 현재 주간 챌린지 조회
     */
    getCurrentWeeklyChallenge(): WeeklyChallenge | null {
        return this.currentWeeklyChallenge;
    }
    
    /**
     * [의도] 플레이어가 참여 가능한 이벤트 조회
     */
    getAvailableEventsForPlayer(playerId: string, playerLevel: number): EventConfig[] {
        const availableEvents: EventConfig[] = [];
        
        for (const event of this.activeEvents.values()) {
            if (event.canPlayerParticipate(playerId) && 
                (!event.config.requirements.minLevel || playerLevel >= event.config.requirements.minLevel)) {
                availableEvents.push(event.config);
            }
        }
        
        return availableEvents;
    }
    
    // 유틸리티 메서드들
    private getCurrentWeekNumber(): number {
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return Math.floor((now.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    }
    
    private getWeekStartDate(): number {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - now.getDay() + 1);
        monday.setHours(0, 0, 0, 0);
        return monday.getTime();
    }
    
    private getWeekEndDate(): number {
        const start = this.getWeekStartDate();
        return start + (7 * 24 * 60 * 60 * 1000) - 1;
    }
    
    private getNextFridayEvening(): number {
        const now = new Date();
        const friday = new Date(now);
        const daysToFriday = (5 - now.getDay() + 7) % 7;
        friday.setDate(now.getDate() + daysToFriday);
        friday.setHours(18, 0, 0, 0);
        return friday.getTime();
    }
    
    private getNextSundayNight(): number {
        const friday = this.getNextFridayEvening();
        return friday + (2 * 24 * 60 * 60 * 1000) + (6 * 60 * 60 * 1000); // +2일 +6시간
    }
    
    private isWeeklyChallengeCompleted(): boolean {
        if (!this.currentWeeklyChallenge) return false;
        return this.currentWeeklyChallenge.stages.every(stage => stage.isCompleted);
    }
}

// 이벤트 진행률 추적
export interface ChallengeProgress {
    playerId: string;
    stageId: string;
    progress: number;
    completedAt?: number;
}

// 베이스 게임 이벤트 클래스
export abstract class GameEvent {
    constructor(public config: EventConfig) {}
    
    abstract canPlayerParticipate(playerId: string): boolean;
    abstract processAction(action: GameAction): EventUpdateResult;
}

// 베이스 게임 이벤트 구현
export class BaseGameEvent extends GameEvent {
    canPlayerParticipate(playerId: string): boolean {
        return true;
    }
    
    processAction(action: GameAction): EventUpdateResult {
        return {
            eventId: this.config.id,
            progressMade: false,
            isCompleted: false,
            newTier: 0,
            progressPercentage: 0,
            rewardsEarned: []
        };
    }
}

// 수집 이벤트 구현
export class CollectionEvent extends GameEvent {
    private playerProgress: Map<string, Map<string, number>> = new Map();
    
    canPlayerParticipate(playerId: string): boolean {
        return true;
    }
    
    processAction(action: GameAction): EventUpdateResult {
        if (action.type !== ActionType.BLOCK_MATCH) {
            return this.noProgressResult();
        }
        
        const progress = this.getPlayerProgress(action.playerId);
        let progressMade = false;
        
        // 블록 색상별 수집 진행
        const colorCounts = action.data.colorCounts as Map<string, number>;
        for (const [color, count] of colorCounts) {
            if (this.config.parameters.targetColors.includes(color)) {
                const currentCount = progress.get(color) || 0;
                progress.set(color, currentCount + count);
                progressMade = true;
            }
        }
        
        const tier = this.calculateTier(progress);
        const percentage = this.calculatePercentage(progress);
        const rewards = this.checkForNewRewards(progress);
        
        return {
            eventId: this.config.id,
            progressMade,
            isCompleted: tier >= this.config.rewards.length,
            newTier: tier,
            progressPercentage: percentage,
            rewardsEarned: rewards
        };
    }
    
    private getPlayerProgress(playerId: string): Map<string, number> {
        if (!this.playerProgress.has(playerId)) {
            this.playerProgress.set(playerId, new Map());
        }
        return this.playerProgress.get(playerId)!;
    }
    
    private calculateTier(progress: Map<string, number>): number {
        // 간단한 티어 계산 로직
        const totalProgress = Array.from(progress.values()).reduce((sum, count) => sum + count, 0);
        return Math.floor(totalProgress / 1000) + 1;
    }
    
    private calculatePercentage(progress: Map<string, number>): number {
        const totalProgress = Array.from(progress.values()).reduce((sum, count) => sum + count, 0);
        const totalTarget = this.config.parameters.targetColors.length * 500; // 각 색상당 500개
        return Math.min(100, (totalProgress / totalTarget) * 100);
    }
    
    private checkForNewRewards(progress: Map<string, number>): Reward[] {
        // 새로운 보상 확인 로직
        return [];
    }
    
    private noProgressResult(): EventUpdateResult {
        return {
            eventId: this.config.id,
            progressMade: false,
            isCompleted: false,
            newTier: 0,
            progressPercentage: 0,
            rewardsEarned: []
        };
    }
}

// 토너먼트 이벤트 구현
export class TournamentEvent extends GameEvent {
    private participants: Map<string, TournamentParticipant> = new Map();
    
    canPlayerParticipate(playerId: string): boolean {
        return true;
    }
    
    processAction(action: GameAction): EventUpdateResult {
        if (action.type === ActionType.LEVEL_COMPLETED) {
            this.updateParticipantScore(action.playerId, action.data.score || 0);
        }
        
        return this.noProgressResult();
    }
    
    private updateParticipantScore(playerId: string, score: number): void {
        let participant = this.participants.get(playerId);
        
        if (!participant) {
            participant = {
                playerId,
                playerName: `Player_${playerId}`,
                score: 0,
                levelsCompleted: 0,
                averageStars: 0,
                rank: 0,
                joinedAt: Date.now()
            };
            this.participants.set(playerId, participant);
        }
        
        participant.score += score;
        participant.levelsCompleted++;
        
        this.updateLeaderboard();
    }
    
    private updateLeaderboard(): void {
        const sorted = Array.from(this.participants.values())
            .sort((a, b) => b.score - a.score);
        
        sorted.forEach((participant, index) => {
            participant.rank = index + 1;
        });
    }
    
    private noProgressResult(): EventUpdateResult {
        return {
            eventId: this.config.id,
            progressMade: false,
            isCompleted: false,
            newTier: 0,
            progressPercentage: 0,
            rewardsEarned: []
        };
    }
}

// 주말 챌린지 이벤트 구현
export class WeekendChallengeEvent extends GameEvent {
    canPlayerParticipate(playerId: string): boolean {
        const now = new Date();
        const dayOfWeek = now.getDay();
        return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // 금,토,일
    }
    
    processAction(action: GameAction): EventUpdateResult {
        // 주말 동안 모든 보상 2배
        return this.noProgressResult();
    }
    
    private noProgressResult(): EventUpdateResult {
        return {
            eventId: this.config.id,
            progressMade: false,
            isCompleted: false,
            newTier: 0,
            progressPercentage: 0,
            rewardsEarned: []
        };
    }
}

// 시즌 축제 이벤트 구현
export class SeasonalFestivalEvent extends GameEvent {
    canPlayerParticipate(playerId: string): boolean {
        return true;
    }
    
    processAction(action: GameAction): EventUpdateResult {
        return this.noProgressResult();
    }
    
    private noProgressResult(): EventUpdateResult {
        return {
            eventId: this.config.id,
            progressMade: false,
            isCompleted: false,
            newTier: 0,
            progressPercentage: 0,
            rewardsEarned: []
        };
    }
}