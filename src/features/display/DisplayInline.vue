<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { storeToRefs } from "pinia";
import InlineEditableText from "@/components/InlineEditableText.vue";
import HotspotLayer from "@/features/display/HotspotLayer.vue";
import OverlayPanel from "@/features/overlay/OverlayPanel.vue";
import RemoteControlQR from "@/features/display/RemoteControlQR.vue";
import { buildSnapshot } from "@/remote/stateSnapshot";
import { useRemoteChannel } from "@/remote/useRemoteChannel";
import { isPrimaryChronoImpro } from "@/services/displayTimer";
import { formatClock, parseClock } from "@/services/timerService";
import { useMatchStore } from "@/stores/matchStore";
import type { HotspotDefinition, OverlayKey, TeamKey } from "@/types/match";
import { useKeyboardShortcuts } from "@/utils/useKeyboardShortcuts";

const remoteBackendUrl = (import.meta.env as { VITE_REMOTE_BACKEND_WS_URL?: string }).VITE_REMOTE_BACKEND_WS_URL ?? "";
const store = useMatchStore();
const { match } = storeToRefs(store);

const triggerFullscreen = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    store.setFullscreenPreference(true);
    return;
  }
  await document.exitFullscreen();
  store.setFullscreenPreference(false);
};

let sessionInfo: Ref<{ sessionId: string; joinCode: string } | null>;
let channel: ReturnType<typeof useRemoteChannel> | undefined;
try {
  channel = useRemoteChannel(computed(() => remoteBackendUrl), {
    onFullscreenToggle: triggerFullscreen,
    getState: () => buildSnapshot(store)
  });
  sessionInfo = channel.sessionInfo;
} catch (e) {
  console.error("[Matchpoint] useRemoteChannel:", e);
  sessionInfo = ref(null);
}

const STATE_SYNC_THROTTLE_MS = 1000;
let lastStateSyncAt = 0;
let pendingStateSyncTimeout: ReturnType<typeof setTimeout> | null = null;

function pushStateToRemote() {
  if (!channel?.sendState) return;
  lastStateSyncAt = Date.now();
  channel.sendState(buildSnapshot(store));
}

watch(
  () => match.value,
  () => {
    if (!channel?.sendState) return;
    const now = Date.now();
    const elapsed = now - lastStateSyncAt;
    if (elapsed >= STATE_SYNC_THROTTLE_MS) {
      if (pendingStateSyncTimeout != null) {
        clearTimeout(pendingStateSyncTimeout);
        pendingStateSyncTimeout = null;
      }
      pushStateToRemote();
      return;
    }
    if (pendingStateSyncTimeout == null) {
      pendingStateSyncTimeout = setTimeout(() => {
        pendingStateSyncTimeout = null;
        pushStateToRemote();
      }, STATE_SYNC_THROTTLE_MS - elapsed);
    }
  },
  { deep: true }
);

watch(
  () => store.showRemoteQrModal,
  () => {
    if (channel?.sendState) pushStateToRemote();
  }
);

const syncContrastToDocument = () => {
  const isHigh = match.value.ui.contrastMode === "high";
  document.documentElement.classList.toggle("contrast-high", isHigh);
};

const isFullscreen = ref(!!document.fullscreenElement);
const updateFullscreenState = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

/** Libellé complet pour l’affichage : "Période 1", "Première période", etc. */
const displayPeriodLabel = computed(() => {
  if (match.value.periodLabel === "premiere") {
    return "Première période";
  }

  if (match.value.periodLabel === "derniere") {
    return "Dernière période";
  }

  return `Période ${match.value.periodLabel}`;
});

const improTypeLabel = computed(() => {
  if (match.value.impro.type === "mixte") {
    return "Mixte";
  }
  if (match.value.impro.type === "comparee") {
    return "Comparée";
  }
  return "\u00A0";
});
const isImproTypeFilled = computed(() => match.value.impro.type !== "none");
const improPlayPauseIcon = computed(() => (match.value.impro.isRunning ? "⏸" : "▶"));
const periodPlayPauseIcon = computed(() =>
  match.value.periodTimer.startedAt !== null ? "⏸" : "▶"
);

