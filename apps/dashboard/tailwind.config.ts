import type { Config } from 'tailwindcss';
import sharedConfig from '@innflow/ui/tailwind';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [sharedConfig as Config],
};

export default config;
