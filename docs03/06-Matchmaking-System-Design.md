# Matchmaking System Design
Royal Clash - 매칭 시스템 설계

## 1. 매칭 시스템 개요

### 1.1 매칭 목표 및 원칙
```
매칭 시스템 핵심 원칙:
├── 공정성 (Fairness): 비슷한 실력의 플레이어 매칭
├── 속도 (Speed): 빠른 매칭 시간 (평균 10초 이하)
├── 연결성 (Connectivity): 안정적인 네트워크 연결
├── 다양성 (Variety): 다양한 상대와의 매칭
└── 재미 (Fun): 균형잡힌 경쟁적 경험
```

### 1.2 공정성 보장
- **ELO 기반 레이팅**: 실력 기반 매칭
- **레벨 제한**: 카드 레벨 차이 최소화  
- **연승/연패 보정**: 연속 결과에 따른 조정
- **신규 플레이어 보호**: 초보자 전용 풀 운영

### 1.3 대기시간 최적화
- **확장 검색**: 시간이 지날수록 매칭 범위 확대
- **지역별 서버**: 물리적 거리 기반 우선 매칭
- **봇 매칭**: 긴 대기 시 AI 상대 제공
- **우선순위 큐**: VIP/결제 유저 우선 처리

## 2. 랭킹 시스템

### 2.1 트로피 시스템
```typescript
// src/ranking/TrophySystem.ts
export interface TrophyCalculation {
    baseTrophy: number;
    opponentTrophy: number;
    playerLevel: number;
    opponentLevel: number;
    winProbability: number;
    result: 'win' | 'loss';
}

export class TrophySystem {
    private static readonly BASE_TROPHY_GAIN = 30;
    private static readonly BASE_TROPHY_LOSS = 25;
    private static readonly MAX_TROPHY_CHANGE = 50;
    private static readonly MIN_TROPHY_CHANGE = 8;
    
    public static calculateTrophyChange(calculation: TrophyCalculation): number {
        const { baseTrophy, opponentTrophy, result, winProbability } = calculation;
        
        let trophyChange = 0;
        
        if (result === 'win') {
            // 승리 시 트로피 획득
            trophyChange = this.BASE_TROPHY_GAIN;
            
            // 상대가 더 강할 때 보너스
            if (opponentTrophy > baseTrophy) {
                const bonus = Math.min(15, (opponentTrophy - baseTrophy) / 20);
                trophyChange += bonus;
            }
            
            // 승률이 낮았을 때 보너스
            if (winProbability < 0.4) {
                trophyChange += Math.floor((0.4 - winProbability) * 50);
            }
            
        } else {
            // 패배 시 트로피 손실
            trophyChange = -this.BASE_TROPHY_LOSS;
            
            // 상대가 더 약할 때 페널티
            if (opponentTrophy < baseTrophy) {
                const penalty = Math.min(15, (baseTrophy - opponentTrophy) / 20);
                trophyChange -= penalty;
            }
            
            // 승률이 높았을 때 페널티 감소
            if (winProbability > 0.6) {
                const reduction = Math.floor((winProbability - 0.6) * 50);
                trophyChange = Math.max(trophyChange + reduction, -this.MAX_TROPHY_CHANGE);
            }
        }
        
        // 최대/최소 변화량 제한
        trophyChange = Math.max(this.MIN_TROPHY_CHANGE * (result === 'win' ? 1 : -1), 
                              Math.min(this.MAX_TROPHY_CHANGE * (result === 'win' ? 1 : -1), trophyChange));
        
        return Math.round(trophyChange);
    }
    
    public static getArenaFromTrophies(trophies: number): Arena {
        const arenas = [
            { name: '트레이닝 캠프', minTrophies: 0, maxTrophies: 399 },
            { name: '고블린 스타디움', minTrophies: 400, maxTrophies: 799 },
            { name: '본 핏', minTrophies: 800, maxTrophies: 1199 },
            { name: '바바리안 볼', minTrophies: 1200, maxTrophies: 1599 },
            { name: 'P.E.K.K.A 플레이하우스', minTrophies: 1600, maxTrophies: 1999 },
            { name: '스펠 밸리', minTrophies: 2000, maxTrophies: 2599 },
            { name: '빌더스 워크샵', minTrophies: 2600, maxTrophies: 3199 },
            { name: '로얄 스타디움', minTrophies: 3200, maxTrophies: 3799 },
            { name: '프로즌 피크', minTrophies: 3800, maxTrophies: 4399 },
            { name: '정글 아레나', minTrophies: 4400, maxTrophies: 4999 },
            { name: '호그 마운틴', minTrophies: 5000, maxTrophies: 5599 },
            { name: '일렉트로 밸리', minTrophies: 5600, maxTrophies: 6299 },
            { name: '스피키 스타디움', minTrophies: 6300, maxTrophies: 6999 },
            { name: '래더 토너먼트', minTrophies: 7000, maxTrophies: 7999 },
            { name: '로얄 챔피언십', minTrophies: 8000, maxTrophies: Number.MAX_SAFE_INTEGER }
        ];
        
        return arenas.find(arena => 
            trophies >= arena.minTrophies && trophies <= arena.maxTrophies
        ) || arenas[0];
    }
    
    public static canLoseTrophiesInArena(arena: string): boolean {
        // 레전드 아레나 이하에서는 특정 아레나 최소 트로피 이하로 떨어지지 않음
        const protectedArenas = [
            '트레이닝 캠프', '고블린 스타디움', '본 핏', '바바리안 볼'
        ];
        
        return !protectedArenas.includes(arena);
    }
}

export interface Arena {
    name: string;
    minTrophies: number;
    maxTrophies: number;
}
```

