// compute.ts の回帰テスト。
// 旧 tests/compute.test.html から移植。AP と flights は固定フィクスチャを注入し、
// 実データ変動に左右されないロジック単体テストにする（期待値は一切変えていない）。
//
// 旧版は AP / flights をグローバル変数として注入していた。React 版では
//   - AP  … vi.mock で '../data/airports' を差し替えて固定フィクスチャに
//   - flights … getFiltered(flights) の引数として明示的に渡す
// に置き換えている（挙動は同じ）。
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 国内/国際判定を網羅する最小空港セット（旧テストのフィクスチャと同一）。
vi.mock('../data/airports', () => ({
  AP: {
    RJTT: { co:'Japan',              city:'Tokyo(HND)', ct:'Asia' },
    RJAA: { co:'Japan',              city:'Tokyo(NRT)', ct:'Asia' },
    KSEA: { co:'USA',                city:'Seattle',    ct:'North America' },
    KFRC: { co:'USA',                city:'ForceUSA',   ct:'North America', forceIntl:true },
    EKCH: { co:'Denmark',            city:'Copenhagen', ct:'Europe' },
    EKVG: { co:'Faroe Islands(Denmark)', city:'Vágar',  ct:'Europe' },
    BGGH: { co:'Greenland(Denmark)', city:'Nuuk',       ct:'North America' },
    BGBW: { co:'Greenland(Denmark)', city:'Narsarsuaq', ct:'North America' },
    TJSJ: { co:'Puerto Rico(USA)',   city:'San Juan',   ct:'North America', forceIntl:true },
    ZBAA: { co:'China',              city:'Beijing',    ct:'Asia' },
    VHHH: { co:'Hong Kong(China)',   city:'Hong Kong',  ct:'Asia' },
  },
}));

import {
  FilterState,
  type FilterStateShape,
  type Flight,
  getFiltered,
  isAnyFilterActive,
  computeAll,
  computeSetStats,
  compareStats,
  _flightDomesticState,
  _flightContinentState,
  _flightContinents,
  _durationBucket,
  DURATION_BUCKETS,
} from './compute';

// フライト集合：年/月/曜日/航空会社/機材/所要時間/国内・国際/未収録(ZZZZ) を散らす。
const flights: Flight[] = [
  { date:'2024-01-05', dep:'RJTT', arr:'RJAA', ac:'B738', al:'ANA', t:'1h00m' }, // 国内JP / 金(wd4)
  { date:'2024-07-20', dep:'RJTT', arr:'KSEA', ac:'B77W', al:'ANA', t:'9h30m' }, // 国際   / 土(wd5)
  { date:'2025-03-10', dep:'EKCH', arr:'BGGH', ac:'A320', al:'SAS', t:'4h15m' }, // 国際(DK/GL) / 月(wd0)
  { date:'2025-03-11', dep:'ZBAA', arr:'VHHH', ac:'A333', al:'CCA', t:'3h00m' }, // 国際(CN/HK) / 火(wd1)
  { date:'2025-12-25', dep:'RJTT', arr:'ZZZZ', ac:'B738', al:'JAL', t:'2h00m' }, // unknown(ZZZZ未収録) / 木(wd3)
];

// FilterState を毎回まっさらにしてから上書きするヘルパ（テスト間の状態漏れ防止）。
function setFilter(o: Partial<FilterStateShape> = {}) {
  FilterState.years=[]; FilterState.airlines=[]; FilterState.aircraft=[];
  FilterState.countries=[]; FilterState.scope=[]; FilterState.months=[]; FilterState.weekdays=[];
  FilterState.airports=[]; FilterState.cities=[]; FilterState.continents=[];
  FilterState.depAirports=[]; FilterState.arrAirports=[];
  FilterState.depCities=[]; FilterState.arrCities=[]; FilterState.depCountries=[]; FilterState.arrCountries=[];
  FilterState.depContinents=[]; FilterState.arrContinents=[];
  FilterState.contScope=[]; FilterState.durations=[]; FilterState.durationRange=[];
  FilterState.dateRange=[];
  Object.assign(FilterState, o);
}

beforeEach(() => setFilter({}));

describe('_flightDomesticState（三値判定）', () => {
  it('同一国 → domestic',            () => expect(_flightDomesticState({dep:'RJTT', arr:'RJAA'})).toBe('domestic'));
  it('別国 → international',          () => expect(_flightDomesticState({dep:'RJTT', arr:'KSEA'})).toBe('international'));
  it('同一管轄(DK⇄GL) → domestic',   () => expect(_flightDomesticState({dep:'EKCH', arr:'BGGH'})).toBe('domestic'));
  it('別管轄(CN/HK) → international', () => expect(_flightDomesticState({dep:'ZBAA', arr:'VHHH'})).toBe('international'));
  it('dep 未収録 → unknown',         () => expect(_flightDomesticState({dep:'ZZZZ', arr:'RJTT'})).toBe('unknown'));
  it('arr 未収録 → unknown',         () => expect(_flightDomesticState({dep:'RJTT', arr:'ZZZZ'})).toBe('unknown'));
  it('forceIntl が管轄国内を上書き → international', () => expect(_flightDomesticState({dep:'EKCH', arr:'BGBW'})).toBe('international'));
  it('co 一致は forceIntl より優先 → domestic',     () => expect(_flightDomesticState({dep:'KSEA', arr:'KFRC'})).toBe('domestic'));
});

