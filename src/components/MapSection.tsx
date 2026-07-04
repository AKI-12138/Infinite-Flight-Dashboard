import { useState } from 'react';
import type { StoredFlight } from '../lib/datasource';
import { MapCard } from './MapCard';
import { MapExpandedOverlay } from './MapExpandedOverlay';
import { GlobeOverlay } from './GlobeOverlay';

// 地図セクション（インライン 2D マップ＋拡大オーバーレイ＋3D Globe）をまとめ、開閉状態を持つ。
// App からはこれ 1 つを（データがある時だけ）マウントする。
export function MapSection({ flights, themePref }: { flights: StoredFlight[]; themePref: string }) {
  const [globeOpen, setGlobeOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);

  return (
    <>
      <MapCard
        flights={flights} themePref={themePref}
        onGlobe={() => setGlobeOpen(true)}
        onExpand={() => setExpandedOpen(true)}
      />
      <MapExpandedOverlay flights={flights} themePref={themePref} open={expandedOpen} onClose={() => setExpandedOpen(false)} />
      <GlobeOverlay flights={flights} themePref={themePref} open={globeOpen} onClose={() => setGlobeOpen(false)} />
    </>
  );
}
