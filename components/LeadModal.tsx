
import React, { useState, useEffect, useRef } from 'react';
import { Lead, Platform, ContactStatus, LeadStatus, Role, ProgressUpdate, ChangeHistory } from '../types';
import { CONTACT_STATUS_OPTIONS, PLATFORM_OPTIONS } from '../constants';
import { X, Upload, Sparkles, User, Loader2, Info, Plus, MessageSquare, Calendar, History, TrendingUp, Camera, Link as LinkIcon } from 'lucide-react';
import { extractLeadFromImage } from '../services/aiService';
import { addProgressUpdate } from '../services/leadService';

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
  const aiDropZoneRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiFilled, setIsAiFilled] = useState(false);
  const [isAiDragging, setIsAiDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [progressContent, setProgressContent] = useState('');
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
        // 確保所有可能為 null 的欄位都轉換為空字符串
        need: initialData.need || '',
        budget_text: initialData.budget_text || '',
        platform_id: initialData.platform_id || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        location: initialData.location || '',
        note: initialData.note || '',
        internal_remarks: initialData.internal_remarks || '',
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
    setProgressContent('');
    setShowHistory(false);
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

  // 處理圖片文件的通用函數
  const processAiImageFile = async (file: File) => {
    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    // 檢查檔案大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('圖片大小不能超過 10MB');
      return;
    }

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
      } catch (err: any) {
        console.error('AI 解析錯誤:', err);
        // 顯示更具體的錯誤訊息
        const errorMessage = err?.message || '未知錯誤';
        if (errorMessage.includes('API Key')) {
          alert(`❌ ${errorMessage}\n\n請在 .env 文件中設置 VITE_API_KEY 或 GEMINI_API_KEY\n獲取 API Key: https://aistudio.google.com/app/apikey`);
        } else if (errorMessage.includes('網路')) {
          alert(`❌ ${errorMessage}\n\n請檢查您的網路連線後再試。`);
        } else {
          alert(`❌ AI 解析失敗：${errorMessage}\n\n請確認：\n1. 已設置 API Key\n2. 圖片清晰可讀\n3. 網路連線正常`);
        }
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAiImageFile(file);
  };

  // 拖放事件處理
  const handleAiDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAiDragging(true);
  };

  const handleAiDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAiDragging(false);
  };

  const handleAiDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAiDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAiImageFile(file);
    }
  };

  // 解析 Pro360 URL
  const parsePro360Url = (url: string) => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      const quoteBidId = params.get('quote_bid_id');
      const pk = params.get('pk');
      const from = params.get('from');
      
      let requestId = null;
      if (from) {
        const match = from.match(/\/requests\/(\d+)/);
        if (match) {
          requestId = match[1];
        }
      }
      
      return {
        platform: Platform.PRO360,
        platform_id: quoteBidId || requestId || pk || 'Unknown',
        quote_bid_id: quoteBidId,
        request_id: requestId,
        pk: pk,
        url: url
      };
    } catch (error) {
      console.error('URL 解析失敗:', error);
      return null;
    }
  };

  // 處理 URL 匯入
  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      alert('請輸入 URL');
      return;
    }

    setUrlLoading(true);
    const url = urlInput.trim();

    try {
      if (url.includes('pro360.com.tw')) {
        const parsed = parsePro360Url(url);
        if (!parsed) {
          alert('URL 格式錯誤，無法解析！');
          setUrlLoading(false);
          return;
        }

        // 自動填入表單
        setFormData(prev => ({
          ...prev,
          platform: parsed.platform,
          platform_id: parsed.platform_id,
          need: prev.need || `Pro360 案件 - 報價單 ID: ${parsed.quote_bid_id || parsed.request_id || 'N/A'}`,
          budget_text: prev.budget_text || '待確認',
          note: prev.note || `來源: Pro360\n報價單 ID: ${parsed.quote_bid_id || 'N/A'}\n請求 ID: ${parsed.request_id || 'N/A'}\nPK: ${parsed.pk || 'N/A'}`,
          links: [...(prev.links || []), url]
        }));

        setIsAiFilled(true);
        setUrlInput('');
        alert('✅ URL 解析成功！已自動填入表單，請檢查後儲存。');
      } else {
        // 其他平台的 URL
        setFormData(prev => ({
          ...prev,
          platform: Platform.OTHER,
          platform_id: prev.platform_id || 'URL Import',
          need: prev.need || '從 URL 匯入的案件',
          budget_text: prev.budget_text || '待確認',
          note: prev.note || `來源 URL: ${url}`,
          links: [...(prev.links || []), url]
        }));

        setIsAiFilled(true);
        setUrlInput('');
        alert('✅ URL 已添加！已自動填入表單，請檢查後儲存。');
      }
    } catch (error) {
      console.error('URL 匯入失敗:', error);
      alert('❌ URL 處理失敗，請檢查 URL 格式！');
    } finally {
      setUrlLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddProgress = async () => {
    if (!progressContent.trim() || !initialData?.id) return;
    setIsAddingProgress(true);
    try {
      await addProgressUpdate(initialData.id, progressContent);
      setProgressContent('');
      // 觸發重新載入，通過提交空更新來刷新數據
      const updatedData = { ...formData };
      onSubmit(updatedData);
    } catch (err) {
      alert('添加進度更新失敗');
    } finally {
      setIsAddingProgress(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      platform: '來源平台',
      platform_id: '對方 ID / 名稱',
      need: '客戶原始需求',
      budget_text: '預算狀況',
      phone: '電話',
      email: '電子郵件',
      location: '地點',
      status: '案件狀態',
      contact_status: '聯絡狀態',
      internal_remarks: '內部備註',
      note: '備註'
    };
    return labels[field] || field;
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
            {/* AI 截圖匯入和 URL 匯入 */}
            {!initialData && (
              <div className="space-y-4">
                {/* AI 截圖匯入 */}
                <div
                  ref={aiDropZoneRef}
                  onDragOver={handleAiDragOver}
                  onDragLeave={handleAiDragLeave}
                  onDrop={handleAiDrop}
                  onClick={() => !aiLoading && aiFileInputRef.current?.click()}
                  className={`bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isAiDragging
                      ? 'border-indigo-500 bg-indigo-100 scale-[1.02] shadow-lg'
                      : 'border-indigo-200 hover:border-indigo-300 hover:shadow-md'
                  } ${aiLoading ? 'opacity-75 cursor-wait' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 text-white p-3 rounded-xl">
                        <Camera size={20} />
                      </div>
                      <div>
                        <p className="font-black text-indigo-900 text-sm">AI 智能截圖匯入</p>
                        <p className="text-indigo-600/70 font-bold text-xs">
                          {isAiDragging ? '放開以上傳' : '拖放截圖至此或點擊上傳'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {aiLoading ? (
                        <div className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm flex items-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          識別中...
                        </div>
                      ) : (
                        <div className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all">
                          <Sparkles size={16} />
                          選擇截圖
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* URL 快速匯入 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-purple-200">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-600 text-white p-3 rounded-xl">
                        <LinkIcon size={20} />
                      </div>
                      <div>
                        <p className="font-black text-purple-900 text-sm">URL 快速匯入</p>
                        <p className="text-purple-600/70 font-bold text-xs">貼上 Pro360 等平台網址自動填入</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUrlImport();
                          }
                        }}
                        placeholder="貼上 Pro360 URL，例如：https://www.pro360.com.tw/..."
                        className="flex-1 px-4 py-2.5 bg-white border-2 border-purple-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleUrlImport}
                        disabled={urlLoading || !urlInput.trim()}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-black text-sm hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {urlLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            處理中...
                          </>
                        ) : (
                          <>
                            <LinkIcon size={16} />
                            匯入
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  className={`w-full rounded-2xl border-2 p-4 font-black transition-all appearance-none ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} text-slate-800`}
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
                >
                  {PLATFORM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">對方 ID / 名稱</label>
                <input 
                  type="text" 
                  placeholder="例如：王小明"
                  className={`w-full rounded-2xl border-2 p-4 font-bold transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} text-slate-800`}
                  value={formData.platform_id || ''}
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
                <input type="text" placeholder="例如：1萬以下" className={`w-full rounded-2xl border-2 p-4 font-black transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} text-slate-800`} value={formData.budget_text || ''} onChange={(e) => setFormData({ ...formData, budget_text: e.target.value })} />
              </div>
            </section>

            {/* 需求說明 */}
            <section className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">客戶原始需求</label>
              <textarea 
                rows={4}
                placeholder="在此填寫內容..."
                className={`w-full rounded-2xl border-2 p-5 font-medium leading-relaxed transition-all ${isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500'} text-slate-800`}
                value={formData.need || ''}
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
                value={formData.internal_remarks || ''}
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

            {/* 近期進度更新 - 僅在編輯模式下顯示 */}
            {initialData?.id && (
              <section className="space-y-4 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
                      <TrendingUp size={16} className="text-white" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-900">近期進度更新</h3>
                  </div>
                </div>
                
                {/* 添加進度更新 */}
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="記錄案件進度..."
                    className="w-full rounded-xl border-2 border-emerald-200 bg-white p-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                    value={progressContent}
                    onChange={(e) => setProgressContent(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddProgress}
                    disabled={!progressContent.trim() || isAddingProgress}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAddingProgress ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        添加中...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        添加進度
                      </>
                    )}
                  </button>
                </div>

                {/* 顯示進度更新列表 */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(initialData.progress_updates || []).map((update: ProgressUpdate) => (
                    <div key={update.id} className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 flex-1">{update.content}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600">
                        <User size={12} />
                        <span className="font-bold">{update.author_name}</span>
                        <span className="text-emerald-400">•</span>
                        <span>{formatDate(update.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {(!initialData.progress_updates || initialData.progress_updates.length === 0) && (
                    <p className="text-sm text-emerald-600/70 text-center py-4">尚無進度更新記錄</p>
                  )}
                </div>
              </section>
            )}

            {/* 修改歷史記錄 - 僅在編輯模式下顯示 */}
            {initialData?.id && (
              <section className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-600 rounded-xl flex items-center justify-center">
                      <History size={16} className="text-white" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">修改歷史記錄</h3>
                    {(initialData.change_history || []).length > 0 && (
                      <span className="px-2 py-1 bg-slate-600 text-white text-xs font-black rounded-full">
                        {(initialData.change_history || []).length}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs font-bold">
                    {showHistory ? '收起' : '展開'}
                  </span>
                </button>

                {showHistory && (
                  <div className="space-y-2 max-h-64 overflow-y-auto bg-slate-50 rounded-xl p-4">
                    {(initialData.change_history || []).map((change: ChangeHistory) => (
                      <div key={change.id} className="bg-white rounded-xl p-3 border border-slate-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                            {getFieldLabel(change.field)}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(change.created_at)}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          {change.old_value !== undefined && change.old_value !== null && (
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 font-bold">舊值：</span>
                              <span className="text-slate-600 line-through">{String(change.old_value)}</span>
                            </div>
                          )}
                          {change.new_value !== undefined && change.new_value !== null && (
                            <div className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">新值：</span>
                              <span className="text-slate-800 font-medium">{String(change.new_value)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <User size={12} />
                          <span className="font-bold">{change.author_name}</span>
                        </div>
                      </div>
                    ))}
                    {(!initialData.change_history || initialData.change_history.length === 0) && (
                      <p className="text-sm text-slate-400 text-center py-4">尚無修改記錄</p>
                    )}
                  </div>
                )}
              </section>
            )}
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

      <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*" onChange={handleAiScan} />
    </div>
  );
};

export default LeadModal;
