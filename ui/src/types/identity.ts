export type IdentityStatus = 'Active' | 'Suspended' | 'Elevated risk';

export type IdentityTrustStatus = 'Verified' | 'Review required' | 'Restricted';

export interface SyntheticIdentity {
  id: string;
  displayName: string;
  handle: string;
  identityType: 'Human Operator' | 'Service Principal' | 'Contractor';
  role: string;
  department: string;
  status: IdentityStatus;
  trustStatus: IdentityTrustStatus;
  lastActivity: string;
  associatedServices: string[];
  notes: string;
}
