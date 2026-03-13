import { ref, watch, onUnmounted, nextTick } from "vue";
import { useMatchStore } from "@/stores/matchStore";
import { runRemoteCommand } from "./commandRunner";
import type { RemoteStateSnapshot } from "@/types/match";
import {
  isSessionCreated,
  isSessionError,
  isCommandMessage,
  isRemoteCommand,
  isRemoteConnectedMessage
} from "./commands";

function unwrapUrl(wsUrl: unknown): string | null {
  if (wsUrl == null) return null;
  if (typeof wsUrl === "function") return (wsUrl as () => string | null)() ?? null;
  if (typeof wsUrl === "object" && wsUrl !== null && "value" in wsUrl) {
    const v = (wsUrl as { value: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return typeof wsUrl === "string" ? wsUrl : null;
}

export interface RemoteChannelOptions {
  onFullscreenToggle?: () => void;
  /** Appelé quand un remote rejoint ; utilisé pour envoyer immédiatement l’état (sync bidirectionnelle). */
  getState?: () => RemoteStateSnapshot;
}

export function useRemoteChannel(backendWsUrl: unknown, options?: RemoteChannelOptions) {
  const store = useMatchStore();
  const onFullscreenToggle = options?.onFullscreenToggle;
  const getState = options?.getState;
  const sessionInfo = ref<{ sessionId: string; joinCode: string } | null>(null);
  const connected = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;

  function sendState(snapshot: RemoteStateSnapshot) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "state", payload: snapshot }));
    }
  }

  function connect(url: string) {
    if (!url || url.trim() === "") return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "WebSocket error";
      return;
    }

    ws.onopen = () => {
      error.value = null;
      ws?.send(JSON.stringify({ type: "session:create" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        if (isSessionCreated(data)) {
          sessionInfo.value = { sessionId: data.sessionId, joinCode: data.joinCode };
          connected.value = true;
          return;
        }
        if (isSessionError(data)) {
          error.value = data.message;
          sessionInfo.value = null;
          return;
        }
        if (isRemoteConnectedMessage(data) && getState) {
          sendState(getState());
          return;
        }
        if (isCommandMessage(data) && data.payload != null) {
          const cmd = data.payload;
          if (cmd.type === "fullscreen_toggle" && onFullscreenToggle) {
            onFullscreenToggle();
            return;
          }
          try {
            runRemoteCommand(cmd, store);
          } catch (err) {
            console.warn("[Matchpoint] Commande remote ignorée:", err);
          }
          return;
        }
        if (isRemoteCommand(data)) {
          if (data.type === "fullscreen_toggle" && onFullscreenToggle) {
            onFullscreenToggle();
            return;
          }
          try {
            runRemoteCommand(data, store);
          } catch (err) {
            console.warn("[Matchpoint] Commande remote ignorée:", err);
          }
        }
      } catch {
        // ignore invalid JSON
      }
    };

    ws.onclose = () => {
      connected.value = false;
      sessionInfo.value = null;
      ws = null;
    };

    ws.onerror = () => {
      error.value = "Connexion impossible";
    };
  }

  function disconnect() {
    if (ws) {
      ws.close();
      ws = null;
    }
    connected.value = false;
    sessionInfo.value = null;
  }

  const stopWatch = watch(
    () => unwrapUrl(backendWsUrl),
    (url) => {
      disconnect();
      if (url && typeof url === "string") {
        nextTick(() => {
          try {
            connect(url);
          } catch (e) {
            error.value = e instanceof Error ? e.message : "Erreur connexion";
          }
        });
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    stopWatch();
    disconnect();
  });

  return { sessionInfo, connected, error, disconnect, sendState };
}
