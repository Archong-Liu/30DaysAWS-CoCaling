# 前端配置說明

## 環境變數配置（與程式一致）

在 `frontend/.env` 建立以下配置：

### AWS 區域
```env
REACT_APP_AWS_REGION=ap-east-1
```

### Cognito（Hosted UI）
```env
REACT_APP_USER_POOL_ID=ap-east-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_IDENTITY_POOL_ID=ap-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REACT_APP_COGNITO_DOMAIN=your-domain-prefix.auth.ap-east-1.amazoncognito.com
REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000/
```

### API Gateway
```env
REACT_APP_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.ap-east-1.amazonaws.com/prod
```

### 應用模式（可選）
```env
REACT_APP_DEMO_MODE=false
```

## Demo 模式

設置 `REACT_APP_DEMO_MODE=true` 可：

- 自動以示範帳號流程體驗（無需實際 Cognito 登入）
- 使用本地假資料，不連後端 API
- 方便前端單獨開發與展示

## 生產環境配置

生產環境建議：

```env
REACT_APP_DEMO_MODE=false
REACT_APP_REDIRECT_SIGN_IN=https://your-domain.example.com/
REACT_APP_REDIRECT_SIGN_OUT=https://your-domain.example.com/
REACT_APP_API_GATEWAY_URL=https://your-api-gateway-url
```

## 配置驗證

啟動應用後，檢查瀏覽器控制台：

1. **認證狀態**：確認 Cognito 連接正常
2. **API 連接**：確認 API Gateway 可訪問
3. **資料載入**：確認數據服務正常工作

## 故障排除

### 常見問題

1. **CORS 錯誤**
   - 檢查 API Gateway CORS 配置
   - 確認域名白名單

2. **認證失敗**
   - 檢查 Cognito 配置
   - 確認用戶池狀態

3. **API 調用失敗**
   - 檢查 API Gateway URL
   - 確認 Lambda 函數權限

### 除錯技巧

- 使用瀏覽器開發者工具
- 檢查網路請求狀態
- 查看控制台錯誤訊息
- 驗證 Cognito Hosted UI 參數（Domain、Redirect URL）
