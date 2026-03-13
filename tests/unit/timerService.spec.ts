import { describe, expect, it } from "vitest";
import { createCountdownTimer, formatClock, pauseTimer, resetTimer, setTimerPreset, startTimer, tickTimer } from "@/services/timerService";

describe("timerService", () => {
  it("formats clock in mm:ss", () => {
    expect(formatClock(75)).toBe("01:15");
  });

  it("starts, ticks and pauses countdown", () => {
    let timer = createCountdownTimer(90);
    timer = startTimer(timer, 1_000);
    timer = tickTimer(timer, 31_000);
    expect(timer.remainingSeconds).toBe(60);
    timer = pauseTimer(timer, 51_000);
    expect(timer.remainingSeconds).toBe(40);
  });

  it("resets and applies preset", () => {
    let timer = createCountdownTimer(60);
    timer = setTimerPreset(timer, 120, 1_000);
    expect(timer.remainingSeconds).toBe(120);
    timer = startTimer(timer, 2_000);
    timer = tickTimer(timer, 42_000);
    timer = resetTimer(timer, 43_000);
    expect(timer.remainingSeconds).toBe(120);
  });
});
