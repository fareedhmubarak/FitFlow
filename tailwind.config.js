/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
        },
        secondary: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Payment Status Colors
        'payment-paid': '#10b981',
        'payment-due': '#f59e0b',
        'payment-overdue-early': '#fb923c',
        'payment-overdue-late': '#ef4444',
        'payment-upcoming': '#3b82f6',
        'payment-frozen': '#64748b',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Telugu',
          'Noto Sans Tamil',
          'Noto Sans Devanagari',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
