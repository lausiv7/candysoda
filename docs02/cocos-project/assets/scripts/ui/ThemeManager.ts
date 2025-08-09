/**
 * [의도] Sweet Puzzle 테마 매니저 - 동적 테마 전환, 다크/라이트 모드, 커스텀 테마 지원
 * [책임] 테마 시스템 관리, 동적 스타일 변경, 사용자 테마 설정, 시간대별 테마, 계절 테마
 */

import { _decorator, Component, Node, Label, Sprite, Color, sys, director } from 'cc';
import { EventBus } from '../core/EventBus';
import { DesignSystem, ColorTheme, SWEET_PUZZLE_COLORS } from './DesignSystem';
import { UIComponentLibrary } from './UIComponentLibrary';

const { ccclass, property } = _decorator;

// 테마 타입
export enum ThemeType {
    LIGHT = 'light',
    DARK = 'dark',
    AUTO = 'auto',
    CUSTOM = 'custom'
}

// 계절 테마
export enum SeasonalTheme {
    SPRING = 'spring',
    SUMMER = 'summer',
    AUTUMN = 'autumn',
    WINTER = 'winter',
    CHRISTMAS = 'christmas',
    HALLOWEEN = 'halloween',
    VALENTINE = 'valentine'
}

// 시간대별 테마
export enum TimeBasedTheme {
    MORNING = 'morning',     // 6-12시
    AFTERNOON = 'afternoon', // 12-18시
    EVENING = 'evening',     // 18-22시
    NIGHT = 'night'         // 22-6시
}

// 테마 설정 인터페이스
export interface ThemeConfig {
    name: string;
    displayName: string;
    type: ThemeType;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        shadow: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    gradients?: {
        primary: string[];
        secondary: string[];
        background: string[];
    };
    effects?: {
        blur: number;
        opacity: number;
        saturation: number;
        brightness: number;
        contrast: number;
    };
    animations?: {
        duration: number;
        easing: string;
    };
}

// 적용 가능한 요소 타입
export enum ThemeableElementType {
    BACKGROUND = 'background',
    PANEL = 'panel',
    BUTTON = 'button',
    TEXT = 'text',
    ICON = 'icon',
    BORDER = 'border',
    SHADOW = 'shadow'
}

// 테마 적용 규칙
export interface ThemeRule {
    selector: string;
    elementType: ThemeableElementType;
    property: string;
    value: string | Color;
}

@ccclass('ThemeManager')
export class ThemeManager extends Component {
    
    // 싱글톤 인스턴스
    private static instance: ThemeManager | null = null;
    
    // 현재 테마 설정
    private currentTheme: ThemeConfig = null!;
    private currentThemeType: ThemeType = ThemeType.LIGHT;
    private currentSeasonalTheme: SeasonalTheme | null = null;
    
    // 사용 가능한 테마들
    private availableThemes: Map<string, ThemeConfig> = new Map();
    
    // 테마 적용 규칙들
    private themeRules: ThemeRule[] = [];
    
    // 시스템 참조들
    private designSystem: DesignSystem = null!;
    private uiComponentLibrary: UIComponentLibrary = null!;
    
    // 자동 테마 설정
    private autoThemeEnabled: boolean = false;
    private timeBasedThemeEnabled: boolean = false;
    private seasonalThemeEnabled: boolean = false;
    
    // 테마 전환 애니메이션
    private transitionDuration: number = 0.3;
    private isTransitioning: boolean = false;
    
    protected onLoad(): void {
        if (ThemeManager.instance === null) {
            ThemeManager.instance = this;
            this.initialize();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            console.error('[ThemeManager] Instance not initialized');
            return null;
        }
        return ThemeManager.instance;
    }
    
    /**
     * [의도] 테마 매니저 초기화
     */
    private initialize(): void {
        this.setupSystemReferences();
        this.createBuiltInThemes();
        this.loadUserThemeSettings();
        this.setupAutoThemeDetection();
        this.setupThemeRules();
        this.applyInitialTheme();
        
        console.log('[ThemeManager] 테마 매니저 초기화 완료');
    }
    
    /**
     * [의도] 시스템 참조 설정
     */
    private setupSystemReferences(): void {
        this.designSystem = DesignSystem.getInstance();
        this.uiComponentLibrary = UIComponentLibrary.getInstance();
    }
    
