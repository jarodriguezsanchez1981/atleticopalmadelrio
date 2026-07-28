/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta del club (placeholder inspirado en un "Atlético" clásico:
        // verde inglés + grana como acento. Sustituir por los tonos reales
        // del escudo cuando el club los facilite).
        club: {
          green: '#0B3D2E',   // verde botella - color principal
          greenLight: '#155B41',
          garnet: '#7A1E2B',  // grana - acento
          gold: '#C9A24B',    // dorado - detalles / hover
          cream: '#F5F1E8'    // fondo cálido de las pantallas
        }
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};
