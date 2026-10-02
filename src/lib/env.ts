import { z } from 'zod';

export const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z
    .string()
    .trim()
    .min(1, 'VITE_FIREBASE_API_KEY is required and cannot be empty'),
  VITE_FIREBASE_AUTH_DOMAIN: z
    .string()
    .trim()
    .min(1, 'VITE_FIREBASE_AUTH_DOMAIN is required and cannot be empty'),
  VITE_FIREBASE_PROJECT_ID: z
    .string()
    .trim()
    .min(1, 'VITE_FIREBASE_PROJECT_ID is required and cannot be empty'),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().trim().min(1).optional(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().trim().min(1).optional(),
  VITE_FIREBASE_APP_ID: z
    .string()
    .trim()
    .min(1, 'VITE_FIREBASE_APP_ID is required and cannot be empty'),
  VITE_USE_EMULATORS: z
    .union([z.boolean(), z.string()])
    .optional()
    .default(false)
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val.trim().toLowerCase() === 'true';
    }),
  VITE_APPCHECK_SITE_KEY: z.string().trim().min(1).optional(),
  VITE_APPCHECK_DEBUG_TOKEN: z.string().trim().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export type EnvValidationResult =
  | { success: true; data: Env; errors: [] }
  | { success: false; data: null; errors: string[] };

export function validateEnv(
  rawEnv: Record<string, unknown> = import.meta.env,
): EnvValidationResult {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { success: false, data: null, errors };
  }
  return { success: true, data: result.data, errors: [] };
}

const currentResult = validateEnv();

export const env: Env = currentResult.success
  ? currentResult.data
  : new Proxy({} as Env, {
      get(_target, prop) {
        throw new Error(
          `Cannot access env.${String(prop)}: environment variables are missing or invalid.\nErrors:\n${currentResult.errors.join('\n')}`,
        );
      },
    });
