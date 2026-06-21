/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        serif: ["'Lora'", "serif"],
      },
      colors: {
        // Premium Slate-green and warm sand color scheme
        brand: {
          50: '#f5f7f6',
          100: '#e6edea',
          200: '#cfdcd6',
          300: '#abc1b6',
          400: '#809e91',
          500: '#5e8072',
          600: '#486659',
          700: '#3a5248',
          800: '#30423a',
          900: '#273730',
          950: '#151f1c',
        },
        sand: {
          50: '#faf8f5',
          100: '#f3ece3',
          200: '#e5d7c4',
          300: '#d2be9f',
          400: '#bd9f78',
          500: '#aa8256',
          600: '#9b7149',
          700: '#815c3d',
          800: '#694b35',
          900: '#563e2e',
          950: '#2e1f17',
        }
      },
      animation: {
        'pulse-slow': 'pulseGlow 10s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.4' },
        }
      }
    },
  },
  plugins: [],
}
