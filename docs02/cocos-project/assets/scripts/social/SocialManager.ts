/**
 * [의도] Sweet Puzzle 소셜 시스템 총괄 관리자
 * [책임] 모든 소셜 기능의 초기화, 조정, 상태 관리를 담당
 */

import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

import { FriendManager } from './friends/FriendManager';
import { GuildManager } from './guilds/GuildManager';
import { LeaderboardManager } from './competition/LeaderboardManager';
import { ChatManager } from './communication/ChatManager';
import { EventBus } from '../core/EventBus';

export interface SocialConfig {
    maxFriends: number;
    maxGuildMembers: number;
    friendRequestTimeout: number;
    giftCooldownTime: number;
    chatMessageLimit: number;
}

export enum SocialEvent {
    FRIEND_ADDED = 'friend_added',
    FRIEND_REMOVED = 'friend_removed',
    FRIEND_REQUEST_RECEIVED = 'friend_request_received',
    GIFT_RECEIVED = 'gift_received',
    GUILD_JOINED = 'guild_joined',
    GUILD_LEFT = 'guild_left'
}

@ccclass('SocialManager')
export class SocialManager extends Component {
    private static instance: SocialManager;
    private _isInitialized: boolean = false;
    private _config: SocialConfig;

    // 소셜 시스템 컴포넌트들
    private friendManager: FriendManager;
    private guildManager: GuildManager;
    private leaderboardManager: LeaderboardManager;
    private chatManager: ChatManager;
    
    static getInstance(): SocialManager {
        if (!this.instance) {
            const node = new Node('SocialManager');
            this.instance = node.addComponent(SocialManager);
            director.getScene()?.addChild(node);
        }
        return this.instance;
    }

