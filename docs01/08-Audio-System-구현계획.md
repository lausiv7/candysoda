# Shadow Archer 구현 계획서: 오디오 시스템

## 1. 🎯 구현 목표

이 문서는 `docs/08-Audio-System.md`에 정의된 **오디오 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 3D 공간 오디오, 적응형 음악 시스템, 모바일 최적화된 오디오 처리를 통해 몰입감 있고 성능 효율적인 사운드 환경을 완성합니다.

---

## 2. 📁 구현 대상 핵심 파일

오디오 시스템 구현은 `assets/scripts/audio` 폴더를 중심으로 진행됩니다.

### 2.1. Audio Core (오디오 핵심)

```
assets/scripts/audio/
├── AudioManager.ts                  # ✅ 오디오 시스템 총괄 관리자
├── AudioSettings.ts                 # ✅ 오디오 설정 및 볼륨 관리
├── AudioPool.ts                     # ✅ 오디오 소스 풀링 시스템
├── AudioLoader.ts                   # ✅ 오디오 클립 로딩 및 캐싱
└── AudioDebugger.ts                 # ✅ 오디오 디버깅 도구
```

### 2.2. Music System (음악 시스템)

```
assets/scripts/audio/music/
├── MusicPlayer.ts                   # ✅ 음악 재생 관리자
├── AdaptiveMusicSystem.ts           # ✅ 적응형 음악 시스템
├── MusicTransitionManager.ts        # ✅ 음악 전환 관리
├── AudioFadeManager.ts              # ✅ 페이드 인/아웃 관리
└── MusicLayerSystem.ts              # ✅ 음악 레이어 시스템
```

### 2.3. SFX System (효과음 시스템)

```
assets/scripts/audio/sfx/
├── SFXPlayer.ts                     # ✅ 효과음 재생 관리자
├── SpatialAudioProcessor.ts         # ✅ 3D 공간 오디오 처리
├── AudioSourcePool.ts               # ✅ 오디오 소스 풀 관리
├── EnvironmentAudio.ts              # ✅ 환경 오디오 관리
└── AudioOcclusion.ts                # ✅ 오디오 오클루전 처리
```

### 2.4. Voice System (음성 시스템)

```
assets/scripts/audio/voice/
├── VoicePlayer.ts                   # ✅ 음성 재생 관리자
├── DialogueSystem.ts                # ✅ 대화 시스템
├── SubtitleManager.ts               # ✅ 자막 관리 시스템
└── VoiceQueue.ts                    # ✅ 음성 재생 대기열
```

### 2.5. Advanced Audio (고급 오디오)

