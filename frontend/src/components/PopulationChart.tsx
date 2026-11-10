import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import type { HistoryPoint } from '../types';
import type { MetricConfig } from '../models/configs';
import { useTokens } from '../app/theme';
import { EmptyState } from './ui';

/** Points drawn at once; older history stays available in the table and CSV export. */
const CHART_WINDOW = 600;
const CHROME = ['chart-grid', 'chart-axis', 'chart-muted', 'chart-surface', 'text', 'border'] as const;

interface Props {
  data: HistoryPoint[];
  metrics: MetricConfig[];
}

const PopulationChart: React.FC<Props> = ({ data, metrics }) => {
  const names = useMemo(() => [...CHROME, ...metrics.map((m) => m.token)], [metrics]);
  const c = useTokens(names);
  const visible = data.length > CHART_WINDOW ? data.slice(data.length - CHART_WINDOW) : data;

  if (data.length === 0) {
    return (
      <EmptyState icon={<LineChartIcon size={22} />} title="No data yet">
        <p>Run or step the simulation to plot each metric over time.</p>
      </EmptyState>
    );
  }

  const axisTick = { fill: c['chart-muted'], fontSize: 11 };

  return (
    <div className="flex flex-col gap-3">
      <div className="legend" aria-hidden>
        {metrics.map((m) => (
          <span key={m.key} className="legend-item">
            <span className="swatch" style={{ background: c[m.token] }} />
            {m.label}
          </span>
        ))}
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visible} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={c['chart-grid']} vertical={false} />
            <XAxis
              dataKey="step"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: c['chart-axis'] }}
              allowDecimals={false}
            />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              isAnimationActive={false}
              labelFormatter={(step) => `Step ${step}`}
              contentStyle={{
                background: c['chart-surface'],
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 12,
                color: c.text,
                boxShadow: 'var(--shadow)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 2 }}
            />
            {metrics.map((m) => (
              <Area
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={c[m.token]}
                strokeWidth={2}
                fill={c[m.token]}
                fillOpacity={0.1}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {data.length > CHART_WINDOW && (
        <p className="hint m-0">Showing the last {CHART_WINDOW} of {data.length} steps.</p>
      )}
    </div>
  );
};

export default PopulationChart;
