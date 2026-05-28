import Link from "next/link";

const links = [
  { href: "/", label: "Record Sale" },
  { href: "/sales", label: "Sales Log" },
  { href: "/add", label: "Catalog" },
];

export function Nav() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sonic Trading Simulator</h1>
          <p className="text-sm text-zinc-400">Track skin sale prices</p>
        </div>
        <nav className="flex gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
