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
        cyber: {
          bg: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          primary: '#06B6D4',
          accent: '#8B5CF6',
          danger: '#EF4444',
          success: '#10B981',
          warning: '#F59E0B',
        }
      }
    },
  },
  plugins: [],
}

