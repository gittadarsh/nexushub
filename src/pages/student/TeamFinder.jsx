import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Users, MessageCircle, Lock, UserPlus, Check, X, Clock, Users2 } from 'lucide-react';
import { getEvent } from '../../services/events';
import { getMyRegistration } from '../../services/registrations';
import { upsertMyPost, getMyPost, listPostsForEvent, withdrawMyPost } from '../../services/teamFinder';
import { sendRequest, withdrawRequest, respondToRequest, listMyRequestsForEvent } from '../../services/teamFinderRequests';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import StudentNav from '../../components/StudentNav';
import TeamChatModal from '../../components/TeamChatModal';

const TYPE_LABEL = {
  need_teammates: 'Needs teammates',
  looking_to_join: 'Looking to join'
};

export default function TeamFinder() {
  const { eventId } = useParams();
  const { firebaseUser } = useAuth();
  const { studentProfile } = useStudentProfile();

  const [event, setEvent] = useState(null);
  const [isRegistered, setIsRegistered] = useState(null); // null = still checking
  const [myPost, setMyPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formType, setFormType] = useState('need_teammates');
  const [formMessage, setFormMessage] = useState('');
  const [posting, setPosting] = useState(false);

  const [chatWith, setChatWith] = useState(null); // { uid, name }
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  async function load() {
    setLoadError('');
    try {
      const evt = await getEvent(eventId);
      setEvent(evt);
      if (!firebaseUser || !evt) return;

      const reg = await getMyRegistration(firebaseUser.uid, eventId);
      setIsRegistered(!!reg);
      if (!reg) return;

      const mine = await getMyPost(eventId, firebaseUser.uid);
      // A withdrawn post is still the same Firestore doc (reused on the
      // next repost) — but for every gating/display purpose here, it must
      // be treated as "no active post." Without this check, reloading
      // right after withdraw re-fetches the same doc and silently
      // restores messaging access.
      const activeMine = mine && mine.status === 'open' ? mine : null;
      setMyPost(activeMine);
      if (activeMine) {
        setFormType(activeMine.type);
        setFormMessage(activeMine.message);
      } else {
        setFormType('need_teammates');
        setFormMessage('');
      }

      const all = await listPostsForEvent(eventId);
      const blocked = studentProfile?.blockedUids || [];
      setPosts(all.filter((p) => p.studentUid !== firebaseUser.uid && !blocked.includes(p.studentUid)));

      const { outgoing, incoming } = await listMyRequestsForEvent(eventId, firebaseUser.uid);
      setOutgoingRequests(outgoing);
      setIncomingRequests(incoming.filter((r) => r.status === 'pending' && !blocked.includes(r.fromUid)));
    } catch (err) {
      setLoadError("Couldn't load team-finder — try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, firebaseUser]);

  async function handlePost(e) {
    e.preventDefault();
    setPosting(true);
    setLoadError('');
    try {
      await upsertMyPost(eventId, firebaseUser.uid, studentProfile?.name || 'A student', formType, formMessage);
      await load();
    } catch (err) {
      setLoadError("Couldn't save your card — try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleWithdraw() {
    if (!myPost) return;
    setLoadError('');
    try {
      await withdrawMyPost(myPost.id);
      setMyPost(null);
      await load();
    } catch (err) {
      setLoadError("Couldn't withdraw your card — try again.");
    }
  }

  function outgoingRequestFor(uid) {
    const mine = outgoingRequests.filter((r) => r.toUid === uid);
    if (mine.some((r) => r.status === 'accepted')) return { status: 'accepted' };
    const pending = mine.find((r) => r.status === 'pending');
    return pending ? { status: 'pending', id: pending.id } : null;
  }

  async function handleSendRequest(otherUid, otherName) {
    setLoadError('');
    try {
      await sendRequest(eventId, firebaseUser.uid, studentProfile?.name || 'A student', otherUid, otherName);
      await load();
    } catch (err) {
      setLoadError("Couldn't send request — try again.");
    }
  }

  async function handleCancelRequest(requestId) {
    setLoadError('');
    try {
      await withdrawRequest(requestId);
      await load();
    } catch (err) {
      setLoadError("Couldn't cancel request — try again.");
    }
  }

  async function handleRespond(requestId, decision) {
    setLoadError('');
    try {
      await respondToRequest(requestId, decision);
      await load();
    } catch (err) {
      setLoadError("Couldn't respond — try again.");
    }
  }

  function handleBlocked(uid) {
    setPosts((prev) => prev.filter((p) => p.studentUid !== uid));
  }

  if (loading || isRegistered === null) {
    return (
      <div className="min-h-screen bg-paper">
        <StudentNav />
        <p className="text-muted text-center mt-12">Loading…</p>
      </div>
    );
  }

  if (!event || event.teamSize <= 1) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-paper">
        <StudentNav />
        <div className="max-w-lg mx-auto p-6 text-center mt-12">
          <p className="text-muted mb-3">Register for this event first — team-finder is only for registered students.</p>
          <Link to={`/events/${eventId}`} className="text-ink underline font-semibold">Go to event →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Link to={`/events/${eventId}`} className="text-sm text-muted underline mb-4 inline-block">← Back to event</Link>

        <div className="flex items-center gap-2 mb-1">
          <Users size={20} />
          <h1 className="font-display text-2xl sm:text-3xl">Find a team</h1>
        </div>
        <p className="text-muted mb-6">For "{event.title}" — needs {event.teamSize} members.</p>
        {loadError && <p className="text-signal text-sm mb-4">{loadError}</p>}

        {/* My card */}
        <div className="card p-5 mb-6">
          <p className="font-semibold text-sm mb-3">{myPost ? 'Your card' : 'Post your card'}</p>
          <form onSubmit={handlePost} className="space-y-3">
            <div className="flex gap-2">
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFormType(value)}
                  className={`flex-1 px-3 py-2 rounded-card text-sm font-semibold transition ${
                    formType === value ? 'bg-ink text-paper' : 'bg-line text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Optional — e.g. 'good with design, need someone who can code'"
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-primary" disabled={posting}>
                {posting ? 'Saving…' : myPost ? 'Update card' : 'Post card'}
              </button>
              {myPost && (
                <button type="button" onClick={handleWithdraw} className="btn-secondary text-sm">
                  Withdraw
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Incoming requests — need your response */}
        {incomingRequests.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
              Requests to team up ({incomingRequests.length})
            </p>
            <div className="space-y-2">
              {incomingRequests.map((r) => (
                <div key={r.id} className="card p-4 flex items-center justify-between gap-3">
                  <p className="font-semibold text-sm">{r.fromName}</p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRespond(r.id, 'accepted')}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      onClick={() => handleRespond(r.id, 'declined')}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <X size={13} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Others' cards */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Other students ({posts.length})
        </p>

        {posts.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-muted text-sm">No one else has posted yet — check back soon, or share this event.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => {
              const req = myPost ? outgoingRequestFor(p.studentUid) : null;
              return (
                <div key={p.id} className="card p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{p.studentName}</p>
                    <span className="text-xs font-semibold text-muted">{TYPE_LABEL[p.type]}</span>
                    {p.message && <p className="text-sm text-muted mt-1">{p.message}</p>}
                  </div>
                  {myPost ? (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={() => setChatWith({ uid: p.studentUid, name: p.studentName })}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Message
                      </button>
                      {req?.status === 'accepted' ? (
                        <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                          <Users2 size={13} /> Matched
                        </span>
                      ) : req?.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-xs text-muted underline flex items-center gap-1"
                        >
                          <Clock size={12} /> Requested — cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(p.studentUid, p.studentName)}
                          className="text-xs font-semibold text-ink underline flex items-center gap-1"
                        >
                          <UserPlus size={13} /> Send request
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted flex items-center gap-1 shrink-0" title="Post your own card to unlock messaging">
                      <Lock size={12} /> Post your card first
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {chatWith && (
        <TeamChatModal
          eventId={eventId}
          myUid={firebaseUser.uid}
          myName={studentProfile?.name || 'A student'}
          otherUid={chatWith.uid}
          otherName={chatWith.name}
          onClose={() => setChatWith(null)}
          onBlocked={handleBlocked}
        />
      )}
    </div>
  );
}
