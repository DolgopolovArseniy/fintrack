import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthFormCard } from './AuthFormCard';
import { GoogleButton } from './GoogleButton';

describe('Auth Common Components', () => {
  describe('AuthFormCard', () => {
    it('renders title, description, children, and footer', () => {
      render(
        <AuthFormCard
          title="Card Title"
          description="Card Description"
          footer={<div>Card Footer</div>}
        >
          <div>Card Content</div>
        </AuthFormCard>,
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });
  });

  describe('GoogleButton', () => {
    it('renders with default label and handles click', () => {
      const handleClick = vi.fn();
      render(<GoogleButton onClick={handleClick} />);

      const button = screen.getByRole('button', {
        name: 'Continue with Google',
      });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator and disables button when isLoading is true', () => {
      render(<GoogleButton isLoading />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });
});
