
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, Lead } from "../types";

// 每次調用時確保獲取最新的 API Key
// Vite 使用 import.meta.env 來讀取環境變數
// 支援多種環境變數名稱：VITE_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY
const getAiClient = () => {
  // 調試：檢查所有可能的環境變數
  const envVars = {
    'import.meta.env.VITE_API_KEY': import.meta.env.VITE_API_KEY,
    'import.meta.env.GEMINI_API_KEY': import.meta.env.GEMINI_API_KEY,
    'import.meta.env.GOOGLE_API_KEY': import.meta.env.GOOGLE_API_KEY,
    'process.env.API_KEY': typeof process !== 'undefined' ? process.env?.API_KEY : undefined,
    'process.env.GEMINI_API_KEY': typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined,
    'process.env.GOOGLE_API_KEY': typeof process !== 'undefined' ? process.env?.GOOGLE_API_KEY : undefined,
  };
  
  console.log('🔍 檢查 API Key 環境變數:', {
    ...envVars,
    '有 VITE_API_KEY': !!import.meta.env.VITE_API_KEY,
    '有 GEMINI_API_KEY': !!import.meta.env.GEMINI_API_KEY,
    'VITE_API_KEY 長度': import.meta.env.VITE_API_KEY?.length || 0,
    'GEMINI_API_KEY 長度': import.meta.env.GEMINI_API_KEY?.length || 0,
  });
  
  const apiKey = 
    import.meta.env.VITE_API_KEY || 
    import.meta.env.GEMINI_API_KEY || 
    import.meta.env.GOOGLE_API_KEY ||
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_API_KEY);
  
  if (!apiKey) {
    console.error('❌ API Key 未找到。環境變數狀態:', envVars);
    throw new Error('請設置 API Key。請在 .env 文件中設置 VITE_API_KEY 或 GEMINI_API_KEY');
  }
  
  console.log('✅ API Key 已找到，長度:', apiKey.length, '前 10 個字符:', apiKey.substring(0, 10) + '...');
  
  return new GoogleGenAI({ apiKey });
};

export const extractLeadFromImage = async (base64Data: string): Promise<Partial<Lead>> => {
  const ai = getAiClient();
  
  // 處理 base64 前綴，確保只傳送純數據
  const cleanData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanData,
              },
            },
            {
              text: `你是一位資深助理。請從這張截圖中擷取潛在客戶的案件資訊。
              
              重要規則：
              1. 識別發布日期（如 115/01/15），請將其轉換為標準 YYYY-MM-DD (台灣民國 115年 = 2026年)。
              2. 識別平台來源 (FB, Threads, PRO360)。
              3. 擷取電話號碼、電子信箱、預算、地點。
              4. need 欄位請包含最完整的需求說明。
              
              請嚴格輸出 JSON 格式。`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            platform: { type: Type.STRING, description: "平台來源: FB, Threads, PRO360, 或 其他" },
            platform_id: { type: Type.STRING, description: "案主名稱或 ID" },
            need: { type: Type.STRING, description: "詳細需求說明" },
            budget_text: { type: Type.STRING, description: "預算金額文字" },
            posted_at: { type: Type.STRING, description: "發布日期 YYYY-MM-DD" },
            phone: { type: Type.STRING, description: "電話號碼" },
            email: { type: Type.STRING, description: "電子郵件" },
            location: { type: Type.STRING, description: "案主所在地" },
          },
          required: ["platform", "platform_id", "need"]
        }
      },
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("AI 回傳內容為空");
    
    const result = JSON.parse(textOutput.trim());
    return result;
  } catch (e: any) {
    console.error("AI Service Error:", e);
    console.error("錯誤詳情:", {
      message: e?.message,
      status: e?.status,
      statusText: e?.statusText,
      response: e?.response
    });
    
    // 檢查是否為 API Key 相關錯誤
    if (e?.message?.includes('API Key') || 
        e?.message?.includes('apiKey') || 
        e?.message?.includes('請設置 API Key') ||
        e?.status === 401 || 
        e?.status === 403 ||
        e?.response?.status === 401 ||
        e?.response?.status === 403) {
      throw new Error("API Key 未設置或無效。請在 .env 文件中設置 VITE_API_KEY 或 GEMINI_API_KEY。獲取 API Key: https://aistudio.google.com/app/apikey");
    }
    
    // 檢查是否為網路錯誤
    if (e?.message?.includes('fetch') || 
        e?.message?.includes('network') || 
        e?.message?.includes('NetworkError') ||
        e?.message?.includes('Failed to fetch')) {
      throw new Error("網路連線失敗，請檢查您的網路連線");
    }
    
    // 檢查是否為配額或限流錯誤
    if (e?.status === 429 || e?.response?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota')) {
      throw new Error("API 配額已用完或請求過於頻繁，請稍後再試");
    }
    
    // 檢查是否為圖片格式錯誤
    if (e?.message?.includes('image') || e?.message?.includes('mimeType') || e?.message?.includes('format')) {
      throw new Error("圖片格式不支援，請使用 JPG、PNG 等常見格式");
    }
    
    // 返回更具體的錯誤訊息
    const errorMsg = e?.message || e?.toString() || '未知錯誤';
    throw new Error(`AI 識別失敗：${errorMsg}。請確認網路連線、API Key 設置和圖片品質`);
  }
};
