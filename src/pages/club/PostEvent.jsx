import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createEvent, updateEvent, getEvent } from '../../services/events';
import { uploadPosterToCloudinary } from '../../services/cloudinary';

const initialForm = {
  title: '', description: '', teamSize: 1, price: 0, venue: '',
  date: '', registrationDeadline: '', eligibility: '', capacity: '',
  contactPersonName: '', highlightsText: '', prizes: '',
  upiLink: '', whatsappGroupLink: ''
};

function toLocalInputValue(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostEvent() {
  const { profile, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('eventId');

  const [form, setForm] = useState(initialForm);
  const [existingPosterUrl, setExistingPosterUrl] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    getEvent(editId).then((evt) => {
      if (!evt) { setLoadingEvent(false); return; }
      setForm({
        title: evt.title || '',
        description: evt.description || '',
        teamSize: evt.teamSize ?? 1,
        price: evt.price ?? 0,
        venue: evt.venue || '',
        date: toLocalInputValue(evt.date),
        registrationDeadline: toLocalInputValue(evt.registrationDeadline),
        eligibility: evt.eligibility || '',
        capacity: evt.capacity ?? '',
        contactPersonName: evt.contactPersonName || '',
        highlightsText: (evt.highlights || []).join('\n'),
        prizes: evt.prizes || '',
        upiLink: evt.upiLink || '',
        whatsappGroupLink: evt.whatsappGroupLink || ''
      });
      setExistingPosterUrl(evt.posterUrl || '');
      setLoadingEvent(false);
    });
  }, [editId]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handlePosterChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (new Date(form.registrationDeadline) > new Date(form.date)) {
      setError('Registration deadline should be before the event date.');
      return;
    }

    setSubmitting(true);
    try {
      const posterUrl = posterFile
        ? await uploadPosterToCloudinary(posterFile)
        : existingPosterUrl;

      const payload = {
        ...form,
        teamSize: Number(form.teamSize) || 1,
        price: Number(form.price) || 0,
        capacity: form.capacity ? Number(form.capacity) : null,
        posterUrl,
        highlights: form.highlightsText.split('\n').map((h) => h.trim()).filter(Boolean),
        date: new Date(form.date),
        registrationDeadline: new Date(form.registrationDeadline)
      };
      delete payload.highlightsText;

      if (editId) {
        await updateEvent(editId, payload);
        navigate(`/club/events/${editId}`, { replace: true });
      } else {
        const eventId = await createEvent(profile.clubId, {
          ...payload,
          contactPersonUid: firebaseUser.uid,
          contactPersonName: form.contactPersonName || 'Club team'
        });
        navigate(`/club/events/${eventId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvent) {
    return <div className="max-w-2xl mx-auto p-6 text-muted">Loading event…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-2">
        {editId ? 'Edit event' : 'New event'}
      </p>
      <h1 className="font-display text-3xl mb-1">{editId ? 'Edit event' : 'Post an event'}</h1>
      <p className="text-muted mb-8">
        Upload the exact graphic you'd post to Instagram. Everything below just
        answers the questions students always DM you anyway.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Event poster (optional)</label>
          {posterPreview || existingPosterUrl ? (
            <div className="relative w-48">
              <img
                src={posterPreview || existingPosterUrl}
                alt="Poster preview"
                className="rounded-card border border-line w-48"
              />
              <button
                type="button"
                onClick={() => { setPosterFile(null); setPosterPreview(null); setExistingPosterUrl(''); }}
                className="absolute -top-2 -right-2 bg-ink text-paper rounded-full w-6 h-6 text-xs"
              >✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-48 h-64 border-2 border-dashed border-line rounded-card cursor-pointer hover:border-ink transition">
              <span className="text-muted text-sm text-center px-4">Click to upload your poster</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
            </label>
          )}
        </div>

        <input className="input-field" placeholder="Event title" required value={form.title} onChange={update('title')} />
        <textarea className="input-field" placeholder="Short description" rows={3} value={form.description} onChange={update('description')} />

        <div>
          <label className="block text-xs text-muted mb-1">
            Highlights (optional — one per line)
          </label>
          <textarea className="input-field" rows={3} value={form.highlightsText} onChange={update('highlightsText')} />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Prizes (optional)</label>
          <input className="input-field" placeholder="e.g. ₹5,000 winner · ₹2,000 runner-up" value={form.prizes} onChange={update('prizes')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Team size</label>
            <input className="input-field" type="number" min={1} required value={form.teamSize} onChange={update('teamSize')} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Entry fee (₹, 0 if free)</label>
            <input className="input-field" type="number" min={0} value={form.price} onChange={update('price')} />
          </div>
        </div>

        {Number(form.price) > 0 && (
          <div className="space-y-3 p-4 rounded-card bg-line/40">
            <p className="text-xs font-semibold text-muted">Shown to students only after their payment is approved</p>
            <div>
              <label className="block text-xs text-muted mb-1">Your UPI payment link</label>
              <input
                className="input-field"
                placeholder="upi://pay?pa=... or a payment page link"
                value={form.upiLink}
                onChange={update('upiLink')}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">WhatsApp group invite link</label>
              <input
                className="input-field"
                placeholder="https://chat.whatsapp.com/..."
                value={form.whatsappGroupLink}
                onChange={update('whatsappGroupLink')}
              />
            </div>
          </div>
        )}

        <input className="input-field" placeholder="Venue" required value={form.venue} onChange={update('venue')} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Event date & time</label>
            <input className="input-field" type="datetime-local" required value={form.date} onChange={update('date')} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Registration deadline</label>
            <input className="input-field" type="datetime-local" required value={form.registrationDeadline} onChange={update('registrationDeadline')} />
          </div>
        </div>

        <input className="input-field" placeholder="Eligibility" value={form.eligibility} onChange={update('eligibility')} />

        <div>
          <label className="block text-xs text-muted mb-1">Capacity (optional)</label>
          <input className="input-field" type="number" min={1} value={form.capacity} onChange={update('capacity')} />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Who should "doubts" go to?</label>
          <input className="input-field" value={form.contactPersonName} onChange={update('contactPersonName')} />
        </div>

        {error && <p className="text-signal text-sm">{error}</p>}

        <button className="btn-primary w-full" disabled={submitting}>
          {submitting ? (editId ? 'Saving…' : 'Publishing…') : (editId ? 'Save changes' : 'Publish event')}
        </button>
      </form>
    </div>
  );
}