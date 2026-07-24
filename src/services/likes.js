import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Likes are private by design (brief: "privacy and fairness over vanity
 * metrics" — same principle as clubs.subscriberCount). The event's
 * likeCount is club-only info; a student only ever sees their OWN like
 * state, never the total, anywhere in the UI.
 */
export async function likeEvent(studentUid, eventId) {
  await updateDoc(doc(db, 'students', studentUid), {
    likedEvents: arrayUnion(eventId)
  });
  await updateDoc(doc(db, 'events', eventId), {
    likeCount: increment(1)
  });
}

export async function unlikeEvent(studentUid, eventId) {
  await updateDoc(doc(db, 'students', studentUid), {
    likedEvents: arrayRemove(eventId)
  });
  await updateDoc(doc(db, 'events', eventId), {
    likeCount: increment(-1)
  });
}

/** WhatsApp share — no in-app social graph, just an out-link, per the brief. */
export function buildWhatsAppShareLink(event) {
  const url = `${window.location.origin}/events/${event.id}`;
  const text = `${event.title} — check it out on NexusHub: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Bookmarks — same private-by-design pattern as likes: purely a
 * personal "save for later" list on the student's own doc, no event-side
 * counter, nothing visible to the club or anyone else.
 */
export async function bookmarkEvent(studentUid, eventId) {
  await updateDoc(doc(db, 'students', studentUid), {
    bookmarkedEvents: arrayUnion(eventId)
  });
}

export async function unbookmarkEvent(studentUid, eventId) {
  await updateDoc(doc(db, 'students', studentUid), {
    bookmarkedEvents: arrayRemove(eventId)
  });
}
