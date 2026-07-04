// 総飛行時間（分）→「XhYYm」形式（h と m の間にスペースなし・分はゼロ埋め 2 桁）。
// 旧 render.js の _fmtHM 移植。例: 9930 → "165h30m"、9900 → "165h00m"。
export function fmtHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h' + (m < 10 ? '0' : '') + m + 'm';
}
