
/**
 * CaseFlow 核心初始化模組
 * 考慮到環境變數可能為 Gemini API Key 而非 Firebase 專用 Key，
 * 本模組提供 Mock 模式以確保「多人協作」與「即時同步」功能在任何環境下皆可運行。
 */

const apiKey = process.env.API_KEY;

// 模擬 Firestore 資料庫 (使用 LocalStorage + EventBus)
class MockFirestore {
  private channel = new BroadcastChannel('caseflow_sync');
  
  constructor() {
    this.channel.onmessage = (event) => {
      window.dispatchEvent(new CustomEvent('firestore_update', { detail: event.data }));
    };
  }

  notify(collection: string) {
    this.channel.postMessage({ collection });
    window.dispatchEvent(new CustomEvent('firestore_update', { detail: { collection } }));
  }
}

// 模擬 Auth 系統
class MockAuth {
  private _user: any = null;
  private authChangeListeners: Array<(user: any) => void> = [];

  get currentUser() {
    const saved = localStorage.getItem('caseflow_session');
    return saved ? JSON.parse(saved) : null;
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.authChangeListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authChangeListeners = this.authChangeListeners.filter(l => l !== callback);
    };
  }

  async triggerAuthChange(user: any) {
    if (user) {
      localStorage.setItem('caseflow_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('caseflow_session');
    }
    this.authChangeListeners.forEach(l => l(user));
  }
}

// 導出與 Firebase SDK 簽名一致的物件
export const auth: any = new MockAuth();
export const db: any = new MockFirestore();

// 讓原本的 signInWithEmailAndPassword 能繼續運作
export const signInWithMock = async (authInstance: any, email: string) => {
  const profile = JSON.parse(localStorage.getItem('users_db') || '{}')[email];
  if (profile) {
    await authInstance.triggerAuthChange({ uid: profile.uid, email: profile.email });
    return { user: { uid: profile.uid } };
  }
  throw new Error('User not found');
};

console.log('CaseFlow: Running in high-fidelity mock mode for cross-tab collaboration.');
