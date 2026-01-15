
import { UserProfile, Role } from '../types';

const COLLECTION = 'users';

const getUsersFromStore = (): UserProfile[] => {
  return JSON.parse(localStorage.getItem(COLLECTION) || '[]');
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const users = getUsersFromStore();
  return users.find(u => u.uid === uid) || null;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  return getUsersFromStore();
};

export const createUserProfile = async (uid: string, email: string, role: Role, displayName: string) => {
  const users = getUsersFromStore();
  const existingIndex = users.findIndex(u => u.uid === uid);
  
  const profile: UserProfile = { uid, email, role, displayName };
  
  if (existingIndex > -1) {
    users[existingIndex] = profile;
  } else {
    users.push(profile);
  }
  
  localStorage.setItem(COLLECTION, JSON.stringify(users));
};

export const setUserRole = async (uid: string, role: Role) => {
  const users = getUsersFromStore();
  const index = users.findIndex(u => u.uid === uid);
  if (index > -1) {
    users[index].role = role;
    localStorage.setItem(COLLECTION, JSON.stringify(users));
  }
};
