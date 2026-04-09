import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { FiMapPin } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';

const statusColor = {
  normal:  '#00A86B',
  alert:   '#F59E0B',
  severe:  '#EF4444',
  offline: '#7A8BA0',
};

function FitBounds({ stations }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length > 0) {
      const valid = stations.filter(s => s.lat && s.lon);
      if (valid.length > 0) {
        const bounds = valid.map(s => [s.lat, s.lon]);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [stations, map]);
  return null;
}

function MapView({ api }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [counts, setCounts] = useState({ normal: 0, alert: 0, severe: 0, offline: 0 });

  useEffect(() => {
    setLoading(true);
    fetch(`${api}/stations?limit=500&page=1`)
      .then(r => r.json())
      .then(data => {
        const all = data.stations || [];
        setStations(all);
        setCounts({
          normal:  all.filter(s => s.status === 'normal').length,
          alert:   all.filter(s => s.status === 'alert').length,
          severe:  all.filter(s => s.status === 'severe').length,
          offline: all.filter(s => s.status === 'offline').length,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [api]);

  const filtered = filter === 'all'
    ? stations.filter(s => s.lat && s.lon)
    : stations.filter(s => s.status === filter && s.lat && s.lon);

  return (
    <div>
      {/* Map Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12, flexWrap: 'wrap'
      }}>
        {[
          { key: 'all',     label: 'All Stations', count: stations.filter(s=>s.lat&&s.lon).length },
          { key: 'severe',  label: 'Severe',        count: counts.severe  },
          { key: 'alert',   label: 'Alert',         count: counts.alert   },
          { key: 'normal',  label: 'Normal',        count: counts.normal  },
          { key: 'offline', label: 'Offline',       count: counts.offline },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: '1px solid',
              borderColor: filter === key
                ? (statusColor[key] || '#00A86B')
                : 'rgba(255,255,255,0.08)',
              background: filter === key
                ? (statusColor[key] || '#00A86B') + '20'
                : 'transparent',
              color: filter === key
                ? (statusColor[key] || '#00A86B')
                : '#7A8BA0',
              fontSize: 12, cursor: 'pointer',
              fontFamily: 'Segoe UI, sans-serif', fontWeight: 600,
              transition: 'all 0.15s'
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: statusColor[key] || '#00A86B',
              display: 'inline-block'
            }} />
            {label}
            <span style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '1px 7px',
              fontSize: 10, fontWeight: 700
            }}>{count}</span>
          </button>
        ))}
        {loading && (
          <span style={{ fontSize: 11, color: '#7A8BA0', marginLeft: 8 }}>
            Loading stations...
          </span>
        )}
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer
          center={[52.5, -1.5]}
          zoom={6}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {filtered.length > 0 && <FitBounds stations={filtered} />}

          {filtered.map(s => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lon]}
              radius={selected?.id === s.id ? 10 : 6}
              pathOptions={{
                color: statusColor[s.status],
                fillColor: statusColor[s.status],
                fillOpacity: 0.85,
                weight: selected?.id === s.id ? 2 : 1,
              }}
              eventHandlers={{ click: () => setSelected(s) }}
            >
              <Popup>
                <div style={{
                  background: '#0D1F35',
                  color: '#E8EDF4',
                  borderRadius: 10,
                  padding: '14px 16px',
                  minWidth: 0,
                  width: 'min(220px, 68vw)',
                  fontFamily: 'Segoe UI, sans-serif'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      background: statusColor[s.status] + '25',
                      color: statusColor[s.status],
                      fontSize: 9, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 8,
                      textTransform: 'uppercase'
                    }}>{s.status}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#7A8BA0', marginBottom: 10 }}>
                    {s.river} · {s.town}
                  </div>
                  <div className="map-popup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['Station ID', s.id],
                      ['Level', s.level !== null ? s.level + ' m' : 'Offline'],
                      ['Readings', s.readings?.toLocaleString()],
                      ['Last Read', s.lastReading?.replace('T',' ').slice(0,16) || 'N/A'],
                    ].map(([label, value]) => (
                      <div key={label} style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 8, padding: '8px 10px'
                      }}>
                        <div style={{ fontSize: 9, color: '#7A8BA0', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Courier New' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {s.level !== null && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min((s.level / 3) * 100, 100)}%`,
                          height: '100%',
                          background: statusColor[s.status],
                          borderRadius: 4
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: '#7A8BA0', marginTop: 3, textAlign: 'right' }}>
                        {s.level}m / 3.0m
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 20, marginTop: 10,
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10
      }}>
        {Object.entries(statusColor).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7A8BA0' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ textTransform: 'capitalize' }}>{status}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#7A8BA0' }}>
          <FiMapPin size={12} style={{ marginRight: 4 }} />
          Click any marker for details
        </div>
      </div>
    </div>
  );
}

export default MapView;
