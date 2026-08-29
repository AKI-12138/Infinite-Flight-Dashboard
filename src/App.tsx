import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { DataSource, type StoredFlight } from './lib/datasource';
import { _setMemoOpenListener } from './lib/memo-events';
import { _setFlightEditListener } from './lib/flight-edit-events';
import { useFlights } from './hooks/useDataSource';
import { useTheme } from './hooks/useTheme';
import { useFilterVersion } from './hooks/useFilterState';
import { getFiltered } from './lib/compute';
import { availableOptions } from './lib/filter-options';
import { filterStore } from './lib/filter-store';
import { INITIAL_RESTORE, setOptOut, clearOptOut, markSessionSeen } from './lib/restore';
import { showToast } from './lib/toast';
import { confirmDeleteAll } from './lib/flight-actions';
import { focusFlightSearch } from './lib/flight-log-events';
import { Toast } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Hero } from './components/Hero';
import { EmptyState } from './components/EmptyState';
import { MapSection } from './components/MapSection';
import { MainDashboard } from './components/MainDashboard';
import { CompareSection } from './components/CompareSection';
import { RestoreModal } from './components/RestoreModal';
import { NotifyBanner } from './components/NotifyBanner';
import { FilterBar } from './components/filters/FilterBar';
import { AdvancedFilterPanel } from './components/filters/AdvancedFilterPanel';
import { CustomizeBarModal } from './components/filters/CustomizeBarModal';
import { AddFlightModal } from './components/modals/AddFlightModal';
import { BulkImportModal } from './components/modals/BulkImportModal';
import { ExportModal } from './components/modals/ExportModal';
import { DataCheckModal } from './components/modals/DataCheckModal';
import { AddAirportModal } from './components/modals/AddAirportModal';
import { FlightMemoModal } from './components/modals/FlightMemoModal';
import { SelfCheckModal } from './components/modals/SelfCheckModal';

// 手順5-1〜5-5：レイアウト外枠＋ヘッダ＋統計カード＋空状態＋ダッシュボード＋地図＋フィルターバー。
// アプリのバージョン表記（フッター下部に表示）。旧・静的版と同じ「vX.Y」を手動で維持する。
// ⚠️ これは旧版の cache-busting `?v=YYYYMMDD` とは無関係（キャッシュ破棄は Vite のハッシュが担当）。
//    純粋に「ユーザーに見せるバージョン札」＝リリースの区切りで手で上げる（CHANGELOG.md の最新版と一致させる）。
const APP_VERSION = 'v2.6';

