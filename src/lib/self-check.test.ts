// @vitest-environment jsdom
//
// self-check.ts（アプリ内セルフチェック）のテスト。
// 健全な環境では全チェックが通ること＝「診断自体が誤検知しない」ことを凍結する。
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('runSelfChecks', () => {
  it('健全な環境（jsdom・データ0件）では全チェックが通る', async () => {
    const { runSelfChecks } = await import('./self-check');
    const results = runSelfChecks();
    const failed = results.filter((r) => !r.ok);
    expect(failed).toEqual([]);          // 落ちた項目なし（誤検知しない）
    expect(results.length).toBeGreaterThanOrEqual(8);
  });

  it('データ＋メモがある状態でも通る（一時キーはユーザーデータを汚さない）', async () => {
    const { DataSource } = await import('./datasource');
    const { memoStore } = await import('./memo-store');
    const { runSelfChecks } = await import('./self-check');
    const stored = DataSource.addOne({ date: '2025-01-01', dep: 'RJTT', arr: 'RJOO', ac: 'B738', al: 'ANA', t: '1h00m' });
    memoStore.save(stored.id, { notes: 'hello' });
    const before = memoStore.count;
    expect(runSelfChecks().filter((r) => !r.ok)).toEqual([]);
    expect(memoStore.count).toBe(before);              // 一時キーが残っていない
    expect(memoStore.get(stored.id)?.fields.notes).toBe('hello'); // ユーザーデータ無傷
  });

  it('孤児メモ（どのフライトにも属さないメモ）を検出する', async () => {
    const { memoStore } = await import('./memo-store');
    const { runSelfChecks } = await import('./self-check');
    memoStore.save('orphan-id', { notes: 'lost' });
    const linkCheck = runSelfChecks().find((r) => r.key === 'memo-links');
    expect(linkCheck?.ok).toBe(false);
    expect(linkCheck?.detail).toContain('1 saved note');
  });
});
