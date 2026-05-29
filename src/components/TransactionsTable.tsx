"use client";

import { SkinImage } from "@/components/SkinImage";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { getSkinImagePath } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { SkinCatalog, Transaction } from "@/lib/types";

type TransactionsTableProps = {
  catalog: SkinCatalog;
  transactions: Transaction[];
  onDelete?: (id: number) => void;
  canDelete?: (transaction: Transaction) => boolean;
  showCharacter?: boolean;
  showSkin?: boolean;
  showRecordedBy?: boolean;
};

function formatTransactionType(type: Transaction["type"]): string {
  return type === "purchase" ? "Purchase" : "Sale";
}

export function TransactionsTable({
  catalog,
  transactions,
  onDelete,
  canDelete,
  showCharacter = true,
  showSkin = true,
  showRecordedBy = false,
}: TransactionsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <th className="w-14 px-3 py-3 font-medium"></th>
            <th className="px-4 py-3 font-medium">Type</th>
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
          {transactions.map((transaction) => {
            const imagePath = getSkinImagePath(
              catalog,
              transaction.character,
              transaction.skin,
              transaction.rarity
            );
            const showDelete = onDelete && (canDelete ? canDelete(transaction) : true);

            return (
              <tr key={transaction.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">
                  <SkinImage
                    src={imagePath}
                    alt={`${transaction.character} ${transaction.skin}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      transaction.type === "purchase" ? "text-amber-300" : "text-green-300"
                    }
                  >
                    {formatTransactionType(transaction.type)}
                  </span>
                </td>
                {showCharacter && <td className="px-4 py-3">{transaction.character}</td>}
                {showSkin && <td className="px-4 py-3">{transaction.skin}</td>}
                <td className="px-4 py-3">{transaction.rarity}</td>
                <td className="px-4 py-3">{transaction.star}</td>
                <td className="px-4 py-3">{formatPrice(transaction.price)}</td>
                {showRecordedBy && (
                  <td className="px-4 py-3 text-zinc-400">
                    {transaction.recordedBy ?? "Unknown"}
                  </td>
                )}
                {onDelete && (
                  <td className="px-4 py-3">
                    {showDelete ? (
                      <ConfirmDeleteButton onConfirm={() => onDelete(transaction.id)} />
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
