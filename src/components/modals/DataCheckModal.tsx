import { useEffect, useMemo, useState } from 'react';
import { AP } from '../../data/airports';
import { normalizeAirport } from '../../lib/normalize';
import { computeUnrecognized } from '../../lib/data-check';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import type { Flight } from '../../lib/compute';

// 🩺 Data check（旧 #dataCheckOverlay + _renderDataCheck / dataCheckLookup）。
// フライトに含まれる空港/機材のうち AP / 機材正準表に無いものを一覧。各空港は「+ Add」で手動追加。
// flights は全件（フィルタ非適用）。背景クリック / ✕ / Done / ESC で閉じる。
export function DataCheckModal({ open, onClose, flights, onAddAirport }: {
  open: boolean; onClose: () => void; flights: Flight[]; onAddAirport: (icao: string) => void;
}) {
  const [query, setQuery] = useState('');

  const modalRef = useModalKeyboard(open, onClose);
  useEffect(() => { if (open) setQuery(''); }, [open]);

  const { air, acft } = useMemo(() => computeUnrecognized(flights), [flights]);

  if (!open) return null;

  const airList = Object.entries(air).sort((a, b) => b[1].count - a[1].count);
  const acList = Object.entries(acft).sort((a, b) => b[1] - a[1]);

  // 「Check an airport」：入力を normalizeAirport で解決し AP 収録有無を返す。
  const raw = query.trim();
  const lookupIcao = raw ? normalizeAirport(raw) : null;
  let lookup: { ok: boolean; text: string } | null = null;
  if (raw) {
    if (lookupIcao && AP[lookupIcao]) {
      const m = AP[lookupIcao];
      lookup = { ok: true, text: `✓ ${m.city || lookupIcao} · ${lookupIcao}${m.co ? ' · ' + m.co : ''}` };
    } else {
      lookup = { ok: false, text: `✗ Not in dataset (read as “${lookupIcao}”)` };
    }
  }

  return (
    <div ref={modalRef} className="modal-overlay show" id="dataCheckOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>Data check</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="dc-intro">
            Airports and aircraft in your log that aren't in the dataset.
            <strong> Unrecognized airports won't appear on the map</strong> and are left out of the
            Domestic / International and country counts. You can add any missing airport yourself
            with the <strong>+ Add</strong> button next to it.
          </p>

          <div className="dc-section-title">Unrecognized airports</div>
          <div className="dc-list" id="dcAirports">
            {airList.length === 0 ? (
              <div className="dc-ok">✓ All airports recognized</div>
            ) : airList.map(([code, info]) => {
              const eg = info.routes.slice(0, 2).join(', ');
              const more = info.routes.length > 2 ? ` +${info.routes.length - 2}` : '';
              return (
                <div className="dc-row" key={code}>
                  <span className="dc-code">{code}</span>
                  <span className="dc-count">{info.count} flight{info.count > 1 ? 's' : ''}</span>
                  <span className="dc-eg">{eg}{more}</span>
                  <button className="dc-add-btn" onClick={() => onAddAirport(code)}>+ Add</button>
                </div>
              );
            })}
          </div>

          <div className="dc-section-title">Unrecognized aircraft</div>
          <div className="dc-list" id="dcAircraft">
            {acList.length === 0 ? (
              <div className="dc-ok">✓ All aircraft recognized</div>
            ) : acList.map(([code, n]) => (
              <div className="dc-row" key={code}>
                <span className="dc-code">{code}</span>
                <span className="dc-count">{n} flight{n > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          <div className="dc-section-title">Check an airport</div>
          <div className="dc-lookup">
            <input type="text" className="dc-lookup-input"
              placeholder="ICAO / IATA / city  —  e.g. HND, RJTT, Zurich"
              autoComplete="off" spellCheck={false} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className={'dc-lookup-result' + (lookup ? (lookup.ok ? ' is-ok' : ' is-no') : '')}>
              {lookup?.text ?? ''}
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
