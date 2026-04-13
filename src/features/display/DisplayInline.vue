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
import { useMatchStore } from "@/stores/matchStore";
import type { HotspotDefinition, OverlayKey, TeamKey } from "@/types/match";
import { isLogoImageFile } from "@/utils/logoImageFile";
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

/** État « en cours » du chrono période (affiché dans la barre basse). */
const periodDockRunning = computed(() =>
  primaryChronoIsImpro.value ? secondaryTimerRunning.value : primaryTimerRunning.value
);

const penaltySlots = [1, 2, 3] as const;
const overlayEntries = computed(() => Object.entries(store.overlayLabels) as Array<[string, string]>);

const improMinutesPadded = computed(() => {
  const m = Math.floor(match.value.impro.timer.remainingSeconds / 60);
  return String(Math.max(0, m)).padStart(2, "0");
});

const improSecondsPadded = computed(() => {
  const s = match.value.impro.timer.remainingSeconds % 60;
  return String(s).padStart(2, "0");
});

const onImproMinutesCommit = (value: string) => {
  const raw = parseInt(value.replace(/\D/g, ""), 10);
  if (Number.isNaN(raw)) return;
  const mins = Math.max(0, Math.min(999, raw));
  const sec = match.value.impro.timer.remainingSeconds % 60;
  store.setImproRemaining(mins * 60 + sec);
};

const onImproSecondsCommit = (value: string) => {
  const raw = parseInt(value.replace(/\D/g, ""), 10);
  if (Number.isNaN(raw)) return;
  const secOnly = Math.max(0, Math.min(59, raw));
  const mins = Math.floor(match.value.impro.timer.remainingSeconds / 60);
  store.setImproRemaining(mins * 60 + secOnly);
};

const periodMinutesPadded = computed(() => {
  const m = Math.floor(match.value.periodTimer.remainingSeconds / 60);
  return String(Math.max(0, m)).padStart(2, "0");
});

const periodSecondsPadded = computed(() => {
  const s = match.value.periodTimer.remainingSeconds % 60;
  return String(s).padStart(2, "0");
});

const onPeriodMinutesDockCommit = (value: string) => {
  const raw = parseInt(value.replace(/\D/g, ""), 10);
  if (Number.isNaN(raw)) return;
  const mins = Math.max(0, Math.min(999, raw));
  const sec = match.value.periodTimer.remainingSeconds % 60;
  store.setPeriodRemaining(mins * 60 + sec);
};

