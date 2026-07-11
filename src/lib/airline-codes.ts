// =============================== AIRLINE CODES（便名/Callsign の入力候補） ===============================
// フライトノートの Flight number / Callsign 欄に出す「エアラインのコード候補」を組み立てる
// （オーナー指定 2026-07-11）。完全自由入力は維持し、候補はあくまで補助。
// - 便名     ＝ IATA 2文字（NH006 の "NH"）
// - Callsign ＝ ICAO 3文字（ANA6 の "ANA"）＋ 無線呼出名（"ALL NIPPON" / "STARWALKER"）
// 自便のエアラインの候補を先頭に出す（フライト本体からエアラインは分かっている）。
import { AIRLINE_TABLE, AIRLINE_CALLSIGN } from '../data/airlines';
import { normalizeAirline } from './normalize';

export interface CodeItem { code: string; detail: string; }

// エイリアス配列から IATA / ICAO をパターンで拾う（位置に頼らない：Alitalia は IATA 無し等）。
const _iataOf = (aliases: string[]) => aliases.find((a) => /^[A-Z0-9]{2}$/.test(a));
const _icaoOf = (aliases: string[]) => aliases.find((a) => /^[A-Z]{3}$/.test(a));

// 1社ぶんの候補（kind 別）。callsign は「呼出名 → ICAO」の順（呼出名＝コードの会社は1件に）。
function _itemsFor(name: string, kind: 'flightNo' | 'callsign'): CodeItem[] {
  const aliases = AIRLINE_TABLE[name] ?? [];
  if (kind === 'flightNo') {
    const iata = _iataOf(aliases);
    return iata ? [{ code: iata, detail: name }] : [];
  }
  const out: CodeItem[] = [];
  const tel = AIRLINE_CALLSIGN[name];
  const icao = _icaoOf(aliases);
  if (tel) out.push({ code: tel, detail: name });
  if (icao && icao !== tel) out.push({ code: icao, detail: name });
  return out;
}

// 全社ぶんの候補。ownAirline（ログのエアライン・表記ゆれ可＝normalize して照合）を先頭へ。
// 返り値 { own, others }：呼び出し側が own と履歴候補・others の順に並べられるよう分けて返す。
export function airlineCodeSuggestions(kind: 'flightNo' | 'callsign', ownAirline?: string): { own: CodeItem[]; others: CodeItem[] } {
  const ownName = ownAirline ? (normalizeAirline(ownAirline) || ownAirline) : '';
  const own: CodeItem[] = [];
  const others: CodeItem[] = [];
  for (const name of Object.keys(AIRLINE_TABLE)) {
    (name === ownName ? own : others).push(..._itemsFor(name, kind));
  }
  return { own, others };
}
