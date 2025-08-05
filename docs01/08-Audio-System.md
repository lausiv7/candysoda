# 오디오 시스템 설계

## 개요

Shadow Archer 모바일 3D 소울라이크 게임의 오디오 시스템 설계서입니다. 몰입감 있는 사운드 환경과 최적화된 오디오 처리를 통해 게임 경험을 향상시키는 시스템을 다룹니다.

## 설계 원칙

### 몰입감 우선
- 3D 공간 오디오 시뮬레이션
- 상황별 적응형 음향 효과
- 감정적 몰입을 위한 다이나믹 음악

### 모바일 최적화
- 메모리 효율적인 오디오 스트리밍
- 배터리 소모 최소화
- 네트워크 대역폭 고려

## 시스템 아키텍처

### 1. 오디오 매니저

```typescript
// [의도] 게임의 모든 오디오 요소를 중앙에서 관리하고 제어
// [책임] 오디오 소스 관리, 볼륨 제어, 3D 오디오 처리, 성능 최적화
export class AudioManager {
    private audioSources: Map<string, AudioSource> = new Map();
    private musicPlayer: MusicPlayer;
    private sfxPlayer: SFXPlayer;
    private voicePlayer: VoicePlayer;
    private ambientPlayer: AmbientPlayer;
    private audioSettings: AudioSettings;
    private listenerTransform: Node;
    
    constructor() {
        this.initializeAudioSystem();
        this.setupAudioPlayers();
        this.loadAudioSettings();
    }
    
    private initializeAudioSystem(): void {
        // 오디오 컨텍스트 초기화
        const audioContext = game.getAudioContext();
        if (!audioContext) {
            console.error('Audio context not available');
            return;
        }
        
        // 오디오 리스너 설정
        this.setupAudioListener();
        
        // 오디오 설정 초기화
        this.audioSettings = new AudioSettings();
    }
    
    private setupAudioPlayers(): void {
        this.musicPlayer = new MusicPlayer();
        this.sfxPlayer = new SFXPlayer();
        this.voicePlayer = new VoicePlayer();
        this.ambientPlayer = new AmbientPlayer();
    }
    
    private setupAudioListener(): void {
        // 플레이어를 오디오 리스너로 설정
        this.listenerTransform = GameManager.getInstance().getPlayer();
        
        // 3D 오디오 리스너 설정
        const listener = this.listenerTransform.addComponent(AudioListener);
        listener.enabled = true;
    }
    
    // 음악 재생
    playMusic(musicId: string, fadeIn: boolean = true, loop: boolean = true): void {
        this.musicPlayer.play(musicId, {
            fadeIn: fadeIn ? 2.0 : 0,
            loop: loop,
            volume: this.audioSettings.musicVolume
        });
    }
    
    // 음악 정지
    stopMusic(fadeOut: boolean = true): void {
        this.musicPlayer.stop(fadeOut ? 2.0 : 0);
    }
    
    // 효과음 재생
    playSFX(sfxId: string, position?: Vec3, options?: SFXOptions): void {
        const sfxOptions: SFXOptions = {
            volume: this.audioSettings.sfxVolume,
            pitch: 1.0,
            loop: false,
            ...options
        };
        
        if (position) {
            this.sfxPlayer.play3D(sfxId, position, sfxOptions);
        } else {
            this.sfxPlayer.play2D(sfxId, sfxOptions);
        }
    }
    
    // 음성 재생
    playVoice(voiceId: string, options?: VoiceOptions): void {
        const voiceOptions: VoiceOptions = {
            volume: this.audioSettings.voiceVolume,
            subtitle: true,
            ...options
        };
        
        this.voicePlayer.play(voiceId, voiceOptions);
    }
    
    // 환경음 재생
    playAmbient(ambientId: string, fadeIn: boolean = true): void {
        this.ambientPlayer.play(ambientId, {
            fadeIn: fadeIn ? 3.0 : 0,
            volume: this.audioSettings.ambientVolume
        });
    }
    
    // 환경음 정지
    stopAmbient(fadeOut: boolean = true): void {
        this.ambientPlayer.stop(fadeOut ? 3.0 : 0);
    }
    
    // 오디오 설정 업데이트
    updateAudioSettings(settings: Partial<AudioSettings>): void {
        Object.assign(this.audioSettings, settings);
        
        // 각 플레이어에 설정 적용
        this.musicPlayer.setVolume(this.audioSettings.musicVolume);
        this.sfxPlayer.setVolume(this.audioSettings.sfxVolume);
        this.voicePlayer.setVolume(this.audioSettings.voiceVolume);
        this.ambientPlayer.setVolume(this.audioSettings.ambientVolume);
        
        // 설정 저장
        this.saveAudioSettings();
    }
    
    // 마스터 볼륨 설정
    setMasterVolume(volume: number): void {
        this.audioSettings.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    
    // 모든 오디오 일시정지
    pauseAll(): void {
        this.musicPlayer.pause();
        this.sfxPlayer.pauseAll();
        this.voicePlayer.pause();
        this.ambientPlayer.pause();
    }
    
    // 모든 오디오 재개
    resumeAll(): void {
        this.musicPlayer.resume();
        this.sfxPlayer.resumeAll();
        this.voicePlayer.resume();
        this.ambientPlayer.resume();
    }
    
    // 3D 오디오 리스너 위치 업데이트
    updateListener(position: Vec3, forward: Vec3, up: Vec3): void {
        if (!this.listenerTransform) return;
        
        this.listenerTransform.setWorldPosition(position);
        this.listenerTransform.setRotationFromMatrix(Mat4.lookAt(new Mat4(), position, position.add(forward), up));
    }
    
    // 오디오 메모리 최적화
    optimizeMemory(): void {
        // 사용하지 않는 오디오 클립 해제
        this.sfxPlayer.cleanupUnusedClips();
        this.voicePlayer.cleanupUnusedClips();
        
        // 오디오 캐시 정리
        this.clearAudioCache();
    }
    
    private updateAllVolumes(): void {
        const masterVolume = this.audioSettings.masterVolume;
        
        this.musicPlayer.setVolume(this.audioSettings.musicVolume * masterVolume);
        this.sfxPlayer.setVolume(this.audioSettings.sfxVolume * masterVolume);
        this.voicePlayer.setVolume(this.audioSettings.voiceVolume * masterVolume);
        this.ambientPlayer.setVolume(this.audioSettings.ambientVolume * masterVolume);
    }
    
    private loadAudioSettings(): void {
        const savedSettings = sys.localStorage.getItem('audio_settings');
        if (savedSettings) {
            this.audioSettings = { ...this.audioSettings, ...JSON.parse(savedSettings) };
        }
    }
    
    private saveAudioSettings(): void {
        sys.localStorage.setItem('audio_settings', JSON.stringify(this.audioSettings));
    }
    
    private clearAudioCache(): void {
        // 오디오 클립 캐시 정리
        resources.releaseUnusedAssets();
    }
}
```

