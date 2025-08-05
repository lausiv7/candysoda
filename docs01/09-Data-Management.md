# 데이터 관리 시스템 설계

## 개요

Shadow Archer 모바일 3D 소울라이크 게임의 데이터 관리 시스템 설계서입니다. 효율적인 데이터 저장, 로딩, 동기화 및 보안을 다루는 포괄적인 시스템을 설계합니다.

## 설계 원칙

### 데이터 무결성
- 트랜잭션 기반 데이터 처리
- 자동 백업 및 복구 시스템
- 데이터 검증 및 정합성 체크

### 성능 최적화
- 계층적 캐싱 시스템
- 지연 로딩 및 프리로딩
- 데이터 압축 및 최적화

### 확장성
- 모듈화된 데이터 구조
- 스키마 버전 관리
- 클라우드 확장 대비

## 시스템 아키텍처

### 1. 데이터 매니저 코어

```typescript
// [의도] 모든 데이터 시스템의 중앙 허브로서 데이터 흐름을 총괄
// [책임] 데이터 생명주기 관리, 캐싱 전략, 동기화, 보안, 성능 최적화
export class DataManager {
    private static instance: DataManager;
    private storage: StorageManager;
    private cache: CacheManager;
    private serializer: DataSerializer;
    private validator: DataValidator;
    private synchronizer: DataSynchronizer;
    private encryptor: DataEncryptor;
    private migrator: SchemaMigrator;
    
    private constructor() {
        this.initializeComponents();
        this.setupEventHandlers();
    }
    
    static getInstance(): DataManager {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }
    
    private initializeComponents(): void {
        this.storage = new StorageManager();
        this.cache = new CacheManager();
        this.serializer = new DataSerializer();
        this.validator = new DataValidator();
        this.synchronizer = new DataSynchronizer();
        this.encryptor = new DataEncryptor();
        this.migrator = new SchemaMigrator();
    }
    
    private setupEventHandlers(): void {
        // 게임 상태 변화 이벤트
        EventBus.getInstance().on('game_save_requested', this.saveGameData.bind(this));
        EventBus.getInstance().on('game_load_requested', this.loadGameData.bind(this));
        
        // 자동 저장 이벤트
        EventBus.getInstance().on('auto_save_trigger', this.performAutoSave.bind(this));
        
        // 데이터 동기화 이벤트
        EventBus.getInstance().on('sync_requested', this.syncData.bind(this));
    }
    
    // 게임 데이터 저장
    async saveGameData(saveSlot: number = 0): Promise<boolean> {
        try {
            // 현재 게임 상태 수집
            const gameData = this.collectGameData();
            
            // 데이터 검증
            if (!this.validator.validateGameData(gameData)) {
                throw new Error('Invalid game data');
            }
            
            // 데이터 직렬화
            const serializedData = this.serializer.serialize(gameData);
            
            // 데이터 암호화
            const encryptedData = this.encryptor.encrypt(serializedData);
            
            // 저장소에 저장
            const success = await this.storage.save(`save_${saveSlot}`, encryptedData);
            
            if (success) {
                // 캐시 업데이트
                this.cache.set(`save_${saveSlot}`, gameData);
                
                // 클라우드 동기화 (선택적)
                if (this.shouldSyncToCloud()) {
                    this.synchronizer.scheduleCloudSync(saveSlot, gameData);
                }
                
                EventBus.getInstance().emit('game_saved', { slot: saveSlot });
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to save game data:', error);
            EventBus.getInstance().emit('save_error', { error: error.message });
            return false;
        }
    }
    
    // 게임 데이터 로드
    async loadGameData(saveSlot: number = 0): Promise<GameData | null> {
        try {
            // 캐시에서 먼저 확인
            const cachedData = this.cache.get(`save_${saveSlot}`);
            if (cachedData && this.validator.validateGameData(cachedData)) {
                return cachedData as GameData;
            }
            
            // 저장소에서 로드
            const encryptedData = await this.storage.load(`save_${saveSlot}`);
            if (!encryptedData) {
                return null;
            }
            
            // 데이터 복호화
            const serializedData = this.encryptor.decrypt(encryptedData);
            
            // 데이터 직렬화 해제
            const gameData = this.serializer.deserialize(serializedData);
            
            // 스키마 마이그레이션
            const migratedData = this.migrator.migrate(gameData);
            
            // 데이터 검증
            if (!this.validator.validateGameData(migratedData)) {
                throw new Error('Corrupted save data');
            }
            
            // 캐시에 저장
            this.cache.set(`save_${saveSlot}`, migratedData);
            
            EventBus.getInstance().emit('game_loaded', { slot: saveSlot });
            return migratedData;
            
        } catch (error) {
            console.error('Failed to load game data:', error);
            EventBus.getInstance().emit('load_error', { error: error.message, slot: saveSlot });
            return null;
        }
    }
    
    // 설정 데이터 저장
    async saveSettings(settings: GameSettings): Promise<boolean> {
        try {
            const validatedSettings = this.validator.validateSettings(settings);
            const serializedSettings = this.serializer.serialize(validatedSettings);
            
            const success = await this.storage.save('game_settings', serializedSettings);
            
            if (success) {
                this.cache.set('game_settings', validatedSettings);
                EventBus.getInstance().emit('settings_saved');
            }
            
            return success;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
    
    // 설정 데이터 로드
    async loadSettings(): Promise<GameSettings> {
        try {
            // 캐시 확인
            const cachedSettings = this.cache.get('game_settings');
            if (cachedSettings) {
                return cachedSettings as GameSettings;
            }
            
            // 저장소에서 로드
            const serializedSettings = await this.storage.load('game_settings');
            
            if (serializedSettings) {
                const settings = this.serializer.deserialize(serializedSettings);
                const migratedSettings = this.migrator.migrateSettings(settings);
                
                this.cache.set('game_settings', migratedSettings);
                return migratedSettings;
            }
            
            // 기본 설정 반환
            return this.getDefaultSettings();
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }
    
    // 플레이어 통계 업데이트
    updatePlayerStats(stats: Partial<PlayerStats>): void {
        const currentStats = this.cache.get('player_stats') as PlayerStats || this.getDefaultPlayerStats();
        const updatedStats = { ...currentStats, ...stats };
        
        this.cache.set('player_stats', updatedStats);
        
        // 백그라운드에서 저장
        this.deferredSave('player_stats', updatedStats);
    }
    
    // 성취 시스템 데이터 관리
    unlockAchievement(achievementId: string): void {
        const achievements = this.cache.get('achievements') as Set<string> || new Set();
        
        if (!achievements.has(achievementId)) {
            achievements.add(achievementId);
            this.cache.set('achievements', achievements);
            
            // 즉시 저장
            this.deferredSave('achievements', Array.from(achievements));
            
            EventBus.getInstance().emit('achievement_unlocked', { id: achievementId });
        }
    }
    
    // 자동 저장 수행
    private async performAutoSave(): Promise<void> {
        const autoSaveSlot = 999; // 전용 자동 저장 슬롯
        await this.saveGameData(autoSaveSlot);
    }
    
    // 현재 게임 데이터 수집
    private collectGameData(): GameData {
        const gameManager = GameManager.getInstance();
        
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            player: gameManager.getPlayerManager().serialize(),
            inventory: gameManager.getInventoryManager().serialize(),
            progress: gameManager.getProgressManager().serialize(),
            settings: this.cache.get('game_settings') as GameSettings,
            stats: this.cache.get('player_stats') as PlayerStats,
            achievements: Array.from(this.cache.get('achievements') as Set<string> || new Set()),
            worldState: gameManager.getWorldManager().serialize()
        };
    }
    
    // 클라우드 동기화 여부 확인
    private shouldSyncToCloud(): boolean {
        const settings = this.cache.get('game_settings') as GameSettings;
        return settings?.cloudSync ?? false;
    }
    
    // 지연 저장 (성능 최적화)
    private deferredSave(key: string, data: any): void {
        // 지연 저장 큐에 추가
        setTimeout(async () => {
            const serializedData = this.serializer.serialize(data);
            await this.storage.save(key, serializedData);
        }, 1000);
    }
    
    private getDefaultSettings(): GameSettings {
        return {
            graphics: {
                quality: 'medium',
                fps: 60,
                shadows: true,
                particles: true
            },
            audio: {
                masterVolume: 1.0,
                musicVolume: 0.8,
                sfxVolume: 1.0,
                voiceVolume: 1.0
            },
            controls: {
                sensitivity: 1.0,
                invertY: false,
                hapticFeedback: true
            },
            gameplay: {
                difficulty: 'normal',
                autoSave: true,
                subtitles: true
            },
            cloudSync: false
        };
    }
    
    private getDefaultPlayerStats(): PlayerStats {
        return {
            totalPlayTime: 0,
            enemiesKilled: 0,
            deathCount: 0,
            arrowsFired: 0,
            distanceTraveled: 0,
            itemsCollected: 0,
            levelsCompleted: 0,
            bossesDefeated: 0
        };
    }
}
```

