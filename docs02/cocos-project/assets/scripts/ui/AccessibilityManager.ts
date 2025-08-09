/**
 * [의도] Sweet Puzzle 접근성 매니저 - 장애인 지원 및 사용성 개선 기능 통합 관리
 * [책임] 스크린 리더 지원, 색맹 지원, 음성 피드백, 큰 텍스트 모드, 접근성 설정 관리
 */

import { _decorator, Component, Node, Label, Button, find, sys } from 'cc';
import { EventBus } from '../core/EventBus';
import { DesignSystem } from './DesignSystem';

const { ccclass, property } = _decorator;

// 색맹 타입
export enum ColorBlindnessType {
    NONE = 'none',
    PROTANOPIA = 'protanopia',       // 적색맹
    DEUTERANOPIA = 'deuteranopia',   // 녹색맹  
    TRITANOPIA = 'tritanopia'        // 청색맹
}

// 음성 피드백 타입
export enum VoiceFeedbackType {
    NONE = 'none',
    BASIC = 'basic',         // 기본 피드백
    DETAILED = 'detailed'    // 상세 피드백
}

// 접근성 설정 인터페이스
export interface AccessibilitySettings {
    screenReader: boolean;
    voiceFeedback: VoiceFeedbackType;
    colorBlindnessSupport: ColorBlindnessType;
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    soundCues: boolean;
    vibration: boolean;
    focusIndicator: boolean;
    slowAnimations: boolean;
}

// 접근성 노드 정보
export interface AccessibilityNodeInfo {
    role: string;
    label: string;
    hint?: string;
    value?: string;
    state?: 'enabled' | 'disabled' | 'selected' | 'checked';
}

