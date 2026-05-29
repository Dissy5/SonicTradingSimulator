/**
 * One-time import of data/sales.json into Supabase.
 * Requires .env.local with Supabase credentials and the schema applied.
 *
 * Usage: npm run db:import
 */
import { config } from "dotenv";

config({ path: ".env.local" });
import fs from "fs/promises";
import path from "path";

import { createSupabaseServerClient } from "../src/lib/supabase/server";
import type { Transaction } from "../src/lib/types";

async function main() {
  const salesPath = path.join(process.cwd(), "data", "sales.json");
  const raw = await fs.readFile(salesPath, "utf-8");
  const sales = JSON.parse(raw) as Transaction[];

  if (sales.length === 0) {
    console.log("No local sales to import.");
    return;
  }

  const supabase = createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true });

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    console.log(`Supabase already has ${count} sales — skipping import.`);
    return;
  }

  const rows = sales.map((entry) => ({
    type: entry.type === "purchase" ? "purchase" : "sale",
    character: entry.character,
    skin: entry.skin,
    rarity: entry.rarity,
    star: entry.star,
    price: entry.price,
    transaction_date: entry.date ?? entry.createdAt.slice(0, 10),
    created_at: entry.createdAt,
  }));

  const { error } = await supabase.from("sales").insert(rows);
  if (error) throw new Error(error.message);

  console.log(`Imported ${rows.length} sales into Supabase.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
