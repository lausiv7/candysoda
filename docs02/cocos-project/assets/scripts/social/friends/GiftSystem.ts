/**
 * [의도] Sweet Puzzle 선물 시스템
 * [책임] 친구 간 선물 주고받기, 선물 타입 관리, 쿨다운 처리
 */

import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../../core/EventBus';
import { Gift, GiftType } from './FriendManager';

export interface GiftDefinition {
    type: GiftType;
    name: string;
    description: string;
    iconUrl: string;
    value: number;
    cooldownTime: number; // 밀리초
    dailyLimit: number;
}

export interface GiftSendResult {
    success: boolean;
    error?: string;
    cooldownRemaining?: number;
}

export interface PlayerGiftStats {
    playerId: string;
    giftsSentToday: Map<GiftType, number>;
    giftsReceivedToday: Map<GiftType, number>;
    lastGiftSentTime: Map<string, number>; // friendId -> timestamp
    lastResetDate: string; // YYYY-MM-DD 형식
}

@ccclass('GiftSystem')
export class GiftSystem {
    private static instance: GiftSystem;
    private _isInitialized: boolean = false;
    
    // 선물 정의
    private giftDefinitions: Map<GiftType, GiftDefinition> = new Map();
    
    // 플레이어 선물 통계
    private playerStats: PlayerGiftStats;
    
    // 받은 선물 저장소
    private receivedGifts: Map<string, Gift> = new Map();
    
    private saveKey: string = 'sweet_puzzle_gift_data';
    
    static getInstance(): GiftSystem {
        if (!this.instance) {
            this.instance = new GiftSystem();
        }
        return this.instance;
    }

    /**
     * [의도] 선물 시스템 초기화
     */
    initialize(): void {
        if (this._isInitialized) {
            console.warn('GiftSystem already initialized');
            return;
        }

        console.log('🔄 선물 시스템 초기화 시작...');
        
        // 선물 정의 설정
        this.setupGiftDefinitions();
        
        // 저장된 데이터 로드
        this.loadGiftData();
        
        // 일일 통계 리셋 체크
        this.checkDailyReset();
        
        this._isInitialized = true;
        console.log('✅ 선물 시스템 초기화 완료');
    }

    /**
     * [의도] 선물 타입별 정의 설정
     */
    private setupGiftDefinitions(): void {
        const definitions: GiftDefinition[] = [
            {
                type: GiftType.LIVES,
                name: '생명',
                description: '게임을 계속할 수 있는 생명을 선물합니다',
                iconUrl: 'icons/gift_lives',
                value: 1,
                cooldownTime: 4 * 60 * 60 * 1000, // 4시간
                dailyLimit: 5
            },
            {
                type: GiftType.COINS,
                name: '코인',
                description: '게임 내에서 사용할 수 있는 코인을 선물합니다',
                iconUrl: 'icons/gift_coins',
                value: 100,
                cooldownTime: 8 * 60 * 60 * 1000, // 8시간
                dailyLimit: 3
            },
            {
                type: GiftType.BOOSTER,
                name: '부스터',
                description: '퍼즐을 쉽게 해결할 수 있는 부스터를 선물합니다',
                iconUrl: 'icons/gift_booster',
                value: 1,
                cooldownTime: 12 * 60 * 60 * 1000, // 12시간
                dailyLimit: 2
            },
            {
                type: GiftType.SPECIAL_ITEM,
                name: '특별 아이템',
                description: '특별한 효과를 가진 아이템을 선물합니다',
                iconUrl: 'icons/gift_special',
                value: 1,
                cooldownTime: 24 * 60 * 60 * 1000, // 24시간
                dailyLimit: 1
            }
        ];

        definitions.forEach(def => {
            this.giftDefinitions.set(def.type, def);
        });
        
        console.log(`📦 선물 정의 ${definitions.length}개 로드 완료`);
    }