### 2. 저장소 관리자

```typescript
// [의도] 다양한 저장소 백엔드를 통합하여 관리하는 어댑터 패턴 구현
// [책임] 로컬 저장소, 클라우드 저장소, 임시 저장소 관리 및 백업/복구
export class StorageManager {
    private localStorage: LocalStorage;
    private cloudStorage: CloudStorage;
    private tempStorage: TempStorage;
    private storagePolicy: StoragePolicy;
    
    constructor() {
        this.localStorage = new LocalStorage();
        this.cloudStorage = new CloudStorage();
        this.tempStorage = new TempStorage();
        this.storagePolicy = new StoragePolicy();
    }
    
    // 데이터 저장
    async save(key: string, data: any): Promise<boolean> {
        try {
            const policy = this.storagePolicy.getPolicyForKey(key);
            
            // 로컬 저장소에 저장
            const localSuccess = await this.localStorage.save(key, data);
            
            if (!localSuccess) {
                return false;
            }
            
            // 백업 저장소에 저장 (필요시)
            if (policy.requiresBackup) {
                await this.createBackup(key, data);
            }
            
            // 클라우드 저장소에 저장 (필요시)
            if (policy.requiresCloudSync) {
                await this.cloudStorage.save(key, data);
            }
            
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    }
    
    // 데이터 로드
    async load(key: string): Promise<any> {
        try {
            const policy = this.storagePolicy.getPolicyForKey(key);
            
            // 로컬에서 먼저 로드 시도
            let data = await this.localStorage.load(key);
            
            // 로컬 데이터가 없거나 손상된 경우
            if (!data && policy.requiresBackup) {
                data = await this.restoreFromBackup(key);
            }
            
            // 그래도 없으면 클라우드에서 시도
            if (!data && policy.requiresCloudSync) {
                data = await this.cloudStorage.load(key);
                
                // 클라우드에서 로드 성공 시 로컬에 복사
                if (data) {
                    await this.localStorage.save(key, data);
                }
            }
            
            return data;
        } catch (error) {
            console.error('Storage load error:', error);
            return null;
        }
    }
    
    // 데이터 삭제
    async delete(key: string): Promise<boolean> {
        try {
            const localSuccess = await this.localStorage.delete(key);
            
            // 백업도 삭제
            await this.deleteBackup(key);
            
            // 클라우드에서도 삭제 (필요시)
            const policy = this.storagePolicy.getPolicyForKey(key);
            if (policy.requiresCloudSync) {
                await this.cloudStorage.delete(key);
            }
            
            return localSuccess;
        } catch (error) {
            console.error('Storage delete error:', error);
            return false;
        }
    }
    
    // 저장소 정보 조회
    async getStorageInfo(): Promise<StorageInfo> {
        const localInfo = await this.localStorage.getStorageInfo();
        const cloudInfo = await this.cloudStorage.getStorageInfo();
        
        return {
            local: localInfo,
            cloud: cloudInfo,
            totalUsed: localInfo.used + cloudInfo.used,
            totalAvailable: localInfo.available + cloudInfo.available
        };
    }
    
    // 저장소 정리
    async cleanup(): Promise<void> {
        // 임시 파일 정리
        await this.tempStorage.cleanup();
        
        // 오래된 백업 정리
        await this.cleanupOldBackups();
        
        // 로컬 저장소 최적화
        await this.localStorage.optimize();
    }
    
    private async createBackup(key: string, data: any): Promise<void> {
        const backupKey = `backup_${key}_${Date.now()}`;
        await this.localStorage.save(backupKey, data);
        
        // 백업 개수 제한 (최대 5개)
        await this.limitBackups(key, 5);
    }
    
    private async restoreFromBackup(key: string): Promise<any> {
        // 가장 최근 백업 찾기
        const backupKeys = await this.localStorage.getKeysWithPrefix(`backup_${key}_`);
        
        if (backupKeys.length === 0) {
            return null;
        }
        
        // 타임스탬프로 정렬하여 최신 백업 선택
        backupKeys.sort((a, b) => {
            const timestampA = parseInt(a.split('_').pop() || '0');
            const timestampB = parseInt(b.split('_').pop() || '0');
            return timestampB - timestampA;
        });
        
        return await this.localStorage.load(backupKeys[0]);
    }
    
    private async deleteBackup(key: string): Promise<void> {
        const backupKeys = await this.localStorage.getKeysWithPrefix(`backup_${key}_`);
        
        for (const backupKey of backupKeys) {
            await this.localStorage.delete(backupKey);
        }
    }
    
    private async limitBackups(key: string, maxBackups: number): Promise<void> {
        const backupKeys = await this.localStorage.getKeysWithPrefix(`backup_${key}_`);
        
        if (backupKeys.length <= maxBackups) {
            return;
        }
        
        // 타임스탬프로 정렬
        backupKeys.sort((a, b) => {
            const timestampA = parseInt(a.split('_').pop() || '0');
            const timestampB = parseInt(b.split('_').pop() || '0');
            return timestampA - timestampB; // 오래된 것부터
        });
        
        // 초과분 삭제
        const toDelete = backupKeys.slice(0, backupKeys.length - maxBackups);
        for (const key of toDelete) {
            await this.localStorage.delete(key);
        }
    }
    
    private async cleanupOldBackups(): Promise<void> {
        const allKeys = await this.localStorage.getAllKeys();
        const backupKeys = allKeys.filter(key => key.startsWith('backup_'));
        
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        for (const key of backupKeys) {
            const timestamp = parseInt(key.split('_').pop() || '0');
            
            if (timestamp < thirtyDaysAgo) {
                await this.localStorage.delete(key);
            }
        }
    }
}
```

