import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function updateStudentPhoto(uid, photoUrl) {
  await updateDoc(doc(db, 'students', uid), { photoUrl });
}

export async function deleteStudentPhoto(uid) {
  await updateDoc(doc(db, 'students', uid), { photoUrl: deleteField() });
}
