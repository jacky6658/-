
import React, { useState, useEffect } from 'react';
import { UserProfile, Role } from '../types';
import { getAllUsers, setUserRole } from '../services/userService';
import { Users, Shield, User, ChevronRight } from 'lucide-react';
import Badge from '../components/Badge';

interface MembersPageProps {
  userProfile: UserProfile;
}

const MembersPage: React.FC<MembersPageProps> = ({ userProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      const data = await getAllUsers();
      setUsers(data);
      setLoading(false);
    };
    loadUsers();
  }, []);

  const handleToggleRole = async (uid: string, currentRole: Role) => {
    if (uid === userProfile.uid) return;
    const newRole = currentRole === Role.ADMIN ? Role.REVIEWER : Role.ADMIN;
    await setUserRole(uid, newRole);
    setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">團隊成員</h2>
              <p className="text-xs text-gray-500">管理目前系統中的所有使用者與權限等級</p>
            </div>
          </div>
          <Badge className="bg-indigo-100 text-indigo-700">{users.length} 名成員</Badge>
        </div>
        
        <div className="divide-y divide-gray-100">
          {users.map((user) => (
            <div key={user.uid} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${user.role === Role.ADMIN ? 'bg-slate-800' : 'bg-indigo-400'}`}>
                  {user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user.role === Role.ADMIN ? (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <Shield size={10} /> 管理員
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                        <User size={10} /> 夥伴 (Reviewer)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {userProfile.uid !== user.uid && (
                <button 
                  onClick={() => handleToggleRole(user.uid, user.role)}
                  className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"
                >
                  切換角色
                  <ChevronRight size={14} />
                </button>
              )}
              {userProfile.uid === user.uid && (
                <span className="text-xs text-gray-400 italic font-medium px-4">我自己</span>
              )}
            </div>
          ))}
          {loading && (
            <div className="p-20 text-center text-gray-400">載入成員中...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersPage;
