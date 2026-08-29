// @vitest-environment jsdom
//
// datasource.ts のテスト。旧版に対応する .test.html は無いため新規作成。
// DataSource（単一境界）の CRUD・採番・重複排除・localStorage 保存/復元・購読を検証する。
// jsdom 環境で localStorage / sessionStorage を用意し、vi.resetModules() で
// 「タブを開き直した新規起動」を再現して load() の復元を確認する。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Flight } from './compute';

type DS = typeof import('./datasource').DataSource;
let ds: DS;

// 各テストを完全に隔離：ストレージを空にし、モジュール（＝シングルトン状態）を作り直す。
beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
  ds = (await import('./datasource')).DataSource;
});

// テスト用フライト生成ヘルパ（既定値を差分で上書き）。
const F = (o: Partial<Flight> = {}): Flight =>
  ({ date:'2025-01-01', dep:'RJTT', arr:'RJOO', ac:'B738', al:'ANA', t:'1h00m', ...o });

describe('前提：jsdom で localStorage が使える', () => {
  it('isStorageAvailable() === true', () => expect(ds.isStorageAvailable()).toBe(true));
});

describe('CRUD と採番', () => {
  it('addOne → count 1・no=1・dirty', () => {
    ds.addOne(F());
    expect(ds.count).toBe(1);
    expect(ds.flights[0].no).toBe(1);
    expect(ds.dirty).toBe(true);
  });

  it('_renumber：日付昇順にソートして no を 1..n で振り直す', () => {
    ds.addOne(F({ date:'2025-03-01' }));
    ds.addOne(F({ date:'2025-01-01' }));
    ds.addOne(F({ date:'2025-02-01' }));
    expect(ds.flights.map(f => f.date)).toEqual(['2025-01-01','2025-02-01','2025-03-01']);
    expect(ds.flights.map(f => f.no)).toEqual([1,2,3]);
  });

  it('addFlights：重複は skip して {added, duplicates} を返す', () => {
    const a = F({ date:'2025-01-01' });
    const b = F({ date:'2025-02-01' });
    const { added, duplicates } = ds.addFlights([a, b, a]); // 3件目は a の重複
    expect(added.length).toBe(2);
    expect(duplicates.length).toBe(1);
    expect(ds.count).toBe(2);
  });

  // --- updateOne（Edit Flight・フェーズO）---
  // この API の存在理由は「消して追加し直す」を不要にすること＝**id が変わらない**のが本体の契約。
  // id が変わるとメモ（memo-store は id キー）との紐づけが切れる。
  it('updateOne：中身を書き換えても id と、その便を指す紐づけが変わらない', () => {
    const stored = ds.addOne(F({ date:'2025-01-01', t:'1h00m' }));
    const id = stored.id;
    const r = ds.updateOne(id, F({ date:'2025-01-01', t:'2h30m' }));
    expect(r).not.toBeNull();
    expect(ds.count).toBe(1);           // 追加ではなく上書き
    expect(ds.flights[0].id).toBe(id);  // ← 契約の本体
    expect(ds.flights[0].t).toBe('2h30m');
  });

  it('updateOne：日付を変えると並び順と no が振り直される', () => {
    const a = ds.addOne(F({ date:'2025-01-01', dep:'RJTT' }));
    ds.addOne(F({ date:'2025-02-01', dep:'RJOO' }));
    ds.addOne(F({ date:'2025-03-01', dep:'RJCC' }));
    expect(a.no).toBe(1);
    // 1件目を最後の日付へ動かす → 3番目になる（no も 3）。
    ds.updateOne(a.id, F({ date:'2025-04-01', dep:'RJTT' }));
    expect(ds.flights.map(f => f.date)).toEqual(['2025-02-01','2025-03-01','2025-04-01']);
    expect(ds.flights.map(f => f.no)).toEqual([1,2,3]);
    const moved = ds.flights.find(f => f.id === a.id)!;
    expect(moved.no).toBe(3);
  });

  it('updateOne：存在しない id は null を返し、何も変えない', () => {
    ds.addOne(F());
    expect(ds.updateOne('no-such-id', F({ t:'9h00m' }))).toBeNull();
    expect(ds.count).toBe(1);
    expect(ds.flights[0].t).toBe('1h00m');
  });

  it('updateOne：no ではなく id で対象を選ぶ（no は日付編集で別便を指しうる）', () => {
    const a = ds.addOne(F({ date:'2025-03-01', dep:'AAAA' }));
    ds.addOne(F({ date:'2025-01-01', dep:'BBBB' }));
    // 日付順の再採番で a は no=2 に落ちている。id で引けば正しく a が更新される。
    expect(a.no).toBe(2);
    ds.updateOne(a.id, F({ date:'2025-03-01', dep:'CCCC' }));
    expect(ds.flights.find(f => f.id === a.id)!.dep).toBe('CCCC');
    expect(ds.flights.find(f => f.dep === 'BBBB')).toBeTruthy(); // 巻き添えなし
  });

  it('addFlights({skipDuplicates:false})：重複も追加', () => {
    const a = F();
    const r = ds.addFlights([a, a], { skipDuplicates: false });
    expect(r.added.length).toBe(2);
    expect(ds.count).toBe(2);
  });

  it('removeByIds：no で削除し、削除件数を返す', () => {
    ds.addFlights([F({ date:'2025-01-01' }), F({ date:'2025-02-01' }), F({ date:'2025-03-01' })]);
    const removed = ds.removeByIds([2]); // 2025-02-01
    expect(removed).toBe(1);
    expect(ds.count).toBe(2);
    expect(ds.flights.map(f => f.date)).toEqual(['2025-01-01','2025-03-01']);
    expect(ds.flights.map(f => f.no)).toEqual([1,2]); // 振り直し
  });

  it('clearAll：全消去して件数を返す', () => {
    ds.addFlights([F({ date:'2025-01-01' }), F({ date:'2025-02-01' })]);
    expect(ds.clearAll()).toBe(2);
    expect(ds.count).toBe(0);
  });

  it('replaceAll：丸ごと入れ替え＋採番＋clean 化', () => {
    ds.addOne(F());
    ds.markDirty();
    ds.replaceAll([F({ date:'2025-05-01' }), F({ date:'2025-04-01' })]);
    expect(ds.count).toBe(2);
    expect(ds.flights.map(f => f.date)).toEqual(['2025-04-01','2025-05-01']);
    expect(ds.dirty).toBe(false); // 取り込み直後は clean
  });

  it('addAirports：新規のみ追加、既存はスキップ', () => {
    const added1 = ds.addAirports({ ZZZZ: { lat:1, lng:2, city:'Foo', co:'Japan', ct:'Asia' } });
    const added2 = ds.addAirports({ ZZZZ: { lat:9, lng:9, city:'Foo2', co:'Japan', ct:'Asia' } }); // 既存
    expect(added1).toBe(1);
    expect(added2).toBe(0);
    expect(ds.customAirports.ZZZZ.city).toBe('Foo'); // 上書きされない
  });
});

