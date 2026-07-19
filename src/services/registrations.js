import {
  collection, addDoc, updateDoc, doc, query, where, getDocs, increment, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

/** Looks up whether a student (as themselves, or as a team leader) already
 * has a non-cancelled registration for this event. */
export async function getStudentRegistration(studentUid, eventId) {
  const q = query(
    collection(db, 'registrations'),
    where('studentUid', '==', studentUid),
    where('eventId', '==', eventId)
  );
  const snap = await getDocs(q);
  const active = snap.docs.find((d) => d.data().status !== 'cancelled');
  return active ? { id: active.id, ...active.data() } : null;
}

// Alias kept for TeamFinder.jsx, which already imports this name.
export const getMyRegistration = getStudentRegistration;

/** Solo registration (teamSize === 1). Name/roll no are denormalized onto
 * the registration doc itself — clubs can't read the `students` collection
 * directly (that's locked to the owning student only), so this is how a
 * club actually sees who registered without opening up student privacy. */
export async function registerForEvent({ eventId, studentUid, clubId, studentName, rollNo }) {
  const docRef = await addDoc(collection(db, 'registrations'), {
    eventId,
    studentUid,
    clubId,
    isTeam: false,
    studentName,
    rollNo,
    status: 'registered',
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'events', eventId), { registeredCount: increment(1) });
  return docRef.id;
}

/**
 * Team registration — one registration doc represents the whole team.
 * `studentUid` is the team leader (the signed-in account submitting this),
 * so existing per-student lookups (getStudentRegistration) still work.
 * `members` is [{ name, rollNo }, ...] filled in directly by the leader —
 * teammates don't each need their own NexusHub account for this to work.
 */
export async function registerTeamForEvent({ eventId, studentUid, clubId, teamName, members }) {
  const docRef = await addDoc(collection(db, 'registrations'), {
    eventId,
    studentUid,
    clubId,
    isTeam: true,
    teamName,
    members, // [{ name, rollNo }]
    status: 'registered',
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'events', eventId), { registeredCount: increment(1) });
  return docRef.id;
}

export async function cancelRegistration(registrationId, eventId) {
  await updateDoc(doc(db, 'registrations', registrationId), { status: 'cancelled' });
  await updateDoc(doc(db, 'events', eventId), { registeredCount: increment(-1) });
}

/** Club-side: every (non-cancelled) registration for one of their events.
 * Sorted client-side (newest first) so this never needs a Firestore
 * composite index — fine at this scale. */
export async function listRegistrationsForEvent(eventId) {
  const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.status !== 'cancelled')
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}