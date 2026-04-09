import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiMapPin, FiDroplet, FiClock, FiActivity } from 'react-icons/fi';
import { getStationReadings, getStations } from '../lib/apiClient';

const statusColor = { normal: '#00A86B', alert: '#F59E0B', severe: '#EF4444', offline: '#7A8BA0' };

function ExpandedRow({ station }) {
  const [readings, setReadings] = useState([]);

  useEffect(() => {
    getStationReadings(station.id)
      .then(setReadings)
      .catch(() => {});
  }, [station.id]);

  return (
    <tr className="expanded-row">
      <td colSpan={7}>
        <div className="expanded-content">
          <div className="exp-card">
            <div className="exp-label"><FiMapPin size={10} style={{marginRight:4}}/>Location</div>
            <div className="exp-value">{station.lat?.toFixed(4) || '—'}</div>
            <div style={{fontSize:10,color:'#7A8BA0',marginTop:2}}>{station.lon?.toFixed(4) || '—'}</div>
          </div>
          <div className="exp-card">
            <div className="exp-label"><FiDroplet size={10} style={{marginRight:4}}/>Current Level</div>
            <div className="exp-value" style={{color: statusColor[station.status]}}>
              {station.level !== null ? station.level + ' m' : 'Offline'}
            </div>
          </div>
          <div className="exp-card">
            <div className="exp-label"><FiActivity size={10} style={{marginRight:4}}/>Total Readings</div>
            <div className="exp-value">{station.readings?.toLocaleString() || '—'}</div>
          </div>
          <div className="exp-card">
            <div className="exp-label"><FiClock size={10} style={{marginRight:4}}/>Last Reading</div>
            <div className="exp-value" style={{fontSize:11}}>
              {station.lastReading !== 'N/A'
                ? station.lastReading?.replace('T',' ').slice(0,16)
                : 'N/A'}
            </div>
          </div>
          <div>
            {station.level !== null && (
              <div style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#7A8BA0',marginBottom:4}}>
                  <span>Water Level</span>
                  <span>{station.level}m / 3.0m</span>
                </div>
                <div style={{background:'rgba(255,255,255,0.06)',borderRadius:6,height:6,overflow:'hidden'}}>
                  <div style={{
                    width:`${Math.min((station.level/3)*100,100)}%`,
                    height:'100%',
                    background:statusColor[station.status],
                    borderRadius:6
                  }}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#7A8BA0',marginTop:3}}>
                  <span>0m</span>
                  <span style={{color:'#EF4444'}}>⚠ 1.2m</span>
                  <span>3.0m</span>
                </div>
              </div>
            )}
            {readings.length > 0 && (
              <div>
                <div style={{fontSize:10,color:'#7A8BA0',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                  Recent Readings
                </div>
                <div className="readings-list">
                  {readings.slice(0,8).map((r,i) => (
                    <div key={i} className="reading-row">
                      <span style={{color:'#7A8BA0'}}>{r.timestamp?.replace('T',' ').slice(0,16)}</span>
                      <span style={{color:'#00A86B'}}>{r.value?.toFixed(3)} m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function StationTable() {
  const [stations, setStations]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [riverFilter, setRiverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [sortKey, setSortKey]       = useState('name');
  const [sortDir, setSortDir]       = useState('asc');
  const [expanded, setExpanded]     = useState(null);

  const fetchStations = useCallback(() => {
    setLoading(true);
    getStations({
      page,
      limit: 50,
      search,
      river: riverFilter,
    })
      .then(data => {
        setStations(data.stations || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, riverFilter]);

  useEffect(() => { fetchStations(); }, [fetchStations]);

  // Live search as you type
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchStations(); }, 400);
    return () => clearTimeout(timer);
  }, [search, riverFilter, fetchStations]);
  
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...stations].sort((a, b) => {
    let av = a[sortKey] ?? -1;
    let bv = b[sortKey] ?? -1;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const filtered = statusFilter === 'all' ? sorted : sorted.filter(s => s.status === statusFilter);
  const arrow = (key) => sortKey === key ? (sortDir === 'asc' ? <FiChevronUp size={10}/> : <FiChevronDown size={10}/>) : null;

  return (
    <div className="table-card">
      <div className="table-controls">
        <div className="controls-top">
          <span style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
            <FiFilter size={13} style={{color:'#00A86B'}}/>
            Station Status
            {loading && <span style={{color:'#7A8BA0',fontWeight:400,fontSize:11}}>· Loading...</span>}
          </span>
          <span style={{fontSize:11,color:'#7A8BA0'}}>
            {filtered.length} of {total.toLocaleString()} stations · click row to expand
          </span>
        </div>

        <div className="controls-row">
          {/* Live Search */}
          <div className="search-wrap">
            <FiSearch className="search-icon"/>
            <input
              type="text"
              className="search-input"
              placeholder="Search station, river, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* River Filter */}
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by river..."
            value={riverFilter}
            onChange={e => { setRiverFilter(e.target.value); setPage(1); }}
          />

          {/* Date Range */}
          <input
            type="date"
            className="date-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="From date"
          />
          <input
            type="date"
            className="date-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="To date"
          />

          {/* Status Filters */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['all','severe','alert','normal','offline'].map(f => (
              <button
                key={f}
                className={`status-btn ${statusFilter===f?'active':''}`}
                onClick={() => setStatusFilter(f)}
              >{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                ['id','Station ID'],
                ['name','Name'],
                ['river','River'],
                ['town','Town'],
                ['level','Level (m)'],
                ['status','Status'],
                ['readings','Readings'],
              ].map(([key,label]) => (
                <th key={key} onClick={() => handleSort(key)}>
                  {label} {arrow(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading ? (
              <tr><td colSpan={7} style={{textAlign:'center',color:'#7A8BA0',padding:32}}>
                No stations found
              </td></tr>
            ) : filtered.map(s => (
              <React.Fragment key={s.id}>
                <tr
                  className={expanded===s.id ? 'expanded' : ''}
                  onClick={() => setExpanded(expanded===s.id ? null : s.id)}
                >
                  <td>{s.id}</td>
                  <td className="name">
                    {expanded===s.id
                      ? <FiChevronUp size={12} style={{marginRight:6,color:'#00A86B'}}/>
                      : <FiChevronDown size={12} style={{marginRight:6,color:'#7A8BA0'}}/>
                    }
                    {s.name}
                  </td>
                  <td>{s.river}</td>
                  <td>{s.town}</td>
                  <td style={{color: s.level!==null ? statusColor[s.status] : '#7A8BA0'}}>
                    {s.level !== null ? s.level : '—'}
                  </td>
                  <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                  <td>{s.readings?.toLocaleString() || '—'}</td>
                </tr>
                {expanded===s.id && <ExpandedRow station={s} />}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span style={{fontSize:11,color:'#7A8BA0'}}>
          Page {page} of {pages} · {total.toLocaleString()} total stations
        </span>
        <div style={{display:'flex',gap:6}}>
          <button className="page-btn" onClick={()=>setPage(1)} disabled={page===1}>« First</button>
          <button className="page-btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹ Prev</button>
          <button className="page-btn" onClick={()=>setPage(p=>p+1)} disabled={page===pages}>Next ›</button>
          <button className="page-btn" onClick={()=>setPage(pages)} disabled={page===pages}>Last »</button>
        </div>
      </div>
    </div>
  );
}

export default StationTable;