    /**
     * [의도] 저장된 선물 데이터 로드
     */
    private loadGiftData(): void {
        try {
            const savedData = sys.localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // 플레이어 통계 복원
                if (data.playerStats) {
                    this.playerStats = {
                        ...data.playerStats,
                        giftsSentToday: new Map(data.playerStats.giftsSentToday || []),
                        giftsReceivedToday: new Map(data.playerStats.giftsReceivedToday || []),
                        lastGiftSentTime: new Map(data.playerStats.lastGiftSentTime || [])
                    };
                } else {
                    this.initializePlayerStats();
                }
                
                // 받은 선물 복원
                if (data.receivedGifts) {
                    this.receivedGifts = new Map(data.receivedGifts);
                }
                
                console.log(`📚 선물 데이터 로드 완료 - 받은 선물 ${this.receivedGifts.size}개`);
            } else {
                this.initializePlayerStats();
            }
        } catch (error) {
            console.error('❌ 선물 데이터 로드 실패:', error);
            this.initializePlayerStats();
        }
    }

    /**
     * [의도] 플레이어 통계 초기화
     */
    private initializePlayerStats(): void {
        this.playerStats = {
            playerId: 'current_player', // TODO: PlayerManager에서 가져오기
            giftsSentToday: new Map(),
            giftsReceivedToday: new Map(),
            lastGiftSentTime: new Map(),
            lastResetDate: new Date().toISOString().split('T')[0]
        };
    }

    /**
     * [의도] 선물 데이터 저장
     */
    private saveGiftData(): void {
        try {
            const dataToSave = {
                playerStats: {
                    ...this.playerStats,
                    giftsSentToday: Array.from(this.playerStats.giftsSentToday.entries()),
                    giftsReceivedToday: Array.from(this.playerStats.giftsReceivedToday.entries()),
                    lastGiftSentTime: Array.from(this.playerStats.lastGiftSentTime.entries())
                },
                receivedGifts: Array.from(this.receivedGifts.entries())
            };
            
            sys.localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ 선물 데이터 저장 실패:', error);
        }
    }

    /**
     * [의도] 일일 통계 리셋 확인
     */
    private checkDailyReset(): void {
        const today = new Date().toISOString().split('T')[0];
        
        if (this.playerStats.lastResetDate !== today) {
            console.log('🔄 일일 선물 통계 리셋');
            
            this.playerStats.giftsSentToday.clear();
            this.playerStats.giftsReceivedToday.clear();
            this.playerStats.lastResetDate = today;
            
            this.saveGiftData();
            
            // 일일 리셋 이벤트 발생
            EventBus.getInstance().emit('gift_daily_reset');
        }
    }

    /**
     * [의도] 친구에게 선물 보내기
     */
    async sendGift(friendId: string, giftType: GiftType, message?: string): Promise<GiftSendResult> {
        try {
            // 선물 정의 확인
            const giftDef = this.giftDefinitions.get(giftType);
            if (!giftDef) {
                return { success: false, error: 'Invalid gift type' };
            }
            
            // 일일 제한 확인
            const sentToday = this.playerStats.giftsSentToday.get(giftType) || 0;
            if (sentToday >= giftDef.dailyLimit) {
                return { success: false, error: 'Daily gift limit reached' };
            }
            
            // 쿨다운 확인
            const lastSentTime = this.playerStats.lastGiftSentTime.get(friendId) || 0;
            const timeSinceLastGift = Date.now() - lastSentTime;
            const cooldownRemaining = giftDef.cooldownTime - timeSinceLastGift;
            
            if (cooldownRemaining > 0) {
                return { 
                    success: false, 
                    error: 'Gift cooldown active',
                    cooldownRemaining: cooldownRemaining 
                };
            }
            
            // 선물 생성
            const gift: Gift = {
                id: this.generateGiftId(),
                fromFriendId: this.playerStats.playerId,
                toPlayerId: friendId,
                giftType: giftType,
                timestamp: Date.now(),
                message: message,
                claimed: false
            };
            
            // 통계 업데이트
            this.playerStats.giftsSentToday.set(giftType, sentToday + 1);
            this.playerStats.lastGiftSentTime.set(friendId, Date.now());
            
            this.saveGiftData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('gift_sent', {
                friendId: friendId,
                giftType: giftType,
                giftId: gift.id,
                giftDefinition: giftDef
            });
            
            console.log(`🎁 선물 전송 완료: ${giftDef.name} → ${friendId}`);
            return { success: true };
            
        } catch (error) {
            console.error('❌ 선물 전송 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * [의도] 받은 선물 수락하기
     */
    async claimGift(giftId: string): Promise<boolean> {
        try {
            const gift = this.receivedGifts.get(giftId);
            if (!gift || gift.claimed) {
                console.warn('유효하지 않거나 이미 수락한 선물:', giftId);
                return false;
            }
            
            const giftDef = this.giftDefinitions.get(gift.giftType);
            if (!giftDef) {
                console.error('알 수 없는 선물 타입:', gift.giftType);
                return false;
            }
            
            // 선물 수락 처리
            gift.claimed = true;
            this.receivedGifts.set(giftId, gift);
            
            // 통계 업데이트
            const receivedToday = this.playerStats.giftsReceivedToday.get(gift.giftType) || 0;
            this.playerStats.giftsReceivedToday.set(gift.giftType, receivedToday + 1);
            
            this.saveGiftData();
            
            // 실제 보상 지급 (TODO: RewardManager 연동)
            this.giveReward(gift.giftType, giftDef.value);
            
            // 이벤트 발생
            EventBus.getInstance().emit('gift_claimed', {
                giftId: giftId,
                giftType: gift.giftType,
                value: giftDef.value,
                fromFriendId: gift.fromFriendId
            });
            
            console.log(`🎁 선물 수락: ${giftDef.name} (${giftDef.value})`);
            return true;
            
        } catch (error) {
            console.error('❌ 선물 수락 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 선물에 대한 보상 지급 (임시 구현)
     */
    private giveReward(giftType: GiftType, value: number): void {
        // TODO: RewardManager나 GameManager와 연동
        console.log(`💰 보상 지급: ${giftType} x${value}`);
        
        switch (giftType) {
            case GiftType.LIVES:
                // 생명 추가
                break;
            case GiftType.COINS:
                // 코인 추가
                break;
            case GiftType.BOOSTER:
                // 부스터 추가
                break;
            case GiftType.SPECIAL_ITEM:
                // 특별 아이템 추가
                break;
        }
    }

    /**
     * [의도] 선물 받기 (외부에서 호출)
     */
    receiveGift(gift: Gift): void {
        this.receivedGifts.set(gift.id, gift);
        this.saveGiftData();
        
        // 이벤트 발생
        EventBus.getInstance().emit('gift_received', {
            giftId: gift.id,
            giftType: gift.giftType,
            fromFriendId: gift.fromFriendId,
            message: gift.message
        });
        
        console.log(`📬 선물 받음: ${gift.giftType} from ${gift.fromFriendId}`);
    }

    // 유틸리티 메서드
    private generateGiftId(): string {
        return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Getter 메서드들
    getGiftDefinitions(): GiftDefinition[] {
        return Array.from(this.giftDefinitions.values());
    }

    getGiftDefinition(giftType: GiftType): GiftDefinition | undefined {
        return this.giftDefinitions.get(giftType);
    }

    getUnclaimedGifts(): Gift[] {
        return Array.from(this.receivedGifts.values()).filter(gift => !gift.claimed);
    }

    getDailyGiftsSent(): Map<GiftType, number> {
        return new Map(this.playerStats.giftsSentToday);
    }

    getDailyGiftsReceived(): Map<GiftType, number> {
        return new Map(this.playerStats.giftsReceivedToday);
    }

    canSendGift(friendId: string, giftType: GiftType): { canSend: boolean; reason?: string; cooldownRemaining?: number } {
        const giftDef = this.giftDefinitions.get(giftType);
        if (!giftDef) {
            return { canSend: false, reason: 'Invalid gift type' };
        }

        // 일일 제한 확인
        const sentToday = this.playerStats.giftsSentToday.get(giftType) || 0;
        if (sentToday >= giftDef.dailyLimit) {
            return { canSend: false, reason: 'Daily limit reached' };
        }

        // 쿨다운 확인
        const lastSentTime = this.playerStats.lastGiftSentTime.get(friendId) || 0;
        const timeSinceLastGift = Date.now() - lastSentTime;
        const cooldownRemaining = giftDef.cooldownTime - timeSinceLastGift;

        if (cooldownRemaining > 0) {
            return { canSend: false, reason: 'Cooldown active', cooldownRemaining: cooldownRemaining };
        }

        return { canSend: true };
    }

    /**
     * [의도] 선물 시스템 정리
     */
    cleanup(): void {
        console.log('🧹 선물 시스템 정리 중...');
        
        // 데이터 저장
        this.saveGiftData();
        
        // 메모리 정리
        this.receivedGifts.clear();
        this.giftDefinitions.clear();
        
        this._isInitialized = false;
        console.log('✅ 선물 시스템 정리 완료');
    }
}