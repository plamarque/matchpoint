<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { RemoteCommand } from "@/remote/commands";
import { isSessionJoinedMessage, isSessionError, isStateMessage } from "@/remote/commands";
import type { RemoteStateSnapshot } from "@/types/match";
import { getNextTeamColor, OVERLAY_LABELS, PERIOD_LABELS, TEAM_PALETTES } from "@/constants/match";
import type { OverlayKey } from "@/types/match";
import type { TeamKey } from "@/types/match";

const backendWsUrl = (import.meta.env as { VITE_REMOTE_BACKEND_WS_URL?: string }).VITE_REMOTE_BACKEND_WS_URL ?? "";
const code = ref("");
const ws = ref<WebSocket | null>(null);
const connected = ref(false);
const connectError = ref<string | null>(null);

/** Overlay actuellement affiché (pour effet bouton poussoir, suivi local). */
const activeOverlayKey = ref<OverlayKey | null>(null);

/** Modal QR affichée sur l’écran (pour effet bouton poussoir sur le bouton QR). */
const qrVisible = ref(false);

/** État local affiché (scores, noms, couleurs, fautes) — mis à jour à chaque envoi de commande. */
const scoreA = ref(0);
const scoreB = ref(0);
const penaltyA = ref(0);
const penaltyB = ref(0);
const teamNameA = ref("Rouges");
const teamNameB = ref("Bleus");
const teamColorA = ref(TEAM_PALETTES.classic[0]);
const teamColorB = ref(TEAM_PALETTES.classic[1]);
const teamLogoA = ref<string | null>(null);
const teamLogoB = ref<string | null>(null);

const logoInputA = ref<HTMLInputElement | null>(null);
const logoInputB = ref<HTMLInputElement | null>(null);

/** Type d’impro (suivi local). */
const improType = ref<"mixte" | "comparee" | "none">("mixte");

/** Titre et catégorie (sync avec l'affichage). */
const improTheme = ref("Titre de l'improvisation");
const improCategory = ref("Libre");

/** Période courante (suivi local, index dans PERIOD_LABELS). */
const periodIndex = ref(0);

/** Même intitulé que sur l’écran d’affichage : "Période 1", "Première période", etc. */
function periodLabelDisplay(): string {
  const key = PERIOD_LABELS[periodIndex.value];
  if (!key) return "Période";
  if (key === "premiere") return "Première période";
  if (key === "derniere") return "Dernière période";
  return `Période ${key}`;
}

function sendPeriodPrev() {
  periodIndex.value = (periodIndex.value - 1 + PERIOD_LABELS.length) % PERIOD_LABELS.length;
  send({ type: "period_prev" });
}

function sendPeriodNext() {
  periodIndex.value = (periodIndex.value + 1) % PERIOD_LABELS.length;
  send({ type: "period_next" });
}

/** Saisie annonce personnalisée */
const showCustomAnnounceModal = ref(false);
const customAnnounceText = ref("");

/** Temps mémorisés pour reset (suivi local, valeur par défaut). */
const improPresetSeconds = ref(60);
const periodPresetSeconds = ref(30 * 60); // 30 min

/** État des chronos (indicatif local, pas synchronisé avec l’affichage). */
const improRunning = ref(false);
const improStartTime = ref<number | null>(null);
const improDurationSec = ref(60);
const improRemainingWhenPaused = ref<number | null>(null);
const improCountdownText = ref("—");

const periodRunning = ref(false);
const periodStartTime = ref<number | null>(null);
const periodDurationSec = ref(30 * 60);
const periodRemainingWhenPaused = ref<number | null>(null);
const periodCountdownText = ref("—");

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function tickCountdowns() {
  const now = Date.now();
  if (improRunning.value && improStartTime.value !== null) {
    const elapsed = (now - improStartTime.value) / 1000;
    const remaining = improDurationSec.value - elapsed;
    if (remaining <= 0) {
      improCountdownText.value = "0:00";
      improRunning.value = false;
      improStartTime.value = null;
    } else {
      improCountdownText.value = formatCountdown(remaining);
    }
  } else if (improRemainingWhenPaused.value !== null) {
    improCountdownText.value = formatCountdown(improRemainingWhenPaused.value);
  } else {
    improCountdownText.value = "—";
  }
  if (periodRunning.value && periodStartTime.value !== null) {
    const elapsed = (now - periodStartTime.value) / 1000;
    const remaining = periodDurationSec.value - elapsed;
    if (remaining <= 0) {
      periodCountdownText.value = "0:00";
      periodRunning.value = false;
      periodStartTime.value = null;
    } else {
      periodCountdownText.value = formatCountdown(remaining);
    }
  } else if (periodRemainingWhenPaused.value !== null) {
    periodCountdownText.value = formatCountdown(periodRemainingWhenPaused.value);
  } else {
    periodCountdownText.value = "—";
  }
}

let countdownInterval: ReturnType<typeof setInterval> | null = null;

