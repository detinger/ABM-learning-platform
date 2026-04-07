/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sheep: '#f3f4f6',
        'sheep-dark': '#d1d5db',
        wolf: '#dc2626',
        'wolf-dark': '#991b1b',
        grass: '#22c55e',
        'grass-young': '#86efac',
        'grass-eaten': '#78350f',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
