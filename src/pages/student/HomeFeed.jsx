import { useEffect, useState } from 'react';
import { listAllEvents, computeEventStatus } from '../../services/events';
import { getClubsByIds } from '../../services/clubs';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import StudentNav from '../../components/StudentNav';
import EventCard from '../../components/EventCard';

/**
 * Home tab — every event from every club, newest first. Deliberately no
 * status filter row at the top (moved off; status still shows as a small
 * badge per-card). This mirrors YouTube's Home: one continuous feed, not a
 * filtered view — filtering/search lives in the Explore tab instead.
 */
export default function HomeFeed() {
  const [events, setEvents] = useState([]);
  const [clubsById, setClubsById] = useState({});
  const [loading, setLoading] = useState(true);
  const { isBookmarked, toggleBookmark } = useStudentProfile();

  useEffect(() => {
    async function load() {
      const evts = await listAllEvents();
      const visible = evts.filter((e) => computeEventStatus(e) !== 'completed');
      setEvents(visible);
      setClubsById(await getClubsByIds(visible.map((e) => e.clubId)));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl mb-1">What's happening</h1>
        <p className="text-muted mb-6">Every club, one feed.</p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-line rounded-card animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted">No events posted yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                club={clubsById[event.clubId]}
                bookmarked={isBookmarked(event.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
