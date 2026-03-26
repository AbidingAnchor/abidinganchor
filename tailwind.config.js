/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#5C3F22',
        'accent-gold': '#C9922A',
        'background-cream': '#FBF7EE',
        parchment: '#F5EFE0',
        olive: '#6B7C4E',
      },
    },
  },
  plugins: [],
}

