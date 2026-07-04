import { useEffect, useRef, useState } from 'react';
import type { Flight } from '../lib/compute';
import { THEME_CYCLE, THEME_LABELS, type ThemePref } from '../lib/theme';
import type { UseTheme } from '../hooks/useTheme';
import { useFlights, useDataSourceStatus } from '../hooks/useDataSource';
import { unrecognizedCount } from '../lib/data-check';
import { StatsGrid } from './StatsGrid';
import { SaveStatusModal, type SaveState } from './SaveStatusModal';

// ヘッダ（旧 index.html の .hero を移植）。
// フェーズS のヘッダー再編に準拠：塗り CTA は Add Flight のみ、
// データ操作は ≡（機能メニュー）、テーマ等は ⚙️（設定メニュー）にドロップダウンで畳む。
// 空状態での Add / ≡ の非表示は body.is-empty の CSS が担当（App が body クラスを切替）。
export interface HeroProps {
  flights: Flight[];
  theme: UseTheme;
  onAddFlight: () => void;
  onSearch: () => void;
  onDataCheck: () => void;
  onImport: () => void;
  onExport: () => void;
  onClearAll: () => void;
}

type MenuId = 'data' | 'settings' | null;

// テーマ 3 択の表示メタ（アイコン・ラベル・サブ）。
const THEME_OPT_META: Record<ThemePref, { ico: string; label: string; sub?: string }> = {
  auto: { ico: '🔄', label: 'Auto', sub: '(follow OS)' },
  light: { ico: '☀️', label: 'Light' },
  dark: { ico: '🌙', label: 'Dark' },
};

