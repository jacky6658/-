
import { UserProfile, Role } from '../types';

const STORAGE_KEY = 'caseflow_users_db';
const PROFILE_KEY = 'caseflow_profile';

const getDb = (): Record<string, UserProfile> => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const saveDb = (db: Record<string, UserProfile>) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const db = getDb();
  return db[uid] || JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const db = getDb();
  return Object.values(db);
};

export const createUserProfile = async (uid: string, email: string, role: Role, displayName: string) => {
  const profile: UserProfile = { uid, email, role, displayName };
  const db = getDb();
  db[uid] = profile;
  saveDb(db);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const setUserRole = async (uid: string, role: Role) => {
  const db = getDb();
  if (db[uid]) {
    db[uid].role = role;
    saveDb(db);
  }
};