describe('getFiltered（フィルタ述語：全 5 便のフィクスチャを絞る）', () => {
  it('絞り込み無し → 全 5 件',   () => { setFilter({});                    expect(getFiltered(flights).length).toBe(5); });
  it("years ['2024'] → 2 件",   () => { setFilter({years:['2024']});      expect(getFiltered(flights).length).toBe(2); });
  it("airlines ['ANA'] → 2 件", () => { setFilter({airlines:['ANA']});    expect(getFiltered(flights).length).toBe(2); });
  it("aircraft ['B738'] → 2 件", () => { setFilter({aircraft:['B738']});  expect(getFiltered(flights).length).toBe(2); });
  it("countries ['Japan'] → 3 件", () => { setFilter({countries:['Japan']}); expect(getFiltered(flights).length).toBe(3); });
  it("months ['03'] → 2 件",    () => { setFilter({months:['03']});       expect(getFiltered(flights).length).toBe(2); });
  it("weekdays ['0'](月) → 1 件", () => { setFilter({weekdays:['0']});     expect(getFiltered(flights).length).toBe(1); });
});

describe('scope フィルタ（unknown は両方から除外）', () => {
  it('scope domestic → 2 件', () => { setFilter({scope:['domestic']}); expect(getFiltered(flights).length).toBe(2); });
  it('scope domestic に unknown便(ZZZZ)を含まない', () => { setFilter({scope:['domestic']}); expect(getFiltered(flights).some(f=>f.arr==='ZZZZ')).toBe(false); });
  it('scope international → 2 件', () => { setFilter({scope:['international']}); expect(getFiltered(flights).length).toBe(2); });
  it('scope international に unknown便(ZZZZ)を含まない', () => { setFilter({scope:['international']}); expect(getFiltered(flights).some(f=>f.arr==='ZZZZ')).toBe(false); });
  it('scope 両選択 → 絞り込み無し(全 5 件)', () => { setFilter({scope:['domestic','international']}); expect(getFiltered(flights).length).toBe(5); });
  it('複合: 2025 かつ domestic → 1 件', () => { setFilter({years:['2025'], scope:['domestic']}); expect(getFiltered(flights).length).toBe(1); });
});

describe('isAnyFilterActive', () => {
  it('無選択 → false',        () => { setFilter({}); expect(isAnyFilterActive()).toBe(false); });
  it('scope 2 個でも true',   () => { setFilter({scope:['domestic','international']}); expect(isAnyFilterActive()).toBe(true); });
  it('years 選択 → true',     () => { setFilter({years:['2024']}); expect(isAnyFilterActive()).toBe(true); });
});

describe('computeAll（集計の整合）', () => {
  const C = computeAll(flights);
  it('ac 最多は B738×2', () => expect(C.ac[0]).toEqual(['B738', 2]));
  it('al 最多は ANA×2',  () => expect(C.al[0]).toEqual(['ANA', 2]));
  it('ap 最多は RJTT×3', () => expect(C.ap[0]).toEqual(['RJTT', 3]));
  it('rt エントリ数 = 5', () => expect(C.rt.length).toBe(5));
  it('yr 2024 = 2',      () => expect(C.yr['2024']).toBe(2));
  it('yr 2025 = 3',      () => expect(C.yr['2025']).toBe(3));
  it('mo 3月 = 2',       () => expect(C.mo[3]).toBe(2));
  it('mo 12月 = 1',      () => expect(C.mo[12]).toBe(1));
  it('co 最多は Japan×4', () => expect(C.co[0]).toEqual(['Japan', 4]));
  it('wd 月曜(0) = 1',   () => expect(C.wd[0]).toBe(1));
  it('wd 金曜(4) = 1',   () => expect(C.wd[4]).toBe(1));
  it('wd 日曜(6) = 0',   () => expect(C.wd[6]).toBe(0));
  it('acMin B738 = 180 (60+120)', () => expect(C.acMin['B738']).toBe(180));
  it('alMin ANA = 630 (60+570)',  () => expect(C.alMin['ANA']).toBe(630));
});

