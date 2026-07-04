import { type ReactNode } from 'react';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

// チャートカードの ⛶ で開く拡大表示（旧 #continentsOverlay / #yearOverlay / #monthOverlay / #weekdayOverlay）。
// 中身のチャートは既存のチャートコンポーネントをそのまま大きい器で再描画する（フィルタ追従）。
// overlayClass / panelClass で CSS を出し分け（continents-* と chart-* で別デザイン）。
export function ChartExpandOverlay({ open, overlayClass, panelClass, title, onClose, children }: {
  open: boolean; overlayClass: string; panelClass: string; title: string; onClose: () => void; children: ReactNode;
}) {
  const modalRef = useModalKeyboard(open, onClose);

  if (!open) return null;

  return (
    <div ref={modalRef} className={overlayClass + ' show'} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={panelClass}>
        <div className={panelClass + '-header'}>
          <h3>{title}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className={panelClass + '-body'}>{children}</div>
      </div>
    </div>
  );
}
