import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  it('renders all 12 color options', () => {
    render(<ColorPicker value="orange" onChange={vi.fn()} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(12);
  });

  it('indicates selected color with aria-checked and checkmark icon', () => {
    render(<ColorPicker value="emerald" onChange={vi.fn()} />);

    const emeraldRadio = screen.getByRole('radio', { name: /emerald/i });
    expect(emeraldRadio).toHaveAttribute('aria-checked', 'true');

    const svg = emeraldRadio.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onChange when another color is clicked', () => {
    const handleChange = vi.fn();
    render(<ColorPicker value="orange" onChange={handleChange} />);

    const indigoRadio = screen.getByRole('radio', { name: /indigo/i });
    fireEvent.click(indigoRadio);

    expect(handleChange).toHaveBeenCalledWith('indigo');
  });

  it('navigates with keyboard arrow keys', () => {
    const handleChange = vi.fn();
    render(<ColorPicker value="slate" onChange={handleChange} />);

    const slateRadio = screen.getByRole('radio', { name: /slate/i });
    fireEvent.keyDown(slateRadio, { key: 'ArrowRight' });

    expect(handleChange).toHaveBeenCalledWith('red');
  });

  it('disables all swatches when disabled is true', () => {
    render(<ColorPicker value="slate" onChange={vi.fn()} disabled={true} />);

    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio).toBeDisabled();
    }
  });
});
