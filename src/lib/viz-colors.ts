// =============================== VISUALIZATION COLORS ===============================
// 旧 render.js の BAR_GRADIENTS と render-charts.js の CT_COLORS / 年グラデーションを集約。
// バー（HTML）とチャート（Chart.js）の双方が参照する固定色。テーマ非依存（意味のある配色）。

// Top-N 横バーのグラデーション（[開始色, 終了色]）。カード種別ごとに固定。
export const BAR_GRADIENTS: Record<string, [string, string]> = {
  aircraft: ['#ff4d6a', '#e6003a'],
  airlines: ['#ffb020', '#e09000'],
  routes: ['#3b9eff', '#0070e0'],
  airports: ['#00d68f', '#00a86b'],
  countries: ['#9d7aff', '#7b4dff'],
  cities: ['#ff8a3d', '#e06a1a'],
};

// 大陸ドーナツの配色（隣接ハイライトでも区別できる分散配色）。
export const CT_COLORS: Record<string, string> = {
  Asia: '#3b9eff',
  Europe: '#9d7aff',
  Oceania: '#00d68f',
  'North America': '#ff4d6a',
  'South America': '#ff8a3d',
  Africa: '#ffd400',
  Antarctica: '#b8c5d6',
};

// 年バーの循環配色（年数が色数を超えたら先頭へ回る）。
export const YEAR_COLORS = [
  '#3b9eff', '#9d7aff', '#00d68f', '#ffb020',
  '#ff4d6a', '#00d4ff', '#ff8a3d', '#ff6b9d',
];

// 個別フライト（Top Flights by Time）バーのシアン・グラデーション。
export const TIME_GRADIENT: [string, string] = ['#00d4ff', '#0095c8'];
