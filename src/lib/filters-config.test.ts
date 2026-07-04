// filters-config.ts の回帰テスト。
// 旧 tests/filters-config.test.html から移植。地理逆引き・cascade・_sameSet・
// 宣言的モデルの不変条件を検証（期待値は一切変えていない）。
//
// AP は地理逆引きを網羅する最小空港セットを vi.mock で注入（compute.test と同じ方式）。
// FilterState / DURATION_BUCKETS は compute から実物を import する。
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../data/airports', () => ({
  AP: {
    RJTT: { co:'Japan', city:'Tokyo',      ct:'Asia' },
    RJAA: { co:'Japan', city:'Narita',     ct:'Asia' },
    ZBAA: { co:'China', city:'Beijing',    ct:'Asia' },
    KSEA: { co:'USA',   city:'Seattle',    ct:'North America' },
    KLAX: { co:'USA',   city:'LosAngeles', ct:'North America' },
    EGLL: { co:'UK',    city:'London',     ct:'Europe' },
  },
}));

import { FilterState, DURATION_BUCKETS, type FilterStateShape } from './compute';
import {
  _airportContinent,
  _airportCountry,
  _cityContinent,
  _cityCountry,
  _countryContinent,
  _activeGeo,
  _cascadeAllow,
  _sameSet,
  FILTER_DEFS,
  _ALL_STATE_KEYS,
  _ADV_FILTER_KEYS,
} from './filters-config';

// FilterState を毎回まっさらにしてから上書きするヘルパ（compute.test と同一）。
function setFilter(o: Partial<FilterStateShape> = {}) {
  FilterState.years=[]; FilterState.airlines=[]; FilterState.aircraft=[];
  FilterState.countries=[]; FilterState.scope=[]; FilterState.months=[]; FilterState.weekdays=[];
  FilterState.airports=[]; FilterState.cities=[]; FilterState.continents=[];
  FilterState.depAirports=[]; FilterState.arrAirports=[];
  FilterState.depCities=[]; FilterState.arrCities=[]; FilterState.depCountries=[]; FilterState.arrCountries=[];
  FilterState.depContinents=[]; FilterState.arrContinents=[];
  FilterState.contScope=[]; FilterState.durations=[]; FilterState.durationRange=[];
  Object.assign(FilterState, o);
}

beforeEach(() => setFilter({}));

describe('地理逆引き（_airportContinent / _airportCountry / _cityContinent / _cityCountry / _countryContinent）', () => {
  it('_airportContinent(RJTT) → Asia',          () => expect(_airportContinent('RJTT')).toBe('Asia'));
  it('_airportContinent(KSEA) → North America', () => expect(_airportContinent('KSEA')).toBe('North America'));
  it('_airportContinent(未収録) → Other',       () => expect(_airportContinent('ZZZZ')).toBe('Other'));
  it('_airportCountry(KSEA) → USA',             () => expect(_airportCountry('KSEA')).toBe('USA'));
  it('_airportCountry(未収録) → null',          () => expect(_airportCountry('ZZZZ')).toBe(null));
  it('_cityContinent(Tokyo) → Asia',            () => expect(_cityContinent('Tokyo')).toBe('Asia'));
  it('_cityContinent(未収録) → Other',          () => expect(_cityContinent('Nowhere')).toBe('Other'));
  it('_cityCountry(Seattle) → USA',             () => expect(_cityCountry('Seattle')).toBe('USA'));
  it('_cityCountry(未収録) → null',             () => expect(_cityCountry('Nowhere')).toBe(null));
  it('_countryContinent(Japan) → Asia',         () => expect(_countryContinent('Japan')).toBe('Asia'));
  it('_countryContinent(UK) → Europe',          () => expect(_countryContinent('UK')).toBe('Europe'));
  it('_countryContinent(未収録) → null',        () => expect(_countryContinent('Nowhere')).toBe(null));
});

describe('_activeGeo（地理制約の和集合）', () => {
  it('大陸/国を dep/arr/either で和集合', () => {
    setFilter({continents:['Asia'], depContinents:['Europe'], arrContinents:['Africa'],
               countries:['Japan'], depCountries:['USA']});
    const g = _activeGeo();
    expect([...g.continents].sort()).toEqual(['Africa','Asia','Europe']);
    expect([...g.countries].sort()).toEqual(['Japan','USA']);
  });
});

describe('_cascadeAllow（cascade 無し / 制約無し → null）', () => {
  it('cascade を持たない def → null', () => { setFilter({}); expect(_cascadeAllow({ key:'year' } as { cascade?: string })).toBe(null); });
  it('地理制約が無い → null',         () => { setFilter({}); expect(_cascadeAllow({ cascade:'airport' })).toBe(null); });
});

