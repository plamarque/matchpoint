import type { MatchStatus } from "@/types/match";

/**
 * Détermine quel chrono occupe la zone principale (grand cadran), selon docs/DOMAIN.md :
 * `live` et `pause` → impro ; les autres statuts → période.
 */
export function isPrimaryChronoImpro(status: MatchStatus): boolean {
  return status === "live" || status === "pause";
}
