import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, BellRing, Heart } from 'lucide-react';
import { getEvent, computeEventStatus } from '../../services/events';
import { getClub } from '../../services/clubs';
import {
  getStudentRegistration, registerForEvent, registerTeamForEvent, cancelRegistration
} from '../../services/registrations';
import { buildWhatsAppShareLink } from '../../services/likes';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { useAuth } from '../../contexts/AuthContext';
import StudentNav from '../../components/StudentNav';
import StatusBadge from '../../components/StatusBadge';
import RegistrationCountdown from '../../components/RegistrationCountdown';
import ProfileCompletionGate from '../../components/ProfileCompletionGate';

export default function EventDetail() {
  const { eventId } = useParams();
  const { firebaseUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subError, setSubError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);

  // Team registration form state
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState([]);

  const {
    isSubscribed, toggleSubscribe, isLiked, toggleLike, studentProfile, loading: profileLoading, refresh
  } = useStudentProfile();

  useEffect(() => {
    async function load() {
      const evt = await getEvent(eventId);
      setEvent(evt);
      if (evt) setClub(await getClub(evt.clubId));
      if (evt && firebaseUser) {
        const reg = await getStudentRegistration(firebaseUser.uid, eventId);
        setRegistration(reg);
        if (!reg && evt.teamSize > 1) {
          // Prefill the leader's own slot; the rest start blank.
          const blankSlots = Array.from({ length: evt.teamSize - 1 }, () => ({ name: '', rollNo: '' }));
          setMembers([{ name: firebaseUser.displayName || '', rollNo: '' }, ...blankSlots]);
        }
      }
      setLoading(false);
    }
    load();
  }, [eventId, firebaseUser]);

  async function handleSubscribeClick() {
    setSubError('');
    try {
      await toggleSubscribe(club.id);
    } catch (err) {
      setSubError("Couldn't update — try again.");
    }
  }

  async function handleLikeClick() {
    try {
      await toggleLike(eventId);
    } catch (err) {
      // Like is a soft, low-stakes action — fail silently rather than
      // interrupting the page with an error banner.
    }
  }

  function handleShareClick() {
    window.open(buildWhatsAppShareLink(event), '_blank');
  }

  function handleRegisterClick() {
    setRegError('');
    if (!studentProfile?.profileComplete) {
      setShowProfileGate(true);
      return;
    }
    doSoloRegister();
  }

  async function doSoloRegister() {
    setRegistering(true);
    setRegError('');
    try {
      const regId = await registerForEvent({
        eventId,
        studentUid: firebaseUser.uid,
        clubId: event.clubId,
        studentName: studentProfile?.name || firebaseUser.displayName || 'Unnamed',
        rollNo: studentProfile?.rollNo || ''
      });
      setRegistration({ id: regId, status: 'registered' });
      setEvent((prev) => ({ ...prev, registeredCount: (prev.registeredCount || 0) + 1 }));
    } catch (err) {
      setRegError("Couldn't register — try again.");
    } finally {
      setRegistering(false);
    }
  }

  function updateMember(index, field, value) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleTeamRegister(e) {
    e.preventDefault();
    setRegError('');

    if (!teamName.trim()) {
      setRegError('Give your team a name.');
      return;
    }
    if (members.some((m) => !m.name.trim() || !m.rollNo.trim())) {
      setRegError('Fill in name and roll number for every teammate.');
      return;
    }

    setRegistering(true);
    try {
      const regId = await registerTeamForEvent({
        eventId,
        studentUid: firebaseUser.uid,
        clubId: event.clubId,
        teamName: teamName.trim(),
        members: members.map((m) => ({ name: m.name.trim(), rollNo: m.rollNo.trim() }))
      });
      setRegistration({ id: regId, status: 'registered', isTeam: true, teamName });
      setEvent((prev) => ({ ...prev, registeredCount: (prev.registeredCount || 0) + 1 }));
    } catch (err) {
      setRegError("Couldn't register — try again.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleCancelClick() {
    setRegError('');
    setRegistering(true);
    try {
      await cancelRegistration(registration.id, eventId);
      setRegistration(null);
      setEvent((prev) => ({ ...prev, registeredCount: Math.max((prev.registeredCount || 1) - 1, 0) }));
    } catch (err) {
      setRegError("Couldn't cancel — try again.");
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <StudentNav />
        <p className="text-muted text-center mt-12">Loading…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-paper">
        <StudentNav />
        <div className="max-w-2xl mx-auto p-6 text-center mt-12">
          <p className="text-muted">This event doesn't exist or was removed.</p>
          <Link to="/" className="text-ink underline font-semibold mt-2 inline-block">Back to Home</Link>
        </div>
      </div>
    );
  }

  const status = computeEventStatus(event);
  const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
  const deadline = event.registrationDeadline?.toDate
    ? event.registrationDeadline.toDate()
    : new Date(event.registrationDeadline);
  const subscribed = club ? isSubscribed(club.id) : false;
  const liked = isLiked(eventId);
  const isTeamEvent = event.teamSize > 1;
  const canRegister = status === 'open' || status === 'few_seats';

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      {showProfileGate && (
        <ProfileCompletionGate
          uid={firebaseUser.uid}
          onComplete={async () => {
            setShowProfileGate(false);
            await refresh();
            doSoloRegister();
          }}
          onCancel={() => setShowProfileGate(false)}
        />
      )}

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Link to="/" className="text-sm text-muted underline mb-4 inline-block">← Back to Home</Link>

        <div className="card overflow-hidden">
          <div className="aspect-[4/3] bg-line">
            {event.posterUrl ? (
              <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gradient-to-br from-ink to-muted">
                <span className="font-display text-6xl text-paper/70">{event.title?.[0] || '?'}</span>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                {club && <p className="text-sm text-muted font-semibold uppercase tracking-wide">{club.name}</p>}
                {club && (
                  <button
                    onClick={handleSubscribeClick}
                    disabled={profileLoading}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                      subscribed ? 'bg-line text-ink' : 'bg-ink text-paper hover:opacity-90'
                    }`}
                  >
                    {subscribed ? <BellRing size={13} /> : <Bell size={13} />}
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                )}
              </div>
              <StatusBadge status={status} />
            </div>
            {subError && <p className="text-signal text-xs mb-2">{subError}</p>}

            <h1 className="font-display text-2xl sm:text-3xl mb-3">{event.title}</h1>

            {event.description && <p className="text-muted mb-4">{event.description}</p>}

            {event.highlights?.length > 0 && (
              <ul className="text-sm space-y-1 mb-4 list-disc list-inside text-ink/90">
                {event.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            )}
            {event.prizes && (
              <p className="text-sm font-semibold mb-4">🏆 {event.prizes}</p>
            )}

            <div className="flex items-center gap-4 mb-5">
              <button onClick={handleLikeClick} className="flex items-center gap-1.5 text-sm">
                <Heart size={18} className={liked ? 'fill-signal text-signal' : 'text-muted'} />
              </button>
              <button onClick={handleShareClick} className="text-sm text-muted underline">Share</button>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm border-t border-line pt-5">
              <div>
                <dt className="text-muted mb-0.5">Date</dt>
                <dd className="font-semibold">{isNaN(eventDate) ? '—' : format(eventDate, 'EEE, d MMM · h:mm a')}</dd>
              </div>
              <div>
                <dt className="text-muted mb-0.5">Venue</dt>
                <dd className="font-semibold">{event.venue}</dd>
              </div>
              <div>
                <dt className="text-muted mb-0.5">Team size</dt>
                <dd className="font-semibold">{isTeamEvent ? `${event.teamSize} members` : 'Solo'}</dd>
              </div>
              <div>
                <dt className="text-muted mb-0.5">Entry fee</dt>
                <dd className="font-semibold">{event.price > 0 ? `₹${event.price}` : 'Free'}</dd>
              </div>
              <div>
                <dt className="text-muted mb-0.5">Eligibility</dt>
                <dd className="font-semibold">{event.eligibility || 'Open to all'}</dd>
              </div>
              <div>
                <dt className="text-muted mb-0.5">Registration closes</dt>
                <dd className="font-semibold">{isNaN(deadline) ? '—' : format(deadline, 'd MMM, h:mm a')}</dd>
              </div>
            </dl>

            {!registration && <RegistrationCountdown deadline={deadline} />}

            <div className="mt-6 pt-5 border-t border-line">
              {regError && <p className="text-signal text-xs text-center mb-2">{regError}</p>}

              {registration ? (
                <>
                  <button className="btn-primary w-full opacity-90" disabled>
                    ✓ Registered{registration.isTeam && registration.teamName ? ` — Team "${registration.teamName}"` : ''}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={registering}
                    className="text-xs text-muted underline w-full text-center mt-2"
                  >
                    {registering ? 'Cancelling…' : 'Cancel registration'}
                  </button>
                </>
              ) : isTeamEvent ? (
                canRegister ? (
                  <form onSubmit={handleTeamRegister} className="space-y-3">
                    <p className="text-sm font-semibold">Register your team ({event.teamSize} members)</p>
                    <input
                      className="input-field"
                      placeholder="Team name"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                    {members.map((m, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <input
                          className="input-field"
                          placeholder={i === 0 ? 'Your name' : `Member ${i + 1} name`}
                          value={m.name}
                          onChange={(e) => updateMember(i, 'name', e.target.value)}
                        />
                        <input
                          className="input-field"
                          placeholder="Roll number"
                          value={m.rollNo}
                          onChange={(e) => updateMember(i, 'rollNo', e.target.value)}
                        />
                      </div>
                    ))}
                    <button className="btn-primary w-full" disabled={registering}>
                      {registering ? 'Registering…' : 'Register team'}
                    </button>
                  </form>
                ) : (
                  <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
                    Registration closed
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={handleRegisterClick}
                    disabled={!canRegister || registering}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!canRegister ? 'Registration closed' : registering ? 'Registering…' : 'Register'}
                  </button>
                  <p className="text-xs text-muted text-center mt-2">
                    Doubts? {event.contactPersonName || 'the club'} will be reachable here once doubt resolution ships.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
