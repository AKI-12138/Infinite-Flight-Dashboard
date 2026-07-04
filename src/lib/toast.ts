// =============================== TOAST（通知メッセージ） ===============================
// 旧 render.js の showToast API をそのまま踏襲（後の手順の追加/削除/インポート通知が使う）。
// UI は src/components/Toast.tsx が購読して描画する。ここは「発火」の窓口だけを持つ。
export type ToastVariant = 'green' | 'red';

type ToastFn = (msg: string, variant: ToastVariant | undefined, duration: number) => void;
const _listeners = new Set<ToastFn>();

// トーストを表示。duration は省略可（既定 2500ms）。variant='red' でエラー色。
export function showToast(msg: string, variant?: ToastVariant, duration = 2500): void {
  _listeners.forEach((fn) => fn(msg, variant, duration));
}

// Toast コンポーネントが購読する（戻り値で解除）。
export function _onToast(fn: ToastFn): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}