function improToggle() {
  if (improRunning.value) {
    const elapsed = (Date.now() - (improStartTime.value ?? 0)) / 1000;
    improRemainingWhenPaused.value = Math.max(0, improDurationSec.value - elapsed);
    improRunning.value = false;
    improStartTime.value = null;
  } else {
    improRemainingWhenPaused.value = null;
    improRunning.value = true;
    improStartTime.value = Date.now();
    improDurationSec.value = improPresetSeconds.value;
  }
  send({ type: "impro_toggle" });
  tickCountdowns();
}

function improReset() {
  if (!confirm("Réinitialiser le chrono impro ?")) return;
  improRunning.value = false;
  improStartTime.value = null;
  improRemainingWhenPaused.value = null;
  send({ type: "impro_reset" });
  tickCountdowns();
}

function periodToggle() {
  if (periodRunning.value) {
    const elapsed = (Date.now() - (periodStartTime.value ?? 0)) / 1000;
    periodRemainingWhenPaused.value = Math.max(0, periodDurationSec.value - elapsed);
    periodRunning.value = false;
    periodStartTime.value = null;
  } else {
    periodRemainingWhenPaused.value = null;
    periodRunning.value = true;
    periodStartTime.value = Date.now();
    periodDurationSec.value = periodPresetSeconds.value;
  }
  send({ type: "period_toggle" });
  tickCountdowns();
}

function periodReset() {
  if (!confirm("Réinitialiser le chrono période ?")) return;
  periodRunning.value = false;
  periodStartTime.value = null;
  periodRemainingWhenPaused.value = null;
  send({ type: "period_reset" });
  tickCountdowns();
}

