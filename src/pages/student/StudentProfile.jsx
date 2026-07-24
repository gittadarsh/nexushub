import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { updateStudentPhoto, deleteStudentPhoto } from '../../services/students';
import { uploadPosterToCloudinary } from '../../services/cloudinary';
import StudentNav from '../../components/StudentNav';
import ImageCropModal from '../../components/ImageCropModal';

export default function StudentProfile() {
  const { firebaseUser } = useAuth();
  const { studentProfile, loading, refresh } = useStudentProfile();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef(null);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    setPendingFile(file);
  }

  async function handleCropped(blob) {
    setPendingFile(null);
    if (!blob || !firebaseUser) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadPosterToCloudinary(blob);
      await updateStudentPhoto(firebaseUser.uid, url);
      await refresh();
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setShowMenu(false);
    if (!firebaseUser) return;
    setError('');
    setUploading(true);
    try {
      await deleteStudentPhoto(firebaseUser.uid);
      await refresh();
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-paper p-6 text-muted">Loading…</div>;

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />

      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="font-display text-3xl mb-1">Your profile</h1>
        <Link to="/my-recap" className="text-sm text-signal underline mb-6 inline-block">See your time on NexusHub →</Link>

        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="relative"
            title="Tap for photo options"
          >
            {studentProfile?.photoUrl ? (
              <img src={studentProfile.photoUrl} alt="" className="w-28 h-28 rounded-full object-cover border border-line" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-line grid place-items-center font-display text-3xl">
                {studentProfile?.name?.[0] || '?'}
              </div>
            )}
          </button>

          {uploading && <p className="text-xs text-muted mt-2">Uploading…</p>}

          {showMenu && !uploading && (
            <div className="mt-3 card p-1.5 flex flex-col w-40">
              <button
                type="button"
                onClick={() => { setShowMenu(false); fileInputRef.current?.click(); }}
                className="text-sm text-left px-3 py-2 rounded-card hover:bg-line transition"
              >
                {studentProfile?.photoUrl ? 'Change photo' : 'Add a photo'}
              </button>
              {studentProfile?.photoUrl && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm text-left px-3 py-2 rounded-card hover:bg-line transition text-signal"
                >
                  Delete photo
                </button>
              )}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

          {error && <p className="text-signal text-xs mt-2">{error}</p>}
        </div>

        <div className="card divide-y divide-line">
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-muted">Name</span>
            <span className="text-sm font-semibold">{studentProfile?.name || '—'}</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-muted">Email</span>
            <span className="text-sm font-semibold">{firebaseUser?.email}</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-muted">Roll number</span>
            <span className="text-sm font-semibold">{studentProfile?.rollNo || 'Not set yet'}</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-muted">Phone</span>
            <span className="text-sm font-semibold">{studentProfile?.contact || 'Not set yet'}</span>
          </div>
        </div>
      </div>

      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}
