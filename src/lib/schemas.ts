import { z } from 'zod';
import { MAX_AMOUNT, MIN_AMOUNT } from './limits';
import { SUPPORTED_CURRENCIES } from './currencies';

export type IsoDate = string;
export type YearMonth = string;
export type TransactionType = 'expense' | 'income';

/**
 * Validates transaction type ('expense' | 'income').
 */
export const transactionTypeSchema = z.enum(['expense', 'income'], {
  error: (iss) =>
    iss.input === undefined ? 'validation.required' : 'validation.required',
});

/**
 * Validates supported currency code.
 */
export const currencySchema = z.enum(SUPPORTED_CURRENCIES, {
  error: (iss) =>
    iss.input === undefined
      ? 'validation.required'
      : 'validation.currencyUnsupported',
});

/**
 * Validates money amount in minor units: positive integer between 1 and MAX_AMOUNT.
 */
export const moneyAmountSchema = z
  .number({ error: 'validation.required' })
  .int({ error: 'validation.amountPositive' })
  .min(MIN_AMOUNT, { error: 'validation.amountPositive' })
  .max(MAX_AMOUNT, { error: 'validation.amountTooLarge' });

/**
 * Validates ISO calendar date ('YYYY-MM-DD') taking leap years and days per month into account.
 */
export const isoDateSchema = z.iso.date({
  error: (iss) =>
    iss.input === undefined ? 'validation.required' : 'validation.dateInvalid',
});

/**
 * Validates Year-Month string ('YYYY-MM').
 */
export const yearMonthSchema = z
  .string({ error: 'validation.required' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'validation.dateInvalid' });
