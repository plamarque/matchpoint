import { IMPRO_SECOND_STEPS } from "@/constants/match";
import type { RemoteCommand } from "./commands";
import type { useMatchStore } from "@/stores/matchStore";

export type MatchStore = ReturnType<typeof useMatchStore>;

export function runRemoteCommand(cmd: RemoteCommand, store: MatchStore): void {
  const s = store;
  switch (cmd.type) {
    case "score_up":
      s.incrementScore(cmd.team);
      return;
    case "score_down":
      s.decrementScore(cmd.team);
      return;
    case "penalty_up":
      s.incrementPenalty(cmd.team);
      return;
    case "penalty_down":
      s.decrementPenalty(cmd.team);
      return;
    case "penalty_set":
      s.setPenaltyLevel(cmd.team, Math.max(0, Math.min(3, cmd.level)));
      return;
    case "set_team_name":
      s.setTeamName(cmd.team, cmd.value);
      return;
    case "cycle_team_color":
      s.cycleTeamColor(cmd.team);
      return;
    case "set_palette":
      if (["classic", "emerald", "ember", "graphite"].includes(cmd.palette)) {
        s.setPalette(cmd.palette as "classic" | "emerald" | "ember" | "graphite");
      }
      return;
    case "set_theme":
      s.setTheme(cmd.value);
      return;
    case "set_category":
      s.setCategory(cmd.value);
      return;
    case "set_impro_type":
      s.setImproType(cmd.value);
      return;
    case "toggle_impro_type":
      s.toggleImproType();
      return;
    case "impro_preset":
      s.setImproPreset(Math.max(0, cmd.value));
      return;
    case "impro_minutes":
      s.setImproMinutes(cmd.value);
      return;
    case "impro_seconds_step":
      if (IMPRO_SECOND_STEPS.includes(cmd.value as (typeof IMPRO_SECOND_STEPS)[number])) {
        s.setImproSecondsStep(cmd.value as (typeof IMPRO_SECOND_STEPS)[number]);
      }
      return;
    case "nudge_impro_preset":
      s.nudgeImproPreset(cmd.direction);
      return;
    case "nudge_impro_minutes":
      s.nudgeImproMinutes(cmd.direction);
      return;
    case "nudge_impro_seconds":
      s.nudgeImproSecondsStep(cmd.direction);
      return;
    case "impro_start":
      s.startImpro();
      return;
    case "impro_pause":
      s.pauseImpro();
      return;
    case "impro_toggle":
      s.toggleImpro();
      return;
    case "impro_reset":
      s.resetImpro();
      return;
    case "impro_set_remaining":
      s.setImproRemaining(Math.max(0, cmd.seconds));
      return;
    case "set_period_label":
      s.setPeriodLabel(cmd.value);
      return;
    case "period_next":
      s.nextPeriod();
      return;
    case "period_prev":
      s.previousPeriod();
      return;
    case "period_preset":
      s.setPeriodPreset(Math.max(0, cmd.value));
      return;
    case "nudge_period_preset":
      s.nudgePeriodPreset(cmd.direction);
      return;
    case "period_start":
      s.startPeriod();
      return;
    case "period_pause":
      s.pausePeriod();
      return;
    case "period_toggle":
      s.togglePeriod();
      return;
    case "period_reset":
      s.resetPeriod();
      return;
    case "period_set_remaining":
      s.setPeriodRemaining(Math.max(0, cmd.seconds));
      return;
    case "nudge_period_seconds":
      s.nudgePeriodSecondsStep(cmd.direction);
      return;
    case "overlay":
      s.triggerOverlay(cmd.key);
      return;
    case "overlay_custom":
      s.triggerCustomOverlay(cmd.text);
      return;
    case "overlay_clear":
      s.clearOverlay();
      return;
    case "contrast_toggle":
      s.toggleContrast();
      return;
    case "fullscreen_preference":
      s.setFullscreenPreference(cmd.value);
      return;
    case "reset_match":
      s.resetMatch();
      return;
    default:
      break;
  }
}
