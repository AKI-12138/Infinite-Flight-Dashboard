// memo-config.ts（メモ項目定義・単位の自動付与・時刻/所要時間の分解結合）のテスト。
import { describe, it, expect } from 'vitest';
import {
  formatMemoValue, getMemoUnit, MEMO_FIELD_BY_KEY, MEMO_SECTIONS,
  splitClock, combineClock, splitDuration, combineDuration, sumDurations,
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

  it('着陸品質：降下率は fpm（負数 OK）・G 値は G・センターライン偏差は m を付ける', () => {
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.tdRate, '-250')).toBe('-250 fpm');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.gForce, '1.32')).toBe('1.32 G');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.clOffset, '1.5')).toBe('1.5 m');
  });

  it('桁区切りの自動付与（オーナー指定 2026-07-11）：量的項目の素の数値は 42,790 形式に', () => {
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cargo, '42790')).toBe('42,790 kg');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.fuelBlock, '14552')).toBe('14,552 kg');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cruiseAlt, '34000')).toBe('34,000 ft');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.tdRate, '-1200')).toBe('-1,200 fpm');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.pax, '1234')).toBe('1,234'); // unit なしでも量的
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.gForce, '1.32')).toBe('1.32 G'); // 小数はそのまま
  });

  it('桁区切り：ユーザーが書いた区切り・単位はそのまま尊重（二重加工しない）', () => {
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cargo, '8,400')).toBe('8,400 kg');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cargo, '8 400.5')).toBe('8 400.5 kg');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cargo, '42790 kg')).toBe('42790 kg');
  });

  it('桁区切り：量ではない数字（便名・レジ番号など）には掛けない', () => {
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.reg, '58304')).toBe('58304');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.flightNo, '92312')).toBe('92312');
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

  it('Times の並び：出発｜到着を横に・LOC 行 → UTC 行・OUT/IN → OFF/ON（オーナー指定 2026-07-11）', () => {
    const keys = MEMO_SECTIONS.find((s) => s.key === 'times')!.fields.map((f) => f.key);
    expect(keys).toEqual([
      'depDateLoc', 'arrDateLoc', 'depDateUtc', 'arrDateUtc',
      'outLoc', 'inLoc', 'outUtc', 'inUtc',
      'offLoc', 'onLoc', 'offUtc', 'onUtc',
      'taxiOut', 'taxiIn', 'taxiTotal', 'autoAirTime',
    ]);
  });

  it('巡航2項目：高度は ft 自動付与・Mach は付与なし（IAS 欄は廃止・2026-07-11）', () => {
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cruiseAlt, '34,000')).toBe('34,000 ft');
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cruiseAlt, 'FL340')).toBe('FL340'); // 文字入り＝そのまま
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cruiseMach, '0.85')).toBe('0.85');
    expect(MEMO_FIELD_BY_KEY.cruiseIas).toBeUndefined();
  });

  it('運航構成・代替空港の3欄（ADV-008・2026-08-07）：構成は各 V 速度の直後・ALTN は Route 末尾', () => {
    const perf = MEMO_SECTIONS.find((s) => s.key === 'performance')!.fields.map((f) => f.key);
    expect(perf).toEqual([
      'v1', 'vr', 'v2', 'cfgTakeoff', 'vapp', 'vref', 'cfgLanding',
      'cruiseAlt', 'cruiseMach', 'distance', 'tdRate', 'gForce', 'clOffset',
    ]);
    const route = MEMO_SECTIONS.find((s) => s.key === 'route')!.fields.map((f) => f.key);
    expect(route[route.length - 1]).toBe('altn');
    // 構成欄は自由入力（単位の自動付与をしない＝"Flaps 5 / FLEX 50" をそのまま表示）
    expect(MEMO_FIELD_BY_KEY.cfgTakeoff.unit).toBeUndefined();
    expect(MEMO_FIELD_BY_KEY.cfgLanding.unit).toBeUndefined();
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.cfgTakeoff, 'Flaps 5 / FLEX 50')).toBe('Flaps 5 / FLEX 50');
    // ALTN は空港DBの候補つき（ICAO 自由入力は維持）
    expect(MEMO_FIELD_BY_KEY.altn.ac).toBe('airport');
    expect(MEMO_FIELD_BY_KEY.altn.unit).toBeUndefined();
    expect(formatMemoValue(MEMO_FIELD_BY_KEY.altn, 'RJAA')).toBe('RJAA');
  });

  it('フライト本体からの自動項目：From/To/Date/Aircraft/Airline/air time（保存せず常にログの値）', () => {
    const fl = { date: '2026-07-09', dep: 'RCTP', arr: 'VMMC', ac: 'A339', al: 'Starlux Airlines', t: '1h20m' };
    // From/To は都市名併記（"Taipei(TPE)" の "(TPE)" は ICAO と重複するので外れる）
    expect(MEMO_FIELD_BY_KEY.autoFrom.computed!({}, fl)).toBe('RCTP (Taipei)');
    expect(MEMO_FIELD_BY_KEY.autoTo.computed!({}, fl)).toBe('VMMC (Macau)');
    // 未収録空港はコードのみ
    expect(MEMO_FIELD_BY_KEY.autoFrom.computed!({}, { ...fl, dep: 'ZZZZ' })).toBe('ZZZZ');
    expect(MEMO_FIELD_BY_KEY.autoDate.computed!({}, fl)).toBe('2026-07-09');
    // 機材はフルネーム表示（A339 → A330-900）。未収録コードはそのまま。
    expect(MEMO_FIELD_BY_KEY.autoAircraft.computed!({}, fl)).toBe('A330-900');
    expect(MEMO_FIELD_BY_KEY.autoAircraft.computed!({}, { ...fl, ac: 'ZZZZ' })).toBe('ZZZZ');
    expect(MEMO_FIELD_BY_KEY.autoAirline.computed!({}, fl)).toBe('Starlux Airlines');
    expect(MEMO_FIELD_BY_KEY.autoAirTime.computed!({}, fl)).toBe('1h20m');
    expect(MEMO_FIELD_BY_KEY.autoFrom.computed!({}, undefined)).toBe(''); // フライト未指定は空
  });

  it('Flight Info の並び：DATE｜PILOT → FROM｜TO → 以降従来どおり／Weather は独立セクション', () => {
    const info = MEMO_SECTIONS.find((s) => s.key === 'flightinfo')!.fields.map((f) => f.key);
    expect(info).toEqual(['autoDate', 'pilot', 'autoFrom', 'autoTo', 'termDep', 'termArr', 'gateDep', 'gateArr', 'autoAircraft', 'autoAirline', 'flightNo', 'callsign', 'reg']);
    const weather = MEMO_SECTIONS.find((s) => s.key === 'weather')!;
    expect(weather.fields.map((f) => f.key)).toEqual(['metarDep', 'metarArr', 'rvrDep', 'rvrArr']);
    // Route & Procedures から METAR が抜けている
    expect(MEMO_SECTIONS.find((s) => s.key === 'route')!.fields.some((f) => f.key.startsWith('metar'))).toBe(false);
  });
});

