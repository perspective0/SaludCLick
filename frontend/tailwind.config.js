/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066cc',
        secondary: '#00cc99',
        accent: '#ff6b6b',
        dark: '#1a1a1a',
        light: '#f5f5f5',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
