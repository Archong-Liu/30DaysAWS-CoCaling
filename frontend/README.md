# Co-Caling 日暦共編 前端

React 前端，使用 AWS Amplify（v6）整合 Cognito Hosted UI 進行登入，透過 API Gateway + Lambda 與後端溝通。

## 快速開始

```bash
npm install
npm start
```

## 必要環境變數（.env）

- `REACT_APP_API_GATEWAY_URL`：後端 API 網關 URL（如 `https://xxxx.execute-api.ap-northeast-1.amazonaws.com/prod`）
- `REACT_APP_COGNITO_DOMAIN`：Cognito Hosted UI 的 domain（如 `https://your-domain.auth.ap-northeast-1.amazoncognito.com`）
- `REACT_APP_DEMO_MODE`：`true`/`false`，Demo 模式會跳過實際 API 呼叫

> Amplify Auth 其餘設定（如回呼 URL）位於 `src/index.js`。

## 認證

- Cognito Hosted UI；登入/登出由 Amplify Auth 處理。
- `src/hooks/useAuth.js` 提供 `isAuthenticated`、`user`、`handleSignIn`、`handleSignOut`

## 前端架構與模組

- Hooks
  - `useAuth`：認證
  - `useProject`：專案清單/CRUD，含 `isMutating` 過渡狀態
  - `useEvent`：事件清單/CRUD，含 `isMutating` 過渡狀態與雙次重取資料
  - `useConfirm`：統一的確認對話框 Hook
- Services
  - `apiClient.js`：封裝 Amplify API 調用
  - `dataService.js`：包裝業務語意與容錯
- Components
  - `Dashboard.js`：專案列表，整卡點擊進入日曆，右上角動作按鈕（檢視/邀請/刪除）
  - `Calendar.js`：FullCalendar 事件視圖
  - `common/ConfirmDialog.js`：確認對話框

## UI 過渡加載

- `useProject` 與 `useEvent` 在新增/更新/刪除時設定 `isMutating=true`，頁面顯示「正在更新」提示，完成後自動重取並更新畫面。

## 主要 API 路徑（前端呼叫）

- 專案
  - `GET /projects`
  - `POST /projects`
  - `PUT /projects`（id 於 body）
  - `DELETE /projects/{projectId}`（RESTful 路徑）
- 事件
  - `GET /events` 或 `GET /projects/{projectId}/events`
  - `POST /events`
  - `PUT /events`（id 於 body）
  - `DELETE /projects/{projectId}/events/{eventId}`（RESTful 路徑）

> 刪除專案與事件均為 RESTful 路徑。

## 常見操作

- 啟動：`npm start`
- 打包：`npm run build`
- 登入：按「登入」使用 Cognito Hosted UI 完成授權

## 位置說明

- 程式入口：`src/App.js`
- API 呼叫：`src/services/apiClient.js`
- UI 組件：`src/components/*`
- 狀態邏輯：`src/hooks/*`