const onPeriodSecondsDockCommit = (value: string) => {
  const raw = parseInt(value.replace(/\D/g, ""), 10);
  if (Number.isNaN(raw)) return;
  const secOnly = Math.max(0, Math.min(59, raw));
  const mins = Math.floor(match.value.periodTimer.remainingSeconds / 60);
  store.setPeriodRemaining(mins * 60 + secOnly);
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
  if (!file || !isLogoImageFile(file)) {
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

const logoInputOrganizer = ref<HTMLInputElement | null>(null);

function openOrganizerLogoPicker() {
  logoInputOrganizer.value?.click();
}

function onOrganizerLogoFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !isLogoImageFile(file)) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const data = reader.result;
    if (typeof data === "string") {
      store.setOrganizerLogo(data);
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
      '--ghost-idle-opacity': String(match.ui.ghostIdleOpacity),
      '--ghost-hover-opacity': String(match.ui.ghostHoverOpacity)
    }"
  >
    <div class="display-inline-scale">
    <nav
      class="overlay-hotbar-inline overlay-hotbar-inline--header"
      aria-label="Annonces"
    >
      <button
        v-for="[overlayKey, overlayLabel] in overlayEntries"
        :key="overlayKey"
        type="button"
        class="ghost-hotspot overlay-icon overlay-icon-btn"
        :aria-label="overlayLabel"
        :title="overlayLabel"
        :data-label="overlayLabel"
        @click="onOverlayButtonClick(overlayKey)"
      >
        <span class="overlay-abbr">{{ overlayIcon(overlayKey) }}</span>
      </button>
    </nav>

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
                <button
                  type="button"
                  class="team-logo-change"
                  aria-label="Changer le logo équipe A — choisir une image"
                  title="Changer le logo"
                  @click="openLogoPicker('A')"
                >
                  <img
                    class="team-logo-img"
                    alt=""
                    :src="match.teamA.logoDataUrl"
                  />
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
        <div class="center-stack-middle">
          <div class="center-stack-meta">
            <div class="center-stack-category">
              <InlineEditableText
                aria-label="Catégorie"
                class-name="category-inline category-inline--center-stack"
                :model-value="match.impro.category"
                placeholder="Catégorie"
                @update:model-value="store.setCategory"
              />
            </div>
          </div>

          <div class="center-stack-timer-zone">
            <article
              class="timer-card timer-card--primary"
              :class="{ running: match.impro.isRunning }"
            >
              <div
                class="impro-clock-grid"
                role="group"
                aria-label="Chrono improvisation"
              >
                <button
                  type="button"
                  class="ghost-hotspot arrow-btn dock-period-arrow impro-clock-btn impro-clock-btn--arrow impro-clock-grid__ctrl-col impro-clock-grid__ctrl-col--mm"
                  aria-label="Minutes impro +"
                  @click="store.nudgeImproMinutes(1)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  class="ghost-hotspot timer-action-btn impro-clock-btn impro-clock-btn--play"
                  aria-label="Play/Pause impro"
                  @click="store.toggleImpro"
                >
                  {{ improPlayPauseIcon }}
                </button>
                <button
                  type="button"
                  class="ghost-hotspot arrow-btn dock-period-arrow impro-clock-btn impro-clock-btn--arrow impro-clock-grid__ctrl-col impro-clock-grid__ctrl-col--ss"
                  aria-label="Secondes impro +"
                  @click="store.nudgeImproSecondsStep(1)"
                >
                  ▲
                </button>

                <div class="impro-clock-grid__cell impro-clock-grid__cell--mm">
                  <InlineEditableText
                    aria-label="Minutes impro"
                    class-name="clock inline-editable-clock dock-period-mm"
                    :model-value="improMinutesPadded"
                    placeholder="00"
                    @update:model-value="onImproMinutesCommit"
                  />
                </div>
                <span class="dock-period-colon impro-clock-sep" aria-hidden="true">:</span>
                <div class="impro-clock-grid__cell impro-clock-grid__cell--ss">
                  <InlineEditableText
                    aria-label="Secondes impro"
                    class-name="clock inline-editable-clock dock-period-ss"
                    :model-value="improSecondsPadded"
                    placeholder="00"
                    @update:model-value="onImproSecondsCommit"
                  />
                </div>

                <button
                  type="button"
                  class="ghost-hotspot arrow-btn dock-period-arrow impro-clock-btn impro-clock-btn--arrow impro-clock-grid__ctrl-col impro-clock-grid__ctrl-col--mm"
                  aria-label="Minutes impro -"
                  @click="store.nudgeImproMinutes(-1)"
                >
                  ▼
                </button>
                <button
                  type="button"
                  class="ghost-hotspot timer-action-btn timer-action-btn--reset impro-clock-btn impro-clock-btn--reset"
                  aria-label="Reset impro"
                  @click="store.resetImpro"
                >
                  ↺
                </button>
                <button
                  type="button"
                  class="ghost-hotspot arrow-btn dock-period-arrow impro-clock-btn impro-clock-btn--arrow impro-clock-grid__ctrl-col impro-clock-grid__ctrl-col--ss"
                  aria-label="Secondes impro -"
                  @click="store.nudgeImproSecondsStep(-1)"
                >
                  ▼
                </button>
              </div>
            </article>
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
                <button
                  type="button"
                  class="team-logo-change"
                  aria-label="Changer le logo équipe B — choisir une image"
                  title="Changer le logo"
                  @click="openLogoPicker('B')"
                >
                  <img
                    class="team-logo-img"
                    alt=""
                    :src="match.teamB.logoDataUrl"
                  />
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
    </div>

    <footer class="display-bottom-dock" aria-label="Annonces et période">
      <div class="display-bottom-dock-center-wrap">
        <div class="display-bottom-dock-main">
        <div class="period-row period-row--dock">
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

        <article
          class="timer-card timer-card--dock timer-card--dock-period"
          :class="{
            running: periodDockRunning,
            'timer-card--dock-period--focal': !primaryChronoIsImpro
          }"
        >
          <div class="dock-period-clock-row">
            <div class="dock-period-unit">
              <button
                class="ghost-hotspot arrow-btn dock-period-arrow"
                type="button"
                aria-label="Minutes période +"
                @click="store.nudgePeriodPreset(1)"
              >
                ▲
              </button>
              <InlineEditableText
                aria-label="Minutes période"
                class-name="clock inline-editable-clock dock-period-mm"
                :model-value="periodMinutesPadded"
                placeholder="00"
                @update:model-value="onPeriodMinutesDockCommit"
              />
              <button
                class="ghost-hotspot arrow-btn dock-period-arrow"
                type="button"
                aria-label="Minutes période -"
                @click="store.nudgePeriodPreset(-1)"
              >
                ▼
              </button>
            </div>
            <span class="dock-period-colon" aria-hidden="true">:</span>
            <div class="dock-period-unit">
              <button
                class="ghost-hotspot arrow-btn dock-period-arrow"
                type="button"
                aria-label="Secondes période +"
                @click="store.nudgePeriodSecondsStep(1)"
              >
                ▲
              </button>
              <InlineEditableText
                aria-label="Secondes période"
                class-name="clock inline-editable-clock dock-period-ss"
                :model-value="periodSecondsPadded"
                placeholder="00"
                @update:model-value="onPeriodSecondsDockCommit"
              />
              <button
                class="ghost-hotspot arrow-btn dock-period-arrow"
                type="button"
                aria-label="Secondes période -"
                @click="store.nudgePeriodSecondsStep(-1)"
              >
                ▼
              </button>
            </div>
            <div class="dock-period-side-actions">
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
          </div>
        </article>
        </div>
      </div>
    </footer>

    <HotspotLayer
      :hotspots="hotspots"
      :idle-opacity="match.ui.ghostIdleOpacity"
      :hover-opacity="match.ui.ghostHoverOpacity"
      :hotspot-scale="match.ui.hotspotScale"
      @action="applyAction"
    />

    <RemoteControlQR
      :model-value="store.showRemoteQrModal"
      @update:model-value="store.setShowRemoteQrModal"
      :session-info="sessionInfo"
      :idle-opacity="match.ui.ghostIdleOpacity"
      :hover-opacity="match.ui.ghostHoverOpacity"
      :hotspot-scale="match.ui.hotspotScale"
    />

    <div
      class="organizer-logo-layer"
      :style="{
        '--ghost-idle-opacity': String(match.ui.ghostIdleOpacity),
        '--ghost-hover-opacity': String(match.ui.ghostHoverOpacity),
        '--hotspot-scale': String(match.ui.hotspotScale)
      }"
    >
      <input
        ref="logoInputOrganizer"
        type="file"
        class="team-logo-input"
        accept="image/*"
        tabindex="-1"
        aria-hidden="true"
        @change="onOrganizerLogoFile"
      />
      <div
        class="organizer-logo-frame"
        :class="{ 'organizer-logo-frame--filled': !!match.organizerLogoDataUrl }"
      >
        <template v-if="match.organizerLogoDataUrl">
          <button
            type="button"
            class="team-logo-change"
            aria-label="Changer le logo organisateur — choisir une image"
            title="Changer le logo"
            @click="openOrganizerLogoPicker"
          >
            <img class="team-logo-img organizer-logo-img" alt="" :src="match.organizerLogoDataUrl" />
          </button>
        </template>
        <button
          v-else
          type="button"
          class="team-logo-placeholder"
          aria-label="Ajouter un logo organisateur — choisir une image"
          title="Choisir une image"
          @click="openOrganizerLogoPicker"
        >
          <span class="team-logo-glyph" aria-hidden="true">＋</span>
        </button>
      </div>
    </div>

    <OverlayPanel
      :overlay="match.overlay.activeOverlay"
      :custom-overlay-text="match.overlay.customOverlayText"
      @close="store.clearOverlay"
    />
  </main>
</template>
