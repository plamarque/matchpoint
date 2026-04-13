import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useMatchStore } from "@/stores/matchStore";

vi.stubGlobal("crypto", { randomUUID: () => "test-id" });

describe("matchStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prevents negative score", () => {
    const store = useMatchStore();
    store.decrementScore("A");
    expect(store.match.teamA.score).toBe(0);
  });

  it("does not auto change score at three penalties", () => {
    const store = useMatchStore();
    store.incrementPenalty("A");
    store.incrementPenalty("A");
    store.incrementPenalty("A");
    expect(store.match.teamA.penalties).toBe(3);
    expect(store.match.teamB.score).toBe(0);
  });

  it("sets penalty level directly", () => {
    const store = useMatchStore();
    store.setPenaltyLevel("A", 2);
    expect(store.match.teamA.penalties).toBe(2);
    store.setPenaltyLevel("A", 9);
    expect(store.match.teamA.penalties).toBe(3);
  });

  it("cycles team color", () => {
    const store = useMatchStore();
    const current = store.match.teamA.colorToken;
    store.cycleTeamColor("A");
    expect(store.match.teamA.colorToken).not.toBe(current);
  });

  it("sets vote card color when hex is valid", () => {
    const store = useMatchStore();
    store.setVoteCardColor("A", "#ff00aa");
    expect(store.match.teamA.voteCardColor).toBe("#ff00aa");
    store.setVoteCardColor("A", "not-a-color");
    expect(store.match.teamA.voteCardColor).toBe("#ff00aa");
  });

  it("sets team logo data url", () => {
    const store = useMatchStore();
    store.setTeamLogo("B", "data:image/png;base64,abc");
    expect(store.match.teamB.logoDataUrl).toBe("data:image/png;base64,abc");
    store.setTeamLogo("B", null);
    expect(store.match.teamB.logoDataUrl).toBeNull();
  });

  it("sets organizer logo data url", () => {
    const store = useMatchStore();
    store.setOrganizerLogo("data:image/png;base64,org");
    expect(store.match.organizerLogoDataUrl).toBe("data:image/png;base64,org");
    store.setOrganizerLogo(null);
    expect(store.match.organizerLogoDataUrl).toBeNull();
  });

  it("nudges impro preset", () => {
    const store = useMatchStore();
    const current = store.match.impro.timer.presetSeconds;
    store.nudgeImproPreset(1);
    expect(store.match.impro.timer.presetSeconds).toBeGreaterThanOrEqual(current);
  });

  it("sets impro minutes and seconds step independently", () => {
    const store = useMatchStore();
    store.setImproMinutes(7);
    expect(store.match.impro.timer.presetSeconds).toBe(7 * 60);
    store.nudgeImproSecondsStep(1);
    expect(store.match.impro.timer.presetSeconds).toBe(7 * 60 + 10);
    store.setImproMinutes(99);
    expect(Math.floor(store.match.impro.timer.presetSeconds / 60)).toBe(15);
  });

  it("clamps hotspot scale", () => {
    const store = useMatchStore();
    store.setHotspotScale(2);
    expect(store.match.ui.hotspotScale).toBe(1.35);
    store.setHotspotScale(0.2);
    expect(store.match.ui.hotspotScale).toBe(0.75);
  });

  it("toggles impro type mixte/comparee/none", () => {
    const store = useMatchStore();
    expect(store.match.impro.type).toBe("mixte");
    store.toggleImproType();
    expect(store.match.impro.type).toBe("comparee");
    store.toggleImproType();
    expect(store.match.impro.type).toBe("none");
    store.toggleImproType();
    expect(store.match.impro.type).toBe("mixte");
  });

  it("auto clears overlay after timeout", () => {
    const store = useMatchStore();
    store.triggerOverlay("start_match");
    expect(store.match.overlay.activeOverlay).toBe("start_match");
    vi.advanceTimersByTime(10_500);
    expect(store.match.overlay.activeOverlay).toBeNull();
  });
});
