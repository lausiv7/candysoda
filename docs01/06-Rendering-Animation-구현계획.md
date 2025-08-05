# Shadow Archer 구현 계획서: 렌더링 및 애니메이션 시스템

## 1. 🎯 구현 목표

이 문서는 `docs/06-Rendering-Animation-Part1.md`와 `docs/06-Rendering-Animation-Part2.md`에 정의된 **렌더링 및 애니메이션 시스템**을 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 모바일 환경에 최적화된 3D 렌더링 파이프라인, 동적 LOD 시스템, 스켈레탈 애니메이션, 절차적 애니메이션 시스템을 완성하여 60FPS 안정적인 3D 그래픽 경험을 제공합니다.

---

## 2. 📁 구현 대상 핵심 파일

렌더링 및 애니메이션 시스템 구현은 `assets/scripts/rendering` 폴더를 중심으로 진행됩니다.

### 2.1. Rendering Core (렌더링 핵심)

```
assets/scripts/rendering/
├── RenderManager.ts                 # ✅ 렌더링 시스템 총괄 관리자
├── QualityManager.ts                # ✅ 그래픽 품질 설정 관리
├── LODManager.ts                    # ✅ Level of Detail 시스템
├── CullingManager.ts                # ✅ 절두체 컬링 및 오클루전 컬링
└── BatchRenderer.ts                 # ✅ 배치 렌더링 최적화
```

### 2.2. Lighting System (조명 시스템)

```
assets/scripts/rendering/lighting/
├── LightingManager.ts               # ✅ 조명 시스템 관리자
├── DynamicLighting.ts               # ✅ 동적 조명 처리
├── ShadowManager.ts                 # ✅ 그림자 렌더링
├── EnvironmentLighting.ts           # ✅ 환경 조명 (IBL, 스카이박스)
└── LightProbeSystem.ts              # ✅ 라이트 프로브 시스템
```

### 2.3. Animation System (애니메이션 시스템)

```
assets/scripts/animation/
├── AnimationManager.ts              # ✅ 애니메이션 시스템 관리자
├── SkeletalAnimation.ts             # ✅ 스켈레탈 애니메이션
├── AnimationStateMachine.ts         # ✅ 애니메이션 상태 머신
├── AnimationBlender.ts              # ✅ 애니메이션 블렌딩
└── IKSystem.ts                      # ✅ Inverse Kinematics 시스템
```

### 2.4. Procedural Animation (절차적 애니메이션)

```
assets/scripts/animation/procedural/
├── ProceduralAnimator.ts            # ✅ 절차적 애니메이션 관리자
├── SpringBoneSystem.ts              # ✅ 스프링 본 시스템
├── ClothSimulation.ts               # ✅ 천 시뮬레이션
├── ParticleSystem.ts                # ✅ 파티클 시스템
└── WindSystem.ts                    # ✅ 바람 효과 시스템
```

### 2.5. Shader System (셰이더 시스템)

```
assets/scripts/rendering/shaders/
├── ShaderManager.ts                 # ✅ 셰이더 관리자
├── MaterialSystem.ts                # ✅ 머티리얼 시스템
├── PostProcessing.ts                # ✅ 포스트 프로세싱
└── EffectRenderer.ts                # ✅ 특수 효과 렌더링
```

---

## 3. 🚀 구현 순서 및 로드맵

렌더링 및 애니메이션 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 렌더링 파이프라인 구축 (가장 중요)**
*   **기간:** 8일
*   **목표:** 3D 모델 렌더링과 기본 조명이 모바일에서 60FPS로 안정적으로 동작한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `RenderManager.ts`: 렌더링 시스템의 초기화와 매 프레임 렌더링 루프를 구현합니다.
        ```typescript
        export class RenderManager {
            private renderQueue: RenderCommand[] = [];
            private qualitySettings: QualitySettings;
            private lodManager: LODManager;
            private cullingManager: CullingManager;
            
            initialize(): void {
                this.setupRenderPipeline();
                this.initializeQualitySettings();
                this.lodManager = new LODManager();
                this.cullingManager = new CullingManager();
            }
            
            render(deltaTime: number): void {
                // 1. 컬링 수행
                const visibleObjects = this.cullingManager.performCulling();
                
                // 2. LOD 계산
                this.lodManager.updateLOD(visibleObjects);
                
                // 3. 렌더 큐 구성
                this.buildRenderQueue(visibleObjects);
                
                // 4. 렌더링 실행
                this.executeRenderQueue();
            }
        }
        ```
    2.  **[Task 1.2]** `QualityManager.ts`: 기기 성능에 따른 자동 품질 설정과 수동 조절을 구현합니다.
    3.  **[Task 1.3]** `CullingManager.ts`: 절두체 컬링과 기본적인 오클루전 컬링을 구현합니다.
    4.  **[Task 1.4]** `BatchRenderer.ts`: 동일한 머티리얼을 사용하는 오브젝트들의 배치 렌더링을 구현합니다.
    5.  **[Task 1.5]** **기본 렌더링 테스트:** 3D 모델들이 정상적으로 렌더링되고 성능이 목표치를 달성하는지 검증합니다.