### 2.2 리그 구조
```typescript
// src/ranking/LeagueSystem.ts
export enum LeagueType {
    BRONZE = 'bronze',
    SILVER = 'silver', 
    GOLD = 'gold',
    PLATINUM = 'platinum',
    DIAMOND = 'diamond',
    MASTER = 'master',
    GRANDMASTER = 'grandmaster',
    LEGEND = 'legend'
}

export interface League {
    type: LeagueType;
    name: string;
    minTrophies: number;
    maxTrophies: number;
    divisions: number;
    seasonRewards: SeasonReward[];
    icon: string;
    color: string;
}

export const LEAGUES: { [key in LeagueType]: League } = {
    [LeagueType.BRONZE]: {
        type: LeagueType.BRONZE,
        name: '브론즈 리그',
        minTrophies: 0,
        maxTrophies: 999,
        divisions: 3,
        seasonRewards: [
            { type: 'gold', amount: 1000 },
            { type: 'cards', amount: 5 }
        ],
        icon: 'bronze_icon',
        color: '#CD7F32'
    },
    [LeagueType.SILVER]: {
        type: LeagueType.SILVER,
        name: '실버 리그',
        minTrophies: 1000,
        maxTrophies: 1999,
        divisions: 3,
        seasonRewards: [
            { type: 'gold', amount: 2000 },
            { type: 'cards', amount: 10 },
            { type: 'gems', amount: 5 }
        ],
        icon: 'silver_icon',
        color: '#C0C0C0'
    },
    [LeagueType.GOLD]: {
        type: LeagueType.GOLD,
        name: '골드 리그',
        minTrophies: 2000,
        maxTrophies: 2999,
        divisions: 3,
        seasonRewards: [
            { type: 'gold', amount: 3000 },
            { type: 'cards', amount: 15 },
            { type: 'gems', amount: 10 }
        ],
        icon: 'gold_icon',
        color: '#FFD700'
    },
    [LeagueType.LEGEND]: {
        type: LeagueType.LEGEND,
        name: '레전드 리그',
        minTrophies: 7000,
        maxTrophies: Number.MAX_SAFE_INTEGER,
        divisions: 1,
        seasonRewards: [
            { type: 'gold', amount: 20000 },
            { type: 'legendary_card', amount: 1 },
            { type: 'gems', amount: 100 },
            { type: 'exclusive_emote', amount: 1 }
        ],
        icon: 'legend_icon',
        color: '#FF6B6B'
    }
};

export class LeagueSystem {
    public static getLeagueFromTrophies(trophies: number): League {
        const leagues = Object.values(LEAGUES);
        
        return leagues.find(league => 
            trophies >= league.minTrophies && trophies <= league.maxTrophies
        ) || LEAGUES[LeagueType.BRONZE];
    }
    
    public static getDivisionFromTrophies(trophies: number, league: League): number {
        if (league.divisions === 1) return 1;
        
        const trophyRange = league.maxTrophies - league.minTrophies;
        const divisionSize = trophyRange / league.divisions;
        const relativePosition = trophies - league.minTrophies;
        
        return Math.min(league.divisions, Math.floor(relativePosition / divisionSize) + 1);
    }
    
    public static getSeasonRewards(finalTrophies: number): SeasonReward[] {
        const league = this.getLeagueFromTrophies(finalTrophies);
        return league.seasonRewards;
    }
}

export interface SeasonReward {
    type: 'gold' | 'gems' | 'cards' | 'legendary_card' | 'exclusive_emote';
    amount: number;
}
```

