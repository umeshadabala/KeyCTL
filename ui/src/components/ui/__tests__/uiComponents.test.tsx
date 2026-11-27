import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StatusTone } from '../../../types/security';
import { ConfirmModal } from '../ConfirmModal';
import { EmptyState } from '../EmptyState';
import { FeedbackBanner } from '../FeedbackBanner';

describe('ConfirmModal', () => {
  it('renders nothing when closed, opens with warning note, and submits reason on confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <ConfirmModal
        open={false}
        title="Revoke device?"
        description="Confirm permanent revocation."
        confirmLabel="Confirm Revoke"
        tone="danger"
        requireReason
        warningNote="Cannot be restored."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <ConfirmModal
        open
        title="Revoke device?"
        description="Confirm permanent revocation."
        confirmLabel="Confirm Revoke"
        tone="danger"
        requireReason
        warningNote="Cannot be restored."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cannot be restored.')).toBeInTheDocument();

    const noteInput = screen.getByLabelText(/Operator Note/i);
    await user.type(noteInput, 'Compromised laptop');
    await user.click(screen.getByRole('button', { name: 'Confirm Revoke' }));

    expect(onConfirm).toHaveBeenCalledWith('Compromised laptop');
  });

  it('dismisses when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        open
        title="Quarantine device?"
        description="Moves device into quarantine."
        confirmLabel="Confirm Quarantine"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders title, description, and invokes action callback', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState
        title="No matching records"
        description="Try resetting filters."
        actionLabel="Clear filters"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('No matching records')).toBeInTheDocument();
    expect(screen.getByText('Try resetting filters.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('FeedbackBanner', () => {
  it.each<[StatusTone, string]>([
    ['success', 'Device restored successfully'],
    ['warning', 'Device quarantined'],
    ['danger', 'Device revoked'],
    ['neutral', 'Permission updated'],
  ])('renders %s variant and dismisses cleanly', async (tone, message) => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <FeedbackBanner
        feedback={{ id: 'fb-1', message, tone }}
        onDismiss={onDismiss}
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(message);

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when feedback is null', () => {
    const { container } = render(<FeedbackBanner feedback={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