### 3. 캐시 관리자

```typescript
// [의도] 메모리와 디스크 기반의 다층 캐시 시스템으로 성능 최적화
// [책임] 캐시 계층 관리, LRU 정책, 메모리 사용량 제어, 캐시 일관성 보장
export class CacheManager {
    private memoryCache: Map<string, CacheEntry> = new Map();
    private diskCache: DiskCache;
    private cachePolicy: CachePolicy;
    private maxMemorySize: number = 50 * 1024 * 1024; // 50MB
    private currentMemoryUsage: number = 0;
    private accessLog: Map<string, number> = new Map();
    
    constructor() {
        this.diskCache = new DiskCache();
        this.cachePolicy = new CachePolicy();
        this.setupCleanupTimer();
    }
    
    // 캐시에서 데이터 가져오기
    get(key: string): any {
        // 메모리 캐시에서 먼저 확인
        const memoryEntry = this.memoryCache.get(key);
        
        if (memoryEntry && !this.isExpired(memoryEntry)) {
            this.updateAccessTime(key);
            return memoryEntry.data;
        }
        
        // 메모리에 없으면 디스크 캐시 확인
        const diskData = this.diskCache.get(key);
        
        if (diskData) {
            // 메모리 캐시에 승격
            this.set(key, diskData, { fromDisk: true });
            return diskData;
        }
        
        return null;
    }
    
    // 캐시에 데이터 저장
    set(key: string, data: any, options: CacheOptions = {}): void {
        const policy = this.cachePolicy.getPolicyForKey(key);
        const dataSize = this.calculateDataSize(data);
        
        // 메모리 캐시 용량 체크
        if (this.currentMemoryUsage + dataSize > this.maxMemorySize) {
            this.evictLRU(dataSize);
        }
        
        // 메모리 캐시에 저장
        const entry: CacheEntry = {
            data: data,
            timestamp: Date.now(),
            size: dataSize,
            ttl: options.ttl || policy.defaultTTL,
            accessCount: 1
        };
        
        this.memoryCache.set(key, entry);
        this.currentMemoryUsage += dataSize;
        this.updateAccessTime(key);
        
        // 디스크 캐시에도 저장 (필요시)
        if (policy.persistToDisk && !options.fromDisk) {
            this.diskCache.set(key, data, options);
        }
    }
    
    // 캐시에서 데이터 삭제
    delete(key: string): boolean {
        // 메모리 캐시에서 삭제
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry) {
            this.memoryCache.delete(key);
            this.currentMemoryUsage -= memoryEntry.size;
        }
        
        // 디스크 캐시에서도 삭제
        this.diskCache.delete(key);
        this.accessLog.delete(key);
        
        return true;
    }
    
    // 캐시 클리어
    clear(): void {
        this.memoryCache.clear();
        this.diskCache.clear();
        this.accessLog.clear();
        this.currentMemoryUsage = 0;
    }
    
    // 만료된 캐시 정리
    cleanup(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];
        
        this.memoryCache.forEach((entry, key) => {
            if (this.isExpired(entry, now)) {
                expiredKeys.push(key);
            }
        });
        
        expiredKeys.forEach(key => this.delete(key));
        
        // 디스크 캐시도 정리
        this.diskCache.cleanup();
    }
    
    // 캐시 통계 조회
    getStats(): CacheStats {
        const memoryEntries = this.memoryCache.size;
        const diskEntries = this.diskCache.getSize();
        
        return {
            memoryEntries,
            diskEntries,
            totalEntries: memoryEntries + diskEntries,
            memoryUsage: this.currentMemoryUsage,
            maxMemorySize: this.maxMemorySize,
            hitRate: this.calculateHitRate(),
            mostAccessed: this.getMostAccessedKeys(10)
        };
    }
    
    // 프리로드 (미리 캐시에 로드)
    async preload(keys: string[]): Promise<void> {
        const loadPromises = keys.map(async (key) => {
            if (!this.memoryCache.has(key)) {
                // 디스크 캐시나 저장소에서 로드
                const data = this.diskCache.get(key) || 
                           await DataManager.getInstance().loadFromStorage(key);
                
                if (data) {
                    this.set(key, data, { preloaded: true });
                }
            }
        });
        
        await Promise.all(loadPromises);
    }
    
    // LRU 기반 캐시 제거
    private evictLRU(requiredSpace: number): void {
        const entries = Array.from(this.memoryCache.entries())
            .map(([key, entry]) => ({
                key,
                entry,
                lastAccess: this.accessLog.get(key) || 0
            }))
            .sort((a, b) => a.lastAccess - b.lastAccess);
        
        let freedSpace = 0;
        
        for (const { key, entry } of entries) {
            if (freedSpace >= requiredSpace) {
                break;
            }
            
            // 중요한 데이터는 디스크로 이동
            const policy = this.cachePolicy.getPolicyForKey(key);
            if (policy.moveToSiskOnEvict) {
                this.diskCache.set(key, entry.data);
            }
            
            this.memoryCache.delete(key);
            this.currentMemoryUsage -= entry.size;
            freedSpace += entry.size;
        }
    }
    
    private isExpired(entry: CacheEntry, now: number = Date.now()): boolean {
        return entry.ttl > 0 && (now - entry.timestamp) > entry.ttl;
    }
    
    private updateAccessTime(key: string): void {
        this.accessLog.set(key, Date.now());
        
        const entry = this.memoryCache.get(key);
        if (entry) {
            entry.accessCount++;
        }
    }
    
    private calculateDataSize(data: any): number {
        // 대략적인 메모리 사용량 계산
        return JSON.stringify(data).length * 2; // UTF-16 문자당 2바이트
    }
    
    private calculateHitRate(): number {
        // 캐시 히트율 계산 (간단한 구현)
        const totalAccess = Array.from(this.accessLog.values()).length;
        const totalEntries = this.memoryCache.size;
        
        return totalEntries > 0 ? (totalEntries / totalAccess) : 0;
    }
    
    private getMostAccessedKeys(count: number): string[] {
        return Array.from(this.memoryCache.entries())
            .sort(([, a], [, b]) => b.accessCount - a.accessCount)
            .slice(0, count)
            .map(([key]) => key);
    }
    
    private setupCleanupTimer(): void {
        // 5분마다 정리 작업 수행
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
}
```

