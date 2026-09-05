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
        // Identidad: un único color de marca, #0F3D22 (tintas/sombras derivadas para hover/foco)
        club: {
          green: '#0F3D22',
          greenLight: '#446853',
          greenDark: '#0A2B18',
          garnet: '#7A2436',
          cream: '#F7F8FA',
        }
      },
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 2px 6px rgb(16 24 40 / 0.05)',
        elevated: '0 4px 12px rgb(16 24 40 / 0.06), 0 12px 32px rgb(16 24 40 / 0.08)',
        panel: '1px 0 0 0 rgb(0 0 0 / 6%), 4px 0 16px rgb(16 24 40 / 0.03)'
      }
    }
  },
  plugins: []
};