### **Phase 2: LOD 시스템 구현**
*   **기간:** 5일
*   **목표:** 거리에 따른 동적 LOD와 성능 기반 품질 조절을 완성한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `LODManager.ts`: 거리 기반 LOD 계산과 메시 전환을 구현합니다.
        ```typescript
        export class LODManager {
            private lodLevels: Map<string, LODLevel[]> = new Map();
            
            updateLOD(objects: RenderObject[]): void {
                const cameraPos = Camera.main.node.worldPosition;
                
                for (const obj of objects) {
                    const distance = Vec3.distance(cameraPos, obj.worldPosition);
                    const lodLevel = this.calculateLODLevel(obj, distance);
                    
                    if (obj.currentLOD !== lodLevel) {
                        this.switchLOD(obj, lodLevel);
                    }
                }
            }
            
            private calculateLODLevel(obj: RenderObject, distance: number): number {
                const lodLevels = this.lodLevels.get(obj.prefabId);
                if (!lodLevels) return 0;
                
                for (let i = 0; i < lodLevels.length; i++) {
                    if (distance <= lodLevels[i].maxDistance) {
                        return i;
                    }
                }
                
                return lodLevels.length - 1;
            }
        }
        ```
    2.  **[Task 2.2]** **동적 LOD 전환:** 프레임 드롭 감지 시 자동으로 LOD 레벨을 조정하는 시스템을 구현합니다.
    3.  **[Task 2.3]** **LOD 메시 생성:** 자동으로 LOD 메시를 생성하거나 미리 준비된 LOD 메시를 관리합니다.
    4.  **[Task 2.4]** **하이브리드 LOD:** 거리 + 성능 + 중요도를 종합한 지능적 LOD 시스템을 구현합니다.
    5.  **[Task 2.5]** **LOD 시스템 테스트:** 다양한 거리와 오브젝트 수에서 LOD가 적절히 동작하는지 검증합니다.

### **Phase 3: 조명 및 그림자 시스템**
*   **기간:** 6일
*   **목표:** 동적 조명과 효율적인 그림자 렌더링을 완성한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `LightingManager.ts`: 다중 조명과 조명 컬링을 관리하는 시스템을 구현합니다.
        ```typescript
        export class LightingManager {
            private lights: Light[] = [];
            private maxActiveLights: number = 8; // 모바일 제한
            
            updateLighting(camera: Camera): void {
                // 카메라 시야 내 조명 컬링
                const visibleLights = this.cullLights(camera);
                
                // 중요도에 따른 조명 우선순위 정렬
                const prioritizedLights = this.prioritizeLights(visibleLights);
                
                // 최대 개수만큼 활성 조명 설정
                this.setActiveLights(prioritizedLights.slice(0, this.maxActiveLights));
            }
            
            private prioritizeLights(lights: Light[]): Light[] {
                return lights.sort((a, b) => {
                    const scoreA = this.calculateLightScore(a);
                    const scoreB = this.calculateLightScore(b);
                    return scoreB - scoreA;
                });
            }
        }
        ```
    2.  **[Task 3.2]** `ShadowManager.ts`: 캐스케이드 섀도우 맵과 모바일 최적화된 그림자를 구현합니다.
    3.  **[Task 3.3]** `DynamicLighting.ts`: 동적 조명의 생성, 이동, 소멸을 관리합니다.
    4.  **[Task 3.4]** **환경 조명:** 스카이박스와 IBL 기반 환경 조명을 구현합니다.
    5.  **[Task 3.5]** **조명 시스템 테스트:** 다양한 조명 조건에서 성능과 품질이 균형을 이루는지 검증합니다.

