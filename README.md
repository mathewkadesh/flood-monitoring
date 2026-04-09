# 🌊 EA Flood Monitor — Real-Time Pipeline & Dashboard

> **Technical Assessment Submission — AECOM Data Engineer Role**  
> **Candidate:** Mathew Kadesh  
> **Deadline:** 14th April 2026  
> **GitHub:** https://github.com/mathewkadesh/flood-monitoring

---

## A Word on My Development Approach

Before anything else, I want to be upfront about how I built this.

I used AI (Claude by Anthropic) as a tool during this project — the same way 
a professional uses any powerful tool: **under my direction, in service of my 
decisions, and never as a replacement for my thinking.**

Every architectural decision in this project is mine:
- I chose async Python because 3,694 stations fetched sequentially would take hours
- I chose SQLite with WAL mode because it handles concurrent reads during pipeline writes
- I designed the incremental update logic around `last_fetched` per station
- I structured the API endpoints around what analysts and scientists actually need
- I decided to build a React dashboard to demonstrate the data is real and queryable

AI helped me move faster on implementation — boilerplate code, CSS, debugging. 
But I directed every step, evaluated every output, and made every call.

**My hand was always on top.**

In 2026, the engineers who thrive are not those who avoid AI — they are those 
who know how to use it with precision and critical judgment. I can explain every 
line of this project, every query, every decision. The speed came from AI. 
The knowledge, the structure, and the direction came from me.

---

## 📸 Dashboard Preview

![Dashboard](docs/dashboard-screenshot.png)

**Features:**
- ✅ Live EA API flood warnings banner
- ✅ Real water level trend chart (24h / 7d / 30d)
- ✅ Top 5 insights — highest levels, severe stations, most active, top rivers, EA warnings
- ✅ 3,694 stations with live search, filter, sort, pagination
- ✅ Expandable row detail with recent readings
- ✅ UK map with colour-coded station markers
- ✅ CSV export
- ✅ Pipeline run log with real audit data

---

## 🏗️ Architecture
Environment Agency Real-Time Flood API
│
▼
┌─────────────────────────┐
│   Python Pipeline       │  async · aiohttp · 10 workers
│   pipeline/fetch.py     │  incremental · idempotent
└───────────┬─────────────┘
│
▼
┌─────────────────────────┐
│   SQLite Database       │  WAL mode · 2.3M readings
│   db/flood.db           │  stations · readings · pipeline_runs
└───────────┬─────────────┘
│
▼
┌─────────────────────────┐
│   Flask REST API        │  7 endpoints · CORS enabled
│   api.py                │  real-time · paginated
└───────────┬─────────────┘
│
▼
┌─────────────────────────┐
│   React Dashboard       │  Recharts · Leaflet · React Icons
│   src/                  │  live data · UK map · filters
└─────────────────────────┘

---

## 📊 Key Stats from This Submission

| Metric | Value |
|---|---|
| Monitoring stations | 3,694 |
| Readings stored | 2,308,750 |
| Pipeline runtime | ~2 minutes |
| API endpoints | 7 |
| Dashboard components | 6 |
| Test cases | 11 |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/mathewkadesh/flood-monitoring.git
cd flood-monitoring
```

### 2. Set up Python environment
```bash
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
```

### 3. Run the pipeline (builds the database)
```bash
# Full 7-day backfill — runs once
python3 pipeline/fetch.py --full

# Incremental update — run on schedule
python3 pipeline/fetch.py
```

### 4. Start the Flask API
```bash
python3 api.py
# Running on http://127.0.0.1:5000
```

### 5. Start the React dashboard
```bash
# In a new terminal tab
npm install
npm start
# Running on http://localhost:3000
```

---

## 🗄️ Database Schema
```sql
-- Monitoring stations metadata
CREATE TABLE stations (
    station_id   TEXT PRIMARY KEY,
    label        TEXT,
    river        TEXT,
    town         TEXT,
    lat          REAL,
    lon          REAL,
    unit         TEXT,
    last_fetched TEXT    -- ISO8601 UTC — drives incremental updates
);

