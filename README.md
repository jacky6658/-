# CaseFlow CRM | 系統技術規格書 (Engineering Spec)

本專案為一套專為中小型團隊設計的案件管理系統，目前處於 **Stage 1 (Mocked Cloud)** 階段，旨在模擬雲端協作體驗並提供完整的 SQL 遷移技術方案。

---

## 🛠 1. 系統架構 (System Architecture)

### 前端 (Frontend)
- **Framework**: React 19 (Functional Components + Hooks)
- **UI Stack**: Tailwind CSS (JIT Engine), Lucide React (Icons)
- **Build Tool**: Vite (ESM Based)
- **State Management**: React State + Service Layer Pattern (解耦數據來源與組件渲染)

### 數據層 (Persistence Layer - Current: LocalStorage)
為了確保 demo 期間無需配置外部環境即可運行，系統目前透過 `services/` 層封裝 `localStorage`。此設計允許工程師在 **Stage 2** 輕鬆切換至實體資料庫。

---

## 📊 2. 資料庫設計與 SQL 遷移方案 (PostgreSQL Plan)

未來遷移至 **PostgreSQL** 時，建議採用以下實體模型設計：

### A. 使用者表 (`users`)
| 欄位名 | 型別 | 屬性 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | 使用者唯一識別碼 |
| `email` | TEXT | UNIQUE, NOT NULL | 登入郵件 |
| `display_name` | TEXT | NOT NULL | 顯示名稱 |
| `role` | ENUM | ADMIN / REVIEWER | 系統權限等級 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 註冊時間 |

### B. 案件表 (`leads`)
| 欄位名 | 型別 | 屬性 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | 案件識別碼 |
| `platform` | VARCHAR(20) | NOT NULL | 來源平台 (FB, Threads, etc.) |
| `platform_id` | TEXT | NOT NULL | 案主名稱 |
| `need` | TEXT | NOT NULL | 需求全文 |
| `budget_text` | TEXT | | 預算描述 |
| `status` | VARCHAR(20) | DEFAULT '待篩選' | 流程狀態 |
| `decision` | VARCHAR(20) | DEFAULT 'pending' | 審核結果 |
| `created_by` | UUID | REFERENCES users(id) | 建立人 FK |
| `assigned_to` | UUID | REFERENCES users(id) | 負責人 FK |

### C. 審計日誌 (`audit_logs`)
- 採用 `JSONB` 欄位儲存變更細節 (`before`/`after`)，以應對頻繁變動的業務邏輯。

---

## 🤖 3. AI 識別邏輯 (AI Pipeline)

系統整合 **Google Gemini 3 Flash**，核心邏輯位於 `services/aiService.ts`：
1. **傳輸**: 採用 Base64 影像數據。
2. **Schema Control**: 強制 LLM 輸出符合 `JSON Schema` 的結構化數據，確保前端表單能精確對應。
3. **優化**: 在傳送 AI 之前，前端會自動進行圖片壓縮（`leadsPage.tsx` 中的 `resizeImage`），降低延遲並節省 Token。

---

## 🚀 4. 開發者查閱指引

### 環境需求
- **API Key**: 必須設定 `process.env.API_KEY` 以啟用 AI 識別功能。
- **Browser**: 支援現代瀏覽器 (ES2022+)。

### 啟動開發環境
```bash
npm install
npm run dev
```

### 遷移至 PostgreSQL 步驟
1. 建立後端 API (建議使用 Node.js / Go)。
2. 導入 **Prisma** 或 **TypeORM** 定義上述 Schema。
3. 修改 `services/leadService.ts` 中的 `fetch` 與 `save` 邏輯，改為呼叫後端 REST API。

---
*Last Updated: 2025-05-21 | Architecture v2.5.2 (Mocked-Ready)*