### 4. 데이터 직렬화 시스템

```typescript
// [의도] 다양한 데이터 타입을 효율적으로 직렬화/역직렬화하는 통합 시스템
// [책임] 타입 안전성, 압축, 포맷 변환, 버전 호환성 관리
export class DataSerializer {
    private typeRegistry: Map<string, TypeHandler> = new Map();
    private compressionEnabled: boolean = true;
    private compressionThreshold: number = 1024; // 1KB 이상일 때 압축
    
    constructor() {
        this.registerDefaultTypes();
    }
    
    // 데이터 직렬화
    serialize(data: any, options: SerializationOptions = {}): string {
        try {
            // 타입 정보와 함께 래핑
            const wrappedData = {
                type: this.getDataType(data),
                version: '1.0.0',
                timestamp: Date.now(),
                data: this.processForSerialization(data)
            };
            
            // JSON 직렬화
            let serialized = JSON.stringify(wrappedData);
            
            // 압축 적용 (필요시)
            if (this.shouldCompress(serialized, options)) {
                serialized = this.compress(serialized);
            }
            
            return serialized;
        } catch (error) {
            console.error('Serialization error:', error);
            throw new Error(`Failed to serialize data: ${error.message}`);
        }
    }
    
    // 데이터 역직렬화
    deserialize(serializedData: string): any {
        try {
            // 압축 해제 (필요시)
            let data = serializedData;
            if (this.isCompressed(serializedData)) {
                data = this.decompress(serializedData);
            }
            
            // JSON 파싱
            const wrappedData = JSON.parse(data);
            
            // 타입 검증
            if (!this.validateSerializedData(wrappedData)) {
                throw new Error('Invalid serialized data format');
            }
            
            // 버전 호환성 체크
            this.checkVersionCompatibility(wrappedData.version);
            
            // 타입별 역직렬화 처리
            return this.processForDeserialization(wrappedData.data, wrappedData.type);
            
        } catch (error) {
            console.error('Deserialization error:', error);
            throw new Error(`Failed to deserialize data: ${error.message}`);
        }
    }
    
    // 바이너리 직렬화 (성능 최적화용)
    serializeBinary(data: any): ArrayBuffer {
        // 바이너리 포맷으로 직렬화 (더 효율적)
        const json = JSON.stringify(data);
        const encoder = new TextEncoder();
        return encoder.encode(json).buffer;
    }
    
    // 바이너리 역직렬화
    deserializeBinary(buffer: ArrayBuffer): any {
        const decoder = new TextDecoder();
        const json = decoder.decode(buffer);
        return JSON.parse(json);
    }
    
    // 커스텀 타입 핸들러 등록
    registerTypeHandler(typeName: string, handler: TypeHandler): void {
        this.typeRegistry.set(typeName, handler);
    }
    
    private registerDefaultTypes(): void {
        // 게임 데이터 타입들
        this.registerTypeHandler('GameData', new GameDataHandler());
        this.registerTypeHandler('PlayerData', new PlayerDataHandler());
        this.registerTypeHandler('InventoryData', new InventoryDataHandler());
        this.registerTypeHandler('ProgressData', new ProgressDataHandler());
        this.registerTypeHandler('Settings', new SettingsHandler());
        this.registerTypeHandler('Vector3', new Vector3Handler());
        this.registerTypeHandler('Color', new ColorHandler());
        this.registerTypeHandler('Date', new DateHandler());
        this.registerTypeHandler('Map', new MapHandler());
        this.registerTypeHandler('Set', new SetHandler());
    }
    
    private getDataType(data: any): string {
        if (data === null || data === undefined) {
            return 'null';
        }
        
        // 커스텀 타입 체크
        if (data.constructor && data.constructor.name !== 'Object') {
            return data.constructor.name;
        }
        
        // 기본 타입 체크
        if (Array.isArray(data)) {
            return 'Array';
        }
        
        return typeof data;
    }
    
    private processForSerialization(data: any): any {
        const dataType = this.getDataType(data);
        const handler = this.typeRegistry.get(dataType);
        
        if (handler) {
            return handler.serialize(data);
        }
        
        // 기본 처리 - 재귀적으로 객체 순회
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                return data.map(item => this.processForSerialization(item));
            } else {
                const processed: any = {};
                for (const [key, value] of Object.entries(data)) {
                    processed[key] = this.processForSerialization(value);
                }
                return processed;
            }
        }
        
        return data;
    }
    
    private processForDeserialization(data: any, type: string): any {
        const handler = this.typeRegistry.get(type);
        
        if (handler) {
            return handler.deserialize(data);
        }
        
        // 기본 처리
        return data;
    }
    
    private shouldCompress(data: string, options: SerializationOptions): boolean {
        if (!this.compressionEnabled || options.skipCompression) {
            return false;
        }
        
        return data.length >= this.compressionThreshold;
    }
    
    private compress(data: string): string {
        // 간단한 압축 구현 (실제로는 더 효율적인 압축 알고리즘 사용)
        const compressed = LZString.compress(data);
        return `COMPRESSED:${compressed}`;
    }
    
    private decompress(data: string): string {
        if (!this.isCompressed(data)) {
            return data;
        }
        
        const compressed = data.substring('COMPRESSED:'.length);
        return LZString.decompress(compressed);
    }
    
    private isCompressed(data: string): boolean {
        return data.startsWith('COMPRESSED:');
    }
    
    private validateSerializedData(data: any): boolean {
        return data && 
               typeof data.type === 'string' && 
               typeof data.version === 'string' && 
               typeof data.timestamp === 'number' &&
               data.data !== undefined;
    }
    
    private checkVersionCompatibility(version: string): void {
        // 버전 호환성 체크 로직
        const currentVersion = '1.0.0';
        
        if (!this.isVersionCompatible(version, currentVersion)) {
            console.warn(`Version mismatch: ${version} vs ${currentVersion}`);
            // 필요시 마이그레이션 트리거
        }
    }
    
    private isVersionCompatible(dataVersion: string, currentVersion: string): boolean {
        // 간단한 버전 비교 (실제로는 더 복잡한 로직 필요)
        const [dataMajor, dataMinor] = dataVersion.split('.').map(Number);
        const [currentMajor, currentMinor] = currentVersion.split('.').map(Number);
        
        // 메이저 버전이 같으면 호환
        return dataMajor === currentMajor;
    }
}

// 타입 핸들러 인터페이스
interface TypeHandler {
    serialize(data: any): any;
    deserialize(data: any): any;
}

// Vector3 타입 핸들러 예시
class Vector3Handler implements TypeHandler {
    serialize(data: Vec3): any {
        return {
            x: data.x,
            y: data.y,
            z: data.z
        };
    }
    
    deserialize(data: any): Vec3 {
        return new Vec3(data.x, data.y, data.z);
    }
}

// Map 타입 핸들러
class MapHandler implements TypeHandler {
    serialize(data: Map<any, any>): any {
        return {
            entries: Array.from(data.entries())
        };
    }
    
    deserialize(data: any): Map<any, any> {
        return new Map(data.entries);
    }
}

// Set 타입 핸들러
class SetHandler implements TypeHandler {
    serialize(data: Set<any>): any {
        return {
            values: Array.from(data.values())
        };
    }
    
    deserialize(data: any): Set<any> {
        return new Set(data.values);
    }
}
```

