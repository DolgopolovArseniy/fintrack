import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders password input by default with show password label', () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', {
      name: 'Show password',
    });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles password visibility when button is clicked', () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    const toggleButton = screen.getByRole('button', {
      name: 'Show password',
    });

    fireEvent.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Show password' }),
    ).toBeInTheDocument();
  });

  it('supports custom show and hide labels', () => {
    render(
      <PasswordInput showPasswordLabel="Показать" hidePasswordLabel="Скрыть" />,
    );

    const toggleButton = screen.getByRole('button', { name: 'Показать' });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: 'Скрыть' })).toBeInTheDocument();
  });

  it('disables toggle button when input is disabled', () => {
    render(<PasswordInput disabled placeholder="Disabled input" />);

    const input = screen.getByPlaceholderText('Disabled input');
    const toggleButton = screen.getByRole('button', {
      name: 'Show password',
    });

    expect(input).toBeDisabled();
    expect(toggleButton).toBeDisabled();
  });
});
