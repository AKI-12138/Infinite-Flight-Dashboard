// =============================== CHIP META ===============================
// フィルタチップの「表示メタ」（短い名前・ツールチップ）とカテゴリ構成を集約。
// 以前は FilterBar（バーの6チップ）と AdvancedFilterPanel（全20軸のカテゴリ）に
// 別々にハードコードしていたが、フェーズA（バーのカスタマイズ）で両者が同じ全20軸メタを
// 参照する必要が出たため一本化した。key は FILTER_DEFS の key と一致させる。
//
// - title … チップのツールチップ（旧 index.html の markup を踏襲）。
// - name … カスタマイズ画面のチェックボックス用の短いラベル（scope は "Flights" だと
//           紛らわしいので "Domestic/Intl" にするなど、ここで明示的に持つ）。

export type ChipSpec = { key: string; name: string; title?: string };

// 高度パネル／カスタマイズ画面のカテゴリ構成（旧 AdvancedFilterPanel の _SECTIONS ＝ 旧 index.html の adv-section）。
export const CHIP_SECTIONS: { label: string; chips: ChipSpec[] }[] = [
  { label: 'Date', chips: [
    { key: 'year', name: 'Year' },
    { key: 'month', name: 'Month' },
    { key: 'weekday', name: 'Weekday' },
  ] },
  { label: 'Airport', chips: [
    { key: 'airports', name: 'Airport' },
    { key: 'depAirport', name: 'Dep airport' },
    { key: 'arrAirport', name: 'Arr airport' },
  ] },
  { label: 'Cities', chips: [
    { key: 'city', name: 'City' },
    { key: 'depCity', name: 'Dep city' },
    { key: 'arrCity', name: 'Arr city' },
  ] },
  { label: 'Countries / Regions', chips: [
    { key: 'country', name: 'Country' },
    { key: 'depCountry', name: 'Dep country' },
    { key: 'arrCountry', name: 'Arr country' },
    { key: 'scope', name: 'Domestic/Intl', title: 'Domestic = same country/region, International = crosses borders' },
  ] },
  { label: 'Continents', chips: [
    { key: 'continent', name: 'Continent' },
    { key: 'depContinent', name: 'Dep continent' },
    { key: 'arrContinent', name: 'Arr continent' },
    { key: 'contScope', name: 'Cont. scope' },
  ] },
  { label: 'Aircraft / Airline', chips: [
    { key: 'aircraft', name: 'Aircraft' },
    { key: 'airline', name: 'Airline' },
  ] },
  { label: 'Time', chips: [
    { key: 'duration', name: 'Duration' },
  ] },
];

// key → ChipSpec の逆引き（バー描画・カスタマイズ状態の照合に使う）。
export const CHIP_META: Record<string, ChipSpec> = Object.fromEntries(
  CHIP_SECTIONS.flatMap((s) => s.chips).map((c) => [c.key, c]),
);
