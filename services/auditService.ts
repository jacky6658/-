
import { auth, db } from '../firebase';
import { AuditLog, AuditAction, UserProfile } from '../types';

const COLLECTION = 'audit_logs';

export const logAction = async (
  lead_id: string, 
  action: AuditAction, 
  before?: any, 
  after?: any
) => {
  const user = auth.currentUser;
  if (!user) return;

  const users: UserProfile[] = JSON.parse(localStorage.getItem('users') || '[]');
  const profile = users.find(u => u.uid === user.uid);
  const actor_name = profile?.displayName || user.email?.split('@')[0] || 'Unknown';

  const newLog: AuditLog = {
    id: Math.random().toString(36).substr(2, 9),
    lead_id,
    actor_uid: user.uid,
    actor_name,
    action,
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null,
    created_at: new Date().toISOString()
  };

  const logs = JSON.parse(localStorage.getItem(COLLECTION) || '[]');
  logs.unshift(newLog);
  localStorage.setItem(COLLECTION, JSON.stringify(logs.slice(0, 200))); // Keep last 200
  db.notify(COLLECTION);
};

export const fetchLogs = async (leadId?: string, actorUid?: string) => {
  let logs: AuditLog[] = JSON.parse(localStorage.getItem(COLLECTION) || '[]');
  
  if (leadId) logs = logs.filter(l => l.lead_id === leadId);
  if (actorUid) logs = logs.filter(l => l.actor_uid === actorUid);

  return logs;
};
