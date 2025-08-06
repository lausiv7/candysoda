/**
 * [의도] Sweet Puzzle 채팅 시스템 관리자
 * [책임] 길드 채팅, 개인 메시지, 메시지 필터링, 알림 관리
 */

import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../../core/EventBus';

// 채팅 관련 데이터 인터페이스
export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    receiverId?: string; // 개인 메시지인 경우
    channelId: string;
    content: string;
    timestamp: number;
    
    // 메시지 타입
    type: MessageType;
    
    // 상태 정보
    isRead: boolean;
    isFiltered: boolean;
    isReported: boolean;
    
    // 추가 데이터
    attachments?: MessageAttachment[];
    replyToId?: string;
    reactions?: MessageReaction[];
}

export interface MessageAttachment {
    id: string;
    type: AttachmentType;
    url: string;
    thumbnailUrl?: string;
    metadata?: any;
}

export interface MessageReaction {
    emoji: string;
    count: number;
    users: string[];
}

export interface ChatChannel {
    id: string;
    name: string;
    type: ChannelType;
    description?: string;
    
    // 권한 설정
    isPublic: boolean;
    allowedUserIds?: string[];
    moderatorIds: string[];
    
    // 채널 설정
    maxMessages: number;
    messageRetentionDays: number;
    
    // 통계
    totalMessages: number;
    activeUsers: number;
    lastMessageTime: number;
    createdAt: number;
}

export interface NotificationSettings {
    enableGuildChat: boolean;
    enablePrivateMessages: boolean;
    enableMentions: boolean;
    enableReactions: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    
    // 방해 금지 시간
    quietHoursStart?: string; // "22:00"
    quietHoursEnd?: string;   // "08:00"
}

export enum MessageType {
    TEXT = 'text',
    SYSTEM = 'system',
    ANNOUNCEMENT = 'announcement',
    GIFT_NOTIFICATION = 'gift_notification',
    ACHIEVEMENT = 'achievement',
    JOIN_LEAVE = 'join_leave'
}

export enum ChannelType {
    GUILD_GENERAL = 'guild_general',
    GUILD_OFFICERS = 'guild_officers',
    PRIVATE_MESSAGE = 'private_message',
    GLOBAL_CHAT = 'global_chat',
    SYSTEM_ANNOUNCEMENTS = 'system_announcements'
}

export enum AttachmentType {
    IMAGE = 'image',
    EMOJI = 'emoji',
    STICKER = 'sticker',
    ACHIEVEMENT_SHARE = 'achievement_share',
    LEVEL_SHARE = 'level_share'
}

@ccclass('ChatManager')
export class ChatManager {
    private static instance: ChatManager;
    private _isInitialized: boolean = false;
    
    // 채팅 데이터
    private channels: Map<string, ChatChannel> = new Map();
    private messages: Map<string, ChatMessage[]> = new Map(); // channelId -> messages
    private unreadCounts: Map<string, number> = new Map(); // channelId -> count
    
    // 설정
    private notificationSettings: NotificationSettings;
    private blockedUsers: Set<string> = new Set();
    private bannedWords: string[] = [];
    
    // 저장소
    private maxMessagesPerChannel: number = 1000;
    private messageRetentionDays: number = 30;
    private saveKey: string = 'sweet_puzzle_chat_data';
    
    static getInstance(): ChatManager {
        if (!this.instance) {
            this.instance = new ChatManager();
        }
        return this.instance;
    }