/** Grand cadran central : impro si live/pause, sinon période (DOMAIN). */
const primaryChronoIsImpro = computed(() => isPrimaryChronoImpro(match.value.status));
const primaryTimerRunning = computed(() =>
  primaryChronoIsImpro.value
    ? match.value.impro.isRunning
    : match.value.periodTimer.startedAt !== null
);
const secondaryTimerRunning = computed(() =>
  primaryChronoIsImpro.value
    ? match.value.periodTimer.startedAt !== null
    : match.value.impro.isRunning
);

/** TEMP : opacité idle minimale pour repérer les boutons sans survol — à retirer quand l’UI est figée. */
const ghostIdleForDebug = computed(() => Math.max(0.34, match.value.ui.ghostIdleOpacity));

const penaltySlots = [1, 2, 3] as const;
const overlayEntries = computed(() => Object.entries(store.overlayLabels) as Array<[string, string]>);

const onImproRemainingCommit = (value: string) => {
  const sec = parseClock(value);
  if (sec !== null) store.setImproRemaining(sec);
};
const onPeriodRemainingCommit = (value: string) => {
  const sec = parseClock(value);
  if (sec !== null) store.setPeriodRemaining(sec);
};

const overlayIcon = (key: string): string => {
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
};

// Plein écran à gauche : sur iPad le bouton natif de sortie plein écran est en haut à gauche, il coïncide ainsi avec notre bouton.
// En mode plein écran on masque le bouton Plein écran : la croix native le remplace.
const hotspotDefinitions: HotspotDefinition[] = [
  { id: "hotspot_fullscreen_toggle", label: "Plein écran", action: "fullscreen_toggle", x: 1, y: 2, width: 6, height: 7 },
  { id: "hotspot_contrast_toggle", label: "Contraste", action: "contrast_toggle", x: 93, y: 2, width: 6, height: 7 }
];
const hotspots = computed<HotspotDefinition[]>(() =>
  isFullscreen.value
    ? hotspotDefinitions.filter((h) => h.action !== "fullscreen_toggle")
    : hotspotDefinitions
);

const onOverlayButtonClick = (overlayKey: string) => {
  if (overlayKey === "overlay_custom") {
    const value = window.prompt("Annonce", "ANNONCE");
    if (value !== null) store.triggerCustomOverlay(value);
    return;
  }
  store.triggerOverlay(overlayKey as OverlayKey);
};

const applyAction = (action: string) => {
  switch (action) {
    case "color_cycle_a":
      store.cycleTeamColor("A");
      return;
    case "color_cycle_b":
      store.cycleTeamColor("B");
      return;
    case "period_prev":
      store.previousPeriod();
      return;
    case "period_next":
      store.nextPeriod();
      return;
    case "fullscreen_toggle":
      void triggerFullscreen();
      return;
    case "contrast_toggle":
      store.toggleContrast();
      return;
    case "overlay_clear":
      store.clearOverlay();
      return;
    case "start_match":
    case "hymn":
    case "caucus":
    case "vote":
    case "intermission":
    case "penalty":
    case "ejection":
    case "shootout":
    case "stars":
      store.triggerOverlay(action);
      return;
    default:
      break;
  }
};

const togglePenaltyDot = (team: "A" | "B", slot: 1 | 2 | 3) => {
  const current = team === "A" ? match.value.teamA.penalties : match.value.teamB.penalties;
  const next = current >= slot ? slot - 1 : slot;
  store.setPenaltyLevel(team, next);
};

const logoInputA = ref<HTMLInputElement | null>(null);
const logoInputB = ref<HTMLInputElement | null>(null);

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
    if (typeof data === "string") {
      store.setTeamLogo(team, data);
    }
  };
  reader.readAsDataURL(file);
}

