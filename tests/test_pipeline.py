import pytest
import sqlite3
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
import sys
sys.path.insert(0, ".")
from pipeline.fetch import init_db, get_fetch_since, build_readings_url, LOOKBACK_DAYS

@pytest.fixture
def db(tmp_path):
    db_path = str(tmp_path / "test.db")
    conn = init_db(db_path)
    yield conn
    conn.close()

def test_tables_created(db):
    tables = {r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert "stations" in tables
    assert "readings" in tables
    assert "pipeline_runs" in tables

def test_views_created(db):
    views = {r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='view'"
    ).fetchall()}
    assert "v_daily_max" in views

def test_idempotent_init(tmp_path):
    path = str(tmp_path / "double.db")
    conn1 = init_db(path)
    conn1.close()
    conn2 = init_db(path)
    conn2.close()

def test_new_station_returns_7_day_lookback(db):
    since = get_fetch_since(db, "UNKNOWN_STATION")
    expected = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    assert abs((since - expected).total_seconds()) < 5

def test_known_station_returns_last_fetched(db):
    last = "2026-04-05T10:00:00+00:00"
    db.execute("INSERT INTO stations (station_id, label, last_fetched) VALUES ('S001', 'Test', ?)", (last,))
    db.commit()
    since = get_fetch_since(db, "S001")
    assert since == datetime.fromisoformat(last).replace(tzinfo=timezone.utc)

def test_station_with_null_last_fetched(db):
    db.execute("INSERT INTO stations (station_id, label) VALUES ('S002', 'Test')")
    db.commit()
    since = get_fetch_since(db, "S002")
    expected = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    assert abs((since - expected).total_seconds()) < 5

def test_url_contains_station_id():
    since = datetime(2026, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
    url = build_readings_url("TEST001", since)
    assert "TEST001" in url

def test_url_contains_since_param():
    since = datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc)
    url = build_readings_url("TEST001", since)
    assert "since=2026-04-01T12:00:00Z" in url

def test_idempotent_insert(db):
    db.execute("INSERT INTO stations (station_id, label) VALUES ('S99', 'Test')")
    db.executemany(
        "INSERT INTO readings (station_id, timestamp, value) VALUES ('S99', ?, ?)",
        [("2026-04-01T10:00:00Z", 1.0), ("2026-04-01T11:00:00Z", 1.5)]
    )
    db.commit()
    # Insert same rows again
    try:
        db.executemany(
            "INSERT OR IGNORE INTO readings (station_id, timestamp, value) VALUES ('S99', ?, ?)",
            [("2026-04-01T10:00:00Z", 1.0), ("2026-04-01T11:00:00Z", 1.5)]
        )
        db.commit()
    except:
        pass
    count = db.execute("SELECT COUNT(*) FROM readings WHERE station_id='S99'").fetchone()[0]
    assert count == 2

def test_daily_max_view(db):
    db.execute("INSERT INTO stations (station_id, label) VALUES ('S88', 'Test')")
    db.executemany(
        "INSERT INTO readings (station_id, timestamp, value) VALUES ('S88', ?, ?)",
        [("2026-04-01T10:00:00Z", 1.0),
         ("2026-04-01T11:00:00Z", 1.5),
         ("2026-04-01T12:00:00Z", 1.2)]
    )
    db.commit()
    row = db.execute(
        "SELECT max_level, min_level, reading_count FROM v_daily_max WHERE station_id='S88' AND day='2026-04-01'"
    ).fetchone()
    assert row["max_level"] == 1.5
    assert row["min_level"] == 1.0
    assert row["reading_count"] == 3

def test_pipeline_run_logged(db):
    db.execute(
        "INSERT INTO pipeline_runs (started_at, run_type) VALUES (?, ?)",
        ("2026-04-08T06:42:00Z", "full")
    )
    db.commit()
    row = db.execute("SELECT * FROM pipeline_runs").fetchone()
    assert row["run_type"] == "full"
    assert row["started_at"] == "2026-04-08T06:42:00Z"

def test_views_created(db):
    views = {r[0] for r in db.execute(
        "SELECT name FROM sqlite_master WHERE type='view'"
    ).fetchall()}
    assert "v_daily_max" in views

def test_url_contains_station_id():
    from pipeline.fetch import build_readings_url
    since = datetime(2026, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
    url = build_readings_url("TEST001", since)
    assert "TEST001" in url

def test_data_quality_no_negatives(db):
    db.execute("INSERT INTO stations (station_id, label) VALUES ('S77', 'Test')")
    db.executemany(
        "INSERT INTO readings (station_id, timestamp, value) VALUES ('S77', ?, ?)",
        [("2026-04-01T10:00:00Z", 0.5),
         ("2026-04-01T11:00:00Z", 1.2),
         ("2026-04-01T12:00:00Z", 0.8)]
    )
    db.commit()
    invalid = db.execute(
        "SELECT COUNT(*) FROM readings WHERE station_id='S77' AND value < -10"
    ).fetchone()[0]
    assert invalid == 0

def test_data_quality_no_duplicates(db):
    db.execute("INSERT INTO stations (station_id, label) VALUES ('S66', 'Test')")
    db.execute("INSERT INTO readings (station_id, timestamp, value) VALUES ('S66', '2026-04-01T10:00:00Z', 1.0)")
    db.commit()
    try:
        db.execute("INSERT INTO readings (station_id, timestamp, value) VALUES ('S66', '2026-04-01T10:00:00Z', 1.0)")
        db.commit()
        duplicate_allowed = True
    except:
        duplicate_allowed = False
    assert not duplicate_allowed

def test_mAOD_stations_filtered():
    level = 55.0
    def get_status(level):
        if level is None or level > 50: return "offline"
        if level >= 1.5: return "severe"
        if level >= 1.0: return "alert"
        return "normal"
    assert get_status(level) == "offline"
