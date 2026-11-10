import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { MODEL_CONFIGS, MODEL_ORDER, type ModelConfig } from '../models/configs';
import { Link } from '../app/router';
import ModelPreview from '../components/ModelPreview';

const ModelCard: React.FC<{ config: ModelConfig }> = ({ config }) => {
  const Icon = config.icon;
  return (
    <Link to={`/models/${config.id}`} className="card card-link">
      <div className="card-preview">
        <ModelPreview config={config} />
      </div>
      <div className="card-body">
        <h3 className="mb-0.5 flex items-center gap-2">
          <Icon size={16} className="text-primary" aria-hidden />
          {config.name}
        </h3>
        <p className="mb-2 text-[13px] text-subtle">{config.tagline}</p>
        <p className="mb-3 line-clamp-3 text-[13px] text-muted">{config.description}</p>
        <div className="chips mb-3">
          {config.concepts.slice(0, 3).map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between text-[13px]">
          <span className="text-subtle">{config.parameterConfig.length} parameters</span>
          <span className="flex items-center gap-1 font-semibold text-primary">
            Open model <ArrowRight size={14} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
};

const ABOUT = [
  {
    title: 'What is agent-based modeling?',
    text: 'Agent-based models simulate autonomous agents that follow simple local rules. System-level patterns emerge from their interactions, with no central controller.',
  },
  {
    title: 'Why Mesa?',
    text: 'Mesa is a Python framework for agent-based modeling. It handles scheduling, spatial grids and data collection, and works with the standard scientific Python stack.',
  },
  {
    title: 'How to use this platform',
    text: 'Open a model and read its rules, then select Run simulation. Use Step to advance one tick at a time. Change parameters and create a new simulation to compare outcomes.',
  },
];

const ModelLibrary: React.FC = () => {
  useEffect(() => {
    document.title = 'ABM Learning Platform';
  }, []);

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div>
          <div className="eyebrow">Agent-based modeling</div>
          <h1 className="hero-title">Model library</h1>
          <p className="page-description hero-description">
            Six classic agent-based models, from epidemics to wealth inequality. Each one is interactive: change the
            parameters and watch system-level behavior emerge step by step.
          </p>
        </div>
      </header>

      <section aria-label="Models" className="collection">
        {MODEL_ORDER.map((id) => (
          <ModelCard key={id} config={MODEL_CONFIGS[id]} />
        ))}
      </section>

      <section aria-label="About" className="grid-3 mt-8">
        {ABOUT.map(({ title, text }) => (
          <div key={title} className="card">
            <h3>{title}</h3>
            <p className="m-0 text-[13px] text-muted">{text}</p>
          </div>
        ))}
      </section>

      <p className="hint mt-8 text-center">Built with Mesa 3, FastAPI, React and Recharts.</p>
    </div>
  );
};

export default ModelLibrary;