```
assets/scripts/audio/advanced/
├── DynamicRangeProcessor.ts         # ✅ 다이나믹 레인지 처리
├── AudioCompressor.ts               # ✅ 오디오 압축 시스템
├── ReverbSystem.ts                  # ✅ 리버브 효과 시스템
└── AudioAnalyzer.ts                 # ✅ 오디오 분석 도구
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/08-Audio-System.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 오디오 아키텍처 구축 (가장 중요)**
*   **기간:** 6일
*   **목표:** 음악, 효과음, 음성의 기본 재생과 볼륨 관리가 정상 작동한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `AudioManager.ts`: 오디오 시스템의 중앙 관리자와 초기화를 구현합니다.
        ```typescript
        export class AudioManager {
            private static instance: AudioManager;
            private musicPlayer: MusicPlayer;
            private sfxPlayer: SFXPlayer;
            private voicePlayer: VoicePlayer;
            private audioSettings: AudioSettings;
            private audioListener: Node;
            
            initialize(): void {
                this.setupAudioContext();
                this.initializeAudioSettings();
                this.createAudioPlayers();
                this.setupAudioListener();
                this.bindEventHandlers();
            }
            
            playMusic(musicId: string, options?: MusicOptions): void {
                this.musicPlayer.play(musicId, {
                    fadeIn: options?.fadeIn ?? 2.0,
                    loop: options?.loop ?? true,
                    volume: this.audioSettings.musicVolume * this.audioSettings.masterVolume
                });
            }
            
            playSFX(sfxId: string, position?: Vec3, options?: SFXOptions): string {
                return this.sfxPlayer.play(sfxId, position, {
                    volume: this.audioSettings.sfxVolume * this.audioSettings.masterVolume,
                    ...options
                });
            }
        }
        ```
    2.  **[Task 1.2]** `AudioSettings.ts`: 마스터 볼륨, 카테고리별 볼륨 설정을 구현합니다.
    3.  **[Task 1.3]** `AudioPool.ts`: 오디오 소스의 효율적인 재사용을 위한 풀링을 구현합니다.
    4.  **[Task 1.4]** `AudioLoader.ts`: 오디오 클립의 비동기 로딩과 캐싱을 구현합니다.
    5.  **[Task 1.5]** **기본 오디오 테스트:** 음악, 효과음, 음성이 정상적으로 재생되고 볼륨 조절이 작동하는지 검증합니다.

### **Phase 2: 3D 공간 오디오 시스템**
*   **기간:** 5일
*   **목표:** 현실적인 3D 오디오와 거리 감쇠, 방향성 사운드를 완성한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `SpatialAudioProcessor.ts`: 3D 공간에서의 오디오 위치 계산을 구현합니다.
        ```typescript
        export class SpatialAudioProcessor {
            private listenerTransform: Node;
            private occlusionProcessor: AudioOcclusion;
            
            calculate3DAudio(
                sourcePos: Vec3, 
                sourceNode: Node, 
                audioSource: AudioSource
            ): void {
                const listenerPos = this.listenerTransform.worldPosition;
                const distance = Vec3.distance(sourcePos, listenerPos);
                
                // 거리 감쇠 계산
                const volume = this.calculateDistanceAttenuation(distance, audioSource.maxDistance);
                
                // 방향성 계산 (스테레오 패닝)
                const panValue = this.calculateStereoBalance(sourcePos, listenerPos);
                
                // 도플러 효과 계산
                const pitch = this.calculateDopplerEffect(sourceNode, this.listenerTransform);
                
                // 오클루전 계산
                const occlusionFactor = this.occlusionProcessor.calculateOcclusion(sourcePos, listenerPos);
                
                // 오디오 소스에 적용
                audioSource.volume = volume * occlusionFactor;
                audioSource.pitch = pitch;
                this.applyStereoBalance(audioSource, panValue);
            }
            
            private calculateDistanceAttenuation(distance: number, maxDistance: number): number {
                if (distance >= maxDistance) return 0;
                return 1.0 - (distance / maxDistance);
            }
        }
        ```
    2.  **[Task 2.2]** `AudioOcclusion.ts`: 레이캐스팅 기반 오디오 오클루전을 구현합니다.
    3.  **[Task 2.3]** **환경 오디오:** 반향과 환경에 따른 오디오 효과를 구현합니다.
    4.  **[Task 2.4]** **도플러 효과:** 이동하는 오브젝트의 도플러 효과를 구현합니다.
    5.  **[Task 2.5]** **3D 오디오 테스트:** 플레이어 위치와 시점에 따른 현실적인 3D 오디오가 동작하는지 검증합니다.

### **Phase 3: 적응형 음악 시스템**
*   **기간:** 7일
*   **목표:** 게임 상황에 따라 동적으로 변화하는 인터랙티브 음악 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `AdaptiveMusicSystem.ts`: 게임 상태에 따른 음악 선택과 전환을 구현합니다.
        ```typescript
        export class AdaptiveMusicSystem {
            private musicStates: Map<GameState, MusicTrack[]> = new Map();
            private currentGameState: GameState = GameState.EXPLORATION;
            private intensityLevel: number = 0; // 0-1 범위
            private musicLayers: MusicLayer[] = [];
            
            updateGameState(newState: GameState, intensity: number = 0): void {
                if (this.currentGameState === newState && Math.abs(this.intensityLevel - intensity) < 0.1) {
                    return; // 변화가 미미하면 무시
                }
                
                const previousState = this.currentGameState;
                this.currentGameState = newState;
                this.intensityLevel = intensity;
                
                const newMusicId = this.selectMusic(newState, intensity);
                
                if (newMusicId) {
                    const transitionTime = this.calculateTransitionTime(previousState, newState);
                    this.transitionToTrack(newMusicId, transitionTime);
                }
                
                // 레이어 기반 음악 업데이트
                this.updateMusicLayers();
            }
            
            private selectMusic(state: GameState, intensity: number): string | null {
                const tracks = this.musicStates.get(state);
                if (!tracks || tracks.length === 0) return null;
                
                // 강도에 맞는 트랙 선택
                for (const track of tracks.reverse()) { // 높은 강도부터 확인
                    if (intensity >= track.minIntensity) {
                        return track.id;
                    }
                }
                
                return tracks[0].id; // 기본 트랙
            }
        }
        ```
    2.  **[Task 3.2]** `MusicTransitionManager.ts`: 부드러운 음악 전환과 크로스페이드를 구현합니다.
    3.  **[Task 3.3]** `MusicLayerSystem.ts`: 다중 음악 레이어의 동적 볼륨 조절을 구현합니다.
    4.  **[Task 3.4]** **음악 스팅어:** 특별한 이벤트를 위한 짧은 음악 효과를 구현합니다.
    5.  **[Task 3.5]** **적응형 음악 테스트:** 게임 상황 변화에 따른 자연스러운 음악 전환이 동작하는지 검증합니다.

### **Phase 4: 모바일 최적화 및 성능 관리**
*   **기간:** 4일
*   **목표:** 모바일 환경에서 배터리 효율적이고 메모리 최적화된 오디오 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 4.1]** **오디오 압축 시스템:** 실시간 오디오 압축과 스트리밍을 구현합니다.
        ```typescript
        export class MobileAudioOptimizer {
            private audioQuality: AudioQuality = AudioQuality.MEDIUM;
            private maxConcurrentSounds: number = 16; // 모바일 제한
            private activeSounds: Map<string, AudioSource> = new Map();
            
            optimizeForDevice(deviceInfo: DeviceInfo): void {
                // 기기 성능에 따른 설정 조정
                if (deviceInfo.isLowEnd) {
                    this.audioQuality = AudioQuality.LOW;
                    this.maxConcurrentSounds = 8;
                } else if (deviceInfo.isHighEnd) {
                    this.audioQuality = AudioQuality.HIGH;
                    this.maxConcurrentSounds = 32;
                }
                
                this.applyQualitySettings();
            }
            
            manageConcurrentSounds(newSoundId: string, priority: number): boolean {
                if (this.activeSounds.size < this.maxConcurrentSounds) {
                    return true; // 재생 가능
                }
                
                // 우선순위가 낮은 사운드 찾아서 중단
                const lowestPrioritySound = this.findLowestPrioritySound();
                
                if (lowestPrioritySound && lowestPrioritySound.priority < priority) {
                    this.stopSound(lowestPrioritySound.id);
                    return true;
                }
                
                return false; // 재생 불가
            }
        }
        ```
    2.  **[Task 4.2]** **배터리 최적화:** 백그라운드 오디오 처리와 CPU 사용량 최적화를 구현합니다.
    3.  **[Task 4.3]** **메모리 관리:** 오디오 클립의 동적 로딩/언로딩과 메모리 모니터링을 구현합니다.
    4.  **[Task 4.4]** **지연시간 최적화:** 오디오 입력에서 출력까지의 지연시간을 최소화합니다.
    5.  **[Task 4.5]** **성능 테스트:** 다양한 모바일 기기에서 안정적인 오디오 성능을 검증합니다.

### **Phase 5: 고급 오디오 효과 및 분석**
*   **기간:** 3일
*   **목표:** 게임 경험을 향상시키는 고급 오디오 효과와 분석 도구를 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `ReverbSystem.ts`: 환경별 리버브 효과와 동적 음향 특성을 구현합니다.
        ```typescript
        export class ReverbSystem {
            private environments: Map<EnvironmentType, ReverbSettings> = new Map();
            private currentEnvironment: EnvironmentType = EnvironmentType.OUTDOOR;
            
            setEnvironment(environment: EnvironmentType): void {
                if (this.currentEnvironment === environment) return;
                
                this.currentEnvironment = environment;
                const settings = this.environments.get(environment);
                
                if (settings) {
                    this.applyReverbSettings(settings);
                    this.transitionReverbSmooth(settings, 2.0);
                }
            }
            
            processAudioWithReverb(audioSource: AudioSource, sourcePosition: Vec3): void {
                const settings = this.environments.get(this.currentEnvironment);
                if (!settings) return;
                
                const distance = this.calculateDistanceFromWalls(sourcePosition);
                const reverbAmount = this.calculateReverbAmount(distance, settings);
                
                // 리버브 효과 적용
                this.applyReverbToSource(audioSource, reverbAmount, settings);
            }
            
            private calculateReverbAmount(distance: number, settings: ReverbSettings): number {
                const maxDistance = 50; // 최대 리버브 거리
                const normalizedDistance = Math.min(distance / maxDistance, 1.0);
                return settings.baseAmount * (1.0 - normalizedDistance);
            }
        }
        ```
    2.  **[Task 5.2]** `AudioAnalyzer.ts`: 실시간 오디오 분석과 시각화 도구를 구현합니다.
    3.  **[Task 5.3]** `DynamicRangeProcessor.ts`: 자동 볼륨 조절과 다이나믹 레인지 압축을 구현합니다.
    4.  **[Task 5.4]** **오디오 디버깅 도구:** 개발자용 오디오 시각화 및 디버깅 인터페이스를 구현합니다.
    5.  **[Task 5.5]** **전체 오디오 시스템 통합 테스트:** 모든 오디오 시스템이 통합되어 완벽하게 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 오디오 스트리밍 시스템

```typescript
// 대용량 오디오 파일의 효율적인 스트리밍
export class AudioStreamer {
    private streamingBuffers: Map<string, AudioBuffer> = new Map();
    private bufferSize: number = 4096; // 버퍼 크기
    private preloadThreshold: number = 2.0; // 2초 미리 로드
    
