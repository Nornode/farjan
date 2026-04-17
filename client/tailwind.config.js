/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ferry: {
          navy: '#002d6e',
          blue: '#005fad',
          light: '#cce4f6',
          border: '#6bb3e0',
          bg: '#f5faff',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
