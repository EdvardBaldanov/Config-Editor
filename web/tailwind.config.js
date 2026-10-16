/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: 'var(--color-base, #161b22)',
        'base-surface': 'var(--color-surface, #21262d)',
        'base-surface-hover': 'var(--color-surface-hover, #30363d)',
        'base-border': 'var(--color-border, #30363d)',
        accent: 'var(--color-accent, #00d2b4)',
        'accent-hover': 'var(--color-accent-hover, #00b89e)',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
