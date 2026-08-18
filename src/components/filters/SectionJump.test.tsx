// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SectionJump } from './SectionJump';

// フェーズK-4 のジャンプ導線の「キーボード契約」を凍結する回帰テスト。
// ＝メニューを閉じたとき、フォーカスが必ず Jump ボタンへ戻ること。
//   メニューは display:none で隠すため、項目にフォーカスが載ったまま閉じると
//   フォーカスが body へ落ち、キーボード利用者が現在位置を失う
//   （ADV-010 の Codex 再確認で実ブラウザ再現＝この挙動を二度と壊さないための番人）。
//   同じ契約をヘッダーメニュー（≡ / ⚙️）とフィルターチップも共有する
//   ＝ src/lib/menu-focus.ts と Hero.test.tsx を参照。

afterEach(cleanup);

const jumpBtn = () => screen.getByRole('button', { name: /jump/i });

describe('SectionJump', () => {
  it('項目を選ぶとメニューが閉じ、フォーカスが Jump ボタンへ戻る', () => {
    render(<SectionJump onBeforeJump={() => {}} />);
    fireEvent.click(jumpBtn());
    expect(jumpBtn()).toHaveAttribute('aria-expanded', 'true');

    const item = screen.getByRole('menuitem', { name: 'Flight Log' });
    item.focus();
    expect(document.activeElement).toBe(item);

    fireEvent.click(item);
    expect(jumpBtn()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(jumpBtn()); // body へ落ちない
  });

  it('Escape で閉じたときもフォーカスが Jump ボタンへ戻る', () => {
    render(<SectionJump onBeforeJump={() => {}} />);
    fireEvent.click(jumpBtn());

    const item = screen.getByRole('menuitem', { name: 'Overview' });
    item.focus();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(jumpBtn()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(jumpBtn());
  });

  it('外側クリックで閉じたときはフォーカスを奪い返さない（押した先が受け取る）', () => {
    render(
      <>
        <SectionJump onBeforeJump={() => {}} />
        <button type="button">outside</button>
      </>,
    );
    fireEvent.click(jumpBtn());

    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();
    fireEvent.mouseDown(outside);

    expect(jumpBtn()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(outside);
  });

  it('選ぶ前に onBeforeJump（フィルターを畳む）が呼ばれる', () => {
    const onBeforeJump = vi.fn();
    render(<SectionJump onBeforeJump={onBeforeJump} />);
    fireEvent.click(jumpBtn());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Trends' }));
    expect(onBeforeJump).toHaveBeenCalledTimes(1);
  });
});
