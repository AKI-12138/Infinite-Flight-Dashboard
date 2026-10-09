// フィルタの選択肢（データ由来）のうち、並び順に決まりがある軸だけを見る。
import { describe, it, expect } from 'vitest';
import { availableOptions } from './filter-options';
import type { Flight } from './compute';

const f = (ac: string): Flight => ({ date:'2025-01-01', dep:'RJTT', arr:'RJAA', ac, al:'ANA', t:'1h00m' });

describe('availableOptions（メーカー／サイズ）', () => {
  const opts = availableOptions([f('FOO123'), f('E190'), f('B77W'), f('A320'), f('C172')]);
  it('メーカーは表示名の ABC 順・Unknown は末尾', () =>
    expect(opts.manufacturer).toEqual(['airbus', 'boeing', 'cessna', 'embraer', 'unknown']));
  it('サイズは大きい順（wide→narrow→regional→small）・Unknown は末尾', () =>
    expect(opts.size).toEqual(['wide', 'narrow', 'regional', 'small', 'unknown']));
  it('データに出てこない分類は選択肢に出さない', () =>
    expect(availableOptions([f('B738')]).size).toEqual(['narrow']));
});
