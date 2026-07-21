import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { X, Send, Flag, ShieldOff, Pencil, Trash2, Check } from 'lucide-react';
import { getOrCreateThread, sendMessage, listenToMessages, editMessage, deleteMessage, reportUser, blockUser, markThreadRead } from '../services/teamChat';

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
  const [reportTarget, setReportTarget] = useState(null); // 'user' | { id, text } | null
  const [actionMessage, setActionMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
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
    const snapshot = typeof reportTarget === 'object' && reportTarget ? reportTarget.text : null;
    await reportUser(myUid, otherUid, eventId, `Reported from ${reportContext}`, reportContext, snapshot);
    setReportTarget(null);
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

  function messageTime(m) {
    // serverTimestamp() is null for a split second on the sender's own
    // just-sent message (local echo, before the server assigns a value) —
    // fall back to blank rather than crashing on a null createdAt.
    if (!m.createdAt?.toDate) return '';
    return format(m.createdAt.toDate(), 'h:mm a');
  }

  function withinEditWindow(m) {
    if (!m.createdAt?.toDate) return false;
    return Date.now() - m.createdAt.toDate().getTime() < 15 * 60 * 1000;
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditText(m.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    await editMessage(threadId, editingId, editText, threadCollection);
    setEditingId(null);
    setEditText('');
  }

  async function handleDelete(messageId) {
    await deleteMessage(threadId, messageId, threadCollection);
  }

  return (
    <div className="fixed inset-0 bg-ink/50 grid place-items-end sm:place-items-center p-0 sm:p-6 z-50">
      <div className="card w-full sm:max-w-sm h-[85vh] sm:h-[85vh] max-h-[600px] flex flex-col rounded-b-none sm:rounded-card">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <p className="font-semibold">{otherName}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setReportTarget('user')} title="Report" className="p-2 text-muted hover:text-signal transition">
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

        {reportTarget && (
          <div className="mx-4 mt-2 p-3 rounded-card bg-signal/10 text-sm">
            <p className="mb-2">
              {typeof reportTarget === 'object'
                ? `Report this message from ${otherName}?`
                : `Report ${otherName} for inappropriate behavior?`}
            </p>
            {typeof reportTarget === 'object' && (
              <p className="text-xs text-muted italic mb-2 line-clamp-2">"{reportTarget.text}"</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleReport} className="btn-primary text-xs px-3 py-1.5">Report</button>
              <button onClick={() => setReportTarget(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
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
          {messages.map((m) => {
            const isMine = m.senderUid === myUid;
            const isEditing = editingId === m.id;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {isEditing ? (
                  <div className="max-w-[85%] w-full flex gap-1.5">
                    <input
                      autoFocus
                      className="input-field flex-1 text-sm py-1.5"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    />
                    <button onClick={saveEdit} className="p-1.5 text-muted hover:text-ink" title="Save"><Check size={16} /></button>
                    <button onClick={cancelEdit} className="p-1.5 text-muted hover:text-signal" title="Cancel"><X size={16} /></button>
                  </div>
                ) : (
                  <div className={`max-w-[75%] px-3 py-2 rounded-card text-sm ${
                    isMine ? 'bg-ink text-paper' : 'bg-line text-ink'
                  }`}>
                    {m.text}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5 px-1">
                  <span className="text-[10px] text-muted">
                    {messageTime(m)}{m.editedAt && ' · edited'}
                  </span>
                  {!isEditing && isMine && withinEditWindow(m) && (
                    <>
                      <button onClick={() => startEdit(m)} className="text-muted hover:text-ink" title="Edit">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="text-muted hover:text-signal" title="Delete for everyone">
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                  {!isMine && (
                    <button onClick={() => setReportTarget({ id: m.id, text: m.text })} className="text-muted hover:text-signal" title="Report this message">
                      <Flag size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
