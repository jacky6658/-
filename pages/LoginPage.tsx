
import React, { useState } from 'react';
// Fix: Import auth from firebase and createUserProfile from the appropriate user service to resolve compilation error
import { auth } from '../firebase';
import { createUserProfile } from '../services/userService';
import { Role } from '../types';
import { Shield, User, ArrowRight, Fingerprint, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSimpleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalName = identifier.trim();
    if (!originalName) return;

    setLoading(true);
    setError('');

    try {
      // 模擬環境：我們直接使用名稱建立/獲取 Profile
      const uid = btoa(encodeURIComponent(originalName)).replace(/=/g, '');
      const virtualEmail = `${uid}@caseflow.local`;
      
      // 建立或獲取權限角色
      const role = originalName.toLowerCase().includes('admin') ? Role.ADMIN : Role.REVIEWER;
      
      // 使用 firebase.ts 中導出的模擬 auth 觸發狀態改變
      const anyAuth = auth as any;
      
      // Fix: Use the createUserProfile service for consistency and to ensure profile creation/update
      await createUserProfile(uid, virtualEmail, role, originalName);

      // 觸發登入
      await anyAuth.triggerAuthChange({ uid, email: virtualEmail });
      
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError('系統進入失敗，請重試');
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CaseFlow</h1>
          <p className="text-slate-500 mt-2">多人協作 · 即時案件管理</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-8">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Fingerprint size={24} />
            <h2 className="text-xl font-bold text-slate-800">身分識別</h2>
          </div>

          <form onSubmit={handleSimpleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                您的名稱或員工 ID
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="請輸入您的稱呼"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-0 rounded-2xl transition-all text-lg font-medium"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 ml-1">
                * 名稱含 "admin" 者將自動獲得管理員權限
              </p>
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
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 active:scale-95"
            >
              {loading ? '身分確認中...' : '進入系統'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          CaseFlow v2.5 · 高保真協作模擬模式
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
