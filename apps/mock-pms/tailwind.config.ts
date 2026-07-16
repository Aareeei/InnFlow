import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        pms: {
          bg: '#d4d0c8',
          panel: '#ece9d8',
          border: '#808080',
          highlight: '#000080',
          accent: '#316ac5',
          text: '#000000',
          muted: '#404040',
        },
      },
      fontFamily: {
        pms: ['Tahoma', 'Verdana', 'Geneva', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      boxShadow: {
        inset: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080',
        raised: '1px 1px 0 #ffffff, -1px -1px 0 #808080',
      },
    },
  },
  plugins: [],
};

export default config;
