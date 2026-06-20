import type { World } from "@/lib/worlds";

type PresenceOrbProps = {
  world: World;
  thinking?: boolean;
};

export function PresenceOrb({ world, thinking = false }: PresenceOrbProps) {
  const animationClass = world.orbShape === "still-water" ? "" : thinking ? "animate-breathe-fast" : "animate-breathe";

  return (
    <div className="relative mx-auto grid h-20 w-20 place-items-center" aria-hidden="true">
      <div
        className="absolute h-16 w-16 rounded-full blur-2xl transition-colors duration-700"
        style={{ backgroundColor: world.orbHex, opacity: 0.42 }}
      />
      <svg className={`relative h-20 w-20 ${animationClass}`} viewBox="0 0 100 100" role="img">
        <defs>
          <radialGradient id={`orb-${world.id}`} cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor={world.orbHex} stopOpacity="0.95" />
            <stop offset="100%" stopColor={world.orbHex} stopOpacity="0.18" />
          </radialGradient>
        </defs>
        <OrbShape world={world} />
      </svg>
    </div>
  );
}

function OrbShape({ world }: { world: World }) {
  const fill = `url(#orb-${world.id})`;

  switch (world.orbShape) {
    case "flame":
      return <path d="M50 15 C 35 35, 25 45, 25 62 C 25 80, 38 90, 50 90 C 62 90, 75 80, 75 62 C 75 45, 65 35, 50 15 Z" fill={fill} />;
    case "bloom":
      return (
        <g fill={world.orbHex} opacity="0.7">
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse key={angle} cx="50" cy="31" rx="11" ry="22" transform={`rotate(${angle} 50 50)`} opacity="0.55" />
          ))}
          <circle cx="50" cy="50" r="9" />
        </g>
      );
    case "crescent":
      return <path d="M65 20 A 35 35 0 1 0 65 80 A 27 27 0 1 1 65 20 Z" fill={world.orbHex} opacity="0.82" />;
    case "lantern":
      return (
        <g fill={fill}>
          <rect x="40" y="20" width="20" height="8" rx="4" />
          <rect x="35" y="30" width="30" height="40" rx="6" />
          <rect x="39" y="72" width="22" height="8" rx="4" />
        </g>
      );
    case "spark":
      return <path d="M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z" fill={fill} />;
    case "still-water":
      return (
        <g fill="none" stroke={world.orbHex}>
          <circle cx="50" cy="50" r="16" opacity="0.72" />
          <circle cx="50" cy="50" r="25" opacity="0.45" />
          <circle cx="50" cy="50" r="34" opacity="0.22" />
        </g>
      );
    case "sphere":
    default:
      return <circle cx="50" cy="50" r="28" fill={fill} />;
  }
}