### 2. 음악 플레이어 시스템

```typescript
// [의도] 배경 음악과 테마 음악을 관리하는 전용 플레이어
// [책임] 음악 재생, 크로스페이드, 루핑, 적응형 음악 시스템
export class MusicPlayer {
    private currentMusic: AudioSource | null = null;
    private nextMusic: AudioSource | null = null;
    private musicLibrary: Map<string, AudioClip> = new Map();
    private fadeManager: AudioFadeManager;
    private adaptiveMusic: AdaptiveMusicSystem;
    private currentMusicId: string = '';
    private volume: number = 1.0;
    
    constructor() {
        this.setupMusicPlayer();
        this.fadeManager = new AudioFadeManager();
        this.adaptiveMusic = new AdaptiveMusicSystem();
    }
    
    private setupMusicPlayer(): void {
        // 음악 전용 오디오 소스 생성
        const musicNode = new Node('MusicPlayer');
        game.addPersistRootNode(musicNode);
        
        this.currentMusic = musicNode.addComponent(AudioSource);
        this.currentMusic.loop = true;
        this.currentMusic.playOnAwake = false;
        
        // 크로스페이드용 보조 오디오 소스
        this.nextMusic = musicNode.addComponent(AudioSource);
        this.nextMusic.loop = true;
        this.nextMusic.playOnAwake = false;
    }
    
    // 음악 재생
    play(musicId: string, options: MusicOptions = {}): void {
        if (this.currentMusicId === musicId) return;
        
        this.loadMusicClip(musicId).then((clip) => {
            if (!clip) return;
            
            // 크로스페이드 처리
            if (this.currentMusic.playing && options.fadeIn > 0) {
                this.crossFade(clip, options);
            } else {
                this.playDirectly(clip, options);
            }
            
            this.currentMusicId = musicId;
            
            // 적응형 음악 시스템에 등록
            this.adaptiveMusic.registerMusic(musicId, clip);
        });
    }
    
    // 음악 정지
    stop(fadeOut: number = 0): void {
        if (!this.currentMusic.playing) return;
        
        if (fadeOut > 0) {
            this.fadeManager.fadeOut(this.currentMusic, fadeOut, () => {
                this.currentMusic.stop();
            });
        } else {
            this.currentMusic.stop();
        }
        
        this.currentMusicId = '';
    }
    
    // 음악 일시정지
    pause(): void {
        if (this.currentMusic.playing) {
            this.currentMusic.pause();
        }
    }
    
    // 음악 재개
    resume(): void {
        if (!this.currentMusic.playing && this.currentMusic.clip) {
            this.currentMusic.play();
        }
    }
    
    // 볼륨 설정
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.currentMusic) {
            this.currentMusic.volume = this.volume;
        }
        if (this.nextMusic) {
            this.nextMusic.volume = this.volume;
        }
    }
    
    // 크로스페이드 재생
    private crossFade(newClip: AudioClip, options: MusicOptions): void {
        // 현재 음악을 페이드 아웃
        this.fadeManager.fadeOut(this.currentMusic, options.fadeIn, () => {
            this.currentMusic.stop();
        });
        
        // 새 음악을 페이드 인
        this.nextMusic.clip = newClip;
        this.nextMusic.volume = 0;
        this.nextMusic.loop = options.loop ?? true;
        this.nextMusic.play();
        
        this.fadeManager.fadeIn(this.nextMusic, options.fadeIn, this.volume);
        
        // 소스 교체
        [this.currentMusic, this.nextMusic] = [this.nextMusic, this.currentMusic];
    }
    
    // 직접 재생
    private playDirectly(clip: AudioClip, options: MusicOptions): void {
        this.currentMusic.clip = clip;
        this.currentMusic.loop = options.loop ?? true;
        this.currentMusic.volume = options.fadeIn > 0 ? 0 : this.volume;
        this.currentMusic.play();
        
        if (options.fadeIn > 0) {
            this.fadeManager.fadeIn(this.currentMusic, options.fadeIn, this.volume);
        }
    }
    
    // 음악 클립 로드
    private async loadMusicClip(musicId: string): Promise<AudioClip | null> {
        // 캐시에서 확인
        if (this.musicLibrary.has(musicId)) {
            return this.musicLibrary.get(musicId)!;
        }
        
        // 새로 로드
        return new Promise((resolve) => {
            resources.load(`audio/music/${musicId}`, AudioClip, (err, clip) => {
                if (err) {
                    console.error(`Failed to load music: ${musicId}`, err);
                    resolve(null);
                    return;
                }
                
                this.musicLibrary.set(musicId, clip);
                resolve(clip);
            });
        });
    }
    
    // 적응형 음악 업데이트
    updateAdaptiveMusic(gameState: GameState): void {
        const newMusicId = this.adaptiveMusic.getMusicForState(gameState);
        
        if (newMusicId && newMusicId !== this.currentMusicId) {
            this.play(newMusicId, { fadeIn: 2.0 });
        }
    }
}
```

