
import { auth, db } from '../firebase';
import { Lead, LeadStatus, Decision, AuditAction, Platform, ContactStatus } from '../types';
import { logAction } from './auditService';

const COLLECTION = 'leads';

const SEED_LEADS: Partial<Lead>[] = [
  {
    platform: Platform.PRO360,
    platform_id: 'Erixxx',
    contact_status: ContactStatus.UNRESPONDED,
    need: '電腦應用程式：微軟 (Windows)，其他：EXCEL。需求：EXCEL 要設定一維碼可以自動生成二維碼的檔案。目前只有想法。',
    budget_text: '一萬以下',
    posted_at: '2026-01-15T00:00:00Z',
    status: LeadStatus.TO_FILTER,
    priority: 4,
    location: '嘉義縣 水上鄉',
    phone: '0988617369',
    email: 'eric2396655@gmail.com'
  },
  {
    platform: Platform.PRO360,
    platform_id: '陳偉新',
    contact_status: ContactStatus.UNRESPONDED,
    need: '學校單位：消費者體驗優化、其他：虛擬眼鏡配戴。說明：學校單位須有行政流程，需先送估價單，後採購。',
    budget_text: '不詳',
    posted_at: '2026-01-14T00:00:00Z',
    status: LeadStatus.TO_FILTER,
    priority: 5,
    location: '桃園市 龍潭區',
    phone: '0919345731'
  },
  {
    platform: Platform.FB,
    platform_id: '王緯',
    contact_status: ContactStatus.UNRESPONDED,
    need: '美業平台串接 Line。需要註冊會員跟身分驗證。多位師傅可選。師傅可以選有空的時間。可統整每個師傅營業額與店家總業績、淨利。需串接信用卡 Linepay 付款。',
    budget_text: '不詳',
    posted_at: '2026-01-08T00:00:00Z',
    status: LeadStatus.TO_FILTER,
    priority: 5,
    location: '網路',
  },
  {
    platform: Platform.THREADS,
    platform_id: 'ariel_705',
    contact_status: ContactStatus.UNRESPONDED,
    need: '神通廣大的脆，有沒有會寫程式的工程師或是認識寫程式的工程師可推薦？朋友需要從客製化程式的後台導出數據！',
    budget_text: '不詳',
    posted_at: '2025-06-05T00:00:00Z',
    status: LeadStatus.TO_FILTER,
    priority: 3,
  },
  {
    platform: Platform.PRO360,
    platform_id: '鄭○生',
    contact_status: ContactStatus.UNRESPONDED,
    need: '軟體開發：秤重程式。現有設備：電腦 win11、電子秤(RS232或藍芽)、監視鏡頭。需求：1.重量資訊紀錄於excel內 2.秤重完成拍照並產生對應序號 3.扣除棧板重量 4.產出單據。',
    budget_text: '五萬到十萬',
    posted_at: '2026-01-10T00:00:00Z',
    status: LeadStatus.TO_FILTER,
    priority: 5,
    location: '雲林縣 二崙鄉',
    phone: '0981XXXXXX',
    email: 'imhxxx@xxxil.com'
  }
];

const getLeadsFromStore = (): Lead[] => {
  const data = localStorage.getItem(COLLECTION);
  if (!data) {
    const initialLeads = SEED_LEADS.map(l => ({
      ...l,
      id: Math.random().toString(36).substr(2, 9),
      decision: Decision.PENDING,
      created_by: 'system',
      created_by_name: '系統上架',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })) as Lead[];
    localStorage.setItem(COLLECTION, JSON.stringify(initialLeads));
    return initialLeads;
  }
  return JSON.parse(data);
};

const saveLeadsToStore = (leads: Lead[]) => {
  localStorage.setItem(COLLECTION, JSON.stringify(leads));
  db.notify(COLLECTION);
};

export const createLead = async (leadData: Partial<Lead>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const profile = users.find((u: any) => u.uid === user.uid);
  const creatorName = profile?.displayName || user.email?.split('@')[0] || 'Unknown';
  const now = new Date().toISOString();
  const newLead: Lead = {
    ...leadData,
    id: Math.random().toString(36).substr(2, 9),
    status: leadData.status || LeadStatus.TO_FILTER,
    decision: leadData.decision || Decision.PENDING,
    priority: leadData.priority || 3,
    created_by: user.uid,
    created_by_name: creatorName,
    created_at: now,
    updated_at: now,
  } as Lead;
  const leads = getLeadsFromStore();
  leads.unshift(newLead);
  saveLeadsToStore(leads);
  await logAction(newLead.id, AuditAction.CREATE, null, newLead);
  return newLead.id;
};

export const updateLead = async (id: string, updates: Partial<Lead>, actionType: AuditAction = AuditAction.UPDATE) => {
  const user = auth.currentUser;
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const profile = users.find((u: any) => u.uid === user?.uid);
  const actorName = profile?.displayName || 'Unknown';
  const leads = getLeadsFromStore();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return;
  const before = { ...leads[index] };
  leads[index] = {
    ...leads[index],
    ...updates,
    last_action_by: actorName,
    updated_at: new Date().toISOString()
  };
  saveLeadsToStore(leads);
  await logAction(id, actionType, before, leads[index]);
};

export const deleteLead = async (id: string) => {
  const leads = getLeadsFromStore();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return;
  const before = leads[index];
  const newLeads = leads.filter(l => l.id !== id);
  saveLeadsToStore(newLeads);
  await logAction(id, AuditAction.UPDATE, before, { DELETED: true });
};

export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  const handler = (e: any) => {
    if (e.detail.collection === COLLECTION) {
      callback(getLeadsFromStore());
    }
  };
  window.addEventListener('firestore_update', handler);
  callback(getLeadsFromStore());
  return () => window.removeEventListener('firestore_update', handler);
};
