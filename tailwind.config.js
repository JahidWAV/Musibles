/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#060606',   // noir encre
        dusk: '#0d0d0e',    // surfaces
        plum: '#26231d',    // filets chauds (nom conservé pour compatibilité)
        gold: { 300: '#e6d3a3', 400: '#d4bb83', 500: '#c8a96a', 600: '#a98a4e', 700: '#7d6637' }, // champagne mat
        honey: '#c8a96a',
        velvet: '#5a1a1f',
        mint: '#8fc9b0',
        rose: '#d9808c',
        mist: '#948d80',    // texte secondaire
        ivory: '#ece6d8',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { fine: '.18em' },
    },
  },
  plugins: [],
}
