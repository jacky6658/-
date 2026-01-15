
import React from 'react';
import { Role, UserProfile } from '../types';
import { LayoutGrid, ClipboardList, CheckSquare, History, Users, Download, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, profile, onLogout }) => {
  const isAdmin = profile.role === Role.ADMIN;

  const menuItems = [
    { id: 'leads', label: '案件總表', icon: ClipboardList, roles: [Role.ADMIN, Role.REVIEWER] },
    { id: 'review', label: '待我審核', icon: CheckSquare, roles: [Role.ADMIN, Role.REVIEWER] },
    { id: 'kanban', label: '流程看板', icon: LayoutGrid, roles: [Role.ADMIN, Role.REVIEWER] },
    { id: 'import', label: '匯入案件', icon: Download, roles: [Role.ADMIN] },
    { id: 'audit', label: '操作紀錄', icon: History, roles: [Role.ADMIN, Role.REVIEWER] },
    { id: 'members', label: '成員管理', icon: Users, roles: [Role.ADMIN] },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">C</div>
        <span className="text-xl font-bold text-white tracking-tight">CaseFlow</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.filter(item => item.roles.includes(profile.role)).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.id 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <LogOut size={18} />
          登出
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
