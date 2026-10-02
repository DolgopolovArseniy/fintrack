export const ACCOUNT_TYPES = ['cash', 'card', 'bank'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
