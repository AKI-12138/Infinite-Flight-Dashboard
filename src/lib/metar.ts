// =============================== METAR DECODER ===============================
// 生の METAR 文字列を「人間可読の label/value 行」に変換する純ロジック（外部通信なし・オーナー指定 2026-08-06）。
// 対応（よく使う要素）：観測時刻・風（可変/ガスト/Calm）・視程（メートル/SM/9999/CAVOK）・
//   主要な天気（強度＋説明＋現象）・雲（FEW/SCT/BKN/OVC＋CB/TCU・NSC/SKC/CLR/NCD・VV）・
//   気温/露点・QNH（hPa）/ altimeter（inHg）・NOSIG・AUTO/COR。
// 未対応（長い尻尾）：RVR・RMK 詳細・TEMPO/BECMG の中身・稀な現象。認識できないトークンは黙って読み飛ばす。
// 判定できない（METAR らしくない）入力は null を返す＝UI 側は何も表示しない。

export interface MetarLine { label: string; value: string; }

const CLOUD_AMOUNT: Record<string, string> = { FEW: 'Few', SCT: 'Scattered', BKN: 'Broken', OVC: 'Overcast' };
const WX_INTENSITY: Record<string, string> = { '-': 'Light', '+': 'Heavy', VC: 'Nearby' };
const WX_DESCRIPTOR: Record<string, string> = {
  MI: 'shallow', PR: 'partial', BC: 'patches of', DR: 'low drifting', BL: 'blowing',
  SH: 'showers', TS: 'thunderstorm', FZ: 'freezing',
};
const WX_PHENOM: Record<string, string> = {
  DZ: 'drizzle', RA: 'rain', SN: 'snow', SG: 'snow grains', IC: 'ice crystals', PL: 'ice pellets',
  GR: 'hail', GS: 'small hail', UP: 'unknown precip', BR: 'mist', FG: 'fog', FU: 'smoke', VA: 'volcanic ash',
  DU: 'dust', SA: 'sand', HZ: 'haze', PY: 'spray', PO: 'dust whirls', SQ: 'squalls', FC: 'funnel cloud',
  SS: 'sandstorm', DS: 'duststorm',
};

const thousands = (n: number) => n.toLocaleString('en-US');

function decodeWind(t: string): string | null {
  const m = t.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/);
  if (!m) return null;
  const [, dir, spd, gust, unit] = m;
  const u = unit === 'KT' ? 'kt' : 'm/s';
  if (dir === '000' && spd === '00' && !gust) return 'Calm';
  let s = dir === 'VRB' ? `variable at ${parseInt(spd, 10)} ${u}` : `${parseInt(dir, 10)}° at ${parseInt(spd, 10)} ${u}`;
  if (gust) s += `, gusting ${parseInt(gust, 10)} ${u}`;
  return s;
}

function decodeVis(t: string): string | null {
  if (t === '9999') return '10 km or more';
  if (/^\d{4}$/.test(t)) return `${parseInt(t, 10)} m`;
  const sm = t.match(/^(P|M)?(\d+)(?:\/(\d+))?SM$/);
  if (sm) {
    const [, pm, whole, frac] = sm;
    const val = frac ? `${whole}/${frac}` : whole;
    const pre = pm === 'P' ? 'more than ' : pm === 'M' ? 'less than ' : '';
    return `${pre}${val} SM`;
  }
  return null;
}

function decodeCloud(t: string): string | null {
  const special: Record<string, string> = {
    NSC: 'No significant cloud', SKC: 'Sky clear', CLR: 'Sky clear', NCD: 'No cloud detected',
  };
  if (special[t]) return special[t];
  const vv = t.match(/^VV(\d{3})$/);
  if (vv) return `Vertical visibility ${thousands(parseInt(vv[1], 10) * 100)} ft`;
  const m = t.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/);
  if (!m) return null;
  const [, amt, hgt, type] = m;
  const suffix = type === 'CB' ? ' cumulonimbus' : type === 'TCU' ? ' towering cumulus' : '';
  return `${CLOUD_AMOUNT[amt]} ${thousands(parseInt(hgt, 10) * 100)} ft${suffix}`;
}

function decodeTemp(t: string): string | null {
  const m = t.match(/^(M?\d{1,2})\/(M?\d{1,2})$/);
  if (!m) return null;
  const c = (v: string) => {
    const neg = v.startsWith('M');
    const n = parseInt(neg ? v.slice(1) : v, 10);
    return `${neg && n !== 0 ? -n : n}°C`;
  };
  return `${c(m[1])} / ${c(m[2])}`;
}

