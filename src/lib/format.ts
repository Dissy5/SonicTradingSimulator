export function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.?0+$/, "")}K`;
  }
  return String(Math.trunc(value));
}

/** ISO date (YYYY-MM-DD) for the user's local calendar day. */
export function todayLocalDateString(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Display an ISO date as M/D/YYYY. */
export function formatTransactionDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  if (!year || !month || !day) return isoDate;
  return `${Number(month)}/${Number(day)}/${year}`;
}
