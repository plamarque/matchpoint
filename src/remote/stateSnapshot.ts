import { isRef } from "vue";
import type { RemoteStateSnapshot } from "@/types/match";
import type { MatchState } from "@/types/match";

/**
 * Construit un snapshot sérialisable de l'état du match pour la synchronisation
 * avec la télécommande (affichage → backend → remote).
 */
export function buildSnapshot(store: {
  match: MatchState | { value: MatchState };
  showRemoteQrModal?: { value: boolean } | boolean;
}): RemoteStateSnapshot {
  const m = isRef(store.match) ? store.match.value : store.match;
  const qr =
    store.showRemoteQrModal === undefined
      ? undefined
      : typeof store.showRemoteQrModal === "object" && "value" in store.showRemoteQrModal
        ? store.showRemoteQrModal.value
        : Boolean(store.showRemoteQrModal);
  return {
    periodLabel: m.periodLabel,
    periodIndex: m.periodIndex,
    teamA: { ...m.teamA },
    teamB: { ...m.teamB },
    impro: {
      theme: m.impro.theme,
      category: m.impro.category,
      type: m.impro.type,
      presetSeconds: m.impro.timer.presetSeconds,
      remainingSeconds: m.impro.timer.remainingSeconds,
      isRunning: m.impro.isRunning
    },
    periodTimer: {
      presetSeconds: m.periodTimer.presetSeconds,
      remainingSeconds: m.periodTimer.remainingSeconds,
      isRunning: m.periodTimer.startedAt !== null
    },
    overlay: { ...m.overlay },
    status: m.status,
    organizerLogoDataUrl: m.organizerLogoDataUrl,
    showRemoteQrModal: qr
  };
}
