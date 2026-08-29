// フライト編集モーダルを開くための疎結合イベント（memo-events と同じ単発リスナ方式）。
// FlightLog の行の鉛筆ボタン → App がホストする AddFlightModal（編集モード）を開く。
// FlightLog と App は別ツリーなので、props を貫通させずモジュールイベントで繋ぐ。
import type { StoredFlight } from './datasource';

type Fn = (flight: StoredFlight) => void;
let _listener: Fn | null = null;

export function openFlightEdit(flight: StoredFlight): void {
  _listener?.(flight);
}

export function _setFlightEditListener(fn: Fn): () => void {
  _listener = fn;
  return () => { if (_listener === fn) _listener = null; };
}