function App() {
  const flights = useFlights();          // DataSource 変化で自動更新（＝全フライト）
  const theme = useTheme();              // auto/light/dark（<html data-theme> を管理）
  const filterVersion = useFilterVersion(); // フィルタ変化で filtered を再計算する合図
  const [advOpen, setAdvOpen] = useState(false);
  const [customizeBarOpen, setCustomizeBarOpen] = useState(false);
  // 入力系モーダル（5-6/5-7）。import は空状態導線からサンプル差し込みで開くことがある。
  const [modal, setModal] = useState<null | 'add' | 'import' | 'export' | 'datacheck' | 'selfcheck'>(null);
  const [importSample, setImportSample] = useState(false);
  const openImport = (sample = false) => { setImportSample(sample); setModal('import'); };
  // Add Airport は Data check の「+ Add」から上に開く（Data check は背後に残す）＝独立 state。
  const [addAirport, setAddAirport] = useState<{ open: boolean; icao: string }>({ open: false, icao: '' });
  // 復元モーダル：新セッション＋保存データありのときだけ開く（判定は module ロード時に確定）。
  const [restoreOpen, setRestoreOpen] = useState(INITIAL_RESTORE.mode === 'modal');
  // フライトメモ：FlightLog の行 📝／Add Flight の「Add + Notes」→ memo-events 経由でここが開く。
  const [memoFlight, setMemoFlight] = useState<StoredFlight | null>(null);
  useEffect(() => _setMemoOpenListener(setMemoFlight), []);
  // フライト編集：FlightLog の行の鉛筆 → flight-edit-events 経由で AddFlightModal を編集モードで開く。
  // 追加と同じモーダルを使い回す＝フライトへの書き込み口（と正規化）を 1 経路に保つ。
  const [editFlight, setEditFlight] = useState<StoredFlight | null>(null);
  useEffect(() => _setFlightEditListener(setEditFlight), []);

  // 復元判定に従う。silent＝module 初期化時に同期ロード済み（restore.ts でちらつき防止）／
  // modal＝ユーザー選択待ち／none＝空状態。ここでは URL 由来のフィルタだけ初期化する。
  useEffect(() => { filterStore.initFromURL(); }, []);

  // 自動保存が成功するたびに「✓ Auto-saved · CSV backup recommended」トースト（旧 main.js _onAutoSave）。
  //  ・500ms 以内の連続保存は間引く（1 操作で複数回保存される場合の二重トースト防止）。
  //  ・setTimeout(0) で 1 tick 遅らせ、呼び出し元の操作トースト（「✓ Flight added」等）が
  //    先にキューへ入るようにする → 「件数 → 消える → 自動保存済み」の順で出す。
  useEffect(() => {
    let lastAt = 0;
    return DataSource.onSaved(() => {
      // データが 0 件になった瞬間（Clear All 等）はトーストを出さない（旧 _onAutoSave と同じ）。
      // 直後に empty state / restore へ遷移するため、緑トーストが一瞬出るのが不自然。
      if (DataSource.count === 0) return;
      const now = Date.now();
      if (now - lastAt < 500) return;
      lastAt = now;
      setTimeout(() => showToast('✓ Auto-saved · CSV backup recommended', undefined, 2000), 0);
    });
  }, []);

  function doRestore() {
    markSessionSeen(); // 選択したので以降このタブの更新は自動復元（モーダルを再表示しない）。
    clearOptOut();
    void DataSource.load().then((ok) => {
      setRestoreOpen(false);
      showToast(ok ? `✓ Restored ${DataSource.count} flights` : 'No data to restore', ok ? undefined : 'red');
    });
  }
  function doStartFresh() {
    markSessionSeen(); // 選択したので以降このタブの更新でモーダルを再表示しない（opt-out で空状態のまま）。
    setOptOut();
    setRestoreOpen(false);
    showToast('Your data is still saved · close & reopen this tab to restore', undefined, 5000);
  }

  // 各フィルタで選べる選択肢は「全フライト」から算出（表示は filtered、選択肢は全件）。
  const options = useMemo(() => availableOptions(flights), [flights]);
  // データから消えた値を FilterState から除去（ゴーストフィルタ防止）。
  // ⚠️ データ未ロード（flights 空）の間は prune しない。URL 復元した空港/機材フィルタを
  //    データが来る前に空の選択肢と突き合わせて消してしまわないため。
  useEffect(() => { if (flights.length) filterStore.prune(options); }, [options, flights.length]);

  // フィルタ適用後データ。App で一度だけ計算し各セクションへ配る。
  // ⚠️ deps は flights（version キーのコピー）＋ filterVersion。DataSource の in-place 変異対策で
  //    配列参照ではなく version で追跡する（[[react-datasource-mutation-memo-pitfall]]）。
  const filtered = useMemo(() => getFiltered(flights), [flights, filterVersion]);

  // データの有無（全件）で body.is-empty を切替。フィルタで 0 件でも空状態にはしない（「該当なし」表示）。
  useLayoutEffect(() => {
    document.body.classList.toggle('is-empty', flights.length === 0);
  }, [flights.length]);

  const hasData = flights.length > 0;

  return (
    <>
      {/* Vercel Web Analytics（訪問数のみ・cookie 不使用・本番の Vercel 配信でのみ送信）。
          飛行データは一切送らない。dev では no-op。 */}
      <Analytics />
      <Toast />
      <NotifyBanner />
      <ConfirmDialog />
      <RestoreModal open={restoreOpen} summary={INITIAL_RESTORE.mode === 'modal' ? INITIAL_RESTORE.summary : null}
        onRestore={doRestore} onStartFresh={doStartFresh} />
      <Hero
        flights={filtered}
        theme={theme}
        onAddFlight={() => setModal('add')}
        onSearch={focusFlightSearch}
        onDataCheck={() => setModal('datacheck')}
        onImport={() => openImport(false)}
        onExport={() => setModal('export')}
        onClearAll={confirmDeleteAll}
        onCustomizeBar={() => setCustomizeBarOpen(true)}
        onSelfCheck={() => setModal('selfcheck')}
      />
      {/* フィルターバーはデータがある時だけ（空状態では CSS でも隠れる）。選択肢は全件から。 */}
      {hasData && <FilterBar options={options} onOpenAdvanced={() => setAdvOpen(true)} />}
      {/* 比較（YoY）は全フライトから集計＝フィルタ非依存。年が2種以上あるときだけ表示（内部で判定）。 */}
      {hasData && <CompareSection flights={flights} />}
      {/* 地図はデータがある時だけマウント（可視状態で Leaflet を初期化するため）。表示は filtered。 */}
      {hasData && <MapSection flights={filtered} themePref={theme.pref} />}
      <MainDashboard flights={filtered} themePref={theme.pref} />
      <EmptyState onImport={() => openImport(false)} onAdd={() => setModal('add')} onSample={() => openImport(true)} />
      {/* フッター（旧 index.html の .page-footer）。著作権＋バージョン札（旧版と同じ .app-version）。 */}
      <footer className="page-footer">© 2026 Infinite Flight Dashboard <span className="app-version">{APP_VERSION}</span></footer>
      <AdvancedFilterPanel open={advOpen} onClose={() => setAdvOpen(false)} options={options} />
      <CustomizeBarModal open={customizeBarOpen} onClose={() => setCustomizeBarOpen(false)} />
      <AddFlightModal
        open={modal === 'add' || editFlight !== null}
        editing={editFlight}
        onClose={() => { setEditFlight(null); setModal(null); }}
        flights={flights}
      />
      <BulkImportModal open={modal === 'import'} onClose={() => setModal(null)} initialSample={importSample} />
      <ExportModal open={modal === 'export'} onClose={() => setModal(null)} />
      <DataCheckModal open={modal === 'datacheck'} onClose={() => setModal(null)} flights={flights}
        onAddAirport={(icao) => setAddAirport({ open: true, icao })} />
      <AddAirportModal open={addAirport.open} initialIcao={addAirport.icao}
        onClose={() => setAddAirport((s) => ({ ...s, open: false }))} />
      <FlightMemoModal flight={memoFlight} onClose={() => setMemoFlight(null)} />
      <SelfCheckModal open={modal === 'selfcheck'} onClose={() => setModal(null)} />
    </>
  );
}

export default App;
