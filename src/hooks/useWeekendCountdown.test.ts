import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWeekendCountdown } from './useWeekendCountdown';

describe('useWeekendCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockDate = (dateString: string) => {
    const date = new Date(dateString);
    vi.setSystemTime(date);
  };

  it('should detect when it is currently the weekend (Saturday)', () => {
    mockDate('2026-04-04T10:00:00'); // Saturday
    const { result } = renderHook(() => useWeekendCountdown());
    
    expect(result.current.isWeekend).toBe(true);
    expect(result.current.timeLeft).toBe('');
  });

  it('should detect when it is currently the weekend (Friday Evening)', () => {
    mockDate('2026-04-03T18:00:00'); // Friday 6 PM
    const { result } = renderHook(() => useWeekendCountdown());
    
    expect(result.current.isWeekend).toBe(true);
  });

  it('should detect weekday and show correct countdown (Wednesday)', () => {
    mockDate('2026-04-01T12:00:00'); // Wednesday 12 PM
    // Next Friday is 2026-04-03 17:00:00
    // Diff: 2 days, 5 hours
    const { result } = renderHook(() => useWeekendCountdown());
    
    expect(result.current.isWeekend).toBe(false);
    expect(result.current.timeLeft).toContain('2d 5h 0m');
  });

  it('updates countdown via interval', () => {
    mockDate('2026-04-01T12:00:00'); // Wednesday 12 PM
    const { result } = renderHook(() => useWeekendCountdown());
    
    expect(result.current.timeLeft).toContain('2d 5h 0m 0s');

    act(() => {
      vi.advanceTimersByTime(2000); // Advance 2 seconds
    });

    expect(result.current.timeLeft).toContain('2d 4h 59m 58s');
  });
});
