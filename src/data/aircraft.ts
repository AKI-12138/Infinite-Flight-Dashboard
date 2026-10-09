// =============================== AIRCRAFT DATA ===============================
// 機材マスター：「正準 ICAO コード → 機材の情報（表示名・メーカー・サイズ・別名）」を 1 機種 1 行で持つ表。
// 機材を足す・直すときは下の AIRCRAFT だけを編集する。ファイル末尾の AIRCRAFT_CANONICAL_TABLE /
// AIRCRAFT_FULL_NAME はここから自動で作られ、正規化（normalize.ts）・Add Flight の機材候補（ac-data.ts）・
// Data check（data-check.ts）・ノートの表示名（memo-config.ts）へ自動で反映される（単一ソース）。
// 規約は docs/NORMALIZATION.md を参照。IF（Infinite Flight）の実機材に絞る。
//
// ▼ 機材を 1 つ足すとき
//   AIRCRAFT に 1 行足す。name / mfr / size / aliases はすべて必須（書き忘れはビルドエラーになる）。
//   aliases は「大文字化＋英数以外を除去（compact 化）」した形で書く。
//     例：「Boeing 777-300ER」「777-300ER」「77W」はすべて B77W に揃う。
//   同じ別名を 2 機種に書かない（後に書いた方が黙って勝つため。aircraft.test.ts が検出する）。
//
// ▼ 分類の軸（メーカー・サイズ）
//   軸はすべて「選択肢の一覧表（id → 表示名）」＋「各機種はその id を指す」の形に揃えてある。
//   一覧に無い id は書けない（ビルドエラー）＝表記ゆれが入らない。表示名の変更は一覧表の 1 か所で全機種に効く。
//   新しい軸（エンジン・用途など）を足すときも同じ形で：
//     1) 選択肢の一覧表を 1 つ作る（並び順＝画面に出すときの並び順）
//     2) AircraftEntry に項目を 1 つ足し、AIRCRAFT の全行に書く（足し忘れはビルドエラー）
//   データには事実（本当のメーカー名など）を持たせ、「その他」へのまとめ方などは画面側で決める。

// メーカー。決め方＝その機種が一般に「〇〇の△△」と呼ばれている名前（オーナー指定 2026-10-09）。
//   例：A220（旧 Bombardier CSeries）＝Airbus／MD-11・DC-10＝McDonnell Douglas／CRJ＝Bombardier／C-17＝Boeing。
// コードの先頭文字では判定できない（BCS3＝Airbus 等）ので、機種ごとに手で決める。
export const MANUFACTURERS = {
  airbus: 'Airbus',
  boeing: 'Boeing',
  embraer: 'Embraer',
  bombardier: 'Bombardier',
  mcdonnellDouglas: 'McDonnell Douglas',
  comac: 'COMAC',
  cessna: 'Cessna',
  cirrus: 'Cirrus',
  daher: 'Daher',
  pilatus: 'Pilatus',
  gulfstream: 'Gulfstream',
  lockheedMartin: 'Lockheed Martin',
} as const;
export type ManufacturerId = keyof typeof MANUFACTURERS;

// サイズ（4 区分・オーナー指定 2026-10-09）。業界で一般的な客室の通路数による区分に、小型機の枠を足したもの。
//   wide＝通路 2 本／narrow＝通路 1 本（A220 も Airbus の区分どおり narrow）／
//   regional＝リージョナルジェット（E-Jets・CRJ）／small＝小型機（GA・ビジネスジェット・戦闘機）。
//   軍用輸送機は機体の大きさで振り分ける（C-17・VC-25A＝wide、C-40B＝narrow）。
export const AIRCRAFT_SIZES = {
  wide: 'Widebody',
  narrow: 'Narrowbody',
  regional: 'Regional',
  small: 'Small',
} as const;
export type AircraftSize = keyof typeof AIRCRAFT_SIZES;

export interface AircraftEntry {
  name: string;          // 表示用のフルネーム。旅客機はモデル名（メーカー略・"737-800" 等）、GA/軍用は機種名
  mfr: ManufacturerId;   // メーカー（MANUFACTURERS の id）
  size: AircraftSize;    // サイズ区分（AIRCRAFT_SIZES の id）
  aliases: string[];     // 入力の揺れ（compact 形）。正準コード自体は書かなくてよい
}

