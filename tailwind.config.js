/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Noirs de salle obscure
        night: '#050505',
        dusk: '#0e0e12',
        plum: '#2a2418', // bordures chaudes (ancien "plum", gardé pour compatibilité)
        // Dorés
        gold: { 300: '#fde68a', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        honey: '#fbbf24',
        // Accents
        velvet: '#7f1d1d', // rideau / tapis rouge
        mint: '#6ee7b7',
        rose: '#fb7185',
        mist: '#a8a29e', // texte secondaire, gris chaud
        ivory: '#f5efe3',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 30px -6px rgba(251,191,36,.55)',
        'gold-sm': '0 0 16px -4px rgba(251,191,36,.45)',
      },
    },
  },
  plugins: [],
}
