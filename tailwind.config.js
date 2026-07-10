/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        duty: {
          bg: '#0b0b0d',
          card: '#16161a',
          gold: '#d4af37',
          goldSoft: '#e9d18b',
        },
        status: {
          ok: '#22c55e',
          late: '#ef4444',
          transit: '#3b82f6',
          wait: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