### 2.3 시즌 리셋
```typescript
// src/ranking/SeasonManager.ts
export class SeasonManager {
    private static readonly SEASON_LENGTH = 30; // 30일
    private static readonly LEGEND_TROPHY_RESET = 6000; // 레전드는 6000으로 리셋
    
    public static calculateSeasonReset(currentTrophies: number): number {
        if (currentTrophies < 4000) {
            // 4000 이하는 리셋 없음
            return currentTrophies;
        } else if (currentTrophies < 6000) {
            // 4000-6000: 점진적 리셋
            const resetAmount = Math.floor((currentTrophies - 4000) * 0.5);
            return currentTrophies - resetAmount;
        } else {
            // 6000 이상: 고정 리셋
            return this.LEGEND_TROPHY_RESET;
        }
    }
    
    public static getCurrentSeasonInfo(): SeasonInfo {
        const seasonStart = this.getCurrentSeasonStart();
        const seasonEnd = new Date(seasonStart);
        seasonEnd.setDate(seasonEnd.getDate() + this.SEASON_LENGTH);
        
        return {
            seasonNumber: this.getCurrentSeasonNumber(),
            startDate: seasonStart,
            endDate: seasonEnd,
            daysRemaining: this.getDaysUntilSeasonEnd(),
            theme: this.getSeasonTheme()
        };
    }
    
    private static getCurrentSeasonStart(): Date {
        const gameStartDate = new Date('2024-01-01'); // 게임 시작일
        const daysSinceStart = Math.floor((Date.now() - gameStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const seasonsSinceStart = Math.floor(daysSinceStart / this.SEASON_LENGTH);
        
        const seasonStart = new Date(gameStartDate);
        seasonStart.setDate(seasonStart.getDate() + (seasonsSinceStart * this.SEASON_LENGTH));
        
        return seasonStart;
    }
    
    private static getSeasonTheme(): string {
        const themes = [
            'Spring Festival', 'Summer Clash', 'Autumn Harvest', 'Winter Storm',
            'Dragon Rising', 'Knight\'s Honor', 'Wizard\'s Tower', 'Goblin Mayhem'
        ];
        
        const seasonNumber = this.getCurrentSeasonNumber();
        return themes[seasonNumber % themes.length];
    }
}

export interface SeasonInfo {
    seasonNumber: number;
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    theme: string;
}
```

### 2.4 레이팅 계산
```typescript
// src/ranking/EloSystem.ts
export class EloSystem {
    private static readonly K_FACTOR = 32; // 표준 K값
    private static readonly RATING_FLOOR = 800; // 최소 레이팅
    
    public static calculateEloChange(
        playerRating: number,
        opponentRating: number,
        result: number, // 1 = 승, 0.5 = 무, 0 = 패
        kFactor: number = this.K_FACTOR
    ): number {
        const expectedScore = this.calculateExpectedScore(playerRating, opponentRating);
        const ratingChange = Math.round(kFactor * (result - expectedScore));
        
        // 레이팅 하한선 적용
        const newRating = playerRating + ratingChange;
        if (newRating < this.RATING_FLOOR) {
            return this.RATING_FLOOR - playerRating;
        }
        
        return ratingChange;
    }
    
    private static calculateExpectedScore(playerRating: number, opponentRating: number): number {
        const ratingDifference = opponentRating - playerRating;
        return 1 / (1 + Math.pow(10, ratingDifference / 400));
    }
    
    public static getAdaptiveKFactor(playerRating: number, gamesPlayed: number): number {
        // 신규 플레이어는 높은 K값
        if (gamesPlayed < 30) {
            return 50;
        }
        
        // 높은 레이팅에서는 낮은 K값
        if (playerRating > 2400) {
            return 16;
        }
        
        // 중간 레이팅에서는 표준 K값
        return this.K_FACTOR;
    }
    
    public static calculateWinProbability(playerRating: number, opponentRating: number): number {
        return this.calculateExpectedScore(playerRating, opponentRating);
    }
    
    public static getRatingDeviation(wins: number, losses: number, draws: number = 0): number {
        const totalGames = wins + losses + draws;
        if (totalGames === 0) return 350; // 신규 플레이어 기본 RD
        
        // 게임 수가 많을수록 편차 감소
        const baseDeviation = 350;
        const reductionFactor = Math.min(totalGames / 20, 1);
        
        return Math.max(50, baseDeviation * (1 - reductionFactor * 0.8));
    }
}
```

## 3. 매칭 알고리즘

