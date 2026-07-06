import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoredFlight } from '../../lib/datasource';
import { memoStore, cleanMemoFields } from '../../lib/memo-store';
import {
  MEMO_SECTIONS, formatMemoValue, getMemoUnit,
  splitClock, combineClock, splitDuration, combineDuration, type MemoFieldDef,
} from '../../lib/memo-config';
import { requestConfirm } from '../../lib/confirm';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { AutocompleteInput } from './AutocompleteInput';

// 編集フォームの候補リスト：全メモを走査して「同じ項目に過去入力した値」を頻度順で集める
// （Add Flight の autocomplete と同じ操作感）。text 項目用（date/clock/duration は専用入力）。
function buildSuggestionMap(): Record<string, string[]> {
  const counts: Record<string, Map<string, number>> = {};
  Object.values(memoStore.all()).forEach((memo) => {
    Object.entries(memo.fields).forEach(([key, value]) => {
      const m = (counts[key] ??= new Map());
      m.set(value, (m.get(value) ?? 0) + 1);
    });
  });
  const map: Record<string, string[]> = {};
  Object.entries(counts).forEach(([key, m]) => {
    map[key] = [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([v]) => v);
  });
  return map;
}

// 時刻・所要時間の2箱入力の固定候補（Add Flight の time-h/time-m と同じ見た目のリスト）。
const CLOCK_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const CLOCK_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const DUR_HOURS = ['0', '1', '2'];
const DUR_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5));

