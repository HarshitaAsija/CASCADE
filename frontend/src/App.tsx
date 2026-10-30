import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function App() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [77.23, 28.63],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    return () => map.remove();
  }, []);

  return <div ref={container} className="map" aria-label="Map centred on New Delhi" />;
}
