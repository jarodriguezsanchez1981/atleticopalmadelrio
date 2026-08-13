/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta institucional del club en clave corporativa moderna:
        // verde profundo como color primario, neutros claros para el fondo
        // y dorado/grana reducidos a acentos puntuales.
        club: {
          green: '#0B3D2E',      // verde institucional - color principal
          greenLight: '#156B4F', // hover / gradientes
          garnet: '#8E2A3D',     // grana - acento (obligatorio, alertas)
          gold: '#B08D57',       // dorado sobrio - detalles
          cream: '#F5F6F8'       // fondo neutro claro de las pantallas
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