describe('安定 ID（メモ機能の紐づけ基盤）', () => {
  it('addOne / addFlights / replaceAll：全フライトに一意な id が付く', () => {
    ds.addOne(F({ date:'2025-01-01' }));
    ds.addFlights([F({ date:'2025-02-01' }), F({ date:'2025-03-01' })]);
    const ids = ds.flights.map(f => f.id);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(3); // 一意
  });

  it('addOne は id 付きの StoredFlight を返す（Add + Notes 導線用）', () => {
    const stored = ds.addOne(F());
    expect(stored.id).toBeTruthy();
    expect(ds.flights[0].id).toBe(stored.id);
  });

  it('_renumber で no が振り直されても id は変わらない', () => {
    const a = ds.addOne(F({ date:'2025-03-01' }));
    ds.addOne(F({ date:'2025-01-01' })); // 追加で a の no は 1→2 にずれる
    const after = ds.flights.find(f => f.id === a.id)!;
    expect(after.no).toBe(2);
    expect(after.id).toBe(a.id);
  });

  it('replaceAll：入力に id があれば維持する（フルバックアップ復元）', () => {
    ds.replaceAll([{ ...F(), id: 'keep-me' }]);
    expect(ds.flights[0].id).toBe('keep-me');
  });

  it('load()：id 無しの旧データにも id を採番する（マイグレーション）', async () => {
    // 旧フォーマット（id 無し）を直接 localStorage に置いて復元させる
    localStorage.setItem('if-dashboard:flights:v1', JSON.stringify([{ ...F(), no: 1 }]));
    vi.resetModules();
    const fresh = (await import('./datasource')).DataSource;
    await fresh.load();
    expect(fresh.flights[0].id).toBeTruthy();
  });
});

