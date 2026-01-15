
import { db } from '../firebase';
import { UserProfile, Role } from '../types';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const COLLECTION = 'users';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  const users: UserProfile[] = [];
  querySnapshot.forEach((doc) => {
    users.push(doc.data() as UserProfile);
  });
  return users;
};

export const createUserProfile = async (uid: string, email: string, role: Role, displayName: string) => {
  const profile: UserProfile = { uid, email, role, displayName };
  await setDoc(doc(db, COLLECTION, uid), profile, { merge: true });
};

export const setUserRole = async (uid: string, role: Role) => {
  await setDoc(doc(db, COLLECTION, uid), { role }, { merge: true });
};