/** Affichage du preset impro (ex. "1:00"). */
function improPresetLabel(): string {
  const s = improPresetSeconds.value;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Affichage du preset période (ex. "30 min"). */
function periodPresetLabel(): string {
  const s = periodPresetSeconds.value;
  const m = Math.floor(s / 60);
  return m <= 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const IMPRO_MAX_SECONDS = 900;
const PERIOD_MIN_SECONDS = 60;
const PERIOD_MAX_SECONDS = 7200;

/** Pas des secondes : cycle 00, 10, 30, 45. */
const SECOND_STEPS = [0, 10, 30, 45] as const;

function snapToSecondStep(sec: number): number {
  let best = 0;
  let bestDist = 99;
  for (const s of SECOND_STEPS) {
    const d = Math.abs(sec - s);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function cycleSecondStep(current: number, direction: 1 | -1): number {
  const val = snapToSecondStep(current);
  const idx = Math.max(0, SECOND_STEPS.indexOf(val as (typeof SECOND_STEPS)[number]));
  const next = idx + direction;
  if (next < 0) return SECOND_STEPS[SECOND_STEPS.length - 1];
  if (next >= SECOND_STEPS.length) return SECOND_STEPS[0];
  return SECOND_STEPS[next];
}

function setImproPresetAndSend(seconds: number) {
  const sec = Math.max(0, Math.min(IMPRO_MAX_SECONDS, Math.round(seconds)));
  improPresetSeconds.value = sec;
  improMinutesInput.value = String(Math.floor(sec / 60));
  improSecondsInput.value = String(sec % 60);
  send({ type: "impro_preset", value: sec });
}

function setPeriodPresetAndSend(seconds: number) {
  const sec = Math.max(PERIOD_MIN_SECONDS, Math.min(PERIOD_MAX_SECONDS, Math.round(seconds)));
  periodPresetSeconds.value = sec;
  periodMinutesInput.value = String(Math.floor(sec / 60));
  periodSecondsInput.value = String(sec % 60);
  send({ type: "period_preset", value: sec });
}

/** Saisie libre : champs minutes et secondes (impro). */
const improMinutesInput = ref("1");
const improSecondsInput = ref("0");

function applyImproFromMinSec() {
  const min = Math.max(0, parseInt(improMinutesInput.value, 10) || 0);
  const secRaw = Math.max(0, Math.min(59, parseInt(improSecondsInput.value, 10) || 0));
  const sec = snapToSecondStep(secRaw);
  improSecondsInput.value = String(sec);
  const total = min * 60 + sec;
  setImproPresetAndSend(total);
}

/** Saisie libre : champs minutes et secondes (période). */
const periodMinutesInput = ref("30");
const periodSecondsInput = ref("0");

function applyPeriodFromMinSec() {
  const min = Math.max(0, parseInt(periodMinutesInput.value, 10) || 0);
  const secRaw = Math.max(0, Math.min(59, parseInt(periodSecondsInput.value, 10) || 0));
  const sec = snapToSecondStep(secRaw);
  periodSecondsInput.value = String(sec);
  const total = min * 60 + sec;
  setPeriodPresetAndSend(total);
}

function nudgeImproMinutes(delta: number) {
  const min = Math.max(0, Math.min(15, (parseInt(improMinutesInput.value, 10) || 0) + delta));
  improMinutesInput.value = String(min);
  applyImproFromMinSec();
}

function nudgeImproSeconds(direction: 1 | -1) {
  const current = parseInt(improSecondsInput.value, 10) || 0;
  improSecondsInput.value = String(cycleSecondStep(current, direction));
  applyImproFromMinSec();
}

function nudgePeriodMinutes(delta: number) {
  const min = Math.max(0, Math.min(120, (parseInt(periodMinutesInput.value, 10) || 0) + delta));
  periodMinutesInput.value = String(min);
  applyPeriodFromMinSec();
}

function nudgePeriodSeconds(direction: 1 | -1) {
  const current = parseInt(periodSecondsInput.value, 10) || 0;
  periodSecondsInput.value = String(cycleSecondStep(current, direction));
  applyPeriodFromMinSec();
}

/** Applique un snapshot d’état reçu du backend (sync bidirectionnelle). */
function applyState(payload: RemoteStateSnapshot) {
  const tA = payload.teamA;
  const tB = payload.teamB;
  scoreA.value = Math.max(0, tA?.score ?? 0);
  scoreB.value = Math.max(0, tB?.score ?? 0);
  penaltyA.value = Math.min(3, Math.max(0, tA?.penalties ?? 0));
  penaltyB.value = Math.min(3, Math.max(0, tB?.penalties ?? 0));
  teamNameA.value = tA?.name?.trim() || "Rouges";
  teamNameB.value = tB?.name?.trim() || "Bleus";
  teamColorA.value = tA?.colorToken ?? TEAM_PALETTES.classic[0];
  teamColorB.value = tB?.colorToken ?? TEAM_PALETTES.classic[1];
  const la = tA?.logoDataUrl;
  const lb = tB?.logoDataUrl;
  teamLogoA.value = typeof la === "string" && la.length > 0 ? la : null;
  teamLogoB.value = typeof lb === "string" && lb.length > 0 ? lb : null;

  const idx = Number(payload.periodIndex);
  periodIndex.value = Number.isFinite(idx) && idx >= 0 && idx < PERIOD_LABELS.length ? idx : 0;

  const impro = payload.impro;
  if (impro) {
    improTheme.value = typeof impro.theme === "string" ? impro.theme : "Titre de l'improvisation";
    improCategory.value = typeof impro.category === "string" ? impro.category : "Libre";
    improType.value = impro.type ?? "mixte";
    const improPreset = Math.max(0, impro.presetSeconds ?? 60);
    improPresetSeconds.value = improPreset;
    improMinutesInput.value = String(Math.floor(improPreset / 60));
    improSecondsInput.value = String(improPreset % 60);
    const rem = Math.max(0, impro.remainingSeconds ?? 60);
    if (impro.isRunning) {
      improRunning.value = true;
      improStartTime.value = Date.now();
      improDurationSec.value = rem;
      improRemainingWhenPaused.value = null;
      improCountdownText.value = formatCountdown(rem);
    } else {
      improRunning.value = false;
      improStartTime.value = null;
      improRemainingWhenPaused.value = rem;
      improCountdownText.value = formatCountdown(rem);
    }
  }

  const pTimer = payload.periodTimer;
  if (pTimer) {
    const periodPreset = Math.max(60, pTimer.presetSeconds ?? 30 * 60);
    periodPresetSeconds.value = periodPreset;
    periodMinutesInput.value = String(Math.floor(periodPreset / 60));
    periodSecondsInput.value = String(periodPreset % 60);
    const pRem = Math.max(0, pTimer.remainingSeconds ?? 30 * 60);
    if (pTimer.isRunning) {
      periodRunning.value = true;
      periodStartTime.value = Date.now();
      periodDurationSec.value = pRem;
      periodRemainingWhenPaused.value = null;
      periodCountdownText.value = formatCountdown(pRem);
    } else {
      periodRunning.value = false;
      periodStartTime.value = null;
      periodRemainingWhenPaused.value = pRem;
      periodCountdownText.value = formatCountdown(pRem);
    }
  }

  const ov = payload.overlay;
  activeOverlayKey.value = (ov?.activeOverlay ?? null) as OverlayKey | null;

  if (payload.showRemoteQrModal !== undefined) {
    qrVisible.value = payload.showRemoteQrModal;
  }
}

function parseQueryParams() {
  const params = new URLSearchParams(location.search);
  const c = params.get("code");
  if (c) code.value = c.trim();
}

onMounted(() => {
  parseQueryParams();
  if (code.value && backendWsUrl) {
    connect();
  }
  countdownInterval = setInterval(tickCountdowns, 1000);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
});

function connect() {
  const joinCode = code.value.trim().toUpperCase();
  if (!joinCode) {
    connectError.value = "Saisissez le code affiché sur l’écran d’affichage";
    return;
  }
  if (!backendWsUrl) {
    connectError.value = "La télécommande n’est pas configurée.";
    return;
  }
  connectError.value = null;
  try {
    const socket = new WebSocket(backendWsUrl);
    ws.value = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "session:join", joinCode }));
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        if (isSessionJoinedMessage(data)) {
          connected.value = true;
          connectError.value = null;
          return;
        }
        if (isSessionError(data)) {
          connectError.value = data.message;
          return;
        }
        if (isStateMessage(data) && data.payload) {
          applyState(data.payload);
        }
      } catch {
        // ignore
      }
    };
    socket.onclose = () => {
      connected.value = false;
      ws.value = null;
    };
    socket.onerror = () => {
      connectError.value = "Vérifiez le code ou la connexion Internet.";
    };
  } catch (e) {
    connectError.value = e instanceof Error ? e.message : "Erreur";
  }
}

