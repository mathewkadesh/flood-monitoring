import asyncio
import aiohttp
import sqlite3
import logging
from datetime import datetime, timedelta, timezone

BASE_URL      = "http://environment.data.gov.uk/flood-monitoring"
DB_PATH       = "db/flood.db"
MAX_WORKERS   = 10
RATE_LIMIT    = 0.1
TIMEOUT       = 30
LOOKBACK_DAYS = 7

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)


def init_db(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS stations (
            station_id   TEXT PRIMARY KEY,
            label        TEXT,
            river        TEXT,
            town         TEXT,
            lat          REAL,
            lon          REAL,
            unit         TEXT,
            last_fetched TEXT
        );

        CREATE TABLE IF NOT EXISTS readings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            station_id   TEXT NOT NULL,
            measure_id   TEXT,
            timestamp    TEXT NOT NULL,
            value        REAL NOT NULL,
            UNIQUE(station_id, timestamp),
            FOREIGN KEY (station_id) REFERENCES stations(station_id)
        );

        CREATE TABLE IF NOT EXISTS pipeline_runs (
            run_id        INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at    TEXT NOT NULL,
            finished_at   TEXT,
            stations_ok   INTEGER DEFAULT 0,
            stations_err  INTEGER DEFAULT 0,
            rows_inserted INTEGER DEFAULT 0,
            run_type      TEXT DEFAULT 'incremental'
        );

        CREATE INDEX IF NOT EXISTS idx_readings_station_ts
            ON readings(station_id, timestamp);

        CREATE VIEW IF NOT EXISTS v_daily_max AS
            SELECT
                station_id,
                DATE(timestamp) AS day,
                MAX(value)      AS max_level,
                MIN(value)      AS min_level,
                AVG(value)      AS avg_level,
                COUNT(*)        AS reading_count
            FROM readings
            GROUP BY station_id, DATE(timestamp);
    """)
    conn.commit()
    log.info("Database ready at %s", db_path)
    return conn


def get_fetch_since(conn, station_id):
    row = conn.execute(
        "SELECT last_fetched FROM stations WHERE station_id = ?", (station_id,)
    ).fetchone()
    if row and row["last_fetched"]:
        return datetime.fromisoformat(row["last_fetched"]).replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)


def build_readings_url(station_id, since):
    since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    return (
        f"{BASE_URL}/id/stations/{station_id}/readings"
        f"?since={since_str}&_sorted&_limit=10000"
    )


async def fetch_station_readings(session, station, conn, semaphore, run_id):
    station_id = station.get("notation") or station.get("@id", "").split("/")[-1]
    result = {"station_id": station_id, "rows_inserted": 0, "error": None}

    async with semaphore:
        await asyncio.sleep(RATE_LIMIT)
        try:
            since = get_fetch_since(conn, station_id)
            url   = build_readings_url(station_id, since)

            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                if resp.status == 404:
                    return result
                resp.raise_for_status()
                data = await resp.json()

            readings = data.get("items", [])
            if not readings:
                return result

            measures = station.get("measures", [{}])
            unit     = measures[0].get("unitName", "") if isinstance(measures, list) else ""

            conn.execute("""
                INSERT INTO stations (station_id, label, river, town, lat, lon, unit, last_fetched)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(station_id) DO UPDATE SET
                    label        = excluded.label,
                    river        = excluded.river,
                    town         = excluded.town,
                    lat          = excluded.lat,
                    lon          = excluded.lon,
                    unit         = excluded.unit,
                    last_fetched = excluded.last_fetched
            """, (
                station_id,
                station.get("label", ""),
                station.get("riverName", ""),
                station.get("town", ""),
                station.get("lat"),
                station.get("long"),
                unit,
                datetime.now(timezone.utc).isoformat(),
            ))

            rows = []
            for r in readings:
                ts  = r.get("dateTime", "")
                val = r.get("value")
                mid = r.get("measure", "")
                if ts and val is not None:
                    rows.append((station_id, mid, ts, float(val)))

            conn.executemany("""
                INSERT OR IGNORE INTO readings (station_id, measure_id, timestamp, value)
                VALUES (?, ?, ?, ?)
            """, rows)
            conn.commit()

            result["rows_inserted"] = len(rows)
            log.info("%-25s → %4d rows", station_id, len(rows))

        except aiohttp.ClientError as e:
            result["error"] = str(e)
            log.error("Station %s — %s", station_id, e)
        except Exception as e:
            result["error"] = str(e)
            log.exception("Station %s — unexpected: %s", station_id, e)

    return result


async def run_pipeline(db_path=DB_PATH, full=False):
    conn = init_db(db_path)

    started_at = datetime.now(timezone.utc).isoformat()
    run_type   = "full" if full else "incremental"
    cur = conn.execute(
        "INSERT INTO pipeline_runs (started_at, run_type) VALUES (?, ?)",
        (started_at, run_type),
    )
    run_id = cur.lastrowid
    conn.commit()

    semaphore = asyncio.Semaphore(MAX_WORKERS)
    connector = aiohttp.TCPConnector(limit=MAX_WORKERS, ttl_dns_cache=300)

    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.get(f"{BASE_URL}/id/stations?_limit=10000") as resp:
            data     = await resp.json()
            stations = data.get("items", [])
        log.info("Found %d stations", len(stations))

        tasks   = [fetch_station_readings(session, st, conn, semaphore, run_id) for st in stations]
        results = await asyncio.gather(*tasks)

    ok   = sum(1 for r in results if not r["error"])
    err  = sum(1 for r in results if r["error"])
    rows = sum(r["rows_inserted"] for r in results)

    conn.execute("""
        UPDATE pipeline_runs
        SET finished_at=?, stations_ok=?, stations_err=?, rows_inserted=?
        WHERE run_id=?
    """, (datetime.now(timezone.utc).isoformat(), ok, err, rows, run_id))
    conn.commit()
    conn.close()

    log.info("Done — OK: %d | ERR: %d | Rows inserted: %d", ok, err, rows)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Full 7-day backfill")
    parser.add_argument("--db",   default=DB_PATH)
    args = parser.parse_args()
    asyncio.run(run_pipeline(db_path=args.db, full=args.full))