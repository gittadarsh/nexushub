import { useAuth } from '../../contexts/AuthContext';

export default function PendingApproval() {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md text-center">
        <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-3">Application pending</p>
        <h1 className="font-display text-3xl mb-4">Your club is under review</h1>
        <p className="text-muted mb-8">
          We manually check every new club to keep the directory trustworthy. This
          usually takes a day or two — you'll be able to log in and post events as
          soon as {profile?.email ? 'your account' : 'it'} is approved.
        </p>
        <button className="btn-secondary" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
