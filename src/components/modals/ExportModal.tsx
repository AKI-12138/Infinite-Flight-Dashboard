import { useEffect, useState } from 'react';
import { DataSource, EXPORT_PREFIX_DEFAULTS, getExportPrefix, setExportPrefix, buildExportFilename } from '../../lib/datasource';
import { memoStore } from '../../lib/memo-store';
import { buildFullBackup, buildBackupFilename } from '../../lib/backup';
import { buildFlightCSV, buildAirportCSV } from '../../lib/parse';
import { downloadTextFile } from '../../lib/download';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

// ↓ Export（旧 #exportOverlay + executeExport）。Flight Log / Custom Airports をそれぞれ選んで DL。
// 出力は DataSource 経由＝正規化済み（ICAO 4字・正式エアライン名）。背景クリック / ✕ / ESC で閉じる。
// フルバックアップ（JSON）はフライト＋カスタム空港＋フライトメモを 1 ファイルに保存
// （CSV と違いメモとの紐づけ＝内部 ID も保存されるので、復元してもメモが外れない）。
export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fCount = DataSource.count;
  const aCount = Object.keys(DataSource.customAirports).length;
  const mCount = memoStore.count;

  const [wantF, setWantF] = useState(true);
  const [wantA, setWantA] = useState(false);
  const [wantB, setWantB] = useState(false);
  const [fPrefix, setFPrefix] = useState('');
  const [aPrefix, setAPrefix] = useState('');

  const modalRef = useModalKeyboard(open, onClose);
  useEffect(() => {
    if (!open) return;
    setWantF(fCount > 0);
    setWantA(aCount > 0);
    setWantB(false);
    setFPrefix(getExportPrefix('flights'));
    setAPrefix(getExportPrefix('airports'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function execute() {
    if (!wantF && !wantA && !wantB) { showToast('Select at least one file', 'red'); return; }
    setExportPrefix('flights', fPrefix);
    setExportPrefix('airports', aPrefix);
    let n = 0;
    if (wantF && fCount > 0) {
      downloadTextFile(buildExportFilename(fPrefix || EXPORT_PREFIX_DEFAULTS.flights), buildFlightCSV(DataSource.flights));
      n++;
    }
    if (wantA) {
      const custom = DataSource.customAirports;
      if (Object.keys(custom).length > 0) {
        downloadTextFile(buildExportFilename(aPrefix || EXPORT_PREFIX_DEFAULTS.airports), buildAirportCSV(custom));
        n++;
      }
    }
    if (wantB && fCount > 0) {
      downloadTextFile(buildBackupFilename(),
        buildFullBackup(DataSource.flights, DataSource.customAirports, memoStore.all()),
        'application/json;charset=utf-8;');
      n++;
    }
    if (wantF || wantB) DataSource.markClean();
    onClose();
    if (n > 0) showToast(`✓ Exported ${n} file${n > 1 ? 's' : ''}`);
  }

  return (
    <div ref={modalRef} className="modal-overlay show" id="exportOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>↓ Export</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: 14, color: 'var(--text-2)', fontSize: 13 }}>Choose what to download.</p>

          <label className="export-option">
            <input type="checkbox" className="cb" checked={wantF} disabled={fCount === 0} onChange={(e) => setWantF(e.target.checked)} />
            <span className="export-option-text">
              <strong>Flight Log</strong>
              <span className="export-option-detail">{fCount} flight{fCount === 1 ? '' : 's'}</span>
            </span>
          </label>
          <div className="export-filename-row">
            <span className="export-filename-label">File:</span>
            <input type="text" className="export-filename-input" maxLength={40} placeholder="flightslog"
              autoComplete="off" spellCheck={false} value={fPrefix} onChange={(e) => setFPrefix(e.target.value)} />
            <span className="export-filename-preview">{buildExportFilename(fPrefix)}</span>
          </div>

          <label className="export-option">
            <input type="checkbox" className="cb" checked={wantA} disabled={aCount === 0} onChange={(e) => setWantA(e.target.checked)} />
            <span className="export-option-text">
              <strong>Custom Airports</strong>
              <span className="export-option-detail">{aCount} airport{aCount === 1 ? '' : 's'} added</span>
            </span>
          </label>
          <div className="export-filename-row">
            <span className="export-filename-label">File:</span>
            <input type="text" className="export-filename-input" maxLength={40} placeholder="airports"
              autoComplete="off" spellCheck={false} value={aPrefix} onChange={(e) => setAPrefix(e.target.value)} />
            <span className="export-filename-preview">{buildExportFilename(aPrefix)}</span>
          </div>

          <label className="export-option">
            <input type="checkbox" className="cb" checked={wantB} disabled={fCount === 0} onChange={(e) => setWantB(e.target.checked)} />
            <span className="export-option-text">
              <strong>Full Backup (JSON)</strong>
              <span className="export-option-detail">
                {fCount} flight{fCount === 1 ? '' : 's'} + {mCount} note{mCount === 1 ? '' : 's'} + {aCount} airport{aCount === 1 ? '' : 's'} · restore via Import
              </span>
            </span>
          </label>
          <div className="export-filename-row">
            <span className="export-filename-label">File:</span>
            <span className="export-filename-preview">{buildBackupFilename()}</span>
          </div>

          <div className="modal-actions">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={execute}>Download</button>
          </div>
        </div>
      </div>
    </div>
  );
}
