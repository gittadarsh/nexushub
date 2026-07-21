import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Circle } from 'lucide-react';
import { listenToMyDoubtThreads } from '../../services/clubDoubts';
import { getEvent } from '../../services/events';
import { getClub } from '../../services/clubs';
import { useAuth } from '../../contexts/AuthContext';
import StudentNav from '../../components/StudentNav';
import TeamChatModal from '../../components/TeamChatModal';

/**
 * Student-side mirror of ClubDoubts.jsx. listMyDoubtThreads is generic by
 * participant uid (doesn't care whether that participant is a student or
 * a club contact), so the same query works here unchanged — only the
 * "who's the other person" framing flips.
 */
export default function MyDoubts() {
  const { firebaseUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState(null);

  async function enrichAndSet(raw) {
    const withDetails = await Promise.all(raw.map(async (t) => {
      const event = await getEvent(t.eventId);
      const club = event ? await getClub(event.clubId) : null;
      const contactUid = t.participantUids.find((uid) => uid !== firebaseUser.uid);
      return {
        ...t,
        eventTitle: event?.title || 'Unknown event',
        contactUid,
        contactName: t.participantNames?.[contactUid] || 'Club contact',
        clubName: club?.name || 'Unknown club',
        // Real, persisted unread state — true unless I've marked this
        // thread read since the last message (see readUids in teamChat.js).
        unread: !!t.lastMessageAt && !(t.readUids || []).includes(firebaseUser.uid)
      };
    }));
    withDetails.sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
    setThreads(withDetails);
    setLoading(false);
  }

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = listenToMyDoubtThreads(firebaseUser.uid, enrichAndSet);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  function handleOpen(t) {
    setOpenThread(t);
    setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
  }

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-2">Doubts</p>
        <h1 className="font-display text-3xl mb-1">My questions</h1>
        <p className="text-muted mb-8">Every doubt you've asked across all events shows up here.</p>

        <Link to="/" className="text-sm text-muted underline mb-6 inline-block">← Back to Home</Link>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : threads.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-muted">You haven't asked anything yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => handleOpen(t)}
                className="card p-4 w-full text-left flex items-center justify-between gap-3 hover:border-ink transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {t.unread && <Circle size={8} className="fill-signal text-signal shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-sm ${t.unread ? 'font-bold' : 'font-semibold'}`}>
                      {t.contactName} <span className="text-muted font-normal">({t.clubName})</span>
                    </p>
                    <p className="text-xs text-muted mb-0.5">{t.eventTitle}</p>
                    {t.lastMessageText && (
                      <p className={`text-xs truncate ${t.unread ? 'text-ink font-semibold' : 'text-muted'}`}>
                        {t.lastMessageText}
                      </p>
                    )}
                  </div>
                </div>
                <MessageCircle size={18} className="text-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {openThread && (
        <TeamChatModal
          eventId={openThread.eventId}
          myUid={firebaseUser.uid}
          myName="You"
          otherUid={openThread.contactUid}
          otherName={openThread.contactName}
          onClose={() => setOpenThread(null)}
          threadCollection="doubtThreads"
          reportContext="doubt_resolution"
          showBlock={false}
        />
      )}
    </div>
  );
}
