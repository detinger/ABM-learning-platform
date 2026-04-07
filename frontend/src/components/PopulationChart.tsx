import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { HistoryPoint } from '../types';
import { MetricConfig } from '../models/configs';

interface Props {
  data: HistoryPoint[];
  metrics: MetricConfig[];
}

const PopulationChart: React.FC<Props> = ({ data, metrics }) => {
  if (data.length === 0) {
    return (
      <div className="h-56 bg-slate-900/50 rounded-xl border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Start the simulation to see data</p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            {metrics.map((m) => (
              <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="step"
            stroke="#334155"
            tick={{ fill: '#475569', fontSize: 11 }}
          />
          <YAxis
            stroke="#334155"
            tick={{ fill: '#475569', fontSize: 11 }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
              color: '#f1f5f9',
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
          />
          {metrics.map((m) => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              fill={`url(#grad-${m.key})`}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PopulationChart;
