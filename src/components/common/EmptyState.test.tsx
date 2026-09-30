import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No transactions yet"
        description="Add your first transaction"
        action={<button type="button">Add</button>}
      />,
    );

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first transaction')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
