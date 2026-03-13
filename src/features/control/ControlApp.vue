<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { RemoteCommand } from "@/remote/commands";
import { getDisplayWsUrl } from "@/remote/useRemoteChannel";
import { OVERLAY_LABELS } from "@/constants/match";
import type { OverlayKey } from "@/types/match";
import { IMPRO_TIME_PRESETS_SECONDS, PERIOD_TIME_PRESETS_SECONDS } from "@/constants/match";

const host = ref("");
const port = ref(8765);
const ws = ref<WebSocket | null>(null);
const connected = ref(false);
const connectError = ref<string | null>(null);

const controlUrl = computed(() => {
  if (!host.value.trim()) return null;
  return getDisplayWsUrl(host.value.trim(), port.value);
});

function parseQueryParams() {
  const params = new URLSearchParams(location.search);
  const h = params.get("host");
  const p = params.get("port");
  if (h) host.value = h;
  if (p) {
    const n = parseInt(p, 10);
    if (!Number.isNaN(n)) port.value = n;
  }
}

onMounted(() => {
  parseQueryParams();
  if (host.value.trim() && port.value > 0) {
    connect();
  }
});

function connect() {
  const url = controlUrl.value;
  if (!url) {
    connectError.value = "Indiquez l’adresse de l’affichage";
    return;
  }
  connectError.value = null;
  try {
    const socket = new WebSocket(url);
    ws.value = socket;
    socket.onopen = () => {
      connected.value = true;
      connectError.value = null;
    };
    socket.onclose = () => {
      connected.value = false;
      ws.value = null;
    };
    socket.onerror = () => {
      connectError.value = "Connexion impossible. Même Wi‑Fi ?";
    };
  } catch (e) {
    connectError.value = e instanceof Error ? e.message : "Erreur";
  }
}

function send(cmd: RemoteCommand) {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify(cmd));
  }
}

const overlayEntries = Object.entries(OVERLAY_LABELS) as Array<[OverlayKey, string]>;

function overlayIcon(key: string): string {
  const icons: Record<string, string> = {
    start_match: "▶",
    hymn: "♫",
    caucus: "☕",
    vote: "✓",
    intermission: "⏸",
    penalty: "!",
    ejection: "⛔",
    shootout: "⚡",
    stars: "★",
    overlay_custom: "✎"
  };
  return icons[key] ?? "•";
}
</script>

