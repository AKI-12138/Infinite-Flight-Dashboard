// =============================== AIRLINE DATA ===============================
// 航空会社の「正式名称（canonical）→ 別名（IATA 2 文字 / ICAO 3 文字 / 別表記）」表。
// 手で航空会社を追加するときはここを編集する。別名は大文字英数のみの compact 形で書く。
// 不明な入力は normalize.js 側で元の文字列をそのまま返す（ユーザー入力を壊さない）。
// 読み込み順：normalize.js より前（index.html 参照）。

export const AIRLINE_TABLE: Record<string, string[]> = {
  // ===== 日本 =====
  "All Nippon Airways":     ["NH", "ANA", "ALLNIPPON", "ALLNIPPONAIRWAYSCO"],
  "Japan Airlines":         ["JL", "JAL", "JAPANAIRLINESCO", "JAPANAIRLINESCOLTD"],
  "Skymark Airlines":       ["BC", "SKY", "SKYMARK"],
  "Star Flyer":             ["7G", "SFJ", "STARFLYER"],
  "AirDo":                  ["HD", "ADO", "AIRDO"],
  "Solaseed Air":           ["6J", "SNJ", "SOLASEED", "SOLASEEDAIR"],
  "IBEX Airlines":          ["FW", "IBX", "IBEX"],
  "Peach Aviation":         ["MM", "APJ", "PEACH", "PEACHAVIATION"],
  "Jetstar Japan":          ["GK", "JJP", "JETSTARJAPAN"],
  "Zipair Tokyo":           ["ZG", "TZP", "ZIPAIR", "ZIPAIRTOKYO"],
  "Fuji Dream Airlines":    ["JH", "FDA", "FUJIDREAM", "FUJIDREAMAIRLINES"],
  // ===== 韓国 =====
  "Korean Air":             ["KE", "KAL", "KOREANAIR"],
  "Asiana Airlines":        ["OZ", "AAR", "ASIANA"],
  "Jeju Air":               ["7C", "JJA", "JEJUAIR"],
  // ===== 中華圏 =====
  "Starlux Airlines":       ["JX", "SJX", "STARLUX", "STARLUXAIRLINES"],
  "Air China":              ["CA", "CCA", "AIRCHINA"],
  "China Eastern Airlines": ["MU", "CES", "CHINAEASTERN"],
  "China Southern Airlines":["CZ", "CSN", "CHINASOUTHERN"],
  "Hainan Airlines":        ["HU", "CHH", "HAINAN"],
  "Shenzhen Airlines":      ["ZH", "CSZ", "SHENZHEN"],
  "Spring Airlines":        ["9C", "CQH", "SPRING"],
  "Xiamen Airlines":        ["MF", "CXA", "XIAMENAIR", "XIAMEN"],
  "Sichuan Airlines":       ["3U", "CSC", "SICHUAN"],
  "Cathay Pacific":         ["CX", "CPA", "CATHAY"],
  "Hong Kong Airlines":     ["HX", "CRK", "HONGKONGAIRLINES"],
  "China Airlines":         ["CI", "CAL", "CHINAAIRLINES"],
  "EVA Air":                ["BR", "EVA", "EVAAIR", "EVAAIRWAYS"],
  // ===== 東南アジア =====
  "Singapore Airlines":     ["SQ", "SIA"],
  "Scoot":                  ["TR", "TGW", "SCOOT"],
  "Malaysia Airlines":      ["MH", "MAS"],
  "AirAsia":                ["AK", "AXM", "AIRASIA"],
  "Thai Airways":           ["TG", "THA", "THAIAIRWAYS"],
  "Vietnam Airlines":       ["VN", "HVN"],
  "Garuda Indonesia":       ["GA", "GIA", "GARUDA"],
  "Lion Air":               ["JT", "LNI", "LIONAIR"],
  "Philippine Airlines":    ["PR", "PAL"],
  "Cebu Pacific":           ["5J", "CEB", "CEBUPACIFIC"],
  // ===== 中東 =====
  "Emirates":               ["EK", "UAE"],
  "Etihad Airways":         ["EY", "ETD", "ETIHAD"],
  "Qatar Airways":          ["QR", "QTR", "QATAR"],
  "Saudia":                 ["SV", "SVA", "SAUDI", "SAUDIA"],
  "Gulf Air":               ["GF", "GFA", "GULFAIR"],
  "Royal Jordanian":        ["RJ", "RJA", "ROYALJORDANIAN"],
  "El Al":                  ["LY", "ELY", "ELAL"],
  // ===== インド =====
  "Air India":              ["AI", "AIC", "AIRINDIA"],
  "IndiGo":                 ["6E", "IGO", "INDIGO"],
  // ===== ヨーロッパ =====
  "Air France":             ["AF", "AFR", "AIRFRANCE"],
  "KLM Royal Dutch Airlines":["KL", "KLM", "KLMROYAL", "KLMROYALDUTCHAIRLINES"],
  "Lufthansa":              ["LH", "DLH"],
  "British Airways":        ["BA", "BAW"],
  "Iberia":                 ["IB", "IBE"],
  "Swiss International Air Lines":["LX", "SWR", "SWISS", "SWISSINTERNATIONAL"],
  "Austrian Airlines":      ["OS", "AUA", "AUSTRIAN"],
  "Scandinavian Airlines System":["SK", "SAS", "SCANDINAVIAN","Scandinavian Airlines"],
  "Finnair":                ["AY", "FIN"],
  "ITA Airways":            ["AZ", "ITY"],
  "Icelandair":            ["FI", "ICE", "ICELANDAIR"],
  "Alitalia":               ["AZA", "ALITALIA"],
  "TAP Air Portugal":       ["TP", "TAP", "TAPPORTUGAL"],
  "Aer Lingus":             ["EI", "EIN", "AERLINGUS"],
  "Ryanair":                ["FR", "RYR"],
  "easyJet":                ["U2", "EZY", "EASYJET"],
  "Virgin Atlantic":        ["VS", "VIR", "VIRGINATLANTIC"],
  "TUI fly":                ["X3", "TUI", "TUIFLY"],
  "Norwegian":              ["DY", "NAX", "NOR", "NORWEGIAN"],
  "Wizz Air":               ["W6", "WZZ", "WIZZ"],
  "LOT Polish Airlines":    ["LO", "LOT", "LOTPOLISH"],
  "Turkish Airlines":       ["TK", "THY", "TURKISHAIRLINES"],
  "Aeroflot":               ["SU", "AFL", "AEROFLOT"],
  "Aegean Airlines":        ["A3", "AEE", "AEGEAN"],
  "Air Serbia":             ["JU", "ASL", "AIRSERBIA"],
  // ===== 北米 =====
  "American Airlines":      ["AA", "AAL", "AMERICAN"],
  "Delta Air Lines":        ["DL", "DAL", "DELTA"],
  "United Airlines":        ["UA", "UAL", "UNITED"],
  "Southwest Airlines":     ["WN", "SWA", "SOUTHWEST"],
  "JetBlue Airways":        ["B6", "JBU", "JETBLUE"],
  "Alaska Airlines":        ["AS", "ASA", "ALASKA"],
  "Spirit Airlines":        ["NK", "NKS", "SPIRIT"],
  "Frontier Airlines":      ["F9", "FFT", "FRONTIER"],
  "Hawaiian Airlines":      ["HA", "HAL", "HAWAIIAN"],
  "Air Canada":             ["AC", "ACA", "AIRCANADA"],
  "Air Greenland":          ["GL", "GRL", "AIRGREENLAND"],
  "WestJet":                ["WS", "WJA", "WESTJET"],
  "Aeromexico":             ["AM", "AMX", "AEROMEXICO"],
  // ===== オセアニア =====
  "Qantas":                 ["QF", "QFA"],
  "Jetstar":                ["JQ", "JST", "JETSTAR"],
  "Virgin Australia":       ["VA", "VOZ", "VIRGINAUSTRALIA"],
  "Air New Zealand":        ["NZ", "ANZ"],
  // ===== 南米 =====
  "LATAM Airlines":         ["LA", "LAN", "LTM", "LATAM"],
  "Avianca":                ["AV", "AVA"],
  "Aerolineas Argentinas":  ["AR", "ARG"],
  "GOL":                    ["G3", "GLO", "GOL"],
  "Azul":                   ["AD", "AZU", "AZUL"],
  // ===== アフリカ =====
  "Ethiopian Airlines":     ["ET", "ETH", "ETHIOPIAN"],
  "South African Airways":  ["SA", "SAA"],
  "Kenya Airways":          ["KQ", "KQA", "KENYAAIRWAYS"],
  "EgyptAir":               ["MS", "MSR", "EGYPTAIR"],
};

