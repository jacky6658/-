
import { ContactStatus, Platform, LeadStatus, Decision, RejectReason } from './types';

export const CONTACT_STATUS_OPTIONS = Object.values(ContactStatus);
export const PLATFORM_OPTIONS = Object.values(Platform);
export const STATUS_OPTIONS = Object.values(LeadStatus);
export const DECISION_OPTIONS = Object.values(Decision);
export const REJECT_REASON_OPTIONS = Object.values(RejectReason);

export const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.TO_IMPORT]: 'bg-gray-100 text-gray-700',
  [LeadStatus.TO_FILTER]: 'bg-blue-100 text-blue-700',
  [LeadStatus.CONTACTED]: 'bg-cyan-100 text-cyan-700',
  [LeadStatus.QUOTING]: 'bg-indigo-100 text-indigo-700',
  [LeadStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-700',
  [LeadStatus.WON]: 'bg-emerald-100 text-emerald-700',
  [LeadStatus.CLOSED]: 'bg-slate-100 text-slate-700',
  [LeadStatus.REJECTED]: 'bg-red-100 text-red-700',
};

export const DECISION_COLORS: Record<Decision, string> = {
  [Decision.ACCEPT]: 'bg-green-100 text-green-700',
  [Decision.REJECT]: 'bg-red-100 text-red-700',
  [Decision.PENDING]: 'bg-amber-100 text-amber-700',
};
