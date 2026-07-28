/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        club: {
          primary: '#0B3D2E',   // verde campo - personalizar con los colores del club
          accent: '#F2B705',    // dorado
        },
      },
    },
  },
  plugins: [],
};
