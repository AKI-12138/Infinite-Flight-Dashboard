// @vitest-environment jsdom
//
// memo-store.ts のテスト。フライトメモの保存層（localStorage 永続化・正準化・削除連動・購読）を検証する。
// datasource.test.ts と同じ流儀：vi.resetModules() でシングルトン状態を作り直し、テストを完全に隔離する。
import { describe, it, expect, beforeEach, vi } from 'vitest';

type MS = typeof import('./memo-store').memoStore;
let ms: MS;
let cleanFields: typeof import('./memo-store').cleanMemoFields;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  const mod = await import('./memo-store');
  ms = mod.memoStore;
  cleanFields = mod.cleanMemoFields;
});

describe('cleanMemoFields（保存の正準形）', () => {
  it('空文字・空白のみの項目を落とし、前後の空白を trim する', () => {
    expect(cleanFields({ v1: ' 148 kt ', vr: '', notes: '   ' })).toEqual({ v1: '148 kt' });
  });
});

describe('save / get / has / delete', () => {
  it('save → get で往復・updatedAt が付く', () => {
    ms.save('id-1', { v1: '148', notes: 'good flight' });
    const memo = ms.get('id-1');
    expect(memo?.fields).toEqual({ v1: '148', notes: 'good flight' });
    expect(typeof memo?.updatedAt).toBe('number');
    expect(ms.has('id-1')).toBe(true);
    expect(ms.count).toBe(1);
  });

  it('全項目空で save → メモごと削除（無かったことに）', () => {
    ms.save('id-1', { v1: '148' });
    ms.save('id-1', { v1: '', notes: '  ' });
    expect(ms.has('id-1')).toBe(false);
    expect(ms.count).toBe(0);
  });

  it('delete / deleteMany：指定分だけ消える', () => {
    ms.save('a', { notes: 'A' });
    ms.save('b', { notes: 'B' });
    ms.save('c', { notes: 'C' });
    ms.delete('a');
    expect(ms.has('a')).toBe(false);
    ms.deleteMany(['b', 'zzz']); // 存在しない id は無視
    expect(ms.has('b')).toBe(false);
    expect(ms.has('c')).toBe(true);
  });

  it('clearAll / replaceAll / all', () => {
    ms.save('a', { notes: 'A' });
    expect(Object.keys(ms.all())).toEqual(['a']);
    ms.replaceAll({ x: { fields: { notes: 'X' }, updatedAt: 1 } });
    expect(ms.has('a')).toBe(false);
    expect(ms.get('x')?.fields.notes).toBe('X');
    ms.clearAll();
    expect(ms.count).toBe(0);
  });
});

describe('localStorage 永続化（新規起動を再現）', () => {
  it('save → モジュール作り直しでも復元される', async () => {
    ms.save('id-1', { rwyDep: '34R' });
    vi.resetModules();
    const fresh = (await import('./memo-store')).memoStore;
    expect(fresh.get('id-1')?.fields.rwyDep).toBe('34R');
  });

  it('clearStorage → 次回起動でメモ無し', async () => {
    ms.save('id-1', { notes: 'hi' });
    ms.clearStorage();
    vi.resetModules();
    const fresh = (await import('./memo-store')).memoStore;
    expect(fresh.count).toBe(0);
  });
});

describe('購読（React useSyncExternalStore 用）', () => {
  it('save / delete で listener 発火・unsubscribe で止まる', () => {
    let calls = 0;
    const unsub = ms.subscribe(() => { calls++; });
    ms.save('a', { notes: 'A' });
    expect(calls).toBe(1);
    ms.delete('a');
    expect(calls).toBe(2);
    unsub();
    ms.save('b', { notes: 'B' });
    expect(calls).toBe(2);
  });

  it('変化が無い操作（存在しない id の delete）では発火しない', () => {
    let calls = 0;
    ms.subscribe(() => { calls++; });
    ms.delete('nope');
    ms.deleteMany(['nope']);
    ms.clearAll();
    expect(calls).toBe(0);
  });
});
