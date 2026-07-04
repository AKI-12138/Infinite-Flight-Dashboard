// 「同時に開くチップメニューは 1 つだけ」を保証する極小バス（旧 _closeAllFilterMenus 相当）。
// 各 FilterChip は開くときに自分の close コールバックを register し、別チップが開くと前を閉じる。
let _current: (() => void) | null = null;

export const chipMenuBus = {
  // 新しいメニューを開くとき：直前に開いていた別メニューを閉じる。
  open(close: () => void) {
    if (_current && _current !== close) _current();
    _current = close;
  },
  // このメニューが閉じたら登録解除（自分が current の時だけ）。
  release(close: () => void) {
    if (_current === close) _current = null;
  },
};
