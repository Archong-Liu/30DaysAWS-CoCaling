# DynamoDB 單表設計說明

## 概述

本專案採用 DynamoDB 單表設計（Single Table Design）來儲存所有業務資料，透過不同的 Partition Key (PK) 和 Sort Key (SK) 組合來區分資料類型和關係。

## 表格結構

### 主表：`calendar-app-data`

| 屬性 | 類型 | 說明 |
|------|------|------|
| PK | String | Partition Key，用於資料分區 |
| SK | String | Sort Key，用於排序和查詢 |
| GSI1PK | String | GSI1 的 Partition Key |
| GSI1SK | String | GSI1 的 Sort Key |
| GSI2PK | String | GSI2 的 Partition Key |
| GSI2SK | String | GSI2 的 Sort Key |

### 全域次要索引 (GSI)

#### GSI1：按類型查詢和排序
- **用途**：查詢特定類型的所有資料
- **查詢模式**：`GSI1PK = "USER#userId" AND begins_with(GSI1SK, "PROJECT#")`

#### GSI2：按日期查詢
- **用途**：按日期範圍查詢事件
- **查詢模式**：`GSI2PK = "EVENT#" AND GSI2SK BETWEEN startDate AND endDate`

## 資料類型與鍵值設計

### 1. 用戶資料 (USER)

