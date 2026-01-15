
export enum Role {
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER'
}

export enum ContactStatus {
  UNRESPONDED = '未回覆',
  RESPONDED = '已回覆',
  LINE_ADDED = '已加賴',
  CALLED = '已通話'
}

export enum Platform {
  FB = 'FB',
  THREADS = 'Threads',
  PRO360 = 'PRO360',
  OTHER = '其他'
}

export enum LeadStatus {
  TO_IMPORT = '待匯入',
  TO_FILTER = '待篩選',
  CONTACTED = '已接洽',
  QUOTING = '報價中',
  IN_PROGRESS = '製作中',
  WON = '已成交',
  CLOSED = '結案',
  REJECTED = '拒絕'
}

export enum Decision {
  ACCEPT = 'accept',
  REJECT = 'reject',
  PENDING = 'pending'
}

export enum RejectReason {
  LOW_BUDGET = '預算太低',
  TECH_MISMATCH = '不符合技術',
  TIGHT_SCHEDULE = '時程太趕',
  HIGH_RISK = '風險高',
  OTHER = '其他'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  displayName: string;
}

export interface Lead {
  id: string;
  contact_status: ContactStatus;
  platform: Platform;
  platform_id: string;
  need: string;
  budget_text: string;
  posted_at: string; // ISO String
  note: string;
  links: string[];
  
  internal_remarks?: string;
  remarks_author?: string;
  
  phone?: string;
  email?: string;
  location?: string;
  
  status: LeadStatus;
  decision: Decision;
  decision_by?: string; // 新增：審核人姓名
  reject_reason?: RejectReason;
  review_note?: string;
  assigned_to?: string; 
  assigned_to_name?: string;
  priority: number; 
  
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  last_action_by?: string; 
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DECISION = 'DECISION',
  MOVE_STATUS = 'MOVE_STATUS'
}

export interface AuditLog {
  id: string;
  lead_id: string;
  actor_uid: string;
  actor_name: string;
  action: AuditAction;
  before?: any;
  after?: any;
  created_at: string;
}
