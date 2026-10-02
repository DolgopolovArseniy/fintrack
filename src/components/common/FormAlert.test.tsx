import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormAlert } from './FormAlert';

describe('FormAlert', () => {
  it('renders nothing when message, children, and title are absent', () => {
    const { container } = render(<FormAlert />);
    expect(container.firstChild).toBeNull();
  });

  it('renders message inside alert with alert role', () => {
    render(<FormAlert message="Something went wrong" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Something went wrong');
  });

  it('renders title and children when provided', () => {
    render(
      <FormAlert title="Error Title">
        <span>Detailed error explanation</span>
      </FormAlert>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Detailed error explanation')).toBeInTheDocument();
  });
});
