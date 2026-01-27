# AI案件管理系統 | 開發者技術手冊 (Developer Specification)

本專案是一套基於 React 19 的「多人即時協作案件管理系統」。專為 AI 案件管理設計，採用 **Service Pattern** 以利從 LocalStorage 無縫遷移至 **PostgreSQL**。

---

## 🚀 快速開始 (Quick Start)

### 1. 安裝依賴
```bash
npm install
```

### 2. 設置環境變數（可選）

#### 後端 API 設置（雲端部署）
如果使用雲端 PostgreSQL 後端，需要設置後端 API URL：

在專案根目錄創建 `.env` 文件：
```env
VITE_API_URL=https://your-backend-url.com
```

#### OCR 功能設置（可選）
OCR 截圖識別功能使用 Tesseract.js（客戶端 OCR），無需 API Key。

**注意**：
- `.env` 文件已加入 `.gitignore`，不會被提交到版本控制
- 如果沒有設置 `VITE_API_URL`，系統會自動降級到 localStorage 模式
- OCR 功能完全在客戶端運行，不需要額外配置

### 3. 啟動開發伺服器
```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 啟動。

### 4. 登入系統
系統預設提供以下用戶：
- **管理員**: `admin` / `admin123`
- **審核員**: `phoebe` / `phoebe123`, `jacky` / `jacky123`, `jim` / `jim123`

---

## 🏗️ 專案架構 (Project Structure)

專案採用「層次化架構 (Layered Architecture)」，確保邏輯與渲染完全分離：

```
├── /components          # 純 UI 元件（Presentation Layer）
│   ├── Badge.tsx
│   ├── DecisionModal.tsx
│   ├── KanbanBoard.tsx
│   ├── LeadModal.tsx
│   └── Sidebar.tsx
├── /pages              # 頁面路由與佈局組件
│   ├── AnalyticsPage.tsx      # 財務分析
│   ├── AuditLogsPage.tsx     # 操作紀錄
│   ├── HelpPage.tsx          # 使用說明
│   ├── KanbanPage.tsx        # 流程看板
│   ├── LeadsPage.tsx         # 案件總表
│   ├── LoginPage.tsx         # 登入頁面
│   ├── MembersPage.tsx       # 成員管理
│   ├── MigrationPage.tsx     # 資料遷移
│   └── ReviewPage.tsx        # 待我審核
├── /services            # 核心邏輯層 (Business Logic)
│   ├── aiService.ts          # OCR 識別服務
│   ├── apiConfig.ts          # API 配置
│   ├── auditService.ts       # 審計日誌服務
│   ├── leadService.ts        # 案件 CRUD 服務
│   ├── onlineService.ts      # 在線狀態服務
│   └── userService.ts        # 用戶服務
├── /backend             # Node.js 後端 API
│   ├── server.js             # Express 伺服器
│   └── package.json
├── /scripts             # 資料庫腳本
│   ├── init-database.sql     # 初始化資料庫
│   └── update-status-names.sql # 狀態名稱遷移
├── types.ts             # 全域型別定義
├── constants.ts         # 常數定義
└── mockBackend.ts       # 模擬後端橋接器
```

---

## 🛠️ 核心功能模組說明

### A. OCR 截圖識別 (`services/aiService.ts`)
- **輸入**: 圖片 Base64（支援剪貼簿貼上、檔案上傳或拖放）
- **處理**: 
  1. 前端預先 Resize（減少處理時間）
  2. 使用 Tesseract.js 進行 OCR 文字識別
  3. 解析識別結果並提取案件資訊
- **輸出**: 自動填充至 `LeadModal` 欄位
- **特點**: 完全客戶端運行，無需 API Key

### B. 資料持久化與訂閱 (`services/leadService.ts`)
- **現狀**: 
  - 支援雙模式：API 模式（PostgreSQL）和 localStorage 模式（降級方案）
  - 自動檢測 `VITE_API_URL` 環境變數決定使用模式
  - API 模式下每 5 秒輪詢更新
  - localStorage 模式下使用 `window.dispatchEvent` 模擬多視窗即時同步
- **遷移路徑**: 設置 `VITE_API_URL` 環境變數即可自動切換到 API 模式

### C. 案件狀態管理
系統支援以下案件狀態：
- **待篩選**: 新案件，等待初步評估
- **已接洽**: 已與客戶聯繫
- **報價中**: 正在準備或已提交報價
- **製作中**: 案件正在執行
- **已成交**: 案件已完成並成交
- **結案**: 案件已結束
- **取消**: 未使用 Pro360 索取個資的案件（不計入財務統計）
- **婉拒/無法聯繫**: 已使用 Pro360 索取個資但無法聯繫或決定不做（計入財務統計）

### D. 財務分析 (`pages/AnalyticsPage.tsx`)
- **成本記錄**: 記錄每個案件的各項成本（Gemini AI、Cursor、Zeabur、人力、Pro360 等）
- **利潤記錄**: 記錄每個案件的各項利潤
- **統計分析**: 
  - 總成本、總利潤、淨利潤、利潤率
  - 各案件成本與利潤明細
  - 成本名目分析、利潤名目分析
- **權限**: 所有用戶都可以查看財務分析

### E. 權限控管 (RBAC)
- **管理員 (ADMIN)**: 
  - 所有功能權限
  - 可以刪除進度更新、成本記錄、利潤記錄
  - 可以管理成員、匯入案件、資料遷移
- **審核員 (REVIEWER)**: 
  - 可以查看和編輯案件
  - 可以進行審核決定（接受、取消、待問、婉拒/未聯繫）
  - 可以查看財務分析和操作紀錄
  - 無法刪除記錄（僅管理員可刪除）

---

## 📊 資料庫結構 (PostgreSQL)

### 初始化資料庫
執行 `scripts/init-database.sql` 創建完整的資料庫結構：

```sql
-- 主要表結構
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'REVIEWER')) DEFAULT 'REVIEWER',
  avatar TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  case_code TEXT,                    -- 案件編號（例如：aijob-001）
  platform TEXT NOT NULL DEFAULT 'FB',
  platform_id TEXT,
  need TEXT NOT NULL,
  budget_text TEXT,
  posted_at TIMESTAMPTZ,
  phone TEXT,
  email TEXT,
  location TEXT,
  estimated_duration TEXT,           -- 預計製作週期
  contact_method TEXT,               -- 客戶聯繫方式
  note TEXT,
  internal_remarks TEXT,
  remarks_author TEXT,
  status TEXT DEFAULT '待篩選',
  decision TEXT DEFAULT 'pending',
  decision_by TEXT,
  reject_reason TEXT,
  review_note TEXT,
  assigned_to TEXT,
  assigned_to_name TEXT,
  priority INTEGER DEFAULT 3,
  created_by TEXT,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_action_by TEXT,
  contact_status TEXT DEFAULT '未回覆',
  progress_updates JSONB,            -- 近期進度更新
  change_history JSONB,              -- 修改歷史記錄
  cost_records JSONB,                -- 成本記錄
  profit_records JSONB,              -- 利潤記錄
  contracts JSONB,                   -- 合約文件
  links JSONB                         -- 圖片連結
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  actor_uid TEXT,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 狀態名稱遷移
如果資料庫中有舊的狀態名稱，執行 `scripts/update-status-names.sql` 進行遷移：
- 「拒絕」→「取消」
- 「婉拒」→「婉拒/無法聯繫」

