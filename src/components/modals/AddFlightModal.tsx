import { useState, useEffect, type KeyboardEvent } from 'react';
import { DataSource } from '../../lib/datasource';
import type { Flight } from '../../lib/compute';
import { normalizeAirport, normalizeAircraft, normalizeAirline, normalizeTime } from '../../lib/normalize';
import { openFlightMemo } from '../../lib/memo-events';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { AutocompleteInput } from './AutocompleteInput';

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

  const modalRef = useModalKeyboard(open, onClose);

  // 未確定のまま閉じた入力を持ち越さない：開くたびにフォームをまっさらにする。
  // （✕/Cancel/ESC で閉じても reset は走らず、`return null` でもアンマウントされない＝useState が残るため）
  useEffect(() => {
    if (!open) return;
    setDate(''); setTimeH(''); setTimeM(''); setDep(''); setArr(''); setAircraft(''); setAirline('');
  }, [open]);

  if (!open) return null;

  const reset = () => { setDate(''); setTimeH(''); setTimeM(''); setDep(''); setArr(''); setAircraft(''); setAirline(''); };

  // 入力欄で Enter → 追加（Shift+Enter・IME 変換中は除く）。旧 main.js の Add Flight Enter 送信。
  const onFormKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      submit();
    }
  };

  // withNotes=true は「Add + Notes」：追加した直後にそのフライトのメモパネルを開く
  // （メモは保存済みフライトの id に紐づくため、必ず「保存 → メモ」の順になる）。
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
    const stored = DataSource.addOne({ date, dep: depN, arr: arrN, ac: acN, al: alN, t });
    reset();
    onClose();
    showToast('✓ Flight added successfully');
    if (withNotes) openFlightMemo(stored);
  }

  return (
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
              <span className="form-label">Flight Time</span>
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
            {/* 追加してそのまま詳細メモ（v-speed・時刻・燃料など）を書く導線 */}
            <button className="btn-outline" onClick={() => submit(true)} title="Add this flight, then write detailed notes for it">📝 Add + Notes</button>
            <button className="btn-primary" onClick={() => submit()}>Add Flight</button>
          </div>
        </div>
      </div>
    </div>
  );
}