    /**
     * [의도] 소셜 시스템 초기화
     */
    async initialize(config?: Partial<SocialConfig>): Promise<void> {
        if (this._isInitialized) {
            console.warn('SocialManager already initialized');
            return;
        }

        try {
            // 기본 설정 적용
            this._config = {
                maxFriends: 100,
                maxGuildMembers: 50,
                friendRequestTimeout: 7 * 24 * 60 * 60 * 1000, // 7일
                giftCooldownTime: 24 * 60 * 60 * 1000, // 24시간
                chatMessageLimit: 100,
                ...config
            };

            console.log('🔄 소셜 시스템 초기화 시작...');

            // 친구 시스템 초기화
            this.friendManager = FriendManager.getInstance();
            await this.friendManager.initialize(this._config);

            // 길드 시스템 초기화
            this.guildManager = GuildManager.getInstance();
            await this.guildManager.initialize(this._config);

            // 리더보드 시스템 초기화
            this.leaderboardManager = LeaderboardManager.getInstance();
            await this.leaderboardManager.initialize();

            // 채팅 시스템 초기화
            this.chatManager = ChatManager.getInstance();
            await this.chatManager.initialize();

            // 이벤트 핸들러 설정
            this.setupEventHandlers();

            // 네트워크 상태 확인 및 동기화
            await this.syncWithServer();

            this._isInitialized = true;
            console.log('✅ 소셜 시스템 초기화 완료');

            // 초기화 완료 이벤트 발생
            EventBus.getInstance().emit('social_system_initialized');

        } catch (error) {
            console.error('❌ 소셜 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * [의도] 이벤트 핸들러 설정
     */
    private setupEventHandlers(): void {
        const eventBus = EventBus.getInstance();

        // 친구 시스템 이벤트
        eventBus.on(SocialEvent.FRIEND_ADDED, this.onFriendAdded.bind(this));
        eventBus.on(SocialEvent.FRIEND_REMOVED, this.onFriendRemoved.bind(this));
        eventBus.on(SocialEvent.FRIEND_REQUEST_RECEIVED, this.onFriendRequestReceived.bind(this));
        eventBus.on(SocialEvent.GIFT_RECEIVED, this.onGiftReceived.bind(this));

        // 길드 시스템 이벤트
        eventBus.on(SocialEvent.GUILD_JOINED, this.onGuildJoined.bind(this));
        eventBus.on(SocialEvent.GUILD_LEFT, this.onGuildLeft.bind(this));

        // 네트워크 상태 변경 이벤트
        eventBus.on('network_status_changed', this.onNetworkStatusChanged.bind(this));
    }

    /**
     * [의도] 서버와 동기화
     */
    private async syncWithServer(): Promise<void> {
        try {
            console.log('🔄 서버와 소셜 데이터 동기화 중...');
            
            // 친구 데이터 동기화
            await this.friendManager.syncWithServer();
            
            // 길드 데이터 동기화는 필요시 추가
            // 리더보드와 채팅은 별도 동기화 로직 필요
            
            console.log('✅ 서버 동기화 완료');
        } catch (error) {
            console.warn('⚠️ 서버 동기화 실패, 오프라인 모드로 계속:', error);
        }
    }

    /**
     * [의도] 친구 추가 이벤트 처리
     */
    private onFriendAdded(data: { friendId: string, friendData: any }): void {
        console.log(`🎉 새 친구 추가됨: ${data.friendData.username}`);
        
        // UI 업데이트 알림
        EventBus.getInstance().emit('ui_update_friends_list');
        
        // 분석 이벤트 전송
        // AnalyticsManager.getInstance().trackEvent('social_friend_added', {
        //     friend_id: data.friendId,
        //     total_friends: this.friendManager.getFriendCount()
        // });
    }

    /**
     * [의도] 친구 제거 이벤트 처리
     */
    private onFriendRemoved(data: { friendId: string }): void {
        console.log(`👋 친구가 제거됨: ${data.friendId}`);
        
        // UI 업데이트 알림
        EventBus.getInstance().emit('ui_update_friends_list');
    }

    /**
     * [의도] 친구 요청 수신 이벤트 처리
     */
    private onFriendRequestReceived(data: { requestId: string, fromPlayerId: string, message?: string }): void {
        console.log(`📬 새 친구 요청 수신: ${data.fromPlayerId}`);
        
        // UI에 알림 표시
        EventBus.getInstance().emit('ui_show_friend_request_notification', data);
    }

    /**
     * [의도] 선물 수신 이벤트 처리
     */
    private onGiftReceived(data: { giftId: string, fromFriendId: string, giftType: string }): void {
        console.log(`🎁 선물 받음: ${data.giftType} from ${data.fromFriendId}`);
        
        // UI에 선물 알림 표시
        EventBus.getInstance().emit('ui_show_gift_notification', data);
    }

    /**
     * [의도] 길드 가입 이벤트 처리
     */
    private onGuildJoined(data: { guildId: string, guildName: string }): void {
        console.log(`🏰 길드 가입: ${data.guildName}`);
        
        // UI 업데이트 알림
        EventBus.getInstance().emit('ui_update_guild_info');
    }

    /**
     * [의도] 길드 탈퇴 이벤트 처리
     */
    private onGuildLeft(data: { guildName: string }): void {
        console.log(`🚪 길드 탈퇴: ${data.guildName}`);
        
        // UI 업데이트 알림
        EventBus.getInstance().emit('ui_update_guild_info');
    }

    /**
     * [의도] 네트워크 상태 변경 처리
     */
    private onNetworkStatusChanged(isOnline: boolean): void {
        if (isOnline) {
            console.log('🌐 온라인 상태 - 소셜 데이터 동기화 시작');
            this.syncWithServer().catch(console.error);
        } else {
            console.log('📴 오프라인 상태 - 로컬 모드로 전환');
        }
    }

    // Getter 메서드들
    getFriendManager(): FriendManager {
        return this.friendManager;
    }

    getGuildManager(): GuildManager {
        return this.guildManager;
    }

    getLeaderboardManager(): LeaderboardManager {
        return this.leaderboardManager;
    }

    getChatManager(): ChatManager {
        return this.chatManager;
    }

    getConfig(): SocialConfig {
        return { ...this._config };
    }

    isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * [의도] 소셜 시스템 정리
     */
    cleanup(): void {
        if (!this._isInitialized) {
            return;
        }

        console.log('🧹 소셜 시스템 정리 중...');

        // 이벤트 핸들러 제거
        const eventBus = EventBus.getInstance();
        eventBus.off(SocialEvent.FRIEND_ADDED);
        eventBus.off(SocialEvent.FRIEND_REMOVED);
        eventBus.off(SocialEvent.FRIEND_REQUEST_RECEIVED);
        eventBus.off(SocialEvent.GIFT_RECEIVED);
        eventBus.off('network_status_changed');

        // 각 매니저들 정리
        if (this.friendManager) {
            this.friendManager.cleanup();
        }
        
        if (this.guildManager) {
            this.guildManager.cleanup();
        }
        
        if (this.leaderboardManager) {
            this.leaderboardManager.cleanup();
        }
        
        if (this.chatManager) {
            this.chatManager.cleanup();
        }

        this._isInitialized = false;
        console.log('✅ 소셜 시스템 정리 완료');
    }
}

// 전역에서 접근 가능하도록 export
export const socialManager = SocialManager.getInstance();