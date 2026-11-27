import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { INITIAL_EVALUATION_HISTORY, INITIAL_PERMISSIONS } from '../../../data/accessPolicies';
import { INITIAL_DEVICES } from '../../../data/devices';
import { INITIAL_IDENTITIES } from '../../../data/identities';
import { evaluateSyntheticAccess } from '../../../lib/evaluateAccess';
import type {
  AccessEvaluationResult,
  RequestedPermission,
  ServiceName,
} from '../../../types/access';
import { AccessEvaluator } from '../AccessEvaluator';

function AccessEvaluatorHarness() {
  const [selectedIdentityId, setSelectedIdentityId] = useState('ID-101');
  const [selectedService, setSelectedService] = useState<ServiceName>('Admin Console');
  const [requestedPermission, setRequestedPermission] =
    useState<RequestedPermission>('Admin');
  const [history, setHistory] = useState<AccessEvaluationResult[]>(INITIAL_EVALUATION_HISTORY);
  const [latestResult, setLatestResult] = useState<AccessEvaluationResult | null>(null);

  const handleEvaluate = () => {
    const identity = INITIAL_IDENTITIES.find((i) => i.id === selectedIdentityId)!;
    const res = evaluateSyntheticAccess({
      identity,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: selectedService,
      requestedPermission,
    });
    setLatestResult(res);
    setHistory((prev) => [res, ...prev]);
  };

  return (
    <AccessEvaluator
      identities={INITIAL_IDENTITIES}
      selectedIdentityId={selectedIdentityId}
      onIdentityChange={setSelectedIdentityId}
      selectedService={selectedService}
      onServiceChange={setSelectedService}
      requestedPermission={requestedPermission}
      onPermissionChange={setRequestedPermission}
      latestResult={latestResult}
      history={history}
      onEvaluate={handleEvaluate}
      onSelectHistoryResult={setLatestResult}
    />
  );
}

describe('AccessEvaluator', () => {
  it('evaluates selected identity, service, and permission and renders ALLOW and DENY decisions', async () => {
    const user = userEvent.setup();
    render(<AccessEvaluatorHarness />);

    expect(screen.getByText('Simulation History (2)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Evaluate Access \(Simulated\)/i }));

    expect(screen.getAllByText('ALLOW').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Elena Vance \(elena\.vance@sandbox\.local\)/)).toBeInTheDocument();
    expect(screen.getByText(/Least-Privilege Role Matrix/)).toBeInTheDocument();
    expect(screen.getByText('Simulation History (3)')).toBeInTheDocument();

    // Switch to Suspended identity -> should evaluate to DENY under POL-001
    await user.selectOptions(screen.getByLabelText('Identity'), 'ID-110');
    await user.click(screen.getByRole('button', { name: /Evaluate Access \(Simulated\)/i }));

    expect(screen.getAllByText('DENY').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Suspended Identity Hard Block/)).toBeInTheDocument();
    expect(screen.getByText('Simulation History (4)')).toBeInTheDocument();
  });
});
