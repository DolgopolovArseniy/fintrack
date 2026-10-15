import { z } from 'zod';
import { isoDateSchema } from '@/lib/schemas';

export const EXPORT_SCOPE_PRESETS = [
  'currentMonth',
  'prevMonth',
  'last3Months',
  'last6Months',
  'thisYear',
  'allTime',
  'custom',
] as const;

export const exportScopePresetSchema = z.enum(EXPORT_SCOPE_PRESETS);

export type ExportScopePreset = z.infer<typeof exportScopePresetSchema>;

export const csvDelimiterSchema = z.enum([',', ';']);

export type CsvDelimiter = z.infer<typeof csvDelimiterSchema>;

export const exportTransactionTypeSchema = z.enum(['all', 'expense', 'income']);

export type ExportTransactionType = z.infer<typeof exportTransactionTypeSchema>;

export const exportConfigSchema = z.object({
  preset: exportScopePresetSchema,
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  type: exportTransactionTypeSchema.default('all'),
  categoryId: z.string().default('all'),
  accountId: z.string().default('all'),
  delimiter: csvDelimiterSchema.default(','),
  includeHeaders: z.boolean().default(true),
});

export type ExportConfig = z.infer<typeof exportConfigSchema>;

export const importFieldSchema = z.enum([
  'date',
  'type',
  'amount',
  'category',
  'account',
  'note',
  'tags',
]);

export const columnMappingSchema = z.record(
  importFieldSchema,
  z.number().int().min(0).nullable(),
);

export const importNameOverrideSchema = z.object({
  sourceName: z.string().min(1).max(40),
  categoryId: z.string().min(1).max(64).optional(),
  accountId: z.string().min(1).max(64).optional(),
});