    async streamAudio(audioId: string, startTime: number = 0): Promise<AudioSource> {
        const buffer = await this.getOrCreateBuffer(audioId);
        const audioSource = this.createAudioSource();
        
        // 스트리밍 시작
        this.startStreaming(audioSource, buffer, startTime);
        
        return audioSource;
    }
    
    private startStreaming(source: AudioSource, buffer: AudioBuffer, startTime: number): void {
        let currentTime = startTime;
        const updateInterval = this.bufferSize / buffer.sampleRate;
        
        const streamUpdate = () => {
            if (!source.playing) return;
            
            // 현재 위치에서 버퍼 크기만큼 데이터 로드
            const audioData = this.extractAudioData(buffer, currentTime, this.bufferSize);
            
            if (audioData) {
                source.updateBuffer(audioData);
                currentTime += updateInterval;
                
                // 다음 업데이트 예약
                setTimeout(streamUpdate, updateInterval * 1000);
            }
        };
        
        streamUpdate();
    }
}
```

### 4.2. 자동 믹싱 시스템

```typescript
// 상황에 맞는 자동 오디오 믹싱
export class AutoMixingSystem {
    private mixingProfiles: Map<GameSituation, MixingProfile> = new Map();
    private currentProfile: MixingProfile;
    private transitionSpeed: number = 0.1; // 믹싱 전환 속도
    
