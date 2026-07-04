// =============================== CONFIRM DIALOG（破壊的操作の確認） ===============================
// 旧 confirmDelete* → 確認モーダルの窓口。CLAUDE.md「破壊的操作の前に確認を出す挙動を壊さない」。
// UI は src/components/ConfirmDialog.tsx が購読して表示する。onConfirm は実行本体のコールバック。
import type { ReactNode } from 'react';

export interface ConfirmRequest {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}

type Fn = (req: ConfirmRequest) => void;
let _listener: Fn | null = null;

export function requestConfirm(req: ConfirmRequest): void {
  _listener?.(req);
}

export function _setConfirmListener(fn: Fn): () => void {
  _listener = fn;
  return () => { if (_listener === fn) _listener = null; };
}
