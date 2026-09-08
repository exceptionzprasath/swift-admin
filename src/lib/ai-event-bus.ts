// SWIFT AI — Unified Reactive Real-time Event Bus
import type { AIEventPayloadMap, AIEventType } from "./ai-unified-types";

type Handler<T> = (payload: T) => void;

class TypedBus {
  private handlers = new Map<string, Set<Handler<any>>>();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        this.broadcastChannel = new BroadcastChannel("swift_ai_realtime_events");
        this.broadcastChannel.onmessage = (event) => {
          if (event?.data?.type && event?.data?.payload) {
            this.emitLocal(event.data.type, event.data.payload);
          }
        };
      } catch (err) {
        console.warn("[SWIFT AI] BroadcastChannel not supported in this environment:", err);
      }
    }
  }

  on<K extends AIEventType>(event: K, handler: Handler<AIEventPayloadMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends AIEventType>(event: K, payload: AIEventPayloadMap[K], broadcast = true): void {
    this.emitLocal(event, payload);
    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: event, payload });
      } catch (err) {
        console.warn("[SWIFT AI] Failed to post event to BroadcastChannel:", err);
      }
    }
  }

  private emitLocal<K extends AIEventType>(event: K, payload: AIEventPayloadMap[K]): void {
    const set = this.handlers.get(event);
    if (set && set.size > 0) {
      set.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[SWIFT AI Bus] Error in handler for event "${event}":`, err);
        }
      });
    }
  }
}

export const aiEventBus = new TypedBus();