### 3.1 ELO 기반 매칭
```typescript
// src/matchmaking/MatchmakingAlgorithm.ts
export interface MatchmakingPlayer {
    id: string;
    displayName: string;
    trophies: number;
    level: number;
    region: string;
    deck: Card[];
    averageCardLevel: number;
    connectionQuality: number;
    joinTime: number;
    preferredOpponents: string[]; // 최근 상대한 플레이어 제외
    winStreak: number;
    lossStreak: number;
}

export interface MatchmakingCriteria {
    trophyRange: number;
    levelRange: number;
    cardLevelRange: number;
    maxWaitTime: number;
    preferSameRegion: boolean;
    avoidRecentOpponents: boolean;
}

export class MatchmakingAlgorithm {
    private static readonly BASE_TROPHY_RANGE = 100;
    private static readonly MAX_TROPHY_RANGE = 500;
    private static readonly EXPANSION_RATE = 20; // 초당 확장량
    
    public static findBestMatch(
        player: MatchmakingPlayer,
        candidates: MatchmakingPlayer[],
        waitTime: number
    ): MatchmakingPlayer | null {
        
        const criteria = this.calculateCriteria(player, waitTime);
        const validCandidates = this.filterCandidates(player, candidates, criteria);
        
        if (validCandidates.length === 0) {
            return null;
        }
        
        // 점수 기반으로 최적 상대 선택
        const scoredCandidates = validCandidates.map(candidate => ({
            player: candidate,
            score: this.calculateMatchScore(player, candidate)
        }));
        
        // 점수순 정렬 후 최고 점수 반환
        scoredCandidates.sort((a, b) => b.score - a.score);
        return scoredCandidates[0].player;
    }
    
    private static calculateCriteria(player: MatchmakingPlayer, waitTime: number): MatchmakingCriteria {
        const waitTimeSeconds = waitTime / 1000;
        
        // 대기 시간에 따른 범위 확장
        const trophyRange = Math.min(
            this.BASE_TROPHY_RANGE + (waitTimeSeconds * this.EXPANSION_RATE),
            this.MAX_TROPHY_RANGE
        );
        
        const levelRange = Math.min(2 + Math.floor(waitTimeSeconds / 5), 5);
        const cardLevelRange = Math.min(1 + Math.floor(waitTimeSeconds / 10), 3);
        
        return {
            trophyRange,
            levelRange,
            cardLevelRange,
            maxWaitTime: 120000, // 2분 최대 대기
            preferSameRegion: waitTimeSeconds < 30,
            avoidRecentOpponents: waitTimeSeconds < 60
        };
    }
    
    private static filterCandidates(
        player: MatchmakingPlayer,
        candidates: MatchmakingPlayer[],
        criteria: MatchmakingCriteria
    ): MatchmakingPlayer[] {
        
        return candidates.filter(candidate => {
            // 자기 자신 제외
            if (candidate.id === player.id) return false;
            
            // 트로피 범위 확인
            const trophyDiff = Math.abs(player.trophies - candidate.trophies);
            if (trophyDiff > criteria.trophyRange) return false;
            
            // 레벨 범위 확인
            const levelDiff = Math.abs(player.level - candidate.level);
            if (levelDiff > criteria.levelRange) return false;
            
            // 카드 레벨 범위 확인
            const cardLevelDiff = Math.abs(player.averageCardLevel - candidate.averageCardLevel);
            if (cardLevelDiff > criteria.cardLevelRange) return false;
            
            // 최근 상대 제외
            if (criteria.avoidRecentOpponents && 
                player.preferredOpponents.includes(candidate.id)) {
                return false;
            }
            
            // 지역 선호도
            if (criteria.preferSameRegion && player.region !== candidate.region) {
                return false;
            }
            
            return true;
        });
    }
    
    private static calculateMatchScore(player: MatchmakingPlayer, candidate: MatchmakingPlayer): number {
        let score = 100;
        
        // 트로피 차이 점수 (차이가 적을수록 높은 점수)
        const trophyDiff = Math.abs(player.trophies - candidate.trophies);
        score -= trophyDiff * 0.1;
        
        // 레벨 차이 점수
        const levelDiff = Math.abs(player.level - candidate.level);
        score -= levelDiff * 5;
        
        // 카드 레벨 차이 점수
        const cardLevelDiff = Math.abs(player.averageCardLevel - candidate.averageCardLevel);
        score -= cardLevelDiff * 10;
        
        // 연결 품질 점수
        score += candidate.connectionQuality * 0.2;
        
        // 같은 지역 보너스
        if (player.region === candidate.region) {
            score += 10;
        }
        
        // 연승/연패 보정
        const playerStreak = Math.max(player.winStreak, player.lossStreak);
        const candidateStreak = Math.max(candidate.winStreak, candidate.lossStreak);
        const streakDiff = Math.abs(playerStreak - candidateStreak);
        score -= streakDiff * 2;
        
        // 대기 시간 보너스 (오래 기다린 플레이어에게 유리)
        const waitTime = Date.now() - candidate.joinTime;
        score += Math.min(waitTime / 1000, 60) * 0.5;
        
        return Math.max(0, score);
    }
    
    public static shouldUseBot(waitTime: number, playerTrophies: number): boolean {
        const waitTimeSeconds = waitTime / 1000;
        
        // 신규 플레이어는 더 빨리 봇 매칭
        if (playerTrophies < 1000 && waitTimeSeconds > 30) {
            return true;
        }
        
        // 일반 플레이어는 90초 후 봇 매칭
        if (waitTimeSeconds > 90) {
            return true;
        }
        
        return false;
    }
}
```

