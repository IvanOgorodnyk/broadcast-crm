/**
 * Prismatic glass shards drifting down behind the auth forms.
 *
 * Everything is CSS/SVG — no images, no JS timers. Each shard stacks the
 * effects from the reference art:
 *   · displacement-map distortion  → SVG feTurbulence + feDisplacementMap
 *   · mirror / echo duplication    → flipped, offset copies of the pane
 *   · double exposure              → blended overlapping layers
 *   · slit-scan smearing           → horizontal bands sliding out of sync
 *   · film grain + red duotone     → tiled noise and rose gradients on top
 */

type Shard = {
  left: string;
  width: string;
  height: string;
  /** fall duration */
  dur: string;
  delay: string;
  tilt: string;
  skew: string;
  /** horizontal drift across the fall */
  x0: string;
  x1: string;
  opacity: number;
  smear: string;
  smearDur: string;
};

const SHARDS: Shard[] = [
  {
    left: "8%",
    width: "170px",
    height: "44vh",
    dur: "78s",
    delay: "-12s",
    tilt: "0deg",
    skew: "0deg",
    x0: "0px",
    x1: "10px",
    opacity: 0.2,
    smear: "7px",
    smearDur: "11s",
  },
  {
    left: "27%",
    width: "96px",
    height: "30vh",
    dur: "104s",
    delay: "-46s",
    tilt: "0deg",
    skew: "0deg",
    x0: "6px",
    x1: "-8px",
    opacity: 0.13,
    smear: "4px",
    smearDur: "8s",
  },
  {
    left: "64%",
    width: "210px",
    height: "52vh",
    dur: "92s",
    delay: "-30s",
    tilt: "0deg",
    skew: "0deg",
    x0: "-8px",
    x1: "12px",
    opacity: 0.18,
    smear: "9px",
    smearDur: "13s",
  },
  {
    left: "86%",
    width: "120px",
    height: "36vh",
    dur: "120s",
    delay: "-70s",
    tilt: "0deg",
    skew: "0deg",
    x0: "0px",
    x1: "-10px",
    opacity: 0.12,
    smear: "5px",
    smearDur: "10s",
  },
];

/** Tiled fractal noise used for the film-grain overlay. */
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export default function PrismShards() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Filter definitions */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          {/* Warps the pane edges like light through textured glass. */}
          <filter id="prism-warp" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.021"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={34}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="prism-warp-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.011 0.014"
              numOctaves={2}
              seed={23}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={20}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {SHARDS.map((s, i) => (
        <div
          key={i}
          className="prism-shard absolute top-0"
          style={
            {
              left: s.left,
              width: s.width,
              height: s.height,
              opacity: s.opacity,
              filter: `url(#${i % 2 === 0 ? "prism-warp" : "prism-warp-soft"})`,
              "--dur": s.dur,
              "--delay": s.delay,
              "--tilt": s.tilt,
              "--skew": s.skew,
              "--x0": s.x0,
              "--x1": s.x1,
              "--smear": s.smear,
              "--smear-dur": s.smearDur,
            } as React.CSSProperties
          }
        >
          {/* Glass pane: frosted, faintly red-shifted */}
          <div className="absolute inset-0 rounded-[2px] bg-gradient-to-b from-brand/15 via-rose-200/10 to-transparent backdrop-blur-[3px] backdrop-saturate-150" />

          {/* Mirror echo — flipped copy, offset, multiplied for double exposure */}
          <div className="absolute inset-0 -translate-x-3 scale-x-[-1] rounded-[2px] bg-gradient-to-b from-transparent via-brand/14 to-rose-300/14 mix-blend-multiply" />
          <div className="absolute inset-0 translate-x-2 translate-y-4 rounded-[2px] bg-gradient-to-t from-brand/12 to-transparent mix-blend-screen" />

          {/* Slit-scan bands: horizontal slices sliding out of sync */}
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2, 3, 4].map((b) => (
              <div
                key={b}
                className="prism-band absolute left-0 w-full bg-gradient-to-r from-transparent via-brand/18 to-transparent blur-[2px]"
                style={
                  {
                    top: `${8 + b * 19}%`,
                    height: `${2 + (b % 3)}%`,
                    "--smear-dur": `${7 + b * 1.7}s`,
                    "--delay": `${-b * 2.3}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Prismatic edge highlight */}
          <div className="absolute inset-y-0 left-0 w-px bg-white/40" />
          <div className="absolute inset-y-0 right-0 w-px bg-brand/25" />
        </div>
      ))}

      {/* Red duotone wash — ties the shards into the page */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.04] via-transparent to-rose-300/[0.06]" />

      {/* Film grain */}
      <div
        className="film-grain absolute -inset-8 opacity-[0.09] mix-blend-multiply"
        style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat" }}
      />
    </div>
  );
}
