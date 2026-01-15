
import { auth } from '../firebase';
import { Lead, LeadStatus, Decision, AuditAction } from '../types';
import { logAction } from './auditService';
import { getUserProfile } from './userService';

const STORAGE_KEY = 'caseflow_leads_db';

const getLeads = (): Lead[] => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveLeads = (leads: Lead[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  // 觸發廣播事件模擬多裝置同步（同瀏覽器分頁）
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
  };

  const leads = getLeads();
  leads.unshift(newLead);
  saveLeads(leads);
  
  await logAction(id, AuditAction.CREATE, null, newLead);
  return id;
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
  leads[index] = {
    ...leads[index],
    ...updates,
    last_action_by: actorName,
    updated_at: new Date().toISOString()
  };

  saveLeads(leads);
  await logAction(id, actionType, before, leads[index]);
};

export const deleteLead = async (id: string) => {
  const leads = getLeads().filter(l => l.id !== id);
  saveLeads(leads);
};

export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  const handler = () => callback(getLeads());
  window.addEventListener('leads_updated', handler);
  handler(); // 初始載入
  return () => window.removeEventListener('leads_updated', handler);
};
