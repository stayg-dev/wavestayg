// Published rate-table prices (2026-09-20 revision).
// Display data only; reservation quotes are calculated separately.
export const rateTableSeasons = [
  { key: "off", label: "비수기", period: "9월~4월" },
  { key: "shoulder", label: "준성수기", period: "5월~6월" },
  { key: "high", label: "성수기", period: "7월 15일~8월 15일" },
  { key: "peak", label: "피크 시즌", period: "7월 23일~8월 8일" },
] as const;

type SeasonalRates = Record<(typeof rateTableSeasons)[number]["key"], readonly [number, number, number]>;

const standard: SeasonalRates = {
  off: [55000, 75000, 95000], shoulder: [75000, 95000, 115000],
  high: [125000, 155000, 178000], peak: [178000, 198000, 198000],
};
const deluxe: SeasonalRates = {
  off: [65000, 85000, 105000], shoulder: [85000, 105000, 125000],
  high: [135000, 165000, 188000], peak: [188000, 208000, 228000],
};
const junior: SeasonalRates = {
  off: [75000, 95000, 115000], shoulder: [95000, 115000, 135000],
  high: [145000, 175000, 198000], peak: [198000, 218000, 238000],
};
const premium: SeasonalRates = {
  off: [85000, 105000, 125000], shoulder: [105000, 125000, 145000],
  high: [155000, 185000, 208000], peak: [208000, 228000, 248000],
};
const loftFamily: SeasonalRates = {
  off: [95000, 115000, 135000], shoulder: [115000, 135000, 155000],
  high: [165000, 195000, 218000], peak: [218000, 238000, 258000],
};

export const seasonalRateTable = [
  { name: "스탠다드 더블 X", rates: standard },
  { name: "디럭스 더블 마운틴", rates: deluxe },
  { name: "디럭스 더블 하프오션", rates: deluxe },
  { name: "디럭스 트윈 하프오션", rates: deluxe },
  { name: "주니어 패밀리 오션", rates: junior },
  { name: "주니어 더블 오션", rates: junior },
  { name: "프리미엄 더블 오션", rates: premium },
  { name: "프리미엄 트윈 오션", rates: premium },
  { name: "로프트 더블 마운틴", rates: premium },
  { name: "로프트 트윈 오션", rates: premium },
  { name: "로프트 패밀리 마운틴", rates: loftFamily },
] as const;
