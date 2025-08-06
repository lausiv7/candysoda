/**
 * [의도] Sweet Puzzle 리더보드 시스템 관리자
 * [책임] 다양한 리더보드 관리, 순위 계산, 시즌 관리, 보상 배포
 */

import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../../core/EventBus';

// 리더보드 관련 데이터 인터페이스
export interface LeaderboardEntry {
    playerId: string;
    username: string;
    avatarUrl: string;
    score: number;
    rank: number;
    previousRank: number;
    
    // 상세 통계
    level: number;
    guildId?: string;
    guildName?: string;
    
    // 시간 정보
    lastUpdated: number;
    seasonalScore: number;
    weeklyScore: number;
}

export interface Leaderboard {
    id: string;
    type: LeaderboardType;
    name: string;
    description: string;
    entries: LeaderboardEntry[];
    
    // 시즌 정보
    seasonId: string;
    seasonStartTime: number;
    seasonEndTime: number;
    
    // 설정
    maxEntries: number;
    updateInterval: number; // 밀리초
    isActive: boolean;
    
    // 통계
    totalParticipants: number;
    lastResetTime: number;
    lastUpdateTime: number;
}

export interface Season {
    id: string;
    name: string;
    startTime: number;
    endTime: number;
    isActive: boolean;
    
    // 보상 정보
    rewards: SeasonReward[];
    
    // 통계
    totalParticipants: number;
    averageScore: number;
    topScore: number;
}

export interface SeasonReward {
    rankMin: number;
    rankMax: number;
    rewardType: RewardType;
    rewardAmount: number;
    rewardData?: any;
}

export enum LeaderboardType {
    GLOBAL_WEEKLY = 'global_weekly',
    GLOBAL_MONTHLY = 'global_monthly',
    GLOBAL_ALL_TIME = 'global_all_time',
    GUILD_WEEKLY = 'guild_weekly',
    GUILD_MONTHLY = 'guild_monthly',
    FRIENDS_WEEKLY = 'friends_weekly',
    LEVEL_COMPLETION = 'level_completion',
    PUZZLE_MASTERY = 'puzzle_mastery'
}

export enum RewardType {
    COINS = 'coins',
    GEMS = 'gems',
    BOOSTERS = 'boosters',
    AVATAR = 'avatar',
    TITLE = 'title',
    BADGE = 'badge'
}

export interface ScoreSubmission {
    playerId: string;
    leaderboardType: LeaderboardType;
    score: number;
    levelId?: string;
    gameMode?: string;
    timestamp: number;
    metadata?: any;
}

@ccclass('LeaderboardManager')
export class LeaderboardManager {
    private static instance: LeaderboardManager;
    private _isInitialized: boolean = false;
    
    // 리더보드 데이터
    private leaderboards: Map<LeaderboardType, Leaderboard> = new Map();
    private currentSeason: Season | null = null;
    private playerScores: Map<string, Map<LeaderboardType, number>> = new Map();
    
    // 설정
    private maxRankEntries: number = 1000;
    private updateInterval: number = 5 * 60 * 1000; // 5분
    private saveKey: string = 'sweet_puzzle_leaderboard_data';
    
    // 타이머
    private updateTimer: any = null;
    
    static getInstance(): LeaderboardManager {
        if (!this.instance) {
            this.instance = new LeaderboardManager();
        }
        return this.instance;
    }

