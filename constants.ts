import { Platform, ContactStatus, LeadStatus, Decision, RejectReason } from './types';

export const PLATFORM_OPTIONS = Object.values(Platform);

export const CONTACT_STATUS_OPTIONS = Object.values(ContactStatus);

export const STATUS_OPTIONS = Object.values(LeadStatus);

export const REJECT_REASON_OPTIONS = Object.values(RejectReason);

export const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.TO_IMPORT]: 'text-slate-500 bg-slate-50',
  [LeadStatus.TO_FILTER]: 'text-amber-600 bg-amber-50',
  [LeadStatus.CONTACTED]: 'text-blue-600 bg-blue-50',
  [LeadStatus.QUOTING]: 'text-purple-600 bg-purple-50',
  [LeadStatus.IN_PROGRESS]: 'text-indigo-600 bg-indigo-50',
  [LeadStatus.WON]: 'text-emerald-600 bg-emerald-50',
  [LeadStatus.CLOSED]: 'text-gray-600 bg-gray-50',
  [LeadStatus.CANCELLED]: 'text-red-600 bg-red-50',
  [LeadStatus.DECLINED]: 'text-orange-600 bg-orange-50'
};

export const DECISION_COLORS: Record<Decision, string> = {
  [Decision.ACCEPT]: 'text-emerald-600 bg-emerald-50',
  [Decision.REJECT]: 'text-red-600 bg-red-50',
  [Decision.PENDING]: 'text-amber-600 bg-amber-50'
};

// 預設成本名目
export const DEFAULT_COST_ITEMS = [
  'gemini AI 使用費用',
  'cursor 開發軟體費用',
  'zeabur 雲端部署費用',
  '預估人力費用',
  'Pro360 索取個資成本'
];

// Pro360 成本名目
export const PRO360_COST_ITEM = 'Pro360 接案費用';
export const PRO360_CONTACT_COST_ITEM = 'Pro360 索取個資成本';
