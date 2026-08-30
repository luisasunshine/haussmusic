/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
      },
      fontFamily: {
        display: ["'Playfair Display'", 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },

        /* Paleta Velvet — prata sobre preto */
        velvet: {
          void: '#050506',
          abyss: '#0a0a0c',
          surface: '#101014',
          raised: '#17171c',
          line: '#26262e',
          silver: '#d8d8e2',
          chrome: '#ffffff',
          steel: '#a8a8b6',
          ash: '#6d6d7a',
          text: '#f4f4f7',
          dim: '#9a9aa6',
          faint: '#62626e',
        },

        /* Nomes legados mantidos para o código que ainda os usa */
        spotify: {
          black: '#0a0a0c',
          darkgray: '#101014',
          gray: '#17171c',
          lightgray: '#6d6d7a',
          green: '#d8d8e2',
          brightgreen: '#ffffff',
          text: '#f4f4f7',
          subtext: '#9a9aa6',
        },
      },
      boxShadow: {
        chrome: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.6), 0 18px 44px -24px rgba(0,0,0,0.95)',
        'chrome-lg': 'inset 0 1px 0 rgba(255,255,255,0.18), 0 34px 80px -34px rgba(0,0,0,1)',
        halo: '0 0 40px -8px rgba(216,216,226,0.45)',
      },
      backgroundImage: {
        'chrome-sweep': 'linear-gradient(180deg,#ffffff 0%,#e2e2ea 30%,#b5b5c2 62%,#85858f 100%)',
        'chrome-text': 'linear-gradient(178deg,#ffffff 0%,#e9e9f0 18%,#9a9aa8 44%,#5c5c68 52%,#b9b9c6 60%,#f2f2f7 82%,#8f8f9d 100%)',
        'glass-top': 'linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0) 60%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        sheen: {
          '0%': { left: '-60%' },
          '100%': { left: '130%' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translate3d(0,22px,0)' },
          to: { opacity: '1', transform: 'none' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        sheen: 'sheen 780ms ease-out',
        float: 'float 4s ease-in-out infinite',
        rise: 'rise 620ms cubic-bezier(0.22,1,0.36,1) both',
        marquee: 'marquee 26s linear infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
      transitionTimingFunction: {
        velvet: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