describe('computeSetStats / compareStats', () => {
  const S = computeSetStats(flights);
  it('count = 5',                        () => expect(S.count).toBe(5));
  it('mins 合計 = 1185',                 () => expect(S.mins).toBe(1185));
  it('unique airports = 8 (ZZZZ 含む)',  () => expect(S.airports.size).toBe(8));
  it('unique countries = 6 (ZZZZ 除外)', () => expect(S.countries.size).toBe(6));
  const cmp = compareStats(flights.slice(0,2), flights.slice(2));
  it('compare A.count = 2',  () => expect(cmp.a.count).toBe(2));
  it('compare B.count = 3',  () => expect(cmp.b.count).toBe(3));
  it('compare A.mins = 630', () => expect(cmp.a.mins).toBe(630));
  it('compare B.mins = 555', () => expect(cmp.b.mins).toBe(555));
});

describe('_flightContinentState（大陸内/間/unknown の三値）', () => {
  it('同一大陸(Asia→Asia) → intra', () => expect(_flightContinentState({dep:'RJTT', arr:'RJAA'})).toBe('intra'));
  it('別大陸(Asia→NA) → inter',     () => expect(_flightContinentState({dep:'RJTT', arr:'KSEA'})).toBe('inter'));
  it('別大陸(Europe→NA) → inter',   () => expect(_flightContinentState({dep:'EKCH', arr:'BGGH'})).toBe('inter'));
  it('dep 未収録 → unknown',        () => expect(_flightContinentState({dep:'ZZZZ', arr:'RJTT'})).toBe('unknown'));
  it('arr 未収録 → unknown',        () => expect(_flightContinentState({dep:'RJTT', arr:'ZZZZ'})).toBe('unknown'));
  it('_flightContinents(Asia→NA)',  () => expect(_flightContinents({dep:'RJTT', arr:'KSEA'})).toEqual(['Asia','North America']));
  it('_flightContinents(未収録側は除外)', () => expect(_flightContinents({dep:'RJTT', arr:'ZZZZ'})).toEqual(['Asia']));
});

describe('_durationBucket（分 → バケット・境界確認）', () => {
  it('0分 → short',        () => expect(_durationBucket(0)).toBe('short'));
  it('59分 → short',       () => expect(_durationBucket(59)).toBe('short'));
  it('60分(境界) → medium', () => expect(_durationBucket(60)).toBe('medium'));
  it('120分 → medium',     () => expect(_durationBucket(120)).toBe('medium'));
  it('180分(境界) → long',  () => expect(_durationBucket(180)).toBe('long'));
  it('255分 → long',       () => expect(_durationBucket(255)).toBe('long'));
  it('360分(境界) → xlong', () => expect(_durationBucket(360)).toBe('xlong'));
  it('600分(境界) → ultra', () => expect(_durationBucket(600)).toBe('ultra'));
  it('負値 → null',         () => expect(_durationBucket(-1)).toBe(null));
  it('バケット定義は 5 段', () => expect(DURATION_BUCKETS.length).toBe(5));
});

describe('新フィルタ述語（全 5 便のフィクスチャを絞る）', () => {
  it("airports ['RJTT']（発着どちらか） → 3 件", () => { setFilter({airports:['RJTT']}); expect(getFiltered(flights).length).toBe(3); });
  it("airports ['RJAA']（arr のみ該当） → 1 件", () => { setFilter({airports:['RJAA']}); expect(getFiltered(flights).length).toBe(1); });
  it("airports ['KSEA']（arr のみ該当） → 1 件", () => { setFilter({airports:['KSEA']}); expect(getFiltered(flights).length).toBe(1); });
  it("cities ['Tokyo(HND)']（発着どちらか） → 3 件", () => { setFilter({cities:['Tokyo(HND)']}); expect(getFiltered(flights).length).toBe(3); });
  it("cities ['Seattle']（arr のみ該当） → 1 件", () => { setFilter({cities:['Seattle']}); expect(getFiltered(flights).length).toBe(1); });
  it("continents ['NA']（either） → 2 件", () => { setFilter({continents:['North America']}); expect(getFiltered(flights).length).toBe(2); });
  it("depCities ['Tokyo(HND)'] → 3 件", () => { setFilter({depCities:['Tokyo(HND)']}); expect(getFiltered(flights).length).toBe(3); });
  it("arrCities ['Tokyo(HND)'] → 0 件", () => { setFilter({arrCities:['Tokyo(HND)']}); expect(getFiltered(flights).length).toBe(0); });
  it("depCountries ['Japan'] → 3 件", () => { setFilter({depCountries:['Japan']}); expect(getFiltered(flights).length).toBe(3); });
  it("arrCountries ['USA'] → 1 件", () => { setFilter({arrCountries:['USA']}); expect(getFiltered(flights).length).toBe(1); });
  it("depAirports ['RJTT'] → 3 件", () => { setFilter({depAirports:['RJTT']}); expect(getFiltered(flights).length).toBe(3); });
  it("arrAirports ['RJAA'] → 1 件", () => { setFilter({arrAirports:['RJAA']}); expect(getFiltered(flights).length).toBe(1); });
  it('ルート＝dep+arr 重ね掛け(RJTT→KSEA) → 1 件', () => { setFilter({depAirports:['RJTT'], arrAirports:['KSEA']}); expect(getFiltered(flights).length).toBe(1); });
  it("depContinents ['Asia'] → 4 件", () => { setFilter({depContinents:['Asia']}); expect(getFiltered(flights).length).toBe(4); });
  it("arrContinents ['NA'] → 2 件", () => { setFilter({arrContinents:['North America']}); expect(getFiltered(flights).length).toBe(2); });
});

