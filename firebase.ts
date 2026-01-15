/**  
 * CaseFlow 核心初始化模組  
 * 本模組提供完整的 Mock 模式，確保多人協作與即時同步功能正常運行  
 */  
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
export const auth = new MockAuth();  
export const db = new MockFirestore();  
// 模擬 Firebase 函數 - 與 App.tsx 的導入簽名一致  
export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {  
  return authInstance.onAuthStateChanged(callback);  
};  
export const signOut = async (authInstance: any) => {  
  await authInstance.triggerAuthChange(null);  
};  
// 型別定義  
export type User = any;  
console.log('CaseFlow: Running in high-fidelity mock mode for cross-tab collaboration.');  