    /**
     * [의도] 리더보드 시스템 초기화
     */
    async initialize(): Promise<void> {
        if (this._isInitialized) {
            console.warn('LeaderboardManager already initialized');
            return;
        }

        try {
            console.log('🔄 리더보드 시스템 초기화 시작...');
            
            // 기본 리더보드 생성
            this.setupDefaultLeaderboards();
            
            // 로컬 데이터 로드
            this.loadLeaderboardData();
            
            // 현재 시즌 확인
            this.checkCurrentSeason();
            
            // 정기 업데이트 타이머 시작
            this.startUpdateTimer();
            
            this._isInitialized = true;
            console.log('✅ 리더보드 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 리더보드 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * [의도] 기본 리더보드 설정
     */
    private setupDefaultLeaderboards(): void {
        const defaultBoards = [
            {
                type: LeaderboardType.GLOBAL_WEEKLY,
                name: '주간 글로벌 랭킹',
                description: '이번 주 전 세계 플레이어들의 점수 순위',
                seasonDuration: 7 * 24 * 60 * 60 * 1000 // 7일
            },
            {
                type: LeaderboardType.GLOBAL_MONTHLY,
                name: '월간 글로벌 랭킹',
                description: '이번 달 전 세계 플레이어들의 점수 순위',
                seasonDuration: 30 * 24 * 60 * 60 * 1000 // 30일
            },
            {
                type: LeaderboardType.FRIENDS_WEEKLY,
                name: '친구 주간 랭킹',
                description: '친구들과의 이번 주 점수 경쟁',
                seasonDuration: 7 * 24 * 60 * 60 * 1000 // 7일
            },
            {
                type: LeaderboardType.LEVEL_COMPLETION,
                name: '레벨 완주 랭킹',
                description: '가장 많은 레벨을 완료한 플레이어',
                seasonDuration: 30 * 24 * 60 * 60 * 1000 // 30일
            }
        ];

        const now = Date.now();
        
        defaultBoards.forEach(boardConfig => {
            const board: Leaderboard = {
                id: this.generateLeaderboardId(),
                type: boardConfig.type,
                name: boardConfig.name,
                description: boardConfig.description,
                entries: [],
                seasonId: this.generateSeasonId(),
                seasonStartTime: now,
                seasonEndTime: now + boardConfig.seasonDuration,
                maxEntries: this.maxRankEntries,
                updateInterval: this.updateInterval,
                isActive: true,
                totalParticipants: 0,
                lastResetTime: now,
                lastUpdateTime: now
            };
            
            this.leaderboards.set(boardConfig.type, board);
        });
        
        console.log(`📋 기본 리더보드 ${defaultBoards.length}개 생성 완료`);
    }

    /**
     * [의도] 점수 제출
     */
    async submitScore(submission: ScoreSubmission): Promise<boolean> {
        try {
            const leaderboard = this.leaderboards.get(submission.leaderboardType);
            if (!leaderboard || !leaderboard.isActive) {
                console.warn('리더보드를 찾을 수 없거나 비활성화됨:', submission.leaderboardType);
                return false;
            }
            
            // 플레이어의 기존 점수 확인
            let playerScores = this.playerScores.get(submission.playerId);
            if (!playerScores) {
                playerScores = new Map();
                this.playerScores.set(submission.playerId, playerScores);
            }
            
            const currentScore = playerScores.get(submission.leaderboardType) || 0;
            
            // 더 높은 점수인 경우만 업데이트
            if (submission.score > currentScore) {
                playerScores.set(submission.leaderboardType, submission.score);
                
                // 리더보드 엔트리 업데이트
                await this.updateLeaderboardEntry(leaderboard, submission);
                
                // 이벤트 발생
                EventBus.getInstance().emit('score_submitted', {
                    playerId: submission.playerId,
                    leaderboardType: submission.leaderboardType,
                    newScore: submission.score,
                    previousScore: currentScore
                });
                
                console.log(`📊 점수 제출: ${submission.leaderboardType} - ${submission.score}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ 점수 제출 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 리더보드 엔트리 업데이트
     */
    private async updateLeaderboardEntry(leaderboard: Leaderboard, submission: ScoreSubmission): Promise<void> {
        // 기존 엔트리 찾기
        let entry = leaderboard.entries.find(e => e.playerId === submission.playerId);
        
        if (!entry) {
            // 새 엔트리 생성
            entry = {
                playerId: submission.playerId,
                username: `Player_${submission.playerId.substr(-4)}`, // TODO: 실제 사용자명
                avatarUrl: 'avatars/default',
                score: submission.score,
                rank: 0,
                previousRank: 0,
                level: 1, // TODO: 실제 플레이어 레벨
                lastUpdated: submission.timestamp,
                seasonalScore: submission.score,
                weeklyScore: submission.score
            };
            
            leaderboard.entries.push(entry);
            leaderboard.totalParticipants++;
        } else {
            // 기존 엔트리 업데이트
            entry.previousRank = entry.rank;
            entry.score = submission.score;
            entry.lastUpdated = submission.timestamp;
            entry.seasonalScore = submission.score;
        }
        
        // 순위 재계산
        this.recalculateRanks(leaderboard);
        
        // 최대 엔트리 수 제한
        if (leaderboard.entries.length > leaderboard.maxEntries) {
            leaderboard.entries = leaderboard.entries
                .sort((a, b) => b.score - a.score)
                .slice(0, leaderboard.maxEntries);
        }
        
        leaderboard.lastUpdateTime = Date.now();
        this.saveLeaderboardData();
    }

    /**
     * [의도] 리더보드 순위 재계산
     */
    private recalculateRanks(leaderboard: Leaderboard): void {
        // 점수 순으로 정렬
        leaderboard.entries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // 점수 내림차순
            }
            return a.lastUpdated - b.lastUpdated; // 같은 점수면 먼저 달성한 순
        });
        
        // 순위 할당
        leaderboard.entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
    }

    /**
     * [의도] 특정 리더보드 조회
     */
    getLeaderboard(type: LeaderboardType, limit: number = 100): Leaderboard | null {
        const leaderboard = this.leaderboards.get(type);
        if (!leaderboard) {
            return null;
        }
        
        // 제한된 엔트리만 반환
        const limitedBoard = {
            ...leaderboard,
            entries: leaderboard.entries.slice(0, limit)
        };
        
        return limitedBoard;
    }

    /**
     * [의도] 플레이어 순위 조회
     */
    getPlayerRank(playerId: string, type: LeaderboardType): { rank: number; entry: LeaderboardEntry | null } {
        const leaderboard = this.leaderboards.get(type);
        if (!leaderboard) {
            return { rank: -1, entry: null };
        }
        
        const entry = leaderboard.entries.find(e => e.playerId === playerId);
        if (!entry) {
            return { rank: -1, entry: null };
        }
        
        return { rank: entry.rank, entry: entry };
    }

    /**
     * [의도] 현재 시즌 확인 및 관리
     */
    private checkCurrentSeason(): void {
        const now = Date.now();
        
        // 만료된 시즌 확인 및 리셋
        for (const [type, leaderboard] of this.leaderboards) {
            if (leaderboard.seasonEndTime <= now) {
                console.log(`🔄 시즌 종료 - 리더보드 리셋: ${type}`);
                
                // 시즌 종료 이벤트
                EventBus.getInstance().emit('season_ended', {
                    leaderboardType: type,
                    seasonId: leaderboard.seasonId,
                    topEntries: leaderboard.entries.slice(0, 10)
                });
                
                // 새 시즌 시작
                this.startNewSeason(leaderboard);
            }
        }
    }

    /**
     * [의도] 새 시즌 시작
     */
    private startNewSeason(leaderboard: Leaderboard): void {
        const now = Date.now();
        const seasonDuration = leaderboard.seasonEndTime - leaderboard.seasonStartTime;
        
        // 기존 시즌 데이터 보관 (TODO: 시즌 히스토리 저장)
        
        // 리더보드 리셋
        leaderboard.entries = [];
        leaderboard.seasonId = this.generateSeasonId();
        leaderboard.seasonStartTime = now;
        leaderboard.seasonEndTime = now + seasonDuration;
        leaderboard.totalParticipants = 0;
        leaderboard.lastResetTime = now;
        leaderboard.lastUpdateTime = now;
        
        // 새 시즌 시작 이벤트
        EventBus.getInstance().emit('season_started', {
            leaderboardType: leaderboard.type,
            seasonId: leaderboard.seasonId,
            endTime: leaderboard.seasonEndTime
        });
        
        console.log(`🆕 새 시즌 시작: ${leaderboard.type} (${leaderboard.seasonId})`);
    }

    /**
     * [의도] 정기 업데이트 타이머 시작
     */
    private startUpdateTimer(): void {
        this.updateTimer = setInterval(() => {
            this.checkCurrentSeason();
            // TODO: 서버와 동기화
        }, this.updateInterval);
        
        console.log(`⏰ 리더보드 업데이트 타이머 시작 (${this.updateInterval}ms)`);
    }

    /**
     * [의도] 로컬 데이터 로드
     */
    private loadLeaderboardData(): void {
        try {
            const savedData = sys.localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // 리더보드 데이터 복원
                if (data.leaderboards) {
                    for (const [type, boardData] of data.leaderboards) {
                        this.leaderboards.set(type as LeaderboardType, boardData);
                    }
                }
                
                // 플레이어 점수 복원
                if (data.playerScores) {
                    for (const [playerId, scores] of data.playerScores) {
                        this.playerScores.set(playerId, new Map(scores));
                    }
                }
                
                console.log(`📚 리더보드 데이터 로드 완료`);
            }
        } catch (error) {
            console.error('❌ 리더보드 데이터 로드 실패:', error);
        }
    }

    /**
     * [의도] 리더보드 데이터 저장
     */
    private saveLeaderboardData(): void {
        try {
            const dataToSave = {
                leaderboards: Array.from(this.leaderboards.entries()),
                playerScores: Array.from(this.playerScores.entries()).map(([playerId, scores]) => [
                    playerId,
                    Array.from(scores.entries())
                ])
            };
            
            sys.localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ 리더보드 데이터 저장 실패:', error);
        }
    }

    // 유틸리티 메서드들
    private generateLeaderboardId(): string {
        return `lb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateSeasonId(): string {
        return `season_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Getter 메서드들
    getAllLeaderboards(): Leaderboard[] {
        return Array.from(this.leaderboards.values());
    }

    getActiveLeaderboards(): Leaderboard[] {
        return Array.from(this.leaderboards.values()).filter(lb => lb.isActive);
    }

    getCurrentSeason(): Season | null {
        return this.currentSeason;
    }

    getPlayerTotalScore(playerId: string): number {
        const scores = this.playerScores.get(playerId);
        if (!scores) return 0;
        
        let total = 0;
        for (const score of scores.values()) {
            total += score;
        }
        return total;
    }

    /**
     * [의도] 리더보드 시스템 정리
     */
    cleanup(): void {
        console.log('🧹 리더보드 시스템 정리 중...');
        
        // 타이머 정리
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        // 데이터 저장
        this.saveLeaderboardData();
        
        // 메모리 정리
        this.leaderboards.clear();
        this.playerScores.clear();
        this.currentSeason = null;
        
        this._isInitialized = false;
        console.log('✅ 리더보드 시스템 정리 완료');
    }
}