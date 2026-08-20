import { useEffect, useMemo, useState } from 'react';
import { computeAll } from '../lib/compute';
import type { StoredFlight } from '../lib/datasource';
import { onStatExpand } from '../lib/dashboard-events';
import { showToast } from '../lib/toast';
import { filterStore } from '../lib/filter-store';
import { BarCard } from './BarCard';
import { ChartCard } from './ChartCard';
import { TopFlightsCard } from './TopFlightsCard';
import { FlightLog } from './FlightLog';
import { ContinentChart } from './charts/ContinentChart';
import { YearChart } from './charts/YearChart';
import { MonthChart } from './charts/MonthChart';
import { WeekdayChart } from './charts/WeekdayChart';
import { ExpandedBarsOverlay, type BarType } from './expand/ExpandedBarsOverlay';
import { ChartExpandOverlay } from './expand/ChartExpandOverlay';
import { TopFlightsOverlay } from './expand/TopFlightsOverlay';
import { ChartTypeToggle } from './charts/ChartTypeToggle';
import { useChartMode } from '../hooks/useChartMode';

type BarExpand = { type: BarType; data: [string, number][]; minsMap?: Record<string, number> };
type ChartExpand = 'continents' | 'year' | 'month' | 'weekday';

// ダッシュボード本体（旧 index.html の .main）。バーカード群＋チャート群＋フライトログ表。
// 各カードの拡大（バーは「All」＝縦バー拡大＋ドリルダウン、チャート／Top Flights は ⛶）を配線（5-7）。
// flights は「フィルタ適用後」のリスト（App で getFiltered 済みを受け取る）。集計・表もこれを使う。
export function MainDashboard({ flights, themePref }: { flights: StoredFlight[]; themePref: string }) {
  const filtered = flights;
  const s = useMemo(() => computeAll(filtered), [filtered]);
  const [barExpand, setBarExpand] = useState<BarExpand | null>(null);
  const [chartExpand, setChartExpand] = useState<ChartExpand | null>(null);
  const [flightsExpand, setFlightsExpand] = useState(false);
  // チャートの表示形式トグル（円⇄棒・線⇄棒・2026-07-11）。選択は端末に記憶され、カードと ⛶ 拡大で共有。
  const [ctMode, setCtMode] = useChartMode('continents');
  const [moMode, setMoMode] = useChartMode('month');
  const [wdMode, setWdMode] = useChartMode('weekday');

  // 統計カードのクリック → 対応する拡大を開く（旧 openStatExpand）。'flightlog' は FlightLog 側で処理。
  useEffect(() => onStatExpand((k) => {
    if (k === 'flighttime') { setFlightsExpand(true); return; }
    const map: Partial<Record<string, { data: [string, number][]; minsMap?: Record<string, number> }>> = {
      aircraft: { data: s.ac, minsMap: s.acMin },
      routes: { data: s.rt },
      airports: { data: s.ap },
      countries: { data: s.co },
    };
    const entry = map[k];
    if (!entry) return;
    if (entry.data.length === 0) { showToast('No data to show', 'red'); return; }
    setBarExpand({ type: k as BarType, data: entry.data, minsMap: entry.minsMap });
  }), [s]);

  return (
    <div className="main">
      {/* セクション見出し（フェーズK-2・2026-08-18）。
          カードを増やさず、余白とプレーンな見出しだけで「内訳」と「推移」を切り分ける。
          id は上部フィルターバーの「Jump」導線（K-3）が飛び先として使う。
          ⚠️ Flight Log には見出しを足していない。カード自身が「Flight Log」という
             見出しを持っており、上にもう一枚置くと同じ語が二重になるため
             （飛び先の id は FlightLog 側の .table-section に付けてある）。 */}
      <h2 className="section-head" id="sec-breakdowns">Breakdowns</h2>

      {/* Aircraft & Airlines（総飛行時間を併記） */}
      <div className="grid-2">
        <BarCard title="Top Aircraft" colorKey="aircraft" data={s.ac} minsMap={s.acMin} onAll={() => setBarExpand({ type: 'aircraft', data: s.ac, minsMap: s.acMin })} />
        <BarCard title="Top Airlines" colorKey="airlines" data={s.al} minsMap={s.alMin} onAll={() => setBarExpand({ type: 'airlines', data: s.al, minsMap: s.alMin })} />
      </div>

      {/* Routes & Airports */}
      <div className="grid-2">
        <BarCard title="Top Routes" colorKey="routes" data={s.rt} onAll={() => setBarExpand({ type: 'routes', data: s.rt })} />
        <BarCard title="Top Airports" colorKey="airports" data={s.ap} onAll={() => setBarExpand({ type: 'airports', data: s.ap })} />
      </div>

      {/* Geography：Continents（ドーナツ）＋ Countries ＋ Cities */}
      <div className="grid-3">
        <ChartCard title="Continents" onExpand={() => setChartExpand('continents')}
          actions={<ChartTypeToggle mode={ctMode} onChange={setCtMode} defaultLabel="Pie" />}>
          <ContinentChart ct={s.ct} themePref={themePref} mode={ctMode} />
        </ChartCard>
        <BarCard title="Top Countries/Regions" colorKey="countries" data={s.co} onAll={() => setBarExpand({ type: 'countries', data: s.co })} />
        <BarCard title="Top Cities" colorKey="cities" data={s.ci} onAll={() => setBarExpand({ type: 'cities', data: s.ci })} />
      </div>

      <h2 className="section-head" id="sec-trends">Trends</h2>

      {/* Year & Month */}
      <div className="grid-2">
        <ChartCard title="Flights per Year" onExpand={() => setChartExpand('year')}>
          <YearChart yr={s.yr} themePref={themePref} />
        </ChartCard>
        <ChartCard title="Flights per Month" onExpand={() => setChartExpand('month')}
          actions={<ChartTypeToggle mode={moMode} onChange={setMoMode} defaultLabel="Line" />}>
          <MonthChart mo={s.mo} themePref={themePref} mode={moMode} />
        </ChartCard>
      </div>

      {/* Weekday & Top Flights by Time */}
      <div className="grid-2">
        <ChartCard title="Flights per Weekday" onExpand={() => setChartExpand('weekday')}
          actions={<ChartTypeToggle mode={wdMode} onChange={setWdMode} defaultLabel="Line" />}>
          <WeekdayChart wd={s.wd} themePref={themePref} mode={wdMode} />
        </ChartCard>
        <TopFlightsCard flights={filtered} onExpand={() => setFlightsExpand(true)} />
      </div>

      {/* Flight Log テーブル */}
      <FlightLog flights={filtered} />

      {/* 拡大オーバーレイ群（5-7） */}
      <ExpandedBarsOverlay open={!!barExpand} type={barExpand?.type ?? 'aircraft'} data={barExpand?.data ?? []} minsMap={barExpand?.minsMap} onClose={() => setBarExpand(null)} />
      <ChartExpandOverlay open={chartExpand === 'continents'} overlayClass="continents-overlay" panelClass="continents-panel" title="Continents" onClose={() => setChartExpand(null)}
        actions={<ChartTypeToggle mode={ctMode} onChange={setCtMode} defaultLabel="Pie" />}>
        <ContinentChart ct={s.ct} themePref={themePref} large mode={ctMode} />
      </ChartExpandOverlay>
      <ChartExpandOverlay open={chartExpand === 'year'} overlayClass="chart-overlay" panelClass="chart-panel" title="Flights per Year" onClose={() => setChartExpand(null)}>
        <YearChart yr={s.yr} themePref={themePref} large flights={filtered}
          onDrill={(v) => { setChartExpand(null); filterStore.drilldown('years', v); }} />
      </ChartExpandOverlay>
      <ChartExpandOverlay open={chartExpand === 'month'} overlayClass="chart-overlay" panelClass="chart-panel" title="Flights per Month" onClose={() => setChartExpand(null)}
        actions={<ChartTypeToggle mode={moMode} onChange={setMoMode} defaultLabel="Line" />}>
        <MonthChart mo={s.mo} themePref={themePref} large flights={filtered} mode={moMode}
          onDrill={(v) => { setChartExpand(null); filterStore.drilldown('months', v); }} />
      </ChartExpandOverlay>
      <ChartExpandOverlay open={chartExpand === 'weekday'} overlayClass="chart-overlay" panelClass="chart-panel" title="Flights per Weekday" onClose={() => setChartExpand(null)}
        actions={<ChartTypeToggle mode={wdMode} onChange={setWdMode} defaultLabel="Line" />}>
        <WeekdayChart wd={s.wd} themePref={themePref} large flights={filtered} mode={wdMode}
          onDrill={(v) => { setChartExpand(null); filterStore.drilldown('weekdays', v); }} />
      </ChartExpandOverlay>
      <TopFlightsOverlay open={flightsExpand} flights={filtered} onClose={() => setFlightsExpand(false)} />
    </div>
  );
}
