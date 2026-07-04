import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { FilterState } from '../../lib/compute';
import type { FilterDef } from '../../lib/filters-config';
import { useFilterVersion } from '../../hooks/useFilterState';
import { pushEscape } from '../../lib/escape-stack';
import { ChipMenu } from './ChipMenu';
import { chipMenuBus } from './chip-menu-bus';

// チップに出すラベル（旧 _chipLabel）：0件→All ラベル / 1件→その値 / 2件以上→"値 +N"。
function chipLabel(def: FilterDef, values: string[]): string {
  if (values.length === 0) return def.all;
  const first = def.fixedOptions
    ? (def.fixedOptions.find((o) => o.value === values[0])?.label || values[0])
    : values[0];
  if (values.length === 1) return first;
  return first + ' +' + (values.length - 1);
}

// メニューを「収まる範囲」に配置（旧 _positionChipMenu）。下に入らなければ上開き。
function positionMenu(chip: HTMLElement, menu: HTMLElement) {
  menu.classList.remove('chip-menu-up');
  menu.style.maxHeight = '';
  const desired = Math.min(menu.scrollHeight + 2, 280);
  const margin = 8;
  const anchor = chip.getBoundingClientRect();
  const inModal = chip.closest('.modal-body');
  const cRect = inModal ? inModal.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  const spaceBelow = cRect.bottom - anchor.bottom - margin;
  const spaceAbove = anchor.top - cRect.top - margin;
  const openDown = spaceBelow >= desired || spaceBelow >= spaceAbove;
  const floor = 80;
  if (openDown) {
    menu.style.maxHeight = Math.max(floor, Math.min(desired, spaceBelow)) + 'px';
  } else {
    menu.classList.add('chip-menu-up');
    menu.style.maxHeight = Math.max(floor, Math.min(desired, spaceAbove)) + 'px';
  }
}

// 1 つのフィルタチップ（旧 index.html の .filter-chip-multi）。バー／高度パネル両方で使う。
export function FilterChip({ def, emoji, dataOptions, title }: {
  def: FilterDef; emoji: string; dataOptions: string[]; title?: string;
}) {
  useFilterVersion(); // ラベル／active を最新の FilterState に追従
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const values = (FilterState as unknown as Record<string, string[]>)[def.stateKey];
  const active = values.length > 0;

  const close = useCallback(() => { setOpen(false); }, []);

  // 開いている間だけ：外側クリック / ESC で閉じる。
  useLayoutEffect(() => {
    if (!open) { chipMenuBus.release(close); return; }
    chipMenuBus.open(close);
    // 位置決め（メニュー描画後）。
    if (chipRef.current && menuRef.current) positionMenu(chipRef.current, menuRef.current);
    const onDown = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    // ESC はスタック経由＝高度パネルの上でメニューが開いていれば、メニューだけ先に閉じる。
    const releaseEsc = pushEscape(close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      releaseEsc();
    };
  }, [open, close]);

  return (
    <div
      ref={chipRef}
      className={'filter-chip filter-chip-multi' + (active ? ' active' : '') + (open ? ' open' : '')}
      data-chip={def.key}
    >
      <button type="button" className="chip-btn" title={title} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <span>{emoji}</span>
        <span className="chip-label" data-label={def.key}>{chipLabel(def, values)}</span>
        <span className="chip-arrow">▾</span>
      </button>
      <div ref={menuRef} className={'chip-menu' + (open ? ' open' : '')} data-menu={def.key}>
        {open && <ChipMenu def={def} dataOptions={dataOptions} />}
      </div>
    </div>
  );
}
