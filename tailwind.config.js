/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#eef2f9', 100: '#d9e2f1', 500: '#2b4c8c', 600: '#1f3b73', 700: '#17305f', 800: '#102349', 900: '#0b1a37' },
        surface: '#f5f7fa',
        gold: { 100: '#f8ecd0', 400: '#e0b25a', 500: '#c99a3b', 800: '#6b4d12' },
      },
      fontFamily: {
        sans: ['Inter', '"Kantumruy Pro"', 'system-ui', 'sans-serif'],
        khmer: ['"Kantumruy Pro"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(16,35,73,.06), 0 1px 3px rgba(16,35,73,.08)' },
    },
  },
  plugins: [],
};
