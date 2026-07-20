import {
  collection, addDoc, updateDoc, doc, query, where, getDocs, increment, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

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

export const getMyRegistration = getStudentRegistration;

/**
 * paymentStatus lifecycle for paid events:
 *   'not_required'  -> free event, nothing to track
 *   'pending_proof' -> paid event, student hasn't submitted proof yet
 *   'pending_review'-> proof submitted, waiting on club approval
 *   'approved'      -> club confirmed payment, WhatsApp link unlocked
 *   'rejected'      -> club rejected the proof; student can resubmit
 */
export async function registerForEvent({ eventId, studentUid, clubId, studentName, rollNo, isPaid }) {
  const docRef = await addDoc(collection(db, 'registrations'), {
    eventId,
    studentUid,
    clubId,
    isTeam: false,
    studentName,
    rollNo,
    status: 'registered',
    paymentStatus: isPaid ? 'pending_proof' : 'not_required',
    transactionId: null,
    screenshotUrl: null,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'events', eventId), { registeredCount: increment(1) });
  return docRef.id;
}

export async function registerTeamForEvent({ eventId, studentUid, clubId, teamName, members, isPaid }) {
  const docRef = await addDoc(collection(db, 'registrations'), {
    eventId,
    studentUid,
    clubId,
    isTeam: true,
    teamName,
    members,
    status: 'registered',
    paymentStatus: isPaid ? 'pending_proof' : 'not_required',
    transactionId: null,
    screenshotUrl: null,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'events', eventId), { registeredCount: increment(1) });
  return docRef.id;
}

/** Student submits proof — moves pending_proof -> pending_review.
 * Also allowed again after a rejection, to resubmit. */
export async function submitPaymentProof(registrationId, { transactionId, screenshotUrl }) {
  await updateDoc(doc(db, 'registrations', registrationId), {
    transactionId,
    screenshotUrl: screenshotUrl || null,
    paymentStatus: 'pending_review'
  });
}

/** Club-side: approve or reject a submitted proof. */
export async function reviewPayment(registrationId, decision) {
  // decision: 'approved' | 'rejected'
  await updateDoc(doc(db, 'registrations', registrationId), {
    paymentStatus: decision
  });
}

export async function cancelRegistration(registrationId, eventId) {
  await updateDoc(doc(db, 'registrations', registrationId), { status: 'cancelled' });
  await updateDoc(doc(db, 'events', eventId), { registeredCount: increment(-1) });
}

export async function listRegistrationsForEvent(eventId) {
  const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.status !== 'cancelled')
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

/** Club-side: only registrations awaiting a payment decision, across an event. */
export async function listPendingPayments(eventId) {
  const all = await listRegistrationsForEvent(eventId);
  return all.filter((r) => r.paymentStatus === 'pending_review');
}