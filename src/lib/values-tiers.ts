export type ValueTierDefinition = {
  label: string;
  min: number | null;
  max: number | null;
};

/** Highest tier first; last tier is skins with no sale data. */
export const VALUE_TIER_DEFINITIONS: ValueTierDefinition[] = [
  { label: "2M +", min: 2_000_000, max: null },
  { label: "1.75M - 2M", min: 1_750_000, max: 1_999_999 },
  { label: "1.5M - 1.75M", min: 1_500_000, max: 1_749_999 },
  { label: "1.25M - 1.5M", min: 1_250_000, max: 1_499_999 },
  { label: "1M - 1.25M", min: 1_000_000, max: 1_249_999 },
  { label: "900K - 1M", min: 900_000, max: 999_999 },
  { label: "800K - 900K", min: 800_000, max: 899_999 },
  { label: "700K - 800K", min: 700_000, max: 799_999 },
  { label: "600K - 700K", min: 600_000, max: 699_999 },
  { label: "500K - 600K", min: 500_000, max: 599_999 },
  { label: "450K - 500K", min: 450_000, max: 499_999 },
  { label: "400K - 450K", min: 400_000, max: 449_999 },
  { label: "350K - 400K", min: 350_000, max: 399_999 },
  { label: "300K - 350K", min: 300_000, max: 349_999 },
  { label: "250K - 300K", min: 250_000, max: 299_999 },
  { label: "200K - 250K", min: 200_000, max: 249_999 },
  { label: "150K - 200K", min: 150_000, max: 199_999 },
  { label: "125K - 150K", min: 125_000, max: 149_999 },
  { label: "100K - 125K", min: 100_000, max: 124_999 },
  { label: "90K - 100K", min: 90_000, max: 99_999 },
  { label: "80K - 90K", min: 80_000, max: 89_999 },
  { label: "70K - 80K", min: 70_000, max: 79_999 },
  { label: "60K - 70K", min: 60_000, max: 69_999 },
  { label: "50K - 60K", min: 50_000, max: 59_999 },
  { label: "40K - 50K", min: 40_000, max: 49_999 },
  { label: "35K - 40K", min: 35_000, max: 39_999 },
  { label: "30K - 35K", min: 30_000, max: 34_999 },
  { label: "25K - 30K", min: 25_000, max: 29_999 },
  { label: "20K - 25K", min: 20_000, max: 24_999 },
  { label: "15K - 20K", min: 15_000, max: 19_999 },
  { label: "12K - 15K", min: 12_000, max: 14_999 },
  { label: "10K - 12K", min: 10_000, max: 11_999 },
  { label: "9000 - 10K", min: 9_000, max: 9_999 },
  { label: "8000 - 9000", min: 8_000, max: 8_999 },
  { label: "7000 - 8000", min: 7_000, max: 7_999 },
  { label: "6000 - 7000", min: 6_000, max: 6_999 },
  { label: "5000 - 6000", min: 5_000, max: 5_999 },
  { label: "4000 - 5000", min: 4_000, max: 4_999 },
  { label: "3000 - 4000", min: 3_000, max: 3_999 },
  { label: "2000 - 3000", min: 2_000, max: 2_999 },
  { label: "1000 - 2000", min: 1_000, max: 1_999 },
  { label: "100 - 1000", min: 100, max: 999 },
  { label: "1 - 100", min: 1, max: 99 },
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
