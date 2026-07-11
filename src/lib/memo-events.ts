// フライトメモパネルを開くための疎結合イベント（confirm.ts と同じ単発リスナ方式）。
// FlightLog の行ボタン → App がホストする FlightMemoModal を開く。
// （AddFlightModal の「Add Notes」は下書きフロー＝自前で FlightMemoModal を draftMode で持つため、この経路は使わない）
import type { StoredFlight } from './datasource';

type Fn = (flight: StoredFlight) => void;
let _listener: Fn | null = null;

export function openFlightMemo(flight: StoredFlight): void {
  _listener?.(flight);
}

export function _setMemoOpenListener(fn: Fn): () => void {
  _listener = fn;
  return () => { if (_listener === fn) _listener = null; };
}
