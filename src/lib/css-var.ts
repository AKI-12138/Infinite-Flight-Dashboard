// CSS 変数（テーマ色）を JS 側で読むヘルパ。旧 render.js の cssVar。
// Chart.js / Leaflet / Globe.gl などハードコードせず色を CSS 変数から取る箇所で使う。
// テーマ切替（[data-theme] の付け外し）に追従させるため、描画のたびに最新値を読む。
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
