/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'full-day': '#10b981',
        'half-day': '#f59e0b',
        'holiday': '#8b5cf6',
        'holiday-worked': '#ef4444',
        'not-working': '#d1d5db',
      },
      animation: {
        'pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '0.1' },
          '50%': { opacity: '0.3' },
        }
      }
    },
  },
  plugins: [],
}
