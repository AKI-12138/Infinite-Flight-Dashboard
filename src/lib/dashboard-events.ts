// 統計カード（Hero 内 StatsGrid）のクリック → 対応する拡大表示を開くための疎結合イベント。
// StatsGrid と拡大オーバーレイ（MainDashboard）／フライトログ全画面（FlightLog）は別ツリーなので、
// モジュールイベントで繋ぐ（旧 render.js の openStatExpand / toggleFlightLogFullscreen 相当）。
// 複数コンポーネントが購読するので単発ではなく Set で保持。
export type StatExpandKind = 'flightlog' | 'aircraft' | 'routes' | 'airports' | 'countries' | 'flighttime';

const _listeners = new Set<(k: StatExpandKind) => void>();

export function emitStatExpand(kind: StatExpandKind): void {
  _listeners.forEach((l) => l(kind));
}

export function onStatExpand(fn: (k: StatExpandKind) => void): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}
