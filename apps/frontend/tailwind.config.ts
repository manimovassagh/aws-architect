import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
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
