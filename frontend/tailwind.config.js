/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#06080F', // Darker navy for premium feel
        surface: '#0E1324',
        surfaceHighlight: '#1E293B',
        primary: '#3B82F6',
        primaryHover: '#2563EB',
        neonPurple: '#8B5CF6',
        accent: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        textMain: '#F8FAFC',
        textMuted: '#94A3B8'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