<template>
  <div class="control-app">
    <template v-if="!connected">
      <section class="control-connect">
        <h1>Matchpoint — Contrôle</h1>
        <p class="control-connect-hint">
          Connectez-vous au même Wi‑Fi que l’ordinateur d’affichage (ou partage de connexion), puis saisissez son adresse.
        </p>
        <form class="control-connect-form" @submit.prevent="connect">
          <label>
            <span>Adresse (IP)</span>
            <input v-model="host" type="text" placeholder="192.168.1.10" inputmode="numeric" autocomplete="off" />
          </label>
          <label>
            <span>Port</span>
            <input v-model.number="port" type="number" min="1" max="65535" />
          </label>
          <p v-if="connectError" class="control-connect-error">{{ connectError }}</p>
          <button type="submit" class="control-connect-btn">Se connecter</button>
        </form>
      </section>
    </template>

    <template v-else>
      <header class="control-header">
        <span class="control-status">Connecté</span>
        <a href="/" class="control-back">Retour affichage</a>
      </header>

      <main class="control-main">
        <section class="control-section">
          <h2>Impro</h2>
          <div class="control-field">
            <label>Titre</label>
            <input
              type="text"
              class="control-input"
              placeholder="Titre de l'improvisation"
              @keydown.enter="(e: Event) => (e.target as HTMLInputElement).blur()"
              @blur="(e: Event) => send({ type: 'set_theme', value: (e.target as HTMLInputElement).value.trim() })"
            />
          </div>
          <div class="control-field">
            <label>Catégorie</label>
            <input
              type="text"
              class="control-input"
              placeholder="Libre"
              @keydown.enter="(e: Event) => (e.target as HTMLInputElement).blur()"
              @blur="(e: Event) => send({ type: 'set_category', value: (e.target as HTMLInputElement).value.trim() })"
            />
          </div>
          <div class="control-row">
            <button type="button" class="control-btn" @click="send({ type: 'toggle_impro_type' })">
              Type (mixte / comparée / vide)
            </button>
          </div>
          <div class="control-row control-timer">
            <button type="button" class="control-btn" @click="send({ type: 'nudge_impro_preset', direction: -1 })">
              − Preset
            </button>
            <button type="button" class="control-btn primary" @click="send({ type: 'impro_toggle' })">▶ / ⏸</button>
            <button type="button" class="control-btn" @click="send({ type: 'impro_reset' })">↺</button>
            <button type="button" class="control-btn" @click="send({ type: 'nudge_impro_preset', direction: 1 })">
              + Preset
            </button>
          </div>
          <div class="control-presets">
            <button
              v-for="sec in IMPRO_TIME_PRESETS_SECONDS.slice(0, 8)"
              :key="sec"
              type="button"
              class="control-preset-btn"
              @click="send({ type: 'impro_preset', value: sec })"
            >
              {{ Math.floor(sec / 60) }}:{{ String(sec % 60).padStart(2, '0') }}
            </button>
          </div>
        </section>

        <section class="control-section">
          <h2>Équipes</h2>
          <div class="control-field">
            <label>Équipe A</label>
            <input
              type="text"
              class="control-input"
              placeholder="Rouges"
              @keydown.enter="(e: Event) => (e.target as HTMLInputElement).blur()"
              @blur="(e: Event) => send({ type: 'set_team_name', team: 'A', value: (e.target as HTMLInputElement).value.trim() })"
            />
          </div>
          <div class="control-field">
            <label>Équipe B</label>
            <input
              type="text"
              class="control-input"
              placeholder="Bleus"
              @keydown.enter="(e: Event) => (e.target as HTMLInputElement).blur()"
              @blur="(e: Event) => send({ type: 'set_team_name', team: 'B', value: (e.target as HTMLInputElement).value.trim() })"
            />
          </div>
        </section>

        <section class="control-section">
          <h2>Scores</h2>
          <div class="control-scores">
            <div class="control-team">
              <span class="control-team-label">A</span>
              <button type="button" class="control-score-btn" @click="send({ type: 'score_down', team: 'A' })">−</button>
              <button type="button" class="control-score-btn" @click="send({ type: 'score_up', team: 'A' })">+</button>
              <div class="control-penalties">
                <button
                  v-for="lvl in [0, 1, 2, 3]"
                  :key="lvl"
                  type="button"
                  class="control-penalty-dot"
                  @click="send({ type: 'penalty_set', team: 'A', level: lvl })"
                >
                  {{ lvl }}
                </button>
              </div>
            </div>
            <div class="control-team">
              <span class="control-team-label">B</span>
              <button type="button" class="control-score-btn" @click="send({ type: 'score_down', team: 'B' })">−</button>
              <button type="button" class="control-score-btn" @click="send({ type: 'score_up', team: 'B' })">+</button>
              <div class="control-penalties">
                <button
                  v-for="lvl in [0, 1, 2, 3]"
                  :key="lvl"
                  type="button"
                  class="control-penalty-dot"
                  @click="send({ type: 'penalty_set', team: 'B', level: lvl })"
                >
                  {{ lvl }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="control-section">
          <h2>Période</h2>
          <div class="control-row">
            <button type="button" class="control-btn" @click="send({ type: 'period_prev' })">← Période</button>
            <button type="button" class="control-btn" @click="send({ type: 'period_next' })">Période →</button>
          </div>
          <div class="control-row">
            <button type="button" class="control-btn" @click="send({ type: 'period_toggle' })">▶ / ⏸ Période</button>
            <button type="button" class="control-btn" @click="send({ type: 'period_reset' })">↺ Période</button>
          </div>
          <div class="control-presets">
            <button
              v-for="sec in PERIOD_TIME_PRESETS_SECONDS"
              :key="sec"
              type="button"
              class="control-preset-btn"
              @click="send({ type: 'period_preset', value: sec })"
            >
              {{ Math.floor(sec / 60) }} min
            </button>
          </div>
        </section>

        <section class="control-section">
          <h2>Annonces</h2>
          <div class="control-overlays">
            <button
              v-for="[key, label] in overlayEntries"
              :key="key"
              type="button"
              class="control-overlay-btn"
              :title="label"
              @click="key === 'overlay_custom' ? send({ type: 'overlay_custom', text: 'ANNONCE' }) : send({ type: 'overlay', key })"
            >
              <span class="control-overlay-icon">{{ overlayIcon(key) }}</span>
              <span class="control-overlay-label">{{ label }}</span>
            </button>
          </div>
          <button type="button" class="control-btn" @click="send({ type: 'overlay_clear' })">Fermer l’annonce</button>
        </section>

        <section class="control-section">
          <h2>Autres</h2>
          <div class="control-row">
            <button type="button" class="control-btn" @click="send({ type: 'cycle_team_color', team: 'A' })">
              Couleur A
            </button>
            <button type="button" class="control-btn" @click="send({ type: 'cycle_team_color', team: 'B' })">
              Couleur B
            </button>
            <button type="button" class="control-btn" @click="send({ type: 'contrast_toggle' })">Contraste</button>
            <button type="button" class="control-btn danger" @click="send({ type: 'reset_match' })">Reset match</button>
          </div>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
.control-app {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-main);
  padding: 1rem;
  padding-bottom: env(safe-area-inset-bottom);
}

