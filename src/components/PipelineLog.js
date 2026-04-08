import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiRefreshCw, FiClock, FiAlertTriangle } from 'react-icons/fi';

const severityColor = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#64748B',
};

const severityLabel = {
  1: 'Severe',
  2: 'Warning',
  3: 'Alert',
  4: 'Inactive',
};

function PipelineLog() {
  const [runs, setRuns]         = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [tab, setTab]           = useState('pipeline');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Fetch real pipeline runs
    fetch('http://127.0.0.1:5000/api/pipeline/runs')
      .then(r => r.json())
      .then(data => { setRuns(data); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch live EA flood warnings
    fetch('http://127.0.0.1:5000/api/warnings')
      .then(r => r.json())
      .then(setWarnings)
      .catch(() => {});
  }, []);

  const getIcon = (run) => {
    if (run.stations_err > 0) return <FiAlertCircle size={13}/>;
    if (!run.finished_at)     return <FiRefreshCw size={13}/>;
    return <FiCheckCircle size={13}/>;
  };

  const getStatus = (run) => {
    if (!run.finished_at)     return 'run';
    if (run.stations_err > 0) return 'warn';
    return 'ok';
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    return ts.replace('T', ' ').slice(0, 16) + ' UTC';
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Tab Row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[
          { key: 'pipeline', label: 'Pipeline Log', icon: <FiClock size={11}/> },
          { key: 'warnings', label: `Live Warnings ${warnings.length > 0 ? `(${warnings.length})` : ''}`,
            icon: <FiAlertTriangle size={11}/> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 7, border: '1px solid',
            borderColor: tab === t.key
              ? (t.key === 'warnings' ? 'rgba(239,68,68,0.35)' : 'rgba(0,168,107,0.35)')
              : 'rgba(255,255,255,0.06)',
            background: tab === t.key
              ? (t.key === 'warnings' ? 'rgba(239,68,68,0.1)' : 'rgba(0,168,107,0.1)')
              : 'transparent',
            color: tab === t.key
              ? (t.key === 'warnings' ? '#EF4444' : '#00A86B')
              : '#64748B',
            fontSize: 11, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontWeight: 500,
            transition: 'all 0.15s'
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Pipeline Runs Tab */}
      {tab === 'pipeline' && (
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ color: '#64748B', fontSize: 12, padding: '20px 0',
              textAlign: 'center' }}>Loading pipeline runs...</div>
          ) : runs.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 12, padding: '20px 0',
              textAlign: 'center' }}>No pipeline runs found</div>
          ) : runs.map((run, i) => (
            <div className="pipe-item" key={i}>
              <div className={`pipe-icon ${getStatus(run)}`}>
                {getIcon(run)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="pipe-name">
                  {run.run_type === 'full' ? 'Full ingest' : 'Incremental'} — {run.stations_ok} stations
                </div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatTime(run.started_at)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pipe-rows">
                  +{run.rows_inserted?.toLocaleString()} rows
                </div>
                {run.stations_err > 0 && (
                  <div style={{ fontSize: 10, color: '#F59E0B',
                    fontFamily: 'JetBrains Mono, monospace' }}>
                    {run.stations_err} errors
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Warnings Tab */}
      {tab === 'warnings' && (
        <div style={{ flex: 1, maxHeight: 280, overflowY: 'auto' }}>
          {warnings.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 12,
              padding: '20px 0', textAlign: 'center' }}>
              No active flood warnings
            </div>
          ) : warnings.map((w, i) => (
            <div key={i} style={{
              padding: '10px 12px', marginBottom: 6,
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${severityColor[w.severityLevel]}30`,
              borderLeft: `3px solid ${severityColor[w.severityLevel]}`,
              borderRadius: 7,
            }}>
              <div style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: severityColor[w.severityLevel],
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: severityColor[w.severityLevel] + '20',
                  padding: '2px 7px', borderRadius: 4
                }}>{severityLabel[w.severityLevel]}</span>
                <span style={{ fontSize: 10, color: '#64748B',
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  {w.county}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500,
                color: '#E2E8F0', marginBottom: 2 }}>
                {w.description}
              </div>
              {w.river && (
                <div style={{ fontSize: 10, color: '#64748B' }}>
                  {w.river}
                </div>
              )}
              {w.timeRaised && (
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 4,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  Raised: {w.timeRaised?.replace('T',' ').slice(0,16)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 10, padding: '8px 10px',
        background: 'rgba(0,168,107,0.04)',
        border: '1px solid rgba(0,168,107,0.1)',
        borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 11, color: '#64748B' }}>
          EA API · Updated every 15 min
        </span>
        <span style={{ fontSize: 11, color: '#00A86B',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
          {warnings.length} active warnings
        </span>
      </div>
    </div>
  );
}

export default PipelineLog;