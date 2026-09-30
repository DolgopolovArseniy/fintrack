import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SubscriptionResult } from '@/hooks/useSubscription';
import { AppError } from '@/lib/errors';
import { QueryBoundary } from './QueryBoundary';

describe('QueryBoundary', () => {
  it('renders default LoadingSkeleton when state is loading', () => {
    const state: SubscriptionResult<string[]> = {
      status: 'loading',
      retry: vi.fn(),
    };

    render(
      <QueryBoundary<string[]> state={state} empty={<div>Empty view</div>}>
        {(data) => <div>Data: {data.join(',')}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders custom skeleton when provided', () => {
    const state: SubscriptionResult<string[]> = {
      status: 'loading',
      retry: vi.fn(),
    };

    render(
      <QueryBoundary<string[]>
        state={state}
        skeleton={<div data-testid="custom-skeleton">Custom Loading</div>}
        empty={<div>Empty view</div>}
      >
        {(data) => <div>Data: {data.join(',')}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
  });

  it('renders ErrorState when state is error', () => {
    const state: SubscriptionResult<string[]> = {
      status: 'error',
      error: new AppError('offline', 'Network error'),
      retry: vi.fn(),
    };

    render(
      <QueryBoundary<string[]> state={state} empty={<div>Empty view</div>}>
        {(data) => <div>Data: {data.join(',')}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty view when array data is empty by default', () => {
    const state: SubscriptionResult<string[]> = {
      status: 'success',
      data: [],
      retry: vi.fn(),
    };

    render(
      <QueryBoundary
        state={state}
        empty={<div data-testid="empty-node">No entries</div>}
      >
        {(data) => <div>Data: {data.join(',')}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByTestId('empty-node')).toBeInTheDocument();
  });

  it('renders children with data when data is present', () => {
    const state: SubscriptionResult<string[]> = {
      status: 'success',
      data: ['item-1', 'item-2'],
      retry: vi.fn(),
    };

    render(
      <QueryBoundary state={state} empty={<div>No entries</div>}>
        {(data) => <div data-testid="content">{data.join(' | ')}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByTestId('content')).toHaveTextContent('item-1 | item-2');
  });

  it('supports custom isEmpty callback', () => {
    interface CustomData {
      items: number[];
    }
    const state: SubscriptionResult<CustomData> = {
      status: 'success',
      data: { items: [] },
      retry: vi.fn(),
    };

    render(
      <QueryBoundary
        state={state}
        isEmpty={(d) => d.items.length === 0}
        empty={<div data-testid="custom-empty">Custom empty</div>}
      >
        {(data) => <div>Count: {data.items.length}</div>}
      </QueryBoundary>,
    );

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
  });
});
