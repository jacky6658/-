
import { auth, db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Lead, LeadStatus, Decision, AuditAction } from '../types';
import { logAction } from './auditService';
import { getUserProfile } from './userService';

const COLLECTION = 'leads';

export const createLead = async (leadData: Partial<Lead>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthorized');
  
  const profile = await getUserProfile(user.uid);
  const creatorName = profile?.displayName || user.email?.split('@')[0] || 'Unknown';
  
  const now = new Date().toISOString();
  
  const newLeadData = {
    ...leadData,
    status: leadData.status || LeadStatus.TO_FILTER,
    decision: leadData.decision || Decision.PENDING,
    priority: leadData.priority || 3,
    created_by: user.uid,
    created_by_name: creatorName,
    created_at: now,
    updated_at: now,
    server_timestamp: serverTimestamp() // 用於精確排序
  };

  const docRef = await addDoc(collection(db, COLLECTION), newLeadData);
  await logAction(docRef.id, AuditAction.CREATE, null, newLeadData);
  return docRef.id;
};

export const updateLead = async (id: string, updates: Partial<Lead>, actionType: AuditAction = AuditAction.UPDATE) => {
  const user = auth.currentUser;
  if (!user) return;

  const profile = await getUserProfile(user.uid);
  const actorName = profile?.displayName || 'Unknown';
  
  const leadRef = doc(db, COLLECTION, id);
  const now = new Date().toISOString();
  
  const updatePayload = {
    ...updates,
    last_action_by: actorName,
    updated_at: now
  };

  await updateDoc(leadRef, updatePayload);
  await logAction(id, actionType, null, updatePayload);
};

export const deleteLead = async (id: string) => {
  const leadRef = doc(db, COLLECTION, id);
  await deleteDoc(leadRef);
};

export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  const q = query(collection(db, COLLECTION), orderBy('updated_at', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      leads.push({ id: doc.id, ...doc.data() } as Lead);
    });
    callback(leads);
  });
};
