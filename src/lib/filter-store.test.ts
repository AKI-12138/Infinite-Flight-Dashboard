// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { filterStore, MAX_BAR_CHIPS, DEFAULT_BAR_CHIPS } from './filter-store';

// フェーズA：バーの常時表示チップ（選択・順序・最大6・永続化・draft/commit）。
describe('filterStore bar chips', () => {
  beforeEach(() => {
    localStorage.clear();
    filterStore.resetBarChips();
  });

  it('未カスタマイズなら getBarChips は既定6・getCustomBarChips は null', () => {
    expect(filterStore.getBarChips()).toEqual(DEFAULT_BAR_CHIPS);
    expect(filterStore.getCustomBarChips()).toBeNull();
  });

  it('getBarChips はコピーを返す（外部変異でストアが壊れない）', () => {
    const a = filterStore.getBarChips();
    a.push('duration');
    expect(filterStore.getBarChips()).toEqual(DEFAULT_BAR_CHIPS);
  });

  it('setBarChips で確定＝チェックした順で並ぶ', () => {
    filterStore.setBarChips(['duration', 'year', 'weekday']);
    expect(filterStore.getBarChips()).toEqual(['duration', 'year', 'weekday']);
    expect(filterStore.getCustomBarChips()).toEqual(['duration', 'year', 'weekday']);
  });

  it('setBarChips は最大6で切り詰め・重複排除・無効 key 除去', () => {
    filterStore.setBarChips(['year', 'year', 'nope', 'month', 'weekday', 'airline', 'aircraft', 'country', 'scope']);
    const keys = filterStore.getBarChips();
    expect(keys).toHaveLength(MAX_BAR_CHIPS);
    expect(keys).toEqual(['year', 'month', 'weekday', 'airline', 'aircraft', 'country']);
  });

  it('空で確定すると既定に戻る（null 化）', () => {
    filterStore.setBarChips(['year']);
    filterStore.setBarChips([]); // 全部外して Done
    expect(filterStore.getCustomBarChips()).toBeNull();
    expect(filterStore.getBarChips()).toEqual(DEFAULT_BAR_CHIPS);
  });

  it('localStorage：カスタムは保存・既定はキー削除', () => {
    filterStore.setBarChips(['year', 'duration']);
    expect(localStorage.getItem('if-dashboard:bar-chips:v1')).toBe('["year","duration"]');
    filterStore.resetBarChips();
    expect(localStorage.getItem('if-dashboard:bar-chips:v1')).toBeNull();
  });

  it('resetBarChips で既定に戻る', () => {
    filterStore.setBarChips(['year']);
    filterStore.resetBarChips();
    expect(filterStore.getBarChips()).toEqual(DEFAULT_BAR_CHIPS);
    expect(filterStore.getCustomBarChips()).toBeNull();
  });
});
