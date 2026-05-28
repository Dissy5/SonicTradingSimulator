# Sonic Trading Simulator

Next.js app for tracking Sonic skin sale prices.

## Stack

- **Next.js** + TypeScript + Tailwind
- **Supabase** (Postgres) — shared sales data in the cloud
- **Skin catalog** — `src/data/character-skins.json`
- **Images** — `public/images/`

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase values
npm run dev
```

Open http://localhost:3000

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor (Dashboard → SQL)
3. Copy credentials from **Project Settings → API** into `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. (Optional) Import existing local sales:
   ```bash
   npm run db:import
   ```

Without `.env.local`, the app falls back to `data/sales.json` locally.

## Deploy (Vercel)

Add the same env vars in Vercel → Project Settings → Environment Variables. Friends hitting your deployed URL will all read/write the same Supabase data.

## Data model

- **Skin (catalog)** — character, name, rarity, image path (static JSON)
- **Sale** — character, skin, rarity, star level (1–6), price, timestamp (Supabase)

Star level is recorded per sale, not on the skin itself.
