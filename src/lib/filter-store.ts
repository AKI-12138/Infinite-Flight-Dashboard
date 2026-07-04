// =============================== FILTER STORE ===============================
// フィルタ状態（compute.ts の FilterState シングルトン）を React に橋渡しする「状態の境界」。
// DataSource と同じ version＋subscribe パターン：FilterState を直接変異し、変更のたびに
// version を進めて購読者（App / フィルタ UI）を再描画する。getFiltered() は module-global の
// FilterState を読むので、変異→emit→再描画で下流が自動追従する。
//
// 旧 main.js の FILTERS ブロック（rebuildFilters/変更ハンドラ/clearFilters/applyPreset/
// SAVED presets/URL 同期）のうち「状態更新ロジック」をここへ集約。DOM 描画は React 側（components/filters/*）。
import { FilterState, isAnyFilterActive, DURATION_BUCKETS, type FilterStateShape } from './compute';
import { FILTER_DEFS, FILTER_PRESETS, _sameSet, _ALL_STATE_KEYS, type FilterPreset } from './filters-config';
import type { FilterOptionsMap } from './filter-options';
import { STORAGE_AVAILABLE } from './datasource';

// 「上限なし」を表す大きな分数（≒1666h）。旧 _DUR_MAX_SENTINEL。
export const DUR_MAX_SENTINEL = 100000;

// ---- string[] 軸を汎用に触るためのビュー（durationRange＝number[] だけ別扱い）----
type StrKey = Exclude<keyof FilterStateShape, 'durationRange'>;
const FS = FilterState as unknown as Record<string, string[]>;

// ---- version + subscribe ----
let _version = 0;
type Listener = () => void;
const _listeners = new Set<Listener>();
function _emit() { _version++; _listeners.forEach((l) => l()); }
// 変更を確定：URL 同期してから購読者へ通知。
function _commit() { _writeFiltersToURL(); _emit(); }

