import type { SelectOption } from './Select';

export const workspaceOptions: SelectOption[] = [
  { value: 'analytics', label: 'Analytics workspace' },
  { value: 'billing', label: 'Billing console' },
  { value: 'editor', label: 'Content editor' },
  { value: 'support', label: 'Support queue' },
];

export const teamOptions: SelectOption[] = [
  { value: 'design', label: 'Design system' },
  { value: 'platform', label: 'Platform' },
  { value: 'growth', label: 'Growth' },
  { value: 'support', label: 'Support' },
];
