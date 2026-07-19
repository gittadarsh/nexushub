import { collection, query, where, getDocs } from 'firebase/firestore';
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
