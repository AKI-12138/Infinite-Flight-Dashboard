// 自作モノクロ SVG アイコンの **唯一の実装窓口**（フェーズN・2026-08-21 採用の13種）。
//
// ⚠️ 画面側に SVG のパスを複製しない。使うときは <AppIcon name="search" /> だけ。
//    追加・修正はこのファイルだけで済む（試作の正本＝ docs/prototypes/icons/。
//    docs/ は gitignore 対象の内部資料なので、.svg を直接 import せずパスをここへ移してある）。
//
// 共通仕様（試作の README と同じ）：viewBox 24・塗りなし・stroke は currentColor・
// 太さ 1.8・角と端は丸。色は置いた場所の文字色に自動で追従する（ライト/ダーク/危険色）。
// アクセシブルネームはボタン側の文字・title・aria-label が持つので、SVG は常に aria-hidden。
import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'settings'
  | 'search'
  | 'notes'
  | 'globe'
  | 'import'
  | 'export'
  | 'flight-route'
  | 'theme-auto'
  | 'theme-light'
  | 'theme-dark'
  | 'data-check'
  | 'customize-filter-bar'
  | 'trash';

// 各アイコンの中身だけを持つ（svg タグの属性は下の <AppIcon> が一括で付ける）。
const PATHS: Record<IconName, ReactNode> = {
  settings: (
    <>
      <path d="M9.4 3.4h5.2l.45 2.05c.5.2.96.47 1.38.8l2-.62 2.6 4.5-1.55 1.4c.04.31.04.63 0 .94l1.55 1.4-2.6 4.5-2-.62c-.42.33-.88.6-1.38.8l-.45 2.05H9.4l-.45-2.05c-.5-.2-.96-.47-1.38-.8l-2 .62-2.6-4.5 1.55-1.4a7 7 0 0 1 0-.94l-1.55-1.4 2.6-4.5 2 .62c.42-.33.88-.6 1.38-.8z" />
      <circle cx="12" cy="12" r="2.35" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.75" />
      <path d="m14.65 14.65 5.6 5.6" />
    </>
  ),
  notes: (
    <>
      <path d="M7 3.25h7.25L18 7v13.75H7z" />
      <path d="M14.25 3.25V7H18M9.5 11.25h6M9.5 14.5h6M9.5 17.75h3.75" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.3 3.5 5.15 3.5 8.5S14.3 18.2 12 20.5C9.7 18.2 8.5 15.35 8.5 12S9.7 5.8 12 3.5Z" />
    </>
  ),
  // Import / Export は「トレイ＋矢印」で対。向きは端末から見た方向＝取り込みが上・書き出しが下
  // （文字グリフの ↑ / ↓ から置き換え・2026-08-21）。トレイの形は共通なので対に見える。
  import: (
    <>
      <path d="M12 15.5V4M7.75 8.25 12 4l4.25 4.25" />
      <path d="M5 13.5v5.25C5 19.45 5.55 20 6.25 20h11.5c.7 0 1.25-.55 1.25-1.25V13.5" />
    </>
  ),
  export: (
    <>
      <path d="M12 4v11.5M7.75 11.25 12 15.5l4.25-4.25" />
      <path d="M5 13.5v5.25C5 19.45 5.55 20 6.25 20h11.5c.7 0 1.25-.55 1.25-1.25V13.5" />
    </>
  ),
  // 空状態の大きいスポットアイコン（56px 前後で使う）。破線は機影が描く軌跡。
  'flight-route': (
    <>
      <path d="M12 3.25c.65 0 1.15.53 1.15 1.18v5.05l5.15 3.06v1.78l-5.15-1.58v4.13l2.05 1.48v1.28L12 18.7l-3.2.95v-1.28l2.05-1.48v-4.13L5.7 14.32v-1.78l5.15-3.06V4.43c0-.65.5-1.18 1.15-1.18Z" />
      <path d="M3.25 18.1c1.2 2.35 3.4 3.2 5.65 2.2" strokeDasharray="1 2.6" />
    </>
  ),
  // Auto は太陽＋月（試作 theme-auto-sun-moon.svg を採用。画面型の theme-auto.svg は候補どまり）。
  'theme-auto': (
    <>
      <circle cx="8.2" cy="8.1" r="2.4" />
      <path d="M8.2 3.2v1.4M3.3 8.1h1.4M4.7 4.6l1 1M11.7 4.6l-1 1M4.7 11.6l1-1" />
      <path d="M19.5 15.7a5.1 5.1 0 0 1-6.2-6.2 5.1 5.1 0 1 0 6.2 6.2Z" />
    </>
  ),
  'theme-light': (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.46 5.46l1.42 1.42M17.12 17.12l1.42 1.42M18.54 5.46l-1.42 1.42M6.88 17.12l-1.42 1.42" />
    </>
  ),
  'theme-dark': <path d="M19.5 14.45A7.75 7.75 0 0 1 9.55 4.5a7.75 7.75 0 1 0 9.95 9.95Z" />,
  'data-check': (
    <>
      <path d="M4 5.5h10M4 9.5h7.5M4 13.5h5" />
      <circle cx="15" cy="14.5" r="4" />
      <path d="m17.9 17.4 2.85 2.85" />
    </>
  ),
  'customize-filter-bar': (
    <>
      <path d="M4 6h5M13 6h7M4 12h9M17 12h3M4 18h2M10 18h10" />
      <circle cx="11" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </>
  ),
  trash: <path d="M5 7h14M9 7V4.5h6V7M7 7l.8 13h8.4L17 7M10 10.5v6M14 10.5v6" />,
};

type AppIconProps = {
  name: IconName;
  /** 実寸 px。既定 16（文字の隣）。アイコン単独のボタンは 18〜20 を指定する。 */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function AppIcon({ name, size = 16, className, style }: AppIconProps) {
  return (
    <svg
      className={className ? `app-icon ${className}` : 'app-icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {PATHS[name]}
    </svg>
  );
}
