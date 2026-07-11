// airline-codes.ts（便名/Callsign のコード候補）のテスト。
import { describe, it, expect } from 'vitest';
import { airlineCodeSuggestions } from './airline-codes';

describe('airlineCodeSuggestions（便名＝IATA）', () => {
  it('自便のエアラインが own に、他社が others に入る（表記ゆれは normalize して照合）', () => {
    const { own, others } = airlineCodeSuggestions('flightNo', 'ANA'); // 'ANA' → All Nippon Airways
    expect(own).toEqual([{ code: 'NH', detail: 'All Nippon Airways' }]);
    expect(others.some((d) => d.code === 'JL')).toBe(true);
    expect(others.some((d) => d.code === 'NH')).toBe(false); // own と重複しない
  });
  it('IATA を持たない会社（Alitalia）は便名候補に出ない', () => {
    const { others } = airlineCodeSuggestions('flightNo');
    expect(others.some((d) => d.detail === 'Alitalia')).toBe(false);
  });
  it('未知のエアラインは own が空（自由入力のまま）', () => {
    const { own } = airlineCodeSuggestions('flightNo', 'My Custom Air');
    expect(own).toEqual([]);
  });
});

describe('airlineCodeSuggestions（Callsign＝呼出名＋ICAO）', () => {
  it('呼出名 → ICAO の順で自便の候補が出る（Starlux: STARWALKER・SJX）', () => {
    const { own } = airlineCodeSuggestions('callsign', 'Starlux Airlines');
    expect(own).toEqual([
      { code: 'STARWALKER', detail: 'Starlux Airlines' },
      { code: 'SJX', detail: 'Starlux Airlines' },
    ]);
  });
  it('呼出名と ICAO が同じ会社（LOT）は1件に重複排除される', () => {
    const { others } = airlineCodeSuggestions('callsign');
    expect(others.filter((d) => d.detail === 'LOT Polish Airlines')).toEqual([
      { code: 'LOT', detail: 'LOT Polish Airlines' },
    ]);
  });
});
