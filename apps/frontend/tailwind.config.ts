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
      animation: {
        gradient: 'gradient 8s ease infinite',
        'slide-in': 'slideIn 0.18s ease-out',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
