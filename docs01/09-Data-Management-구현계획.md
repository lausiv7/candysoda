# Shadow Archer 구현 계획서: 데이터 관리 시스템

## 1. 🎯 구현 목표

이 문서는 `docs/09-Data-Management.md`에 정의된 **데이터 관리 시스템 아키텍처**를 실제 TypeScript/Cocos Creator 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 안전하고 효율적인 데이터 저장, 클라우드 동기화, 암호화 보안, 백업/복구 시스템을 완성하여 플레이어의 게임 데이터를 완벽하게 보호하고 관리합니다.

---

## 2. 📁 구현 대상 핵심 파일

데이터 관리 시스템 구현은 `assets/scripts/data` 폴더를 중심으로 진행됩니다.

### 2.1. Data Core (데이터 핵심)

```
assets/scripts/data/
├── DataManager.ts                   # ✅ 데이터 시스템 총괄 관리자
├── DataValidator.ts                 # ✅ 데이터 검증 및 무결성 관리
├── DataSerializer.ts                # ✅ 데이터 직렬화/역직렬화
├── DataEncryptor.ts                 # ✅ 데이터 암호화/복호화
└── SchemaMigrator.ts                # ✅ 데이터 스키마 마이그레이션
```

### 2.2. Storage System (저장소 시스템)

```
assets/scripts/data/storage/
├── StorageManager.ts                # ✅ 저장소 관리자
├── LocalStorage.ts                  # ✅ 로컬 저장소 구현
├── CloudStorage.ts                  # ✅ 클라우드 저장소 구현
├── TempStorage.ts                   # ✅ 임시 저장소 구현
└── StoragePolicy.ts                 # ✅ 저장소 정책 관리
```

### 2.3. Cache System (캐시 시스템)

```
assets/scripts/data/cache/
├── CacheManager.ts                  # ✅ 캐시 관리자
├── MemoryCache.ts                   # ✅ 메모리 캐시 구현
├── DiskCache.ts                     # ✅ 디스크 캐시 구현
├── CachePolicy.ts                   # ✅ 캐시 정책 관리
└── LRUCache.ts                      # ✅ LRU 캐시 구현
```

### 2.4. Synchronization (동기화 시스템)

```
assets/scripts/data/sync/
├── DataSynchronizer.ts              # ✅ 데이터 동기화 관리자
├── ConflictResolver.ts              # ✅ 데이터 충돌 해결
├── CloudProvider.ts                 # ✅ 클라우드 제공자 인터페이스
├── SyncQueue.ts                     # ✅ 동기화 작업 큐
└── OfflineManager.ts                # ✅ 오프라인 상태 관리
```

### 2.5. Security (보안 시스템)

```
assets/scripts/data/security/
├── DataSecurity.ts                  # ✅ 데이터 보안 관리자
├── CryptoUtils.ts                   # ✅ 암호화 유틸리티
├── KeyManager.ts                    # ✅ 암호화 키 관리
├── IntegrityChecker.ts              # ✅ 데이터 무결성 검증
└── SecurityPolicy.ts                # ✅ 보안 정책 관리
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/09-Data-Management.md` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 데이터 아키텍처 구축 (가장 중요)**
*   **기간:** 7일
*   **목표:** 게임 데이터의 저장, 로드, 기본 검증이 안정적으로 동작한다.
*   **작업 내용:**
    1.  **[Task 1.1]** `DataManager.ts`: 데이터 시스템의 중앙 관리자와 생명주기를 구현합니다.
        ```typescript
        export class DataManager {
            private static instance: DataManager;
            private storageManager: StorageManager;
            private cacheManager: CacheManager;
            private serializer: DataSerializer;
            private validator: DataValidator;
            private encryptor: DataEncryptor;
            
            async saveGameData(saveSlot: number = 0): Promise<boolean> {
                try {
                    // 1. 현재 게임 상태 수집
                    const gameData = this.collectGameData();
                    
                    // 2. 데이터 검증
                    if (!this.validator.validateGameData(gameData)) {
                        throw new Error('Invalid game data');
                    }
                    
                    // 3. 데이터 직렬화
                    const serializedData = this.serializer.serialize(gameData);
                    
                    // 4. 데이터 암호화
                    const encryptedData = this.encryptor.encrypt(serializedData);
                    
                    // 5. 저장소에 저장
                    const success = await this.storageManager.save(`save_${saveSlot}`, encryptedData);
                    
                    if (success) {
                        // 6. 캐시 업데이트
                        this.cacheManager.set(`save_${saveSlot}`, gameData);
                        
                        EventBus.getInstance().emit('game_saved', { slot: saveSlot });
                    }
                    
                    return success;
                } catch (error) {
                    console.error('Failed to save game data:', error);
                    EventBus.getInstance().emit('save_error', { error: error.message });
                    return false;
                }
            }
        }
        ```
    2.  **[Task 1.2]** `DataValidator.ts`: 데이터 무결성 검증과 타입 체크를 구현합니다.
    3.  **[Task 1.3]** `DataSerializer.ts`: 게임 데이터의 직렬화/역직렬화와 압축을 구현합니다.
    4.  **[Task 1.4]** `LocalStorage.ts`: 로컬 저장소의 기본 읽기/쓰기 작업을 구현합니다.
    5.  **[Task 1.5]** **기본 데이터 테스트:** 게임 저장/로드가 정상적으로 동작하고 데이터가 손상되지 않는지 검증합니다.