.control-connect {
  max-width: 360px;
  margin: 0 auto;
  padding: 2rem 0;
}

.control-connect h1 {
  font-size: 1.5rem;
  margin: 0 0 1rem;
  font-family: var(--font-display);
}

.control-connect-hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0 0 1.5rem;
  line-height: 1.4;
}

.control-connect-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-connect-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-connect-form input {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
}

.control-connect-error {
  color: #f87171;
  font-size: 0.9rem;
  margin: 0;
}

.control-connect-btn {
  padding: 0.9rem;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: var(--bg-base);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
}

.control-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
}

.control-status {
  color: var(--success);
  font-size: 0.9rem;
}

.control-back {
  color: var(--accent);
  font-size: 0.9rem;
}

.control-main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.control-section h2 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
  color: var(--text-muted);
  font-weight: 600;
}

.control-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.control-field label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.control-input {
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
  font-size: 1rem;
  min-height: 44px;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.control-btn {
  padding: 0.65rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
  cursor: pointer;
  min-height: 44px;
}

.control-btn.primary {
  background: var(--accent);
  color: var(--bg-base);
  border-color: var(--accent);
}

.control-btn.danger {
  border-color: #f87171;
  color: #f87171;
}

.control-timer {
  align-items: center;
}

.control-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.control-preset-btn {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
  cursor: pointer;
  min-height: 40px;
}

.control-scores {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-team {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 140px;
}

.control-team-label {
  font-weight: 700;
  width: 1.5rem;
}

.control-score-btn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font-size: 1.25rem;
  cursor: pointer;
}

.control-penalties {
  display: flex;
  gap: 0.25rem;
}

.control-penalty-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font-size: 0.85rem;
  cursor: pointer;
}

.control-overlays {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.control-overlay-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
  cursor: pointer;
  min-height: 52px;
}

.control-overlay-icon {
  font-size: 1.25rem;
}

.control-overlay-label {
  font-size: 0.7rem;
  text-align: center;
  line-height: 1.2;
}
</style>
