import { useEffect, useRef, useState } from 'react';
import { filterStore } from '../../lib/filter-store';
import { showToast } from '../../lib/toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

// 💾 Save preset 命名ウィンドウ（旧 #savePresetOverlay）。現在の絞り込みを名前付きで保存。
// 背景クリックでは閉じない。✕ / ESC / Cancel で閉じる。
export function SavePresetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const modalRef = useModalKeyboard(open, onClose, { autoFocus: false }); // 下で input を自前フォーカス
  useEffect(() => {
    if (!open) return;
    setName('');
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const n = filterStore.activeAxisCount();

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) { showToast('Enter a name', 'red'); inputRef.current?.focus(); return; }
    if (!filterStore.saveCurrentAsPreset(trimmed)) { showToast('Set some filters first', 'red'); onClose(); return; }
    onClose();
    showToast('✓ Preset saved');
  };

  return (
    <div ref={modalRef} className="modal-overlay show" id="savePresetOverlay">
      <div className="modal">
        <div className="modal-head">
          <h3>💾 Save preset</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group full">
            <span className="form-label">Preset name</span>
            <input
              ref={inputRef} className="form-input" maxLength={40} placeholder="e.g. Widebody international"
              autoComplete="off" spellCheck={false}
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) confirm(); }}
            />
          </div>
          <p className="dc-intro" style={{ marginTop: 12 }}>Saving {n} active filter{n !== 1 ? 's' : ''} as a preset.</p>
          <div className="modal-actions">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={confirm}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
