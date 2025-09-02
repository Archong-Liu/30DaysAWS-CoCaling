# API 響應格式測試指南

## 概述

本文檔說明如何測試和驗證前端 DataService 與後端 Lambda 函數之間的響應格式一致性，解決 "Unexpected API response format" 錯誤。

## 問題分析

### 原始問題
前端 `dataService.js` 在創建專案時會拋出 "Unexpected API response format" 錯誤，原因是：

1. **後端響應格式不一致**：不同的 Lambda 函數使用不同的響應格式
2. **前端解析邏輯不健壯**：沒有處理所有可能的響應格式
3. **API 客戶端解析問題**：`parseResponse` 方法可能沒有正確解析 Lambda 響應

### 已修復的問題
1. ✅ 統一了所有 Lambda 函數的響應格式
2. ✅ 改進了前端的響應處理邏輯
3. ✅ 修復了 API 客戶端的響應解析

## 響應格式標準

### 成功響應格式
```json
{
  "statusCode": 200/201,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Credentials": "true"
  },
  "body": "{\"message\":\"Success\",\"data\":{...}}"
}
```

### 錯誤響應格式
```json
{
  "statusCode": 400/403/500,
  "headers": {...},
  "body": "{\"error\":\"Error message\",\"details\":\"...\"}"
}
```

## 測試步驟

### 1. 測試專案創建 API

#### 後端測試
```bash
# 使用 AWS CLI 測試 Lambda 函數
aws lambda invoke \
  --function-name project_manager \
  --payload '{"httpMethod":"POST","body":"{\"name\":\"測試專案\",\"description\":\"測試描述\",\"color\":\"#FF9900\"}"}' \
  response.json

# 檢查響應
cat response.json
```

**預期響應**：
```json
{
  "statusCode": 201,
  "headers": {...},
  "body": "{\"message\":\"Project created successfully\",\"project\":{\"id\":\"project-123\",\"name\":\"測試專案\",\"description\":\"測試描述\",\"color\":\"#FF9900\",\"ownerId\":\"user-456\"}}"
}
```

#### 前端測試
```javascript
// 在瀏覽器控制台測試
const dataService = new DataService(apiClient);
const projectData = {
  name: '測試專案',
  description: '測試描述',
  color: '#FF9900'
};

try {
  const result = await dataService.createProject(projectData);
  console.log('Project created:', result);
} catch (error) {
  console.error('Error:', error);
}
```

**預期結果**：
```javascript
{
  id: "project-123",
  name: "測試專案",
  description: "測試描述",
  color: "#FF9900",
  ownerId: "user-456"
}
```

### 2. 測試事件創建 API

#### 後端測試
```bash
aws lambda invoke \
  --function-name add_event \
  --payload '{"body":"{\"title\":\"測試事件\",\"startDate\":\"2024-01-01T09:00:00Z\",\"endDate\":\"2024-01-01T10:00:00Z\"}"}' \
  event_response.json
```

#### 前端測試
```javascript
const eventData = {
  title: '測試事件',
  startDate: '2024-01-01T09:00:00Z',
  endDate: '2024-01-01T10:00:00Z'
};

try {
  const result = await dataService.createEvent(eventData);
  console.log('Event created:', result);
} catch (error) {
  console.error('Error:', error);
}
```

### 3. 測試專案查詢 API

#### 後端測試
```bash
aws lambda invoke \
  --function-name project_manager \
  --payload '{"httpMethod":"GET"}' \
  projects_response.json
```

#### 前端測試
```javascript
try {
  const projects = await dataService.getProjectsByUser('user-123');
  console.log('Projects:', projects);
} catch (error) {
  console.error('Error:', error);
}
```

## 調試技巧

### 1. 啟用詳細日誌
```javascript
// 在 dataService.js 中添加詳細日誌
console.log('Raw API response:', result);
console.log('Response type:', typeof result);
console.log('Response keys:', Object.keys(result || {}));
```

### 2. 檢查 API 客戶端響應
```javascript
// 在 apiClient.js 中添加響應解析日誌
console.log('Original response:', response);
console.log('Parsed response:', parsedResponse);
```

### 3. 使用瀏覽器開發者工具
- 在 Network 標籤中檢查 API 請求
- 在 Console 中查看日誌輸出
- 使用斷點調試響應處理邏輯

## 常見問題和解決方案

### 1. "Unexpected API response format" 錯誤

**原因**：響應格式不符合前端期望
**解決方案**：
```javascript
// 在 dataService.js 中添加更多響應格式檢查
if (result && result.project) {
  return result.project;
} else if (result && result.message) {
  // 處理只有消息的響應
  return this.createFallbackProject(projectData);
} else if (result && result.success) {
  // 處理成功標誌響應
  return this.createFallbackProject(projectData);
} else {
  console.error('Unexpected response:', result);
  throw new Error(`Unexpected API response format: ${JSON.stringify(result)}`);
}
```

### 2. 響應解析失敗

**原因**：API 客戶端沒有正確解析 Lambda 響應
**解決方案**：
```javascript
// 在 apiClient.js 中改進響應解析
parseResponse(response) {
  console.log('Parsing response:', response);
  
  // 處理 Lambda 響應
  if (response.statusCode && response.body) {
    try {
      return JSON.parse(response.body);
    } catch (e) {
      console.error('Failed to parse response body:', e);
      return response.body;
    }
  }
  
  // 處理其他響應格式
  return response;
}
```

### 3. CORS 錯誤

**原因**：Lambda 響應頭設置不正確
**解決方案**：
```python
# 在 Lambda 函數中統一 CORS 頭
def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
```

## 自動化測試

### 1. 單元測試
```javascript
// 測試 DataService 的響應處理
describe('DataService.createProject', () => {
  it('should handle successful project creation', async () => {
    const mockApiResponse = {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Project created successfully',
        project: { id: 'test-1', name: 'Test Project' }
      })
    };
    
    const result = await dataService.createProject({ name: 'Test Project' });
    expect(result.id).toBe('test-1');
  });
});
```

### 2. 集成測試
```javascript
// 測試完整的 API 調用流程
describe('Project API Integration', () => {
  it('should create and retrieve project', async () => {
    const projectData = { name: 'Integration Test' };
    const created = await dataService.createProject(projectData);
    const retrieved = await dataService.getProjectsByUser('test-user');
    
    expect(retrieved).toContainEqual(expect.objectContaining({
      name: 'Integration Test'
    }));
  });
});
```

## 總結

通過統一後端響應格式、改進前端響應處理邏輯，以及修復 API 客戶端的響應解析，可以解決 "Unexpected API response format" 錯誤。

關鍵點：
1. **響應格式一致性**：所有 Lambda 函數使用相同的 `build_response` 函數
2. **前端健壯性**：處理多種可能的響應格式
3. **詳細日誌**：便於調試和問題排查
4. **自動化測試**：確保前後端一致性

建議在開發過程中定期運行這些測試，確保 API 響應格式的一致性。
