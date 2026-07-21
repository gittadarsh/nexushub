import {
  collection, addDoc, doc, setDoc, getDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Generalized 1:1 thread service, shared by team-finder chat and doubt
 * resolution. The thread doc tracks lastMessageAt/lastMessageSenderUid/
 * lastMessageText for list previews, and readUids for a REAL persisted
 * read state (not just "did I open it this session"): sendMessage resets
 * readUids to just the sender, and markThreadRead adds a participant back
 * in when they actually open the chat. Unread = my uid isn't in readUids.
 */

function threadId(eventId, uidA, uidB) {
  const [a, b] = [uidA, uidB].sort();
  return `${eventId}__${a}__${b}`;
}
export { threadId as computeThreadId };

export async function getOrCreateThread(eventId, myUid, otherUid, myName, otherName, collectionName = 'teamFinderThreads') {
  const id = threadId(eventId, myUid, otherUid);
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      eventId,
      participantUids: [myUid, otherUid],
      participantNames: { [myUid]: myName, [otherUid]: otherName },
      createdAt: serverTimestamp(),
      lastMessageAt: null,
      lastMessageSenderUid: null,
      lastMessageText: null,
      readUids: []
    });
  }
  return id;
}

/** Fetches an existing thread doc (no create) — used for unread checks. */
export async function getThread(eventId, uidA, uidB, collectionName = 'teamFinderThreads') {
  const id = threadId(eventId, uidA, uidB);
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function sendMessage(threadId, senderUid, text, collectionName = 'teamFinderThreads') {
  const trimmed = text.trim();
  await addDoc(collection(db, collectionName, threadId, 'messages'), {
    senderUid,
    text: trimmed,
    createdAt: serverTimestamp()
  });
  // Stamp the parent thread so lists can show "has this actually been
  // used?", a WhatsApp-style preview snippet, and a real unread state —
  // readUids resets to just the sender, so the other participant reads
  // as unread until they actually open the thread.
  await updateDoc(doc(db, collectionName, threadId), {
    lastMessageAt: serverTimestamp(),
    lastMessageSenderUid: senderUid,
    lastMessageText: trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed,
    readUids: [senderUid]
  });
}

/** Call when a participant actually opens a thread — the persisted "I've seen this" mark. */
export async function markThreadRead(threadId, myUid, collectionName = 'teamFinderThreads') {
  await updateDoc(doc(db, collectionName, threadId), {
    readUids: arrayUnion(myUid)
  });
}

export function listenToMessages(threadId, callback, collectionName = 'teamFinderThreads') {
  const q = query(
    collection(db, collectionName, threadId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Edits the sender's own message. Enforced server-side too (see
 * firestore.rules) — only the original sender, only within 15 minutes of
 * sending, matching WhatsApp's edit window.
 */
export async function editMessage(threadId, messageId, newText, collectionName = 'teamFinderThreads') {
  await updateDoc(doc(db, collectionName, threadId, 'messages', messageId), {
    text: newText.trim(),
    editedAt: serverTimestamp()
  });
}

/**
 * Genuine delete-for-everyone — actually removes the document, not a
 * hide-for-me flag. Only the original sender can do this (rules-enforced).
 */
export async function deleteMessage(threadId, messageId, collectionName = 'teamFinderThreads') {
  await deleteDoc(doc(db, collectionName, threadId, 'messages', messageId));
}

export async function reportUser(reporterUid, reportedUid, eventId, reason, context = 'team_finder', messageSnapshot = null) {
  await addDoc(collection(db, 'reports'), {
    reporterUid, reportedUid, eventId, reason: reason || '',
    context,
    // Captured at the moment the report is filed, so it survives even if
    // the message is deleted afterward — a normal, never-reported delete
    // leaves nothing behind.
    messageSnapshot,
    createdAt: serverTimestamp()
  });
}

export async function blockUser(blockerUid, blockedUid) {
  await setDoc(doc(db, 'students', blockerUid), {
    blockedUids: arrayUnion(blockedUid)
  }, { merge: true });
}
