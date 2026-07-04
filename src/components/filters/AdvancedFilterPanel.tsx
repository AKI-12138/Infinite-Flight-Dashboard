import { useState } from 'react';
import { FILTER_DEFS, type FilterDef } from '../../lib/filters-config';
import { filterStore } from '../../lib/filter-store';
import { useFilterVersion } from '../../hooks/useFilterState';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import type { FilterOptionsMap } from '../../lib/filter-options';
import { showToast } from '../../lib/toast';
import { FilterChip } from './FilterChip';
import { SavePresetModal } from './SavePresetModal';

const _DEF_BY_KEY: Record<string, FilterDef> = Object.fromEntries(FILTER_DEFS.map((d) => [d.key, d]));

// 高度パネルのカテゴリ構成（旧 index.html の adv-section）。key＝FILTER_DEFS の key、emoji は markup 準拠。
type ChipSpec = { key: string; emoji: string; title?: string };
const _SECTIONS: { label: string; chips: ChipSpec[] }[] = [
  { label: 'Date', chips: [{ key: 'year', emoji: '🗓️' }, { key: 'month', emoji: '📅' }, { key: 'weekday', emoji: '📆' }] },
  { label: 'Airport', chips: [{ key: 'airports', emoji: '📍' }, { key: 'depAirport', emoji: '🛫' }, { key: 'arrAirport', emoji: '🛬' }] },
  { label: 'Cities', chips: [{ key: 'city', emoji: '🏙️' }, { key: 'depCity', emoji: '🛫' }, { key: 'arrCity', emoji: '🛬' }] },
  { label: 'Countries / Regions', chips: [{ key: 'country', emoji: '🏞️' }, { key: 'depCountry', emoji: '🛫' }, { key: 'arrCountry', emoji: '🛬' }, { key: 'scope', emoji: '🌐', title: 'Domestic = same country/region, International = crosses borders' }] },
  { label: 'Continents', chips: [{ key: 'continent', emoji: '🗺️' }, { key: 'depContinent', emoji: '🌍' }, { key: 'arrContinent', emoji: '🌏' }, { key: 'contScope', emoji: '🧭' }] },
  { label: 'Aircraft / Airline', chips: [{ key: 'aircraft', emoji: '✈️' }, { key: 'airline', emoji: '🏢' }] },
  { label: 'Time', chips: [{ key: 'duration', emoji: '⏱️' }] },
];

// ⚙️ 高度フィルターパネル（旧 #advFilterOverlay）。プリセット＋Saved＋全軸チップ。
// 背景クリックでは閉じない（誤操作でフィルタを失わない）。✕ / ESC / Done で閉じる。
export function AdvancedFilterPanel({ open, onClose, options }: { open: boolean; onClose: () => void; options: FilterOptionsMap }) {
  useFilterVersion();
  const [editMode, setEditMode] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const modalRef = useModalKeyboard(open, onClose);

  if (!open) return null;

  const custom = filterStore.getCustomPresets();
  const openSave = () => {
    if (filterStore.activeAxisCount() === 0) { showToast('Set some filters first', 'red'); return; }
    setSaveOpen(true);
  };

  return (
    <>
      <div ref={modalRef} className="modal-overlay show" id="advFilterOverlay">
        <div className="modal modal-wide">
          <div className="modal-head">
            <h3>⚙️ Advanced filters</h3>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body adv-modal-body">
            {/* Presets */}
            <div className="adv-section-label">Presets</div>
            <div className="adv-presets">
              {filterStore.presets.map((p) => (
                <button
                  key={p.id} type="button"
                  className={'adv-preset' + (filterStore.isPresetActive(p) ? ' active' : '')}
                  onClick={() => filterStore.applyPreset(p.id)}
                >
                  <span className="adv-preset-emoji">{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            <hr className="adv-divider" />

            {/* Saved（ユーザー保存） */}
            <div className="adv-saved-head">
              <span className="adv-section-label">Saved</span>
              {custom.length > 0 && (
                <button
                  type="button"
                  className={'adv-saved-edit' + (editMode ? ' is-editing' : '')}
                  onClick={() => setEditMode((v) => !v)} title="Edit saved presets"
                >✏️ Edit</button>
              )}
            </div>
            <div className={'adv-presets' + (editMode ? ' is-editing' : '')}>
              {custom.length === 0 ? (
                <button type="button" className="adv-preset adv-saved-add" onClick={openSave} title="Save current filters as a preset">
                  <span className="adv-preset-emoji">＋</span><span>Save current filters</span>
                </button>
              ) : custom.map((p) => (
                <button
                  key={p.id} type="button"
                  className={'adv-preset' + (filterStore.isSavedActive(p) ? ' active' : '')}
                  onClick={() => { if (!editMode) filterStore.applySavedPreset(p.id); }}
                >
                  <span className="adv-preset-emoji">💾</span>
                  <span>{p.name}</span>
                  {editMode && (
                    <span
                      className="adv-preset-del" role="button" tabIndex={0} aria-label="Delete preset" title="Delete"
                      onClick={(e) => { e.stopPropagation(); filterStore.deleteCustomPreset(p.id); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault(); e.stopPropagation();
                          filterStore.deleteCustomPreset(p.id);
                        }
                      }}
                    >✕</span>
                  )}
                </button>
              ))}
            </div>
            <hr className="adv-divider" />

            {/* 全軸チップ（カテゴリ別） */}
            {_SECTIONS.map((sec, i) => (
              <div key={sec.label}>
                <div className="adv-section-label">{sec.label}</div>
                <div className="adv-chips">
                  {sec.chips.map((c) => (
                    <FilterChip key={c.key} def={_DEF_BY_KEY[c.key]} emoji={c.emoji} title={c.title} dataOptions={options[c.key] || []} />
                  ))}
                </div>
                {i < _SECTIONS.length - 1 && <hr className="adv-divider" />}
              </div>
            ))}

            <div className="modal-actions adv-actions">
              <button className="btn-outline" onClick={() => filterStore.clearAll()}>✕ Clear all</button>
              <button className="btn-outline btn-save-preset" onClick={openSave}>💾 Save preset</button>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
      <SavePresetModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </>
  );
}
