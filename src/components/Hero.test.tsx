// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Hero } from './Hero';
import type { UseTheme } from '../hooks/useTheme';

// ヘッダーメニュー（≡ / ⚙️）の「キーボード契約」を凍結する回帰テスト。
// ＝メニューを閉じたとき、フォーカスが必ずトリガーボタンへ戻ること。
//   メニューは display:none で隠すため、項目にフォーカスが載ったまま閉じると
//   フォーカスが body へ落ちる。とくに項目からモーダルを開く場合、focus-trap は
//   「開いた瞬間の activeElement」を復帰先に覚えるので、そこが body だと
//   モーダルを閉じたあと戻る先が無くなる（＝ADV-010 で Jump に出たのと同じ問題）。
//   共通処理は src/lib/menu-focus.ts。

const theme = { pref: 'auto', setTheme: vi.fn() } as unknown as UseTheme;

function renderHero(over: Partial<Parameters<typeof Hero>[0]> = {}) {
  const props = {
    flights: [], theme,
    onAddFlight: vi.fn(), onSearch: vi.fn(), onDataCheck: vi.fn(), onImport: vi.fn(),
    onExport: vi.fn(), onClearAll: vi.fn(), onCustomizeBar: vi.fn(), onSelfCheck: vi.fn(),
    ...over,
  };
  render(<Hero {...props} />);
  return props;
}

afterEach(cleanup);

describe('Hero のヘッダーメニュー', () => {
  it('項目を選ぶとメニューが閉じ、フォーカスがトリガー（≡）へ戻る', () => {
    const onExport = vi.fn();
    renderHero({ onExport });
    const trigger = screen.getByRole('button', { name: 'Menu' });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const item = screen.getByRole('menuitem', { name: /Export/ });
    item.focus();
    fireEvent.click(item);

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // ⚠️ ここが body になると、この項目から開いたモーダルの復帰先が失われる。
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape で閉じたときもフォーカスがトリガーへ戻る', () => {
    renderHero();
    const trigger = screen.getByRole('button', { name: 'Menu' });

    fireEvent.click(trigger);
    screen.getByRole('menuitem', { name: /Import/ }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('⚙️（設定）も同じ契約', () => {
    renderHero();
    const trigger = screen.getByRole('button', { name: /Settings/ });

    fireEvent.click(trigger);
    const light = screen.getByRole('menuitemradio', { name: /Light/ });
    light.focus();
    fireEvent.click(light);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('外側クリックで閉じたときはフォーカスを奪い返さない', () => {
    renderHero();
    const trigger = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(trigger);

    // ⚠️ ヘッダ内（.hero-actions）は「外側」ではないので、本当に外の要素を用意する。
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.mouseDown(outside);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