useKeyboardShortcuts((event) => {
  const key = event.key.toLowerCase();
  if (key === "f") {
    void triggerFullscreen();
    return;
  }

  // Escape ferme l’overlay mais en fullscreen le navigateur quitte aussi le plein écran.
  // Backspace ferme uniquement l’overlay (à utiliser en fullscreen).
  if (key === "escape" || key === "backspace") {
    store.clearOverlay();
    return;
  }

  if (key === "]") {
    store.setHotspotScale(match.value.ui.hotspotScale + 0.05);
    return;
  }

  if (key === "[") {
    store.setHotspotScale(match.value.ui.hotspotScale - 0.05);
  }
});

watch(
  () => match.value.ui.contrastMode,
  () => syncContrastToDocument(),
  { immediate: false }
);

onMounted(async () => {
  await store.hydrate();
  syncContrastToDocument();
  document.addEventListener("fullscreenchange", updateFullscreenState);
});

onUnmounted(() => {
  if (pendingStateSyncTimeout != null) {
    clearTimeout(pendingStateSyncTimeout);
    pendingStateSyncTimeout = null;
  }
  document.removeEventListener("fullscreenchange", updateFullscreenState);
  document.documentElement.classList.remove("contrast-high");
  void store.persist();
});
</script>

<template>
  <main
    class="display-inline"
    :style="{
      '--display-scale': String(match.ui.displayScale),
      '--ghost-idle-opacity': String(ghostIdleForDebug),
      '--ghost-hover-opacity': String(match.ui.ghostHoverOpacity)
    }"
  >
    <header class="display-header inline-header display-header--tiered">
      <InlineEditableText
        aria-label="Titre de l'impro"
        class-name="title-inline title-inline--hero"
        :model-value="match.impro.theme"
        placeholder="Titre de l'improvisation"
        @update:model-value="store.setTheme"
      />
    </header>

    <section class="score-grid inline-grid">
      <div class="score-grid-label score-grid-label--category" aria-hidden="true" />
      <div class="score-grid-label score-grid-label--spacer" aria-hidden="true" />
      <div class="score-grid-label score-grid-label--type" aria-hidden="true" />
      <article
        class="team-card team-card--scoreboard team-card--a"
        :style="{ '--team-color': match.teamA.colorToken }"
      >
        <div class="team-card-top">
          <InlineEditableText
            aria-label="Nom équipe A"
            class-name="team-name"
            :model-value="match.teamA.name"
            placeholder="Équipe A"
            @update:model-value="(value) => store.setTeamName('A', value)"
          />
          <div class="team-logo-zone">
            <input
              ref="logoInputA"
              type="file"
              class="team-logo-input"
              accept="image/*"
              tabindex="-1"
              aria-hidden="true"
              @change="(e) => onTeamLogoFile('A', e)"
            />
            <div
              class="team-logo-frame"
              :class="{ 'team-logo-frame--filled': !!match.teamA.logoDataUrl }"
            >
              <template v-if="match.teamA.logoDataUrl">
                <img
                  class="team-logo-img"
                  alt=""
                  :src="match.teamA.logoDataUrl"
                />
                <button
                  type="button"
                  class="ghost-hotspot team-logo-hit"
                  aria-label="Changer le logo équipe A"
                  title="Changer le logo"
                  @click="openLogoPicker('A')"
                />
                <button
                  type="button"
                  class="ghost-hotspot team-logo-clear"
                  aria-label="Retirer le logo équipe A"
                  @click.stop="store.setTeamLogo('A', null)"
                >
                  ×
                </button>
              </template>
              <button
                v-else
                type="button"
                class="team-logo-placeholder"
                aria-label="Ajouter un logo équipe A — choisir une image"
                title="Choisir une image"
                @click="openLogoPicker('A')"
              >
                <span class="team-logo-glyph" aria-hidden="true">＋</span>
              </button>
            </div>
          </div>
        </div>
        <div class="score-wrap">
          <button
            class="score-side-btn score-minus"
            type="button"
            aria-label="Score A -"
            @click="store.decrementScore('A')"
          >
            -
          </button>
          <p class="team-score">{{ match.teamA.score }}</p>
          <button
            class="score-side-btn score-plus"
            type="button"
            aria-label="Score A +"
            @click="store.incrementScore('A')"
          >
            +
          </button>
        </div>
        <div class="penalties-row" role="group" aria-label="Pénalités équipe A">
          <button
            v-for="slot in penaltySlots"
            :key="`pen-a-${slot}`"
            type="button"
            class="penalty-dot"
            :class="{ active: match.teamA.penalties >= slot }"
            :aria-label="`Pénalité A ${slot}`"
            @click="togglePenaltyDot('A', slot)"
          />
        </div>
        <button
          type="button"
          class="score-color-corner score-color-corner--left"
          aria-label="Changer la couleur de l’équipe A"
          title="Couleur"
          @click.stop="store.cycleTeamColor('A')"
        />
      </article>

      <section class="center-stack">
        <div class="center-stack-category">
          <InlineEditableText
            aria-label="Catégorie"
            class-name="category-inline category-inline--center-stack"
            :model-value="match.impro.category"
            placeholder="Catégorie"
            @update:model-value="store.setCategory"
          />
        </div>

        <div class="center-stack-impro-type">
          <button
            class="inline-editable impro-type-inline impro-type-inline--center-stack"
            :class="{ 'impro-type-inline--filled': isImproTypeFilled }"
            type="button"
            aria-label="Type d'impro (cliquer pour changer)"
            @click="store.toggleImproType"
          >
            {{ improTypeLabel }}
          </button>
        </div>

        <article class="timer-card timer-card--primary" :class="{ running: primaryTimerRunning }">
          <template v-if="primaryChronoIsImpro">
            <div class="impro-clock-layout">
              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes impro +"
                  @click="store.nudgeImproMinutes(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes impro -"
                  @click="store.nudgeImproMinutes(-1)"
                >
                  ▼
                </button>
              </div>

              <InlineEditableText
                aria-label="Temps restant impro"
                class-name="clock inline-editable-clock"
                :model-value="formatClock(match.impro.timer.remainingSeconds)"
                placeholder="0:00"
                @update:model-value="onImproRemainingCommit"
              />

              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes impro +"
                  @click="store.nudgeImproSecondsStep(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes impro -"
                  @click="store.nudgeImproSecondsStep(-1)"
                >
                  ▼
                </button>
              </div>
            </div>
            <div class="timer-controls-row">
              <button
                class="ghost-hotspot timer-action-btn"
                type="button"
                aria-label="Play/Pause impro"
                @click="store.toggleImpro"
              >
                {{ improPlayPauseIcon }}
              </button>
              <button
                class="ghost-hotspot timer-action-btn timer-action-btn--reset"
                type="button"
                aria-label="Reset impro"
                @click="store.resetImpro"
              >
                ↺
              </button>
            </div>
          </template>
          <template v-else>
            <div class="impro-clock-layout">
              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes période +"
                  @click="store.nudgePeriodPreset(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes période -"
                  @click="store.nudgePeriodPreset(-1)"
                >
                  ▼
                </button>
              </div>

              <InlineEditableText
                aria-label="Temps restant période"
                class-name="clock inline-editable-clock"
                :model-value="formatClock(match.periodTimer.remainingSeconds)"
                placeholder="0:00"
                @update:model-value="onPeriodRemainingCommit"
              />

              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes période +"
                  @click="store.nudgePeriodSecondsStep(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes période -"
                  @click="store.nudgePeriodSecondsStep(-1)"
                >
                  ▼
                </button>
              </div>
            </div>
            <div class="timer-controls-row">
              <button
                class="ghost-hotspot timer-action-btn"
                type="button"
                aria-label="Play/Pause période"
                @click="store.togglePeriod"
              >
                {{ periodPlayPauseIcon }}
              </button>
              <button
                class="ghost-hotspot timer-action-btn timer-action-btn--reset"
                type="button"
                aria-label="Reset période"
                @click="store.resetPeriod"
              >
                ↺
              </button>
            </div>
          </template>
        </article>

        <article class="timer-card timer-card--compact" :class="{ running: secondaryTimerRunning }">
          <template v-if="primaryChronoIsImpro">
            <div class="impro-clock-layout">
              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes période +"
                  @click="store.nudgePeriodPreset(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes période -"
                  @click="store.nudgePeriodPreset(-1)"
                >
                  ▼
                </button>
              </div>

              <InlineEditableText
                aria-label="Temps restant période"
                class-name="clock inline-editable-clock"
                :model-value="formatClock(match.periodTimer.remainingSeconds)"
                placeholder="0:00"
                @update:model-value="onPeriodRemainingCommit"
              />

              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes période +"
                  @click="store.nudgePeriodSecondsStep(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes période -"
                  @click="store.nudgePeriodSecondsStep(-1)"
                >
                  ▼
                </button>
              </div>
            </div>
            <div class="timer-controls-row">
              <button
                class="ghost-hotspot timer-action-btn"
                type="button"
                aria-label="Play/Pause période"
                @click="store.togglePeriod"
              >
                {{ periodPlayPauseIcon }}
              </button>
              <button
                class="ghost-hotspot timer-action-btn timer-action-btn--reset"
                type="button"
                aria-label="Reset période"
                @click="store.resetPeriod"
              >
                ↺
              </button>
            </div>
          </template>
          <template v-else>
            <div class="impro-clock-layout">
              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes impro +"
                  @click="store.nudgeImproMinutes(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Minutes impro -"
                  @click="store.nudgeImproMinutes(-1)"
                >
                  ▼
                </button>
              </div>

              <InlineEditableText
                aria-label="Temps restant impro"
                class-name="clock inline-editable-clock"
                :model-value="formatClock(match.impro.timer.remainingSeconds)"
                placeholder="0:00"
                @update:model-value="onImproRemainingCommit"
              />

              <div class="impro-arrow-pair">
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes impro +"
                  @click="store.nudgeImproSecondsStep(1)"
                >
                  ▲
                </button>
                <button
                  class="ghost-hotspot arrow-btn"
                  type="button"
                  aria-label="Secondes impro -"
                  @click="store.nudgeImproSecondsStep(-1)"
                >
                  ▼
                </button>
              </div>
            </div>
            <div class="timer-controls-row">
              <button
                class="ghost-hotspot timer-action-btn"
                type="button"
                aria-label="Play/Pause impro"
                @click="store.toggleImpro"
              >
                {{ improPlayPauseIcon }}
              </button>
              <button
                class="ghost-hotspot timer-action-btn timer-action-btn--reset"
                type="button"
                aria-label="Reset impro"
                @click="store.resetImpro"
              >
                ↺
              </button>
            </div>
          </template>
        </article>

        <div class="period-row">
          <button
            type="button"
            class="period-nav-btn"
            aria-label="Période précédente"
            @click="store.previousPeriod()"
          >
            ←
          </button>
          <p class="period-label">{{ displayPeriodLabel }}</p>
          <button
            type="button"
            class="period-nav-btn"
            aria-label="Période suivante"
            @click="store.nextPeriod()"
          >
            →
          </button>
        </div>
      </section>

      <article
        class="team-card team-card--scoreboard team-card--b"
        :style="{ '--team-color': match.teamB.colorToken }"
      >
        <div class="team-card-top">
          <InlineEditableText
            aria-label="Nom équipe B"
            class-name="team-name"
            :model-value="match.teamB.name"
            placeholder="Équipe B"
            @update:model-value="(value) => store.setTeamName('B', value)"
          />
          <div class="team-logo-zone">
            <input
              ref="logoInputB"
              type="file"
              class="team-logo-input"
              accept="image/*"
              tabindex="-1"
              aria-hidden="true"
              @change="(e) => onTeamLogoFile('B', e)"
            />
            <div
              class="team-logo-frame"
              :class="{ 'team-logo-frame--filled': !!match.teamB.logoDataUrl }"
            >
              <template v-if="match.teamB.logoDataUrl">
                <img
                  class="team-logo-img"
                  alt=""
                  :src="match.teamB.logoDataUrl"
                />
                <button
                  type="button"
                  class="ghost-hotspot team-logo-hit"
                  aria-label="Changer le logo équipe B"
                  title="Changer le logo"
                  @click="openLogoPicker('B')"
                />
                <button
                  type="button"
                  class="ghost-hotspot team-logo-clear"
                  aria-label="Retirer le logo équipe B"
                  @click.stop="store.setTeamLogo('B', null)"
                >
                  ×
                </button>
              </template>
              <button
                v-else
                type="button"
                class="team-logo-placeholder"
                aria-label="Ajouter un logo équipe B — choisir une image"
                title="Choisir une image"
                @click="openLogoPicker('B')"
              >
                <span class="team-logo-glyph" aria-hidden="true">＋</span>
              </button>
            </div>
          </div>
        </div>
        <div class="score-wrap">
          <button
            class="score-side-btn score-minus"
            type="button"
            aria-label="Score B -"
            @click="store.decrementScore('B')"
          >
            -
          </button>
          <p class="team-score">{{ match.teamB.score }}</p>
          <button
            class="score-side-btn score-plus"
            type="button"
            aria-label="Score B +"
            @click="store.incrementScore('B')"
          >
            +
          </button>
        </div>
        <div class="penalties-row" role="group" aria-label="Pénalités équipe B">
          <button
            v-for="slot in penaltySlots"
            :key="`pen-b-${slot}`"
            type="button"
            class="penalty-dot"
            :class="{ active: match.teamB.penalties >= slot }"
            :aria-label="`Pénalité B ${slot}`"
            @click="togglePenaltyDot('B', slot)"
          />
        </div>
        <button
          type="button"
          class="score-color-corner score-color-corner--right"
          aria-label="Changer la couleur de l’équipe B"
          title="Couleur"
          @click.stop="store.cycleTeamColor('B')"
        />
      </article>
    </section>

    <div class="overlay-hotbar-inline">
      <button
        v-for="[overlayKey, overlayLabel] in overlayEntries"
        :key="overlayKey"
        class="ghost-hotspot overlay-icon overlay-icon-btn"
        :aria-label="overlayLabel"
        :title="overlayLabel"
        :data-label="overlayLabel"
        @click="onOverlayButtonClick(overlayKey)"
      >
        <span class="overlay-abbr">{{ overlayIcon(overlayKey) }}</span>
      </button>
    </div>

    <HotspotLayer
      :hotspots="hotspots"
      :idle-opacity="ghostIdleForDebug"
      :hover-opacity="match.ui.ghostHoverOpacity"
      :hotspot-scale="match.ui.hotspotScale"
      @action="applyAction"
    />

    <RemoteControlQR
      :model-value="store.showRemoteQrModal"
      @update:model-value="store.setShowRemoteQrModal"
      :session-info="sessionInfo"
      :idle-opacity="ghostIdleForDebug"
      :hover-opacity="match.ui.ghostHoverOpacity"
      :hotspot-scale="match.ui.hotspotScale"
    />

    <OverlayPanel
      :overlay="match.overlay.activeOverlay"
      :custom-overlay-text="match.overlay.customOverlayText"
      @close="store.clearOverlay"
    />
  </main>
</template>