export const AIRCRAFT: Record<string, AircraftEntry> = {
  // ===== Cessna =====
  C172: { name: 'Cessna 172',         mfr: 'cessna',     size: 'small', aliases: ['172', '172SP', 'CESSNA172'] },
  C208: { name: 'Cessna 208 Caravan', mfr: 'cessna',     size: 'small', aliases: ['208', 'CESSNA208', 'CARAVAN', 'CESSNACARAVAN'] },
  // ===== Cirrus =====
  SR22: { name: 'Cirrus SR22',        mfr: 'cirrus',     size: 'small', aliases: ['CIRRUSSR22'] },
  // ===== TBM =====
  TBM9: { name: 'TBM 930',            mfr: 'daher',      size: 'small', aliases: ['TBM900', 'TBM930', 'TBM9X'] },
  // ===== Pilatus =====
  PC12: { name: 'Pilatus PC-12',      mfr: 'pilatus',    size: 'small', aliases: ['PILATUSPC12', 'PC12NG'] },
  // ===== Gulfstream =====
  GLF6: { name: 'Gulfstream G650',    mfr: 'gulfstream', size: 'small', aliases: ['G650', 'G650ER', 'GULFSTREAMG650', 'GULFSTREAM650'] },
  // ===== Bombardier ビジネス =====
  CL35: { name: 'Challenger 350',     mfr: 'bombardier', size: 'small', aliases: ['CL350', 'CHALLENGER350'] },
  // ===== Airbus A220（旧CSeries） =====
  BCS1: { name: 'A220-100', mfr: 'airbus', size: 'narrow', aliases: ['CS100', 'A220100'] },
  BCS3: { name: 'A220-300', mfr: 'airbus', size: 'narrow', aliases: ['CS300', 'A220300'] },
  // ===== Airbus 単通路（ceo） =====
  A318: { name: 'A318', mfr: 'airbus', size: 'narrow', aliases: ['318'] },
  A319: { name: 'A319', mfr: 'airbus', size: 'narrow', aliases: ['319', 'A319CEO'] },
  A320: { name: 'A320', mfr: 'airbus', size: 'narrow', aliases: ['320', 'A320CEO'] },
  A321: { name: 'A321', mfr: 'airbus', size: 'narrow', aliases: ['321', 'A321CEO'] },
  // ===== Airbus 単通路（neo） =====（737 NG／MAX・A330ceo／neo と同じく ceo とは別機材として数える）
  // A321LR／XLR は ICAO コードが A21N なので A321neo に含める。
  A19N: { name: 'A319neo', mfr: 'airbus', size: 'narrow', aliases: ['A319NEO', '319NEO'] },
  A20N: { name: 'A320neo', mfr: 'airbus', size: 'narrow', aliases: ['A320NEO', '320NEO'] },
  A21N: { name: 'A321neo', mfr: 'airbus', size: 'narrow', aliases: ['A321NEO', '321NEO', 'A321LR', '321LR', 'A321XLR', '321XLR'] },
  // ===== Airbus A310 =====
  A310: { name: 'A310-300', mfr: 'airbus', size: 'wide', aliases: ['310', 'A310300'] },
  // ===== Airbus A330 =====
  A332: { name: 'A330-200', mfr: 'airbus', size: 'wide', aliases: ['332', 'A330200'] },
  A333: { name: 'A330-300', mfr: 'airbus', size: 'wide', aliases: ['333', 'A330300'] },
  A338: { name: 'A330-800', mfr: 'airbus', size: 'wide', aliases: ['338', 'A330800', 'A330NEO800'] },
  A339: { name: 'A330-900', mfr: 'airbus', size: 'wide', aliases: ['339', 'A330900', 'A330NEO', 'A330NEO900'] },
  // ===== Airbus A340 =====
  A342: { name: 'A340-200', mfr: 'airbus', size: 'wide', aliases: ['342', 'A340200'] },
  A343: { name: 'A340-300', mfr: 'airbus', size: 'wide', aliases: ['343', 'A340300'] },
  A345: { name: 'A340-500', mfr: 'airbus', size: 'wide', aliases: ['345', 'A340500'] },
  A346: { name: 'A340-600', mfr: 'airbus', size: 'wide', aliases: ['346', 'A340600'] },
  // ===== Airbus A350 =====
  A359: { name: 'A350-900',  mfr: 'airbus', size: 'wide', aliases: ['359', 'A350', 'A350900'] },
  A35K: { name: 'A350-1000', mfr: 'airbus', size: 'wide', aliases: ['35K', 'A3501000', 'A350K'] },
  // ===== Airbus A380 =====
  A388: { name: 'A380-800', mfr: 'airbus', size: 'wide', aliases: ['388', 'A380', 'A380800'] },
  // ===== Boeing 737 NG =====
  B737: { name: '737-700', mfr: 'boeing', size: 'narrow', aliases: ['7377', '737700', '737700ER'] },
  B738: { name: '737-800', mfr: 'boeing', size: 'narrow', aliases: ['738', '737800', '737800ER'] },
  B739: { name: '737-900', mfr: 'boeing', size: 'narrow', aliases: ['739', '737900', '737900ER'] },
  // ===== Boeing 737 MAX =====（generic "737MAX" は最も普及している MAX 8 にデフォルト）
  // ※ "737-7" 等の表記は compact 化で "7377" になり 737-700(NG) と衝突するため、
  //    MAX は必ず "MAX" 文字列を含む別名のみで認識する。
  B37M: { name: '737 MAX 7',  mfr: 'boeing', size: 'narrow', aliases: ['7377MAX', '737MAX7', '737M7', 'MAX7'] },
  B38M: { name: '737 MAX 8',  mfr: 'boeing', size: 'narrow', aliases: ['7378MAX', '737MAX8', '737M8', '737MAX', 'MAX8'] },
  B39M: { name: '737 MAX 9',  mfr: 'boeing', size: 'narrow', aliases: ['7379MAX', '737MAX9', '737M9', 'MAX9'] },
  B3XM: { name: '737 MAX 10', mfr: 'boeing', size: 'narrow', aliases: ['73710MAX', '737MAX10', '737M10', 'MAX10'] },
  // ===== Boeing 747 =====
  B742: { name: '747-200', mfr: 'boeing', size: 'wide', aliases: ['742', '747200'] },
  B744: { name: '747-400', mfr: 'boeing', size: 'wide', aliases: ['744', '747400'] },
  B748: { name: '747-8',   mfr: 'boeing', size: 'wide', aliases: ['748', '7478', '7478I', '7478F', '747800', '747800I', '7478INTERCONTINENTAL'] },
  // ===== Boeing 757 =====
  B752: { name: '757-200', mfr: 'boeing', size: 'narrow', aliases: ['752', '757200'] },
  B753: { name: '757-300', mfr: 'boeing', size: 'narrow', aliases: ['753', '757300'] },
  // ===== Boeing 767 =====
  B763: { name: '767-300', mfr: 'boeing', size: 'wide', aliases: ['763', '767300'] },
  B764: { name: '767-400', mfr: 'boeing', size: 'wide', aliases: ['764', '767400'] },
  // ===== Boeing 777 =====
  B772: { name: '777-200',   mfr: 'boeing', size: 'wide', aliases: ['772', '777200', '777200ER'] },
  B77L: { name: '777-200LR', mfr: 'boeing', size: 'wide', aliases: ['77L', '777200LR'] },
  B773: { name: '777-300',   mfr: 'boeing', size: 'wide', aliases: ['773', '777300'] },
  B77W: { name: '777-300ER', mfr: 'boeing', size: 'wide', aliases: ['77W', '777300ER'] },
  B77F: { name: '777F',      mfr: 'boeing', size: 'wide', aliases: ['77F', '777F', '777200F', '777FREIGHTER'] },
  // ===== Boeing 787 =====
  B788: { name: '787-8',  mfr: 'boeing', size: 'wide', aliases: ['788', '7878', '787800'] },
  B789: { name: '787-9',  mfr: 'boeing', size: 'wide', aliases: ['789', '7879', '787900'] },
  B78X: { name: '787-10', mfr: 'boeing', size: 'wide', aliases: ['78X', '78710', '78X10', '787100'] },
  // ===== McDonnell Douglas =====
  MD11: { name: 'MD-11', mfr: 'mcdonnellDouglas', size: 'wide', aliases: ['MD11F'] },
  DC10: { name: 'DC-10', mfr: 'mcdonnellDouglas', size: 'wide', aliases: ['DC1030', 'DC1040'] },
  // ===== Embraer E-Jets =====
  E170: { name: 'E170', mfr: 'embraer', size: 'regional', aliases: ['170', 'EMB170', 'ERJ170'] },
  E175: { name: 'E175', mfr: 'embraer', size: 'regional', aliases: ['175', 'EMB175', 'ERJ175'] },
  E190: { name: 'E190', mfr: 'embraer', size: 'regional', aliases: ['190', 'EMB190', 'ERJ190'] },
  E195: { name: 'E195', mfr: 'embraer', size: 'regional', aliases: ['195', 'EMB195', 'ERJ195'] },
  // ===== Bombardier CRJ =====
  CRJ7: { name: 'CRJ700', mfr: 'bombardier', size: 'regional', aliases: ['CRJ700'] },
  CRJ9: { name: 'CRJ900', mfr: 'bombardier', size: 'regional', aliases: ['CRJ900'] },
  // ===== COMAC =====
  C919: { name: 'C919', mfr: 'comac', size: 'narrow', aliases: ['COMAC919', 'COMACC919'] },
  // ===== 軍用・政府専用 =====
  F22:   { name: 'F-22 Raptor',          mfr: 'lockheedMartin', size: 'small',  aliases: ['F22A', 'FA22', 'RAPTOR'] },
  C17:   { name: 'C-17 Globemaster III', mfr: 'boeing',         size: 'wide',   aliases: ['C17A', 'GLOBEMASTER', 'GLOBEMASTERIII'] },
  VC25A: { name: 'VC-25A',               mfr: 'boeing',         size: 'wide',   aliases: ['VC25', 'AIRFORCEONE', 'AF1', '747200B'] },
  C40B:  { name: 'C-40B',                mfr: 'boeing',         size: 'narrow', aliases: ['C40', 'C40C', 'C40BC'] },
};

