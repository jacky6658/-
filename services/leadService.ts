
import { auth } from '../mockBackend';
import { Lead, LeadStatus, Decision, AuditAction, ProgressUpdate, ChangeHistory } from '../types';
import { logAction } from './auditService';
import { getUserProfile } from './userService';

const STORAGE_KEY = 'caseflow_leads_db';

const getLeads = (): Lead[] => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveLeads = (leads: Lead[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  window.dispatchEvent(new Event('leads_updated'));
};

export const createLead = async (leadData: Partial<Lead>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');
  
  const profile = await getUserProfile(user.uid);
  const creatorName = profile?.displayName || 'Unknown';
  
  const now = new Date().toISOString();
  const id = 'lead_' + Math.random().toString(36).substr(2, 9);
  
  const newLead: Lead = {
    ...(leadData as Lead),
    id,
    status: leadData.status || LeadStatus.TO_FILTER,
    decision: leadData.decision || Decision.PENDING,
    priority: leadData.priority || 3,
    created_by: user.uid,
    created_by_name: creatorName,
    created_at: now,
    updated_at: now,
    progress_updates: [],
    change_history: [],
  };

  const leads = getLeads();
  leads.unshift(newLead);
  saveLeads(leads);
  
  await logAction(id, AuditAction.CREATE, null, newLead);
  return id;
};

// 記錄欄位變更
const recordFieldChanges = (before: Lead, after: Lead, authorUid: string, authorName: string): ChangeHistory[] => {
  const changes: ChangeHistory[] = [];
  const fieldsToTrack = ['platform', 'platform_id', 'need', 'budget_text', 'phone', 'email', 'location', 'status', 'contact_status', 'internal_remarks', 'note'];
  
  fieldsToTrack.forEach(field => {
    const oldValue = (before as any)[field];
    const newValue = (after as any)[field];
    if (oldValue !== newValue) {
      changes.push({
        id: 'change_' + Math.random().toString(36).substr(2, 9),
        lead_id: after.id,
        field,
        old_value: oldValue,
        new_value: newValue,
        author_uid: authorUid,
        author_name: authorName,
        created_at: new Date().toISOString()
      });
    }
  });
  
  return changes;
};

export const updateLead = async (id: string, updates: Partial<Lead>, actionType: AuditAction = AuditAction.UPDATE) => {
  const user = auth.currentUser;
  if (!user) return;

  const profile = await getUserProfile(user.uid);
  const actorName = profile?.displayName || 'Unknown';
  
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return;

  const before = { ...leads[index] };
  const after = {
    ...leads[index],
    ...updates,
    last_action_by: actorName,
    updated_at: new Date().toISOString()
  };

  // 記錄欄位變更
  const fieldChanges = recordFieldChanges(before, after, user.uid, actorName);
  if (fieldChanges.length > 0) {
    after.change_history = [
      ...(after.change_history || []),
      ...fieldChanges
    ].slice(-50); // 只保留最近50條記錄
  }

  leads[index] = after;
  saveLeads(leads);
  await logAction(id, actionType, before, after);
};

// 添加進度更新
export const addProgressUpdate = async (leadId: string, content: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');

  const profile = await getUserProfile(user.uid);
  const authorName = profile?.displayName || 'Unknown';
  
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) throw new Error('Lead not found');

  const progressUpdate: ProgressUpdate = {
    id: 'progress_' + Math.random().toString(36).substr(2, 9),
    lead_id: leadId,
    content,
    author_uid: user.uid,
    author_name: authorName,
    created_at: new Date().toISOString()
  };

  leads[index].progress_updates = [
    progressUpdate,
    ...(leads[index].progress_updates || [])
  ].slice(0, 20); // 只保留最近20條進度更新

  saveLeads(leads);
  await logAction(leadId, AuditAction.UPDATE, leads[index], leads[index]);
  return progressUpdate;
};

export const deleteLead = async (id: string) => {
  const leads = getLeads().filter(l => l.id !== id);
  saveLeads(leads);
};

export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  const handler = () => callback(getLeads());
  window.addEventListener('leads_updated', handler);
  handler();
  return () => window.removeEventListener('leads_updated', handler);
};
