import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { FiTrendingUp, FiDownload, FiAlertTriangle, FiActivity } from 'react-icons/fi';

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
  const stationSummaries = stations.map((st) => {
    const series = st.readings || [];
    const latest = series[series.length - 1]?.value;
    const previous = series[series.length - 2]?.value;
    const peak = Math.max(...series.map((point) => point.value ?? 0), 0);

    return {
      name: st.river || st.label,
      latest,
      previous,
      peak,
      delta: latest !== undefined && previous !== undefined
        ? latest - previous
        : null,
    };
  }).filter((item) => item.latest !== undefined);

  const peakStation = stationSummaries.reduce((best, current) =>
    !best || current.peak > best.peak ? current : best, null);
  const risingStation = stationSummaries
    .filter((item) => item.delta !== null)
    .reduce((best, current) =>
      !best || current.delta > best.delta ? current : best, null);
  const stationsAboveThreshold = stationSummaries.filter((item) => item.latest >= 1.2).length;
  const chartMax = Math.max(
    1.2,
    ...chartData.flatMap((entry) => keys.map((key) => entry[key] ?? 0))
  );
  const yDomainMax = Math.max(1.5, Math.ceil((chartMax + 0.15) * 10) / 10);

  const rangeOptions = [
    { key: '24h', label: '24h' },
    { key: '7d',  label: '7d'  },
    { key: '30d', label: '30d' },
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
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

      {!loading && chartData.length > 0 && (
        <div className="chart-metrics">
          <div className="chart-metric-card">
            <span className="chart-metric-label">Peak in range</span>
            <div className="chart-metric-value" style={{ color: '#00A86B' }}>
              {peakStation ? `${peakStation.peak.toFixed(2)}m` : '—'}
            </div>
            <div className="chart-metric-sub">{peakStation?.name || 'No station data'}</div>
          </div>

          <div className="chart-metric-card">
            <span className="chart-metric-label">Above alert threshold</span>
            <div className="chart-metric-value" style={{ color: stationsAboveThreshold > 0 ? '#F59E0B' : '#3B82F6' }}>
              {stationsAboveThreshold}
            </div>
            <div className="chart-metric-sub">Current stations over 1.2m</div>
          </div>

          <div className="chart-metric-card">
            <span className="chart-metric-label">Fastest movement</span>
            <div className="chart-metric-value" style={{ color: (risingStation?.delta ?? 0) > 0 ? '#EF4444' : '#3B82F6' }}>
              {risingStation?.delta !== null && risingStation?.delta !== undefined
                ? `${risingStation.delta > 0 ? '+' : ''}${risingStation.delta.toFixed(2)}m`
                : '—'}
            </div>
            <div className="chart-metric-sub">{risingStation?.name || 'No delta available'}</div>
          </div>
        </div>
      )}

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
          <div className="chart-signal-banner">
            <div className="chart-signal-copy">
              <FiAlertTriangle size={13} style={{ color: '#F59E0B' }} />
              <span>
                Alert threshold set at <strong>1.2m</strong>. Rising lines entering the amber zone need immediate review.
              </span>
            </div>
            <div className="chart-signal-status">
              <FiActivity size={12} />
              <span>{stationsAboveThreshold} high-risk signals</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}
              margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                {keys.map((key, i) => (
                  <linearGradient key={key} id={`g${i}`}
                    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS[i]} stopOpacity={0.16}/>
                    <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <ReferenceArea
                y1={1.2}
                y2={yDomainMax}
                fill="rgba(245,158,11,0.07)"
                ifOverflow="extendDomain"
              />
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
                domain={[0, yDomainMax]}
                tickFormatter={v => `${v}m`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={1.2} stroke="#EF4444"
                strokeDasharray="4 4" strokeOpacity={0.5}
                label={{ value: 'Alert 1.2m', fill: '#EF4444',
                  fontSize: 9 }}
              />
              {keys.map((key, i) => (
                <React.Fragment key={key}>
                  <Area type="monotone" dataKey={key}
                  stroke="none"
                  fill={`url(#g${i})`} dot={false}
                  connectNulls
                  />
                  <Line type="monotone" dataKey={key}
                    stroke={COLORS[i]} strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: COLORS[i] }}
                    connectNulls
                  />
                </React.Fragment>
              ))}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend + last values */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14,
            flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between' }}>
            <div className="chart-legend-row">
              {stations.map((st, i) => {
                const lastVal = st.readings[st.readings.length - 1]?.value;
                const prevVal = st.readings[st.readings.length - 2]?.value;
                const delta = lastVal !== undefined && prevVal !== undefined
                  ? lastVal - prevVal
                  : null;
                return (
                  <div key={st.station_id} className="chart-legend-pill">
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
                    {delta !== null && (
                      <span style={{
                        color: delta > 0 ? '#EF4444' : '#3B82F6',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        fontWeight: 600
                      }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="chart-legend-pill">
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