// ---- 以下は AIRCRAFT から自動で作る（手で編集しない）。既存の利用側はこれまでどおりこの形で読む ----

// 正準 ICAO コード → 別名リスト（normalize.ts の正規化辞書・ac-data.ts の候補・data-check.ts の収録判定）。
export const AIRCRAFT_CANONICAL_TABLE: Record<string, string[]> = Object.fromEntries(
  Object.entries(AIRCRAFT).map(([code, e]) => [code, e.aliases]),
);

// 正準 ICAO コード → 表示用のフルネーム（ノート等の閲覧・自動項目の表示用）。例：A332 → "A330-200"。
export const AIRCRAFT_FULL_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(AIRCRAFT).map(([code, e]) => [code, e.name]),
);

// 機材コードを表示名へ。未収録はコードのまま返す（データを隠さない）。
export function aircraftFullName(code: string): string {
  return AIRCRAFT_FULL_NAME[code] ?? code;
}

// ---- 分類の引き当て（Breakdowns の集計・フィルター用）----
// フィルター・URL・保存プリセットには id（'airbus' / 'wide' 等）を持ち、画面には表示名を出す
// ＝表示名を変えても保存済みの絞り込みは壊れない。
// 未収録の機材（AIRCRAFT に無いコード）は 'unknown'＝隠さず「Unknown」として数え、絞り込みもできる。
export const UNKNOWN_CLASS = 'unknown';
const _UNKNOWN_LABEL = 'Unknown';

export function aircraftManufacturer(code: string): ManufacturerId | typeof UNKNOWN_CLASS {
  return Object.hasOwn(AIRCRAFT, code) ? AIRCRAFT[code].mfr : UNKNOWN_CLASS;
}
export function aircraftSize(code: string): AircraftSize | typeof UNKNOWN_CLASS {
  return Object.hasOwn(AIRCRAFT, code) ? AIRCRAFT[code].size : UNKNOWN_CLASS;
}

// id → 表示名。一覧に無い id（'unknown'・URL の書き間違い等）は "Unknown"。
function _labelIn(table: Readonly<Record<string, string>>, id: string): string {
  return Object.hasOwn(table, id) ? table[id] : _UNKNOWN_LABEL;
}
export function manufacturerLabel(id: string): string { return _labelIn(MANUFACTURERS, id); }
export function sizeLabel(id: string): string { return _labelIn(AIRCRAFT_SIZES, id); }
