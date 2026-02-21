import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        aws: {
          orange: '#ED7100',
          blue: '#3B48CC',
          green: '#3F8624',
          'dark-green': '#1B660F',
          purple: '#8C4FFF',
          pink: '#E7157B',
          red: '#DD344C',
          teal: '#147EBA',
        },
      },
    },
  },
  plugins: [],
};

export default config;
