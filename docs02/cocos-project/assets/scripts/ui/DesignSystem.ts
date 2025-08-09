/**
 * [의도] Sweet Puzzle UI 디자인 시스템 - 컬러 팰릿, 타이포그래피, 컴포넌트 스타일 통합 관리
 * [책임] 일관된 디자인 언어 제공, 테마 관리, 색상 시스템, 폰트 시스템 관리
 */

import { _decorator, Component, Color, Node, Label, Sprite } from 'cc';
import { EventBus } from '../core/EventBus';

const { ccclass, property } = _decorator;

// 색상 테마 정의
export enum ColorTheme {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    INFO = 'info',
    NEUTRAL = 'neutral'
}

// 폰트 가중치
export enum FontWeight {
    THIN = 100,
    LIGHT = 300,
    REGULAR = 400,
    MEDIUM = 500,
    SEMIBOLD = 600,
    BOLD = 700,
    EXTRABOLD = 800,
    BLACK = 900
}

// 폰트 크기
export enum FontSize {
    XS = 12,
    SM = 14,
    BASE = 16,
    LG = 18,
    XL = 20,
    XL2 = 24,
    XL3 = 30,
    XL4 = 36,
    XL5 = 48,
    XL6 = 60,
    XL7 = 72,
    XL8 = 96,
    XL9 = 128
}

// 색상 팰릿 인터페이스
export interface ColorPalette {
    [ColorTheme.PRIMARY]: {
        50: string; 100: string; 200: string; 300: string; 400: string;
        500: string; 600: string; 700: string; 800: string; 900: string;
    };
    [ColorTheme.SECONDARY]: {
        50: string; 100: string; 200: string; 300: string; 400: string;
        500: string; 600: string; 700: string; 800: string; 900: string;
    };
    [ColorTheme.SUCCESS]: {
        50: string; 100: string; 200: string; 300: string; 400: string;
        500: string; 600: string; 700: string; 800: string; 900: string;
    };
    [ColorTheme.WARNING]: {
        50: string; 100: string; 200: string; 300: string; 400: string;
        500: string; 600: string; 700: string; 800: string; 900: string;
    };
    [ColorTheme.ERROR]: {
        50: string; 100: string; 200: string; 300: string; 400: string;
        500: string; 600: string; 700: string; 800: string; 900: string;
    };
}

// 타이포그래피 스타일
export interface TypographyStyle {
    fontSize: FontSize;
    fontWeight: FontWeight;
    lineHeight: number;
    letterSpacing?: number;
}

// Sweet Puzzle 컬러 팰릿
export const SWEET_PUZZLE_COLORS: ColorPalette = {
    [ColorTheme.PRIMARY]: {
        50: '#FFF5F7',   // 매우 연한 핑크
        100: '#FFE4E9',  // 연한 핑크
        200: '#FFCCD7',  // 밝은 핑크
        300: '#FF9FB3',  // 중간 핑크
        400: '#FF6B8A',  // 진한 핑크
        500: '#FF4081',  // 기본 핑크
        600: '#E91E63',  // 더 진한 핑크
        700: '#C2185B',  // 어두운 핑크
        800: '#AD1457',  // 매우 어두운 핑크
        900: '#880E4F'   // 가장 어두운 핑크
    },
    [ColorTheme.SECONDARY]: {
        50: '#F3E5F5',   // 매우 연한 보라
        100: '#E1BEE7',  // 연한 보라
        200: '#CE93D8',  // 밝은 보라
        300: '#BA68C8',  // 중간 보라
        400: '#AB47BC',  // 진한 보라
        500: '#9C27B0',  // 기본 보라
        600: '#8E24AA',  // 더 진한 보라
        700: '#7B1FA2',  // 어두운 보라
        800: '#6A1B9A',  // 매우 어두운 보라
        900: '#4A148C'   // 가장 어두운 보라
    },
    [ColorTheme.SUCCESS]: {
        50: '#E8F5E8',
        100: '#C8E6C9',
        200: '#A5D6A7',
        300: '#81C784',
        400: '#66BB6A',
        500: '#4CAF50',  // 기본 녹색
        600: '#43A047',
        700: '#388E3C',
        800: '#2E7D32',
        900: '#1B5E20'
    },
    [ColorTheme.WARNING]: {
        50: '#FFF8E1',
        100: '#FFECB3',
        200: '#FFE082',
        300: '#FFD54F',
        400: '#FFCA28',
        500: '#FFC107',  // 기본 노란색
        600: '#FFB300',
        700: '#FFA000',
        800: '#FF8F00',
        900: '#FF6F00'
    },
    [ColorTheme.ERROR]: {
        50: '#FFEBEE',
        100: '#FFCDD2',
        200: '#EF9A9A',
        300: '#E57373',
        400: '#EF5350',
        500: '#F44336',  // 기본 빨간색
        600: '#E53935',
        700: '#D32F2F',
        800: '#C62828',
        900: '#B71C1C'
    }
};

