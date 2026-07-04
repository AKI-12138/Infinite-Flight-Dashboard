import { useEffect, useMemo, useRef, useState } from 'react';
import { DataSource, type StoredFlight } from '../lib/datasource';
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
const SORT_KEYS = ['no', 'date', 'dep', 'ac', 'al', 't'] as const;
const HEADERS = ['#', 'Date', 'Route', 'Aircraft', 'Airline', 'Duration'];

export function FlightLog({ flights }: { flights: StoredFlight[] }) {
  // 既定は # 降順＝直近（新しい日付）のフライトが上（旧版 render-table の sortCol=0/sortAsc=false と同じ）。
  const [sort, setSort] = useState<{ col: number; asc: boolean } | null>({ col: 0, asc: false });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const savedScroll = useRef(0);

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
      const av = String(a[key]); const bv = String(b[key]);
      return sort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [searched, sort]);

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
    requestConfirm({
      title: `Delete Flight #${f.no}?`,
      message: <>Remove <strong>{f.dep} → {f.arr}</strong> on {f.date} ({f.ac}, {f.al})?<br />This cannot be undone.</>,
      confirmLabel: '🗑️ Delete',
      onConfirm: () => { DataSource.removeByIds([f.no]); setSelectedIds(new Set()); showToast('🗑️ 1 flight deleted', 'red'); },
    });
  }

  function deleteSelected() {
    const ids = [...selectedIds];
    const cnt = ids.length;
    if (cnt === 0) return;
    requestConfirm({
      title: `Delete ${cnt} Flight${cnt > 1 ? 's' : ''}?`,
      message: <>This will permanently remove <strong>{cnt} flight{cnt > 1 ? 's' : ''}</strong> from your log.<br />This action cannot be undone.</>,
      confirmLabel: '🗑️ Delete',
      onConfirm: () => { DataSource.removeByIds(ids); setSelectedIds(new Set()); showToast(`🗑️ ${cnt} flights deleted`, 'red'); },
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

      <div className={'card table-section' + (fullscreen ? ' card-fullscreen' : '')}>
        <div className="card-header">
          <div className="card-title">📋 Flight Log</div>
          <div className="table-tools">
            <div className="search-input">
              <span style={{ color: 'var(--text-3)' }}>🔍</span>
              <input
                ref={searchRef} id="logSearch"
                placeholder="RJTT→RJOO  /  ANA  /  2025  /  -RJOO …"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!(sort && sort.col === 0 && !sort.asc) && (
              <button className="card-expand-btn" onClick={() => setSort({ col: 0, asc: false })} title="Reset sort — newest first">↺</button>
            )}
            <button className="btn-danger" onClick={confirmDeleteAll} title="Delete all flights">🗑️ Clear All</button>
            <button className="card-expand-btn" onClick={toggleFullscreen} title={fullscreen ? 'Close' : 'Expand'}>
              {fullscreen ? '✕' : '⛶'}
            </button>
          </div>
        </div>

        {/* 選択アクションバー */}
        <div className={'select-bar' + (selectedIds.size > 0 ? ' show' : '')}>
          <span className="sel-count">{selectedIds.size} selected</span>
          <button className="btn-cancel" onClick={clearSelection}>Cancel</button>
          <button className="btn-danger-solid" onClick={deleteSelected}>🗑️ Delete Selected</button>
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
                return (
                  <tr key={f.no} className={isSel ? 'selected' : ''}>
                    <td className="cb-wrap">
                      <input type="checkbox" className="cb" checked={isSel} onChange={(e) => toggleRow(f.no, e.target.checked)} />
                    </td>
                    <td className="date-tag">{f.no}</td>
                    <td className="date-tag">{f.date}</td>
                    <td className="route-tag">{f.dep} → {f.arr}</td>
                    <td><span className="aircraft-tag">{f.ac}</span></td>
                    <td className="airline-tag">{f.al}</td>
                    <td className="time-tag">{f.t}</td>
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
