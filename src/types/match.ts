export type MatchStatus = "idle" | "live" | "pause" | "intermission" | "vote" | "ended";

export type OverlayKey =
  | "start_match"
  | "hymn"
  | "caucus"
  | "vote"
  | "intermission"
  | "penalty"
  | "ejection"
  | "shootout"
  | "stars"
  | "overlay_custom";

export type PeriodLabel = "1" | "2" | "3" | "4" | "premiere" | "derniere";
export type TeamKey = "A" | "B";
export type HotspotAction =
  | "score_up_a"
  | "score_down_a"
  | "score_up_b"
  | "score_down_b"
  | "penalty_up_a"
  | "penalty_down_a"
  | "penalty_up_b"
  | "penalty_down_b"
  | "color_cycle_a"
  | "color_cycle_b"
  | "impro_preset_up"
  | "impro_preset_down"
  | "impro_play_pause"
  | "impro_reset"
  | "period_next"
  | "period_prev"
  | "fullscreen_toggle"
  | "contrast_toggle"
  | "overlay_clear";

export type HotspotId = `hotspot_${HotspotAction}` | `overlay_${OverlayKey}`;

export interface HotspotDefinition {
  id: HotspotId;
  label: string;
  action: HotspotAction | OverlayKey;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "circle";
  /** Centre le hotspot verticalement sur y (ex. pour zone de couleur) */
  centerY?: boolean;
}

export interface TimerState {
  mode: "countdown";
  presetSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
  /** Temps restant (en secondes) au moment du démarrage du chrono (pour le décompte correct). */
  startedWithRemainingSeconds: number | null;
  pausedAt: number | null;
}

export interface TeamState {
  name: string;
  score: number;
  colorToken: string;
  penalties: number;
  /** Image en data URL (optionnel), pour affichage et persistance offline. */
  logoDataUrl: string | null;
  /** Couleur du carton de vote (hex), défaut gauche/droite selon DOMAIN ; persistée, sans affichage sur l’écran principal. */
  voteCardColor: string;
}

export interface ImproState {
  theme: string;
  category: string;
  type: "mixte" | "comparee" | "none";
  timer: TimerState;
  isRunning: boolean;
}

export interface OverlayState {
  activeOverlay: OverlayKey | null;
  expiresAt: number | null;
  /** Texte affiché pour overlay_custom (saisie libre). */
  customOverlayText: string | null;
}

export interface UiPrefs {
  displayScale: number;
  contrastMode: "standard" | "high";
  showControlHints: boolean;
  lastFullscreenChoice: boolean;
  paletteSelection: string;
  ghostIdleOpacity: number;
  ghostHoverOpacity: number;
  hotspotScale: number;
}

export interface MatchState {
  id: string;
  status: MatchStatus;
  periodLabel: PeriodLabel;
  periodIndex: number;
  teamA: TeamState;
  teamB: TeamState;
  impro: ImproState;
  periodTimer: TimerState;
  overlay: OverlayState;
  ui: UiPrefs;
}

/** Snapshot sérialisable du match pour persistance (timers en preset + remaining uniquement, toujours en pause au restore). */
export interface PersistedMatchSnapshot {
  periodLabel: PeriodLabel;
  periodIndex: number;
  teamA: TeamState;
  teamB: TeamState;
  impro: {
    theme: string;
    category: string;
    type: "mixte" | "comparee" | "none";
    presetSeconds: number;
    remainingSeconds: number;
  };
  periodTimer: {
    presetSeconds: number;
    remainingSeconds: number;
  };
  overlay: OverlayState;
  status: MatchStatus;
}

export interface StorageSchemaV1 {
  version: 1;
  ui: UiPrefs;
  teamTemplates: Array<Pick<TeamState, "name" | "colorToken">>;
  /** État complet du match (titre, scores, timers, période, overlay) pour restauration après refresh. */
  match?: PersistedMatchSnapshot;
}

/** Snapshot sérialisable pour sync télécommande : même structure que PersistedMatchSnapshot + isRunning pour les deux chronos. */
export interface RemoteStateSnapshot {
  periodLabel: PeriodLabel;
  periodIndex: number;
  teamA: TeamState;
  teamB: TeamState;
  impro: {
    theme: string;
    category: string;
    type: "mixte" | "comparee" | "none";
    presetSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
  };
  periodTimer: {
    presetSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
  };
  overlay: OverlayState;
  status: MatchStatus;
  /** Modal QR affichée sur l’écran d’affichage (pour bouton poussoir sur la télécommande). */
  showRemoteQrModal?: boolean;
}
