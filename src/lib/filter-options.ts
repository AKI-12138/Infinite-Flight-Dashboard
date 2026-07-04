// =============================== FILTER OPTIONS ===============================
// 現在のフライトデータから、各フィルタで選べる「選択肢」を算出する純関数（旧 main.js の _availableOptions）。
// 年は降順、それ以外は昇順。fixedOptions を持つ軸（月/曜日/scope/大陸/duration 等）はデータに依存しないので
// ここには含めない（メニュー側が def.fixedOptions を直接読む）。
// 戻り値のキーは FILTER_DEFS の `key`（＝data-menu / data-chip の値）に一致させる。
import { AP } from '../data/airports';
import { _flightCountry, _flightCities, type Flight } from './compute';

// 各データ由来フィルタの選択肢（string[]）。キーは def.key。
export type FilterOptionsMap = Record<string, string[]>;

export function availableOptions(flights: Flight[]): FilterOptionsMap {
  const years = new Set<string>(), airlines = new Set<string>(), aircraft = new Set<string>();
  const countries = new Set<string>();
  // 空港軸：depAirport / arrAirport は向き別、airports（either・drilldown 用）は和集合。
  const depAp = new Set<string>(), arrAp = new Set<string>(), anyAp = new Set<string>();
  const cityset = new Set<string>();
  const depCitySet = new Set<string>(), arrCitySet = new Set<string>();
  const depCoSet = new Set<string>(), arrCoSet = new Set<string>();
  flights.forEach((f) => {
    years.add(f.date.slice(0, 4));
    if (f.al) airlines.add(f.al);
    if (f.ac) aircraft.add(f.ac);
    _flightCountry(f).forEach((c) => countries.add(c));
    _flightCities(f).forEach((c) => cityset.add(c));
    if (f.dep) {
      depAp.add(f.dep); anyAp.add(f.dep);
      const m = AP[f.dep];
      if (m) { if (m.city) depCitySet.add(m.city); if (m.co) depCoSet.add(m.co); }
    }
    if (f.arr) {
      arrAp.add(f.arr); anyAp.add(f.arr);
      const m = AP[f.arr];
      if (m) { if (m.city) arrCitySet.add(m.city); if (m.co) arrCoSet.add(m.co); }
    }
  });
  return {
    year: [...years].sort().reverse(),
    airline: [...airlines].sort(),
    aircraft: [...aircraft].sort(),
    country: [...countries].sort(),
    depAirport: [...depAp].sort(),
    arrAirport: [...arrAp].sort(),
    airports: [...anyAp].sort(),
    city: [...cityset].sort(),
    depCity: [...depCitySet].sort(),
    arrCity: [...arrCitySet].sort(),
    depCountry: [...depCoSet].sort(),
    arrCountry: [...arrCoSet].sort(),
  };
}