// 타이포그래피 스타일 정의
export const TYPOGRAPHY_STYLES: Record<string, TypographyStyle> = {
    // 헤딩 스타일
    'h1': {
        fontSize: FontSize.XL6,
        fontWeight: FontWeight.BOLD,
        lineHeight: 1.2,
        letterSpacing: -0.02
    },
    'h2': {
        fontSize: FontSize.XL5,
        fontWeight: FontWeight.BOLD,
        lineHeight: 1.25,
        letterSpacing: -0.01
    },
    'h3': {
        fontSize: FontSize.XL4,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.3
    },
    'h4': {
        fontSize: FontSize.XL3,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.35
    },
    
    // 본문 스타일
    'body-large': {
        fontSize: FontSize.LG,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.5
    },
    'body': {
        fontSize: FontSize.BASE,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.5
    },
    'body-small': {
        fontSize: FontSize.SM,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.4
    },
    
    // 버튼 스타일
    'button-large': {
        fontSize: FontSize.LG,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.2
    },
    'button': {
        fontSize: FontSize.BASE,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.2
    },
    'button-small': {
        fontSize: FontSize.SM,
        fontWeight: FontWeight.MEDIUM,
        lineHeight: 1.2
    },
    
    // 특수 스타일
    'caption': {
        fontSize: FontSize.XS,
        fontWeight: FontWeight.REGULAR,
        lineHeight: 1.3
    },
    'overline': {
        fontSize: FontSize.XS,
        fontWeight: FontWeight.SEMIBOLD,
        lineHeight: 1.2,
        letterSpacing: 0.1
    }
};

@ccclass('DesignSystem')
export class DesignSystem extends Component {
    
    // 싱글톤 인스턴스
    private static instance: DesignSystem | null = null;
    
    // 현재 테마 설정
    private currentTheme: 'light' | 'dark' = 'light';
    private colorPalette: ColorPalette = SWEET_PUZZLE_COLORS;
    
    // 색상 캐시
    private colorCache: Map<string, Color> = new Map();
    
    protected onLoad(): void {
        if (DesignSystem.instance === null) {
            DesignSystem.instance = this;
            this.initialize();
        } else {
            this.destroy();
        }
    }
    
    static getInstance(): DesignSystem {
        if (!DesignSystem.instance) {
            console.error('[DesignSystem] Instance not initialized');
            return null;
        }
        return DesignSystem.instance;
    }
    
    /**
     * [의도] 디자인 시스템 초기화
     */
    private initialize(): void {
        this.loadUserPreferences();
        this.setupColorCache();
        
        console.log('[DesignSystem] 디자인 시스템 초기화 완료');
    }
    
    /**
     * [의도] 색상 조회
     */
    getColor(theme: ColorTheme, shade: number = 500): Color {
        const cacheKey = `${theme}_${shade}`;
        
        if (this.colorCache.has(cacheKey)) {
            return this.colorCache.get(cacheKey).clone();
        }
        
        const hexColor = this.colorPalette[theme][shade];
        const color = new Color();
        color.fromHEX(hexColor);
        
        this.colorCache.set(cacheKey, color);
        return color.clone();
    }
    
    /**
     * [의도] 헥스 색상을 Cocos Color로 변환
     */
    hexToColor(hex: string): Color {
        if (this.colorCache.has(hex)) {
            return this.colorCache.get(hex).clone();
        }
        
        const color = new Color();
        color.fromHEX(hex);
        
        this.colorCache.set(hex, color);
        return color.clone();
    }
    
    /**
     * [의도] 테마 설정
     */
    setTheme(theme: 'light' | 'dark'): void {
        this.currentTheme = theme;
        this.updateThemeColors();
        this.saveUserPreferences();
        
        EventBus.getInstance().emit('theme_changed', { theme });
        console.log(`[DesignSystem] 테마 변경: ${theme}`);
    }
    