describe('大陸内/間 scope（contScope・unknown は両方から除外）', () => {
  it('contScope intra → 2 件', () => { setFilter({contScope:['intra']}); expect(getFiltered(flights).length).toBe(2); });
  it('intra に unknown便(ZZZZ)を含まない', () => { setFilter({contScope:['intra']}); expect(getFiltered(flights).some(f=>f.arr==='ZZZZ')).toBe(false); });
  it('contScope inter → 2 件', () => { setFilter({contScope:['inter']}); expect(getFiltered(flights).length).toBe(2); });
  it('両選択 → 全 5 件(no-op)', () => { setFilter({contScope:['intra','inter']}); expect(getFiltered(flights).length).toBe(5); });
});

describe('飛行時間フィルタ（durations バケット多選択）', () => {
  it("medium → 2 件(60/120分)", () => { setFilter({durations:['medium']}); expect(getFiltered(flights).length).toBe(2); });
  it("long → 2 件(180/255分)",  () => { setFilter({durations:['long']}); expect(getFiltered(flights).length).toBe(2); });
  it("xlong → 1 件(570分)",     () => { setFilter({durations:['xlong']}); expect(getFiltered(flights).length).toBe(1); });
  it("short → 0 件",            () => { setFilter({durations:['short']}); expect(getFiltered(flights).length).toBe(0); });
  it("medium+long → 4 件",      () => { setFilter({durations:['medium','long']}); expect(getFiltered(flights).length).toBe(4); });
  it("range 120–255分 → 3 件(120/180/255)", () => { setFilter({durationRange:[120,255]}); expect(getFiltered(flights).length).toBe(3); });
  it("range 0–60分 → 1 件(60)", () => { setFilter({durationRange:[0,60]}); expect(getFiltered(flights).length).toBe(1); });
  it("range 600分以上 → 0 件",  () => { setFilter({durationRange:[600,100000]}); expect(getFiltered(flights).length).toBe(0); });
  it("range はバケットを上書き → 2 件(120/180)", () => { setFilter({durationRange:[100,200], durations:['ultra']}); expect(getFiltered(flights).length).toBe(2); });

  // ── 期間フィルター（dateRange・2026-07-11）。両端含む・片側 '' で開区間。
  it("dateRange 2025-03-01〜2025-03-31 → 2 件(3/10・3/11)", () => {
    setFilter({dateRange:['2025-03-01','2025-03-31']}); expect(getFiltered(flights).length).toBe(2);
  });
  it("dateRange 境界は両端含む（3/10〜3/10 → 1 件）", () => {
    setFilter({dateRange:['2025-03-10','2025-03-10']}); expect(getFiltered(flights).length).toBe(1);
  });
  it("dateRange from のみ（2025-01-01〜）→ 3 件", () => {
    setFilter({dateRange:['2025-01-01','']}); expect(getFiltered(flights).length).toBe(3);
  });
  it("dateRange to のみ（〜2024-12-31）→ 2 件", () => {
    setFilter({dateRange:['','2024-12-31']}); expect(getFiltered(flights).length).toBe(2);
  });
  it("dateRange は年フィルタと AND 交差（2024 年 × 〜2024-06-30 → 1 件）", () => {
    setFilter({years:['2024'], dateRange:['','2024-06-30']}); expect(getFiltered(flights).length).toBe(1);
  });
  it("dateRange 選択で isAnyFilterActive → true", () => {
    setFilter({dateRange:['2025-01-01','']}); expect(isAnyFilterActive()).toBe(true);
  });
});

describe('isAnyFilterActive（新軸も検知）', () => {
  it('depAirports 選択 → true', () => { setFilter({depAirports:['RJTT']}); expect(isAnyFilterActive()).toBe(true); });
  it('durations 選択 → true',   () => { setFilter({durations:['long']}); expect(isAnyFilterActive()).toBe(true); });
  it('contScope 2 個でも true', () => { setFilter({contScope:['intra','inter']}); expect(isAnyFilterActive()).toBe(true); });
});
