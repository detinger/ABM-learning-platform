import React, { useEffect, useState } from 'react';
import { ArrowLeft, Code } from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import SimulationGrid from '../components/SimulationGrid';
import PopulationChart from '../components/PopulationChart';
import ControlPanel from '../components/ControlPanel';
import CodeModal from '../components/CodeModal';
import { MODEL_CONFIGS, transformParams } from '../models/configs';
import { generateCode } from '../models/codeGenerators';

interface Props {
  modelId: string;
  onBack: () => void;
}

const SimulationPage: React.FC<Props> = ({ modelId, onBack }) => {
  const config = MODEL_CONFIGS[modelId];

  const {
    simulationId,
    gridState,
    history,
    isRunning,
    isConnected,
    error,
    createSimulation,
    connectWebSocket,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    resetSimulation,
  } = useSimulation();

  const [params, setParams] = useState<Record<string, number>>(config.defaultParams);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const backendParams = transformParams(modelId, config.defaultParams);
    void createSimulation({ model_type: modelId, params: backendParams })
      .then(connectWebSocket)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const handleCreateNew = (newParams: Record<string, number>) => {
    const backendParams = transformParams(modelId, newParams);
    void createSimulation({ model_type: modelId, params: backendParams })
      .then(connectWebSocket)
      .catch(() => undefined);
  };

  const code = generateCode(modelId, transformParams(modelId, params));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Models</span>
          </button>

          <div className="h-5 border-l border-slate-700" />

          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">{config.name}</h1>
              <p className="text-xs text-slate-500">{config.tagline}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowCode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <Code className="w-3.5 h-3.5" />
              Python Code
            </button>
            {simulationId && (
              <span className="text-xs text-slate-600 font-mono hidden sm:block">id:{simulationId}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Grid + Chart */}
          <div className="space-y-6">
            {/* Grid */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300">Grid Visualization</h2>
                <div className="flex flex-wrap gap-3">
                  {config.legend.map((entry) => (
                    <div key={entry.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div
                        className="w-3 h-3 rounded-full border border-slate-600"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <SimulationGrid gridState={gridState} config={config} error={error} maxSize={640} />
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Time Series</h2>
              <PopulationChart data={history} metrics={config.metrics} />
            </div>

            {/* Model info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Rules</h3>
                <ul className="space-y-2">
                  {config.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-slate-600 mt-0.5">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Key Concepts</h3>
                <div className="flex flex-wrap gap-2">
                  {config.concepts.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  <p>• Press <strong className="text-slate-400">Start</strong> for continuous simulation</p>
                  <p>• Press <strong className="text-slate-400">Step</strong> to advance one tick</p>
                  <p>• Click <strong className="text-slate-400">Python Code</strong> to export for Colab</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div>
            <ControlPanel
              config={config}
              params={params}
              setParams={setParams}
              isRunning={isRunning}
              isConnected={isConnected}
              currentStep={gridState?.step ?? 0}
              counts={gridState?.counts ?? {}}
              onStart={startSimulation}
              onPause={pauseSimulation}
              onStep={stepSimulation}
              onReset={resetSimulation}
              onCreateNew={handleCreateNew}
              error={error}
            />
          </div>
        </div>
      </main>

      {/* Code modal */}
      {showCode && (
        <CodeModal
          modelName={config.name}
          code={code}
          onClose={() => setShowCode(false)}
        />
      )}
    </div>
  );
};

export default SimulationPage;
