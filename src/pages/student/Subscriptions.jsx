import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllEvents, computeEventStatus } from '../../services/events';
import { getClubsByIds } from '../../services/clubs';
import { cloudinaryThumb } from '../../services/cloudinary';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import StudentNav from '../../components/StudentNav';
import EventCard from '../../components/EventCard';

/**
 * Subscriptions tab — YouTube-style: only events from clubs the student has
 * subscribed to (via the subscribe button on an event's detail page).
 */
export default function Subscriptions() {
  const { studentProfile, loading: profileLoading, isBookmarked, toggleBookmark } = useStudentProfile();
  const [allEvents, setAllEvents] = useState([]);
  const [clubsById, setClubsById] = useState({});
  const [loading, setLoading] = useState(true);

  const subscribedClubs = studentProfile?.subscribedClubs || [];
  const clubLastSeen = studentProfile?.clubLastSeen || {};

  useEffect(() => {
    if (profileLoading) return;
    async function load() {
      const evts = await listAllEvents();
      setAllEvents(evts);
      const relevantClubIds = evts.filter((e) => subscribedClubs.includes(e.clubId)).map((e) => e.clubId);
      setClubsById(await getClubsByIds([...new Set([...subscribedClubs, ...relevantClubIds])]));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, subscribedClubs.join(',')]);

  // Most recent event createdAt per subscribed club, regardless of status —
  // used purely to decide the "new since you last checked" dot, separate
  // from the visible feed below (which still hides completed events).
  const latestByClub = useMemo(() => {
    const map = {};
    for (const e of allEvents) {
      if (!subscribedClubs.includes(e.clubId)) continue;
      const t = e.createdAt?.toMillis?.() || 0;
      if (!map[e.clubId] || t > map[e.clubId]) map[e.clubId] = t;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, subscribedClubs.join(',')]);

  function hasNewActivity(clubId) {
    const latest = latestByClub[clubId];
    if (!latest) return false;
    const seen = clubLastSeen[clubId]?.toMillis?.() || 0;
    return latest > seen;
  }

  const visibleEvents = allEvents.filter(
    (e) => computeEventStatus(e) !== 'completed' && subscribedClubs.includes(e.clubId)
  );

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
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
              {subscribedClubs.map((clubId) => {
                const club = clubsById[clubId];
                if (!club) return null;
                return (
                  <Link
                    key={clubId}
                    to={`/clubs/${clubId}`}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center"
                  >
                    <div className="relative">
                      {club.logoUrl ? (
                        <img src={cloudinaryThumb(club.logoUrl, 150)} alt="" className="w-12 h-12 rounded-full object-cover border border-line" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-line grid place-items-center font-display text-lg">
                          {club.name?.[0] || '?'}
                        </div>
                      )}
                      {hasNewActivity(clubId) && (
                        <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-signal border-2 border-paper" />
                      )}
                    </div>
                    <span className="text-[11px] leading-tight text-muted line-clamp-2">{club.name}</span>
                  </Link>
                );
              })}
            </div>

            {visibleEvents.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-muted">No open events from your subscribed clubs right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {visibleEvents.map((event) => (
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
          </>
        )}
      </div>
    </div>
  );
}
