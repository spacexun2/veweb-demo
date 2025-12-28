/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Extended palette for vibrancy
        indigo: { 500: '#6366f1', 600: '#4f46e5' },
        violet: { 500: '#8b5cf6', 600: '#7c3aed' },
        fuchsia: { 500: '#d946ef', 600: '#c026d3' },
        rose: { 500: '#f43f5e', 600: '#e11d48' },
        sky: { 500: '#0ea5e9', 600: '#0284c7' },
        emerald: { 500: '#10b981', 600: '#059669' },
        amber: { 500: '#f59e0b', 600: '#d97706' },
      },
      animation: {
        'blob': 'blob 7s infinite',
        'text-shimmer': 'text-shimmer 2.5s ease-out infinite alternate',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        'text-shimmer': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}
