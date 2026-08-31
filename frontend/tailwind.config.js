/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Scandinavian neutral foundation: alpha-black ink ladder on white
        ink: {
          primary: 'rgb(0 0 0 / 90%)',
          secondary: 'rgb(0 0 0 / 64%)',
          tertiary: 'rgb(0 0 0 / 44%)',
        },
        line: {
          DEFAULT: 'rgb(0 0 0 / 10%)',
          strong: 'rgb(0 0 0 / 18%)',
        },
        fill: {
          hover: 'rgb(0 0 0 / 5%)',
          pressed: 'rgb(0 0 0 / 9%)',
          surface: 'rgb(0 0 0 / 3%)',
        },
        // Single brand accent: club green for primary actions only
        club: {
          green: '#0B3D2E',
          greenLight: '#156B4F',
          garnet: '#8E2A3D',
          gold: '#B08D57',
          cream: '#FAFAFA',
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
