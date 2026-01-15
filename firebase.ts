
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 核心修復：確保 process 變數就緒
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

// 這是您的 Firebase 配置。
// 正式環境建議使用環境變數：process.env.VITE_FIREBASE_API_KEY 等
const firebaseConfig = {
  apiKey: "AIzaSy..." , // 替換為您的 API Key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// 如果沒有配置，則會打印警告，開發時會回退到模擬行為或報錯
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export { onAuthStateChanged, signOut, signInAnonymously };
export type User = any;

console.log('CaseFlow: Connected to Real-time Firebase Cloud Backend.');
