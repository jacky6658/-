
import { auth } from '../firebase';
import { AuditLog, AuditAction } from '../types';
import { getUserProfile } from './userService';

const STORAGE_KEY = 'caseflow_audit_db';

const getLogs = (): AuditLog[] => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveLogs = (logs: AuditLog[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

export const logAction = async (
  lead_id: string, 
  action: AuditAction, 
  before?: any, 
  after?: any
) => {
  const user = auth.currentUser;
  if (!user) return;

  const profile = await getUserProfile(user.uid);
  const actor_name = profile?.displayName || 'Unknown';

  const newLog: AuditLog = {
    id: 'log_' + Math.random().toString(36).substr(2, 9),
    lead_id,
    actor_uid: user.uid,
    actor_name,
    action,
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null,
    created_at: new Date().toISOString()
  };

  const logs = getLogs();
  logs.unshift(newLog);
  saveLogs(logs.slice(0, 500)); // 只保留最後 500 筆
};

export const fetchLogs = async (leadId?: string) => {
  const logs = getLogs();
  if (leadId) return logs.filter(l => l.lead_id === leadId);
  return logs;
};
