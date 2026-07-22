import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { listPendingPaymentsForClub, approvePayment, rejectPayment } from '../../services/registrations';
import { getEvent } from '../../services/events';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentApprovals() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    const raw = await listPendingPaymentsForClub(profile.clubId);
    // Attach event title + whatsapp link (needed at approval time) to each row.
    const withEvents = await Promise.all(raw.map(async (r) => {
      const event = await getEvent(r.eventId);
      return { ...r, eventTitle: event?.title || 'Unknown event', whatsappGroupLink: event?.whatsappGroupLink || '' };
    }));
    setPayments(withEvents);
    setLoading(false);
  }

  useEffect(() => {
    if (profile?.clubId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.clubId]);

  async function handleApprove(p) {
    setBusyId(p.id);
    setMessage('');
    try {
      await approvePayment(p.id, p.whatsappGroupLink);
      setMessage(`Approved — ${p.isTeam ? p.teamName : p.studentName} can now see the WhatsApp link.`);
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setMessage(`Couldn't approve: ${err.message.replace('Firebase: ', '')}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(p) {
    setBusyId(p.id);
    setMessage('');
    try {
      await rejectPayment(p.id);
      setMessage(`Rejected — they can resubmit.`);
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setMessage(`Couldn't reject: ${err.message.replace('Firebase: ', '')}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-2">Payments</p>
      <h1 className="font-display text-3xl mb-1">Payment approvals</h1>
      <p className="text-muted mb-6">Review proof, then approve to release the WhatsApp link.</p>

      <Link to="/club/dashboard" className="text-sm text-muted underline mb-6 inline-block">← Back to dashboard</Link>

      {message && <div className="card p-3 mb-4 text-sm font-medium">{message}</div>}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted">Nothing pending — you're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold">{p.isTeam ? p.teamName : p.studentName}</p>
                  <p className="text-xs text-muted">{p.eventTitle}</p>
                </div>
                {p.flaggedForReview && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-signal bg-signal/10 px-2 py-1 rounded-full shrink-0">
                    <AlertTriangle size={12} /> {p.paymentAttemptCount} attempts
                  </span>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-sm mb-2">
                <IndianRupee size={14} /> Transaction ID: <span className="font-mono">{p.transactionId}</span>
              </p>

              {p.screenshotUrl && (
                <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer">
                  <img src={p.screenshotUrl} alt="Payment screenshot" className="w-32 rounded-card border border-line mb-3" />
                </a>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleApprove(p)}
                  disabled={busyId === p.id}
                  className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  onClick={() => handleReject(p)}
                  disabled={busyId === p.id}
                  className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
