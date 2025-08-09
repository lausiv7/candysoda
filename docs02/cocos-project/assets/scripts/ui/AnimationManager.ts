/**
 * [의도] Sweet Puzzle 애니메이션 매니저 - UI 애니메이션, 전환 효과, 피드백 애니메이션 통합 관리
 * [책임] 트윈 애니메이션, 스프라이트 애니메이션, 파티클 효과, 상호작용 피드백, 성능 최적화
 */

import { _decorator, Component, Node, tween, Tween, Vec3, Color, UIOpacity, UITransform, ParticleSystem, Animation, AnimationClip, director, game } from 'cc';
import { EventBus } from '../core/EventBus';
import { AccessibilityManager } from './AccessibilityManager';

const { ccclass, property } = _decorator;

// 애니메이션 타입
export enum AnimationType {
    FADE_IN = 'fade_in',
    FADE_OUT = 'fade_out',
    SLIDE_IN = 'slide_in',
    SLIDE_OUT = 'slide_out',
    SCALE_IN = 'scale_in',
    SCALE_OUT = 'scale_out',
    BOUNCE_IN = 'bounce_in',
    BOUNCE_OUT = 'bounce_out',
    SHAKE = 'shake',
    PULSE = 'pulse',
    ROTATE = 'rotate',
    FLIP = 'flip',
    ELASTIC = 'elastic',
    SPRING = 'spring'
}

// 이징 타입
export enum EasingType {
    LINEAR = 'linear',
    EASE_IN = 'ease_in',
    EASE_OUT = 'ease_out',
    EASE_IN_OUT = 'ease_in_out',
    BACK_IN = 'back_in',
    BACK_OUT = 'back_out',
    BACK_IN_OUT = 'back_in_out',
    BOUNCE_IN = 'bounce_in',
    BOUNCE_OUT = 'bounce_out',
    BOUNCE_IN_OUT = 'bounce_in_out',
    ELASTIC_IN = 'elastic_in',
    ELASTIC_OUT = 'elastic_out',
    ELASTIC_IN_OUT = 'elastic_in_out'
}

// 애니메이션 방향
export enum AnimationDirection {
    UP = 'up',
    DOWN = 'down',
    LEFT = 'left',
    RIGHT = 'right',
    IN = 'in',
    OUT = 'out'
}

// 애니메이션 설정 인터페이스
export interface AnimationConfig {
    type: AnimationType;
    duration?: number;
    delay?: number;
    easing?: EasingType;
    direction?: AnimationDirection;
    distance?: number;
    intensity?: number;
    loop?: boolean;
    pingPong?: boolean;
    onStart?: () => void;
    onUpdate?: (progress: number) => void;
    onComplete?: () => void;
}

// 시퀀스 애니메이션 설정
export interface SequenceAnimationConfig {
    animations: AnimationConfig[];
    parallel?: boolean;
    repeat?: number;
    onSequenceComplete?: () => void;
}

// 스프링 애니메이션 설정
export interface SpringAnimationConfig {
    target: Vec3 | number | Color;
    stiffness?: number;
    damping?: number;
    mass?: number;
    velocity?: Vec3 | number;
    precision?: number;
}

// 파티클 효과 설정
export interface ParticleEffectConfig {
    type: 'explosion' | 'sparkle' | 'trail' | 'burst' | 'confetti';
    position?: Vec3;
    duration?: number;
    intensity?: number;
    color?: Color;
    scale?: number;
}

// 애니메이션 상태
export interface AnimationState {
    id: string;
    node: Node;
    tween: Tween<any>;
    config: AnimationConfig;
    startTime: number;
    isPlaying: boolean;
    isPaused: boolean;
}

