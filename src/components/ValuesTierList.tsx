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
          <div className="w-32 shrink-0 pt-1 text-left text-sm font-medium tabular-nums text-zinc-300">
            {tier.label}
          </div>
          <div className="flex min-h-16 flex-1 flex-wrap gap-1.5">
            {tier.skins.map((skin) => (
              <SkinImage
                key={`${skin.character}-${skin.skin}-${skin.rarity}`}
                src={skin.imagePath}
                alt={`${skin.character} ${skin.skin}`}
                variant="values"
                title={`${skin.character} · ${skin.skin} (${skin.rarity})`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
