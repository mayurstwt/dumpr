import { useState, useEffect } from 'react';

export function useWeekendCountdown() {
  const [timeLeft, setTimeLeft] = useState('');
  const [weekend, setWeekend] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();

      const isWeekendNow = day === 0 || day === 6 || (day === 5 && hours >= 17);
      setWeekend(isWeekendNow);

      if (!isWeekendNow) {
        const nextFriday = new Date(now);
        let daysToFriday = 5 - day;
        if (daysToFriday < 0 || (daysToFriday === 0 && hours >= 17)) {
            daysToFriday += 7;
        }
        nextFriday.setDate(now.getDate() + daysToFriday);
        nextFriday.setHours(17, 0, 0, 0);

        const diff = nextFriday.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        setTimeLeft(`${days}d ${hrs}h ${mins}m ${secs}s`);
      } else {
        setTimeLeft('');
      }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return { isWeekend: weekend, timeLeft };
}
