import Link from "next/link";

import { SkinImage } from "@/components/SkinImage";
import { getSkinImagePath } from "@/lib/catalog";
import type { DashboardOverview } from "@/lib/dashboard-server";
import { formatPrice } from "@/lib/format";
import type { SkinCatalog } from "@/lib/types";

type DashboardHubProps = {
  overview: DashboardOverview;
  catalog: SkinCatalog;
  isAdmin: boolean;
};

const TOOL_LINKS = [
  {
    href: "/values",
    label: "Values",
    description: "Browse sale price tiers from logged transactions.",
  },
  {
    href: "/record",
    label: "Record transaction",
    description: "Log a sale or purchase with skin details and price.",
  },
  {
    href: "/transactions",
    label: "Transaction log",
    description: "View the full transaction history, yours or everyone’s.",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Change your display name, theme, and personal data.",
  },
] as const;

const ADMIN_TOOL_LINK = {
  href: "/add",
  label: "Catalog",
  description: "Manage characters, skins, and catalog images.",
} as const;

export function DashboardHub({ overview, catalog, isAdmin }: DashboardHubProps) {
  const { displayName, transactions, flips, shop } = overview;
  const toolLinks = isAdmin ? [...TOOL_LINKS, ADMIN_TOOL_LINK] : TOOL_LINKS;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-400">Welcome back, {displayName}.</p>
        </div>
        <Link
          href="/record"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Record transaction
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard
          title="Transactions"
          description="Sales and purchases you have logged."
          href="/transactions"
          linkLabel="View log"
        >
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Sales logged" value={String(transactions.saleCount)} />
            <Stat label="Purchases logged" value={String(transactions.purchaseCount)} />
            <Stat label="Sale volume" value={formatPrice(transactions.totalSaleVolume)} />
            <Stat
              label="Purchase volume"
              value={formatPrice(transactions.totalPurchaseVolume)}
            />
          </dl>
          {transactions.recent.length > 0 ? (
            <RecentList title="Recent activity">
              {transactions.recent.map((entry) => (
                <SkinListItem
                  key={entry.id}
                  catalog={catalog}
                  character={entry.character}
                  skin={entry.skin}
                  rarity={entry.rarity}
                  title={
                    <>
                      <span className={entry.type === "sale" ? "text-green-400" : "text-amber-400"}>
                        {entry.type === "sale" ? "Sale" : "Purchase"}
                      </span>
                      {" · "}
                      {entry.character} · {entry.skin}
                    </>
                  }
                  subtitle={`${entry.rarity} · ${entry.star}★`}
                  trailing={
                    <span className="shrink-0 font-medium text-zinc-200">
                      {formatPrice(entry.price)}
                    </span>
                  }
                />
              ))}
            </RecentList>
          ) : (
            <EmptyHint message="No transactions yet." href="/record" hrefLabel="Record one" />
          )}
        </DashboardCard>

        <DashboardCard
          title="Flips"
          description="Open purchases waiting for a sale, and closed flip profit."
          href="/flips"
          linkLabel="Manage flips"
        >
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Open flips" value={String(flips.openCount)} />
            <Stat label="Closed flips" value={String(flips.closedCount)} />
            <Stat label="Capital in open flips" value={formatPrice(flips.openBuyTotal)} />
            <Stat
              label="Realized profit"
              value={formatSignedPrice(flips.realizedProfit)}
              tone={flips.realizedProfit >= 0 ? "positive" : "negative"}
            />
          </dl>
          {flips.recentOpen.length > 0 ? (
            <RecentList title="Open flips">
              {flips.recentOpen.map((flip) => (
                <SkinListItem
                  key={flip.id}
                  catalog={catalog}
                  character={flip.character}
                  skin={flip.skin}
                  rarity={flip.rarity}
                  href={`/flips/${flip.id}`}
                  title={`${flip.character} · ${flip.skin}`}
                  subtitle={`${flip.rarity} · ${flip.star}★`}
                  trailing={
                    <span className="shrink-0 text-right text-zinc-400">
                      <span className="block">Buy {formatPrice(flip.buyPrice)}</span>
                      {flip.plannedSellPrice != null ? (
                        <span className="block text-zinc-500">
                          Plan {formatPrice(flip.plannedSellPrice)}
                        </span>
                      ) : null}
                    </span>
                  }
                />
              ))}
            </RecentList>
          ) : (
            <EmptyHint message="No open flips." href="/flips" hrefLabel="Start a flip" />
          )}
        </DashboardCard>

        <DashboardCard
          title="Shop"
          description="Skins you currently have listed for sale."
          href="/shop"
          linkLabel="Open shop"
        >
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Active listings" value={String(shop.listingCount)} />
            <Stat label="Slots remaining" value={String(shop.slotsRemaining)} />
            <Stat
              label="Listed value"
              value={formatPrice(shop.totalListingValue)}
              className="col-span-2"
            />
          </dl>
          {shop.recentListings.length > 0 ? (
            <RecentList title="Listed skins">
              {shop.recentListings.map((listing) => (
                <SkinListItem
                  key={listing.slotIndex}
                  catalog={catalog}
                  character={listing.character}
                  skin={listing.skin}
                  rarity={listing.rarity}
                  href="/shop"
                  title={`${listing.character} · ${listing.skin}`}
                  subtitle={`${listing.rarity} · ${listing.star}★`}
                  trailing={
                    <span className="shrink-0 font-medium text-blue-300">
                      {formatPrice(listing.price)}
                    </span>
                  }
                />
              ))}
            </RecentList>
          ) : (
            <EmptyHint message="Shop is empty." href="/shop" hrefLabel="Add a listing" />
          )}
        </DashboardCard>

        <article className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div>
            <h3 className="text-lg font-semibold">Tools</h3>
            <p className="mt-1 text-sm text-zinc-400">Quick links to other parts of the simulator.</p>
          </div>
          <ul className="space-y-2">
            {toolLinks.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="block rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-100">{tool.label}</span>
                  <p className="mt-1 text-sm text-zinc-400">{tool.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function SkinListItem({
  catalog,
  character,
  skin,
  rarity,
  title,
  subtitle,
  trailing,
  href,
}: {
  catalog: SkinCatalog;
  character: string;
  skin: string;
  rarity: string;
  title: React.ReactNode;
  subtitle: string;
  trailing: React.ReactNode;
  href?: string;
}) {
  const imagePath = getSkinImagePath(catalog, character, skin, rarity);

  const content = (
    <>
      <SkinImage src={imagePath} alt={`${character} ${skin}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-zinc-300">{title}</p>
        <p className="truncate text-xs text-zinc-500">{subtitle}</p>
      </div>
      {trailing}
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-3 rounded-lg outline-offset-2 hover:bg-zinc-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-3">{content}</div>
      )}
    </li>
  );
}

function DashboardCard({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </article>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}) {
  const valueClass =
    tone === "positive"
      ? "text-green-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-zinc-100";

  return (
    <div className={className}>
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}

function RecentList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800 pt-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function EmptyHint({
  message,
  href,
  hrefLabel,
}: {
  message: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <p className="text-sm text-zinc-500">
      {message}{" "}
      <Link href={href} className="text-blue-400 hover:text-blue-300">
        {hrefLabel}
      </Link>
    </p>
  );
}

function formatSignedPrice(value: number): string {
  if (value > 0) return `+${formatPrice(value)}`;
  if (value < 0) return `-${formatPrice(Math.abs(value))}`;
  return formatPrice(0);
}
