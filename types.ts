
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
  password?: string; // 密碼（可選，用於內部員工）
  isActive?: boolean; // 是否啟用
  createdAt?: string; // 創建時間
  avatar?: string; // 大頭照（Base64 或 URL）
  status?: string; // 個人狀態（例如：在線、忙碌、離開等）
  isOnline?: boolean; // 是否在線
  lastSeen?: string; // 最後上線時間
}

export interface Lead {
  id: string;
  case_code?: string; // 案件編號（例如：aijob-001）
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
  
  // 進度更新和歷史記錄
  progress_updates?: ProgressUpdate[]; // 近期進度更新
  change_history?: ChangeHistory[]; // 修改歷史記錄
  
  // 成本和利潤記錄
  cost_records?: CostRecord[]; // 成本記錄
  profit_records?: ProfitRecord[]; // 利潤記錄
  
  // 合約和文件
  contracts?: string[]; // 合約文件（base64 或 URL）
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

// 進度更新記錄
export interface ProgressUpdate {
  id: string;
  lead_id: string;
  content: string; // 進度內容
  author_uid: string;
  author_name: string;
  created_at: string;
  attachments?: string[]; // 附件（圖片 base64 或網址）
}

// 修改歷史記錄
export interface ChangeHistory {
  id: string;
  lead_id: string;
  field: string; // 修改的欄位名稱
  old_value?: any;
  new_value?: any;
  author_uid: string;
  author_name: string;
  created_at: string;
}

// 成本記錄
export interface CostRecord {
  id: string;
  lead_id: string;
  item_name: string; // 成本名目
  amount: number; // 金額
  author_uid: string;
  author_name: string;
  created_at: string;
  note?: string; // 備註
}

// 利潤記錄
export interface ProfitRecord {
  id: string;
  lead_id: string;
  item_name: string; // 利潤名目
  amount: number; // 金額
  author_uid: string;
  author_name: string;
  created_at: string;
  note?: string; // 備註
}
