import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg:   '#080c14',
        bg2:  '#0d1525',
        bg3:  '#121e32',
        acc:  '#00e87a',
        teal: '#00c8b4',
        txt:  '#ddeaf8',
        txt2: '#7a96b8',
        txt3: '#3d5875',
      },
    },
  },
  plugins: [],
}

export default config
