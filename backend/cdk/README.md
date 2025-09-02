# Calendar App CDK 部署說明

## 前置需求

1. 安裝 AWS CLI 並設定認證
2. 安裝 Node.js (CDK 需要)
3. 安裝 Python 3.8+
4. 安裝 CDK CLI: `npm install -g aws-cdk`

## 安裝依賴

```bash
pip install -r requirements.txt
```

## 部署步驟

1. **初始化 CDK (首次使用)**
   ```bash
   cdk bootstrap
   ```

2. **部署所有堆疊**
   ```bash
   cdk deploy --all
   ```

3. **部署特定堆疊**
   ```bash
   cdk deploy CalendarAppCognitoStack
   cdk deploy CalendarAppDynamoDBStack
   cdk deploy CalendarAppApiGatewayStack
   cdk deploy CalendarAppS3FrontendStack
   ```

## 堆疊說明

- **CognitoStack**: 用戶認證與授權
- **DynamoDBStack**: 資料儲存
- **ApiGatewayStack**: API 服務
- **S3FrontendStack**: 前端靜態檔案託管

## 清理資源

```bash
cdk destroy --all
```
