import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function subscribeToClub(studentUid, clubId) {
  await updateDoc(doc(db, 'students', studentUid), {
    subscribedClubs: arrayUnion(clubId)
  });
  // subscriberCount is club-private (never shown to students/other clubs —
  // see the brief's privacy-over-vanity-metrics principle), but the club
  // itself needs it for their dashboard later.
  await updateDoc(doc(db, 'clubs', clubId), {
    subscriberCount: increment(1)
  });
}

export async function unsubscribeFromClub(studentUid, clubId) {
  await updateDoc(doc(db, 'students', studentUid), {
    subscribedClubs: arrayRemove(clubId)
  });
  await updateDoc(doc(db, 'clubs', clubId), {
    subscriberCount: increment(-1)
  });
}
