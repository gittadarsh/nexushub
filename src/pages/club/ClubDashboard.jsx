import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { listEventsForClub, computeEventStatus, STATUS_LABELS } from '../../services/events';

export default function ClubDashboard() {
  const { profile, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.clubId) return;
    listEventsForClub(profile.clubId).then((evts) => {
      setEvents(evts);
      setLoading(false);
    });
  }, [profile?.clubId]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-1">Club dashboard</p>
          <h1 className="font-display text-3xl">Your events</h1>
        </div>
        <button onClick={logout} className="btn-secondary text-sm">Log out</button>
      </div>

      <div className="flex gap-3 mb-8">
        <Link to="/club/post-event" className="btn-primary inline-block">+ Post an event</Link>
        <Link to="/club/doubts" className="btn-secondary inline-block">Student questions</Link>
        <Link to="/club/profile" className="btn-secondary inline-block">Edit club profile</Link>
      </div>

      {loading ? (
        <p className="text-muted">Loading events…</p>
      ) : events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted">No events yet. Your first one takes about two minutes to post.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((evt) => {
            const status = computeEventStatus(evt);
            return (
              <Link to={`/club/events/${evt.id}`} key={evt.id} className="card p-4 flex gap-4 hover:border-ink transition">
                {evt.posterUrl ? (
                  <img src={evt.posterUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-line grid place-items-center text-muted text-xs shrink-0">No image</div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{evt.title}</p>
                  <p className="text-sm text-muted">{evt.venue}</p>
                </div>
                <span className="text-xs font-semibold self-start px-2 py-1 rounded-full bg-line">
                  {STATUS_LABELS[status]}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
