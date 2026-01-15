
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, Lead } from "../types";

// 每次調用時確保獲取最新的 API Key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  } catch (e) {
    console.error("AI Service Error:", e);
    throw new Error("AI 識別失敗，請確認網路與圖片品質");
  }
};
