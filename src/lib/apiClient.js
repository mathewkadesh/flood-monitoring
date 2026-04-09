const LIVE_API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:5000/api';
const DEMO_API_BASE = `${process.env.PUBLIC_URL || ''}/demo-api`;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function isDemoMode() {
  if (!isBrowser()) return false;
  return window.location.hostname.endsWith('github.io');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function liveUrl(path) {
  return `${LIVE_API_BASE}${path}`;
}

function demoUrl(path) {
  return `${DEMO_API_BASE}${path}`;
}

let stationsCache = null;
let stationReadingsCache = null;

async function getDemoStations() {
  if (!stationsCache) {
    stationsCache = await fetchJson(demoUrl('/stations.json'));
  }
  return stationsCache;
}

async function getDemoStationReadings() {
  if (!stationReadingsCache) {
    stationReadingsCache = await fetchJson(demoUrl('/station-readings.json'));
  }
  return stationReadingsCache;
}

export async function getStats() {
  return isDemoMode() ? fetchJson(demoUrl('/stats.json')) : fetchJson(liveUrl('/stats'));
}

export async function getTop5() {
  return isDemoMode() ? fetchJson(demoUrl('/top5.json')) : fetchJson(liveUrl('/top5'));
}

export async function getPipelineRuns() {
  return isDemoMode() ? fetchJson(demoUrl('/pipeline-runs.json')) : fetchJson(liveUrl('/pipeline/runs'));
}

export async function getWarnings() {
  return isDemoMode() ? fetchJson(demoUrl('/warnings.json')) : fetchJson(liveUrl('/warnings'));
}

export async function getChartTopStations(range) {
  return isDemoMode()
    ? fetchJson(demoUrl(`/chart-top-stations-${range}.json`))
    : fetchJson(liveUrl(`/chart/top-stations?range=${range}`));
}

export async function getCatchmentSummary() {
  return isDemoMode()
    ? fetchJson(demoUrl('/bi-catchment-summary.json'))
    : fetchJson(liveUrl('/bi/catchment-summary'));
}

export async function getHourlyPattern() {
  return isDemoMode()
    ? fetchJson(demoUrl('/bi-hourly-pattern.json'))
    : fetchJson(liveUrl('/bi/hourly-pattern'));
}

export async function getRainfall() {
  return isDemoMode() ? fetchJson(demoUrl('/rainfall.json')) : fetchJson(liveUrl('/rainfall'));
}

export async function getStations({ page = 1, limit = 50, search = '', river = '' } = {}) {
  if (!isDemoMode()) {
    const params = new URLSearchParams({
      page,
      limit,
      ...(search && { search }),
      ...(river && { river }),
    });
    return fetchJson(liveUrl(`/stations?${params}`));
  }

  const allStations = await getDemoStations();
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedRiver = river.trim().toLowerCase();

  let filtered = allStations.filter((station) => {
    const matchesSearch = !normalizedSearch || [
      station.id,
      station.name,
      station.river,
      station.town,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

    const matchesRiver = !normalizedRiver
      || String(station.river || '').toLowerCase().includes(normalizedRiver);

    return matchesSearch && matchesRiver;
  });

  const total = filtered.length;
  const pageSize = Number(limit) || 50;
  const currentPage = Number(page) || 1;
  const offset = (currentPage - 1) * pageSize;
  filtered = filtered.slice(offset, offset + pageSize);

  return {
    stations: filtered,
    total,
    page: currentPage,
    limit: pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getStationReadings(stationId) {
  if (!isDemoMode()) {
    return fetchJson(liveUrl(`/stations/${stationId}/readings`));
  }

  const readingsMap = await getDemoStationReadings();
  return readingsMap[stationId] || [];
}

export function getStationsExportUrl() {
  return isDemoMode()
    ? demoUrl('/flood-stations.csv')
    : liveUrl('/export/stations');
}

export function getWarningsDownloadUrl() {
  return isDemoMode() ? demoUrl('/warnings.json') : liveUrl('/warnings');
}

export function getCatchmentSummaryDownloadUrl() {
  return isDemoMode()
    ? demoUrl('/bi-catchment-summary.json')
    : liveUrl('/bi/catchment-summary');
}

export function getHourlyPatternDownloadUrl() {
  return isDemoMode()
    ? demoUrl('/bi-hourly-pattern.json')
    : liveUrl('/bi/hourly-pattern');
}

export function getPipelineRunsDownloadUrl() {
  return isDemoMode()
    ? demoUrl('/pipeline-runs.json')
    : liveUrl('/pipeline/runs');
}
