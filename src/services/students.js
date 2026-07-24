import { doc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function updateStudentPhoto(uid, photoUrl) {
  await updateDoc(doc(db, 'students', uid), { photoUrl });
}

export async function deleteStudentPhoto(uid) {
  await updateDoc(doc(db, 'students', uid), { photoUrl: deleteField() });
}

/**
 * Stamps "I checked in on this club" — used to decide whether the small
 * new-activity dot shows next to a club in Subscriptions. A dot-path
 * update on a map field, so it only ever touches this one club's entry,
 * never overwrites any other club's lastSeen value.
 */
export async function markClubSeen(uid, clubId) {
  await updateDoc(doc(db, 'students', uid), {
    [`clubLastSeen.${clubId}`]: serverTimestamp()
  });
}
