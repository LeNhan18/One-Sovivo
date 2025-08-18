/******** Tailwind config for AI Insight Dashboard ********/ 
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8efff',
          200: '#b9e3ff',
          300: '#8cd3ff',
          400: '#56bbff',
          500: '#2d9fff',
          600: '#1d7fe5',
          700: '#1966ba',
          800: '#195695',
          900: '#184a7a',
        }
      },
      boxShadow: {
        card: '0 6px 24px -6px rgba(0,0,0,0.15)'
      }
    },
  },
  plugins: [],
}
