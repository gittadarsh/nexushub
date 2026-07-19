import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, Pencil, Trash2, Users } from 'lucide-react';
import { getEvent, computeEventStatus, STATUS_LABELS, deleteEvent } from '../../services/events';
import { listRegistrationsForEvent } from '../../services/registrations';

export default function ClubEventView() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [regError, setRegError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getEvent(eventId).then(setEvent);
    listRegistrationsForEvent(eventId)
      .then(setRegistrations)
      .catch((err) => setRegError(err.message.replace('Firebase: ', '')))
      .finally(() => setLoadingRegs(false));
  }, [eventId]);

  async function handleDelete() {
    if (!window.confirm(`Delete "${event.title}"? This can't be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await deleteEvent(eventId);
      navigate('/club/dashboard', { replace: true });
    } catch (err) {
      setError("Couldn't delete — try again.");
      setDeleting(false);
    }
  }

  if (!event) return <div className="p-6 text-muted">Loading…</div>;

  const soloRegs = registrations.filter((r) => !r.isTeam);
  const teamRegs = registrations.filter((r) => r.isTeam);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/club/dashboard" className="text-sm text-muted underline mb-6 inline-block">← Back to dashboard</Link>
      <div className="flex gap-6">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt="" className="w-40 h-40 object-cover rounded-card border border-line" />
        ) : (
          <div className="w-40 h-40 rounded-card border border-line bg-line grid place-items-center text-muted text-xs shrink-0">
            No poster
          </div>
        )}
        <div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-line">
            {STATUS_LABELS[computeEventStatus(event)]}
          </span>
          <h1 className="font-display text-3xl mt-2">{event.title}</h1>
          <p className="text-muted mt-1">{event.venue}</p>
          <p className="text-sm mt-4 text-muted">
            Team size {event.teamSize} · ₹{event.price || 'Free'} · {event.registeredCount || 0} registered
          </p>
          <p className="text-sm mt-1 text-muted flex items-center gap-1.5">
            <Heart size={14} /> {event.likeCount || 0} likes (visible only to you)
          </p>

          <div className="mt-4">
            <Link
              to={`/club/post-event?eventId=${eventId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-ink text-paper hover:opacity-90"
            >
              <Pencil size={13} /> Edit
            </Link>
          </div>
          {error && <p className="text-signal text-xs mt-2">{error}</p>}
        </div>
      </div>

      <p className="mt-6">{event.description}</p>

      <div className="mt-8 pt-6 border-t border-line">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Users size={18} /> Registrations ({registrations.length})
        </h2>

        {loadingRegs ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : regError ? (
          <p className="text-signal text-sm">Couldn't load registrations: {regError}</p>
        ) : registrations.length === 0 ? (
          <p className="text-muted text-sm">No one's registered yet.</p>
        ) : (
          <div className="space-y-4">
            {soloRegs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Individual ({soloRegs.length})
                </p>
                <ul className="space-y-1.5">
                  {soloRegs.map((r) => (
                    <li key={r.id} className="text-sm flex justify-between border-b border-line pb-1.5">
                      <span>{r.studentName || 'Unnamed'}</span>
                      <span className="text-muted">{r.rollNo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {teamRegs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Teams ({teamRegs.length})
                </p>
                <div className="space-y-3">
                  {teamRegs.map((r) => (
                    <div key={r.id} className="card p-3">
                      <p className="font-semibold text-sm mb-1.5">{r.teamName}</p>
                      <ul className="space-y-1">
                        {(r.members || []).map((m, i) => (
                          <li key={i} className="text-sm flex justify-between text-muted">
                            <span>{m.name}</span>
                            <span>{m.rollNo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 pt-6 border-t border-signal/20">
        <p className="text-xs text-muted mb-2">Danger zone</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-signal/10 text-signal hover:bg-signal/20 disabled:opacity-50"
        >
          <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete this event'}
        </button>
      </div>
    </div>
  );
}