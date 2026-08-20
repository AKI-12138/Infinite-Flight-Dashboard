import { useEffect, useState, type KeyboardEvent } from 'react';
import { DataSource } from '../../lib/datasource';
import { normalizeAirport } from '../../lib/normalize';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

const CONTINENTS = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Antarctica'];

// 📍 Add Airport（旧 #addAirportOverlay + submitAddAirport）。Data check の「+ Add」から ICAO 事前入力で開く。
// Import の Manual mode と同じ内部処理（DataSource.addAirports＝AP へマージ）を、やさしいフォームで包む。
// 背景クリック / ✕ / ESC で閉じる。
export function AddAirportModal({ open, initialIcao, onClose }: { open: boolean; initialIcao: string; onClose: () => void }) {
  const [icao, setIcao] = useState('');
  const [continent, setContinent] = useState('Asia');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const modalRef = useModalKeyboard(open, onClose);
  // 開くたびにフォームを初期化（ICAO は Data check から事前入力）。
  useEffect(() => {
    if (!open) return;
    setIcao((initialIcao || '').toUpperCase());
    setContinent('Asia'); setLat(''); setLng(''); setCity(''); setCountry('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // 入力欄で Enter → 追加（select は除外・Shift+Enter・IME 変換中も除く）。旧 main.js の Add Airport Enter 送信。
  const onFormKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      submit();
    }
  };

  // 座標調べリンク：入力中の ICAO / 都市名で OpenStreetMap 検索へ。
  const coordHref = 'https://www.openstreetmap.org/search?query=' +
    encodeURIComponent([icao.trim(), city.trim(), 'airport'].filter(Boolean).join(' '));

  function submit() {
    const icaoN = (normalizeAirport(icao.trim()) || icao.trim().toUpperCase());
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const cityN = city.trim();
    const co = country.trim();
    if (icaoN.length < 2 || icaoN.length > 4) { alert('Please enter a valid ICAO code (2–4 letters).'); return; }
    if (isNaN(latN) || isNaN(lngN)) { alert('Please enter latitude and longitude as numbers (decimal degrees).'); return; }
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) { alert('Latitude must be between −90 and 90, longitude between −180 and 180.'); return; }
    if (!cityN) { alert('Please enter a city name.'); return; }
    if (!co) { alert('Please enter a country.'); return; }
    DataSource.addAirports({ [icaoN]: { lat: latN, lng: lngN, city: cityN, co, ct: continent } });
    onClose();
    showToast(`✓ ${icaoN} added`);
  }

  return (
    <div ref={modalRef} className="modal-overlay show" id="addAirportOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>Add Airport</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" onKeyDown={onFormKeyDown}>
          <p className="dc-intro">
            Add an airport that isn't in the dataset so it shows on the map and counts toward
            Domestic / International and country totals. Saved to this device.
          </p>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">ICAO</span>
              <input className="form-input" placeholder="RJRT" maxLength={4} style={{ textTransform: 'uppercase' }}
                autoComplete="off" spellCheck={false} value={icao} onChange={(e) => setIcao(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">Continent</span>
              <select className="form-input" value={continent} onChange={(e) => setContinent(e.target.value)}>
                {CONTINENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">Latitude</span>
              <input className="form-input" inputMode="decimal" placeholder="35.765" autoComplete="off" spellCheck={false}
                value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">Longitude</span>
              <input className="form-input" inputMode="decimal" placeholder="140.386" autoComplete="off" spellCheck={false}
                value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">City</span>
              <input className="form-input" placeholder="Tateyama" autoComplete="off" spellCheck={false}
                value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">Country</span>
              <input className="form-input" placeholder="Japan" autoComplete="off" spellCheck={false}
                value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <p className="aa-hint">
            Need the coordinates? <a href={coordHref} target="_blank" rel="noopener" tabIndex={-1}>Look them up on OpenStreetMap</a> — copy the decimal latitude / longitude.
          </p>
          <div className="modal-actions">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={submit}>Add Airport</button>
          </div>
        </div>
      </div>
    </div>
  );
}