function send(cmd: RemoteCommand) {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ type: "command", payload: cmd }));
  }
}

/** Reset match côté afficheur + synchroniser les couleurs locales (palette classique comme le store). */
function resetMatch() {
  teamColorA.value = TEAM_PALETTES.classic[0];
  teamColorB.value = TEAM_PALETTES.classic[1];
  teamLogoA.value = null;
  teamLogoB.value = null;
  send({ type: "reset_match" });
}

function sendScoreUp(team: TeamKey) {
  if (team === "A") scoreA.value += 1;
  else scoreB.value += 1;
  send({ type: "score_up", team });
}

function sendScoreDown(team: TeamKey) {
  if (team === "A") scoreA.value = Math.max(0, scoreA.value - 1);
  else scoreB.value = Math.max(0, scoreB.value - 1);
  send({ type: "score_down", team });
}

function sendSetTeamName(team: TeamKey, value: string) {
  const v = value.trim() || (team === "A" ? "Rouges" : "Bleus");
  if (team === "A") teamNameA.value = v;
  else teamNameB.value = v;
  send({ type: "set_team_name", team, value: v });
}

function cycleTeamColor(team: TeamKey) {
  const current = team === "A" ? teamColorA.value : teamColorB.value;
  const next = getNextTeamColor(current);
  if (team === "A") teamColorA.value = next;
  else teamColorB.value = next;
  send({ type: "cycle_team_color", team });
}

function openLogoPicker(team: TeamKey) {
  const el = team === "A" ? logoInputA.value : logoInputB.value;
  el?.click();
}

function onTeamLogoFile(team: TeamKey, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !file.type.startsWith("image/")) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const data = reader.result;
    if (typeof data !== "string") return;
    if (team === "A") teamLogoA.value = data;
    else teamLogoB.value = data;
    send({ type: "set_team_logo", team, dataUrl: data });
  };
  reader.readAsDataURL(file);
}

function sendSetImproType(value: "mixte" | "comparee" | "none") {
  improType.value = value;
  send({ type: "set_impro_type", value });
}

