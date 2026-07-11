import { useState, useEffect, useMemo, type KeyboardEvent } from 'react';
import { DataSource } from '../../lib/datasource';
import type { Flight } from '../../lib/compute';
import { normalizeAirport, normalizeAircraft, normalizeAirline, normalizeTime } from '../../lib/normalize';
import { memoStore } from '../../lib/memo-store';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { AutocompleteInput } from './AutocompleteInput';
import { FlightMemoModal } from './FlightMemoModal';

// 今日の日付（ローカル）を 'YYYY-MM-DD' で返す。Date 欄の初期値＝毎回選ぶ手間を省く（オーナー指定 2026-07-11）。
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ✈️ Add New Flight（旧 #modalOverlay + addFlight）。外側クリックでは閉じない（入力中の誤クリック防止）。
// 閉じるのは ✕ / ESC のみ。値は境界（normalize*）で正準化してから DataSource.addOne。
export function AddFlightModal({ open, onClose, flights }: { open: boolean; onClose: () => void; flights: Flight[] }) {
  const [date, setDate] = useState('');
  const [timeH, setTimeH] = useState('');
  const [timeM, setTimeM] = useState('');
  const [dep, setDep] = useState('');
  const [arr, setArr] = useState('');
  const [aircraft, setAircraft] = useState('');
  const [airline, setAirline] = useState('');
  // 「Add Notes」で検証済みだが未追加のフライト。ノート画面の Add Flight で初めて確定する。
  const [draftFlight, setDraftFlight] = useState<Flight | null>(null);

  const modalRef = useModalKeyboard(open, onClose);

  // 未確定のまま閉じた入力を持ち越さない：開くたびにフォームをまっさらにする。
  // （✕/Cancel/ESC で閉じても reset は走らず、`return null` でもアンマウントされない＝useState が残るため）
  // Date だけは「今日」を初期値に（記録するのは大抵その日のフライト＝選ぶ手間を省く）。
  useEffect(() => {
    if (!open) return;
    setDate(todayStr()); setTimeH(''); setTimeM(''); setDep(''); setArr(''); setAircraft(''); setAirline('');
    setDraftFlight(null);
  }, [open]);

  // FlightMemoModal（draft モード）へ渡す形。id/no は確定時に採番されるためダミー
  // （draftMode では参照されない）。毎レンダー新オブジェクトを作ると memo 側の初期化 effect が
  // 走り直して入力が消えるので、draftFlight が変わったときだけ作る。
  const draftStored = useMemo(
    () => (draftFlight ? { ...draftFlight, no: 0, id: '' } : null),
    [draftFlight],
  );

  if (!open) return null;

  const reset = () => { setDate(''); setTimeH(''); setTimeM(''); setDep(''); setArr(''); setAircraft(''); setAirline(''); };

  // 入力欄で Enter → 追加（Shift+Enter・IME 変換中は除く）。旧 main.js の Add Flight Enter 送信。
  const onFormKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      submit();
    }
  };

  // withNotes=true は「Add Notes」：ここではまだ追加せず、検証だけ通してノート編集を開く。
  // フライトの確定はノート画面の「Add Flight」（commitWithNotes）で行う（オーナー指定 2026-07-11）。
  function submit(withNotes = false) {
    const depN = normalizeAirport(dep) || '';
    const arrN = normalizeAirport(arr) || '';
    const acN = normalizeAircraft(aircraft) || '';
    const alN = normalizeAirline(airline) || '';
    const h = timeH.trim() === '' ? 0 : parseInt(timeH.trim(), 10);
    const m = timeM.trim() === '' ? 0 : parseInt(timeM.trim(), 10);
    if (isNaN(h) || isNaN(m) || h < 0 || m < 0) { alert('Flight time must be non-negative numbers.'); return; }
    if (m > 59) { alert('Minutes must be 0–59 (use the hour field for full hours).'); return; }
    if (!date || !depN || !arrN || !acN || !alN || (h === 0 && m === 0)) { alert('Please fill in all fields.'); return; }
    const combined = `${h}h${String(m).padStart(2, '0')}m`;
    const t = normalizeTime(combined) || combined;
    const data: Flight = { date, dep: depN, arr: arrN, ac: acN, al: alN, t };
    if (withNotes) { setDraftFlight(data); return; }
    DataSource.addOne(data);
    reset();
    onClose();
    showToast('✓ Flight added successfully');
  }

  // ノート付き確定：フライトを保存してから、その id にノートを紐づける（メモは id キーのため必ずこの順）。
  function commitWithNotes(fields: Record<string, string>) {
    if (!draftFlight) return;
    const stored = DataSource.addOne(draftFlight);
    const hasNotes = Object.keys(fields).length > 0;
    if (hasNotes) memoStore.save(stored.id, fields);
    setDraftFlight(null);
    reset();
    onClose();
    showToast(hasNotes ? '✓ Flight added with notes' : '✓ Flight added successfully');
  }

  return (
    <>
    <div ref={modalRef} className="modal-overlay show" id="modalOverlay">
      <div className="modal">
        <div className="modal-head">
          <h3>✈️ Add New Flight</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" onKeyDown={onFormKeyDown}>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">Date</span>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              {/* (air time)＝離陸〜着陸の飛行時間であって block time（OUT〜IN）ではない、の注釈（オーナー指定 2026-07-11） */}
              <span className="form-label">Flight Time (air time)</span>
              <div className="flight-time-input">
                <AutocompleteInput id="fTimeH" type="time-h" wrapClassName="ac-wrap" placeholder="0" inputMode="numeric"
                  value={timeH} onChange={setTimeH} flights={flights} />
                <span className="time-unit">h</span>
                <AutocompleteInput id="fTimeM" type="time-m" wrapClassName="ac-wrap" placeholder="0" inputMode="numeric"
                  value={timeM} onChange={setTimeM} flights={flights} />
                <span className="time-unit">m</span>
              </div>
            </div>
          </div>
          <div className="form-row">
            <AutocompleteInput id="fDep" type="airport" label="Departure (ICAO)" placeholder="RJTT" maxLength={4} uppercase
              value={dep} onChange={setDep} flights={flights} />
            <AutocompleteInput id="fArr" type="airport" label="Arrival (ICAO)" placeholder="RJOO" maxLength={4} uppercase
              value={arr} onChange={setArr} flights={flights} />
          </div>
          <div className="form-row">
            <AutocompleteInput id="fAircraft" type="aircraft" label="Aircraft" placeholder="B772" uppercase
              value={aircraft} onChange={setAircraft} flights={flights} />
            <AutocompleteInput id="fAirline" type="airline" label="Airline" placeholder="ANA"
              value={airline} onChange={setAirline} flights={flights} />
          </div>
          <div className="modal-actions">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            {/* 詳細メモ（v-speed・時刻・燃料など）を書いてからフライトを追加する導線 */}
            <button className="btn-outline" onClick={() => submit(true)} title="Write detailed notes for this flight, then add it">Add Notes</button>
            <button className="btn-primary" onClick={() => submit()}>Add Flight</button>
          </div>
        </div>
      </div>
    </div>

    {/* ノートを書いてから確定する下書きフロー：Back/✕ ならこのフォームへ戻る（入力値は保持） */}
    <FlightMemoModal
      flight={draftStored}
      draftMode
      onCommit={commitWithNotes}
      onClose={() => setDraftFlight(null)}
    />
    </>
  );
}
