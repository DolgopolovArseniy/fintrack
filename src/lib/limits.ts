/**
 * Global domain limits and constraints.
 * Central single source of truth for numeric and length bounds.
 * Values must stay in sync with Firestore Security Rules (docs/02-data-model.md §11).
 */

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 100_000_000_000; // minor units (10^11): 1,000,000,000.00
export const MAX_BALANCE = 1_000_000_000_000; // minor units (10^12): 10,000,000,000.00 by absolute value

export const NOTE_MAX_LENGTH = 200;
export const NAME_MAX_LENGTH = 40;
export const SYSTEM_KEY_MAX_LENGTH = 30;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const TAGS_MAX_COUNT = 10;
export const IMPORT_CHUNK_SIZE = 400; // transactions per batch
