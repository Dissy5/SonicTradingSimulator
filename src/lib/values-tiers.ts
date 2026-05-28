export type ValueTierDefinition = {
  label: string;
  min: number | null;
  max: number | null;
};

/** Highest tier first; last tier is skins with no sale data. */
export const VALUE_TIER_DEFINITIONS: ValueTierDefinition[] = [
  { label: "500K+", min: 500_000, max: null },
  { label: "200K–499K", min: 200_000, max: 499_999 },
  { label: "100K–199K", min: 100_000, max: 199_999 },
  { label: "50K–99K", min: 50_000, max: 99_999 },
  { label: "25K–49K", min: 25_000, max: 49_999 },
  { label: "10K–24K", min: 10_000, max: 24_999 },
  { label: "5K–9K", min: 5_000, max: 9_999 },
  { label: "1K–4K", min: 1_000, max: 4_999 },
  { label: "1–999", min: 1, max: 999 },
  { label: "No sales", min: null, max: null },
];

export function tierIndexForAverage(averagePrice: number | null): number {
  if (averagePrice == null) {
    return VALUE_TIER_DEFINITIONS.length - 1;
  }

  for (let index = 0; index < VALUE_TIER_DEFINITIONS.length - 1; index++) {
    const tier = VALUE_TIER_DEFINITIONS[index];
    const min = tier.min ?? 0;
    const meetsMin = averagePrice >= min;
    const meetsMax = tier.max == null || averagePrice <= tier.max;
    if (meetsMin && meetsMax) {
      return index;
    }
  }

  return VALUE_TIER_DEFINITIONS.length - 1;
}
