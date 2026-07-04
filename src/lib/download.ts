// ブラウザでテキストを .csv 等としてダウンロードさせる（旧 parse.js の _download）。
// Blob + object URL + 一時 <a> クリック。UI 層専用（DOM 依存なのでロジック層には置かない）。
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 少し遅らせて revoke（即時だと一部ブラウザで DL が始まらないことがある）。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