// ============================ CUSTOM (SAVED) PRESETS ============================
export interface CustomPreset { id: string; name: string; state: Record<string, string[]> }
const _CUSTOM_PRESETS_KEY = 'if-dashboard:custom-presets:v1';
function _loadCustomPresets(): CustomPreset[] {
  if (!STORAGE_AVAILABLE) return [];
  try {
    const raw = localStorage.getItem(_CUSTOM_PRESETS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((p) => p && p.id && typeof p.name === 'string' && p.state)
      : [];
  } catch { return []; }
}
function _persistCustomPresets() {
  if (!STORAGE_AVAILABLE) return;
  try { localStorage.setItem(_CUSTOM_PRESETS_KEY, JSON.stringify(_customPresets)); }
  catch { /* 保存できなくても致命的でない */ }
}
let _customPresets: CustomPreset[] = _loadCustomPresets();

// 効いている軸だけを取り出したスナップショット（保存用）。
function _captureFilterState(): Record<string, string[]> {
  const snap: Record<string, string[]> = {};
  _ALL_STATE_KEYS.forEach((k) => {
    const v = FS[k];
    if (v && v.length) snap[k] = v.slice();
  });
  return snap;
}
// 効いている軸の数（保存確認・空判定用）。durationRange も 1 軸として数える。
function _activeAxisCount(): number {
  return _ALL_STATE_KEYS.reduce((n, k) => n + ((FS[k] && FS[k].length) ? 1 : 0), 0);
}

// ============================ URL 同期 ============================
// 単数キー・カンマ区切り。例: ?year=2024,2025&month=07,12&scope=domestic
const _MONTH_VALUES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const _CONTINENT_VALUES = (FILTER_DEFS.find((d) => d.key === 'continent')!.fixedOptions || []).map((o) => o.value);
const _DUR_VALUES = DURATION_BUCKETS.map((b) => b.key);

function _parseCSVParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
function _writeFiltersToURL() {
  const params = new URLSearchParams();
  const put = (name: string, arr: string[]) => { if (arr.length) params.set(name, arr.join(',')); };
  put('year', FilterState.years);
  put('month', FilterState.months);
  put('weekday', FilterState.weekdays);
  put('airline', FilterState.airlines);
  put('aircraft', FilterState.aircraft);
  put('country', FilterState.countries);
  put('scope', FilterState.scope);
  put('airport', FilterState.airports);
  put('city', FilterState.cities);
  put('continent', FilterState.continents);
  put('depAirport', FilterState.depAirports);
  put('arrAirport', FilterState.arrAirports);
  put('depCity', FilterState.depCities);
  put('arrCity', FilterState.arrCities);
  put('depCountry', FilterState.depCountries);
  put('arrCountry', FilterState.arrCountries);
  put('depContinent', FilterState.depContinents);
  put('arrContinent', FilterState.arrContinents);
  put('contScope', FilterState.contScope);
  put('duration', FilterState.durations);
  if (FilterState.durationRange.length === 2) params.set('durRange', FilterState.durationRange.join('-'));
  const qs = params.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}
function _readFiltersFromURL() {
  const p = new URLSearchParams(location.search);
  FilterState.years = _parseCSVParam(p.get('year'));
  FilterState.airlines = _parseCSVParam(p.get('airline'));
  FilterState.aircraft = _parseCSVParam(p.get('aircraft'));
  FilterState.countries = _parseCSVParam(p.get('country'));
  const validScope = new Set(['domestic', 'international']);
  FilterState.scope = _parseCSVParam(p.get('scope')).filter((v) => validScope.has(v));
  const validMonths = new Set(_MONTH_VALUES);
  FilterState.months = _parseCSVParam(p.get('month')).filter((v) => validMonths.has(v));
  const validWeekdays = new Set(['0', '1', '2', '3', '4', '5', '6']);
  FilterState.weekdays = _parseCSVParam(p.get('weekday')).filter((v) => validWeekdays.has(v));
  // 空港系は素通し（prune がデータ外を除去）。
  FilterState.airports = _parseCSVParam(p.get('airport'));
  FilterState.cities = _parseCSVParam(p.get('city'));
  FilterState.depAirports = _parseCSVParam(p.get('depAirport'));
  FilterState.arrAirports = _parseCSVParam(p.get('arrAirport'));
  FilterState.depCities = _parseCSVParam(p.get('depCity'));
  FilterState.arrCities = _parseCSVParam(p.get('arrCity'));
  FilterState.depCountries = _parseCSVParam(p.get('depCountry'));
  FilterState.arrCountries = _parseCSVParam(p.get('arrCountry'));
  const validCont = new Set(_CONTINENT_VALUES);
  FilterState.continents = _parseCSVParam(p.get('continent')).filter((v) => validCont.has(v));
  FilterState.depContinents = _parseCSVParam(p.get('depContinent')).filter((v) => validCont.has(v));
  FilterState.arrContinents = _parseCSVParam(p.get('arrContinent')).filter((v) => validCont.has(v));
  const validContScope = new Set(['intra', 'inter']);
  FilterState.contScope = _parseCSVParam(p.get('contScope')).filter((v) => validContScope.has(v));
  const validDur = new Set(_DUR_VALUES);
  FilterState.durations = _parseCSVParam(p.get('duration')).filter((v) => validDur.has(v));
  const dr = (p.get('durRange') || '').split('-').map((s) => parseInt(s, 10));
  FilterState.durationRange = (dr.length === 2 && dr.every((n) => Number.isFinite(n) && n >= 0) && dr[0] <= dr[1]) ? dr : [];
}

// ---- 時間ヘルパー（duration カスタム範囲・旧 _hoursToMin / _minToHours）----
function _hoursToMin(v: string): number | null {
  const n = parseFloat(v);
  return (isFinite(n) && n >= 0) ? Math.round(n * 60) : null;
}
export function minToHoursStr(min: number): string {
  const h = min / 60;
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 10) / 10);
}