### **Phase 2: 캐시 시스템 구현**
*   **기간:** 5일
*   **목표:** 다층 캐시 시스템과 LRU 정책으로 데이터 접근 성능을 최적화한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `CacheManager.ts`: 메모리와 디스크 캐시의 통합 관리를 구현합니다.
        ```typescript
        export class CacheManager {
            private memoryCache: MemoryCache;
            private diskCache: DiskCache;
            private cachePolicy: CachePolicy;
            private maxMemorySize: number = 100 * 1024 * 1024; // 100MB
            
            get(key: string): any {
                // 1. 메모리 캐시에서 먼저 확인
                let data = this.memoryCache.get(key);
                if (data && !this.isExpired(data)) {
                    this.updateAccessTime(key);
                    return data.value;
                }
                
                // 2. 디스크 캐시에서 확인
                data = this.diskCache.get(key);
                if (data && !this.isExpired(data)) {
                    // 메모리로 승격
                    this.memoryCache.set(key, data.value, data.ttl);
                    return data.value;
                }
                
                return null;
            }
            
            set(key: string, value: any, ttl?: number): void {
                const policy = this.cachePolicy.getPolicyForKey(key);
                const dataSize = this.calculateDataSize(value);
                
                // 메모리 용량 체크
                if (this.memoryCache.getUsedMemory() + dataSize > this.maxMemorySize) {
                    this.evictLRU(dataSize);
                }
                
                // 메모리 캐시에 저장
                this.memoryCache.set(key, value, ttl || policy.defaultTTL);
                
                // 중요한 데이터는 디스크에도 저장
                if (policy.persistToDisk) {
                    this.diskCache.set(key, value, ttl || policy.defaultTTL);
                }
            }
        }
        ```
    2.  **[Task 2.2]** `MemoryCache.ts`: 고성능 메모리 캐시와 LRU 정책을 구현합니다.
    3.  **[Task 2.3]** `DiskCache.ts`: 영구 저장용 디스크 캐시를 구현합니다.
    4.  **[Task 2.4]** `CachePolicy.ts`: 데이터 타입별 캐시 정책과 만료 시간을 구현합니다.
    5.  **[Task 2.5]** **캐시 시스템 테스트:** 캐시 히트율과 성능 향상, 메모리 사용량을 검증합니다.

