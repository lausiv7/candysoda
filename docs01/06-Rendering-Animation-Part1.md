# 🎨 06. 렌더링 및 애니메이션 시스템 Part 1 (Rendering & Animation System)

*Shadow Archer 모바일 3D 소울라이크 게임의 렌더링 및 애니메이션 시스템*

---

## 📖 목차

1. [렌더링 시스템 개요](#1-렌더링-시스템-개요)
2. [3D 렌더링 파이프라인](#2-3d-렌더링-파이프라인)
3. [모바일 최적화 렌더링](#3-모바일-최적화-렌더링)
4. [쉐이더 시스템](#4-쉐이더-시스템)
5. [라이팅 시스템](#5-라이팅-시스템)

---

## 1. 렌더링 시스템 개요

### 1.1 렌더링 아키텍처

```typescript
// [의도] 모바일 환경에 최적화된 3D 렌더링 시스템
// [책임] 쿼터뷰 카메라, 성능 최적화, 시각적 품질 균형

enum RenderPipeline {
    FORWARD = "forward",           // 포워드 렌더링
    DEFERRED = "deferred",         // 디퍼드 렌더링 (고사양 기기)
    MOBILE_OPTIMIZED = "mobile"    // 모바일 최적화
}

enum RenderQuality {
    LOW = 0,      // 저사양 기기
    MEDIUM = 1,   // 중간 사양
    HIGH = 2,     // 고사양 기기
    ULTRA = 3     // 최고 사양 (향후 확장)
}

class RenderingSystem extends Component {
    private static instance: RenderingSystem;
    
    private currentPipeline: RenderPipeline = RenderPipeline.MOBILE_OPTIMIZED;
    private qualityLevel: RenderQuality = RenderQuality.MEDIUM;
    
    // 렌더링 통계
    private renderStats: RenderStats = {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        textureMemory: 0,
        frameTime: 0
    };
    
    // 컬링 시스템
    private frustumCuller: FrustumCuller;
    private occlusionCuller: OcclusionCuller;
    
    // 배치 렌더링
    private batchRenderer: BatchRenderer;
    
    static getInstance(): RenderingSystem {
        return RenderingSystem.instance;
    }
    
    protected onLoad() {
        this.initializeRenderPipeline();
        this.setupQualitySettings();
        this.initializeCulling();
        this.initializeBatching();
    }
    
    private initializeRenderPipeline() {
        // 디바이스 성능에 따른 파이프라인 선택
        const deviceInfo = this.getDeviceInfo();
        
        if (deviceInfo.gpuTier >= 3) {
            this.currentPipeline = RenderPipeline.DEFERRED;
            this.qualityLevel = RenderQuality.HIGH;
        } else if (deviceInfo.gpuTier >= 2) {
            this.currentPipeline = RenderPipeline.FORWARD;
            this.qualityLevel = RenderQuality.MEDIUM;
        } else {
            this.currentPipeline = RenderPipeline.MOBILE_OPTIMIZED;
            this.qualityLevel = RenderQuality.LOW;
        }
    }
    
    private setupQualitySettings() {
        const settings = this.getQualitySettings(this.qualityLevel);
        
        // 그림자 품질
        director.getScene()!.shadowType = settings.shadowType;
        
        // 안티앨리어싱
        const camera = Camera.main;
        if (camera) {
            camera.clearFlags = settings.clearFlags;
        }
        
        // 텍스처 품질
        this.setGlobalTextureQuality(settings.textureQuality);
    }
    
    private getQualitySettings(quality: RenderQuality): QualitySettings {
        switch (quality) {
            case RenderQuality.LOW:
                return {
                    shadowType: ShadowType.None,
                    clearFlags: CameraClearFlags.SOLID_COLOR,
                    textureQuality: 0.5,
                    lodBias: 2.0,
                    maxLights: 2
                };
            case RenderQuality.MEDIUM:
                return {
                    shadowType: ShadowType.ShadowMap,
                    clearFlags: CameraClearFlags.SKYBOX,
                    textureQuality: 0.8,
                    lodBias: 1.0,
                    maxLights: 4
                };
            case RenderQuality.HIGH:
                return {
                    shadowType: ShadowType.PCF_SOFT,
                    clearFlags: CameraClearFlags.SKYBOX,
                    textureQuality: 1.0,
                    lodBias: 0.5,
                    maxLights: 8
                };
            default:
                return this.getQualitySettings(RenderQuality.MEDIUM);
        }
    }
    
    // 프레임별 렌더링 업데이트
    protected lateUpdate() {
        this.updateRenderStats();
        this.performCulling();
        this.optimizeBatching();
        this.adjustQualityIfNeeded();
    }
    
    private updateRenderStats() {
        const startTime = performance.now();
        
        // 렌더링 통계 수집
        this.renderStats.drawCalls = this.getDrawCallCount();
        this.renderStats.triangles = this.getTriangleCount();
        this.renderStats.vertices = this.getVertexCount();
        this.renderStats.textureMemory = this.getTextureMemoryUsage();
        
        this.renderStats.frameTime = performance.now() - startTime;
    }
    
    private adjustQualityIfNeeded() {
        const avgFrameTime = this.getAverageFrameTime();
        const targetFrameTime = 1000 / 30; // 30 FPS 목표
        
        if (avgFrameTime > targetFrameTime * 1.2) {
            // 성능이 부족하면 품질 낮추기
            this.lowerQuality();
        } else if (avgFrameTime < targetFrameTime * 0.8) {
            // 성능에 여유가 있으면 품질 높이기
            this.raiseQuality();
        }
    }
    
    getRenderStats(): RenderStats {
        return { ...this.renderStats };
    }
}

interface RenderStats {
    drawCalls: number;
    triangles: number;
    vertices: number;
    textureMemory: number;
    frameTime: number;
}

interface QualitySettings {
    shadowType: ShadowType;
    clearFlags: CameraClearFlags;
    textureQuality: number;
    lodBias: number;
    maxLights: number;
}
```

### 1.2 카메라 시스템

```typescript
// [의도] 쿼터뷰 3D 카메라를 위한 전용 시스템
// [책임] 부드러운 카메라 추적, 화면 흔들림, 줌 효과

class QuarterViewCamera extends Component {
    @property(Number)
    followDistance: number = 10;
    
    @property(Number)
    followHeight: number = 8;
    
    @property(Number)
    followSpeed: number = 2;
    
    @property(Number)
    rotationSpeed: number = 1;
    
    private target: Node | null = null;
    private camera: Camera | null = null;
    private basePosition: Vec3 = Vec3.ZERO;
    private baseRotation: Quat = Quat.IDENTITY;
    
    // 카메라 효과
    private shakeIntensity: number = 0;
    private shakeDuration: number = 0;
    private zoomFactor: number = 1.0;
    private targetZoom: number = 1.0;
    
    protected onLoad() {
        this.camera = this.getComponent(Camera);
        this.setupQuarterView();
    }
    
    private setupQuarterView() {
        // 쿼터뷰 각도 설정 (45도 내려다보기)
        const rotation = Quat.fromEuler(new Vec3(-45, 0, 0));
        this.node.rotation = rotation;
        this.baseRotation = rotation;
        
        // FOV 설정
        if (this.camera) {
            this.camera.fov = 45;
        }
    }
    
    setTarget(target: Node) {
        this.target = target;
        if (target) {
            this.updateBasePosition();
        }
    }
    
    private updateBasePosition() {
        if (!this.target) return;
        
        const targetPos = this.target.worldPosition;
        const offset = new Vec3(0, this.followHeight, this.followDistance);
        
        // 쿼터뷰 오프셋 적용
        const rotatedOffset = this.baseRotation.transformVector(offset);
        this.basePosition = targetPos.add(rotatedOffset);
    }
    
    protected update(deltaTime: number) {
        if (!this.target) return;
        
        this.updateBasePosition();
        this.updateCameraPosition(deltaTime);
        this.updateCameraEffects(deltaTime);
        this.updateZoom(deltaTime);
    }
    
    private updateCameraPosition(deltaTime: number) {
        const currentPos = this.node.worldPosition;
        const targetPos = this.basePosition;
        
        // 부드러운 추적
        const newPos = Vec3.lerp(currentPos, targetPos, this.followSpeed * deltaTime);
        this.node.worldPosition = newPos;
    }
    
    private updateCameraEffects(deltaTime: number) {
        // 화면 흔들림 효과
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            
            const shakeOffset = new Vec3(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
            
            this.node.worldPosition = this.basePosition.add(shakeOffset);
            
            // 흔들림 강도 감소
            this.shakeIntensity *= 0.95;
        }
    }
    
    private updateZoom(deltaTime: number) {
        if (Math.abs(this.zoomFactor - this.targetZoom) > 0.01) {
            this.zoomFactor = lerp(this.zoomFactor, this.targetZoom, 3 * deltaTime);
            
            if (this.camera) {
                this.camera.fov = 45 / this.zoomFactor;
            }
        }
    }
    
    // 카메라 흔들림 시작
    shake(intensity: number, duration: number) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }
    
    // 줌 설정
    setZoom(zoomLevel: number, duration: number = 1) {
        this.targetZoom = Math.max(0.5, Math.min(2.0, zoomLevel));
        
        if (duration > 0) {
            // 부드러운 줌 (update에서 처리됨)
        } else {
            // 즉시 줌
            this.zoomFactor = this.targetZoom;
            if (this.camera) {
                this.camera.fov = 45 / this.zoomFactor;
            }
        }
    }
    
    // 전투 시 카메라 조정
    enterCombatMode() {
        this.setZoom(1.2, 0.5); // 약간 줌인
        this.followSpeed *= 1.5; // 추적 속도 증가
    }
    
    exitCombatMode() {
        this.setZoom(1.0, 1.0); // 기본 줌
        this.followSpeed /= 1.5; // 추적 속도 복원
    }
}
```

---

## 2. 3D 렌더링 파이프라인

### 2.1 렌더링 순서 최적화

```typescript
// [의도] 드로우콜을 최소화하고 렌더링 효율성을 극대화
// [책임] 렌더링 큐 관리, 상태 변경 최소화, 배치 렌더링

enum RenderQueue {
    BACKGROUND = 1000,    // 배경 (스카이박스)
    OPAQUE = 2000,       // 불투명 객체
    ALPHA_TEST = 2450,   // 알파 테스트
    TRANSPARENT = 3000,  // 투명 객체
    OVERLAY = 4000       // UI 오버레이
}

class RenderQueueManager extends Component {
    private renderQueues: Map<RenderQueue, RenderObject[]> = new Map();
    private sortedQueues: RenderQueue[] = [];
    
    protected onLoad() {
        this.initializeQueues();
    }
    
    private initializeQueues() {
        // 렌더 큐 초기화
        Object.values(RenderQueue).forEach(queue => {
            if (typeof queue === 'number') {
                this.renderQueues.set(queue, []);
            }
        });
        
        // 큐 정렬 (낮은 번호부터)
        this.sortedQueues = Array.from(this.renderQueues.keys()).sort((a, b) => a - b);
    }
    
    // 렌더 객체 등록
    addRenderObject(obj: RenderObject) {
        const queue = this.determineRenderQueue(obj);
        this.renderQueues.get(queue)?.push(obj);
    }
    
    // 렌더 객체 제거
    removeRenderObject(obj: RenderObject) {
        this.renderQueues.forEach(queue => {
            const index = queue.indexOf(obj);
            if (index !== -1) {
                queue.splice(index, 1);
            }
        });
    }
    
    private determineRenderQueue(obj: RenderObject): RenderQueue {
        const material = obj.material;
        
        if (material.isTransparent()) {
            return RenderQueue.TRANSPARENT;
        } else if (material.hasAlphaTest()) {
            return RenderQueue.ALPHA_TEST;
        } else {
            return RenderQueue.OPAQUE;
        }
    }
    
    // 프레임별 렌더링 실행
    render(camera: Camera) {
        this.sortRenderQueues(camera);
        
        for (const queueType of this.sortedQueues) {
            const queue = this.renderQueues.get(queueType);
            if (queue && queue.length > 0) {
                this.renderQueue(queue, camera);
            }
        }
    }
    
    private sortRenderQueues(camera: Camera) {
        const cameraPos = camera.node.worldPosition;
        
        // 불투명 객체는 앞에서 뒤로 (Z-버퍼 최적화)
        const opaqueQueue = this.renderQueues.get(RenderQueue.OPAQUE)!;
        opaqueQueue.sort((a, b) => {
            const distA = Vec3.distance(a.worldPosition, cameraPos);
            const distB = Vec3.distance(b.worldPosition, cameraPos);
            return distA - distB;
        });
        
        // 투명 객체는 뒤에서 앞으로 (알파 블렌딩)
        const transparentQueue = this.renderQueues.get(RenderQueue.TRANSPARENT)!;
        transparentQueue.sort((a, b) => {
            const distA = Vec3.distance(a.worldPosition, cameraPos);
            const distB = Vec3.distance(b.worldPosition, cameraPos);
            return distB - distA;
        });
    }
    
    private renderQueue(queue: RenderObject[], camera: Camera) {
        let lastMaterial: Material | null = null;
        let lastMesh: Mesh | null = null;
        
        for (const obj of queue) {
            // 상태 변경 최소화
            if (obj.material !== lastMaterial) {
                this.bindMaterial(obj.material);
                lastMaterial = obj.material;
            }
            
            if (obj.mesh !== lastMesh) {
                this.bindMesh(obj.mesh);
                lastMesh = obj.mesh;
            }
            
            // 오브젝트별 유니폼 설정
            this.setObjectUniforms(obj, camera);
            
            // 드로우콜 실행
            this.drawMesh(obj.mesh);
        }
    }
    
    private bindMaterial(material: Material) {
        // 셰이더 바인딩
        material.getShader().bind();
        
        // 텍스처 바인딩
        material.getTextures().forEach((texture, slot) => {
            texture.bind(slot);
        });
        
        // 블렌딩 상태 설정
        this.setBlendState(material.getBlendState());
    }
    
    private setObjectUniforms(obj: RenderObject, camera: Camera) {
        const shader = obj.material.getShader();
        
        // 월드 매트릭스
        shader.setUniform("u_worldMatrix", obj.worldMatrix);
        
        // 월드-뷰-프로젝션 매트릭스
        const mvpMatrix = camera.projectionMatrix
            .multiply(camera.viewMatrix)
            .multiply(obj.worldMatrix);
        shader.setUniform("u_mvpMatrix", mvpMatrix);
        
        // 노멀 매트릭스
        const normalMatrix = obj.worldMatrix.inverse().transpose();
        shader.setUniform("u_normalMatrix", normalMatrix);
    }
}

interface RenderObject {
    mesh: Mesh;
    material: Material;
    worldPosition: Vec3;
    worldMatrix: Mat4;
    isVisible: boolean;
}
```

### 2.2 배치 렌더링 시스템

```typescript
// [의도] 동일한 메시/머티리얼을 가진 객체들을 한 번에 렌더링
// [책임] 인스턴싱을 통한 드로우콜 감소

class BatchRenderer extends Component {
    private batches: Map<string, RenderBatch> = new Map();
    private instancedBuffers: Map<string, InstancedBuffer> = new Map();
    
    // 배치 생성
    createBatch(meshId: string, materialId: string, maxInstances: number = 100): RenderBatch {
        const batchId = `${meshId}_${materialId}`;
        
        if (this.batches.has(batchId)) {
            return this.batches.get(batchId)!;
        }
        
        const batch = new RenderBatch(meshId, materialId, maxInstances);
        this.batches.set(batchId, batch);
        
        // 인스턴스 버퍼 생성
        const instanceBuffer = new InstancedBuffer(maxInstances);
        this.instancedBuffers.set(batchId, instanceBuffer);
        
        return batch;
    }
    
    // 인스턴스 추가
    addInstance(meshId: string, materialId: string, transform: Mat4, color?: Color) {
        const batchId = `${meshId}_${materialId}`;
        const batch = this.batches.get(batchId);
        
        if (batch && batch.canAddInstance()) {
            batch.addInstance({
                transform: transform,
                color: color || Color.WHITE
            });
        }
    }
    
    // 모든 배치 렌더링
    renderAllBatches() {
        this.batches.forEach((batch, batchId) => {
            if (batch.instanceCount > 0) {
                this.renderBatch(batch, batchId);
            }
        });
        
        // 배치 초기화 (다음 프레임 준비)
        this.clearBatches();
    }
    
    private renderBatch(batch: RenderBatch, batchId: string) {
        const instanceBuffer = this.instancedBuffers.get(batchId);
        if (!instanceBuffer) return;
        
        // 인스턴스 데이터 업데이트
        instanceBuffer.updateData(batch.instances);
        
        // 메시와 머티리얼 바인딩
        const mesh = ResourceManager.getInstance().getMesh(batch.meshId);
        const material = ResourceManager.getInstance().getMaterial(batch.materialId);
        
        if (!mesh || !material) return;
        
        // 인스턴스드 렌더링 실행
        this.drawInstanced(mesh, material, instanceBuffer, batch.instanceCount);
    }
    
    private drawInstanced(mesh: Mesh, material: Material, instanceBuffer: InstancedBuffer, instanceCount: number) {
        // 셰이더 바인딩
        const shader = material.getShader();
        shader.bind();
        
        // 버텍스 버퍼 바인딩
        mesh.bind();
        
        // 인스턴스 버퍼 바인딩
        instanceBuffer.bind();
        
        // 인스턴스드 드로우콜
        gl.drawElementsInstanced(
            gl.TRIANGLES,
            mesh.indexCount,
            gl.UNSIGNED_SHORT,
            0,
            instanceCount
        );
    }
    
    private clearBatches() {
        this.batches.forEach(batch => {
            batch.clear();
        });
    }
}

class RenderBatch {
    readonly meshId: string;
    readonly materialId: string;
    readonly maxInstances: number;
    
    instances: InstanceData[] = [];
    
    constructor(meshId: string, materialId: string, maxInstances: number) {
        this.meshId = meshId;
        this.materialId = materialId;
        this.maxInstances = maxInstances;
    }
    
    addInstance(instance: InstanceData): boolean {
        if (this.instances.length >= this.maxInstances) {
            return false;
        }
        
        this.instances.push(instance);
        return true;
    }
    
    canAddInstance(): boolean {
        return this.instances.length < this.maxInstances;
    }
    
    get instanceCount(): number {
        return this.instances.length;
    }
    
    clear() {
        this.instances.length = 0;
    }
}

interface InstanceData {
    transform: Mat4;
    color: Color;
}

class InstancedBuffer {
    private buffer: WebGLBuffer | null = null;
    private data: Float32Array;
    private maxInstances: number;
    
    constructor(maxInstances: number) {
        this.maxInstances = maxInstances;
        // 각 인스턴스당 16개 플로트 (4x4 매트릭스) + 4개 플로트 (컬러)
        this.data = new Float32Array(maxInstances * 20);
        this.createBuffer();
    }
    
    private createBuffer() {
        this.buffer = gl.createBuffer();
        if (this.buffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW);
        }
    }
    
    updateData(instances: InstanceData[]) {
        let offset = 0;
        
        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            
            // 트랜스폼 매트릭스 (16개 플로트)
            const transform = instance.transform.m;
            for (let j = 0; j < 16; j++) {
                this.data[offset + j] = transform[j];
            }
            offset += 16;
            
            // 컬러 (4개 플로트)
            this.data[offset] = instance.color.r / 255;
            this.data[offset + 1] = instance.color.g / 255;
            this.data[offset + 2] = instance.color.b / 255;
            this.data[offset + 3] = instance.color.a / 255;
            offset += 4;
        }
        
        // GPU로 데이터 업로드
        if (this.buffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);
        }
    }
    
    bind() {
        if (this.buffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            
            // 인스턴스 어트리뷰트 설정
            this.setupInstanceAttributes();
        }
    }
    
    private setupInstanceAttributes() {
        const stride = 20 * 4; // 20개 플로트 * 4바이트
        
        // 트랜스폼 매트릭스 (4개 Vec4로 분할)
        for (let i = 0; i < 4; i++) {
            const location = 10 + i; // 어트리뷰트 로케이션
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, 4, gl.FLOAT, false, stride, i * 16);
            gl.vertexAttribDivisor(location, 1); // 인스턴스별로 다름
        }
        
        // 컬러
        const colorLocation = 14;
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, stride, 16 * 4);
        gl.vertexAttribDivisor(colorLocation, 1);
    }
}
```

---

## 3. 모바일 최적화 렌더링

### 3.1 LOD(Level of Detail) 시스템

```typescript
// [의도] 거리에 따른 모델 상세도 조절로 성능 최적화
// [책임] 동적 LOD 전환, 메시 교체, 성능 모니터링

enum LODLevel {
    HIGH = 0,    // 고상세 (가까운 거리)
    MEDIUM = 1,  // 중상세 (중간 거리)
    LOW = 2,     // 저상세 (먼 거리)
    BILLBOARD = 3 // 빌보드 (매우 먼 거리)
}

interface LODMesh {
    level: LODLevel;
    mesh: Mesh;
    material: Material;
    distance: number;
    triangleCount: number;
}

class LODSystem extends Component {
    private static instance: LODSystem;
    
    private lodObjects: Map<string, LODObject> = new Map();
    private camera: Camera | null = null;
    
    // LOD 설정
    private lodDistances = [5, 15, 30, 60]; // 각 LOD 레벨의 임계 거리
    private lodBias: number = 1.0; // LOD 거리 배율
    
    static getInstance(): LODSystem {
        return LODSystem.instance;
    }
    
    protected onLoad() {
        this.camera = Camera.main;
    }
    
    // LOD 오브젝트 등록
    registerLODObject(obj: LODObject) {
        this.lodObjects.set(obj.id, obj);
    }
    
    // LOD 오브젝트 제거
    unregisterLODObject(objId: string) {
        this.lodObjects.delete(objId);
    }
    
    protected update() {
        if (!this.camera) return;
        
        const cameraPos = this.camera.node.worldPosition;
        
        this.lodObjects.forEach(lodObj => {
            this.updateLOD(lodObj, cameraPos);
        });
    }
    
    private updateLOD(lodObj: LODObject, cameraPos: Vec3) {
        const distance = Vec3.distance(lodObj.worldPosition, cameraPos) * this.lodBias;
        const newLevel = this.calculateLODLevel(distance);
        
        if (newLevel !== lodObj.currentLevel) {
            this.switchLOD(lodObj, newLevel);
        }
    }
    
    private calculateLODLevel(distance: number): LODLevel {
        for (let i = 0; i < this.lodDistances.length; i++) {
            if (distance <= this.lodDistances[i]) {
                return i as LODLevel;
            }
        }
        return LODLevel.BILLBOARD;
    }
    
    private switchLOD(lodObj: LODObject, newLevel: LODLevel) {
        const lodMesh = lodObj.lodMeshes.get(newLevel);
        if (!lodMesh) {
            console.warn(`LOD level ${newLevel} not available for object ${lodObj.id}`);
            return;
        }
        
        // 현재 메시를 새 LOD 메시로 교체
        const renderer = lodObj.node.getComponent(MeshRenderer);
        if (renderer) {
            renderer.mesh = lodMesh.mesh;
            renderer.material = lodMesh.material;
        }
        
        lodObj.currentLevel = newLevel;
        
        // LOD 전환 통계 업데이트
        this.updateLODStats(lodObj, newLevel);
    }
    
    private updateLODStats(lodObj: LODObject, level: LODLevel) {
        // 성능 모니터링을 위한 통계 수집
        const stats = PerformanceMonitor.getInstance().getLODStats();
        stats.totalLODSwitches++;
        stats.currentLODDistribution[level]++;
    }
    
    // LOD 바이어스 설정 (성능 조절)
    setLODBias(bias: number) {
        this.lodBias = Math.max(0.1, Math.min(3.0, bias));
    }
    
    // 전체 LOD 통계
    getLODStats(): LODStats {
        const stats: LODStats = {
            totalObjects: this.lodObjects.size,
            levelCounts: { [LODLevel.HIGH]: 0, [LODLevel.MEDIUM]: 0, [LODLevel.LOW]: 0, [LODLevel.BILLBOARD]: 0 },
            triangleSaved: 0
        };
        
        this.lodObjects.forEach(obj => {
            stats.levelCounts[obj.currentLevel]++;
            
            // 최고 상세도와 현재 상세도의 삼각형 차이 계산
            const highLOD = obj.lodMeshes.get(LODLevel.HIGH);
            const currentLOD = obj.lodMeshes.get(obj.currentLevel);
            
            if (highLOD && currentLOD) {
                stats.triangleSaved += highLOD.triangleCount - currentLOD.triangleCount;
            }
        });
        
        return stats;
    }
}

class LODObject {
    readonly id: string;
    readonly node: Node;
    readonly lodMeshes: Map<LODLevel, LODMesh> = new Map();
    
    currentLevel: LODLevel = LODLevel.HIGH;
    
    constructor(id: string, node: Node) {
        this.id = id;
        this.node = node;
    }
    
    addLODMesh(level: LODLevel, mesh: Mesh, material: Material, distance: number) {
        const lodMesh: LODMesh = {
            level,
            mesh,
            material,
            distance,
            triangleCount: mesh.getTriangleCount ? mesh.getTriangleCount() : 0
        };
        
        this.lodMeshes.set(level, lodMesh);
    }
    
    get worldPosition(): Vec3 {
        return this.node.worldPosition;
    }
}

interface LODStats {
    totalObjects: number;
    levelCounts: { [key in LODLevel]: number };
    triangleSaved: number;
}
```

### 3.2 컬링 시스템

```typescript
// [의도] 화면에 보이지 않는 객체들을 렌더링에서 제외하여 성능 향상
// [책임] 프러스텀 컬링, 오클루전 컬링, 백페이스 컬링

class FrustumCuller extends Component {
    private camera: Camera | null = null;
    private frustumPlanes: Plane[] = [];
    
    protected onLoad() {
        this.camera = Camera.main;
    }
    
    // 프러스텀 평면 계산
    updateFrustum() {
        if (!this.camera) return;
        
        const viewProjectionMatrix = this.camera.projectionMatrix.multiply(this.camera.viewMatrix);
        this.frustumPlanes = this.extractFrustumPlanes(viewProjectionMatrix);
    }
    
    private extractFrustumPlanes(vpMatrix: Mat4): Plane[] {
        const planes: Plane[] = [];
        const m = vpMatrix.m;
        
        // 6개 프러스텀 평면 추출 (left, right, bottom, top, near, far)
        planes.push(new Plane(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12])); // left
        planes.push(new Plane(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12])); // right
        planes.push(new Plane(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13])); // bottom
        planes.push(new Plane(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13])); // top
        planes.push(new Plane(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14])); // near
        planes.push(new Plane(m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14])); // far
        
        // 평면 정규화
        planes.forEach(plane => plane.normalize());
        
        return planes;
    }
    
    // 바운딩 박스가 프러스텀 내부에 있는지 확인
    isInFrustum(bounds: AABB): boolean {
        return this.frustumPlanes.every(plane => {
            return plane.distanceToAABB(bounds) >= 0;
        });
    }
    
    // 바운딩 구가 프러스텀 내부에 있는지 확인
    isSphereInFrustum(center: Vec3, radius: number): boolean {
        return this.frustumPlanes.every(plane => {
            return plane.distanceToPoint(center) >= -radius;
        });
    }
    
    // 렌더 객체들 컬링
    cullRenderObjects(objects: RenderObject[]): RenderObject[] {
        this.updateFrustum();
        
        return objects.filter(obj => {
            const bounds = obj.mesh.getBounds();
            bounds.transform(obj.worldMatrix); // 월드 좌표로 변환
            
            return this.isInFrustum(bounds);
        });
    }
}

class Plane {
    normal: Vec3;
    distance: number;
    
    constructor(a: number, b: number, c: number, d: number) {
        this.normal = new Vec3(a, b, c);
        this.distance = d;
    }
    
    normalize() {
        const length = this.normal.length();
        this.normal.divideScalar(length);
        this.distance /= length;
    }
    
    distanceToPoint(point: Vec3): number {
        return Vec3.dot(this.normal, point) + this.distance;
    }
    
    distanceToAABB(aabb: AABB): number {
        const center = aabb.center;
        const extent = aabb.halfExtents;
        
        // 가장 가까운 점과 가장 먼 점 계산
        const r = Math.abs(extent.x * this.normal.x) +
                  Math.abs(extent.y * this.normal.y) +
                  Math.abs(extent.z * this.normal.z);
        
        const distance = this.distanceToPoint(center);
        
        if (distance < -r) return -1; // 완전히 뒤쪽
        if (distance > r) return 1;   // 완전히 앞쪽
        return 0; // 교차
    }
}

// 간단한 오클루전 컬링
class OcclusionCuller extends Component {
    private occluders: AABB[] = []; // 큰 오클루더들 (건물, 지형 등)
    
    addOccluder(bounds: AABB) {
        this.occluders.push(bounds);
    }
    
    removeOccluder(bounds: AABB) {
        const index = this.occluders.indexOf(bounds);
        if (index !== -1) {
            this.occluders.splice(index, 1);
        }
    }
    
    // 간단한 오클루전 테스트 (레이캐스팅 기반)
    isOccluded(objectBounds: AABB, cameraPos: Vec3): boolean {
        const objectCenter = objectBounds.center;
        const direction = objectCenter.subtract(cameraPos).normalize();
        const distance = Vec3.distance(objectCenter, cameraPos);
        
        // 카메라에서 객체까지의 레이와 오클루더들의 교차 검사
        for (const occluder of this.occluders) {
            if (this.rayIntersectsAABB(cameraPos, direction, distance, occluder)) {
                return true; // 오클루더에 의해 가려짐
            }
        }
        
        return false;
    }
    
    private rayIntersectsAABB(origin: Vec3, direction: Vec3, maxDistance: number, aabb: AABB): boolean {
        const min = aabb.center.subtract(aabb.halfExtents);
        const max = aabb.center.add(aabb.halfExtents);
        
        let tmin = 0;
        let tmax = maxDistance;
        
        for (let i = 0; i < 3; i++) {
            const invD = 1.0 / direction.get(i);
            let t0 = (min.get(i) - origin.get(i)) * invD;
            let t1 = (max.get(i) - origin.get(i)) * invD;
            
            if (invD < 0) {
                [t0, t1] = [t1, t0];
            }
            
            tmin = Math.max(tmin, t0);
            tmax = Math.min(tmax, t1);
            
            if (tmin > tmax) {
                return false;
            }
        }
        
        return true;
    }
}
```

---

**Part 1에서는 렌더링 시스템의 기본 구조, 3D 파이프라인, 모바일 최적화의 핵심 부분을 다뤘습니다. Part 2에서는 쉐이더 시스템, 라이팅, 애니메이션 시스템을 다루겠습니다.**