import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountBadge } from './AccountBadge';

describe('AccountBadge', () => {
  it('renders custom account name', () => {
    render(<AccountBadge name="T-Bank Black" type="card" />);

    expect(screen.getByText('T-Bank Black')).toBeInTheDocument();
  });

  it('renders default/translated system account name when only systemKey is provided', () => {
    render(<AccountBadge systemKey="main" type="cash" />);

    expect(screen.getByText('Main account')).toBeInTheDocument();
  });

  it('prioritizes name over systemKey', () => {
    render(<AccountBadge name="My Savings" systemKey="main" type="bank" />);

    expect(screen.getByText('My Savings')).toBeInTheDocument();
    expect(screen.queryByText('Main account')).not.toBeInTheDocument();
  });

  it('renders icon correctly for cash, card, and bank', () => {
    const { container: containerCash } = render(
      <AccountBadge name="Cash Wallet" type="cash" />,
    );
    const svgCash = containerCash.querySelector('svg');
    expect(svgCash).toBeInTheDocument();
    expect(svgCash).toHaveAttribute('aria-hidden', 'true');

    const { container: containerCard } = render(
      <AccountBadge name="Credit Card" type="card" />,
    );
    const svgCard = containerCard.querySelector('svg');
    expect(svgCard).toBeInTheDocument();

    const { container: containerBank } = render(
      <AccountBadge name="Bank Deposit" type="bank" />,
    );
    const svgBank = containerBank.querySelector('svg');
    expect(svgBank).toBeInTheDocument();
  });

  it('hides type icon when showTypeIcon is false', () => {
    const { container } = render(
      <AccountBadge name="No Icon Card" type="card" showTypeIcon={false} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
    expect(screen.getByText('No Icon Card')).toBeInTheDocument();
  });

  it('renders archived indicator and styles when archived is true', () => {
    render(<AccountBadge name="Old Card" type="card" archived={true} />);

    const badge = screen.getByTestId('account-badge');
    expect(badge).toHaveAttribute('data-archived', 'true');
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('hides archived badge when showArchivedBadge is false', () => {
    render(
      <AccountBadge
        name="Old Card"
        type="card"
        archived={true}
        showArchivedBadge={false}
      />,
    );

    const badge = screen.getByTestId('account-badge');
    expect(badge).toHaveAttribute('data-archived', 'true');
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('applies type data attribute and size styling', () => {
    const { container } = render(
      <AccountBadge name="Main Cash" type="cash" size="lg" />,
    );

    const badge = container.querySelector('[data-slot="account-badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-type', 'cash');
    expect(badge?.className).toContain('text-base');
  });
});
