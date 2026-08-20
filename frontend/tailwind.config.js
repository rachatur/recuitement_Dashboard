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
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#38a5f8',
          500: '#0e86d4',
          600: '#0168b5',
          700: '#025394',
          800: '#06477b',
          900: '#0b3c66',
          950: '#072644',
        }
      }
    },
  },
  plugins: [],
}
