// =============================== TIMEZONE（LOC → UTC 自動換算） ===============================
// フライトノートの UTC 欄を自動計算するためのヘルパ（フェーズ相当：オーナー指定 2026-07-11・A案）。
// - 空港のタイムゾーンは「座標 → IANA ゾーン名」（@photostructure/tz-lookup・約70KB）で引く。
//   airports.ts の全空港とカスタム空港（AP へ実行時マージ・lat/lng 必須）の両方で機能する。
// - 「そのゾーンの、その日付のオフセット」はブラウザ内蔵の Intl が計算する（夏時間込み・
//   タイムゾーンルール表を自前で持たない）。
// - 未収録空港・座標なしは null ＝ 呼び出し側（メモ UI）が手入力へフォールバックする。
import tzlookup from '@photostructure/tz-lookup';
import { AP } from '../data/airports';

// ICAO → IANA タイムゾーン名（例 'Asia/Tokyo'）。未収録・座標なし・変換失敗は null。
export function airportTz(icao: string): string | null {
  const m = AP[icao];
  if (!m || typeof m.lat !== 'number' || typeof m.lng !== 'number') return null;
  try { return tzlookup(m.lat, m.lng); } catch { return null; }
}

// Intl.DateTimeFormat はゾーンごとに使い回す（生成が高コストのため）。
const _dtfCache = new Map<string, Intl.DateTimeFormat>();
function _dtf(tz: string): Intl.DateTimeFormat {
  let f = _dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    _dtfCache.set(tz, f);
  }
  return f;
}

// ある瞬間（epoch ms）の、tz における壁時計を {y,mo,d,h,mi} で返す。
function _wallParts(epochMs: number, tz: string) {
  const parts = _dtf(tz).formatToParts(epochMs);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
  // hour12:false でも一部環境は 24:00 を返しうるので 0 に丸める
  const h = get('hour') === 24 ? 0 : get('hour');
  return { y: get('year'), mo: get('month'), d: get('day'), h, mi: get('minute') };
}

// ある瞬間の tz のオフセット（分・「壁時計 − UTC」）。
function _tzOffsetMin(epochMs: number, tz: string): number {
  const p = _wallParts(epochMs, tz);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  return Math.round((asUtc - epochMs) / 60000);
}

const _pad = (n: number) => String(n).padStart(2, '0');

// 「tz における壁時計 dateStr（YYYY-MM-DD）+ timeStr（H:MM / HH:MM）」→ UTC の {date, time}。
// 方法：壁時計を仮に UTC とみなした瞬間からオフセットを2回引き直す（夏時間の切替日も収束する定石）。
// 入力が正準形でない・tz が不明な場合は null。
export function locToUtc(dateStr: string, timeStr: string, tz: string): { date: string; time: string } | null {
  const dm = (dateStr ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = (timeStr ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm || !tz) return null;
  const t0 = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]);
  if (!Number.isFinite(t0)) return null;
  try {
    let utc = t0 - _tzOffsetMin(t0, tz) * 60000;
    utc = t0 - _tzOffsetMin(utc, tz) * 60000;
    const D = new Date(utc);
    return {
      date: `${D.getUTCFullYear()}-${_pad(D.getUTCMonth() + 1)}-${_pad(D.getUTCDate())}`,
      time: `${_pad(D.getUTCHours())}:${_pad(D.getUTCMinutes())}`,
    };
  } catch { return null; } // 不正なゾーン名（Intl が例外を投げる）
}
