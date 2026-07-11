import type { ChartMode } from '../../hooks/useChartMode';

// チャート表示形式の切り替えトグル（Top Flights の Longest/Shortest と同じ .toggle 部品を流用）。
// defaultLabel はカードごとの既定形式の名前（'Pie'＝ドーナツ／'Line'＝折れ線）。
export function ChartTypeToggle({ mode, onChange, defaultLabel }: {
  mode: ChartMode; onChange: (m: ChartMode) => void; defaultLabel: 'Pie' | 'Line';
}) {
  return (
    <div className="toggle">
      <button
        className={'toggle-btn' + (mode === 'default' ? ' active' : '')}
        type="button" onClick={() => onChange('default')}
        title={defaultLabel === 'Pie' ? 'Doughnut chart (share of total)' : 'Line chart (trend)'}
      >{defaultLabel}</button>
      <button
        className={'toggle-btn' + (mode === 'bar' ? ' active' : '')}
        type="button" onClick={() => onChange('bar')}
        title="Bar chart (compare counts)"
      >Bar</button>
    </div>
  );
}
