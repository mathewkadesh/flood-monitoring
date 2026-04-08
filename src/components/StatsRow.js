import React from 'react';

function StatsRow({ stats }) {
  return (
    <div className="stats-row">
      <div className="stat-card teal">
        <div className="stat-label">Stations Monitored</div>
        <div className="stat-value">{stats.totalStations.toLocaleString()}</div>
        <div className="stat-sub">Active across England</div>
      </div>
      <div className="stat-card amber">
        <div className="stat-label">Active Alerts</div>
        <div className="stat-value">{stats.activeAlerts}</div>
        <div className="stat-sub">6 escalated to severe</div>
      </div>
      <div className="stat-card red">
        <div className="stat-label">Total Readings</div>
        <div className="stat-value">{(stats.totalReadings / 1000000).toFixed(1)}M</div>
        <div className="stat-sub">7-day pipeline ingest</div>
      </div>
      <div className="stat-card blue">
        <div className="stat-label">Pipeline Runs</div>
        <div className="stat-value">{stats.pipelineRuns}</div>
        <div className="stat-sub">Last run: today 06:42 UTC</div>
      </div>
    </div>
  );
}

export default StatsRow;
