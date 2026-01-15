import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from './firebase';
import { auth } from './firebase';
import { getUserProfile } from './services/userService';
import { UserProfile, Role, Lead } from './types';
import Sidebar from './components/Sidebar';
import LeadsPage from './pages/LeadsPage';
import ReviewPage from './pages/ReviewPage';
import KanbanPage from './pages/KanbanPage';
import AuditLogsPage from './pages/AuditLogsPage';
import MembersPage from './pages/MembersPage';
import ImportPage from './pages/ImportPage';
import LoginPage from './pages/LoginPage';
import { subscribeToLeads } from './services/leadService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    // 使用本地 Mock 的 onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (u: any) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubLeads = subscribeToLeads(setLeads);
      return () => unsubLeads();
    }
  }, [user]);

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!user || !profile) return <LoginPage />;

  const renderContent = () => {
    switch (activeTab) {
      case 'leads': return <LeadsPage leads={leads} userProfile={profile} />;
      case 'review': return <ReviewPage leads={leads} userProfile={profile} />;
      case 'kanban': return <KanbanPage leads={leads} userProfile={profile} />;
      case 'audit': return <AuditLogsPage leads={leads} userProfile={profile} />;
      case 'members': return <MembersPage userProfile={profile} />;
      case 'import': return <ImportPage userProfile={profile} />;
      default: return <LeadsPage leads={leads} userProfile={profile} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        profile={profile} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 shadow-sm z-10">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {activeTab === 'leads' ? '案件總表' : 
               activeTab === 'review' ? '待我審核' :
               activeTab === 'kanban' ? '流程看板' :
               activeTab === 'audit' ? '操作紀錄' :
               activeTab === 'members' ? '成員管理' : '匯入案件'}
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Collaborative Workspace</p>
          </div>
          <div className="flex items-center gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
            <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center font-black text-white text-xs">
              {profile.displayName ? profile.displayName[0] : '?'}
            </div>
            <div className="flex flex-col pr-2">
              <span className="text-xs font-black text-slate-800 leading-none">
                {profile.displayName}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                {profile.role}
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-10 bg-slate-50/50">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;