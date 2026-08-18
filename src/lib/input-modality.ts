// 直前の入力手段（キーボード／ポインタ）を覚えておくだけの小さな仕組み（ADV-011・2026-08-18）。
//
// なぜ要るか：モーダルを開いた瞬間に中へフォーカスを移すと、ブラウザによっては
// 「キーボードで移動してきた」とみなして青いフォーカス枠を描く。塗りつぶしボタンの外に
// 太い枠が残ると、マウスの人には「選択済み・押されたまま」に見える（＝ADV-011 の報告）。
//
// 枠そのものを消すのは不可（キーボードの人が現在位置を見失う）。そこで
// 「直前の操作がキーボードだったか」で初期フォーカスの当て先を変える：
//   キーボード → 従来どおり最初の操作要素（枠が出るのが正しい）
//   ポインタ／まだ何も操作していない（＝自動表示） → 中立の入れ物（枠を出さない）
//
// ⚠️ ブラウザ自身も似た判定を持っており、Chrome ではマウスで開いた場合すでに枠は出ない。
//    ここで明示的に持つのは、その判定がブラウザごとに違う（Safari は枠を出しやすい）ため、
//    どの環境でも同じ挙動にするのが目的。

type Modality = 'keyboard' | 'pointer' | null;

// null＝まだ誰も何も操作していない（ページ表示直後）。自動で出る窓はこの状態で開く。
let _modality: Modality = null;

if (typeof document !== 'undefined') {
  // capture で拾う＝アプリ側が stopPropagation しても取りこぼさない。
  document.addEventListener('keydown', (e) => {
    // 修飾キー単独は「操作」と見なさない（Shift を押しただけで切り替わらないように）。
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    _modality = 'keyboard';
  }, true);
  const toPointer = () => { _modality = 'pointer'; };
  document.addEventListener('mousedown', toPointer, true);
  document.addEventListener('pointerdown', toPointer, true);
  document.addEventListener('touchstart', toPointer, true);
}

/** 直前の入力手段。まだ何も操作されていなければ null。 */
export function lastInputModality(): Modality {
  return _modality;
}

/** テスト用：状態を初期化する。 */
export function _resetInputModality(): void {
  _modality = null;
}
