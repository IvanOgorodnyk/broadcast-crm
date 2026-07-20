"use client";

import { useEffect, useRef, useState } from "react";

const VIEW = 288; // on-screen crop viewport (px)
const OUT = 256; // exported avatar size (px)

/**
 * Circular avatar cropper: drag to position, slider / wheel to zoom.
 * Returns a compressed JPEG data-URL of the framed region.
 */
export default function AvatarCropModal({
  src,
  onCancel,
  onSave,
}: {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1); // multiplier on top of cover-scale
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Load the image once.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const s = coverScale(img) * 1;
      // Center initially.
      setOffset({ x: (VIEW - img.width * s) / 2, y: (VIEW - img.height * s) / 2 });
      setReady(true);
    };
    img.src = src;
  }, [src]);

  function coverScale(img: HTMLImageElement) {
    return Math.max(VIEW / img.width, VIEW / img.height);
  }
  function scale() {
    const img = imgRef.current;
    return img ? coverScale(img) * zoom : 1;
  }
  function clamp(o: { x: number; y: number }, s: number) {
    const img = imgRef.current!;
    return {
      x: Math.min(0, Math.max(VIEW - img.width * s, o.x)),
      y: Math.min(0, Math.max(VIEW - img.height * s, o.y)),
    };
  }

  // Redraw whenever pan/zoom changes.
  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !ready) return;
    const s = scale();
    const o = clamp(offset, s);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.drawImage(img, o.x, o.y, img.width * s, img.height * s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, zoom, ready]);

  function onZoom(next: number) {
    const img = imgRef.current;
    if (!img) return;
    // Keep the viewport center fixed while zooming.
    const sOld = scale();
    const sNew = coverScale(img) * next;
    const cx = VIEW / 2;
    const nx = cx - ((cx - offset.x) / sOld) * sNew;
    const ny = cx - ((cx - offset.y) / sOld) * sNew;
    setZoom(next);
    setOffset(clamp({ x: nx, y: ny }, sNew));
  }

  function save() {
    const img = imgRef.current;
    if (!img) return;
    const s = scale();
    const o = clamp(offset, s);
    const out = document.createElement("canvas");
    out.width = OUT;
    out.height = OUT;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(img, -o.x / s, -o.y / s, VIEW / s, VIEW / s, 0, 0, OUT, OUT);
    onSave(out.toDataURL("image/jpeg", 0.85));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-bold">Frame your photo</h2>
        <p className="mb-3 text-sm text-gray-500">
          Drag to position, use the slider or mouse wheel to zoom.
        </p>

        <div
          className="relative mx-auto touch-none select-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = drag.current;
            setOffset(
              clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, scale())
            );
          }}
          onPointerUp={() => (drag.current = null)}
          onWheel={(e) => {
            onZoom(Math.min(4, Math.max(1, zoom * (e.deltaY < 0 ? 1.1 : 0.9))));
          }}
        >
          <canvas ref={canvasRef} width={VIEW} height={VIEW} className="rounded-md" />
          {/* Circular frame overlay */}
          <div
            className="pointer-events-none absolute inset-0 rounded-md"
            style={{
              background:
                "radial-gradient(circle at center, transparent 49.5%, rgba(255,255,255,0.75) 50%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 m-auto rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-gray-500">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="flex-1 accent-brand"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!ready}
            className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
