// ─── Mode Definitions ────────────────────────────────────────────────────────
// Weekday mode : Monday 00:00 → Friday 18:00
// Weekend mode : Friday 18:00 → Monday 00:00

export type AppMode = 'weekday' | 'weekend';

export function getAppMode(now = new Date()): AppMode {
  const day = now.getDay();   // 0=Sun, 1=Mon … 6=Sat
  const hour = now.getHours();

  // Weekend: Fri 18:00+ OR Sat all day OR Sun all day
  if (day === 6 || day === 0) return 'weekend';
  if (day === 5 && hour >= 18) return 'weekend';
  return 'weekday';
}

export function isWeekdayMode(now?: Date): boolean {
  return getAppMode(now) === 'weekday';
}

export function isWeekendMode(now?: Date): boolean {
  return getAppMode(now) === 'weekend';
}

// Legacy compat — keep isWeekendOpen for any remaining callers
export function isWeekendOpen(): boolean {
  return isWeekendMode();
}

// ─── Next Mode Switch ─────────────────────────────────────────────────────────
export function getNextModeSwitch(): { label: string; time: Date } {
  const now = new Date();
  const mode = getAppMode(now);
  const target = new Date(now);

  if (mode === 'weekday') {
    // Next switch: Friday 18:00
    const day = now.getDay();
    const daysToFriday = (5 - day + 7) % 7 || (now.getHours() < 18 && day === 5 ? 0 : 7);
    target.setDate(now.getDate() + daysToFriday);
    target.setHours(18, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 7);
    return { label: '🍺 Weekend starts', time: target };
  } else {
    // Next switch: Monday 00:00
    const day = now.getDay();
    const daysToMonday = (1 - day + 7) % 7 || 7;
    target.setDate(now.getDate() + daysToMonday);
    target.setHours(0, 0, 0, 0);
    return { label: '💼 Weekday starts', time: target };
  }
}

// Legacy — still used by ClosedGate (now unused but kept for safety)
export function getNextOpenTime(): Date {
  return getNextModeSwitch().time;
}

// ─── Period Start ─────────────────────────────────────────────────────────────
// Returns the timestamp when the CURRENT period started, so the feed only
// shows posts from the current mode period.
export function getCurrentPeriodStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const mode = getAppMode(now);

  const periodStart = new Date(now);
  periodStart.setMinutes(0, 0, 0);

  if (mode === 'weekend') {
    // Roll back to most recent Friday 18:00
    if (day === 5 && hour >= 18) {
      periodStart.setHours(18);
    } else if (day === 6) {
      periodStart.setDate(periodStart.getDate() - 1);
      periodStart.setHours(18);
    } else {
      // Sunday
      periodStart.setDate(periodStart.getDate() - 2);
      periodStart.setHours(18);
    }
  } else {
    // Roll back to most recent Monday 00:00
    const diffToMonday = day === 0 ? 6 : day - 1;
    periodStart.setDate(periodStart.getDate() - diffToMonday);
    periodStart.setHours(0);
  }

  return periodStart;
}

export const LOCATIONS = ['SF', 'NYC', 'Bangalore', 'London', 'Berlin', 'Remote'] as const;
export type LocationTag = typeof LOCATIONS[number];
