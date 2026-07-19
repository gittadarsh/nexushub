import {
  collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Creates or replaces a student's team-finder card for an event. Scoped
 * per-event by design (not a global pool) — see brief's team-finder
 * principles. One active card per student per event.
 */
export async function upsertMyPost(eventId, studentUid, studentName, type, message) {
  const existing = await getMyPost(eventId, studentUid);
  if (existing) {
    await updateDoc(doc(db, 'teamFinderPosts', existing.id), {
      type, message, status: 'open'
    });
    return existing.id;
  }
  const docRef = await addDoc(collection(db, 'teamFinderPosts'), {
    eventId,
    studentUid,
    studentName,
    type, // 'need_teammates' | 'looking_to_join'
    message: message || '',
    status: 'open',
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getMyPost(eventId, studentUid) {
  const q = query(
    collection(db, 'teamFinderPosts'),
    where('eventId', '==', eventId),
    where('studentUid', '==', studentUid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function listPostsForEvent(eventId) {
  const q = query(
    collection(db, 'teamFinderPosts'),
    where('eventId', '==', eventId),
    where('status', '==', 'open')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function withdrawMyPost(postId) {
  await updateDoc(doc(db, 'teamFinderPosts', postId), { status: 'withdrawn' });
}
