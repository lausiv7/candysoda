/**
 * [의도] Sweet Puzzle 길드 시스템 관리자
 * [책임] 길드 생성, 가입, 관리, 이벤트 처리의 모든 기능을 통합 관리
 */

import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../../core/EventBus';
import { SocialConfig } from '../SocialManager';

// 길드 관련 데이터 인터페이스
export interface Guild {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    level: number;
    experience: number;
    maxMembers: number;
    currentMembers: number;
    
    // 길드 설정
    isPublic: boolean;
    joinRequirementLevel: number;
    language: string;
    region: string;
    
    // 통계
    createdAt: number;
    lastActivityAt: number;
    totalScore: number;
    weeklyScore: number;
    
    // 리더 정보
    leaderId: string;
    leaderName: string;
}

export interface GuildMember {
    id: string;
    playerId: string;
    username: string;
    level: number;
    role: GuildRole;
    joinedAt: number;
    lastActiveAt: number;
    
    // 기여도
    weeklyContribution: number;
    totalContribution: number;
    donatedCoins: number;
    
    // 상태
    isOnline: boolean;
    status: MemberStatus;
}

export interface GuildJoinRequest {
    id: string;
    playerId: string;
    playerName: string;
    playerLevel: number;
    guildId: string;
    message: string;
    timestamp: number;
    status: JoinRequestStatus;
}

export enum GuildRole {
    MEMBER = 'member',
    OFFICER = 'officer',
    CO_LEADER = 'co_leader',
    LEADER = 'leader'
}

export enum MemberStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    KICKED = 'kicked',
    LEFT = 'left'
}

export enum JoinRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
}

export interface GuildCreateRequest {
    name: string;
    description: string;
    isPublic: boolean;
    joinRequirementLevel: number;
    language: string;
    region: string;
}

export interface GuildSearchFilter {
    name?: string;
    language?: string;
    region?: string;
    minLevel?: number;
    maxLevel?: number;
    hasSpace?: boolean;
}

@ccclass('GuildManager')
export class GuildManager {
    private static instance: GuildManager;
    private _isInitialized: boolean = false;
    
    // 길드 관련 데이터
    private currentGuild: Guild | null = null;
    private guildMembers: Map<string, GuildMember> = new Map();
    private joinRequests: Map<string, GuildJoinRequest> = new Map();
    private sentRequests: Map<string, GuildJoinRequest> = new Map();
    
    // 설정
    private config: SocialConfig;
    private saveKey: string = 'sweet_puzzle_guild_data';
    
    static getInstance(): GuildManager {
        if (!this.instance) {
            this.instance = new GuildManager();
        }
        return this.instance;
    }

