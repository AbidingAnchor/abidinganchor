/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-purple': '#1a0533',
        'secondary-purple': '#2d0f4e',
        gold: '#F0C040',
        'gold-secondary': '#F5D060',
        'border-gold-light': 'rgba(240,192,64,0.25)',
        'glow-gold-light': 'rgba(240,192,64,0.15)',
        'text-secondary-light': 'rgba(255,255,255,0.65)',
      },
    },
  },
  plugins: [],
}