    updateMixing(situation: GameSituation): void {
        const targetProfile = this.mixingProfiles.get(situation);
        if (!targetProfile || targetProfile === this.currentProfile) return;
        
        this.transitionToProfile(targetProfile);
    }
    
    private transitionToProfile(targetProfile: MixingProfile): void {
        const currentVolumes = this.getCurrentVolumes();
        
        // 부드러운 볼륨 전환
        this.interpolateVolumes(currentVolumes, targetProfile.volumes, this.transitionSpeed);
        
        // EQ 설정 전환
        this.transitionEQ(this.currentProfile.eq, targetProfile.eq);
        
        this.currentProfile = targetProfile;
    }
    
    private interpolateVolumes(from: VolumeSettings, to: VolumeSettings, speed: number): void {
        const interpolator = () => {
            let needsUpdate = false;
            
            // 각 카테고리별 볼륨 보간
            for (const [category, targetVolume] of Object.entries(to)) {
                const currentVolume = from[category];
                const diff = targetVolume - currentVolume;
                
                if (Math.abs(diff) > 0.01) {
                    from[category] += diff * speed;
                    needsUpdate = true;
                }
            }
            
            // 볼륨 적용
            this.applyVolumeSettings(from);
            
            if (needsUpdate) {
                requestAnimationFrame(interpolator);
            }
        };
        
        interpolator();
    }
}
```

### 4.3. 적응형 품질 시스템

```typescript
// 기기 성능에 따른 오디오 품질 자동 조절
export class AdaptiveAudioQuality {
    private qualityMetrics: QualityMetrics = {
        cpuUsage: 0,
        memoryUsage: 0,
        batteryLevel: 1.0,
        thermalState: ThermalState.NOMINAL
    };
    
