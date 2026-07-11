// =============================== MEMO CONFIG（メモ項目の宣言的定義） ===============================
// フライトメモの「どんな項目があるか」の唯一の正。UI（FlightMemoModal）はこの定義から
// 編集フォームと閲覧表示の両方を機械的に組み立てる（filters-config と同じ宣言的モデル）。
// 項目を足す/直すのはこのファイルだけで済む。将来の AI 自動入力（PDF/画像→項目認識・VISION E）も
// 「認識結果を key→value で流し込む」だけで済むよう、平坦な key 設計にしておく。
//
// 全項目任意入力。value は自由文字列。単位（kt / nm / kg）は入力不要＝数値だけ書けば
// 表示時に formatMemoValue() が自動で付ける（単位付きで書いた場合はそのまま尊重）。

// ---- 単位（将来の「設定パネルで単位を選ぶ」機能との連動点） ----
// 単位を返す唯一の窓口。将来 kg/lb・nm/km などを設定で切り替えるときは、
// getMemoUnit() の中身を「localStorage の設定を読んで返す」に差し替えるだけ
// （フィールド定義は unit キーを持つだけなので変更不要）。
export type MemoUnitKey = 'speed' | 'distance' | 'weight' | 'vspeed' | 'gforce' | 'altitude';
export const MEMO_UNIT_DEFAULTS: Record<MemoUnitKey, string> = { speed: 'kt', distance: 'nm', weight: 'kg', vspeed: 'fpm', gforce: 'G', altitude: 'ft' };
export function getMemoUnit(key: MemoUnitKey): string {
  return MEMO_UNIT_DEFAULTS[key];
}

export interface MemoFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  // text（候補つき1行）/ textarea / date（ネイティブ日付ピッカー）/
  // clock（HH:MM の2箱・Add Flight の Flight Time と同じ操作感）/ duration（h+m の2箱・所要時間）
  type?: 'text' | 'textarea' | 'date' | 'clock' | 'duration'; // 省略時 text
  half?: boolean;             // true = 2カラムグリッドの半分幅（連続する half は横に並ぶ）
  unit?: MemoUnitKey;         // 数値だけの入力に表示時へ自動付与する単位
  // 自動計算項目（Taxi total 等）：他の項目から導出して表示するだけで、保存はしない。
  // 編集モードでは読み取り専用表示になる（FlightMemoModal が分岐）。
  computed?: (fields: Record<string, string>) => string;
}

export interface MemoSectionDef {
  key: string;
  label: string;
  fields: MemoFieldDef[];
}

// 閲覧表示用：数値だけの値（"148" "8,400" "1 234.5" 等）なら単位を付けて返す。
// 既に文字を含む値（"148 kt" 等）はユーザーの書き方を尊重してそのまま返す。
export function formatMemoValue(def: MemoFieldDef, value: string): string {
  const v = (value ?? '').trim();
  if (!v || !def.unit) return v;
  return /^-?\d[\d.,\s]*$/.test(v) ? `${v} ${getMemoUnit(def.unit)}` : v;
}

// ---- clock（HH:MM）/ duration（XhYYm・Xm）の分解・結合（2箱入力 ⇔ 保存文字列の正準形） ----
// 保存形：clock = "09:15"（ゼロ埋め）／duration = "1h05m"（1時間未満は "12m"）。
const _pad2 = (s: string) => (s.length === 1 ? '0' + s : s);

export function splitClock(value: string): [string, string] {
  const m = (value ?? '').trim().match(/^(\d{1,2}):(\d{1,2})$/);
  return m ? [m[1], m[2]] : ['', ''];
}
export function combineClock(hh: string, mm: string): string {
  const h = hh.trim(); const m = mm.trim();
  if (!h && !m) return '';
  return `${_pad2(h || '0')}:${_pad2(m || '0')}`;
}

export function splitDuration(value: string): [string, string] {
  const v = (value ?? '').trim();
  let m = v.match(/^(\d+)h(\d{1,2})m$/);
  if (m) return [m[1], m[2]];
  m = v.match(/^(\d{1,2})m$/);
  if (m) return ['', m[1]];
  return ['', ''];
}
export function combineDuration(h: string, m: string): string {
  const hh = h.trim(); const mm = m.trim();
  if (!hh && !mm) return '';
  const hn = parseInt(hh || '0', 10) || 0;
  const mn = parseInt(mm || '0', 10) || 0;
  return hn > 0 ? `${hn}h${String(mn).padStart(2, '0')}m` : `${mn}m`;
}

// duration 正準形（"1h05m"・"12m"）→ 分。空・不正は null（0 と区別する）。
function durationMin(v: string): number | null {
  const [h, m] = splitDuration(v ?? '');
  if (!h && !m) return null;
  return (parseInt(h || '0', 10) || 0) * 60 + (parseInt(m || '0', 10) || 0);
}

// duration 2つの合計（Taxi total 用）。両方空なら ''、片方だけならその値がそのまま合計になる。
export function sumDurations(a: string, b: string): string {
  const am = durationMin(a);
  const bm = durationMin(b);
  if (am === null && bm === null) return '';
  const total = (am ?? 0) + (bm ?? 0);
  return combineDuration(String(Math.floor(total / 60)), String(total % 60));
}