---

## 🔧 後端 API 設置

### 後端伺服器 (`backend/server.js`)
- **技術棧**: Node.js + Express + PostgreSQL (`pg`)
- **主要端點**:
  - `GET /api/leads` - 獲取所有案件
  - `POST /api/leads` - 創建新案件
  - `PUT /api/leads/:id` - 更新案件
  - `DELETE /api/leads/:id` - 刪除案件
  - `GET /api/users` - 獲取所有用戶
  - `POST /api/users` - 創建用戶
  - `PUT /api/users/:id` - 更新用戶
  - `GET /api/audit-logs` - 獲取審計日誌
  - `POST /api/migrate-local-data` - 遷移本地資料到雲端

### 環境變數設置
後端需要設置以下環境變數：
```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
PORT=3001
```

### 啟動後端
```bash
cd backend
npm install
npm start
```

---

## 📱 主要功能說明

### 1. 案件總表 (`pages/LeadsPage.tsx`)
- 查看所有案件列表
- 支援搜尋（案件編號、案主名稱、需求內容、電話、Email、地點）
- 支援排序（所有欄位，預設按建立時間降序）
- OCR 截圖識別快速匯入
- URL 匯入（PRO360）
- 快速審核（接受/取消）
- 點擊案件行直接開啟詳情

### 2. 流程看板 (`pages/KanbanPage.tsx`)
- 視覺化展示案件在各個階段的分布
- 拖放移動案件狀態
- 右鍵選單快速變更狀態
- 狀態說明：
  - 取消：未使用 Pro360 索取個資
  - 婉拒/無法聯繫：已使用 Pro360 索取個資

