// DataSource（単一のデータ境界）を React に繋ぐフック。
// React 標準の useSyncExternalStore で DataSource を購読する（外部ライブラリ不要）。
// DataSource が変化（追加/削除/復元/dirty/保存）するたびに getVersion() が増え、
// 購読中のコンポーネントが再描画される。データ本体は DataSource から直接読む。
import { useMemo, useSyncExternalStore } from 'react';
import { DataSource, type StoredFlight, type CustomAirport } from '../lib/datasource';

// 現在のバージョン番号を購読する低レベルフック。
// 返り値自体はあまり使わない（変化検知のトリガ）。データは各 use* で DataSource から読む。
export function useDataSourceVersion(): number {
  return useSyncExternalStore(
    DataSource.subscribe,
    DataSource.getVersion,
    DataSource.getVersion, // SSR は無いが getServerSnapshot 必須のため同じものを渡す
  );
}

// フライト一覧（正準・no 付き）。DataSource 変化で自動更新される。
// ⚠️ DataSource は `_flights` を in-place 変異させる（addFlights の push 等）ため、
//    生の `DataSource.flights` は参照が変わらない。それを直接返すと、下流の
//    `useMemo([flights])`（例: MainDashboard の getFiltered/computeAll）が再計算されず
//    データ更新を取りこぼす。version をキーにコピーを返し、変化時だけ参照を更新する。
export function useFlights(): StoredFlight[] {
  const v = useDataSourceVersion();
  return useMemo(() => DataSource.flights.slice(), [v]);
}

// カスタム空港マップ。DataSource 変化で自動更新される（useFlights と同じ理由でコピーを返す）。
export function useCustomAirports(): Record<string, CustomAirport> {
  const v = useDataSourceVersion();
  return useMemo(() => ({ ...DataSource.customAirports }), [v]);
}

// 保存状態のスナップショット（件数・dirty・ストレージ可否・直近保存エラー）。
export function useDataSourceStatus() {
  useDataSourceVersion();
  return {
    count: DataSource.count,
    dirty: DataSource.dirty,
    storageAvailable: DataSource.isStorageAvailable(),
    saveError: DataSource.saveError,
  };
}
