/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral corporativo: tinta grafito sobre blanco
        ink: {
          primary: 'rgb(28 28 30 / 94%)',
          secondary: 'rgb(28 28 30 / 68%)',
          tertiary: 'rgb(28 28 30 / 48%)',
        },
        line: {
          DEFAULT: 'rgb(0 0 0 / 8%)',
          strong: 'rgb(0 0 0 / 16%)',
        },
        fill: {
          hover: 'rgb(0 0 0 / 4%)',
          pressed: 'rgb(0 0 0 / 8%)',
          surface: 'rgb(0 0 0 / 3%)',
        },
        // Identidad del club: verde institucional
        club: {
          green: '#0B3D2E',
          greenLight: '#166A4C',
          greenDark: '#06261C',
          garnet: '#7A2436',
          gold: '#A98E5F',
          cream: '#F6F5F1',
        }
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};
