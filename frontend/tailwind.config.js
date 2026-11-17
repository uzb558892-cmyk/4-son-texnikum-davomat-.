/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Onest', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eef3fb', 100: '#dbe6f6', 200: '#b7cdec', 300: '#8aaedd', 400: '#5a8bc9',
          500: '#2f69b3', 600: '#1f5299', 700: '#173f7a', 800: '#122f5c', 900: '#0c2144', 950: '#081731'
        },
        surface: '#f4f6fa'
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(12, 33, 68, 0.05), 0 1px 3px 0 rgba(12, 33, 68, 0.08)',
        'card-hover': '0 6px 16px -4px rgba(12, 33, 68, 0.16), 0 2px 4px -2px rgba(12, 33, 68, 0.08)'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } }
      },
      animation: { fadeIn: 'fadeIn 0.35s ease-out' }
    }
  },
  plugins: []
};
