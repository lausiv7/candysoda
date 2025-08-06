/**
 * [의도] Sweet Puzzle 친구 시스템 관리자
 * [책임] 친구 관계, 요청, 선물, 활동 추적의 모든 기능을 통합 관리
 */

import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../../core/EventBus';
import { SocialConfig } from '../SocialManager';

// 친구 관련 데이터 인터페이스
export interface Friend {
    id: string;
    username: string;
    level: number;
    avatarUrl: string;
    lastSeen: number;
    currentWorld: number;
    connectionDate: number;
    
    // 상호작용 통계
    helpsSent: number;
    helpsReceived: number;
    giftsExchanged: number;
    
    // 상태 정보
    isOnline: boolean;
    status: FriendStatus;
}

export interface FriendRequest {
    id: string;
    fromPlayerId: string;
    toPlayerId: string;
    message: string;
    timestamp: number;
    status: FriendRequestStatus;
    expiresAt?: number;
}

export interface Gift {
    id: string;
    fromFriendId: string;
    toPlayerId: string;
    giftType: GiftType;
    timestamp: number;
    message?: string;
    claimed: boolean;
}

export enum FriendStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BLOCKED = 'blocked'
}

export enum FriendRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
}

export enum GiftType {
    LIVES = 'lives',
    COINS = 'coins',
    BOOSTER = 'booster',
    SPECIAL_ITEM = 'special_item'
}

export interface FriendRequestResult {
    success: boolean;
    error?: string;
    requestId?: string;
}

@ccclass('FriendManager')
export class FriendManager {
    private static instance: FriendManager;
    private _isInitialized: boolean = false;
    
    // 친구 관련 데이터
    private friends: Map<string, Friend> = new Map();
    private friendRequests: Map<string, FriendRequest> = new Map();
    private sentRequests: Map<string, FriendRequest> = new Map();
    private gifts: Map<string, Gift> = new Map();
    private blockedUsers: Set<string> = new Set();
    
    // 설정
    private config: SocialConfig;
    private saveKey: string = 'sweet_puzzle_friends_data';
    
    static getInstance(): FriendManager {
        if (!this.instance) {
            this.instance = new FriendManager();
        }
        return this.instance;
    }