### 3. 효과음 플레이어 시스템

```typescript
// [의도] 게임의 모든 효과음을 관리하고 3D 공간 오디오를 처리
// [책임] SFX 재생, 3D 오디오 계산, 오디오 풀링, 성능 최적화
export class SFXPlayer {
    private sfxPool: AudioSourcePool;
    private sfxLibrary: Map<string, AudioClip> = new Map();
    private activeSFX: Map<string, AudioSource> = new Map();
    private volume: number = 1.0;
    private maxConcurrentSFX: number = 32;
    private spatialAudio: SpatialAudioProcessor;
    
    constructor() {
        this.sfxPool = new AudioSourcePool(this.maxConcurrentSFX);
        this.spatialAudio = new SpatialAudioProcessor();
        this.preloadCommonSFX();
    }
    
    // 2D 효과음 재생
    play2D(sfxId: string, options: SFXOptions = {}): string {
        const audioSource = this.sfxPool.getAudioSource();
        if (!audioSource) return '';
        
        this.loadSFXClip(sfxId).then((clip) => {
            if (!clip) return;
            
            // 오디오 소스 설정
            audioSource.clip = clip;
            audioSource.loop = options.loop ?? false;
            audioSource.volume = (options.volume ?? 1.0) * this.volume;
            audioSource.pitch = options.pitch ?? 1.0;
            
            // 재생
            audioSource.play();
            
            // 추적을 위한 ID 생성
            const playId = this.generatePlayId();
            this.activeSFX.set(playId, audioSource);
            
            // 재생 완료 후 풀로 반환
            if (!options.loop) {
                this.scheduleReturn(audioSource, clip.duration, playId);
            }
        });
        
        return this.generatePlayId();
    }
    
    // 3D 효과음 재생
    play3D(sfxId: string, position: Vec3, options: SFXOptions = {}): string {
        const audioSource = this.sfxPool.getAudioSource();
        if (!audioSource) return '';
        
        this.loadSFXClip(sfxId).then((clip) => {
            if (!clip) return;
            
            // 3D 오디오 설정
            this.setup3DAudio(audioSource, position, options);
            
            // 기본 설정
            audioSource.clip = clip;
            audioSource.loop = options.loop ?? false;
            audioSource.pitch = options.pitch ?? 1.0;
            
            // 3D 볼륨 계산
            const spatialVolume = this.spatialAudio.calculateVolume(
                position, 
                GameManager.getInstance().getPlayer().getWorldPosition(),
                options.maxDistance ?? 50
            );
            
            audioSource.volume = (options.volume ?? 1.0) * this.volume * spatialVolume;
            
            // 재생
            audioSource.play();
            
            const playId = this.generatePlayId();
            this.activeSFX.set(playId, audioSource);
            
            if (!options.loop) {
                this.scheduleReturn(audioSource, clip.duration, playId);
            }
        });
        
        return this.generatePlayId();
    }
    
    // 효과음 정지
    stopSFX(playId: string): void {
        const audioSource = this.activeSFX.get(playId);
        if (audioSource) {
            audioSource.stop();
            this.sfxPool.returnAudioSource(audioSource);
            this.activeSFX.delete(playId);
        }
    }
    
    // 모든 효과음 일시정지
    pauseAll(): void {
        this.activeSFX.forEach((audioSource) => {
            if (audioSource.playing) {
                audioSource.pause();
            }
        });
    }
    
    // 모든 효과음 재개
    resumeAll(): void {
        this.activeSFX.forEach((audioSource) => {
            if (!audioSource.playing && audioSource.clip) {
                audioSource.play();
            }
        });
    }
    
    // 볼륨 설정
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // 현재 재생 중인 모든 효과음의 볼륨 업데이트
        this.activeSFX.forEach((audioSource) => {
            // 원래 볼륨 비율을 유지하면서 마스터 볼륨 적용
            const originalVolume = audioSource.volume / this.volume;
            audioSource.volume = originalVolume * this.volume;
        });
    }
    
    // 3D 오디오 설정
    private setup3DAudio(audioSource: AudioSource, position: Vec3, options: SFXOptions): void {
        // 오디오 소스를 3D 모드로 설정
        audioSource.spatialBlend = 1.0; // 완전한 3D
        audioSource.rolloffMode = AudioRolloffMode.Linear;
        audioSource.minDistance = options.minDistance ?? 1;
        audioSource.maxDistance = options.maxDistance ?? 50;
        
        // 위치 설정
        audioSource.node.setWorldPosition(position);
        
        // 도플러 효과 (선택적)
        if (options.dopplerLevel !== undefined) {
            audioSource.dopplerLevel = options.dopplerLevel;
        }
    }
    
    // 공통 효과음 미리 로드
    private preloadCommonSFX(): void {
        const commonSFX = [
            'footstep',
            'arrow_shoot',
            'arrow_hit',
            'sword_swing',
            'sword_hit',
            'enemy_death',
            'item_pickup',
            'ui_click',
            'ui_hover'
        ];
        
        commonSFX.forEach(sfxId => {
            this.loadSFXClip(sfxId);
        });
    }
    
    // 효과음 클립 로드
    private async loadSFXClip(sfxId: string): Promise<AudioClip | null> {
        if (this.sfxLibrary.has(sfxId)) {
            return this.sfxLibrary.get(sfxId)!;
        }
        
        return new Promise((resolve) => {
            resources.load(`audio/sfx/${sfxId}`, AudioClip, (err, clip) => {
                if (err) {
                    console.error(`Failed to load SFX: ${sfxId}`, err);
                    resolve(null);
                    return;
                }
                
                this.sfxLibrary.set(sfxId, clip);
                resolve(clip);
            });
        });
    }
    
    private generatePlayId(): string {
        return `sfx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    private scheduleReturn(audioSource: AudioSource, duration: number, playId: string): void {
        setTimeout(() => {
            if (this.activeSFX.has(playId)) {
                this.sfxPool.returnAudioSource(audioSource);
                this.activeSFX.delete(playId);
            }
        }, duration * 1000 + 100); // 약간의 여유 시간 추가
    }
    
    // 사용하지 않는 클립 정리
    cleanupUnusedClips(): void {
        // 최근에 사용되지 않은 클립들을 메모리에서 해제
        const unusedClips: string[] = [];
        
        this.sfxLibrary.forEach((clip, sfxId) => {
            // 사용 빈도가 낮은 클립들 식별
            if (this.isClipUnused(sfxId)) {
                unusedClips.push(sfxId);
            }
        });
        
        unusedClips.forEach(sfxId => {
            this.sfxLibrary.delete(sfxId);
        });
    }
    
    private isClipUnused(sfxId: string): boolean {
        // 사용 빈도 추적 로직 (간단한 예시)
        return false; // 실제 구현에서는 사용 통계를 기반으로 판단
    }
}
```

### 4. 공간 오디오 프로세서

```typescript
// [의도] 3D 공간에서의 실제적인 오디오 경험을 제공
// [책임] 거리 감쇠, 방향성 오디오, 환경 반향, 오클루전 처리
export class SpatialAudioProcessor {
    private listenerPosition: Vec3 = new Vec3();
    private listenerForward: Vec3 = new Vec3(0, 0, -1);
    private environmentReverb: EnvironmentReverb;
    private occlusionProcessor: OcclusionProcessor;
    
