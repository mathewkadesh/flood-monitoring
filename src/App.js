import React, { useState } from 'react';
import './App.css';
import StatsRow from './components/StatsRow';
import StationTable from './components/StationTable';
import WaterLevelChart from './components/WaterLevelChart';
import PipelineLog from './components/PipelineLog';

function App() {
  const [stats] = useState({
    totalStations: 3694,
    totalReadings: 2308750,
    activeAlerts: 34,
    pipelineRuns: 1
  });

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <div className="logo-dot">EA</div>
          <span>Flood Monitor <span className="sub">· Pipeline Dashboard</span></span>
        </div>
        <div className="status-pill">
          <div className="pulse"></div>
          PIPELINE LIVE
        </div>
      </header>
      <main className="main">
        <StatsRow stats={stats} />
        <div className="grid-2">
          <WaterLevelChart />
          <PipelineLog />
        </div>
        <StationTable />
      </main>
    </div>
  );
}

export default App;