### **Phase 4: 스켈레탈 애니메이션 시스템**
*   **기간:** 7일
*   **목표:** 부드러운 캐릭터 애니메이션과 상태 머신 기반 전환을 완성한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `SkeletalAnimation.ts`: 스켈레탈 애니메이션의 본 계산과 스키닝을 구현합니다.
        ```typescript
        export class SkeletalAnimation extends Component {
            private skeleton: Skeleton;
            private animationClips: Map<string, AnimationClip> = new Map();
            private currentClip: AnimationClip | null = null;
            private animationTime: number = 0;
            
            playAnimation(clipName: string, fadeTime: number = 0.2): void {
                const newClip = this.animationClips.get(clipName);
                if (!newClip) return;
                
                if (fadeTime > 0 && this.currentClip) {
                    this.startCrossFade(this.currentClip, newClip, fadeTime);
                } else {
                    this.currentClip = newClip;
                    this.animationTime = 0;
                }
            }
            
            update(deltaTime: number): void {
                if (this.currentClip) {
                    this.animationTime += deltaTime;
                    this.updateBoneTransforms();
                    this.applySkinning();
                }
            }
        }
        ```
    2.  **[Task 4.2]** `AnimationStateMachine.ts`: 애니메이션 상태 간 전환과 조건을 관리합니다.
    3.  **[Task 4.3]** `AnimationBlender.ts`: 다중 애니메이션 블렌딩과 레이어 시스템을 구현합니다.
    4.  **[Task 4.4]** **루트 모션:** 애니메이션에서 캐릭터 이동을 추출하는 루트 모션 시스템을 구현합니다.
    5.  **[Task 4.5]** **애니메이션 테스트:** 다양한 캐릭터 애니메이션이 부드럽게 전환되고 실행되는지 검증합니다.

### **Phase 5: 절차적 애니메이션 및 특수 효과**
*   **기간:** 6일
*   **목표:** IK, 스프링 본, 파티클 시스템 등 고급 애니메이션 기능을 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `IKSystem.ts`: Two-bone IK와 Look-at IK를 구현합니다.
        ```typescript
        export class IKSystem {
            solveTwoBoneIK(
                shoulderPos: Vec3, 
                targetPos: Vec3, 
                upperLength: number, 
                lowerLength: number
            ): IKSolution {
                const distance = Vec3.distance(shoulderPos, targetPos);
                const maxReach = upperLength + lowerLength;
                
                if (distance >= maxReach) {
                    // 최대 도달 거리일 때 직선으로 펼침
                    return this.createExtendedSolution(shoulderPos, targetPos, upperLength, lowerLength);
                }
                
                // 코사인 법칙을 사용한 IK 계산
                return this.calculateBendedSolution(shoulderPos, targetPos, upperLength, lowerLength, distance);
            }
            
            solveLookAtIK(boneTransform: Transform, target: Vec3, weight: number): void {
                const currentForward = boneTransform.forward;
                const desiredForward = target.subtract(boneTransform.worldPosition).normalize();
                
                const rotation = Quat.fromToRotation(currentForward, desiredForward);
                boneTransform.rotation = Quat.slerp(boneTransform.rotation, rotation, weight);
            }
        }
        ```
    2.  **[Task 5.2]** `SpringBoneSystem.ts`: 물리 기반 2차 애니메이션(머리카락, 꼬리 등)을 구현합니다.
    3.  **[Task 5.3]** `ParticleSystem.ts`: 모바일 최적화된 파티클 시스템을 구현합니다.
    4.  **[Task 5.4]** **특수 효과:** 마법 효과, 폭발, 연기 등 게임 특수 효과를 구현합니다.
    5.  **[Task 5.5]** **절차적 애니메이션 테스트:** 모든 절차적 애니메이션이 자연스럽고 성능 목표를 달성하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 적응형 품질 시스템

```typescript
// 기기 성능에 따른 실시간 품질 조절
export class AdaptiveQualitySystem {
    private targetFPS: number = 60;
    private fpsHistory: number[] = [];
    private qualityLevel: number = 1.0; // 0.0 ~ 1.0
    
    update(deltaTime: number): void {
        const currentFPS = 1.0 / deltaTime;
        this.fpsHistory.push(currentFPS);
        
        if (this.fpsHistory.length > 60) { // 1초간 평균
            this.fpsHistory.shift();
        }
        
        const averageFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        
        if (averageFPS < this.targetFPS * 0.9) {
            this.decreaseQuality();
        } else if (averageFPS > this.targetFPS * 1.1 && this.qualityLevel < 1.0) {
            this.increaseQuality();
        }
    }
    
    private decreaseQuality(): void {
        this.qualityLevel = Math.max(0.2, this.qualityLevel - 0.1);
        this.applyQualitySettings();
    }
    
    private applyQualitySettings(): void {
        // 그림자 해상도 조절
        ShadowManager.instance.setShadowResolution(1024 * this.qualityLevel);
        
        // LOD 거리 조절
        LODManager.instance.setLODDistanceMultiplier(this.qualityLevel);
        
        // 파티클 밀도 조절
        ParticleSystem.globalDensityMultiplier = this.qualityLevel;
    }
}
```

