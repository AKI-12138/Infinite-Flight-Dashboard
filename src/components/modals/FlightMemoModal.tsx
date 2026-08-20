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
import { airlineCodeSuggestions, type CodeItem } from '../../lib/airline-codes';
import { AppIcon } from '../icons/AppIcon';
import { getACData } from '../../lib/ac-data';
import { decodeMetar } from '../../lib/metar';

// METAR の参照日（年月の補完用）：出発/到着それぞれの LOC 日付、無ければフライトの日付。
function metarRefDate(key: string, fields: Record<string, string>, flightDate: string): string {
  if (key === 'metarDep') return fields.depDateLoc || flightDate || '';
  if (key === 'metarArr') return fields.arrDateLoc || fields.depDateLoc || flightDate || '';
  return '';
}

// METAR の自動解読ブロック（生の METAR の下に label/value で表示）。解読できなければ何も出さない。
// refDate（フライトの日付）があれば Observed を年月日に補完する。
function MetarDecoded({ raw, refDate }: { raw: string; refDate?: string }) {
  const lines = decodeMetar(raw, refDate);
  if (!lines) return null;
  return (
    <div className="metar-decoded">
      {lines.map((l, i) => (
        <div className="metar-decoded-row" key={i}>
          <span className="metar-decoded-label">{l.label}</span>
          <span className="metar-decoded-value">{l.value}</span>
        </div>
      ))}
    </div>
  );
}

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

