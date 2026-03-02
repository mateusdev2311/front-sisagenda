/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#e8e5fc',
          DEFAULT: '#6c5be4',
          dark: '#5243b7',
        },
        secondary: '#20c997',
        dark: '#2d3748',
        light: '#f7fafc',
        danger: '#e53e3e',
        success: '#38a169',
        warning: '#d69e2e',
        teal: '#14b8a6',
        fuchsia: '#d946ef'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
