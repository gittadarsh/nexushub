import { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';

const VIEWPORT = 260;
const OUTPUT = 512;

/**
 * A minimal pan + zoom cropper, built on plain canvas — no external
 * cropping library (this project has no network access to install one).
 * Always crops to a square, matching every avatar/logo use case here.
 *
 * Props:
 *   file      — the raw File the user picked
 *   onCancel  — called with no args
 *   onCropped — called with a Blob (JPEG) of the final square crop
 */
export default function ImageCropModal({ file, onCancel, onCropped }) {
  const [imgEl, setImgEl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image top-left, in viewport px
  const dragRef = useRef(null); // { startX, startY, startPosX, startPosY }
  const viewportRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      // Baseline: scale so the image's shorter side exactly covers the
      // viewport, centered.
      const baseScale = VIEWPORT / Math.min(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * baseScale;
      const h = img.naturalHeight * baseScale;
      setPos({ x: (VIEWPORT - w) / 2, y: (VIEWPORT - h) / 2 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function displayScale() {
    if (!imgEl) return 1;
    return (VIEWPORT / Math.min(imgEl.naturalWidth, imgEl.naturalHeight)) * zoom;
  }

  function clamp(newPos, scale) {
    const w = imgEl.naturalWidth * scale;
    const h = imgEl.naturalHeight * scale;
    const minX = Math.min(0, VIEWPORT - w);
    const minY = Math.min(0, VIEWPORT - h);
    return {
      x: Math.min(0, Math.max(minX, newPos.x)),
      y: Math.min(0, Math.max(minY, newPos.y))
    };
  }

  function handlePointerDown(e) {
    const point = e.touches ? e.touches[0] : e;
    dragRef.current = { startX: point.clientX, startY: point.clientY, startPosX: pos.x, startPosY: pos.y };
  }

  function handlePointerMove(e) {
    if (!dragRef.current || !imgEl) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragRef.current.startX;
    const dy = point.clientY - dragRef.current.startY;
    const next = { x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy };
    setPos(clamp(next, displayScale()));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoomChange(e) {
    const newZoom = Number(e.target.value);
    const oldScale = displayScale();
    setZoom(newZoom);
    // Re-clamp around the viewport center so zooming doesn't fling the
    // image off to one side.
    const newScale = (VIEWPORT / Math.min(imgEl.naturalWidth, imgEl.naturalHeight)) * newZoom;
    const cx = VIEWPORT / 2, cy = VIEWPORT / 2;
    const relX = (cx - pos.x) / oldScale;
    const relY = (cy - pos.y) / oldScale;
    setPos(clamp({ x: cx - relX * newScale, y: cy - relY * newScale }, newScale));
  }

  function handleConfirm() {
    const scale = displayScale();
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    const sx = (0 - pos.x) / scale;
    const sy = (0 - pos.y) / scale;
    const sSize = VIEWPORT / scale;
    ctx.drawImage(imgEl, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => onCropped(blob), 'image/jpeg', 0.9);
  }

  return (
    <div className="fixed inset-0 bg-ink/60 grid place-items-center p-6 z-50">
      <div className="card p-5 w-full max-w-xs">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-sm">Reposition photo</p>
          <button onClick={onCancel} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>

        <div
          ref={viewportRef}
          className="relative mx-auto rounded-full overflow-hidden bg-line cursor-grab active:cursor-grabbing select-none"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {imgEl && (
            <img
              src={imgEl.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: imgEl.naturalWidth * displayScale(),
                height: imgEl.naturalHeight * displayScale(),
                maxWidth: 'none'
              }}
            />
          )}
        </div>

        <p className="text-xs text-muted text-center mt-2">Drag to reposition</p>

        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={handleZoomChange}
          className="w-full mt-3"
        />

        <button onClick={handleConfirm} disabled={!imgEl} className="btn-primary w-full mt-3 flex items-center justify-center gap-1.5">
          <Check size={15} /> Use this photo
        </button>
      </div>
    </div>
  );
}
