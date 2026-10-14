/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { night: '#1a1230', dusk: '#271c45', plum: '#3a2a63', honey: '#f2c76e', mint: '#8fd6b8', rose: '#f28fa8', mist: '#cfc4ea' },
      fontFamily: { display: ['Fraunces', 'serif'], sans: ['Figtree', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
