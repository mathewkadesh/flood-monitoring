import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const data = [
  { date: '01 Apr', thames: 0.72, severn: 1.10, trent: 0.50 },
  { date: '02 Apr', thames: 0.88, severn: 1.30, trent: 0.60 },
  { date: '03 Apr', thames: 1.14, severn: 1.80, trent: 0.80 },
  { date: '04 Apr', thames: 1.52, severn: 2.00, trent: 0.90 },
  { date: '05 Apr', thames: 1.79, severn: 2.20, trent: 1.05 },
  { date: '06 Apr', thames: 1.84, severn: 2.31, trent: 1.12 },
  { date: '07 Apr', thames: 1.84, severn: 2.31, trent: 1.12 },
];

function WaterLevelChart() {
  return (
    <div className="card">
      <div className="card-title">Water Level Trend — 7 Days</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#7A8BA0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#7A8BA0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}m`}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(11,31,58,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#E8EDF4',
              fontSize: 12
            }}
          />
          <ReferenceLine y={1.2} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Line type="monotone" dataKey="thames" name="Thames"
            stroke="#00A86B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="severn" name="Severn"
            stroke="#F59E0B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="trent" name="Trent"
            stroke="#3B82F6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {[['Thames','#00A86B'],['Severn','#F59E0B'],['Trent','#3B82F6']].map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7A8BA0' }}>
            <div style={{ width: 20, height: 2, background: color, borderRadius: 2 }}></div>
            {name}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7A8BA0' }}>
          <div style={{ width: 20, height: 2, background: '#EF4444', borderRadius: 2, opacity: 0.6 }}></div>
          Alert threshold
        </div>
      </div>
    </div>
  );
}

export default WaterLevelChart;