    /**
     * [의도] 내장 테마들 생성
     */
    private createBuiltInThemes(): void {
        // 라이트 테마
        const lightTheme: ThemeConfig = {
            name: 'light',
            displayName: '라이트 모드',
            type: ThemeType.LIGHT,
            colors: {
                primary: '#FF4081',
                secondary: '#9C27B0',
                background: '#FFFFFF',
                surface: '#F8F9FA',
                text: '#212121',
                textSecondary: '#757575',
                border: '#E0E0E0',
                shadow: 'rgba(0,0,0,0.1)',
                success: '#4CAF50',
                warning: '#FFC107',
                error: '#F44336',
                info: '#2196F3'
            },
            gradients: {
                primary: ['#FF4081', '#E91E63'],
                secondary: ['#9C27B0', '#673AB7'],
                background: ['#FFFFFF', '#F8F9FA']
            },
            effects: {
                blur: 0,
                opacity: 1.0,
                saturation: 1.0,
                brightness: 1.0,
                contrast: 1.0
            },
            animations: {
                duration: 0.3,
                easing: 'ease-out'
            }
        };
        
        // 다크 테마
        const darkTheme: ThemeConfig = {
            name: 'dark',
            displayName: '다크 모드',
            type: ThemeType.DARK,
            colors: {
                primary: '#FF4081',
                secondary: '#CE93D8',
                background: '#121212',
                surface: '#1E1E1E',
                text: '#FFFFFF',
                textSecondary: '#B3B3B3',
                border: '#333333',
                shadow: 'rgba(0,0,0,0.5)',
                success: '#66BB6A',
                warning: '#FFCA28',
                error: '#EF5350',
                info: '#42A5F5'
            },
            gradients: {
                primary: ['#FF4081', '#F06292'],
                secondary: ['#CE93D8', '#BA68C8'],
                background: ['#121212', '#1E1E1E']
            },
            effects: {
                blur: 2,
                opacity: 0.95,
                saturation: 0.9,
                brightness: 0.8,
                contrast: 1.1
            },
            animations: {
                duration: 0.4,
                easing: 'ease-in-out'
            }
        };
        
        // 계절 테마들
        const springTheme: ThemeConfig = {
            name: 'spring',
            displayName: '봄 테마',
            type: ThemeType.CUSTOM,
            colors: {
                primary: '#8BC34A',
                secondary: '#4CAF50',
                background: '#F1F8E9',
                surface: '#E8F5E8',
                text: '#2E7D32',
                textSecondary: '#4E7A4E',
                border: '#C8E6C9',
                shadow: 'rgba(76,175,80,0.2)',
                success: '#66BB6A',
                warning: '#FFC107',
                error: '#E57373',
                info: '#4FC3F7'
            },
            gradients: {
                primary: ['#8BC34A', '#4CAF50'],
                secondary: ['#4CAF50', '#388E3C'],
                background: ['#F1F8E9', '#E8F5E8']
            },
            effects: {
                blur: 1,
                opacity: 0.98,
                saturation: 1.1,
                brightness: 1.05,
                contrast: 0.95
            },
            animations: {
                duration: 0.5,
                easing: 'ease-out'
            }
        };
        
        const winterTheme: ThemeConfig = {
            name: 'winter',
            displayName: '겨울 테마',
            type: ThemeType.CUSTOM,
            colors: {
                primary: '#2196F3',
                secondary: '#03A9F4',
                background: '#E3F2FD',
                surface: '#BBDEFB',
                text: '#0D47A1',
                textSecondary: '#1565C0',
                border: '#90CAF9',
                shadow: 'rgba(33,150,243,0.2)',
                success: '#4CAF50',
                warning: '#FF9800',
                error: '#F44336',
                info: '#00BCD4'
            },
            gradients: {
                primary: ['#2196F3', '#1976D2'],
                secondary: ['#03A9F4', '#0288D1'],
                background: ['#E3F2FD', '#BBDEFB']
            },
            effects: {
                blur: 3,
                opacity: 0.92,
                saturation: 0.8,
                brightness: 1.1,
                contrast: 1.05
            },
            animations: {
                duration: 0.6,
                easing: 'ease-in-out'
            }
        };
        
        // 테마들 등록
        this.availableThemes.set('light', lightTheme);
        this.availableThemes.set('dark', darkTheme);
        this.availableThemes.set('spring', springTheme);
        this.availableThemes.set('winter', winterTheme);
        
        console.log(`[ThemeManager] ${this.availableThemes.size}개 내장 테마 생성 완료`);
    }
    
