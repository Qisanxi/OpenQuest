import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Earthy palette — designed to feel grounded, not techie.
        moss: {
          50: '#f5f7f2',
          100: '#e8ede0',
          200: '#cfd9bf',
          300: '#a8bb8e',
          400: '#82a066',
          500: '#5f8247',
          600: '#486635',
          700: '#365029',
          800: '#2a3f21',
          900: '#1f2f18',
        },
        bark: {
          50: '#f9f6f3',
          100: '#f0e8df',
          200: '#dccbb8',
          300: '#c4a583',
          400: '#a8845f',
          500: '#8a6948',
          600: '#6d543a',
          700: '#55412e',
          800: '#3f3022',
          900: '#2a1f16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
