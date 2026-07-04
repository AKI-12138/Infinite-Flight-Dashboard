import { useEffect, useState, type ReactNode } from 'react';
import { FilterState, type FilterStateShape } from '../../lib/compute';
import { _cascadeAllow, type FilterDef, type FilterOption } from '../../lib/filters-config';
import { AP } from '../../data/airports';
import { filterStore, DUR_MAX_SENTINEL, minToHoursStr } from '../../lib/filter-store';
import { useFilterVersion } from '../../hooks/useFilterState';

// option（string か {value,label}）を {value,label} に正規化。
function normOpt(o: string | FilterOption): FilterOption {
  return typeof o === 'object' ? o : { value: o, label: o };
}
// メニュー内検索の対象文字列（空港は都市名/IATA も含める）。旧 _optSearchText。
function optSearchText(def: FilterDef, value: string, label: string): string {
  let t = String(label);
  if (def.cascade === 'airport') { const m = AP[value]; if (m) t += ' ' + (m.city || '') + ' ' + (m.iata || ''); }
  return t.toLowerCase();
}

type StrKey = Exclude<keyof FilterStateShape, 'durationRange'>;

// 1 つのフィルタ軸のドロップダウン中身（旧 _renderFilterMenu の React 化）。
// options（データ由来）は親から受け取る。fixedOptions を持つ軸は def から読む。
// 選択状態・cascade は現 FilterState を毎レンダー読む（version 購読で再描画）。
export function ChipMenu({ def, dataOptions }: { def: FilterDef; dataOptions: string[] }) {
  const version = useFilterVersion();
  const [query, setQuery] = useState('');
  const selected = new Set((FilterState as unknown as Record<string, string[]>)[def.stateKey]);

  const fullOptions: FilterOption[] = (def.fixedOptions || dataOptions).map(normOpt);

  // cascade（地理依存）で候補を絞る。選択済みは残す（解除できるように）。
  const allow = _cascadeAllow(def);
  let hidden = 0;
  let kept = fullOptions;
  if (allow) {
    kept = [];
    fullOptions.forEach((o) => {
      if (allow(o.value) || selected.has(o.value)) kept.push(o);
      else hidden++;
    });
  }

  // 候補が多いデータ由来メニューだけ検索ボックス（固定リスト・少数には出さない）。
  const showSearch = !def.fixedOptions && kept.length > 8;
  const q = query.trim().toLowerCase();
  const visible = q ? kept.filter((o) => optSearchText(def, o.value, o.label).indexOf(q) !== -1) : kept;

  const onToggle = (value: string) => filterStore.toggle(def.stateKey as StrKey, value);

  const renderItem = (o: FilterOption) => (
    <label className="chip-menu-item" key={o.value}>
      <input
        type="checkbox"
        className="cb"
        checked={selected.has(o.value)}
        onChange={() => onToggle(o.value)}
      />
      <span>{o.label}</span>
    </label>
  );

  // グループ表示（大陸別など）。無ければ平坦リスト。
  let body: ReactNode;
  if (kept.length === 0) {
    body = <div className="chip-menu-empty">(none)</div>;
  } else if (typeof def.groupBy === 'function') {
    const groupBy = def.groupBy;
    const groups = new Map<string, FilterOption[]>();
    visible.forEach((o) => {
      const g = groupBy(o.value) || 'Other';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(o);
    });
    const order = def.groupOrder || [];
    const keys = [
      ...order.filter((g) => groups.has(g)),
      ...[...groups.keys()].filter((g) => !order.includes(g)),
    ];
    body = keys.map((g, i) => (
      <div key={g}>
        <div className={'chip-menu-group' + (i > 0 ? ' chip-menu-group-sep' : '')}>{g}</div>
        {groups.get(g)!.map(renderItem)}
      </div>
    ));
  } else {
    body = visible.map(renderItem);
  }

  return (
    <>
      {showSearch && (
        <div className="chip-menu-search">
          <input
            type="text"
            className="chip-search-input"
            placeholder="Search…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      {body}
      {def.key === 'duration' && <DurationRange version={version} />}
      {hidden > 0 && <div className="chip-menu-hint">{hidden} hidden by filters</div>}
    </>
  );
}

// duration 専用のカスタム範囲入力（旧 _durationRangeHtml / _onDurationRangeInput）。
// バケット選択で範囲がクリアされたら（version 変化）入力欄も空に戻す。
function DurationRange({ version }: { version: number }) {
  const dr = FilterState.durationRange;
  const [minStr, setMinStr] = useState(dr.length ? minToHoursStr(dr[0]) : '');
  const [maxStr, setMaxStr] = useState(dr.length && dr[1] < DUR_MAX_SENTINEL ? minToHoursStr(dr[1]) : '');

  // 外部（バケット toggle）で範囲が消えたら入力欄も空に。
  useEffect(() => {
    if (!FilterState.durationRange.length) { setMinStr(''); setMaxStr(''); }
  }, [version]);

  const commit = (mn: string, mx: string) => { setMinStr(mn); setMaxStr(mx); filterStore.setDurationRange(mn, mx); };

  return (
    <div className="chip-menu-range">
      <div className="chip-menu-range-label">Custom range (hours)</div>
      <div className="chip-menu-range-row">
        <input
          type="number" className="chip-range-input dur-min" min={0} step={0.5} inputMode="decimal"
          placeholder="min" value={minStr}
          onChange={(e) => commit(e.target.value, maxStr)}
        />
        <span className="chip-menu-range-dash">–</span>
        <input
          type="number" className="chip-range-input dur-max" min={0} step={0.5} inputMode="decimal"
          placeholder="max" value={maxStr}
          onChange={(e) => commit(minStr, e.target.value)}
        />
      </div>
    </div>
  );
}
