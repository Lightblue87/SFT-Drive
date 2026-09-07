import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SFT Drive Branding: Schwarz als Fläche, Rot als Marken-/Aktionsfarbe.
        sft: {
          black: '#0a0a0a',
          surface: '#161616',
          surface2: '#1f1f1f',
          red: '#e10600',
          'red-dark': '#a80500',
          white: '#f5f5f5',
          gray: '#9a9a9a',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
