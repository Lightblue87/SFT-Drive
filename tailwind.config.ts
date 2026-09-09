import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SFT Drive Branding: Schwarz als Fläche, Rot als Marken-/Aktionsfarbe,
        // Bernstein als sekundäre Statusfarbe (Warteliste/Fristen).
        sft: {
          black: '#0a0a0a',
          surface: '#101013',
          surface2: '#17171b',
          card: '#0f0f12',
          red: '#e10600',
          'red-dark': '#a80500',
          amber: '#f0a500',
          white: '#f5f5f5',
          gray: '#9a9a9a',
          'gray-dim': '#7d7d84',
          'gray-faint': '#5e5e66',
        },
      },
      fontFamily: {
        sans: ['"Archivo"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