@ccclass('AnimationManager')
export class AnimationManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: AnimationManager | null = null;
    
    // 애니메이션 상태 추적
    private activeAnimations: Map<string, AnimationState> = new Map();
    private animationIdCounter: number = 0;
    
    // 성능 설정
    private maxConcurrentAnimations: number = 20;
    private animationQuality: 'low' | 'medium' | 'high' = 'high';
    private reducedMotion: boolean = false;
    
    // 프리셋 애니메이션 설정들
    private presetConfigs: Map<string, AnimationConfig> = new Map();
    
    // 시스템 참조
    private accessibilityManager: AccessibilityManager = null!;
    
    // 공통 애니메이션 상수들
    private readonly DEFAULT_DURATION = 0.3;
    private readonly DEFAULT_EASING = EasingType.EASE_OUT;
    
    protected onLoad(): void {
        if (AnimationManager.instance === null) {
            AnimationManager.instance = this;
            this.initialize();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            console.error('[AnimationManager] Instance not initialized');
            return null;
        }
        return AnimationManager.instance;
    }
    
    /**
     * [의도] 애니메이션 매니저 초기화
     */
    private initialize(): void {
        this.setupSystemReferences();
        this.setupPresetAnimations();
        this.loadPerformanceSettings();
        this.setupEventListeners();
        
        console.log('[AnimationManager] 애니메이션 매니저 초기화 완료');
    }
    
    /**
     * [의도] 시스템 참조 설정
     */
    private setupSystemReferences(): void {
        this.accessibilityManager = AccessibilityManager.getInstance();
        
        // 접근성 설정에 따른 모션 조정
        if (this.accessibilityManager) {
            const settings = this.accessibilityManager.getAccessibilitySettings();
            this.reducedMotion = settings.reduceMotion;
        }
    }
    
    /**
     * [의도] 프리셋 애니메이션 설정
     */
    private setupPresetAnimations(): void {
        // UI 요소 등장 애니메이션
        this.presetConfigs.set('ui_appear', {
            type: AnimationType.SCALE_IN,
            duration: 0.4,
            easing: EasingType.BACK_OUT
        });
        
        // UI 요소 사라짐 애니메이션
        this.presetConfigs.set('ui_disappear', {
            type: AnimationType.SCALE_OUT,
            duration: 0.2,
            easing: EasingType.BACK_IN
        });
        
        // 버튼 클릭 피드백
        this.presetConfigs.set('button_press', {
            type: AnimationType.SCALE_IN,
            duration: 0.1,
            intensity: 0.95
        });
        
        // 버튼 릴리즈 피드백
        this.presetConfigs.set('button_release', {
            type: AnimationType.SCALE_OUT,
            duration: 0.1,
            intensity: 1.0
        });
        
        // 성공 애니메이션
        this.presetConfigs.set('success_pulse', {
            type: AnimationType.PULSE,
            duration: 0.6,
            intensity: 1.2,
            easing: EasingType.ELASTIC_OUT
        });
        
        // 오류 알림 애니메이션
        this.presetConfigs.set('error_shake', {
            type: AnimationType.SHAKE,
            duration: 0.4,
            intensity: 10,
            direction: AnimationDirection.LEFT
        });
        
        // 로딩 회전 애니메이션
        this.presetConfigs.set('loading_spin', {
            type: AnimationType.ROTATE,
            duration: 1.0,
            loop: true,
            easing: EasingType.LINEAR
        });
        
        // 알림 슬라이드 인
        this.presetConfigs.set('notification_slide_in', {
            type: AnimationType.SLIDE_IN,
            duration: 0.5,
            direction: AnimationDirection.RIGHT,
            easing: EasingType.EASE_OUT
        });
        
        console.log(`[AnimationManager] ${this.presetConfigs.size}개 프리셋 애니메이션 설정 완료`);
    }
    
    /**
     * [의도] 성능 설정 로드
     */
    private loadPerformanceSettings(): void {
        // 디바이스 성능에 따른 자동 조정
        const deviceInfo = this.detectDevicePerformance();
        
        if (deviceInfo.isLowEnd) {
            this.animationQuality = 'low';
            this.maxConcurrentAnimations = 10;
        } else if (deviceInfo.isMidRange) {
            this.animationQuality = 'medium';
            this.maxConcurrentAnimations = 15;
        } else {
            this.animationQuality = 'high';
            this.maxConcurrentAnimations = 20;
        }
        
        console.log(`[AnimationManager] 성능 설정: ${this.animationQuality}, 최대 동시 애니메이션: ${this.maxConcurrentAnimations}`);
    }
    
    /**
     * [의도] 디바이스 성능 감지
     */
    private detectDevicePerformance(): {isLowEnd: boolean, isMidRange: boolean, isHighEnd: boolean} {
        // 간단한 성능 감지 (실제로는 더 복잡한 벤치마크 필요)
        const fps = game.frameRate;
        const isLowEnd = fps < 30;
        const isMidRange = fps >= 30 && fps < 60;
        const isHighEnd = fps >= 60;
        
        return { isLowEnd, isMidRange, isHighEnd };
    }
    
    /**
     * [의도] 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        EventBus.getInstance().on('accessibility_settings_changed', this.onAccessibilitySettingsChanged.bind(this));
        EventBus.getInstance().on('game_paused', this.pauseAllAnimations.bind(this));
        EventBus.getInstance().on('game_resumed', this.resumeAllAnimations.bind(this));
    }
    
    /**
     * [의도] 기본 애니메이션 재생
     */
    public playAnimation(node: Node, config: AnimationConfig): string {
        if (!node || !node.isValid) {
            console.error('[AnimationManager] Invalid node for animation');
            return '';
        }
        
        // 모션 감소 설정 확인
        if (this.reducedMotion && this.shouldSkipAnimation(config.type)) {
            if (config.onComplete) config.onComplete();
            return '';
        }
        
        // 동시 애니메이션 수 제한
        if (this.activeAnimations.size >= this.maxConcurrentAnimations) {
            this.cleanupOldAnimations();
        }
        
        const animationId = this.generateAnimationId();
        const finalConfig = this.adjustConfigForPerformance(config);
        
        const animationTween = this.createTweenForType(node, finalConfig);
        if (!animationTween) {
            console.error(`[AnimationManager] Failed to create animation: ${config.type}`);
            return '';
        }
        
        // 애니메이션 상태 저장
        const animationState: AnimationState = {
            id: animationId,
            node: node,
            tween: animationTween,
            config: finalConfig,
            startTime: Date.now(),
            isPlaying: true,
            isPaused: false
        };
        
        this.activeAnimations.set(animationId, animationState);
        
        // 애니메이션 시작
        animationTween.start();
        
        console.log(`[AnimationManager] 애니메이션 시작: ${config.type} (ID: ${animationId})`);
        return animationId;
    }
    
    /**
     * [의도] 프리셋 애니메이션 재생
     */
    public playPresetAnimation(node: Node, presetName: string, overrides?: Partial<AnimationConfig>): string {
        const presetConfig = this.presetConfigs.get(presetName);
        if (!presetConfig) {
            console.error(`[AnimationManager] Preset not found: ${presetName}`);
            return '';
        }
        
        const config = { ...presetConfig, ...overrides };
        return this.playAnimation(node, config);
    }
    
    /**
     * [의도] 시퀀스 애니메이션 재생
     */
    public async playSequenceAnimation(node: Node, config: SequenceAnimationConfig): Promise<void> {
        if (config.parallel) {
            // 병렬 실행
            const promises = config.animations.map(animConfig => 
                this.playAnimationAsPromise(node, animConfig)
            );
            await Promise.all(promises);
        } else {
            // 순차 실행
            for (const animConfig of config.animations) {
                await this.playAnimationAsPromise(node, animConfig);
            }
        }
        
        if (config.onSequenceComplete) {
            config.onSequenceComplete();
        }
        
        // 반복 실행
        if (config.repeat && config.repeat > 0) {
            const newConfig = { ...config, repeat: config.repeat - 1 };
            await this.playSequenceAnimation(node, newConfig);
        }
    }
    
    /**
     * [의도] 애니메이션을 Promise로 실행
     */
    private playAnimationAsPromise(node: Node, config: AnimationConfig): Promise<void> {
        return new Promise((resolve) => {
            const originalOnComplete = config.onComplete;
            config.onComplete = () => {
                if (originalOnComplete) originalOnComplete();
                resolve();
            };
            
            this.playAnimation(node, config);
        });
    }
    
    /**
     * [의도] 타입별 트윈 애니메이션 생성
     */
    private createTweenForType(node: Node, config: AnimationConfig): Tween<any> | null {
        const duration = config.duration || this.DEFAULT_DURATION;
        const delay = config.delay || 0;
        
        let animTween: Tween<any>;
        
        switch (config.type) {
            case AnimationType.FADE_IN:
                animTween = this.createFadeInAnimation(node, duration, delay);
                break;
                
            case AnimationType.FADE_OUT:
                animTween = this.createFadeOutAnimation(node, duration, delay);
                break;
                
            case AnimationType.SCALE_IN:
                animTween = this.createScaleInAnimation(node, duration, delay, config.intensity);
                break;
                
            case AnimationType.SCALE_OUT:
                animTween = this.createScaleOutAnimation(node, duration, delay, config.intensity);
                break;
                
            case AnimationType.SLIDE_IN:
                animTween = this.createSlideInAnimation(node, duration, delay, config.direction, config.distance);
                break;
                
            case AnimationType.SLIDE_OUT:
                animTween = this.createSlideOutAnimation(node, duration, delay, config.direction, config.distance);
                break;
                
            case AnimationType.BOUNCE_IN:
                animTween = this.createBounceInAnimation(node, duration, delay);
                break;
                
            case AnimationType.BOUNCE_OUT:
                animTween = this.createBounceOutAnimation(node, duration, delay);
                break;
                
            case AnimationType.SHAKE:
                animTween = this.createShakeAnimation(node, duration, delay, config.intensity, config.direction);
                break;
                
            case AnimationType.PULSE:
                animTween = this.createPulseAnimation(node, duration, delay, config.intensity);
                break;
                
            case AnimationType.ROTATE:
                animTween = this.createRotateAnimation(node, duration, delay, config.loop);
                break;
                
            case AnimationType.FLIP:
                animTween = this.createFlipAnimation(node, duration, delay);
                break;
                
            case AnimationType.ELASTIC:
                animTween = this.createElasticAnimation(node, duration, delay);
                break;
                
            case AnimationType.SPRING:
                animTween = this.createSpringAnimation(node, duration, delay);
                break;
                
            default:
                console.error(`[AnimationManager] Unsupported animation type: ${config.type}`);
                return null;
        }
        
        // 이징 적용
        if (config.easing) {
            animTween = this.applyEasing(animTween, config.easing);
        }
        
        // 콜백 설정
        if (config.onStart) {
            animTween.call(config.onStart);
        }
        
        if (config.onComplete) {
            animTween.call(() => {
                config.onComplete();
                this.onAnimationComplete(node);
            });
        }
        
        return animTween;
    }
    
    /**
     * [의도] 페이드 인 애니메이션
     */
    private createFadeInAnimation(node: Node, duration: number, delay: number): Tween<any> {
        const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
        opacity.opacity = 0;
        
        return tween(opacity)
            .delay(delay)
            .to(duration, { opacity: 255 });
    }
    
    /**
     * [의도] 페이드 아웃 애니메이션
     */
    private createFadeOutAnimation(node: Node, duration: number, delay: number): Tween<any> {
        const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
        
        return tween(opacity)
            .delay(delay)
            .to(duration, { opacity: 0 });
    }
    
    /**
     * [의도] 스케일 인 애니메이션
     */
    private createScaleInAnimation(node: Node, duration: number, delay: number, targetScale?: number): Tween<any> {
        const scale = targetScale || 1.0;
        node.setScale(0, 0, 1);
        
        return tween(node)
            .delay(delay)
            .to(duration, { scale: new Vec3(scale, scale, 1) });
    }
    
    /**
     * [의도] 스케일 아웃 애니메이션
     */
    private createScaleOutAnimation(node: Node, duration: number, delay: number, targetScale?: number): Tween<any> {
        const scale = targetScale || 0.0;
        
        return tween(node)
            .delay(delay)
            .to(duration, { scale: new Vec3(scale, scale, 1) });
    }
    
    /**
     * [의도] 슬라이드 인 애니메이션
     */
    private createSlideInAnimation(node: Node, duration: number, delay: number, direction?: AnimationDirection, distance?: number): Tween<any> {
        const slideDistance = distance || 500;
        const originalPos = node.position.clone();
        
        let startPos: Vec3;
        switch (direction) {
            case AnimationDirection.LEFT:
                startPos = new Vec3(originalPos.x - slideDistance, originalPos.y, originalPos.z);
                break;
            case AnimationDirection.RIGHT:
                startPos = new Vec3(originalPos.x + slideDistance, originalPos.y, originalPos.z);
                break;
            case AnimationDirection.UP:
                startPos = new Vec3(originalPos.x, originalPos.y + slideDistance, originalPos.z);
                break;
            case AnimationDirection.DOWN:
                startPos = new Vec3(originalPos.x, originalPos.y - slideDistance, originalPos.z);
                break;
            default:
                startPos = new Vec3(originalPos.x + slideDistance, originalPos.y, originalPos.z);
        }
        
        node.setPosition(startPos);
        
        return tween(node)
            .delay(delay)
            .to(duration, { position: originalPos });
    }
    
    /**
     * [의도] 슬라이드 아웃 애니메이션
     */
    private createSlideOutAnimation(node: Node, duration: number, delay: number, direction?: AnimationDirection, distance?: number): Tween<any> {
        const slideDistance = distance || 500;
        const originalPos = node.position.clone();
        
        let endPos: Vec3;
        switch (direction) {
            case AnimationDirection.LEFT:
                endPos = new Vec3(originalPos.x - slideDistance, originalPos.y, originalPos.z);
                break;
            case AnimationDirection.RIGHT:
                endPos = new Vec3(originalPos.x + slideDistance, originalPos.y, originalPos.z);
                break;
            case AnimationDirection.UP:
                endPos = new Vec3(originalPos.x, originalPos.y + slideDistance, originalPos.z);
                break;
            case AnimationDirection.DOWN:
                endPos = new Vec3(originalPos.x, originalPos.y - slideDistance, originalPos.z);
                break;
            default:
                endPos = new Vec3(originalPos.x + slideDistance, originalPos.y, originalPos.z);
        }
        
        return tween(node)
            .delay(delay)
            .to(duration, { position: endPos });
    }
    
    /**
     * [의도] 바운스 인 애니메이션
     */
    private createBounceInAnimation(node: Node, duration: number, delay: number): Tween<any> {
        node.setScale(0, 0, 1);
        
        return tween(node)
            .delay(delay)
            .to(duration * 0.6, { scale: new Vec3(1.2, 1.2, 1) })
            .to(duration * 0.4, { scale: new Vec3(1, 1, 1) });
    }
    
    /**
     * [의도] 바운스 아웃 애니메이션
     */
    private createBounceOutAnimation(node: Node, duration: number, delay: number): Tween<any> {
        return tween(node)
            .delay(delay)
            .to(duration * 0.4, { scale: new Vec3(1.1, 1.1, 1) })
            .to(duration * 0.6, { scale: new Vec3(0, 0, 1) });
    }
    
    /**
     * [의도] 흔들림 애니메이션
     */
    private createShakeAnimation(node: Node, duration: number, delay: number, intensity?: number, direction?: AnimationDirection): Tween<any> {
        const shakeIntensity = intensity || 10;
        const originalPos = node.position.clone();
        const shakeCount = 8;
        const shakeDuration = duration / shakeCount;
        
        let shakeTween = tween(node).delay(delay);
        
        for (let i = 0; i < shakeCount; i++) {
            let shakePos: Vec3;
            
            if (direction === AnimationDirection.UP || direction === AnimationDirection.DOWN) {
                const yOffset = (i % 2 === 0 ? shakeIntensity : -shakeIntensity) * (1 - i / shakeCount);
                shakePos = new Vec3(originalPos.x, originalPos.y + yOffset, originalPos.z);
            } else {
                const xOffset = (i % 2 === 0 ? shakeIntensity : -shakeIntensity) * (1 - i / shakeCount);
                shakePos = new Vec3(originalPos.x + xOffset, originalPos.y, originalPos.z);
            }
            
            shakeTween = shakeTween.to(shakeDuration, { position: shakePos });
        }
        
        return shakeTween.to(shakeDuration, { position: originalPos });
    }
    
    /**
     * [의도] 펄스 애니메이션
     */
    private createPulseAnimation(node: Node, duration: number, delay: number, intensity?: number): Tween<any> {
        const pulseScale = intensity || 1.2;
        const originalScale = node.scale.clone();
        
        return tween(node)
            .delay(delay)
            .to(duration * 0.5, { scale: new Vec3(pulseScale, pulseScale, 1) })
            .to(duration * 0.5, { scale: originalScale });
    }
    
    /**
     * [의도] 회전 애니메이션
     */
    private createRotateAnimation(node: Node, duration: number, delay: number, loop?: boolean): Tween<any> {
        const rotateTween = tween(node)
            .delay(delay)
            .to(duration, { eulerAngles: new Vec3(0, 0, 360) });
        
        if (loop) {
            return rotateTween.repeatForever();
        }
        
        return rotateTween;
    }
    
    /**
     * [의도] 플립 애니메이션
     */
    private createFlipAnimation(node: Node, duration: number, delay: number): Tween<any> {
        return tween(node)
            .delay(delay)
            .to(duration * 0.5, { scale: new Vec3(0, 1, 1) })
            .to(duration * 0.5, { scale: new Vec3(1, 1, 1) });
    }
    
    /**
     * [의도] 탄성 애니메이션
     */
    private createElasticAnimation(node: Node, duration: number, delay: number): Tween<any> {
        const originalScale = node.scale.clone();
        
        return tween(node)
            .delay(delay)
            .to(duration * 0.3, { scale: new Vec3(1.3, 1.3, 1) })
            .to(duration * 0.4, { scale: new Vec3(0.8, 0.8, 1) })
            .to(duration * 0.3, { scale: originalScale });
    }
    
    /**
     * [의도] 스프링 애니메이션
     */
    private createSpringAnimation(node: Node, duration: number, delay: number): Tween<any> {
        const originalScale = node.scale.clone();
        
        return tween(node)
            .delay(delay)
            .to(duration * 0.6, { scale: new Vec3(1.15, 1.15, 1) })
            .to(duration * 0.4, { scale: originalScale });
    }
    
    /**
     * [의도] 이징 적용
     */
    private applyEasing(animTween: Tween<any>, easing: EasingType): Tween<any> {
        switch (easing) {
            case EasingType.LINEAR:
                return animTween;
            case EasingType.EASE_IN:
                return animTween.easing('cubicIn');
            case EasingType.EASE_OUT:
                return animTween.easing('cubicOut');
            case EasingType.EASE_IN_OUT:
                return animTween.easing('cubicInOut');
            case EasingType.BACK_IN:
                return animTween.easing('backIn');
            case EasingType.BACK_OUT:
                return animTween.easing('backOut');
            case EasingType.BACK_IN_OUT:
                return animTween.easing('backInOut');
            case EasingType.BOUNCE_IN:
                return animTween.easing('bounceIn');
            case EasingType.BOUNCE_OUT:
                return animTween.easing('bounceOut');
            case EasingType.BOUNCE_IN_OUT:
                return animTween.easing('bounceInOut');
            case EasingType.ELASTIC_IN:
                return animTween.easing('elasticIn');
            case EasingType.ELASTIC_OUT:
                return animTween.easing('elasticOut');
            case EasingType.ELASTIC_IN_OUT:
                return animTween.easing('elasticInOut');
            default:
                return animTween;
        }
    }
    
    /**
     * [의도] 파티클 효과 재생
     */
    public playParticleEffect(config: ParticleEffectConfig): Node {
        const particleNode = new Node('ParticleEffect');
        
        if (config.position) {
            particleNode.setPosition(config.position);
        }
        
        // ParticleSystem 컴포넌트 추가
        const particleSystem = particleNode.addComponent(ParticleSystem);
        
        // 파티클 설정
        this.configureParticleSystem(particleSystem, config);
        
        // 씬에 추가
        const canvas = director.getScene().getChildByName('Canvas');
        if (canvas) {
            canvas.addChild(particleNode);
        }
        
        // 자동 제거
        const duration = config.duration || 2.0;
        this.scheduleOnce(() => {
            if (particleNode && particleNode.isValid) {
                particleNode.destroy();
            }
        }, duration);
        
        console.log(`[AnimationManager] 파티클 효과 재생: ${config.type}`);
        return particleNode;
    }
    
    /**
     * [의도] 파티클 시스템 구성
     */
    private configureParticleSystem(particleSystem: ParticleSystem, config: ParticleEffectConfig): void {
        // 기본 파티클 설정 (실제로는 더 세밀한 설정 필요)
        switch (config.type) {
            case 'explosion':
                // 폭발 효과 설정
                break;
            case 'sparkle':
                // 반짝임 효과 설정
                break;
            case 'trail':
                // 궤적 효과 설정
                break;
            case 'burst':
                // 터짐 효과 설정
                break;
            case 'confetti':
                // 색종이 효과 설정
                break;
        }
        
        // 파티클 시작
        particleSystem.play();
    }
    
    /**
     * [의도] 애니메이션 일시정지
     */
    public pauseAnimation(animationId: string): boolean {
        const animState = this.activeAnimations.get(animationId);
        if (!animState || animState.isPaused) return false;
        
        animState.tween.pause();
        animState.isPaused = true;
        animState.isPlaying = false;
        
        console.log(`[AnimationManager] 애니메이션 일시정지: ${animationId}`);
        return true;
    }
    
    /**
     * [의도] 애니메이션 재개
     */
    public resumeAnimation(animationId: string): boolean {
        const animState = this.activeAnimations.get(animationId);
        if (!animState || !animState.isPaused) return false;
        
        animState.tween.resume();
        animState.isPaused = false;
        animState.isPlaying = true;
        
        console.log(`[AnimationManager] 애니메이션 재개: ${animationId}`);
        return true;
    }
    
    /**
     * [의도] 애니메이션 정지
     */
    public stopAnimation(animationId: string): boolean {
        const animState = this.activeAnimations.get(animationId);
        if (!animState) return false;
        
        animState.tween.stop();
        this.activeAnimations.delete(animationId);
        
        console.log(`[AnimationManager] 애니메이션 정지: ${animationId}`);
        return true;
    }
    
    /**
     * [의도] 노드의 모든 애니메이션 정지
     */
    public stopAllAnimationsOnNode(node: Node): number {
        let stoppedCount = 0;
        
        for (const [id, animState] of this.activeAnimations) {
            if (animState.node === node) {
                animState.tween.stop();
                this.activeAnimations.delete(id);
                stoppedCount++;
            }
        }
        
        console.log(`[AnimationManager] 노드의 ${stoppedCount}개 애니메이션 정지`);
        return stoppedCount;
    }
    
    /**
     * [의도] 모든 애니메이션 일시정지
     */
    public pauseAllAnimations(): void {
        for (const [id, animState] of this.activeAnimations) {
            if (animState.isPlaying) {
                this.pauseAnimation(id);
            }
        }
        
        console.log('[AnimationManager] 모든 애니메이션 일시정지됨');
    }
    
    /**
     * [의도] 모든 애니메이션 재개
     */
    public resumeAllAnimations(): void {
        for (const [id, animState] of this.activeAnimations) {
            if (animState.isPaused) {
                this.resumeAnimation(id);
            }
        }
        
        console.log('[AnimationManager] 모든 애니메이션 재개됨');
    }
    
    /**
     * [의도] 모든 애니메이션 정지
     */
    public stopAllAnimations(): void {
        for (const [id] of this.activeAnimations) {
            this.stopAnimation(id);
        }
        
        console.log('[AnimationManager] 모든 애니메이션 정지됨');
    }
    
    // === 유틸리티 메서드들 ===
    
    /**
     * [의도] 성능에 따른 설정 조정
     */
    private adjustConfigForPerformance(config: AnimationConfig): AnimationConfig {
        const adjustedConfig = { ...config };
        
        if (this.animationQuality === 'low') {
            // 저성능 모드: 애니메이션 단순화
            adjustedConfig.duration = (adjustedConfig.duration || this.DEFAULT_DURATION) * 0.5;
            adjustedConfig.easing = EasingType.LINEAR;
        } else if (this.animationQuality === 'medium') {
            // 중간 성능 모드: 적당한 최적화
            adjustedConfig.duration = (adjustedConfig.duration || this.DEFAULT_DURATION) * 0.8;
        }
        
        return adjustedConfig;
    }
    
    /**
     * [의도] 모션 감소 모드에서 건너뛸 애니메이션 판단
     */
    private shouldSkipAnimation(type: AnimationType): boolean {
        if (!this.reducedMotion) return false;
        
        // 접근성을 위해 건너뛸 애니메이션들
        const skipTypes = [
            AnimationType.SHAKE,
            AnimationType.BOUNCE_IN,
            AnimationType.BOUNCE_OUT,
            AnimationType.ELASTIC,
            AnimationType.SPRING
        ];
        
        return skipTypes.includes(type);
    }
    
    /**
     * [의도] 애니메이션 ID 생성
     */
    private generateAnimationId(): string {
        return `anim_${++this.animationIdCounter}_${Date.now()}`;
    }
    
    /**
     * [의도] 오래된 애니메이션 정리
     */
    private cleanupOldAnimations(): void {
        const now = Date.now();
        const maxAge = 10000; // 10초
        
        for (const [id, animState] of this.activeAnimations) {
            if (now - animState.startTime > maxAge) {
                this.stopAnimation(id);
            }
        }
    }
    
    /**
     * [의도] 애니메이션 완료 처리
     */
    private onAnimationComplete(node: Node): void {
        // 완료된 애니메이션 상태에서 제거
        for (const [id, animState] of this.activeAnimations) {
            if (animState.node === node && !animState.isPlaying) {
                this.activeAnimations.delete(id);
                break;
            }
        }
    }
    
    /**
     * [의도] 접근성 설정 변경 핸들러
     */
    private onAccessibilitySettingsChanged(event: any): void {
        const settings = event.settings;
        const wasReducedMotion = this.reducedMotion;
        this.reducedMotion = settings.reduceMotion;
        
        if (this.reducedMotion && !wasReducedMotion) {
            // 모션 감소 모드로 변경됨 - 일부 애니메이션 정지
            this.stopMotionSensitiveAnimations();
        }
        
        console.log(`[AnimationManager] 모션 감소 모드: ${this.reducedMotion}`);
    }
    
    /**
     * [의도] 모션에 민감한 애니메이션들 정지
     */
    private stopMotionSensitiveAnimations(): void {
        const sensitiveTypes = [
            AnimationType.SHAKE,
            AnimationType.BOUNCE_IN,
            AnimationType.BOUNCE_OUT,
            AnimationType.ELASTIC,
            AnimationType.SPRING
        ];
        
        for (const [id, animState] of this.activeAnimations) {
            if (sensitiveTypes.includes(animState.config.type)) {
                this.stopAnimation(id);
            }
        }
    }
    
    /**
     * [의도] 현재 활성 애니메이션 정보 조회
     */
    public getActiveAnimationsInfo(): Array<{
        id: string;
        type: AnimationType;
        duration: number;
        isPlaying: boolean;
        isPaused: boolean;
    }> {
        const info: Array<{
            id: string;
            type: AnimationType;
            duration: number;
            isPlaying: boolean;
            isPaused: boolean;
        }> = [];
        
        for (const [id, animState] of this.activeAnimations) {
            info.push({
                id,
                type: animState.config.type,
                duration: animState.config.duration || this.DEFAULT_DURATION,
                isPlaying: animState.isPlaying,
                isPaused: animState.isPaused
            });
        }
        
        return info;
    }
    
    /**
     * [의도] 애니메이션 매니저 정리
     */
    public cleanup(): void {
        this.stopAllAnimations();
        this.unscheduleAllCallbacks();
        console.log('[AnimationManager] 애니메이션 매니저 정리 완료');
    }
}