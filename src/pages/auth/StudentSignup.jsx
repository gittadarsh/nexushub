import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from './AuthLayout';

// Signup is deliberately minimal — just enough to create an account.
// Roll number and phone are collected later, right before a student's
// first event registration, via the "complete your profile" prompt
// (see ProfileCompletionGate). This keeps signup friction low while still
// getting the data clubs need before it's actually required.
export default function StudentSignup() {
  const { signUpStudent } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signUpStudent(form.email, form.password, { name: form.name });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="For students"
      title="Never miss what's happening."
      subtitle="Every club, one feed. Find teammates for events you'd otherwise sit out."
    >
      <h2 className="font-display text-2xl mb-1">Create your account</h2>
      <p className="text-muted text-sm mb-6">Just three things — takes 20 seconds.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="input-field" placeholder="Full name" required
          value={form.name} onChange={update('name')} />
        <input className="input-field" type="email" placeholder="College email" required
          value={form.email} onChange={update('email')} />
        <input className="input-field" type="password" placeholder="Password (min 6 characters)"
          required minLength={6} value={form.password} onChange={update('password')} />

        {error && <p className="text-signal text-sm">{error}</p>}

        <button className="btn-primary w-full mt-2" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        Already have an account? <Link to="/login" className="text-ink font-semibold underline">Log in</Link>
      </p>
      <p className="text-sm text-muted mt-2">
        Running a club? <Link to="/club/signup" className="text-ink font-semibold underline">Register your club</Link>
      </p>
    </AuthLayout>
  );
}
