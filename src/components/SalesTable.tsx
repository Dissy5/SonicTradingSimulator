"use client";

import { SkinImage } from "@/components/SkinImage";
import { getSkinImagePath } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Sale, SkinCatalog } from "@/lib/types";

type SalesTableProps = {
  catalog: SkinCatalog;
  sales: Sale[];
  onDelete?: (id: number) => void;
  canDelete?: (sale: Sale) => boolean;
  showCharacter?: boolean;
  showSkin?: boolean;
  showRecordedBy?: boolean;
};

export function SalesTable({
  catalog,
  sales,
  onDelete,
  canDelete,
  showCharacter = true,
  showSkin = true,
  showRecordedBy = false,
}: SalesTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <th className="w-14 px-3 py-3 font-medium"></th>
            {showCharacter && <th className="px-4 py-3 font-medium">Character</th>}
            {showSkin && <th className="px-4 py-3 font-medium">Skin</th>}
            <th className="px-4 py-3 font-medium">Rarity</th>
            <th className="px-4 py-3 font-medium">Star</th>
            <th className="px-4 py-3 font-medium">Price</th>
            {showRecordedBy && <th className="px-4 py-3 font-medium">Recorded by</th>}
            {onDelete && <th className="px-4 py-3 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => {
            const imagePath = getSkinImagePath(
              catalog,
              sale.character,
              sale.skin,
              sale.rarity
            );
            const showDelete = onDelete && (canDelete ? canDelete(sale) : true);

            return (
              <tr key={sale.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">
                  <SkinImage
                    src={imagePath}
                    alt={`${sale.character} ${sale.skin}`}
                  />
                </td>
                {showCharacter && <td className="px-4 py-3">{sale.character}</td>}
                {showSkin && <td className="px-4 py-3">{sale.skin}</td>}
                <td className="px-4 py-3">{sale.rarity}</td>
                <td className="px-4 py-3">{sale.star}</td>
                <td className="px-4 py-3">{formatPrice(sale.price)}</td>
                {showRecordedBy && (
                  <td className="px-4 py-3 text-zinc-400">{sale.recordedBy ?? "Unknown"}</td>
                )}
                {onDelete && (
                  <td className="px-4 py-3">
                    {showDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(sale.id)}
                        className="rounded-md bg-red-600/90 px-2 py-1 text-xs text-white hover:bg-red-500"
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
