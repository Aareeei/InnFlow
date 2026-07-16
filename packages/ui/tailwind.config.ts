import type { Config } from 'tailwindcss';

const config: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0a0e17',
          surface: '#111827',
          elevated: '#1a2332',
          border: '#243044',
          muted: '#64748b',
          accent: '#06b6d4',
          'accent-dim': '#0891b2',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#6366f1',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        ops: '0 0 0 1px rgba(36, 48, 68, 0.8), 0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