```json
{
  "PK": "USER#userId",
  "SK": "USER#userId",
  "GSI1PK": "USER#userId",
  "GSI1SK": "USER#userId",
  "name": "用戶姓名",
  "email": "user@example.com",
  "avatar": "avatar-url",
  "entityType": "USER",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. 專案資料 (PROJECT)

```json
{
  "PK": "PROJECT#projectId",
  "SK": "PROJECT#projectId",
  "GSI1PK": "PROJECT#projectId",
  "GSI1SK": "PROJECT#projectId",
  "name": "專案名稱",
  "description": "專案描述",
  "ownerId": "userId",
  "color": "#FF9900",
  "status": "ACTIVE",
  "entityType": "PROJECT",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 3. 專案成員關係 (PROJECT_MEMBER)

```json
{
  "PK": "PROJECT#projectId",
  "SK": "MEMBER#userId",
  "GSI1PK": "USER#userId",
  "GSI1SK": "PROJECT#projectId",
  "role": "MEMBER",
  "joinedAt": "2024-01-01T00:00:00Z",
  "permissions": ["READ", "WRITE"]
}
```

### 4. 任務資料 (TASK)

```json
{
  "PK": "TASK#taskId",
  "SK": "TASK#taskId",
  "GSI1PK": "TASK#taskId",
  "GSI1SK": "TASK#taskId",
  "title": "任務標題",
  "description": "任務描述",
  "status": "TODO",
  "priority": "HIGH",
  "assigneeId": "userId",
  "dueDate": "2024-01-31T23:59:59Z",
  "entityType": "TASK",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 5. 專案任務關係 (PROJECT_TASK)

```json
{
  "PK": "PROJECT#projectId",
  "SK": "TASK#taskId",
  "GSI1PK": "TASK#taskId",
  "GSI1SK": "PROJECT#projectId",
  "assignedAt": "2024-01-01T00:00:00Z"
}
```

### 6. 用戶任務關係 (USER_TASK)

```json
{
  "PK": "USER#userId",
  "SK": "TASK#taskId",
  "GSI1PK": "TASK#taskId",
  "GSI1SK": "USER#userId",
  "assignedAt": "2024-01-01T00:00:00Z"
}
```

### 7. 日曆事件 (EVENT)

```json
{
  "PK": "EVENT#eventId",
  "SK": "EVENT#eventId",
  "GSI1PK": "EVENT#eventId",
  "GSI1SK": "EVENT#eventId",
  "GSI2PK": "EVENT#eventId",
  "GSI2SK": "2024-01-01T09:00:00Z",
  "title": "事件標題",
  "description": "事件描述",
  "startDate": "2024-01-01T09:00:00Z",
  "endDate": "2024-01-01T10:00:00Z",
  "allDay": false,
  "color": "#FF9900",
  "projectId": "projectId",
  "entityType": "EVENT",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 8. 專案事件關係 (PROJECT_EVENT)

```json
{
  "PK": "PROJECT#projectId",
  "SK": "EVENT#eventId",
  "GSI1PK": "EVENT#eventId",
  "GSI1SK": "PROJECT#projectId",
  "GSI2PK": "EVENT#eventId",
  "GSI2SK": "PROJECT#projectId",
  "addedAt": "2024-01-01T00:00:00Z"
}
```

### 9. 活動紀錄 (ACTIVITY)

```json
{
  "PK": "ACTIVITY#activityId",
  "SK": "ACTIVITY#activityId",
  "GSI1PK": "ACTIVITY#activityId",
  "GSI1SK": "ACTIVITY#activityId",
  "action": "CREATE",
  "entityType": "TASK",
  "entityId": "taskId",
  "userId": "userId",
  "details": "創建了新任務",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 查詢模式

### 1. 獲取用戶的所有專案

```javascript
// 使用 GSI1
const query = {
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${userId}`,
    ':sk': 'PROJECT#'
  }
};
```

### 2. 獲取專案的所有任務

```javascript
// 使用主表
const query = {
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `PROJECT#${projectId}`,
    ':sk': 'TASK#'
  }
};
```

### 3. 獲取專案的所有事件

```javascript
// 使用主表
const query = {
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `PROJECT#${projectId}`,
    ':sk': 'EVENT#'
  }
};
```

### 4. 按日期範圍查詢事件

```javascript
// 使用 GSI2
const query = {
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':pk': 'EVENT#',
    ':start': startDate,
    ':end': endDate
  }
};
```

## 業務邏輯實現

### 1. 創建專案

```javascript
async createProject(projectData) {
  // 1. 創建專案本身
  const projectItem = dataTransformers.toDynamoDB(projectData, ENTITY_TYPES.PROJECT);
  await this.api.put(projectItem);
  
  // 2. 創建專案擁有者關係
  const ownerRelation = {
    ...generateKeys.projectMember(projectData.id, projectData.ownerId),
    role: PROJECT_ROLES.OWNER,
    joinedAt: new Date().toISOString()
  };
  await this.api.put(ownerRelation);
  
  return projectData;
}
```

### 2. 創建任務

```javascript
async createTask(taskData) {
  // 1. 創建任務本身
  const taskItem = dataTransformers.toDynamoDB(taskData, ENTITY_TYPES.TASK);
  await this.api.put(taskItem);
  
  // 2. 創建專案任務關係
  const projectTaskRelation = {
    ...generateKeys.projectTask(taskData.projectId, taskData.id),
    assignedAt: new Date().toISOString()
  };
  await this.api.put(projectTaskRelation);
  
  // 3. 創建用戶任務關係（如果指定了負責人）
  if (taskData.assigneeId) {
    const userTaskRelation = {
      ...generateKeys.userTask(taskData.assigneeId, taskData.id),
      assignedAt: new Date().toISOString()
    };
    await this.api.put(userTaskRelation);
  }
  
  return taskData;
}
```

## 優勢與注意事項

### 優勢

1. **查詢效率**：單表設計減少 JOIN 操作，提高查詢性能
2. **成本優化**：減少 DynamoDB 表格數量，降低管理成本
3. **一致性**：所有相關資料在同一表格中，保證資料一致性
4. **擴展性**：容易添加新的資料類型和查詢模式

### 注意事項

1. **鍵值設計**：PK/SK 的設計直接影響查詢效率
2. **GSI 數量**：DynamoDB 限制每個表格最多 20 個 GSI
3. **資料大小**：單個項目不能超過 400KB
4. **查詢複雜性**：需要仔細設計查詢模式以充分利用索引

## 未來擴展

### 1. 新增資料類型

- **標籤系統**：`TAG#tagId`
- **評論系統**：`COMMENT#commentId`
- **附件系統**：`ATTACHMENT#attachmentId`

### 2. 新增查詢模式

- **全文搜尋**：使用 Elasticsearch 或 OpenSearch
- **複雜統計**：使用 DynamoDB Streams + Lambda
- **即時通知**：使用 WebSocket 或 SNS

### 3. 性能優化

- **資料分區**：根據業務需求調整分區策略
- **快取策略**：使用 ElastiCache 或 DAX
- **批量操作**：使用 BatchGetItem 和 BatchWriteItem
