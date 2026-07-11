// timezone.ts（LOC → UTC 自動換算）のテスト。
// オフセットの正しさはブラウザ/Node 内蔵の IANA データに依存するため、
// 「よく知られた固定事実」（日本は通年 +9・米西海岸の夏冬・日付変更線・夏時間切替）で検証する。
import { describe, it, expect } from 'vitest';
import { airportTz, locToUtc } from './timezone';

describe('airportTz（ICAO → IANA ゾーン名）', () => {
  it('収録空港はゾーン名が引ける', () => {
    expect(airportTz('RJTT')).toBe('Asia/Tokyo');
    expect(airportTz('KSEA')).toBe('America/Los_Angeles');
  });
  it('未収録 ICAO は null（手入力へのフォールバック判定）', () => {
    expect(airportTz('ZZZZ')).toBeNull();
  });
});

describe('locToUtc（壁時計 → UTC）', () => {
  it('日本（通年 +9）：12:09 LOC → 03:09 UTC・同日', () => {
    expect(locToUtc('2026-07-09', '12:09', 'Asia/Tokyo')).toEqual({ date: '2026-07-09', time: '03:09' });
  });
  it('深夜跨ぎ：東京 08:00 LOC → 前日 23:00 UTC', () => {
    expect(locToUtc('2026-07-10', '8:00', 'Asia/Tokyo')).toEqual({ date: '2026-07-09', time: '23:00' });
  });
  it('夏時間（PDT −7）：シアトル 2026-07-20 10:00 → 17:00 UTC', () => {
    expect(locToUtc('2026-07-20', '10:00', 'America/Los_Angeles')).toEqual({ date: '2026-07-20', time: '17:00' });
  });
  it('冬時間（PST −8）：シアトル 2026-01-20 10:00 → 18:00 UTC', () => {
    expect(locToUtc('2026-01-20', '10:00', 'America/Los_Angeles')).toEqual({ date: '2026-01-20', time: '18:00' });
  });
  it('入力が正準形でない・ゾーン不明は null', () => {
    expect(locToUtc('', '12:00', 'Asia/Tokyo')).toBeNull();
    expect(locToUtc('2026-07-09', '', 'Asia/Tokyo')).toBeNull();
    expect(locToUtc('2026-07-09', '12:00', '')).toBeNull();
    expect(locToUtc('2026-07-09', '12:00', 'Not/AZone')).toBeNull();
  });
});