    constructor() {
        this.environmentReverb = new EnvironmentReverb();
        this.occlusionProcessor = new OcclusionProcessor();
    }
    
    // 리스너 위치 업데이트
    updateListener(position: Vec3, forward: Vec3): void {
        this.listenerPosition.set(position);
        this.listenerForward.set(forward).normalize();
    }
    
    // 3D 오디오 볼륨 계산
    calculateVolume(sourcePosition: Vec3, listenerPosition: Vec3, maxDistance: number): number {
        const distance = Vec3.distance(sourcePosition, listenerPosition);
        
        if (distance >= maxDistance) {
            return 0;
        }
        
        // 거리 감쇠 계산 (선형 감쇠)
        let volume = 1.0 - (distance / maxDistance);
        
        // 오클루전 적용
        const occlusionFactor = this.occlusionProcessor.calculateOcclusion(
            sourcePosition, 
            listenerPosition
        );
        volume *= occlusionFactor;
        
        // 환경 반향 적용
        volume = this.environmentReverb.processVolume(volume, sourcePosition);
        
        return Math.max(0, Math.min(1, volume));
    }
    
    // 방향성 오디오 계산 (스테레오 패닝)
    calculateStereoBalance(sourcePosition: Vec3): number {
        const toSource = sourcePosition.subtract(this.listenerPosition).normalize();
        const rightVector = this.listenerForward.cross(Vec3.UP).normalize();
        
        // 오른쪽 벡터와의 내적으로 좌우 위치 계산
        const balance = Vec3.dot(toSource, rightVector);
        
        return Math.max(-1, Math.min(1, balance));
    }
    