describe('メモとの削除連動', () => {
  it('removeByIds：消えたフライトのメモも消える（残った便のメモは残る）', async () => {
    const { memoStore } = await import('./memo-store');
    const a = ds.addOne(F({ date:'2025-01-01' }));
    const b = ds.addOne(F({ date:'2025-02-01' }));
    memoStore.save(a.id, { notes: 'A' });
    memoStore.save(b.id, { notes: 'B' });
    ds.removeByIds([a.no]);
    expect(memoStore.has(a.id)).toBe(false);
    expect(memoStore.has(b.id)).toBe(true);
  });

  it('clearAll：メモも全消去', async () => {
    const { memoStore } = await import('./memo-store');
    const a = ds.addOne(F());
    memoStore.save(a.id, { notes: 'A' });
    ds.clearAll();
    expect(memoStore.count).toBe(0);
  });
});

describe('localStorage 保存/復元（新規起動を再現）', () => {
  it('addOne → 別インスタンスで load() すると復元される', async () => {
    ds.addOne(F({ date:'2025-05-01', arr:'RJCC' }));
    ds.addAirports({ ZZZZ: { lat:1, lng:2, city:'Foo', co:'Japan', ct:'Asia' } });

    // タブを開き直した新規起動を再現：モジュールを作り直す（localStorage は残る）
    vi.resetModules();
    const fresh = (await import('./datasource')).DataSource;
    expect(fresh.count).toBe(0); // load 前はメモリ空

    const ok = await fresh.load();
    expect(ok).toBe(true);
    expect(fresh.count).toBe(1);
    expect(fresh.flights[0].arr).toBe('RJCC');
    expect(fresh.customAirports.ZZZZ.city).toBe('Foo');
    expect(fresh.dirty).toBe(false); // 復元直後は clean
  });

  it('データ無しで load() → false', async () => {
    const ok = await ds.load();
    expect(ok).toBe(false);
  });

  it('hasStoredData / storedDataSummary', () => {
    expect(ds.hasStoredData()).toBe(false);
    ds.addFlights([F({ date:'2025-01-01' }), F({ date:'2025-07-15' })]);
    expect(ds.hasStoredData()).toBe(true);
    const sum = ds.storedDataSummary();
    expect(sum?.count).toBe(2);
    expect(sum?.latestDate).toBe('2025-07-15');
    expect(sum?.savedAt instanceof Date).toBe(true);
  });

  it('clearStorage：保存を消す', () => {
    ds.addOne(F());
    expect(ds.hasStoredData()).toBe(true);
    ds.clearStorage();
    expect(ds.hasStoredData()).toBe(false);
  });
});

describe('購読（React useSyncExternalStore 用）', () => {
  it('subscribe：変更で listener が発火、unsubscribe で止まる', () => {
    let calls = 0;
    const unsub = ds.subscribe(() => { calls++; });
    ds.addOne(F());
    expect(calls).toBeGreaterThan(0);
    const after = calls;
    unsub();
    ds.addOne(F({ date:'2025-02-02' }));
    expect(calls).toBe(after); // 解除後は増えない
  });

  it('getVersion：変更のたびに増える', () => {
    const v0 = ds.getVersion();
    ds.addOne(F());
    expect(ds.getVersion()).toBeGreaterThan(v0);
  });
});

describe('ファイル名ヘルパ', () => {
  it('sanitizeFilenamePrefix：許可外を _ に、空は null', async () => {
    const { sanitizeFilenamePrefix } = await import('./datasource');
    expect(sanitizeFilenamePrefix('my log!')).toBe('my_log_');
    expect(sanitizeFilenamePrefix('   ')).toBe(null);
    expect(sanitizeFilenamePrefix('ok-name_1')).toBe('ok-name_1');
  });

  it('buildExportFilename：prefix_YYYY-MM-DD.csv', async () => {
    const { buildExportFilename } = await import('./datasource');
    expect(buildExportFilename('mylog')).toMatch(/^mylog_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('getExportPrefix / setExportPrefix：往復と既定値', async () => {
    const mod = await import('./datasource');
    expect(mod.getExportPrefix('flights')).toBe('flightslog'); // 既定
    mod.setExportPrefix('flights', 'mylog');
    expect(mod.getExportPrefix('flights')).toBe('mylog');
    mod.setExportPrefix('flights', ''); // 空 → 既定に戻る
    expect(mod.getExportPrefix('flights')).toBe('flightslog');
  });
});