export const MEMO_SECTIONS: MemoSectionDef[] = [
  {
    key: 'flightinfo',
    label: 'Flight Info',
    fields: [
      { key: 'flightNo',  label: 'Flight number', placeholder: 'NH006',  half: true },
      { key: 'callsign',  label: 'Callsign',      placeholder: 'ANA6',   half: true },
      { key: 'reg',       label: 'Registration',  placeholder: 'JA789A', half: true },
      { key: 'pilot',     label: 'Pilot',         placeholder: 'Your name / IFC handle', half: true },
    ],
  },
  {
    key: 'times',
    label: 'Times',
    fields: [
      // 日付（深夜跨ぎ・日付変更線で LOC と UTC がズレるため両方持てる）。ネイティブの日付ピッカー。
      // 並びは「LOC の行 → UTC の行」（出発・到着を横に並べる。オーナー指定 2026-07-11：入力が直感的）。
      { key: 'depDateLoc', label: 'Departure date · LOC', type: 'date', half: true },
      { key: 'arrDateLoc', label: 'Arrival date · LOC',   type: 'date', half: true },
      { key: 'depDateUtc', label: 'Departure date · UTC', type: 'date', half: true },
      { key: 'arrDateUtc', label: 'Arrival date · UTC',   type: 'date', half: true },
      // OOOI（Out/Off/On/In）。LOC＝現地時刻・UTC 併記（どちらか片方だけでも可）。HH:MM の2箱入力。
      { key: 'outLoc',  label: 'Pushback (OUT) · LOC', type: 'clock', half: true },
      { key: 'outUtc',  label: 'Pushback (OUT) · UTC', type: 'clock', half: true },
      { key: 'offLoc',  label: 'Takeoff (OFF) · LOC',  type: 'clock', half: true },
      { key: 'offUtc',  label: 'Takeoff (OFF) · UTC',  type: 'clock', half: true },
      { key: 'onLoc',   label: 'Landing (ON) · LOC',   type: 'clock', half: true },
      { key: 'onUtc',   label: 'Landing (ON) · UTC',   type: 'clock', half: true },
      { key: 'inLoc',   label: 'Gate arrival (IN) · LOC', type: 'clock', half: true },
      { key: 'inUtc',   label: 'Gate arrival (IN) · UTC', type: 'clock', half: true },
      // タキシー時間は OUT/IN に分離（h+m の2箱＝Add Flight の Flight Time と同型・正準形で保存）。
      { key: 'taxiOut', label: 'Taxi out', type: 'duration', half: true },
      { key: 'taxiIn',  label: 'Taxi in',  type: 'duration', half: true },
      // 合計は自動計算（保存しない・編集モードでは読み取り専用で live 表示）。
      { key: 'taxiTotal', label: 'Taxi total', half: true, computed: (f) => sumDurations(f.taxiOut ?? '', f.taxiIn ?? '') },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    fields: [
      { key: 'v1',       label: 'V1',  placeholder: '148', half: true, unit: 'speed' },
      { key: 'vr',       label: 'VR',  placeholder: '152', half: true, unit: 'speed' },
      { key: 'v2',       label: 'V2',  placeholder: '158', half: true, unit: 'speed' },
      { key: 'vref',     label: 'VREF / VAPP', placeholder: '138', half: true, unit: 'speed' },
      // 巡航（オーナー指定 2026-07-11）：高度＋速度（Mach と IAS の2表記）。
      // Mach は "0.85" のような小数＝単位の自動付与はしない（"M0.85" と書いてもそのまま尊重）。
      { key: 'cruiseAlt',  label: 'Cruise altitude', placeholder: '34,000 or FL340', half: true, unit: 'altitude' },
      { key: 'distance',   label: 'Flight distance', placeholder: '520', half: true, unit: 'distance' },
      { key: 'cruiseMach', label: 'Cruise speed · Mach', placeholder: '0.85', half: true },
      { key: 'cruiseIas',  label: 'Cruise speed · IAS',  placeholder: '280',  half: true, unit: 'speed' },
      // 着陸品質（IF が着陸時に表示する 2 値）：接地時の降下率と G。
      { key: 'tdRate',   label: 'Touchdown rate', placeholder: '-250', half: true, unit: 'vspeed' },
      { key: 'gForce',   label: 'Landing G',      placeholder: '1.32', half: true, unit: 'gforce' },
    ],
  },
  {
    key: 'load',
    label: 'Load & Fuel',
    fields: [
      { key: 'pax',       label: 'Passengers', placeholder: '214',    half: true },
      { key: 'cargo',     label: 'Cargo',      placeholder: '8,400',  half: true, unit: 'weight' },
      { key: 'fuelBlock', label: 'Fuel on board', placeholder: '18,300', half: true, unit: 'weight' },
      { key: 'fuelUsed',  label: 'Fuel used',     placeholder: '12,100', half: true, unit: 'weight' },
    ],
  },
  {
    key: 'route',
    label: 'Route & Procedures',
    fields: [
      { key: 'route',    label: 'Route (flight plan)', placeholder: 'LAXIG Y56 SIRAKI ...', type: 'textarea' },
      { key: 'sid',      label: 'SID (departure)', placeholder: 'LAXIG 1E', half: true },
      { key: 'star',     label: 'STAR (arrival)',  placeholder: 'SIRAKI 2A', half: true },
      { key: 'rwyDep',   label: 'Departure runway', placeholder: '34R', half: true },
      { key: 'rwyArr',   label: 'Arrival runway',   placeholder: '32L', half: true },
      { key: 'metarDep', label: 'METAR · departure', placeholder: 'RJTT 070100Z 34008KT ...', type: 'textarea' },
      { key: 'metarArr', label: 'METAR · arrival',   placeholder: 'RJOO 070200Z 32006KT ...', type: 'textarea' },
    ],
  },
  {
    key: 'notes',
    label: 'Notes',
    fields: [
      { key: 'notes', label: 'Free notes', placeholder: 'Anything else — approach notes, scenery, events ...', type: 'textarea' },
    ],
  },
];

// key → 定義 の逆引き（閲覧表示・テスト用）。
export const MEMO_FIELD_BY_KEY: Record<string, MemoFieldDef> = Object.fromEntries(
  MEMO_SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]),
);
