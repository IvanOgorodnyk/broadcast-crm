/**
 * OBLOGA Broadcast wordmark + logo.
 *
 * The mark is the original raster asset at `public/logo.png` (transparent
 * background, white-outline R). On light backgrounds the white outline would
 * vanish, so the mark sits on a small dark chip unless `light` is set.
 */
const LOGO_SRC = "/logo.png";
const LOGO_ASPECT = 1076 / 632; // intrinsic width / height of logo.png

export default function Logo({
  size = 26,
  className = "",
  light = false,
}: {
  size?: number;
  className?: string;
  /** light=true for dark backgrounds (e.g. the nav bar) */
  light?: boolean;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="OBLOGA"
      height={size}
      style={{ height: size, width: size * LOGO_ASPECT }}
    />
  );
  return (
    <span className={`flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      {light ? img : <span className="rounded-md bg-nav p-1.5">{img}</span>}
      <span className={light ? "text-white" : "text-gray-900"}>OBLOGA Broadcast</span>
    </span>
  );
}