    /**
     * [의도] 채팅 시스템 초기화
     */
    async initialize(): Promise<void> {
        if (this._isInitialized) {
            console.warn('ChatManager already initialized');
            return;
        }

        try {
            console.log('🔄 채팅 시스템 초기화 시작...');
            
            // 기본 설정 로드
            this.setupDefaultSettings();
            
            // 기본 채널 생성
            this.setupDefaultChannels();
            
            // 로컬 데이터 로드
            this.loadChatData();
            
            // 금지 단어 로드
            this.loadBannedWords();
            
            // 오래된 메시지 정리
            this.cleanupOldMessages();
            
            this._isInitialized = true;
            console.log('✅ 채팅 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 채팅 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * [의도] 기본 설정 초기화
     */
    private setupDefaultSettings(): void {
        this.notificationSettings = {
            enableGuildChat: true,
            enablePrivateMessages: true,
            enableMentions: true,
            enableReactions: true,
            soundEnabled: true,
            vibrationEnabled: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00'
        };
        
        console.log('📋 기본 알림 설정 완료');
    }

    /**
     * [의도] 기본 채널 설정
     */
    private setupDefaultChannels(): void {
        const defaultChannels = [
            {
                id: 'system_announcements',
                name: '공지사항',
                type: ChannelType.SYSTEM_ANNOUNCEMENTS,
                description: '게임 공지사항 및 업데이트 정보',
                isPublic: true,
                moderatorIds: ['system']
            },
            {
                id: 'global_chat',
                name: '전체 채팅',
                type: ChannelType.GLOBAL_CHAT,
                description: '모든 플레이어가 참여할 수 있는 일반 채팅',
                isPublic: true,
                moderatorIds: []
            }
        ];

        defaultChannels.forEach(channelConfig => {
            const channel: ChatChannel = {
                id: channelConfig.id,
                name: channelConfig.name,
                type: channelConfig.type,
                description: channelConfig.description,
                isPublic: channelConfig.isPublic,
                moderatorIds: channelConfig.moderatorIds,
                maxMessages: this.maxMessagesPerChannel,
                messageRetentionDays: this.messageRetentionDays,
                totalMessages: 0,
                activeUsers: 0,
                lastMessageTime: 0,
                createdAt: Date.now()
            };
            
            this.channels.set(channel.id, channel);
            this.messages.set(channel.id, []);
            this.unreadCounts.set(channel.id, 0);
        });
        
        console.log(`💬 기본 채널 ${defaultChannels.length}개 생성 완료`);
    }

    /**
     * [의도] 메시지 전송
     */
    async sendMessage(channelId: string, content: string, type: MessageType = MessageType.TEXT, replyToId?: string): Promise<ChatMessage | null> {
        try {
            const channel = this.channels.get(channelId);
            if (!channel) {
                console.warn('존재하지 않는 채널:', channelId);
                return null;
            }
            
            // 메시지 내용 검증
            if (!this.validateMessage(content)) {
                console.warn('메시지 검증 실패');
                return null;
            }
            
            // 메시지 필터링
            const filteredContent = this.filterMessage(content);
            
            // 새 메시지 생성
            const message: ChatMessage = {
                id: this.generateMessageId(),
                senderId: 'current_player', // TODO: PlayerManager에서 가져오기
                senderName: 'Player', // TODO: 실제 플레이어 이름
                channelId: channelId,
                content: filteredContent,
                timestamp: Date.now(),
                type: type,
                isRead: false,
                isFiltered: filteredContent !== content,
                isReported: false,
                replyToId: replyToId,
                reactions: []
            };
            
            // 채널에 메시지 추가
            const channelMessages = this.messages.get(channelId) || [];
            channelMessages.push(message);
            
            // 메시지 수 제한
            if (channelMessages.length > channel.maxMessages) {
                channelMessages.shift(); // 가장 오래된 메시지 제거
            }
            
            this.messages.set(channelId, channelMessages);
            
            // 채널 통계 업데이트
            channel.totalMessages++;
            channel.lastMessageTime = Date.now();
            this.channels.set(channelId, channel);
            
            // 읽지 않은 메시지 카운트 증가 (자신의 메시지는 제외)
            // TODO: 다른 사용자들의 읽지 않은 카운트 업데이트
            
            this.saveChatData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('message_sent', {
                channelId: channelId,
                message: message
            });
            
            // 알림 처리
            this.handleMessageNotification(message);
            
            console.log(`💬 메시지 전송: ${channel.name}`);
            return message;
            
        } catch (error) {
            console.error('❌ 메시지 전송 실패:', error);
            return null;
        }
    }

    /**
     * [의도] 채널 메시지 조회
     */
    getChannelMessages(channelId: string, limit: number = 50, offset: number = 0): ChatMessage[] {
        const messages = this.messages.get(channelId) || [];
        return messages
            .slice(-limit - offset, offset > 0 ? -offset : undefined)
            .reverse(); // 최신 메시지부터
    }

    /**
     * [의도] 개인 메시지 전송
     */
    async sendPrivateMessage(receiverId: string, content: string): Promise<ChatMessage | null> {
        try {
            // 차단된 사용자인지 확인
            if (this.blockedUsers.has(receiverId)) {
                console.warn('차단된 사용자에게 메시지 전송 불가:', receiverId);
                return null;
            }
            
            // 개인 메시지 채널 ID 생성 (일관된 형식)
            const channelId = this.generatePrivateChannelId('current_player', receiverId);
            
            // 개인 메시지 채널이 없으면 생성
            if (!this.channels.has(channelId)) {
                await this.createPrivateChannel('current_player', receiverId);
            }
            
            // 메시지 전송
            const message = await this.sendMessage(channelId, content, MessageType.TEXT);
            if (message) {
                message.receiverId = receiverId;
            }
            
            return message;
            
        } catch (error) {
            console.error('❌ 개인 메시지 전송 실패:', error);
            return null;
        }
    }

    /**
     * [의도] 개인 메시지 채널 생성
     */
    private async createPrivateChannel(senderId: string, receiverId: string): Promise<ChatChannel> {
        const channelId = this.generatePrivateChannelId(senderId, receiverId);
        
        const channel: ChatChannel = {
            id: channelId,
            name: `Private: ${senderId}-${receiverId}`,
            type: ChannelType.PRIVATE_MESSAGE,
            isPublic: false,
            allowedUserIds: [senderId, receiverId],
            moderatorIds: [],
            maxMessages: this.maxMessagesPerChannel,
            messageRetentionDays: this.messageRetentionDays,
            totalMessages: 0,
            activeUsers: 2,
            lastMessageTime: 0,
            createdAt: Date.now()
        };
        
        this.channels.set(channelId, channel);
        this.messages.set(channelId, []);
        this.unreadCounts.set(channelId, 0);
        
        return channel;
    }

    /**
     * [의도] 메시지에 반응 추가
     */
    async addReaction(messageId: string, channelId: string, emoji: string): Promise<boolean> {
        try {
            const messages = this.messages.get(channelId);
            if (!messages) return false;
            
            const messageIndex = messages.findIndex(m => m.id === messageId);
            if (messageIndex === -1) return false;
            
            const message = messages[messageIndex];
            if (!message.reactions) {
                message.reactions = [];
            }
            
            // 기존 반응 찾기
            let reaction = message.reactions.find(r => r.emoji === emoji);
            if (!reaction) {
                reaction = { emoji, count: 0, users: [] };
                message.reactions.push(reaction);
            }
            
            // 사용자가 이미 반응했는지 확인
            const userId = 'current_player';
            if (!reaction.users.includes(userId)) {
                reaction.users.push(userId);
                reaction.count++;
            }
            
            messages[messageIndex] = message;
            this.messages.set(channelId, messages);
            this.saveChatData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('reaction_added', {
                messageId: messageId,
                channelId: channelId,
                emoji: emoji
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ 반응 추가 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 메시지 검증
     */
    private validateMessage(content: string): boolean {
        if (!content || content.trim().length === 0) {
            return false;
        }
        
        if (content.length > 500) { // 메시지 길이 제한
            return false;
        }
        
        return true;
    }

    /**
     * [의도] 메시지 필터링
     */
    private filterMessage(content: string): string {
        let filtered = content;
        
        // 금지 단어 필터링
        this.bannedWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        
        return filtered;
    }

    /**
     * [의도] 금지 단어 로드
     */
    private loadBannedWords(): void {
        // 기본 금지 단어 목록
        this.bannedWords = [
            '바보', '멍청이', 'stupid', 'idiot'
            // TODO: 더 많은 금지 단어 추가
        ];
        
        console.log(`🚫 금지 단어 ${this.bannedWords.length}개 로드`);
    }

    /**
     * [의도] 메시지 알림 처리
     */
    private handleMessageNotification(message: ChatMessage): void {
        // 조용한 시간 확인
        if (this.isQuietTime()) {
            return;
        }
        
        // 알림 설정 확인
        const channel = this.channels.get(message.channelId);
        if (!channel) return;
        
        let shouldNotify = false;
        
        switch (channel.type) {
            case ChannelType.GUILD_GENERAL:
            case ChannelType.GUILD_OFFICERS:
                shouldNotify = this.notificationSettings.enableGuildChat;
                break;
            case ChannelType.PRIVATE_MESSAGE:
                shouldNotify = this.notificationSettings.enablePrivateMessages;
                break;
            case ChannelType.SYSTEM_ANNOUNCEMENTS:
                shouldNotify = true; // 시스템 공지는 항상 알림
                break;
        }
        
        if (shouldNotify) {
            EventBus.getInstance().emit('chat_notification', {
                message: message,
                channelName: channel.name
            });
        }
    }

    /**
     * [의도] 조용한 시간 확인
     */
    private isQuietTime(): boolean {
        if (!this.notificationSettings.quietHoursStart || !this.notificationSettings.quietHoursEnd) {
            return false;
        }
        
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const start = this.notificationSettings.quietHoursStart;
        const end = this.notificationSettings.quietHoursEnd;
        
        if (start <= end) {
            return currentTime >= start && currentTime <= end;
        } else {
            return currentTime >= start || currentTime <= end;
        }
    }

    /**
     * [의도] 오래된 메시지 정리
     */
    private cleanupOldMessages(): void {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [channelId, messages] of this.messages) {
            const channel = this.channels.get(channelId);
            if (!channel) continue;
            
            const cutoffTime = now - (channel.messageRetentionDays * 24 * 60 * 60 * 1000);
            const filteredMessages = messages.filter(msg => msg.timestamp > cutoffTime);
            
            if (filteredMessages.length !== messages.length) {
                this.messages.set(channelId, filteredMessages);
                cleanedCount += (messages.length - filteredMessages.length);
            }
        }
        
        if (cleanedCount > 0) {
            this.saveChatData();
            console.log(`🧹 오래된 메시지 ${cleanedCount}개 정리 완료`);
        }
    }

    /**
     * [의도] 로컬 데이터 로드
     */
    private loadChatData(): void {
        try {
            const savedData = sys.localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // 채널 데이터 복원
                if (data.channels) {
                    this.channels = new Map(data.channels);
                }
                
                // 메시지 데이터 복원
                if (data.messages) {
                    this.messages = new Map(data.messages);
                }
                
                // 읽지 않은 메시지 카운트 복원
                if (data.unreadCounts) {
                    this.unreadCounts = new Map(data.unreadCounts);
                }
                
                // 알림 설정 복원
                if (data.notificationSettings) {
                    this.notificationSettings = { ...this.notificationSettings, ...data.notificationSettings };
                }
                
                // 차단 사용자 복원
                if (data.blockedUsers) {
                    this.blockedUsers = new Set(data.blockedUsers);
                }
                
                console.log(`📚 채팅 데이터 로드 완료`);
            }
        } catch (error) {
            console.error('❌ 채팅 데이터 로드 실패:', error);
        }
    }

    /**
     * [의도] 채팅 데이터 저장
     */
    private saveChatData(): void {
        try {
            const dataToSave = {
                channels: Array.from(this.channels.entries()),
                messages: Array.from(this.messages.entries()),
                unreadCounts: Array.from(this.unreadCounts.entries()),
                notificationSettings: this.notificationSettings,
                blockedUsers: Array.from(this.blockedUsers)
            };
            
            sys.localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ 채팅 데이터 저장 실패:', error);
        }
    }

    // 유틸리티 메서드들
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generatePrivateChannelId(user1: string, user2: string): string {
        // 일관된 채널 ID를 위해 사용자 ID를 정렬
        const sortedIds = [user1, user2].sort();
        return `private_${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Getter 메서드들
    getChannels(): ChatChannel[] {
        return Array.from(this.channels.values());
    }

    getUnreadCount(channelId: string): number {
        return this.unreadCounts.get(channelId) || 0;
    }

    getTotalUnreadCount(): number {
        let total = 0;
        for (const count of this.unreadCounts.values()) {
            total += count;
        }
        return total;
    }

    getNotificationSettings(): NotificationSettings {
        return { ...this.notificationSettings };
    }

    /**
     * [의도] 사용자 차단
     */
    blockUser(userId: string): void {
        this.blockedUsers.add(userId);
        this.saveChatData();
        
        EventBus.getInstance().emit('user_blocked', { userId });
        console.log(`🚫 사용자 차단: ${userId}`);
    }

    /**
     * [의도] 사용자 차단 해제
     */
    unblockUser(userId: string): void {
        this.blockedUsers.delete(userId);
        this.saveChatData();
        
        EventBus.getInstance().emit('user_unblocked', { userId });
        console.log(`✅ 사용자 차단 해제: ${userId}`);
    }

    /**
     * [의도] 채팅 시스템 정리
     */
    cleanup(): void {
        console.log('🧹 채팅 시스템 정리 중...');
        
        // 데이터 저장
        this.saveChatData();
        
        // 메모리 정리
        this.channels.clear();
        this.messages.clear();
        this.unreadCounts.clear();
        this.blockedUsers.clear();
        
        this._isInitialized = false;
        console.log('✅ 채팅 시스템 정리 완료');
    }
}