export function Hero({
  flights, theme, onAddFlight, onSearch, onDataCheck, onImport, onExport, onClearAll,
}: HeroProps) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [saveStatusOpen, setSaveStatusOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // 保存ステータス（旧 _setSaveStatus）：ストレージ不可＝disabled／直近保存失敗＝error／通常＝ok。
  const { saveError, storageAvailable } = useDataSourceStatus();
  const saveState: SaveState = !storageAvailable ? 'disabled' : (saveError ? 'error' : 'ok');
  const saveMeta = { ok: { ico: '✓', label: 'Auto-saved', cls: '' }, error: { ico: '!', label: 'Auto-save failed', cls: ' is-error' }, disabled: { ico: '○', label: 'Auto-save off', cls: ' is-disabled' } }[saveState];
  // データ収録ステータス（旧 _updateDataStatus）：未収録（空港＋機材）の総数。全フライトから算出。
  const allFlights = useFlights();
  const unrec = unrecognizedCount(allFlights);

  // メニュー外クリック / ESC で閉じる（旧 closeHeaderMenus 相当）。
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const toggle = (id: Exclude<MenuId, null>) => setOpenMenu((cur) => (cur === id ? null : id));
  const close = () => setOpenMenu(null);
  const run = (fn: () => void) => { close(); fn(); };

  return (
    <div className="hero">
      <div className="hero-inner">
        <div className="hero-top">
          <div className="hero-brand">
            {/* 無限記号（∞）の SVG ロゴ。絵文字は環境差があるためインライン SVG で統一。 */}
            <div className="hero-logo" aria-label="Infinite Flight">
              <svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M 50 25 C 70 5 95 5 95 25 C 95 45 70 45 50 25 C 30 5 5 5 5 25 C 5 45 30 45 50 25 Z"
                  fill="none" stroke="currentColor" strokeWidth="10"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="hero-title">Infinite <span>Flight</span> Dashboard</div>
          </div>

          <div className="hero-actions" ref={actionsRef}>
            {/* ① 主役 CTA：唯一の塗りつぶしボタン */}
            <button className="btn-primary" id="btnHeaderAdd" onClick={onAddFlight}>
              <span style={{ fontSize: 16 }}>+</span> Add Flight
            </button>

            {/* ② 機能メニュー ≡（検索 / Data check / Import / Export / Clear all） */}
            <div className={'header-menu-wrap' + (openMenu === 'data' ? ' open' : '')} id="dataMenuWrap">
              <button
                className="header-icon-btn" id="btnDataMenu"
                onClick={() => toggle('data')}
                title="Menu" aria-haspopup="true" aria-expanded={openMenu === 'data'} aria-controls="dataMenu"
              >
                <span className="header-hamburger" aria-hidden="true"></span>
              </button>
              <div className="header-menu" id="dataMenu" role="menu" aria-labelledby="btnDataMenu">
                <button className="header-menu-item" role="menuitem" onClick={() => run(onSearch)}>
                  <span className="header-menu-ico" aria-hidden="true">🔍</span> Search flights
                </button>
                <button className="header-menu-item" role="menuitem" onClick={() => run(onDataCheck)}>
                  <span className="header-menu-ico" aria-hidden="true">🩺</span> Data check
                </button>
                <div className="header-menu-divider" role="separator"></div>
                <button className="header-menu-item" id="btnHeaderImport" role="menuitem" onClick={() => run(onImport)}>
                  <span className="header-menu-ico" aria-hidden="true">📥</span> Import
                </button>
                <button className="header-menu-item" id="btnExport" role="menuitem" onClick={() => run(onExport)}>
                  <span className="header-menu-ico" aria-hidden="true">📤</span> Export
                </button>
                <button
                  className="header-menu-item is-danger" id="btnClearAllHeader" role="menuitem"
                  onClick={() => run(onClearAll)} title="Delete all flights"
                >
                  <span className="header-menu-ico" aria-hidden="true">🗑</span> Clear all
                </button>
              </div>
            </div>

            {/* ③ 設定メニュー ⚙️（テーマ auto/light/dark） */}
            <div className={'header-menu-wrap' + (openMenu === 'settings' ? ' open' : '')} id="settingsMenuWrap">
              <button
                className="header-icon-btn" id="btnSettingsMenu"
                onClick={() => toggle('settings')}
                title={`Settings · Theme: ${THEME_LABELS[theme.pref]}`}
                aria-haspopup="true" aria-expanded={openMenu === 'settings'} aria-controls="settingsMenu"
              >
                <span className="header-icon-glyph" aria-hidden="true">⚙️</span>
              </button>
              <div className="header-menu" id="settingsMenu" role="menu" aria-labelledby="btnSettingsMenu">
                <div className="header-menu-label">Theme</div>
                {THEME_CYCLE.map((opt) => {
                  const on = theme.pref === opt;
                  const meta = THEME_OPT_META[opt];
                  return (
                    <button
                      key={opt}
                      className={'header-menu-item is-choice' + (on ? ' is-active' : '')}
                      data-theme-opt={opt} role="menuitemradio" aria-checked={on}
                      onClick={() => run(() => theme.setTheme(opt))}
                    >
                      <span className="header-menu-ico" aria-hidden="true">{meta.ico}</span> {meta.label}
                      {meta.sub && <span className="header-menu-sub"> {meta.sub}</span>}
                      <span className="header-menu-check" aria-hidden="true">✓</span>
                    </button>
                  );
                })}

                <div className="header-menu-divider" role="separator"></div>
                <div className="header-menu-label">Status</div>
                {/* 保存ステータス：クリックで詳細ポップアップ。状態で色（is-error/is-disabled）を切替。 */}
                <button
                  className={'header-menu-item is-status' + saveMeta.cls} id="saveStatus" role="menuitem"
                  title="Click for details" onClick={() => run(() => setSaveStatusOpen(true))}
                >
                  <span className="save-status-icon header-menu-ico" aria-hidden="true">{saveMeta.ico}</span>
                  <span>{saveMeta.label}</span>
                </button>
                {/* データ収録ステータス：全部収録済み＝緑✓／未収録あり＝⚠️ N。クリックで Data check。 */}
                <button
                  className={'header-menu-item is-status' + (unrec > 0 ? ' is-warn' : '')} id="dataStatus" role="menuitem"
                  title="Open data check" onClick={() => run(onDataCheck)}
                >
                  <span className="save-status-icon header-menu-ico" aria-hidden="true">{unrec > 0 ? '⚠️' : '✓'}</span>
                  <span>{unrec > 0 ? `${unrec} unrecognized` : 'All data recognized'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <StatsGrid flights={flights} />
      </div>
      <SaveStatusModal open={saveStatusOpen} status={saveState} onClose={() => setSaveStatusOpen(false)} onBackup={onExport} />
    </div>
  );
}
