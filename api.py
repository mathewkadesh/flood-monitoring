from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import urllib.request
import json

app = Flask(__name__)
CORS(app)

DB_PATH = "db/flood.db"
EA_BASE = "http://environment.data.gov.uk/flood-monitoring"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def fetch_live_warnings(limit=20):
    try:
        url = f"{EA_BASE}/id/floods?min-severity=3&_limit={limit}"
        req = urllib.request.Request(url, headers={"User-Agent": "flood-monitor/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            data  = json.loads(r.read())
            items = data.get("items", [])

        result = []
        for w in items:
            result.append({
                "id":          w.get("floodAreaID", ""),
                "description": w.get("description", ""),
                "severity":    w.get("severity", ""),
                "severityLevel": w.get("severityLevel", 4),
                "county":      w.get("floodArea", {}).get("county", ""),
                "river":       w.get("floodArea", {}).get("riverOrSea", ""),
                "message":     w.get("message", ""),
                "timeRaised":  w.get("timeRaised", ""),
                "timeSeverityChanged": w.get("timeSeverityChanged", ""),
            })
        return result
    except Exception:
        return []

# ── Stats ──────────────────────────────────────────────────────────
@app.route("/api/stats")
def stats():
    conn = get_conn()
    stations = conn.execute("SELECT COUNT(*) FROM stations").fetchone()[0]
    readings = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
    runs     = conn.execute("SELECT COUNT(*) FROM pipeline_runs").fetchone()[0]

    # Live flood warnings from EA API
    try:
        url  = f"{EA_BASE}/id/floods?min-severity=3"
        req  = urllib.request.Request(url, headers={"User-Agent": "flood-monitor/1.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            data     = json.loads(r.read())
            warnings = data.get("items", [])
            active   = len([w for w in warnings if w.get("severityLevel", 4) <= 3])
            severe   = len([w for w in warnings if w.get("severityLevel", 4) == 1])
    except:
        active = 0
        severe = 0

    conn.close()
    return jsonify({
        "totalStations": stations,
        "totalReadings": readings,
        "pipelineRuns":  runs,
        "activeAlerts":  active,
        "severeAlerts":  severe,
    })

# ── Live Flood Warnings ────────────────────────────────────────────
@app.route("/api/warnings")
def warnings():
    return jsonify(fetch_live_warnings(limit=20))

# ── Top 5 insights ────────────────────────────────────────────────
@app.route("/api/top5")
def top5():
    conn = get_conn()

    highest_levels = conn.execute("""
        SELECT s.station_id, s.label, s.river, s.town, r.value AS level
        FROM stations s
        JOIN readings r ON r.id = (
            SELECT id
            FROM readings
            WHERE station_id = s.station_id
            AND value IS NOT NULL
            AND value > -10
            AND value <= 50
            ORDER BY timestamp DESC
            LIMIT 1
        )
        ORDER BY r.value DESC
        LIMIT 5
    """).fetchall()

    severe_stations = conn.execute("""
        SELECT s.station_id, s.label, s.river, s.town, r.value AS level
        FROM stations s
        JOIN readings r ON r.id = (
            SELECT id
            FROM readings
            WHERE station_id = s.station_id
            AND value IS NOT NULL
            AND value >= 1.5
            AND value <= 50
            ORDER BY timestamp DESC
            LIMIT 1
        )
        ORDER BY r.value DESC
        LIMIT 5
    """).fetchall()

    most_active = conn.execute("""
        SELECT s.station_id, s.label, s.river, s.town, COUNT(r.id) AS reading_count
        FROM stations s
        JOIN readings r ON r.station_id = s.station_id
        GROUP BY s.station_id, s.label, s.river, s.town
        ORDER BY reading_count DESC
        LIMIT 5
    """).fetchall()

    top_rivers = conn.execute("""
        SELECT
            s.river,
            COUNT(DISTINCT s.station_id) AS station_count,
            ROUND(AVG(latest.level), 3) AS avg_level
        FROM stations s
        JOIN (
            SELECT r1.station_id, r1.value AS level
            FROM readings r1
            JOIN (
                SELECT station_id, MAX(timestamp) AS latest_ts
                FROM readings
                WHERE value IS NOT NULL
                AND value > -10
                AND value <= 50
                GROUP BY station_id
            ) latest
              ON latest.station_id = r1.station_id
             AND latest.latest_ts = r1.timestamp
        ) latest ON latest.station_id = s.station_id
        WHERE s.river IS NOT NULL
        AND s.river != ''
        GROUP BY s.river
        ORDER BY station_count DESC, avg_level DESC
        LIMIT 5
    """).fetchall()

    conn.close()

    return jsonify({
        "highest_levels": [{
            "station_id": r["station_id"],
            "label": r["label"] or r["station_id"],
            "river": r["river"] or "",
            "town": r["town"] or "",
            "level": round(r["level"], 3) if r["level"] is not None else None,
        } for r in highest_levels],
        "severe_stations": [{
            "station_id": r["station_id"],
            "label": r["label"] or r["station_id"],
            "river": r["river"] or "",
            "town": r["town"] or "",
            "level": round(r["level"], 3) if r["level"] is not None else None,
        } for r in severe_stations],
        "most_active": [{
            "station_id": r["station_id"],
            "label": r["label"] or r["station_id"],
            "river": r["river"] or "",
            "town": r["town"] or "",
            "reading_count": r["reading_count"],
        } for r in most_active],
        "top_rivers": [{
            "river": r["river"] or "Unknown",
            "station_count": r["station_count"],
            "avg_level": r["avg_level"],
        } for r in top_rivers],
        "ea_warnings": fetch_live_warnings(limit=5),
    })

# ── Real chart data — top 3 stations by readings ───────────────────
@app.route("/api/chart/top-stations")
def chart_top_stations():
    conn        = get_conn()
    range_param = request.args.get("range", "7d")

    if range_param == "24h":
        hours_back  = 24
        group_by    = "strftime('%Y-%m-%dT%H', timestamp)"
        label_fmt   = "strftime('%H:00', timestamp)"
    elif range_param == "30d":
        hours_back  = 30 * 24
        group_by    = "DATE(timestamp)"
        label_fmt   = "strftime('%m-%d', timestamp)"
    else:
        hours_back  = 7 * 24
        group_by    = "DATE(timestamp)"
        label_fmt   = "strftime('%m-%d', timestamp)"

    top = conn.execute("""
        SELECT s.station_id, s.label, s.river,
               COUNT(r.id) as cnt
        FROM stations s
        JOIN readings r ON r.station_id = s.station_id
        WHERE s.river IS NOT NULL AND s.river != ''
        GROUP BY s.station_id
        ORDER BY cnt DESC
        LIMIT 3
    """).fetchall()

    from datetime import datetime, timedelta, timezone
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).strftime("%Y-%m-%dT%H:%M:%SZ")

    result = []
    for st in top:
        rows = conn.execute(f"""
            SELECT {label_fmt} as label,
                   ROUND(AVG(value), 3) as avg_level
            FROM readings
            WHERE station_id = ?
              AND timestamp >= ?
              AND value > -10
              AND value <= 50
            GROUP BY {group_by}
            ORDER BY {group_by} ASC
        """, (st["station_id"], cutoff)).fetchall()

        result.append({
            "station_id": st["station_id"],
            "label":      st["label"] or st["station_id"],
            "river":      st["river"],
            "readings":   [{"day": r["label"], "value": r["avg_level"]} for r in rows]
        })

    conn.close()
    return jsonify(result)

# ── Stations ───────────────────────────────────────────────────────
@app.route("/api/stations")
def get_stations():
    conn   = get_conn()
    search = request.args.get("search", "")
    river  = request.args.get("river", "")
    page   = int(request.args.get("page", 1))
    limit  = int(request.args.get("limit", 50))
    offset = (page - 1) * limit

    query  = """
        SELECT s.station_id, s.label, s.river, s.town, s.lat, s.lon, s.unit,
               r.value as level, r.timestamp as last_reading,
               COUNT(r2.id) as reading_count
        FROM stations s
        LEFT JOIN readings r ON r.id = (
            SELECT id FROM readings
            WHERE station_id = s.station_id
            ORDER BY timestamp DESC LIMIT 1
        )
        LEFT JOIN readings r2 ON r2.station_id = s.station_id
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (s.label LIKE ? OR s.river LIKE ? OR s.station_id LIKE ?)"
        params += [f"%{search}%", f"%{search}%", f"%{search}%"]
    if river:
        query += " AND s.river LIKE ?"
        params.append(f"%{river}%")

    query += " GROUP BY s.station_id ORDER BY s.label LIMIT ? OFFSET ?"
    params += [limit, offset]

    rows  = conn.execute(query, params).fetchall()
    total = conn.execute("SELECT COUNT(*) FROM stations").fetchone()[0]
    conn.close()

    def get_status(level):
        if level is None:   return "offline"
        if level > 50:      return "offline"   # likely mAOD datum, not comparable
        if level >= 1.5:    return "severe"
        if level >= 1.0:    return "alert"
        return "normal"

    return jsonify({
        "stations": [{
            "id":          r["station_id"],
            "name":        r["label"] or r["station_id"],
            "river":       r["river"] or "Unknown",
            "town":        r["town"] or "",
            "lat":         r["lat"],
            "lon":         r["lon"],
            "unit":        r["unit"] or "m",
            "level":       round(r["level"], 3) if r["level"] else None,
            "status":      get_status(r["level"]),
            "readings":    r["reading_count"],
            "lastReading": r["last_reading"] or "N/A"
        } for r in rows],
        "total": total,
        "page":  page,
        "limit": limit,
        "pages": (total // limit) + 1
    })

# ── Station readings ───────────────────────────────────────────────
@app.route("/api/stations/<station_id>/readings")
def station_readings(station_id):
    conn = get_conn()
    rows = conn.execute("""
        SELECT timestamp, value FROM readings
        WHERE station_id = ?
        ORDER BY timestamp DESC LIMIT 168
    """, (station_id,)).fetchall()
    conn.close()
    return jsonify([{"timestamp": r["timestamp"], "value": r["value"]} for r in rows])

# ── Pipeline runs ──────────────────────────────────────────────────
@app.route("/api/pipeline/runs")
def pipeline_runs():
    conn = get_conn()
    rows = conn.execute("""
        SELECT * FROM pipeline_runs ORDER BY run_id DESC LIMIT 10
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