### 5. 클라우드 동기화 시스템

```typescript
// [의도] 여러 디바이스 간 게임 데이터 동기화 및 클라우드 백업 관리
// [책임] 충돌 해결, 증분 동기화, 오프라인 지원, 동기화 상태 관리
export class DataSynchronizer {
    private cloudProvider: CloudProvider;
    private conflictResolver: ConflictResolver;
    private syncQueue: SyncOperation[] = [];
    private syncState: SyncState = SyncState.IDLE;
    private lastSyncTimestamp: number = 0;
    private retryManager: RetryManager;
    
    constructor() {
        this.cloudProvider = new CloudProvider();
        this.conflictResolver = new ConflictResolver();
        this.retryManager = new RetryManager();
        this.setupEventHandlers();
    }
    
    private setupEventHandlers(): void {
        // 네트워크 상태 변화 감지
        EventBus.getInstance().on('network_status_changed', this.onNetworkStatusChanged.bind(this));
        
        // 앱 상태 변화 감지
        EventBus.getInstance().on('app_focus_changed', this.onAppFocusChanged.bind(this));
    }
    
    // 클라우드 동기화 예약
    scheduleCloudSync(saveSlot: number, gameData: GameData): void {
        const operation: SyncOperation = {
            id: this.generateOperationId(),
            type: SyncOperationType.UPLOAD,
            data: gameData,
            saveSlot: saveSlot,
            timestamp: Date.now(),
            retryCount: 0
        };
        
        this.syncQueue.push(operation);
        this.processSyncQueue();
    }
    
    // 즉시 동기화 수행
    async syncNow(): Promise<SyncResult> {
        if (this.syncState !== SyncState.IDLE) {
            return { success: false, error: 'Sync already in progress' };
        }
        
        this.syncState = SyncState.SYNCING;
        
        try {
            // 1. 로컬 변경사항 업로드
            const uploadResult = await this.uploadChanges();
            
            // 2. 클라우드 변경사항 다운로드
            const downloadResult = await this.downloadChanges();
            
            // 3. 충돌 해결
            const conflictResult = await this.resolveConflicts();
            
            this.lastSyncTimestamp = Date.now();
            this.syncState = SyncState.IDLE;
            
            EventBus.getInstance().emit('sync_completed', {
                uploaded: uploadResult.count,
                downloaded: downloadResult.count,
                conflicts: conflictResult.count
            });
            
            return { success: true };
            
        } catch (error) {
            this.syncState = SyncState.ERROR;
            console.error('Sync failed:', error);
            
            EventBus.getInstance().emit('sync_failed', { error: error.message });
            
            return { success: false, error: error.message };
        }
    }
    
    // 증분 동기화 (변경된 부분만)
    async incrementalSync(): Promise<SyncResult> {
        const lastSync = this.lastSyncTimestamp;
        const currentTime = Date.now();
        
        try {
            // 마지막 동기화 이후 변경사항만 확인
            const localChanges = await this.getLocalChanges(lastSync);
            const cloudChanges = await this.cloudProvider.getChangesSince(lastSync);
            
            // 변경사항이 없으면 동기화 불필요
            if (localChanges.length === 0 && cloudChanges.length === 0) {
                return { success: true, message: 'No changes to sync' };
            }
            
            // 증분 업로드/다운로드
            const results = await Promise.all([
                this.uploadChanges(localChanges),
                this.downloadChanges(cloudChanges)
            ]);
            
            this.lastSyncTimestamp = currentTime;
            
            return { success: true };
            
        } catch (error) {
            console.error('Incremental sync failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 충돌 해결
    private async resolveConflicts(): Promise<ConflictResult> {
        const conflicts = await this.detectConflicts();
        let resolvedCount = 0;
        
        for (const conflict of conflicts) {
            const resolution = await this.conflictResolver.resolve(conflict);
            
            if (resolution.success) {
                await this.applyConflictResolution(resolution);
                resolvedCount++;
            } else {
                // 수동 해결 필요
                EventBus.getInstance().emit('manual_conflict_resolution_required', {
                    conflict: conflict,
                    reason: resolution.error
                });
            }
        }
        
        return { count: resolvedCount, total: conflicts.length };
    }
    
    // 오프라인 변경사항 처리
    handleOfflineChanges(): void {
        const offlineChanges = this.getOfflineChanges();
        
        if (offlineChanges.length > 0) {
            // 온라인 상태가 되면 자동으로 동기화
            this.scheduleOfflineSync(offlineChanges);
        }
    }
    
    // 동기화 상태 조회
    getSyncStatus(): SyncStatus {
        return {
            state: this.syncState,
            lastSync: this.lastSyncTimestamp,
            queueLength: this.syncQueue.length,
            pendingUploads: this.syncQueue.filter(op => op.type === SyncOperationType.UPLOAD).length,
            pendingDownloads: this.syncQueue.filter(op => op.type === SyncOperationType.DOWNLOAD).length
        };
    }
    
    private async processSyncQueue(): Promise<void> {
        if (this.syncState !== SyncState.IDLE || this.syncQueue.length === 0) {
            return;
        }
        
        // 네트워크 연결 확인
        if (!this.cloudProvider.isConnected()) {
            console.log('No network connection, deferring sync');
            return;
        }
        
        this.syncState = SyncState.SYNCING;
        
        while (this.syncQueue.length > 0) {
            const operation = this.syncQueue.shift()!;
            
            try {
                await this.executeOperation(operation);
            } catch (error) {
                console.error('Sync operation failed:', error);
                
                // 재시도 로직
                if (this.retryManager.shouldRetry(operation)) {
                    operation.retryCount++;
                    this.syncQueue.unshift(operation); // 큐 앞쪽에 다시 삽입
                    await this.retryManager.delay(operation.retryCount);
                } else {
                    EventBus.getInstance().emit('sync_operation_failed', {
                        operation: operation,
                        error: error.message
                    });
                }
            }
        }
        
        this.syncState = SyncState.IDLE;
    }
    
    private async executeOperation(operation: SyncOperation): Promise<void> {
        switch (operation.type) {
            case SyncOperationType.UPLOAD:
                await this.cloudProvider.upload(operation.saveSlot, operation.data);
                break;
            case SyncOperationType.DOWNLOAD:
                const data = await this.cloudProvider.download(operation.saveSlot);
                await this.applyDownloadedData(data);
                break;
            case SyncOperationType.DELETE:
                await this.cloudProvider.delete(operation.saveSlot);
                break;
        }
    }
    
    private async uploadChanges(changes?: LocalChange[]): Promise<UploadResult> {
        // 업로드할 변경사항 수집
        const toUpload = changes || await this.getAllLocalChanges();
        let uploadCount = 0;
        
        for (const change of toUpload) {
            try {
                await this.cloudProvider.upload(change.key, change.data);
                uploadCount++;
            } catch (error) {
                console.error(`Failed to upload ${change.key}:`, error);
            }
        }
        
        return { count: uploadCount };
    }
    
    private async downloadChanges(changes?: CloudChange[]): Promise<DownloadResult> {
        // 다운로드할 변경사항 수집
        const toDownload = changes || await this.cloudProvider.getAllChanges();
        let downloadCount = 0;
        
        for (const change of toDownload) {
            try {
                const data = await this.cloudProvider.download(change.key);
                await this.applyDownloadedData(data);
                downloadCount++;
            } catch (error) {
                console.error(`Failed to download ${change.key}:`, error);
            }
        }
        
        return { count: downloadCount };
    }
    
    private async detectConflicts(): Promise<DataConflict[]> {
        const conflicts: DataConflict[] = [];
        
        // 로컬과 클라우드 데이터 비교
        const localData = await this.getAllLocalData();
        const cloudData = await this.cloudProvider.getAllData();
        
        for (const [key, localValue] of localData) {
            const cloudValue = cloudData.get(key);
            
            if (cloudValue && this.hasConflict(localValue, cloudValue)) {
                conflicts.push({
                    key: key,
                    localData: localValue,
                    cloudData: cloudValue,
                    conflictType: this.getConflictType(localValue, cloudValue)
                });
            }
        }
        
        return conflicts;
    }
    
    private hasConflict(localData: any, cloudData: any): boolean {
        // 타임스탬프 기반 충돌 감지
        const localTimestamp = localData.timestamp || 0;
        const cloudTimestamp = cloudData.timestamp || 0;
        
        // 데이터가 다르고 둘 다 최근에 수정되었으면 충돌
        const timeDiff = Math.abs(localTimestamp - cloudTimestamp);
        const isDataDifferent = JSON.stringify(localData) !== JSON.stringify(cloudData);
        
        return isDataDifferent && timeDiff < 60000; // 1분 이내 수정 시 충돌로 간주
    }
    
    private getConflictType(localData: any, cloudData: any): ConflictType {
        if (localData.timestamp > cloudData.timestamp) {
            return ConflictType.LOCAL_NEWER;
        } else if (cloudData.timestamp > localData.timestamp) {
            return ConflictType.CLOUD_NEWER;
        } else {
            return ConflictType.SIMULTANEOUS;
        }
    }
    
    private onNetworkStatusChanged(isOnline: boolean): void {
        if (isOnline && this.syncQueue.length > 0) {
            // 네트워크 연결 시 대기 중인 동기화 처리
            this.processSyncQueue();
        }
    }
    
    private onAppFocusChanged(hasFocus: boolean): void {
        if (hasFocus) {
            // 앱이 포그라운드로 돌아왔을 때 동기화 체크
            this.incrementalSync();
        }
    }
    
    private generateOperationId(): string {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 기타 헬퍼 메서드들...
    private async getLocalChanges(since: number): Promise<LocalChange[]> {
        // 로컬 변경사항 수집 구현
        return [];
    }
    
    private async getAllLocalChanges(): Promise<LocalChange[]> {
        // 모든 로컬 변경사항 수집 구현
        return [];
    }
    
    private async getAllLocalData(): Promise<Map<string, any>> {
        // 모든 로컬 데이터 수집 구현
        return new Map();
    }
    
    private async applyDownloadedData(data: any): Promise<void> {
        // 다운로드된 데이터 적용 구현
    }
    
    private async applyConflictResolution(resolution: ConflictResolution): Promise<void> {
        // 충돌 해결 결과 적용 구현
    }
    
    private getOfflineChanges(): OfflineChange[] {
        // 오프라인 변경사항 수집 구현
        return [];
    }
    
    private scheduleOfflineSync(changes: OfflineChange[]): void {
        // 오프라인 변경사항 동기화 예약 구현
    }
}
```

## 보안 및 데이터 보호

### 암호화 시스템
- AES-256 암호화로 민감 데이터 보호
- 키 관리 시스템 구현
- 전송 중 데이터 암호화

### 데이터 검증
- 체크섬 기반 무결성 검증
- 디지털 서명 활용
- 변조 감지 시스템

### 백업 및 복구
- 자동 백업 스케줄링
- 다중 백업 보관
- 빠른 복구 시스템

## 성능 최적화

### 데이터 압축
- 효율적인 압축 알고리즘 적용
- 선택적 압축 정책
- 압축률과 성능의 균형

### 비동기 처리
- 논블로킹 I/O 작업
- 백그라운드 처리
- 우선순위 기반 작업 스케줄링

이 데이터 관리 시스템 설계는 모바일 3D 소울라이크 게임의 모든 데이터를 안전하고 효율적으로 관리하며, 확장성과 성능을 모두 고려한 포괄적인 솔루션을 제공합니다.