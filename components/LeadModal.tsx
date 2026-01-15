
import React, { useState, useEffect, useRef } from 'react';
import { Lead, Platform, ContactStatus, LeadStatus, Role } from '../types';
import { CONTACT_STATUS_OPTIONS, PLATFORM_OPTIONS } from '../constants';
import { X, Upload, Sparkles, User, Loader2, Info, Plus, MessageSquare, Calendar } from 'lucide-react';
import { extractLeadFromImage } from '../services/aiService';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Lead>) => void;
  initialData?: Lead | null;
  userRole: Role;
  userName: string;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSubmit, initialData, userRole, userName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiFilled, setIsAiFilled] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({
    platform: Platform.FB,
    contact_status: ContactStatus.UNRESPONDED,
    status: LeadStatus.TO_FILTER,
    priority: 3,
    need: '',
    budget_text: '',
    platform_id: '',
    phone: '',
    email: '',
    location: '',
    note: '',
    internal_remarks: '',
    posted_at: new Date().toISOString().split('T')[0],
    links: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        posted_at: initialData.posted_at ? initialData.posted_at.split('T')[0] : new Date().toISOString().split('T')[0]
      });
      setIsAiFilled(false);
    } else {
      setFormData({
        platform: Platform.FB,
        contact_status: ContactStatus.UNRESPONDED,
        status: LeadStatus.TO_FILTER,
        priority: 3,
        need: '',
        budget_text: '',
        platform_id: '',
        phone: '',
        email: '',
        location: '',
        note: '',
        internal_remarks: '',
        posted_at: new Date().toISOString().split('T')[0],
        links: []
      });
      setIsAiFilled(false);
    }
  }, [initialData, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({
          ...prev,
          links: [...(prev.links || []), base64String]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const extracted = await extractLeadFromImage(base64String);
        setFormData(prev => ({
          ...prev,
          ...extracted,
          links: [...(prev.links || []), base64String]
        }));
        setIsAiFilled(true);
      } catch (err) {
        alert("AI 解析失敗，請嘗試更清晰的圖片。");
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index)
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = { ...formData };
    if (formData.internal_remarks !== initialData?.internal_remarks) {
      updatedData.remarks_author = userName;
    }
    // Ensure posted_at is valid ISO
    if (formData.posted_at) {
      updatedData.posted_at = new Date(formData.posted_at).toISOString();
    }
    onSubmit(updatedData);
  };

  if (!isOpen) return null;

  const isAdmin = userRole === Role.ADMIN;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md transition-all">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-white/20 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b bg-white/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${initialData ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {initialData?.id ? '修改案件資訊' : (isAiFilled ? '確認 AI 擷取結果' : '新增客戶案件')}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                {isAiFilled ? <><Sparkles size={12} className="text-indigo-500" /> AI 已自動填入下方資訊</> : '請填寫客戶的原始需求資訊'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-50 rounded-2xl">
            <X size={32} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <form id="lead-form" className="space-y-10" onSubmit={handleFormSubmit}>
            {/* AI Highlight Banner */}
            {isAiFilled && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <div className="bg-indigo-600 text-white p-2 rounded-xl"><Sparkles size={16}/></div>
                <div className="text-sm">
                  <p className="font-black text-indigo-900">AI 智能掃描成功！</p>
                  <p className="text-indigo-600/70 font-bold text-xs uppercase tracking-tight">請檢查欄位內容是否正確後儲存</p>
                </div>
              </div>
            )}

            {/* 基本欄位 */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">來源平台</label>
                <select 
                  disabled={!isAdmin}
                  className={`w-full rounded-2xl border-2 p-4 font-black transition-all appearance-none ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} disabled:opacity-50 text-slate-800`}
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
                >
                  {PLATFORM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">對方 ID / 名稱</label>
                <input 
                  disabled={!isAdmin}
                  type="text" 
                  placeholder="例如：王小明"
                  className={`w-full rounded-2xl border-2 p-4 font-bold transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} disabled:opacity-50 text-slate-800`}
                  value={formData.platform_id}
                  onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                />
              </div>
            </section>

            {/* 時間與聯絡 */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calendar size={12}/> 案件發布時間
                </label>
                <input 
                  disabled={!isAdmin}
                  type="date"
                  className={`w-full rounded-2xl border-2 p-4 font-black transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} text-slate-800`}
                  value={formData.posted_at}
                  onChange={(e) => setFormData({ ...formData, posted_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">預算狀況</label>
                <input type="text" placeholder="例如：1萬以下" className={`w-full rounded-2xl border-2 p-4 font-black transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} text-slate-800`} value={formData.budget_text} onChange={(e) => setFormData({ ...formData, budget_text: e.target.value })} />
              </div>
            </section>

            {/* 需求說明 */}
            <section className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">客戶原始需求</label>
              <textarea 
                disabled={!isAdmin}
                rows={4}
                placeholder="在此填寫內容..."
                className={`w-full rounded-2xl border-2 p-5 font-medium leading-relaxed transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} disabled:opacity-50 text-slate-800`}
                value={formData.need}
                onChange={(e) => setFormData({ ...formData, need: e.target.value })}
              />
            </section>

            {/* 內部備註 */}
            <section className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-xl shadow-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center"><MessageSquare size={16}/></div>
                  <h3 className="text-sm font-black uppercase tracking-widest">內部備註 (實名紀錄)</h3>
                </div>
                {formData.remarks_author && (
                  <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/10">
                    <User size={10} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">填寫者：{formData.remarks_author}</span>
                  </div>
                )}
              </div>
              <textarea 
                rows={2}
                placeholder="筆記或判斷理由..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                value={formData.internal_remarks}
                onChange={(e) => setFormData({ ...formData, internal_remarks: e.target.value })}
              />
            </section>

            {/* 圖片管理 */}
            <section className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">附件截圖</label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {(formData.links || []).map((link, index) => (
                  <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm transition-all hover:shadow-lg">
                    <img src={link} alt="Attachment" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                  <Upload size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] mt-2 font-black uppercase tracking-widest">加圖片</span>
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t bg-slate-50/80 backdrop-blur-md flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-8 py-4 text-sm font-black text-slate-500 hover:text-slate-900 transition-all">取消</button>
          <button form="lead-form" type="submit" className="px-12 py-4 text-sm font-black text-white bg-slate-900 rounded-2xl hover:bg-black shadow-2xl shadow-slate-200 active:scale-95 transition-all">
            確認並儲存案件
          </button>
        </div>
      </div>

      {!initialData && (
        <button onClick={() => aiFileInputRef.current?.click()} disabled={aiLoading} className="fixed bottom-10 right-10 z-[120] bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all active:scale-90">
          {aiLoading ? <Loader2 className="animate-spin"/> : <Sparkles/>}
        </button>
      )}
      <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*" onChange={handleAiScan} />
    </div>
  );
};

export default LeadModal;
