import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { DataSource } from '../../lib/datasource';
import { memoStore } from '../../lib/memo-store';
import { AP } from '../../data/airports';
import { parseBulkFlights, parseBulkAirports } from '../../lib/parse';
import { parseFullBackup, looksLikeBackup } from '../../lib/backup';
import { SAMPLE_FLIGHT_CSV, SAMPLE_AIRPORT_CSV } from '../../data/sample';
import { downloadTextFile } from '../../lib/download';
import { requestConfirm } from '../../lib/confirm';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

type Tab = 'flights' | 'airports';

// 📥 Bulk Import（旧 #bulkOverlay + executeBulkImport / preview*）。Flights / Airports の2タブ。
// ファイル選択・Paste・サンプル読込・DL・プレビュー・重複排除つき取込。背景クリックでは閉じない。
// Flights タブはフルバックアップ JSON（Export の Full Backup で保存したもの）も自動判別し、
// その場合は「丸ごと復元（現在のデータを置き換え・メモの紐づけも復元）」として動く。
export function BulkImportModal({ open, onClose, initialSample }: { open: boolean; onClose: () => void; initialSample?: boolean }) {
  const [tab, setTab] = useState<Tab>('flights');
  const [flightsText, setFlightsText] = useState('');
  const [airportsText, setAirportsText] = useState('');
  const [fFileName, setFFileName] = useState('');
  const [aFileName, setAFileName] = useState('');
  const fFileRef = useRef<HTMLInputElement>(null);
  const aFileRef = useRef<HTMLInputElement>(null);
  const fTextRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // autoFocus=false：開いた瞬間に textarea へは入らない（＝オーナー希望：すぐ入力状態にしない）。
  // 代わりに下で中立の .modal-body（tabIndex=-1）へフォーカスする。これで「入力中でない」状態になり、
  // 素の Enter が onModalKeyDown で取込（Import）として働く。Tab/ESC は従来どおり。
  const modalRef = useModalKeyboard(open, onClose, { autoFocus: false });
  useEffect(() => {
    if (!open) return;
    // 開くたびに初期化。空状態からの「サンプルで試す」導線ならサンプルを流し込む。
    setTab('flights'); setFlightsText(initialSample ? SAMPLE_FLIGHT_CSV : ''); setAirportsText('');
    setFFileName(''); setAFileName('');
    // 空状態の「Try it with sample data」導線は旧版と同じく「レビューして Import」を促す（旧 loadSampleFlights）。
    if (initialSample) showToast('👀 Sample data loaded — review it, then click Import');
    // 中立の本体へフォーカス（textarea でも ✕ でもない）→ 素の Enter で Import できる。
    requestAnimationFrame(() => bodyRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // フルバックアップ JSON の自動判別（Flights タブのみ）。backupLike=それらしいが壊れている場合の表示用。
  const backupLike = looksLikeBackup(flightsText);
  const backup = useMemo(() => (backupLike ? parseFullBackup(flightsText) : null), [backupLike, flightsText]);
  const fParsed = useMemo(() => (flightsText.trim() && !backupLike ? parseBulkFlights(flightsText) : []), [flightsText, backupLike]);
  const aParsed = useMemo(() => (airportsText.trim() ? parseBulkAirports(airportsText, DataSource.customAirports) : []), [airportsText]);

  if (!open) return null;

  const loadFile = (file: File | undefined, mode: Tab) => {
    if (!file) return;
    const label = file.name + ' (' + Math.round(file.size / 1024) + 'KB)';
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      if (mode === 'airports') { setAirportsText(text); setAFileName(label); }
      else { setFlightsText(text); setFFileName(label); }
    };
    reader.readAsText(file);
  };

  async function paste(mode: Tab) {
    setTab(mode);
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        if (mode === 'airports') setAirportsText(text); else setFlightsText(text);
        showToast('📋 Pasted from clipboard');
      } else {
        showToast('Clipboard is empty — paste manually with Ctrl/Cmd+V');
      }
    } catch {
      showToast('Press Ctrl/Cmd+V to paste into the box');
    }
  }

  // フルバックアップの復元：現在のフライト・メモを丸ごと置き換える（破壊的＝必ず確認を出す）。
  // フライトは id 付きで復元されるのでメモとの紐づけが保たれる。カスタム空港は追加マージ（既存は残す）。
  function restoreBackup() {
    if (!backup) { alert('This JSON is not a valid Infinite Flight Dashboard backup file.'); return; }
    const b = backup;
    const cur = DataSource.count;
    const noteCnt = Object.keys(b.memos).length;
    requestConfirm({
      title: 'Restore Full Backup?',
      message: <>This will <strong>replace your current {cur} flight{cur === 1 ? '' : 's'} and all flight notes</strong> with
        the backup ({b.flights.length} flight{b.flights.length === 1 ? '' : 's'}, {noteCnt} note{noteCnt === 1 ? '' : 's'}
        {b.exportedAt ? `, saved ${b.exportedAt.slice(0, 10)}` : ''}).<br />This cannot be undone.</>,
      confirmLabel: '↺ Restore',
      onConfirm: () => {
        DataSource.replaceAll(b.flights);
        DataSource.addAirports(b.customAirports);
        memoStore.replaceAll(b.memos);
        onClose();
        showToast(`✓ Backup restored — ${b.flights.length} flight${b.flights.length === 1 ? '' : 's'}, ${noteCnt} note${noteCnt === 1 ? '' : 's'}`);
      },
    });
  }

  function importNow() {
    if (tab === 'flights') {
      if (backupLike) { restoreBackup(); return; }
      const valid = fParsed.filter((r) => r.valid);
      if (valid.length === 0) { alert('No valid flights to import.'); return; }
      const unknownAPs = new Set<string>();
      valid.forEach((r) => { if (r.valid) [r.dep, r.arr].forEach((c) => { if (!AP[c]) unknownAPs.add(c); }); });
      if (unknownAPs.size > 0) {
        const proceed = confirm(`⚠️ Unknown airports (not in DB): ${[...unknownAPs].join(', ')}\n\nThese won't appear on the map. You can add them later via Import > Airports tab.\n\nImport anyway?`);
        if (!proceed) return;
      }
      const incoming = valid.flatMap((r) => (r.valid ? [{ date: r.date, dep: r.dep, arr: r.arr, ac: r.ac, al: r.al, t: r.t }] : []));
      const wasEmpty = DataSource.count === 0;
      const { added, duplicates } = DataSource.addFlights(incoming, { skipDuplicates: true });
      if (wasEmpty) DataSource.markClean();
      onClose();
      let msg = `✓ ${added.length} flight${added.length === 1 ? '' : 's'} imported`;
      if (duplicates.length) msg += ` (${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} skipped)`;
      showToast(msg);
    } else {
      const valid = aParsed.filter((r) => r.valid);
      if (valid.length === 0) { alert('No valid airports to import.'); return; }
      const newAPs: Record<string, { lat: number; lng: number; city: string; co: string; ct: string }> = {};
      valid.forEach((r) => { if (r.valid) newAPs[r.icao] = { lat: r.lat, lng: r.lng, city: r.city, co: r.co, ct: r.ct }; });
      DataSource.addAirports(newAPs);   // AP へのマージは DataSource が実施
      onClose();
      showToast(`✓ ${valid.length} airport${valid.length > 1 ? 's' : ''} imported`);
    }
  }

  const isAir = tab === 'airports';

  // 送信ショートカット（旧 main.js）：textarea 内は Cmd/Ctrl+Enter のみ（改行を残す）、
  // 入力要素の外（モーダル背景）なら素の Enter で取込。IME 変換中・Shift+Enter は除く。
  const onModalKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA') { if (e.metaKey || e.ctrlKey) { e.preventDefault(); importNow(); } return; }
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT') return;
    e.preventDefault();
    importNow();
  };

  return (
    <div ref={modalRef} className="modal-overlay show" id="bulkOverlay">
      <div className="modal modal-wide">
        <div className="modal-head">
          <h3>📥 Bulk Import</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" ref={bodyRef} tabIndex={-1} onKeyDown={onModalKeyDown}>
          <div className="modal-tabs">
            <button className={'modal-tab' + (!isAir ? ' active' : '')} onClick={() => setTab('flights')}>✈️ Flights</button>
            <button className={'modal-tab' + (isAir ? ' active' : '')} onClick={() => setTab('airports')}>🛬 Airports</button>
          </div>

          {!isAir ? (
            <BulkTab
              text={flightsText} setText={setFlightsText} fileName={fFileName}
              fileRef={fFileRef} onFile={(f) => loadFile(f, 'flights')}
              onPaste={() => paste('flights')}
              onSample={() => { setFlightsText(SAMPLE_FLIGHT_CSV); showToast('👀 Sample data loaded — review it, then click Import'); }}
              onDownloadSample={() => { downloadTextFile('IF_Flight_Log_sample.csv', SAMPLE_FLIGHT_CSV); showToast('⬇️ Sample CSV downloaded'); }}
              accept=".csv,.tsv,.txt,.json"
              fileButtonLabel="📂 Select CSV / Backup file"
              placeholder={FLIGHTS_PLACEHOLDER}
              textRef={fTextRef}
              hint={<FlightsHint />}
              count={backupLike ? <BackupSummary backup={backup} /> : <FlightsCount parsed={fParsed} />}
              preview={backupLike ? null : <FlightsPreview parsed={fParsed} />}
            />
          ) : (
            <BulkTab
              text={airportsText} setText={setAirportsText} fileName={aFileName}
              fileRef={aFileRef} onFile={(f) => loadFile(f, 'airports')}
              onPaste={() => paste('airports')}
              onSample={() => { setAirportsText(SAMPLE_AIRPORT_CSV); showToast('👀 Sample airports loaded — review it, then click Import'); }}
              onDownloadSample={() => { downloadTextFile('IF_Airports_sample.csv', SAMPLE_AIRPORT_CSV); showToast('⬇️ Sample airports CSV downloaded'); }}
              accept=".csv,.tsv,.txt"
              placeholder={AIRPORTS_PLACEHOLDER}
              hint={<AirportsHint />}
              count={<AirportsCount parsed={aParsed} />}
              preview={<AirportsPreview parsed={aParsed} />}
            />
          )}

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={importNow}>
              {isAir ? 'Import Airports' : (backupLike ? '↺ Restore Backup' : 'Import Flights')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 1タブ分の共通レイアウト（ファイル/Paste/サンプル/textarea/hint/count/preview）。
// fileButtonLabel：Flights タブはバックアップ JSON も受けるのでボタン文言を差し替えられるようにする。
function BulkTab({ text, setText, fileName, fileRef, onFile, onPaste, onSample, onDownloadSample, accept, fileButtonLabel = '📂 Select CSV file', placeholder, textRef, hint, count, preview }: {
  text: string; setText: (v: string) => void; fileName: string;
  fileRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File | undefined) => void;
  onPaste: () => void; onSample: () => void; onDownloadSample: () => void;
  accept: string; fileButtonLabel?: string; placeholder: string; textRef?: React.RefObject<HTMLTextAreaElement | null>;
  hint: React.ReactNode; count: React.ReactNode; preview: React.ReactNode;
}) {
  return (
    <div>
      <div className="file-upload-row">
        <button type="button" className="file-upload-btn" onClick={() => fileRef.current?.click()}>{fileButtonLabel}</button>
        <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files?.[0])} />
        <span className="file-upload-name">{fileName}</span>
        <span className="sample-or-group">
          <span className="sample-or-prefix">or</span><button type="button" className="sample-or-btn" onClick={onPaste}>Paste ↓</button>
        </span>
      </div>
      <div className="sample-row">
        <button type="button" className="btn-sample" onClick={onSample}>👀 Load sample data</button>
        <span className="sample-or-group">
          <span className="sample-or-prefix">or</span><button type="button" className="sample-or-btn" onClick={onDownloadSample}>Download sample CSV ↓</button>
        </span>
      </div>
      <div className="bulk-textarea-wrap">
        <textarea ref={textRef} className="bulk-textarea" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        {text.trim() && <button type="button" className="bulk-clear-btn" onClick={() => setText('')} title="Clear input">✕ Clear</button>}
      </div>
      {hint}
      {text.trim() && count}
      {text.trim() && preview}
    </div>
  );
}

