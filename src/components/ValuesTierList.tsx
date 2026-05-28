import { SkinImage } from "@/components/SkinImage";
import type { ValuesTierRow } from "@/lib/values-server";

type ValuesTierListProps = {
  tiers: ValuesTierRow[];
};

export function ValuesTierList({ tiers }: ValuesTierListProps) {
  return (
    <div className="space-y-3">
      {tiers.map((tier) => (
        <div
          key={tier.label}
          className="flex gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-3"
        >
          <div className="w-24 shrink-0 pt-1 text-left text-sm font-medium tabular-nums text-zinc-300">
            {tier.label}
          </div>
          <div className="flex min-h-12 flex-1 flex-wrap gap-1.5">
            {tier.skins.length === 0 ? (
              <div className="h-12" aria-hidden="true" />
            ) : (
              tier.skins.map((skin) => (
                <div
                  key={`${skin.character}-${skin.skin}-${skin.rarity}`}
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/80"
                  title={`${skin.character} · ${skin.skin} (${skin.rarity})`}
                >
                  <SkinImage
                    src={skin.imagePath}
                    alt={`${skin.character} ${skin.skin}`}
                    variant="values"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
