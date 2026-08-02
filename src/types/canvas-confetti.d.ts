/**
 * Minimal ambient types for `canvas-confetti`, which ships no types of its own.
 *
 * Normally this would be `pnpm add -D @types/canvas-confetti`, but this
 * project's node_modules was installed with pnpm 10 and the local pnpm is 11,
 * so any install currently demands a full reinstall of the dependency tree.
 * Declaring the small surface we actually use avoids that. Delete this file
 * and install the real types once the store is reconciled.
 */
declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: Array<'square' | 'circle' | 'star'>;
    scalar?: number;
    zIndex?: number;
    flat?: boolean;
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
  }

  function confetti(options?: Options): Promise<void> | null;

  namespace confetti {
    function reset(): void;
  }

  export default confetti;
}
