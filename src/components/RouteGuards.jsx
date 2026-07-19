import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function FullScreenLoader() {
  return <div className="min-h-screen grid place-items-center text-muted">Loading…</div>;
}

export function RequireAuth({ children }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return children;
}

export function RequireStudent({ children }) {
  const { profile, loading, firebaseUser } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (profile?.role !== 'student') return <Navigate to="/" replace />;
  return children;
}

/** Club admin whose application is still pending gets routed to a waiting screen. */
export function RequireClubAdmin({ children }) {
  const { profile, loading, firebaseUser, isClubApproved } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (profile?.role !== 'club_admin') return <Navigate to="/" replace />;
  if (!isClubApproved) return <Navigate to="/club/pending" replace />;
  return children;
}
