/** Sale at this age counts half as much as a sale from today. */
export const VALUES_WEIGHT_HALF_LIFE_DAYS = 21;

export type WeightedPriceEntry = {
  price: number;
  date: string;
};

function parseLocalDate(isoDate: string): Date | null {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function localCalendarDaysBetween(earlierIso: string, later: Date): number {
  const earlier = parseLocalDate(earlierIso);
  if (!earlier) return 0;

  const laterDay = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierDay = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const diffMs = laterDay.getTime() - earlierDay.getTime();
  return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
}

/** Exponential decay: today's sales weight 1; weight halves every `VALUES_WEIGHT_HALF_LIFE_DAYS`. */
export function transactionDateWeight(
  dateIso: string,
  referenceDate: Date = new Date()
): number {
  const daysOld = localCalendarDaysBetween(dateIso, referenceDate);
  return 0.5 ** (daysOld / VALUES_WEIGHT_HALF_LIFE_DAYS);
}

export function weightedAveragePrice(
  entries: WeightedPriceEntry[],
  referenceDate: Date = new Date()
): number | null {
  if (entries.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const entry of entries) {
    const weight = transactionDateWeight(entry.date, referenceDate);
    if (weight <= 0) continue;
    weightedSum += entry.price * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}
