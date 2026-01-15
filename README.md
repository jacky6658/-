# CaseFlow CRM 技術規格文檔 (Technical Specification)

CaseFlow 是一款針對多人即時協作設計的案件管理系統，整合 AI 智能識別技術。本文檔旨在為開發人員提供系統架構、邏輯流程與未來遷移路徑的完整導覽。

---

## 🏗 1. 系統架構 (Current v2.5)

本系統目前採用 **Serverless Cloud 架構**，以前端驅動為主，雲端服務為輔。

### 核心組件：
- **Frontend**: React 19 (Hooks) + Vite (Build Tool) + Tailwind CSS (UI).
- **Persistence**: Google Cloud Firestore (NoSQL Document Store).
- **Real-time Engine**: Firestore `onSnapshot` WebSocket 監聽。
- **Auth**: Firebase Authentication (Anonymous Session + User Profile Mapping).
- **AI Core**: Gemini 3 Flash Preview (Multimodal LLM) 用於影像識別與結構化數據擷取。

---

## 🛠 2. 核心功能模組

### A. AI 處理管線 (AI Processing Pipeline)
1. **輸入**: 使用者透過 UI 上傳截圖或剪貼簿貼上 (`onPaste`)。
2. **預處理**: `leadsPage.tsx` 中的 `resizeImage` 函數進行 JPEG 壓縮（1000px 寬度），優化 Token 使用量。
3. **推論**: 呼叫 `aiService.ts`，利用 Gemini 3 Flash 配合強型別 JSON Schema 進行輸出。
4. **填充**: AI 輸出後自動映射至 `LeadModal` 欄位，由人類確認後寫入 DB。

### B. 權限控管系統 (RBAC)
- **Role.ADMIN**: 具備完整的 CRUD 權限及成員權限管理、CSV 匯入。
- **Role.REVIEWER**: 僅能進行「快速審核」、修改狀態與填寫內部備註。
- **Security Rules**: 透過 `firestore.rules` 在數據層實施強硬過濾，防止非法寫入。

---

## 📊 3. 資料庫結構 (Database Schema)

### 集合: `leads` (案件資料)
| 欄位 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | string (docId) | 唯一識別碼 |
| `platform` | Enum (FB/Threads/...) | 來源平台 |
| `need` | string | 原始需求內容 |
| `status` | Enum (LeadStatus) | 目前流程進度 |
| `decision` | Enum (Decision) | 審核結果 (Accept/Reject/Pending) |
| `links` | string[] (Base64) | 相關截圖或連結 |
| `priority` | number (1-5) | 優先級 |
| `created_at` | timestamp (ISO) | 建立時間 |

### 集合: `audit_logs` (審計日誌)
- 紀錄 `lead_id`, `actor_name`, `action` (CREATE/UPDATE/DECISION) 以及變更前後的 `diff`。

---

## 🔄 4. SQL 遷移規劃 (SQL Migration Strategy)

為了未來支援強事務 (Strong Transactions) 與複雜 JOIN 查詢，預計遷移至 **PostgreSQL**。

### 目標 SQL 模型 (ERD Reference)
1. **Table: `users`**
   - `id` (UUID), `email` (TEXT), `display_name` (TEXT), `role` (VARCHAR), `created_at` (TIMESTAMPTZ)
2. **Table: `leads`**
   - `id` (UUID), `platform` (VARCHAR), `platform_id` (VARCHAR), `need` (TEXT), `budget_text` (TEXT), `posted_at` (TIMESTAMPTZ), `status` (VARCHAR), `decision` (VARCHAR), `creator_id` (FK -> users.id)
3. **Table: `lead_attachments`**
   - `id` (UUID), `lead_id` (FK), `url` (TEXT/S3 URL), `created_at` (TIMESTAMPTZ)

### 遷移路徑：
- **階段一**: 建立 Node.js (Express) 後端並實作 Prisma ORM。
- **階段二**: 將 `leads.links` 欄位中的 Base64 數據遷移至 S3 或 Google Cloud Storage，SQL 僅存儲網址。
- **階段三**: 移除 Firebase SDK，改用標準 RESTful API 或 GraphQL。

---

## 🚀 5. 開發者快速上手

### 環境變數設定
- `process.env.API_KEY`: Google Gemini API 密鑰。
- Firebase Config: 位於 `firebase.ts` (正式版建議透過 VITE_ 變數注入)。

### 本地開發
```bash
npm install
npm run dev
```

### 部署路徑
1. **Frontend**: 可託管於 Zeabur, Vercel 或 Netlify。
2. **Database**: 需至 Firebase Console 啟用 Firestore 並貼上 `firestore.rules`。
3. **AI**: 確保 Google AI Studio 的 API Key 具備 Gemini 3 系列模型權限。

---
*Last Updated: 2025-05-20 | Architecture v2.5*
