import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listAllEvents, computeEventStatus } from '../../services/events';
import { listAllClubs } from '../../services/clubs';
import { cloudinaryThumb } from '../../services/cloudinary';
import StudentNav from '../../components/StudentNav';
import EventCard from '../../components/EventCard';

/**
 * Explore tab. Two jobs:
 * 1. Search narrows down events/clubs by name (unchanged behavior).
 * 2. When not searching, show every club as a browsable directory —
 *    students don't need to already know a club's name to find it.
 *    Each card links to /clubs/:id, the club's "about" page.
 */
export default function ExploreSearch() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [evts, clubList] = await Promise.all([listAllEvents(), listAllClubs()]);
      setEvents(evts.filter((e) => computeEventStatus(e) !== 'completed'));
      setClubs(clubList);
      setLoading(false);
    }
    load();
  }, []);

  const clubsById = useMemo(() => {
    const map = {};
    clubs.forEach((c) => { map[c.id] = c; });
    return map;
  }, [clubs]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return events.filter((e) => {
      const clubName = clubsById[e.clubId]?.name?.toLowerCase() || '';
      return e.title?.toLowerCase().includes(q) || clubName.includes(q);
    });
  }, [query, events, clubsById]);

  const matchingClubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return clubs.filter((c) => c.name?.toLowerCase().includes(q));
  }, [query, clubs]);

  const sortedClubs = useMemo(
    () => [...clubs].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [clubs]
  );

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl mb-1">Explore</h1>
        <p className="text-muted mb-6">Browse every club, or search for an event.</p>

        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input-field pl-11"
            placeholder="Search events or clubs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : !query.trim() ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
              All clubs ({sortedClubs.length})
            </p>
            {sortedClubs.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-muted">No clubs on the platform yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {sortedClubs.map((club) => (
                  <Link
                    key={club.id}
                    to={`/clubs/${club.id}`}
                    className="card p-4 flex flex-col items-center text-center gap-2 hover:border-ink transition"
                  >
                    {club.logoUrl ? (
                      <img src={cloudinaryThumb(club.logoUrl, 150)} alt="" className="w-16 h-16 rounded-full object-cover border border-line" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-line grid place-items-center font-display text-xl">
                        {club.name?.[0] || '?'}
                      </div>
                    )}
                    <p className="font-semibold text-sm leading-snug">{club.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {matchingClubs.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Clubs</p>
                <div className="flex flex-wrap gap-2">
                  {matchingClubs.map((c) => (
                    <Link key={c.id} to={`/clubs/${c.id}`} className="card px-4 py-2 text-sm font-semibold hover:border-ink transition">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Events</p>
            {results.length === 0 ? (
              <p className="text-muted">No events match "{query}".</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.map((event) => (
                  <EventCard key={event.id} event={event} club={clubsById[event.clubId]} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