function sendPenaltySet(team: TeamKey, level: number) {
  const lvl = Math.max(0, Math.min(3, level));
  if (team === "A") penaltyA.value = lvl;
  else penaltyB.value = lvl;
  send({ type: "penalty_set", team, level: lvl });
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

function onOverlayClick(key: OverlayKey) {
  if (key === "overlay_custom") {
    customAnnounceText.value = "";
    showCustomAnnounceModal.value = true;
    return;
  }
  if (activeOverlayKey.value === key) {
    send({ type: "overlay_clear" });
    activeOverlayKey.value = null;
  } else {
    send({ type: "overlay", key });
    activeOverlayKey.value = key;
  }
}

function submitCustomAnnounce() {
  const text = customAnnounceText.value.trim() || "ANNONCE";
  send({ type: "overlay_custom", text });
  activeOverlayKey.value = "overlay_custom";
  showCustomAnnounceModal.value = false;
  customAnnounceText.value = "";
}

function onCustomAnnounceButtonClick() {
  if (activeOverlayKey.value === "overlay_custom") {
    send({ type: "overlay_clear" });
    activeOverlayKey.value = null;
  } else {
    customAnnounceText.value = "";
    showCustomAnnounceModal.value = true;
  }
}

</script>

<template>
  <div class="control-app">
    <template v-if="!connected">
      <section class="control-connect">
        <h1>Matchpoint — Contrôle</h1>
        <p class="control-connect-hint">
          Scannez le QR code affiché sur l’écran d’affichage, ou saisissez le code de session.
        </p>
        <form class="control-connect-form" @submit.prevent="connect">
          <label>
            <span>Code de session</span>
            <input v-model="code" type="text" placeholder="ABC123" inputmode="text" autocomplete="off" maxlength="12" />
          </label>
          <p v-if="connectError" class="control-connect-error">{{ connectError }}</p>
          <button type="submit" class="control-connect-btn">Rejoindre</button>
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
          <div class="control-field">
            <input
              v-model="improTheme"
              type="text"
              class="control-input"
              placeholder="Titre de l'improvisation"
              aria-label="Titre"
              @keydown.enter="(e: Event) => (e.target as HTMLInputElement).blur()"
              @blur="send({ type: 'set_theme', value: improTheme.trim() })"
            />
          </div>
          <div class="control-field">
            <input
              v-model="improCategory"
              type="text"
              class="control-input"
              placeholder="Libre"
              aria-label="Catégorie"
              @keydown.enter="(e: Event) => (e.target as HTMLInputElement).blur()"
              @blur="send({ type: 'set_category', value: improCategory.trim() })"
            />
          </div>
          <div class="control-field">
            <div class="control-radio-group" role="radiogroup" aria-label="Type d’impro">
              <label class="control-radio">
                <input v-model="improType" type="radio" value="mixte" @change="sendSetImproType('mixte')" />
                <span>Mixte</span>
              </label>
              <label class="control-radio">
                <input v-model="improType" type="radio" value="comparee" @change="sendSetImproType('comparee')" />
                <span>Comparée</span>
              </label>
              <label class="control-radio">
                <input v-model="improType" type="radio" value="none" @change="sendSetImproType('none')" />
                <span>Vide</span>
              </label>
            </div>
          </div>
          <div v-if="improCountdownText !== '—'" class="control-section-head">
            <span class="control-countdown control-countdown-head" aria-live="polite">{{ improCountdownText }}</span>
          </div>
          <div class="control-timer-row">
            <label class="control-timer-minsec-label">
              <span>Minutes</span>
              <div class="control-timer-stepper">
                <input
                  v-model="improMinutesInput"
                  type="number"
                  class="control-input control-timer-input-num"
                  min="0"
                  max="15"
                  inputmode="numeric"
                  @keydown.enter="applyImproFromMinSec"
                  @blur="applyImproFromMinSec"
                />
                <div class="control-timer-arrows">
                  <button type="button" class="control-timer-arrow" aria-label="Augmenter minutes" @click="nudgeImproMinutes(1)">▲</button>
                  <button type="button" class="control-timer-arrow" aria-label="Diminuer minutes" @click="nudgeImproMinutes(-1)">▼</button>
                </div>
              </div>
            </label>
            <label class="control-timer-minsec-label">
              <span>Secondes</span>
              <div class="control-timer-stepper">
                <input
                  v-model="improSecondsInput"
                  type="number"
                  class="control-input control-timer-input-num"
                  min="0"
                  max="59"
                  inputmode="numeric"
                  @keydown.enter="applyImproFromMinSec"
                  @blur="applyImproFromMinSec"
                />
                <div class="control-timer-arrows">
                  <button type="button" class="control-timer-arrow" aria-label="Augmenter secondes" @click="nudgeImproSeconds(1)">▲</button>
                  <button type="button" class="control-timer-arrow" aria-label="Diminuer secondes" @click="nudgeImproSeconds(-1)">▼</button>
                </div>
              </div>
            </label>
            <button type="button" class="control-btn" :aria-label="improRunning ? 'Pause' : 'Démarrer'" @click="improToggle">
              {{ improRunning ? "⏸" : "▶" }}
            </button>
            <button type="button" class="control-btn" aria-label="Reset chrono impro" @click="improReset">↺</button>
          </div>
        </section>

        <section class="control-section">
          <div class="control-scores">
            <div class="control-team-block">
              <div class="control-team-head">
                <button
                  type="button"
                  class="control-team-color-btn"
                  :style="{ backgroundColor: teamColorA }"
                  aria-label="Changer la couleur de l’équipe A"
                  title="Couleur"
                  @click="cycleTeamColor('A')"
                />
                <input
                  ref="logoInputA"
                  type="file"
                  class="control-team-logo-input"
                  accept="image/*"
                  tabindex="-1"
                  aria-hidden="true"
                  @change="(e) => onTeamLogoFile('A', e)"
                />
                <button
                  type="button"
                  class="control-team-logo-btn"
                  :class="{ 'control-team-logo-btn--filled': !!teamLogoA }"
                  :aria-label="teamLogoA ? 'Changer le logo équipe A — choisir une image' : 'Ajouter un logo équipe A — choisir une image'"
                  title="Logo"
                  @click="openLogoPicker('A')"
                >
                  <img v-if="teamLogoA" class="control-team-logo-img" alt="" :src="teamLogoA" />
                  <span v-else class="control-team-logo-glyph" aria-hidden="true">＋</span>
                </button>
                <input
                  v-model="teamNameA"
                  type="text"
                  class="control-input control-team-name-input"
                  placeholder="Équipe A"
                  @keydown.enter="sendSetTeamName('A', teamNameA)"
                  @blur="sendSetTeamName('A', teamNameA)"
                />
              </div>
              <div class="control-team-row">
                <div class="control-score-stepper" :style="{ backgroundColor: teamColorA }">
                  <span class="control-score-value">{{ scoreA }}</span>
                  <div class="control-score-arrows">
                    <button type="button" class="control-score-arrow" aria-label="Augmenter score" @click="sendScoreUp('A')">▲</button>
                    <button type="button" class="control-score-arrow" aria-label="Diminuer score" @click="sendScoreDown('A')">▼</button>
                  </div>
                </div>
                <div class="control-penalties">
                  <button
                    v-for="lvl in [0, 1, 2, 3]"
                    :key="lvl"
                    type="button"
                    class="control-penalty-dot"
                    :class="{ 'control-penalty-dot-active': penaltyA === lvl }"
                    :aria-pressed="penaltyA === lvl"
                    @click="sendPenaltySet('A', lvl)"
                  >
                    {{ lvl }}
                  </button>
                </div>
                <span class="control-penalty-label" aria-label="Fautes équipe A">{{ penaltyA }} faute{{ penaltyA > 1 ? 's' : '' }}</span>
              </div>
            </div>
            <div class="control-team-block">
              <div class="control-team-head">
                <button
                  type="button"
                  class="control-team-color-btn"
                  :style="{ backgroundColor: teamColorB }"
                  aria-label="Changer la couleur de l’équipe B"
                  title="Couleur"
                  @click="cycleTeamColor('B')"
                />
                <input
                  ref="logoInputB"
                  type="file"
                  class="control-team-logo-input"
                  accept="image/*"
                  tabindex="-1"
                  aria-hidden="true"
                  @change="(e) => onTeamLogoFile('B', e)"
                />
                <button
                  type="button"
                  class="control-team-logo-btn"
                  :class="{ 'control-team-logo-btn--filled': !!teamLogoB }"
                  :aria-label="teamLogoB ? 'Changer le logo équipe B — choisir une image' : 'Ajouter un logo équipe B — choisir une image'"
                  title="Logo"
                  @click="openLogoPicker('B')"
                >
                  <img v-if="teamLogoB" class="control-team-logo-img" alt="" :src="teamLogoB" />
                  <span v-else class="control-team-logo-glyph" aria-hidden="true">＋</span>
                </button>
                <input
                  v-model="teamNameB"
                  type="text"
                  class="control-input control-team-name-input"
                  placeholder="Équipe B"
                  @keydown.enter="sendSetTeamName('B', teamNameB)"
                  @blur="sendSetTeamName('B', teamNameB)"
                />
              </div>
              <div class="control-team-row">
                <div class="control-score-stepper" :style="{ backgroundColor: teamColorB }">
                  <span class="control-score-value">{{ scoreB }}</span>
                  <div class="control-score-arrows">
                    <button type="button" class="control-score-arrow" aria-label="Augmenter score" @click="sendScoreUp('B')">▲</button>
                    <button type="button" class="control-score-arrow" aria-label="Diminuer score" @click="sendScoreDown('B')">▼</button>
                  </div>
                </div>
                <div class="control-penalties">
                  <button
                    v-for="lvl in [0, 1, 2, 3]"
                    :key="lvl"
                    type="button"
                    class="control-penalty-dot"
                    :class="{ 'control-penalty-dot-active': penaltyB === lvl }"
                    :aria-pressed="penaltyB === lvl"
                    @click="sendPenaltySet('B', lvl)"
                  >
                    {{ lvl }}
                  </button>
                </div>
                <span class="control-penalty-label" aria-label="Fautes équipe B">{{ penaltyB }} faute{{ penaltyB > 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="control-section">
          <div class="control-overlays">
            <button
              v-for="[key, label] in overlayEntries"
              :key="key"
              type="button"
              class="control-overlay-btn"
              :class="{ 'control-overlay-btn-active': activeOverlayKey === key }"
              :title="label"
              @click="key === 'overlay_custom' ? onCustomAnnounceButtonClick() : onOverlayClick(key)"
            >
              <span class="control-overlay-icon">{{ overlayIcon(key) }}</span>
              <span class="control-overlay-label">{{ label }}</span>
            </button>
          </div>
        </section>

        <section class="control-section">
          <div v-if="periodCountdownText !== '—'" class="control-section-head">
            <span class="control-countdown control-countdown-head" aria-live="polite">{{ periodCountdownText }}</span>
          </div>
          <div class="control-row control-row-period">
            <button type="button" class="control-btn" @click="sendPeriodPrev">← Période</button>
            <button type="button" class="control-btn" @click="sendPeriodNext">Période →</button>
            <span class="control-period-current">{{ periodLabelDisplay() }}</span>
          </div>
          <div class="control-timer-row">
            <label class="control-timer-minsec-label">
              <span>Minutes</span>
              <div class="control-timer-stepper">
                <input
                  v-model="periodMinutesInput"
                  type="number"
                  class="control-input control-timer-input-num"
                  min="0"
                  max="120"
                  inputmode="numeric"
                  @keydown.enter="applyPeriodFromMinSec"
                  @blur="applyPeriodFromMinSec"
                />
                <div class="control-timer-arrows">
                  <button type="button" class="control-timer-arrow" aria-label="Augmenter minutes" @click="nudgePeriodMinutes(1)">▲</button>
                  <button type="button" class="control-timer-arrow" aria-label="Diminuer minutes" @click="nudgePeriodMinutes(-1)">▼</button>
                </div>
              </div>
            </label>
            <label class="control-timer-minsec-label">
              <span>Secondes</span>
              <div class="control-timer-stepper">
                <input
                  v-model="periodSecondsInput"
                  type="number"
                  class="control-input control-timer-input-num"
                  min="0"
                  max="59"
                  inputmode="numeric"
                  @keydown.enter="applyPeriodFromMinSec"
                  @blur="applyPeriodFromMinSec"
                />
                <div class="control-timer-arrows">
                  <button type="button" class="control-timer-arrow" aria-label="Augmenter secondes" @click="nudgePeriodSeconds(1)">▲</button>
                  <button type="button" class="control-timer-arrow" aria-label="Diminuer secondes" @click="nudgePeriodSeconds(-1)">▼</button>
                </div>
              </div>
            </label>
            <button type="button" class="control-btn" :aria-label="periodRunning ? 'Pause période' : 'Démarrer période'" @click="periodToggle">
              {{ periodRunning ? "⏸" : "▶" }}
            </button>
            <button type="button" class="control-btn" aria-label="Reset chrono période" @click="periodReset">↺</button>
          </div>
        </section>

        <section class="control-section">
          <div class="control-row">
            <button type="button" class="control-btn" @click="send({ type: 'contrast_toggle' })">Contraste</button>
            <button type="button" class="control-btn" :class="{ primary: qrVisible }" @click="send({ type: 'qr_toggle' })">QR</button>
            <button type="button" class="control-btn danger" @click="resetMatch">Reset match</button>
          </div>
        </section>
      </main>

      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showCustomAnnounceModal" class="control-modal-backdrop" @click.self="showCustomAnnounceModal = false">
            <div class="control-modal" role="dialog" aria-labelledby="control-announce-title" aria-modal="true">
              <h2 id="control-announce-title" class="control-modal-title">Annonce</h2>
              <p class="control-modal-hint">Saisissez le texte à afficher sur l’écran.</p>
              <input
                v-model="customAnnounceText"
                type="text"
                class="control-input control-modal-input"
                placeholder="ANNONCE"
                autocomplete="off"
                @keydown.enter="submitCustomAnnounce"
                @keydown.escape="showCustomAnnounceModal = false"
              />
              <div class="control-modal-actions">
                <button type="button" class="control-btn" @click="showCustomAnnounceModal = false">Annuler</button>
                <button type="button" class="control-btn primary" @click="submitCustomAnnounce">Afficher</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.control-app {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg-base);
  color: var(--text-main);
  padding: 1rem;
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  box-sizing: border-box;
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

.control-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.control-section-head:not(:first-child) {
  margin-top: 1rem;
}

.control-section-head .control-subsection-title,
.control-section-head h2 {
  margin: 0;
}

.control-section h2 {
  font-size: 1rem;
  margin: 0 0 0.5rem;
  color: var(--text-muted);
  font-weight: 600;
}

.control-subsection-title {
  font-size: 0.95rem;
  margin: 1rem 0 0.5rem;
  color: var(--text-muted);
  font-weight: 600;
}

.control-field-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.control-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  justify-content: center;
}

.control-radio {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  font-size: 1rem;
  min-height: 44px;
}

.control-radio input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--accent);
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

.control-row-period {
  align-items: center;
}

.control-period-current {
  font-weight: 600;
  color: var(--accent);
  margin-left: 0.25rem;
}

.control-btn {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
  cursor: pointer;
  min-height: 48px;
  touch-action: manipulation;
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

.control-countdown {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  min-width: 3rem;
  text-align: center;
  color: var(--accent);
}

.control-timer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.control-row + .control-timer-row {
  margin-top: 0.75rem;
}

.control-timer-row .control-countdown {
  align-self: center;
  margin: 0;
}

.control-timer-row .control-btn {
  height: 56px;
  min-height: 56px;
  box-sizing: border-box;
  padding-top: 0;
  padding-bottom: 0;
}

.control-timer-minsec-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.control-timer-minsec-label span {
  font-weight: 500;
}

.control-timer-stepper {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--text-muted);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-layer);
}

