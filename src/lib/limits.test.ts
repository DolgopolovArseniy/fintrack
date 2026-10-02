import { describe, expect, it } from 'vitest';
import {
  DISPLAY_NAME_MAX_LENGTH,
  IMPORT_CHUNK_SIZE,
  MAX_AMOUNT,
  MAX_BALANCE,
  MIN_AMOUNT,
  NAME_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  SYSTEM_KEY_MAX_LENGTH,
  TAGS_MAX_COUNT,
} from './limits';

describe('limits', () => {
  it('defines exact expected domain numeric boundaries', () => {
    expect(MIN_AMOUNT).toBe(1);
    expect(MAX_AMOUNT).toBe(100_000_000_000);
    expect(MAX_BALANCE).toBe(1_000_000_000_000);
    expect(IMPORT_CHUNK_SIZE).toBe(400);
  });

  it('defines exact expected string length and count limits', () => {
    expect(NOTE_MAX_LENGTH).toBe(200);
    expect(NAME_MAX_LENGTH).toBe(40);
    expect(SYSTEM_KEY_MAX_LENGTH).toBe(30);
    expect(DISPLAY_NAME_MAX_LENGTH).toBe(60);
    expect(TAGS_MAX_COUNT).toBe(10);
  });

  it('guarantees all limits are safe JavaScript integers and strictly positive', () => {
    const limits = [
      MIN_AMOUNT,
      MAX_AMOUNT,
      MAX_BALANCE,
      NOTE_MAX_LENGTH,
      NAME_MAX_LENGTH,
      SYSTEM_KEY_MAX_LENGTH,
      DISPLAY_NAME_MAX_LENGTH,
      TAGS_MAX_COUNT,
      IMPORT_CHUNK_SIZE,
    ];

    for (const val of limits) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThan(Number.MAX_SAFE_INTEGER);
    }

    expect(MAX_AMOUNT).toBeLessThan(MAX_BALANCE);
  });
});