### 3. 待我審核 (`pages/ReviewPage.tsx`)
- 顯示待篩選案件和指派給當前用戶的案件
- 審核決定選項：
  - ✅ 接受：案件狀態變更為「已接洽」
  - ❌ 取消：案件狀態變更為「取消」（未使用 Pro360）
  - 🟡 待問：需要進一步確認，狀態保持不變
  - 🟠 婉拒/未聯繫：案件狀態變更為「婉拒/無法聯繫」（已使用 Pro360）

### 4. 財務分析 (`pages/AnalyticsPage.tsx`)
- 統計資訊：取消案件、婉拒/無法聯繫案件、接受案件、正在執行案件
- 財務統計：總成本、總利潤、淨利潤、利潤率
- 各案件成本與利潤明細（可點擊查看詳情）
- 成本名目分析、利潤名目分析
- 排除「取消」狀態的案件，但包含「婉拒/無法聯繫」狀態的案件

### 5. 使用說明 (`pages/HelpPage.tsx`)
- 完整的功能介紹與操作指南
- 快速導覽
- 常見問題解答

### 6. 操作紀錄 (`pages/AuditLogsPage.tsx`)
- 查看所有系統操作歷史記錄
- 顯示操作人、操作時間、操作類型、變更內容

### 7. 成員管理 (`pages/MembersPage.tsx`)
- 僅管理員可訪問
- 管理系統用戶
- 設置用戶角色、頭像、狀態

### 8. 資料遷移 (`pages/MigrationPage.tsx`)
- 僅管理員可訪問
- 將本地 localStorage 資料遷移到 PostgreSQL
- 一鍵自動匯入

---

## 🔑 案件編號系統

系統自動為每個新案件生成唯一編號：
- 格式：`aijob-001`, `aijob-002`, `aijob-003`...
- 自動遞增，確保唯一性
- 在案件總表中顯示

---

## 💰 成本與利潤管理

### 預設成本項目
- Gemini AI 使用費用
- Cursor 開發軟體費用
- Zeabur 雲端部署費用
- 預估人力費用
- Pro360 索取個資成本

### 成本記錄規則
- 「取消」狀態的案件不計入財務統計（未使用 Pro360）
- 「婉拒/無法聯繫」狀態的案件計入財務統計（已使用 Pro360）
- 所有用戶可以新增成本/利潤記錄
- 僅管理員可以刪除成本/利潤記錄

---

## 🚀 部署說明

### 前端部署（Zeabur / Vercel / Netlify）
1. 設置環境變數 `VITE_API_URL` 指向後端 API
2. 執行 `npm run build`
3. 部署 `dist` 目錄

### 後端部署
1. 設置環境變數（`DATABASE_URL`, `NODE_ENV`, `PORT`）
2. 執行 `npm install`
3. 執行 `npm start`

### 資料庫初始化
1. 連接 PostgreSQL 資料庫
2. 執行 `scripts/init-database.sql`
3. （可選）執行 `scripts/update-status-names.sql` 遷移舊資料

---

## 📝 開發注意事項

1. **狀態管理**: 使用 `services/leadService.ts` 的 `subscribeToLeads` 訂閱案件更新
2. **API 模式**: 系統會自動檢測 `VITE_API_URL`，如果未設置則降級到 localStorage
3. **錯誤處理**: API 失敗時會自動降級到 localStorage，確保系統可用性
4. **資料同步**: API 模式下每 5 秒輪詢更新，localStorage 模式下使用事件系統
5. **型別安全**: 所有資料結構定義在 `types.ts`，確保型別一致性

---

## 🐛 常見問題

### Q: OCR 識別不準確怎麼辦？
A: OCR 識別結果僅供參考，請手動檢查並修正。建議使用清晰、文字完整的截圖。

### Q: 成本記錄消失了？
A: 請確認案件狀態不是「取消」。如果問題持續，請檢查瀏覽器控制台的錯誤訊息。

### Q: 如何區分「取消」和「婉拒/無法聯繫」？
A: 「取消」用於沒有產生任何成本的案件（未使用 Pro360 索取個資）。「婉拒/無法聯繫」用於已經產生成本但評估後決定不做或無法聯繫的案件（已使用 Pro360 索取個資）。

---

## 📄 授權

*專案負責人: Senior Full-stack Engineer*

---

## 🔄 更新日誌

### v3.0.0
- 系統名稱改為「AI案件管理系統」
- 新增 OCR 截圖識別功能（Tesseract.js）
- 新增財務分析功能
- 新增成本與利潤記錄功能
- 新增案件編號自動生成（aijob-XXX）
- 狀態名稱更新：「拒絕」→「取消」，「婉拒」→「婉拒/無法聯繫」
- 新增使用說明頁面
- 優化資料同步機制
- 改進錯誤處理和降級機制