// ===== ICAO 無線呼出名（テレフォニー・2026-07-11） =====
// フライトノートの Callsign 欄の入力候補用（例：Starlux JX923 → "STARWALKER 923"）。
// キーは AIRLINE_TABLE の canonical 名と一致させる。呼出名が ICAO コードと同じ会社
// （LOT・GOL 等）は候補側で重複排除されるので、そのまま書いてよい。
export const AIRLINE_CALLSIGN: Record<string, string> = {
  // 日本
  "All Nippon Airways": "ALL NIPPON",   "Japan Airlines": "JAPANAIR",
  "Skymark Airlines": "SKYMARK",        "Star Flyer": "STARFLYER",
  "AirDo": "AIR DO",                    "Solaseed Air": "NEW SKY",
  "IBEX Airlines": "IBEX",              "Peach Aviation": "AIR PEACH",
  "Jetstar Japan": "ORANGE LINER",      "Zipair Tokyo": "ZIPPY",
  "Fuji Dream Airlines": "FUJI DREAM",
  // 韓国
  "Korean Air": "KOREANAIR",            "Asiana Airlines": "ASIANA",
  "Jeju Air": "JEJU AIR",
  // 中華圏
  "Starlux Airlines": "STARWALKER",     "Air China": "AIR CHINA",
  "China Eastern Airlines": "CHINA EASTERN", "China Southern Airlines": "CHINA SOUTHERN",
  "Hainan Airlines": "HAINAN",          "Shenzhen Airlines": "SHENZHEN AIR",
  "Spring Airlines": "AIR SPRING",      "Xiamen Airlines": "XIAMEN AIR",
  "Sichuan Airlines": "SICHUAN",        "Cathay Pacific": "CATHAY",
  "Hong Kong Airlines": "BAUHINIA",     "China Airlines": "DYNASTY",
  "EVA Air": "EVA",
  // 東南アジア
  "Singapore Airlines": "SINGAPORE",    "Scoot": "SCOOTER",
  "Malaysia Airlines": "MALAYSIAN",     "AirAsia": "RED CAP",
  "Thai Airways": "THAI",               "Vietnam Airlines": "VIETNAM AIRLINES",
  "Garuda Indonesia": "INDONESIA",      "Lion Air": "LION INTER",
  "Philippine Airlines": "PHILIPPINE",  "Cebu Pacific": "CEBU",
  // 中東
  "Emirates": "EMIRATES",               "Etihad Airways": "ETIHAD",
  "Qatar Airways": "QATARI",            "Saudia": "SAUDIA",
  "Gulf Air": "GULF AIR",               "Royal Jordanian": "JORDANIAN",
  "El Al": "ELAL",
  // インド
  "Air India": "AIR INDIA",             "IndiGo": "IFLY",
  // ヨーロッパ
  "Air France": "AIRFRANS",             "KLM Royal Dutch Airlines": "KLM",
  "Lufthansa": "LUFTHANSA",             "British Airways": "SPEEDBIRD",
  "Iberia": "IBERIA",                   "Swiss International Air Lines": "SWISS",
  "Austrian Airlines": "AUSTRIAN",      "Scandinavian Airlines System": "SCANDINAVIAN",
  "Finnair": "FINNAIR",                 "ITA Airways": "ITARROW",
  "Icelandair": "ICEAIR",               "Alitalia": "ALITALIA",
  "TAP Air Portugal": "AIR PORTUGAL",   "Aer Lingus": "SHAMROCK",
  "Ryanair": "RYANAIR",                 "easyJet": "EASY",
  "Virgin Atlantic": "VIRGIN",          "TUI fly": "TUI JET",
  "Norwegian": "NOR SHUTTLE",           "Wizz Air": "WIZZAIR",
  "LOT Polish Airlines": "LOT",         "Turkish Airlines": "TURKISH",
  "Aeroflot": "AEROFLOT",               "Aegean Airlines": "AEGEAN",
  "Air Serbia": "AIR SERBIA",
  // 北米
  "American Airlines": "AMERICAN",      "Delta Air Lines": "DELTA",
  "United Airlines": "UNITED",          "Southwest Airlines": "SOUTHWEST",
  "JetBlue Airways": "JETBLUE",         "Alaska Airlines": "ALASKA",
  "Spirit Airlines": "SPIRIT WINGS",    "Frontier Airlines": "FRONTIER FLIGHT",
  "Hawaiian Airlines": "HAWAIIAN",      "Air Canada": "AIR CANADA",
  "Air Greenland": "GREENLAND",         "WestJet": "WESTJET",
  "Aeromexico": "AEROMEXICO",
  // オセアニア
  "Qantas": "QANTAS",                   "Jetstar": "JETSTAR",
  "Virgin Australia": "VELOCITY",       "Air New Zealand": "NEW ZEALAND",
  // 南米
  "LATAM Airlines": "LATAM",            "Avianca": "AVIANCA",
  "Aerolineas Argentinas": "ARGENTINA", "GOL": "GOL",
  "Azul": "AZUL",
  // アフリカ
  "Ethiopian Airlines": "ETHIOPIAN",    "South African Airways": "SPRINGBOK",
  "Kenya Airways": "KENYA",             "EgyptAir": "EGYPTAIR",
};
