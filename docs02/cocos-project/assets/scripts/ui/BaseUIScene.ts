/**
 * [의도] 모든 UI 씬의 기본 클래스
 * [책임] 공통 라이프사이클 관리, 데이터 수신, 상태 관리
 */

import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BaseUIScene')
export class BaseUIScene extends Component {
    
    @property(Node)
    protected rootNode: Node = null!;
    
    protected isActive: boolean = false;
    protected sceneData: any = null;
    
    /**
     * [의도] 씬 진입 시 호출
     */
    public onSceneEnter(): void {
        this.isActive = true;
        this.setupScene();
        this.bindEvents();
        console.log(`[BaseUIScene] ${this.constructor.name} 씬 진입`);
    }
    
    /**
     * [의도] 씬 퇴장 시 호출
     */
    public onSceneExit(): void {
        this.isActive = false;
        this.unbindEvents();
        this.cleanupScene();
        console.log(`[BaseUIScene] ${this.constructor.name} 씬 퇴장`);
    }
    
    /**
     * [의도] 외부에서 데이터 전달 시 호출
     */
    public onReceiveData(data: any): void {
        this.sceneData = data;
        this.handleDataUpdate();
        console.log(`[BaseUIScene] ${this.constructor.name} 데이터 수신:`, data);
    }
    
    /**
     * [의도] 씬 초기 설정 (상속 클래스에서 구현)
     */
    protected setupScene(): void {
        // 상속 클래스에서 오버라이드
    }
    
    /**
     * [의도] 씬 정리 (상속 클래스에서 구현)
     */
    protected cleanupScene(): void {
        // 상속 클래스에서 오버라이드
    }
    
    /**
     * [의도] 이벤트 바인딩 (상속 클래스에서 구현)
     */
    protected bindEvents(): void {
        // 상속 클래스에서 오버라이드
    }
    
    /**
     * [의도] 이벤트 언바인딩 (상속 클래스에서 구현)
     */
    protected unbindEvents(): void {
        // 상속 클래스에서 오버라이드
    }
    
    /**
     * [의도] 데이터 업데이트 처리 (상속 클래스에서 구현)
     */
    protected handleDataUpdate(): void {
        // 상속 클래스에서 오버라이드
    }
    
    /**
     * [의도] 현재 씬 활성 상태 확인
     */
    public getIsActive(): boolean {
        return this.isActive;
    }
    
    /**
     * [의도] 씬 데이터 조회
     */
    public getSceneData(): any {
        return this.sceneData;
    }
}