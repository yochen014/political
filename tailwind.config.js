/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blueTeam: '#000095',
        greenTeam: '#1b9431',
        whiteTeam: '#28cdcc',
        darkBg: '#0f172a',
        cardBg: 'rgba(30, 41, 59, 0.7)'
      }
    },
  },
  plugins: [],
}
