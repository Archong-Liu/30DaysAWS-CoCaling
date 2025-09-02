# 部署說明

## 概述

本專案使用 AWS CDK 進行基礎設施部署，包含以下堆疊：

1. **CalendarAppDynamoDBStack** - DynamoDB 單表設計
2. **CalendarAppCognitoStack** - Cognito 用戶池
3. **CalendarAppApiGatewayStack** - API Gateway 和 Lambda 函數
4. **CalendarAppS3FrontendStack** - 前端靜態網站

## 部署順序

### 1. 準備環境

```bash
# 安裝 CDK
npm install -g aws-cdk

# 進入後端目錄
cd calendar-app/backend/cdk

# 安裝 Python 依賴
pip install -r requirements.txt

# 啟動虛擬環境（如果使用）
# source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate     # Windows
```

### 2. 部署堆疊

```bash
# 部署 DynamoDB 堆疊
cdk deploy CalendarAppDynamoDBStack

# 部署 Cognito 堆疊
cdk deploy CalendarAppCognitoStack

# 部署 API Gateway 堆疊
cdk deploy CalendarAppApiGatewayStack

# 部署前端堆疊
cdk deploy CalendarAppS3FrontendStack
```

### 3. 獲取輸出值

部署完成後，記錄以下輸出值：

```bash
# 獲取所有輸出
cdk list-exports
```

重要輸出值：
- **DynamoDB 表格名稱**
- **API Gateway URL**
- **Cognito 用戶池 ID**
- **Cognito 客戶端 ID**

## 前端配置

### 1. 創建環境變數文件

在 `calendar-app/frontend/` 目錄下創建 `.env` 文件：

```env
# AWS 配置
REACT_APP_AWS_REGION=ap-east-1

# Cognito 配置
REACT_APP_USER_POOL_ID=ap-east-1_xxxxxxxxx
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# API Gateway 配置
REACT_APP_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.ap-east-1.amazonaws.com/prod

# 應用配置
REACT_APP_DEMO_MODE=false
REACT_APP_DYNAMODB_TABLE_NAME=calendar-app-data
```

### 2. 啟動前端

```bash
cd calendar-app/frontend
npm install
npm start
```

## 測試 API

### 1. 專案管理 API

```bash
# 創建專案
curl -X POST https://your-api-gateway-url/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試專案",
    "description": "這是一個測試專案",
    "color": "#FF9900"
  }'

# 獲取專案列表
curl -X GET https://your-api-gateway-url/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. 任務管理 API

```bash
# 創建任務
curl -X POST https://your-api-gateway-url/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "測試任務",
    "description": "這是一個測試任務",
    "projectId": "project-123",
    "priority": "HIGH"
  }'

# 獲取專案任務
curl -X GET https://your-api-gateway-url/projects/project-123/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 故障排除

### 1. 常見問題

#### DynamoDB 堆疊部署失敗
```bash
# 錯誤：Cannot delete export as it is in use by CalendarAppApiGatewayStack
# 解決方案：先刪除 API Gateway 堆疊
cdk destroy CalendarAppApiGatewayStack
cdk deploy CalendarAppDynamoDBStack
cdk deploy CalendarAppApiGatewayStack
```

#### Lambda 函數權限錯誤
```bash
# 檢查 IAM 角色權限
aws iam get-role --role-name CalendarAppApiGatewayStack-ProjectManagerFunctionRole-XXXXXXXXX
```

#### CORS 錯誤
```bash
# 檢查 API Gateway CORS 配置
aws apigateway get-cors --rest-api-id YOUR_API_ID
```

### 2. 日誌查看

```bash
# 查看 Lambda 函數日誌
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/CalendarAppApiGatewayStack"

# 查看特定函數日誌
aws logs tail /aws/lambda/CalendarAppApiGatewayStack-ProjectManagerFunction-XXXXXXXXX --follow
```

### 3. 清理資源

```bash
# 刪除所有堆疊
cdk destroy --all

# 手動清理剩餘資源（如果 CDK 無法自動清理）
aws dynamodb delete-table --table-name calendar-app-data
aws cognito-idp delete-user-pool --user-pool-id YOUR_USER_POOL_ID
```

## 監控和維護

### 1. CloudWatch 指標

- **Lambda 函數執行時間**
- **API Gateway 請求數**
- **DynamoDB 讀寫容量**

### 2. 成本優化

- **DynamoDB 按需計費**
- **Lambda 函數超時設置**
- **API Gateway 快取策略**

### 3. 安全建議

- **定期輪換 API 金鑰**
- **啟用 CloudTrail 審計**
- **限制 IAM 權限範圍**

## 更新部署

### 1. 代碼更新後重新部署

```bash
# 重新部署特定堆疊
cdk deploy CalendarAppApiGatewayStack

# 或重新部署所有堆疊
cdk deploy --all
```

### 2. 回滾部署

```bash
# 回滾到上一個版本
cdk rollback CalendarAppApiGatewayStack
```

## 聯繫支持

如果遇到部署問題，請檢查：

1. **AWS 憑證配置**
2. **CDK 版本兼容性**
3. **區域設置**
4. **權限配置**

更多信息請參考：
- [AWS CDK 文檔](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda 文檔](https://docs.aws.amazon.com/lambda/)
- [DynamoDB 文檔](https://docs.aws.amazon.com/dynamodb/)
