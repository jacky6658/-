
import { auth } from '../mockBackend';
import { Lead, LeadStatus, Decision, AuditAction, ProgressUpdate, ChangeHistory } from '../types';
import { logAction } from './auditService';
import { getUserProfile } from './userService';
import { apiRequest, useApiMode, getApiUrl } from './apiConfig';

const STORAGE_KEY = 'caseflow_leads_db';

// localStorage 操作（降級方案）
const getLeads = (): Lead[] => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveLeads = (leads: Lead[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  window.dispatchEvent(new Event('leads_updated'));
};

// API 模式：從後端獲取資料
const fetchLeadsFromApi = async (): Promise<Lead[]> => {
  try {
    return await apiRequest('/api/leads');
  } catch (error) {
    console.error('從 API 獲取案件失敗，降級到 localStorage:', error);
    return getLeads(); // 降級到 localStorage
  }
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

  // 如果使用 API 模式，先調用 API
  if (useApiMode()) {
    try {
      await apiRequest('/api/leads', {
        method: 'POST',
        body: JSON.stringify(newLead),
      });
      await logAction(id, AuditAction.CREATE, null, newLead);
      return id;
    } catch (error) {
      console.error('API 創建失敗，降級到 localStorage:', error);
      // 降級到 localStorage
    }
  }

  // localStorage 模式（降級方案）
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
  
  // 如果使用 API 模式
  if (useApiMode()) {
    try {
      // 先獲取當前資料以記錄變更
      const currentLeads = await fetchLeadsFromApi();
      const before = currentLeads.find((l: Lead) => l.id === id);
      if (!before) return;

      const after = {
        ...before,
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
        ].slice(-50);
      }

      // 更新到 API
      await apiRequest(`/api/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(after),
      });
      
      await logAction(id, actionType, before, after);
      return;
    } catch (error) {
      console.error('API 更新失敗，降級到 localStorage:', error);
      // 降級到 localStorage
    }
  }

  // localStorage 模式（降級方案）
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
    ].slice(-50);
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
  
  const progressUpdate: ProgressUpdate = {
    id: 'progress_' + Math.random().toString(36).substr(2, 9),
    lead_id: leadId,
    content,
    author_uid: user.uid,
    author_name: authorName,
    created_at: new Date().toISOString()
  };

  // 如果使用 API 模式
  if (useApiMode()) {
    try {
      // 獲取當前案件
      const currentLeads = await fetchLeadsFromApi();
      const lead = currentLeads.find((l: Lead) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      // 更新進度
      const updatedProgress = [
        progressUpdate,
        ...(lead.progress_updates || [])
      ].slice(0, 20);

      // 更新到 API
      await apiRequest(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          progress_updates: updatedProgress
        }),
      });

      await logAction(leadId, AuditAction.UPDATE, lead, { ...lead, progress_updates: updatedProgress });
      return progressUpdate;
    } catch (error) {
      console.error('API 添加進度失敗，降級到 localStorage:', error);
      // 降級到 localStorage
    }
  }

  // localStorage 模式（降級方案）
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) throw new Error('Lead not found');

  leads[index].progress_updates = [
    progressUpdate,
    ...(leads[index].progress_updates || [])
  ].slice(0, 20);

  saveLeads(leads);
  await logAction(leadId, AuditAction.UPDATE, leads[index], leads[index]);
  return progressUpdate;
};

export const deleteLead = async (id: string) => {
  // 如果使用 API 模式
  if (useApiMode()) {
    try {
      await apiRequest(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      return;
    } catch (error) {
      console.error('API 刪除失敗，降級到 localStorage:', error);
      // 降級到 localStorage
    }
  }

  // localStorage 模式（降級方案）
  const leads = getLeads().filter(l => l.id !== id);
  saveLeads(leads);
};

export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  // 如果使用 API 模式，定期輪詢
  if (useApiMode()) {
    const fetchData = async () => {
      try {
        const leads = await fetchLeadsFromApi();
        callback(leads);
      } catch (error) {
        console.error('獲取資料失敗:', error);
        callback(getLeads()); // 降級到 localStorage
      }
    };

    // 立即獲取一次
    fetchData();
    
    // 每 5 秒輪詢一次
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }

  // localStorage 模式
  const handler = () => callback(getLeads());
  window.addEventListener('leads_updated', handler);
  handler();
  return () => window.removeEventListener('leads_updated', handler);
};
