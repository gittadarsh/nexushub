import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Collects roll number + phone the first time a student actually needs them
 * (currently: right before registering for an event) rather than at signup.
 * Call this with an onComplete callback; it updates students/{uid} and
 * flips profileComplete to true so it never asks again.
 */
export default function ProfileCompletionGate({ uid, onComplete, onCancel }) {
  const [rollNo, setRollNo] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rollNo.trim() || !contact.trim()) {
      setError('Both fields are needed so clubs can confirm your registration.');
      return;
    }
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'students', uid), {
        rollNo: rollNo.trim(),
        contact: contact.trim(),
        profileComplete: true
      });
      onComplete({ rollNo, contact });
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 grid place-items-center p-6 z-50">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="font-display text-xl mb-1">Just two more things</h2>
        <p className="text-muted text-sm mb-5">
          Clubs need these to confirm your registration — we only ask once.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Roll number" required
            value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
          <input className="input-field" placeholder="Phone number" required
            value={contact} onChange={(e) => setContact(e.target.value)} />
          {error && <p className="text-signal text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Continue'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-sm text-muted underline w-full text-center">
              Not now
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
