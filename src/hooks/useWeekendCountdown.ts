import { useState, useEffect } from 'react';
import { getAppMode, getNextModeSwitch, type AppMode } from '@/lib/weekend';

interface WeekendCountdownResult {
  mode: AppMode;
  /** @deprecated use mode === 'weekend' */
  isWeekend: boolean;
  /** Formatted countdown like "3d 2h 15m 22s" */
  timeLeft: string;
  /** Label for what's coming next, e.g. "🍺 Weekend starts" */
  nextLabel: string;
}

export function useWeekendCountdown(): WeekendCountdownResult {
  const [mode, setMode] = useState<AppMode>(getAppMode());
  const [timeLeft, setTimeLeft] = useState('');
  const [nextLabel, setNextLabel] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const currentMode = getAppMode(now);
      setMode(currentMode);

      const { label, time } = getNextModeSwitch();
      setNextLabel(label);

      const diff = time.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${String(hrs).padStart(2, '0')}h`);
      parts.push(`${String(mins).padStart(2, '0')}m`);
      parts.push(`${String(secs).padStart(2, '0')}s`);
      setTimeLeft(parts.join(' '));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { mode, isWeekend: mode === 'weekend', timeLeft, nextLabel };
}
