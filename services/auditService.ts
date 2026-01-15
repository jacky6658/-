
import { auth, db } from '../firebase';
import { AuditLog, AuditAction } from '../types';
import { collection, addDoc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { getUserProfile } from './userService';

const COLLECTION = 'audit_logs';

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

  const newLog = {
    lead_id,
    actor_uid: user.uid,
    actor_name,
    action,
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null,
    created_at: new Date().toISOString()
  };

  await addDoc(collection(db, COLLECTION), newLog);
};

export const fetchLogs = async (leadId?: string) => {
  let q = query(collection(db, COLLECTION), orderBy('created_at', 'desc'), limit(100));
  
  if (leadId) {
    q = query(collection(db, COLLECTION), where('lead_id', '==', leadId), orderBy('created_at', 'desc'));
  }

  const querySnapshot = await getDocs(q);
  const logs: AuditLog[] = [];
  querySnapshot.forEach((doc) => {
    logs.push({ id: doc.id, ...doc.data() } as AuditLog);
  });
  return logs;
};
