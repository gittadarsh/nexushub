import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Rss, RssIcon } from 'lucide-react';
import { getClub } from '../../services/clubs';
import { cloudinaryThumb } from '../../services/cloudinary';
import { listEventsForClub, computeEventStatus } from '../../services/events';
import { markClubSeen } from '../../services/students';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import StudentNav from '../../components/StudentNav';
import EventCard from '../../components/EventCard';

export default function ClubProfile() {
  const { clubId } = useParams();
  const { firebaseUser } = useAuth();
  const { isSubscribed, toggleSubscribe, isBookmarked, toggleBookmark } = useStudentProfile();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const [clubData, clubEvents] = await Promise.all([
        getClub(clubId),
        listEventsForClub(clubId)
      ]);
      setClub(clubData);
      setEvents(clubEvents.filter((e) => computeEventStatus(e) !== 'completed'));
      setLoading(false);
    }
    load();
    // Checking in on a club's page is what clears its "new activity" dot
    // back in Subscriptions — a soft, best-effort stamp, not critical
    // enough to block the page or show an error if it fails.
    if (firebaseUser) {
      markClubSeen(firebaseUser.uid, clubId).catch(() => {});
    }
  }, [clubId, firebaseUser]);

  async function handleSubscribe() {
    setSubBusy(true);
    try {
      await toggleSubscribe(clubId);
    } finally {
      setSubBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-paper p-6 text-muted">Loading…</div>;
  if (!club) return <div className="min-h-screen bg-paper p-6 text-muted">Club not found.</div>;

  const subscribed = isSubscribed(clubId);

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-start gap-5">
          {club.logoUrl ? (
            <img src={cloudinaryThumb(club.logoUrl, 200)} alt="" className="w-24 h-24 rounded-card object-cover border border-line shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-card border border-line bg-line grid place-items-center text-2xl font-display shrink-0">
              {club.name?.[0] || '?'}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display text-3xl">{club.name}</h1>
            {club.description && <p className="text-muted mt-2">{club.description}</p>}
            <button
              onClick={handleSubscribe}
              disabled={subBusy}
              className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition disabled:opacity-50 ${
                subscribed ? 'bg-line text-ink' : 'bg-ink text-paper hover:opacity-90'
              }`}
            >
              {subscribed ? <RssIcon size={14} /> : <Rss size={14} />}
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
        </div>

        {club.leadership?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Leadership</h2>
            <div className="flex flex-wrap gap-3">
              {club.leadership.map((l, i) => (
                <div key={i} className="card px-4 py-2">
                  <p className="font-semibold text-sm">{l.name}</p>
                  <p className="text-xs text-muted">{l.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {club.achievements?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Achievements</h2>
            <ul className="text-sm space-y-1.5 list-disc list-inside text-ink/90">
              {club.achievements.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {club.galleryUrls?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Gallery</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {club.galleryUrls.map((url, i) => (
                <img key={i} src={cloudinaryThumb(url, 400)} alt="" className="w-full aspect-square object-cover rounded-lg border border-line" />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-line">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
            Upcoming events ({events.length})
          </h2>
          {events.length === 0 ? (
            <p className="text-muted text-sm">Nothing posted right now — subscribe to get notified.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  club={club}
                  bookmarked={isBookmarked(event.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
