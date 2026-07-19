import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from './AuthLayout';

export default function ClubSignup() {
  const { signUpClub } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    clubName: '', description: '', contactPhone: '', email: '', password: ''
  });
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
      await signUpClub(form.email, form.password, {
        clubName: form.clubName,
        description: form.description,
        contactPhone: form.contactPhone
      });
      // New club accounts land on a waiting screen until manually approved.
      navigate('/club/pending', { replace: true });
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="For club heads"
      title="Post once. Reach everyone."
      subtitle="Keep using your existing posters. We handle registration, doubts, and team-matching."
    >
      <h2 className="font-display text-2xl mb-1">Register your club</h2>
      <p className="text-muted text-sm mb-6">A platform admin reviews every application before it goes live — this keeps the directory trustworthy.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="input-field" placeholder="Club name" required
          value={form.clubName} onChange={update('clubName')} />
        <textarea className="input-field" placeholder="What does your club do? (one or two lines)"
          rows={3} value={form.description} onChange={update('description')} />
        <input className="input-field" placeholder="Contact phone" required
          value={form.contactPhone} onChange={update('contactPhone')} />
        <input className="input-field" type="email" placeholder="Club contact email" required
          value={form.email} onChange={update('email')} />
        <input className="input-field" type="password" placeholder="Password (min 6 characters)"
          required minLength={6} value={form.password} onChange={update('password')} />

        {error && <p className="text-signal text-sm">{error}</p>}

        <button className="btn-primary w-full mt-2" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit for approval'}
        </button>
      </form>

      <p className="text-sm text-muted mt-6">
        Already approved? <Link to="/login" className="text-ink font-semibold underline">Log in</Link>
      </p>
      <p className="text-sm text-muted mt-2">
        Just here to browse events? <Link to="/signup" className="text-ink font-semibold underline">Student sign up</Link>
      </p>
    </AuthLayout>
  );
}
