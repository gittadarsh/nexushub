import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function listMyDoubtThreads(myUid) {
  const q = query(
    collection(db, 'doubtThreads'),
    where('participantUids', 'array-contains', myUid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    // Only show threads a student actually sent a message in — opening
    // the "Ask a doubt" button creates the thread record immediately
    // (needed so both sides land in the same conversation), but that
    // alone shouldn't make it appear as a real question in the inbox.
    .filter((t) => !!t.lastMessageAt);
}

/**
 * Live version of listMyDoubtThreads — fires the callback immediately
 * with the current threads, then again on every change (new message,
 * readUids update from markThreadRead, etc). Used anywhere an unread
 * count or thread list needs to update live without a manual refresh —
 * e.g. going 3 → 2 the instant a thread is marked read, from any tab.
 * Returns an unsubscribe function.
 */
export function listenToMyDoubtThreads(myUid, callback) {
  const q = query(
    collection(db, 'doubtThreads'),
    where('participantUids', 'array-contains', myUid)
  );
  return onSnapshot(q, (snap) => {
    const threads = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((t) => !!t.lastMessageAt);
    callback(threads);
  });
}
