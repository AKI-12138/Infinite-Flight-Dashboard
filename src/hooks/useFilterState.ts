// フィルタ状態（filter-store）を React に接続するフック。
// version を購読し、フィルタが変わるたびに購読コンポーネントを再描画する。
// 実データは compute.ts の getFiltered() / FilterState を直接読む（version は「変わった」合図）。
import { useSyncExternalStore } from 'react';
import { filterStore } from '../lib/filter-store';

// フィルタ version（数値）。この値を deps に入れると getFiltered の再計算が走る。
export function useFilterVersion(): number {
  return useSyncExternalStore(filterStore.subscribe, filterStore.getVersion, filterStore.getVersion);
}
