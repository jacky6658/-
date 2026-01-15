
import React, { useState } from 'react';
import { UserProfile, Lead, LeadStatus, Decision, Platform, ContactStatus } from '../types';
import { createLead } from '../services/leadService';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface ImportPageProps {
  userProfile: UserProfile;
}

const ImportPage: React.FC<ImportPageProps> = () => {
  const [csvData, setCsvData] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleImport = async () => {
    if (!csvData.trim()) return;
    setImporting(true);
    setMessage('匯入中...');

    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    let count = 0;
    for (const row of rows) {
      const values = row.split(',').map(v => v.trim());
      const leadData: any = {};
      
      headers.forEach((header, idx) => {
        leadData[header] = values[idx];
      });

      try {
        await createLead({
          platform: (leadData.platform || 'FB') as Platform,
          platform_id: leadData.platform_id || 'Unknown',
          contact_status: (leadData.contact_status || '未回覆') as ContactStatus,
          need: leadData.need || '',
          budget_text: leadData.budget_text || '不詳',
          posted_at: leadData.posted_at || new Date().toISOString(),
          note: leadData.note || '',
          links: leadData.links ? leadData.links.split(';') : [],
          status: LeadStatus.TO_FILTER,
          decision: Decision.PENDING,
          priority: 3
        });
        count++;
        setProgress(Math.floor((count / rows.length) * 100));
      } catch (err) {
        console.error('Import row failed', err);
      }
    }

    setMessage(`成功匯入 ${count} 筆案件！`);
    setImporting(false);
    setCsvData('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Upload size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">CSV 批次匯入</h2>
            <p className="text-sm text-gray-500">請貼上符合格式的 CSV 內容來快速建立案件。</p>
          </div>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">CSV 格式提醒：</p>
              <p>首行必須包含以下欄位（逗號分隔）：</p>
              <p className="font-mono mt-1 bg-white/50 p-1 rounded">platform, platform_id, need, budget_text, posted_at, note, links</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">CSV 數據 (Raw Content)</label>
          <textarea 
            className="w-full h-64 font-mono text-xs p-4 bg-slate-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all"
            placeholder="platform,platform_id,need,budget_text,posted_at,note,links&#10;FB,user123,想要做官網,50000,2023-10-01,急件,link1;link2"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
          
          {importing && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 text-center">{progress}% 完成</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            {message && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle size={16} />
                {message}
              </div>
            )}
            <button 
              disabled={importing || !csvData}
              onClick={handleImport}
              className="ml-auto flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
            >
              {importing ? '處理中...' : '開始匯入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
