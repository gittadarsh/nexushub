import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Mail, Phone } from 'lucide-react';
import { listPendingClubApplications, approveClubApplication, declineClubApplication } from '../../services/admin';

/**
 * Private admin page — replaces the entire manual Firestore approval
 * process with one click. Currently gated only by being a logged-in user
 * who knows this URL exists ("security by obscurity" — acceptable
 * pre-launch, but flagged to upgrade to a real allowlist check alongside
 * the Firestore security rules work).
 */
export default function AdminClubApprovals() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setApplications(await listPendingClubApplications());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(app) {
    setBusyId(app.id);
    setMessage('');
    try {
      await approveClubApplication(app);
      setMessage(`Approved "${app.clubName}" — they can log in and post events now.`);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch (err) {
      setMessage(`Couldn't approve: ${err.message.replace('Firebase: ', '')}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(app) {
    setBusyId(app.id);
    setMessage('');
    try {
      await declineClubApplication(app.id);
      setMessage(`Declined "${app.clubName}".`);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch (err) {
      setMessage(`Couldn't decline: ${err.message.replace('Firebase: ', '')}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-1">Admin — internal only</p>
        <h1 className="font-display text-3xl mb-1">Club approvals</h1>
        <p className="text-muted mb-6">Review each request, then approve or decline. No Firestore editing needed.</p>

        {message && (
          <div className="card p-3 mb-4 text-sm font-medium">{message}</div>
        )}

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : applications.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted">No pending club applications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="card p-5">
                <h2 className="font-display text-xl mb-1">{app.clubName}</h2>
                {app.description && <p className="text-muted text-sm mb-3">{app.description}</p>}

                <div className="flex flex-col gap-1 text-sm mb-4">
                  <span className="flex items-center gap-2 text-muted">
                    <Mail size={14} /> {app.contactEmail}
                  </span>
                  {app.contactPhone && (
                    <span className="flex items-center gap-2 text-muted">
                      <Phone size={14} /> {app.contactPhone}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(app)}
                    disabled={busyId === app.id}
                    className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button
                    onClick={() => handleDecline(app)}
                    disabled={busyId === app.id}
                    className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
