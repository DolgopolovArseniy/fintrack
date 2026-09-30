import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders title as h1 element', () => {
    render(<PageHeader title="Transactions" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Transactions');
  });

  it('renders optional description and actions', () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Overview of your monthly budget"
        actions={<button type="button">Add</button>}
      />,
    );

    expect(
      screen.getByText('Overview of your monthly budget'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