    /**
     * [의도] 현재 테마 조회
     */
    getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }
    
    /**
     * [의도] 타이포그래피 스타일 적용
     */
    applyTypographyStyle(label: Label, styleName: string): void {
        const style = TYPOGRAPHY_STYLES[styleName];
        if (!style) {
            console.warn(`[DesignSystem] Typography style '${styleName}' not found`);
            return;
        }
        
        label.fontSize = style.fontSize;
        // 폰트 가중치는 Cocos Creator에서 제한적으로 지원됨
        if (style.fontWeight >= FontWeight.BOLD) {
            label.isBold = true;
        }
        
        label.lineHeight = style.lineHeight;
        
        console.log(`[DesignSystem] Typography '${styleName}' applied to label`);
    }
    
    /**
     * [의도] 색상 캐시 설정
     */
    private setupColorCache(): void {
        // 자주 사용되는 색상들을 미리 캐시
        const frequentColors = [
            ColorTheme.PRIMARY, ColorTheme.SECONDARY, 
            ColorTheme.SUCCESS, ColorTheme.WARNING, ColorTheme.ERROR
        ];
        
        const commonShades = [100, 300, 500, 700, 900];
        
        for (const theme of frequentColors) {
            for (const shade of commonShades) {
                this.getColor(theme, shade);
            }
        }
        
        console.log(`[DesignSystem] ${this.colorCache.size}개 색상 캐시 완료`);
    }
    
    /**
     * [의도] 테마별 색상 업데이트
     */
    private updateThemeColors(): void {
        // 캔버스 배경색 변경
        const canvas = this.node.getComponent('cc.Canvas');
        if (canvas) {
            if (this.currentTheme === 'dark') {
                canvas['_color'] = this.hexToColor('#121212');
            } else {
                canvas['_color'] = this.hexToColor('#FFFFFF');
            }
        }
        
        // 전역 UI 요소들 색상 업데이트
        this.updateAllUIColors();
    }
    
    /**
     * [의도] 모든 UI 요소 색상 업데이트
     */
    private updateAllUIColors(): void {
        // 모든 라벨의 색상 업데이트
        const allLabels = this.node.getComponentsInChildren(Label);
        allLabels.forEach(label => {
            if (label.node.name.includes('text-primary')) {
                label.color = this.currentTheme === 'dark' ? 
                    this.hexToColor('#FFFFFF') : this.hexToColor('#212121');
            } else if (label.node.name.includes('text-secondary')) {
                label.color = this.currentTheme === 'dark' ? 
                    this.hexToColor('#B3B3B3') : this.hexToColor('#757575');
            }
        });
        
        // 배경 색상 업데이트
        const backgrounds = this.node.getComponentsInChildren(Sprite);
        backgrounds.forEach(sprite => {
            if (sprite.node.name.includes('bg-primary')) {
                sprite.color = this.currentTheme === 'dark' ? 
                    this.hexToColor('#121212') : this.hexToColor('#FFFFFF');
            } else if (sprite.node.name.includes('bg-secondary')) {
                sprite.color = this.currentTheme === 'dark' ? 
                    this.hexToColor('#1E1E1E') : this.hexToColor('#F5F5F5');
            }
        });
    }
    
    /**
     * [의도] 사용자 환경설정 로드
     */
    private loadUserPreferences(): void {
        const savedTheme = localStorage.getItem('sweet_puzzle_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            this.currentTheme = savedTheme;
        }
        
        console.log(`[DesignSystem] 사용자 테마 설정 로드: ${this.currentTheme}`);
    }
    
    /**
     * [의도] 사용자 환경설정 저장
     */
    private saveUserPreferences(): void {
        localStorage.setItem('sweet_puzzle_theme', this.currentTheme);
        console.log(`[DesignSystem] 테마 설정 저장: ${this.currentTheme}`);
    }
    
    /**
     * [의도] 색상 대비 비율 계산 (접근성)
     */
    calculateContrastRatio(color1: Color, color2: Color): number {
        const luminance1 = this.calculateLuminance(color1);
        const luminance2 = this.calculateLuminance(color2);
        
        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }
    
    /**
     * [의도] 색상 휘도 계산
     */
    private calculateLuminance(color: Color): number {
        const r = this.sRGBtoLinear(color.r / 255);
        const g = this.sRGBtoLinear(color.g / 255);
        const b = this.sRGBtoLinear(color.b / 255);
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    
    /**
     * [의도] sRGB를 선형 RGB로 변환
     */
    private sRGBtoLinear(value: number): number {
        if (value <= 0.03928) {
            return value / 12.92;
        } else {
            return Math.pow((value + 0.055) / 1.055, 2.4);
        }
    }
    
    /**
     * [의도] WCAG AA 기준 (4.5:1) 준수 확인
     */
    checkColorCompliance(foreground: Color, background: Color): boolean {
        const contrastRatio = this.calculateContrastRatio(foreground, background);
        return contrastRatio >= 4.5;
    }
    
    /**
     * [의도] 색상 팔레트 정보 조회
     */
    getColorPalette(): ColorPalette {
        return { ...this.colorPalette };
    }
    
    /**
     * [의도] 타이포그래피 스타일 정보 조회
     */
    getTypographyStyles(): Record<string, TypographyStyle> {
        return { ...TYPOGRAPHY_STYLES };
    }
}