    private currentQuality: AudioQuality = AudioQuality.HIGH;
    
    updateQualityMetrics(): void {
        this.qualityMetrics.cpuUsage = this.getCPUUsage();
        this.qualityMetrics.memoryUsage = this.getMemoryUsage();
        this.qualityMetrics.batteryLevel = this.getBatteryLevel();
        this.qualityMetrics.thermalState = this.getThermalState();
        
        const recommendedQuality = this.calculateRecommendedQuality();
        
        if (recommendedQuality !== this.currentQuality) {
            this.transitionToQuality(recommendedQuality);
        }
    }
    
    private calculateRecommendedQuality(): AudioQuality {
        let score = 1.0;
        
        // CPU 사용률 고려
        if (this.qualityMetrics.cpuUsage > 0.8) score -= 0.3;
        else if (this.qualityMetrics.cpuUsage > 0.6) score -= 0.1;
        
        // 메모리 사용률 고려
        if (this.qualityMetrics.memoryUsage > 0.9) score -= 0.4;
        else if (this.qualityMetrics.memoryUsage > 0.7) score -= 0.2;
        
        // 배터리 레벨 고려
        if (this.qualityMetrics.batteryLevel < 0.2) score -= 0.3;
        else if (this.qualityMetrics.batteryLevel < 0.5) score -= 0.1;
        
        // 열 상태 고려
        if (this.qualityMetrics.thermalState === ThermalState.CRITICAL) score -= 0.5;
        else if (this.qualityMetrics.thermalState === ThermalState.SERIOUS) score -= 0.3;
        
        // 점수에 따른 품질 결정
        if (score >= 0.8) return AudioQuality.HIGH;
        if (score >= 0.5) return AudioQuality.MEDIUM;
        return AudioQuality.LOW;
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **오디오 설계 문서 완벽 준수:** `08-Audio-System.md`에 정의된 모든 오디오 기능과 최적화를 정확히 구현합니다.

2.  **모바일 최적화 우선:** 배터리 소모, 메모리 사용량, CPU 부하를 최소화하면서도 고품질 오디오를 제공합니다.

3.  **몰입감 극대화:** 3D 공간 오디오와 적응형 음악을 통해 플레이어의 몰입감을 극대화합니다.

4.  **성능 적응성:** 다양한 모바일 기기에서 일관된 오디오 경험을 제공할 수 있는 적응형 시스템을 구현합니다.

5.  **디버깅 도구:** 개발 과정에서 오디오 문제를 쉽게 파악하고 해결할 수 있는 도구를 제공합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **오디오 지연시간:** 터치 입력에서 오디오 출력까지 100ms 이내
- **메모리 사용량:** 오디오 시스템 전체 80MB 이하
- **CPU 사용률:** 전체 CPU의 15% 이하
- **배터리 효율성:** 오디오 시스템으로 인한 추가 배터리 소모 5% 이하

### 6.2. 검증 기준
- 동시에 20개 이상의 3D 오디오 소스 처리 가능
- 음악 전환 시 끊김이나 노이즈 없는 부드러운 크로스페이드
- 3D 오디오의 방향성과 거리감이 현실적으로 표현됨
- 적응형 음악이 게임 상황에 자연스럽게 반응
- 다양한 모바일 기기에서 일관된 오디오 품질 제공

이 구현 계획을 통해 Shadow Archer의 오디오 시스템을 완성하여 플레이어에게 몰입감 있고 현실적인 사운드 경험을 제공할 수 있을 것입니다.