### 3.2 레벨 제한
```typescript
// src/matchmaking/LevelBalancing.ts
export class LevelBalancing {
    private static readonly CARD_LEVEL_IMPORTANCE = 0.7;
    private static readonly PLAYER_LEVEL_IMPORTANCE = 0.3;
    
    public static calculatePowerScore(player: MatchmakingPlayer): number {
        const averageCardLevel = this.calculateAverageCardLevel(player.deck);
        const playerLevelBonus = player.level * 0.1;
        
        return (averageCardLevel * this.CARD_LEVEL_IMPORTANCE) + 
               (playerLevelBonus * this.PLAYER_LEVEL_IMPORTANCE);
    }
    
    private static calculateAverageCardLevel(deck: Card[]): number {
        const totalLevel = deck.reduce((sum, card) => sum + (card.level || 1), 0);
        return totalLevel / deck.length;
    }
    
    public static isBalancedMatch(player1: MatchmakingPlayer, player2: MatchmakingPlayer): boolean {
        const power1 = this.calculatePowerScore(player1);
        const power2 = this.calculatePowerScore(player2);
        
        const powerDifference = Math.abs(power1 - power2);
        const allowedDifference = this.getAllowedPowerDifference(player1.trophies);
        
        return powerDifference <= allowedDifference;
    }
    
    private static getAllowedPowerDifference(trophies: number): number {
        // 높은 트로피에서는 더 엄격한 제한
        if (trophies >= 6000) return 0.5;
        if (trophies >= 4000) return 1.0;
        if (trophies >= 2000) return 1.5;
        return 2.0; // 신규 플레이어는 관대하게
    }
    
    public static applyLevelCaps(player: MatchmakingPlayer): Card[] {
        const cappedDeck = [...player.deck];
        const trophyBasedCap = this.getTrophyBasedLevelCap(player.trophies);
        
        return cappedDeck.map(card => {
            if (card.level && card.level > trophyBasedCap) {
                return { ...card, level: trophyBasedCap };
            }
            return card;
        });
    }
    
    private static getTrophyBasedLevelCap(trophies: number): number {
        if (trophies < 1000) return 8;
        if (trophies < 2000) return 9;
        if (trophies < 3000) return 10;
        if (trophies < 4000) return 11;
        if (trophies < 5000) return 12;
        return 13; // 최대 레벨
    }
}
```

### 3.3 연승/연패 보정
```typescript
// src/matchmaking/StreakCompensation.ts
export class StreakCompensation {
    private static readonly MAX_STREAK_ADJUSTMENT = 200; // 최대 트로피 조정값
    
    public static getAdjustedTrophies(player: MatchmakingPlayer): number {
        const baseTrophies = player.trophies;
        let adjustment = 0;
        
        // 연패 시 더 쉬운 상대와 매칭
        if (player.lossStreak >= 3) {
            adjustment = -Math.min(
                this.MAX_STREAK_ADJUSTMENT,
                player.lossStreak * 20
            );
        }
        
        // 연승 시 더 어려운 상대와 매칭
        if (player.winStreak >= 3) {
            adjustment = Math.min(
                this.MAX_STREAK_ADJUSTMENT,
                player.winStreak * 15
            );
        }
        
        return baseTrophies + adjustment;
    }
    
    public static shouldApplyRubberBanding(player: MatchmakingPlayer): boolean {
        // 극심한 연패 시 러버밴딩 적용
        return player.lossStreak >= 5;
    }
    
    public static getRubberBandingBonus(lossStreak: number): number {
        if (lossStreak < 5) return 0;
        
        // 연패수에 따른 보너스 (승률 증가 효과)
        return Math.min(0.2, (lossStreak - 4) * 0.05);
    }
    
    public static updatePlayerStreak(
        player: MatchmakingPlayer, 
        matchResult: 'win' | 'loss'
    ): void {
        if (matchResult === 'win') {
            player.winStreak += 1;
            player.lossStreak = 0;
        } else {
            player.lossStreak += 1;
            player.winStreak = 0;
        }
        
        // 연승/연패 기록 저장
        this.recordStreakEvent(player, matchResult);
    }
    
    private static recordStreakEvent(player: MatchmakingPlayer, result: 'win' | 'loss'): void {
        const streakValue = result === 'win' ? player.winStreak : player.lossStreak;
        
        // 특별한 연승/연패 달성 시 이벤트 기록
        if ([3, 5, 7, 10, 15, 20].includes(streakValue)) {
            AnalyticsManager.instance.trackEvent('streak_milestone', {
                player_id: player.id,
                streak_type: result,
                streak_length: streakValue,
                player_trophies: player.trophies
            });
        }
    }
}
```