// ---- Full backup: 判別時のサマリー（CSV の件数表示の代わりに出す） ----
function BackupSummary({ backup }: { backup: ReturnType<typeof parseFullBackup> }) {
  if (!backup) {
    return (
      <div className="bulk-count" style={{ display: 'flex' }}>
        <span className="invalid">✕ Looks like a backup JSON, but it's not valid — re-export it and try again</span>
      </div>
    );
  }
  const noteCnt = Object.keys(backup.memos).length;
  const apCnt = Object.keys(backup.customAirports).length;
  return (
    <div className="bulk-count" style={{ display: 'flex' }}>
      <span className="valid">💾 Full backup detected</span>
      <span>✈️ {backup.flights.length} flight{backup.flights.length === 1 ? '' : 's'}</span>
      <span>📝 {noteCnt} note{noteCnt === 1 ? '' : 's'}</span>
      <span>🛬 {apCnt} custom airport{apCnt === 1 ? '' : 's'}</span>
      {backup.exportedAt && <span style={{ color: 'var(--text-3)' }}>saved {backup.exportedAt.slice(0, 10)}</span>}
    </div>
  );
}

// ---- Flights: hint / count / preview ----
function FlightsHint() {
  return (
    <div className="bulk-hint">
      <strong>Format (6 columns):</strong> <code>date,dep,arr,aircraft,airline,duration</code><br />
      Separators: <code>,</code> / <code>、</code> / TAB — all OK<br />
      Date: <code>2025-06-01</code> <code>2025/6/1</code> <code>25-06-01</code> <code>20250601</code> — all OK<br />
      Time: <code>1h30m</code> <code>1:30</code> <code>90m</code> <code>1h30</code> <code>1.5h</code> — all OK<br />
      📋 Paste an exported CSV directly (comment lines <code>#</code> and header are auto-skipped)<br />
      🔁 Duplicate flights (same date, route, aircraft, airline, time) are removed automatically<br />
      💾 <strong>Full Backup (JSON)</strong> from Export works here too — auto-detected, restores flights <em>and</em> their notes
    </div>
  );
}
function FlightsCount({ parsed }: { parsed: ReturnType<typeof parseBulkFlights> }) {
  const validCount = parsed.filter((r) => r.valid).length;
  const invalidCount = parsed.filter((r) => !r.valid).length;
  const fixedCount = parsed.filter((r) => r.valid && r.fixes && r.fixes.length > 0).length;
  return (
    <div className="bulk-count" style={{ display: 'flex' }}>
      <span className="valid">✓ {validCount} valid</span>
      {fixedCount > 0 && <span style={{ color: 'var(--cyan)' }}>🔧 {fixedCount} auto-fixed</span>}
      {invalidCount > 0 && <span className="invalid">✕ {invalidCount} errors</span>}
    </div>
  );
}
function FlightsPreview({ parsed }: { parsed: ReturnType<typeof parseBulkFlights> }) {
  if (parsed.length === 0) return null;
  // 表示は日付の新しい順（＝取り込み後のフライトログと同じ並び）。無効行はエラーに気づけるよう先頭へ。
  const view = parsed.map((r, i) => ({ r, i })).sort((a, b) => {
    if (!a.r.valid || !b.r.valid) return (a.r.valid ? 1 : 0) - (b.r.valid ? 1 : 0);
    return String(b.r.date).localeCompare(String(a.r.date));
  });
  return (
    <div className="bulk-preview" style={{ display: '' }}>
      <table>
        <thead><tr><th>Date</th><th>Route</th><th>Aircraft</th><th>Airline</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>
          {view.map(({ r, i }) => r.valid ? (
            <tr key={i}>
              <td>{r.date}</td>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{r.dep} → {r.arr}</td>
              <td>{r.ac}</td><td>{r.al}</td><td>{r.t}</td>
              <td style={{ color: r.fixes.length ? 'var(--cyan)' : 'var(--green)', cursor: r.fixes.length ? 'help' : 'default' }} title={r.fixes.length ? r.fixes.join(', ') : undefined}>{r.fixes.length ? '🔧' : '✓'}</td>
            </tr>
          ) : (
            <tr key={i} className="row-error"><td colSpan={5}>{r.raw.substring(0, 80)}</td><td>{r.reason}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Airports: hint / count / preview ----
function AirportsHint() {
  return (
    <div className="bulk-hint">
      <strong>Quick mode:</strong> enter ICAO codes only → auto-resolved from built-in DB (hundreds of airports)<br />
      <strong>Manual mode (6 columns):</strong> <code>icao,lat,lng,city,country,continent</code> — for airports not in the DB<br />
      Separators: <code>,</code> / <code>、</code> / TAB — all OK<br />
      📋 Lines starting with <code>#</code> are comments (ignored)
    </div>
  );
}
function AirportsCount({ parsed }: { parsed: ReturnType<typeof parseBulkAirports> }) {
  const validCount = parsed.filter((r) => r.valid).length;
  const invalidCount = parsed.filter((r) => !r.valid).length;
  const autoCount = parsed.filter((r) => r.valid && r.source === 'auto').length;
  const existCount = parsed.filter((r) => r.valid && r.source === 'existing').length;
  return (
    <div className="bulk-count" style={{ display: 'flex' }}>
      <span className="valid">✓ {validCount} valid</span>
      {autoCount > 0 && <span style={{ color: 'var(--cyan)' }}>⚡ {autoCount} auto</span>}
      {existCount > 0 && <span style={{ color: 'var(--amber)' }}>● {existCount} existing</span>}
      {invalidCount > 0 && <span className="invalid">✕ {invalidCount} errors</span>}
    </div>
  );
}
function AirportsPreview({ parsed }: { parsed: ReturnType<typeof parseBulkAirports> }) {
  if (parsed.length === 0) return null;
  const labels = { auto: '⚡ DB Auto', existing: '● Already loaded', manual: '✎ Manual' };
  const colors = { auto: 'var(--cyan)', existing: 'var(--amber)', manual: 'var(--green)' };
  return (
    <div className="bulk-preview" style={{ display: '' }}>
      <table>
        <thead><tr><th>ICAO</th><th>City</th><th>Country</th><th>Continent</th><th>Coords</th><th>Source</th></tr></thead>
        <tbody>
          {parsed.map((r, i) => r.valid ? (
            <tr key={i}>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.icao}</td>
              <td>{r.city}</td><td>{r.co}</td><td>{r.ct}</td>
              <td>{r.lat.toFixed(2)}, {r.lng.toFixed(2)}</td>
              <td style={{ color: colors[r.source] }}>{labels[r.source]}</td>
            </tr>
          ) : (
            <tr key={i} className="row-error"><td colSpan={5}>{r.raw.substring(0, 80)}</td><td>{r.reason}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FLIGHTS_PLACEHOLDER = `# IF_FlightLog v1
date,dep,arr,aircraft,airline,duration
2025-06-01,RJTT,RJOO,B772,ANA,1h15m
2025/6/2,rjoo,rjtt,a359,Japan Airlines,1:10
25-06-03,RJTT,RJCC,b77w,ANA,90m

# Lines starting with # are comments (ignored)
# Date, time, case, and quotes are auto-corrected
# Separators: comma (,) / Japanese comma (、) / TAB are all accepted`;

const AIRPORTS_PLACEHOLDER = `# IF_Airports v1
# Quick mode: just ICAO codes (auto-resolved from built-in DB of hundreds of airports)
RJNK
RKPC
KJFK

# Manual mode: for airports not in the DB
icao,lat,lng,city,country,continent
XXXX,35.123,139.456,CityName,Country,Asia`;
