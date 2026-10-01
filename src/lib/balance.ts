import { signedAmount, TransactionType } from './money';

export type BalanceTx = {
  type: TransactionType;
  amount: number;
  accountId: string;
};

/**
 * Calculates net balance delta(s) for affected account(s).
 * - Creation (before = null, after = tx): +signedAmount on after.accountId
 * - Deletion (before = tx, after = null): -signedAmount on before.accountId
 * - Update on same account: delta = newSigned - oldSigned
 * - Update with account switch: old account gets -oldSigned, new account gets +newSigned
 *
 * Accounts with net zero deltas are excluded from the returned Map.
 */
export function balanceDeltas(
  before: BalanceTx | null,
  after: BalanceTx | null,
): Map<string, number> {
  const result = new Map<string, number>();

  if (!before && !after) {
    return result;
  }

  // Creation: transaction added
  if (!before && after) {
    const delta = signedAmount(after.type, after.amount);
    if (delta !== 0) {
      result.set(after.accountId, delta);
    }
    return result;
  }

  // Deletion: transaction removed
  if (before && !after) {
    const delta = -signedAmount(before.type, before.amount);
    const normalized = delta === 0 ? 0 : delta;
    if (normalized !== 0) {
      result.set(before.accountId, normalized);
    }
    return result;
  }

  // Update: transaction modified
  if (before && after) {
    const oldSigned = signedAmount(before.type, before.amount);
    const newSigned = signedAmount(after.type, after.amount);

    if (before.accountId === after.accountId) {
      const delta = newSigned - oldSigned;
      const normalized = delta === 0 ? 0 : delta;
      if (normalized !== 0) {
        result.set(before.accountId, normalized);
      }
    } else {
      const oldDelta = -oldSigned === 0 ? 0 : -oldSigned;
      const newDelta = newSigned === 0 ? 0 : newSigned;

      if (oldDelta !== 0) {
        result.set(before.accountId, oldDelta);
      }
      if (newDelta !== 0) {
        result.set(after.accountId, newDelta);
      }
    }
  }

  return result;
}

/**
 * Combines balance deltas across multiple operations (e.g. batch imports or multi-record updates).
 * Sums deltas for identical accounts. Accounts whose net sum cancels out to 0 are excluded.
 */
export function mergeDeltas(
  deltas: Iterable<Map<string, number>>,
): Map<string, number> {
  const merged = new Map<string, number>();

  for (const deltaMap of deltas) {
    for (const [accountId, delta] of deltaMap) {
      if (delta === 0) {
        continue;
      }
      const current = merged.get(accountId) ?? 0;
      const next = current + delta;
      if (next === 0) {
        merged.delete(accountId);
      } else {
        merged.set(accountId, next);
      }
    }
  }

  return merged;
}
