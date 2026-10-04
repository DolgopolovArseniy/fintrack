import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from './ResponsiveDialog';

describe('ResponsiveDialog', () => {
  const originalMatchMedia = window.matchMedia.bind(window);

  beforeEach(() => {
    // Default mock: desktop
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders Dialog on desktop when open', () => {
    render(
      <ResponsiveDialog
        open={true}
        isDesktop={true}
        title="Desktop Title"
        description="Desktop Description"
      >
        <div>Desktop Content</div>
      </ResponsiveDialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Desktop Title')).toBeInTheDocument();
    expect(screen.getByText('Desktop Description')).toBeInTheDocument();
    expect(screen.getByText('Desktop Content')).toBeInTheDocument();
  });

  it('renders Drawer on mobile when open', () => {
    render(
      <ResponsiveDialog
        open={true}
        isDesktop={false}
        title="Mobile Title"
        description="Mobile Description"
      >
        <div>Mobile Content</div>
      </ResponsiveDialog>,
    );

    expect(screen.getByText('Mobile Title')).toBeInTheDocument();
    expect(screen.getByText('Mobile Description')).toBeInTheDocument();
    expect(screen.getByText('Mobile Content')).toBeInTheDocument();
  });

  it('switches between Dialog and Drawer based on useMediaQuery', () => {
    // Mock mobile media query
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = render(
      <ResponsiveDialog
        open={true}
        title="Dynamic Title"
        description="Dynamic Description"
      >
        <div>Dynamic Content</div>
      </ResponsiveDialog>,
    );

    // Mobile drawer rendered
    expect(screen.getByText('Dynamic Title')).toBeInTheDocument();

    // Switch to desktop media query
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    rerender(
      <ResponsiveDialog
        open={true}
        title="Dynamic Title"
        description="Dynamic Description"
      >
        <div>Dynamic Content</div>
      </ResponsiveDialog>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Title')).toBeInTheDocument();
  });

  it('supports compound components in desktop mode', () => {
    const handleOpenChange = vi.fn();

    render(
      <ResponsiveDialog
        open={true}
        onOpenChange={handleOpenChange}
        isDesktop={true}
      >
        <ResponsiveDialogTrigger asChild>
          <button type="button">Open Modal</button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Compound Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Compound Desc
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div>Compound Body</div>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <button type="button">Close Modal</button>
            </ResponsiveDialogClose>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    expect(screen.getByText('Compound Title')).toBeInTheDocument();
    expect(screen.getByText('Compound Desc')).toBeInTheDocument();
    expect(screen.getByText('Compound Body')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close Modal' });
    fireEvent.click(closeButton);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
