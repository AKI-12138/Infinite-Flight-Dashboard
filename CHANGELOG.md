# Changelog

User-facing highlights for each version of **Infinite Flight Dashboard**. The version here
matches the number in the dashboard footer. Bug fixes and small refinements are grouped into a
single line; smaller or internal-only updates aren't listed.

## v2.5 — 2026-08-18
Polish pass: the interface responds, has depth, and is easier to use on a phone.

- Controls react the moment you press them.
- Cards and panels have depth; expanded views and dialogs use frosted glass.
- Reduced-motion settings are respected — motion is removed, colour cues stay.
- Mobile: a **Jump** menu in the filter bar takes you straight to any section.
- Bigger touch areas, named **Breakdowns** / **Trends** sections, and larger small text on phones.
- Plus various bug fixes.

## v2.4 — 2026-08-06
Your flight notes gain a weather brain — and a lot more detail.

- **Paste a METAR, read it in plain English** — wind, visibility, clouds, temperature and pressure
  (hPa or inHg). Decoded on your device; nothing is sent anywhere.
- **More to record**: terminal and gate, taxi routes, approach, centerline offset, RVR, takeoff /
  landing configuration, cost index, reverser credit, and an alternate airport.
- Callsign wake suffix (Heavy / Super) is now a picker.
- Aircraft shown by model name (A330-200) instead of ICAO code (A332).
- VREF and VAPP are separate fields.

## v2.3 — 2026-07-11
The post-flight ritual: your notes become a real paper logbook page.

- **Notes read like a paper logbook** — ruled lines, notebook rules for free text, cream paper in
  light theme.
- Date, route, aircraft, airline and air time fill in from your log; taxi total sums itself.
- **Enter local times only** — UTC times *and* dates are computed from each airport's real timezone.
- Callsign and flight-number fields suggest airline codes as you type, your flight's airline first.
- **Add Notes** now opens the notes page before saving the flight.
- Advanced filters gain a from–to date range.
- Continents gets a Pie / Bar toggle; Flights per Month / Weekday get Line / Bar.
- Plus various bug fixes.

## v2.2 — 2026-07-08
Write the story of each flight.

- **Flight Notes** — every flight gets its own page, opened from the new **Notes** column in the
  Flight Log. Record flight number, callsign, registration, OUT/OFF/ON/IN times (local and UTC),
  taxi, V-speeds, distance, touchdown rate, fuel, route, SID/STAR, runways, METARs and more.
- Every field is optional; units are added automatically and previous values are suggested. Notes
  never affect your stats or CSV.
- Sort the Flight Log by which flights have notes.
- **Full Backup (JSON)** — Export saves flights, custom airports *and* notes in one file; Import
  detects it and restores everything.
- **Function-test** — a quick health check of the app in your browser that shows only what failed,
  with a one-tap bug-report link.
- Built-in airport database roughly doubled (Africa, South America, Oceania, Eastern Europe, and
  famous smaller fields).
- The *Flights per Year* card shows your most recent 10 years; expand it for your full history.

## v2.1 — 2026-07-05
Make the filter bar your own.

- **Customize the filter bar** — choose which filters sit on the bar for one-tap access, up to 6
  from the full set of 20. Everything else stays in **More**.
- Chips appear in the order you tick them, and your choice is saved on your device.
- Nothing changes until you press **Done**; select none (or **↺ Clear selection**) for the default six.

## v2.0 — 2026-07-02
A big upgrade to filtering.

- **Advanced filters panel** — a **More** button opens the full set, grouped by category. The 6
  quick chips stay on the bar, and the two stay in sync.
- Filter **departure / arrival** separately for airports, cities, countries and continents; by
  within-a-continent vs across-continents; and by **flight duration** (buckets or a custom range).
- **Presets** — one-click combinations like *Inter-continental long-haul* or *Domestic short hops*.
- **Save your own presets** with a name; remembered on your device, editable and deletable anytime.
- Long dropdowns gain a search box, and options narrow by geography as you pick.
- Click a bar in an expanded *Top Routes / Airports / Cities* card to filter the dashboard to it.
- Plus various bug fixes.

## v1.9 — 2026-07-01
- **Add missing airports right from Data check** — each unrecognized airport gets a **+ Add** button
  that opens a small form with the ICAO pre-filled, plus a built-in link to look up its coordinates.
- **Back to top** — a small **↑** button appears in the filter bar as you scroll.
- Cleaner, shorter header on the first (empty) screen on phones.
- Plus various bug fixes.

## v1.8 — 2026-07-01
- **Tidier header** — just **+ Add Flight** plus two compact menus: **≡** (Search, Data check,
  Import, Export, Clear all) and **⚙️** (theme and status).
- **Data check** — lists any airports or aircraft in your log that aren't in the dataset, and lets
  you look up whether a given airport is recognized.
- Theme is now an explicit **Auto / Light / Dark** choice.
- A **Clear all** button appears next to the collapsed filter bar whenever filters are active.
- Plus various small improvements.

## v1.7 — 2026-06-30
- **Click to filter** — click a bar or point in any expanded chart card to filter the whole
  dashboard to it; click it again to clear.
- Expanded Year / Month / Weekday charts show flights, total time and your top airlines on hover.
- **Sticky filter bar** — the bar stays pinned to the top as you scroll.
- **Sharper 3D globe** — higher-resolution Earth texture and finer country borders, plus a
  **⏸ / ▶** button to pause rotation.
- Plus various bug fixes.

## v1.6 — 2026-06-30
- **Try it with sample data.** Load a built-in sample flight log in one click (or download it as
  a CSV template) to explore the dashboard before importing your own.

## v1.5 — 2026-06-07
- Map display improvements, consolidated airport data, and various UX fixes.

## v1.3 – v1.4 — 2026-05-28
- Design and accessibility polish from a full design review.
- README published in three languages (English / 日本語 / 简体中文).

## v1.0 — initial release
- Flight log dashboard: stats, charts, a 2D route map, a 3D globe, filters, year-over-year
  comparison, CSV import / export, and light / dark themes — all stored locally, no signup.

---

_Smaller or internal updates (e.g. v1.1–v1.2) aren't listed individually._
