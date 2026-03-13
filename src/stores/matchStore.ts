import { ref } from "vue";
import { defineStore } from "pinia";
import {
  BUILTIN_TEAM_COLORS,
  IMPRO_SECOND_STEPS,
  IMPRO_TIME_PRESETS_SECONDS,
  OVERLAY_DURATION_MS,
  OVERLAY_LABELS,
  PERIOD_LABELS,
  PERIOD_TIME_PRESETS_SECONDS,
  TEAM_PALETTES
} from "@/constants/match";
import type { MatchState, OverlayKey, PeriodLabel, StorageSchemaV1, TeamKey } from "@/types/match";
import { createCountdownTimer, pauseTimer, resetTimer, setTimerPreset, setTimerRemaining, startTimer, tickTimer } from "@/services/timerService";
import { watch } from "vue";
import { loadStorage, saveStorage } from "@/services/persistenceService";

const defaultUi = {
  displayScale: 1,
  contrastMode: "standard" as const,
  showControlHints: false,
  lastFullscreenChoice: false,
  paletteSelection: "classic",
  ghostIdleOpacity: 0.1,
  ghostHoverOpacity: 0.26,
  hotspotScale: 1
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

const makeDefaultState = (): MatchState => ({
  id: generateId(),
  status: "idle",
  periodLabel: "1",
  periodIndex: 1,
  teamA: {
    name: "Rouges",
    score: 0,
    colorToken: TEAM_PALETTES.classic[0],
    penalties: 0
  },
  teamB: {
    name: "Bleus",
    score: 0,
    colorToken: TEAM_PALETTES.classic[1],
    penalties: 0
  },
  impro: {
    theme: "Titre de l'improvisation",
    category: "Libre",
    type: "mixte",
    timer: createCountdownTimer(60),
    isRunning: false
  },
  periodTimer: createCountdownTimer(30 * 60),
  overlay: {
    activeOverlay: null,
    expiresAt: null,
    customOverlayText: null
  },
  ui: { ...defaultUi }
});

const coerceUi = (source: Partial<MatchState["ui"]> | null | undefined): MatchState["ui"] => ({
  ...defaultUi,
  ...(source ?? {})
});

const nextColor = (current: string): string => {
  const index = BUILTIN_TEAM_COLORS.findIndex((color) => color === current);
  if (index === -1) {
    return BUILTIN_TEAM_COLORS[0];
  }

  return BUILTIN_TEAM_COLORS[(index + 1) % BUILTIN_TEAM_COLORS.length];
};

export const useMatchStore = defineStore("match", () => {
  const match = ref<MatchState>(makeDefaultState());
  let tickerId: number | null = null;

  const hydrate = async () => {
    const saved = await loadStorage();
    if (!saved || saved.version !== 1) {
      return;
    }

    match.value.ui = coerceUi(saved.ui);

    const palette = TEAM_PALETTES[match.value.ui.paletteSelection as keyof typeof TEAM_PALETTES];
    if (palette) {
      match.value.teamA.colorToken = palette[0];
      match.value.teamB.colorToken = palette[1];
    }

    if (saved.match) {
      const m = saved.match;
      const validPeriod = PERIOD_LABELS.includes(m.periodLabel as (typeof PERIOD_LABELS)[number]);
      match.value.periodLabel = validPeriod ? (m.periodLabel as MatchState["periodLabel"]) : match.value.periodLabel;
      match.value.periodIndex = Number.isFinite(m.periodIndex) ? m.periodIndex : match.value.periodIndex;
      match.value.teamA = {
        name: m.teamA?.name ?? match.value.teamA.name,
        score: Math.max(0, Number(m.teamA?.score) || 0),
        colorToken: m.teamA?.colorToken ?? match.value.teamA.colorToken,
        penalties: Math.min(3, Math.max(0, Number(m.teamA?.penalties) ?? 0))
      };
      match.value.teamB = {
        name: m.teamB?.name ?? match.value.teamB.name,
        score: Math.max(0, Number(m.teamB?.score) || 0),
        colorToken: m.teamB?.colorToken ?? match.value.teamB.colorToken,
        penalties: Math.min(3, Math.max(0, Number(m.teamB?.penalties) ?? 0))
      };
      match.value.impro.theme = m.impro?.theme ?? match.value.impro.theme;
      match.value.impro.category = m.impro?.category ?? match.value.impro.category;
      match.value.impro.type = m.impro?.type ?? match.value.impro.type;
      match.value.impro.isRunning = false;
      match.value.impro.timer = setTimerRemaining(
        createCountdownTimer(Math.max(0, m.impro?.presetSeconds ?? 60)),
        Math.max(0, m.impro?.remainingSeconds ?? 60)
      );
      match.value.periodTimer = setTimerRemaining(
        createCountdownTimer(Math.max(0, m.periodTimer?.presetSeconds ?? 30 * 60)),
        Math.max(0, m.periodTimer?.remainingSeconds ?? 30 * 60)
      );
      const overlayExpired = m.overlay?.expiresAt != null && Date.now() > m.overlay.expiresAt;
      match.value.overlay = overlayExpired
        ? { activeOverlay: null, expiresAt: null, customOverlayText: null }
        : {
            activeOverlay: m.overlay?.activeOverlay ?? null,
            expiresAt: m.overlay?.expiresAt ?? null,
            customOverlayText: m.overlay?.customOverlayText ?? null
          };
      match.value.status = m.status ?? match.value.status;
    }
  };

  const persist = async () => {
    const payload: StorageSchemaV1 = {
      version: 1,
      ui: match.value.ui,
      teamTemplates: [
        { name: match.value.teamA.name, colorToken: match.value.teamA.colorToken },
        { name: match.value.teamB.name, colorToken: match.value.teamB.colorToken }
      ],
      match: {
        periodLabel: match.value.periodLabel,
        periodIndex: match.value.periodIndex,
        teamA: { ...match.value.teamA },
        teamB: { ...match.value.teamB },
        impro: {
          theme: match.value.impro.theme,
          category: match.value.impro.category,
          type: match.value.impro.type,
          presetSeconds: match.value.impro.timer.presetSeconds,
          remainingSeconds: match.value.impro.timer.remainingSeconds
        },
        periodTimer: {
          presetSeconds: match.value.periodTimer.presetSeconds,
          remainingSeconds: match.value.periodTimer.remainingSeconds
        },
        overlay: { ...match.value.overlay },
        status: match.value.status
      }
    };

    await saveStorage(payload);
  };

  let persistTimeout: ReturnType<typeof setTimeout> | null = null;
  const debouncedPersist = () => {
    if (persistTimeout !== null) clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => {
      persistTimeout = null;
      void persist();
    }, 800);
  };

  watch(
    () => match.value,
    () => debouncedPersist(),
    { deep: true }
  );

  const ensureTicker = () => {
    if (tickerId !== null) {
      return;
    }

    tickerId = window.setInterval(() => {
      const nextImproTimer = tickTimer(match.value.impro.timer);
      const nextPeriodTimer = tickTimer(match.value.periodTimer);

      match.value.impro.timer = nextImproTimer;
      match.value.impro.isRunning = nextImproTimer.startedAt !== null;
      match.value.periodTimer = nextPeriodTimer;

      if (match.value.overlay.expiresAt && Date.now() > match.value.overlay.expiresAt) {
        match.value.overlay.activeOverlay = null;
        match.value.overlay.expiresAt = null;
        match.value.overlay.customOverlayText = null;
      }

      const hasRunningTimers = Boolean(nextImproTimer.startedAt || nextPeriodTimer.startedAt);
      const hasActiveOverlay = Boolean(match.value.overlay.expiresAt);
      if (!hasRunningTimers && !hasActiveOverlay && tickerId !== null) {
        clearInterval(tickerId);
        tickerId = null;
      }
    }, 250);
  };

  const setTeamName = (team: TeamKey, name: string) => {
    if (team === "A") {
      match.value.teamA.name = name;
      return;
    }

    match.value.teamB.name = name;
  };

  const setTheme = (theme: string) => {
    match.value.impro.theme = theme;
  };

  const setCategory = (category: string) => {
    match.value.impro.category = category;
  };

  const setImproType = (type: "mixte" | "comparee" | "none") => {
    match.value.impro.type = type;
  };

  const toggleImproType = () => {
    if (match.value.impro.type === "mixte") {
      match.value.impro.type = "comparee";
      return;
    }
    if (match.value.impro.type === "comparee") {
      match.value.impro.type = "none";
      return;
    }
    match.value.impro.type = "mixte";
  };

  const incrementScore = (team: TeamKey) => {
    if (team === "A") {
      match.value.teamA.score += 1;
      return;
    }

    match.value.teamB.score += 1;
  };

  const decrementScore = (team: TeamKey) => {
    if (team === "A") {
      match.value.teamA.score = Math.max(0, match.value.teamA.score - 1);
      return;
    }

    match.value.teamB.score = Math.max(0, match.value.teamB.score - 1);
  };

  const incrementPenalty = (team: TeamKey) => {
    if (team === "A") {
      match.value.teamA.penalties = Math.min(3, match.value.teamA.penalties + 1);
      return;
    }

    match.value.teamB.penalties = Math.min(3, match.value.teamB.penalties + 1);
  };

  const decrementPenalty = (team: TeamKey) => {
    if (team === "A") {
      match.value.teamA.penalties = Math.max(0, match.value.teamA.penalties - 1);
      return;
    }

    match.value.teamB.penalties = Math.max(0, match.value.teamB.penalties - 1);
  };

  const setPenaltyLevel = (team: TeamKey, level: number) => {
    const next = Math.max(0, Math.min(3, Math.floor(level)));
    if (team === "A") {
      match.value.teamA.penalties = next;
      return;
    }

    match.value.teamB.penalties = next;
  };

  const setImproPreset = (seconds: number) => {
    match.value.impro.timer = setTimerPreset(match.value.impro.timer, seconds);
    match.value.impro.isRunning = false;
  };

  const setImproMinutes = (minutes: number) => {
    const clampedMinutes = Math.min(15, Math.max(0, Math.floor(minutes)));
    const secondsStep = match.value.impro.timer.presetSeconds % 60;
    setImproPreset(clampedMinutes * 60 + secondsStep);
  };

  const nudgeImproMinutes = (direction: -1 | 1) => {
    const currentMinutes = Math.floor(match.value.impro.timer.presetSeconds / 60);
    setImproMinutes(currentMinutes + direction);
  };

  const setImproSecondsStep = (seconds: (typeof IMPRO_SECOND_STEPS)[number]) => {
    const minutes = Math.floor(match.value.impro.timer.presetSeconds / 60);
    setImproPreset(minutes * 60 + seconds);
  };

  const nudgeImproSecondsStep = (direction: -1 | 1) => {
    const currentStep = (match.value.impro.timer.presetSeconds % 60) as (typeof IMPRO_SECOND_STEPS)[number];
    const idx = IMPRO_SECOND_STEPS.findIndex((step) => step === currentStep);
    const start = idx === -1 ? 0 : idx;
    const next = Math.max(0, Math.min(IMPRO_SECOND_STEPS.length - 1, start + direction));
    setImproSecondsStep(IMPRO_SECOND_STEPS[next]);
  };

  const nudgeImproPreset = (direction: -1 | 1) => {
    const current = match.value.impro.timer.presetSeconds;
    const idx = IMPRO_TIME_PRESETS_SECONDS.findIndex((preset) => preset === current);
    const start = idx === -1 ? 0 : idx;
    const next = Math.max(0, Math.min(IMPRO_TIME_PRESETS_SECONDS.length - 1, start + direction));
    setImproPreset(IMPRO_TIME_PRESETS_SECONDS[next]);
  };

  const setPeriodPreset = (seconds: number) => {
    match.value.periodTimer = setTimerPreset(match.value.periodTimer, seconds);
  };

  const nudgePeriodPreset = (direction: -1 | 1) => {
    const current = match.value.periodTimer.presetSeconds;
    const minutesPart = Math.floor(current / 60) * 60;
    const idx = PERIOD_TIME_PRESETS_SECONDS.findIndex((preset) => preset === minutesPart);
    const start = idx === -1 ? 0 : idx;
    const next = Math.max(0, Math.min(PERIOD_TIME_PRESETS_SECONDS.length - 1, start + direction));
    const secondsStep = current % 60;
    setPeriodPreset(PERIOD_TIME_PRESETS_SECONDS[next] + secondsStep);
  };

  const setPeriodSecondsStep = (seconds: (typeof IMPRO_SECOND_STEPS)[number]) => {
    const minutesPart = Math.floor(match.value.periodTimer.presetSeconds / 60) * 60;
    setPeriodPreset(minutesPart + seconds);
  };

  const nudgePeriodSecondsStep = (direction: -1 | 1) => {
    const currentStep = match.value.periodTimer.presetSeconds % 60;
    const idx = IMPRO_SECOND_STEPS.findIndex((step) => step === currentStep);
    const start = idx === -1 ? 0 : idx;
    const next = Math.max(0, Math.min(IMPRO_SECOND_STEPS.length - 1, start + direction));
    setPeriodSecondsStep(IMPRO_SECOND_STEPS[next]);
  };

  const startImpro = () => {
    match.value.impro.timer = startTimer(match.value.impro.timer);
    match.value.impro.isRunning = true;
    match.value.status = "live";
    ensureTicker();
  };

  const pauseImpro = () => {
    match.value.impro.timer = pauseTimer(match.value.impro.timer);
    match.value.impro.isRunning = false;
    match.value.status = "pause";
  };

  const toggleImpro = () => {
    if (match.value.impro.isRunning) {
      pauseImpro();
      return;
    }

    startImpro();
  };

  const resetImpro = () => {
    match.value.impro.timer = resetTimer(match.value.impro.timer);
    match.value.impro.isRunning = false;
  };

  const setImproRemaining = (seconds: number) => {
    match.value.impro.timer = setTimerRemaining(match.value.impro.timer, seconds);
    match.value.impro.isRunning = false;
  };

  const startPeriod = () => {
    match.value.periodTimer = startTimer(match.value.periodTimer);
    ensureTicker();
  };

  const pausePeriod = () => {
    match.value.periodTimer = pauseTimer(match.value.periodTimer);
  };

  const togglePeriod = () => {
    if (match.value.periodTimer.startedAt === null) {
      startPeriod();
      return;
    }

    pausePeriod();
  };

  const resetPeriod = () => {
    match.value.periodTimer = resetTimer(match.value.periodTimer);
  };

  const setPeriodRemaining = (seconds: number) => {
    match.value.periodTimer = setTimerRemaining(match.value.periodTimer, seconds);
  };

  const setPeriodLabel = (period: PeriodLabel) => {
    match.value.periodLabel = period;
    const numeric = Number(period);
    match.value.periodIndex = Number.isNaN(numeric) ? match.value.periodIndex : numeric;
  };

  const nextPeriod = () => {
    const idx = PERIOD_LABELS.findIndex((value) => value === match.value.periodLabel);
    setPeriodLabel(PERIOD_LABELS[(idx + 1) % PERIOD_LABELS.length]);
  };

  const previousPeriod = () => {
    const idx = PERIOD_LABELS.findIndex((value) => value === match.value.periodLabel);
    setPeriodLabel(PERIOD_LABELS[(idx - 1 + PERIOD_LABELS.length) % PERIOD_LABELS.length]);
  };

  const triggerOverlay = (overlay: OverlayKey) => {
    match.value.overlay.activeOverlay = overlay;
    match.value.overlay.expiresAt = Date.now() + OVERLAY_DURATION_MS;
    if (overlay in OVERLAY_LABELS) {
      ensureTicker();
    }
  };

  const clearOverlay = () => {
    match.value.overlay.activeOverlay = null;
    match.value.overlay.expiresAt = null;
    match.value.overlay.customOverlayText = null;
  };

  const triggerCustomOverlay = (text: string) => {
    const trimmed = text.trim() || "ANNONCE";
    match.value.overlay.activeOverlay = "overlay_custom";
    match.value.overlay.customOverlayText = trimmed;
    match.value.overlay.expiresAt = Date.now() + OVERLAY_DURATION_MS;
    ensureTicker();
  };

  const cycleTeamColor = (team: TeamKey) => {
    if (team === "A") {
      match.value.teamA.colorToken = nextColor(match.value.teamA.colorToken);
      return;
    }

    match.value.teamB.colorToken = nextColor(match.value.teamB.colorToken);
  };

  const setPalette = (key: keyof typeof TEAM_PALETTES) => {
    const palette = TEAM_PALETTES[key];
    match.value.ui.paletteSelection = key;
    match.value.teamA.colorToken = palette[0];
    match.value.teamB.colorToken = palette[1];
  };

  const updateScale = (scale: number) => {
    match.value.ui.displayScale = Math.min(1.25, Math.max(0.8, scale));
  };

  const toggleContrast = () => {
    match.value.ui.contrastMode = match.value.ui.contrastMode === "standard" ? "high" : "standard";
  };

  const setFullscreenPreference = (value: boolean) => {
    match.value.ui.lastFullscreenChoice = value;
  };

  const setGhostOpacity = (idleOpacity: number, hoverOpacity: number) => {
    match.value.ui.ghostIdleOpacity = Math.min(0.06, Math.max(0, idleOpacity));
    match.value.ui.ghostHoverOpacity = Math.min(0.3, Math.max(0.08, hoverOpacity));
  };

  const setHotspotScale = (scale: number) => {
    match.value.ui.hotspotScale = Math.min(1.35, Math.max(0.75, scale));
  };

  const resetMatch = () => {
    const ui = match.value.ui;
    const state = makeDefaultState();
    state.ui = ui;
    match.value = state;
  };

  return {
    match,
    presets: IMPRO_TIME_PRESETS_SECONDS,
    periodPresets: PERIOD_TIME_PRESETS_SECONDS,
    periodLabels: PERIOD_LABELS,
    overlayLabels: OVERLAY_LABELS,
    hydrate,
    persist,
    setTeamName,
    setTheme,
    setCategory,
    setImproType,
    toggleImproType,
    incrementScore,
    decrementScore,
    incrementPenalty,
    decrementPenalty,
    setPenaltyLevel,
    setImproPreset,
    setImproMinutes,
    nudgeImproMinutes,
    setImproSecondsStep,
    nudgeImproSecondsStep,
    nudgeImproPreset,
    setPeriodPreset,
    nudgePeriodPreset,
    nudgePeriodSecondsStep,
    startImpro,
    pauseImpro,
    toggleImpro,
    resetImpro,
    setImproRemaining,
    startPeriod,
    pausePeriod,
    togglePeriod,
    resetPeriod,
    setPeriodRemaining,
    setPeriodLabel,
    nextPeriod,
    previousPeriod,
    triggerOverlay,
    triggerCustomOverlay,
    clearOverlay,
    cycleTeamColor,
    setPalette,
    updateScale,
    toggleContrast,
    setFullscreenPreference,
    setGhostOpacity,
    setHotspotScale,
    resetMatch
  };
});
