// normalize.ts の回帰テスト。
// 旧 tests/normalize.test.html（ブラウザ直開きのミニ assert ハーネス）から
// テストケースをそのまま Vitest へ移植したもの。期待値は一切変えていない。
import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  normalizeTime,
  normalizeAirport,
  normalizeAircraft,
  normalizeAirline,
} from './normalize';

describe('normalizeDate（日付フォーマットゆれの吸収）', () => {
  it('YYYY-MM-DD passthrough', () => expect(normalizeDate('2025-06-01')).toBe('2025-06-01'));
  it('YYYY/M/D zero-pad',      () => expect(normalizeDate('2025/6/1')).toBe('2025-06-01'));
  it('YYYY.MM.DD',             () => expect(normalizeDate('2025.06.01')).toBe('2025-06-01'));
  it('YYYYMMDD compact',       () => expect(normalizeDate('20250601')).toBe('2025-06-01'));
  it('YY-MM-DD (2000s)',       () => expect(normalizeDate('25-06-01')).toBe('2025-06-01'));
  it('DD/MM/YYYY (day>12)',    () => expect(normalizeDate('25/06/2025')).toBe('2025-06-25'));
  it('MM/DD/YYYY (ambiguous)', () => expect(normalizeDate('06/01/2025')).toBe('2025-06-01'));
  it('whitespace trim',        () => expect(normalizeDate('  2025-06-01  ')).toBe('2025-06-01'));
  it('garbage → null',         () => expect(normalizeDate('hello')).toBe(null));
});

describe('normalizeTime（所要時間フォーマットゆれの吸収）', () => {
  it('1h30m passthrough', () => expect(normalizeTime('1h30m')).toBe('1h30m'));
  it('1:30 colon',        () => expect(normalizeTime('1:30')).toBe('1h30m'));
  it('01:30 padded',      () => expect(normalizeTime('01:30')).toBe('1h30m'));
  it('90m minutes only',  () => expect(normalizeTime('90m')).toBe('1h30m'));
  it('1H30M uppercase',   () => expect(normalizeTime('1H30M')).toBe('1h30m'));
  it('1h hours only',     () => expect(normalizeTime('1h')).toBe('1h00m'));
  it('1.5h decimal',      () => expect(normalizeTime('1.5h')).toBe('1h30m'));
  it('1h30 (missing m)',  () => expect(normalizeTime('1h30')).toBe('1h30m'));
  it('garbage → null',    () => expect(normalizeTime('hello')).toBe(null));
});

describe('normalizeAirport（IATA→ICAO・旧コード救済）', () => {
  it('ICAO passthrough',            () => expect(normalizeAirport('RJTT')).toBe('RJTT'));
  it('lowercase ICAO',              () => expect(normalizeAirport('rjtt')).toBe('RJTT'));
  it('IATA→ICAO (HND)',             () => expect(normalizeAirport('HND')).toBe('RJTT'));
  it('IATA→ICAO (ITM)',             () => expect(normalizeAirport('ITM')).toBe('RJOO'));
  it('IATA→ICAO (NRT)',             () => expect(normalizeAirport('NRT')).toBe('RJAA'));
  it('IATA→ICAO (LAX)',             () => expect(normalizeAirport('LAX')).toBe('KLAX'));
  it('IATA→ICAO (JFK)',             () => expect(normalizeAirport('JFK')).toBe('KJFK'));
  it('alias rescue NZQH→NZQN',      () => expect(normalizeAirport('NZQH')).toBe('NZQN'));
  it('hyphen stripped',             () => expect(normalizeAirport('R-JTT')).toBe('RJTT'));
  it('null input → null',           () => expect(normalizeAirport(null)).toBe(null));
  it('empty input → null',          () => expect(normalizeAirport('')).toBe(null));
  it('unknown 4字 ICAO passthrough', () => expect(normalizeAirport('ZZZZ')).toBe('ZZZZ'));
});

describe('normalizeAircraft（機材コード正規化・別名表記の吸収）', () => {
  it('canonical passthrough',        () => expect(normalizeAircraft('B77W')).toBe('B77W'));
  it('Boeing prefix strip',          () => expect(normalizeAircraft('Boeing 777-300ER')).toBe('B77W'));
  it('hyphen variant',               () => expect(normalizeAircraft('777-300ER')).toBe('B77W'));
  it('compact 77W',                  () => expect(normalizeAircraft('77W')).toBe('B77W'));
  it('B-prefix rescue (B777300ER)',  () => expect(normalizeAircraft('B777300ER')).toBe('B77W'));
  it('Airbus A350-900',              () => expect(normalizeAircraft('A350-900')).toBe('A359'));
  it('A350',                         () => expect(normalizeAircraft('A350')).toBe('A359'));
  it('A359 passthrough',             () => expect(normalizeAircraft('A359')).toBe('A359'));
  it('A220-300 (CSeries 300)',       () => expect(normalizeAircraft('A220-300')).toBe('BCS3'));
  it('CS300',                        () => expect(normalizeAircraft('CS300')).toBe('BCS3'));
  it('737-800',                      () => expect(normalizeAircraft('737-800')).toBe('B738'));
  it('737 MAX 8 (long)',             () => expect(normalizeAircraft('737MAX8')).toBe('B38M'));
  it('MAX8 short',                   () => expect(normalizeAircraft('MAX8')).toBe('B38M'));
  it('737MAX (defaults to MAX 8)',   () => expect(normalizeAircraft('737MAX')).toBe('B38M'));
  it('747-8I',                       () => expect(normalizeAircraft('747-8I')).toBe('B748'));
  it('A320neo',                      () => expect(normalizeAircraft('A320neo')).toBe('A320'));
  it('Embraer 190',                  () => expect(normalizeAircraft('EMB190')).toBe('E190'));
  it('CRJ-700',                      () => expect(normalizeAircraft('CRJ-700')).toBe('CRJ7'));
  it('unknown → compact form',       () => expect(normalizeAircraft('Foo-123')).toBe('FOO123'));
  it('null input → null',            () => expect(normalizeAircraft(null)).toBe(null));
});

describe('normalizeAirline（航空会社名・IATA/ICAO の正準化）', () => {
  it('IATA NH → ANA',         () => expect(normalizeAirline('NH')).toBe('All Nippon Airways'));
  it('ICAO ANA → ANA',        () => expect(normalizeAirline('ANA')).toBe('All Nippon Airways'));
  it('full name passthrough', () => expect(normalizeAirline('All Nippon Airways')).toBe('All Nippon Airways'));
  it('lowercase ana',         () => expect(normalizeAirline('ana')).toBe('All Nippon Airways'));
  it('JAL alias',             () => expect(normalizeAirline('JAL')).toBe('Japan Airlines'));
  it('JL (IATA)',             () => expect(normalizeAirline('JL')).toBe('Japan Airlines'));
  it('SQ (Singapore)',        () => expect(normalizeAirline('SQ')).toBe('Singapore Airlines'));
  it('unknown passthrough',   () => expect(normalizeAirline('My Custom Airline')).toBe('My Custom Airline'));
  it('null input → null',     () => expect(normalizeAirline(null)).toBe(null));
  it('whitespace-only → null', () => expect(normalizeAirline('   ')).toBe(null));
});