describe('sumDurations（Taxi total の自動計算）', () => {
  it('両方あれば合計（分繰り上がりも正準形で返す）', () => {
    expect(sumDurations('9m', '3m')).toBe('12m');
    expect(sumDurations('45m', '20m')).toBe('1h05m');
    expect(sumDurations('1h05m', '12m')).toBe('1h17m');
  });
  it('片方だけならその値・両方空なら空文字', () => {
    expect(sumDurations('9m', '')).toBe('9m');
    expect(sumDurations('', '12m')).toBe('12m');
    expect(sumDurations('', '')).toBe('');
  });
  it('taxiTotal は computed 項目＝taxiOut/taxiIn から導出される', () => {
    expect(MEMO_FIELD_BY_KEY.taxiTotal.computed!({ taxiOut: '9m', taxiIn: '3m' })).toBe('12m');
    expect(MEMO_FIELD_BY_KEY.taxiTotal.computed!({})).toBe('');
  });
});

describe('UTC 欄の自動換算（A案・2026-07-11）', () => {
  // RJTT（+9）発 → KSEA（夏＝−7）着。ログの日付は 2026-07-20。
  const fl = { date: '2026-07-20', dep: 'RJTT', arr: 'KSEA', ac: 'B77W', al: 'ANA', t: '9h30m' };

  it('出発側（OUT/OFF）は出発空港のゾーンで換算', () => {
    expect(MEMO_FIELD_BY_KEY.outUtc.computed!({ outLoc: '12:09' }, fl)).toBe('03:09');
    expect(MEMO_FIELD_BY_KEY.offUtc.computed!({ offLoc: '12:21' }, fl)).toBe('03:21');
  });
  it('到着側（ON/IN）は到着空港のゾーンで換算（arrDateLoc → depDateLoc → ログ日付の順で日付を採用）', () => {
    expect(MEMO_FIELD_BY_KEY.onUtc.computed!({ onLoc: '10:00', arrDateLoc: '2026-07-20' }, fl)).toBe('17:00');
    expect(MEMO_FIELD_BY_KEY.inUtc.computed!({ inLoc: '10:05' }, fl)).toBe('17:05'); // 日付はログから
  });
  it('UTC 日付：代表時刻で換算（東京 08:00 発 → UTC は前日）', () => {
    expect(MEMO_FIELD_BY_KEY.depDateUtc.computed!({ depDateLoc: '2026-07-20', outLoc: '8:00' }, fl)).toBe('2026-07-19');
  });
  it('LOC 未入力は ""（auto のまま空欄）・未収録空港は null（手入力へ）', () => {
    expect(MEMO_FIELD_BY_KEY.outUtc.computed!({}, fl)).toBe('');
    const unknown = { ...fl, dep: 'ZZZZ' };
    expect(MEMO_FIELD_BY_KEY.outUtc.computed!({ outLoc: '12:00' }, unknown)).toBeNull();
    expect(MEMO_FIELD_BY_KEY.inUtc.computed!({ inLoc: '10:00' }, unknown)).toBe('17:00'); // 到着側は KSEA なので計算可
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