.control-timer-stepper .control-timer-input-num {
  width: 3rem;
  min-width: 2.5rem;
  text-align: center;
  min-height: 48px;
  border: none;
  border-radius: 0;
  background: transparent;
}

.control-timer-arrows {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.control-timer-arrow {
  flex: 1;
  min-width: 2.75rem;
  min-height: 28px;
  padding: 0.35rem 0;
  border: none;
  border-left: 1px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font-size: 0.8rem;
  cursor: pointer;
  touch-action: manipulation;
}

.control-timer-arrow:hover {
  background: var(--accent);
  color: var(--bg-base);
}

.control-timer-arrow:first-child {
  border-radius: 0 8px 0 0;
}

.control-timer-arrow:last-child {
  border-radius: 0 0 8px 0;
}

.control-timer-input-num {
  width: 4.5rem;
  min-width: 3.5rem;
  text-align: center;
  min-height: 48px;
}


.control-scores {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* iPad paysage 1024×768 : zones score à gauche et à droite, centre au milieu */
@media (min-width: 900px) and (orientation: landscape), (min-width: 1024px) {
  .control-app {
    padding: 0.75rem;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  .control-main {
    display: grid;
    grid-template-columns: 1fr minmax(280px, 2fr) 1fr;
    grid-template-rows: auto auto auto auto auto;
    gap: 0.75rem 1rem;
    flex: 1;
    min-height: 0;
    align-content: start;
  }

  /* Section impro (titre, type, chrono) au centre */
  .control-main > .control-section:nth-child(1) {
    grid-column: 2;
    grid-row: 1;
  }

  /* Section scores : display contents pour placer chaque équipe en col 1 et 3 */
  .control-main > .control-section:nth-child(2) {
    display: contents;
  }

  .control-main > .control-section:nth-child(2) .control-scores {
    display: contents;
  }

  .control-main > .control-section:nth-child(2) .control-team-block:nth-child(1) {
    grid-column: 1;
    grid-row: 2;
    align-self: start;
  }

  .control-main > .control-section:nth-child(2) .control-team-block:nth-child(2) {
    grid-column: 3;
    grid-row: 2;
    align-self: start;
  }

  .control-main > .control-section:nth-child(3) {
    grid-column: 2;
    grid-row: 3;
  }

  .control-main > .control-section:nth-child(4) {
    grid-column: 2;
    grid-row: 4;
  }

  .control-main > .control-section:nth-child(5) {
    grid-column: 2;
    grid-row: 5;
  }

  .control-scores {
    gap: 0;
  }

  .control-team-block {
    min-width: 0;
    max-width: 100%;
  }

  .control-overlays {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.4rem;
  }

  .control-overlay-btn {
    min-height: 48px;
    padding: 0.5rem 0.35rem;
  }

  .control-overlay-label {
    font-size: 0.65rem;
  }

  .control-header {
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .control-timer-row {
    margin-bottom: 0.5rem;
  }

  .control-field {
    margin-bottom: 0.35rem;
  }

  .control-section h2,
  .control-subsection-title {
    margin-top: 0.25rem;
  }
}

/* Hauteur limitée (ex. iPad 768px) : encore plus compact */
@media (min-width: 900px) and (max-height: 800px) {
  .control-app {
    padding: 0.5rem;
  }

  .control-main {
    gap: 0.5rem 1rem;
  }

  .control-input,
  .control-team-name-input {
    min-height: 40px;
    padding: 0.5rem 0.65rem;
  }

  .control-btn {
    min-height: 44px;
    padding: 0.6rem 0.85rem;
  }

  .control-timer-row .control-btn {
    height: 48px;
    min-height: 48px;
  }

  .control-score-stepper {
    height: 48px;
  }

  .control-team-color-btn,
  .control-team-logo-btn,
  .control-penalty-dot {
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
  }

  .control-radio {
    min-height: 40px;
  }

  .control-overlay-btn {
    min-height: 44px;
  }
}

.control-team-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.control-team-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-team-name-input {
  flex: 1;
  min-width: 0;
}

.control-team-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-height: 48px;
}

.control-team-color-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 2px solid var(--text-muted);
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
  flex-shrink: 0;
}

.control-team-color-btn:hover {
  filter: brightness(1.1);
}

.control-team-logo-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.control-team-logo-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 2px solid var(--text-muted);
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-raised, #2a2a2e);
  overflow: hidden;
}

.control-team-logo-btn--filled {
  border-color: var(--text-muted);
  padding: 2px;
}

.control-team-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.control-team-logo-glyph {
  font-size: 1.35rem;
  font-weight: 300;
  line-height: 1;
  color: var(--text-muted);
}

.control-score-stepper {
  display: flex;
  align-items: stretch;
  gap: 0;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: none;
  min-width: 5rem;
}

.control-score-value {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  padding: 0 0.5rem;
  color: #fff;
  font-weight: 700;
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.control-score-arrows {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.control-score-arrow {
  flex: 1;
  min-width: 2.75rem;
  min-height: 28px;
  padding: 0.35rem 0;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
  touch-action: manipulation;
}

.control-score-arrow:hover {
  background: rgba(0, 0, 0, 0.2);
}

.control-penalty-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  align-self: center;
  min-width: 4rem;
}

.control-penalties {
  display: flex;
  gap: 0.35rem;
}

.control-penalty-dot {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font-size: 0.9rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.control-penalty-dot-active {
  background: var(--accent);
  color: var(--bg-base);
  border-color: var(--accent);
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
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border-radius: 8px;
  border: 2px solid var(--text-muted);
  background: var(--bg-layer);
  color: var(--text-main);
  font: inherit;
  cursor: pointer;
  min-height: 52px;
  transition: background-color 0.15s, border-color 0.15s;
}

.control-overlay-btn-active {
  background: var(--accent);
  color: var(--bg-base);
  border-color: var(--accent);
}

.control-overlay-icon {
  font-size: 1.25rem;
}

.control-overlay-label {
  font-size: 0.7rem;
  text-align: center;
  line-height: 1.2;
}

/* Modal saisie annonce */
.control-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  padding-bottom: env(safe-area-inset-bottom);
}

.control-modal {
  background: var(--bg-base);
  color: var(--text-main);
  border-radius: 12px;
  padding: 1.25rem;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.control-modal-title {
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
}

.control-modal-hint {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 1rem;
}

.control-modal-input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 1rem;
  min-height: 48px;
}

.control-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.control-modal-actions .control-btn {
  min-height: 48px;
  min-width: 100px;
}

.modal-enter-active .control-modal,
.modal-leave-active .control-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .control-modal,
.modal-leave-to .control-modal {
  opacity: 0;
  transform: scale(0.95);
}
</style>
