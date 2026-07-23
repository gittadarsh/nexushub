import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, BellRing, Heart, Users, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getEvent, computeEventStatus } from '../../services/events';
import { getClub } from '../../services/clubs';
import {
  getStudentRegistration, registerForEvent, registerTeamForEvent,
  cancelRegistration, submitPaymentProof, confirmWhatsappJoin
} from '../../services/registrations';
import { buildWhatsAppShareLink } from '../../services/likes';
import { uploadPosterToCloudinary } from '../../services/cloudinary';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { useAuth } from '../../contexts/AuthContext';
import StudentNav from '../../components/StudentNav';
import StatusBadge from '../../components/StatusBadge';
import RegistrationCountdown from '../../components/RegistrationCountdown';
import ProfileCompletionGate from '../../components/ProfileCompletionGate';
import TeamChatModal from '../../components/TeamChatModal';

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
  const [showDoubtChat, setShowDoubtChat] = useState(false);

  const [teamChoice, setTeamChoice] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState([]);

  // Payment proof form state
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState('');

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
      }
      setLoading(false);
    }
    load();
  }, [eventId, firebaseUser]);

  async function handleSubscribeClick() {
    setSubError('');
    try { await toggleSubscribe(club.id); } catch (err) { setSubError("Couldn't update — try again."); }
  }

  async function handleLikeClick() {
    try { await toggleLike(eventId); } catch (err) { /* soft action, fail silently */ }
  }

  function handleShareClick() {
    window.open(buildWhatsAppShareLink(event), '_blank');
  }

  function handleRegisterClick() {
    setRegError('');
    if (!studentProfile?.profileComplete) { setShowProfileGate(true); return; }
    doSoloRegister();
  }

  async function doSoloRegister() {
    setRegistering(true);
    setRegError('');
    try {
      const isPaid = event.price > 0;
      const regId = await registerForEvent({
        eventId,
        studentUid: firebaseUser.uid,
        clubId: event.clubId,
        studentName: studentProfile?.name || firebaseUser.displayName || 'Unnamed',
        rollNo: studentProfile?.rollNo || '',
        isPaid
      });
      setRegistration({ id: regId, status: 'registered', paymentStatus: isPaid ? 'pending_proof' : 'not_required' });
      setEvent((prev) => ({ ...prev, registeredCount: (prev.registeredCount || 0) + 1 }));
    } catch (err) {
      setRegError("Couldn't register — try again.");
    } finally {
      setRegistering(false);
    }
  }

  function handleChooseFullTeam() {
    setMembers((prev) => {
      if (prev.length === event.teamSize) return prev;
      const blankSlots = Array.from({ length: event.teamSize - 1 }, () => ({ name: '', rollNo: '' }));
      return [{ name: firebaseUser?.displayName || '', rollNo: '' }, ...blankSlots];
    });
    setTeamChoice('full');
  }

  function updateMember(index, field, value) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleTeamRegister(e) {
    e.preventDefault();
    setRegError('');
    if (!teamName.trim()) { setRegError('Give your team a name.'); return; }
    if (members.some((m) => !m.name.trim() || !m.rollNo.trim())) {
      setRegError('Fill in name and roll number for every teammate.');
      return;
    }
    setRegistering(true);
    try {
      const isPaid = event.price > 0;
      const regId = await registerTeamForEvent({
        eventId,
        studentUid: firebaseUser.uid,
        clubId: event.clubId,
        teamName: teamName.trim(),
        members: members.map((m) => ({ name: m.name.trim(), rollNo: m.rollNo.trim() })),
        isPaid
      });
      setRegistration({
        id: regId, status: 'registered', isTeam: true, teamName,
        paymentStatus: isPaid ? 'pending_proof' : 'not_required'
      });
      setEvent((prev) => ({ ...prev, registeredCount: (prev.registeredCount || 0) + 1 }));
    } catch (err) {
      setRegError("Couldn't register — try again.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleConfirmWhatsappJoin() {
    try {
      await confirmWhatsappJoin(registration.id);
      setRegistration((prev) => ({ ...prev, whatsappJoinConfirmed: true }));
    } catch (err) { /* soft action, fail silently */ }
  }

  async function handleCancelClick() {
    setRegError('');
    setRegistering(true);
    try {
      await cancelRegistration(registration.id, eventId);
      setRegistration(null);
      setTeamChoice(null);
      setEvent((prev) => ({ ...prev, registeredCount: Math.max((prev.registeredCount || 1) - 1, 0) }));
    } catch (err) {
      setRegError("Couldn't cancel — try again.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleSubmitProof(e) {
    e.preventDefault();
    setProofError('');
    if (!transactionId.trim()) {
      setProofError('Transaction ID is required.');
      return;
    }
    setSubmittingProof(true);
    try {
      const screenshotUrl = screenshotFile ? await uploadPosterToCloudinary(screenshotFile) : null;
      await submitPaymentProof(registration.id, { transactionId: transactionId.trim(), screenshotUrl });
      setRegistration((prev) => ({ ...prev, transactionId: transactionId.trim(), screenshotUrl, paymentStatus: 'pending_review' }));
    } catch (err) {
      setProofError("Couldn't submit — try again.");
    } finally {
      setSubmittingProof(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-paper"><StudentNav /><p className="text-muted text-center mt-12">Loading…</p></div>;
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
  const deadline = event.registrationDeadline?.toDate ? event.registrationDeadline.toDate() : new Date(event.registrationDeadline);
  const subscribed = club ? isSubscribed(club.id) : false;
  const liked = isLiked(eventId);
  const isTeamEvent = event.teamSize > 1;
  const isPaidEvent = event.price > 0;
  const canRegister = status === 'open' || status === 'few_seats';

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      {showProfileGate && (
        <ProfileCompletionGate
          uid={firebaseUser.uid}
          onComplete={async () => { setShowProfileGate(false); await refresh(); doSoloRegister(); }}
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
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${subscribed ? 'bg-line text-ink' : 'bg-ink text-paper hover:opacity-90'}`}
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
            {event.prizes && <p className="text-sm font-semibold mb-4">🏆 {event.prizes}</p>}

            <div className="flex items-center gap-4 mb-5">
              <button onClick={handleLikeClick} className="flex items-center gap-1.5 text-sm">
                <Heart size={18} className={liked ? 'fill-signal text-signal' : 'text-muted'} />
              </button>
              <button onClick={handleShareClick} className="text-sm text-muted underline">Share</button>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm border-t border-line pt-5">
              <div><dt className="text-muted mb-0.5">Date</dt><dd className="font-semibold">{isNaN(eventDate) ? '—' : format(eventDate, 'EEE, d MMM · h:mm a')}</dd></div>
              <div><dt className="text-muted mb-0.5">Venue</dt><dd className="font-semibold">{event.venue}</dd></div>
              <div><dt className="text-muted mb-0.5">Team size</dt><dd className="font-semibold">{isTeamEvent ? `${event.teamSize} members` : 'Solo'}</dd></div>
              <div><dt className="text-muted mb-0.5">Entry fee</dt><dd className="font-semibold">{event.price > 0 ? `₹${event.price}` : 'Free'}</dd></div>
              <div><dt className="text-muted mb-0.5">Eligibility</dt><dd className="font-semibold">{event.eligibility || 'Open to all'}</dd></div>
              <div><dt className="text-muted mb-0.5">Registration closes</dt><dd className="font-semibold">{isNaN(deadline) ? '—' : format(deadline, 'd MMM, h:mm a')}</dd></div>
            </dl>

            {!registration && <RegistrationCountdown deadline={deadline} />}

            <div className="mt-6 pt-5 border-t border-line">
              {regError && <p className="text-signal text-xs text-center mb-2">{regError}</p>}

              {registration ? (
                <>
                  <button className="btn-primary w-full opacity-90" disabled>
                    ✓ Registered{registration.isTeam && registration.teamName ? ` — Team "${registration.teamName}"` : ''}
                  </button>
                  {registration.editedAt?.toDate && (
                    <p className="text-xs text-muted text-center mt-1.5">
                      The club last updated your registration details on {format(registration.editedAt.toDate(), 'd MMM')}.
                    </p>
                  )}

                  {/* ── Payment status flow — only for paid events ── */}
                  {isPaidEvent && registration.paymentStatus === 'pending_proof' && (
                    <form onSubmit={handleSubmitProof} className="mt-4 p-4 rounded-card bg-line/40 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-1.5"><Clock size={15} /> Payment needed</p>
                      {event.upiLink && (
                        <a href={event.upiLink} target="_blank" rel="noreferrer" className="btn-secondary w-full block text-center">
                          Pay ₹{event.price}
                        </a>
                      )}
                      <input className="input-field" placeholder="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                      <input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files[0])} className="text-xs" />
                      {proofError && <p className="text-signal text-xs">{proofError}</p>}
                      <button className="btn-primary w-full" disabled={submittingProof}>
                        {submittingProof ? 'Submitting…' : 'Submit payment proof'}
                      </button>
                    </form>
                  )}

                  {isPaidEvent && registration.paymentStatus === 'pending_review' && (
                    <div className="mt-4 p-4 rounded-card bg-line/40 text-sm flex items-center gap-2">
                      <Clock size={15} /> Waiting for {club?.name || 'the club'} to confirm your payment.
                    </div>
                  )}

                  {isPaidEvent && registration.paymentStatus === 'rejected' && (
                    <form onSubmit={handleSubmitProof} className="mt-4 p-4 rounded-card bg-signal/10 space-y-3">
                      <p className="text-sm font-semibold text-signal flex items-center gap-1.5">
                        <XCircle size={15} /> Payment couldn't be verified — resubmit
                      </p>
                      <input className="input-field" placeholder="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                      <input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files[0])} className="text-xs" />
                      {proofError && <p className="text-signal text-xs">{proofError}</p>}
                      <button className="btn-primary w-full" disabled={submittingProof}>
                        {submittingProof ? 'Submitting…' : 'Resubmit proof'}
                      </button>
                    </form>
                  )}

                {isPaidEvent && registration.paymentStatus === 'approved' && event.whatsappGroupLink && (
                    registration.whatsappJoinConfirmed ? (
                      <div className="mt-4 p-4 rounded-card bg-green-100 text-green-800 text-sm flex items-center gap-2 justify-center font-semibold">
                        <CheckCircle2 size={16} /> You've joined the WhatsApp group
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        <a href={event.whatsappGroupLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-4 rounded-card bg-green-100 text-green-800 text-sm flex items-center gap-2 justify-center font-semibold"
                        >
                          <CheckCircle2 size={16} /> Payment confirmed — join the WhatsApp group
                        </a>
                        <button
                          onClick={handleConfirmWhatsappJoin}
                          className="text-xs text-muted underline w-full text-center"
                        >
                          Already joined? Confirm
                        </button>
                      </div>
                    )
                  )}

                  {isTeamEvent && (
                    <Link to={`/events/${eventId}/team-finder`} className="btn-secondary w-full mt-2 flex items-center justify-center gap-1.5 text-sm">
                      <Users size={14} /> Find a team
                    </Link>
                  )}
                  <button onClick={handleCancelClick} disabled={registering} className="text-xs text-muted underline w-full text-center mt-2">
                    {registering ? 'Cancelling…' : 'Cancel registration'}
                  </button>
                </>
              ) : isTeamEvent ? (
                !canRegister ? (
                  <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">Registration closed</button>
                ) : teamChoice === null ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold mb-1">This event needs a team of {event.teamSize}.</p>
                    <button onClick={handleChooseFullTeam} className="btn-primary w-full">
                      I have my full team — register everyone
                    </button>
                    <button onClick={handleRegisterClick} disabled={registering} className="btn-secondary w-full flex items-center justify-center gap-1.5">
                      <Users size={14} /> I don't have a team yet — find teammates
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTeamRegister} className="space-y-3">
                    <button type="button" onClick={() => setTeamChoice(null)} className="text-xs text-muted underline mb-1">← Back</button>
                    <p className="text-sm font-semibold">Register your team ({event.teamSize} members)</p>
                    <input className="input-field" placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                    {members.map((m, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <input className="input-field" placeholder={i === 0 ? 'Your name' : `Member ${i + 1} name`} value={m.name} onChange={(e) => updateMember(i, 'name', e.target.value)} />
                        <input className="input-field" placeholder="Roll number" value={m.rollNo} onChange={(e) => updateMember(i, 'rollNo', e.target.value)} />
                      </div>
                    ))}
                    <button className="btn-primary w-full" disabled={registering}>{registering ? 'Registering…' : 'Register team'}</button>
                  </form>
                )
              ) : (
                <button onClick={handleRegisterClick} disabled={!canRegister || registering} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  {!canRegister ? 'Registration closed' : registering ? 'Registering…' : 'Register'}
                </button>
              )}

              {event.contactPersonUid && (
                <button
                  onClick={() => setShowDoubtChat(true)}
                  className="text-xs text-muted underline w-full text-center mt-2"
                >
                  Have a doubt? Ask {event.contactPersonName || 'the club'}
                </button>
              )}
            </div>
          </div>
        </div>
        {showDoubtChat && event.contactPersonUid && (
        <TeamChatModal
          eventId={eventId}
          myUid={firebaseUser.uid}
          myName={studentProfile?.name || firebaseUser.displayName || 'Student'}
          otherUid={event.contactPersonUid}
          otherName={event.contactPersonName || 'Club contact'}
          onClose={() => setShowDoubtChat(false)}
          threadCollection="doubtThreads"
          reportContext="doubt_resolution"
          showBlock={false}
        />
      )}
      </div>
    </div>
  );
}