// 📝 Flight Notes（フライト詳細メモ）。項目は memo-config.ts の宣言的定義から機械的に描画する。
// - メモが空 → いきなり編集モード／記入済み → 閲覧モード＋ Edit ボタン（オーナー指定の挙動）。
// - 全項目任意入力。保存時に空項目は落とし、全部空ならメモごと削除（memo-store の正準化）。
// - 編集中に未保存の変更があるまま閉じようとしたら確認を出す（破壊的操作の確認を壊さない）。
// - 統計・CSV には一切影響しない（保存先は memo-store＝別キー）。
export function FlightMemoModal({ flight, onClose }: { flight: StoredFlight | null; onClose: () => void }) {
  const open = flight !== null;
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [draft, setDraft] = useState<Record<string, string>>({});
  // 開いた時点の保存済み fields（dirty 判定と Cancel の戻し先）。null = メモ無し。
  const [saved, setSaved] = useState<Record<string, string> | null>(null);

  // 開くたびに保存済みメモを読み、無ければ編集モード・あれば閲覧モードで開く。
  useEffect(() => {
    if (!flight) return;
    const memo = memoStore.get(flight.id);
    const fields = memo ? { ...memo.fields } : {};
    setSaved(memo ? memo.fields : null);
    setDraft(fields);
    setMode(memo ? 'view' : 'edit');
  }, [flight]);

  // 未保存の変更があるか（編集モードのみ意味を持つ）。正準形どうしで比較する。
  const isDirty = () => {
    const a = cleanMemoFields(draft);
    const b = saved ?? {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].some((k) => (a[k] || '') !== (b[k] || ''));
  };

  // 閉じる（✕ / ESC）：編集中で未保存なら確認してから閉じる。
  const closeAttempt = () => {
    if (mode === 'edit' && isDirty()) {
      requestConfirm({
        title: 'Discard unsaved changes?',
        message: <>Your edits to these flight notes haven't been saved.<br />Close without saving?</>,
        confirmLabel: 'Discard',
        onConfirm: onClose,
      });
      return;
    }
    onClose();
  };

  // useModalKeyboard には毎レンダー同一のコールバックを渡す（closeAttempt は draft/mode に依存して
  // 毎回作り直される → そのまま渡すと effect が入力のたびに張り直され、フォーカスが飛ぶ）。
  const closeRef = useRef(closeAttempt);
  closeRef.current = closeAttempt;
  const stableClose = useCallback(() => closeRef.current(), []);
  const modalRef = useModalKeyboard(open, stableClose);

  if (!flight) return null;

  const save = () => {
    memoStore.save(flight.id, draft);
    const clean = cleanMemoFields(draft);
    if (Object.keys(clean).length === 0) {
      onClose();
      showToast('Notes were empty — nothing saved');
      return;
    }
    setSaved(clean);
    setDraft({ ...clean });
    setMode('view');
    showToast('✓ Flight notes saved');
  };

  // 編集キャンセル：メモが元々あれば閲覧に戻る、新規なら閉じる（いずれも未保存変更は確認）。
  const cancelEdit = () => {
    const revert = () => {
      if (saved) { setDraft({ ...saved }); setMode('view'); }
      else onClose();
    };
    if (isDirty()) {
      requestConfirm({
        title: 'Discard unsaved changes?',
        message: <>Your edits to these flight notes haven't been saved.<br />Discard them?</>,
        confirmLabel: 'Discard',
        onConfirm: revert,
      });
      return;
    }
    revert();
  };

  const deleteMemo = () => {
    requestConfirm({
      title: 'Delete these notes?',
      message: <>Remove all notes for <strong>{flight.dep} → {flight.arr}</strong> on {flight.date}?<br />The flight itself stays in your log. This cannot be undone.</>,
      confirmLabel: '🗑️ Delete',
      onConfirm: () => { memoStore.delete(flight.id); onClose(); showToast('🗑️ Flight notes deleted', 'red'); },
    });
  };

  const setField = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div ref={modalRef} className="modal-overlay show" id="flightMemoOverlay">
      <div className="modal modal-wide memo-modal">
        <div className="modal-head">
          <h3>📝 Flight Notes</h3>
          <button className="btn-close" onClick={closeAttempt}>✕</button>
        </div>
        <div className="modal-body adv-modal-body">
          {/* どのフライトのメモか（ログと同じタグ表現で） */}
          <div className="memo-flight-line">
            <span className="route-tag">{flight.dep} → {flight.arr}</span>
            <span className="date-tag">{flight.date}</span>
            <span className="aircraft-tag">{flight.ac}</span>
            <span className="airline-tag">{flight.al}</span>
            <span className="time-tag">{flight.t}</span>
          </div>
          <p className="memo-intro">
            {mode === 'edit'
              ? 'All fields are optional — fill in only what you want to remember. Notes are saved separately and never affect your stats or CSV.'
              : 'Saved notes for this flight. Notes never affect your stats or CSV.'}
          </p>

          {mode === 'edit' ? <MemoEditForm flight={flight} draft={draft} setField={setField} /> : <MemoViewBody fields={saved ?? {}} />}

          <div className="modal-actions adv-actions">
            {mode === 'edit' ? (
              <>
                <button className="btn-outline" onClick={cancelEdit}>Cancel</button>
                <button className="btn-primary" onClick={save}>Save Notes</button>
              </>
            ) : (
              <>
                <button className="btn-danger" onClick={deleteMemo}>🗑️ Delete</button>
                <button className="btn-primary" onClick={() => setMode('edit')}>✏️ Edit</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 編集フォーム：全セクション・全項目を描画（half は 2 カラムに並ぶ） ----
function MemoEditForm({ flight, draft, setField }: {
  flight: StoredFlight; draft: Record<string, string>; setField: (k: string, v: string) => void;
}) {
  // 過去の入力値からの候補（開いている間は固定＝編集中の値で候補が揺れない）。
  const suggestionMap = useMemo(() => buildSuggestionMap(flight), [flight]);
  return (
    <div>
      {MEMO_SECTIONS.map((sec, i) => (
        <div key={sec.key}>
          <div className="adv-section-label">{sec.label}</div>
          <div className="memo-grid">
            {sec.fields.map((f) => (
              <MemoInput key={f.key} def={f} value={draft[f.key] ?? ''}
                suggestions={suggestionMap[f.key] ?? []} onChange={(v) => setField(f.key, v)} />
            ))}
          </div>
          {i < MEMO_SECTIONS.length - 1 && <hr className="adv-divider" />}
        </div>
      ))}
    </div>
  );
}

function MemoInput({ def, value, suggestions, onChange }: {
  def: MemoFieldDef; value: string; suggestions: string[]; onChange: (v: string) => void;
}) {
  const id = 'memo-' + def.key;
  // 単位つき項目はラベルに (kt) 等を明示＝「数値だけでよい」ことが分かる。
  const label = def.unit ? `${def.label} (${getMemoUnit(def.unit)})` : def.label;
  if (def.type === 'textarea') {
    return (
      <div className="form-group memo-full">
        <label className="form-label" htmlFor={id}>{label}</label>
        <textarea id={id} className="form-input memo-textarea" placeholder={def.placeholder}
          value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  return (
    <AutocompleteInput id={id} label={label} value={value} onChange={onChange}
      suggestions={suggestions} placeholder={def.placeholder}
      wrapClassName={'form-group ac-wrap' + (def.half ? '' : ' memo-full')} />
  );
}

// ---- 閲覧表示：全セクション・全項目を表示（未入力は空欄「—」）＝紙のフライトログ風 ----
function MemoViewBody({ fields }: { fields: Record<string, string> }) {
  return (
    <div>
      {MEMO_SECTIONS.map((sec, i) => (
        <div key={sec.key}>
          <div className="adv-section-label">{sec.label}</div>
          <div className="memo-grid">
            {sec.fields.map((f) => {
              const raw = (fields[f.key] || '').trim();
              const shown = raw ? formatMemoValue(f, raw) : '';
              return (
                <div key={f.key} className={'memo-view-item' + (f.type === 'textarea' ? ' memo-full' : '')}>
                  <span className="form-label">{f.label}</span>
                  {shown
                    ? <span className="memo-view-value">{shown}</span>
                    : <span className="memo-view-value memo-view-blank">—</span>}
                </div>
              );
            })}
          </div>
          {i < MEMO_SECTIONS.length - 1 && <hr className="adv-divider" />}
        </div>
      ))}
    </div>
  );
}
