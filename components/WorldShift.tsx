import { getWorld, type WorldId, worldShiftIds } from "@/lib/worlds";

type WorldShiftProps = {
  currentWorld: WorldId;
  disabled?: boolean;
  onShift: (worldId: WorldId) => void;
};

const shortLabels: Record<WorldId, string> = {
  calm: "هادئ",
  story: "حكاية",
  poetry: "شعر",
  faith: "إيمان",
  learning: "تعلم",
  build: "بناء",
  celebration: "فرح",
  grief: "سكينة",
};

export function WorldShift({ currentWorld, disabled = false, onShift }: WorldShiftProps) {
  return (
    <div className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2">
      <span className="font-mono text-[9px] uppercase text-bone/30">حوّل اللحظة</span>
      {worldShiftIds.map((worldId) => {
        const world = getWorld(worldId);
        const active = worldId === currentWorld;

        return (
          <button
            key={worldId}
            type="button"
            disabled={disabled}
            onClick={() => onShift(worldId)}
            className="rounded-full border px-2.5 py-1 font-arsans text-[11px] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              borderColor: active ? world.orbHex : "rgba(247,243,236,0.12)",
              backgroundColor: active ? `${world.orbHex}22` : "transparent",
              color: active ? world.orbHex : "rgba(247,243,236,0.55)",
            }}
          >
            {shortLabels[worldId]}
          </button>
        );
      })}
    </div>
  );
}
