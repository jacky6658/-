
import { auth } from '../mockBackend';
import { Lead, LeadStatus, Decision, AuditAction, ProgressUpdate, ChangeHistory, CostRecord, ProfitRecord, Platform } from '../types';
import { logAction } from './auditService';
import { getUserProfile } from './userService';
import { apiRequest, useApiMode, getApiUrl } from './apiConfig';
import { PRO360_COST_ITEM } from '../constants';

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
    const leads = await apiRequest('/api/leads');
    return leads || [];
  } catch (error) {
    console.error('❌ 從 API 獲取案件失敗，降級到 localStorage:', error);
    return getLeads(); // 降級到 localStorage
  }
};

// 生成案件編號（從 aijob-001 開始）
const generateCaseCode = async (): Promise<string> => {
  let allLeads: Lead[] = [];
  
  // 獲取所有案件
  if (useApiMode()) {
    try {
      allLeads = await fetchLeadsFromApi();
    } catch (error) {
      console.error('獲取案件列表失敗，使用 localStorage:', error);
      allLeads = getLeads();
    }
  } else {
    allLeads = getLeads();
  }
  
  // 找出所有已有的編號
  const existingCodes = allLeads
    .map(lead => lead.case_code)
    .filter(code => code && code.startsWith('aijob-'))
    .map(code => {
      const match = code.match(/aijob-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
  
  // 找出最大編號
  const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
  
  // 生成新編號（加1）
  const nextNumber = maxNumber + 1;
  return `aijob-${String(nextNumber).padStart(3, '0')}`;
};

export const createLead = async (leadData: Partial<Lead>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');
  
  const profile = await getUserProfile(user.uid);
  const creatorName = profile?.displayName || 'Unknown';
  
  const now = new Date().toISOString();
  const id = 'lead_' + Math.random().toString(36).substr(2, 9);
  
  // 生成案件編號
  const caseCode = await generateCaseCode();
  
  const newLead: Lead = {
    ...(leadData as Lead),
    id,
    case_code: caseCode,
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
      const response = await apiRequest('/api/leads', {
        method: 'POST',
        body: JSON.stringify(newLead),
      });
      await logAction(id, AuditAction.CREATE, null, newLead);
      return id;
    } catch (error: any) {
      console.error('❌ API 創建案件失敗，降級到 localStorage:', error);
      console.error('錯誤詳情:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      // 降級到 localStorage，但顯示警告
      if (error.message && !error.message.includes('降級')) {
        console.warn('⚠️ 將使用 localStorage 模式保存案件，但資料不會同步到雲端');
      }
      // 繼續執行 localStorage 模式
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
        // 確保 cost_records 和 profit_records 存在
        cost_records: updates.cost_records !== undefined ? updates.cost_records : (before.cost_records || []),
        profit_records: updates.profit_records !== undefined ? updates.profit_records : (before.profit_records || [])
        // 注意：不包含 updated_at，讓後端統一處理
      };

      // Pro360 自動成本管理
      if (before.platform === Platform.PRO360) {
        const newStatus = updates.status !== undefined ? updates.status : before.status;
        const oldStatus = before.status;
        const costRecords = after.cost_records || [];
        const pro360CostIndex = costRecords.findIndex((c: CostRecord) => c.item_name === PRO360_COST_ITEM);

        // 如果狀態變為「已接洽」，且還沒有 Pro360 成本記錄，則添加
        if (newStatus === LeadStatus.CONTACTED && oldStatus !== LeadStatus.CONTACTED && pro360CostIndex === -1) {
          const pro360Cost: CostRecord = {
            id: 'cost_pro360_' + Math.random().toString(36).substr(2, 9),
            lead_id: id,
            item_name: PRO360_COST_ITEM,
            amount: 0, // 預設為 0，用戶可以手動修改
            author_uid: user.uid,
            author_name: actorName,
            created_at: new Date().toISOString(),
            note: '自動添加：案件已接洽，請輸入實際費用'
          };
          after.cost_records = [...costRecords, pro360Cost];
          console.log('✅ Pro360 案件已接洽，自動添加成本記錄');
        }

        // 如果狀態變為「已拒絕」，移除 Pro360 成本記錄（可能退費）
        if (newStatus === LeadStatus.REJECTED && oldStatus !== LeadStatus.REJECTED && pro360CostIndex !== -1) {
          after.cost_records = costRecords.filter((c: CostRecord, idx: number) => idx !== pro360CostIndex);
          console.log('✅ Pro360 案件已拒絕，自動移除成本記錄（可能退費）');
        }
      }

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

  // Pro360 自動成本管理
  if (before.platform === Platform.PRO360) {
    const newStatus = updates.status !== undefined ? updates.status : before.status;
    const oldStatus = before.status;
    const costRecords = after.cost_records || [];
    const pro360CostIndex = costRecords.findIndex((c: CostRecord) => c.item_name === PRO360_COST_ITEM);

    // 如果狀態變為「已接洽」，且還沒有 Pro360 成本記錄，則添加
    if (newStatus === LeadStatus.CONTACTED && oldStatus !== LeadStatus.CONTACTED && pro360CostIndex === -1) {
      const pro360Cost: CostRecord = {
        id: 'cost_pro360_' + Math.random().toString(36).substr(2, 9),
        lead_id: id,
        item_name: PRO360_COST_ITEM,
        amount: 0, // 預設為 0，用戶可以手動修改
        author_uid: user.uid,
        author_name: actorName,
        created_at: new Date().toISOString(),
        note: '自動添加：案件已接洽，請輸入實際費用'
      };
      after.cost_records = [...costRecords, pro360Cost];
      console.log('✅ Pro360 案件已接洽，自動添加成本記錄');
    }

    // 如果狀態變為「已拒絕」，移除 Pro360 成本記錄（可能退費）
    if (newStatus === LeadStatus.REJECTED && oldStatus !== LeadStatus.REJECTED && pro360CostIndex !== -1) {
      after.cost_records = costRecords.filter((c: CostRecord, idx: number) => idx !== pro360CostIndex);
      console.log('✅ Pro360 案件已拒絕，自動移除成本記錄（可能退費）');
    }
  }

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
export const addProgressUpdate = async (leadId: string, content: string, attachments?: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');

  const profile = await getUserProfile(user.uid);
  const authorName = profile?.displayName || 'Unknown';
  
  const progressUpdate: ProgressUpdate = {
    id: 'progress_' + Math.random().toString(36).substr(2, 9),
    lead_id: leadId,
    content: content || '',
    author_uid: user.uid,
    author_name: authorName,
    created_at: new Date().toISOString(),
    attachments: attachments && attachments.length > 0 ? attachments : undefined
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
        console.error('❌ 獲取資料失敗:', error);
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
  const handler = () => {
    const leads = getLeads();
    callback(leads);
  };
  window.addEventListener('leads_updated', handler);
  handler();
  return () => window.removeEventListener('leads_updated', handler);
};

// 添加成本記錄
export const addCostRecord = async (leadId: string, record: Omit<CostRecord, 'id' | 'lead_id' | 'created_at'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');
  const profile = await getUserProfile(user.uid);
  const authorName = profile?.displayName || 'Unknown';

  const newRecord: CostRecord = {
    ...record,
    id: 'cost_' + Math.random().toString(36).substr(2, 9),
    lead_id: leadId,
    author_uid: user.uid,
    author_name: authorName,
    created_at: new Date().toISOString(),
  };

  if (useApiMode()) {
    try {
      const currentLeads = await fetchLeadsFromApi();
      const lead = currentLeads.find((l: Lead) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      const updatedCosts = [...(lead.cost_records || []), newRecord];
      await apiRequest(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({ cost_records: updatedCosts }),
      });
      await logAction(leadId, AuditAction.UPDATE, lead, { ...lead, cost_records: updatedCosts });
      return newRecord;
    } catch (error) {
      console.error('API 添加成本記錄失敗:', error);
    }
  }

  const leads = getLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) throw new Error('Lead not found');
  leads[index].cost_records = [...(leads[index].cost_records || []), newRecord];
  saveLeads(leads);
  await logAction(leadId, AuditAction.UPDATE, leads[index], leads[index]);
  return newRecord;
};

// 刪除成本記錄
export const deleteCostRecord = async (leadId: string, costId: string) => {
  if (useApiMode()) {
    try {
      const currentLeads = await fetchLeadsFromApi();
      const lead = currentLeads.find((l: Lead) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      const updatedCosts = (lead.cost_records || []).filter(c => c.id !== costId);
      await apiRequest(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({ cost_records: updatedCosts }),
      });
      await logAction(leadId, AuditAction.UPDATE, lead, { ...lead, cost_records: updatedCosts });
      return;
    } catch (error) {
      console.error('API 刪除成本記錄失敗:', error);
    }
  }

  const leads = getLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) throw new Error('Lead not found');
  leads[index].cost_records = (leads[index].cost_records || []).filter(c => c.id !== costId);
  saveLeads(leads);
  await logAction(leadId, AuditAction.UPDATE, leads[index], leads[index]);
};

// 添加利潤記錄
export const addProfitRecord = async (leadId: string, record: Omit<ProfitRecord, 'id' | 'lead_id' | 'created_at'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');
  const profile = await getUserProfile(user.uid);
  const authorName = profile?.displayName || 'Unknown';

  const newRecord: ProfitRecord = {
    ...record,
    id: 'profit_' + Math.random().toString(36).substr(2, 9),
    lead_id: leadId,
    author_uid: user.uid,
    author_name: authorName,
    created_at: new Date().toISOString(),
  };

  if (useApiMode()) {
    try {
      const currentLeads = await fetchLeadsFromApi();
      const lead = currentLeads.find((l: Lead) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      const updatedProfits = [...(lead.profit_records || []), newRecord];
      await apiRequest(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({ profit_records: updatedProfits }),
      });
      await logAction(leadId, AuditAction.UPDATE, lead, { ...lead, profit_records: updatedProfits });
      return newRecord;
    } catch (error) {
      console.error('API 添加利潤記錄失敗:', error);
    }
  }

  const leads = getLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) throw new Error('Lead not found');
  leads[index].profit_records = [...(leads[index].profit_records || []), newRecord];
  saveLeads(leads);
  await logAction(leadId, AuditAction.UPDATE, leads[index], leads[index]);
  return newRecord;
};

// 刪除利潤記錄
export const deleteProfitRecord = async (leadId: string, profitId: string) => {
  if (useApiMode()) {
    try {
      const currentLeads = await fetchLeadsFromApi();
      const lead = currentLeads.find((l: Lead) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');
      const updatedProfits = (lead.profit_records || []).filter(p => p.id !== profitId);
      await apiRequest(`/api/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({ profit_records: updatedProfits }),
      });
      await logAction(leadId, AuditAction.UPDATE, lead, { ...lead, profit_records: updatedProfits });
      return;
    } catch (error) {
      console.error('API 刪除利潤記錄失敗:', error);
    }
  }

  const leads = getLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) throw new Error('Lead not found');
  leads[index].profit_records = (leads[index].profit_records || []).filter(p => p.id !== profitId);
  saveLeads(leads);
  await logAction(leadId, AuditAction.UPDATE, leads[index], leads[index]);
};
