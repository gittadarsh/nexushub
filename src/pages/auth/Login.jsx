import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AuthLayout from './AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      const snap = await getDoc(doc(db, 'users', user.uid));
      const role = snap.exists() ? snap.data().role : null;

      if (role === 'club_admin') {
        const clubId = snap.data().clubId;
        navigate(clubId ? '/club/dashboard' : '/club/pending', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('Incorrect email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to NexusHub."
      subtitle="Students and club heads use the same door — we route you to the right place."
    >
      <h2 className="font-display text-2xl mb-6">Log in</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="input-field" type="email" placeholder="Email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input-field" type="password" placeholder="Password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="text-signal text-sm">{error}</p>}

        <button className="btn-primary w-full mt-2" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        New here? <Link to="/signup" className="text-ink font-semibold underline">Student sign up</Link>
        {' · '}
        <Link to="/club/signup" className="text-ink font-semibold underline">Register a club</Link>
      </p>
    </AuthLayout>
  );
}
