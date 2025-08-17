/**
 * GreenMetrics Motion System
 * Accessibility-first animation utilities with consistent timing and easing
 */

// Motion tokens aligned with CSS custom properties
export const motion = {
  duration: {
    fast: '0.12s',
    normal: '0.18s', 
    slow: '0.24s',
  },
  ease: {
    in: 'cubic-bezier(0.4, 0.0, 1, 1)',
    out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

// Common transition configurations
export const transitions = {
  // Standard UI element transitions
  fade: {
    duration: motion.duration.normal,
    timingFunction: motion.ease.out,
    property: 'opacity',
  },
  
  // Interactive element hover states
  interactive: {
    duration: motion.duration.fast,
    timingFunction: motion.ease.out,
    property: 'all',
  },
  
  // Layout and position changes
  layout: {
    duration: motion.duration.slow,
    timingFunction: motion.ease.inOut,
    property: 'transform',
  },
  
  // Color theme transitions
  color: {
    duration: motion.duration.normal,
    timingFunction: motion.ease.out,
    property: 'color, background-color, border-color',
  },
} as const;

// Framer Motion variants for consistent animations
export const variants = {
  // Fade in/out
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: parseFloat(motion.duration.normal) }
    },
  },
  
  // Slide in from different directions
  slideInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: parseFloat(motion.duration.normal),
        ease: [0.0, 0.0, 0.2, 1] // --ease-out equivalent
      }
    },
  },
  
  slideInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: parseFloat(motion.duration.normal),
        ease: [0.0, 0.0, 0.2, 1]
      }
    },
  },
  
  slideInLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: parseFloat(motion.duration.normal),
        ease: [0.0, 0.0, 0.2, 1]
      }
    },
  },
  
  slideInRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: parseFloat(motion.duration.normal),
        ease: [0.0, 0.0, 0.2, 1]
      }
    },
  },
  
  // Scale animations for interactive elements
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: parseFloat(motion.duration.fast),
        ease: [0.0, 0.0, 0.2, 1]
      }
    },
  },
  
  // Staggered children animations
  staggerContainer: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  
  staggerItem: {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: parseFloat(motion.duration.normal),
        ease: [0.0, 0.0, 0.2, 1]
      }
    },
  },
} as const;

// Accessibility-aware animation hook
export const useReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// CSS-in-JS style generator for transitions
export const createTransition = (
  property: string = 'all',
  duration: keyof typeof motion.duration = 'normal',
  ease: keyof typeof motion.ease = 'out'
) => ({
  transition: `${property} ${motion.duration[duration]} ${motion.ease[ease]}`,
});

// Tailwind CSS transition classes
export const transitionClasses = {
  fade: 'transition-opacity duration-[0.18s] ease-out',
  interactive: 'transition-all duration-[0.12s] ease-out',
  layout: 'transition-transform duration-[0.24s] ease-in-out',
  color: 'transition-colors duration-[0.18s] ease-out',
  all: 'transition-all duration-[0.18s] ease-out',
} as const;
