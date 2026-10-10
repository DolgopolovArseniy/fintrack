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

export const exportConfigSchema = z.object({
  preset: exportScopePresetSchema,
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  type: z.enum(['all', 'expense', 'income']).default('all'),
  categoryId: z.string().default('all'),
  accountId: z.string().default('all'),
  delimiter: csvDelimiterSchema.default(','),
  includeHeaders: z.boolean().default(true),
});

export type ExportConfig = z.infer<typeof exportConfigSchema>;
