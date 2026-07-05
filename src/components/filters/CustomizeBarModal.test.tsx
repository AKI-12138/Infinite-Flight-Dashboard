// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomizeBarModal } from './CustomizeBarModal';
import { filterStore, DEFAULT_BAR_CHIPS } from '../../lib/filter-store';

// フェーズA：カスタマイズ画面の「操作契約」を凍結する UI テスト。
// ＝オーナーが明示したルール（①Done まで反映しない／✕・ESC は破棄、②開くたびに必ず 0 選択で開く
//    ＝既定でもカスタム済みでも常にまっさら）と付随仕様（最大6）を、将来の改修で黙って壊さないための番人。
// ロジック本体（保存・順序・空→既定）は filter-store.test.ts が担当。

// チップのチェックボックス取得：アクセシブル名＝チップ名（絵文字・順番バッジは aria-hidden で除外）。
const cb = (name: string) => screen.getByRole('checkbox', { name });

beforeEach(() => {
  localStorage.clear();
  filterStore.resetBarChips();
});
afterEach(cleanup);

describe('CustomizeBarModal', () => {
  it('未カスタマイズ（既定）ならチェックは全て空で開く', () => {
    render(<CustomizeBarModal open onClose={() => {}} />);
    // 既定6に含まれる軸でも、画面上は"選択済み"として見せない。
    expect(cb('Year')).not.toBeChecked();
    expect(cb('Airline')).not.toBeChecked();
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
  });

  it('カスタム済みでも開くたびに必ずまっさら（0/6）で開く', () => {
    filterStore.setBarChips(['year', 'duration']); // 既にカスタム済みでも…
    render(<CustomizeBarModal open onClose={() => {}} />);
    expect(cb('Year')).not.toBeChecked();          // …画面は空で開く
    expect(cb('Duration')).not.toBeChecked();
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
  });

  it('チェックして Done を押すとバーへ反映（チェックした順）', () => {
    const onClose = vi.fn();
    render(<CustomizeBarModal open onClose={onClose} />);
    fireEvent.click(cb('Month'));
    fireEvent.click(cb('Year'));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(filterStore.getBarChips()).toEqual(['month', 'year']);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('✕ で閉じると変更は破棄される（バーは変わらない）', () => {
    const onClose = vi.fn();
    render(<CustomizeBarModal open onClose={onClose} />);
    fireEvent.click(cb('Weekday')); // 下書きを変更
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(filterStore.getCustomBarChips()).toBeNull();       // 未確定＝カスタム保存なし
    expect(filterStore.getBarChips()).toEqual(DEFAULT_BAR_CHIPS);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('6個選ぶと未選択チップは無効化される（最大6）', () => {
    render(<CustomizeBarModal open onClose={() => {}} />);
    ['Year', 'Month', 'Weekday', 'Airport', 'City', 'Country'].forEach((n) => fireEvent.click(cb(n)));
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
    expect(cb('Duration')).toBeDisabled();  // 満杯：未選択は追加不可
    expect(cb('Year')).not.toBeDisabled();  // 既に選んだものは外せる
  });
});