@ccclass('AccessibilityManager')
export class AccessibilityManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: AccessibilityManager | null = null;
    
    // 접근성 설정
    private settings: AccessibilitySettings = {
        screenReader: false,
        voiceFeedback: VoiceFeedbackType.NONE,
        colorBlindnessSupport: ColorBlindnessType.NONE,
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        soundCues: true,
        vibration: true,
        focusIndicator: true,
        slowAnimations: false
    };
    
    // 포커스 관리
    private currentFocusedNode: Node | null = null;
    private focusableNodes: Node[] = [];
    
    // 음성 합성 API
    private speechSynthesis: any = null;
    
    // 색맹 지원 필터
    private colorFilters: Map<ColorBlindnessType, any> = new Map();
    
    // 접근성 노드 정보 맵
    private nodeAccessibilityInfo: Map<Node, AccessibilityNodeInfo> = new Map();
    
    protected onLoad(): void {
        if (AccessibilityManager.instance === null) {
            AccessibilityManager.instance = this;
            this.initialize();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): AccessibilityManager {
        if (!AccessibilityManager.instance) {
            console.error('[AccessibilityManager] Instance not initialized');
            return null;
        }
        return AccessibilityManager.instance;
    }
    
    /**
     * [의도] 접근성 매니저 초기화
     */
    private initialize(): void {
        this.loadAccessibilitySettings();
        this.initializeSpeechSynthesis();
        this.setupColorBlindnessFilters();
        this.registerSystemCallbacks();
        this.scanFocusableNodes();
        this.applyAccessibilitySettings();
        
        console.log('[AccessibilityManager] 접근성 매니저 초기화 완료');
    }
    
    /**
     * [의도] 접근성 설정 로드
     */
    private loadAccessibilitySettings(): void {
        const savedSettings = sys.localStorage.getItem('sweet_puzzle_accessibility');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsedSettings };
            } catch (error) {
                console.warn('[AccessibilityManager] Failed to parse accessibility settings:', error);
            }
        }
        
        // 시스템 설정 자동 감지
        this.detectSystemAccessibilitySettings();
    }
    
    /**
     * [의도] 시스템 접근성 설정 자동 감지
     */
    private detectSystemAccessibilitySettings(): void {
        try {
            // 브라우저 환경에서 미디어 쿼리로 접근성 설정 감지
            if (typeof window !== 'undefined') {
                // 큰 텍스트 설정 감지
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    this.settings.reduceMotion = true;
                    this.settings.slowAnimations = true;
                }
                
                // 고대비 모드 감지
                if (window.matchMedia('(prefers-contrast: high)').matches) {
                    this.settings.highContrast = true;
                }
                
                // 스크린 리더 사용 감지 (간접적)
                if (navigator.userAgent.includes('JAWS') || 
                    navigator.userAgent.includes('NVDA') ||
                    navigator.userAgent.includes('VoiceOver')) {
                    this.settings.screenReader = true;
                    this.settings.voiceFeedback = VoiceFeedbackType.DETAILED;
                }
            }
        } catch (error) {
            console.warn('[AccessibilityManager] System accessibility detection failed:', error);
        }
    }
    
    /**
     * [의도] 음성 합성 초기화
     */
    private initializeSpeechSynthesis(): void {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            console.log('[AccessibilityManager] Speech synthesis initialized');
        } else {
            console.warn('[AccessibilityManager] Speech synthesis not supported');
        }
    }
    
    /**
     * [의도] 색맹 지원 필터 설정
     */
    private setupColorBlindnessFilters(): void {
        // 색맹 타입별 색상 변환 매트릭스
        const protanopiaMatrix = [
            0.567, 0.433, 0, 0, 0,
            0.558, 0.442, 0, 0, 0,
            0, 0.242, 0.758, 0, 0,
            0, 0, 0, 1, 0
        ];
        
        const deuteranopiaMatrix = [
            0.625, 0.375, 0, 0, 0,
            0.7, 0.3, 0, 0, 0,
            0, 0.3, 0.7, 0, 0,
            0, 0, 0, 1, 0
        ];
        
        const tritanopiaMatrix = [
            0.95, 0.05, 0, 0, 0,
            0, 0.433, 0.567, 0, 0,
            0, 0.475, 0.525, 0, 0,
            0, 0, 0, 1, 0
        ];
        
        this.colorFilters.set(ColorBlindnessType.PROTANOPIA, protanopiaMatrix);
        this.colorFilters.set(ColorBlindnessType.DEUTERANOPIA, deuteranopiaMatrix);
        this.colorFilters.set(ColorBlindnessType.TRITANOPIA, tritanopiaMatrix);
    }
    
    /**
     * [의도] 시스템 콜백 등록
     */
    private registerSystemCallbacks(): void {
        // 포커스 이벤트 리스너
        EventBus.getInstance().on('node_focused', this.onNodeFocused.bind(this));
        EventBus.getInstance().on('button_pressed', this.onButtonPressed.bind(this));
        EventBus.getInstance().on('game_state_changed', this.onGameStateChanged.bind(this));
        EventBus.getInstance().on('level_completed', this.onLevelCompleted.bind(this));
        EventBus.getInstance().on('error_occurred', this.onErrorOccurred.bind(this));
    }
    
    /**
     * [의도] 포커스 가능한 노드들 스캔
     */
    public scanFocusableNodes(): void {
        this.focusableNodes = [];
        
        // 모든 버튼과 상호작용 가능한 노드들 찾기
        const allButtons = this.node.getComponentsInChildren(Button);
        for (const button of allButtons) {
            if (button.node.activeInHierarchy) {
                this.focusableNodes.push(button.node);
            }
        }
        
        // 커스텀 포커스 가능한 노드들도 추가
        const customFocusableNodes = this.node.getChildByName('FocusableNodes');
        if (customFocusableNodes) {
            for (const child of customFocusableNodes.children) {
                if (child.activeInHierarchy) {
                    this.focusableNodes.push(child);
                }
            }
        }
        
        console.log(`[AccessibilityManager] ${this.focusableNodes.length}개 포커스 가능 노드 스캔 완료`);
    }
    
    /**
     * [의도] 접근성 설정 적용
     */
    private applyAccessibilitySettings(): void {
        this.applyLargeTextMode();
        this.applyHighContrastMode();
        this.applyColorBlindnessFilter();
        this.applyReducedMotion();
        this.applyFocusIndicators();
        
        console.log('[AccessibilityManager] 접근성 설정 적용 완료');
    }
    
    /**
     * [의도] 큰 텍스트 모드 적용
     */
    private applyLargeTextMode(): void {
        if (!this.settings.largeText) return;
        
        const allLabels = this.node.getComponentsInChildren(Label);
        allLabels.forEach(label => {
            const originalSize = label.fontSize;
            const enlargedSize = Math.min(originalSize * 1.5, 72); // 최대 72px
            label.fontSize = enlargedSize;
        });
        
        console.log('[AccessibilityManager] 큰 텍스트 모드 적용됨');
    }
    
    /**
     * [의도] 고대비 모드 적용
     */
    private applyHighContrastMode(): void {
        if (!this.settings.highContrast) return;
        
        const designSystem = DesignSystem.getInstance();
        if (designSystem) {
            // 고대비 색상으로 변경
            designSystem.setTheme('dark'); // 어두운 테마로 전환
            
            // 모든 UI 요소의 대비 강화
            this.enhanceContrast();
        }
        
        console.log('[AccessibilityManager] 고대비 모드 적용됨');
    }
    
    /**
     * [의도] 대비 강화
     */
    private enhanceContrast(): void {
        // 모든 라벨의 색상을 고대비로 변경
        const allLabels = this.node.getComponentsInChildren(Label);
        allLabels.forEach(label => {
            // 밝은 배경에는 검은색, 어두운 배경에는 흰색
            const bgBrightness = this.calculateBackgroundBrightness(label.node);
            if (bgBrightness > 0.5) {
                label.color.set(0, 0, 0, 255); // 검은색
            } else {
                label.color.set(255, 255, 255, 255); // 흰색
            }
        });
    }
    
    /**
     * [의도] 배경 밝기 계산
     */
    private calculateBackgroundBrightness(node: Node): number {
        // 간단한 배경 밝기 계산 (실제로는 더 복잡한 로직 필요)
        return 0.3; // 임시 값
    }
    
    /**
     * [의도] 색맹 필터 적용
     */
    private applyColorBlindnessFilter(): void {
        if (this.settings.colorBlindnessSupport === ColorBlindnessType.NONE) return;
        
        const filter = this.colorFilters.get(this.settings.colorBlindnessSupport);
        if (filter) {
            // Canvas에 색상 매트릭스 필터 적용 (Cocos Creator의 실제 구현 필요)
            console.log(`[AccessibilityManager] ${this.settings.colorBlindnessSupport} 색맹 필터 적용됨`);
        }
    }
    
    /**
     * [의도] 모션 감소 적용
     */
    private applyReducedMotion(): void {
        if (!this.settings.reduceMotion) return;
        
        // 모든 애니메이션 속도 감소 또는 비활성화
        EventBus.getInstance().emit('reduce_animations', {
            slowAnimations: this.settings.slowAnimations
        });
        
        console.log('[AccessibilityManager] 모션 감소 모드 적용됨');
    }
    
    /**
     * [의도] 포커스 인디케이터 적용
     */
    private applyFocusIndicators(): void {
        if (!this.settings.focusIndicator) return;
        
        // 포커스 가능한 모든 노드에 포커스 링 추가
        this.focusableNodes.forEach(node => {
            this.addFocusIndicator(node);
        });
        
        console.log('[AccessibilityManager] 포커스 인디케이터 적용됨');
    }
    
    /**
     * [의도] 포커스 인디케이터 추가
     */
    private addFocusIndicator(node: Node): void {
        // 포커스 링 UI 컴포넌트 추가 (Cocos Creator 구현 필요)
        console.log(`[AccessibilityManager] 포커스 인디케이터 추가: ${node.name}`);
    }
    
    /**
     * [의도] 음성 피드백 제공
     */
    public provideSpeechFeedback(text: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
        if (this.settings.voiceFeedback === VoiceFeedbackType.NONE) return;
        if (!this.speechSynthesis) return;
        
        // 높은 우선순위면 기존 음성 중단
        if (priority === 'high') {
            this.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR'; // 한국어 설정
        utterance.rate = 0.8; // 말하기 속도
        utterance.pitch = 1.0; // 음높이
        utterance.volume = 0.8; // 음량
        
        this.speechSynthesis.speak(utterance);
        
        console.log(`[AccessibilityManager] Speech feedback: "${text}"`);
    }
    
    /**
     * [의도] 노드에 접근성 정보 설정
     */
    public setAccessibilityInfo(node: Node, info: AccessibilityNodeInfo): void {
        this.nodeAccessibilityInfo.set(node, info);
        
        // 스크린 리더 지원을 위한 ARIA 속성 설정
        if (this.settings.screenReader) {
            this.setAriaAttributes(node, info);
        }
    }
    
    /**
     * [의도] ARIA 속성 설정
     */
    private setAriaAttributes(node: Node, info: AccessibilityNodeInfo): void {
        // Cocos Creator에서는 직접적인 ARIA 속성 설정이 제한적
        // 대신 커스텀 속성으로 정보 저장
        node['accessibilityRole'] = info.role;
        node['accessibilityLabel'] = info.label;
        node['accessibilityHint'] = info.hint;
        node['accessibilityState'] = info.state;
        
        console.log(`[AccessibilityManager] ARIA 속성 설정: ${node.name}`);
    }
    
    /**
     * [의도] 포커스 이동 (키보드 탐색)
     */
    public moveFocus(direction: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right'): void {
        if (this.focusableNodes.length === 0) return;
        
        let currentIndex = this.currentFocusedNode ? 
            this.focusableNodes.indexOf(this.currentFocusedNode) : -1;
        
        let nextIndex: number;
        
        switch (direction) {
            case 'next':
                nextIndex = (currentIndex + 1) % this.focusableNodes.length;
                break;
            case 'previous':
                nextIndex = currentIndex <= 0 ? 
                    this.focusableNodes.length - 1 : currentIndex - 1;
                break;
            case 'up':
            case 'down':
            case 'left':
            case 'right':
                nextIndex = this.findDirectionalFocus(direction);
                break;
            default:
                return;
        }
        
        this.focusNode(this.focusableNodes[nextIndex]);
    }
    
    /**
     * [의도] 방향별 포커스 찾기
     */
    private findDirectionalFocus(direction: 'up' | 'down' | 'left' | 'right'): number {
        if (!this.currentFocusedNode) return 0;
        
        const currentPos = this.currentFocusedNode.getWorldPosition();
        let bestDistance = Infinity;
        let bestIndex = 0;
        
        this.focusableNodes.forEach((node, index) => {
            if (node === this.currentFocusedNode) return;
            
            const nodePos = node.getWorldPosition();
            const dx = nodePos.x - currentPos.x;
            const dy = nodePos.y - currentPos.y;
            
            // 방향성 체크
            let isValidDirection = false;
            switch (direction) {
                case 'up':
                    isValidDirection = dy > 0;
                    break;
                case 'down':
                    isValidDirection = dy < 0;
                    break;
                case 'left':
                    isValidDirection = dx < 0;
                    break;
                case 'right':
                    isValidDirection = dx > 0;
                    break;
            }
            
            if (isValidDirection) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = index;
                }
            }
        });
        
        return bestIndex;
    }
    
    /**
     * [의도] 노드에 포커스 설정
     */
    public focusNode(node: Node): void {
        if (this.currentFocusedNode) {
            this.blurCurrentFocus();
        }
        
        this.currentFocusedNode = node;
        this.highlightFocusedNode(node);
        
        // 접근성 정보 음성 피드백
        const accessibilityInfo = this.nodeAccessibilityInfo.get(node);
        if (accessibilityInfo && this.settings.voiceFeedback !== VoiceFeedbackType.NONE) {
            let feedbackText = accessibilityInfo.label;
            if (this.settings.voiceFeedback === VoiceFeedbackType.DETAILED && accessibilityInfo.hint) {
                feedbackText += `. ${accessibilityInfo.hint}`;
            }
            this.provideSpeechFeedback(feedbackText);
        }
        
        EventBus.getInstance().emit('node_focused', { node, accessibilityInfo });
    }
    
    /**
     * [의도] 현재 포커스 해제
     */
    private blurCurrentFocus(): void {
        if (this.currentFocusedNode) {
            this.removeFocusHighlight(this.currentFocusedNode);
            this.currentFocusedNode = null;
        }
    }
    
    /**
     * [의도] 포커스된 노드 하이라이트
     */
    private highlightFocusedNode(node: Node): void {
        // 포커스 링 표시 (Cocos Creator 구현 필요)
        console.log(`[AccessibilityManager] 노드 포커스됨: ${node.name}`);
    }
    
    /**
     * [의도] 포커스 하이라이트 제거
     */
    private removeFocusHighlight(node: Node): void {
        // 포커스 링 숨김 (Cocos Creator 구현 필요)
        console.log(`[AccessibilityManager] 노드 포커스 해제됨: ${node.name}`);
    }
    
    /**
     * [의도] 접근성 설정 업데이트
     */
    public updateAccessibilitySettings(newSettings: Partial<AccessibilitySettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.saveAccessibilitySettings();
        this.applyAccessibilitySettings();
        
        EventBus.getInstance().emit('accessibility_settings_changed', {
            settings: this.settings
        });
        
        console.log('[AccessibilityManager] 접근성 설정 업데이트됨');
    }
    
    /**
     * [의도] 접근성 설정 저장
     */
    private saveAccessibilitySettings(): void {
        sys.localStorage.setItem('sweet_puzzle_accessibility', JSON.stringify(this.settings));
    }
    
    /**
     * [의도] 현재 접근성 설정 조회
     */
    public getAccessibilitySettings(): AccessibilitySettings {
        return { ...this.settings };
    }
    
    // === 이벤트 핸들러들 ===
    
    private onNodeFocused(event: any): void {
        const { node } = event;
        if (this.settings.soundCues) {
            // 포커스 사운드 재생
        }
        
        if (this.settings.vibration && sys.isMobile) {
            // 햅틱 피드백
            this.triggerHapticFeedback('light');
        }
    }
    
    private onButtonPressed(event: any): void {
        const { button } = event;
        
        if (this.settings.soundCues) {
            // 버튼 클릭 사운드 재생
        }
        
        if (this.settings.vibration && sys.isMobile) {
            this.triggerHapticFeedback('medium');
        }
        
        // 버튼 액션 음성 피드백
        const accessibilityInfo = this.nodeAccessibilityInfo.get(button);
        if (accessibilityInfo) {
            this.provideSpeechFeedback(`${accessibilityInfo.label} 버튼 누름`);
        }
    }
    
    private onGameStateChanged(event: any): void {
        const { state, context } = event;
        
        // 게임 상태 변경 음성 안내
        let announcement = '';
        switch (state) {
            case 'playing':
                announcement = '게임이 시작되었습니다';
                break;
            case 'paused':
                announcement = '게임이 일시정지되었습니다';
                break;
            case 'resumed':
                announcement = '게임이 재개되었습니다';
                break;
            case 'completed':
                announcement = '레벨을 완료했습니다';
                break;
        }
        
        if (announcement) {
            this.provideSpeechFeedback(announcement, 'high');
        }
    }
    
    private onLevelCompleted(event: any): void {
        const { level, stars, score } = event;
        
        // 레벨 완료 상세 음성 안내
        const announcement = `레벨 ${level} 완료! ${stars}개 별 획득, 점수: ${score}점`;
        this.provideSpeechFeedback(announcement, 'high');
        
        if (this.settings.vibration && sys.isMobile) {
            this.triggerHapticFeedback('heavy');
        }
    }
    
    private onErrorOccurred(event: any): void {
        const { error, context } = event;
        
        // 오류 발생 음성 안내
        this.provideSpeechFeedback('오류가 발생했습니다. 다시 시도해주세요.', 'high');
        
        if (this.settings.vibration && sys.isMobile) {
            this.triggerHapticFeedback('error');
        }
    }
    
    /**
     * [의도] 햅틱 피드백 트리거
     */
    private triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'error'): void {
        // Cocos Creator의 네이티브 햅틱 API 호출 (플랫폼별 구현 필요)
        console.log(`[AccessibilityManager] Haptic feedback: ${type}`);
    }
    
    /**
     * [의도] 접근성 검사 실행
     */
    public runAccessibilityAudit(): {
        issues: string[];
        suggestions: string[];
        score: number;
    } {
        const issues: string[] = [];
        const suggestions: string[] = [];
        
        // 포커스 가능한 요소 검사
        if (this.focusableNodes.length === 0) {
            issues.push('포커스 가능한 UI 요소가 없습니다');
            suggestions.push('버튼이나 상호작용 요소에 포커스 기능을 추가하세요');
        }
        
        // 접근성 정보 설정 검사
        const nodesWithoutAccessibility = this.focusableNodes.filter(
            node => !this.nodeAccessibilityInfo.has(node)
        );
        if (nodesWithoutAccessibility.length > 0) {
            issues.push(`${nodesWithoutAccessibility.length}개 요소에 접근성 정보가 없습니다`);
            suggestions.push('모든 상호작용 요소에 접근성 라벨을 추가하세요');
        }
        
        // 색상 대비 검사
        const designSystem = DesignSystem.getInstance();
        if (designSystem) {
            // 실제로는 모든 UI 요소의 색상 대비를 검사해야 함
            suggestions.push('모든 텍스트가 WCAG AA 기준(4.5:1 대비)을 만족하는지 확인하세요');
        }
        
        // 점수 계산 (100점 만점)
        let score = 100;
        score -= issues.length * 15; // 각 이슈당 15점 감점
        score = Math.max(0, score);
        
        console.log(`[AccessibilityManager] 접근성 검사 완료 - 점수: ${score}/100`);
        
        return { issues, suggestions, score };
    }
}