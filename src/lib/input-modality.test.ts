// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { lastInputModality, _resetInputModality } from './input-modality';

// 直前の入力手段の記録（ADV-011）。モーダルの初期フォーカス先の分岐に使う。
describe('input-modality', () => {
  beforeEach(() => { _resetInputModality(); });

  it('まだ何も操作していなければ null（＝自動で開く窓はこの状態）', () => {
    expect(lastInputModality()).toBe(null);
  });

  it('キー操作で keyboard になる', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(lastInputModality()).toBe('keyboard');
  });

  it('修飾キー単独では切り替わらない（Shift を押しただけで keyboard にしない）', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta']) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
      expect(lastInputModality()).toBe(null);
    }
  });

  it('マウス／タッチで pointer になる', () => {
    document.dispatchEvent(new MouseEvent('mousedown'));
    expect(lastInputModality()).toBe('pointer');
  });

  it('後から来た操作で上書きされる（キーボード → マウス → キーボード）', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(lastInputModality()).toBe('keyboard');
    document.dispatchEvent(new MouseEvent('mousedown'));
    expect(lastInputModality()).toBe('pointer');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(lastInputModality()).toBe('keyboard');
  });
});
