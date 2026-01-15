/**
 * CaseFlow 核心初始化模組
 * 提供高保真 Mock 模式，支援多人協作與跨分頁同步。
 */

// 確保瀏覽器環境下 process 變數就緒
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

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

class MockAuth {
  private authChangeListeners: Array<(user: any) => void> = [];

  get currentUser() {
    try {
      const saved = localStorage.getItem('caseflow_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
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

export const auth = new MockAuth();
export const db = new MockFirestore();

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
  return authInstance.onAuthStateChanged(callback);
};

export const signOut = async (authInstance: any) => {
  await authInstance.triggerAuthChange(null);
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string) => {
  const uid = btoa(encodeURIComponent(email)).replace(/=/g, '');
  return { user: { email, uid } };
};

export type User = any;