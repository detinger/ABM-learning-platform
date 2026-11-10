/** @type {import('tailwindcss').Config} */
// Tailwind is used for layout utilities. Colors map to the semantic CSS tokens in
// src/index.css so utilities follow the active theme (see STYLE.md §2).
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Prefixed so generated utilities never collide with the .text-muted /
        // .text-subtle helpers in index.css (e.g. `text-subtle` was the bg color).
        surface: {
          DEFAULT: 'var(--bg)',
          elevated: 'var(--bg-elevated)',
          subtle: 'var(--bg-subtle)',
          sunken: 'var(--bg-sunken)',
        },
        line: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        fg: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
        primary: { DEFAULT: 'var(--primary)', soft: 'var(--primary-soft)', strong: 'var(--primary-strong)' },
        accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)' },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};
