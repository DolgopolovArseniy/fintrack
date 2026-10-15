import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAccount, buildCategory } from '@/test/factories';
import { createFakeImporter } from '../importTestUtils';
import { ColumnMapper } from './ColumnMapper';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();

describe('ColumnMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const categories = [
    buildCategory({ id: 'cat-food', name: 'Groceries', type: 'expense' }),
    buildCategory({ id: 'cat-salary', name: 'Salary', type: 'income' }),
  ];
  const accounts = [buildAccount({ id: 'acc-card', name: 'Main Card' })];

  const mappingImporter = () =>
    createFakeImporter({
      step: 'mapping',
      table: {
        headers: ['Date', 'Amount', 'Shop'],
        rows: [['2026-09-15', '10', 'Store']],
        delimiter: ',',
        hasHeader: true,
      },
      mapping: {
        date: 0,
        type: null,
        amount: 1,
        category: null,
        account: null,
        note: null,
        tags: null,
      },
      categories,
      accounts,
      defaults: {
        accountId: 'acc-card',
        expenseCategoryId: 'cat-food',
        incomeCategoryId: 'cat-salary',
      },
    });

  it('renders one field select per file column', () => {
    render(<ColumnMapper importer={mappingImporter()} />);

    expect(screen.getByTestId('column-map-0')).toBeInTheDocument();
    expect(screen.getByTestId('column-map-1')).toBeInTheDocument();
    expect(screen.getByTestId('column-map-2')).toBeInTheDocument();
  });

  it('hints at sign mode when Type is unmapped', () => {
    render(<ColumnMapper importer={mappingImporter()} />);

    expect(
      screen.getByText(/derived from the amount sign|знаку суммы/i),
    ).toBeInTheDocument();
  });

  it('switches the delimiter without reloading the file', async () => {
    const user = userEvent.setup();
    const importer = mappingImporter();
    render(<ColumnMapper importer={importer} />);

    await user.click(screen.getByRole('button', { name: ';' }));

    expect(importer.setDelimiter).toHaveBeenCalledWith(';');
  });

  it('remaps a column through the field select', async () => {
    const user = userEvent.setup();
    const importer = mappingImporter();
    render(<ColumnMapper importer={importer} />);

    await user.click(screen.getByTestId('column-map-2'));
    await user.click(screen.getByTestId('column-option-note'));

    expect(importer.setMapping).toHaveBeenCalledWith({ note: 2 });
  });

  it('assigns an unrecognized name to an existing category', async () => {
    const user = userEvent.setup();
    const importer = mappingImporter();
    importer.unmappedCategoryNames = ['Кофейни'];
    render(<ColumnMapper importer={importer} />);

    await user.click(screen.getByTestId('override-category-Кофейни'));
    await user.click(screen.getByTestId('override-category-option-cat-food'));

    expect(importer.setNameOverride).toHaveBeenCalledWith(
      'category',
      'Кофейни',
      'cat-food',
    );
  });

  it('blocks the transition and warns when required columns are missing', async () => {
    const user = userEvent.setup();
    const importer = mappingImporter();
    importer.mapping = { ...importer.mapping, amount: null };
    importer.goToPreview = vi.fn(() => false);
    render(<ColumnMapper importer={importer} />);

    await user.click(
      screen.getByRole('button', { name: /continue to preview|продолжить/i }),
    );

    expect(importer.goToPreview).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/date and amount|даты и суммы/i),
    ).toBeInTheDocument();
  });
});