    // 도플러 효과 계산
    calculateDopplerEffect(
        sourcePosition: Vec3, 
        sourceVelocity: Vec3, 
        listenerVelocity: Vec3
    ): number {
        const soundSpeed = 343; // 음속 (m/s)
        
        const relativePosition = sourcePosition.subtract(this.listenerPosition);
        const distance = relativePosition.length();
        
        if (distance < 0.1) return 1.0; // 너무 가까우면 도플러 효과 없음
        
        const direction = relativePosition.normalize();
        
        // 리스너와 소스의 상대 속도
        const listenerRadialVelocity = Vec3.dot(listenerVelocity, direction);
        const sourceRadialVelocity = Vec3.dot(sourceVelocity, direction);
        
        // 도플러 공식 적용
        const dopplerFactor = (soundSpeed + listenerRadialVelocity) / 
                             (soundSpeed + sourceRadialVelocity);
        
        // 현실적인 범위로 제한
        return Math.max(0.5, Math.min(2.0, dopplerFactor));
    }
}

// 환경 반향 프로세서
class EnvironmentReverb {
    private currentEnvironment: EnvironmentType = EnvironmentType.OUTDOOR;
    private reverbSettings: Map<EnvironmentType, ReverbSettings> = new Map();
    
    constructor() {
        this.initializeReverbSettings();
    }
    
    private initializeReverbSettings(): void {
        // 다양한 환경별 반향 설정
        this.reverbSettings.set(EnvironmentType.OUTDOOR, {
            reverbLevel: 0.1,
            delay: 0.02,
            decay: 0.5,
            highFreqDamping: 0.8
        });
        
        this.reverbSettings.set(EnvironmentType.CAVE, {
            reverbLevel: 0.8,
            delay: 0.1,
            decay: 2.0,
            highFreqDamping: 0.6
        });
        
        this.reverbSettings.set(EnvironmentType.FOREST, {
            reverbLevel: 0.3,
            delay: 0.05,
            decay: 1.0,
            highFreqDamping: 0.9
        });
        
        this.reverbSettings.set(EnvironmentType.DUNGEON, {
            reverbLevel: 0.6,
            delay: 0.08,
            decay: 1.5,
            highFreqDamping: 0.7
        });
    }
    