### 3.4 지역별 매칭
```typescript
// src/matchmaking/RegionalMatching.ts
export enum Region {
    NORTH_AMERICA = 'na',
    SOUTH_AMERICA = 'sa',
    EUROPE = 'eu',
    ASIA = 'asia',
    OCEANIA = 'oc',
    MIDDLE_EAST = 'me',
    AFRICA = 'af'
}

export interface RegionInfo {
    code: string;
    name: string;
    servers: string[];
    timezone: string;
    peakHours: number[]; // 24시간 기준
}

export const REGIONS: { [key in Region]: RegionInfo } = {
    [Region.NORTH_AMERICA]: {
        code: 'na',
        name: 'North America',
        servers: ['us-east-1', 'us-west-1', 'ca-central-1'],
        timezone: 'America/New_York',
        peakHours: [19, 20, 21, 22] // 7-10 PM
    },
    [Region.EUROPE]: {
        code: 'eu',
        name: 'Europe',
        servers: ['eu-west-1', 'eu-central-1', 'eu-north-1'],
        timezone: 'Europe/London',
        peakHours: [20, 21, 22, 23] // 8-11 PM
    },
    [Region.ASIA]: {
        code: 'asia',
        name: 'Asia',
        servers: ['ap-northeast-1', 'ap-southeast-1', 'ap-south-1'],
        timezone: 'Asia/Tokyo',
        peakHours: [19, 20, 21, 22] // 7-10 PM
    }
};

export class RegionalMatching {
    public static getPlayerRegion(playerLocation: { lat: number, lng: number }): Region {
        // 플레이어 위치를 기반으로 지역 결정
        const { lat, lng } = playerLocation;
        
        if (lat >= 25 && lat <= 75 && lng >= -180 && lng <= -60) {
            return Region.NORTH_AMERICA;
        } else if (lat >= -60 && lat <= 25 && lng >= -90 && lng <= -30) {
            return Region.SOUTH_AMERICA;
        } else if (lat >= 35 && lat <= 75 && lng >= -15 && lng <= 50) {
            return Region.EUROPE;
        } else if (lat >= -50 && lat <= 60 && lng >= 60 && lng <= 180) {
            return Region.ASIA;
        } else if (lat >= -50 && lat <= -10 && lng >= 110 && lng <= 180) {
            return Region.OCEANIA;
        } else if (lat >= 10 && lat <= 40 && lng >= 25 && lng <= 70) {
            return Region.MIDDLE_EAST;
        } else {
            return Region.AFRICA;
        }
    }
    
    public static getBestServerForMatch(
        player1Region: Region, 
        player2Region: Region
    ): string {
        const region1Info = REGIONS[player1Region];
        const region2Info = REGIONS[player2Region];
        
        // 같은 지역이면 해당 지역 서버 사용
        if (player1Region === player2Region) {
            return this.selectBestServerInRegion(region1Info.servers);
        }
        
        // 다른 지역이면 중간 지점 서버 선택
        return this.selectCrossRegionServer(player1Region, player2Region);
    }
    
    private static selectBestServerInRegion(servers: string[]): string {
        // 서버 부하를 고려한 선택 (실제로는 서버 모니터링 데이터 사용)
        const serverLoads = new Map([
            ['us-east-1', 0.7],
            ['us-west-1', 0.6],
            ['eu-west-1', 0.8],
            ['eu-central-1', 0.5],
            ['ap-northeast-1', 0.9],
            ['ap-southeast-1', 0.4]
        ]);
        
        let bestServer = servers[0];
        let lowestLoad = serverLoads.get(bestServer) || 1.0;
        
        for (const server of servers) {
            const load = serverLoads.get(server) || 1.0;
            if (load < lowestLoad) {
                bestServer = server;
                lowestLoad = load;
            }
        }
        
        return bestServer;
    }
    
    private static selectCrossRegionServer(region1: Region, region2: Region): string {
        // 지역 간 최적 서버 매핑
        const crossRegionMapping: { [key: string]: string } = {
            [`${Region.NORTH_AMERICA}_${Region.EUROPE}`]: 'us-east-1',
            [`${Region.EUROPE}_${Region.NORTH_AMERICA}`]: 'eu-west-1',
            [`${Region.ASIA}_${Region.OCEANIA}`]: 'ap-southeast-1',
            [`${Region.OCEANIA}_${Region.ASIA}`]: 'ap-southeast-1'
        };
        
        const key1 = `${region1}_${region2}`;
        const key2 = `${region2}_${region1}`;
        
        return crossRegionMapping[key1] || crossRegionMapping[key2] || 'us-east-1';
    }
    
    public static calculateLatency(playerRegion: Region, serverLocation: string): number {
        // 지역별 예상 지연시간 (실제로는 ping 테스트 결과 사용)
        const latencyMap: { [key: string]: number } = {
            [`${Region.NORTH_AMERICA}_us-east-1`]: 30,
            [`${Region.NORTH_AMERICA}_us-west-1`]: 50,
            [`${Region.NORTH_AMERICA}_eu-west-1`]: 120,
            [`${Region.EUROPE}_eu-west-1`]: 25,
            [`${Region.EUROPE}_eu-central-1`]: 35,
            [`${Region.EUROPE}_us-east-1`]: 100,
            [`${Region.ASIA}_ap-northeast-1`]: 20,
            [`${Region.ASIA}_ap-southeast-1`]: 40,
            [`${Region.ASIA}_us-west-1`]: 150
        };
        
        const key = `${playerRegion}_${serverLocation}`;
        return latencyMap[key] || 200; // 기본 높은 지연시간
    }
}
```