    /**
     * [의도] 사용자 테마 설정 로드
     */
    private loadUserThemeSettings(): void {
        try {
            const savedSettings = sys.localStorage.getItem('sweet_puzzle_theme_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                this.currentThemeType = settings.themeType || ThemeType.LIGHT;
                this.autoThemeEnabled = settings.autoThemeEnabled || false;
                this.timeBasedThemeEnabled = settings.timeBasedThemeEnabled || false;
                this.seasonalThemeEnabled = settings.seasonalThemeEnabled || false;
                this.transitionDuration = settings.transitionDuration || 0.3;
            }
        } catch (error) {
            console.warn('[ThemeManager] Failed to load theme settings:', error);
        }
        
        console.log(`[ThemeManager] 테마 설정 로드됨: ${this.currentThemeType}`);
    }
    
    /**
     * [의도] 자동 테마 감지 설정
     */
    private setupAutoThemeDetection(): void {
        if (this.autoThemeEnabled) {
            this.detectSystemTheme();
            this.setupSystemThemeListener();
        }
        
        if (this.timeBasedThemeEnabled) {
            this.setupTimeBasedTheme();
        }
        
        if (this.seasonalThemeEnabled) {
            this.setupSeasonalTheme();
        }
    }
    
    /**
     * [의도] 시스템 테마 감지
     */
    private detectSystemTheme(): void {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentThemeType = prefersDark ? ThemeType.DARK : ThemeType.LIGHT;
        }
    }
    
    /**
     * [의도] 시스템 테마 변경 감지기 설정
     */
    private setupSystemThemeListener(): void {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (this.autoThemeEnabled) {
                    this.switchToTheme(e.matches ? ThemeType.DARK : ThemeType.LIGHT);
                }
            });
        }
    }
    
    /**
     * [의도] 시간대별 테마 설정
     */
    private setupTimeBasedTheme(): void {
        const updateTimeBasedTheme = () => {
            if (!this.timeBasedThemeEnabled) return;
            
            const hour = new Date().getHours();
            let timeTheme: TimeBasedTheme;
            
            if (hour >= 6 && hour < 12) {
                timeTheme = TimeBasedTheme.MORNING;
            } else if (hour >= 12 && hour < 18) {
                timeTheme = TimeBasedTheme.AFTERNOON;
            } else if (hour >= 18 && hour < 22) {
                timeTheme = TimeBasedTheme.EVENING;
            } else {
                timeTheme = TimeBasedTheme.NIGHT;
            }
            
            this.applyTimeBasedTheme(timeTheme);
        };
        
        // 즉시 실행
        updateTimeBasedTheme();
        
        // 매시간 업데이트
        this.schedule(updateTimeBasedTheme, 3600);
    }
    
    /**
     * [의도] 계절 테마 설정
     */
    private setupSeasonalTheme(): void {
        if (!this.seasonalThemeEnabled) return;
        
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        
        // 특별한 날짜들
        if (month === 12 && day >= 20) {
            this.currentSeasonalTheme = SeasonalTheme.CHRISTMAS;
        } else if (month === 10 && day >= 25) {
            this.currentSeasonalTheme = SeasonalTheme.HALLOWEEN;
        } else if (month === 2 && day === 14) {
            this.currentSeasonalTheme = SeasonalTheme.VALENTINE;
        } else {
            // 계절별
            if (month >= 3 && month <= 5) {
                this.currentSeasonalTheme = SeasonalTheme.SPRING;
            } else if (month >= 6 && month <= 8) {
                this.currentSeasonalTheme = SeasonalTheme.SUMMER;
            } else if (month >= 9 && month <= 11) {
                this.currentSeasonalTheme = SeasonalTheme.AUTUMN;
            } else {
                this.currentSeasonalTheme = SeasonalTheme.WINTER;
            }
        }
        
        console.log(`[ThemeManager] 계절 테마 설정: ${this.currentSeasonalTheme}`);
    }
    
    /**
     * [의도] 테마 규칙 설정
     */
    private setupThemeRules(): void {
        this.themeRules = [
            // 배경 규칙들
            {
                selector: 'Canvas',
                elementType: ThemeableElementType.BACKGROUND,
                property: 'color',
                value: 'background'
            },
            {
                selector: '.panel',
                elementType: ThemeableElementType.PANEL,
                property: 'backgroundColor',
                value: 'surface'
            },
            
            // 텍스트 규칙들
            {
                selector: '.text-primary',
                elementType: ThemeableElementType.TEXT,
                property: 'color',
                value: 'text'
            },
            {
                selector: '.text-secondary',
                elementType: ThemeableElementType.TEXT,
                property: 'color',
                value: 'textSecondary'
            },
            
            // 버튼 규칙들
            {
                selector: '.btn-primary',
                elementType: ThemeableElementType.BUTTON,
                property: 'backgroundColor',
                value: 'primary'
            },
            {
                selector: '.btn-secondary',
                elementType: ThemeableElementType.BUTTON,
                property: 'backgroundColor',
                value: 'secondary'
            },
            
            // 테두리 규칙들
            {
                selector: '.bordered',
                elementType: ThemeableElementType.BORDER,
                property: 'borderColor',
                value: 'border'
            }
        ];
        
        console.log(`[ThemeManager] ${this.themeRules.length}개 테마 규칙 설정 완료`);
    }
    
    /**
     * [의도] 초기 테마 적용
     */
    private applyInitialTheme(): void {
        let initialThemeName: string;
        
        if (this.currentSeasonalTheme && this.availableThemes.has(this.currentSeasonalTheme)) {
            initialThemeName = this.currentSeasonalTheme;
        } else if (this.currentThemeType === ThemeType.AUTO) {
            this.detectSystemTheme();
            initialThemeName = this.currentThemeType;
        } else {
            initialThemeName = this.currentThemeType;
        }
        
        const theme = this.availableThemes.get(initialThemeName);
        if (theme) {
            this.currentTheme = theme;
            this.applyTheme(theme);
        }
    }
    
    /**
     * [의도] 테마 전환
     */
    public async switchToTheme(themeType: ThemeType | string, animated: boolean = true): Promise<void> {
        if (this.isTransitioning) {
            console.warn('[ThemeManager] 테마 전환 중입니다');
            return;
        }
        
        let theme: ThemeConfig | undefined;
        
        if (typeof themeType === 'string') {
            theme = this.availableThemes.get(themeType);
        } else {
            theme = this.availableThemes.get(themeType);
        }
        
        if (!theme) {
            console.error(`[ThemeManager] 테마를 찾을 수 없습니다: ${themeType}`);
            return;
        }
        
        console.log(`[ThemeManager] 테마 전환 시작: ${this.currentTheme?.name} → ${theme.name}`);
        
        if (animated) {
            this.isTransitioning = true;
            await this.animateThemeTransition(this.currentTheme, theme);
            this.isTransitioning = false;
        } else {
            this.applyTheme(theme);
        }
        
        this.currentTheme = theme;
        this.currentThemeType = theme.type;
        
        // 설정 저장
        this.saveThemeSettings();
        
        // 이벤트 발생
        EventBus.getInstance().emit('theme_changed', {
            previousTheme: this.currentTheme?.name,
            newTheme: theme.name,
            themeConfig: theme
        });
        
        console.log(`[ThemeManager] 테마 전환 완료: ${theme.name}`);
    }
    
    /**
     * [의도] 테마 애니메이션 전환
     */
    private async animateThemeTransition(fromTheme: ThemeConfig, toTheme: ThemeConfig): Promise<void> {
        return new Promise((resolve) => {
            // 페이드 아웃
            const fadeOutDuration = this.transitionDuration * 0.3;
            
            // 전체 화면에 오버레이 생성
            const overlay = this.createTransitionOverlay();
            
            // 페이드 인
            this.scheduleOnce(() => {
                this.applyTheme(toTheme);
                
                // 오버레이 제거
                this.scheduleOnce(() => {
                    if (overlay && overlay.isValid) {
                        overlay.destroy();
                    }
                    resolve();
                }, fadeOutDuration);
                
            }, fadeOutDuration);
        });
    }
    
    /**
     * [의도] 전환 오버레이 생성
     */
    private createTransitionOverlay(): Node {
        const overlay = new Node('ThemeTransitionOverlay');
        overlay.layer = this.node.layer;
        
        // Canvas에 추가
        const canvas = director.getScene().getChildByName('Canvas');
        if (canvas) {
            canvas.addChild(overlay);
        }
        
        return overlay;
    }
    
    /**
     * [의도] 테마 적용
     */
    private applyTheme(theme: ThemeConfig): void {
        console.log(`[ThemeManager] 테마 적용 시작: ${theme.name}`);
        
        // DesignSystem에 테마 색상 적용
        if (this.designSystem) {
            this.designSystem.setTheme(theme.type === ThemeType.DARK ? 'dark' : 'light');
        }
        
        // 테마 규칙들 적용
        this.applyThemeRules(theme);
        
        // 시각적 효과 적용
        this.applyThemeEffects(theme);
        
        // 그라디언트 적용
        this.applyThemeGradients(theme);
        
        // CSS 변수 업데이트 (웹 환경의 경우)
        this.updateCSSVariables(theme);
        
        console.log(`[ThemeManager] 테마 적용 완료: ${theme.name}`);
    }
    
    /**
     * [의도] 테마 규칙들 적용
     */
    private applyThemeRules(theme: ThemeConfig): void {
        for (const rule of this.themeRules) {
            const elements = this.findElementsBySelector(rule.selector);
            
            for (const element of elements) {
                this.applyThemeRuleToElement(element, rule, theme);
            }
        }
    }
    
    /**
     * [의도] 셀렉터로 요소들 찾기
     */
    private findElementsBySelector(selector: string): Node[] {
        const elements: Node[] = [];
        
        // Canvas부터 시작해서 모든 노드 검색
        const canvas = director.getScene().getChildByName('Canvas');
        if (!canvas) return elements;
        
        if (selector.startsWith('.')) {
            // 클래스 셀렉터
            const className = selector.substring(1);
            this.findNodesByClassName(canvas, className, elements);
        } else {
            // 태그 셀렉터
            this.findNodesByName(canvas, selector, elements);
        }
        
        return elements;
    }
    
    /**
     * [의도] 클래스명으로 노드 찾기
     */
    private findNodesByClassName(parent: Node, className: string, result: Node[]): void {
        // 노드 이름에 클래스명이 포함된 경우
        if (parent.name.includes(className)) {
            result.push(parent);
        }
        
        // 자식 노드들 재귀 검색
        for (const child of parent.children) {
            this.findNodesByClassName(child, className, result);
        }
    }
    
    /**
     * [의도] 이름으로 노드 찾기
     */
    private findNodesByName(parent: Node, name: string, result: Node[]): void {
        if (parent.name === name) {
            result.push(parent);
        }
        
        for (const child of parent.children) {
            this.findNodesByName(child, name, result);
        }
    }
    
    /**
     * [의도] 요소에 테마 규칙 적용
     */
    private applyThemeRuleToElement(element: Node, rule: ThemeRule, theme: ThemeConfig): void {
        let colorValue: string;
        
        if (typeof rule.value === 'string') {
            colorValue = theme.colors[rule.value as keyof typeof theme.colors];
        } else {
            colorValue = rule.value.toHEX();
        }
        
        switch (rule.elementType) {
            case ThemeableElementType.BACKGROUND:
                this.applyBackgroundColor(element, colorValue);
                break;
                
            case ThemeableElementType.TEXT:
                this.applyTextColor(element, colorValue);
                break;
                
            case ThemeableElementType.BUTTON:
                this.applyButtonColor(element, colorValue);
                break;
                
            case ThemeableElementType.PANEL:
                this.applyPanelColor(element, colorValue);
                break;
                
            case ThemeableElementType.BORDER:
                this.applyBorderColor(element, colorValue);
                break;
        }
    }
    
    /**
     * [의도] 배경색 적용
     */
    private applyBackgroundColor(element: Node, colorValue: string): void {
        const sprite = element.getComponent(Sprite);
        if (sprite) {
            const color = new Color();
            color.fromHEX(colorValue);
            sprite.color = color;
        }
    }
    
    /**
     * [의도] 텍스트 색상 적용
     */
    private applyTextColor(element: Node, colorValue: string): void {
        const label = element.getComponent(Label);
        if (label) {
            const color = new Color();
            color.fromHEX(colorValue);
            label.color = color;
        }
        
        // 자식 노드의 라벨들도 업데이트
        const childLabels = element.getComponentsInChildren(Label);
        for (const childLabel of childLabels) {
            const color = new Color();
            color.fromHEX(colorValue);
            childLabel.color = color;
        }
    }
    
    /**
     * [의도] 버튼 색상 적용
     */
    private applyButtonColor(element: Node, colorValue: string): void {
        const sprite = element.getComponent(Sprite);
        if (sprite) {
            const color = new Color();
            color.fromHEX(colorValue);
            sprite.color = color;
        }
    }
    
    /**
     * [의도] 패널 색상 적용
     */
    private applyPanelColor(element: Node, colorValue: string): void {
        this.applyBackgroundColor(element, colorValue);
    }
    
    /**
     * [의도] 테두리 색상 적용
     */
    private applyBorderColor(element: Node, colorValue: string): void {
        // 테두리 구현은 Cocos Creator에서 제한적
        // 커스텀 구현 필요
        console.log(`[ThemeManager] 테두리 색상 적용: ${colorValue}`);
    }
    
    /**
     * [의도] 테마 효과 적용
     */
    private applyThemeEffects(theme: ThemeConfig): void {
        if (!theme.effects) return;
        
        // 전역 효과 적용 (실제로는 렌더링 파이프라인에서 처리해야 함)
        console.log(`[ThemeManager] 테마 효과 적용: blur=${theme.effects.blur}, opacity=${theme.effects.opacity}`);
        
        // Cocos Creator에서 실제 효과 구현 필요
        // 예: RenderTexture, Material, Shader 활용
    }
    
    /**
     * [의도] 테마 그라디언트 적용
     */
    private applyThemeGradients(theme: ThemeConfig): void {
        if (!theme.gradients) return;
        
        // 그라디언트가 적용될 요소들 찾아서 적용
        const gradientElements = this.findElementsBySelector('.gradient');
        
        for (const element of gradientElements) {
            // 그라디언트 구현 (Material 및 Shader 활용 필요)
            console.log(`[ThemeManager] 그라디언트 적용: ${element.name}`);
        }
    }
    
    /**
     * [의도] CSS 변수 업데이트 (웹 환경)
     */
    private updateCSSVariables(theme: ThemeConfig): void {
        if (typeof document === 'undefined') return;
        
        const root = document.documentElement;
        
        // CSS 커스텀 속성으로 테마 색상들 설정
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
        
        console.log('[ThemeManager] CSS 변수 업데이트됨');
    }
    
    /**
     * [의도] 시간대별 테마 적용
     */
    private applyTimeBasedTheme(timeTheme: TimeBasedTheme): void {
        let targetTheme: ThemeType;
        
        switch (timeTheme) {
            case TimeBasedTheme.MORNING:
            case TimeBasedTheme.AFTERNOON:
                targetTheme = ThemeType.LIGHT;
                break;
            case TimeBasedTheme.EVENING:
            case TimeBasedTheme.NIGHT:
                targetTheme = ThemeType.DARK;
                break;
        }
        
        if (targetTheme !== this.currentThemeType) {
            this.switchToTheme(targetTheme);
        }
    }
    
    /**
     * [의도] 커스텀 테마 생성
     */
    public createCustomTheme(config: ThemeConfig): boolean {
        try {
            // 테마 유효성 검증
            if (!this.validateThemeConfig(config)) {
                console.error('[ThemeManager] 잘못된 테마 설정입니다');
                return false;
            }
            
            // 테마 등록
            this.availableThemes.set(config.name, config);
            
            // 사용자 커스텀 테마로 저장
            this.saveCustomTheme(config);
            
            console.log(`[ThemeManager] 커스텀 테마 생성됨: ${config.name}`);
            return true;
        } catch (error) {
            console.error('[ThemeManager] 커스텀 테마 생성 실패:', error);
            return false;
        }
    }
    
    /**
     * [의도] 테마 설정 유효성 검증
     */
    private validateThemeConfig(config: ThemeConfig): boolean {
        if (!config.name || !config.displayName || !config.colors) {
            return false;
        }
        
        // 필수 색상들 확인
        const requiredColors = ['primary', 'background', 'text'];
        for (const color of requiredColors) {
            if (!config.colors[color as keyof typeof config.colors]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * [의도] 커스텀 테마 저장
     */
    private saveCustomTheme(theme: ThemeConfig): void {
        try {
            const customThemes = this.getCustomThemes();
            customThemes[theme.name] = theme;
            
            sys.localStorage.setItem('sweet_puzzle_custom_themes', JSON.stringify(customThemes));
        } catch (error) {
            console.error('[ThemeManager] 커스텀 테마 저장 실패:', error);
        }
    }
    
    /**
     * [의도] 저장된 커스텀 테마들 로드
     */
    private getCustomThemes(): Record<string, ThemeConfig> {
        try {
            const saved = sys.localStorage.getItem('sweet_puzzle_custom_themes');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('[ThemeManager] 커스텀 테마 로드 실패:', error);
            return {};
        }
    }
    
    /**
     * [의도] 테마 설정 저장
     */
    private saveThemeSettings(): void {
        const settings = {
            themeType: this.currentThemeType,
            autoThemeEnabled: this.autoThemeEnabled,
            timeBasedThemeEnabled: this.timeBasedThemeEnabled,
            seasonalThemeEnabled: this.seasonalThemeEnabled,
            transitionDuration: this.transitionDuration
        };
        
        sys.localStorage.setItem('sweet_puzzle_theme_settings', JSON.stringify(settings));
    }
    
    /**
     * [의도] 사용 가능한 테마 목록 조회
     */
    public getAvailableThemes(): Array<{name: string, displayName: string, type: ThemeType}> {
        const themes: Array<{name: string, displayName: string, type: ThemeType}> = [];
        
        for (const [name, config] of this.availableThemes) {
            themes.push({
                name: config.name,
                displayName: config.displayName,
                type: config.type
            });
        }
        
        return themes;
    }
    
    /**
     * [의도] 현재 테마 정보 조회
     */
    public getCurrentTheme(): ThemeConfig {
        return { ...this.currentTheme };
    }
    
    /**
     * [의도] 자동 테마 설정
     */
    public setAutoThemeEnabled(enabled: boolean): void {
        this.autoThemeEnabled = enabled;
        
        if (enabled) {
            this.setupAutoThemeDetection();
        }
        
        this.saveThemeSettings();
    }
    
    /**
     * [의도] 시간대별 테마 설정
     */
    public setTimeBasedThemeEnabled(enabled: boolean): void {
        this.timeBasedThemeEnabled = enabled;
        
        if (enabled) {
            this.setupTimeBasedTheme();
        }
        
        this.saveThemeSettings();
    }
    
    /**
     * [의도] 계절별 테마 설정
     */
    public setSeasonalThemeEnabled(enabled: boolean): void {
        this.seasonalThemeEnabled = enabled;
        
        if (enabled) {
            this.setupSeasonalTheme();
        }
        
        this.saveThemeSettings();
    }
    
    /**
     * [의도] 테마 미리보기
     */
    public previewTheme(themeName: string, duration: number = 3.0): void {
        const theme = this.availableThemes.get(themeName);
        if (!theme) return;
        
        const originalTheme = this.currentTheme;
        
        // 미리보기 테마 적용
        this.applyTheme(theme);
        
        // 원래 테마로 복원
        this.scheduleOnce(() => {
            this.applyTheme(originalTheme);
        }, duration);
        
        console.log(`[ThemeManager] 테마 미리보기: ${themeName} (${duration}초)`);
    }
    
    /**
     * [의도] 테마 매니저 정리
     */
    public cleanup(): void {
        this.unscheduleAllCallbacks();
        console.log('[ThemeManager] 테마 매니저 정리 완료');
    }
}