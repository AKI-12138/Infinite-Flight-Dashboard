// =============================== THEME（LIGHT / DARK / AUTO） ===============================
// 旧 main.js の THEME 実装（_THEME_KEY / applyTheme / _watchOsThemeChanges 等）を移植。
// 純ロジック（localStorage・matchMedia・<html data-theme> の付け替え）はここに置き、
// React 状態管理は src/hooks/useTheme.ts が担う。
//
// - 'auto' は OS の prefers-color-scheme に追従（OS 変更にもリアルタイム反映）。
// - CSS の :root はダーク、[data-theme="light"] で上書き（styles.css の色体系）。
// - モバイル上部のステータスバー色（theme-color meta）も現テーマの --bg に合わせる。

export const THEME_KEY = 'if-dashboard:theme:v1';
export const THEME_CYCLE = ['auto', 'light', 'dark'] as const;
export type ThemePref = (typeof THEME_CYCLE)[number];
export const THEME_LABELS: Record<ThemePref, string> = {
  auto: 'Auto (follow OS)',
  light: 'Light',
  dark: 'Dark',
};

// localStorage の保存値（'auto'/'light'/'dark'）を取得。未保存・不正値は 'auto'。
export function resolveStoredTheme(): ThemePref {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && (THEME_CYCLE as readonly string[]).includes(saved)) return saved as ThemePref;
  } catch { /* fallthrough */ }
  return 'auto';
}

// OS が light を要求しているか（matchMedia 未対応環境では false → dark にフォールバック）。
function osPrefersLight(): boolean {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
}

// 保存値（auto 含む）→ 実際に適用するテーマ（light/dark のみ）に解決。
export function resolveEffectiveTheme(stored: ThemePref): 'light' | 'dark' {
  if (stored === 'auto') return osPrefersLight() ? 'light' : 'dark';
  return stored;
}

// モバイル上部のステータスバー色を現テーマの --bg に合わせる（data-theme 反映後に呼ぶ）。
export function updateThemeColorMeta(): void {
  const meta = document.getElementById('themeColorMeta');
  if (!meta) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) meta.setAttribute('content', bg);
}

// <html data-theme> に実テーマを反映し、theme-color meta も更新。
export function applyEffectiveTheme(stored: ThemePref): void {
  document.documentElement.dataset.theme = resolveEffectiveTheme(stored);
  updateThemeColorMeta();
}

// 初期化：React マウント前に <html data-theme> を立てて FOUC（一瞬の白チラ）を防ぐ。main.tsx から呼ぶ。
export function bootstrapTheme(): void {
  applyEffectiveTheme(resolveStoredTheme());
}
