import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContainer } from '../ToastContainer';
import { ToastProvider } from '../../../contexts/ToastContext';
import { useToast } from '../../../hooks/useToast';

function ToastHarness() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Saved', 'Policy updated.')}>success</button>
      <button onClick={() => toast.error('Failed', 'Backend error.')}>error</button>
      <button onClick={() => toast.warning('Cutoff', 'Key expiring soon.')}>warning</button>
      <button onClick={() => toast.info('Synced')}>info</button>
      <button onClick={() => toast.security('Replay detected', 'Duplicate msg_id.')}>security</button>
      <button onClick={() => toast.success('Custom', undefined, { duration: 1000 })}>custom</button>
      <button onClick={() => toast.dismissAll()}>dismiss-all</button>
    </div>
  );
}

describe('Toast notification system', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all 5 variants and supports manual dismissal', () => {
    render(
      <ToastProvider>
        <ToastHarness />
        <ToastContainer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('success'));
    fireEvent.click(screen.getByText('error'));
    fireEvent.click(screen.getByText('warning'));
    fireEvent.click(screen.getByText('info'));
    fireEvent.click(screen.getByText('security'));

    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Cutoff')).toBeTruthy();
    expect(screen.getByText('Synced')).toBeTruthy();
    expect(screen.getByText('Replay detected')).toBeTruthy();

    const dismissButtons = screen.getAllByLabelText('Dismiss notification');
    fireEvent.click(dismissButtons[0]);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('auto-dismisses timed toasts but keeps security toasts persistent', () => {
    render(
      <ToastProvider>
        <ToastHarness />
        <ToastContainer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('custom'));
    fireEvent.click(screen.getByText('security'));
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.getByText('Replay detected')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.queryByText('Custom')).toBeNull();
    expect(screen.getByText('Replay detected')).toBeTruthy();
  });

  it('pauses auto-dismiss on hover and prevents duplicates', () => {
    render(
      <ToastProvider>
        <ToastHarness />
        <ToastContainer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('custom'));
    fireEvent.click(screen.getByText('custom'));
    expect(screen.getAllByText('Custom')).toHaveLength(1);

    const toastEl = screen.getByText('Custom').closest('[role="status"]')!;
    fireEvent.mouseEnter(toastEl);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText('Custom')).toBeTruthy();

    fireEvent.mouseLeave(toastEl);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('Custom')).toBeNull();
  });

  it('supports dismissAll', () => {
    render(
      <ToastProvider>
        <ToastHarness />
        <ToastContainer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('success'));
    fireEvent.click(screen.getByText('security'));
    fireEvent.click(screen.getByText('dismiss-all'));
    expect(screen.queryByText('Saved')).toBeNull();
    expect(screen.queryByText('Replay detected')).toBeNull();
  });
});
