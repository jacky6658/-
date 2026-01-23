
import React, { useState, useRef } from 'react';
import { UserProfile, Lead, LeadStatus, Decision, Platform, ContactStatus } from '../types';
import { createLead } from '../services/leadService';
import { Upload, AlertCircle, CheckCircle, FileText, FileSpreadsheet } from 'lucide-react';

interface ImportPageProps {
  userProfile: UserProfile;
}

const ImportPage: React.FC<ImportPageProps> = () => {
  const [csvData, setCsvData] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [importMode, setImportMode] = useState<'csv' | 'excel'>('csv');
  const [excelFileName, setExcelFileName] = useState<string>('');
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const processLeadData = async (leadData: any, totalRows: number, currentCount: number) => {
    try {
      await createLead({
        platform: (leadData.platform || 'FB') as Platform,
        platform_id: leadData.platform_id || 'Unknown',
        contact_status: (leadData.contact_status || '未回覆') as ContactStatus,
        need: leadData.need || '',
        budget_text: leadData.budget_text || '不詳',
        posted_at: leadData.posted_at || new Date().toISOString(),
        note: leadData.note || '',
        links: leadData.links ? (typeof leadData.links === 'string' ? leadData.links.split(';') : leadData.links) : [],
        phone: leadData.phone || '',
        email: leadData.email || '',
        location: leadData.location || '',
        status: LeadStatus.TO_FILTER,
        decision: Decision.PENDING,
        priority: 3
      });
      const newCount = currentCount + 1;
      setProgress(Math.floor((newCount / totalRows) * 100));
      return newCount;
    } catch (err) {
      console.error('Import row failed', err);
      return currentCount;
    }
  };

  const handleCsvImport = async () => {
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

      count = await processLeadData(leadData, rows.length, count);
    }

    setMessage(`成功匯入 ${count} 筆案件！`);
    setImporting(false);
    setCsvData('');
  };

  const handleExcelImport = async (file: File) => {
    setImporting(true);
    setMessage('解析 Excel 檔案中...');
    setProgress(0);

    try {
      // 動態導入 xlsx 以避免瀏覽器環境問題
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 讀取第一個工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 轉換為 JSON 格式
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          setMessage('Excel 檔案中沒有資料！');
          setImporting(false);
          return;
        }

        setMessage(`正在匯入 ${jsonData.length} 筆案件...`);
        let count = 0;
        
        for (const row of jsonData) {
          const leadData: any = {};
          // 將 Excel 欄位名稱轉換為小寫並處理底線
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            leadData[normalizedKey] = (row as any)[key];
          });
          
          count = await processLeadData(leadData, jsonData.length, count);
        }

          setMessage(`成功匯入 ${count} 筆案件！`);
          setImporting(false);
          setExcelFileName('');
          if (excelFileInputRef.current) {
            excelFileInputRef.current.value = '';
          }
        } catch (err) {
          console.error('Excel import failed', err);
          setMessage('Excel 檔案解析失敗，請檢查檔案格式！');
          setImporting(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Failed to load xlsx library', err);
      setMessage('無法載入 Excel 解析庫，請重新整理頁面後再試！');
      setImporting(false);
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setExcelFileName(file.name);
        handleExcelImport(file);
      } else {
        alert('請選擇 Excel 檔案 (.xlsx 或 .xls)');
        if (excelFileInputRef.current) {
          excelFileInputRef.current.value = '';
        }
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Upload size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">批次匯入案件</h2>
            <p className="text-sm text-gray-500">支援 CSV 文字貼上或 Excel 檔案上傳來快速建立案件。</p>
          </div>
        </div>

        {/* 匯入模式選擇 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setImportMode('csv')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              importMode === 'csv'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText size={18} />
            CSV 文字貼上
          </button>
          <button
            onClick={() => setImportMode('excel')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              importMode === 'excel'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet size={18} />
            Excel 檔案上傳
          </button>
        </div>

        {importMode === 'csv' ? (
          <>
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
                  onClick={handleCsvImport}
                  className="ml-auto flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
                >
                  {importing ? '處理中...' : '開始匯入'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-blue-600 shrink-0" />
                <div className="text-xs text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">Excel 格式說明：</p>
                  <p>請確保 Excel 第一行為欄位名稱，支援的欄位包括：</p>
                  <p className="font-mono mt-1 bg-white/50 p-1 rounded">platform, platform_id, need, budget_text, posted_at, note, links, phone, email, location</p>
                  <p className="mt-2">欄位名稱不區分大小寫，空格會自動轉換為底線。</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">選擇 Excel 檔案 (.xlsx 或 .xls)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-all">
                <input
                  type="file"
                  ref={excelFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileChange}
                />
                <button
                  type="button"
                  onClick={() => excelFileInputRef.current?.click()}
                  disabled={importing}
                  className="flex flex-col items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-4 bg-emerald-50 rounded-2xl">
                    <FileSpreadsheet size={32} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">
                      {excelFileName || '點擊選擇 Excel 檔案'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">支援 .xlsx 和 .xls 格式</p>
                  </div>
                </button>
              </div>
              
              {importing && (
                <div className="space-y-2">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">{progress}% 完成</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                {message && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${
                    message.includes('成功') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {message.includes('成功') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportPage;
