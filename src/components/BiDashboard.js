import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
  Cell
} from 'recharts';
import { FiDownload, FiDatabase, FiDroplet, FiClock, FiTrendingUp } from 'react-icons/fi';

const API = 'http://127.0.0.1:5000/api';
const COLORS = ['#00A86B','#3B82F6','#F59E0B','#EF4444','#8B5CF6',
                 '#06B6D4','#EC4899','#10B981','#F97316','#6366F1',
                 '#84CC16','#14B8A6','#FB923C','#A78BFA','#34D399'];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0D1F35', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '10px 14px', fontFamily: 'Inter, sans-serif'
    }}>
      <p style={{ color: '#64748B', fontSize: 10, marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, marginBottom: 2,
          fontFamily: 'JetBrains Mono, monospace' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}{unit}
        </p>
      ))}
    </div>
  );
};

function BiDashboard() {
  const [catchment, setCatchment] = useState([]);
  const [hourly, setHourly]       = useState([]);
  const [rainfall, setRainfall]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('catchment');

  useEffect(() => {
    Promise.allSettled([
      fetchJson(`${API}/bi/catchment-summary`),
      fetchJson(`${API}/bi/hourly-pattern`),
      fetchJson(`${API}/rainfall`),
    ]).then(([catchmentResult, hourlyResult, rainfallResult]) => {
      if (catchmentResult.status === 'fulfilled') {
        setCatchment(catchmentResult.value);
      }

      if (hourlyResult.status === 'fulfilled') {
        setHourly(hourlyResult.value);
      }

      if (rainfallResult.status === 'fulfilled') {
        const latestStations = [...rainfallResult.value]
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 12);
        setRainfall(latestStations);
      }

      const failed = [
        catchmentResult.status !== 'fulfilled' ? 'river catchments' : null,
        hourlyResult.status !== 'fulfilled' ? 'hourly pattern' : null,
        rainfallResult.status !== 'fulfilled' ? 'rainfall feed' : null,
      ].filter(Boolean);

      if (failed.length) {
        setError(`Some BI sources failed to load: ${failed.join(', ')}.`);
      }

      setLoading(false);
    }).catch(() => {
      setError('BI data could not be loaded.');
      setLoading(false);
    });
  }, []);

  const tabs = [
    { key: 'catchment', label: 'River Catchments', icon: <FiDroplet size={12}/> },
    { key: 'hourly',    label: 'Hourly Pattern',   icon: <FiClock size={12}/> },
    { key: 'rainfall',  label: 'Rainfall Feed',    icon: <FiTrendingUp size={12}/> },
    { key: 'export',    label: 'Data Export',      icon: <FiDownload size={12}/> },
  ];

  return (
    <div style={{ marginBottom: 14 }}>
      {/* BI Header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 4 }}>
              <FiDatabase size={14} style={{ color: '#00A86B' }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0' }}>
                Business Intelligence Layer
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#00A86B',
                background: 'rgba(0,168,107,0.15)', padding: '2px 8px',
                borderRadius: 4, letterSpacing: '0.05em'
              }}>LIVE DB</span>
            </div>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
              Aggregated insights from 2.3M readings · 5 SQL BI views ·
              Real-time EA rainfall feed
            </p>
          </div>
          <a href={`${API}/export/stations`} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid rgba(0,168,107,0.3)',
            background: 'rgba(0,168,107,0.1)',
            color: '#00A86B', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', fontFamily: 'Inter, sans-serif'
          }}>
            <FiDownload size={13}/> Export All Stations CSV
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: 4, width: 'fit-content'
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7, border: '1px solid',
            borderColor: activeTab === t.key
              ? 'rgba(0,168,107,0.35)' : 'transparent',
            background: activeTab === t.key
              ? 'rgba(0,168,107,0.1)' : 'transparent',
            color: activeTab === t.key ? '#00A86B' : '#64748B',
            fontSize: 11, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontWeight: 500,
            transition: 'all 0.15s'
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#64748B',
          fontSize: 12, padding: '40px 0' }}>
          Loading BI data from database...
        </div>
      )}

      {!loading && error && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid rgba(245, 158, 11, 0.28)',
          background: 'rgba(245, 158, 11, 0.08)',
          color: '#F59E0B',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif'
        }}>
          {error}
        </div>
      )}

      {/* Catchment Summary */}
      {!loading && activeTab === 'catchment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12 }}>

          {/* Bar chart */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '16px 20px'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600,
              color: '#E2E8F0', marginBottom: 14 }}>
              Stations per River (Top 15)
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={catchment}
                margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="river"
                  tick={{ fill: '#64748B', fontSize: 9,
                    fontFamily: 'Inter' }}
                  angle={-45} textAnchor="end"
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip unit=" stations"/>}/>
                <Bar dataKey="station_count" name="Stations"
                  radius={[4,4,0,0]}>
                  {catchment.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status breakdown table */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '16px 20px'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600,
              color: '#E2E8F0', marginBottom: 14 }}>
              River Status Breakdown
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 300 }}>
              <table style={{ width: '100%',
                borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['River','Stations','Avg (m)',
                      'Peak (m)','Severe','Alert','Normal'].map(h => (
                      <th key={h} style={{ padding: '6px 8px',
                        textAlign: 'left', fontSize: 9,
                        color: '#64748B', textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontFamily: 'Inter, sans-serif', fontWeight: 600
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catchment.map((r, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <td style={{ padding: '7px 8px', color: '#E2E8F0',
                        fontWeight: 500, fontSize: 11,
                        fontFamily: 'Inter, sans-serif' }}>
                        {r.river}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#3B82F6',
                        fontFamily: 'JetBrains Mono, monospace' }}>
                        {r.station_count}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#00A86B',
                        fontFamily: 'JetBrains Mono, monospace' }}>
                        {r.avg_level?.toFixed(2) || '—'}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#F59E0B',
                        fontFamily: 'JetBrains Mono, monospace' }}>
                        {r.peak_level?.toFixed(2) || '—'}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#EF4444',
                        fontFamily: 'JetBrains Mono, monospace' }}>
                        {r.severe_count || 0}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#F59E0B',
                        fontFamily: 'JetBrains Mono, monospace' }}>
                        {r.alert_count || 0}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#00A86B',
                        fontFamily: 'JetBrains Mono, monospace' }}>
                        {r.normal_count || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Pattern */}
      {!loading && activeTab === 'hourly' && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '16px 20px'
        }}>
          <div style={{ fontSize: 12, fontWeight: 600,
            color: '#E2E8F0', marginBottom: 4 }}>
            Hourly Reading Activity Pattern
          </div>
          <p style={{ fontSize: 11, color: '#64748B', marginBottom: 14 }}>
            Average readings and water level by hour of day across all
            stations — reveals peak monitoring windows
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourly}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="hour"
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={h => `${h}:00`}/>
              <YAxis yAxisId="left"
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}m`}/>
              <YAxis yAxisId="right" orientation="right"
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v.toLocaleString()}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }}/>
              <Line yAxisId="left" type="monotone"
                dataKey="avg_level" name="Avg Level (m)"
                stroke="#00A86B" strokeWidth={2} dot={false}/>
              <Line yAxisId="right" type="monotone"
                dataKey="reading_count" name="Reading Count"
                stroke="#3B82F6" strokeWidth={2} dot={false}/>
              <Line yAxisId="right" type="monotone"
                dataKey="active_stations" name="Active Stations"
                stroke="#F59E0B" strokeWidth={1.5}
                strokeDasharray="4 4" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rainfall Feed */}
      {!loading && activeTab === 'rainfall' && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '16px 20px'
        }}>
          <div style={{ fontSize: 12, fontWeight: 600,
            color: '#E2E8F0', marginBottom: 4 }}>
            Live Rainfall Feed — EA API
          </div>
          <p style={{ fontSize: 11, color: '#64748B', marginBottom: 14 }}>
            Latest rainfall snapshot across Environment Agency monitors.
            Ranked by current reading strength.
          </p>
          {rainfall.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B',
              fontSize: 12, padding: '40px 0' }}>
              Live rainfall feed is currently unavailable
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={rainfall}
                margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="station"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  angle={-35} textAnchor="end"
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}mm`}/>
                <Tooltip content={<CustomTooltip unit="mm"/>}/>
                <Bar dataKey="value" name="Rainfall"
                  fill="#3B82F6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Export */}
      {!loading && activeTab === 'export' && (
        <div style={{ display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            {
              title: 'All Stations CSV',
              desc: 'Complete station list with current levels, status, river, town, coordinates and reading count.',
              url: `${API}/export/stations`,
              filename: 'flood-stations.csv',
              color: '#00A86B',
              icon: '📊'
            },
            {
              title: 'Chart Data CSV',
              desc: 'Water level trend data for top 3 stations over 7 days. Download from the chart panel above.',
              url: null,
              note: 'Use the CSV button on the chart',
              color: '#3B82F6',
              icon: '📈'
            },
            {
              title: 'Live Warnings JSON',
              desc: 'Current EA flood warnings in JSON format. Direct API access for downstream systems.',
              url: `${API}/warnings`,
              filename: 'ea-warnings.json',
              color: '#EF4444',
              icon: '⚠️'
            },
            {
              title: 'Catchment Summary',
              desc: 'River catchment aggregates — station counts, avg/peak levels, status breakdown per river.',
              url: `${API}/bi/catchment-summary`,
              filename: 'catchment-summary.json',
              color: '#F59E0B',
              icon: '🏔️'
            },
            {
              title: 'Hourly Pattern',
              desc: 'Hour-of-day activity pattern across all stations — reading counts and average levels.',
              url: `${API}/bi/hourly-pattern`,
              filename: 'hourly-pattern.json',
              color: '#8B5CF6',
              icon: '🕐'
            },
            {
              title: 'Pipeline Audit Log',
              desc: 'Full pipeline run history — start times, rows inserted, station counts, error rates.',
              url: `${API}/pipeline/runs`,
              filename: 'pipeline-runs.json',
              color: '#06B6D4',
              icon: '🔄'
            },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${item.color}30`,
              borderRadius: 10, padding: '16px 18px'
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {item.icon}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700,
                color: item.color, marginBottom: 6 }}>
                {item.title}
              </div>
              <p style={{ fontSize: 11, color: '#64748B',
                lineHeight: 1.5, marginBottom: 12 }}>
                {item.desc}
              </p>
              {item.url ? (
                <a href={item.url} target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    gap: 5, padding: '6px 12px', borderRadius: 7,
                    border: `1px solid ${item.color}40`,
                    background: `${item.color}15`,
                    color: item.color, fontSize: 11, fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                  <FiDownload size={11}/> Download
                </a>
              ) : (
                <span style={{ fontSize: 11, color: '#64748B',
                  fontStyle: 'italic' }}>{item.note}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BiDashboard;