// グリッド配置のクラス（memo-grid は 2 カラム）：half でない＝全幅、rowStart＝必ず左カラムから。
function gridClass(def: MemoFieldDef): string {
  return (def.half ? '' : ' memo-full') + (def.rowStart ? ' memo-row-start' : '');
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
// - draftMode（Add Flight の「Add Notes」用・オーナー指定 2026-07-11）：フライトはまだ未保存。
//   memo-store には触れず、確定ボタン「Add Flight」で onCommit(fields) を呼んで親がフライト＋メモを
//   一緒に保存する。Back/✕ は onClose（＝Add Flight フォームへ戻る）。flight.id は未採番のダミー。
export function FlightMemoModal({ flight, onClose, draftMode = false, onCommit }: {
  flight: StoredFlight | null;
  onClose: () => void;
  draftMode?: boolean;
  onCommit?: (fields: Record<string, string>) => void;
}) {
  const open = flight !== null;
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [draft, setDraft] = useState<Record<string, string>>({});
  // 開いた時点の保存済み fields（Cancel の戻し先）。null = メモ無し。
  const [saved, setSaved] = useState<Record<string, string> | null>(null);
  // dirty 判定の基準＝開いた時点の内容。新規メモは日付が先埋めされるため saved と別に持つ
  // （先埋めだけの状態を「未保存の変更」にしない・オーナー指定 2026-07-11）。
  const [baseline, setBaseline] = useState<Record<string, string>>({});

  // 開くたびに保存済みメモを読み、無ければ編集モード・あれば閲覧モードで開く。
  // 新規（メモ無し・draftMode）は日付（LOC）をそのフライトの日付で先埋め＝毎回選ぶ手間を省く。
  useEffect(() => {
    if (!flight) return;
    const prefill = { depDateLoc: flight.date, arrDateLoc: flight.date };
    if (draftMode) { setSaved(null); setDraft({ ...prefill }); setBaseline(prefill); setMode('edit'); return; }
    const memo = memoStore.get(flight.id);
    setSaved(memo ? memo.fields : null);
    setDraft(memo ? { ...memo.fields } : { ...prefill });
    setBaseline(memo ? memo.fields : prefill);
    setMode(memo ? 'view' : 'edit');
  }, [flight, draftMode]);

  // 未保存の変更があるか（編集モードのみ意味を持つ）。正準形どうしで比較する。
  const isDirty = () => {
    const a = cleanMemoFields(draft);
    const b = cleanMemoFields(baseline);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].some((k) => (a[k] || '') !== (b[k] || ''));
  };

  // 閉じる（✕ / ESC）：編集中で未保存なら確認してから閉じる。
  // draftMode の「閉じる」はフライト追加の中止ではなく Add Flight フォームへ戻る操作。
  const closeAttempt = () => {
    if (mode === 'edit' && isDirty()) {
      requestConfirm({
        title: 'Discard unsaved changes?',
        message: draftMode
          ? <>These notes haven't been saved.<br />Discard them and go back to the flight form?</>
          : <>Your edits to these flight notes haven't been saved.<br />Close without saving?</>,
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
    // draftMode：memo-store には触れず、親（AddFlightModal）にフィールドを渡して
    // フライト＋メモを一緒に確定してもらう（閉じる処理も親側）。
    // 先埋め（日付）から何も変えていなければ「メモ無し」として渡す＝空メモを作らない。
    if (draftMode) { onCommit?.(isDirty() ? cleanMemoFields(draft) : {}); return; }
    // 新規メモで先埋めから変更なし＝実質空。保存せず閉じる（日付だけのメモを作らない）。
    if (!saved && !isDirty()) {
      onClose();
      showToast('Notes were empty — nothing saved');
      return;
    }
    memoStore.save(flight.id, draft);
    const clean = cleanMemoFields(draft);
    if (Object.keys(clean).length === 0) {
      onClose();
      showToast('Notes were empty — nothing saved');
      return;
    }
    setSaved(clean);
    setDraft({ ...clean });
    setBaseline(clean);
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
        message: draftMode
          ? <>These notes haven't been saved.<br />Discard them and go back to the flight form?</>
          : <>Your edits to these flight notes haven't been saved.<br />Discard them?</>,
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
      confirmLabel: 'Delete',
      onConfirm: () => { memoStore.delete(flight.id); onClose(); showToast('Flight notes deleted', 'red'); },
    });
  };

  const setField = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div ref={modalRef} className="modal-overlay show" id="flightMemoOverlay">
      <div className="modal modal-wide memo-modal">
        <div className="modal-head">
          <h3><AppIcon name="notes" size={20} className="modal-title-ico" />Flight Notes</h3>
          <button className="btn-close" onClick={closeAttempt}>✕</button>
        </div>
        <div className="modal-body adv-modal-body">
          {/* どのフライトのメモかは、シート内の自動項目（Route/Date/Aircraft/Airline/air time）が
              示すため、上部のタグ行は廃止（オーナー指定 2026-07-11）。 */}
          <p className="memo-intro">
            {mode === 'edit'
              ? (draftMode
                  ? 'All fields are optional — fill in only what you want to remember. The flight is added when you press Add Flight.'
                  : 'All fields are optional — fill in only what you want to remember. Notes are saved separately and never affect your stats or CSV.')
              : 'Saved notes for this flight. Notes never affect your stats or CSV.'}
          </p>

          {mode === 'edit' ? <MemoEditForm flight={flight} draft={draft} setField={setField} /> : <MemoViewBody fields={saved ?? {}} flight={flight} />}

          <div className="modal-actions adv-actions">
            {mode === 'edit' ? (
              <>
                {/* draftMode：Back＝フォームへ戻る／Add Flight＝フライト＋ノートを一緒に確定 */}
                <button className="btn-outline" onClick={cancelEdit}>{draftMode ? 'Back' : 'Cancel'}</button>
                <button className="btn-primary" onClick={save}>{draftMode ? 'Add Flight' : 'Save Notes'}</button>
              </>
            ) : (
              <>
                <button className="btn-danger" onClick={deleteMemo}>Delete</button>
                <button className="btn-primary" onClick={() => setMode('edit')}>Edit</button>
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
  const suggestionMap = useMemo(() => buildSuggestionMap(), [flight]);
  // 説明つき候補（code＋detail）を項目ごとに用意する。いずれも自由入力は維持。
  // - 便名/Callsign（オーナー指定 2026-07-11）：自便のエアラインのコード → 過去の入力値 → 他社コード。
  // - ac: 'airport' の項目（Alternate airport・ADV-008）：過去の入力値 → 空港DB（ICAO＋都市, 国）。
  const codeItems = useMemo(() => {
    const dedup = (list: CodeItem[]) => {
      const seen = new Set<string>();
      return list.filter((d) => !seen.has(d.code) && (seen.add(d.code), true));
    };
    const history = (key: string): CodeItem[] => (suggestionMap[key] ?? []).map((s) => ({ code: s, detail: '' }));
    const map: Record<string, CodeItem[]> = {};
    (['flightNo', 'callsign'] as const).forEach((key) => {
      const { own, others } = airlineCodeSuggestions(key, flight.al);
      map[key] = dedup([...own, ...history(key), ...others]);
    });
    const airports = getACData('airport', []);
    MEMO_SECTIONS.flatMap((s) => s.fields).forEach((f) => {
      if (f.ac === 'airport') map[f.key] = dedup([...history(f.key), ...airports]);
    });
    return map;
  }, [flight, suggestionMap]);
  return (
    <div>
      {MEMO_SECTIONS.map((sec, i) => (
        <div key={sec.key}>
          <div className="adv-section-label">{sec.label}</div>
          <div className="memo-grid">
            {sec.fields.map((f) => {
              // computed が null ＝この便では自動計算できない（未収録空港の UTC 等）→ 手入力へ。
              // 計算が空（材料待ち）でも過去に手入力した値が残っている場合は手入力欄を出す（データを隠さない）。
              const cv = f.computed ? f.computed(draft, flight) : null;
              const useComputed = f.computed && cv !== null && !(cv === '' && (draft[f.key] ?? '').trim() !== '');
              if (useComputed) return <MemoComputedItem key={f.key} def={f} value={cv!} />;
              // callsign は「テキスト＋Heavy/Super のインライン選択」を1組で描画（wake は内部キーに保存）。
              if (f.key === 'callsign') {
                return <CallsignInput key={f.key} def={f}
                  callsign={draft.callsign ?? ''} wake={draft.wake ?? ''}
                  suggestions={suggestionMap.callsign ?? []} items={codeItems.callsign}
                  onCallsign={(v) => setField('callsign', v)} onWake={(v) => setField('wake', v)} />;
              }
              return <MemoInput key={f.key} def={f} value={draft[f.key] ?? ''}
                suggestions={suggestionMap[f.key] ?? []} items={codeItems[f.key]}
                onChange={(v) => setField(f.key, v)}
                decodeRefDate={f.decode === 'metar' ? metarRefDate(f.key, draft, flight.date) : undefined} />;
            })}
          </div>
          {i < MEMO_SECTIONS.length - 1 && <hr className="adv-divider" />}
        </div>
      ))}
    </div>
  );
}

// 自動項目（Taxi total・フライト本体由来・UTC 換算）の編集モード表示：
// 入力欄と同じ位置に読み取り専用で live 表示。値は保存されない（導出のみ）＝「auto」バッジでそれを示す。
function MemoComputedItem({ def, value }: { def: MemoFieldDef; value: string }) {
  return (
    <div className={'form-group' + gridClass(def)}>
      <span className="form-label">{def.label} <span className="memo-auto-tag">auto</span></span>
      <div className="memo-computed">{value || '—'}</div>
    </div>
  );
}

function MemoInput({ def, value, suggestions, items, onChange, decodeRefDate }: {
  def: MemoFieldDef; value: string; suggestions: string[]; items?: CodeItem[];
  onChange: (v: string) => void; decodeRefDate?: string;
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
        {def.decode === 'metar' && <MetarDecoded raw={value} refDate={decodeRefDate} />}
      </div>
    );
  }
  // 日付：Add Flight の Date と同じネイティブ日付ピッカー（カレンダー UI・値は YYYY-MM-DD）。
  if (def.type === 'date') {
    return (
      <div className={'form-group' + gridClass(def)}>
        <label className="form-label" htmlFor={id}>{label}</label>
        <input id={id} type="date" className="form-input" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // 選択式（Yes/No 等）：未選択は空（"—"）＝任意入力の原則を保つ。
  if (def.type === 'select') {
    return (
      <div className={'form-group' + gridClass(def)}>
        <label className="form-label" htmlFor={id}>{label}</label>
        <select id={id} className="form-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  // 時刻（HH:MM）／所要時間（h+m）：Add Flight の Flight Time と同じ「2箱＋固定候補」。
  if (def.type === 'clock' || def.type === 'duration') {
    return <MemoTimePair def={def} label={label} value={value} onChange={onChange} />;
  }
  // 空港コード欄（Alternate airport）は Add Flight の ICAO 入力と同じく大文字で扱う（自由入力は維持）。
  const isIcao = def.ac === 'airport';
  return (
    <AutocompleteInput id={id} label={label} value={value}
      onChange={(v) => onChange(isIcao ? v.toUpperCase() : v)} uppercase={isIcao}
      suggestions={suggestions} suggestionItems={items} placeholder={def.placeholder}
      wrapClassName={'form-group ac-wrap' + gridClass(def)} />
  );
}

// Callsign 専用：テキスト入力＋ Heavy/Super のインライン選択（1組）。
// テキストは callsign、選択は wake（内部キー）に保存。閲覧では MemoViewBody が "ANA6 Heavy" と連結表示。
function CallsignInput({ def, callsign, wake, suggestions, items, onCallsign, onWake }: {
  def: MemoFieldDef; callsign: string; wake: string; suggestions: string[]; items?: CodeItem[];
  onCallsign: (v: string) => void; onWake: (v: string) => void;
}) {
  const id = 'memo-' + def.key;
  return (
    <div className={'form-group' + gridClass(def)}>
      <label className="form-label" htmlFor={id}>{def.label}</label>
      <div className="callsign-input">
        <AutocompleteInput id={id} value={callsign} onChange={onCallsign}
          suggestions={suggestions} suggestionItems={items} placeholder={def.placeholder}
          wrapClassName="ac-wrap" />
        <select className="form-input callsign-wake" value={wake}
          onChange={(e) => onWake(e.target.value)} aria-label="Wake category (Heavy / Super)">
          <option value="">—</option>
          <option value="Heavy">Heavy</option>
          <option value="Super">Super</option>
        </select>
      </div>
    </div>
  );
}

// 時刻/所要時間の2箱入力。表示中は箱ごとのローカル値（入力の自由度優先）、
// draft へは常に正準形（clock "09:15"／duration "1h05m"・"12m"）で書き戻す。
// Cancel 復帰などで外から value が変わったときはローカルを作り直す。
function MemoTimePair({ def, label, value, onChange }: {
  def: MemoFieldDef; label: string; value: string; onChange: (v: string) => void;
}) {
  const isClock = def.type === 'clock';
  const split = isClock ? splitClock : splitDuration;
  const combine = isClock ? combineClock : combineDuration;
  const [a, setA] = useState(() => split(value)[0]);
  const [b, setB] = useState(() => split(value)[1]);
  // 外部からの値変更（Cancel の巻き戻し・別フライトへの切替）と同期する。
  useEffect(() => {
    if (combine(a, b) !== (value || '')) {
      const [na, nb] = split(value);
      setA(na); setB(nb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const update = (na: string, nb: string) => { setA(na); setB(nb); onChange(combine(na, nb)); };
  const id = 'memo-' + def.key;
  return (
    <div className={'form-group' + gridClass(def)}>
      <label className="form-label" htmlFor={id + '-h'}>{label}</label>
      <div className="flight-time-input">
        <AutocompleteInput id={id + '-h'} wrapClassName="ac-wrap" inputMode="numeric" maxLength={2}
          placeholder={isClock ? '09' : '0'} value={a} onChange={(v) => update(v, b)}
          suggestions={isClock ? CLOCK_HOURS : DUR_HOURS} />
        <span className="time-unit">{isClock ? ':' : 'h'}</span>
        <AutocompleteInput id={id + '-m'} wrapClassName="ac-wrap" inputMode="numeric" maxLength={2}
          placeholder={isClock ? '15' : '0'} value={b} onChange={(v) => update(a, v)}
          suggestions={isClock ? CLOCK_MINUTES : DUR_MINUTES} />
        {!isClock && <span className="time-unit">m</span>}
      </div>
    </div>
  );
}

// ---- 閲覧表示：全セクション・全項目を表示（未入力は空欄「—」）＝紙のフライトログ風 ----
// 「記入済みのディスパッチ用紙」の見立て（オーナー指定 2026-07-11）：
// 紙面（.memo-sheet）の上に、ラベル → 点線リーダー → 値 の記入行が並ぶ。
// 自由記述（Route・METAR・Notes）は罫線ノートの升目に書かれた体（.memo-view-block）。
function MemoViewBody({ fields, flight }: { fields: Record<string, string>; flight: StoredFlight }) {
  return (
    <div className="memo-sheet">
      {MEMO_SECTIONS.map((sec, i) => (
        <div key={sec.key}>
          <div className="adv-section-label">{sec.label}</div>
          <div className="memo-grid">
            {sec.fields.map((f) => {
              // computed が null（自動計算不能）or 空（材料待ち）の便では、手入力で保存された値を表示する。
              const stored = (fields[f.key] || '').trim();
              let raw = f.computed ? (f.computed(fields, flight) || stored) : stored;
              // callsign は wake（Heavy/Super）を連結して1行で見せる（例："ANA6 Heavy"）。
              if (f.key === 'callsign') raw = [stored, (fields.wake || '').trim()].filter(Boolean).join(' ');
              const shown = raw ? formatMemoValue(f, raw) : '';
              const isBlock = f.type === 'textarea';
              return (
                <div key={f.key} className={'memo-view-item' + (isBlock ? ' memo-full memo-view-block' : '') + (f.rowStart ? ' memo-row-start' : '')}>
                  <span className="form-label">{f.label}</span>
                  {!isBlock && <span className="memo-view-leader" aria-hidden="true" />}
                  {shown
                    ? <span className="memo-view-value">{shown}</span>
                    : <span className="memo-view-value memo-view-blank">—</span>}
                  {f.decode === 'metar' && shown && <MetarDecoded raw={raw} refDate={metarRefDate(f.key, fields, flight.date)} />}
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
