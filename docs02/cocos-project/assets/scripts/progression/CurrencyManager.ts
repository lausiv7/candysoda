/**
 * [의도] Sweet Puzzle 다중 화폐 시스템 - 코인, 젬, 하트, 에너지 등 모든 화폐를 통합 관리
 * [책임] 화폐 잔액 관리, 획득/소모 처리, 경제 밸런스 유지, 하트 시스템 자동 회복
 */

import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';

const { ccclass, property } = _decorator;

// 화폐 타입
export enum CurrencyType {
    COINS = 'coins',        // 기본 화폐
    GEMS = 'gems',          // 프리미엄 화폐
    HEARTS = 'hearts',      // 생명 시스템
    ENERGY = 'energy',      // 특별 이벤트용
    TOKENS = 'tokens'       // 시즌 화폐
}

// 화폐 획득 소스
export enum EarnSource {
    LEVEL_COMPLETION = 'level_completion',
    DAILY_MISSION = 'daily_mission',
    ACHIEVEMENT = 'achievement',
    PURCHASE = 'purchase',
    AD_WATCH = 'ad_watch',
    SEASON_REWARD = 'season_reward',
    GIFT = 'gift',
    DAILY_LOGIN = 'daily_login'
}

// 화폐 소모 용도
export enum SpendPurpose {
    BOOSTER_PURCHASE = 'booster_purchase',
    HEART_REFILL = 'heart_refill',
    CONTINUE_LEVEL = 'continue_level',
    PREMIUM_PASS = 'premium_pass',
    SHOP_ITEM = 'shop_item',
    UPGRADE = 'upgrade'
}

// 하트 충전 방법
export enum RefillMethod {
    TIME_RECOVERY = 'time_recovery',
    PURCHASE = 'purchase',
    AD_WATCH = 'ad_watch',
    FRIEND_GIFT = 'friend_gift'
}

// 화폐 정보 인터페이스
export interface CurrencyInfo {
    type: CurrencyType;
    balance: number;
    maxCapacity: number;
    lastUpdated: number;
}

// 화폐 거래 기록
export interface Transaction {
    id: string;
    type: CurrencyType;
    amount: number;
    isEarn: boolean; // true: 획득, false: 소모
    source?: EarnSource;
    purpose?: SpendPurpose;
    timestamp: number;
    balanceAfter: number;
}

// 하트 시스템 상태
export interface HeartSystemState {
    current: number;
    max: number;
    recoveryTimeMs: number;
    lastRecoveryTime: number;
    nextRecoveryIn: number;
}

// 경제 지표
export interface EconomyMetrics {
    totalEarned: Map<CurrencyType, number>;
    totalSpent: Map<CurrencyType, number>;
    averageDailyEarning: Map<CurrencyType, number>;
    averageDailySpending: Map<CurrencyType, number>;
    inflationRate: number;
}

