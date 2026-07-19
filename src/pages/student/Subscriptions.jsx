import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllEvents, computeEventStatus } from '../../services/events';
import { getClubsByIds } from '../../services/clubs';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import StudentNav from '../../components/StudentNav';
import EventCard from '../../components/EventCard';

/**
 * Subscriptions tab — YouTube-style: only events from clubs the student has
 * subscribed to (via the subscribe button on an event's detail page).
 */
export default function Subscriptions() {
  const { studentProfile, loading: profileLoading } = useStudentProfile();
  const [events, setEvents] = useState([]);
  const [clubsById, setClubsById] = useState({});
  const [loading, setLoading] = useState(true);

  const subscribedClubs = studentProfile?.subscribedClubs || [];

  useEffect(() => {
    if (profileLoading) return;
    async function load() {
      const evts = await listAllEvents();
      const visible = evts.filter(
        (e) => computeEventStatus(e) !== 'completed' && subscribedClubs.includes(e.clubId)
      );
      setEvents(visible);
      setClubsById(await getClubsByIds(visible.map((e) => e.clubId)));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, subscribedClubs.join(',')]);

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl mb-1">Subscriptions</h1>
        <p className="text-muted mb-6">Only from clubs you follow.</p>

        {profileLoading || loading ? (
          <p className="text-muted">Loading…</p>
        ) : subscribedClubs.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted mb-3">You haven't subscribed to any clubs yet.</p>
            <Link to="/explore" className="text-ink underline font-semibold">Find clubs to follow →</Link>
          </div>
        ) : events.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted">No open events from your subscribed clubs right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} club={clubsById[event.clubId]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
