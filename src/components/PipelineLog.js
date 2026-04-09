import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiRefreshCw, FiClock, FiAlertTriangle, FiX } from 'react-icons/fi';
import { getPipelineRuns, getWarnings } from '../lib/apiClient';

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
  const [selectedWarning, setSelectedWarning] = useState(null);

  useEffect(() => {
    getPipelineRuns()
      .then(data => { setRuns(data); setLoading(false); })
      .catch(() => setLoading(false));

    getWarnings()
      .then(setWarnings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedWarning) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedWarning(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWarning]);

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
      <div className="panel-tabs" style={{ marginBottom: 14 }}>
        {[
          { key: 'pipeline', label: 'Pipeline Log', icon: <FiClock size={11}/> },
          { key: 'warnings', label: `Live Warnings ${warnings.length > 0 ? `(${warnings.length})` : ''}`,
            icon: <FiAlertTriangle size={11}/> },
        ].map(t => (
          <button key={t.key} className="panel-tab" onClick={() => setTab(t.key)} style={{
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
            {t.icon} <span className="panel-tab-label">{t.label}</span>
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
            <button key={i} type="button" onClick={() => setSelectedWarning(w)} className="warning-alert-card" style={{
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
            </button>
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

      {selectedWarning && (
        <div className="warning-modal-backdrop" onClick={() => setSelectedWarning(null)}>
          <div
            className="warning-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="warning-modal-header">
              <div>
                <div className="warning-modal-title-row">
                  <span
                    className="warning-modal-badge"
                    style={{
                      color: severityColor[selectedWarning.severityLevel],
                      background: `${severityColor[selectedWarning.severityLevel]}20`
                    }}
                  >
                    {severityLabel[selectedWarning.severityLevel]}
                  </span>
                  <span className="warning-modal-county">{selectedWarning.county || 'Area unknown'}</span>
                </div>
                <h3 className="warning-modal-title">{selectedWarning.description}</h3>
              </div>
              <button
                type="button"
                className="warning-modal-close"
                onClick={() => setSelectedWarning(null)}
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="warning-modal-grid">
              <div className="warning-modal-field">
                <span className="warning-modal-label">River / Sea</span>
                <span className="warning-modal-value">{selectedWarning.river || 'Not provided'}</span>
              </div>
              <div className="warning-modal-field">
                <span className="warning-modal-label">Raised</span>
                <span className="warning-modal-value">{formatTime(selectedWarning.timeRaised)}</span>
              </div>
              <div className="warning-modal-field">
                <span className="warning-modal-label">Severity Updated</span>
                <span className="warning-modal-value">{formatTime(selectedWarning.timeSeverityChanged)}</span>
              </div>
              <div className="warning-modal-field">
                <span className="warning-modal-label">Source</span>
                <span className="warning-modal-value">Environment Agency API</span>
              </div>
            </div>

            <div className="warning-modal-message">
              <div className="warning-modal-label">Full Detail</div>
              <p>{selectedWarning.message || selectedWarning.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PipelineLog;
