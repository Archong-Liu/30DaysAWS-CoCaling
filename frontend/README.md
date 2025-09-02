# 多用戶週曆平台前端（精簡版）

本檔已精簡，完整說明請參閱主專案說明：`../README.md`。

## 快速開始

```bash
npm install
npm start
```

## 配置

- 請依 `../README.md` 的「設定前端環境變數（統一版）」建立 `frontend/.env`。
- 前端使用 Cognito Hosted UI 進行認證（需設定 `REACT_APP_COGNITO_DOMAIN` 與 Redirect URL）。
- 進階配置與除錯請見 `./config.md`。

## 技術

- React 18、AWS Amplify v6、FullCalendar。
- 與後端透過 API Gateway + Lambda 整合，採單表設計（DynamoDB）。
