// parse.ts の回帰テスト。
// 旧 tests/parse.test.html から移植。実データ（AP / normalize）を通すので、
// compute.test のような AP フィクスチャの差し替えはしない（期待値は一切変えていない）。
import { describe, it, expect } from 'vitest';
import { parseBulkFlights, parseBulkAirports, _splitCsvLine } from './parse';

describe('_splitCsvLine（CSV 1 行の分割・クォート対応）', () => {
  it('plain comma split',         () => expect(_splitCsvLine('a,b,c', ',')).toEqual(['a','b','c']));
  it('quoted field with comma',   () => expect(_splitCsvLine('a,"b,c",d', ',')).toEqual(['a','b,c','d']));
  it('escaped quote ("")',        () => expect(_splitCsvLine('"a""b",c', ',')).toEqual(['a"b','c']));
  it('empty interior fields',     () => expect(_splitCsvLine('a,,c', ',')).toEqual(['a','','c']));
  it('trailing empty field',      () => expect(_splitCsvLine('a,b,', ',')).toEqual(['a','b','']));
  it('tab separator passthrough', () => expect(_splitCsvLine('a\tb\tc', '\t')).toEqual(['a','b','c']));
});

describe('parseBulkFlights（基本：1 行 CSV）', () => {
  const r = parseBulkFlights('2025-06-01,RJTT,RJOO,B772,ANA,1h30m');
  it('結果は 1 行', () => expect(r).toHaveLength(1));
  const row = r[0];
  it('valid',        () => expect(row.valid).toBe(true));
  it('全フィールド', () => {
    if(!row.valid) throw new Error('expected valid row');
    expect(row.date).toBe('2025-06-01');
    expect(row.dep).toBe('RJTT');
    expect(row.arr).toBe('RJOO');
    expect(row.ac).toBe('B772');
    expect(row.al).toBe('All Nippon Airways'); // airline 正規化
    expect(row.t).toBe('1h30m');
  });
});

describe('parseBulkFlights（ヘッダ行を自動スキップ）', () => {
  const csv = 'date,dep,arr,aircraft,airline,duration\n' +
              '2025-06-01,RJTT,RJOO,B772,ANA,1h30m';
  const r = parseBulkFlights(csv);
  it('ヘッダを除いた 1 行', () => expect(r).toHaveLength(1));
  it('valid & dep', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.dep).toBe('RJTT');
  });
});

describe('parseBulkFlights（取り込み境界での正規化）', () => {
  const r = parseBulkFlights('2025/6/1,HND,ITM,777-300ER,NH,90m');
  it('正規化の各項目', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.date).toBe('2025-06-01'); // date 正規化
    expect(row.dep).toBe('RJTT');        // dep IATA→ICAO
    expect(row.arr).toBe('RJOO');        // arr IATA→ICAO
    expect(row.ac).toBe('B77W');         // aircraft alias
    expect(row.al).toBe('All Nippon Airways'); // airline IATA
    expect(row.t).toBe('1h30m');         // time 換算
    expect(row.fixes.length >= 5).toBe(true);
  });
});

describe('parseBulkFlights（全角コンマ 「、」 の救済）', () => {
  const r = parseBulkFlights('2025-06-01、RJTT、RJOO、B772、ANA、1h30m');
  it('valid / dep / arr', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.dep).toBe('RJTT');
    expect(row.arr).toBe('RJOO');
  });
});

describe('parseBulkFlights（旧 7 列フォーマット：No,date,...）', () => {
  const r = parseBulkFlights('1,2025-06-01,RJTT,RJOO,B772,ANA,1h30m');
  it('valid / date / dep', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.date).toBe('2025-06-01');
    expect(row.dep).toBe('RJTT');
  });
});

describe('parseBulkFlights（"クォート付きエアライン名" 対応）', () => {
  const r = parseBulkFlights('2025-06-01,RJTT,RJOO,B772,"Singapore Airlines, Ltd",1h30m');
  it('コンマ保持 / duration が流れない', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.al).toBe('Singapore Airlines, Ltd');
    expect(row.t).toBe('1h30m');
  });
});

describe('parseBulkFlights（無効データの扱い）', () => {
  it('パース不能な日付 → valid=false, reason に date', () => {
    const row = parseBulkFlights('hello,RJTT,RJOO,B772,ANA,1h30m')[0];
    expect(row.valid).toBe(false);
    if(row.valid) throw new Error('expected invalid row');
    expect(/date/i.test(row.reason)).toBe(true);
  });
  it('列数不足 → valid=false, reason に Missing', () => {
    const row = parseBulkFlights('2025-06-01,RJTT,RJOO,B772')[0];
    expect(row.valid).toBe(false);
    if(row.valid) throw new Error('expected invalid row');
    expect(/Missing/i.test(row.reason)).toBe(true);
  });
});

describe('parseBulkFlights（# コメントと空行をスキップ）', () => {
  const csv = '# IF_FlightLog v1\n' +
              '\n' +
              '# date,dep,arr,...\n' +
              '2025-06-01,RJTT,RJOO,B772,ANA,1h30m';
  const r = parseBulkFlights(csv);
  it('結果 1 行（コメントは無視）', () => expect(r).toHaveLength(1));
  it('valid', () => expect(r[0].valid).toBe(true));
});

describe('parseBulkAirports（ICAO 単独 → 内蔵 DB から解決）', () => {
  const r = parseBulkAirports('RJTT');
  it('結果 1 行', () => expect(r).toHaveLength(1));
  it('icao / lat / source', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.icao).toBe('RJTT');
    expect(typeof row.lat === 'number').toBe(true);
    expect(row.source === 'auto' || row.source === 'existing').toBe(true);
  });
});

describe('parseBulkAirports（IATA 1 列入力でも ICAO 解決）', () => {
  const r = parseBulkAirports('HND');
  it('valid / icao', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.icao).toBe('RJTT');
  });
});

describe('parseBulkAirports（6 列フル CSV：カスタム空港）', () => {
  const r = parseBulkAirports('ZZZZ,35.0,135.0,Foo City,Japan,Asia');
  it('全フィールド / source=manual', () => {
    const row = r[0];
    if(!row.valid) throw new Error('expected valid row');
    expect(row.icao).toBe('ZZZZ');
    expect(row.lat).toBe(35.0);
    expect(row.lng).toBe(135.0);
    expect(row.city).toBe('Foo City');
    expect(row.source).toBe('manual');
  });
});

describe('parseBulkAirports（緯度経度がパース不能）', () => {
  it('valid=false, reason に Invalid coords', () => {
    const row = parseBulkAirports('ZZZZ,abc,def,Foo,Japan,Asia')[0];
    expect(row.valid).toBe(false);
    if(row.valid) throw new Error('expected invalid row');
    expect(/coords/i.test(row.reason)).toBe(true);
  });
});
