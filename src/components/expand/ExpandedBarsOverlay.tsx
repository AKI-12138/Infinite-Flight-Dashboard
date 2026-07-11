import { useEffect, useState } from 'react';
import { BAR_GRADIENTS } from '../../lib/viz-colors';
import { fmtHM } from '../../lib/format';
import { filterStore } from '../../lib/filter-store';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { activatable } from '../../lib/a11y';
import type { FilterStateShape } from '../../lib/compute';

export type BarType = keyof typeof BAR_GRADIENTS; // aircraft/airlines/routes/airports/countries/cities

const TITLES: Record<BarType, string> = {
  aircraft: 'Top Aircraft', airlines: 'Top Airlines', routes: 'Top Routes',
  airports: 'Top Airports', countries: 'Top Countries/Regions', cities: 'Top Cities',
};
const SUBTITLES: Record<BarType, string> = {
  aircraft: 'total aircraft types', airlines: 'total airlines', routes: 'total routes',
  airports: 'total airports', countries: 'total countries/regions', cities: 'total cities',
};
// クリックでフィルタへ落とせる type → ドリルダウン種別（routes は dep+arr 分解）。
const DRILL: Partial<Record<BarType, string>> = {
  aircraft: 'aircraft', airlines: 'airlines', countries: 'countries', airports: 'airports', cities: 'cities', routes: 'route',
};

type SortKey = 'count-desc' | 'count-asc' | 'time-desc' | 'time-asc' | 'name-asc' | 'name-desc';

function sortData(data: [string, number][], minsMap: Record<string, number> | undefined, key: SortKey): [string, number][] {
  const arr = data.slice();
  const minsOf = (l: string) => (minsMap && minsMap[l]) || 0;
  switch (key) {
    case 'count-asc': arr.sort((a, b) => a[1] - b[1]); break;
    case 'time-desc': arr.sort((a, b) => minsOf(b[0]) - minsOf(a[0])); break;
    case 'time-asc': arr.sort((a, b) => minsOf(a[0]) - minsOf(b[0])); break;
    case 'name-asc': arr.sort((a, b) => String(a[0]).localeCompare(String(b[0]))); break;
    case 'name-desc': arr.sort((a, b) => String(b[0]).localeCompare(String(a[0]))); break;
    default: arr.sort((a, b) => b[1] - a[1]); break; // count-desc
  }
  return arr;
}

// バーカードの「All」で開く拡大表示（旧 #expandedOverlay + _renderExpandedBars）。
// 縦バー・ソート・クリックでドリルダウン（フィルタ反映して閉じる）。背景クリック / ✕ / ESC で閉じる。
export function ExpandedBarsOverlay({ open, type, data, minsMap, onClose }: {
  open: boolean; type: BarType; data: [string, number][]; minsMap?: Record<string, number>; onClose: () => void;
}) {
  const [sort, setSort] = useState<SortKey>('count-desc');

  // autoFocus=false：開いた瞬間に並び替え select を自動フォーカスして枠が出るのを防ぐ（オーナー指摘）。
  const modalRef = useModalKeyboard(open, onClose, { autoFocus: false });
  useEffect(() => { if (open) setSort('count-desc'); }, [open]); // 開くたび既定に戻す

  if (!open) return null;

  const drillKind = DRILL[type];
  const useTime = sort.startsWith('time') && !!minsMap;
  const sorted = sortData(data, minsMap, sort);
  const valueFor = (item: [string, number]) => (useTime ? (minsMap![item[0]] || 0) : item[1]);
  const [c1, c2] = BAR_GRADIENTS[type];
  const max = sorted.length ? Math.max(...sorted.map(valueFor)) || 1 : 1;
  const total = sorted.reduce((s, it) => s + valueFor(it), 0) || 1;
  const maxH = 220;

  const onBarClick = (label: string) => {
    if (!drillKind) return;
    onClose();
    if (drillKind === 'route') filterStore.drilldownRoute(label);
    else filterStore.drilldown(drillKind as Exclude<keyof FilterStateShape, 'durationRange' | 'dateRange'>, label);
  };

  return (
    <div ref={modalRef} className="expanded-overlay show" id="expandedOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="expanded-panel">
        <div className="expanded-header">
          <h3>{TITLES[type]}</h3>
          <div className="expanded-sort">
            <label className="expanded-sort-label">Sort</label>
            <select className="expanded-sort-select" value={sort} onChange={(e) => { setSort(e.target.value as SortKey); e.currentTarget.blur(); }}>
              <option value="count-desc">Count ▾</option>
              <option value="count-asc">Count ▴</option>
              {minsMap && <option value="time-desc">Time ▾</option>}
              {minsMap && <option value="time-asc">Time ▴</option>}
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="expanded-scroll" id="expandedScroll">
          {sorted.map((item) => {
            const [label, count] = item;
            const v = valueFor(item);
            const h = Math.max(24, (v / max) * maxH);
            const share = ((v / total) * 100).toFixed(0);
            return (
              <div
                key={label}
                className={'expanded-bar-item' + (drillKind ? ' is-drillable' : '')}
                title={label}
                onClick={drillKind ? () => onBarClick(label) : undefined}
                aria-label={drillKind ? `Filter by ${label}` : undefined}
                {...(drillKind ? activatable(() => onBarClick(label)) : {})}
              >
                <div className="expanded-bar-stack">
                  <div className="expanded-bar-val">{minsMap ? count : ''}</div>
                  <div className="expanded-bar-col" style={{ height: h, background: `linear-gradient(180deg,${c1},${c2})` }}>
                    {minsMap ? <span className="expanded-bar-time-in">{fmtHM(minsMap[label] || 0)}</span> : <span className="expanded-bar-count-in">{count}</span>}
                  </div>
                </div>
                <div className="expanded-bar-name">{label}</div>
                <div className="expanded-bar-pct">{share}%</div>
              </div>
            );
          })}
        </div>
        <div className="expanded-footer">
          <div><div className="total-label">{data.length}</div><div className="total-sub">{SUBTITLES[type]}</div></div>
        </div>
      </div>
    </div>
  );
}
