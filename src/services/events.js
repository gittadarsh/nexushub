import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

/** Uploads the club's existing poster graphic and returns its public URL. */
export async function uploadEventPoster(clubId, file) {
  const path = `event-posters/${clubId}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/**
 * Creates an event. Status starts at 'open' and is recalculated on every
 * read against deadline/capacity (see computeEventStatus) rather than
 * trusted as stored truth, so it can never silently go stale.
 */
export async function createEvent(clubId, data) {
  const docRef = await addDoc(collection(db, 'events'), {
    clubId,
    title: data.title,
    posterUrl: data.posterUrl,
    description: data.description || '',
    teamSize: Number(data.teamSize) || 1,
    price: Number(data.price) || 0,
    venue: data.venue,
    date: Timestamp.fromDate(new Date(data.date)),
    registrationDeadline: Timestamp.fromDate(new Date(data.registrationDeadline)),
    eligibility: data.eligibility || 'Open to all',
    highlights: data.highlights || [],
    prizes: data.prizes || '',
    contactPersonUid: data.contactPersonUid,
    contactPersonName: data.contactPersonName,
    capacity: data.capacity ? Number(data.capacity) : null,
    registeredCount: 0,
    likeCount: 0,
    status: 'open',
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateEvent(eventId, updates) {
  await updateDoc(doc(db, 'events', eventId), updates);
}

export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, 'events', eventId));
}

export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listEventsForClub(clubId) {
  const q = query(collection(db, 'events'), where('clubId', '==', clubId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Feed query for Explore/Home — all events, newest first. */
export async function listAllEvents() {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Derives the live status label from data rather than a stored field alone.
 * Open → Few Seats Left → Closed/Full → Completed.
 */
export function computeEventStatus(event) {
  const now = new Date();
  const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
  const deadline = event.registrationDeadline?.toDate
    ? event.registrationDeadline.toDate()
    : new Date(event.registrationDeadline);

  if (eventDate < now) return 'completed';
  if (deadline < now) return 'closed';
  if (event.capacity && event.registeredCount >= event.capacity) return 'closed';
  if (event.capacity && event.registeredCount / event.capacity >= 0.85) return 'few_seats';
  return 'open';
}

export const STATUS_LABELS = {
  open: 'Open',
  few_seats: 'Few Seats Left',
  closed: 'Closed',
  completed: 'Completed'
};
