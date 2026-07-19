import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Only college addresses may sign up. Adjust to your institution's domain.
const COLLEGE_EMAIL_DOMAIN = '@abes.ac.in';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // the users/{uid} doc — has role
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  function assertCollegeEmail(email) {
    if (!email.toLowerCase().endsWith(COLLEGE_EMAIL_DOMAIN)) {
      throw new Error(`Please use your college email (${COLLEGE_EMAIL_DOMAIN}).`);
    }
  }

  /** Student signup: one account per student, college email required. */
  async function signUpStudent(email, password, basicInfo) {
    assertCollegeEmail(email);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);

    const userDoc = {
      role: 'student',
      email,
      createdAt: serverTimestamp(),
      clubId: null
    };
    await setDoc(doc(db, 'users', cred.user.uid), userDoc);

    await setDoc(doc(db, 'students', cred.user.uid), {
      name: basicInfo.name,
      rollNo: basicInfo.rollNo || '',
      className: basicInfo.className || '',
      gender: basicInfo.gender || '',
      contact: basicInfo.contact || '',
      // False until roll number + phone are filled in via the
      // "complete your profile" prompt, shown before first registration.
      profileComplete: false,
      subscribedClubs: [],
      bookmarkedEvents: [],
      createdAt: serverTimestamp()
    });

    // The onAuthStateChanged listener fires as soon as the account is
    // created — before these Firestore writes land — so it reads an empty
    // profile. Set it locally here so the very first render is correct.
    setProfile(userDoc);

    return cred.user;
  }

  /**
   * Club signup: creates the auth account + a pending clubApplications doc.
   * The account exists immediately but cannot post events until a platform
   * admin approves the application (prevents fake club accounts).
   */
  async function signUpClub(email, password, clubInfo) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);

    const userDoc = {
      role: 'club_admin',
      email,
      createdAt: serverTimestamp(),
      clubId: null // stays null until approved
    };
    await setDoc(doc(db, 'users', cred.user.uid), userDoc);
    setProfile(userDoc);

    await addDoc(collection(db, 'clubApplications'), {
      requestedByUid: cred.user.uid,
      clubName: clubInfo.clubName,
      description: clubInfo.description || '',
      contactEmail: email,
      contactPhone: clubInfo.contactPhone || '',
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  const value = {
    firebaseUser,
    profile,
    loading,
    isStudent: profile?.role === 'student',
    isClubAdmin: profile?.role === 'club_admin',
    isClubApproved: profile?.role === 'club_admin' && !!profile?.clubId,
    signUpStudent,
    signUpClub,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