function decodePressure(t: string): string | null {
  const q = t.match(/^Q(\d{3,4})$/);
  if (q) return `${parseInt(q[1], 10)} hPa`;
  const a = t.match(/^A(\d{4})$/);
  if (a) return `${(parseInt(a[1], 10) / 100).toFixed(2)} inHg`;
  return null;
}

function decodeWeather(t: string): string | null {
  const m = t.match(/^(-|\+|VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  const [, intensity, descriptor, phenom] = m;
  // 現象コード（2文字単位）を語に。descriptor だけ（TS 等）も許容。
  const words: string[] = [];
  if (intensity) words.push(WX_INTENSITY[intensity]);
  if (descriptor) words.push(WX_DESCRIPTOR[descriptor]);
  if (phenom) {
    for (let i = 0; i < phenom.length; i += 2) {
      const p = WX_PHENOM[phenom.slice(i, i + 2)];
      if (!p) return null; // 未知の現象コードなら天気として扱わない（誤読防止）
      words.push(p);
    }
  }
  if (words.length === 0) return null;
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// METAR は「日＋時刻（UTC）」しか持たない。参照日（フライトの日付 YYYY-MM-DD）があれば
// 年月を借りて「YYYY-MM-DD」に補完する。月末跨ぎ（METAR の日と参照日が ±20 日以上離れる）は前後の月へ。
function resolveObservedDate(dd: string, refDate?: string): string | null {
  const m = (refDate ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  let year = +m[1], month = +m[2];
  const refDay = +m[3], day = +dd;
  if (day - refDay > 20) { month--; if (month < 1) { month = 12; year--; } }       // METAR は前月
  else if (refDay - day > 20) { month++; if (month > 12) { month = 1; year++; } }   // METAR は翌月
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function decodeMetar(raw: string, refDate?: string): MetarLine[] | null {
  const s = (raw ?? '').trim().toUpperCase();
  if (!s) return null;
  let toks = s.replace(/=$/, '').split(/\s+/).filter(Boolean);
  if (toks[0] === 'METAR' || toks[0] === 'SPECI') toks = toks.slice(1);
  const rmkIdx = toks.indexOf('RMK');
  const hasRmk = rmkIdx >= 0;
  if (hasRmk) toks = toks.slice(0, rmkIdx);

  let time = '', wind = '', variable = '', temp = '', pressure = '', trend = '';
  const vis: string[] = [], weather: string[] = [], clouds: string[] = [];
  const flags: string[] = [];

  toks.forEach((t, i) => {
    if (i === 0 && /^[A-Z]{4}$/.test(t)) return; // 観測所コード（From/To が既に出るので省略）
    const tm = t.match(/^(\d{2})(\d{2})(\d{2})Z$/);
    if (tm) {
      const full = resolveObservedDate(tm[1], refDate);
      time = full ? `${full} ${tm[2]}:${tm[3]} UTC` : `day ${tm[1]}, ${tm[2]}:${tm[3]} UTC`;
      return;
    }
    if (t === 'AUTO') { flags.push('automated'); return; }
    if (t === 'COR') { flags.push('corrected'); return; }
    if (t === 'CAVOK') { vis.push('CAVOK — 10 km+, no significant cloud/weather'); return; }
    if (t === 'NOSIG') { trend = 'No significant change'; return; }
    const varW = t.match(/^(\d{3})V(\d{3})$/);
    if (varW) { variable = `${parseInt(varW[1], 10)}°–${parseInt(varW[2], 10)}°`; return; }
    const w = decodeWind(t); if (w) { wind = w; return; }
    const v = decodeVis(t); if (v) { vis.push(v); return; }
    const c = decodeCloud(t); if (c) { clouds.push(c); return; }
    const tp = decodeTemp(t); if (tp) { temp = tp; return; }
    const p = decodePressure(t); if (p) { pressure = p; return; }
    const wx = decodeWeather(t); if (wx) { weather.push(wx); return; }
    // それ以外（RVR・未知）は読み飛ばす
  });

  const out: MetarLine[] = [];
  if (time) out.push({ label: 'Observed', value: time });
  if (wind) out.push({ label: 'Wind', value: wind + (variable ? ` (variable ${variable})` : '') });
  if (vis.length) out.push({ label: 'Visibility', value: vis.join(', ') });
  if (weather.length) out.push({ label: 'Weather', value: weather.join(', ') });
  if (clouds.length) out.push({ label: 'Clouds', value: clouds.join(', ') });
  if (temp) out.push({ label: 'Temp / Dew', value: temp });
  if (pressure) out.push({ label: 'QNH', value: pressure });
  if (trend) out.push({ label: 'Trend', value: trend });
  if (flags.length) out.push({ label: 'Report', value: flags.join(', ') });
  if (hasRmk) out.push({ label: 'Remarks', value: '(present — not decoded)' });

  return out.length ? out : null;
}
