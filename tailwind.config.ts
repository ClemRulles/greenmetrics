import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}', 
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
      
      // GreenMetrics color palette
      colors: {
        // Legacy brand colors (keeping for compatibility)
        brand: {
          DEFAULT: '#2563eb',
          fg: '#ffffff',
          muted: '#eff6ff',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          soft: 'hsl(var(--surface-soft))',
        },
        ring: 'hsl(var(--ring))',
        
        // New GreenMetrics palette
        blue: {
          DEFAULT: 'var(--blue)',
          500: 'var(--blue)',
        },
        green: {
          DEFAULT: 'var(--green)',
          500: 'var(--green)',
        },
        neutral: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },
        red: {
          DEFAULT: 'var(--red)',
          500: 'var(--red)',
        },
        amber: {
          DEFAULT: 'var(--amber)',
          500: 'var(--amber)',
        },
        emerald: {
          DEFAULT: 'var(--emerald)',
          500: 'var(--emerald)',
        },
      },
      
      // Spacing using CSS custom properties
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
      },
      
      // Typography scale
      fontSize: {
        'xs': 'var(--text-xs)',
        'sm': 'var(--text-sm)',
        'base': 'var(--text-base)',
        'lg': 'var(--text-lg)',
        'xl': 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },
      
      borderRadius: { 
        // Legacy for backward compatibility
        '2xl': '1.25rem',
        // New token-based system
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      
      boxShadow: { 
        // Legacy
        soft: '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
        // New token-based
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      
      // Motion timing
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
      },
      
      transitionTimingFunction: {
        'ease-in': 'var(--ease-in)',
        'ease-out': 'var(--ease-out)',
        'ease-in-out': 'var(--ease-in-out)',
      },
      
      // Animation utilities
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      
      animation: {
        'fade-in': 'fade-in var(--duration-normal) var(--ease-out)',
        'slide-in-up': 'slide-in-up var(--duration-normal) var(--ease-out)',
        'slide-in-down': 'slide-in-down var(--duration-normal) var(--ease-out)',
        'scale-in': 'scale-in var(--duration-fast) var(--ease-out)',
        'pulse-subtle': 'pulse-subtle 2s var(--ease-in-out) infinite',
      },
    },
  },
  plugins: []
} satisfies Config;
