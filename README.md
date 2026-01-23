# CaseFlow CRM | 開發者技術手冊 (Developer Specification)

本專案是一套基於 React 19 的「多人即時協作 CRM」。專為工程師設計，採用 **Service Pattern** 以利未來從 LocalStorage 無縫遷移至 **PostgreSQL**。

---

## 🚀 快速開始 (Quick Start)

### 1. 安裝依賴
```bash
npm install
```

### 2. 設置 AI 傳圖識別功能（可選）

AI 傳圖識別功能需要 Google Gemini API Key。設置步驟：

1. **獲取 API Key**
   - 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)
   - 登入您的 Google 帳號
   - 點擊「Create API Key」創建新的 API Key

2. **設置環境變數**
   - 在專案根目錄創建 `.env` 文件
   - 添加以下內容：
   ```env
   VITE_API_KEY=your-api-key-here
   ```
   - 將 `your-api-key-here` 替換為您獲取的 API Key

3. **重啟開發伺服器**
   ```bash
   npm run dev
   ```

**注意**：
- `.env` 文件已加入 `.gitignore`，不會被提交到版本控制
- 如果沒有設置 API Key，AI 傳圖識別功能將無法使用，但其他功能正常運作
- 您也可以使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 作為環境變數名稱

### 3. 啟動開發伺服器
```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 啟動。

---

## 🏗️ 1. 專案架構 (Project Structure)

專案採用「層次化架構 (Layered Architecture)」，確保邏輯與渲染完全分離：

- `/components`: 純 UI 元件（Presentation Layer）。
- `/pages`: 頁面路由與佈局組件。
- `/services`: **核心邏輯層 (Business Logic)**。所有 DB 讀寫、AI 調用都在此處理。
- `/types.ts`: 全域型別定義。所有數據結構以此為準（Single Source of Truth）。
- `/firebase.ts`: 模擬後端橋接器 (Mock Auth/DB Interface)。

---

## 🛠️ 2. 核心功能模組說明

### A. AI 識別管線 (`services/aiService.ts`)
- **輸入**: 圖片 Base64 (支援剪貼簿貼上或檔案上傳)。
- **處理**: 
  1. 前端預先 Resize (減少傳輸大小)。
  2. 呼叫 Gemini 3 Flash，並套用強型別 JSON Schema。
- **輸出**: 自動填充至 `LeadModal` 欄位。

### B. 資料持久化與訂閱 (`services/leadService.ts`)
- 現狀：透過 `localStorage` 儲存，並使用 `window.dispatchEvent` 模擬多視窗即時同步。
- 遷移路徑：將 `getLeads` 內的 `localStorage` 操作改為 `fetch` 呼叫 API 即可。

### C. 權限控管 (RBAC)
- 透過 `UserProfile` 內的 `role` (ADMIN/REVIEWER) 判斷。
- 管理員 (ADMIN): 具備全權限。
- 夥伴 (REVIEWER): 僅能針對「待篩選」案件進行審核動作 (Decision)。

---

## 📊 3. PostgreSQL 實作建議 (ERD)

未來遷移至後端時，請參考以下結構建立 DB：

```sql
-- 1. 使用者 (Users)
CREATE TABLE users (
  uid UUID PRIMARY KEY,
  displayName TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role VARCHAR(10) CHECK (role IN ('ADMIN', 'REVIEWER')),
  createdAt TIMESTAMP DEFAULT NOW()
);

-- 2. 案件 (Leads)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(20) NOT NULL,
  platformId TEXT NOT NULL,
  need TEXT NOT NULL,
  budgetText TEXT,
  phone VARCHAR(20),
  email TEXT,
  location TEXT,
  status VARCHAR(20) DEFAULT '待篩選',
  decision VARCHAR(10) DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  createdBy UUID REFERENCES users(uid),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- 3. 審計 (Audit Logs)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  leadId UUID REFERENCES leads(id),
  actorUid UUID REFERENCES users(uid),
  action VARCHAR(20),
  diff JSONB, -- 儲存變更前後的欄位
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 4. 如何啟動

1. **安裝依賴**: `npm install` (已移除所有 Firebase 實體套件，避免 Registry 錯誤)。
2. **啟動**: `npm run dev`。
3. **登入測試**: 
   - 名稱輸入 `admin` -> 獲得管理員權限。
   - 名稱隨意輸入 -> 獲得一般夥伴權限。

---
*專案負責人: Senior Full-stack Engineer*
