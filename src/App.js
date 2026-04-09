import React, { useState, useEffect } from 'react';
import './App.css';
import { FiActivity, FiDatabase, FiMap } from 'react-icons/fi';
import StatsRow from './components/StatsRow';
import StationTable from './components/StationTable';
import WaterLevelChart from './components/WaterLevelChart';
import Top5Panel from './components/Top5Panel';
import PipelineLog from './components/PipelineLog';
import MapView from './components/MapView';
import BiDashboard from './components/BiDashboard';

const API = 'http://127.0.0.1:5000/api';
const BRAND_ICON = `${process.env.PUBLIC_URL}/flood-gauge-icon.svg`;

function App() {
  const [stats, setStats]       = useState({
    totalStations: 0, totalReadings: 0,
    activeAlerts: 0, severeAlerts: 0, pipelineRuns: 0
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
          <img className="logo-icon" src={BRAND_ICON} alt="Flood Monitor icon" />
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
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-kicker">Environment Agency Feed</span>
            <div className="dashboard-title-row">
              <img className="dashboard-title-icon" src={BRAND_ICON} alt="Flood Monitor icon" />
              <h1 className="dashboard-title">National Flood Operations Dashboard</h1>
            </div>
            <p className="dashboard-subtitle">
              Monitor live warnings, ingest health, river activity, and station-level risk from one operational view.
            </p>
          </div>
          <div className="dashboard-hero-meta">
            <div className="hero-context-card">
              <div className="hero-context-top">
                <FiMap size={14} />
                <span>Coverage</span>
              </div>
              <p className="hero-context-body">
                England and Wales station network with river, town, and live warning coverage in one workspace.
              </p>
            </div>
            <div className="hero-context-card">
              <div className="hero-context-top">
                <FiDatabase size={14} />
                <span>Data Flow</span>
              </div>
              <p className="hero-context-body">
                Environment Agency warnings and station readings are combined with local pipeline output for fast triage.
              </p>
            </div>
            <div className="hero-context-card">
              <div className="hero-context-top">
                <FiActivity size={14} />
                <span>Ops Mode</span>
              </div>
              <p className="hero-context-body">
                Built for monitoring, escalation review, and station-level inspection without switching screens.
              </p>
            </div>
          </div>
        </section>

        <StatsRow stats={stats} />

        <div className="dashboard-section-head">
          <div>
            <div className="section-kicker">Live Monitoring</div>
            <h2 className="section-title">Operational pulse</h2>
          </div>
          <p className="section-description">
            Trend movement and pipeline health side by side so the highest-risk signals surface quickly.
          </p>
        </div>

        <div className="grid-2">
          <WaterLevelChart />
          <PipelineLog />
        </div>

        <Top5Panel api={API} />

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
          <button
             className={`view-tab ${activeTab === 'bi' ? 'active' : ''}`}
              onClick={() => setActiveTab('bi')}
                >
              <FiDatabase size={13} /> BI Analytics
          </button>
        </div>

        {activeTab === 'table' && <StationTable api={API} />}
        {activeTab === 'map'   && <MapView api={API} />}
        {activeTab === 'bi' && <BiDashboard />}
      </main>
    </div>
  );
}

export default App;
