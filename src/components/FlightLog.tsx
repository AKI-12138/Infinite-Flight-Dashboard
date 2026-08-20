import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { DataSource, type StoredFlight } from '../lib/datasource';
import { memoStore } from '../lib/memo-store';
import { openFlightMemo } from '../lib/memo-events';
import { parseMin } from '../lib/compute';
import { fmtHM } from '../lib/format';
import { filterFlightsByQuery } from '../lib/flight-search';
import { requestConfirm } from '../lib/confirm';
import { confirmDeleteAll } from '../lib/flight-actions';
import { showToast } from '../lib/toast';
import { _setFocusSearchListener } from '../lib/flight-log-events';
import { onStatExpand } from '../lib/dashboard-events';
import { activatable } from '../lib/a11y';
import { pushEscape } from '../lib/escape-stack';

// フライトログテーブル（旧 render-table.js + index.html の .card.table-section）。
// 描画・ソート・選択・検索・削除（確認つき）・フルスクリーン拡大。
// 削除は必ず ConfirmDialog（requestConfirm）を経由する＝破壊的操作の確認を壊さない。
const SORT_KEYS = ['no', 'date', 'dep', 'ac', 'al', 't', 'notes'] as const;
const HEADERS = ['#', 'Date', 'Route', 'Aircraft', 'Airline', 'Duration', 'Notes'];

