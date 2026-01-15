
import React, { useState, useRef, useEffect } from 'react';
import { Lead, UserProfile, Role, LeadStatus, Decision, AuditAction } from '../types';
import Badge from '../components/Badge';
import LeadModal from '../components/LeadModal';
import { STATUS_COLORS } from '../constants';
import { createLead, updateLead, deleteLead } from '../services/leadService';
import { extractLeadFromImage } from '../services/aiService';
import { Plus, Search, Edit2, Trash2, Check, X, Loader2, Camera, Clock, UserCheck, Phone, Mail, MapPin, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

interface LeadsPageProps {
  leads: Lead[];
  userProfile: UserProfile;
}

const LeadsPage: React.FC<LeadsPageProps> = ({ leads, userProfile }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedNeeds, setExpandedNeeds] = useState<Set<string>>(new Set());
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // 切換展開/收合狀態
  const toggleNeed = (id: string) => {
    const newSet = new Set(expandedNeeds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedNeeds(newSet);
  };

  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (userProfile.role !== Role.ADMIN) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) processAiFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [userProfile.role]);

  const processAiFile = async (file: File) => {
    if (!file) return;
    setAiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64String = reader.result as string;
      try {
        base64String = await resizeImage(base64String);
        const extracted = await extractLeadFromImage(base64String);
        const draftLead: Partial<Lead> = {
          ...extracted,
          links: [base64String],
          created_by_name: userProfile.displayName,
          status: LeadStatus.TO_FILTER,
          decision: Decision.PENDING,
          priority: 3
        };
        setSelectedLead(draftLead as Lead);
        setIsModalOpen(true);
      } catch (err) {
        alert("AI 解析或圖片處理失敗。");
      } finally {
        setAiLoading(false);
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (data: Partial<Lead>) => {
    try {
      await createLead(data);
      setIsModalOpen(false);
      setSelectedLead(null);
    } catch (err) {
      alert('新增失敗');
    }
  };

  const handleUpdate = async (data: Partial<Lead>) => {
    if (!selectedLead?.id) return;
    try {
      await updateLead(selectedLead.id, data);
      setIsModalOpen(false);
      setSelectedLead(null);
    } catch (err) {
      alert('更新失敗');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除此案件嗎？')) {
      try {
        await deleteLead(id);
      } catch (err) {
        alert('刪除失敗');
      }
    }
  };

  const handleQuickDecision = async (lead: Lead, clickedDecision: Decision) => {
    const isCancel = lead.decision === clickedDecision;
    const newDecision = isCancel ? Decision.PENDING : clickedDecision;
    const updates: Partial<Lead> = { 
      decision: newDecision,
      decision_by: isCancel ? undefined : userProfile.displayName 
    };
    if (isCancel) {
      updates.status = LeadStatus.TO_FILTER;
    } else {
      if (clickedDecision === Decision.REJECT) updates.status = LeadStatus.REJECTED;
      else if (clickedDecision === Decision.ACCEPT) updates.status = LeadStatus.CONTACTED;
    }
    await updateLead(lead.id, updates, AuditAction.DECISION);
  };

  const filteredLeads = leads
    .filter(l => {
      const searchStr = search.toLowerCase();
      return l.need.toLowerCase().includes(searchStr) || l.platform_id.toLowerCase().includes(searchStr);
    })
    .sort((a, b) => new Date(a.posted_at || a.created_at).getTime() - new Date(b.posted_at || b.created_at).getTime());

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-TW');
  };

  return (
    <div className="space-y-6 relative">
      {aiLoading && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin mb-4" size={48} />
          <h3 className="text-xl font-black tracking-widest">AI 正在解析內容...</h3>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex-1 flex items-center gap-4 w-full max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="搜尋案主名稱、需求內容..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {userProfile.role === Role.ADMIN && (
            <>
              <button 
                onClick={() => aiFileInputRef.current?.click()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
              >
                <Camera size={18} />
                AI 傳圖識別
              </button>
              <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processAiFile(e.target.files[0])} />
              
              <button 
                onClick={() => { setSelectedLead(null); setIsModalOpen(true); }}
                className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all"
              >
                <Plus size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">客戶 / 來源</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">需求內容 (點擊文字展開)</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">聯絡資訊</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">備註與內部評語</th>
                <th className="px-6 py-6 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">快速審核</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">當前狀態</th>
                <th className="px-6 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredLeads.map((lead) => {
                const isExpanded = expandedNeeds.has(lead.id);
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-all group align-top">
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-indigo-600">{lead.platform}</span>
                        <span className="text-sm font-bold text-slate-900">{lead.platform_id}</span>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black">
                          <Clock size={10} /> {formatDate(lead.posted_at || lead.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 max-w-sm">
                      <div 
                        onClick={() => toggleNeed(lead.id)}
                        className="cursor-pointer group/need relative"
                      >
                        <p className={`text-sm text-slate-700 font-medium leading-relaxed transition-all duration-300 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                          {lead.need}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-indigo-500 opacity-0 group-hover/need:opacity-100 transition-opacity">
                          {isExpanded ? <><ChevronUp size={12}/> 點擊收合內容</> : <><ChevronDown size={12}/> 點擊展開全文</>}
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 mt-2 block bg-emerald-50 px-2 py-1 rounded inline-block">💰 預算：{lead.budget_text || '不詳'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-2">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-bold bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <Phone size={12} className="text-indigo-400"/> {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-bold bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <Mail size={12} className="text-indigo-400"/> {lead.email}
                          </div>
                        )}
                        {lead.location && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium px-1.5">
                            <MapPin size={12} className="text-slate-400"/> {lead.location}
                          </div>
                        )}
                        {!lead.phone && !lead.email && !lead.location && <span className="text-xs text-slate-300 italic">無聯絡資訊</span>}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-3 max-w-[220px]">
                        {lead.note && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                              <MessageSquare size={10}/> 原始備註
                            </p>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{lead.note}</p>
                          </div>
                        )}
                        {lead.internal_remarks && (
                          <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                              <UserCheck size={10}/> 內部評語 ({lead.remarks_author || '系統'})
                            </p>
                            <p className="text-xs text-indigo-900 font-medium italic line-clamp-2">"{lead.internal_remarks}"</p>
                          </div>
                        )}
                        {!lead.note && !lead.internal_remarks && <span className="text-xs text-slate-300 italic">無任何備註</span>}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleQuickDecision(lead, Decision.ACCEPT)}
                          className={`p-2.5 rounded-xl border transition-all ${lead.decision === Decision.ACCEPT ? 'bg-green-500 text-white border-green-600' : 'bg-white text-green-600 border-gray-200 hover:bg-green-50'}`}
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleQuickDecision(lead, Decision.REJECT)}
                          className={`p-2.5 rounded-xl border transition-all ${lead.decision === Decision.REJECT ? 'bg-red-500 text-white border-red-600' : 'bg-white text-red-600 border-gray-200 hover:bg-red-50'}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <Badge className={`${STATUS_COLORS[lead.status]} font-black px-3 py-1 text-[9px] uppercase tracking-wider rounded-lg border border-current`}>
                          {lead.status}
                        </Badge>
                        {lead.decision_by && (
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold italic mt-1">
                            <UserCheck size={10} className="text-indigo-400" />
                            {lead.decision_by} 審核
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Edit2 size={16}/></button>
                        {userProfile.role === Role.ADMIN && (
                          <button onClick={() => handleDelete(lead.id)} className="p-2 bg-slate-100 text-slate-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"><Trash2 size={16}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={48} className="text-slate-200"/>
                      <p className="text-slate-400 font-bold text-sm tracking-widest">找不到符合條件的案件</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedLead(null); }}
        onSubmit={selectedLead && selectedLead.id ? handleUpdate : handleCreate}
        initialData={selectedLead}
        userRole={userProfile.role}
        userName={userProfile.displayName}
      />
    </div>
  );
};

export default LeadsPage;
