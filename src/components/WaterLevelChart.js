import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiDownload } from 'react-icons/fi';

const COLORS = ['#00A86B', '#F59E0B', '#3B82F6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0D1F35',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '10px 14px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <p style={{ color: '#64748B', fontSize: 10, marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: 12,
          marginBottom: 2, fontFamily: 'JetBrains Mono, monospace' }}>
          {p.name}: {p.value?.toFixed(3)}m
        </p>
      ))}
    </div>
  );
};

function WaterLevelChart() {
  const [range, setRange]         = useState('7d');
  const [stations, setStations]   = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback((r) => {
    setLoading(true);
    fetch(`http://127.0.0.1:5000/api/chart/top-stations?range=${r}`)
      .then(res => res.json())
      .then(data => {
        setStations(data);
        const dayMap = {};
        data.forEach(st => {
          st.readings.forEach(reading => {
            if (!dayMap[reading.day]) dayMap[reading.day] = { date: reading.day };
            dayMap[reading.day][st.river || st.label] = reading.value;
          });
        });
        const merged = Object.values(dayMap).sort((a, b) =>
          a.date > b.date ? 1 : -1
        );
        setChartData(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const handleRangeChange = (r) => {
    setRange(r);
    fetchData(r);
  };

  const exportCSV = () => {
    if (!chartData.length) return;
    const keys = stations.map(s => s.river || s.label);
    const header = ['Date', ...keys].join(',');
    const rows = chartData.map(d =>
      [d.date, ...keys.map(k => d[k] ?? '')].join(',')
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `flood-levels-${range}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const keys = stations.map(s => s.river || s.label);

  const rangeOptions = [
    { key: '24h', label: '24h' },
    { key: '7d',  label: '7d'  },
    { key: '30d', label: '30d' },
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          <FiTrendingUp size={13} style={{ color: '#00A86B' }} />
          Water Level Trend
          {loading && (
            <span style={{ fontSize: 10, color: '#64748B',
              fontWeight: 400, marginLeft: 8 }}>
              Loading...
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Range buttons */}
          <div style={{ display: 'flex', gap: 3 }}>
            {rangeOptions.map(r => (
              <button key={r.key} onClick={() => handleRangeChange(r.key)}
                style={{
                  padding: '3px 10px', borderRadius: 6,
                  border: '1px solid',
                  borderColor: range === r.key
                    ? 'rgba(0,168,107,0.4)'
                    : 'rgba(255,255,255,0.06)',
                  background: range === r.key
                    ? 'rgba(0,168,107,0.12)'
                    : 'transparent',
                  color: range === r.key ? '#00A86B' : '#64748B',
                  fontSize: 11, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                  transition: 'all 0.15s'
                }}>{r.label}</button>
            ))}
          </div>

          {/* Export CSV */}
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'transparent',
            color: '#64748B', fontSize: 11, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontWeight: 500,
            transition: 'all 0.15s'
          }}>
            <FiDownload size={11} /> CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#64748B', fontSize: 12 }}>
          Fetching real readings from database...
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#64748B', fontSize: 12 }}>
          No data available for this range
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}
              margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                {keys.map((key, i) => (
                  <linearGradient key={key} id={`g${i}`}
                    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS[i]} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748B', fontSize: 10,
                  fontFamily: 'Inter' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
                tickFormatter={v => {
                  if (range === '24h') return v?.slice(11,16);
                  if (range === '30d') return v?.slice(5);
                  return v?.slice(5);
                }}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 10,
                  fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}m`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={1.2} stroke="#EF4444"
                strokeDasharray="4 4" strokeOpacity={0.5}
                label={{ value: 'Alert 1.2m', fill: '#EF4444',
                  fontSize: 9 }}
              />
              {keys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key}
                  stroke={COLORS[i]} strokeWidth={1.5}
                  fill={`url(#g${i})`} dot={false}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend + last values */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10,
            flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {stations.map((st, i) => {
                const lastVal = st.readings[st.readings.length - 1]?.value;
                return (
                  <div key={st.station_id} style={{ display: 'flex',
                    alignItems: 'center', gap: 5,
                    fontSize: 11, color: '#64748B' }}>
                    <div style={{ width: 16, height: 2,
                      background: COLORS[i], borderRadius: 2 }} />
                    <span>{st.river || st.label}</span>
                    {lastVal !== undefined && (
                      <span style={{ color: COLORS[i],
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10, fontWeight: 600 }}>
                        {lastVal?.toFixed(2)}m
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center',
                gap: 5, fontSize: 11, color: '#64748B' }}>
                <div style={{ width: 16, height: 2,
                  background: '#EF4444', borderRadius: 2,
                  opacity: 0.5 }} />
                Alert threshold
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#64748B',
              fontFamily: 'JetBrains Mono, monospace' }}>
              {chartData.length} data points · Live DB
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default WaterLevelChart;