// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Hero } from './Hero';
import { SectionJump } from './filters/SectionJump';
import { FilterChip } from './filters/FilterChip';
import { FILTER_DEFS } from '../lib/filters-config';
import type { UseTheme } from '../hooks/useTheme';

// ドロップダウン共通の「フォーカス契約」を **1 箇所で** 守る表形式テスト。
//
// 契約（実体は src/lib/menu-focus.ts の closeMenuRestoringFocus）：
//   ① 項目を選んで閉じたら、フォーカスはトリガーへ戻る
//   ② Escape で閉じたら、フォーカスはトリガーへ戻る
//   ③ 外側クリックで閉じたときは、フォーカスを奪い返さない（押した先が受け取る）
//
// なぜ 1 箇所か：メニューの中身は閉じると display:none になるか DOM から消えるので、
// 項目にフォーカスが載ったまま閉じると body へ落ち、キーボード利用者が現在位置を失う
// （ADV-010 の Codex 再確認で実ブラウザ再現）。**同じ穴が全メニューに開く**ため、
// コンポーネントごとに同じテストを写経すると増える一方で、しかも新しいメニューは
// 書き忘れて素通りする（実際 FilterChip が抜けていた）。
//
// ⚠️ **新しいドロップダウンを作ったら、下の MENUS に 1 行足すだけ**。
//    コンポーネント固有の挙動だけを各コンポーネントの .test.tsx に書く。

const theme = { pref: 'auto', setTheme: vi.fn() } as unknown as UseTheme;

function renderHero() {
  render(
    <Hero
      flights={[]} theme={theme}
      onAddFlight={vi.fn()} onSearch={vi.fn()} onDataCheck={vi.fn()} onImport={vi.fn()}
      onExport={vi.fn()} onClearAll={vi.fn()} onCustomizeBar={vi.fn()} onSelfCheck={vi.fn()}
    />,
  );
}

type MenuCase = {
  name: string;
  render: () => void;
  trigger: () => HTMLElement;
  /** 選んだら閉じる項目。閉じない（複数選択式の）メニューでは省略＝①をスキップ。 */
  item?: () => HTMLElement;
};

const MENUS: MenuCase[] = [
  {
    name: '≡ ヘッダーメニュー',
    render: renderHero,
    trigger: () => screen.getByRole('button', { name: 'Menu' }),
    item: () => screen.getByRole('menuitem', { name: /Export/ }),
  },
  {
    name: '⚙️ 設定メニュー',
    render: renderHero,
    trigger: () => screen.getByRole('button', { name: /Settings/ }),
    item: () => screen.getByRole('menuitemradio', { name: /Light/ }),
  },
  {
    name: 'Jump 導線',
    render: () => render(<SectionJump onBeforeJump={vi.fn()} />),
    trigger: () => screen.getByRole('button', { name: /jump/i }),
    item: () => screen.getByRole('menuitem', { name: 'Flight Log' }),
  },
  {
    name: 'フィルターチップ',
    render: () => render(
      <FilterChip def={FILTER_DEFS[0]} dataOptions={['2025', '2024']} title="Year" />,
    ),
    trigger: () => screen.getByRole('button', { name: /All Years/ }),
    // 複数選択式＝項目を選んでも閉じないので ① は対象外。
  },
];

afterEach(cleanup);

describe.each(MENUS)('$name のフォーカス契約', ({ render: renderMenu, trigger, item }) => {
  // 「選ぶと閉じる」メニューだけ ①。複数選択式（チップ）は閉じないので定義しない
  // （恒久 skip をレポートに残さないため、it.skip ではなく未定義にする）。
  if (item) {
    it('① 項目を選んで閉じたらトリガーへ戻る', () => {
      renderMenu();
      fireEvent.click(trigger());
      const el = item();
      el.focus();
      fireEvent.click(el);
      expect(document.activeElement).toBe(trigger());
    });
  }

  it('② Escape で閉じたらトリガーへ戻る', () => {
    renderMenu();
    fireEvent.click(trigger());
    // メニュー内の何かにフォーカスがある状態を作る（＝body へ落ちる条件）。
    (item ? item() : trigger()).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger());
  });

  it('③ 外側クリックではフォーカスを奪い返さない', () => {
    renderMenu();
    fireEvent.click(trigger());
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.mouseDown(outside);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

// ── 各メニュー固有の挙動（共通契約に載らないもの）──────────────────
// ⚠️ ここは「そのメニューにしか無い約束」だけ。共通の話は上の表へ。
describe('Jump 導線の固有挙動', () => {
  it('項目を選ぶ前に onBeforeJump（フィルターを畳む）が呼ばれる', () => {
    // 展開中のフィルターバーは貼り付いたまま画面の 1/3 を占めるので、
    // 畳んでから飛ばないと飛び先がその高さ分ずれる（＝K-3 の位置合わせの前提）。
    const onBeforeJump = vi.fn();
    render(<SectionJump onBeforeJump={onBeforeJump} />);
    fireEvent.click(screen.getByRole('button', { name: /jump/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Trends' }));
    expect(onBeforeJump).toHaveBeenCalledTimes(1);
  });
});
