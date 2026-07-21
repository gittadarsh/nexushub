import {
  collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * A lightweight request layer alongside team-finder messaging (not a
 * replacement for it) — students can message freely to get to know each
 * other first, and separately send a request that the other person must
 * explicitly accept or decline before either side considers it a match.
 * One pending request per (event, fromUid, toUid) at a time; sending
 * again after a decline/withdraw just creates a fresh one.
 */
export async function sendRequest(eventId, fromUid, fromName, toUid, toName) {
  await addDoc(collection(db, 'teamFinderRequests'), {
    eventId, fromUid, fromName, toUid, toName,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

export async function withdrawRequest(requestId) {
  await updateDoc(doc(db, 'teamFinderRequests', requestId), { status: 'withdrawn' });
}

export async function respondToRequest(requestId, decision) {
  // decision: 'accepted' | 'declined'
  await updateDoc(doc(db, 'teamFinderRequests', requestId), { status: decision });
}

/**
 * Returns { outgoing, incoming } — requests I sent, and requests sent to
 * me, for this event. Two separate equality-only queries (no composite
 * index needed) merged client-side.
 */
export async function listMyRequestsForEvent(eventId, myUid) {
  const outgoingQ = query(
    collection(db, 'teamFinderRequests'),
    where('eventId', '==', eventId),
    where('fromUid', '==', myUid)
  );
  const incomingQ = query(
    collection(db, 'teamFinderRequests'),
    where('eventId', '==', eventId),
    where('toUid', '==', myUid)
  );
  const [outSnap, inSnap] = await Promise.all([getDocs(outgoingQ), getDocs(incomingQ)]);
  return {
    outgoing: outSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    incoming: inSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  };
}
