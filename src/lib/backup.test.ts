// @vitest-environment jsdom
//
// backup.ts（JSON フルバックアップの組み立て・検証つきパース）のテスト。
import { describe, it, expect } from 'vitest';
import { buildFullBackup, parseFullBackup, looksLikeBackup, buildBackupFilename, BACKUP_FORMAT } from './backup';
import type { StoredFlight } from './datasource';

const FLIGHTS: StoredFlight[] = [
  { id: 'id-1', no: 1, date: '2025-01-01', dep: 'RJTT', arr: 'RJOO', ac: 'B738', al: 'ANA', t: '1h00m' },
  { id: 'id-2', no: 2, date: '2025-02-01', dep: 'RJOO', arr: 'RJTT', ac: 'A359', al: 'JAL', t: '1h05m' },
];
const AIRPORTS = { ZZZZ: { lat: 1, lng: 2, city: 'Foo', co: 'Japan', ct: 'Asia' } };
const MEMOS = { 'id-1': { fields: { v1: '148 kt', notes: 'smooth' }, updatedAt: 1234 } };

describe('build → parse の往復', () => {
  it('フライト（id 付き）・カスタム空港・メモがそのまま戻る', () => {
    const json = buildFullBackup(FLIGHTS, AIRPORTS, MEMOS);
    const parsed = parseFullBackup(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.format).toBe(BACKUP_FORMAT);
    expect(parsed?.flights).toEqual(FLIGHTS);
    expect(parsed?.customAirports).toEqual(AIRPORTS);
    expect(parsed?.memos).toEqual(MEMOS);
    expect(parsed?.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('parseFullBackup の検証', () => {
  it('壊れた JSON・形式違いは null', () => {
    expect(parseFullBackup('not json')).toBe(null);
    expect(parseFullBackup('{}')).toBe(null);
    expect(parseFullBackup('{"format":"Other","version":1,"flights":[]}')).toBe(null);
  });

  it('flights の行が壊れていたら null（date 等が文字列でない）', () => {
    const bad = JSON.stringify({ format: BACKUP_FORMAT, version: 1, flights: [{ date: 123 }] });
    expect(parseFullBackup(bad)).toBe(null);
  });

  it('memos / customAirports が欠けていても空で補う（古いバックアップへの耐性）', () => {
    const min = JSON.stringify({ format: BACKUP_FORMAT, version: 1, flights: [] });
    const parsed = parseFullBackup(min);
    expect(parsed?.memos).toEqual({});
    expect(parsed?.customAirports).toEqual({});
  });
});

describe('looksLikeBackup（Import 画面の自動判別）', () => {
  it('バックアップ JSON は true・CSV は false', () => {
    expect(looksLikeBackup(buildFullBackup(FLIGHTS, {}, {}))).toBe(true);
    expect(looksLikeBackup('date,dep,arr\n2025-01-01,RJTT,RJOO')).toBe(false);
    expect(looksLikeBackup('{"foo":1}')).toBe(false);
  });
});

describe('buildBackupFilename', () => {
  it('if-dashboard-backup_YYYY-MM-DD.json', () => {
    expect(buildBackupFilename()).toMatch(/^if-dashboard-backup_\d{4}-\d{2}-\d{2}\.json$/);
  });
});
