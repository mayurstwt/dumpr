import { useEffect, useState } from 'react';
import { getNextOpenTime } from '@/lib/weekend';

export function ClosedGate() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = getNextOpenTime();
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        window.location.reload();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dive-bar-gradient min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl md:text-7xl font-bold neon-text text-primary mb-4">
        🚧 CLOSED 🚧
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl mb-12 max-w-md">
        The bar opens Friday at 6 PM. Come back and dump your weekend chaos.
      </p>
      <div className="flex gap-4 md:gap-6">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Min', value: timeLeft.minutes },
          { label: 'Sec', value: timeLeft.seconds },
        ].map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span className="text-4xl md:text-6xl font-bold text-primary neon-text tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-smoke text-sm mt-16">
        Monday 12:01 AM = Everything gets nuked. No trace.
      </p>
    </div>
  );
}
