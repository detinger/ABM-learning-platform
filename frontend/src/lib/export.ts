import type { HistoryPoint } from '../types';
import type { MetricConfig } from '../models/configs';

export function historyToCsv(data: HistoryPoint[], metrics: MetricConfig[]): string {
  const header = ['step', ...metrics.map((m) => m.key)].join(',');
  const lines = data.map((row) => [row.step, ...metrics.map((m) => row[m.key] ?? '')].join(','));
  return [header, ...lines].join('\n') + '\n';
}

export function downloadText(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
