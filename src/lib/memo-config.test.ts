// memo-config.ts（メモ項目定義・単位の自動付与）のテスト。
import { describe, it, expect } from 'vitest';
import { formatMemoValue, getMemoUnit, MEMO_FIELD_BY_KEY, MEMO_SECTIONS, MEMO_DATE_KEYS } from './memo-config';

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

  it('日付キーは定義に存在する', () => {
    MEMO_DATE_KEYS.forEach((k) => expect(MEMO_FIELD_BY_KEY[k]).toBeTruthy());
  });

  it('セクション見出しに絵文字を使わない（オーナー指定 2026-07-07）', () => {
    // サロゲートペア（絵文字）を含まないことを確認
    MEMO_SECTIONS.forEach((s) => expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s.label)).toBe(false));
  });
});
