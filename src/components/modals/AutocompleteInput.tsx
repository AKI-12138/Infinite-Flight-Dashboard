import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { getACData, type ACItem, type ACType } from '../../lib/ac-data';
import type { Flight } from '../../lib/compute';

// ac-list を最大5件表示し、モーダル本体の空きに応じて上/下開きを切り替える（旧 _acShow）。
const AC_MAX_VISIBLE = 5;
function positionList(input: HTMLElement, list: HTMLElement) {
  list.style.maxHeight = '';
  list.classList.remove('ac-up');
  const sample = list.querySelector('.ac-item');
  const itemH = sample ? sample.getBoundingClientRect().height : 35;
  const desired = Math.ceil(itemH * AC_MAX_VISIBLE) + 2;
  const margin = 8;
  const rect = input.getBoundingClientRect();
  const container = input.closest('.modal-body');
  const cRect = container ? container.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  const spaceBelow = cRect.bottom - rect.bottom - margin;
  const spaceAbove = rect.top - cRect.top - margin;
  const openDown = spaceBelow >= desired || spaceBelow >= spaceAbove;
  const floor = Math.ceil(itemH * 2);
  if (openDown) {
    list.classList.remove('ac-up');
    list.style.maxHeight = Math.max(floor, Math.min(desired, spaceBelow)) + 'px';
  } else {
    list.classList.add('ac-up');
    list.style.maxHeight = Math.max(floor, Math.min(desired, spaceAbove)) + 'px';
  }
}

// 入力に応じて候補を絞る（旧 acUpdate）。time 系は常に固定全件。
function computeItems(type: ACType, value: string, flights: Flight[]): ACItem[] {
  if (type === 'time-h' || type === 'time-m') return getACData(type, flights);
  const q = value.toUpperCase().trim();
  const data = getACData(type, flights);
  if (q.length === 0) return data.slice(0, 8);
  return data.filter((d) => d.code.toUpperCase().includes(q) || d.detail.toUpperCase().includes(q)).slice(0, 10);
}

// 汎用候補（suggestions 指定時）：与えられた文字列リストから入力で絞る。
// Add Flight の固定 4 種（空港/機材/…）と違い、呼び出し側が候補を自由に組める（メモの「過去の入力値」用）。
function computeFromSuggestions(suggestions: string[], value: string): ACItem[] {
  const q = value.toUpperCase().trim();
  const hits = q.length === 0
    ? suggestions.slice(0, 8)
    : suggestions.filter((s) => s.toUpperCase().includes(q) && s !== value).slice(0, 8);
  return hits.map((s) => ({ code: s, detail: '' }));
}

export interface AutocompleteInputProps {
  id: string;
  type?: ACType;               // suggestions を使う場合は省略可
  value: string;
  onChange: (v: string) => void;
  flights?: Flight[];          // type 使用時のみ必要
  suggestions?: string[];      // 汎用候補（指定時は type/flights より優先）
  label?: string;
  wrapClassName?: string;      // 既定 'form-group ac-wrap'
  placeholder?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'decimal' | 'text';
  uppercase?: boolean;         // 表示を大文字化（値はそのまま）
}

// Add Flight フォーム用の autocomplete 入力（旧 render.js の acUpdate/_acShow/acSelect/acHide の React 化）。
// suggestions を渡すと汎用の「候補つきテキスト入力」としても使える（フライトメモの過去値候補）。
export function AutocompleteInput({
  id, type, value, onChange, flights = [], suggestions,
  label, wrapClassName = 'form-group ac-wrap', placeholder, maxLength, inputMode, uppercase,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ACItem[]>([]);
  const [active, setActive] = useState(-1); // 矢印キーで選択中の候補（-1＝未選択）
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const refresh = (v: string) => {
    const next = suggestions ? computeFromSuggestions(suggestions, v) : (type ? computeItems(type, v, flights) : []);
    setItems(next);
    setOpen(next.length > 0);
    setActive(-1); // 入力が変わったらハイライトをリセット
  };

  const select = (item: ACItem) => { onChange(item.code); setOpen(false); setActive(-1); };

  // 矢印キーで候補を移動、Enter で確定、ESC で候補だけ閉じる（旧 render.js の acKeydown 相当）。
  // Enter で候補を選んだ時は preventDefault + stopPropagation でフォーム送信を止める。
  // 候補が未選択（active<0）の Enter は素通し＝フォームの Enter 送信に任せる。
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // IME 変換中は無視
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { refresh(value); return; }
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      if (!open) return;
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        e.stopPropagation(); // フォームの Enter 送信を止める（候補確定を優先）
        select(items[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation(); // モーダルは閉じず、候補リストだけ閉じる
        setOpen(false); setActive(-1);
      }
    }
  };

  useLayoutEffect(() => {
    if (open && inputRef.current && listRef.current) positionList(inputRef.current, listRef.current);
  }, [open, items]);

  // ハイライト中の候補をスクロールで見える位置へ。
  useLayoutEffect(() => {
    if (open && active >= 0 && listRef.current) {
      const el = listRef.current.querySelectorAll('.ac-item')[active] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [active, open]);

  const style: CSSProperties | undefined = uppercase ? { textTransform: 'uppercase' } : undefined;

  return (
    <div className={wrapClassName}>
      {/* label 要素で入力と紐づけ（クリックでフォーカス・スクリーンリーダー・テストの getByLabelText） */}
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <input
        ref={inputRef}
        id={id}
        className="form-input"
        style={style}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        onChange={(e) => { onChange(e.target.value); refresh(e.target.value); }}
        onFocus={() => refresh(value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      <div ref={listRef} className={'ac-list' + (open ? ' show' : '')} id={id + '-ac'}>
        {open && items.map((d, i) => (
          <div
            key={d.code}
            className={'ac-item' + (i === active ? ' active' : '')}
            // onMouseDown（blur より先に発火）で選択を確定。
            onMouseDown={(e) => { e.preventDefault(); select(d); }}
            onMouseEnter={() => setActive(i)}
          >
            <span className="ac-code">{d.code}</span>
            {d.detail && <span className="ac-detail">{d.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