@ccclass('CurrencyManager')
export class CurrencyManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: CurrencyManager | null = null;
    
    // 화폐 잔액
    private balances: Map<CurrencyType, number> = new Map();
    
    // 하트 시스템
    @property
    private maxHearts: number = 5;
    
    @property
    private heartRecoveryTimeMs: number = 30 * 60 * 1000; // 30분
    
    private lastHeartRecoveryTime: number = Date.now();
    private heartRecoveryTimer: any = null;
    
    // 거래 기록
    private transactionHistory: Transaction[] = [];
    private maxHistorySize: number = 1000;
    
    // 경제 지표
    private economyMetrics: EconomyMetrics = {
        totalEarned: new Map(),
        totalSpent: new Map(),
        averageDailyEarning: new Map(),
        averageDailySpending: new Map(),
        inflationRate: 0
    };
    
    // 최대 보유량 설정
    private maxCapacities: Map<CurrencyType, number> = new Map([
        [CurrencyType.COINS, 999999],
        [CurrencyType.GEMS, 99999],
        [CurrencyType.HEARTS, 5],
        [CurrencyType.ENERGY, 100],
        [CurrencyType.TOKENS, 9999]
    ]);
    
    protected onLoad(): void {
        if (CurrencyManager.instance === null) {
            CurrencyManager.instance = this;
            this.initializeSystem();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): CurrencyManager {
        if (!CurrencyManager.instance) {
            console.error('[CurrencyManager] Instance not initialized');
            return null;
        }
        return CurrencyManager.instance;
    }
    
    /**
     * [의도] 화폐 시스템 초기화
     */
    private initializeSystem(): void {
        this.initializeCurrencies();
        this.loadSavedData();
        this.startHeartRecoverySystem();
        
        console.log('[CurrencyManager] 화폐 시스템 초기화 완료');
    }
    
    /**
     * [의도] 초기 화폐 지급
     */
    private initializeCurrencies(): void {
        this.balances.set(CurrencyType.COINS, 1000);
        this.balances.set(CurrencyType.GEMS, 50);
        this.balances.set(CurrencyType.HEARTS, this.maxHearts);
        this.balances.set(CurrencyType.ENERGY, 0);
        this.balances.set(CurrencyType.TOKENS, 0);
        
        // 경제 지표 초기화
        Object.values(CurrencyType).forEach(currency => {
            this.economyMetrics.totalEarned.set(currency as CurrencyType, 0);
            this.economyMetrics.totalSpent.set(currency as CurrencyType, 0);
            this.economyMetrics.averageDailyEarning.set(currency as CurrencyType, 0);
            this.economyMetrics.averageDailySpending.set(currency as CurrencyType, 0);
        });
    }
    
    /**
     * [의도] 화폐 추가 (획득)
     */
    addCurrency(type: CurrencyType, amount: number, source: EarnSource = EarnSource.LEVEL_COMPLETION): boolean {
        if (amount <= 0) {
            console.warn(`[CurrencyManager] 잘못된 금액: ${amount}`);
            return false;
        }
        
        const currentBalance = this.balances.get(type) || 0;
        const maxCapacity = this.maxCapacities.get(type) || Number.MAX_SAFE_INTEGER;
        
        // 최대 보유량 확인
        if (currentBalance >= maxCapacity) {
            console.warn(`[CurrencyManager] ${type} 최대 보유량 도달`);
            return false;
        }
        
        // 실제 추가할 수 있는 양 계산
        const actualAmount = Math.min(amount, maxCapacity - currentBalance);
        const newBalance = currentBalance + actualAmount;
        
        this.balances.set(type, newBalance);
        
        // 거래 기록
        this.recordTransaction(type, actualAmount, true, source, undefined);
        
        // 경제 지표 업데이트
        this.updateEconomyMetrics(type, actualAmount, true);
        
        // 이벤트 발생
        EventBus.getInstance().emit('currency_added', {
            type: type,
            amount: actualAmount,
            source: source,
            newBalance: newBalance
        });
        
        console.log(`[CurrencyManager] ${type} +${actualAmount} (총: ${newBalance})`);
        return true;
    }
    
    /**
     * [의도] 화폐 소모
     */
    spendCurrency(type: CurrencyType, amount: number, purpose: SpendPurpose): boolean {
        if (amount <= 0) {
            console.warn(`[CurrencyManager] 잘못된 금액: ${amount}`);
            return false;
        }
        
        const currentBalance = this.balances.get(type) || 0;
        
        if (currentBalance < amount) {
            console.warn(`[CurrencyManager] ${type} 잔액 부족 (필요: ${amount}, 보유: ${currentBalance})`);
            return false;
        }
        
        const newBalance = currentBalance - amount;
        this.balances.set(type, newBalance);
        
        // 거래 기록
        this.recordTransaction(type, amount, false, undefined, purpose);
        
        // 경제 지표 업데이트
        this.updateEconomyMetrics(type, amount, false);
        
        // 이벤트 발생
        EventBus.getInstance().emit('currency_spent', {
            type: type,
            amount: amount,
            purpose: purpose,
            newBalance: newBalance
        });
        
        console.log(`[CurrencyManager] ${type} -${amount} (총: ${newBalance})`);
        return true;
    }
    
    /**
     * [의도] 화폐 잔액 조회
     */
    getBalance(type: CurrencyType): number {
        return this.balances.get(type) || 0;
    }
    
    /**
     * [의도] 모든 화폐 잔액 조회
     */
    getAllBalances(): Map<CurrencyType, number> {
        return new Map(this.balances);
    }
    
    /**
     * [의도] 화폐 구매 가능 여부 확인
     */
    canAfford(type: CurrencyType, amount: number): boolean {
        return this.getBalance(type) >= amount;
    }
    
    /**
     * [의도] 하트 소모 (레벨 시작 시)
     */
    consumeHeart(): boolean {
        const currentHearts = this.getBalance(CurrencyType.HEARTS);
        
        if (currentHearts <= 0) {
            console.warn('[CurrencyManager] 하트가 없습니다');
            return false;
        }
        
        const success = this.spendCurrency(CurrencyType.HEARTS, 1, SpendPurpose.CONTINUE_LEVEL);
        
        if (success && currentHearts === this.maxHearts) {
            // 최대치에서 하나 소모했을 때 회복 타이머 시작
            this.startHeartRecoverySystem();
        }
        
        return success;
    }
    
    /**
     * [의도] 하트 자동 회복 시스템
     */
    private startHeartRecoverySystem(): void {
        if (this.heartRecoveryTimer) {
            return; // 이미 실행 중
        }
        
        this.heartRecoveryTimer = setInterval(() => {
            const currentHearts = this.getBalance(CurrencyType.HEARTS);
            
            if (currentHearts >= this.maxHearts) {
                this.stopHeartRecoverySystem();
                return;
            }
            
            const timeSinceLastRecovery = Date.now() - this.lastHeartRecoveryTime;
            
            if (timeSinceLastRecovery >= this.heartRecoveryTimeMs) {
                this.addCurrency(CurrencyType.HEARTS, 1, EarnSource.DAILY_LOGIN);
                this.lastHeartRecoveryTime = Date.now();
                
                console.log('[CurrencyManager] 하트 1개 회복');
            }
        }, 1000); // 1초마다 체크
        
        console.log('[CurrencyManager] 하트 자동 회복 시스템 시작');
    }
    
    /**
     * [의도] 하트 회복 시스템 중지
     */
    private stopHeartRecoverySystem(): void {
        if (this.heartRecoveryTimer) {
            clearInterval(this.heartRecoveryTimer);
            this.heartRecoveryTimer = null;
            console.log('[CurrencyManager] 하트 자동 회복 시스템 중지');
        }
    }
    
    /**
     * [의도] 하트 즉시 충전
     */
    refillHearts(method: RefillMethod): boolean {
        switch (method) {
            case RefillMethod.PURCHASE:
                // 젬으로 구매
                const gemCost = this.calculateHeartRefillCost();
                if (this.spendCurrency(CurrencyType.GEMS, gemCost, SpendPurpose.HEART_REFILL)) {
                    this.balances.set(CurrencyType.HEARTS, this.maxHearts);
                    this.lastHeartRecoveryTime = Date.now();
                    this.stopHeartRecoverySystem();
                    
                    EventBus.getInstance().emit('hearts_refilled', {
                        method: method,
                        cost: gemCost
                    });
                    
                    console.log(`[CurrencyManager] 하트 완전 충전 (젬 ${gemCost}개 사용)`);
                    return true;
                }
                return false;
                
            case RefillMethod.AD_WATCH:
                // 광고 시청으로 충전
                this.balances.set(CurrencyType.HEARTS, this.maxHearts);
                this.lastHeartRecoveryTime = Date.now();
                this.stopHeartRecoverySystem();
                
                EventBus.getInstance().emit('hearts_refilled', {
                    method: method,
                    cost: 0
                });
                
                console.log('[CurrencyManager] 하트 완전 충전 (광고 시청)');
                return true;
                
            case RefillMethod.FRIEND_GIFT:
                // 친구 선물로 하트 1개 추가
                return this.addCurrency(CurrencyType.HEARTS, 1, EarnSource.GIFT);
                
            default:
                return false;
        }
    }
    
    /**
     * [의도] 하트 충전 비용 계산 (동적 가격)
     */
    private calculateHeartRefillCost(): number {
        const missingHearts = this.maxHearts - this.getBalance(CurrencyType.HEARTS);
        return Math.max(10, missingHearts * 5); // 최소 10젬, 부족한 하트당 5젬
    }
    
    /**
     * [의도] 하트 시스템 상태 조회
     */
    getHeartSystemState(): HeartSystemState {
        const currentHearts = this.getBalance(CurrencyType.HEARTS);
        const timeSinceLastRecovery = Date.now() - this.lastHeartRecoveryTime;
        const nextRecoveryIn = currentHearts < this.maxHearts ? 
            Math.max(0, this.heartRecoveryTimeMs - timeSinceLastRecovery) : 0;
        
        return {
            current: currentHearts,
            max: this.maxHearts,
            recoveryTimeMs: this.heartRecoveryTimeMs,
            lastRecoveryTime: this.lastHeartRecoveryTime,
            nextRecoveryIn: nextRecoveryIn
        };
    }
    
    /**
     * [의도] 거래 기록 저장
     */
    private recordTransaction(
        type: CurrencyType, 
        amount: number, 
        isEarn: boolean, 
        source?: EarnSource, 
        purpose?: SpendPurpose
    ): void {
        const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            amount: amount,
            isEarn: isEarn,
            source: source,
            purpose: purpose,
            timestamp: Date.now(),
            balanceAfter: this.getBalance(type)
        };
        
        this.transactionHistory.push(transaction);
        
        // 기록 크기 제한
        if (this.transactionHistory.length > this.maxHistorySize) {
            this.transactionHistory.shift();
        }
    }
    
    /**
     * [의도] 경제 지표 업데이트
     */
    private updateEconomyMetrics(type: CurrencyType, amount: number, isEarn: boolean): void {
        if (isEarn) {
            const current = this.economyMetrics.totalEarned.get(type) || 0;
            this.economyMetrics.totalEarned.set(type, current + amount);
        } else {
            const current = this.economyMetrics.totalSpent.get(type) || 0;
            this.economyMetrics.totalSpent.set(type, current + amount);
        }
        
        // 일일 평균 계산 (간단화된 버전)
        const dailyMultiplier = 1 / (24 * 60 * 60 * 1000); // 하루를 ms로 변환
        const timeWeight = Math.min(1, Date.now() * dailyMultiplier);
        
        if (isEarn) {
            const dailyAvg = (this.economyMetrics.averageDailyEarning.get(type) || 0) * 0.9 + amount * 0.1;
            this.economyMetrics.averageDailyEarning.set(type, dailyAvg);
        } else {
            const dailyAvg = (this.economyMetrics.averageDailySpending.get(type) || 0) * 0.9 + amount * 0.1;
            this.economyMetrics.averageDailySpending.set(type, dailyAvg);
        }
    }
    
    /**
     * [의도] 거래 내역 조회
     */
    getTransactionHistory(type?: CurrencyType, limit?: number): Transaction[] {
        let history = this.transactionHistory;
        
        if (type) {
            history = history.filter(tx => tx.type === type);
        }
        
        // 최신순 정렬
        history.sort((a, b) => b.timestamp - a.timestamp);
        
        if (limit) {
            history = history.slice(0, limit);
        }
        
        return history;
    }
    
    /**
     * [의도] 경제 지표 조회
     */
    getEconomyMetrics(): EconomyMetrics {
        return {
            totalEarned: new Map(this.economyMetrics.totalEarned),
            totalSpent: new Map(this.economyMetrics.totalSpent),
            averageDailyEarning: new Map(this.economyMetrics.averageDailyEarning),
            averageDailySpending: new Map(this.economyMetrics.averageDailySpending),
            inflationRate: this.economyMetrics.inflationRate
        };
    }
    
    /**
     * [의도] 저장된 데이터 로드
     */
    private loadSavedData(): void {
        // TODO: 실제로는 로컬 스토리지나 서버에서 데이터 로드
        try {
            // 하트 회복 시간 복원
            const savedLastRecovery = localStorage.getItem('lastHeartRecoveryTime');
            if (savedLastRecovery) {
                this.lastHeartRecoveryTime = parseInt(savedLastRecovery);
            }
            
            console.log('[CurrencyManager] 저장된 데이터 로드 완료');
        } catch (error) {
            console.warn('[CurrencyManager] 데이터 로드 실패, 기본값 사용');
        }
    }
    
    /**
     * [의도] 데이터 저장
     */
    private saveData(): void {
        try {
            localStorage.setItem('lastHeartRecoveryTime', this.lastHeartRecoveryTime.toString());
            console.log('[CurrencyManager] 데이터 저장 완료');
        } catch (error) {
            console.error('[CurrencyManager] 데이터 저장 실패:', error);
        }
    }
    
    /**
     * [의도] 컴포넌트 정리
     */
    protected onDestroy(): void {
        this.stopHeartRecoverySystem();
        this.saveData();
    }
}