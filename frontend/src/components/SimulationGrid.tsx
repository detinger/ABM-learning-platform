import React, { useMemo } from 'react';
import { Agent } from '../types';
import { ModelConfig, renderCell } from '../models/configs';

interface CellProps {
  agents: Agent[];
  size: number;
  config: ModelConfig;
}

const GridCell: React.FC<CellProps> = React.memo(({ agents, size, config }) => {
  const { backgroundColor, foreground } = renderCell(agents, config);

  return (
    <div
      style={{ width: size, height: size, backgroundColor, position: 'relative' }}
      className="border-[0.5px] border-black/20"
    >
      {foreground.length > 0 && (
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-[1px] p-[1px]">
          {foreground.slice(0, 4).map((dot, i) => (
            <div
              key={i}
              className={dot.animate ? 'rounded-full animate-pulse' : 'rounded-full'}
              style={{
                width: Math.min(dot.size, size - 2),
                height: Math.min(dot.size, size - 2),
                backgroundColor: dot.color,
                flexShrink: 0,
              }}
            />
          ))}
          {foreground.length > 4 && (
            <span style={{ fontSize: 7, color: '#94a3b8', lineHeight: 1 }}>+{foreground.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
});

GridCell.displayName = 'GridCell';

interface SimulationGridProps {
  gridState: { width: number; height: number; agents: Agent[] } | null;
  config: ModelConfig;
  error?: string | null;
  maxSize?: number;
}

const SimulationGrid: React.FC<SimulationGridProps> = ({ gridState, config, error, maxSize = 640 }) => {
  if (!gridState) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-900/50 rounded-xl border border-slate-700">
        <div className="text-slate-500 flex flex-col items-center gap-4">
          {error ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-red-300">Could not connect to simulation</p>
                <p className="max-w-md text-xs text-slate-400">{error}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-slate-400 animate-spin" />
              <p className="text-sm">Connecting to simulation...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const { width, height, agents } = gridState;

  const cellSize = Math.min(
    Math.floor(maxSize / width),
    Math.floor(maxSize / height),
    28
  );

  const agentsByPos = useMemo(() => {
    const map = new Map<string, Agent[]>();
    for (const agent of agents) {
      const key = `${agent.x},${agent.y}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(agent);
    }
    return map;
  }, [agents]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
          width: width * cellSize,
          height: height * cellSize,
        }}
        className="rounded-lg overflow-hidden shadow-2xl border border-slate-700"
      >
        {Array.from({ length: height * width }, (_, idx) => {
          const x = idx % width;
          const y = Math.floor(idx / width);
          return (
            <GridCell
              key={idx}
              agents={agentsByPos.get(`${x},${y}`) ?? []}
              size={cellSize}
              config={config}
            />
          );
        })}
      </div>
      <p className="text-xs text-slate-600">{width} × {height} grid · {cellSize}px/cell</p>
    </div>
  );
};

export default SimulationGrid;
