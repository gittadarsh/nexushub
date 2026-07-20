import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getClub, updateClubProfile } from '../../services/clubs';
import { uploadPosterToCloudinary } from '../../services/cloudinary';

const MAX_GALLERY = 6;

export default function ClubProfileEdit() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ description: '', achievementsText: '', leadershipText: '' });
  const [existingLogoUrl, setExistingLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [gallery, setGallery] = useState([]); // existing URLs + { file, preview } for new ones
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.clubId) return;
    getClub(profile.clubId).then((club) => {
      if (!club) { setLoading(false); return; }
      setForm({
        description: club.description || '',
        achievementsText: (club.achievements || []).join('\n'),
        leadershipText: (club.leadership || []).map((l) => `${l.name} - ${l.title}`).join('\n')
      });
      setExistingLogoUrl(club.logoUrl || '');
      setGallery(club.galleryUrls || []);
      setLoading(false);
    });
  }, [profile?.clubId]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleGalleryAdd(e) {
    const files = Array.from(e.target.files || []);
    const room = MAX_GALLERY - gallery.length;
    files.slice(0, room).forEach((file) => {
      setGallery((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
    });
    e.target.value = '';
  }

  function removeGalleryItem(index) {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const logoUrl = logoFile ? await uploadPosterToCloudinary(logoFile) : existingLogoUrl;

      const galleryUrls = await Promise.all(
        gallery.map((item) => (typeof item === 'string' ? item : uploadPosterToCloudinary(item.file)))
      );

      const leadership = form.leadershipText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, ...rest] = line.split(' - ');
          return { name: name.trim(), title: rest.join(' - ').trim() || 'Member' };
        });

      await updateClubProfile(profile.clubId, {
        description: form.description,
        achievements: form.achievementsText.split('\n').map((a) => a.trim()).filter(Boolean),
        leadership,
        logoUrl,
        galleryUrls
      });

      navigate('/club/dashboard', { replace: true });
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto p-6 text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-2">Club profile</p>
      <h1 className="font-display text-3xl mb-1">Edit your club's about page</h1>
      <p className="text-muted mb-8">
        This is what students see when they tap your club in Explore — before they know a single thing you've posted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Club logo</label>
          {logoPreview || existingLogoUrl ? (
            <div className="relative w-32">
              <img
                src={logoPreview || existingLogoUrl}
                alt="Logo preview"
                className="rounded-card border border-line w-32 h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreview(null); setExistingLogoUrl(''); }}
                className="absolute -top-2 -right-2 bg-ink text-paper rounded-full w-6 h-6 text-xs"
              >✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-line rounded-card cursor-pointer hover:border-ink transition">
              <span className="text-muted text-xs text-center px-2">Upload logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Bio — who you are, what you do</label>
          <textarea className="input-field" rows={4} value={form.description} onChange={update('description')} />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Achievements (optional — one per line)</label>
          <textarea
            className="input-field"
            rows={4}
            placeholder={'Won Best Club 2025\nHosted 20+ events last year'}
            value={form.achievementsText}
            onChange={update('achievementsText')}
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Leadership (optional — one per line, "Name - Title")
          </label>
          <textarea
            className="input-field"
            rows={4}
            placeholder={'Riya Sharma - President\nArjun Mehta - Vice President'}
            value={form.leadershipText}
            onChange={update('leadershipText')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Gallery photos (optional — up to {MAX_GALLERY})
          </label>
          <div className="flex flex-wrap gap-3">
            {gallery.map((item, i) => (
              <div key={i} className="relative w-20 h-20">
                <img
                  src={typeof item === 'string' ? item : item.preview}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg border border-line"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryItem(i)}
                  className="absolute -top-2 -right-2 bg-ink text-paper rounded-full w-5 h-5 text-[10px]"
                >✕</button>
              </div>
            ))}
            {gallery.length < MAX_GALLERY && (
              <label className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-line rounded-lg cursor-pointer hover:border-ink transition">
                <span className="text-muted text-xs">+ Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryAdd} />
              </label>
            )}
          </div>
        </div>

        {error && <p className="text-signal text-sm">{error}</p>}

        <button className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
