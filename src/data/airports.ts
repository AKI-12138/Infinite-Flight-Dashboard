// =============================== AIRPORT DATA ===============================
// 空港座標とメタデータ（370 空港）。大陸別 → ICAO アルファベット順で整理。
//
// 新規追加するときは：
//   1) 該当する大陸セクションを見つける
//   2) ICAO 順で適切な位置にエントリを挿入する
//   3) 大陸の () 内のカウントを +1 する
// 大陸が今のリストに無いとき（例：今後 Antarctica の別空港を増やす等）は
// そのまま既存セクションに追加して OK。新セクションを増やしたい場合は、
// 一番下の CITY_TO_ICAO の生成ロジックは順序非依存なので、好きな位置に追加可。
//
// 各エントリのフィールド：
//   iata      ：3 文字 IATA コード（normalize.js が IATA→ICAO 変換に使用）
//   lat / lng / city / co(country) / ct(continent)
//   forceIntl ：（オプション）true なら、この空港を通るフライトは強制国際線扱い。
//               判定の優先順位・想定用途は docs/AIRPORTS.md「forceIntl」参照。
// IATA が無い・廃止された空港（軍用基地、閉鎖空港など）は iata を省略。
//
// city フィールドの命名規則：
//   - 単一空港の都市           → "Zurich"
//   - 同一都市に複数空港        → "Tokyo(HND)" / "Tokyo(NRT)" のように IATA で識別
//   - 閉鎖済み・特殊呼称        → "Hong Kong(Kai Tak)" のような括弧付きラベル
// この規則は CITY_TO_ICAO / CITY_AIRPORT_TO_ICAO の自動構築（下部）に依存しているため、
// 新規追加時もこのスタイルを守ること。
//
// co（表示用領土）と ct（物理大陸）の使い分け：
//   co = 国/領土としての表示単位（フィルタ「国」表示と国内/国際判定の基礎）。
//   ct = 空港が物理的に所在する大陸（所属国の大陸ではなく lat/lng の実位置で決める。co と一致しなくてよい）。
//   例：BGGH co:"Greenland(Denmark)" / ct:"North America"、PHNL co:"USA" / ct:"Oceania"。
//
// ▼ 自治領・海外領土の co 表記（3 軸テスト・A/B タイプ既知ケース）、国内/国際の判定優先順位、
//   DOMESTIC_REGIMES の登録基準、forceIntl の使い方、領土追加手順 ── これらの恒久リファレンスは
//   docs/AIRPORTS.md に集約。領土・自治領を追加するとき、または co / forceIntl を変更するときは
//   必ずそちらを参照すること（旧 CLAUDE.md「空港データの規約」、2026-06-30 に分離）。

// 空港エントリの型。co（表示用領土）/ ct（物理大陸）の使い分けは冒頭コメント参照。
export interface AirportEntry {
  iata?: string;      // 3 文字 IATA（軍用・閉鎖空港では省略）
  lat: number;
  lng: number;
  city: string;
  co: string;         // country／表示用領土
  ct: string;         // continent（物理所在大陸）
  forceIntl?: boolean; // true でこの空港を通るフライトを強制国際線扱い
}

