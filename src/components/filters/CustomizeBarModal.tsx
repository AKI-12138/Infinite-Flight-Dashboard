import { useEffect, useState } from 'react';
import { filterStore, MAX_BAR_CHIPS } from '../../lib/filter-store';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { CHIP_SECTIONS } from './chip-meta';

// 🧰 フィルターバーのカスタマイズ（フェーズA）。高度パネルのデザインを流用するが、
// ここでは「バーに常時出すチップの選択」だけ＝フィルタの展開・適用はしない（編集専用）。
// 各軸をチェックボックスで on/off。チェックした順にバーへ並ぶ（最大6）。
//
// ⚠️ 反映は Done のときだけ：編集はローカルの「下書き（draft）」に対して行い、Done で確定。
//    ✕ / ESC で閉じたら破棄（バーは変わらない）。
// ⚠️ 開くたびに必ず「まっさら（0 選択）」で開く（オーナー要望）。既存のバー内容・既定は反映しない
//    ＝この画面は毎回ゼロから組み直す"ビルダー"。Done で下書きがそのまま新しいバー構成になる
//    （＝Done は全置換。空のまま Done なら既定に戻る）。
export function CustomizeBarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 下書き。開くたびに空へ初期化する。
  const [draft, setDraft] = useState<string[]>([]);
  useEffect(() => {
    if (open) setDraft([]);
  }, [open]);

  const modalRef = useModalKeyboard(open, onClose);

  if (!open) return null;

  const count = draft.length;
  const atMax = count >= MAX_BAR_CHIPS;

  // 下書きトグル：入っていれば外す／無ければ末尾に追加（最大6・満杯なら無視）。
  const toggle = (key: string) => {
    setDraft((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      if (cur.length >= MAX_BAR_CHIPS) return cur; // 満杯：変更なし
      return [...cur, key];
    });
  };

  const done = () => { filterStore.setBarChips(draft); onClose(); };

  return (
    <div ref={modalRef} className="modal-overlay show" id="customizeBarOverlay">
      <div className="modal modal-wide">
        <div className="modal-head">
          <h3>Customize filter bar</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body adv-modal-body">
          <p className="barcust-intro">
            Choose up to {MAX_BAR_CHIPS} filters to always show on the bar — the rest stay in ⚙️&nbsp;More.
            Chips appear in the order you tick them. Nothing changes until you press <strong>Done</strong>;
            with none selected the bar shows the default set.
          </p>
          <div className="barcust-count">
            <span className={'barcust-count-num' + (atMax ? ' is-max' : '')}>{count} / {MAX_BAR_CHIPS}</span> selected
          </div>

          {CHIP_SECTIONS.map((sec, i) => (
            <div key={sec.label}>
              <div className="adv-section-label">{sec.label}</div>
              <div className="barcust-chips">
                {sec.chips.map((c) => {
                  const order = draft.indexOf(c.key); // -1 = 未選択
                  const on = order >= 0;
                  const disabled = !on && atMax;      // 満杯なら未選択チップは追加不可
                  return (
                    <label
                      key={c.key}
                      className={'barcust-chip' + (on ? ' is-on' : '') + (disabled ? ' is-disabled' : '')}
                      title={c.title}
                    >
                      <input
                        type="checkbox" className="cb"
                        checked={on} disabled={disabled}
                        onChange={() => toggle(c.key)}
                      />
                      <span className="barcust-chip-name">{c.name}</span>
                      {on && <span className="barcust-chip-order" aria-hidden="true">{order + 1}</span>}
                    </label>
                  );
                })}
              </div>
              {i < CHIP_SECTIONS.length - 1 && <hr className="adv-divider" />}
            </div>
          ))}

          <div className="modal-actions adv-actions">
            {/* 下書きを空に（＝Done で既定に戻る）。まだ確定はしない。 */}
            <button className="btn-outline" onClick={() => setDraft([])}>↺ Clear selection</button>
            <button className="btn-primary" onClick={done}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