-- Time-series readings
CREATE TABLE readings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id   TEXT NOT NULL,
    measure_id   TEXT,
    timestamp    TEXT NOT NULL,
    value        REAL NOT NULL,
    UNIQUE(station_id, timestamp),  -- idempotent upserts
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

-- Pipeline audit log
CREATE TABLE pipeline_runs (
    run_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at    TEXT NOT NULL,
    finished_at   TEXT,
    stations_ok   INTEGER DEFAULT 0,
    stations_err  INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    run_type      TEXT DEFAULT 'incremental'
);

-- BI aggregation view
CREATE VIEW v_daily_max AS
    SELECT station_id, DATE(timestamp) AS day,
           MAX(value) AS max_level, MIN(value) AS min_level,
           AVG(value) AS avg_level, COUNT(*) AS reading_count
    FROM readings
    GROUP BY station_id, DATE(timestamp);
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/stats` | GET | KPI summary — stations, readings, alerts |
| `/api/stations` | GET | Paginated station list with search & filter |
| `/api/stations/<id>/readings` | GET | Last 168 readings for a station |
| `/api/chart/top-stations` | GET | Top 3 stations chart data (24h/7d/30d) |
| `/api/top5` | GET | Top 5 insights across all categories |
| `/api/warnings` | GET | Live EA flood warnings |
| `/api/pipeline/runs` | GET | Pipeline audit log |

### Example requests
```bash
# Get all stats
curl http://127.0.0.1:5000/api/stats

# Search stations
curl "http://127.0.0.1:5000/api/stations?search=thames&page=1&limit=10"

# Get 24h chart data
curl "http://127.0.0.1:5000/api/chart/top-stations?range=24h"

# Get live warnings
curl http://127.0.0.1:5000/api/warnings
```

---

## 🧪 Running Tests
```bash
source venv/bin/activate
pytest tests/ -v
```

**Test coverage:**
- Database schema initialisation
- Idempotent init (calling twice does not error)
- Incremental fetch logic (new vs existing stations)
- URL construction with correct `since` parameter
- Duplicate row prevention (UNIQUE constraint)
- 404 station handling (graceful skip)
- Network error handling (caught and logged)
- BI view aggregation correctness

---

## ☁️ Cloud Deployment Plan

For production deployment on AWS:
Pipeline (ECS Fargate) ──── EventBridge (every 15 min)
│
▼
PostgreSQL RDS ──── Read Replica (analysts/scientists)
│
▼
Flask API (ECS Fargate + ALB)
│
▼
React Dashboard (S3 + CloudFront)

Migration from SQLite to PostgreSQL requires only:
1. Change connection string
2. Replace `INSERT OR IGNORE` with `INSERT ... ON CONFLICT DO NOTHING`
3. Add TimescaleDB extension for time-series optimisation

---

## 📁 Project Structure
flood-monitoring/
├── pipeline/
│   ├── init.py
│   └── fetch.py          # async pipeline — main entry point
├── db/                   # gitignored — generated by pipeline
│   └── flood.db
├── src/
│   ├── components/
│   │   ├── StatsRow.js
│   │   ├── WaterLevelChart.js
│   │   ├── PipelineLog.js
│   │   ├── StationTable.js
│   │   ├── MapView.js
│   │   └── Top5Panel.js
│   ├── App.js
│   └── App.css
├── tests/
│   └── test_pipeline.py
├── docs/
│   └── ANSWERS.md        # full answers to all 6 questions
├── api.py                # Flask REST API
├── requirements.txt
├── .gitignore
└── README.md

---

## 🙏 Data Attribution

> This project uses Environment Agency flood and river level data  
> from the real-time data API (Beta).  
> Licensed under the Open Government Licence v3.0.

---

*Built by Mathew Kadesh · April 2026*
