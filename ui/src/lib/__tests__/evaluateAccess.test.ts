import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { INITIAL_PERMISSIONS } from '../../data/accessPolicies';
import { INITIAL_DEVICES } from '../../data/devices';
import { INITIAL_IDENTITIES } from '../../data/identities';
import { useSandboxState } from '../../hooks/useSandboxState';
import type { SyntheticIdentity } from '../../types/identity';
import { evaluateSyntheticAccess } from '../evaluateAccess';
import { applyPermissionUpdate } from '../sandboxDomain';

function getIdentity(id: string): SyntheticIdentity {
  const found = INITIAL_IDENTITIES.find((i) => i.id === id);
  if (!found) throw new Error(`Missing fixture identity ${id}`);
  return found;
}

describe('evaluateSyntheticAccess & permission updates', () => {
  it('allows access when identity is Active, has a Trusted device, and matrix satisfies request', () => {
    const elena = getIdentity('ID-101');
    const result = evaluateSyntheticAccess({
      identity: elena,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: 'Admin Console',
      requestedPermission: 'Admin',
    });

    expect(result.decision).toBe('ALLOW');
    expect(result.relevantPolicyId).toBe('POL-002');
    expect(result.grantedLevel).toBe('Admin');
  });

  it('denies Suspended identities under POL-001 regardless of requested permission', () => {
    const suspended = getIdentity('ID-110');
    const result = evaluateSyntheticAccess({
      identity: suspended,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: 'Internal Chat',
      requestedPermission: 'Read',
    });

    expect(result.decision).toBe('DENY');
    expect(result.relevantPolicyId).toBe('POL-001');
  });

  it('denies identities without any Trusted device under POL-004', () => {
    const dara = getIdentity('ID-104'); // Only device is Pending verification initially
    const result = evaluateSyntheticAccess({
      identity: dara,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: 'HR Portal',
      requestedPermission: 'Read',
    });

    expect(result.decision).toBe('DENY');
    expect(result.relevantPolicyId).toBe('POL-004');
  });

  it('denies Elevated risk identities requesting Write/Admin on sensitive services under POL-003', () => {
    const rohan = getIdentity('ID-103');
    const result = evaluateSyntheticAccess({
      identity: rohan,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: 'Admin Console',
      requestedPermission: 'Write',
    });

    expect(result.decision).toBe('DENY');
    expect(result.relevantPolicyId).toBe('POL-003');
  });

  it('denies requests exceeding matrix allowance under POL-002', () => {
    const elena = getIdentity('ID-101'); // HR Portal grant is Read
    const result = evaluateSyntheticAccess({
      identity: elena,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: 'HR Portal',
      requestedPermission: 'Write',
    });

    expect(result.decision).toBe('DENY');
    expect(result.relevantPolicyId).toBe('POL-002');
    expect(result.grantedLevel).toBe('Read');
  });

  it('applies permission updates and reflects them in subsequent evaluations', () => {
    const elena = getIdentity('ID-101'); // Finance is initially Denied
    const deniedBefore = evaluateSyntheticAccess({
      identity: elena,
      devices: INITIAL_DEVICES,
      permissions: INITIAL_PERMISSIONS,
      service: 'Finance',
      requestedPermission: 'Read',
    });
    expect(deniedBefore.decision).toBe('DENY');

    const updated = applyPermissionUpdate({
      permissions: INITIAL_PERMISSIONS,
      identity: elena,
      service: 'Finance',
      level: 'Read',
    });
    expect(updated.event.description).toBe('Permission updated (Read on Finance)');

    const allowedAfter = evaluateSyntheticAccess({
      identity: elena,
      devices: INITIAL_DEVICES,
      permissions: updated.permissions,
      service: 'Finance',
      requestedPermission: 'Read',
    });
    expect(allowedAfter.decision).toBe('ALLOW');
  });
});

describe('useSandboxState — evaluation history & state resets', () => {
  it('prepends simulation results to evaluationHistory and resets cleanly', () => {
    const { result } = renderHook(() => useSandboxState());
    const initialCount = result.current.evaluationHistory.length;

    act(() => {
      const sim = result.current.runAccessSimulation('ID-101', 'Admin Console', 'Admin');
      expect(sim?.decision).toBe('ALLOW');
    });

    expect(result.current.evaluationHistory).toHaveLength(initialCount + 1);
    expect(result.current.evaluationHistory[0].identityId).toBe('ID-101');
    expect(result.current.events[0].description).toContain('Access simulation ALLOWED');

    act(() => {
      result.current.resetDemoState();
    });

    expect(result.current.evaluationHistory).toHaveLength(initialCount);
  });
});
