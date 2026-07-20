import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getEvent } from '../../services/events';
import { listPendingPayments, reviewPayment } from '../../services/registrations';

export default function ClubPaymentQueue() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);

  async function load() {
    const evt = await getEvent(eventId);
    setEvent(evt);
    try {
      setPending(await listPendingPayments(eventId));
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [eventId]);

  async function handleDecision(registrationId, decision) {
    setActingId(registrationId);
    try {
      await reviewPayment(registrationId, decision);
      setPending((prev) => prev.filter((r) => r.id !== registrationId));
    } catch (err) {
      setError("Couldn't update — try again.");
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto p-6 text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to={`/club/events/${eventId}`} className="text-sm text-muted underline mb-6 inline-block">← Back to event</Link>
      <h1 className="font-display text-2xl mb-1">Payment approvals</h1>
      <p className="text-muted mb-6">{event?.title}</p>

      {error && <p className="text-signal text-sm mb-4">{error}</p>}

      {pending.length === 0 ? (
        <p className="text-muted text-sm">Nothing waiting for review.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="card p-4">
              <p className="font-semibold text-sm">
                {r.isTeam ? `Team "${r.teamName}"` : r.studentName}
              </p>
              <p className="text-xs text-muted mt-1">Transaction ID: {r.transactionId}</p>
              {r.screenshotUrl && (
                <a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-ink underline mt-1 inline-block">
                  View screenshot
                </a>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleDecision(r.id, 'approved')}
                  disabled={actingId === r.id}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
                <button
                  onClick={() => handleDecision(r.id, 'rejected')}
                  disabled={actingId === r.id}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-signal/10 text-signal hover:bg-signal/20 disabled:opacity-50"
                >
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}