### **Phase 3: 보안 및 암호화 시스템**
*   **기간:** 6일
*   **목표:** AES-256 암호화와 데이터 무결성 보장 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `DataEncryptor.ts`: AES-256 기반 데이터 암호화/복호화를 구현합니다.
        ```typescript
        export class DataEncryptor {
            private algorithm: string = 'AES-256-GCM';
            private keyManager: KeyManager;
            
            constructor() {
                this.keyManager = new KeyManager();
            }
            
            encrypt(data: string): EncryptedData {
                try {
                    const key = this.keyManager.getEncryptionKey();
                    const iv = this.generateIV();
                    
                    // AES-256-GCM 암호화
                    const cipher = crypto.createCipher(this.algorithm, key);
                    cipher.setAAD(Buffer.from('additional_data'));
                    
                    let encrypted = cipher.update(data, 'utf8', 'hex');
                    encrypted += cipher.final('hex');
                    
                    const authTag = cipher.getAuthTag();
                    
                    return {
                        encryptedData: encrypted,
                        iv: iv.toString('hex'),
                        authTag: authTag.toString('hex'),
                        algorithm: this.algorithm
                    };
                } catch (error) {
                    console.error('Encryption failed:', error);
                    throw new Error('Failed to encrypt data');
                }
            }
            
            decrypt(encryptedData: EncryptedData): string {
                try {
                    const key = this.keyManager.getEncryptionKey();
                    const iv = Buffer.from(encryptedData.iv, 'hex');
                    const authTag = Buffer.from(encryptedData.authTag, 'hex');
                    
                    const decipher = crypto.createDecipher(this.algorithm, key);
                    decipher.setAAD(Buffer.from('additional_data'));
                    decipher.setAuthTag(authTag);
                    
                    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
                    decrypted += decipher.final('utf8');
                    
                    return decrypted;
                } catch (error) {
                    console.error('Decryption failed:', error);
                    throw new Error('Failed to decrypt data');
                }
            }
        }
        ```
    2.  **[Task 3.2]** `KeyManager.ts`: 암호화 키의 안전한 생성, 저장, 관리를 구현합니다.
    3.  **[Task 3.3]** `IntegrityChecker.ts`: 체크섬과 해시 기반 데이터 무결성 검증을 구현합니다.
    4.  **[Task 3.4]** `SecurityPolicy.ts`: 보안 정책과 위험 수준별 보안 조치를 구현합니다.
    5.  **[Task 3.5]** **보안 시스템 테스트:** 암호화 강도, 키 관리, 데이터 무결성이 보장되는지 검증합니다.

### **Phase 4: 클라우드 동기화 시스템**
*   **기간:** 8일
*   **목표:** 실시간 클라우드 동기화와 충돌 해결 시스템을 완성한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `DataSynchronizer.ts`: 클라우드 동기화의 전체 프로세스를 구현합니다.
        ```typescript
        export class DataSynchronizer {
            private cloudProvider: CloudProvider;
            private conflictResolver: ConflictResolver;
            private syncQueue: SyncOperation[] = [];
            private lastSyncTimestamp: number = 0;
            
            async syncNow(): Promise<SyncResult> {
                try {
                    // 1. 네트워크 연결 확인
                    if (!await this.cloudProvider.isConnected()) {
                        return { success: false, error: 'No network connection' };
                    }
                    
                    // 2. 로컬 변경사항 수집
                    const localChanges = await this.getLocalChanges();
                    
                    // 3. 클라우드 변경사항 수집
                    const cloudChanges = await this.cloudProvider.getChangesSince(this.lastSyncTimestamp);
                    
                    // 4. 충돌 감지 및 해결
                    const conflicts = this.detectConflicts(localChanges, cloudChanges);
                    
                    if (conflicts.length > 0) {
                        const resolutions = await this.conflictResolver.resolveConflicts(conflicts);
                        await this.applyConflictResolutions(resolutions);
                    }
                    
                    // 5. 변경사항 업로드
                    const uploadResult = await this.uploadChanges(localChanges);
                    
                    // 6. 변경사항 다운로드
                    const downloadResult = await this.downloadChanges(cloudChanges);
                    
                    // 7. 동기화 완료 처리
                    this.lastSyncTimestamp = Date.now();
                    
                    EventBus.getInstance().emit('sync_completed', {
                        uploaded: uploadResult.count,
                        downloaded: downloadResult.count,
                        conflicts: conflicts.length
                    });
                    
                    return { success: true };
                } catch (error) {
                    console.error('Sync failed:', error);
                    return { success: false, error: error.message };
                }
            }
        }
        ```
    2.  **[Task 4.2]** `ConflictResolver.ts`: 데이터 충돌의 자동 및 수동 해결을 구현합니다.
    3.  **[Task 4.3]** `CloudProvider.ts`: 다양한 클라우드 서비스와의 통합 인터페이스를 구현합니다.
    4.  **[Task 4.4]** `OfflineManager.ts`: 오프라인 상태에서의 데이터 관리와 재동기화를 구현합니다.
    5.  **[Task 4.5]** **동기화 시스템 테스트:** 다양한 시나리오에서 데이터 동기화와 충돌 해결이 정상 작동하는지 검증합니다.

