import { describe, it, expect } from 'vitest';
import { validateEnv } from './env';

describe('validateEnv', () => {
  const validMockEnv = {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-project.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
    VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef',
    VITE_USE_EMULATORS: 'false',
  };

  it('validates a complete, valid environment object', () => {
    const result = validateEnv(validMockEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.VITE_FIREBASE_PROJECT_ID).toBe('test-project');
      expect(result.data.VITE_USE_EMULATORS).toBe(false);
    }
  });

  it('transforms VITE_USE_EMULATORS="true" string to boolean true', () => {
    const result = validateEnv({
      ...validMockEnv,
      VITE_USE_EMULATORS: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.VITE_USE_EMULATORS).toBe(true);
    }
  });

  it('defaults VITE_USE_EMULATORS to false when omitted', () => {
    const { VITE_USE_EMULATORS, ...withoutEmulators } = validMockEnv;
    void VITE_USE_EMULATORS;
    const result = validateEnv(withoutEmulators);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.VITE_USE_EMULATORS).toBe(false);
    }
  });

  it('fails validation when mandatory keys are missing', () => {
    const incompleteEnv = {
      VITE_FIREBASE_API_KEY: 'test-api-key',
    };
    const result = validateEnv(incompleteEnv);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const joined = result.errors.join(' ');
      expect(joined).toContain('VITE_FIREBASE_AUTH_DOMAIN');
      expect(joined).toContain('VITE_FIREBASE_PROJECT_ID');
      expect(joined).toContain('VITE_FIREBASE_APP_ID');
    }
  });

  it('fails validation when mandatory keys are empty strings', () => {
    const emptyFieldsEnv = {
      ...validMockEnv,
      VITE_FIREBASE_PROJECT_ID: '   ',
    };
    const result = validateEnv(emptyFieldsEnv);
    expect(result.success).toBe(false);
    if (!result.success) {
      const joined = result.errors.join(' ');
      expect(joined).toContain('VITE_FIREBASE_PROJECT_ID');
    }
  });

  it('allows optional App Check keys', () => {
    const withAppCheck = {
      ...validMockEnv,
      VITE_APPCHECK_SITE_KEY: 'recaptcha-site-key',
      VITE_APPCHECK_DEBUG_TOKEN: 'debug-token-guid',
    };
    const result = validateEnv(withAppCheck);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.VITE_APPCHECK_SITE_KEY).toBe('recaptcha-site-key');
      expect(result.data.VITE_APPCHECK_DEBUG_TOKEN).toBe('debug-token-guid');
    }
  });

  it('allows omitting VITE_FIREBASE_STORAGE_BUCKET and VITE_FIREBASE_MESSAGING_SENDER_ID', () => {
    const {
      VITE_FIREBASE_STORAGE_BUCKET,
      VITE_FIREBASE_MESSAGING_SENDER_ID,
      ...withoutUnused
    } = validMockEnv;
    void VITE_FIREBASE_STORAGE_BUCKET;
    void VITE_FIREBASE_MESSAGING_SENDER_ID;

    const result = validateEnv(withoutUnused);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.VITE_FIREBASE_STORAGE_BUCKET).toBeUndefined();
      expect(result.data.VITE_FIREBASE_MESSAGING_SENDER_ID).toBeUndefined();
    }
  });
});
