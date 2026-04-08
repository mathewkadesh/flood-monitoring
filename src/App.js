import React, { useState, useEffect } from 'react';
import './App.css';
import { FiDatabase, FiMap } from 'react-icons/fi';
import StatsRow from './components/StatsRow';
import StationTable from './components/StationTable';
import WaterLevelChart from './components/WaterLevelChart';
import PipelineLog from './components/PipelineLog';
import MapView from './components/MapView';

const API = 'http://127.0.0.1:5000/api';

function App() {
  const [stats, setStats] = useState({
    totalStations: 0,
    totalReadings: 0,
    activeAlerts: 0,
    pipelineRuns: 0
  });
  const [activeTab, setActiveTab] = useState('table');

  useEffect(() => {
    fetch(`${API}/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <div className="logo-dot">EA</div>
          <span>Flood Monitor <span className="sub">· Pipeline Dashboard</span></span>
        </div>
        <div className="topbar-right">
          <span className="last-run">Last run: 08 Apr 2026 · 06:42 UTC</span>
          <div className="status-pill">
            <div className="pulse"></div>
            LIVE
          </div>
        </div>
      </header>

      <main className="main">
        <StatsRow stats={stats} />

        <div className="grid-2">
          <WaterLevelChart />
          <PipelineLog />
        </div>

        <div className="view-tabs">
          <button
            className={`view-tab ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <FiDatabase size={13} /> Station Table
          </button>
          <button
            className={`view-tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <FiMap size={13} /> UK Map
          </button>
        </div>

        {activeTab === 'table' && <StationTable api={API} />}
        {activeTab === 'map'   && <MapView api={API} />}
      </main>
    </div>
  );
}

export default App;