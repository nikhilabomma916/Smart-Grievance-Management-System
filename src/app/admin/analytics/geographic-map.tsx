'use client';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { GrievanceMapMarker } from '@/server/data/analytics';
import { CATEGORY_NAMES } from '@/lib/constants';

interface GeographicMapProps {
  markers: GrievanceMapMarker[];
}

interface LocationCluster {
  latitude: number;
  longitude: number;
  count: number;
  categories: Map<string, number>;
  priorities: Map<string, number>;
  statuses: Map<string, number>;
}

function groupNearbyMarkers(markers: GrievanceMapMarker[]): LocationCluster[] {
  const grouped = new Map<string, LocationCluster>();
  for (const marker of markers) {
    const latitude = Math.round(marker.latitude * 1000) / 1000;
    const longitude = Math.round(marker.longitude * 1000) / 1000;
    const key = `${latitude}:${longitude}`;
    const cluster = grouped.get(key) || {
      latitude,
      longitude,
      count: 0,
      categories: new Map<string, number>(),
      priorities: new Map<string, number>(),
      statuses: new Map<string, number>(),
    };
    cluster.count += 1;
    cluster.categories.set(marker.categoryId, (cluster.categories.get(marker.categoryId) || 0) + 1);
    cluster.priorities.set(marker.priorityLevel || 'UNASSIGNED', (cluster.priorities.get(marker.priorityLevel || 'UNASSIGNED') || 0) + 1);
    cluster.statuses.set(marker.status, (cluster.statuses.get(marker.status) || 0) + 1);
    grouped.set(key, cluster);
  }
  return [...grouped.values()];
}

function clusterColor(cluster: LocationCluster): string {
  if ((cluster.priorities.get('CRITICAL') || 0) > 0) return '#dc2626';
  if ((cluster.priorities.get('HIGH') || 0) > 0) return '#ea580c';
  return '#2563eb';
}

export default function GeographicMap({ markers }: GeographicMapProps) {
  const clusters = groupNearbyMarkers(markers);
  return (
    <MapContainer
      center={[12.9716, 77.5946]}
      zoom={11}
      scrollWheelZoom={false}
      className="h-[460px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {clusters.map((cluster) => {
        const categories = [...cluster.categories.entries()]
          .map(([categoryId, count]) => `${CATEGORY_NAMES[categoryId] || categoryId}: ${count}`)
          .join(', ');
        const priorities = [...cluster.priorities.entries()]
          .map(([priority, count]) => `${priority}: ${count}`)
          .join(', ');
        const statuses = [...cluster.statuses.entries()]
          .map(([status, count]) => `${status.replace(/_/g, ' ')}: ${count}`)
          .join(', ');
        return (
          <CircleMarker
            key={`${cluster.latitude}:${cluster.longitude}`}
            center={[cluster.latitude, cluster.longitude]}
            radius={Math.min(28, 8 + cluster.count * 2)}
            pathOptions={{ color: clusterColor(cluster), fillColor: clusterColor(cluster), fillOpacity: 0.55, weight: 1 }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{cluster.count} complaint{cluster.count === 1 ? '' : 's'} in this area</p>
                <p><strong>Categories:</strong> {categories}</p>
                <p><strong>Priorities:</strong> {priorities}</p>
                <p><strong>Statuses:</strong> {statuses}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
