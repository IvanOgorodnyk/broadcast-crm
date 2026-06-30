/**
 * OBLOGA Broadcast wordmark + logo.
 *
 * To use the real logo: drop the file at `public/logo.png` (or .svg) and change
 * LOGO_SRC below. Everything that shows the brand uses this component.
 */
const LOGO_SRC = "/logo.svg";

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
  return (
    <span className={`flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="OBLOGA" height={size} style={{ height: size, width: "auto" }} />
      <span className={light ? "text-white" : "text-gray-900"}>OBLOGA Broadcast</span>
    </span>
  );
}
