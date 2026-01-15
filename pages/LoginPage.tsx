
import React, { useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { createUserProfile } from '../services/userService';
import { Role } from '../types';
import { Fingerprint, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSimpleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = identifier.trim();
    if (!name) return;

    setLoading(true);
    setError('');

    try {
      // 1. 使用 Firebase 匿名登入獲取合法 Session
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      
      // 2. 決定角色邏輯 (目前仍沿用您的名稱含 admin 規則，方便測試)
      const role = name.toLowerCase().includes('admin') ? Role.ADMIN : Role.REVIEWER;
      const virtualEmail = `${name}@caseflow.internal`;

      // 3. 在 Firestore 建立 Profile
      await createUserProfile(uid, virtualEmail, role, name);
      
      // 成功後，App.tsx 的 onAuthStateChanged 會自動感知並跳轉
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      setError('連線至雲端後端失敗，請檢查網路。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 text-white font-black text-2xl mb-4">
            C
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CaseFlow Cloud</h1>
          <p className="text-slate-500 mt-2">正式版 · 團隊即時協作系統</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-10">
          <div className="flex items-center gap-3 mb-8 text-indigo-600">
            <Fingerprint size={28} />
            <h2 className="text-2xl font-black text-slate-800">身分識別</h2>
          </div>

          <form onSubmit={handleSimpleAuth} className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                您的名稱或員工 ID
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="請輸入您的稱呼"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-0 rounded-2xl transition-all text-lg font-bold text-slate-800"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                  💡 注意：名稱含 "admin" 將具備管理員權限。這是在雲端運行的正式版本，所有操作都將被紀錄。
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !identifier.trim()}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-2xl shadow-slate-300 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" /> : '進入系統'}
              {!loading && <ArrowRight size={22} />}
            </button>
          </form>
        </div>
        
        <div className="mt-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          CaseFlow Production v2.5.1
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
