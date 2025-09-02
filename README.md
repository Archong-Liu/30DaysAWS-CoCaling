# 📅 CalendarApp - 多用戶週曆平台

一個基於 AWS 雲端服務的現代化日曆應用，支援多用戶管理個人和團隊事件。

## 🚀 功能特色

- 📅 **完整的日曆視圖** - 月、週、日、列表視圖
- 🔐 **安全的用戶認證** - AWS Cognito 整合
- 📱 **響應式設計** - 支援桌面和行動裝置
- ⚡ **即時同步** - 事件即時更新
- 🎨 **現代化 UI** - 美觀的使用者介面
- 🔄 **自動部署** - CI/CD 流程

## 🏗️ 架構概覽

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │    │  API Gateway    │    │   Lambda 函數   │
│   (S3 + CF)     │◄──►│   (Cognito)     │◄──►│   (DynamoDB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技術棧

**前端**
- React 18
- FullCalendar
- AWS Amplify
- CSS3

**後端**
- AWS Lambda (Python)
- Amazon DynamoDB
- Amazon API Gateway
- AWS Cognito

**基礎設施**
- AWS CDK (Python)
- Amazon S3
- Amazon CloudFront
- GitHub Actions

## 📁 專案結構

```
calendar-app/
├── backend/                    # 後端程式碼
│   ├── cdk/                    # CDK 堆疊定義
│   │   ├── stacks/             # 各服務的 CDK 堆疊
│   │   │   ├── cognito_stack.py
│   │   │   ├── dynamodb_stack.py
│   │   │   ├── api_gateway_stack.py
│   │   │   └── s3_frontend_stack.py
│   │   ├── app.py              # CDK 應用入口
│   │   ├── requirements.txt    # Python 依賴
│   │   └── README.md           # CDK 部署說明
│   └── lambda/                 # Lambda 函數程式碼
│       ├── get_calendars/
│       └── add_event/
├── frontend/                   # 前端程式碼
│   ├── src/
│   │   ├── components/
│   │   │   └── Calendar.js     # FullCalendar 組件
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── README.md              # 前端部署說明
├── docs/                      # 文件
│   ├── day_14_cognito.md      # 鐵人賽文章
│   ├── day_15_dynamodb.md
│   └── day_17_frontend.md
├── .github/                   # CI/CD 設定
│   └── workflows/
│       └── deploy.yml         # GitHub Actions
├── README.md                  # 專案總覽
├── LICENSE                    # 授權
└── .gitignore                 # Git 忽略檔案
```

## 🚀 快速開始

### 前置需求

1. **AWS CLI** 並設定認證
2. **Node.js** 16+
3. **Python** 3.9+
4. **CDK CLI**: `npm install -g aws-cdk`

### 1. 克隆專案

```bash
git clone https://github.com/your-username/calendar-app.git
cd calendar-app
```

### 2. 部署後端

```bash
cd backend/cdk
pip install -r requirements.txt
cdk bootstrap  # 首次使用
cdk deploy --all
```

### 3. 設定前端環境變數（統一版）

建立 `frontend/.env` 檔案（與程式實際使用一致）：

```env
# 基礎區域
REACT_APP_AWS_REGION=ap-east-1

# Cognito（使用 Hosted UI）
REACT_APP_USER_POOL_ID=ap-east-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_IDENTITY_POOL_ID=ap-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REACT_APP_COGNITO_DOMAIN=your-domain-prefix.auth.ap-east-1.amazoncognito.com
REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000/

# API Gateway
REACT_APP_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.ap-east-1.amazonaws.com/prod

# 開發便利（可選）
REACT_APP_DEMO_MODE=false
```

說明：
- 本專案前端透過 AWS Amplify v6 使用 Cognito Hosted UI 完成認證；請務必設定 `REACT_APP_COGNITO_DOMAIN`、`REACT_APP_REDIRECT_SIGN_IN`、`REACT_APP_REDIRECT_SIGN_OUT`。
- 若需快速展示功能，可將 `REACT_APP_DEMO_MODE=true` 啟用 Demo 模式（以本地假資料與免後端路徑執行）。

### 4. 啟動前端開發伺服器

```bash
cd frontend
npm install
npm start
```

應用將在 http://localhost:3000 啟動

## 📚 文件


### 環境與配置
- 前端配置詳見 `frontend/config.md`（已與此 README 同步）。

### 架構與最佳實踐
- 參考 `docs/architecture_best_practices.md`。

## 🔧 開發指南

### 本地開發

1. **後端開發**
   ```bash
   cd backend/cdk
   cdk synth  # 生成 CloudFormation 模板
   cdk diff   # 查看變更
   ```

2. **前端開發**
   ```bash
   cd frontend
   npm start  # 開發伺服器
   npm test   # 執行測試
   npm run build  # 建置生產版本
   ```

### 測試

```bash
# 後端測試
cd backend/cdk
python -m pytest tests/ -v

# 前端測試
cd frontend
npm test
```

## 🚀 部署

### 自動部署 (推薦)

推送到 `main` 分支將自動觸發部署：

```bash
git add .
git commit -m "Add new feature"
git push origin main
```

### 手動部署

```bash
# 部署後端
cd backend/cdk
cdk deploy --all

# 部署前端
cd frontend
npm run build
aws s3 sync build/ s3://your-bucket-name --delete
```

## 🔒 安全性

- 所有 API 端點都需要 Cognito 認證
- DynamoDB 使用 IAM 角色進行存取控制
- 前端透過 HTTPS 提供服務
- 環境變數用於敏感資訊管理

## 📊 監控

- CloudWatch 日誌和指標
- DynamoDB 效能監控
- API Gateway 存取日誌
- CloudFront 快取統計

## 🤝 貢獻

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

- [AWS CDK](https://aws.amazon.com/cdk/)
- [React](https://reactjs.org/)
- [FullCalendar](https://fullcalendar.io/)
- [AWS Amplify](https://aws.amazon.com/amplify/)

## 📞 支援

如有問題或建議，請開啟 [Issue](https://github.com/your-username/calendar-app/issues)

---

**標籤**: #AWS #React #CDK #DynamoDB #Cognito #日曆應用
