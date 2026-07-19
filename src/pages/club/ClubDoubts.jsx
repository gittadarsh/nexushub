import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Circle } from 'lucide-react';
import { listMyDoubtThreads } from '../../services/clubDoubts';
import { getEvent } from '../../services/events';
import { useAuth } from '../../contexts/AuthContext';
import TeamChatModal from '../../components/TeamChatModal';

export default function ClubDoubts() {
  const { firebaseUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState(null);

  async function load() {
    setLoading(true);
    const raw = await listMyDoubtThreads(firebaseUser.uid);
    const withEvents = await Promise.all(raw.map(async (t) => {
      const event = await getEvent(t.eventId);
      const studentUid = t.participantUids.find((uid) => uid !== firebaseUser.uid);
      return {
        ...t,
        eventTitle: event?.title || 'Unknown event',
        studentUid,
        studentName: t.participantNames?.[studentUid] || 'A student',
        // Real, persisted unread state — see readUids in teamChat.js.
        unread: !!t.lastMessageAt && !(t.readUids || []).includes(firebaseUser.uid)
      };
    }));
    // Most recently active conversations first.
    withEvents.sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
    setThreads(withEvents);
    setLoading(false);
  }

  useEffect(() => {
    if (firebaseUser) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  function handleOpen(t) {
    setOpenThread(t);
    // Optimistically clear the unread dot for this thread locally —
    // the real "read" state is just "did I open it," no server tracking.
    setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-2">Doubts</p>
      <h1 className="font-display text-3xl mb-1">Student questions</h1>
      <p className="text-muted mb-8">Every event you're listed as the contact for shows up here.</p>

      <Link to="/club/dashboard" className="text-sm text-muted underline mb-6 inline-block">← Back to dashboard</Link>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : threads.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted">No questions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => handleOpen(t)}
              className="card p-4 w-full text-left flex items-center justify-between gap-3 hover:border-ink transition"
            >
              <div className="flex items-center gap-2">
                {t.unread && <Circle size={8} className="fill-signal text-signal shrink-0" />}
                <div>
                    <p className={`text-sm ${t.unread ? 'font-bold' : 'font-semibold'}`}>{t.studentName}</p>
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

      {openThread && (
        <TeamChatModal
          eventId={openThread.eventId}
          myUid={firebaseUser.uid}
          myName="Club team"
          otherUid={openThread.studentUid}
          otherName={openThread.studentName}
          onClose={() => { setOpenThread(null); load(); }}
          threadCollection="doubtThreads"
          reportContext="doubt_resolution"
          showBlock={false}
        />
      )}
    </div>
  );
}
