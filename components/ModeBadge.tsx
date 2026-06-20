import type { World } from "@/lib/worlds";

type ModeBadgeProps = {
  world: World;
};

export function ModeBadge({ world }: ModeBadgeProps) {
  return (
    <div
      className="mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-700"
      style={{ border: `1px solid ${world.orbHex}55`, backgroundColor: `${world.orbHex}15` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: world.orbHex }} />
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/70">{world.nameEn}</span>
      <span className="font-arsans text-xs text-bone/90">{world.nameAr}</span>
    </div>
  );
}