### **Phase 5: 고급 데이터 관리 기능**
*   **기간:** 4일
*   **목표:** 스키마 마이그레이션, 백업/복구, 성능 최적화를 완성한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `SchemaMigrator.ts`: 데이터 스키마 버전 관리와 자동 마이그레이션을 구현합니다.
        ```typescript
        export class SchemaMigrator {
            private migrations: Map<string, Migration[]> = new Map();
            private currentVersion: string = '1.0.0';
            
            migrate(data: any): any {
                const dataVersion = data.version || '0.0.0';
                
                if (dataVersion === this.currentVersion) {
                    return data; // 마이그레이션 불필요
                }
                
                console.log(`Migrating data from ${dataVersion} to ${this.currentVersion}`);
                
                let migratedData = data;
                const migrationPath = this.findMigrationPath(dataVersion, this.currentVersion);
                
                for (const migration of migrationPath) {
                    migratedData = migration.migrate(migratedData);
                    console.log(`Applied migration: ${migration.fromVersion} -> ${migration.toVersion}`);
                }
                
                migratedData.version = this.currentVersion;
                return migratedData;
            }
            
            registerMigration(fromVersion: string, toVersion: string, migrationFn: (data: any) => any): void {
                const migration: Migration = {
                    fromVersion,
                    toVersion,
                    migrate: migrationFn
                };
                
                if (!this.migrations.has(fromVersion)) {
                    this.migrations.set(fromVersion, []);
                }
                
                this.migrations.get(fromVersion)!.push(migration);
            }
        }
        ```
    2.  **[Task 5.2]** **자동 백업 시스템:** 정기적인 자동 백업과 백업 로테이션을 구현합니다.
    3.  **[Task 5.3]** **데이터 압축:** 저장 공간 최적화를 위한 데이터 압축과 해제를 구현합니다.
    4.  **[Task 5.4]** **성능 모니터링:** 데이터 시스템의 성능 메트릭 수집과 최적화를 구현합니다.
    5.  **[Task 5.5]** **전체 데이터 시스템 통합 테스트:** 모든 데이터 관리 기능이 통합되어 완벽하게 동작하는지 검증합니다.

---

## 4. 🔧 주요 구현 세부사항

### 4.1. 트랜잭션 기반 데이터 처리

```typescript
// 데이터 무결성을 보장하는 트랜잭션 시스템
export class DataTransaction {
    private operations: TransactionOperation[] = [];
    private rollbackOperations: TransactionOperation[] = [];
    private isCommitted: boolean = false;
    
    addOperation(operation: TransactionOperation): void {
        if (this.isCommitted) {
            throw new Error('Cannot add operations to committed transaction');
        }
        
        this.operations.push(operation);
        this.rollbackOperations.unshift(operation.getRollbackOperation());
    }
    
    async commit(): Promise<boolean> {
        try {
            // 모든 작업을 순차적으로 실행
            for (const operation of this.operations) {
                await operation.execute();
            }
            
            this.isCommitted = true;
            return true;
        } catch (error) {
            console.error('Transaction failed, rolling back:', error);
            await this.rollback();
            return false;
        }
    }
    
    async rollback(): Promise<void> {
        // 역순으로 롤백 작업 실행
        for (const rollbackOp of this.rollbackOperations) {
            try {
                await rollbackOp.execute();
            } catch (rollbackError) {
                console.error('Rollback operation failed:', rollbackError);
            }
        }
    }
}

// 사용 예시
const transaction = new DataTransaction();
transaction.addOperation(new SavePlayerDataOperation(playerData));
transaction.addOperation(new SaveInventoryDataOperation(inventoryData));
transaction.addOperation(new UpdateProgressDataOperation(progressData));

const success = await transaction.commit();
```

### 4.2. 데이터 압축 및 최적화