    // 환경 변경
    setEnvironment(environment: EnvironmentType): void {
        this.currentEnvironment = environment;
    }
    
    // 반향 적용된 볼륨 계산
    processVolume(originalVolume: number, sourcePosition: Vec3): number {
        const settings = this.reverbSettings.get(this.currentEnvironment);
        if (!settings) return originalVolume;
        
        // 반향 효과는 거리에 따라 달라짐
        const distance = Vec3.distance(sourcePosition, this.getListenerPosition());
        const reverbAmount = Math.min(1.0, distance * 0.1) * settings.reverbLevel;
        
        return originalVolume * (1.0 + reverbAmount);
    }
    
    private getListenerPosition(): Vec3 {
        return GameManager.getInstance().getPlayer().getWorldPosition();
    }
}

// 오클루전 프로세서 (간이 버전)
class OcclusionProcessor {
    private raycastMask: number = 0x01; // 지형 레이어
    
    // 오클루전 계산 (레이캐스팅 기반)
    calculateOcclusion(sourcePosition: Vec3, listenerPosition: Vec3): number {
        const direction = sourcePosition.subtract(listenerPosition);
        const distance = direction.length();
        
        if (distance < 1.0) return 1.0; // 너무 가까우면 오클루전 없음
        
        // 물리 시스템으로 레이캐스팅
        const ray = new geometry.Ray(listenerPosition.x, listenerPosition.y, listenerPosition.z,
                                   direction.x, direction.y, direction.z);
        
        const hit = PhysicsSystem.instance.raycastClosest(ray, this.raycastMask, distance);
        
        if (hit) {
            // 장애물이 있으면 볼륨 감소
            const occlusionDistance = hit.distance;
            const occlusionFactor = 1.0 - (occlusionDistance / distance) * 0.7;
            return Math.max(0.1, occlusionFactor); // 최소 10%는 유지
        }
        
        return 1.0; // 장애물 없음
    }
}

// 환경 타입 열거형
enum EnvironmentType {
    OUTDOOR = 'outdoor',
    CAVE = 'cave',
    FOREST = 'forest',
    DUNGEON = 'dungeon',
    WATER = 'water'
}

// 반향 설정 인터페이스
interface ReverbSettings {
    reverbLevel: number;
    delay: number;
    decay: number;
    highFreqDamping: number;
}
```

### 5. 적응형 음악 시스템

```typescript
// [의도] 게임 상황에 따라 동적으로 변화하는 음악 시스템
// [책임] 게임 상태 분석, 음악 전환, 인터랙티브 음악 레이어링
export class AdaptiveMusicSystem {
    private musicStates: Map<GameState, MusicTrack[]> = new Map();
    private currentGameState: GameState = GameState.EXPLORATION;
    private musicLayers: MusicLayer[] = [];
    private transitionManager: MusicTransitionManager;
    private intensityLevel: number = 0; // 0-1 범위
    
    constructor() {
        this.initializeMusicStates();
        this.transitionManager = new MusicTransitionManager();
        this.setupEventListeners();
    }
    
    private initializeMusicStates(): void {
        // 탐험 상태 음악
        this.musicStates.set(GameState.EXPLORATION, [
            { id: 'ambient_forest', intensity: 0.0, layers: ['ambient', 'melody'] },
            { id: 'exploration_light', intensity: 0.3, layers: ['ambient', 'melody', 'harmony'] },
            { id: 'exploration_full', intensity: 0.6, layers: ['ambient', 'melody', 'harmony', 'percussion'] }
        ]);
        
        // 전투 상태 음악
        this.musicStates.set(GameState.COMBAT, [
            { id: 'combat_intro', intensity: 0.0, layers: ['percussion', 'bass'] },
            { id: 'combat_medium', intensity: 0.5, layers: ['percussion', 'bass', 'melody'] },
            { id: 'combat_intense', intensity: 0.8, layers: ['percussion', 'bass', 'melody', 'harmony', 'brass'] }
        ]);
        
        // 보스전 음악
        this.musicStates.set(GameState.BOSS_FIGHT, [
            { id: 'boss_phase1', intensity: 0.0, layers: ['orchestra_full'] },
            { id: 'boss_phase2', intensity: 0.5, layers: ['orchestra_full', 'choir'] },
            { id: 'boss_final', intensity: 1.0, layers: ['orchestra_full', 'choir', 'epic_percussion'] }
        ]);
        
        // 메뉴 음악
        this.musicStates.set(GameState.MENU, [
            { id: 'main_theme', intensity: 0.0, layers: ['piano', 'strings'] }
        ]);
    }
    
