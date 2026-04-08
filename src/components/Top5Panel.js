import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiAlertOctagon, FiActivity, FiDroplet, FiAlertTriangle } from 'react-icons/fi';

const severityColor = { 1: '#EF4444', 2: '#F59E0B', 3: '#3B82F6', 4: '#64748B' };
const severityLabel = { 1: 'SEVERE', 2: 'WARNING', 3: 'ALERT', 4: 'INACTIVE' };

function Bar({ value, max, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 3, overflow: 'hidden', marginTop: 3 }}>
      <div style={{ width: `${Math.min((value/max)*100,100)}%`, height: '100%', background: color, borderRadius: 3 }}/>
    </div>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div className="insight-section" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Item({ rank, color, name, sub, value, valueLabel, max }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: color+'20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {sub && <div style={{ fontSize: 9, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{valueLabel}</div>
      </div>
      <div style={{ paddingLeft: 25 }}><Bar value={value} max={max} color={color}/></div>
    </div>
  );
}

function Top5Panel({ api }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/top5`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [api]);

  if (loading) return (
    <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748B', fontSize: 12 }}>Loading live insights...</div>
  );
  if (!data) return null;

  const maxHighest = Math.max(...(data.highest_levels||[]).map(r=>r.level||0), 1);
  const maxSevere  = Math.max(...(data.severe_stations||[]).map(r=>r.level||0), 1);
  const maxActive  = Math.max(...(data.most_active||[]).map(r=>r.reading_count||0), 1);
  const maxRivers  = Math.max(...(data.top_rivers||[]).map(r=>r.station_count||0), 1);

  return (
    <section className="insights-card">
      <div className="insights-head">
        <div>
          <div className="section-kicker">Live Insights</div>
          <h2 className="section-title">Top 5 operational snapshot</h2>
        </div>
        <p className="section-description">
          Highest levels, severe stations, activity hotspots, river concentration, and live warning pressure in one layer.
        </p>
      </div>

      {/* Row 1 — 3 columns */}
      <div className="insights-grid-3">

        <Section title="Highest Levels" icon={<FiTrendingUp size={11}/>} color="#00A86B">
          {(data.highest_levels||[]).map((r,i) => (
            <Item key={i} rank={i+1} color="#00A86B"
              name={r.label} sub={r.river||r.town}
              value={r.level} max={maxHighest}
              valueLabel={r.level?.toFixed(2)+'m'}/>
          ))}
        </Section>

        <Section title="Severe Stations" icon={<FiAlertOctagon size={11}/>} color="#EF4444">
          {(data.severe_stations||[]).length === 0
            ? <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', padding: '10px 0' }}>No severe stations</div>
            : (data.severe_stations||[]).map((r,i) => (
              <Item key={i} rank={i+1} color="#EF4444"
                name={r.label} sub={r.river||r.town}
                value={r.level} max={maxSevere}
                valueLabel={r.level?.toFixed(2)+'m'}/>
            ))
          }
        </Section>

        <Section title="Most Active" icon={<FiActivity size={11}/>} color="#3B82F6">
          {(data.most_active||[]).map((r,i) => (
            <Item key={i} rank={i+1} color="#3B82F6"
              name={r.label} sub={r.river||r.town}
              value={r.reading_count} max={maxActive}
              valueLabel={r.reading_count?.toLocaleString()}/>
          ))}
        </Section>

      </div>

      {/* Row 2 — 2 columns */}
      <div className="insights-grid-2">

        <Section title="Top Rivers" icon={<FiDroplet size={11}/>} color="#F59E0B">
          {(data.top_rivers||[]).map((r,i) => (
            <Item key={i} rank={i+1} color="#F59E0B"
              name={r.river}
              sub={`${r.station_count} stations · avg ${r.avg_level?.toFixed(2)||'—'}m`}
              value={r.station_count} max={maxRivers}
              valueLabel={r.station_count+' stn'}/>
          ))}
        </Section>

        <Section title="EA Live Warnings" icon={<FiAlertTriangle size={11}/>} color="#EF4444">
          {(data.ea_warnings||[]).length === 0
            ? <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', padding: '10px 0' }}>No active warnings</div>
            : (data.ea_warnings||[]).map((w,i) => {
              const color = severityColor[w.severityLevel]||'#64748B';
              return (
                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < (data.ea_warnings.length-1) ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color, background: color+'20', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em' }}>
                      {severityLabel[w.severityLevel]}
                    </span>
                    <span style={{ fontSize: 9, color: '#64748B' }}>{w.county?.slice(0,14)}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#E2E8F0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {w.description}
                  </div>
                  {w.river && <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{w.river}</div>}
                </div>
              );
            })
          }
        </Section>

      </div>
    </section>
  );
}

export default Top5Panel;
