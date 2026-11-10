import React from 'react';
import { Table2 } from 'lucide-react';
import type { HistoryPoint } from '../types';
import type { MetricConfig } from '../models/configs';
import { EmptyState } from './ui';

const ROWS = 200;

const fmt = (v: number | undefined) =>
  typeof v !== 'number' ? '—' : Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Table view of the time series (most recent first). The full series is in the CSV export. */
const HistoryTable: React.FC<{ data: HistoryPoint[]; metrics: MetricConfig[] }> = ({ data, metrics }) => {
  if (data.length === 0) {
    return (
      <EmptyState icon={<Table2 size={22} />} title="No data yet">
        <p>Each step adds a row with the value of every metric.</p>
      </EmptyState>
    );
  }
  const rows = data.slice(-ROWS).reverse();
  return (
    <div className="flex flex-col gap-2">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" className="num">Step</th>
              {metrics.map((m) => (
                <th key={m.key} scope="col" className="num">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.step}>
                <td className="num">{row.step}</td>
                {metrics.map((m) => (
                  <td key={m.key} className="num">{fmt(row[m.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > ROWS && <p className="hint m-0">Showing the latest {ROWS} of {data.length} steps. Export CSV for all of them.</p>}
    </div>
  );
};

export default HistoryTable;
