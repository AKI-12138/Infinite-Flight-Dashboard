import { useMemo, useState } from 'react';
import { compareStats, type Flight } from '../lib/compute';

// 総飛行時間（分）→ "XhYYm"（分 0 のときは "Xh"）。旧 render.js の _fmtMin（fmtHM とは別＝分 0 を省く）。
function fmtMin(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h + 'h' + (m ? String(m).padStart(2, '0') + 'm' : '');
}

// 集合 A / B のラベル（月が空なら年だけ、月指定なら "YYYY-MM"）。旧 _compareLabel。
function compareLabel(year: string, month: string): string {
  return month ? `${year}-${month}` : year;
}

// 集合A の値 vs 集合B の値を 1 枚のカードで表現（旧 _compareCard）。
function CompareCard({ label, valA, valB, format, prevLabel }: {
  label: string; valA: number; valB: number; format: (v: number) => string; prevLabel: string;
}) {
  const delta = valB === 0 ? (valA > 0 ? Infinity : 0) : Math.round(((valA - valB) / valB) * 100);
  const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '─';
  const deltaTxt = delta === Infinity ? 'NEW' : `${delta > 0 ? '+' : ''}${delta}%`;
  return (
    <div className="yoy-card">
      <div className="yoy-label">{label}</div>
      <div className="yoy-value">{format(valA)}</div>
      <span className={'yoy-delta ' + cls}>{arrow} {deltaTxt}</span>
      <div className="yoy-prev">{prevLabel}: {format(valB)}</div>
    </div>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

// 比較（YoY）セクション（旧 #yoySection + renderCompare）。任意の2年（年月）を選んで統計を突き合わせる。
// フィルタ非依存＝**全フライト**から集計（両集合の完全なデータが必要なため）。年が 2 種未満なら非表示。
export function CompareSection({ flights }: { flights: Flight[] }) {
  const years = useMemo(() => [...new Set(flights.map((f) => f.date.slice(0, 4)))].sort(), [flights]);
  const [yearA, setYearA] = useState('');
  const [monthA, setMonthA] = useState('');
  const [yearB, setYearB] = useState('');
  const [monthB, setMonthB] = useState('');

  if (years.length < 2) return null;

  // 派生的に有効値へ丸める（データ変化で選択が無効化しても壊れない・旧 renderCompare の初期化と同義）。
  const yA = years.includes(yearA) ? yearA : years[years.length - 1];
  let yB = years.includes(yearB) ? yearB : years[years.length - 2];
  if (yB === yA && monthB === monthA) yB = years.find((y) => y !== yA) ?? years[years.length - 2];

  const prefixA = monthA ? `${yA}-${monthA}-` : `${yA}-`;
  const prefixB = monthB ? `${yB}-${monthB}-` : `${yB}-`;
  const setA = flights.filter((f) => f.date.startsWith(prefixA));
  const setB = flights.filter((f) => f.date.startsWith(prefixB));
  const { a, b } = compareStats(setA, setB);
  const labelB = compareLabel(yB, monthB);

  // 年オプションは新しい順。反対側で選択中の年は薄く（示唆のみ・選択は可）。
  const yearOpts = years.slice().reverse();
  const yearOptionEls = (otherSelected: string) => yearOpts.map((y) => (
    <option key={y} value={y} style={y === otherSelected ? { color: 'var(--text-3)' } : undefined}>{y}</option>
  ));
  const monthOptionEls = (
    <>
      <option value="">All</option>
      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
    </>
  );

  return (
    <div className="yoy-section" id="yoySection">
      <div className="yoy-grid">
        <div className="yoy-card yoy-anchor">
          <div className="yoy-label">Comparing</div>
          <div className="yoy-compare">
            <div className="yoy-compare-row">
              <select className="yoy-yr-select" value={yA} onChange={(e) => setYearA(e.target.value)}>{yearOptionEls(yB)}</select>
              <select className="yoy-yr-select" value={monthA} onChange={(e) => setMonthA(e.target.value)}>{monthOptionEls}</select>
            </div>
            <span className="yoy-vs">vs</span>
            <div className="yoy-compare-row">
              <select className="yoy-yr-select" value={yB} onChange={(e) => setYearB(e.target.value)}>{yearOptionEls(yA)}</select>
              <select className="yoy-yr-select" value={monthB} onChange={(e) => setMonthB(e.target.value)}>{monthOptionEls}</select>
            </div>
          </div>
        </div>
        <CompareCard label="Flights" valA={a.count} valB={b.count} format={(v) => String(v)} prevLabel={labelB} />
        <CompareCard label="Hours" valA={a.mins} valB={b.mins} format={fmtMin} prevLabel={labelB} />
        <CompareCard label="Countries/Regions" valA={a.countries.size} valB={b.countries.size} format={(v) => String(v)} prevLabel={labelB} />
      </div>
    </div>
  );
}