// ============================ 公開 API ============================
export const filterStore = {
  subscribe(fn: Listener) { _listeners.add(fn); return () => { _listeners.delete(fn); }; },
  getVersion() { return _version; },

  // 起動時：URL から復元（write せず emit のみ）。
  initFromURL() { _readFiltersFromURL(); _emit(); },

  // データ変化時：データから消えた値を除去（fixedOptions 以外）。変化があれば commit。
  prune(opts: FilterOptionsMap) {
    let changed = false;
    FILTER_DEFS.forEach((def) => {
      if (def.fixedOptions) return;
      const valid = new Set(opts[def.key] || []);
      const cur = FS[def.stateKey];
      const next = cur.filter((v) => valid.has(v));
      if (next.length !== cur.length) { FS[def.stateKey] = next; changed = true; }
    });
    if (changed) _commit();
  },

  // チェックボックスのトグル（値 value を stateKey 軸に追加/除去）。
  toggle(stateKey: StrKey, value: string) {
    const list = FS[stateKey];
    FS[stateKey] = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    // duration バケットを触ったらカスタム範囲はクリア（相互排他）。
    if (stateKey === 'durations' && FilterState.durationRange.length) FilterState.durationRange = [];
    _commit();
  },

  // duration カスタム範囲（時間文字列）。両方空なら解除。入れたらバケット選択はクリア。
  setDurationRange(minRaw: string, maxRaw: string) {
    if (minRaw.trim() === '' && maxRaw.trim() === '') {
      FilterState.durationRange = [];
    } else {
      const lo = _hoursToMin(minRaw), hi = _hoursToMin(maxRaw);
      FilterState.durationRange = [lo == null ? 0 : lo, hi == null ? DUR_MAX_SENTINEL : hi];
      if (FilterState.durations.length) FilterState.durations = [];
    }
    _commit();
  },

  // 拡大バー／チャートのクリックによるドリルダウン（旧 _drilldownFilter）。
  // その値だけが単独選択中なら解除（同じ点の再クリックで全表示に戻るトグル）。
  drilldown(stateKey: StrKey, value: string) {
    const cur = FS[stateKey] || [];
    const only = cur.length === 1 && cur[0] === value;
    FS[stateKey] = only ? [] : [value];
    _commit();
  },
  // Top Routes（"DEP → ARR"）のドリルダウン＝dep+arr の重ね掛けに分解（旧 _drilldownRoute）。
  drilldownRoute(routeLabel: string) {
    const parts = routeLabel.split(' → ');
    if (parts.length !== 2) return;
    const [dep, arr] = parts;
    const only = _sameSet(FilterState.depAirports, [dep]) && _sameSet(FilterState.arrAirports, [arr]);
    FilterState.depAirports = only ? [] : [dep];
    FilterState.arrAirports = only ? [] : [arr];
    _commit();
  },

  // 全解除。
  clearAll() {
    FILTER_DEFS.forEach((def) => { FS[def.stateKey] = []; });
    FilterState.durationRange = [];
    _commit();
  },

  isAnyActive() { return isAnyFilterActive(); },

  // ---- プリセット ----
  presets: FILTER_PRESETS as readonly FilterPreset[],
  isPresetActive(p: FilterPreset) {
    return Object.entries(p.set).every(([k, v]) => _sameSet(FS[k], v));
  },
  applyPreset(id: string) {
    const p = FILTER_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const active = this.isPresetActive(p);
    Object.entries(p.set).forEach(([k, v]) => { FS[k] = active ? [] : v.slice(); });
    _commit();
  },

  // ---- Saved（カスタム）プリセット ----
  getCustomPresets(): CustomPreset[] { return _customPresets; },
  activeAxisCount() { return _activeAxisCount(); },
  isSavedActive(p: CustomPreset) {
    return _ALL_STATE_KEYS.every((k) => _sameSet(FS[k] || [], (p.state && p.state[k]) || []));
  },
  applySavedPreset(id: string) {
    const p = _customPresets.find((x) => x.id === id);
    if (!p) return;
    _ALL_STATE_KEYS.forEach((k) => { FS[k] = (p.state && p.state[k]) ? p.state[k].slice() : []; });
    _commit();
  },
  // 現在の絞り込みを名前付き保存。空なら false を返す（呼び出し側でトースト）。
  saveCurrentAsPreset(name: string): boolean {
    if (_activeAxisCount() === 0) return false;
    _customPresets = [..._customPresets, { id: 'cp' + Date.now(), name: name.slice(0, 40), state: _captureFilterState() }];
    _persistCustomPresets();
    _emit();
    return true;
  },
  deleteCustomPreset(id: string) {
    _customPresets = _customPresets.filter((p) => p.id !== id);
    _persistCustomPresets();
    _emit();
  },
};