## 4. 매칭 대기열 관리

### 4.1 대기열 우선순위
```typescript
// src/matchmaking/MatchmakingQueue.ts
export enum QueuePriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    VIP = 3,
    PREMIUM = 4
}

export interface QueuedPlayer extends MatchmakingPlayer {
    priority: QueuePriority;
    queueStartTime: number;
    estimatedWaitTime: number;
    retryCount: number;
}

export class MatchmakingQueue {
    private queues: Map<Region, QueuedPlayer[]> = new Map();
    private matchingInProgress = new Set<string>();
    private queueStats = new Map<Region, QueueStats>();
    
    constructor() {
        // 지역별 큐 초기화
        Object.values(Region).forEach(region => {
            this.queues.set(region, []);
            this.queueStats.set(region, {
                averageWaitTime: 15000,
                activeUsers: 0,
                successfulMatches: 0,
                failedMatches: 0
            });
        });
        
        // 매칭 프로세스 시작
        this.startMatchingProcess();
    }
    
    public addToQueue(player: MatchmakingPlayer, priority: QueuePriority = QueuePriority.NORMAL): void {
        const queuedPlayer: QueuedPlayer = {
            ...player,
            priority,
            queueStartTime: Date.now(),
            estimatedWaitTime: this.estimateWaitTime(player.region, priority),
            retryCount: 0
        };
        
        const regionalQueue = this.queues.get(player.region);
        if (regionalQueue) {
            // 우선순위에 따라 정렬된 위치에 삽입
            const insertIndex = this.findInsertionIndex(regionalQueue, queuedPlayer);
            regionalQueue.splice(insertIndex, 0, queuedPlayer);
            
            this.updateQueueStats(player.region);
        }
        
        AnalyticsManager.instance.trackEvent('queue_joined', {
            player_id: player.id,
            region: player.region,
            priority: priority,
            queue_size: regionalQueue?.length || 0,
            estimated_wait: queuedPlayer.estimatedWaitTime
        });
    }
    
    public removeFromQueue(playerId: string): boolean {
        for (const [region, queue] of this.queues.entries()) {
            const index = queue.findIndex(p => p.id === playerId);
            if (index !== -1) {
                const player = queue[index];
                queue.splice(index, 1);
                
                AnalyticsManager.instance.trackEvent('queue_left', {
                    player_id: playerId,
                    region: region,
                    wait_time: Date.now() - player.queueStartTime,
                    reason: 'manual_leave'
                });
                
                this.updateQueueStats(region);
                return true;
            }
        }
        return false;
    }
    
    private findInsertionIndex(queue: QueuedPlayer[], newPlayer: QueuedPlayer): number {
        for (let i = 0; i < queue.length; i++) {
            const currentPlayer = queue[i];
            
            // 우선순위가 높으면 앞에 삽입
            if (newPlayer.priority > currentPlayer.priority) {
                return i;
            }
            
            // 같은 우선순위면 대기시간이 긴 순서로
            if (newPlayer.priority === currentPlayer.priority &&
                newPlayer.queueStartTime < currentPlayer.queueStartTime) {
                return i;
            }
        }
        
        return queue.length; // 맨 뒤에 삽입
    }
    
    private startMatchingProcess(): void {
        setInterval(() => {
            this.processMatching();
        }, 1000); // 1초마다 매칭 시도
    }
    
    private processMatching(): void {
        for (const [region, queue] of this.queues.entries()) {
            this.processRegionalQueue(region, queue);
        }
    }
    
    private processRegionalQueue(region: Region, queue: QueuedPlayer[]): void {
        const availablePlayers = queue.filter(p => !this.matchingInProgress.has(p.id));
        
        for (let i = 0; i < availablePlayers.length - 1; i++) {
            const player1 = availablePlayers[i];
            const waitTime1 = Date.now() - player1.queueStartTime;
            
            // 봇 매칭 확인
            if (MatchmakingAlgorithm.shouldUseBot(waitTime1, player1.trophies)) {
                this.createBotMatch(player1);
                continue;
            }
            
            // 다른 플레이어와 매칭 시도
            const opponent = MatchmakingAlgorithm.findBestMatch(
                player1,
                availablePlayers.slice(i + 1),
                waitTime1
            );
            
            if (opponent) {
                this.createMatch(player1, opponent);
                continue;
            }
            
            // 크로스 리전 매칭 시도 (대기시간이 길 경우)
            if (waitTime1 > 60000) { // 1분 초과
                const crossRegionOpponent = this.findCrossRegionOpponent(player1);
                if (crossRegionOpponent) {
                    this.createMatch(player1, crossRegionOpponent);
                }
            }
        }
    }
    
    private createMatch(player1: QueuedPlayer, player2: QueuedPlayer): void {
        // 매칭 진행 중으로 표시
        this.matchingInProgress.add(player1.id);
        this.matchingInProgress.add(player2.id);
        
        // 큐에서 제거
        this.removeFromQueue(player1.id);
        this.removeFromQueue(player2.id);
        
        // 서버 선택
        const serverLocation = RegionalMatching.getBestServerForMatch(
            player1.region as Region,
            player2.region as Region
        );
        
        // 매치 생성
        const matchData = {
            player1: player1,
            player2: player2,
            serverLocation: serverLocation,
            matchId: this.generateMatchId(),
            createdAt: Date.now()
        };
        
        // 매치 서버에 전달
        BattleManager.instance.createMatch(matchData);
        
        // 통계 업데이트
        this.updateMatchStats(player1.region as Region, player2.region as Region, true);
        
        AnalyticsManager.instance.trackEvent('match_created', {
            player1_id: player1.id,
            player2_id: player2.id,
            player1_wait_time: Date.now() - player1.queueStartTime,
            player2_wait_time: Date.now() - player2.queueStartTime,
            trophy_difference: Math.abs(player1.trophies - player2.trophies),
            server_location: serverLocation
        });
    }
    
    private createBotMatch(player: QueuedPlayer): void {
        this.matchingInProgress.add(player.id);
        this.removeFromQueue(player.id);
        
        // AI 봇 생성
        const botPlayer = this.createBotOpponent(player);
        
        const matchData = {
            player1: player,
            player2: botPlayer,
            serverLocation: REGIONS[player.region as Region].servers[0],
            matchId: this.generateMatchId(),
            createdAt: Date.now(),
            isBotMatch: true
        };
        
        BattleManager.instance.createMatch(matchData);
        
        AnalyticsManager.instance.trackEvent('bot_match_created', {
            player_id: player.id,
            wait_time: Date.now() - player.queueStartTime,
            player_trophies: player.trophies,
            bot_difficulty: this.calculateBotDifficulty(player)
        });
    }
    
    private createBotOpponent(player: QueuedPlayer): MatchmakingPlayer {
        const difficulty = this.calculateBotDifficulty(player);
        
        return {
            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            displayName: this.generateBotName(),
            trophies: player.trophies + (Math.random() - 0.5) * 100,
            level: player.level + Math.floor((Math.random() - 0.5) * 2),
            region: player.region,
            deck: this.generateBotDeck(difficulty),
            averageCardLevel: player.averageCardLevel,
            connectionQuality: 1.0,
            joinTime: Date.now(),
            preferredOpponents: [],
            winStreak: 0,
            lossStreak: 0
        };
    }
    
    private calculateBotDifficulty(player: QueuedPlayer): number {
        // 플레이어의 연패를 고려한 봇 난이도 조정
        let baseDifficulty = 0.5; // 중간 난이도
        
        if (player.lossStreak >= 3) {
            baseDifficulty -= player.lossStreak * 0.05; // 연패 시 난이도 하락
        } else if (player.winStreak >= 3) {
            baseDifficulty += player.winStreak * 0.03; // 연승 시 난이도 상승
        }
        
        return Math.max(0.1, Math.min(0.9, baseDifficulty));
    }
    
    private estimateWaitTime(region: string, priority: QueuePriority): number {
        const stats = this.queueStats.get(region as Region);
        if (!stats) return 30000; // 기본 30초
        
        let baseWaitTime = stats.averageWaitTime;
        
        // 우선순위에 따른 조정
        switch (priority) {
            case QueuePriority.PREMIUM:
                baseWaitTime *= 0.3;
                break;
            case QueuePriority.VIP:
                baseWaitTime *= 0.5;
                break;
            case QueuePriority.HIGH:
                baseWaitTime *= 0.7;
                break;
            case QueuePriority.LOW:
                baseWaitTime *= 1.3;
                break;
        }
        
        return Math.max(5000, baseWaitTime); // 최소 5초
    }
    
    public getQueueStatus(region: Region): QueueStatus {
        const queue = this.queues.get(region) || [];
        const stats = this.queueStats.get(region);
        
        return {
            queueSize: queue.length,
            averageWaitTime: stats?.averageWaitTime || 30000,
            activeMatches: this.matchingInProgress.size / 2,
            serverLoad: this.calculateServerLoad(region)
        };
    }
}

export interface QueueStats {
    averageWaitTime: number;
    activeUsers: number;
    successfulMatches: number;
    failedMatches: number;
}

export interface QueueStatus {
    queueSize: number;
    averageWaitTime: number;
    activeMatches: number;
    serverLoad: number;
}
```

이 매칭 시스템 설계는 클래시 로얄과 같은 실시간 PvP 게임의 복잡한 매칭 요구사항을 포괄적으로 다루면서, 공정성과 빠른 매칭 시간을 모두 보장하는 현대적인 시스템입니다.