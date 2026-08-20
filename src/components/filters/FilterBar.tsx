import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FilterState } from '../../lib/compute';
import { FILTER_DEFS, _ADV_FILTER_KEYS, type FilterDef } from '../../lib/filters-config';
import { filterStore } from '../../lib/filter-store';
import { useFilterVersion } from '../../hooks/useFilterState';
import type { FilterOptionsMap } from '../../lib/filter-options';
import { FilterChip } from './FilterChip';
import { CHIP_META } from './chip-meta';
import { SectionJump } from './SectionJump';
import { scrollToTop, setStickyTop } from '../../lib/scroll';

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
  // フェーズK-3（2026-08-18）追加：同じ実測でバーの高さを --sticky-top へ書き出す。
  // セクションへ飛ぶとき、この高さの分だけ手前で止めないと見出しがバーの裏に隠れるため
  // （スクロール監視は増やさず、既にある rAF の中で 1 行測るだけ）。
  const measure = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    const stuck = r.height > 0 && r.top <= 0;
    bar.classList.toggle('stuck', stuck);
    // 「上に戻る」：フィルターバーが上端に貼り付いて“ヘッダー化”したら出す
    // （旧 scrollY>400 は route map まで下げないと出なかった）。
    if (backTopRef.current) backTopRef.current.classList.toggle('show', stuck);
    // 下へ飛べば必ず貼り付くので、いま貼り付いているかに関係なく実測値を入れる。
    setStickyTop(r.height);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onFrame = () => { ticking = false; measure(); };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => window.removeEventListener('scroll', onScroll);
  }, [measure]);

  // 折り畳み／展開でバーの高さが変わる（モバイルはチップが縦 1 列に並ぶので特に大きく変わる）。
  // 描画確定後すぐ測り直して --sticky-top を合わせる。
  useLayoutEffect(() => { measure(); }, [collapsed, measure]);

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
          return <FilterChip key={key} def={def} title={meta.title} dataOptions={options[key] || []} />;
        })}
        <button type="button" className={'adv-filter-btn' + (advCount > 0 ? ' active' : '')} onClick={onOpenAdvanced} title="Presets & advanced filters">
          <span className="adv-filter-btn-label">More</span>
          <span className="adv-filter-plus" aria-hidden="true">＋</span>
          {advCount > 0 && <span className="adv-filter-badge">{advCount}</span>}
        </button>
        <button type="button" className="filter-clear" onClick={() => filterStore.clearAll()} title="Clear all filters" style={{ display: anyActive ? '' : 'none' }}>✕ Clear all</button>
      </div>
      <button ref={backTopRef} type="button" className="back-to-top" onClick={scrollToTop} aria-label="Back to top" title="Back to top">↑</button>
      {/* セクションへ飛ぶ導線（K-3）。表示はモバイルのみ（CSS で 860px 以下だけ表示）。 */}
      <SectionJump onBeforeJump={() => setCollapsed(true)} />
    </div>
  );
}
