import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const URGENCY_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Deliberately quiet, and deliberately rare: renders NOTHING unless the
 * deadline is genuinely close (under 48h). Shown only once, only on the
 * event detail page a student is actively looking at — never on feed
 * cards. Constant or omnipresent urgency signals train people to ignore
 * them (banner blindness) or read the product as manipulative; a countdown
 * only means something when it's contextual and true.
 */
export default function RegistrationCountdown({ deadline }) {
  const [msLeft, setMsLeft] = useState(() => deadline.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setMsLeft(deadline.getTime() - Date.now());
    }, 60 * 1000); // tick once a minute — no need for second-level precision here
    return () => clearInterval(interval);
  }, [deadline]);

  if (msLeft <= 0 || msLeft > URGENCY_THRESHOLD_MS) return null;

  const hours = Math.floor(msLeft / (60 * 60 * 1000));
  const minutes = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  const label = hours >= 1 ? `${hours}h ${minutes}m left to register` : `${minutes}m left to register`;

  return (
    <p className="flex items-center gap-1.5 text-signal text-sm font-semibold mb-3">
      <Clock size={14} /> {label}
    </p>
  );
}
