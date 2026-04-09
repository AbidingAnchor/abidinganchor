/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-purple': '#1a0533',
        'secondary-purple': '#2d0f4e',
        gold: '#D4A843',
        'gold-secondary': '#F0C060',
        'border-gold-light': 'rgba(212,168,67,0.25)',
        'glow-gold-light': 'rgba(212,168,67,0.15)',
        'text-secondary-light': 'rgba(255,255,255,0.65)',
      },
    },
  },
  plugins: [],
}

