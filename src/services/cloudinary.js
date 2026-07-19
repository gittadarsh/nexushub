/**
 * Uploads an image directly from the browser to Cloudinary's free tier —
 * no server, no signed keys exposed, no billing card required (unlike
 * Firebase Storage, which now requires the paid Blaze plan even for
 * free-tier usage). Requires an "unsigned" upload preset configured in
 * the Cloudinary dashboard (Settings → Upload → Upload presets).
 */
export async function uploadPosterToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary isn\'t configured yet — add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Poster upload failed — check your Cloudinary preset is set to "Unsigned".');
  }

  const data = await response.json();
  return data.secure_url;
}
