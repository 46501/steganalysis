/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mono: {
          950: '#000000',
          900: '#090909',
          850: '#111111',
          800: '#151515',
          750: '#1C1C1C',
          700: '#242424',
          600: '#292929',
          500: '#555555',
          400: '#777777',
          300: '#B3B3B3',
          200: '#E5E5E5',
          100: '#F5F5F5',
          50: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}

