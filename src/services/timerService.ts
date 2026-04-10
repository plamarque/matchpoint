import type { TimerState } from "@/types/match";

const clamp = (value: number, min = 0) => (value < min ? min : value);

export const createCountdownTimer = (presetSeconds: number): TimerState => ({
  mode: "countdown",
  presetSeconds,
  remainingSeconds: presetSeconds,
  startedAt: null,
  startedWithRemainingSeconds: null,
  pausedAt: null
});

export const setTimerPreset = (timer: TimerState, seconds: number, now = Date.now()): TimerState => ({
  ...timer,
  presetSeconds: seconds,
  remainingSeconds: seconds,
  startedAt: null,
  startedWithRemainingSeconds: null,
  pausedAt: now
});

/** Met à jour le temps restant et met le timer en pause pour que la saisie manuelle ne soit pas écrasée par le tick. */
export const setTimerRemaining = (timer: TimerState, seconds: number, now = Date.now()): TimerState => ({
  ...timer,
  remainingSeconds: clamp(seconds),
  startedAt: null,
  startedWithRemainingSeconds: null,
  pausedAt: now
});

export const startTimer = (timer: TimerState, now = Date.now()): TimerState => {
  if (timer.remainingSeconds <= 0) {
    return { ...timer, startedAt: null, pausedAt: now };
  }

  if (timer.startedAt !== null) {
    return timer;
  }

  return {
    ...timer,
    startedAt: now,
    startedWithRemainingSeconds: timer.remainingSeconds,
    pausedAt: null
  };
};

export const pauseTimer = (timer: TimerState, now = Date.now()): TimerState => {
  if (timer.startedAt === null) {
    return timer;
  }

  const baseRemaining = timer.startedWithRemainingSeconds ?? timer.remainingSeconds;
  const elapsedSeconds = Math.floor((now - timer.startedAt) / 1000);

  return {
    ...timer,
    remainingSeconds: clamp(baseRemaining - elapsedSeconds),
    startedAt: null,
    startedWithRemainingSeconds: null,
    pausedAt: now
  };
};

export const resetTimer = (timer: TimerState, now = Date.now()): TimerState => ({
  ...timer,
  remainingSeconds: timer.presetSeconds,
  startedAt: null,
  startedWithRemainingSeconds: null,
  pausedAt: now
});

export const tickTimer = (timer: TimerState, now = Date.now()): TimerState => {
  if (timer.startedAt === null) {
    return timer;
  }

  const baseRemaining = timer.startedWithRemainingSeconds ?? timer.remainingSeconds;
  const elapsedSeconds = Math.floor((now - timer.startedAt) / 1000);
  const remainingSeconds = clamp(baseRemaining - elapsedSeconds);

  if (remainingSeconds === 0) {
    return {
      ...timer,
      remainingSeconds,
      startedAt: null,
      startedWithRemainingSeconds: null,
      pausedAt: now
    };
  }

  return {
    ...timer,
    remainingSeconds,
    startedAt: timer.startedAt,
    startedWithRemainingSeconds: timer.startedWithRemainingSeconds ?? baseRemaining
  };
};

export const isTimerRunning = (timer: TimerState): boolean => timer.startedAt !== null;

export const formatClock = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.max(seconds % 60, 0)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
};

/** Parse "M:SS" or "MM:SS" into total seconds; returns null if invalid. */
export const parseClock = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 1) {
    const n = parseInt(parts[0], 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (!Number.isFinite(mins) || !Number.isFinite(secs) || mins < 0 || secs < 0 || secs >= 60) return null;
    return mins * 60 + secs;
  }
  return null;
};