export function FlightLog({ flights }: { flights: StoredFlight[] }) {
  // 既定は # 降順＝直近（新しい日付）のフライトが上（旧版 render-table の sortCol=0/sortAsc=false と同じ）。
  const [sort, setSort] = useState<{ col: number; asc: boolean } | null>({ col: 0, asc: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const savedScroll = useRef(0);
  // メモの追加/削除で行の 📝 表示と Notes 列ソートを更新するための購読。
  const memoVersion = useSyncExternalStore(memoStore.subscribe, memoStore.getVersion, memoStore.getVersion);

  // ヘッダ ≡「Search flights」→ 拡大して検索欄にフォーカス。
  useEffect(() => _setFocusSearchListener(() => {
    setFullscreen(true);
    setTimeout(() => searchRef.current?.focus(), 120);
  }), []);

  // Flights 統計カードのクリック → フライトログ全画面をトグル（旧 toggleFlightLogFullscreen）。
  useEffect(() => onStatExpand((k) => { if (k === 'flightlog') setFullscreen((f) => !f); }), []);

  // 追加 / 削除 / インポートで DataSource が _renumber すると no が日付順に振り直され、no 基準の
  // selectedIds が別フライトを指しうる（＝Delete Selected で誤ったフライトを消す危険）。グローバル件数が
  // 変わったら選択を破棄して誤操作を防ぐ（フィルタ/検索/エクスポートでは件数が変わらない＝選択は保つ）。
  useEffect(() => {
    let lastCount = DataSource.count;
    return DataSource.subscribe(() => {
      if (DataSource.count !== lastCount) { lastCount = DataSource.count; setSelectedIds(new Set()); }
    });
  }, []);

  // フルスクリーン時は body にクラス（背後スクロール抑止・CSS 側で制御）＋ESC で閉じる
  // （escape-stack に積む＝他モーダルと同じ閉じ順。旧版は ESC で全画面表を閉じられた）。
  useEffect(() => {
    document.body.classList.toggle('has-fullscreen-card', fullscreen);
    if (!fullscreen) return () => document.body.classList.remove('has-fullscreen-card');
    const releaseEsc = pushEscape(() => setFullscreen(false));
    return () => { document.body.classList.remove('has-fullscreen-card'); releaseEsc(); };
  }, [fullscreen]);

  // 検索 → ソートの順に適用（旧 filterFlights → sortTable）。
  const searched = useMemo(() => filterFlightsByQuery(flights, search), [flights, search]);
  const rows = useMemo(() => {
    if (!sort) return searched;
    const key = SORT_KEYS[sort.col];
    const arr = searched.slice();
    arr.sort((a, b) => {
      if (key === 'no') return sort.asc ? a.no - b.no : b.no - a.no;
      if (key === 't') return sort.asc ? parseMin(a.t) - parseMin(b.t) : parseMin(b.t) - parseMin(a.t);
      if (key === 'notes') {
        // Notes 列は初回クリック（asc）で「記入あり」が上＝見たい並びを先に出す。同値は元の順（安定ソート）。
        const av = memoStore.has(a.id) ? 1 : 0; const bv = memoStore.has(b.id) ? 1 : 0;
        return sort.asc ? bv - av : av - bv;
      }
      const av = String(a[key]); const bv = String(b[key]);
      return sort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
    // memoVersion：メモの追加/削除で Notes 列ソートを再計算（memoStore は外部ストアなので依存に含める）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, sort, memoVersion]);

  // 選択状態（表示中の行に対して）。
  const displayedNos = rows.map((r) => r.no);
  const selectedInView = displayedNos.filter((n) => selectedIds.has(n)).length;
  const allChecked = displayedNos.length > 0 && selectedInView === displayedNos.length;
  const partial = selectedInView > 0 && !allChecked;

  function toggleSort(col: number) {
    setSort((cur) => (cur && cur.col === col ? { col, asc: !cur.asc } : { col, asc: true }));
  }

  function toggleRow(no: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(no); else next.delete(no);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) displayedNos.forEach((n) => next.delete(n));
      else displayedNos.forEach((n) => next.add(n));
      return next;
    });
  }

  function clearSelection() { setSelectedIds(new Set()); }

  function deleteOne(f: StoredFlight) {
    // メモ付きフライトはメモも一緒に消えることを明記（破壊的操作の確認を壊さない）。
    const hasNote = memoStore.has(f.id);
    requestConfirm({
      title: `Delete Flight #${f.no}?`,
      message: <>Remove <strong>{f.dep} → {f.arr}</strong> on {f.date} ({f.ac}, {f.al})?
        {hasNote && <><br />Its saved flight notes will be deleted too.</>}<br />This cannot be undone.</>,
      confirmLabel: 'Delete',
      onConfirm: () => { DataSource.removeByIds([f.no]); setSelectedIds(new Set()); showToast('1 flight deleted', 'red'); },
    });
  }

  function deleteSelected() {
    const ids = [...selectedIds];
    const cnt = ids.length;
    if (cnt === 0) return;
    const memoCnt = flights.filter((f) => selectedIds.has(f.no) && memoStore.has(f.id)).length;
    requestConfirm({
      title: `Delete ${cnt} Flight${cnt > 1 ? 's' : ''}?`,
      message: <>This will permanently remove <strong>{cnt} flight{cnt > 1 ? 's' : ''}</strong> from your log.
        {memoCnt > 0 && <><br />{memoCnt} saved flight note{memoCnt > 1 ? 's' : ''} will be deleted too.</>}<br />This action cannot be undone.</>,
      confirmLabel: 'Delete',
      onConfirm: () => { DataSource.removeByIds(ids); setSelectedIds(new Set()); showToast(` flights deleted`, 'red'); },
    });
  }

  function toggleFullscreen() {
    setFullscreen((prev) => {
      if (prev) { window.scrollTo(0, savedScroll.current); return false; }
      savedScroll.current = window.scrollY || window.pageYOffset || 0;
      return true;
    });
  }

  const totalMin = rows.reduce((s, f) => s + parseMin(f.t), 0);

  return (
    <>
      {/* フルスクリーン時の背景（クリックで閉じる） */}
      <div className={'fullscreen-backdrop' + (fullscreen ? ' show' : '')} onClick={toggleFullscreen} />

      {/* id は上部フィルターバーの「Jump」導線（K-3）の飛び先。カード自身が
          「Flight Log」という見出しを持つので、上に別の見出しは置かない。 */}
      <div id="sec-log" className={'card table-section' + (fullscreen ? ' card-fullscreen' : '')}>
        <div className="card-header">
          <div className="card-title">Flight Log</div>
          <div className="table-tools">
            <div className="search-input">
              <span style={{ color: 'var(--text-3)' }}>🔍</span>
              <input
                ref={searchRef} id="logSearch"
                placeholder="RJTT→RJOO  /  ANA  /  2025  /  -RJOO …"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-danger" onClick={confirmDeleteAll} title="Delete all flights">Clear All</button>
            {/* ソートリセット ↺＝Clear All の右・⛶ の左（オーナー指定 2026-07-12。モバイルは絶対配置で ⛶ の真下） */}
            {!(sort && sort.col === 0 && !sort.asc) && (
              <button className="card-expand-btn sort-reset-btn" onClick={() => setSort({ col: 0, asc: false })} title="Reset sort — newest first">↺</button>
            )}
            <button className="card-expand-btn" onClick={toggleFullscreen} title={fullscreen ? 'Close' : 'Expand'}>
              {fullscreen ? '✕' : '⛶'}
            </button>
          </div>
        </div>

        {/* 選択アクションバー */}
        <div className={'select-bar' + (selectedIds.size > 0 ? ' show' : '')}>
          <span className="sel-count">{selectedIds.size} selected</span>
          <button className="btn-cancel" onClick={clearSelection}>Cancel</button>
          <button className="btn-danger-solid" onClick={deleteSelected}>Delete Selected</button>
        </div>

        <div className="table-wrap">
          <table className="ftable">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox" className={'cb' + (partial ? ' partial' : '')}
                    checked={allChecked} onChange={toggleAll}
                  />
                </th>
                {HEADERS.map((h, i) => (
                  <th
                    key={h} onClick={() => toggleSort(i)}
                    aria-sort={sort && sort.col === i ? (sort.asc ? 'ascending' : 'descending') : 'none'}
                    {...activatable(() => toggleSort(i))}
                  >
                    {h} {sort && sort.col === i ? (sort.asc ? '▴' : '▾') : '▾'}
                  </th>
                ))}
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const isSel = selectedIds.has(f.no);
                const hasNote = memoStore.has(f.id);
                return (
                  <tr key={f.id} className={isSel ? 'selected' : ''}>
                    <td className="cb-wrap">
                      <input type="checkbox" className="cb" checked={isSel} onChange={(e) => toggleRow(f.no, e.target.checked)} />
                    </td>
                    <td className="date-tag">{f.no}</td>
                    <td className="date-tag">{f.date}</td>
                    <td className="route-tag">{f.dep} → {f.arr}</td>
                    <td><span className="aircraft-tag">{f.ac}</span></td>
                    <td className="airline-tag">{f.al}</td>
                    <td className="time-tag">{f.t}</td>
                    <td className="note-cell">
                      {/* Notes 専用列：記入あり＝📝（入り口）／なし＝＋（追加）。常時表示。 */}
                      <button className={'row-note-btn' + (hasNote ? ' has-note' : ' row-note-add')} onClick={() => openFlightMemo(f)}
                        title={hasNote ? 'View flight notes' : 'Add flight notes'}>{hasNote ? '📝' : '+'}</button>
                    </td>
                    <td><button className="row-delete-btn" onClick={() => deleteOne(f)} title="Delete">✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 拡大時のみ表示されるサマリーフッター（CSS 制御） */}
        <div className="flight-log-footer">
          <span>{rows.length} flight{rows.length === 1 ? '' : 's'}</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span>{fmtHM(totalMin)} total</span>
        </div>
      </div>
    </>
  );
}