export const AP: Record<string, AirportEntry> = {
  // ===== Africa (31) =====
  DAAG:{iata:"ALG",lat:36.6910,lng:3.2154,city:"Algiers",co:"Algeria",ct:"Africa"},
  DGAA:{iata:"ACC",lat:5.6052,lng:-0.1668,city:"Accra",co:"Ghana",ct:"Africa"},
  DNMM:{iata:"LOS",lat:6.5772,lng:3.3211,city:"Lagos",co:"Nigeria",ct:"Africa"},
  DNPO:{iata:"PHC",lat:5.0152,lng:6.9494,city:"Port Harcourt",co:"Nigeria",ct:"Africa"},
  DTTA:{iata:"TUN",lat:36.8510,lng:10.2272,city:"Tunis",co:"Tunisia",ct:"Africa"},
  FACT:{iata:"CPT",lat:-33.9649,lng:18.6017,city:"Cape Town",co:"South Africa",ct:"Africa"},
  FALE:{iata:"DUR",lat:-29.6144,lng:31.1197,city:"Durban",co:"South Africa",ct:"Africa"},
  FAOR:{iata:"JNB",lat:-26.1392,lng:28.2460,city:"Johannesburg",co:"South Africa",ct:"Africa"},
  FIMP:{iata:"MRU",lat:-20.4302,lng:57.6836,city:"Port Louis",co:"Mauritius",ct:"Africa"},
  FLKK:{iata:"LUN",lat:-15.3308,lng:28.4526,city:"Lusaka",co:"Zambia",ct:"Africa"},
  FMEE:{iata:"RUN",lat:-20.8871,lng:55.5103,city:"Saint-Denis",co:"Réunion(France)",ct:"Africa"},
  FMMI:{iata:"TNR",lat:-18.7969,lng:47.4788,city:"Antananarivo",co:"Madagascar",ct:"Africa"},
  FNLU:{iata:"LAD",lat:-8.8584,lng:13.2312,city:"Luanda",co:"Angola",ct:"Africa"},
  FQMA:{iata:"MPM",lat:-25.9208,lng:32.5726,city:"Maputo",co:"Mozambique",ct:"Africa"},
  FVHA:{iata:"HRE",lat:-17.9319,lng:31.0928,city:"Harare",co:"Zimbabwe",ct:"Africa"},
  FZAA:{iata:"FIH",lat:-4.3858,lng:15.4446,city:"Kinshasa",co:"DR Congo",ct:"Africa"},
  GABS:{iata:"BKO",lat:12.5335,lng:-7.9500,city:"Bamako",co:"Mali",ct:"Africa"},
  GMMN:{iata:"CMN",lat:33.3675,lng:-7.5900,city:"Casablanca",co:"Morocco",ct:"Africa"},
  GMMX:{iata:"RAK",lat:31.6069,lng:-8.0363,city:"Marrakech",co:"Morocco",ct:"Africa"},
  GOBD:{iata:"DSS",lat:14.6700,lng:-17.0733,city:"Dakar",co:"Senegal",ct:"Africa"},
  GVAC:{iata:"SID",lat:16.7414,lng:-22.9494,city:"Sal",co:"Cape Verde",ct:"Africa"},
  HAAB:{iata:"ADD",lat:8.9779,lng:38.7993,city:"Addis Ababa",co:"Ethiopia",ct:"Africa"},
  HECA:{iata:"CAI",lat:30.1219,lng:31.4056,city:"Cairo",co:"Egypt",ct:"Africa"},
  HEGN:{iata:"HRG",lat:27.1783,lng:33.7994,city:"Hurghada",co:"Egypt",ct:"Africa"},
  HESH:{iata:"SSH",lat:27.9773,lng:34.3950,city:"Sharm El Sheikh",co:"Egypt",ct:"Africa"},
  HKJK:{iata:"NBO",lat:-1.3192,lng:36.9278,city:"Nairobi",co:"Kenya",ct:"Africa"},
  HLLT:{iata:"TIP",lat:32.6635,lng:13.1590,city:"Tripoli",co:"Libya",ct:"Africa"},
  HRYR:{iata:"KGL",lat:-1.9686,lng:30.1395,city:"Kigali",co:"Rwanda",ct:"Africa"},
  HSSS:{iata:"KRT",lat:15.5895,lng:32.5532,city:"Khartoum",co:"Sudan",ct:"Africa"},
  HTDA:{iata:"DAR",lat:-6.8781,lng:39.2026,city:"Dar es Salaam",co:"Tanzania",ct:"Africa"},
  HUEN:{iata:"EBB",lat:0.0424,lng:32.4435,city:"Entebbe",co:"Uganda",ct:"Africa"},

  // ===== Antarctica (1) =====
  NZIR:{lat:-77.8538,lng:166.4686,city:"McMurdo Station",co:"Antarctica",ct:"Antarctica"},

  // ===== Asia (148) =====
  LLBG:{iata:"TLV",lat:32.0094,lng:34.8867,city:"Tel Aviv",co:"Israel",ct:"Asia"},
  LTAI:{iata:"AYT",lat:36.8987,lng:30.8005,city:"Antalya",co:"Turkey",ct:"Asia"},
  LTFM:{iata:"IST",lat:41.2753,lng:28.7519,city:"Istanbul",co:"Turkey",ct:"Asia"},
  OBBI:{iata:"BAH",lat:26.2708,lng:50.6336,city:"Manama",co:"Bahrain",ct:"Asia"},
  OEJN:{iata:"JED",lat:21.6796,lng:39.1565,city:"Jeddah",co:"Saudi Arabia",ct:"Asia"},
  OERK:{iata:"RUH",lat:24.9576,lng:46.6988,city:"Riyadh",co:"Saudi Arabia",ct:"Asia"},
  OIIE:{iata:"IKA",lat:35.4161,lng:51.1522,city:"Tehran",co:"Iran",ct:"Asia"},
  OJAI:{iata:"AMM",lat:31.7226,lng:35.9932,city:"Amman",co:"Jordan",ct:"Asia"},
  OKBK:{iata:"KWI",lat:29.2266,lng:47.9689,city:"Kuwait City",co:"Kuwait",ct:"Asia"},
  OLBA:{iata:"BEY",lat:33.8209,lng:35.4884,city:"Beirut",co:"Lebanon",ct:"Asia"},
  OMAA:{iata:"AUH",lat:24.4430,lng:54.6511,city:"Abu Dhabi",co:"UAE",ct:"Asia"},
  OMDB:{iata:"DXB",lat:25.2528,lng:55.3644,city:"Dubai",co:"UAE",ct:"Asia"},
  OMSJ:{iata:"SHJ",lat:25.3286,lng:55.5172,city:"Sharjah",co:"UAE",ct:"Asia"},
  OOMS:{iata:"MCT",lat:23.5933,lng:58.2844,city:"Muscat",co:"Oman",ct:"Asia"},
  OPIS:{iata:"ISB",lat:33.5607,lng:72.8517,city:"Islamabad",co:"Pakistan",ct:"Asia"},
  OPKC:{iata:"KHI",lat:24.9065,lng:67.1608,city:"Karachi",co:"Pakistan",ct:"Asia"},
  OPLA:{iata:"LHE",lat:31.5216,lng:74.4036,city:"Lahore",co:"Pakistan",ct:"Asia"},
  OTHH:{iata:"DOH",lat:25.2731,lng:51.6082,city:"Doha",co:"Qatar",ct:"Asia"},
  RCKH:{iata:"KHH",lat:22.5771,lng:120.3500,city:"Kaohsiung",co:"Taiwan(China)",ct:"Asia"},
  RCSS:{iata:"TSA",lat:25.0694,lng:121.5516,city:"Taipei(TSA)",co:"Taiwan(China)",ct:"Asia"},
  RCTP:{iata:"TPE",lat:25.0797,lng:121.2342,city:"Taipei(TPE)",co:"Taiwan(China)",ct:"Asia"},
  RJAA:{iata:"NRT",lat:35.7647,lng:140.3864,city:"Tokyo(NRT)",co:"Japan",ct:"Asia"},
  RJBB:{iata:"KIX",lat:34.4347,lng:135.2440,city:"Osaka(KIX)",co:"Japan",ct:"Asia"},
  RJBE:{iata:"UKB",lat:34.6328,lng:135.2239,city:"Kobe",co:"Japan",ct:"Asia"},
  RJCA:{iata:"AKJ",lat:43.8808,lng:144.1644,city:"Asahikawa",co:"Japan",ct:"Asia"},
  RJCB:{iata:"OBO",lat:42.7333,lng:143.2167,city:"Obihiro",co:"Japan",ct:"Asia"},
  RJCC:{iata:"CTS",lat:42.7752,lng:141.6922,city:"Sapporo(CTS)",co:"Japan",ct:"Asia"},
  RJCH:{iata:"HKD",lat:41.7700,lng:140.8222,city:"Hakodate",co:"Japan",ct:"Asia"},
  RJCK:{iata:"KUH",lat:43.0411,lng:144.1928,city:"Kushiro",co:"Japan",ct:"Asia"},
  RJCO:{iata:"OKD",lat:43.1175,lng:141.3813,city:"Sapporo(OKD)",co:"Japan",ct:"Asia"},
  RJCW:{iata:"WKJ",lat:45.4042,lng:141.8008,city:"Wakkanai",co:"Japan",ct:"Asia"},
  RJEB:{iata:"MBE",lat:44.3033,lng:143.4044,city:"Monbetsu",co:"Japan",ct:"Asia"},
  RJEC:{iata:"MMB",lat:43.5708,lng:144.9597,city:"Memanbetsu",co:"Japan",ct:"Asia"},
  RJEO:{iata:"OIR",lat:42.0717,lng:139.4329,city:"Okushiri",co:"Japan",ct:"Asia"},
  RJER:{iata:"RIS",lat:45.2422,lng:141.1864,city:"Rishiri",co:"Japan",ct:"Asia"},
  RJFE:{iata:"FUJ",lat:32.6675,lng:128.8328,city:"Goto-Fukue",co:"Japan",ct:"Asia"},
  RJFF:{iata:"FUK",lat:33.5859,lng:130.4511,city:"Fukuoka",co:"Japan",ct:"Asia"},
  RJFG:{iata:"KUM",lat:30.3836,lng:130.6589,city:"Yakushima",co:"Japan",ct:"Asia"},
  RJFK:{iata:"KOJ",lat:31.8130,lng:130.7216,city:"Kagoshima",co:"Japan",ct:"Asia"},
  RJFM:{iata:"KMI",lat:31.8772,lng:131.5486,city:"Miyazaki",co:"Japan",ct:"Asia"},
  RJFO:{iata:"OIT",lat:33.4794,lng:131.7367,city:"Oita",co:"Japan",ct:"Asia"},
  RJFR:{iata:"KKJ",lat:33.8455,lng:131.0347,city:"Kitakyushu",co:"Japan",ct:"Asia"},
  RJFT:{iata:"KMJ",lat:32.8372,lng:130.8550,city:"Kumamoto",co:"Japan",ct:"Asia"},
  RJFU:{iata:"NGS",lat:32.9169,lng:129.9136,city:"Nagasaki",co:"Japan",ct:"Asia"},
  RJGG:{iata:"NGO",lat:34.8585,lng:136.8053,city:"Nagoya(NGO)",co:"Japan",ct:"Asia"},
  RJKA:{iata:"ASJ",lat:28.4306,lng:129.7125,city:"Amami",co:"Japan",ct:"Asia"},
  RJNA:{iata:"NKM",lat:35.2550,lng:136.9244,city:"Nagoya(NKM)",co:"Japan",ct:"Asia"},
  RJNK:{iata:"KMQ",lat:36.3939,lng:136.4067,city:"Komatsu",co:"Japan",ct:"Asia"},
  RJNO:{iata:"OKI",lat:36.1783,lng:133.3233,city:"Okinoshima",co:"Japan",ct:"Asia"},
  RJNS:{iata:"FSZ",lat:34.7958,lng:138.1894,city:"Shizuoka",co:"Japan",ct:"Asia"},
  RJNT:{iata:"TOY",lat:36.6483,lng:137.1878,city:"Toyama",co:"Japan",ct:"Asia"},
  RJNY:{iata:"MMJ",lat:36.1781,lng:137.9228,city:"Matsumoto",co:"Japan",ct:"Asia"},
  RJOA:{iata:"HIJ",lat:34.4361,lng:132.9194,city:"Hiroshima",co:"Japan",ct:"Asia"},
  RJOB:{iata:"OKJ",lat:34.7564,lng:133.8553,city:"Okayama",co:"Japan",ct:"Asia"},
  RJOC:{iata:"IZO",lat:35.4147,lng:132.8861,city:"Izumo",co:"Japan",ct:"Asia"},
  RJOH:{iata:"YGJ",lat:35.4917,lng:133.2361,city:"Yonago",co:"Japan",ct:"Asia"},
  RJOI:{iata:"IWK",lat:34.1494,lng:131.0711,city:"Iwakuni",co:"Japan",ct:"Asia"},
  RJOK:{iata:"KCZ",lat:33.5461,lng:133.6694,city:"Kochi",co:"Japan",ct:"Asia"},
  RJOM:{iata:"MYJ",lat:33.8272,lng:132.6997,city:"Matsuyama",co:"Japan",ct:"Asia"},
  RJOO:{iata:"ITM",lat:34.7855,lng:135.4381,city:"Osaka(ITM)",co:"Japan",ct:"Asia"},
  RJOS:{iata:"TKS",lat:34.2147,lng:134.0156,city:"Tokushima",co:"Japan",ct:"Asia"},
  RJOT:{iata:"TAK",lat:34.2142,lng:134.0156,city:"Takamatsu",co:"Japan",ct:"Asia"},
  RJOW:{iata:"IWJ",lat:34.6761,lng:131.7906,city:"Iwami",co:"Japan",ct:"Asia"},
  RJSA:{iata:"AOJ",lat:40.7347,lng:140.6908,city:"Aomori",co:"Japan",ct:"Asia"},
  RJSC:{iata:"AXT",lat:39.6156,lng:140.2186,city:"Akita",co:"Japan",ct:"Asia"},
  RJSH:{iata:"MSJ",lat:40.5564,lng:141.4669,city:"Misawa",co:"Japan",ct:"Asia"},
  RJSI:{iata:"HNA",lat:39.4306,lng:141.1353,city:"Hanamaki",co:"Japan",ct:"Asia"},
  RJSN:{iata:"KIJ",lat:37.9569,lng:139.1111,city:"Niigata",co:"Japan",ct:"Asia"},
  RJSS:{iata:"SDJ",lat:38.1397,lng:140.9172,city:"Sendai",co:"Japan",ct:"Asia"},
  RJST:{iata:"SYO",lat:39.4306,lng:139.7894,city:"Shonai",co:"Japan",ct:"Asia"},
  RJSY:{iata:"GAJ",lat:38.4117,lng:140.3711,city:"Yamagata",co:"Japan",ct:"Asia"},
  RJTH:{iata:"HAC",lat:33.1150,lng:139.5597,city:"Hachijojima",co:"Japan",ct:"Asia"},
  RJTT:{iata:"HND",lat:35.5523,lng:139.7798,city:"Tokyo(HND)",co:"Japan",ct:"Asia"},
  RKPC:{iata:"CJU",lat:33.5106,lng:126.4929,city:"Jeju",co:"South Korea",ct:"Asia"},
  RKPK:{iata:"PUS",lat:35.1797,lng:128.9382,city:"Busan",co:"South Korea",ct:"Asia"},
  RKSI:{iata:"ICN",lat:37.4691,lng:126.4512,city:"Seoul(ICN)",co:"South Korea",ct:"Asia"},
  RKSS:{iata:"GMP",lat:37.5586,lng:126.7906,city:"Seoul(GMP)",co:"South Korea",ct:"Asia"},
  ROAH:{iata:"OKA",lat:26.1958,lng:127.6459,city:"Naha",co:"Japan",ct:"Asia"},
  ROIG:{iata:"ISG",lat:24.3456,lng:124.1869,city:"Ishigaki",co:"Japan",ct:"Asia"},
  RORS:{iata:"MMY",lat:24.7828,lng:125.2950,city:"Miyako",co:"Japan",ct:"Asia"},
  RORY:{iata:"UEO",lat:26.3639,lng:126.7136,city:"Kumejima",co:"Japan",ct:"Asia"},
  RPLL:{iata:"MNL",lat:14.5086,lng:121.0194,city:"Manila",co:"Philippines",ct:"Asia"},
  RPVM:{iata:"CEB",lat:10.3075,lng:123.9790,city:"Cebu",co:"Philippines",ct:"Asia"},
  UAAA:{iata:"ALA",lat:43.3521,lng:77.0405,city:"Almaty",co:"Kazakhstan",ct:"Asia"},
  UACC:{iata:"NQZ",lat:51.0222,lng:71.4669,city:"Astana",co:"Kazakhstan",ct:"Asia"},
  UBBB:{iata:"GYD",lat:40.4675,lng:50.0467,city:"Baku",co:"Azerbaijan",ct:"Asia"},
  UCFM:{iata:"FRU",lat:43.0613,lng:74.4776,city:"Bishkek",co:"Kyrgyzstan",ct:"Asia"},
  UDYZ:{iata:"EVN",lat:40.1473,lng:44.3959,city:"Yerevan",co:"Armenia",ct:"Asia"},
  UGTB:{iata:"TBS",lat:41.6692,lng:44.9547,city:"Tbilisi",co:"Georgia",ct:"Asia"},
  UTTT:{iata:"TAS",lat:41.2579,lng:69.2817,city:"Tashkent",co:"Uzbekistan",ct:"Asia"},
  VABB:{iata:"BOM",lat:19.0887,lng:72.8679,city:"Mumbai",co:"India",ct:"Asia"},
  VCBI:{iata:"CMB",lat:7.1808,lng:79.8841,city:"Colombo",co:"Sri Lanka",ct:"Asia"},
  VDPP:{iata:"PNH",lat:11.5466,lng:104.8441,city:"Phnom Penh",co:"Cambodia",ct:"Asia"},
  VECC:{iata:"CCU",lat:22.6547,lng:88.4467,city:"Kolkata",co:"India",ct:"Asia"},
  VGHS:{iata:"DAC",lat:23.8433,lng:90.3978,city:"Dhaka",co:"Bangladesh",ct:"Asia"},
  VHHH:{iata:"HKG",lat:22.3089,lng:113.9144,city:"Hong Kong",co:"Hong Kong(China)",ct:"Asia"},
  VHHX:{lat:22.3286,lng:114.1941,city:"Hong Kong(Kai Tak)",co:"Hong Kong(China)",ct:"Asia"},
  VIDP:{iata:"DEL",lat:28.5562,lng:77.1000,city:"New Delhi",co:"India",ct:"Asia"},
  VLVT:{iata:"VTE",lat:17.9884,lng:102.5633,city:"Vientiane",co:"Laos",ct:"Asia"},
  VMMC:{iata:"MFM",lat:22.1496,lng:113.5920,city:"Macau",co:"Macau(China)",ct:"Asia"},
  VNKT:{iata:"KTM",lat:27.6966,lng:85.3591,city:"Kathmandu",co:"Nepal",ct:"Asia"},
  VNLK:{iata:"LUA",lat:27.6869,lng:86.7292,city:"Lukla",co:"Nepal",ct:"Asia"},
  VOBL:{iata:"BLR",lat:13.1979,lng:77.7063,city:"Bengaluru",co:"India",ct:"Asia"},
  VOHS:{iata:"HYD",lat:17.2313,lng:78.4298,city:"Hyderabad",co:"India",ct:"Asia"},
  VOMM:{iata:"MAA",lat:12.9900,lng:80.1693,city:"Chennai",co:"India",ct:"Asia"},
  VOTV:{iata:"TRV",lat:8.4821,lng:76.9201,city:"Thiruvananthapuram",co:"India",ct:"Asia"},
  VQPR:{iata:"PBH",lat:27.4032,lng:89.4246,city:"Paro",co:"Bhutan",ct:"Asia"},
  VRMM:{iata:"MLE",lat:4.1918,lng:73.5289,city:"Malé",co:"Maldives",ct:"Asia"},
  VTBS:{iata:"BKK",lat:13.6811,lng:100.7472,city:"Bangkok(BKK)",co:"Thailand",ct:"Asia"},
  VTCC:{iata:"CNX",lat:18.7669,lng:98.9626,city:"Chiang Mai",co:"Thailand",ct:"Asia"},
  VTDB:{iata:"DMK",lat:13.9125,lng:100.6066,city:"Bangkok(DMK)",co:"Thailand",ct:"Asia"},
  VTSP:{iata:"HKT",lat:8.1132,lng:98.3169,city:"Phuket",co:"Thailand",ct:"Asia"},
  VVDN:{iata:"DAD",lat:16.0439,lng:108.1994,city:"Da Nang",co:"Vietnam",ct:"Asia"},
  VVNB:{iata:"HAN",lat:21.2212,lng:105.8070,city:"Hanoi",co:"Vietnam",ct:"Asia"},
  VVTS:{iata:"SGN",lat:10.8188,lng:106.6520,city:"Ho Chi Minh City",co:"Vietnam",ct:"Asia"},
  VYYY:{iata:"RGN",lat:16.9073,lng:96.1332,city:"Yangon",co:"Myanmar",ct:"Asia"},
  WAAA:{iata:"UPG",lat:-5.0616,lng:119.5541,city:"Makassar",co:"Indonesia",ct:"Asia"},
  WADD:{iata:"DPS",lat:-8.7482,lng:115.1672,city:"Bali",co:"Indonesia",ct:"Asia"},
  WARR:{iata:"SUB",lat:-7.3798,lng:112.7869,city:"Surabaya",co:"Indonesia",ct:"Asia"},
  WBKK:{iata:"BKI",lat:5.9372,lng:116.0510,city:"Kota Kinabalu",co:"Malaysia",ct:"Asia"},
  WBSB:{iata:"BWN",lat:4.9442,lng:114.9283,city:"Bandar Seri Begawan",co:"Brunei",ct:"Asia"},
  WIII:{iata:"CGK",lat:-6.1256,lng:106.6558,city:"Jakarta",co:"Indonesia",ct:"Asia"},
  WMKK:{iata:"KUL",lat:2.7456,lng:101.7099,city:"Kuala Lumpur",co:"Malaysia",ct:"Asia"},
  WMKP:{iata:"PEN",lat:5.2971,lng:100.2769,city:"Penang",co:"Malaysia",ct:"Asia"},
  WSSS:{iata:"SIN",lat:1.3502,lng:103.9944,city:"Singapore",co:"Singapore",ct:"Asia"},
  ZBAA:{iata:"PEK",lat:40.0801,lng:116.5846,city:"Beijing(PEK)",co:"China",ct:"Asia"},
  ZBAD:{iata:"PKX",lat:39.5098,lng:116.4107,city:"Beijing(PKX)",co:"China",ct:"Asia"},
  ZGGG:{iata:"CAN",lat:23.3924,lng:113.2988,city:"Guangzhou",co:"China",ct:"Asia"},
  ZGSZ:{iata:"SZX",lat:22.6393,lng:113.8106,city:"Shenzhen",co:"China",ct:"Asia"},
  ZHCC:{iata:"CGO",lat:34.5197,lng:113.8408,city:"Zhengzhou",co:"China",ct:"Asia"},
  ZJHK:{iata:"HAK",lat:19.9349,lng:110.4589,city:"Haikou",co:"China",ct:"Asia"},
  ZJSY:{iata:"SYX",lat:18.3029,lng:109.4122,city:"Sanya",co:"China",ct:"Asia"},
  ZKPY:{iata:"FNJ",lat:39.2238,lng:125.6700,city:"Pyongyang",co:"North Korea",ct:"Asia"},
  ZLXY:{iata:"XIY",lat:34.4471,lng:108.7516,city:"Xi'an",co:"China",ct:"Asia"},
  ZMCK:{iata:"UBN",lat:47.6469,lng:106.8200,city:"Ulaanbaatar",co:"Mongolia",ct:"Asia"},
  ZPPP:{iata:"KMG",lat:25.1050,lng:102.9416,city:"Kunming",co:"China",ct:"Asia"},
  ZSAM:{iata:"XMN",lat:24.5447,lng:118.1278,city:"Xiamen",co:"China",ct:"Asia"},
  ZSHC:{iata:"HGH",lat:30.2295,lng:120.4344,city:"Hangzhou",co:"China",ct:"Asia"},
  ZSNJ:{iata:"NKG",lat:31.7420,lng:118.8620,city:"Nanjing",co:"China",ct:"Asia"},
  ZSPD:{iata:"PVG",lat:31.1443,lng:121.8083,city:"Shanghai(PVG)",co:"China",ct:"Asia"},
  ZSQD:{iata:"TAO",lat:36.2661,lng:120.3744,city:"Qingdao",co:"China",ct:"Asia"},
  ZSSS:{iata:"SHA",lat:31.1979,lng:121.3363,city:"Shanghai(SHA)",co:"China",ct:"Asia"},
  ZUCK:{iata:"CKG",lat:29.7192,lng:106.6417,city:"Chongqing",co:"China",ct:"Asia"},
  ZUDC:{iata:"DCY",lat:29.3230,lng:100.0533,city:"Daocheng Yading",co:"China",ct:"Asia"},
  ZULS:{iata:"LXA",lat:29.2977,lng:90.9119,city:"Lhasa",co:"China",ct:"Asia"},
  ZUNZ:{iata:"LZY",lat:29.3033,lng:94.3352,city:"Linzhi",co:"China",ct:"Asia"},
  ZUTF:{iata:"TFU",lat:30.3230,lng:104.4447,city:"Chengdu(TFU)",co:"China",ct:"Asia"},
  ZUUU:{iata:"CTU",lat:30.5783,lng:103.9469,city:"Chengdu(CTU)",co:"China",ct:"Asia"},

  // ===== Europe (69) =====
  BIKF:{iata:"KEF",lat:63.9850,lng:-22.6055,city:"Keflavík",co:"Iceland",ct:"Europe"},
  EBBR:{iata:"BRU",lat:50.9014,lng:4.4844,city:"Brussels",co:"Belgium",ct:"Europe"},
  EDDB:{iata:"BER",lat:52.3514,lng:13.4939,city:"Berlin",co:"Germany",ct:"Europe"},
  EDDF:{iata:"FRA",lat:50.0264,lng:8.5431,city:"Frankfurt",co:"Germany",ct:"Europe"},
  EDDH:{iata:"HAM",lat:53.6304,lng:9.9882,city:"Hamburg",co:"Germany",ct:"Europe"},
  EDDL:{iata:"DUS",lat:51.2895,lng:6.7668,city:"Dusseldorf",co:"Germany",ct:"Europe"},
  EDDM:{iata:"MUC",lat:48.3538,lng:11.7861,city:"Munich",co:"Germany",ct:"Europe"},
  EETN:{iata:"TLL",lat:59.4133,lng:24.8328,city:"Tallinn",co:"Estonia",ct:"Europe"},
  EFHK:{iata:"HEL",lat:60.3172,lng:24.9633,city:"Helsinki",co:"Finland",ct:"Europe"},
  EGCC:{iata:"MAN",lat:53.3537,lng:-2.2750,city:"Manchester",co:"UK",ct:"Europe"},
  EGKK:{iata:"LGW",lat:51.1481,lng:-0.1903,city:"London(LGW)",co:"UK",ct:"Europe"},
  EGLC:{iata:"LCY",lat:51.5053,lng:0.0553,city:"London(LCY)",co:"UK",ct:"Europe"},
  EGLL:{iata:"LHR",lat:51.4700,lng:-0.4543,city:"London(LHR)",co:"UK",ct:"Europe"},
  EGPH:{iata:"EDI",lat:55.9500,lng:-3.3725,city:"Edinburgh",co:"UK",ct:"Europe"},
  EHAM:{iata:"AMS",lat:52.3086,lng:4.7639,city:"Amsterdam",co:"Netherlands",ct:"Europe"},
  EIDW:{iata:"DUB",lat:53.4213,lng:-6.2701,city:"Dublin",co:"Ireland",ct:"Europe"},
  EKCH:{iata:"CPH",lat:55.6180,lng:12.6561,city:"Copenhagen",co:"Denmark",ct:"Europe"},
  ELLX:{iata:"LUX",lat:49.6266,lng:6.2115,city:"Luxembourg",co:"Luxembourg",ct:"Europe"},
  ENBR:{iata:"BGO",lat:60.2934,lng:5.2181,city:"Bergen",co:"Norway",ct:"Europe"},
  ENGM:{iata:"OSL",lat:60.1939,lng:11.1004,city:"Oslo",co:"Norway",ct:"Europe"},
  ENSB:{iata:"LYR",lat:78.2461,lng:15.4656,city:"Longyearbyen",co:"Norway",ct:"Europe"},
  EPWA:{iata:"WAW",lat:52.1657,lng:20.9671,city:"Warsaw",co:"Poland",ct:"Europe"},
  ESGG:{iata:"GOT",lat:57.6686,lng:12.2931,city:"Gothenburg",co:"Sweden",ct:"Europe"},
  ESSA:{iata:"ARN",lat:59.6519,lng:17.9186,city:"Stockholm",co:"Sweden",ct:"Europe"},
  EVRA:{iata:"RIX",lat:56.9236,lng:23.9711,city:"Riga",co:"Latvia",ct:"Europe"},
  EYVI:{iata:"VNO",lat:54.6341,lng:25.2858,city:"Vilnius",co:"Lithuania",ct:"Europe"},
  LATI:{iata:"TIA",lat:41.4147,lng:19.7206,city:"Tirana",co:"Albania",ct:"Europe"},
  LBSF:{iata:"SOF",lat:42.6952,lng:23.4062,city:"Sofia",co:"Bulgaria",ct:"Europe"},
  LCLK:{iata:"LCA",lat:34.8751,lng:33.6249,city:"Larnaca",co:"Cyprus",ct:"Europe"},
  LDDU:{iata:"DBV",lat:42.5614,lng:18.2682,city:"Dubrovnik",co:"Croatia",ct:"Europe"},
  LDZA:{iata:"ZAG",lat:45.7429,lng:16.0688,city:"Zagreb",co:"Croatia",ct:"Europe"},
  LEBL:{iata:"BCN",lat:41.2971,lng:2.0785,city:"Barcelona",co:"Spain",ct:"Europe"},
  LEMD:{iata:"MAD",lat:40.4936,lng:-3.5668,city:"Madrid",co:"Spain",ct:"Europe"},
  LEMG:{iata:"AGP",lat:36.6749,lng:-4.4991,city:"Malaga",co:"Spain",ct:"Europe"},
  LEPA:{iata:"PMI",lat:39.5517,lng:2.7388,city:"Palma de Mallorca",co:"Spain",ct:"Europe"},
  LFLJ:{iata:"CVF",lat:45.3968,lng:6.6347,city:"Courchevel",co:"France",ct:"Europe"},
  LFLL:{iata:"LYS",lat:45.7256,lng:5.0811,city:"Lyon",co:"France",ct:"Europe"},
  LFMN:{iata:"NCE",lat:43.6584,lng:7.2158,city:"Nice",co:"France",ct:"Europe"},
  LFPG:{iata:"CDG",lat:49.0097,lng:2.5479,city:"Paris(CDG)",co:"France",ct:"Europe"},
  LFPO:{iata:"ORY",lat:48.7253,lng:2.3594,city:"Paris(ORY)",co:"France",ct:"Europe"},
  LFSB:{iata:"BSL",lat:47.5896,lng:7.5299,city:"Basel",co:"France",ct:"Europe"},
  LGAV:{iata:"ATH",lat:37.9364,lng:23.9445,city:"Athens",co:"Greece",ct:"Europe"},
  LGSR:{iata:"JTR",lat:36.4008,lng:25.4783,city:"Santorini",co:"Greece",ct:"Europe"},
  LGTS:{iata:"SKG",lat:40.5197,lng:22.9709,city:"Thessaloniki",co:"Greece",ct:"Europe"},
  LHBP:{iata:"BUD",lat:47.4369,lng:19.2556,city:"Budapest",co:"Hungary",ct:"Europe"},
  LICC:{iata:"CTA",lat:37.4666,lng:15.0638,city:"Catania",co:"Italy",ct:"Europe"},
  LIMC:{iata:"MXP",lat:45.6306,lng:8.7231,city:"Milan(MXP)",co:"Italy",ct:"Europe"},
  LIML:{iata:"LIN",lat:45.4494,lng:9.2783,city:"Milan(LIN)",co:"Italy",ct:"Europe"},
  LIPZ:{iata:"VCE",lat:45.5053,lng:12.3519,city:"Venice",co:"Italy",ct:"Europe"},
  LIRF:{iata:"FCO",lat:41.8003,lng:12.2389,city:"Rome(FCO)",co:"Italy",ct:"Europe"},
  LIRN:{iata:"NAP",lat:40.8844,lng:14.2908,city:"Napoli",co:"Italy",ct:"Europe"},
  LJLJ:{iata:"LJU",lat:46.2237,lng:14.4576,city:"Ljubljana",co:"Slovenia",ct:"Europe"},
  LKPR:{iata:"PRG",lat:50.1008,lng:14.2600,city:"Prague",co:"Czech Republic",ct:"Europe"},
  LMML:{iata:"MLA",lat:35.8575,lng:14.4775,city:"Malta",co:"Malta",ct:"Europe"},
  LOWI:{iata:"INN",lat:47.2602,lng:11.3439,city:"Innsbruck",co:"Austria",ct:"Europe"},
  LOWW:{iata:"VIE",lat:48.1103,lng:16.5697,city:"Vienna",co:"Austria",ct:"Europe"},
  LPMA:{iata:"FNC",lat:32.6942,lng:-16.7745,city:"Madeira",co:"Portugal",ct:"Europe"},
  LPPR:{iata:"OPO",lat:41.2481,lng:-8.6814,city:"Porto",co:"Portugal",ct:"Europe"},
  LPPT:{iata:"LIS",lat:38.7756,lng:-9.1354,city:"Lisbon",co:"Portugal",ct:"Europe"},
  LQSA:{iata:"SJJ",lat:43.8246,lng:18.3315,city:"Sarajevo",co:"Bosnia and Herzegovina",ct:"Europe"},
  LROP:{iata:"OTP",lat:44.5711,lng:26.0850,city:"Bucharest",co:"Romania",ct:"Europe"},
  LSGG:{iata:"GVA",lat:46.2381,lng:6.1089,city:"Geneva",co:"Switzerland",ct:"Europe"},
  LSZH:{iata:"ZRH",lat:47.4647,lng:8.5492,city:"Zurich",co:"Switzerland",ct:"Europe"},
  LXGB:{iata:"GIB",lat:36.1512,lng:-5.3467,city:"Gibraltar",co:"Gibraltar(UK)",ct:"Europe"},
  LYBE:{iata:"BEG",lat:44.8184,lng:20.3091,city:"Belgrade",co:"Serbia",ct:"Europe"},
  LZIB:{iata:"BTS",lat:48.1702,lng:17.2127,city:"Bratislava",co:"Slovakia",ct:"Europe"},
  UKBB:{iata:"KBP",lat:50.3450,lng:30.8947,city:"Kyiv",co:"Ukraine",ct:"Europe"},
  ULLI:{iata:"LED",lat:59.8003,lng:30.2625,city:"Saint Petersburg",co:"Russia",ct:"Europe"},
  UUEE:{iata:"SVO",lat:55.9726,lng:37.4146,city:"Moscow",co:"Russia",ct:"Europe"},

  // ===== North America (66) =====
  BGGH:{iata:"GOH",lat:64.1909,lng:-51.6780,city:"Nuuk",co:"Greenland(Denmark)",ct:"North America"},
  CYEG:{iata:"YEG",lat:53.3097,lng:-113.5800,city:"Edmonton",co:"Canada",ct:"North America"},
  CYHZ:{iata:"YHZ",lat:44.8808,lng:-63.5086,city:"Halifax",co:"Canada",ct:"North America"},
  CYOW:{iata:"YOW",lat:45.3225,lng:-75.6692,city:"Ottawa",co:"Canada",ct:"North America"},
  CYUL:{iata:"YUL",lat:45.4706,lng:-73.7408,city:"Montreal",co:"Canada",ct:"North America"},
  CYVR:{iata:"YVR",lat:49.1947,lng:-123.1839,city:"Vancouver",co:"Canada",ct:"North America"},
  CYWG:{iata:"YWG",lat:49.9100,lng:-97.2399,city:"Winnipeg",co:"Canada",ct:"North America"},
  CYYC:{iata:"YYC",lat:51.1139,lng:-114.0203,city:"Calgary",co:"Canada",ct:"North America"},
  CYYZ:{iata:"YYZ",lat:43.6772,lng:-79.6306,city:"Toronto",co:"Canada",ct:"North America"},
  KADW:{iata:"ADW",lat:38.8108,lng:-76.8669,city:"Andrews AFB(Washington)",co:"USA",ct:"North America"},
  KASE:{iata:"ASE",lat:39.2232,lng:-106.8687,city:"Aspen",co:"USA",ct:"North America"},
  KATL:{iata:"ATL",lat:33.6407,lng:-84.4277,city:"Atlanta",co:"USA",ct:"North America"},
  KAUS:{iata:"AUS",lat:30.1975,lng:-97.6664,city:"Austin",co:"USA",ct:"North America"},
  KBOS:{iata:"BOS",lat:42.3656,lng:-71.0096,city:"Boston",co:"USA",ct:"North America"},
  KBWI:{iata:"BWI",lat:39.1754,lng:-76.6683,city:"Baltimore",co:"USA",ct:"North America"},
  KCLT:{iata:"CLT",lat:35.2140,lng:-80.9431,city:"Charlotte",co:"USA",ct:"North America"},
  KDAL:{iata:"DAL",lat:32.8471,lng:-96.8518,city:"Dallas(DAL)",co:"USA",ct:"North America"},
  KDCA:{iata:"DCA",lat:38.8521,lng:-77.0377,city:"Washington(DCA)",co:"USA",ct:"North America"},
  KDEN:{iata:"DEN",lat:39.8561,lng:-104.6737,city:"Denver",co:"USA",ct:"North America"},
  KDFW:{iata:"DFW",lat:32.8968,lng:-97.0380,city:"Dallas",co:"USA",ct:"North America"},
  KDTW:{iata:"DTW",lat:42.2124,lng:-83.3534,city:"Detroit",co:"USA",ct:"North America"},
  KEWR:{iata:"EWR",lat:40.6925,lng:-74.1686,city:"New York(EWR)",co:"USA",ct:"North America"},
  KFLL:{iata:"FLL",lat:26.0742,lng:-80.1506,city:"Fort Lauderdale",co:"USA",ct:"North America"},
  KIAD:{iata:"IAD",lat:38.9444,lng:-77.4558,city:"Washington(IAD)",co:"USA",ct:"North America"},
  KIAH:{iata:"IAH",lat:29.9902,lng:-95.3368,city:"Houston",co:"USA",ct:"North America"},
  KJAC:{iata:"JAC",lat:43.6073,lng:-110.7377,city:"Jackson Hole",co:"USA",ct:"North America"},
  KJFK:{iata:"JFK",lat:40.6398,lng:-73.7789,city:"New York(JFK)",co:"USA",ct:"North America"},
  KLAS:{iata:"LAS",lat:36.0801,lng:-115.1522,city:"Las Vegas",co:"USA",ct:"North America"},
  KLAX:{iata:"LAX",lat:33.9425,lng:-118.4081,city:"Los Angeles(LAX)",co:"USA",ct:"North America"},
  KLGA:{iata:"LGA",lat:40.7750,lng:-73.8750,city:"New York(LGA)",co:"USA",ct:"North America"},
  KMCO:{iata:"MCO",lat:28.4312,lng:-81.3081,city:"Orlando",co:"USA",ct:"North America"},
  KMDW:{iata:"MDW",lat:41.7860,lng:-87.7524,city:"Chicago(MDW)",co:"USA",ct:"North America"},
  KMIA:{iata:"MIA",lat:25.7959,lng:-80.2870,city:"Miami",co:"USA",ct:"North America"},
  KMSP:{iata:"MSP",lat:44.8848,lng:-93.2223,city:"Minneapolis",co:"USA",ct:"North America"},
  KMSY:{iata:"MSY",lat:29.9934,lng:-90.2580,city:"New Orleans",co:"USA",ct:"North America"},
  KOAK:{iata:"OAK",lat:37.7213,lng:-122.2210,city:"Oakland",co:"USA",ct:"North America"},
  KORD:{iata:"ORD",lat:41.9742,lng:-87.9073,city:"Chicago",co:"USA",ct:"North America"},
  KPDX:{iata:"PDX",lat:45.5887,lng:-122.5975,city:"Portland",co:"USA",ct:"North America"},
  KPHL:{iata:"PHL",lat:39.8719,lng:-75.2411,city:"Philadelphia",co:"USA",ct:"North America"},
  KPHX:{iata:"PHX",lat:33.4342,lng:-112.0116,city:"Phoenix",co:"USA",ct:"North America"},
  KSAN:{iata:"SAN",lat:32.7336,lng:-117.1897,city:"San Diego",co:"USA",ct:"North America"},
  KSEA:{iata:"SEA",lat:47.4502,lng:-122.3088,city:"Seattle",co:"USA",ct:"North America"},
  KSFO:{iata:"SFO",lat:37.6188,lng:-122.3750,city:"San Francisco",co:"USA",ct:"North America"},
  KSJC:{iata:"SJC",lat:37.3626,lng:-121.9290,city:"San Jose(SJC)",co:"USA",ct:"North America"},
  KSLC:{iata:"SLC",lat:40.7899,lng:-111.9791,city:"Salt Lake City",co:"USA",ct:"North America"},
  KTPA:{iata:"TPA",lat:27.9755,lng:-82.5332,city:"Tampa",co:"USA",ct:"North America"},
  KVNY:{iata:"VNY",lat:34.2097,lng:-118.4900,city:"Los Angeles(VNY)",co:"USA",ct:"North America"},
  MDPC:{iata:"PUJ",lat:18.5674,lng:-68.3634,city:"Punta Cana",co:"Dominican Republic",ct:"North America"},
  MDSD:{iata:"SDQ",lat:18.4297,lng:-69.6689,city:"Santo Domingo",co:"Dominican Republic",ct:"North America"},
  MGGT:{iata:"GUA",lat:14.5833,lng:-90.5275,city:"Guatemala City",co:"Guatemala",ct:"North America"},
  MKJP:{iata:"KIN",lat:17.9357,lng:-76.7875,city:"Kingston",co:"Jamaica",ct:"North America"},
  MKJS:{iata:"MBJ",lat:18.5037,lng:-77.9134,city:"Montego Bay",co:"Jamaica",ct:"North America"},
  MMGL:{iata:"GDL",lat:20.5218,lng:-103.3111,city:"Guadalajara",co:"Mexico",ct:"North America"},
  MMMX:{iata:"MEX",lat:19.4363,lng:-99.0721,city:"Mexico City",co:"Mexico",ct:"North America"},
  MMMY:{iata:"MTY",lat:25.7785,lng:-100.1069,city:"Monterrey",co:"Mexico",ct:"North America"},
  MMSD:{iata:"SJD",lat:23.1518,lng:-109.7215,city:"Los Cabos",co:"Mexico",ct:"North America"},
  MMUN:{iata:"CUN",lat:21.0365,lng:-86.8771,city:"Cancun",co:"Mexico",ct:"North America"},
  MPTO:{iata:"PTY",lat:9.0714,lng:-79.3835,city:"Panama City",co:"Panama",ct:"North America"},
  MROC:{iata:"SJO",lat:9.9939,lng:-84.2088,city:"San Jose",co:"Costa Rica",ct:"North America"},
  MUHA:{iata:"HAV",lat:22.9892,lng:-82.4091,city:"Havana",co:"Cuba",ct:"North America"},
  MYNN:{iata:"NAS",lat:25.0390,lng:-77.4662,city:"Nassau",co:"Bahamas",ct:"North America"},
  PANC:{iata:"ANC",lat:61.1741,lng:-149.9962,city:"Anchorage",co:"USA",ct:"North America"},
  TBPB:{iata:"BGI",lat:13.0746,lng:-59.4925,city:"Bridgetown",co:"Barbados",ct:"North America"},
  TFFJ:{iata:"SBH",lat:17.9044,lng:-62.8436,city:"Saint Barthélemy",co:"Saint Barthélemy(France)",ct:"North America"},
  TJSJ:{iata:"SJU",lat:18.4394,lng:-66.0018,city:"San Juan",co:"USA",ct:"North America"},
  TNCM:{iata:"SXM",lat:18.0410,lng:-63.1089,city:"Sint Maarten",co:"Sint Maarten(Netherlands)",ct:"North America"},

  // ===== Oceania (25) =====
  AYPY:{iata:"POM",lat:-9.4433,lng:147.2200,city:"Port Moresby",co:"Papua New Guinea",ct:"Oceania"},
  NCRG:{iata:"RAR",lat:-21.2027,lng:-159.8058,city:"Rarotonga",co:"Cook Islands",ct:"Oceania"},
  NFFN:{iata:"NAN",lat:-17.7554,lng:177.4434,city:"Nadi",co:"Fiji",ct:"Oceania"},
  NSFA:{iata:"APW",lat:-13.8300,lng:-172.0083,city:"Apia",co:"Samoa",ct:"Oceania"},
  NTAA:{iata:"PPT",lat:-17.5537,lng:-149.6069,city:"Papeete",co:"French Polynesia(France)",ct:"Oceania"},
  NVVV:{iata:"VLI",lat:-17.6993,lng:168.3197,city:"Port Vila",co:"Vanuatu",ct:"Oceania"},
  NWWW:{iata:"NOU",lat:-22.0146,lng:166.2129,city:"Noumea",co:"New Caledonia(France)",ct:"Oceania"},
  NZAA:{iata:"AKL",lat:-37.0081,lng:174.7850,city:"Auckland",co:"New Zealand",ct:"Oceania"},
  NZCH:{iata:"CHC",lat:-43.4894,lng:172.5325,city:"Christchurch",co:"New Zealand",ct:"Oceania"},
  NZDN:{iata:"DUD",lat:-45.9281,lng:170.1983,city:"Dunedin",co:"New Zealand",ct:"Oceania"},
  NZQN:{iata:"ZQN",lat:-45.0211,lng:168.7392,city:"Queenstown",co:"New Zealand",ct:"Oceania"},
  NZWN:{iata:"WLG",lat:-41.3272,lng:174.8050,city:"Wellington",co:"New Zealand",ct:"Oceania"},
  PGUM:{iata:"GUM",lat:13.4834,lng:144.7960,city:"Guam",co:"USA",ct:"Oceania"},
  PHNL:{iata:"HNL",lat:21.3186,lng:-157.9222,city:"Honolulu",co:"USA",ct:"Oceania"},
  PHOG:{iata:"OGG",lat:20.8986,lng:-156.4306,city:"Maui",co:"USA",ct:"Oceania"},
  YBBN:{iata:"BNE",lat:-27.3842,lng:153.1175,city:"Brisbane",co:"Australia",ct:"Oceania"},
  YBCG:{iata:"OOL",lat:-28.1644,lng:153.5050,city:"Gold Coast",co:"Australia",ct:"Oceania"},
  YBCS:{iata:"CNS",lat:-16.8858,lng:145.7553,city:"Cairns",co:"Australia",ct:"Oceania"},
  YMHB:{iata:"HBA",lat:-42.8361,lng:147.5103,city:"Hobart",co:"Australia",ct:"Oceania"},
  YMML:{iata:"MEL",lat:-37.6733,lng:144.8431,city:"Melbourne",co:"Australia",ct:"Oceania"},
  YPAD:{iata:"ADL",lat:-34.9450,lng:138.5306,city:"Adelaide",co:"Australia",ct:"Oceania"},
  YPDN:{iata:"DRW",lat:-12.4147,lng:130.8767,city:"Darwin",co:"Australia",ct:"Oceania"},
  YPPH:{iata:"PER",lat:-31.9403,lng:115.9672,city:"Perth",co:"Australia",ct:"Oceania"},
  YSCB:{iata:"CBR",lat:-35.3069,lng:149.1950,city:"Canberra",co:"Australia",ct:"Oceania"},
  YSSY:{iata:"SYD",lat:-33.9461,lng:151.1772,city:"Sydney",co:"Australia",ct:"Oceania"},

  // ===== South America (31) =====
  SABE:{iata:"AEP",lat:-34.5592,lng:-58.4156,city:"Buenos Aires(AEP)",co:"Argentina",ct:"South America"},
  SAEZ:{iata:"EZE",lat:-34.8222,lng:-58.5358,city:"Buenos Aires",co:"Argentina",ct:"South America"},
  SASA:{iata:"SLA",lat:-24.8560,lng:-65.4862,city:"Salta",co:"Argentina",ct:"South America"},
  SAWH:{iata:"USH",lat:-54.8433,lng:-68.2958,city:"Ushuaia",co:"Argentina",ct:"South America"},
  SBBR:{iata:"BSB",lat:-15.8711,lng:-47.9186,city:"Brasilia",co:"Brazil",ct:"South America"},
  SBCF:{iata:"CNF",lat:-19.6336,lng:-43.9686,city:"Belo Horizonte",co:"Brazil",ct:"South America"},
  SBCT:{iata:"CWB",lat:-25.5285,lng:-49.1758,city:"Curitiba",co:"Brazil",ct:"South America"},
  SBEG:{iata:"MAO",lat:-3.0386,lng:-60.0497,city:"Manaus",co:"Brazil",ct:"South America"},
  SBFZ:{iata:"FOR",lat:-3.7761,lng:-38.5326,city:"Fortaleza",co:"Brazil",ct:"South America"},
  SBGL:{iata:"GIG",lat:-22.8100,lng:-43.2506,city:"Rio de Janeiro",co:"Brazil",ct:"South America"},
  SBGR:{iata:"GRU",lat:-23.4356,lng:-46.4731,city:"Sao Paulo",co:"Brazil",ct:"South America"},
  SBPA:{iata:"POA",lat:-29.9944,lng:-51.1714,city:"Porto Alegre",co:"Brazil",ct:"South America"},
  SBRF:{iata:"REC",lat:-8.1265,lng:-34.9236,city:"Recife",co:"Brazil",ct:"South America"},
  SBSP:{iata:"CGH",lat:-23.6261,lng:-46.6564,city:"Sao Paulo(CGH)",co:"Brazil",ct:"South America"},
  SBSV:{iata:"SSA",lat:-12.9086,lng:-38.3225,city:"Salvador",co:"Brazil",ct:"South America"},
  SCEL:{iata:"SCL",lat:-33.3930,lng:-70.7858,city:"Santiago",co:"Chile",ct:"South America"},
  SCIP:{iata:"IPC",lat:-27.1648,lng:-109.4219,city:"Easter Island",co:"Chile",ct:"South America"},
  SEGU:{iata:"GYE",lat:-2.1574,lng:-79.8836,city:"Guayaquil",co:"Ecuador",ct:"South America"},
  SEQM:{iata:"UIO",lat:-0.1292,lng:-78.3575,city:"Quito",co:"Ecuador",ct:"South America"},
  SGAS:{iata:"ASU",lat:-25.2399,lng:-57.5199,city:"Asuncion",co:"Paraguay",ct:"South America"},
  SKBO:{iata:"BOG",lat:4.7016,lng:-74.1469,city:"Bogota",co:"Colombia",ct:"South America"},
  SKCG:{iata:"CTG",lat:10.4424,lng:-75.5130,city:"Cartagena",co:"Colombia",ct:"South America"},
  SKCL:{iata:"CLO",lat:3.5432,lng:-76.3816,city:"Cali",co:"Colombia",ct:"South America"},
  SKRG:{iata:"MDE",lat:6.1645,lng:-75.4231,city:"Medellin",co:"Colombia",ct:"South America"},
  SLLP:{iata:"LPB",lat:-16.5133,lng:-68.1923,city:"La Paz",co:"Bolivia",ct:"South America"},
  SLVR:{iata:"VVI",lat:-17.6448,lng:-63.1354,city:"Santa Cruz",co:"Bolivia",ct:"South America"},
  SMJP:{iata:"PBM",lat:5.4528,lng:-55.1878,city:"Paramaribo",co:"Suriname",ct:"South America"},
  SPJC:{iata:"LIM",lat:-12.0219,lng:-77.1143,city:"Lima",co:"Peru",ct:"South America"},
  SUMU:{iata:"MVD",lat:-34.8384,lng:-56.0308,city:"Montevideo",co:"Uruguay",ct:"South America"},
  SVMI:{iata:"CCS",lat:10.6013,lng:-66.9911,city:"Caracas",co:"Venezuela",ct:"South America"},
  SYCJ:{iata:"GEO",lat:6.4986,lng:-58.2541,city:"Georgetown",co:"Guyana",ct:"South America"},
};