describe('_cascadeAllow airport（大陸 / 国 / 両方で空港候補を絞る）', () => {
  it('大陸Asia で絞る', () => {
    setFilter({ continents:['Asia'] });
    const allow = _cascadeAllow({ cascade:'airport' })!;
    expect(allow('RJTT')).toBe(true);  // Asia
    expect(allow('KSEA')).toBe(false); // NA
    expect(allow('EGLL')).toBe(false); // Europe
  });
  it('国Japan で絞る', () => {
    setFilter({ countries:['Japan'] });
    const allow = _cascadeAllow({ cascade:'airport' })!;
    expect(allow('RJAA')).toBe(true);  // JP
    expect(allow('ZBAA')).toBe(false); // China
  });
  it('Asia & Japan の両立', () => {
    setFilter({ continents:['Asia'], countries:['Japan'] });
    const allow = _cascadeAllow({ cascade:'airport' })!;
    expect(allow('RJTT')).toBe(true);
    expect(allow('ZBAA')).toBe(false); // 大陸は満たすが国が不一致
    expect(allow('KSEA')).toBe(false);
  });
});

describe('_cascadeAllow city（都市を大陸/国で絞る）', () => {
  it('大陸Asia で絞る', () => {
    setFilter({ continents:['Asia'] });
    const allow = _cascadeAllow({ cascade:'city' })!;
    expect(allow('Tokyo')).toBe(true);
    expect(allow('Seattle')).toBe(false);
  });
  it('国USA で絞る', () => {
    setFilter({ countries:['USA'] });
    const allow = _cascadeAllow({ cascade:'city' })!;
    expect(allow('Seattle')).toBe(true);
    expect(allow('Tokyo')).toBe(false);
  });
});

describe('_cascadeAllow country（国候補は大陸のみで絞る＝国どうしでは絞らない）', () => {
  it('大陸Asia で絞る', () => {
    setFilter({ continents:['Asia'] });
    const allow = _cascadeAllow({ cascade:'country' })!;
    expect(allow('Japan')).toBe(true);
    expect(allow('USA')).toBe(false);
  });
  it('国のみ選択（大陸なし）では国どうし絞らない', () => {
    setFilter({ countries:['Japan'] });
    const allow = _cascadeAllow({ cascade:'country' })!;
    expect(allow('USA')).toBe(true);
    expect(allow('Japan')).toBe(true);
  });
});

describe('_sameSet（順不同一致 / 長さ / 非配列 / 重複）', () => {
  it('順不同で一致 → true',          () => expect(_sameSet(['a','b'], ['b','a'])).toBe(true));
  it('長さ違い → false',             () => expect(_sameSet(['a'], ['a','b'])).toBe(false));
  it('空集合どうし → true',          () => expect(_sameSet([], [])).toBe(true));
  it('重複ありで内容不一致 → false', () => expect(_sameSet(['a','a'], ['a','b'])).toBe(false));
  it('第1引数が非配列 → false',      () => expect(_sameSet(undefined, ['a'])).toBe(false));
});

describe('FILTER_DEFS / _ALL_STATE_KEYS / _ADV_FILTER_KEYS の不変条件', () => {
  it('全 def が key/stateKey/all/order を持つ', () =>
    expect(FILTER_DEFS.every(d => !!d.key && !!d.stateKey && !!d.all && !!d.order)).toBe(true));
  it('_ALL_STATE_KEYS が全 def の stateKey を網羅', () =>
    expect(FILTER_DEFS.every(d => _ALL_STATE_KEYS.includes(d.stateKey))).toBe(true));
  it('_ALL_STATE_KEYS が durationRange を含む', () =>
    expect(_ALL_STATE_KEYS.includes('durationRange')).toBe(true));
  it('_ADV_FILTER_KEYS は全て有効な state キー（タイポ検出）', () =>
    expect(_ADV_FILTER_KEYS.every(k => _ALL_STATE_KEYS.includes(k))).toBe(true));
  it('duration def の選択肢数 = DURATION_BUCKETS 段数', () => {
    const durDef = FILTER_DEFS.find(d => d.key==='duration');
    expect(durDef?.fixedOptions?.length).toBe(DURATION_BUCKETS.length);
  });
  it('key の重複が無い', () =>
    expect(new Set(FILTER_DEFS.map(d => d.key)).size).toBe(FILTER_DEFS.length));
});