### 4.2. 모바일 최적화 셰이더 시스템

```typescript
// 모바일 GPU에 최적화된 셰이더 관리
export class MobileShaderManager {
    private shaderVariants: Map<string, ShaderVariant[]> = new Map();
    private currentQualityLevel: QualityLevel = QualityLevel.MEDIUM;
    
    getOptimalShader(materialType: string, features: ShaderFeatures): Shader {
        const variants = this.shaderVariants.get(materialType) || [];
        
        // 현재 품질 레벨에 맞는 셰이더 변형 선택
        for (const variant of variants) {
            if (this.isVariantSuitable(variant, features)) {
                return variant.shader;
            }
        }
        
        // 폴백으로 가장 기본적인 셰이더 반환
        return this.getFallbackShader(materialType);
    }
    
    private isVariantSuitable(variant: ShaderVariant, features: ShaderFeatures): boolean {
        // 필요한 기능들이 셰이더에 포함되어 있는지 확인
        return (variant.supportedFeatures & features) === features &&
               variant.qualityLevel <= this.currentQualityLevel;
    }
    
    // 런타임 셰이더 컴파일 (고급 기능)
    compileShaderVariant(baseShader: string, defines: string[]): Shader {
        const shaderSource = this.preprocessShader(baseShader, defines);
        return this.compileShader(shaderSource);
    }
}
```

### 4.3. 인스턴싱 기반 배치 렌더링

```typescript
// 대량의 동일한 오브젝트를 효율적으로 렌더링
export class InstanceRenderer {
    private instanceData: Map<string, InstanceBatch> = new Map();
    private maxInstancesPerBatch: number = 1000;
    
    addInstance(meshId: string, transform: Mat4, material: Material): void {
        let batch = this.instanceData.get(meshId);
        
        if (!batch) {
            batch = new InstanceBatch(meshId, material);
            this.instanceData.set(meshId, batch);
        }
        
        batch.addInstance(transform);
        
        // 배치가 가득 차면 렌더링 큐에 추가
        if (batch.getInstanceCount() >= this.maxInstancesPerBatch) {
            this.flushBatch(batch);
        }
    }
    
    render(): void {
        // 모든 미처리 배치 렌더링
        this.instanceData.forEach(batch => {
            if (batch.getInstanceCount() > 0) {
                this.renderBatch(batch);
            }
        });
        
        this.clearBatches();
    }
    
    private renderBatch(batch: InstanceBatch): void {
        // GPU 인스턴싱을 사용한 대량 렌더링
        const instanceBuffer = this.createInstanceBuffer(batch.getTransforms());
        const drawCall = new InstancedDrawCall(batch.mesh, batch.material, instanceBuffer);
        
        RenderPipeline.instance.submit(drawCall);
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **렌더링 문서 완벽 준수:** 두 부분으로 나뉜 렌더링 문서의 모든 시스템을 정확히 구현합니다.

2.  **모바일 최적화 우선:** 모든 렌더링 기법이 모바일 GPU의 특성을 고려하여 구현되어야 합니다.

3.  **적응형 성능 관리:** 다양한 모바일 기기에서 일관된 성능을 제공할 수 있는 동적 품질 조절 시스템이 필수입니다.

4.  **메모리 효율성:** 제한된 모바일 메모리에서 효율적으로 동작하는 렌더링 시스템을 구현합니다.

5.  **시각적 품질:** 성능 최적화와 함께 플레이어가 만족할 수 있는 시각적 품질을 유지합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **프레임레이트:** 다양한 모바일 기기에서 안정적 60FPS 유지
- **드로우콜:** 프레임당 최대 200개 드로우콜
- **메모리 사용량:** 렌더링 시스템 전체 300MB 이하
- **배터리 효율성:** 1시간 게임 플레이 시 배터리 소모 20% 이하

### 6.2. 검증 기준
- LOD 시스템으로 멀리 있는 오브젝트 렌더링 비용 90% 절감
- 배치 렌더링으로 동일 오브젝트 다수 렌더링 시 드로우콜 80% 감소
- 적응형 품질 시스템으로 저사양 기기에서도 안정적 성능 보장
- 애니메이션 시스템이 60개 이상 캐릭터 동시 처리 가능
- 파티클 시스템이 1000개 파티클 동시 처리하면서 성능 유지

이 구현 계획을 통해 Shadow Archer의 렌더링 및 애니메이션 시스템을 완성하여 모바일 환경에서도 PC급 3D 그래픽 경험을 제공할 수 있을 것입니다.