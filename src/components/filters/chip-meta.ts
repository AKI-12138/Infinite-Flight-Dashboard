// =============================== CHIP META ===============================
// フィルタチップの「表示メタ」（絵文字・短い名前・ツールチップ）とカテゴリ構成を集約。
// 以前は FilterBar（バーの6チップ）と AdvancedFilterPanel（全20軸のカテゴリ）に
// 別々にハードコードしていたが、フェーズA（バーのカスタマイズ）で両者が同じ全20軸メタを
// 参照する必要が出たため一本化した。key は FILTER_DEFS の key と一致させる。
//
// - emoji / title … 旧 index.html の markup を踏襲（見た目を変えない）。
// - name … カスタマイズ画面のチェックボックス用の短いラベル（scope は "Flights" だと
//           紛らわしいので "Domestic/Intl" にするなど、ここで明示的に持つ）。

export type ChipSpec = { key: string; emoji: string; name: string; title?: string };

// 高度パネル／カスタマイズ画面のカテゴリ構成（旧 AdvancedFilterPanel の _SECTIONS ＝ 旧 index.html の adv-section）。
export const CHIP_SECTIONS: { label: string; chips: ChipSpec[] }[] = [
  { label: 'Date', chips: [
    { key: 'year', emoji: '🗓️', name: 'Year' },
    { key: 'month', emoji: '📅', name: 'Month' },
    { key: 'weekday', emoji: '📆', name: 'Weekday' },
  ] },
  { label: 'Airport', chips: [
    { key: 'airports', emoji: '📍', name: 'Airport' },
    { key: 'depAirport', emoji: '🛫', name: 'Dep airport' },
    { key: 'arrAirport', emoji: '🛬', name: 'Arr airport' },
  ] },
  { label: 'Cities', chips: [
    { key: 'city', emoji: '🏙️', name: 'City' },
    { key: 'depCity', emoji: '🛫', name: 'Dep city' },
    { key: 'arrCity', emoji: '🛬', name: 'Arr city' },
  ] },
  { label: 'Countries / Regions', chips: [
    { key: 'country', emoji: '🏞️', name: 'Country' },
    { key: 'depCountry', emoji: '🛫', name: 'Dep country' },
    { key: 'arrCountry', emoji: '🛬', name: 'Arr country' },
    { key: 'scope', emoji: '🌐', name: 'Domestic/Intl', title: 'Domestic = same country/region, International = crosses borders' },
  ] },
  { label: 'Continents', chips: [
    { key: 'continent', emoji: '🗺️', name: 'Continent' },
    { key: 'depContinent', emoji: '🌍', name: 'Dep continent' },
    { key: 'arrContinent', emoji: '🌏', name: 'Arr continent' },
    { key: 'contScope', emoji: '🧭', name: 'Cont. scope' },
  ] },
  { label: 'Aircraft / Airline', chips: [
    { key: 'aircraft', emoji: '✈️', name: 'Aircraft' },
    { key: 'airline', emoji: '🏢', name: 'Airline' },
  ] },
  { label: 'Time', chips: [
    { key: 'duration', emoji: '⏱️', name: 'Duration' },
  ] },
];

// key → ChipSpec の逆引き（バー描画・カスタマイズ状態の照合に使う）。
export const CHIP_META: Record<string, ChipSpec> = Object.fromEntries(
  CHIP_SECTIONS.flatMap((s) => s.chips).map((c) => [c.key, c]),
);
