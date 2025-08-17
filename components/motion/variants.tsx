import { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
};

export const staggerChildren = (delay = 0.05) => ({
  visible: { transition: { staggerChildren: delay } },
});

export default { fadeInUp, staggerChildren };
