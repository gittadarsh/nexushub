import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { subscribeToClub, unsubscribeFromClub } from '../services/subscriptions';
import { likeEvent, unlikeEvent, bookmarkEvent, unbookmarkEvent } from '../services/likes';
import { useAuth } from '../contexts/AuthContext';

export function useStudentProfile() {
  const { firebaseUser } = useAuth();
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    const snap = await getDoc(doc(db, 'students', firebaseUser.uid));
    setStudentProfile(snap.exists() ? snap.data() : null);
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSubscribed = useCallback(
    (clubId) => !!studentProfile?.subscribedClubs?.includes(clubId),
    [studentProfile]
  );

  async function toggleSubscribe(clubId) {
    if (!firebaseUser) return;
    const currentlySubscribed = isSubscribed(clubId);

    setStudentProfile((prev) => ({
      ...prev,
      subscribedClubs: currentlySubscribed
        ? (prev.subscribedClubs || []).filter((id) => id !== clubId)
        : [...(prev.subscribedClubs || []), clubId]
    }));

    try {
      if (currentlySubscribed) {
        await unsubscribeFromClub(firebaseUser.uid, clubId);
      } else {
        await subscribeToClub(firebaseUser.uid, clubId);
      }
    } catch (err) {
      await refresh();
      throw err;
    }
  }

  const isLiked = useCallback(
    (eventId) => !!studentProfile?.likedEvents?.includes(eventId),
    [studentProfile]
  );

  async function toggleLike(eventId) {
    if (!firebaseUser) return;
    const currentlyLiked = isLiked(eventId);

    setStudentProfile((prev) => ({
      ...prev,
      likedEvents: currentlyLiked
        ? (prev.likedEvents || []).filter((id) => id !== eventId)
        : [...(prev.likedEvents || []), eventId]
    }));

    try {
      if (currentlyLiked) {
        await unlikeEvent(firebaseUser.uid, eventId);
      } else {
        await likeEvent(firebaseUser.uid, eventId);
      }
    } catch (err) {
      await refresh();
      throw err;
    }
  }

  const isBookmarked = useCallback(
    (eventId) => !!studentProfile?.bookmarkedEvents?.includes(eventId),
    [studentProfile]
  );

  async function toggleBookmark(eventId) {
    if (!firebaseUser) return;
    const currentlyBookmarked = isBookmarked(eventId);

    setStudentProfile((prev) => ({
      ...prev,
      bookmarkedEvents: currentlyBookmarked
        ? (prev.bookmarkedEvents || []).filter((id) => id !== eventId)
        : [...(prev.bookmarkedEvents || []), eventId]
    }));

    try {
      if (currentlyBookmarked) {
        await unbookmarkEvent(firebaseUser.uid, eventId);
      } else {
        await bookmarkEvent(firebaseUser.uid, eventId);
      }
    } catch (err) {
      await refresh();
      throw err;
    }
  }

  return {
    studentProfile, loading, isSubscribed, toggleSubscribe, isLiked, toggleLike,
    isBookmarked, toggleBookmark, refresh
  };
}