    private setupEventListeners(): void {
        // 게임 상태 변화 이벤트
        EventBus.getInstance().on('game_state_changed', this.onGameStateChanged.bind(this));
        
        // 전투 강도 변화 이벤트
        EventBus.getInstance().on('combat_intensity_changed', this.onIntensityChanged.bind(this));
        
        // 보스 페이즈 변화 이벤트
        EventBus.getInstance().on('boss_phase_changed', this.onBossPhaseChanged.bind(this));
    }
    
    // 게임 상태에 맞는 음악 ID 반환
    getMusicForState(gameState: GameState): string | null {
        const tracks = this.musicStates.get(gameState);
        if (!tracks || tracks.length === 0) return null;
        
        // 현재 강도에 맞는 트랙 선택
        let selectedTrack: MusicTrack | null = null;
        
        for (const track of tracks) {
            if (this.intensityLevel >= track.intensity) {
                selectedTrack = track;
            } else {
                break;
            }
        }
        
        return selectedTrack ? selectedTrack.id : tracks[0].id;
    }
    
    // 음악 등록
    registerMusic(musicId: string, clip: AudioClip): void {
        // 음악 트랙을 시스템에 등록
        const layers = this.extractMusicLayers(clip, musicId);
        this.musicLayers.push(...layers);
    }
    
    // 게임 상태 변화 처리
    private onGameStateChanged(newState: GameState): void {
        if (this.currentGameState === newState) return;
        
        const previousState = this.currentGameState;
        this.currentGameState = newState;
        
        // 상태별 전환 로직
        this.transitionManager.transitionToState(previousState, newState, this.intensityLevel);
    }
    
    // 강도 변화 처리
    private onIntensityChanged(newIntensity: number): void {
        this.intensityLevel = Math.max(0, Math.min(1, newIntensity));
        
        // 레이어 기반 음악 업데이트
        this.updateMusicLayers();
    }
    
    // 보스 페이즈 변화 처리
    private onBossPhaseChanged(phase: number): void {
        // 보스 페이즈에 따른 강도 조정
        const phaseIntensity = Math.min(1.0, phase * 0.3);
        this.onIntensityChanged(phaseIntensity);
        
        // 특수 음악 효과
        this.playBossTransitionEffect(phase);
    }
    
    // 음악 레이어 업데이트
    private updateMusicLayers(): void {
        const currentTrack = this.getMusicForState(this.currentGameState);
        if (!currentTrack) return;
        
        const trackData = this.findTrackData(currentTrack);
        if (!trackData) return;
        
        // 레이어별 볼륨 조정
        trackData.layers.forEach((layerName, index) => {
            const layer = this.findMusicLayer(layerName);
            if (layer) {
                const targetVolume = this.calculateLayerVolume(index, trackData.layers.length);
                this.transitionManager.fadeLayer(layer, targetVolume, 1.0);
            }
        });
    }
    
    // 레이어 볼륨 계산
    private calculateLayerVolume(layerIndex: number, totalLayers: number): number {
        const layerThreshold = layerIndex / totalLayers;
        
        if (this.intensityLevel >= layerThreshold) {
            return 1.0;
        } else {
            // 부드러운 페이드 인/아웃
            const fadeRange = 0.1;
            const fadeFactor = Math.max(0, this.intensityLevel - (layerThreshold - fadeRange)) / fadeRange;
            return Math.min(1.0, fadeFactor);
        }
    }
    
    // 음악 레이어 추출 (가상의 구현)
    private extractMusicLayers(clip: AudioClip, musicId: string): MusicLayer[] {
        // 실제로는 오디오 클립을 분석하여 레이어를 추출해야 함
        // 여기서는 간단한 예시로 구현
        return [
            { name: `${musicId}_ambient`, audioSource: null, volume: 1.0 },
            { name: `${musicId}_melody`, audioSource: null, volume: 1.0 },
            { name: `${musicId}_harmony`, audioSource: null, volume: 1.0 },
            { name: `${musicId}_percussion`, audioSource: null, volume: 1.0 }
        ];
    }
    
    private findTrackData(musicId: string): MusicTrack | null {
        for (const tracks of this.musicStates.values()) {
            const track = tracks.find(t => t.id === musicId);
            if (track) return track;
        }
        return null;
    }
    
