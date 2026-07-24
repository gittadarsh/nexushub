import { useEffect, useState } from 'react';
import { listAllEvents } from '../../services/events';
import { getClubsByIds } from '../../services/clubs';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import StudentNav from '../../components/StudentNav';
import EventCard from '../../components/EventCard';

/**
 * Saved tab — every event the student has bookmarked, regardless of its
 * current status (unlike Home/Explore/Subscriptions, this deliberately
 * does NOT filter out completed events — if you saved it, you probably
 * still want to find it later, e.g. to see photos/results afterward).
 */
export default function SavedEvents() {
  const { studentProfile, loading: profileLoading, isBookmarked, toggleBookmark } = useStudentProfile();
  const [events, setEvents] = useState([]);
  const [clubsById, setClubsById] = useState({});
  const [loading, setLoading] = useState(true);

  const bookmarkedIds = studentProfile?.bookmarkedEvents || [];

  useEffect(() => {
    if (profileLoading) return;
    async function load() {
      const all = await listAllEvents();
      const saved = all.filter((e) => bookmarkedIds.includes(e.id));
      setEvents(saved);
      setClubsById(await getClubsByIds(saved.map((e) => e.clubId)));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, bookmarkedIds.join(',')]);

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl mb-1">Saved</h1>
        <p className="text-muted mb-6">Events you've bookmarked for later.</p>

        {profileLoading || loading ? (
          <p className="text-muted">Loading…</p>
        ) : events.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted">Nothing saved yet — tap the bookmark icon on any event to save it here.</p>
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
