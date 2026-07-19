/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14171A',
        paper: '#FAF9F6',
        signal: '#FF5A36',   // "open now" / live-status accent — used sparingly
        line: '#E4E1D8',
        muted: '#6B6F73'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      borderRadius: {
        card: '14px'
      }
    }
  },
  plugins: []
};