    private findMusicLayer(layerName: string): MusicLayer | null {
        return this.musicLayers.find(layer => layer.name === layerName) || null;
    }
    
    private playBossTransitionEffect(phase: number): void {
        // 보스 페이즈 전환 시 특수 효과음
        const sfxId = `boss_phase_transition_${phase}`;
        AudioManager.getInstance().playSFX(sfxId);
        
        // 음악 강조 효과
        this.transitionManager.playTransitionStinger(`boss_stinger_${phase}`);
    }
}

// 음악 전환 매니저
class MusicTransitionManager {
    private activeFades: Map<AudioSource, FadeOperation> = new Map();
    
    // 상태 간 전환
    transitionToState(fromState: GameState, toState: GameState, intensity: number): void {
        const transitionTime = this.getTransitionTime(fromState, toState);
        
        // 특별한 전환 로직
        switch (`${fromState}_to_${toState}`) {
            case 'EXPLORATION_to_COMBAT':
                this.exploreToCombaTransition(transitionTime);
                break;
            case 'COMBAT_to_EXPLORATION':
                this.combatToExploreTransition(transitionTime);
                break;
            case 'COMBAT_to_BOSS_FIGHT':
                this.combatToBossTransition(transitionTime);
                break;
            default:
                this.defaultTransition(transitionTime);
                break;
        }
    }
    
    // 레이어 페이드
    fadeLayer(layer: MusicLayer, targetVolume: number, duration: number): void {
        if (!layer.audioSource) return;
        
        const operation: FadeOperation = {
            startVolume: layer.audioSource.volume,
            targetVolume: targetVolume,
            duration: duration,
            elapsed: 0
        };
        
        this.activeFades.set(layer.audioSource, operation);
    }
    
    // 전환 스팅어 재생
    playTransitionStinger(stingerId: string): void {
        AudioManager.getInstance().playSFX(stingerId, undefined, {
            volume: 0.8,
            priority: 10 // 높은 우선순위
        });
    }
    
    private getTransitionTime(fromState: GameState, toState: GameState): number {
        // 상태별 전환 시간 정의
        if (fromState === GameState.EXPLORATION && toState === GameState.COMBAT) {
            return 1.5; // 빠른 전투 전환
        } else if (fromState === GameState.COMBAT && toState === GameState.BOSS_FIGHT) {
            return 3.0; // 극적인 보스 전환
        }
        return 2.0; // 기본 전환 시간
    }
    
    private exploreToCombaTransition(duration: number): void {
        // 탐험 -> 전투 전환의 특별한 로직
        this.playTransitionStinger('combat_start_stinger');
    }
    
    private combatToExploreTransition(duration: number): void {
        // 전투 -> 탐험 전환의 특별한 로직
        this.playTransitionStinger('combat_end_stinger');
    }
    
    private combatToBossTransition(duration: number): void {
        // 전투 -> 보스 전환의 특별한 로직
        this.playTransitionStinger('boss_intro_stinger');
    }
    
    private defaultTransition(duration: number): void {
        // 기본 전환 로직
    }
}

// 게임 상태 열거형
enum GameState {
    MENU = 'menu',
    EXPLORATION = 'exploration',
    COMBAT = 'combat',
    BOSS_FIGHT = 'boss_fight',
    CUTSCENE = 'cutscene',
    PAUSE = 'pause'
}

// 인터페이스 정의들
interface MusicTrack {
    id: string;
    intensity: number;
    layers: string[];
}

interface MusicLayer {
    name: string;
    audioSource: AudioSource | null;
    volume: number;
}

interface FadeOperation {
    startVolume: number;
    targetVolume: number;
    duration: number;
    elapsed: number;
}
```

## 성능 최적화

### 오디오 압축 및 스트리밍
- 모바일 최적화 오디오 포맷 사용
- 적응형 비트레이트 스트리밍
- 필요시 실시간 압축 해제

### 메모리 관리
- 오디오 클립 풀링 시스템
- 동적 로딩/언로딩
- 메모리 사용량 모니터링

### CPU 최적화
- 오디오 처리 쓰레드 분리
- 3D 오디오 계산 최적화
- 효과음 동시 재생 수 제한

## 플랫폼별 고려사항

### iOS 최적화
- Core Audio 프레임워크 활용
- 배터리 수명 최적화
- 백그라운드 오디오 처리

### Android 최적화
- OpenSL ES 활용
- 다양한 하드웨어 대응
- 오디오 레이턴시 최적화

이 오디오 시스템 설계는 모바일 3D 소울라이크 게임에 최적화된 몰입감 있는 사운드 환경을 제공하며, 성능과 품질의 균형을 유지합니다.