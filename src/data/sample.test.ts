// サンプルデータの統合スモークテスト。
// 旧版に対応する .test.html は無いが、React 版では「同梱サンプルが実データ（AP / normalize）を
// 通して丸ごと取り込めること」を回帰で担保する。parse → normalize → airports を横断する結合確認。
import { describe, it, expect } from 'vitest';
import { SAMPLE_FLIGHT_CSV, SAMPLE_AIRPORT_CSV } from './sample';
import { parseBulkFlights, parseBulkAirports } from '../lib/parse';

describe('SAMPLE_FLIGHT_CSV（同梱フライトサンプルの取り込み）', () => {
  const rows = parseBulkFlights(SAMPLE_FLIGHT_CSV);
  it('1 行以上パースできる', () => expect(rows.length).toBeGreaterThan(0));
  it('全行が valid（不正な行が無い）', () => {
    const bad = rows.filter(r => !r.valid);
    expect(bad).toEqual([]);
  });
});

describe('SAMPLE_AIRPORT_CSV（同梱空港サンプルの取り込み）', () => {
  const rows = parseBulkAirports(SAMPLE_AIRPORT_CSV);
  it('1 行以上パースできる', () => expect(rows.length).toBeGreaterThan(0));
  it('全行が valid（不正な行が無い）', () => {
    const bad = rows.filter(r => !r.valid);
    expect(bad).toEqual([]);
  });
});
