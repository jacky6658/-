
import React, { useState, useRef, useEffect } from 'react';
import { Lead, UserProfile, Role, LeadStatus, Decision, AuditAction } from '../types';
import Badge from '../components/Badge';
import LeadModal from '../components/LeadModal';
import { STATUS_COLORS } from '../constants';
import { createLead, updateLead, deleteLead } from '../services/leadService';
import { extractLeadFromImage } from '../services/aiService';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Check, X, Calendar, Sparkles, Loader2, MessageSquare, UploadCloud, Layers, Camera, MousePointer2, Clock, AlertTriangle } from 'lucide-react';

interface LeadsPageProps {
  leads: Lead[];
  userProfile: UserProfile;
}

const LeadsPage: React.FC<LeadsPageProps> = ({ leads, userProfile }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [aiLoading, setAiLoading] = useState(false);
  const [bulkAiLoading, setBulkAiLoading] = useState<{ current: number, total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (userProfile.role === Role.ADMIN) setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        if (files.length === 1) {
          processAiFile(files[0]);
        } else {
          processBulkAiFiles(Array.from(files));
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [userProfile.role]);

  const processAiFile = async (file: File) => {
    if (!file) return;
    setAiLoading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setAiLoading(false);
      alert("讀取檔案失敗");
    };
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        console.log("Starting AI Extraction for file:", file.name);
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
        console.error("AI Extraction Error:", err);
        alert("AI 解析失敗，請確保圖片清晰且包含文字資訊。");
      } finally {
        setAiLoading(false);
        // 重置 input 以利重複選取同一張圖測試
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const processBulkAiFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setBulkAiLoading({ current: 0, total: imageFiles.length });

    for (let i = 0; i < imageFiles.length; i++) {
      setBulkAiLoading({ current: i + 1, total: imageFiles.length });
      const file = imageFiles[i];
      const reader = new FileReader();
      const base64String = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      try {
        const extracted = await extractLeadFromImage(base64String);
        await createLead({
          ...extracted,
          links: [base64String],
          status: LeadStatus.TO_FILTER,
          decision: Decision.PENDING,
          priority: 3
        });
      } catch (err) {
        console.error("Bulk AI Error:", err);
      }
    }
    setBulkAiLoading(null);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
  };

  // 排序邏輯：由舊到新 (Ascending)
  const filteredLeads = leads
    .filter(l => {
      const searchStr = search.toLowerCase();
      const matchesSearch = 
        l.need.toLowerCase().includes(searchStr) || 
        l.platform_id.toLowerCase().includes(searchStr) ||
        (l.phone && l.phone.includes(searchStr)) ||
        (l.location && l.location.toLowerCase().includes(searchStr));
      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // 優先使用發布時間，其次使用建立時間
      const timeA = new Date(a.posted_at || a.created_at).getTime();
      const timeB = new Date(b.posted_at || b.created_at).getTime();
      
      // 防止無效日期導致排序混亂
      const safeTimeA = isNaN(timeA) ? 0 : timeA;
      const safeTimeB = isNaN(timeB) ? 0 : timeB;

      return safeTimeA - safeTimeB; // 由舊到新 (Ascending)
    });

  const handleCreate = async (data: Partial<Lead>) => {
    await createLead(data);
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  const handleUpdate = async (data: Partial<Lead>) => {
    if (selectedLead && selectedLead.id) {
      await updateLead(selectedLead.id, data);
      setIsModalOpen(false);
      setSelectedLead(null);
    }
  };

  const handleQuickDecision = async (lead: Lead, clickedDecision: Decision) => {
    const isCancel = lead.decision === clickedDecision;
    const newDecision = isCancel ? Decision.PENDING : clickedDecision;
    const updates: Partial<Lead> = { decision: newDecision };
    if (isCancel) {
      updates.status = LeadStatus.TO_FILTER;
    } else {
      if (clickedDecision === Decision.REJECT) updates.status = LeadStatus.REJECTED;
      else if (clickedDecision === Decision.ACCEPT) updates.status = LeadStatus.CONTACTED;
    }
    await updateLead(lead.id, updates, AuditAction.DECISION);
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除嗎？')) {
      await deleteLead(id);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '時間格式錯誤';
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="space-y-6 relative">
      {/* 單張圖片 AI 處理遮罩 */}
      {aiLoading && (
        <div className="fixed inset-0 z-[300] bg-indigo-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl flex flex-col items-center space-y-8 max-w-sm w-full">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 w-24 h-24 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-900">AI 正在解析圖片...</h3>
              <p className="text-slate-400 font-bold mt-2">正在識別案主、時間與需求內容</p>
            </div>
          </div>
        </div>
      )}

      {/* 批次處理 Overlay */}
      {bulkAiLoading && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-10 shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="relative mx-auto w-24 h-24">
               <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600 text-xl">
                 {Math.round((bulkAiLoading.current / bulkAiLoading.total) * 100)}%
               </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">AI 正在批次上架案件...</h3>
              <p className="text-slate-400 font-bold text-sm mt-1">進度: {bulkAiLoading.current} / {bulkAiLoading.total} 筆資料</p>
            </div>
          </div>
        </div>
      )}

      {/* 拖放覆蓋層 */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-indigo-600/90 flex flex-col items-center justify-center text-white backdrop-blur-md border-8 border-dashed border-white/30 m-4 rounded-[3rem] transition-all animate-pulse">
          <UploadCloud size={80} className="mb-4" />
          <h2 className="text-4xl font-black">放開以「AI 傳圖識別」</h2>
          <p className="mt-2 text-indigo-100 font-bold">自動分析圖片中的案件時間與需求</p>
        </div>
      )}

      {/* 快速引導 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Camera size={20}/></div>
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">方式一</p>
            <h4 className="text-sm font-black text-slate-800">直接 Ctrl+V 貼上截圖</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><MousePointer2 size={20}/></div>
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">方式二</p>
            <h4 className="text-sm font-black text-slate-800">拖曳截圖進網頁</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform"><Plus size={20}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">方式三</p>
            <h4 className="text-sm font-black text-slate-800">點擊按鈕或 ＋ 上架</h4>
          </div>
        </div>
      </div>

      {/* 工具列 */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex-1 flex items-center gap-4 w-full max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="搜尋案主、聯繫資訊、或地點..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl text-sm transition-all font-medium shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl text-sm px-4 py-3 font-black text-slate-700 shadow-inner"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">全部狀態</option>
            {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-3">
          {userProfile.role === Role.ADMIN && (
            <>
              <button 
                onClick={() => aiFileInputRef.current?.click()}
                disabled={aiLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:shadow-2xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all border-none active:scale-95 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                AI 傳圖識別上架
              </button>
              <input 
                type="file" 
                ref={aiFileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => e.target.files?.[0] && processAiFile(e.target.files[0])} 
              />

              <button 
                onClick={() => bulkFileInputRef.current?.click()}
                disabled={!!bulkAiLoading}
                className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-3.5 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all border border-slate-200"
              >
                <Layers size={18} />
                批次
              </button>
              <input 
                type="file" 
                ref={bulkFileInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={(e) => e.target.files && processBulkAiFiles(Array.from(e.target.files))} 
              />
              
              <button 
                onClick={() => { setSelectedLead(null); setIsModalOpen(true); }}
                className="p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
              >
                <Plus size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 數據表格 */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">客戶 / 時間 / 來源</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">需求摘要 / 預算</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">內部備註</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">快速審核</th>
                <th className="px-6 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">當前狀態</th>
                <th className="px-8 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase ${
                          lead.platform === 'PRO360' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          lead.platform === 'Threads' ? 'bg-slate-900 text-white border-slate-800' :
                          'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                          {lead.platform}
                        </span>
                        <span className="text-sm font-black text-slate-900">{lead.platform_id}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-indigo-500 text-[10px] font-black">
                          <Clock size={10} /> {formatDate(lead.posted_at || lead.created_at)}
                        </div>
                        {lead.location && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
                            <MapPin size={10} /> {lead.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex gap-4">
                      {lead.links && lead.links.length > 0 && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                             onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }}>
                          <img src={lead.links[0]} alt="thumb" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-[280px]">
                        <p className="text-sm font-bold text-slate-700 line-clamp-2 leading-relaxed mb-2">{lead.need}</p>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl uppercase tracking-tight border border-emerald-100">💰 {lead.budget_text || '預算不詳'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    {lead.internal_remarks ? (
                      <div className="relative p-3 bg-slate-900 text-white rounded-2xl max-w-[180px] shadow-lg shadow-slate-200">
                        <MessageSquare className="absolute -top-1.5 -left-1.5 text-indigo-400 fill-slate-900" size={16} />
                        <p className="text-[10px] line-clamp-2 font-medium leading-relaxed italic opacity-80">"{lead.internal_remarks}"</p>
                        <div className="mt-2 text-[8px] font-black text-indigo-300 uppercase tracking-tighter">
                          {lead.remarks_author}
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }} className="text-[10px] text-slate-300 font-black italic hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        <Plus size={10} /> 新增備註
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleQuickDecision(lead, Decision.ACCEPT)}
                        className={`p-3 rounded-2xl border transition-all ${lead.decision === Decision.ACCEPT ? 'bg-green-500 text-white border-green-600 shadow-lg scale-110' : 'bg-white text-green-600 border-gray-200 hover:bg-green-50'}`}
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleQuickDecision(lead, Decision.REJECT)}
                        className={`p-3 rounded-2xl border transition-all ${lead.decision === Decision.REJECT ? 'bg-red-500 text-white border-red-600 shadow-lg scale-110' : 'bg-white text-red-600 border-gray-200 hover:bg-red-50'}`}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <Badge className={`${STATUS_COLORS[lead.status]} font-black px-4 py-2 text-[10px] uppercase tracking-wider rounded-xl border border-current`}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }}
                        className="p-3 bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm"
                      >
                        <Edit2 size={18} />
                      </button>
                      {userProfile.role === Role.ADMIN && (
                        <button 
                          onClick={() => handleDelete(lead.id)}
                          className="p-3 bg-slate-100 text-slate-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
