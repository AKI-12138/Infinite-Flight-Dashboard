import { useEffect, useRef, useState } from 'react';
import { FilterState } from '../../lib/compute';
import { FILTER_DEFS, _ADV_FILTER_KEYS, type FilterDef } from '../../lib/filters-config';
import { filterStore } from '../../lib/filter-store';
import { useFilterVersion } from '../../hooks/useFilterState';
import type { FilterOptionsMap } from '../../lib/filter-options';
import { FilterChip } from './FilterChip';
import { CHIP_META } from './chip-meta';

const _DEF_BY_KEY: Record<string, FilterDef> = Object.fromEntries(FILTER_DEFS.map((d) => [d.key, d]));

// 適用中フィルター総数（各軸の選択値数の合計）。
function totalActiveCount(): number {
  return FILTER_DEFS.reduce((n, def) => n + ((FilterState as unknown as Record<string, string[]>)[def.stateKey]?.length || 0), 0);
}
// 範囲系の軸（配列長 2 でも「1 フィルター」として数える）。
const _RANGE_KEYS = new Set(['durationRange', 'dateRange']);
// 高度パネル内の軸で適用中の数（範囲系は 1 とカウント）。⚙ ボタンのバッジ。
function advActiveCount(): number {
  const FS = FilterState as unknown as Record<string, unknown[]>;
  return _ADV_FILTER_KEYS.reduce((n, k) => n + (_RANGE_KEYS.has(k) ? (FS[k]?.length ? 1 : 0) : (FS[k]?.length || 0)), 0);
}

// フィルターバー（旧 index.html の .filter-bar ＋ main.js の toggleFilterBar / sticky shadow / back-to-top）。
export function FilterBar({ options, onOpenAdvanced }: { options: FilterOptionsMap; onOpenAdvanced: () => void }) {
  useFilterVersion();
  const [collapsed, setCollapsed] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const backTopRef = useRef<HTMLButtonElement>(null);

  const anyActive = filterStore.isAnyActive();
  const totalCount = totalActiveCount();
  const advCount = advActiveCount();
  // 常時表示チップはユーザー設定（フェーズA）。未カスタマイズなら既定の6軸。
  const barKeys = filterStore.getBarChips();

  // sticky で上端に貼り付いたら影（.stuck）／スクロールで back-to-top（.show）。旧 _initFilterStickyShadow。
  useEffect(() => {
    let ticking = false;
    const apply = () => {
      ticking = false;
      const bar = barRef.current;
      let stuck = false;
      if (bar) { const r = bar.getBoundingClientRect(); stuck = r.height > 0 && r.top <= 0; bar.classList.toggle('stuck', stuck); }
      // 「上に戻る」：フィルターバーが上端に貼り付いて“ヘッダー化”したら出す
      // （旧 scrollY>400 は route map まで下げないと出なかった）。
      if (backTopRef.current) backTopRef.current.classList.toggle('show', stuck);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={barRef} className={'filter-bar' + (collapsed ? ' collapsed' : '')} id="filterBar">
      <button type="button" className="filter-toggle-btn" onClick={() => setCollapsed((v) => !v)} title="Show / hide filters">
        <span>Filters</span>
        {totalCount > 0 && <span className="filter-active-badge">{totalCount}</span>}
        <span className="filter-toggle-arrow">▾</span>
      </button>
      <button
        type="button" className="filter-clear filter-clear-collapsed"
        onClick={() => filterStore.clearAll()} title="Clear all filters"
        style={{ display: anyActive ? '' : 'none' }}
      >✕ Clear all</button>
      <div className="filter-chips-group">
        {barKeys.map((key) => {
          const def = _DEF_BY_KEY[key];
          const meta = CHIP_META[key];
          if (!def || !meta) return null;
          return <FilterChip key={key} def={def} emoji={meta.emoji} title={meta.title} dataOptions={options[key] || []} />;
        })}
        <button type="button" className={'adv-filter-btn' + (advCount > 0 ? ' active' : '')} onClick={onOpenAdvanced} title="Presets & advanced filters">
          <span>⚙️</span>
          <span className="adv-filter-btn-label">More</span>
          <span className="adv-filter-plus" aria-hidden="true">＋</span>
          {advCount > 0 && <span className="adv-filter-badge">{advCount}</span>}
        </button>
        <button type="button" className="filter-clear" onClick={() => filterStore.clearAll()} title="Clear all filters" style={{ display: anyActive ? '' : 'none' }}>✕ Clear all</button>
      </div>
      <button ref={backTopRef} type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" title="Back to top">↑</button>
    </div>
  );
}
