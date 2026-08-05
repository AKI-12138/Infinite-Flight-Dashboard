// METAR デコーダ（metar.ts）のテスト。実際の METAR で label→value を検証する。
import { describe, it, expect } from 'vitest';
import { decodeMetar, type MetarLine } from './metar';

// label→value の逆引きヘルパ。
function map(raw: string, refDate?: string): Record<string, string> {
  const lines = decodeMetar(raw, refDate) as MetarLine[];
  return Object.fromEntries(lines.map((l) => [l.label, l.value]));
}

describe('decodeMetar（よく使う要素）', () => {
  it('標準的な METAR（羽田）', () => {
    const m = map('RJTT 070100Z 34008KT 9999 FEW030 SCT100 22/16 Q1013 NOSIG');
    expect(m['Observed']).toBe('day 07, 01:00 UTC');
    expect(m['Wind']).toBe('340° at 8 kt');
    expect(m['Visibility']).toBe('10 km or more');
    expect(m['Clouds']).toBe('Few 3,000 ft, Scattered 10,000 ft');
    expect(m['Temp / Dew']).toBe('22°C / 16°C');
    expect(m['QNH']).toBe('1013 hPa');
    expect(m['Trend']).toBe('No significant change');
  });

  it('ガスト＋可変風＋悪天（雪・雷雨）＋氷点下気温', () => {
    const m = map('KORD 121651Z 27018G30KT 240V300 1/2SM +SN BKN008 OVC015 M05/M08 A2985');
    expect(m['Wind']).toBe('270° at 18 kt, gusting 30 kt (variable 240°–300°)');
    expect(m['Visibility']).toBe('1/2 SM');
    expect(m['Weather']).toBe('Heavy snow');
    expect(m['Clouds']).toBe('Broken 800 ft, Overcast 1,500 ft');
    expect(m['Temp / Dew']).toBe('-5°C / -8°C');
    expect(m['QNH']).toBe('29.85 inHg');
  });

  it('CAVOK・Calm・CB・雷雨性降雨', () => {
    const m = map('LFPG 151230Z 00000KT CAVOK TSRA SCT025CB 18/12 Q1018');
    expect(m['Wind']).toBe('Calm');
    expect(m['Visibility']).toBe('CAVOK — 10 km+, no significant cloud/weather');
    expect(m['Weather']).toBe('Thunderstorm rain');
    expect(m['Clouds']).toBe('Scattered 2,500 ft cumulonimbus');
  });

  it('メートル視程・VRB・AUTO・RMK は present 表記・RVR は読み飛ばす', () => {
    const m = map('EGLL 060950Z AUTO VRB03KT 0800 R27R/1200 FG VV002 09/09 Q0998 RMK AO2');
    expect(m['Wind']).toBe('variable at 3 kt');
    expect(m['Visibility']).toBe('800 m');
    expect(m['Weather']).toBe('Fog');
    expect(m['Clouds']).toBe('Vertical visibility 200 ft');
    expect(m['Report']).toBe('automated');
    expect(m['Remarks']).toBe('(present — not decoded)');
  });

  it('参照日（フライトの日付）があれば Observed を年月日で表示', () => {
    // 参照日あり＝年月を補完
    expect(map('RJTT 070100Z 34008KT Q1013', '2026-07-07')['Observed']).toBe('2026-07-07 01:00 UTC');
    // 参照日なし＝従来どおり日のみ
    expect(map('RJTT 070100Z 34008KT Q1013')['Observed']).toBe('day 07, 01:00 UTC');
  });

  it('月末跨ぎ：METAR の日と参照日が離れていれば前後の月に寄せる', () => {
    // 参照(LOC)=8/1 だが METAR は 31 日 → 前月(7/31)
    expect(map('LPPT 310100Z 34008KT Q1013', '2026-08-01')['Observed']).toBe('2026-07-31 01:00 UTC');
    // 参照(LOC)=7/31 だが METAR は 01 日 → 翌月(8/1)
    expect(map('LPPT 010100Z 34008KT Q1013', '2026-07-31')['Observed']).toBe('2026-08-01 01:00 UTC');
  });

  it('空・非 METAR は null', () => {
    expect(decodeMetar('')).toBeNull();
    expect(decodeMetar('   ')).toBeNull();
    expect(decodeMetar('just some free text notes')).toBeNull();
  });

  it('METAR プレフィックス・末尾 = を許容', () => {
    const m = map('METAR RJOO 070200Z 32006KT 9999 FEW040 25/18 Q1012=');
    expect(m['Wind']).toBe('320° at 6 kt');
    expect(m['QNH']).toBe('1012 hPa');
  });
});
