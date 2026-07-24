import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, Pencil, Trash2, Users, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { getEvent, computeEventStatus, STATUS_LABELS, deleteEvent } from '../../services/events';
import { listRegistrationsForEvent } from '../../services/registrations';
import { exportRegistrationsToExcel } from '../../services/exportRegistrations';
import { useAuth } from '../../contexts/AuthContext';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import EditRegistrationModal from '../../components/EditRegistrationModal';

export default function ClubEventView() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [regError, setRegError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [editingReg, setEditingReg] = useState(null);

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await exportRegistrationsToExcel(event, registrations);
    } catch (err) {
      setError("Couldn't generate the Excel file — try again.");
    } finally {
      setExporting(false);
    }
  }

  function loadRegistrations() {
    listRegistrationsForEvent(eventId)
      .then(setRegistrations)
      .catch((err) => setRegError(err.message.replace('Firebase: ', '')))
      .finally(() => setLoadingRegs(false));
  }

  useEffect(() => {
    getEvent(eventId).then(setEvent);
    loadRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const pendingPaymentCount = registrations.filter((r) => r.paymentStatus === 'pending_review').length;

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
            <Link
  to={`/club/events/${eventId}/payments`}
  className="relative inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-line text-ink hover:bg-line/70 ml-2"
>
  Payments
  {pendingPaymentCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-signal text-paper text-[10px] font-bold leading-none rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">
      {pendingPaymentCount > 9 ? '9+' : pendingPaymentCount}
    </span>
  )}
</Link>
            <button
              onClick={handleExport}
              disabled={exporting || registrations.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-line text-ink hover:bg-line/70 ml-2 disabled:opacity-40"
            >
              <FileDown size={13} /> {exporting ? 'Preparing…' : 'Download Excel'}
            </button>
          </div>
          {error && <p className="text-signal text-xs mt-2">{error}</p>}
        </div>
      </div>

     <p className="mt-6">{event.description}</p>

{event.highlights?.length > 0 && (
  <ul className="mt-4 text-sm space-y-1 list-disc list-inside text-ink/90">
    {event.highlights.map((h, i) => <li key={i}>{h}</li>)}
  </ul>
)}
{event.prizes && (
  <p className="mt-3 text-sm font-semibold">🏆 {event.prizes}</p>
)}

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
                    <li key={r.id} className="text-sm border-b border-line pb-1.5">
                      <div className="flex justify-between items-center gap-2">
                        <span>{r.studentName || 'Unnamed'}</span>
                        <span className="flex items-center gap-2">
                          <PaymentStatusBadge status={r.paymentStatus} />
                          <span className="text-muted">{r.rollNo}</span>
                          <button onClick={() => setEditingReg(r)} className="text-muted hover:text-ink" title="Edit registration">
                            <Pencil size={13} />
                          </button>
                        </span>
                      </div>
                      {r.editedAt?.toDate && (
                        <p className="text-xs text-muted mt-0.5">
                          Last edited by club on {format(r.editedAt.toDate(), 'd MMM, h:mm a')}
                        </p>
                      )}
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
                      <p className="font-semibold text-sm mb-1.5 flex items-center gap-2">
                        {r.teamName}
                        <PaymentStatusBadge status={r.paymentStatus} />
                        <button onClick={() => setEditingReg(r)} className="text-muted hover:text-ink ml-auto" title="Edit registration">
                          <Pencil size={13} />
                        </button>
                      </p>
                      <ul className="space-y-1">
                        {(r.members || []).map((m, i) => (
                          <li key={i} className="text-sm flex justify-between text-muted">
                            <span>{m.name}</span>
                            <span>{m.rollNo}</span>
                          </li>
                        ))}
                      </ul>
                      {r.editedAt?.toDate && (
                        <p className="text-xs text-muted mt-2">
                          Last edited by club on {format(r.editedAt.toDate(), 'd MMM, h:mm a')}
                        </p>
                      )}
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

      {editingReg && (
        <EditRegistrationModal
          registration={editingReg}
          adminUid={firebaseUser.uid}
          onClose={() => setEditingReg(null)}
          onSaved={() => { setEditingReg(null); loadRegistrations(); }}
        />
      )}
    </div>
  );
}