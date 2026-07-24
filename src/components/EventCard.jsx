import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Bookmark } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { computeEventStatus } from '../services/events';

/**
 * bookmarked / onToggleBookmark are optional — pages that don't have a
 * student profile loaded (or don't want the control, e.g. a club's own
 * preview) can simply omit them and the button won't render.
 */
export default function EventCard({ event, club, bookmarked, onToggleBookmark }) {
  const status = computeEventStatus(event);
  const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);

  return (
    <Link to={`/events/${event.id}`} className="card overflow-hidden hover:border-ink transition group relative">
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
        {onToggleBookmark && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(event.id); }}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-paper/90 hover:bg-paper transition"
            title={bookmarked ? 'Remove from saved' : 'Save for later'}
          >
            <Bookmark size={15} className={bookmarked ? 'fill-ink text-ink' : 'text-muted'} />
          </button>
        )}
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
