import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HomeFeed from './student/HomeFeed';

export default function Home() {
  const { profile, loading, isClubApproved } = useAuth();

  if (loading) return <div className="min-h-screen grid place-items-center text-muted">Loading…</div>;

  if (profile?.role === 'club_admin') {
    return <Navigate to={isClubApproved ? '/club/dashboard' : '/club/pending'} replace />;
  }

  return <HomeFeed />;
}