// 逆引きテーブル：IATA → ICAO（normalize.js の normalizeAirport で使用）。
export const IATA_TO_ICAO: Record<string, string> = {};
Object.entries(AP).forEach(([icao, data]) => {
  if(data.iata && !IATA_TO_ICAO[data.iata]) IATA_TO_ICAO[data.iata] = icao;
});

// 都市名／都市+空港識別子の逆引きテーブル（normalize.js の normalizeAirport で使用）。
// city フィールドのフォーマットを解釈する：
//   - "Zurich"            → 単一空港の都市。CITY_TO_ICAO["ZURICH"] に登録。
//   - "Tokyo(HND)"        → 複数空港の都市。CITY_AIRPORT_TO_ICAO["TOKYOHND"] に登録。
//                            "Tokyo HND" でも "TokyoHND" でも compact 化して一致する。
//   - "Hong Kong"         → 単一形（VHHH）。 "Hong Kong(Kai Tak)" もあるが括弧つきは
//                            別マップ。"HONGKONG" は VHHH（現役）になる。
export const CITY_TO_ICAO: Record<string, string> = {};
export const CITY_AIRPORT_TO_ICAO: Record<string, string> = {};
Object.entries(AP).forEach(([icao, data]) => {
  if(!data || !data.city) return;
  const m = data.city.match(/^(.*?)\(([^)]+)\)\s*$/);
  const baseRaw = m ? m[1] : data.city;
  const compactBase = baseRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(!compactBase) return;
  if(m){
    const compactAirport = m[2].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(compactAirport){
      const key = compactBase + compactAirport;
      if(!CITY_AIRPORT_TO_ICAO[key]) CITY_AIRPORT_TO_ICAO[key] = icao;
    }
  } else {
    if(!CITY_TO_ICAO[compactBase]) CITY_TO_ICAO[compactBase] = icao;
  }
});