```typescript
// 효율적인 데이터 압축 시스템
export class DataCompressor {
    private compressionThreshold: number = 1024; // 1KB 이상일 때 압축
    private compressionRatio: number = 0;
    
    compress(data: string): CompressedData {
        if (data.length < this.compressionThreshold) {
            return {
                data: data,
                compressed: false,
                originalSize: data.length,
                compressedSize: data.length
            };
        }
        
        // LZ77 기반 압축 (간단한 구현 예시)
        const compressed = this.lz77Compress(data);
        this.compressionRatio = 1 - (compressed.length / data.length);
        
        return {
            data: compressed,
            compressed: true,
            originalSize: data.length,
            compressedSize: compressed.length
        };
    }
    
    decompress(compressedData: CompressedData): string {
        if (!compressedData.compressed) {
            return compressedData.data;
        }
        
        return this.lz77Decompress(compressedData.data);
    }
    
    private lz77Compress(input: string): string {
        const windowSize = 4096;
        const lookaheadSize = 18;
        let result = '';
        let position = 0;
        
        while (position < input.length) {
            const windowStart = Math.max(0, position - windowSize);
            const window = input.substring(windowStart, position);
            const lookahead = input.substring(position, position + lookaheadSize);
            
            const match = this.findLongestMatch(window, lookahead);
            
            if (match.length > 2) {
                // 일치하는 패턴을 찾았을 때
                result += `<${match.distance},${match.length}>`;
                position += match.length;
            } else {
                // 일치하는 패턴이 없을 때
                result += input[position];
                position++;
            }
        }
        
        return result;
    }
}
```

### 4.3. 실시간 데이터 검증

```typescript
// 실시간 데이터 무결성 검증 시스템
export class DataIntegrityMonitor {
    private checksums: Map<string, string> = new Map();
    private validationRules: Map<string, ValidationRule[]> = new Map();
    
    calculateChecksum(data: any): string {
        const serialized = JSON.stringify(data);
        return this.sha256(serialized);
    }
    
    validateData(key: string, data: any): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // 체크섬 검증
        const currentChecksum = this.calculateChecksum(data);
        const expectedChecksum = this.checksums.get(key);
        
        if (expectedChecksum && currentChecksum !== expectedChecksum) {
            result.isValid = false;
            result.errors.push('Data integrity check failed: checksum mismatch');
        }
        
        // 규칙 기반 검증
        const rules = this.validationRules.get(key) || [];
        
        for (const rule of rules) {
            const ruleResult = rule.validate(data);
            
            if (!ruleResult.isValid) {
                result.isValid = false;
                result.errors.push(...ruleResult.errors);
            }
            
            result.warnings.push(...ruleResult.warnings);
        }
        
        return result;
    }
    
    startMonitoring(key: string, data: any): void {
        // 초기 체크섬 저장
        this.checksums.set(key, this.calculateChecksum(data));
        
        // 주기적 검증 시작
        setInterval(() => {
            const currentData = DataManager.getInstance().getCachedData(key);
            if (currentData) {
                const validation = this.validateData(key, currentData);
                
                if (!validation.isValid) {
                    EventBus.getInstance().emit('data_integrity_violation', {
                        key: key,
                        errors: validation.errors
                    });
                }
            }
        }, 60000); // 1분마다 검증
    }
}
```

---

## 5. 🔑 핵심 성공 요인

1.  **데이터 설계 문서 완벽 준수:** `09-Data-Management.md`에 정의된 모든 데이터 관리 기능을 정확히 구현합니다.

2.  **보안 우선:** 모든 민감 데이터는 암호화되어 저장되고, 전송 중에도 보안이 유지되어야 합니다.

3.  **성능 최적화:** 캐시와 압축을 통해 데이터 접근 속도와 저장 효율성을 극대화합니다.

4.  **안정성 보장:** 데이터 손실이나 손상을 방지하는 다중 백업과 검증 시스템을 구현합니다.

5.  **확장성 고려:** 향후 추가될 새로운 데이터 타입과 기능을 쉽게 수용할 수 있는 구조를 유지합니다.

---

## 6. 📊 성능 목표 및 검증 기준

### 6.1. 성능 목표
- **저장 속도:** 게임 데이터 저장이 500ms 이내 완료
- **로드 속도:** 게임 데이터 로딩이 1초 이내 완료
- **캐시 히트율:** 90% 이상의 캐시 히트율 달성
- **동기화 시간:** 클라우드 동기화가 5초 이내 완료

### 6.2. 검증 기준
- 데이터 암호화/복호화 과정에서 성능 저하 5% 이하
- 100MB 크기의 세이브 파일도 안정적으로 처리
- 네트워크 연결 불안정 시에도 데이터 손실 없음
- 다양한 기기에서 일관된 데이터 관리 성능 제공
- 스키마 마이그레이션이 자동으로 수행되어 호환성 유지

이 구현 계획을 통해 Shadow Archer의 데이터 관리 시스템을 완성하여 플레이어의 소중한 게임 데이터를 안전하고 효율적으로 보호하고 관리할 수 있을 것입니다.