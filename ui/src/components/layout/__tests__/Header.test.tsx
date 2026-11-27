import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_NOTIFICATIONS, INITIAL_SECURITY_EVENTS, SERVICE_NODES } from '../../../data/mockDashboardData';
import { getNavItem } from '../../../data/navigation';
import { Header } from '../Header';

function HeaderHarness({
  onNavigate = vi.fn(),
  onSelectService = vi.fn(),
}: {
  onNavigate?: ReturnType<typeof vi.fn>;
  onSelectService?: ReturnType<typeof vi.fn>;
}) {
  const [query, setQuery] = useState('');

  return (
    <Header
      currentNav={getNavItem('overview')}
      searchQuery={query}
      onSearchChange={setQuery}
      onNavigate={onNavigate}
      notifications={INITIAL_NOTIFICATIONS}
      unreadCount={2}
      onMarkNotificationRead={vi.fn()}
      onMarkAllRead={vi.fn()}
      onResetDemoState={vi.fn()}
      onOpenMobileMenu={vi.fn()}
      events={INITIAL_SECURITY_EVENTS}
      services={SERVICE_NODES}
      onSelectEvent={vi.fn()}
      onSelectService={onSelectService}
    />
  );
}

describe('Header search interaction', () => {
  it('focuses on "/" shortcut, displays matching quick-jump results, and selects a node', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onSelectService = vi.fn();

    render(<HeaderHarness onNavigate={onNavigate} onSelectService={onSelectService} />);

    await user.keyboard('/');
    const searchInput = screen.getByRole('textbox', { name: 'Search security telemetry' });
    expect(searchInput).toHaveFocus();

    await user.type(searchInput, 'Finance');

    expect(screen.getByText('Quick Results (Simulated)')).toBeInTheDocument();
    expect(screen.getByText('Unusual service access detected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Finance\s+Advisory/i }));
    expect(onNavigate).toHaveBeenCalledWith('overview');
    expect(onSelectService).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Finance' }),
    );
  });

  it('shows empty state when no modules, events, or nodes match', async () => {
    const user = userEvent.setup();
    render(<HeaderHarness />);

    const searchInput = screen.getByRole('textbox', { name: 'Search security telemetry' });
    await user.type(searchInput, 'zzzz-no-match');

    expect(screen.getByText('No matching modules, events, or nodes.')).toBeInTheDocument();
  });
});
