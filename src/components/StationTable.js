import React, { useState } from 'react';

const stations = [
  { id: 'F1906',  name: 'Netherside Hall', river: 'River Wharfe',  level: 0.46, status: 'normal'  },
  { id: '2858TH', name: 'Teddington',      river: 'Thames',        level: 1.84, status: 'severe'  },
  { id: 'L3240',  name: 'Worcester',       river: 'Severn',        level: 2.31, status: 'severe'  },
  { id: '4701',   name: 'Nottingham',      river: 'Trent',         level: 1.12, status: 'alert'   },
  { id: '4805',   name: 'York Skelton',    river: 'Ouse',          level: 0.87, status: 'alert'   },
  { id: 'F1171',  name: 'Bewdley',         river: 'Severn',        level: 0.44, status: 'normal'  },
  { id: 'E81324', name: 'Richmond',        river: 'Thames',        level: 0.33, status: 'normal'  },
  { id: 'E1685',  name: 'Exeter St James', river: 'Exe',           level: null, status: 'offline' },
];

function StationTable() {
  const [filter, setFilter] = useState('all');

  const filtered = stations.filter(s =>
    filter === 'all' ? true : s.status === filter
  );

  return (
    <div className="table-card">
      <div className="table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Station Status</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'severe', 'alert', 'normal', 'offline'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 10px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: filter === f ? '#00A86B' : 'rgba(255,255,255,0.08)',
                background: filter === f ? 'rgba(0,168,107,0.12)' : 'transparent',
                color: filter === f ? '#00A86B' : '#7A8BA0',
                fontSize: 11,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Station ID</th>
            <th>Name</th>
            <th>River</th>
            <th>Level (m)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td className="name">{s.name}</td>
              <td>{s.river}</td>
              <td>{s.level !== null ? s.level.toFixed(2) : '—'}</td>
              <td><span className={`badge ${s.status}`}>{s.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StationTable;