import React, { useState } from 'react';
import { BookOpen, LayoutGrid, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { MODEL_CONFIGS, MODEL_ORDER } from '../models/configs';
import { Link, type Route } from './router';
import { useTheme } from './theme';
import BrandMark from '../components/BrandMark';

const COLLAPSE_KEY = 'abm-nav-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

const AppShell: React.FC<{ route: Route; children: React.ReactNode }> = ({ route, children }) => {
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !value;
    });
  };

  const current = (name: string) => (route.name === 'model' && route.id === name ? 'page' : undefined);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="shell" data-collapsed={collapsed}>
        <nav className="nav" aria-label="Main">
          <Link to="/" className="nav-brand" aria-label="ABM Learning Platform home">
            <span className="brand-mark">
              <BrandMark size={20} />
            </span>
            <span className="brand-text">
              <span className="brand-name block">ABM Learning</span>
              <span className="brand-sub block">Agent-based models</span>
            </span>
          </Link>

          <div className="nav-body">
            <div className="nav-group">
              <div className="nav-group-label">Overview</div>
              <Link
                to="/"
                className="nav-link"
                aria-current={route.name === 'library' ? 'page' : undefined}
                title={collapsed ? 'Model library' : undefined}
              >
                <LayoutGrid size={18} />
                <span className="nav-label">Model library</span>
              </Link>
            </div>
            <div className="nav-group">
              <div className="nav-group-label">Models</div>
              {MODEL_ORDER.map((id) => {
                const { icon: Icon, name } = MODEL_CONFIGS[id];
                return (
                  <Link
                    key={id}
                    to={`/models/${id}`}
                    className="nav-link"
                    aria-current={current(id)}
                    title={collapsed ? name : undefined}
                    aria-label={name}
                  >
                    <Icon size={18} />
                    <span className="nav-label">{name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="nav-footer">
            <a
              className="nav-link"
              href="https://mesa.readthedocs.io/"
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? 'Mesa documentation' : undefined}
              aria-label="Mesa documentation (opens in a new tab)"
            >
              <BookOpen size={18} />
              <span className="nav-label">Mesa docs</span>
            </a>
            <button
              type="button"
              className="nav-link w-full border-0 bg-transparent text-left"
              onClick={toggle}
              aria-label={`Switch to ${nextTheme} theme`}
              title={collapsed ? `Switch to ${nextTheme} theme` : undefined}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className="nav-label">{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
            </button>
            <button
              type="button"
              className="nav-link nav-collapse w-full border-0 bg-transparent text-left"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              <span className="nav-label">Collapse</span>
            </button>
          </div>
        </nav>

        <main id="main" className="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
};

export default AppShell;
