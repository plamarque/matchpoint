import { ref, watch, onUnmounted, nextTick } from "vue";
import { useMatchStore } from "@/stores/matchStore";
import { runRemoteCommand } from "./commandRunner";
import { isServerInfo, isRemoteCommand } from "./commands";

const DEFAULT_WS_PORT = 8765;

function unwrapUrl(wsUrl: unknown): string | null {
  if (wsUrl == null) return null;
  if (typeof wsUrl === "function") return (wsUrl as () => string | null)() ?? null;
  if (typeof wsUrl === "object" && wsUrl !== null && "value" in wsUrl) {
    const v = (wsUrl as { value: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return typeof wsUrl === "string" ? wsUrl : null;
}

export function getDisplayWsUrl(host: string, port = DEFAULT_WS_PORT): string {
  if (typeof host !== "string" || !host.trim()) return "";
  const protocol =
    typeof location !== "undefined" && location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${host}:${port}`;
}

export function useRemoteChannel(wsUrl: unknown) {
  const store = useMatchStore();
  const serverInfo = ref<{ host: string; port: number } | null>(null);
  const connected = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1500;

  function connect(url: string) {
    if (!url || url.trim() === "") return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "WebSocket error";
      scheduleReconnect(url);
      return;
    }

    ws.onopen = () => {
      connected.value = true;
      error.value = null;
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        if (isServerInfo(data)) {
          serverInfo.value = { host: data.host, port: data.port };
          return;
        }
        if (isRemoteCommand(data)) {
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
      ws = null;
      try {
        const urlToUse = unwrapUrl(wsUrl);
        if (urlToUse) scheduleReconnect(urlToUse);
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      error.value = "Connexion WebSocket en erreur";
    };
  }

  function scheduleReconnect(url: string) {
    if (reconnectTimeout) return;
    if (reconnectAttempts >= maxReconnectAttempts) return;
    const delay = Math.min(baseReconnectDelay * Math.pow(1.5, reconnectAttempts), 30000);
    reconnectAttempts += 1;
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect(url);
    }, delay);
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected.value = false;
    serverInfo.value = null;
  }

  const stopWatch = watch(
    () => {
      try {
        return unwrapUrl(wsUrl);
      } catch {
        return null;
      }
    },
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

  return { serverInfo, connected, error, disconnect };
}
