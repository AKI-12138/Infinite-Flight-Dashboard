// memo-config.ts（メモ項目定義・単位の自動付与・時刻/所要時間の分解結合）のテスト。
import { describe, it, expect } from 'vitest';
import {
  formatMemoValue, getMemoUnit, MEMO_FIELD_BY_KEY, MEMO_SECTIONS,
  splitClock, combineClock, splitDuration, combineDuration,
} from './memo-config';

describe('formatMemoValue（表示時の単位自動付与）', () => {
  const v1 = MEMO_FIELD_BY_KEY.v1;          // unit: speed (kt)
  const cargo = MEMO_FIELD_BY_KEY.cargo;    // unit: weight (kg)
  const callsign = MEMO_FIELD_BY_KEY.callsign; // 単位なし

  it('数値だけなら単位を付ける（桁区切り・小数・空白も数値扱い）', () => {
    expect(formatMemoValue(v1, '148')).toBe('148 kt');
    expect(formatMemoValue(cargo, '8,400')).toBe('8,400 kg');
    expect(formatMemoValue(cargo, '8 400.5')).toBe('8 400.5 kg');
  });

  it('単位や文字を含む値はそのまま（ユーザーの書き方を尊重）', () => {
    expect(formatMemoValue(v1, '148 kt')).toBe('148 kt');
    expect(formatMemoValue(v1, 'approx 150')).toBe('approx 150');
  });

  it('単位なし項目・空文字はそのまま', () => {
    expect(formatMemoValue(callsign, 'ANA57')).toBe('ANA57');
    expect(formatMemoValue(v1, '')).toBe('');
  });

  it('着陸品質：降下率は fpm（負数 OK）・G 値は G を付ける', () => {
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.tdRate, '-250')).toBe('-250 fpm');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.gForce, '1.32')).toBe('1.32 G');
  });
});

describe('定義の整合性', () => {
  it('getMemoUnit：既定は kt / nm / kg', () => {
    expect(getMemoUnit('speed')).toBe('kt');
    expect(getMemoUnit('distance')).toBe('nm');
    expect(getMemoUnit('weight')).toBe('kg');
  });

  it('key は全項目で一意', () => {
    const keys = MEMO_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('日付・時刻・所要時間の型が Times に定義されている', () => {
    expect(MEMO_FIELD_BY_KEY.depDateLoc.type).toBe('date');
    expect(MEMO_FIELD_BY_KEY.outLoc.type).toBe('clock');
    expect(MEMO_FIELD_BY_KEY.taxiOut.type).toBe('duration');
    expect(MEMO_FIELD_BY_KEY.taxiIn.type).toBe('duration');
  });

  it('セクション見出しに絵文字を使わない（オーナー指定 2026-07-07）', () => {
    // サロゲートペア（絵文字）を含まないことを確認
    MEMO_SECTIONS.forEach((s) => expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s.label)).toBe(false));
  });
});

describe('clock（HH:MM）の分解・結合', () => {
  it('combineClock：ゼロ埋めして HH:MM に（片方だけでも成立・両方空なら空）', () => {
    expect(combineClock('9', '5')).toBe('09:05');
    expect(combineClock('09', '15')).toBe('09:15');
    expect(combineClock('9', '')).toBe('09:00');
    expect(combineClock('', '30')).toBe('00:30');
    expect(combineClock('', '')).toBe('');
  });

  it('splitClock：正準形を2箱へ戻す（不正形は空）', () => {
    expect(splitClock('09:15')).toEqual(['09', '15']);
    expect(splitClock('9:5')).toEqual(['9', '5']);
    expect(splitClock('')).toEqual(['', '']);
    expect(splitClock('abc')).toEqual(['', '']);
  });
});

describe('duration（XhYYm / Xm）の分解・結合', () => {
  it('combineDuration：1時間未満は "12m"・以上は "1h05m"（両方空なら空）', () => {
    expect(combineDuration('', '12')).toBe('12m');
    expect(combineDuration('0', '12')).toBe('12m');
    expect(combineDuration('1', '5')).toBe('1h05m');
    expect(combineDuration('2', '')).toBe('2h00m');
    expect(combineDuration('', '')).toBe('');
  });

  it('splitDuration：正準形を2箱へ戻す（不正形は空）', () => {
    expect(splitDuration('12m')).toEqual(['', '12']);
    expect(splitDuration('1h05m')).toEqual(['1', '05']);
    expect(splitDuration('')).toEqual(['', '']);
    expect(splitDuration('out 12m / in 6m')).toEqual(['', '']);
  });

  it('往復が安定（combine → split → combine で同じ値）', () => {
    ['12m', '1h05m', '2h00m'].forEach((v) => {
      const [h, m] = splitDuration(v);
      expect(combineDuration(h, m)).toBe(v);
    });
    ['09:15', '00:30'].forEach((v) => {
      const [h, m] = splitClock(v);
      expect(combineClock(h, m)).toBe(v);
    });
  });
});
