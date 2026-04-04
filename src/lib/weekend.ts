export function isWeekendOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const hour = now.getHours();

  if (day === 5 && hour >= 18) return true; // Friday 6PM+
  if (day === 6) return true; // All Saturday
  if (day === 0) return true; // All Sunday
  return false;
}

export function getNextOpenTime(): Date {
  const now = new Date();
  const day = now.getDay();
  const target = new Date(now);

  // Find next Friday
  const daysUntilFriday = (5 - day + 7) % 7 || (now.getHours() < 18 && day === 5 ? 0 : 7);
  target.setDate(now.getDate() + daysUntilFriday);
  target.setHours(18, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 7);
  }

  return target;
}

export const LOCATIONS = ['SF', 'NYC', 'Bangalore', 'London', 'Berlin', 'Remote'] as const;
export type LocationTag = typeof LOCATIONS[number];
