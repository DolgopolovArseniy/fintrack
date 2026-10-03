import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import {
  DISPLAY_NAME_MAX_LENGTH,
  MAX_AMOUNT,
  MAX_BALANCE,
  MIN_AMOUNT,
  NAME_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  SYSTEM_KEY_MAX_LENGTH,
  TAGS_MAX_COUNT,
} from '@/lib/limits';
import { SUPPORTED_LOCALES } from '@/lib/locales';

function requireMatch(
  content: string,
  regex: RegExp,
  description: string,
): RegExpMatchArray {
  const match = content.match(regex);
  expect(match, `Expected pattern for ${description} to match`).not.toBeNull();
  if (!match) {
    throw new Error(`Pattern for ${description} did not match`);
  }
  return match;
}

describe('Sync and Static Rules Checks (§8.8)', () => {
  const rulesFilePath = path.resolve(import.meta.dirname, '../firestore.rules');
  const dataModelDocPath = path.resolve(
    import.meta.dirname,
    '../docs/02-data-model.md',
  );

  const rulesContent = fs.readFileSync(rulesFilePath, 'utf-8');
  const docContent = fs.readFileSync(dataModelDocPath, 'utf-8');

  it("declares rules_version = '2'", () => {
    expect(rulesContent).toMatch(/^rules_version\s*=\s*'2';/m);
  });

  it('matches supported currencies list in rules with SUPPORTED_CURRENCIES', () => {
    const match = requireMatch(
      rulesContent,
      /d\.baseCurrency\s+in\s+\[([^\]]+)\]/,
      'supported currencies',
    );
    const rawCurrencies = match[1] ?? '';
    const extractedCurrencies = rawCurrencies
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''));

    expect(extractedCurrencies).toEqual([...SUPPORTED_CURRENCIES]);
  });

  it('matches supported locales list in rules with SUPPORTED_LOCALES', () => {
    const match = requireMatch(
      rulesContent,
      /d\.locale\s+in\s+\[([^\]]+)\]/,
      'supported locales',
    );
    const rawLocales = match[1] ?? '';
    const extractedLocales = rawLocales
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''));

    expect(extractedLocales).toEqual([...SUPPORTED_LOCALES]);
  });

  describe('Numeric and length boundaries vs lib/limits.ts', () => {
    it('matches MIN_AMOUNT and MAX_AMOUNT in transaction amount check', () => {
      const match = requireMatch(
        rulesContent,
        /isIntBetween\(d\.amount,\s*(\d+),\s*(\d+)\)/,
        'transaction amount',
      );
      expect(Number(match[1])).toBe(MIN_AMOUNT);
      expect(Number(match[2])).toBe(MAX_AMOUNT);
    });

    it('matches MIN_AMOUNT and MAX_AMOUNT in budget limit check', () => {
      const match = requireMatch(
        rulesContent,
        /isIntBetween\(d\.limit,\s*(\d+),\s*(\d+)\)/,
        'budget limit',
      );
      expect(Number(match[1])).toBe(MIN_AMOUNT);
      expect(Number(match[2])).toBe(MAX_AMOUNT);
    });

    it('matches MAX_BALANCE in account balance and initialBalance checks', () => {
      const balanceMatch = requireMatch(
        rulesContent,
        /isIntBetween\(d\.balance,\s*-(\d+),\s*(\d+)\)/,
        'account balance',
      );
      expect(Number(balanceMatch[1])).toBe(MAX_BALANCE);
      expect(Number(balanceMatch[2])).toBe(MAX_BALANCE);

      const initialBalanceMatch = requireMatch(
        rulesContent,
        /isIntBetween\(d\.initialBalance,\s*-(\d+),\s*(\d+)\)/,
        'account initialBalance',
      );
      expect(Number(initialBalanceMatch[1])).toBe(MAX_BALANCE);
      expect(Number(initialBalanceMatch[2])).toBe(MAX_BALANCE);
    });

    it('matches DISPLAY_NAME_MAX_LENGTH in profile displayName check', () => {
      const match = requireMatch(
        rulesContent,
        /isOptionalText\('displayName',\s*(\d+),\s*(\d+)\)/,
        'profile displayName',
      );
      expect(Number(match[1])).toBe(0);
      expect(Number(match[2])).toBe(DISPLAY_NAME_MAX_LENGTH);
    });

    it('matches NAME_MAX_LENGTH across account and category name checks', () => {
      const matches = [
        ...rulesContent.matchAll(/isOptionalText\('name',\s*(\d+),\s*(\d+)\)/g),
      ];
      expect(matches.length).toBeGreaterThanOrEqual(2);
      for (const m of matches) {
        expect(Number(m[1])).toBe(1);
        expect(Number(m[2])).toBe(NAME_MAX_LENGTH);
      }
    });

    it('matches SYSTEM_KEY_MAX_LENGTH across account and category systemKey checks', () => {
      const matches = [
        ...rulesContent.matchAll(
          /isOptionalText\('systemKey',\s*(\d+),\s*(\d+)\)/g,
        ),
      ];
      expect(matches.length).toBeGreaterThanOrEqual(2);
      for (const m of matches) {
        expect(Number(m[1])).toBe(1);
        expect(Number(m[2])).toBe(SYSTEM_KEY_MAX_LENGTH);
      }
    });

    it('matches NOTE_MAX_LENGTH in transaction note check', () => {
      const match = requireMatch(
        rulesContent,
        /isOptionalText\('note',\s*(\d+),\s*(\d+)\)/,
        'transaction note',
      );
      expect(Number(match[1])).toBe(0);
      expect(Number(match[2])).toBe(NOTE_MAX_LENGTH);
    });

    it('matches TAGS_MAX_COUNT in transaction tags check', () => {
      const match = requireMatch(
        rulesContent,
        /d\.tags\.size\(\)\s*<=\s*(\d+)/,
        'transaction tags',
      );
      expect(Number(match[1])).toBe(TAGS_MAX_COUNT);
    });
  });

  describe('Architectural constraints and forbidden calls', () => {
    it('does not contain forbidden calls: exists, get, getAfter', () => {
      expect(rulesContent).not.toMatch(/\bexists\s*\(/);
      expect(rulesContent).not.toMatch(/\bget\s*\(/);
      expect(rulesContent).not.toMatch(/\bgetAfter\s*\(/);
    });
  });

  describe('Documentation synchronization', () => {
    it('matches code block in docs/02-data-model.md section 11 with firestore.rules exactly', () => {
      const sectionIndex = docContent.indexOf('## 11. Security Rules');
      expect(sectionIndex).toBeGreaterThan(-1);

      const afterSection = docContent.slice(sectionIndex);
      const codeBlockMatch = requireMatch(
        afterSection,
        /```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/,
        'security rules code block in 02-data-model.md',
      );

      const normalize = (str: string) =>
        str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

      const docRules = normalize(codeBlockMatch[1] ?? '');
      const fileRules = normalize(rulesContent);

      expect(docRules).toBe(fileRules);
    });
  });
});
