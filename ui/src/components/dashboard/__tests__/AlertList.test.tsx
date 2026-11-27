import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SecurityAlert } from '../../../types/security';
import { AlertList } from '../AlertList';

const SAMPLE_ALERTS: SecurityAlert[] = [
  {
    id: 'ALT-101',
    severity: 'high',
    title: 'Anomalous Finance token request',
    identity: 'm.chen@sandbox.local',
    service: 'Finance',
    reason: 'Requested outside role scope.',
    timestamp: '2m ago',
    acknowledged: false,
    simulatedRecommendation: 'Inspect scope',
  },
];

function AlertListHarness({ onSelectAlert = vi.fn() }: { onSelectAlert?: ReturnType<typeof vi.fn> }) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(SAMPLE_ALERTS);

  const toggleAck = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: !a.acknowledged } : a)),
    );
  };

  return (
    <AlertList
      alerts={alerts}
      onSelectAlert={onSelectAlert}
      onToggleAcknowledge={toggleAck}
    />
  );
}

describe('AlertList', () => {
  it('updates active count and button label when an alert is acknowledged and restored', async () => {
    const user = userEvent.setup();
    render(<AlertListHarness />);

    expect(screen.getByText('1 active (Sim)')).toBeInTheDocument();
    const ackButton = screen.getByRole('button', { name: 'Ack' });

    await user.click(ackButton);
    expect(screen.getByText('0 active (Sim)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acked' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Acked' }));
    expect(screen.getByText('1 active (Sim)')).toBeInTheDocument();
  });

  it('invokes onSelectAlert when clicking an alert title', async () => {
    const user = userEvent.setup();
    const onSelectAlert = vi.fn();
    render(<AlertListHarness onSelectAlert={onSelectAlert} />);

    await user.click(screen.getByRole('button', { name: /Anomalous Finance token request/i }));
    expect(onSelectAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ALT-101' }),
    );
  });
});
