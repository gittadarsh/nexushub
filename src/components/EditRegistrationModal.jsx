import { useState } from 'react';
import { X } from 'lucide-react';
import { adminUpdateRegistration } from '../services/registrations';

/**
 * Club-side correction tool. Lets an admin fix a typo'd roll number,
 * swap out a team member, or fix a team name — never touches
 * paymentStatus or team size (Firestore rules enforce this server-side
 * too). Every save is stamped with editedByAdminUid + editedAt.
 */
export default function EditRegistrationModal({ registration, adminUid, onClose, onSaved }) {
  const isTeam = registration.isTeam;
  const [studentName, setStudentName] = useState(registration.studentName || '');
  const [rollNo, setRollNo] = useState(registration.rollNo || '');
  const [teamName, setTeamName] = useState(registration.teamName || '');
  const [members, setMembers] = useState(
    isTeam ? (registration.members || []).map((m) => ({ ...m })) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateMember(i, field, value) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const updates = isTeam
        ? { teamName, members }
        : { studentName, rollNo };
      await adminUpdateRegistration(registration.id, updates, adminUid);
      onSaved();
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 grid place-items-center p-6 z-50">
      <div className="card w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="font-semibold text-sm">Edit registration</p>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        {isTeam ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Team name</label>
              <input className="input-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </div>
            {members.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder={`Member ${i + 1} name`}
                  value={m.name}
                  onChange={(e) => updateMember(i, 'name', e.target.value)}
                />
                <input
                  className="input-field w-28"
                  placeholder="Roll no."
                  value={m.rollNo}
                  onChange={(e) => updateMember(i, 'rollNo', e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Name</label>
              <input className="input-field" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Roll number</label>
              <input className="input-field" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
            </div>
          </div>
        )}

        {error && <p className="text-signal text-xs mt-3">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full mt-4">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <p className="text-xs text-muted text-center mt-2">
          Team size can't be changed here — for that, ask the student to re-register.
        </p>
      </div>
    </div>
  );
}