    /**
     * [의도] 친구 시스템 초기화
     */
    async initialize(config: SocialConfig): Promise<void> {
        if (this._isInitialized) {
            console.warn('FriendManager already initialized');
            return;
        }

        try {
            console.log('🔄 친구 시스템 초기화 시작...');
            
            this.config = config;
            
            // 로컬 데이터 로드
            this.loadFriendsData();
            
            // 만료된 요청 정리
            this.cleanupExpiredRequests();
            
            this._isInitialized = true;
            console.log('✅ 친구 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 친구 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * [의도] 로컬 저장소에서 친구 데이터 로드
     */
    private loadFriendsData(): void {
        try {
            const savedData = sys.localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // 친구 데이터 복원
                if (data.friends) {
                    this.friends = new Map(data.friends);
                }
                
                // 친구 요청 데이터 복원
                if (data.friendRequests) {
                    this.friendRequests = new Map(data.friendRequests);
                }
                
                if (data.sentRequests) {
                    this.sentRequests = new Map(data.sentRequests);
                }
                
                // 선물 데이터 복원
                if (data.gifts) {
                    this.gifts = new Map(data.gifts);
                }
                
                // 차단 사용자 복원
                if (data.blockedUsers) {
                    this.blockedUsers = new Set(data.blockedUsers);
                }
                
                console.log(`📚 친구 데이터 로드 완료 - 친구 ${this.friends.size}명, 요청 ${this.friendRequests.size}개`);
            }
        } catch (error) {
            console.error('❌ 친구 데이터 로드 실패:', error);
        }
    }

    /**
     * [의도] 친구 데이터를 로컬 저장소에 저장
     */
    private saveFriendsData(): void {
        try {
            const dataToSave = {
                friends: Array.from(this.friends.entries()),
                friendRequests: Array.from(this.friendRequests.entries()),
                sentRequests: Array.from(this.sentRequests.entries()),
                gifts: Array.from(this.gifts.entries()),
                blockedUsers: Array.from(this.blockedUsers)
            };
            
            sys.localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ 친구 데이터 저장 실패:', error);
        }
    }

    /**
     * [의도] 친구 요청 보내기
     */
    async sendFriendRequest(targetPlayerId: string, message?: string): Promise<FriendRequestResult> {
        try {
            // 유효성 검사
            const validation = this.validateFriendRequest(targetPlayerId);
            if (!validation.isValid) {
                return { success: false, error: validation.reason };
            }
            
            // 친구 요청 생성
            const request: FriendRequest = {
                id: this.generateRequestId(),
                fromPlayerId: 'current_player', // TODO: PlayerManager에서 가져오기
                toPlayerId: targetPlayerId,
                message: message || '',
                timestamp: Date.now(),
                status: FriendRequestStatus.PENDING,
                expiresAt: Date.now() + this.config.friendRequestTimeout
            };
            
            // 로컬에 보낸 요청 저장
            this.sentRequests.set(request.id, request);
            this.saveFriendsData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('friend_request_sent', {
                targetPlayerId: targetPlayerId,
                requestId: request.id
            });
            
            console.log(`📤 친구 요청 전송: ${targetPlayerId}`);
            return { success: true, requestId: request.id };
            
        } catch (error) {
            console.error('❌ 친구 요청 전송 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * [의도] 친구 요청 수락
     */
    async acceptFriendRequest(requestId: string): Promise<boolean> {
        try {
            const request = this.friendRequests.get(requestId);
            if (!request || request.status !== FriendRequestStatus.PENDING) {
                console.warn('유효하지 않은 친구 요청:', requestId);
                return false;
            }
            
            // 친구로 추가
            const newFriend: Friend = {
                id: request.fromPlayerId,
                username: `Player_${request.fromPlayerId.substr(-4)}`, // TODO: 실제 사용자 정보 가져오기
                level: 1,
                avatarUrl: '',
                lastSeen: Date.now(),
                currentWorld: 1,
                connectionDate: Date.now(),
                helpsSent: 0,
                helpsReceived: 0,
                giftsExchanged: 0,
                isOnline: false,
                status: FriendStatus.ACTIVE
            };
            
            this.friends.set(newFriend.id, newFriend);
            
            // 요청 상태 업데이트
            request.status = FriendRequestStatus.ACCEPTED;
            this.friendRequests.set(requestId, request);
            
            this.saveFriendsData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('friend_added', {
                friendId: newFriend.id,
                friendData: newFriend
            });
            
            console.log(`🤝 친구 요청 수락: ${newFriend.username}`);
            return true;
            
        } catch (error) {
            console.error('❌ 친구 요청 수락 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 친구 요청 거절
     */
    async rejectFriendRequest(requestId: string): Promise<boolean> {
        try {
            const request = this.friendRequests.get(requestId);
            if (!request) {
                return false;
            }
            
            request.status = FriendRequestStatus.REJECTED;
            this.friendRequests.set(requestId, request);
            this.saveFriendsData();
            
            console.log(`❌ 친구 요청 거절: ${request.fromPlayerId}`);
            return true;
            
        } catch (error) {
            console.error('❌ 친구 요청 거절 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 선물 보내기
     */
    async sendGift(friendId: string, giftType: GiftType, message?: string): Promise<boolean> {
        try {
            const friend = this.friends.get(friendId);
            if (!friend) {
                console.warn('존재하지 않는 친구:', friendId);
                return false;
            }
            
            const gift: Gift = {
                id: this.generateGiftId(),
                fromFriendId: 'current_player', // TODO: PlayerManager에서 가져오기
                toPlayerId: friendId,
                giftType: giftType,
                timestamp: Date.now(),
                message: message,
                claimed: false
            };
            
            this.gifts.set(gift.id, gift);
            this.saveFriendsData();
            
            // 통계 업데이트
            friend.giftsExchanged++;
            this.friends.set(friendId, friend);
            
            // 이벤트 발생
            EventBus.getInstance().emit('gift_sent', {
                friendId: friendId,
                giftType: giftType,
                giftId: gift.id
            });
            
            console.log(`🎁 선물 전송: ${giftType} → ${friend.username}`);
            return true;
            
        } catch (error) {
            console.error('❌ 선물 전송 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 친구 요청 유효성 검사
     */
    private validateFriendRequest(targetPlayerId: string): { isValid: boolean; reason?: string } {
        // 자기 자신에게는 요청할 수 없음
        if (targetPlayerId === 'current_player') {
            return { isValid: false, reason: 'Cannot send friend request to yourself' };
        }
        
        // 이미 친구인지 확인
        if (this.friends.has(targetPlayerId)) {
            return { isValid: false, reason: 'Already friends' };
        }
        
        // 친구 수 제한 확인
        if (this.friends.size >= this.config.maxFriends) {
            return { isValid: false, reason: 'Friend limit reached' };
        }
        
        // 차단된 사용자인지 확인
        if (this.blockedUsers.has(targetPlayerId)) {
            return { isValid: false, reason: 'User is blocked' };
        }
        
        // 이미 보낸 요청이 있는지 확인
        for (const [_, request] of this.sentRequests) {
            if (request.toPlayerId === targetPlayerId && request.status === FriendRequestStatus.PENDING) {
                return { isValid: false, reason: 'Friend request already sent' };
            }
        }
        
        return { isValid: true };
    }

    /**
     * [의도] 만료된 친구 요청 정리
     */
    private cleanupExpiredRequests(): void {
        const now = Date.now();
        let cleanedCount = 0;
        
        // 받은 요청 정리
        for (const [id, request] of this.friendRequests) {
            if (request.expiresAt && request.expiresAt < now && request.status === FriendRequestStatus.PENDING) {
                request.status = FriendRequestStatus.EXPIRED;
                this.friendRequests.set(id, request);
                cleanedCount++;
            }
        }
        
        // 보낸 요청 정리
        for (const [id, request] of this.sentRequests) {
            if (request.expiresAt && request.expiresAt < now && request.status === FriendRequestStatus.PENDING) {
                request.status = FriendRequestStatus.EXPIRED;
                this.sentRequests.set(id, request);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.saveFriendsData();
            console.log(`🧹 만료된 친구 요청 ${cleanedCount}개 정리 완료`);
        }
    }

    /**
     * [의도] 서버와 동기화
     */
    async syncWithServer(): Promise<void> {
        try {
            console.log('🔄 친구 데이터 서버 동기화 시작...');
            
            // TODO: 실제 서버 API 호출 구현
            // const serverData = await NetworkManager.getInstance().getFriendsData();
            // this.mergeFriendData(serverData);
            
            console.log('✅ 친구 데이터 동기화 완료');
        } catch (error) {
            console.warn('⚠️ 친구 데이터 동기화 실패:', error);
        }
    }

    // 유틸리티 메서드들
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateGiftId(): string {
        return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Getter 메서드들
    getFriends(): Friend[] {
        return Array.from(this.friends.values());
    }

    getFriendCount(): number {
        return this.friends.size;
    }

    getPendingFriendRequests(): FriendRequest[] {
        return Array.from(this.friendRequests.values()).filter(
            req => req.status === FriendRequestStatus.PENDING
        );
    }

    getUnclaimedGifts(): Gift[] {
        return Array.from(this.gifts.values()).filter(gift => !gift.claimed);
    }

    isFriend(playerId: string): boolean {
        return this.friends.has(playerId);
    }

    isBlocked(playerId: string): boolean {
        return this.blockedUsers.has(playerId);
    }

    /**
     * [의도] 친구 시스템 정리
     */
    cleanup(): void {
        console.log('🧹 친구 시스템 정리 중...');
        
        // 데이터 저장
        this.saveFriendsData();
        
        // 메모리 정리
        this.friends.clear();
        this.friendRequests.clear();
        this.sentRequests.clear();
        this.gifts.clear();
        this.blockedUsers.clear();
        
        this._isInitialized = false;
        console.log('✅ 친구 시스템 정리 완료');
    }
}