// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FlightMemoModal } from './FlightMemoModal';
import { memoStore } from '../../lib/memo-store';
import type { StoredFlight } from '../../lib/datasource';

// メモパネルの「操作契約」を凍結する UI テスト（オーナー指定の挙動）：
//   ①メモ無しで開く → いきなり編集モード／メモ有りで開く → 閲覧モード＋ Edit ボタン
//   ②全項目任意入力（書いた分だけ保存・空項目は落ちる）。単位は数値だけの入力に表示時自動付与。
//   ③閲覧モードは未入力項目も空欄（—）として全表示（紙のフライトログ風・オーナー指定 2026-07-07）。
//   ④保存は memo-store（フライト id 紐づけ）へ。統計・CSV には触れない。
// 保存層のロジック本体は memo-store.test.ts、単位付与ロジックは memo-config.test.ts が担当。

const FLIGHT: StoredFlight = {
  id: 'test-id', no: 1, date: '2025-01-01', dep: 'RJTT', arr: 'RJOO', ac: 'B738', al: 'ANA', t: '1h00m',
};

beforeEach(() => {
  localStorage.clear();
  memoStore.clearAll();
});
afterEach(cleanup);

describe('FlightMemoModal', () => {
  it('メモ無しで開くと編集モード（Save Notes ボタンと入力欄がある）', () => {
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Save Notes' })).toBeInTheDocument();
    expect(screen.getByLabelText('V1 (kt)')).toBeInTheDocument(); // 単位つき項目はラベルに (kt) を明示
    expect(screen.getByLabelText('Departure runway')).toBeInTheDocument();
    // 日付 LOC はネイティブ日付ピッカー。UTC は自動換算（A案・2026-07-11）＝入力欄ではなく auto 表示
    expect(screen.getByLabelText('Departure date · LOC')).toHaveAttribute('type', 'date');
    expect(screen.queryByLabelText('Arrival date · UTC')).not.toBeInTheDocument();
    expect(screen.getByText('Arrival date · UTC')).toBeInTheDocument(); // auto 項目として存在はする
  });

  it('UTC 欄は LOC 入力から自動換算される（RJTT/RJOO＝+9：12:09 → 03:09）', () => {
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Pushback (OUT) · LOC'), { target: { value: '12' } });
    fireEvent.change(document.getElementById('memo-outLoc-m')!, { target: { value: '9' } });
    expect(screen.getByText('03:09')).toBeInTheDocument(); // Pushback (OUT) · UTC の auto 表示
  });

  it('時刻（HH:MM）は2箱入力＝箱に入れると正準形 "09:05" で保存される', () => {
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    // ラベルは時間側の箱（-h）に紐づく。分側は id で取得。
    fireEvent.change(screen.getByLabelText('Pushback (OUT) · LOC'), { target: { value: '9' } });
    fireEvent.change(document.getElementById('memo-outLoc-m')!, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Notes' }));
    expect(memoStore.get('test-id')?.fields.outLoc).toBe('09:05');
  });

  it('Taxi out/in は h+m の2箱＝分だけなら "12m"、1時間超は "1h05m" で保存される', () => {
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    fireEvent.change(document.getElementById('memo-taxiOut-m')!, { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Taxi in'), { target: { value: '1' } });   // h 箱
    fireEvent.change(document.getElementById('memo-taxiIn-m')!, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Notes' }));
    expect(memoStore.get('test-id')?.fields.taxiOut).toBe('12m');
    expect(memoStore.get('test-id')?.fields.taxiIn).toBe('1h05m');
  });

  it('記入して Save → memo-store に保存され閲覧モードへ（空項目は保存されない・数値には単位を自動付与）', () => {
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('V1 (kt)'), { target: { value: '148' } });
    fireEvent.change(screen.getByLabelText('Free notes'), { target: { value: 'smooth landing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Notes' }));
    expect(memoStore.get('test-id')?.fields).toEqual({ v1: '148', notes: 'smooth landing' }); // 保存は素の値
    // 閲覧モードに切り替わる：Edit ボタンが出て、数値だけの V1 は「148 kt」と単位つきで表示される
    expect(screen.getByRole('button', { name: '✏️ Edit' })).toBeInTheDocument();
    expect(screen.getByText('148 kt')).toBeInTheDocument();
    expect(screen.getByText('smooth landing')).toBeInTheDocument();
  });

  it('メモ有りで開くと閲覧モード（全項目表示・未入力は空欄 —）', () => {
    memoStore.save('test-id', { rwyArr: '32L' });
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: '✏️ Edit' })).toBeInTheDocument();
    expect(screen.getByText('32L')).toBeInTheDocument();
    // 未記入のセクション・項目も空欄として出す（紙のフライトログ風）
    expect(screen.getByText('Flight Info')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Save Notes' })).not.toBeInTheDocument();
  });

  it('閲覧モードで Edit → 編集モードに入り既存値が入っている', () => {
    memoStore.save('test-id', { v1: '148' });
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '✏️ Edit' }));
    expect(screen.getByLabelText('V1 (kt)')).toHaveValue('148');
  });

  it('編集モードの入力に過去の入力値が候補として出る（Add Flight と同じ操作感）', () => {
    memoStore.save('other-flight', { callsign: 'ANA57' });
    render(<FlightMemoModal flight={FLIGHT} onClose={() => {}} />);
    fireEvent.focus(screen.getByLabelText('Callsign'));
    expect(screen.getByText('ANA57')).toBeInTheDocument(); // 候補リストに過去値
  });

  it('変更せず ✕ で閉じると onClose（確認は出ない）', () => {
    const onClose = vi.fn();
    memoStore.save('test-id', { v1: '148 kt' });
    render(<FlightMemoModal flight={FLIGHT} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('flight=null なら何も描画しない', () => {
    const { container } = render(<FlightMemoModal flight={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  // ---- draftMode（Add Flight の「Add Notes」導線・オーナー指定 2026-07-11）----
  // フライト未保存の下書き状態：確定ボタンは「Add Flight」、Cancel は「Back」。
  // memo-store には直接触れず、onCommit(正準化済み fields) に渡して親が一緒に保存する。
  it('draftMode: 編集モードで開き、ボタンは Back / Add Flight（Save Notes は出ない）', () => {
    render(<FlightMemoModal flight={{ ...FLIGHT, id: '' }} onClose={() => {}} draftMode onCommit={() => {}} />);
    expect(screen.getByRole('button', { name: 'Add Flight' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Notes' })).not.toBeInTheDocument();
  });

  it('draftMode: Add Flight で onCommit(fields) が呼ばれ、memo-store には直接保存しない', () => {
    const onCommit = vi.fn();
    render(<FlightMemoModal flight={{ ...FLIGHT, id: '' }} onClose={() => {}} draftMode onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('V1 (kt)'), { target: { value: '148' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Flight' }));
    expect(onCommit).toHaveBeenCalledWith({ v1: '148' });
    expect(Object.keys(memoStore.all())).toHaveLength(0); // 保存は親（AddFlightModal）の責務
  });

  it('draftMode: 何も書かず Back → 確認なしで onClose（＝フォームへ戻る）', () => {
    const onClose = vi.fn();
    render(<FlightMemoModal flight={{ ...FLIGHT, id: '' }} onClose={onClose} draftMode onCommit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
