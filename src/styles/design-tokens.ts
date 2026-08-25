/**
 * EventChain V2 Design System
 * Neo-Brutalist Web3 + Electric Blue Interaction Glow
 * 
 * Core Colors:
 * - Warm Cream: Base surfaces (#F5F1E8 light, #FFFDF7 cards)
 * - Deep Black: Structure & contrast (#111111)
 * - Electric Blue: Interaction & accents (#1717FF)
 * - Bright Blue: Secondary interactions (#4D4DFF)
 */

export const COLORS = {
  // Light Mode - Primary Palette
  light: {
    bg: '#F5F1E8',           // Warm cream page background
    surface: '#FFFDF7',      // Off-white card surfaces
    black: '#111111',        // Deep black for borders and text
    text: '#111111',         // Primary text
    textMuted: '#666666',    // Secondary text
    border: '#111111',       // Strong black borders
    
    // Blues
    electricBlue: '#1717FF', // Primary interaction
    brightBlue: '#4D4DFF',   // Secondary interaction
    blueGlow: 'rgba(23, 23, 255, 0.35)', // Glow effect
    blueFocus: 'rgba(23, 23, 255, 0.20)', // Focus states
    blueSubtle: 'rgba(23, 23, 255, 0.08)', // Very subtle backgrounds
  },

  // Dark Mode - Adapted Palette
  dark: {
    bg: '#0B0E17',           // Deep black background
    surface: '#131726',      // Dark navy surfaces
    black: '#FFFFFF',        // White text in dark mode
    text: '#FFFFFF',         // Primary text
    textMuted: '#A0A0A0',    // Secondary text
    border: '#2A2E3E',       // Subtle borders in dark
    
    // Blues stay vibrant
    electricBlue: '#1717FF', // Same electric blue
    brightBlue: '#4D4DFF',   // Same bright blue
    blueGlow: 'rgba(23, 23, 255, 0.35)',
    blueFocus: 'rgba(23, 23, 255, 0.20)',
    blueSubtle: 'rgba(23, 23, 255, 0.12)',
  },
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

export const BORDER_RADIUS = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  full: '9999px',
};

export const BORDER_WIDTH = {
  thin: '1px',
  base: '2px',    // Default neo-brutalist borders
  thick: '3px',
};

export const TYPOGRAPHY = {
  fontFamily: {
    display: '"Clash Display", "General Sans", system-ui, -apple-system, sans-serif',
    body: '"General Sans", system-ui, -apple-system, sans-serif',
    mono: '"IBM Plex Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
};

export const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
  base: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.16)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.20)',
  
  // Glow effects
  blueGlowSm: '0 0 8px rgba(23, 23, 255, 0.25)',
  blueGlowMd: '0 0 18px rgba(23, 23, 255, 0.30)',
  blueGlowLg: '0 0 24px rgba(23, 23, 255, 0.35)',
};

export const TRANSITIONS = {
  fast: '100ms ease',
  base: '150ms ease',
  slow: '250ms ease',
};

export const TOKENS = {
  space: SPACING,
  radius: BORDER_RADIUS,
  colors: {
    light: COLORS.light,
    dark: COLORS.dark,
  },
};