    /**
     * [의도] 길드 시스템 초기화
     */
    async initialize(config: SocialConfig): Promise<void> {
        if (this._isInitialized) {
            console.warn('GuildManager already initialized');
            return;
        }

        try {
            console.log('🔄 길드 시스템 초기화 시작...');
            
            this.config = config;
            
            // 로컬 데이터 로드
            this.loadGuildData();
            
            // 만료된 요청 정리
            this.cleanupExpiredRequests();
            
            this._isInitialized = true;
            console.log('✅ 길드 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 길드 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * [의도] 길드 생성
     */
    async createGuild(request: GuildCreateRequest): Promise<{ success: boolean; guild?: Guild; error?: string }> {
        try {
            // 이미 길드에 속해 있는지 확인
            if (this.currentGuild) {
                return { success: false, error: 'Already in a guild' };
            }
            
            // 길드 이름 유효성 검사
            if (!this.validateGuildName(request.name)) {
                return { success: false, error: 'Invalid guild name' };
            }
            
            // 새 길드 생성
            const newGuild: Guild = {
                id: this.generateGuildId(),
                name: request.name,
                description: request.description,
                iconUrl: 'icons/guild_default',
                level: 1,
                experience: 0,
                maxMembers: this.config.maxGuildMembers,
                currentMembers: 1,
                isPublic: request.isPublic,
                joinRequirementLevel: request.joinRequirementLevel,
                language: request.language,
                region: request.region,
                createdAt: Date.now(),
                lastActivityAt: Date.now(),
                totalScore: 0,
                weeklyScore: 0,
                leaderId: 'current_player', // TODO: PlayerManager에서 가져오기
                leaderName: 'Player' // TODO: 실제 플레이어 이름
            };
            
            // 길드 리더 멤버 생성
            const leaderMember: GuildMember = {
                id: this.generateMemberId(),
                playerId: 'current_player',
                username: 'Player',
                level: 1, // TODO: 실제 플레이어 레벨
                role: GuildRole.LEADER,
                joinedAt: Date.now(),
                lastActiveAt: Date.now(),
                weeklyContribution: 0,
                totalContribution: 0,
                donatedCoins: 0,
                isOnline: true,
                status: MemberStatus.ACTIVE
            };
            
            // 길드 및 멤버 데이터 저장
            this.currentGuild = newGuild;
            this.guildMembers.set(leaderMember.id, leaderMember);
            this.saveGuildData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('guild_created', {
                guildId: newGuild.id,
                guildName: newGuild.name
            });
            
            console.log(`🏰 길드 생성 완료: ${newGuild.name}`);
            return { success: true, guild: newGuild };
            
        } catch (error) {
            console.error('❌ 길드 생성 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * [의도] 길드 가입 신청
     */
    async requestJoinGuild(guildId: string, message?: string): Promise<{ success: boolean; error?: string }> {
        try {
            // 이미 길드에 속해 있는지 확인
            if (this.currentGuild) {
                return { success: false, error: 'Already in a guild' };
            }
            
            // 이미 신청한 길드인지 확인
            for (const [_, request] of this.sentRequests) {
                if (request.guildId === guildId && request.status === JoinRequestStatus.PENDING) {
                    return { success: false, error: 'Already sent join request' };
                }
            }
            
            // 가입 신청 생성
            const joinRequest: GuildJoinRequest = {
                id: this.generateRequestId(),
                playerId: 'current_player',
                playerName: 'Player', // TODO: 실제 플레이어 이름
                playerLevel: 1, // TODO: 실제 플레이어 레벨
                guildId: guildId,
                message: message || '',
                timestamp: Date.now(),
                status: JoinRequestStatus.PENDING
            };
            
            // 보낸 요청에 저장
            this.sentRequests.set(joinRequest.id, joinRequest);
            this.saveGuildData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('guild_join_requested', {
                guildId: guildId,
                requestId: joinRequest.id
            });
            
            console.log(`📤 길드 가입 신청: ${guildId}`);
            return { success: true };
            
        } catch (error) {
            console.error('❌ 길드 가입 신청 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * [의도] 가입 신청 승인
     */
    async approveJoinRequest(requestId: string): Promise<boolean> {
        try {
            const request = this.joinRequests.get(requestId);
            if (!request || request.status !== JoinRequestStatus.PENDING) {
                console.warn('유효하지 않은 가입 신청:', requestId);
                return false;
            }
            
            // 길드 정원 확인
            if (!this.currentGuild || this.currentGuild.currentMembers >= this.currentGuild.maxMembers) {
                console.warn('길드 정원 초과');
                return false;
            }
            
            // 권한 확인 (리더나 임원만 승인 가능)
            const currentPlayerMember = this.getCurrentPlayerMember();
            if (!currentPlayerMember || 
                (currentPlayerMember.role !== GuildRole.LEADER && 
                 currentPlayerMember.role !== GuildRole.CO_LEADER &&
                 currentPlayerMember.role !== GuildRole.OFFICER)) {
                console.warn('가입 승인 권한 없음');
                return false;
            }
            
            // 새 멤버 생성
            const newMember: GuildMember = {
                id: this.generateMemberId(),
                playerId: request.playerId,
                username: request.playerName,
                level: request.playerLevel,
                role: GuildRole.MEMBER,
                joinedAt: Date.now(),
                lastActiveAt: Date.now(),
                weeklyContribution: 0,
                totalContribution: 0,
                donatedCoins: 0,
                isOnline: false,
                status: MemberStatus.ACTIVE
            };
            
            // 멤버 추가 및 길드 정보 업데이트
            this.guildMembers.set(newMember.id, newMember);
            this.currentGuild.currentMembers++;
            this.currentGuild.lastActivityAt = Date.now();
            
            // 요청 상태 업데이트
            request.status = JoinRequestStatus.ACCEPTED;
            this.joinRequests.set(requestId, request);
            
            this.saveGuildData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('guild_member_joined', {
                guildId: this.currentGuild.id,
                memberId: newMember.id,
                memberName: newMember.username
            });
            
            console.log(`🤝 새 멤버 승인: ${newMember.username}`);
            return true;
            
        } catch (error) {
            console.error('❌ 가입 승인 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 멤버 역할 변경
     */
    async changeUserRole(memberId: string, newRole: GuildRole): Promise<boolean> {
        try {
            const member = this.guildMembers.get(memberId);
            if (!member) {
                return false;
            }
            
            // 권한 확인 (리더만 역할 변경 가능)
            const currentPlayerMember = this.getCurrentPlayerMember();
            if (!currentPlayerMember || currentPlayerMember.role !== GuildRole.LEADER) {
                console.warn('역할 변경 권한 없음');
                return false;
            }
            
            // 자기 자신의 리더 역할은 변경할 수 없음
            if (member.playerId === 'current_player' && member.role === GuildRole.LEADER) {
                console.warn('리더는 자신의 역할을 변경할 수 없음');
                return false;
            }
            
            const oldRole = member.role;
            member.role = newRole;
            this.guildMembers.set(memberId, member);
            this.saveGuildData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('guild_member_role_changed', {
                memberId: memberId,
                memberName: member.username,
                oldRole: oldRole,
                newRole: newRole
            });
            
            console.log(`👑 역할 변경: ${member.username} ${oldRole} → ${newRole}`);
            return true;
            
        } catch (error) {
            console.error('❌ 역할 변경 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 길드 탈퇴
     */
    async leaveGuild(): Promise<boolean> {
        try {
            if (!this.currentGuild) {
                return false;
            }
            
            const currentPlayerMember = this.getCurrentPlayerMember();
            if (!currentPlayerMember) {
                return false;
            }
            
            // 리더가 탈퇴하는 경우 길드 해체 또는 리더 이양
            if (currentPlayerMember.role === GuildRole.LEADER) {
                const otherOfficers = Array.from(this.guildMembers.values()).filter(
                    m => m.id !== currentPlayerMember.id && 
                    (m.role === GuildRole.CO_LEADER || m.role === GuildRole.OFFICER)
                );
                
                if (otherOfficers.length > 0) {
                    // 가장 오래된 임원에게 리더 이양
                    const newLeader = otherOfficers.sort((a, b) => a.joinedAt - b.joinedAt)[0];
                    newLeader.role = GuildRole.LEADER;
                    this.guildMembers.set(newLeader.id, newLeader);
                    
                    // 길드 정보 업데이트
                    this.currentGuild.leaderId = newLeader.playerId;
                    this.currentGuild.leaderName = newLeader.username;
                    
                    console.log(`👑 리더 이양: ${newLeader.username}`);
                } else {
                    // 다른 임원이 없으면 길드 해체
                    console.log('🏰 길드 해체');
                }
            }
            
            // 멤버 제거
            for (const [id, member] of this.guildMembers) {
                if (member.playerId === 'current_player') {
                    this.guildMembers.delete(id);
                    break;
                }
            }
            
            if (this.currentGuild) {
                this.currentGuild.currentMembers--;
            }
            
            const guildName = this.currentGuild?.name;
            this.currentGuild = null;
            this.saveGuildData();
            
            // 이벤트 발생
            EventBus.getInstance().emit('guild_left', {
                guildName: guildName
            });
            
            console.log(`🚪 길드 탈퇴: ${guildName}`);
            return true;
            
        } catch (error) {
            console.error('❌ 길드 탈퇴 실패:', error);
            return false;
        }
    }

    /**
     * [의도] 로컬 저장소에서 길드 데이터 로드
     */
    private loadGuildData(): void {
        try {
            const savedData = sys.localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // 현재 길드 복원
                if (data.currentGuild) {
                    this.currentGuild = data.currentGuild;
                }
                
                // 길드 멤버 복원
                if (data.guildMembers) {
                    this.guildMembers = new Map(data.guildMembers);
                }
                
                // 가입 요청 복원
                if (data.joinRequests) {
                    this.joinRequests = new Map(data.joinRequests);
                }
                
                if (data.sentRequests) {
                    this.sentRequests = new Map(data.sentRequests);
                }
                
                console.log(`📚 길드 데이터 로드 완료 - 길드: ${this.currentGuild?.name || 'None'}`);
            }
        } catch (error) {
            console.error('❌ 길드 데이터 로드 실패:', error);
        }
    }

    /**
     * [의도] 길드 데이터 저장
     */
    private saveGuildData(): void {
        try {
            const dataToSave = {
                currentGuild: this.currentGuild,
                guildMembers: Array.from(this.guildMembers.entries()),
                joinRequests: Array.from(this.joinRequests.entries()),
                sentRequests: Array.from(this.sentRequests.entries())
            };
            
            sys.localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('❌ 길드 데이터 저장 실패:', error);
        }
    }

    /**
     * [의도] 만료된 요청 정리
     */
    private cleanupExpiredRequests(): void {
        const now = Date.now();
        const expirationTime = 7 * 24 * 60 * 60 * 1000; // 7일
        let cleanedCount = 0;
        
        for (const [id, request] of this.joinRequests) {
            if (now - request.timestamp > expirationTime && request.status === JoinRequestStatus.PENDING) {
                request.status = JoinRequestStatus.EXPIRED;
                this.joinRequests.set(id, request);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.saveGuildData();
            console.log(`🧹 만료된 가입 요청 ${cleanedCount}개 정리 완료`);
        }
    }

    /**
     * [의도] 길드명 유효성 검사
     */
    private validateGuildName(name: string): boolean {
        if (!name || name.length < 3 || name.length > 20) {
            return false;
        }
        
        // 특수문자 제한
        const allowedPattern = /^[a-zA-Z0-9가-힣\s]+$/;
        return allowedPattern.test(name);
    }

    /**
     * [의도] 현재 플레이어의 길드 멤버 정보 조회
     */
    private getCurrentPlayerMember(): GuildMember | null {
        for (const member of this.guildMembers.values()) {
            if (member.playerId === 'current_player') {
                return member;
            }
        }
        return null;
    }

    // 유틸리티 메서드들
    private generateGuildId(): string {
        return `guild_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateMemberId(): string {
        return `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Getter 메서드들
    getCurrentGuild(): Guild | null {
        return this.currentGuild;
    }

    getGuildMembers(): GuildMember[] {
        return Array.from(this.guildMembers.values());
    }

    getPendingJoinRequests(): GuildJoinRequest[] {
        return Array.from(this.joinRequests.values()).filter(
            req => req.status === JoinRequestStatus.PENDING
        );
    }

    isInGuild(): boolean {
        return this.currentGuild !== null;
    }

    canInviteMembers(): boolean {
        const member = this.getCurrentPlayerMember();
        return member && (
            member.role === GuildRole.LEADER ||
            member.role === GuildRole.CO_LEADER ||
            member.role === GuildRole.OFFICER
        );
    }

    /**
     * [의도] 길드 시스템 정리
     */
    cleanup(): void {
        console.log('🧹 길드 시스템 정리 중...');
        
        // 데이터 저장
        this.saveGuildData();
        
        // 메모리 정리
        this.currentGuild = null;
        this.guildMembers.clear();
        this.joinRequests.clear();
        this.sentRequests.clear();
        
        this._isInitialized = false;
        console.log('✅ 길드 시스템 정리 완료');
    }
}