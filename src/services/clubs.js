import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function getClub(clubId) {
  const snap = await getDoc(doc(db, 'clubs', clubId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Batch-fetches multiple clubs by id and returns a { clubId: club } map.
 * Firestore has no join, so the Explore feed uses this once per page load
 * against the unique clubIds present in the current batch of events,
 * rather than fetching a club doc per event card.
 */
export async function getClubsByIds(clubIds) {
  const uniqueIds = [...new Set(clubIds)];
  const results = await Promise.all(uniqueIds.map((id) => getClub(id)));
  const map = {};
  results.forEach((club) => {
    if (club) map[club.id] = club;
  });
  return map;
}

export async function listAllClubs() {
  const snap = await getDocs(collection(db, 'clubs'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Club-side: update the "about" profile fields — logo, bio, achievements,
 * leadership, gallery. Firestore rules already allow a club's own
 * adminUids to update any field on their club doc, so no rule change
 * needed here.
 */
export async function updateClubProfile(clubId, updates) {
  await updateDoc(doc(db, 'clubs', clubId), updates);
}

/**
 * Deletes the club and every event it posted (an event left pointing at
 * a deleted clubId would break the event detail page, which looks the
 * club up to render it). Registrations tied to those events are NOT
 * deleted — Firestore has no cascading deletes, and wiping historical
 * registration records is a bigger, separate decision than "delete my
 * club." They're simply orphaned (harmless — nothing queries them once
 * the event is gone). Irreversible; the caller is responsible for
 * confirming with the user first.
 */
export async function deleteClub(clubId) {
  const eventsSnap = await getDocs(query(collection(db, 'events'), where('clubId', '==', clubId)));
  await Promise.all(eventsSnap.docs.map((d) => deleteDoc(doc(db, 'events', d.id))));
  await deleteDoc(doc(db, 'clubs', clubId));
}
