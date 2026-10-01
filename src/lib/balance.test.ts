import { describe, expect, it } from 'vitest';
import { balanceDeltas, BalanceTx, mergeDeltas } from './balance';

describe('balance module (AC5)', () => {
  describe('balanceDeltas', () => {
    it('returns an empty map when both before and after are null', () => {
      const result = balanceDeltas(null, null);
      expect(result.size).toBe(0);
    });

    it('handles transaction creation (before = null, after = tx)', () => {
      // Income increases account balance
      const incomeTx: BalanceTx = {
        type: 'income',
        amount: 2500,
        accountId: 'acc-main',
      };
      const incomeDeltas = balanceDeltas(null, incomeTx);
      expect(incomeDeltas.size).toBe(1);
      expect(incomeDeltas.get('acc-main')).toBe(2500);

      // Expense decreases account balance
      const expenseTx: BalanceTx = {
        type: 'expense',
        amount: 1500,
        accountId: 'acc-main',
      };
      const expenseDeltas = balanceDeltas(null, expenseTx);
      expect(expenseDeltas.size).toBe(1);
      expect(expenseDeltas.get('acc-main')).toBe(-1500);

      // Zero amount does not produce a delta entry
      const zeroTx: BalanceTx = {
        type: 'expense',
        amount: 0,
        accountId: 'acc-main',
      };
      const zeroDeltas = balanceDeltas(null, zeroTx);
      expect(zeroDeltas.size).toBe(0);
    });

    it('handles transaction deletion (before = tx, after = null)', () => {
      // Deleting income decreases account balance
      const incomeTx: BalanceTx = {
        type: 'income',
        amount: 3000,
        accountId: 'acc-main',
      };
      const incomeDeltas = balanceDeltas(incomeTx, null);
      expect(incomeDeltas.size).toBe(1);
      expect(incomeDeltas.get('acc-main')).toBe(-3000);

      // Deleting expense refunds account balance
      const expenseTx: BalanceTx = {
        type: 'expense',
        amount: 1200,
        accountId: 'acc-card',
      };
      const expenseDeltas = balanceDeltas(expenseTx, null);
      expect(expenseDeltas.size).toBe(1);
      expect(expenseDeltas.get('acc-card')).toBe(1200);

      // Deleting zero amount does not produce a delta entry
      const zeroTx: BalanceTx = {
        type: 'income',
        amount: 0,
        accountId: 'acc-card',
      };
      const zeroDeltas = balanceDeltas(zeroTx, null);
      expect(zeroDeltas.size).toBe(0);
    });

    it('handles updates on the same account', () => {
      const accountId = 'acc-savings';

      // Expense amount increased: old -500, new -800 -> delta -300
      const exp1: BalanceTx = { type: 'expense', amount: 500, accountId };
      const exp2: BalanceTx = { type: 'expense', amount: 800, accountId };
      const resExpInc = balanceDeltas(exp1, exp2);
      expect(resExpInc.get(accountId)).toBe(-300);

      // Expense amount decreased: old -800, new -500 -> delta +300
      const resExpDec = balanceDeltas(exp2, exp1);
      expect(resExpDec.get(accountId)).toBe(300);

      // Income amount increased: old +1000, new +1500 -> delta +500
      const inc1: BalanceTx = { type: 'income', amount: 1000, accountId };
      const inc2: BalanceTx = { type: 'income', amount: 1500, accountId };
      const resIncInc = balanceDeltas(inc1, inc2);
      expect(resIncInc.get(accountId)).toBe(500);

      // Type flip: Expense to Income: old -500, new +500 -> delta +1000
      const resFlipToInc = balanceDeltas(exp1, inc1);
      expect(resFlipToInc.get(accountId)).toBe(1500);

      // Type flip: Income to Expense: old +1000, new -500 -> delta -1500
      const resFlipToExp = balanceDeltas(inc1, exp1);
      expect(resFlipToExp.get(accountId)).toBe(-1500);

      // No change: identical before and after -> empty Map
      const noChange = balanceDeltas(exp1, { ...exp1 });
      expect(noChange.size).toBe(0);
    });

    it('handles updates switching account', () => {
      const oldAccount = 'acc-cash';
      const newAccount = 'acc-bank';

      // Moving expense: old expense refunded on old account, charged to new account
      const oldExp: BalanceTx = {
        type: 'expense',
        amount: 2000,
        accountId: oldAccount,
      };
      const newExp: BalanceTx = {
        type: 'expense',
        amount: 2000,
        accountId: newAccount,
      };
      const resMoveExp = balanceDeltas(oldExp, newExp);
      expect(resMoveExp.size).toBe(2);
      expect(resMoveExp.get(oldAccount)).toBe(2000);
      expect(resMoveExp.get(newAccount)).toBe(-2000);

      // Moving income: old income removed from old account, credited to new account
      const oldInc: BalanceTx = {
        type: 'income',
        amount: 5000,
        accountId: oldAccount,
      };
      const newInc: BalanceTx = {
        type: 'income',
        amount: 5000,
        accountId: newAccount,
      };
      const resMoveInc = balanceDeltas(oldInc, newInc);
      expect(resMoveInc.size).toBe(2);
      expect(resMoveInc.get(oldAccount)).toBe(-5000);
      expect(resMoveInc.get(newAccount)).toBe(5000);

      // Moving with amount change and type flip
      const complexOld: BalanceTx = {
        type: 'expense',
        amount: 1000,
        accountId: oldAccount,
      };
      const complexNew: BalanceTx = {
        type: 'income',
        amount: 3000,
        accountId: newAccount,
      };
      const resComplex = balanceDeltas(complexOld, complexNew);
      expect(resComplex.size).toBe(2);
      expect(resComplex.get(oldAccount)).toBe(1000);
      expect(resComplex.get(newAccount)).toBe(3000);

      // Moving with zero amount on one or both accounts
      const zeroOld: BalanceTx = {
        type: 'expense',
        amount: 0,
        accountId: oldAccount,
      };
      const zeroNew: BalanceTx = {
        type: 'expense',
        amount: 0,
        accountId: newAccount,
      };
      const resBothZero = balanceDeltas(zeroOld, zeroNew);
      expect(resBothZero.size).toBe(0);

      const resOldZero = balanceDeltas(zeroOld, complexNew);
      expect(resOldZero.size).toBe(1);
      expect(resOldZero.get(newAccount)).toBe(3000);
      expect(resOldZero.has(oldAccount)).toBe(false);

      const resNewZero = balanceDeltas(complexOld, zeroNew);
      expect(resNewZero.size).toBe(1);
      expect(resNewZero.get(oldAccount)).toBe(1000);
      expect(resNewZero.has(newAccount)).toBe(false);
    });
  });

  describe('mergeDeltas', () => {
    it('returns empty map for empty iterable', () => {
      const result = mergeDeltas([]);
      expect(result.size).toBe(0);
    });

    it('aggregates multiple deltas for the same account', () => {
      const delta1 = new Map([['acc-1', 1000]]);
      const delta2 = new Map([['acc-1', -400]]);
      const delta3 = new Map([['acc-1', 200]]);

      const merged = mergeDeltas([delta1, delta2, delta3]);
      expect(merged.size).toBe(1);
      expect(merged.get('acc-1')).toBe(800);
    });

    it('aggregates deltas across different accounts', () => {
      const delta1 = new Map([
        ['acc-1', -1500],
        ['acc-2', 1500],
      ]);
      const delta2 = new Map([
        ['acc-1', -500],
        ['acc-3', 2000],
      ]);

      const merged = mergeDeltas([delta1, delta2]);
      expect(merged.size).toBe(3);
      expect(merged.get('acc-1')).toBe(-2000);
      expect(merged.get('acc-2')).toBe(1500);
      expect(merged.get('acc-3')).toBe(2000);
    });

    it('deletes accounts whose net delta cancels out to 0', () => {
      const delta1 = new Map([['acc-1', 500]]);
      const delta2 = new Map([['acc-1', -500]]);

      const merged = mergeDeltas([delta1, delta2]);
      expect(merged.size).toBe(0);
      expect(merged.has('acc-1')).toBe(false);
    });

    it('ignores 0 deltas inside maps', () => {
      const delta1 = new Map([
        ['acc-1', 0],
        ['acc-2', 700],
      ]);
      const merged = mergeDeltas([delta1]);
      expect(merged.size).toBe(1);
      expect(merged.get('acc-2')).toBe(700);
      expect(merged.has('acc-1')).toBe(false);
    });

    it('works with Set of maps and generator iterables', () => {
      function* deltaGenerator() {
        yield new Map([['acc-gen', 300]]);
        yield new Map([['acc-gen', 700]]);
      }

      const merged = mergeDeltas(deltaGenerator());
      expect(merged.get('acc-gen')).toBe(1000);
    });
  });
});
