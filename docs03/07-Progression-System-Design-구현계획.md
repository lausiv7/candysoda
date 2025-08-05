# 진행 시스템 구현계획

## 문서 정보
- **문서명**: 진행 시스템 구현계획
- **버전**: 1.0
- **작성일**: 2025-01-19
- **작성자**: Claude AI
- **프로젝트**: Royal Clash - 실시간 전략 PvP 게임

## 목차
1. [구현 개요](#1-구현-개요)
2. [개발 일정](#2-개발-일정)
3. [핵심 구현](#3-핵심-구현)
4. [데이터 관리](#4-데이터-관리)
5. [시스템 통합](#5-시스템-통합)

## 1. 구현 개요

### 1.1 기술 스택
- **게임 엔진**: Cocos Creator 3.x
- **언어**: TypeScript
- **백엔드**: Node.js + Express
- **데이터베이스**: PostgreSQL + Redis
- **분석**: Firebase Analytics

### 1.2 구현 목표
- **경험치 처리**: 초당 1000+ 업데이트
- **실시간 진행도**: 100ms 이내 반영
- **보상 시스템**: 안정적 지급 보장
- **시즌 관리**: 자동화된 전환

## 2. 개발 일정

### 2.1 Phase 1: 기본 진행 시스템 (2주)
```typescript
const phase1Tasks = {
  week1: ['경험치 시스템', '레벨링 구조', '기본 업적'],
  week2: ['트로피 시스템', '아레나 진급', '데이터 저장']
};
```

### 2.2 Phase 2: 시즌 시스템 (2주)
```typescript
const phase2Tasks = {
  week1: ['시즌 패스', '보상 시스템', '리더보드'],
  week2: ['시즌 전환', '리셋 로직', '통계 수집']
};
```

### 2.3 Phase 3: 고급 기능 (1주)
```typescript
const phase3Tasks = {
  week1: ['성취 시스템', '일일 퀘스트', '최적화']
};
```

## 3. 핵심 구현

### 3.1 경험치 시스템
```typescript
// [의도] 플레이어 성장과 진행을 관리하는 핵심 시스템
// [책임] 경험치 계산, 레벨업 처리, 보상 지급
export class ExperienceSystem {
  private playerData: Map<string, PlayerProgress>;
  private levelTable: LevelData[];
  private experienceMultipliers: ExperienceMultiplier[];
  
  constructor() {
    this.playerData = new Map();
    this.loadLevelTable();
    this.loadExperienceMultipliers();
  }
  
  async awardExperience(
    playerId: string, 
    amount: number, 
    source: ExperienceSource
  ): Promise<ExperienceResult> {
    const player = await this.getPlayerProgress(playerId);
    const multiplier = this.getMultiplier(source, player);
    const finalAmount = Math.floor(amount * multiplier);
    
    const oldLevel = player.level;
    player.experience += finalAmount;
    
    // 레벨업 체크
    const levelUpResults = await this.checkLevelUp(player);
    
    // 데이터 저장
    await this.savePlayerProgress(player);
    
    // 이벤트 발생
    this.emitExperienceGained(playerId, finalAmount, source);
    
    if (levelUpResults.length > 0) {
      this.emitLevelUp(playerId, oldLevel, player.level, levelUpResults);
    }
    
    return {
      gained: finalAmount,
      totalExperience: player.experience,
      currentLevel: player.level,
      levelUps: levelUpResults,
      nextLevelProgress: this.calculateLevelProgress(player)
    };
  }
  
  private async checkLevelUp(player: PlayerProgress): Promise<LevelUpReward[]> {
    const rewards: LevelUpReward[] = [];
    
    while (this.canLevelUp(player)) {
      const nextLevel = player.level + 1;
      const levelData = this.levelTable[nextLevel - 1];
      
      if (!levelData) break; // 최대 레벨 도달
      
      player.level = nextLevel;
      player.experience -= levelData.requiredExperience;
      
      // 레벨업 보상 생성
      const reward = await this.generateLevelUpReward(nextLevel);
      rewards.push(reward);
      
      // 보상 지급
      await this.grantReward(player.playerId, reward);
    }
    
    return rewards;
  }
  
  private canLevelUp(player: PlayerProgress): boolean {
    const nextLevelData = this.levelTable[player.level];
    return nextLevelData && player.experience >= nextLevelData.requiredExperience;
  }
  
  calculateLevelProgress(player: PlayerProgress): LevelProgress {
    const currentLevelData = this.levelTable[player.level - 1];
    const nextLevelData = this.levelTable[player.level];
    
    if (!nextLevelData) {
      return { percentage: 100, current: 0, required: 0 }; // 최대 레벨
    }
    
    const progress = player.experience;
    const required = nextLevelData.requiredExperience;
    const percentage = Math.min(100, (progress / required) * 100);
    
    return {
      percentage: Math.floor(percentage),
      current: progress,
      required: required
    };
  }
  
  private getMultiplier(source: ExperienceSource, player: PlayerProgress): number {
    let multiplier = 1.0;
    
    // 소스별 기본 배율
    const sourceMultiplier = this.experienceMultipliers.find(m => m.source === source);
    if (sourceMultiplier) {
      multiplier *= sourceMultiplier.value;
    }
    
    // 시즌 패스 보너스
    if (player.seasonPass && player.seasonPass.isPremium) {
      multiplier *= 1.5; // 프리미엄 패스 50% 보너스
    }
    
    // 이벤트 보너스
    if (this.isDoubleXPActive()) {
      multiplier *= 2.0;
    }
    
    return multiplier;
  }
}
```

### 3.2 트로피 시스템
```typescript
// [의도] 경쟁적 진행과 랭킹을 관리
// [책임] 트로피 계산, 아레나 배치, 시즌 리셋
export class TrophySystem {
  private arenaThresholds: ArenaData[];
  private seasonManager: SeasonManager;
  private leaderboard: LeaderboardManager;
  
  constructor() {
    this.loadArenaData();
    this.seasonManager = new SeasonManager();
    this.leaderboard = new LeaderboardManager();
  }
  
  async updateTrophies(
    playerId: string, 
    matchResult: MatchResult
  ): Promise<TrophyUpdate> {
    const player = await this.getPlayerTrophyData(playerId);
    const change = this.calculateTrophyChange(player, matchResult);
    
    const oldTrophies = player.trophies;
    const oldArena = this.getArenaByTrophies(oldTrophies);
    
    player.trophies = Math.max(0, player.trophies + change);
    player.bestTrophies = Math.max(player.bestTrophies, player.trophies);
    
    const newArena = this.getArenaByTrophies(player.trophies);
    const arenaChanged = oldArena.id !== newArena.id;
    
    // 시즌 트로피 업데이트
    await this.updateSeasonTrophies(playerId, change);
    
    // 리더보드 업데이트
    await this.leaderboard.updatePlayerRanking(playerId, player.trophies);
    
    if (arenaChanged) {
      await this.handleArenaChange(playerId, oldArena, newArena);
    }
    
    await this.saveTrophyData(player);
    
    return {
      change: change,
      newTotal: player.trophies,
      oldArena: oldArena,
      newArena: newArena,
      arenaChanged: arenaChanged,
      newRank: await this.leaderboard.getPlayerRank(playerId)
    };
  }
  
  private calculateTrophyChange(
    player: PlayerTrophyData, 
    matchResult: MatchResult
  ): number {
    const baseTrophyChange = 30;
    let change = 0;
    
    switch (matchResult.result) {
      case GameResult.Victory:
        change = baseTrophyChange;
        break;
      case GameResult.Defeat:
        change = -baseTrophyChange;
        break;
      case GameResult.Draw:
        change = 0;
        break;
    }
    
    // 상대방과의 트로피 차이 고려
    const opponentTrophies = matchResult.opponentTrophies;
    const trophyDifference = opponentTrophies - player.trophies;
    
    if (trophyDifference > 0) {
      // 상대가 더 강함 - 이기면 더 많이, 지면 덜 잃음
      change = change > 0 ? change + Math.min(10, trophyDifference / 50) : 
                           change + Math.max(-10, trophyDifference / 100);
    } else {
      // 상대가 더 약함 - 이기면 덜 얻고, 지면 더 많이 잃음
      change = change > 0 ? change - Math.min(10, Math.abs(trophyDifference) / 100) : 
                           change - Math.max(-10, Math.abs(trophyDifference) / 50);
    }
    
    // 최소/최대 변화량 제한
    return Math.max(-40, Math.min(40, Math.round(change)));
  }
  
  async performSeasonReset(): Promise<SeasonResetResult> {
    const allPlayers = await this.getAllPlayers();
    const resetResults: PlayerResetResult[] = [];
    
    for (const player of allPlayers) {
      const oldTrophies = player.trophies;
      const newTrophies = this.calculateSeasonResetTrophies(oldTrophies);
      const rewards = await this.calculateSeasonRewards(player);
      
      // 트로피 리셋
      player.trophies = newTrophies;
      player.seasonTrophies = 0;
      
      // 보상 지급
      await this.grantSeasonRewards(player.playerId, rewards);
      
      resetResults.push({
        playerId: player.playerId,
        oldTrophies,
        newTrophies,
        rewards
      });
    }
    
    // 새 시즌 시작
    await this.seasonManager.startNewSeason();
    
    return {
      playersAffected: resetResults.length,
      results: resetResults
    };
  }
  
  private calculateSeasonResetTrophies(currentTrophies: number): number {
    if (currentTrophies <= 4000) {
      return currentTrophies; // 4000 이하는 리셋 없음
    }
    
    // 4000 이상은 절반만 유지
    const excessTrophies = currentTrophies - 4000;
    return 4000 + Math.floor(excessTrophies * 0.5);
  }
}
```

### 3.3 시즌 패스 시스템
```typescript
// [의도] 시즌별 진행과 보상을 관리
// [책임] 패스 진행도, 보상 해금, 프리미엄 기능
export class SeasonPassSystem {
  private currentSeason: Season;
  private passTiers: PassTier[];
  private playerProgress: Map<string, SeasonPassProgress>;
  
  constructor() {
    this.loadCurrentSeason();
    this.loadPassTiers();
    this.playerProgress = new Map();
  }
  
  async addSeasonXP(
    playerId: string, 
    xp: number, 
    source: SeasonXPSource
  ): Promise<SeasonPassUpdate> {
    const progress = await this.getPlayerProgress(playerId);
    const multiplier = this.getSeasonXPMultiplier(progress, source);
    const finalXP = Math.floor(xp * multiplier);
    
    const oldTier = progress.currentTier;
    progress.seasonXP += finalXP;
    
    // 티어 진행 확인
    const tierUps = await this.checkTierProgression(progress);
    
    await this.savePlayerProgress(progress);
    
    return {
      xpGained: finalXP,
      totalXP: progress.seasonXP,
      currentTier: progress.currentTier,
      tierUps: tierUps,
      nextTierProgress: this.calculateTierProgress(progress)
    };
  }
  
  private async checkTierProgression(
    progress: SeasonPassProgress
  ): Promise<TierReward[]> {
    const rewards: TierReward[] = [];
    
    while (this.canAdvanceTier(progress)) {
      const nextTier = progress.currentTier + 1;
      const tierData = this.passTiers[nextTier - 1];
      
      if (!tierData) break; // 최대 티어 도달
      
      progress.currentTier = nextTier;
      
      // 무료 보상
      const freeReward = tierData.freeReward;
      if (freeReward) {
        await this.grantReward(progress.playerId, freeReward);
        rewards.push({
          tier: nextTier,
          reward: freeReward,
          isPremium: false
        });
      }
      
      // 프리미엄 보상
      if (progress.isPremium && tierData.premiumReward) {
        await this.grantReward(progress.playerId, tierData.premiumReward);
        rewards.push({
          tier: nextTier,
          reward: tierData.premiumReward,
          isPremium: true
        });
      }
    }
    
    return rewards;
  }
  
  async purchasePremiumPass(playerId: string): Promise<PremiumPassResult> {
    const progress = await this.getPlayerProgress(playerId);
    
    if (progress.isPremium) {
      throw new Error('Player already has premium pass');
    }
    
    // 프리미엄 패스 활성화
    progress.isPremium = true;
    
    // 이미 달성한 티어의 프리미엄 보상 지급
    const retroactiveRewards: TierReward[] = [];
    
    for (let tier = 1; tier <= progress.currentTier; tier++) {
      const tierData = this.passTiers[tier - 1];
      if (tierData.premiumReward) {
        await this.grantReward(playerId, tierData.premiumReward);
        retroactiveRewards.push({
          tier: tier,
          reward: tierData.premiumReward,
          isPremium: true
        });
      }
    }
    
    await this.savePlayerProgress(progress);
    
    return {
      success: true,
      retroactiveRewards: retroactiveRewards
    };
  }
  
  calculateTierProgress(progress: SeasonPassProgress): TierProgress {
    const currentTierData = this.passTiers[progress.currentTier - 1];
    const nextTierData = this.passTiers[progress.currentTier];
    
    if (!nextTierData) {
      return { percentage: 100, current: 0, required: 0 }; // 최대 티어
    }
    
    const requiredXP = nextTierData.requiredXP - currentTierData.requiredXP;
    const currentXP = progress.seasonXP - currentTierData.requiredXP;
    const percentage = Math.min(100, (currentXP / requiredXP) * 100);
    
    return {
      percentage: Math.floor(percentage),
      current: currentXP,
      required: requiredXP
    };
  }
}
```

## 4. 데이터 관리

### 4.1 진행 데이터 저장
```typescript
// [의도] 플레이어 진행 데이터의 안전한 저장과 관리
// [책임] 데이터 동기화, 백업, 복구
export class ProgressDataManager {
  private database: DatabaseConnection;
  private redis: RedisConnection;
  private backupManager: BackupManager;
  
  async savePlayerProgress(progress: PlayerProgress): Promise<void> {
    const transaction = await this.database.beginTransaction();
    
    try {
      // 메인 데이터베이스 저장
      await this.database.query(`
        UPDATE player_progress 
        SET experience = ?, level = ?, trophies = ?, 
            best_trophies = ?, season_xp = ?, season_tier = ?
        WHERE player_id = ?
      `, [
        progress.experience, progress.level, progress.trophies,
        progress.bestTrophies, progress.seasonXP, progress.seasonTier,
        progress.playerId
      ]);
      
      // 캐시 업데이트
      await this.redis.setex(
        `progress:${progress.playerId}`, 
        3600, 
        JSON.stringify(progress)
      );
      
      // 변경 로그 기록
      await this.logProgressChange(progress);
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  async loadPlayerProgress(playerId: string): Promise<PlayerProgress> {
    // 캐시에서 먼저 확인
    const cached = await this.redis.get(`progress:${playerId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 데이터베이스에서 로드
    const result = await this.database.query(`
      SELECT * FROM player_progress WHERE player_id = ?
    `, [playerId]);
    
    if (result.length === 0) {
      return this.createNewPlayerProgress(playerId);
    }
    
    const progress = this.mapDatabaseToProgress(result[0]);
    
    // 캐시에 저장
    await this.redis.setex(
      `progress:${playerId}`, 
      3600, 
      JSON.stringify(progress)
    );
    
    return progress;
  }
  
  private async logProgressChange(progress: PlayerProgress): Promise<void> {
    await this.database.query(`
      INSERT INTO progress_history 
      (player_id, timestamp, experience, level, trophies, season_xp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      progress.playerId, Date.now(), progress.experience, 
      progress.level, progress.trophies, progress.seasonXP
    ]);
  }
}
```

### 4.2 리더보드 관리
```typescript
// [의도] 실시간 랭킹과 리더보드 관리
// [책임] 순위 계산, 실시간 업데이트, 시즌별 관리
export class LeaderboardManager {
  private redis: RedisConnection;
  private database: DatabaseConnection;
  
  async updatePlayerRanking(playerId: string, trophies: number): Promise<void> {
    // 글로벌 리더보드 업데이트
    await this.redis.zadd('global_leaderboard', trophies, playerId);
    
    // 시즌 리더보드 업데이트
    const seasonKey = `season_${this.getCurrentSeasonId()}_leaderboard`;
    await this.redis.zadd(seasonKey, trophies, playerId);
    
    // 지역별 리더보드 업데이트
    const playerRegion = await this.getPlayerRegion(playerId);
    const regionKey = `region_${playerRegion}_leaderboard`;
    await this.redis.zadd(regionKey, trophies, playerId);
  }
  
  async getPlayerRank(playerId: string): Promise<LeaderboardPosition> {
    const globalRank = await this.redis.zrevrank('global_leaderboard', playerId);
    const seasonRank = await this.redis.zrevrank(
      `season_${this.getCurrentSeasonId()}_leaderboard`, 
      playerId
    );
    
    const playerRegion = await this.getPlayerRegion(playerId);
    const regionRank = await this.redis.zrevrank(
      `region_${playerRegion}_leaderboard`, 
      playerId
    );
    
    return {
      global: globalRank !== null ? globalRank + 1 : null,
      season: seasonRank !== null ? seasonRank + 1 : null,
      region: regionRank !== null ? regionRank + 1 : null
    };
  }
  
  async getTopPlayers(
    leaderboardType: LeaderboardType, 
    count: number = 100
  ): Promise<LeaderboardEntry[]> {
    let key: string;
    
    switch (leaderboardType) {
      case LeaderboardType.Global:
        key = 'global_leaderboard';
        break;
      case LeaderboardType.Season:
        key = `season_${this.getCurrentSeasonId()}_leaderboard`;
        break;
      case LeaderboardType.Regional:
        // 기본적으로 요청자의 지역 사용
        key = `region_default_leaderboard`;
        break;
    }
    
    const results = await this.redis.zrevrange(key, 0, count - 1, 'WITHSCORES');
    const entries: LeaderboardEntry[] = [];
    
    for (let i = 0; i < results.length; i += 2) {
      const playerId = results[i];
      const trophies = parseInt(results[i + 1]);
      const playerInfo = await this.getPlayerBasicInfo(playerId);
      
      entries.push({
        rank: Math.floor(i / 2) + 1,
        playerId: playerId,
        playerName: playerInfo.name,
        trophies: trophies,
        avatar: playerInfo.avatar
      });
    }
    
    return entries;
  }
}
```

## 5. 시스템 통합

### 5.1 이벤트 시스템
```typescript
// [의도] 진행 시스템 간 연동과 이벤트 처리
// [책임] 이벤트 발생, 구독 관리, 비동기 처리
export class ProgressEventSystem {
  private eventBus: EventBus;
  private eventHandlers: Map<string, EventHandler[]>;
  
  constructor() {
    this.eventBus = new EventBus();
    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // 경험치 획득 시 시즌 XP도 함께 지급
    this.on('experience.gained', async (event: ExperienceGainedEvent) => {
      const seasonXP = Math.floor(event.amount * 0.1); // 10% 비율
      await this.seasonPassSystem.addSeasonXP(
        event.playerId, 
        seasonXP, 
        SeasonXPSource.Battle
      );
    });
    
    // 레벨업 시 트로피 보너스
    this.on('player.levelup', async (event: LevelUpEvent) => {
      if (event.newLevel % 10 === 0) { // 10레벨마다
        await this.trophySystem.addTrophyBonus(event.playerId, 50);
      }
    });
    
    // 아레나 승급 시 보상
    this.on('arena.promoted', async (event: ArenaPromotionEvent) => {
      const rewards = this.calculateArenaPromotionRewards(event.newArena);
      await this.rewardSystem.grantRewards(event.playerId, rewards);
    });
  }
  
  emit(eventType: string, data: any): void {
    this.eventBus.emit(eventType, data);
  }
  
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    this.eventBus.on(eventType, handler);
  }
}
```

### 5.2 진행 분석 시스템
```typescript
// [의도] 플레이어 진행 데이터 분석과 개선점 도출
// [책임] 데이터 수집, 패턴 분석, 밸런스 조정 제안
export class ProgressAnalyticsSystem {
  private analyticsCollector: AnalyticsCollector;
  private progressPredictor: ProgressPredictor;
  
  async analyzePlayerProgression(playerId: string): Promise<ProgressionAnalysis> {
    const progressHistory = await this.getProgressHistory(playerId);
    const currentProgress = await this.getCurrentProgress(playerId);
    
    return {
      progressionRate: this.calculateProgressionRate(progressHistory),
      stuckPoints: this.identifyStuckPoints(progressHistory),
      predictedChurn: await this.progressPredictor.predictChurnRisk(playerId),
      recommendations: this.generateRecommendations(currentProgress)
    };
  }
  
  async generateBalanceReport(): Promise<BalanceReport> {
    const playerData = await this.getAllPlayerData();
    
    // 레벨별 분포 분석
    const levelDistribution = this.analyzeLevelDistribution(playerData);
    
    // 진행률 분석
    const progressionRates = this.analyzeProgressionRates(playerData);
    
    // 이탈 위험군 식별
    const churnRisks = this.identifyChurnRisks(playerData);
    
    return {
      levelDistribution,
      progressionRates,
      churnRisks,
      balanceAdjustments: this.suggestBalanceAdjustments(playerData)
    };
  }
  
  private suggestBalanceAdjustments(
    playerData: PlayerProgressData[]
  ): BalanceAdjustment[] {
    const adjustments: BalanceAdjustment[] = [];
    
    // 너무 빠른 진행 구간 식별
    const fastProgression = this.findFastProgressionPoints(playerData);
    fastProgression.forEach(point => {
      adjustments.push({
        type: 'experience_requirement_increase',
        level: point.level,
        currentValue: point.requiredXP,
        suggestedValue: Math.floor(point.requiredXP * 1.2),
        reason: 'Players progressing too quickly at this level'
      });
    });
    
    // 너무 느린 진행 구간 식별
    const slowProgression = this.findSlowProgressionPoints(playerData);
    slowProgression.forEach(point => {
      adjustments.push({
        type: 'experience_reward_increase',
        level: point.level,
        currentValue: point.xpReward,
        suggestedValue: Math.floor(point.xpReward * 1.3),
        reason: 'Players getting stuck at this level'
      });
    });
    
    return adjustments;
  }
}
```

이 구현계획은 플레이어의 성장과 진행을 체계적으로 관리하는 시스템을 구축하기 위한 핵심 요소들을 다루고 있습니다. 경험치, 트로피, 시즌 패스 시스템이 유기적으로 연동되어 지속적인 플레이 동기를 제공합니다.