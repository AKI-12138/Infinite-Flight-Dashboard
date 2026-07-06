import { useEffect, useState } from 'react';
import { runSelfChecks, type CheckResult } from '../../lib/self-check';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

// 🛠️ Self-check（設定メニュー Status → Self-check）。開くたびに lib/self-check の診断を実行し、
// 「全部通ったか」＋落ちた項目だけを表示する（オーナー要望 2026-07-07：全項目のリストは出さない）。
// 開発時の自動テスト（vitest）はアプリ内では動かないため、これはその要点を現場（ユーザーの
// ブラウザ）で検査する軽量版。不具合報告への導線（GitHub Issues）もここに置く。
const REPORT_BUG_URL = 'https://github.com/AKI-12138/Infinite-Flight-Dashboard/issues';

export function SelfCheckModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [results, setResults] = useState<CheckResult[]>([]);
  const modalRef = useModalKeyboard(open, onClose);

  // 開くたびに実行（全チェック同期・数 ms で終わる）。
  useEffect(() => {
    if (open) setResults(runSelfChecks());
  }, [open]);

  if (!open) return null;

  const failed = results.filter((r) => !r.ok);
  const allOk = failed.length === 0;

  return (
    <div ref={modalRef} className="modal-overlay show" id="selfCheckOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>🛠️ Function-test</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* 総合判定：全部通れば緑一行、失敗があれば件数＋落ちた項目だけ列挙 */}
          <div className={'selfcheck-summary' + (allOk ? ' is-ok' : ' is-fail')}>
            {allOk
              ? <>✓ All {results.length} checks passed</>
              : <>⚠️ {failed.length} of {results.length} checks failed</>}
          </div>

          {!allOk && (
            <ul className="selfcheck-fails">
              {failed.map((r) => (
                <li key={r.key}>
                  <strong>{r.label}</strong>
                  {r.detail && <span className="selfcheck-detail">{r.detail}</span>}
                </li>
              ))}
            </ul>
          )}

          <p className="selfcheck-note">
            Checks the app running in <em>your</em> browser: storage, data integrity, notes linkage,
            normalization, stats logic, CSV / backup round-trips, and the airport database.
            (The full automated test suite runs during development.)
          </p>

          <div className="modal-actions">
            <a className="btn-outline" href={REPORT_BUG_URL} target="_blank" rel="noopener noreferrer">Report a bug</a>
            <button className="btn-primary" onClick={() => setResults(runSelfChecks())}>↻ Run again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
