import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'abm-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* storage unavailable (private mode, blocked cookies) */
  }
  return 'system';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref !== 'system') return pref;
  return darkQuery().matches ? 'dark' : 'light';
}

/** Applied synchronously so token reads during the same render see the new theme. */
function apply(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPref] = useState<ThemePreference>(readPreference);
  const [theme, setTheme] = useState<ResolvedTheme>(() => {
    const resolved = resolve(readPreference());
    apply(resolved);
    return resolved;
  });

  const setPreference = useCallback((pref: ThemePreference) => {
    const resolved = resolve(pref);
    apply(resolved);
    setPref(pref);
    setTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  // Follow OS changes while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return;
    const query = darkQuery();
    const onChange = () => {
      const resolved = resolve('system');
      apply(resolved);
      setTheme(resolved);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      theme,
      setPreference,
      toggle: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
    }),
    [preference, theme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Resolve CSS custom properties (e.g. "sim-wolf") to concrete colors for canvas and charts. */
export function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

export function useTokens<T extends string>(names: readonly T[]): Record<T, string> {
  const { theme } = useTheme();
  const key = names.join('|');
  return useMemo(() => {
    const out = {} as Record<T, string>;
    for (const name of names) out[name] = readToken(name);
    return out;
    // `theme` is the real dependency: token values change when it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, key]);
}
