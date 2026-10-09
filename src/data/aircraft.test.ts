// 機材マスター（AIRCRAFT）の書き方の安全網。機材を手で足したときの事故を検出する。
// メーカー・サイズの書き忘れや一覧に無い id は型でビルドエラーになるので、ここでは型で守れない所だけ見る。
import { describe, it, expect } from 'vitest';
import { AIRCRAFT, aircraftManufacturer, aircraftSize, manufacturerLabel, sizeLabel } from './aircraft';

describe('AIRCRAFT（機材マスターの書式）', () => {
  it('同じ別名・コードを 2 機種に書いていない（重なると後に書いた方が黙って勝つ）', () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    Object.entries(AIRCRAFT).forEach(([code, e]) => {
      [code, ...e.aliases].forEach((a) => {
        const prev = owner.get(a);
        if (prev && prev !== code) clashes.push(`${a}: ${prev} / ${code}`);
        owner.set(a, code);
      });
    });
    expect(clashes).toEqual([]);
  });

  it('コードと別名は compact 形（大文字英数のみ）で書いてある＝正規化の辞書に当たる', () => {
    const bad = Object.entries(AIRCRAFT)
      .flatMap(([code, e]) => [code, ...e.aliases])
      .filter((a) => !/^[A-Z0-9]+$/.test(a));
    expect(bad).toEqual([]);
  });
});

// オーナーが決めた分類（2026-10-09）の代表例を凍結する。全機種ではなく「迷いどころ」だけ＝
// 後の編集で境界の機種を誤分類したら落ちる。決め方そのものを変えるときは、ここも一緒に直す。
describe('分類の引き当て（決定済みの代表例）', () => {
  it.each([
    // [コード, メーカー, サイズ, 決め手]
    ['BCS3',   'airbus',           'narrow',   'A220：旧 CSeries でも一般的な呼び名は Airbus／Airbus の区分どおり narrow'],
    ['A20N',   'airbus',           'narrow',   'neo は ceo と別機材'],
    ['E190',   'embraer',          'regional', 'E-Jets は regional'],
    ['CRJ9',   'bombardier',       'regional', 'CRJ：三菱へ譲渡後も一般的な呼び名は Bombardier'],
    ['MD11',   'mcdonnellDouglas', 'wide',     'MD-11：Boeing 合併後も McDonnell Douglas'],
    ['C17',    'boeing',           'wide',     'C-17：一般的な呼び名は Boeing／軍用輸送機は機体の大きさで'],
    ['C40B',   'boeing',           'narrow',   'C-40B（737 ベース）は narrow'],
    ['GLF6',   'gulfstream',       'small',    'ビジネスジェットは small'],
    ['F22',    'lockheedMartin',   'small',    '戦闘機は small'],
    ['FOO123', 'unknown',          'unknown',  '未収録の機材は unknown（隠さない）'],
    ['',       'unknown',          'unknown',  '機材が空でも unknown'],
  ])('%s → %s / %s（%s）', (code, mfr, size) => {
    expect(aircraftManufacturer(code)).toBe(mfr);
    expect(aircraftSize(code)).toBe(size);
  });
});

describe('分類の表示名', () => {
  it('id → 表示名。一覧に無い id（URL の書き間違い等）は Unknown', () => {
    expect(manufacturerLabel('mcdonnellDouglas')).toBe('McDonnell Douglas');
    expect(sizeLabel('wide')).toBe('Widebody');
    expect(manufacturerLabel('unknown')).toBe('Unknown');
    expect(sizeLabel('constructor')).toBe('Unknown');
  });
});
