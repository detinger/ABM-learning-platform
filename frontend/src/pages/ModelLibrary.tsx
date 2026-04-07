import React from 'react';
import { Github, BookOpen, Cpu } from 'lucide-react';
import { MODEL_CONFIGS, MODEL_ORDER, ModelConfig } from '../models/configs';

interface ModelCardProps {
  config: ModelConfig;
  onSelect: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ config, onSelect }) => (
  <button
    onClick={onSelect}
    className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 hover:border-slate-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl text-left w-full"
  >
    {/* Gradient header */}
    <div
      className="h-24 flex items-center justify-center text-5xl"
      style={{ background: config.gradient }}
    >
      {config.icon}
    </div>

    <div className="p-5">
      <h3 className="text-lg font-bold text-slate-100 group-hover:text-white">{config.name}</h3>
      <p className="text-xs text-slate-400 mt-0.5 mb-3 font-medium">{config.tagline}</p>
      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{config.description}</p>

      {/* Concept tags */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {config.concepts.slice(0, 3).map((c) => (
          <span
            key={c}
            className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-slate-500">{config.parameterConfig.length} parameters</span>
        <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
          Launch →
        </span>
      </div>
    </div>
  </button>
);

interface Props {
  onSelectModel: (id: string) => void;
}

const ModelLibrary: React.FC<Props> = ({ onSelectModel }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    {/* Header */}
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ABM Learning Platform</h1>
            <p className="text-xs text-slate-500">Agent-Based Modeling with Mesa 3 & FastAPI</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://mesa.readthedocs.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Mesa Docs</span>
          </a>
          <a
            href="https://github.com/projectmesa/mesa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>

    {/* Hero */}
    <div className="max-w-7xl mx-auto px-6 pt-14 pb-10 text-center">
      <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
        Explore Agent-Based Models
      </h2>
      <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Six canonical ABM models covering everything from epidemics to wealth inequality.
        Each model is interactive — tweak parameters and watch emergence unfold in real time.
      </p>
    </div>

    {/* Model grid */}
    <main className="max-w-7xl mx-auto px-6 pb-20">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODEL_ORDER.map((id) => (
          <ModelCard
            key={id}
            config={MODEL_CONFIGS[id]}
            onSelect={() => onSelectModel(id)}
          />
        ))}
      </div>

      {/* About ABM section */}
      <div className="mt-16 grid md:grid-cols-3 gap-6">
        {[
          {
            title: 'What is ABM?',
            text: 'Agent-Based Modeling simulates autonomous agents following simple rules. Complex, emergent patterns arise from local interactions — no central controller needed.',
          },
          {
            title: 'Why Mesa?',
            text: 'Mesa is a Python ABM framework built on top of standard scientific Python. It handles agent scheduling, spatial grids, data collection, and visualization.',
          },
          {
            title: 'How to use',
            text: 'Pick a model, read the rules, then press Start. Use Step to advance one tick at a time. Adjust parameters and create a new simulation to see how outcomes change.',
          },
        ].map(({ title, text }) => (
          <div key={title} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </main>

    <footer className="border-t border-slate-800 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 py-4 text-sm text-slate-500 text-center">
        Built with Mesa 3 · FastAPI · React · Recharts
      </div>
    </footer>
  </div>
);

export default ModelLibrary;
