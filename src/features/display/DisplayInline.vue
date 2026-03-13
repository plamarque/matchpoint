<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { storeToRefs } from "pinia";
import InlineEditableText from "@/components/InlineEditableText.vue";
import HotspotLayer from "@/features/display/HotspotLayer.vue";
import OverlayPanel from "@/features/overlay/OverlayPanel.vue";
import RemoteControlQR from "@/features/display/RemoteControlQR.vue";
import { useRemoteChannel } from "@/remote/useRemoteChannel";
import { formatClock, parseClock } from "@/services/timerService";
import { useMatchStore } from "@/stores/matchStore";
import type { HotspotDefinition, OverlayKey } from "@/types/match";
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
try {
  const channel = useRemoteChannel(computed(() => remoteBackendUrl), {
    onFullscreenToggle: triggerFullscreen
  });
  sessionInfo = channel.sessionInfo;
} catch (e) {
  console.error("[Matchpoint] useRemoteChannel:", e);
  sessionInfo = ref(null);
}

const syncContrastToDocument = () => {
  const isHigh = match.value.ui.contrastMode === "high";
  document.documentElement.classList.toggle("contrast-high", isHigh);
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
  return "";
});
const showImproType = computed(() => improTypeLabel.value.length > 0);
const improPlayPauseIcon = computed(() => (match.value.impro.isRunning ? "⏸" : "▶"));
const periodPlayPauseIcon = computed(() =>
  match.value.periodTimer.startedAt !== null ? "⏸" : "▶"
);
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

const hotspots = computed<HotspotDefinition[]>(() => [
  { id: "hotspot_fullscreen_toggle", label: "Plein écran", action: "fullscreen_toggle", x: 93, y: 2, width: 6, height: 7 },
  { id: "hotspot_contrast_toggle", label: "Contraste", action: "contrast_toggle", x: 1, y: 2, width: 6, height: 7 }
]);

const hotspotsColorA = computed<HotspotDefinition[]>(() => [
  { id: "hotspot_color_cycle_a", label: "Couleur A suivante", action: "color_cycle_a", x: 0.5, y: 50, width: 4.5, height: 34, centerY: true }
]);

const hotspotsColorB = computed<HotspotDefinition[]>(() => [
  { id: "hotspot_color_cycle_b", label: "Couleur B suivante", action: "color_cycle_b", x: 95, y: 50, width: 4.5, height: 34, centerY: true }
]);

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
});

onUnmounted(() => {
  document.documentElement.classList.remove("contrast-high");
  void store.persist();
});
</script>

<template>
  <main
    class="display-inline"
    :style="{ '--display-scale': String(match.ui.displayScale) }"
  >
    <header class="display-header inline-header">
      <InlineEditableText
        aria-label="Titre de l'impro"
        class-name="title-inline"
        :model-value="match.impro.theme"
        placeholder="Titre de l'improvisation"
        @update:model-value="store.setTheme"
      />
      <div class="category-type-line">
        <InlineEditableText
          aria-label="Catégorie"
          class-name="category-inline"
          :model-value="match.impro.category"
          placeholder="Catégorie"
          @update:model-value="store.setCategory"
        />
        <span v-if="showImproType" class="category-separator" aria-hidden="true">•</span>
        <button
          class="inline-editable impro-type-inline"
          type="button"
          aria-label="Type d'impro"
          @click="store.toggleImproType"
        >
          {{ improTypeLabel || "\u00A0" }}
        </button>
      </div>
    </header>

    <section class="score-grid inline-grid">
      <article class="team-card" :style="{ '--team-color': match.teamA.colorToken }">
        <InlineEditableText
          aria-label="Nom équipe A"
          class-name="team-name"
          :model-value="match.teamA.name"
          placeholder="Équipe A"
          @update:model-value="(value) => store.setTeamName('A', value)"
        />
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
        <HotspotLayer
          :hotspots="hotspotsColorA"
          :idle-opacity="match.ui.ghostIdleOpacity"
          :hover-opacity="match.ui.ghostHoverOpacity"
          :hotspot-scale="match.ui.hotspotScale"
          @action="applyAction"
        />
      </article>

      <section class="center-stack">
        <article class="timer-card" :class="{ running: match.impro.isRunning }">
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
              class="ghost-hotspot timer-action-btn"
              type="button"
              aria-label="Reset impro"
              @click="store.resetImpro"
            >
              ↺
            </button>
          </div>
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
        <article class="timer-card" :class="{ running: match.periodTimer.startedAt !== null }">
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
              class="ghost-hotspot timer-action-btn"
              type="button"
              aria-label="Reset période"
              @click="store.resetPeriod"
            >
              ↺
            </button>
          </div>
        </article>
      </section>

      <article class="team-card" :style="{ '--team-color': match.teamB.colorToken }">
        <InlineEditableText
          aria-label="Nom équipe B"
          class-name="team-name"
          :model-value="match.teamB.name"
          placeholder="Équipe B"
          @update:model-value="(value) => store.setTeamName('B', value)"
        />
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
        <HotspotLayer
          :hotspots="hotspotsColorB"
          :idle-opacity="match.ui.ghostIdleOpacity"
          :hover-opacity="match.ui.ghostHoverOpacity"
          :hotspot-scale="match.ui.hotspotScale"
          @action="applyAction"
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

    <OverlayPanel
      :overlay="match.overlay.activeOverlay"
      :custom-overlay-text="match.overlay.customOverlayText"
      @close="store.clearOverlay"
    />
  </main>
</template>
