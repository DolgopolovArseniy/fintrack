/**
 * Unified application logger.
 * This is the only place in the codebase where console.warn and console.error are permitted.
 * See AGENTS.md §8 and F01 specification §4.8.
 */
export const logger = {
  warn(message: string, context?: unknown): void {
    if (context !== undefined) {
      console.warn(`[FinTrack] ${message}`, context);
    } else {
      console.warn(`[FinTrack] ${message}`);
    }
  },

  error(message: string, context?: unknown): void {
    if (context !== undefined) {
      console.error(`[FinTrack] ${message}`, context);
    } else {
      console.error(`[FinTrack] ${message}`);
    }
  },
} as const;
