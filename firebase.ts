
/**
 * CaseFlow Mock Backend Bridge
 * 為了確保 demo 環境能立即執行，此模組模擬了 Firebase 的 Auth 與 Firestore 介面。
 * 未來對接實體後端時，只需在此重新啟用真正的 Firebase SDK 或切換為 API Client。
 */

const MOCK_DELAY = 100;

// 定義 User 介面以修復 App.tsx 等處的導入錯誤
export interface User {
  uid: string;
  isAnonymous: boolean;
}

// 模擬 Auth 狀態
let currentUser: User | null = JSON.parse(localStorage.getItem('caseflow_user') || 'null');
const authListeners: ((user: User | null) => void)[] = [];

export const auth = {
  get currentUser() { return currentUser; }
};

// 修復：為回呼函數提供正確的類型定義
export const onAuthStateChanged = (authObj: any, callback: (user: User | null) => void) => {
  authListeners.push(callback);
  callback(currentUser);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx > -1) authListeners.splice(idx, 1);
  };
};

// 修復：確保回傳值符合模擬的 User 介面
export const signInAnonymously = async (authObj: any) => {
  // 模擬登入延遲
  await new Promise(r => setTimeout(r, MOCK_DELAY));
  const mockUser: User = { uid: 'mock-user-' + Date.now(), isAnonymous: true };
  currentUser = mockUser;
  localStorage.setItem('caseflow_user', JSON.stringify(mockUser));
  authListeners.forEach(cb => cb(mockUser));
  return { user: mockUser };
};

export const signOut = async (authObj: any) => {
  currentUser = null;
  localStorage.removeItem('caseflow_user');
  localStorage.removeItem('caseflow_profile');
  authListeners.forEach(cb => cb(null));
};

// 模擬 Firestore
export const db = {};

console.log('CaseFlow: Running in Local/Mock Mode (No external dependencies required).');
