import React from 'react';

const logs = [
  { status: 'ok',   label: 'Full ingest — all stations',        time: '06:42 UTC', rows: '+2,308,750 rows' },
  { status: 'ok',   label: 'Incremental delta — 412 stations',  time: '05:15 UTC', rows: '+12,801 rows'    },
  { status: 'warn', label: 'Retry — 3 stations offline',        time: '04:10 UTC', rows: '3 skipped'       },
  { status: 'ok',   label: 'Backfill — 7-day historical',       time: '00:05 UTC', rows: '+2.3M rows'      },
  { status: 'run',  label: 'Next run scheduled',                time: '07:00 UTC', rows: 'All stations'    },
];

const icons = { ok: '✓', warn: '!', run: '↻' };

function PipelineLog() {
  return (
    <div className="card">
      <div className="card-title">Pipeline Run Log</div>
      {logs.map((log, i) => (
        <div className="pipe-item" key={i}>
          <div className={`pipe-icon ${log.status}`}>
            {icons[log.status]}
          </div>
          <span className="pipe-name">{log.label}</span>
          <span className="pipe-time">{log.time}</span>
          <span className="pipe-rows">{log.rows}</span>
        </div>
      ))}
    </div>
  );
}

export default PipelineLog;