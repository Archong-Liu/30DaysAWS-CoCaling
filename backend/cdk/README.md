# Co-Caling 日暦共編 後端（CDK）

使用 AWS CDK 建置 Cognito、API Gateway、Lambda 與 DynamoDB。
## 前置需求

1. AWS CLI 已配置憑證
2. Node.js
3. Python 3.12
4. CDK CLI：`npm install -g aws-cdk`

## 安裝依賴

```bash
pip install -r requirements.txt
```

## 部署

- 部署所有堆疊
```bash
cdk deploy --all --require-approval never
```

- 只部署 API Gateway 堆疊
```bash
cdk deploy CalendarAppApiGatewayStack --require-approval never
```

> 首次需 `cdk bootstrap`

## 架構重點

- 認證：Cognito User Pool + Hosted UI（API 使用 Cognito Authorizer）
- 資料庫：DynamoDB 單表設計
- API Gateway 路徑
  - 專案
    - `GET /projects`
    - `POST /projects`
    - `PUT /projects`
    - `DELETE /projects/{projectId}`
  - 事件
    - `GET /events`、`GET /projects/{projectId}/events`
    - `POST /events`
    - `PUT /events`
    - `DELETE /projects/{projectId}/events/{eventId}`


## 權限與 CORS

- Lambda 以最小權限授予對 DynamoDB 的存取（`grant_read_write_data`）
- API Gateway CORS 預檢允許：`*` 與常用標頭/方法

## 常見操作

- 檢視 API URL 與 ID（CDK 輸出）
- 觀察 CloudWatch Logs：檢查 Lambda 執行情況

## 清理

```bash
cdk destroy --all
```
