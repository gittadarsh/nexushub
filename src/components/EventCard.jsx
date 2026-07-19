import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';
import { computeEventStatus } from '../services/events';

export default function EventCard({ event, club }) {
  const status = computeEventStatus(event);
  const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);

  return (
    <Link to={`/events/${event.id}`} className="card overflow-hidden hover:border-ink transition group">
      <div className="aspect-square bg-line relative overflow-hidden">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt={event.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
        ) : (
          // Fallback for events without a poster (e.g. Storage not yet configured)
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-ink to-muted">
            <span className="font-display text-4xl text-paper/70">{event.title?.[0] || '?'}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="p-3">
        {club && <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">{club.name}</p>}
        <p className="font-semibold leading-snug line-clamp-2">{event.title}</p>
        <p className="text-sm text-muted mt-1">
          {isNaN(eventDate) ? '' : format(eventDate, 'd MMM')} · {event.venue}
        </p>
      </div>
    </Link>
  );
}
