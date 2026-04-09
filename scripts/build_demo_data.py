from pathlib import Path
import csv
import json
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api import app


OUT_DIR = ROOT / "public/demo-api"
READINGS_FILE = OUT_DIR / "station-readings.json"


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def assert_ok(response, endpoint):
    if response.status_code >= 400:
        raise RuntimeError(f"{endpoint} failed with {response.status_code}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = app.test_client()

    endpoint_map = {
        "stats.json": "/api/stats",
        "top5.json": "/api/top5",
        "pipeline-runs.json": "/api/pipeline/runs",
        "warnings.json": "/api/warnings",
        "bi-catchment-summary.json": "/api/bi/catchment-summary",
        "bi-hourly-pattern.json": "/api/bi/hourly-pattern",
        "rainfall.json": "/api/rainfall",
        "chart-top-stations-24h.json": "/api/chart/top-stations?range=24h",
        "chart-top-stations-7d.json": "/api/chart/top-stations?range=7d",
        "chart-top-stations-30d.json": "/api/chart/top-stations?range=30d",
    }

    for filename, endpoint in endpoint_map.items():
        response = client.get(endpoint)
        assert_ok(response, endpoint)
        write_json(OUT_DIR / filename, response.get_json())

    stations_response = client.get("/api/stations?limit=5000&page=1")
    assert_ok(stations_response, "/api/stations?limit=5000&page=1")
    stations_payload = stations_response.get_json()
    write_json(OUT_DIR / "stations.json", stations_payload.get("stations", []))

    export_response = client.get("/api/export/stations")
    assert_ok(export_response, "/api/export/stations")
    (OUT_DIR / "flood-stations.csv").write_text(
        export_response.get_data(as_text=True),
        encoding="utf-8",
    )

    conn = sqlite3.connect("db/flood.db")
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        WITH ranked AS (
            SELECT station_id, timestamp, value,
                   ROW_NUMBER() OVER (
                       PARTITION BY station_id
                       ORDER BY timestamp DESC
                   ) AS rn
            FROM readings
        )
        SELECT station_id, timestamp, value
        FROM ranked
        WHERE rn <= 8
        ORDER BY station_id, timestamp DESC
        """
    ).fetchall()
    conn.close()

    grouped = {}
    for row in rows:
        grouped.setdefault(row["station_id"], []).append({
            "timestamp": row["timestamp"],
            "value": row["value"],
        })
    write_json(READINGS_FILE, grouped)

    metadata = {
        "generatedFrom": "local SQLite snapshot",
        "generatedFiles": sorted(p.name for p in OUT_DIR.glob("*") if p.is_file()),
    }
    write_json(OUT_DIR / "metadata.json", metadata)


if __name__ == "__main__":
    main()
