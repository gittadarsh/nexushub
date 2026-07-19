import { useEffect, useRef, useState } from 'react';
import { X, Send, Flag, ShieldOff } from 'lucide-react';
import { getOrCreateThread, sendMessage, listenToMessages, reportUser, blockUser, markThreadRead } from '../services/teamChat';

/**
 * Generic 1:1 chat modal — used for both team-finder messaging and doubt
 * resolution. `threadCollection` and `reportContext` let the two features
 * share this component while keeping their threads in separate Firestore
 * collections (and separate security rules).
 */
export default function TeamChatModal({
  eventId, myUid, myName, otherUid, otherName, onClose, onBlocked,
  threadCollection = 'teamFinderThreads', reportContext = 'team_finder',
  showBlock = true
}) {
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    let unsub;
    (async () => {
      const id = await getOrCreateThread(eventId, myUid, otherUid, myName, otherName, threadCollection);
      setThreadId(id);
      markThreadRead(id, myUid, threadCollection);
      unsub = listenToMessages(id, setMessages, threadCollection);
    })();
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !threadId) return;
    const toSend = text.trim();
    setText('');
    await sendMessage(threadId, myUid, toSend, threadCollection);
  }

  async function handleReport() {
    await reportUser(myUid, otherUid, eventId, `Reported from ${reportContext}`, reportContext);
    setShowReportConfirm(false);
    setActionMessage('Reported. Thanks for flagging this — our team will review it.');
  }

  async function handleBlock() {
    await blockUser(myUid, otherUid);
    setActionMessage(`Blocked ${otherName}.`);
    setTimeout(() => {
      onBlocked?.(otherUid);
      onClose();
    }, 900);
  }

  return (
    <div className="fixed inset-0 bg-ink/50 grid place-items-end sm:place-items-center p-0 sm:p-6 z-50">
      <div className="card w-full sm:max-w-sm h-[85vh] sm:h-[85vh] max-h-[600px] flex flex-col rounded-b-none sm:rounded-card">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <p className="font-semibold">{otherName}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowReportConfirm(true)} title="Report" className="p-2 text-muted hover:text-signal transition">
              <Flag size={16} />
            </button>
            {showBlock && (
              <button onClick={handleBlock} title="Block" className="p-2 text-muted hover:text-signal transition">
                <ShieldOff size={16} />
              </button>
            )}
            <button onClick={onClose} title="Close" className="p-2 text-muted hover:text-ink transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {actionMessage && (
          <p className="text-xs text-center text-muted px-4 pt-2">{actionMessage}</p>
        )}

        {showReportConfirm && (
          <div className="mx-4 mt-2 p-3 rounded-card bg-signal/10 text-sm">
            <p className="mb-2">Report {otherName} for inappropriate behavior?</p>
            <div className="flex gap-2">
              <button onClick={handleReport} className="btn-primary text-xs px-3 py-1.5">Report</button>
              <button onClick={() => setShowReportConfirm(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <p className="text-muted text-sm text-center mt-8">
              {reportContext === 'doubt_resolution'
                ? `Ask ${otherName} your question — they'll see it here.`
                : "Say hi — you're both looking to team up for this event."}
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderUid === myUid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-card text-sm ${
                m.senderUid === myUid ? 'bg-ink text-paper' : 'bg-line text-ink'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-line flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary px-3" disabled={!text.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
