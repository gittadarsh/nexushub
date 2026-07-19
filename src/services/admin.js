import {
  collection, getDocs, query, where, doc, updateDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function listPendingClubApplications() {
  const q = query(collection(db, 'clubApplications'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Does everything the manual Firestore process used to require in one call:
 * creates the real clubs/{id} doc, links it to the requester's users/{uid}
 * doc via clubId, and marks the application approved. This is the single
 * click that replaces the entire 8-step manual flow.
 */
export async function approveClubApplication(application) {
  const clubRef = await addDoc(collection(db, 'clubs'), {
    name: application.clubName,
    description: application.description || '',
    adminUids: [application.requestedByUid],
    subscriberCount: 0,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'users', application.requestedByUid), {
    clubId: clubRef.id
  });

  await updateDoc(doc(db, 'clubApplications', application.id), {
    status: 'approved'
  });

  return clubRef.id;
}

export async function declineClubApplication(applicationId) {
  await updateDoc(doc(db, 'clubApplications', applicationId), {
    status: 'declined'
  });
}
