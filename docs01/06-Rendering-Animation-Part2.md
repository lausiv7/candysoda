# 🎨 06. 렌더링 및 애니메이션 시스템 Part 2 (Rendering & Animation System)

*Shadow Archer 모바일 3D 소울라이크 게임의 쉐이더, 라이팅 및 애니메이션 시스템*

---

## 📖 목차

4. [쉐이더 시스템](#4-쉐이더-시스템)
5. [라이팅 시스템](#5-라이팅-시스템)
6. [애니메이션 시스템](#6-애니메이션-시스템)
7. [이펙트 시스템](#7-이펙트-시스템)
8. [성능 프로파일링](#8-성능-프로파일링)

---

## 4. 쉐이더 시스템

### 4.1 커스텀 쉐이더 관리

```typescript
// [의도] 모바일 최적화된 커스텀 쉐이더 시스템
// [책임] 쉐이더 컴파일, 캐싱, 변형 관리

enum ShaderVariant {
    STANDARD = "standard",
    VERTEX_COLOR = "vertex_color",
    LIGHTMAP = "lightmap",
    SHADOW_RECEIVER = "shadow_receiver",
    INSTANCED = "instanced"
}

class ShaderSystem extends Component {
    private static instance: ShaderSystem;
    
    private shaderCache: Map<string, CompiledShader> = new Map();
    private shaderPrograms: Map<string, WebGLProgram> = new Map();
    private uniformLocations: Map<string, Map<string, WebGLUniformLocation>> = new Map();
    
    static getInstance(): ShaderSystem {
        return ShaderSystem.instance;
    }
    
    // 쉐이더 로드 및 컴파일
    async loadShader(name: string, variants: ShaderVariant[] = []): Promise<CompiledShader> {
        const cacheKey = this.getShaderCacheKey(name, variants);
        
        if (this.shaderCache.has(cacheKey)) {
            return this.shaderCache.get(cacheKey)!;
        }
        
        const vertexSource = await this.loadShaderSource(`${name}.vert`);
        const fragmentSource = await this.loadShaderSource(`${name}.frag`);
        
        // 변형에 따른 전처리
        const processedVertex = this.preprocessShader(vertexSource, variants);
        const processedFragment = this.preprocessShader(fragmentSource, variants);
        
        const compiledShader = await this.compileShader(processedVertex, processedFragment, cacheKey);
        
        this.shaderCache.set(cacheKey, compiledShader);
        return compiledShader;
    }
    
    private async loadShaderSource(filename: string): Promise<string> {
        const response = await fetch(`/assets/shaders/${filename}`);
        return response.text();
    }
    
    private preprocessShader(source: string, variants: ShaderVariant[]): string {
        let processed = source;
        
        // 변형별 define 추가
        variants.forEach(variant => {
            const define = `#define ${variant.toUpperCase()}\n`;
            processed = define + processed;
        });
        
        // 플랫폼별 precision 설정 (모바일)
        if (this.isMobile()) {
            processed = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + processed;
        }
        
        return processed;
    }
    
    private async compileShader(vertexSource: string, fragmentSource: string, name: string): Promise<CompiledShader> {
        const gl = director.root!.device.gl as WebGLRenderingContext;
        
        // 버텍스 쉐이더 컴파일
        const vertexShader = this.compileShaderStage(gl, gl.VERTEX_SHADER, vertexSource);
        
        // 프래그먼트 쉐이더 컴파일
        const fragmentShader = this.compileShaderStage(gl, gl.FRAGMENT_SHADER, fragmentSource);
        
        // 쉐이더 프로그램 링크
        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        // 링크 상태 확인
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            throw new Error(`Shader linking failed: ${error}`);
        }
        
        // 정리
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        
        // 유니폼 위치 캐시
        this.cacheUniformLocations(gl, program, name);
        
        this.shaderPrograms.set(name, program);
        
        return new CompiledShader(name, program);
    }
    
    private compileShaderStage(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${error}`);
        }
        
        return shader;
    }
    
    private cacheUniformLocations(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        const locations = new Map<string, WebGLUniformLocation>();
        
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(program, i);
            if (uniformInfo) {
                const location = gl.getUniformLocation(program, uniformInfo.name);
                if (location) {
                    locations.set(uniformInfo.name, location);
                }
            }
        }
        
        this.uniformLocations.set(name, locations);
    }
    
    getUniformLocation(shaderName: string, uniformName: string): WebGLUniformLocation | null {
        const shaderUniforms = this.uniformLocations.get(shaderName);
        return shaderUniforms ? shaderUniforms.get(uniformName) || null : null;
    }
}

class CompiledShader {
    readonly name: string;
    readonly program: WebGLProgram;
    
    constructor(name: string, program: WebGLProgram) {
        this.name = name;
        this.program = program;
    }
    
    bind() {
        const gl = director.root!.device.gl as WebGLRenderingContext;
        gl.useProgram(this.program);
    }
    
    setUniform(name: string, value: any) {
        const location = ShaderSystem.getInstance().getUniformLocation(this.name, name);
        if (!location) return;
        
        const gl = director.root!.device.gl as WebGLRenderingContext;
        
        if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (value instanceof Vec3) {
            gl.uniform3f(location, value.x, value.y, value.z);
        } else if (value instanceof Vec4 || value instanceof Color) {
            gl.uniform4f(location, value.x || value.r, value.y || value.g, value.z || value.b, value.w || value.a);
        } else if (value instanceof Mat4) {
            gl.uniformMatrix4fv(location, false, value.m);
        }
    }
}
```

### 4.2 표준 쉐이더 구현

```typescript
// [의도] 게임에서 사용할 기본 쉐이더들의 구현
// [책임] PBR, 툰 쉐이딩, 특수 효과 쉐이더 제공

class StandardShaders {
    // PBR 쉐이더 (Physically Based Rendering)
    static readonly PBR_VERTEX = `
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texCoord;
        attribute vec4 a_tangent;
        
        #ifdef INSTANCED
        attribute mat4 a_instanceMatrix;
        attribute vec4 a_instanceColor;
        #endif
        
        uniform mat4 u_worldMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projMatrix;
        uniform mat3 u_normalMatrix;
        
        varying vec3 v_worldPos;
        varying vec3 v_normal;
        varying vec2 v_texCoord;
        varying vec3 v_tangent;
        varying vec3 v_bitangent;
        
        #ifdef INSTANCED
        varying vec4 v_instanceColor;
        #endif
        
        void main() {
            #ifdef INSTANCED
            mat4 worldMatrix = a_instanceMatrix;
            v_instanceColor = a_instanceColor;
            #else
            mat4 worldMatrix = u_worldMatrix;
            #endif
            
            vec4 worldPos = worldMatrix * vec4(a_position, 1.0);
            v_worldPos = worldPos.xyz;
            
            v_normal = normalize(u_normalMatrix * a_normal);
            v_texCoord = a_texCoord;
            
            // 탄젠트 공간 계산
            v_tangent = normalize(u_normalMatrix * a_tangent.xyz);
            v_bitangent = cross(v_normal, v_tangent) * a_tangent.w;
            
            gl_Position = u_projMatrix * u_viewMatrix * worldPos;
        }
    `;
    
    static readonly PBR_FRAGMENT = `
        precision mediump float;
        
        varying vec3 v_worldPos;
        varying vec3 v_normal;
        varying vec2 v_texCoord;
        varying vec3 v_tangent;
        varying vec3 v_bitangent;
        
        #ifdef INSTANCED
        varying vec4 v_instanceColor;
        #endif
        
        uniform sampler2D u_albedoTexture;
        uniform sampler2D u_normalTexture;
        uniform sampler2D u_metallicRoughnessTexture;
        uniform sampler2D u_aoTexture;
        
        uniform vec3 u_cameraPos;
        uniform vec3 u_lightDir;
        uniform vec3 u_lightColor;
        uniform float u_lightIntensity;
        
        uniform vec4 u_albedoColor;
        uniform float u_metallic;
        uniform float u_roughness;
        uniform float u_aoStrength;
        
        const float PI = 3.14159265359;
        
        // Normal Distribution Function
        float DistributionGGX(vec3 N, vec3 H, float roughness) {
            float a = roughness * roughness;
            float a2 = a * a;
            float NdotH = max(dot(N, H), 0.0);
            float NdotH2 = NdotH * NdotH;
            
            float num = a2;
            float denom = (NdotH2 * (a2 - 1.0) + 1.0);
            denom = PI * denom * denom;
            
            return num / denom;
        }
        
        // Geometry Function
        float GeometrySchlickGGX(float NdotV, float roughness) {
            float r = (roughness + 1.0);
            float k = (r * r) / 8.0;
            
            float num = NdotV;
            float denom = NdotV * (1.0 - k) + k;
            
            return num / denom;
        }
        
        float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
            float NdotV = max(dot(N, V), 0.0);
            float NdotL = max(dot(N, L), 0.0);
            float ggx2 = GeometrySchlickGGX(NdotV, roughness);
            float ggx1 = GeometrySchlickGGX(NdotL, roughness);
            
            return ggx1 * ggx2;
        }
        
        // Fresnel Function
        vec3 fresnelSchlick(float cosTheta, vec3 F0) {
            return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
        }
        
        void main() {
            // 텍스처 샘플링
            vec4 albedo = texture2D(u_albedoTexture, v_texCoord) * u_albedoColor;
            vec3 metallicRoughness = texture2D(u_metallicRoughnessTexture, v_texCoord).rgb;
            float metallic = metallicRoughness.b * u_metallic;
            float roughness = metallicRoughness.g * u_roughness;
            float ao = texture2D(u_aoTexture, v_texCoord).r * u_aoStrength;
            
            // 노멀 맵 적용
            vec3 normalMap = texture2D(u_normalTexture, v_texCoord).rgb * 2.0 - 1.0;
            mat3 TBN = mat3(normalize(v_tangent), normalize(v_bitangent), normalize(v_normal));
            vec3 N = normalize(TBN * normalMap);
            
            vec3 V = normalize(u_cameraPos - v_worldPos);
            vec3 L = normalize(-u_lightDir);
            vec3 H = normalize(V + L);
            
            // PBR 계산
            vec3 F0 = mix(vec3(0.04), albedo.rgb, metallic);
            
            // Cook-Torrance BRDF
            float NDF = DistributionGGX(N, H, roughness);
            float G = GeometrySmith(N, V, L, roughness);
            vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
            
            vec3 kS = F;
            vec3 kD = vec3(1.0) - kS;
            kD *= 1.0 - metallic;
            
            vec3 numerator = NDF * G * F;
            float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
            vec3 specular = numerator / denominator;
            
            float NdotL = max(dot(N, L), 0.0);
            vec3 Lo = (kD * albedo.rgb / PI + specular) * u_lightColor * u_lightIntensity * NdotL;
            
            // 앰비언트 라이팅
            vec3 ambient = vec3(0.03) * albedo.rgb * ao;
            vec3 color = ambient + Lo;
            
            // HDR 톤 매핑
            color = color / (color + vec3(1.0));
            color = pow(color, vec3(1.0/2.2));
            
            #ifdef INSTANCED
            color *= v_instanceColor.rgb;
            #endif
            
            gl_FragColor = vec4(color, albedo.a);
        }
    `;
    
    // 툰 쉐이딩 쉐이더
    static readonly TOON_VERTEX = `
        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texCoord;
        
        uniform mat4 u_worldMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projMatrix;
        uniform mat3 u_normalMatrix;
        
        varying vec3 v_worldPos;
        varying vec3 v_normal;
        varying vec2 v_texCoord;
        
        void main() {
            vec4 worldPos = u_worldMatrix * vec4(a_position, 1.0);
            v_worldPos = worldPos.xyz;
            v_normal = normalize(u_normalMatrix * a_normal);
            v_texCoord = a_texCoord;
            
            gl_Position = u_projMatrix * u_viewMatrix * worldPos;
        }
    `;
    
    static readonly TOON_FRAGMENT = `
        precision mediump float;
        
        varying vec3 v_worldPos;
        varying vec3 v_normal;
        varying vec2 v_texCoord;
        
        uniform sampler2D u_mainTexture;
        uniform sampler2D u_rampTexture;
        
        uniform vec3 u_lightDir;
        uniform vec3 u_lightColor;
        uniform vec4 u_mainColor;
        uniform float u_outlineWidth;
        uniform vec4 u_outlineColor;
        
        void main() {
            vec4 mainTex = texture2D(u_mainTexture, v_texCoord);
            
            // 라이팅 계산
            vec3 N = normalize(v_normal);
            vec3 L = normalize(-u_lightDir);
            float NdotL = dot(N, L) * 0.5 + 0.5; // 범위를 0-1로 변환
            
            // 램프 텍스처를 사용한 툰 라이팅
            vec3 ramp = texture2D(u_rampTexture, vec2(NdotL, 0.5)).rgb;
            
            vec3 finalColor = mainTex.rgb * u_mainColor.rgb * ramp * u_lightColor;
            
            gl_FragColor = vec4(finalColor, mainTex.a * u_mainColor.a);
        }
    `;
}
```

---

## 5. 라이팅 시스템

### 5.1 동적 라이팅 시스템

```typescript
// [의도] 모바일 환경에 최적화된 동적 라이팅 시스템
// [책임] 라이트 관리, 그림자 처리, 성능 최적화

enum LightType {
    DIRECTIONAL = "directional",
    POINT = "point",
    SPOT = "spot"
}

class LightingSystem extends Component {
    private static instance: LightingSystem;
    
    private lights: Map<string, GameLight> = new Map();
    private shadowCasters: GameLight[] = [];
    
    // 라이팅 설정
    private maxActiveLights: number = 4;
    private shadowQuality: number = 1; // 0: 없음, 1: 단순, 2: PCF
    private ambientColor: Color = new Color(50, 50, 80, 255);
    
    static getInstance(): LightingSystem {
        return LightingSystem.instance;
    }
    
    // 라이트 등록
    registerLight(light: GameLight) {
        this.lights.set(light.id, light);
        
        if (light.castShadows) {
            this.shadowCasters.push(light);
        }
        
        this.updateLightPriorities();
    }
    
    // 라이트 제거
    unregisterLight(lightId: string) {
        const light = this.lights.get(lightId);
        if (light) {
            this.lights.delete(lightId);
            
            const shadowIndex = this.shadowCasters.indexOf(light);
            if (shadowIndex !== -1) {
                this.shadowCasters.splice(shadowIndex, 1);
            }
            
            this.updateLightPriorities();
        }
    }
    
    // 프레임별 라이팅 업데이트
    protected update() {
        this.updateActiveLights();
        this.updateShadows();
        this.updateGlobalLightingUniforms();
    }
    
    private updateActiveLights() {
        const cameraPos = Camera.main?.node.worldPosition || Vec3.ZERO;
        
        // 카메라와의 거리와 중요도를 기준으로 정렬
        const sortedLights = Array.from(this.lights.values())
            .filter(light => light.enabled)
            .sort((a, b) => {
                const distanceA = Vec3.distance(a.worldPosition, cameraPos);
                const distanceB = Vec3.distance(b.worldPosition, cameraPos);
                const priorityA = a.priority - distanceA * 0.1;
                const priorityB = b.priority - distanceB * 0.1;
                return priorityB - priorityA;
            });
        
        // 최대 라이트 수만큼 활성화
        for (let i = 0; i < sortedLights.length; i++) {
            sortedLights[i].isActive = i < this.maxActiveLights;
        }
    }
    
    private updateShadows() {
        if (this.shadowQuality === 0) return;
        
        // 가장 중요한 그림자 캐스터 선택 (보통 메인 디렉셔널 라이트)
        const mainShadowCaster = this.shadowCasters
            .filter(light => light.enabled && light.castShadows)
            .sort((a, b) => b.priority - a.priority)[0];
        
        if (mainShadowCaster) {
            this.updateShadowMap(mainShadowCaster);
        }
    }
    
    private updateShadowMap(light: GameLight) {
        // 섀도우 맵 업데이트 로직
        // 실제 구현에서는 Cocos Creator의 그림자 시스템을 사용
        const scene = director.getScene();
        if (scene && scene.renderScene) {
            const shadows = scene.renderScene.shadows;
            if (shadows.enabled) {
                shadows.shadowDistance = 50; // 그림자 거리 제한
                shadows.pcf = this.shadowQuality > 1 ? 1 : 0; // PCF 필터링
            }
        }
    }
    
    private updateGlobalLightingUniforms() {
        const activeLights = Array.from(this.lights.values())
            .filter(light => light.enabled && light.isActive);
        
        // 글로벌 쉐이더 유니폼 업데이트
        this.setGlobalUniform("u_ambientColor", this.ambientColor);
        this.setGlobalUniform("u_lightCount", activeLights.length);
        
        // 각 라이트 정보를 배열로 전달
        activeLights.forEach((light, index) => {
            this.setGlobalUniform(`u_lights[${index}].position`, light.worldPosition);
            this.setGlobalUniform(`u_lights[${index}].direction`, light.direction);
            this.setGlobalUniform(`u_lights[${index}].color`, light.color);
            this.setGlobalUniform(`u_lights[${index}].intensity`, light.intensity);
            this.setGlobalUniform(`u_lights[${index}].range`, light.range);
            this.setGlobalUniform(`u_lights[${index}].type`, light.type);
        });
    }
    
    private setGlobalUniform(name: string, value: any) {
        // 모든 활성 쉐이더에 유니폼 설정
        // 실제 구현에서는 Cocos Creator의 쉐이더 시스템 사용
    }
    
    // 품질 설정
    setShadowQuality(quality: number) {
        this.shadowQuality = Math.max(0, Math.min(2, quality));
    }
    
    setMaxActiveLights(count: number) {
        this.maxActiveLights = Math.max(1, Math.min(8, count));
    }
    
    setAmbientColor(color: Color) {
        this.ambientColor = color;
    }
}

class GameLight extends Component {
    @property(String)
    id: string = "";
    
    @property({ type: Enum(LightType) })
    type: LightType = LightType.DIRECTIONAL;
    
    @property(Color)
    color: Color = Color.WHITE;
    
    @property(Number)
    intensity: number = 1.0;
    
    @property(Number)
    range: number = 10;
    
    @property(Number)
    priority: number = 1; // 높을수록 우선순위
    
    @property(Boolean)
    castShadows: boolean = false;
    
    @property(Boolean)
    enabled: boolean = true;
    
    // 런타임 상태
    isActive: boolean = false;
    
    get worldPosition(): Vec3 {
        return this.node.worldPosition;
    }
    
    get direction(): Vec3 {
        return this.node.forward;
    }
    
    protected onLoad() {
        if (!this.id) {
            this.id = `light_${this.node.uuid}`;
        }
        
        LightingSystem.getInstance().registerLight(this);
    }
    
    protected onDestroy() {
        LightingSystem.getInstance().unregisterLight(this.id);
    }
    
    // 라이트 애니메이션 메서드들
    fadeIn(duration: number = 1.0) {
        const originalIntensity = this.intensity;
        this.intensity = 0;
        
        tween(this)
            .to(duration, { intensity: originalIntensity })
            .start();
    }
    
    fadeOut(duration: number = 1.0) {
        tween(this)
            .to(duration, { intensity: 0 })
            .start();
    }
    
    flicker(minIntensity: number = 0.5, maxIntensity: number = 1.5, speed: number = 2.0) {
        const originalIntensity = this.intensity;
        
        const flickerTween = tween(this)
            .to(0.1, { intensity: minIntensity })
            .to(0.1, { intensity: maxIntensity })
            .to(0.1, { intensity: originalIntensity })
            .delay(Math.random() * (1.0 / speed))
            .repeatForever();
        
        flickerTween.start();
        return flickerTween;
    }
}
```

### 5.2 베이크드 라이팅

```typescript
// [의도] 정적 환경을 위한 베이크된 라이팅 시스템
// [책임] 라이트맵 관리, GI 근사, 성능 최적화

class BakedLightingSystem extends Component {
    private static instance: BakedLightingSystem;
    
    private lightmaps: Map<string, Texture2D> = new Map();
    private lightmappedObjects: Map<string, LightmappedObject> = new Map();
    
    static getInstance(): BakedLightingSystem {
        return BakedLightingSystem.instance;
    }
    
    // 라이트맵 등록
    registerLightmap(id: string, lightmap: Texture2D) {
        this.lightmaps.set(id, lightmap);
    }
    
    // 라이트맵된 오브젝트 등록
    registerLightmappedObject(obj: LightmappedObject) {
        this.lightmappedObjects.set(obj.id, obj);
        this.applyLightmap(obj);
    }
    
    private applyLightmap(obj: LightmappedObject) {
        const lightmap = this.lightmaps.get(obj.lightmapId);
        if (!lightmap) return;
        
        const renderer = obj.node.getComponent(MeshRenderer);
        if (!renderer) return;
        
        // 라이트맵 쉐이더 변형 사용
        const material = renderer.material;
        if (material) {
            material.setProperty("lightmapTexture", lightmap);
            material.setProperty("lightmapUV", obj.lightmapUV);
            material.setProperty("lightmapIntensity", obj.lightmapIntensity);
            
            // 라이트맵 변형 활성화
            material.define("USE_LIGHTMAP", true);
        }
    }
    
    // 간접광 프로브 시스템 (간소화)
    private lightProbes: LightProbe[] = [];
    
    addLightProbe(position: Vec3, color: Color) {
        this.lightProbes.push(new LightProbe(position, color));
    }
    
    // 특정 위치의 간접광 색상 계산
    sampleIndirectLight(position: Vec3): Color {
        if (this.lightProbes.length === 0) {
            return new Color(80, 80, 120, 255); // 기본 앰비언트
        }
        
        // 가장 가까운 프로브들의 가중 평균
        const nearbyProbes = this.lightProbes
            .map(probe => ({
                probe,
                distance: Vec3.distance(probe.position, position)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 4); // 최대 4개 프로브 사용
        
        let totalWeight = 0;
        let resultColor = new Color(0, 0, 0, 0);
        
        nearbyProbes.forEach(({ probe, distance }) => {
            const weight = 1.0 / (distance + 0.1); // 거리 기반 가중치
            totalWeight += weight;
            
            resultColor.r += probe.color.r * weight;
            resultColor.g += probe.color.g * weight;
            resultColor.b += probe.color.b * weight;
        });
        
        if (totalWeight > 0) {
            resultColor.r /= totalWeight;
            resultColor.g /= totalWeight;
            resultColor.b /= totalWeight;
            resultColor.a = 255;
        }
        
        return resultColor;
    }
}

interface LightmappedObject {
    id: string;
    node: Node;
    lightmapId: string;
    lightmapUV: Vec4; // UV 오프셋과 스케일
    lightmapIntensity: number;
}

class LightProbe {
    position: Vec3;
    color: Color;
    
    constructor(position: Vec3, color: Color) {
        this.position = position;
        this.color = color;
    }
}
```

---

## 6. 애니메이션 시스템

### 6.1 스켈레탈 애니메이션

```typescript
// [의도] 캐릭터 애니메이션을 위한 고성능 스켈레탈 시스템
// [책임] 본 애니메이션, 블렌딩, 상태 머신 관리

class SkeletalAnimationSystem extends Component {
    @property(SkeletalAnimation)
    skeletalAnimation: SkeletalAnimation | null = null;
    
    private animationStates: Map<string, AnimationState> = new Map();
    private currentState: string = "";
    private targetState: string = "";
    private blendTime: number = 0.3;
    private blendTimer: number = 0;
    
    // 애니메이션 이벤트
    private animationEvents: Map<string, AnimationEvent[]> = new Map();
    
    protected onLoad() {
        this.setupAnimationStates();
        this.setupAnimationEvents();
    }
    
    private setupAnimationStates() {
        if (!this.skeletalAnimation) return;
        
        // 기본 애니메이션 상태들 설정
        this.addAnimationState("idle", {
            clip: "idle",
            loop: true,
            speed: 1.0,
            transitions: ["walk", "run", "attack", "dodge"]
        });
        
        this.addAnimationState("walk", {
            clip: "walk",
            loop: true,
            speed: 1.0,
            transitions: ["idle", "run", "attack"]
        });
        
        this.addAnimationState("attack", {
            clip: "attack",
            loop: false,
            speed: 1.2,
            transitions: ["idle", "combo_attack"]
        });
        
        this.addAnimationState("dodge", {
            clip: "dodge",
            loop: false,
            speed: 1.5,
            transitions: ["idle"]
        });
        
        // 기본 상태 설정
        this.currentState = "idle";
        this.playAnimation("idle");
    }
    
    private setupAnimationEvents() {
        // 공격 애니메이션의 히트 포인트
        this.addAnimationEvent("attack", 0.6, () => {
            TypedEventBus.getInstance().emit("AttackHitFrame", {
                attacker: this.node
            });
        });
        
        // 발걸음 소리
        this.addAnimationEvent("walk", 0.2, () => {
            this.playFootstepSound();
        });
        
        this.addAnimationEvent("walk", 0.7, () => {
            this.playFootstepSound();
        });
    }
    
    addAnimationState(name: string, config: AnimationStateConfig) {
        this.animationStates.set(name, {
            name: name,
            ...config
        });
    }
    
    addAnimationEvent(stateName: string, normalizedTime: number, callback: () => void) {
        if (!this.animationEvents.has(stateName)) {
            this.animationEvents.set(stateName, []);
        }
        
        this.animationEvents.get(stateName)!.push({
            normalizedTime: normalizedTime,
            callback: callback,
            triggered: false
        });
    }
    
    // 애니메이션 재생
    playAnimation(stateName: string, forceTransition: boolean = false) {
        const state = this.animationStates.get(stateName);
        if (!state || !this.skeletalAnimation) return false;
        
        // 전환 가능 여부 확인
        if (!forceTransition && !this.canTransitionTo(stateName)) {
            return false;
        }
        
        // 블렌딩 시작
        if (this.currentState !== stateName) {
            this.targetState = stateName;
            this.blendTimer = 0;
            
            // 즉시 전환하는 경우
            if (forceTransition || this.blendTime <= 0) {
                this.completeTransition();
            }
        }
        
        return true;
    }
    
    private canTransitionTo(targetState: string): boolean {
        const currentStateData = this.animationStates.get(this.currentState);
        return currentStateData ? currentStateData.transitions.includes(targetState) : true;
    }
    
    protected update(deltaTime: number) {
        this.updateBlending(deltaTime);
        this.updateAnimationEvents();
    }
    
    private updateBlending(deltaTime: number) {
        if (this.targetState && this.targetState !== this.currentState) {
            this.blendTimer += deltaTime;
            
            const blendRatio = Math.min(this.blendTimer / this.blendTime, 1.0);
            
            if (blendRatio >= 1.0) {
                this.completeTransition();
            } else {
                // 블렌딩 가중치 설정
                this.updateBlendWeights(blendRatio);
            }
        }
    }
    
    private completeTransition() {
        if (!this.targetState || !this.skeletalAnimation) return;
        
        const targetStateData = this.animationStates.get(this.targetState);
        if (!targetStateData) return;
        
        // 새 애니메이션 재생
        const animState = this.skeletalAnimation.getState(targetStateData.clip);
        if (animState) {
            animState.play();
            animState.setTime(0);
            animState.speed = targetStateData.speed;
            animState.wrapMode = targetStateData.loop ? AnimationClip.WrapMode.Loop : AnimationClip.WrapMode.Normal;
        }
        
        this.currentState = this.targetState;
        this.targetState = "";
        this.blendTimer = 0;
        
        // 애니메이션 이벤트 초기화
        this.resetAnimationEvents(this.currentState);
    }
    
    private updateBlendWeights(blendRatio: number) {
        if (!this.skeletalAnimation) return;
        
        const currentStateData = this.animationStates.get(this.currentState);
        const targetStateData = this.animationStates.get(this.targetState);
        
        if (currentStateData && targetStateData) {
            const currentAnimState = this.skeletalAnimation.getState(currentStateData.clip);
            const targetAnimState = this.skeletalAnimation.getState(targetStateData.clip);
            
            if (currentAnimState && targetAnimState) {
                currentAnimState.weight = 1.0 - blendRatio;
                targetAnimState.weight = blendRatio;
                
                if (targetAnimState.weight > 0 && !targetAnimState.isPlaying) {
                    targetAnimState.play();
                }
            }
        }
    }
    
    private updateAnimationEvents() {
        const events = this.animationEvents.get(this.currentState);
        if (!events || !this.skeletalAnimation) return;
        
        const currentStateData = this.animationStates.get(this.currentState);
        if (!currentStateData) return;
        
        const animState = this.skeletalAnimation.getState(currentStateData.clip);
        if (!animState || !animState.isPlaying) return;
        
        const normalizedTime = animState.time / animState.duration;
        
        events.forEach(event => {
            if (!event.triggered && normalizedTime >= event.normalizedTime) {
                event.callback();
                event.triggered = true;
            }
        });
    }
    
    private resetAnimationEvents(stateName: string) {
        const events = this.animationEvents.get(stateName);
        if (events) {
            events.forEach(event => {
                event.triggered = false;
            });
        }
    }
    
    private playFootstepSound() {
        AudioManager.getInstance().playSound("footstep", {
            volume: 0.3,
            randomPitch: true
        });
    }
    
    // 현재 애니메이션 상태 확인
    getCurrentState(): string {
        return this.currentState;
    }
    
    isTransitioning(): boolean {
        return this.targetState !== "";
    }
    
    // 애니메이션 속도 조절
    setAnimationSpeed(speed: number) {
        if (!this.skeletalAnimation) return;
        
        const currentStateData = this.animationStates.get(this.currentState);
        if (currentStateData) {
            const animState = this.skeletalAnimation.getState(currentStateData.clip);
            if (animState) {
                animState.speed = speed;
            }
        }
    }
}

interface AnimationStateConfig {
    clip: string;
    loop: boolean;
    speed: number;
    transitions: string[];
}

interface AnimationState extends AnimationStateConfig {
    name: string;
}

interface AnimationEvent {
    normalizedTime: number;
    callback: () => void;
    triggered: boolean;
}
```

### 6.2 절차적 애니메이션

```typescript
// [의도] 동적이고 반응적인 애니메이션 효과를 위한 절차적 시스템
// [책임] IK, 물리 기반 애니메이션, 반응형 애니메이션

class ProceduralAnimationSystem extends Component {
    // 역 운동학(IK) 시스템
    private ikChains: Map<string, IKChain> = new Map();
    
    // 물리 기반 애니메이션
    private springBones: SpringBone[] = [];
    
    // 반응형 애니메이션
    private lookAtTargets: Map<string, LookAtTarget> = new Map();
    
    protected onLoad() {
        this.setupIKChains();
        this.setupSpringBones();
    }
    
    private setupIKChains() {
        // 발 IK (지형에 발 맞추기)
        this.addIKChain("leftFoot", {
            bones: ["leftThigh", "leftShin", "leftFoot"],
            target: null,
            weight: 1.0,
            iterations: 3
        });
        
        this.addIKChain("rightFoot", {
            bones: ["rightThigh", "rightShin", "rightFoot"],
            target: null,
            weight: 1.0,
            iterations: 3
        });
        
        // 손 IK (무기 잡기)
        this.addIKChain("rightHand", {
            bones: ["rightUpperArm", "rightForearm", "rightHand"],
            target: null,
            weight: 0.8,
            iterations: 2
        });
    }
    
    private setupSpringBones() {
        // 머리카락, 장신구 등의 스프링 본
        const hairBones = this.findBonesByPrefix("hair_");
        hairBones.forEach(bone => {
            this.springBones.push(new SpringBone(bone, {
                stiffness: 0.1,
                damping: 0.8,
                gravity: new Vec3(0, -9.8, 0)
            }));
        });
    }
    
    addIKChain(name: string, config: IKChainConfig) {
        this.ikChains.set(name, new IKChain(name, config));
    }
    
    // IK 타겟 설정
    setIKTarget(chainName: string, target: Vec3 | Node | null, weight: number = 1.0) {
        const chain = this.ikChains.get(chainName);
        if (chain) {
            chain.setTarget(target, weight);
        }
    }
    
    // 룩앳 타겟 설정 (머리나 눈이 특정 방향을 보도록)
    setLookAtTarget(boneName: string, target: Vec3 | Node | null, weight: number = 1.0) {
        if (target) {
            this.lookAtTargets.set(boneName, new LookAtTarget(boneName, target, weight));
        } else {
            this.lookAtTargets.delete(boneName);
        }
    }
    
    protected lateUpdate(deltaTime: number) {
        // IK 계산 (애니메이션 후에 실행)
        this.updateIK();
        
        // 스프링 본 업데이트
        this.updateSpringBones(deltaTime);
        
        // 룩앳 업데이트
        this.updateLookAt();
    }
    
    private updateIK() {
        this.ikChains.forEach(chain => {
            chain.solve();
        });
    }
    
    private updateSpringBones(deltaTime: number) {
        this.springBones.forEach(springBone => {
            springBone.update(deltaTime);
        });
    }
    
    private updateLookAt() {
        this.lookAtTargets.forEach(lookAt => {
            lookAt.update();
        });
    }
    
    // 지형에 발 맞추기 (Foot IK)
    enableFootIK(enable: boolean) {
        const leftFootChain = this.ikChains.get("leftFoot");
        const rightFootChain = this.ikChains.get("rightFoot");
        
        if (enable) {
            // 발 위치를 지형에 맞춰 조정
            this.updateFootIKTargets();
        } else {
            // IK 비활성화
            if (leftFootChain) leftFootChain.setWeight(0);
            if (rightFootChain) rightFootChain.setWeight(0);
        }
    }
    
    private updateFootIKTargets() {
        const leftFootBone = this.findBone("leftFoot");
        const rightFootBone = this.findBone("rightFoot");
        
        if (leftFootBone) {
            const groundPos = this.getGroundPosition(leftFootBone.worldPosition);
            this.setIKTarget("leftFoot", groundPos, 1.0);
        }
        
        if (rightFootBone) {
            const groundPos = this.getGroundPosition(rightFootBone.worldPosition);  
            this.setIKTarget("rightFoot", groundPos, 1.0);
        }
    }
    
    private getGroundPosition(footPos: Vec3): Vec3 {
        // 레이캐스팅으로 지면 높이 찾기
        const rayStart = new Vec3(footPos.x, footPos.y + 1, footPos.z);
        const rayDirection = new Vec3(0, -1, 0);
        
        const hits = PhysicsSystem.instance.raycast(rayStart, rayDirection, 2, 
            CollisionLayers.GROUND);
        
        if (hits.length > 0) {
            return hits[0].point;
        }
        
        return footPos; // 지면을 찾지 못하면 원래 위치
    }
}

class IKChain {
    name: string;
    bones: Node[] = [];
    target: Vec3 | Node | null = null;
    weight: number = 1.0;
    iterations: number = 3;
    
    constructor(name: string, config: IKChainConfig) {
        this.name = name;
        this.weight = config.weight;
        this.iterations = config.iterations;
        
        // 본 노드들 찾기
        config.bones.forEach(boneName => {
            const bone = this.findBone(boneName);
            if (bone) {
                this.bones.push(bone);
            }
        });
    }
    
    setTarget(target: Vec3 | Node | null, weight: number = 1.0) {
        this.target = target;
        this.weight = weight;
    }
    
    setWeight(weight: number) {
        this.weight = weight;
    }
    
    solve() {
        if (!this.target || this.bones.length < 2 || this.weight <= 0) return;
        
        const targetPos = this.target instanceof Node ? this.target.worldPosition : this.target;
        
        // FABRIK 알고리즘 사용
        this.solveFABRIK(targetPos);
    }
    
    private solveFABRIK(targetPos: Vec3) {
        const positions = this.bones.map(bone => bone.worldPosition);
        const distances = [];
        
        // 본 간 거리 계산
        for (let i = 0; i < positions.length - 1; i++) {
            distances.push(Vec3.distance(positions[i], positions[i + 1]));
        }
        
        // Forward reaching
        positions[positions.length - 1] = targetPos;
        for (let i = positions.length - 2; i >= 0; i--) {
            const direction = positions[i].subtract(positions[i + 1]).normalize();
            positions[i] = positions[i + 1].add(direction.multiplyScalar(distances[i]));
        }
        
        // Backward reaching
        positions[0] = this.bones[0].worldPosition; // 루트는 고정
        for (let i = 1; i < positions.length; i++) {
            const direction = positions[i].subtract(positions[i - 1]).normalize();
            positions[i] = positions[i - 1].add(direction.multiplyScalar(distances[i - 1]));
        }
        
        // 계산된 위치를 본에 적용
        for (let i = 0; i < this.bones.length; i++) {
            const targetPos = Vec3.lerp(this.bones[i].worldPosition, positions[i], this.weight);
            this.bones[i].worldPosition = targetPos;
        }
    }
}

class SpringBone {
    bone: Node;
    config: SpringBoneConfig;
    
    private velocity: Vec3 = Vec3.ZERO;
    private originalLocalPosition: Vec3;
    
    constructor(bone: Node, config: SpringBoneConfig) {
        this.bone = bone;
        this.config = config;
        this.originalLocalPosition = bone.position;
    }
    
    update(deltaTime: number) {
        const currentPos = this.bone.position;
        const targetPos = this.originalLocalPosition;
        
        // 스프링 힘 계산
        const displacement = targetPos.subtract(currentPos);
        const springForce = displacement.multiplyScalar(this.config.stiffness);
        
        // 댐핑 적용
        const dampingForce = this.velocity.multiplyScalar(-this.config.damping);
        
        // 중력 적용
        const gravity = this.config.gravity.multiplyScalar(deltaTime);
        
        // 최종 힘
        const totalForce = springForce.add(dampingForce).add(gravity);
        
        // 속도 및 위치 업데이트
        this.velocity = this.velocity.add(totalForce.multiplyScalar(deltaTime));
        const newPosition = currentPos.add(this.velocity.multiplyScalar(deltaTime));
        
        this.bone.position = newPosition;
    }
}

interface IKChainConfig {
    bones: string[];
    target: Vec3 | Node | null;
    weight: number;
    iterations: number;
}

interface SpringBoneConfig {
    stiffness: number;
    damping: number;
    gravity: Vec3;
}

class LookAtTarget {
    boneName: string;
    target: Vec3 | Node;
    weight: number;
    
    constructor(boneName: string, target: Vec3 | Node, weight: number) {
        this.boneName = boneName;
        this.target = target;
        this.weight = weight;
    }
    
    update() {
        const bone = this.findBone(this.boneName);
        if (!bone) return;
        
        const targetPos = this.target instanceof Node ? this.target.worldPosition : this.target;
        const direction = targetPos.subtract(bone.worldPosition).normalize();
        
        // 목표 방향으로 회전
        const targetRotation = Quat.fromViewUp(direction, Vec3.UP);
        const currentRotation = bone.worldRotation;
        
        const finalRotation = Quat.slerp(currentRotation, targetRotation, this.weight);
        bone.worldRotation = finalRotation;
    }
}
```

---

## 7. 이펙트 시스템

### 7.1 파티클 이펙트 시스템

```typescript
// [의도] 시각적 임팩트를 위한 고품질 파티클 이펙트 시스템
// [책임] 파티클 생성, 관리, 최적화

class EffectManager extends Component {
    private static instance: EffectManager;
    
    private effectPools: Map<string, EffectPool> = new Map();
    private activeEffects: Set<EffectInstance> = new Set();
    private effectTemplates: Map<string, EffectTemplate> = new Map();
    
    // 성능 제한
    private maxActiveEffects: number = 20;
    private particleDensity: number = 1.0;
    
    static getInstance(): EffectManager {
        return EffectManager.instance;
    }
    
    protected onLoad() {
        this.setupEffectTemplates();
        this.initializeEffectPools();
    }
    
    private setupEffectTemplates() {
        // 타격 이펙트
        this.effectTemplates.set("hit_impact", {
            particleSystem: {
                startLifetime: 0.5,
                startSpeed: 3,
                startSize: 0.2,
                startColor: Color.ORANGE,
                maxParticles: 20,
                emissionRate: 40,
                shape: "sphere",
                shapeRadius: 0.1
            },
            duration: 0.3,
            autoDestroy: true
        });
        
        // 크리티컬 히트 이펙트
        this.effectTemplates.set("critical_hit", {
            particleSystem: {
                startLifetime: 0.8,
                startSpeed: 5,
                startSize: 0.3,
                startColor: Color.YELLOW,
                maxParticles: 30,
                emissionRate: 60,
                shape: "cone",
                shapeRadius: 0.2
            },
            duration: 0.5,
            autoDestroy: true
        });
        
        // 화살 궤적 이펙트
        this.effectTemplates.set("arrow_trail", {
            particleSystem: {
                startLifetime: 0.3,
                startSpeed: 1,
                startSize: 0.1,
                startColor: Color.WHITE,
                maxParticles: 10,
                emissionRate: 30,
                shape: "line"
            },
            duration: -1, // 무한 지속 (수동 제거)
            autoDestroy: false
        });
    }
    
    private initializeEffectPools() {
        this.effectTemplates.forEach((template, name) => {
            const pool = new EffectPool(name, template, 5); // 5개씩 풀링
            this.effectPools.set(name, pool);
        });
    }
    
    // 이펙트 재생
    playEffect(effectName: string, position: Vec3, rotation?: Quat, scale?: Vec3): EffectInstance | null {
        const pool = this.effectPools.get(effectName);
        if (!pool) {
            console.warn(`Effect not found: ${effectName}`);
            return null;
        }
        
        // 최대 이펙트 수 제한
        if (this.activeEffects.size >= this.maxActiveEffects) {
            this.removeOldestEffect();
        }
        
        const effect = pool.spawn();
        if (!effect) return null;
        
        // 위치 및 회전 설정
        effect.node.worldPosition = position;
        if (rotation) effect.node.worldRotation = rotation;
        if (scale) effect.node.worldScale = scale;
        
        // 파티클 밀도 적용
        this.applyParticleDensity(effect);
        
        // 재생 시작
        effect.play();
        
        this.activeEffects.add(effect);
        
        // 자동 제거 스케줄
        if (effect.template.autoDestroy && effect.template.duration > 0) {
            this.scheduleOnce(() => {
                this.stopEffect(effect);
            }, effect.template.duration);
        }
        
        return effect;
    }
    
    // 지속적인 이펙트 재생 (트레일 등)
    playPersistentEffect(effectName: string, parent: Node): EffectInstance | null {
        const effect = this.playEffect(effectName, Vec3.ZERO);
        if (effect) {
            effect.node.parent = parent;
            effect.isPersistent = true;
        }
        return effect;
    }
    
    // 이펙트 정지
    stopEffect(effect: EffectInstance) {
        if (!this.activeEffects.has(effect)) return;
        
        effect.stop();
        this.activeEffects.delete(effect);
        
        const pool = this.effectPools.get(effect.templateName);
        if (pool) {
            pool.despawn(effect);
        }
    }
    
    // 지속적인 이펙트 정지
    stopPersistentEffect(effectName: string, parent: Node) {
        this.activeEffects.forEach(effect => {
            if (effect.templateName === effectName && effect.node.parent === parent) {
                this.stopEffect(effect);
            }
        });
    }
    
    private removeOldestEffect() {
        // 가장 오래된 자동 제거 이펙트를 찾아서 제거
        let oldestEffect: EffectInstance | null = null;
        let oldestTime = Infinity;
        
        this.activeEffects.forEach(effect => {
            if (effect.template.autoDestroy && effect.playTime < oldestTime) {
                oldestTime = effect.playTime;
                oldestEffect = effect;
            }
        });
        
        if (oldestEffect) {
            this.stopEffect(oldestEffect);
        }
    }
    
    private applyParticleDensity(effect: EffectInstance) {
        const particleSystem = effect.particleSystem;
        if (particleSystem) {
            // 파티클 밀도에 따라 최대 파티클 수 조정
            const originalMaxParticles = effect.template.particleSystem.maxParticles;
            particleSystem.capacity = Math.max(1, Math.floor(originalMaxParticles * this.particleDensity));
            
            // 방출률도 조정
            const originalRate = effect.template.particleSystem.emissionRate;
            particleSystem.rateOverTime = originalRate * this.particleDensity;
        }
    }
    
    // 파티클 밀도 설정 (성능 조절)
    setParticleDensity(density: number) {
        this.particleDensity = Math.max(0.1, Math.min(1.0, density));
        
        // 현재 활성 이펙트들에 적용
        this.activeEffects.forEach(effect => {
            this.applyParticleDensity(effect);
        });
    }
    
    // 모든 이펙트 정리
    clearAllEffects() {
        const effects = Array.from(this.activeEffects);
        effects.forEach(effect => {
            this.stopEffect(effect);
        });
    }
    
    protected update() {
        // 완료된 이펙트 자동 정리
        const completedEffects: EffectInstance[] = [];
        
        this.activeEffects.forEach(effect => {
            effect.updatePlayTime();
            
            if (effect.isComplete() && effect.template.autoDestroy) {
                completedEffects.push(effect);
            }
        });
        
        completedEffects.forEach(effect => {
            this.stopEffect(effect);
        });
    }
}

class EffectInstance {
    readonly templateName: string;
    readonly template: EffectTemplate;
    readonly node: Node;
    readonly particleSystem: ParticleSystem;
    
    isPersistent: boolean = false;
    playTime: number = 0;
    
    constructor(templateName: string, template: EffectTemplate, node: Node) {
        this.templateName = templateName;
        this.template = template;
        this.node = node;
        this.particleSystem = node.getComponent(ParticleSystem)!;
    }
    
    play() {
        this.particleSystem.play();
        this.playTime = 0;
    }
    
    stop() {
        this.particleSystem.stop();
    }
    
    updatePlayTime() {
        this.playTime += director.getDeltaTime();
    }
    
    isComplete(): boolean {
        return !this.particleSystem.isAlive() && !this.particleSystem.isEmitting();
    }
}

class EffectPool {
    private templateName: string;
    private template: EffectTemplate;
    private pool: EffectInstance[] = [];
    private activeCount: number = 0;
    
    constructor(templateName: string, template: EffectTemplate, poolSize: number) {
        this.templateName = templateName;
        this.template = template;
        
        // 풀 초기화
        for (let i = 0; i < poolSize; i++) {
            const instance = this.createInstance();
            this.pool.push(instance);
        }
    }
    
    private createInstance(): EffectInstance {
        const node = new Node(this.templateName);
        const particleSystem = node.addComponent(ParticleSystem);
        
        // 템플릿 설정 적용
        this.applyTemplate(particleSystem, this.template.particleSystem);
        
        node.active = false;
        return new EffectInstance(this.templateName, this.template, node);
    }
    
    private applyTemplate(particleSystem: ParticleSystem, config: any) {
        // 파티클 시스템 설정 적용
        particleSystem.capacity = config.maxParticles;
        particleSystem.rateOverTime = config.emissionRate;
        
        // 기타 설정들...
    }
    
    spawn(): EffectInstance | null {
        if (this.pool.length > 0) {
            const instance = this.pool.pop()!;
            instance.node.active = true;
            this.activeCount++;
            return instance;
        }
        
        // 풀이 비어있으면 새로 생성
        const instance = this.createInstance();
        instance.node.active = true;
        this.activeCount++;
        return instance;
    }
    
    despawn(instance: EffectInstance) {
        instance.node.active = false;
        this.pool.push(instance);
        this.activeCount--;
    }
}

interface EffectTemplate {
    particleSystem: {
        startLifetime: number;
        startSpeed: number;
        startSize: number;
        startColor: Color;
        maxParticles: number;
        emissionRate: number;
        shape: string;
        shapeRadius?: number;
    };
    duration: number; // -1은 무한
    autoDestroy: boolean;
}
```

---

## 8. 성능 프로파일링

### 8.1 렌더링 성능 모니터

```typescript
// [의도] 실시간 렌더링 성능 모니터링 및 자동 최적화
// [책임] FPS, 드로우콜, 메모리 사용량 추적

class RenderingProfiler extends Component {
    private static instance: RenderingProfiler;
    
    private frameTimeHistory: number[] = [];
    private readonly HISTORY_SIZE = 60; // 1초간 기록
    
    private currentMetrics: RenderingMetrics = {
        fps: 60,
        frameTime: 16.67,
        drawCalls: 0,
        triangles: 0,
        textureMemory: 0,
        shaderSwitches: 0
    };
    
    private performanceTargets: PerformanceTargets = {
        targetFPS: 30,
        maxDrawCalls: 100,
        maxTriangles: 50000,
        maxTextureMemory: 100 // MB
    };
    
    static getInstance(): RenderingProfiler {
        return RenderingProfiler.instance;
    }
    
    protected update() {
        this.updateFrameTime();
        this.updateRenderingMetrics();
        this.checkPerformanceTargets();
    }
    
    private updateFrameTime() {
        const currentTime = performance.now();
        const deltaTime = currentTime - (this.lastFrameTime || currentTime);
        this.lastFrameTime = currentTime;
        
        this.frameTimeHistory.push(deltaTime);
        if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
            this.frameTimeHistory.shift();
        }
        
        // 평균 FPS 계산
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        this.currentMetrics.fps = 1000 / avgFrameTime;
        this.currentMetrics.frameTime = avgFrameTime;
    }
    
    private updateRenderingMetrics() {
        // WebGL 통계 수집
        const gl = director.root!.device.gl as WebGLRenderingContext;
        
        // 드로우콜 수 (추정)
        this.currentMetrics.drawCalls = this.estimateDrawCalls();
        
        // 삼각형 수 (추정)
        this.currentMetrics.triangles = this.estimateTriangles();
        
        // 텍스처 메모리 사용량
        this.currentMetrics.textureMemory = this.estimateTextureMemory();
        
        // 쉐이더 전환 횟수
        this.currentMetrics.shaderSwitches = this.estimateShaderSwitches();
    }
    
    private checkPerformanceTargets() {
        let needsOptimization = false;
        
        if (this.currentMetrics.fps < this.performanceTargets.targetFPS) {
            console.warn(`Low FPS: ${this.currentMetrics.fps.toFixed(1)}`);
            needsOptimization = true;
        }
        
        if (this.currentMetrics.drawCalls > this.performanceTargets.maxDrawCalls) {
            console.warn(`High draw calls: ${this.currentMetrics.drawCalls}`);
            needsOptimization = true;
        }
        
        if (this.currentMetrics.triangles > this.performanceTargets.maxTriangles) {
            console.warn(`High triangle count: ${this.currentMetrics.triangles}`);
            needsOptimization = true;
        }
        
        if (needsOptimization) {
            this.triggerAutomaticOptimization();
        }
    }
    
    private triggerAutomaticOptimization() {
        const renderingSystem = RenderingSystem.getInstance();
        
        // 자동 품질 하향 조정
        if (this.currentMetrics.fps < this.performanceTargets.targetFPS * 0.8) {
            renderingSystem.lowerQuality();
        }
        
        // LOD 바이어스 조정
        const lodSystem = LODSystem.getInstance();
        lodSystem.setLODBias(1.2); // 더 빨리 낮은 LOD로 전환
        
        // 파티클 밀도 감소
        const effectManager = EffectManager.getInstance();
        effectManager.setParticleDensity(0.7);
    }
    
    // 성능 리포트 생성
    generatePerformanceReport(): PerformanceReport {
        const report: PerformanceReport = {
            timestamp: Date.now(),
            metrics: { ...this.currentMetrics },
            targets: { ...this.performanceTargets },
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    private generateRecommendations(): string[] {
        const recommendations: string[] = [];
        
        if (this.currentMetrics.fps < this.performanceTargets.targetFPS) {
            recommendations.push("낮은 FPS - 그래픽 품질을 낮추거나 LOD 시스템을 조정하세요");
        }
        
        if (this.currentMetrics.drawCalls > this.performanceTargets.maxDrawCalls) {
            recommendations.push("드로우콜이 많음 - 배치 렌더링이나 인스턴싱을 고려하세요");
        }
        
        if (this.currentMetrics.textureMemory > this.performanceTargets.maxTextureMemory) {
            recommendations.push("텍스처 메모리 사용량이 높음 - 텍스처 압축이나 아틀라싱을 고려하세요");
        }
        
        return recommendations;
    }
    
    getCurrentMetrics(): RenderingMetrics {
        return { ...this.currentMetrics };
    }
}

interface RenderingMetrics {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    textureMemory: number;
    shaderSwitches: number;
}

interface PerformanceTargets {
    targetFPS: number;
    maxDrawCalls: number;
    maxTriangles: number;
    maxTextureMemory: number;
}

interface PerformanceReport {
    timestamp: number;
    metrics: RenderingMetrics;
    targets: PerformanceTargets;
    recommendations: string[];
}
```

---

## 🔗 관련 문서

- [03. 핵심 시스템 설계](./03-Core-System-Design.md)
- [04. 전투 시스템 설계](./04-Combat-System-Design.md)
- [05. AI 시스템 설계](./05-AI-System-Design.md)
- [07. UI/UX 시스템 설계](./07-UI-UX-System.md)

---

**Part 2에서는 쉐이더 시스템, 라이팅, 애니메이션, 이펙트 시스템과 성능 프로파일링을 다뤘습니다. 이로써 Shadow Archer의 렌더링 및 애니메이션 시스템이 완성되었습니다.**