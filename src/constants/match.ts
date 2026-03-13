import type { OverlayKey, PeriodLabel } from "@/types/match";

export const IMPRO_TIME_PRESETS_SECONDS = [
  15,
  30,
  45,
  60,
  90,
  120,
  180,
  240,
  300,
  420,
  600,
  900
];
export const IMPRO_SECOND_STEPS = [0, 10, 30, 45] as const;
export const PERIOD_TIME_PRESETS_SECONDS = [900, 1200, 1500, 1800, 2400, 3000];

export const PERIOD_LABELS: PeriodLabel[] = ["1", "2", "3", "4", "premiere", "derniere"];

export const TEAM_PALETTES = {
  classic: ["#e63946", "#3a86ff"],
  emerald: ["#2a9d8f", "#e9c46a"],
  ember: ["#f2542d", "#1b3b6f"],
  graphite: ["#f4f1de", "#3d405b"]
} as const;

export const OVERLAY_LABELS: Record<OverlayKey, string> = {
  start_match: "Début du match",
  hymn: "Hymne",
  caucus: "Caucus",
  vote: "Vote",
  intermission: "Entracte",
  penalty: "Pénalité",
  ejection: "Expulsion",
  shootout: "Fusillade",
  stars: "Étoiles du match",
  overlay_custom: "Annonce"
};

export const OVERLAY_DURATION_MS = 10_000;

export const PENALTY_THRESHOLD = 3;

export const BUILTIN_TEAM_COLORS = [
  "#e63946",
  "#3a86ff",
  "#ff9f1c",
  "#2a9d8f",
  "#9b5de5",
  "#2b2d42",
  "#f72585",
  "#4cc9f0",
  "#f4f1de",
  "#4f772d"
];

/** Cycle de couleur équipe : même logique que l’affichage (store). À utiliser côté remote et store. */
export function getNextTeamColor(current: string): string {
  const index = BUILTIN_TEAM_COLORS.indexOf(current);
  if (index === -1) return BUILTIN_TEAM_COLORS[0];
  return BUILTIN_TEAM_COLORS[(index + 1) % BUILTIN_TEAM_COLORS.length];
}
