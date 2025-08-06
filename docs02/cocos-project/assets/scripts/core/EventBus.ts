/**
 * [의도] Sweet Puzzle 이벤트 버스 시스템
 * [책임] 컴포넌트 간의 느슨한 결합을 위한 이벤트 발행/구독 패턴 구현
 */

import { _decorator } from 'cc';
const { ccclass } = _decorator;

type EventHandler = (...args: any[]) => void;

@ccclass('EventBus')
export class EventBus {
    private static instance: EventBus;
    private eventHandlers: Map<string, EventHandler[]> = new Map();
    private onceHandlers: Map<string, EventHandler[]> = new Map();
    
    static getInstance(): EventBus {
        if (!this.instance) {
            this.instance = new EventBus();
        }
        return this.instance;
    }

    /**
     * [의도] 이벤트 구독
     */
    on(eventName: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName)!.push(handler);
    }

    /**
     * [의도] 일회성 이벤트 구독
     */
    once(eventName: string, handler: EventHandler): void {
        if (!this.onceHandlers.has(eventName)) {
            this.onceHandlers.set(eventName, []);
        }
        this.onceHandlers.get(eventName)!.push(handler);
    }

    /**
     * [의도] 이벤트 구독 해제
     */
    off(eventName: string, handler?: EventHandler): void {
        if (!handler) {
            // 모든 핸들러 제거
            this.eventHandlers.delete(eventName);
            this.onceHandlers.delete(eventName);
            return;
        }

        // 특정 핸들러 제거
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
            if (handlers.length === 0) {
                this.eventHandlers.delete(eventName);
            }
        }

        const onceHandlers = this.onceHandlers.get(eventName);
        if (onceHandlers) {
            const index = onceHandlers.indexOf(handler);
            if (index > -1) {
                onceHandlers.splice(index, 1);
            }
            if (onceHandlers.length === 0) {
                this.onceHandlers.delete(eventName);
            }
        }
    }

    /**
     * [의도] 이벤트 발행
     */
    emit(eventName: string, ...args: any[]): void {
        // 일반 핸들러 실행
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`Error in event handler for '${eventName}':`, error);
                }
            });
        }

        // 일회성 핸들러 실행 후 제거
        const onceHandlers = this.onceHandlers.get(eventName);
        if (onceHandlers) {
            const handlersToExecute = [...onceHandlers];
            this.onceHandlers.delete(eventName);
            
            handlersToExecute.forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`Error in once event handler for '${eventName}':`, error);
                }
            });
        }
    }

    /**
     * [의도] 모든 이벤트 핸들러 제거
     */
    clear(): void {
        this.eventHandlers.clear();
        this.onceHandlers.clear();
    }

    /**
     * [의도] 등록된 이벤트 목록 반환
     */
    getEventNames(): string[] {
        const allEvents = new Set([
            ...this.eventHandlers.keys(),
            ...this.onceHandlers.keys()
        ]);
        return Array.from(allEvents);
    }

    /**
     * [의도] 특정 이벤트의 핸들러 개수 반환
     */
    getHandlerCount(eventName: string): number {
        const regularCount = this.eventHandlers.get(eventName)?.length || 0;
        const onceCount = this.onceHandlers.get(eventName)?.length || 0;
        return regularCount + onceCount;
    }
}