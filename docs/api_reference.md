# Calendar App API Reference

## 認證
- 授權：Cognito User Pool（Hosted UI 登入）
- Header：`Authorization: Bearer <idToken>`

## Base URL
- 示例：`https://<api-id>.execute-api.<region>.amazonaws.com/prod`

## 錯誤格式
```json
{
  "error": "<message>",
  "details": "<optional>"
}
```

---

## Projects

### GET /projects
- 描述：取得目前用戶的專案列表（依 GSI1：USER#）
- 回應：
```json
{
  "projects": [
    {"id": "project-123", "name": "...", "description": "...", "color": "#FF9900", "status": "ACTIVE", "createdAt": "...", "updatedAt": "..."}
  ]
}
```

### POST /projects
- 描述：建立專案，可同時建立初始成員
- 請求：
```json
{
  "name": "專案名稱",
  "description": "描述",
  "color": "#FF9900",
  "members": [
    {"userId": "user-a", "role": "MEMBER"},
    {"userId": "user-b", "role": "VIEWER"}
  ]
}
```
- 回應：
```json
{
  "message": "Project created successfully",
  "project": {"id": "project-123", "name": "...", "description": "...", "color": "#FF9900", "ownerId": "<sub>", "members": [{"userId": "<sub>", "role": "OWNER"}]}
}
```

### PUT /projects/{projectId}
- 描述：更新專案的名稱/描述/顏色
- 請求：`{"name": "...", "description": "...", "color": "#146EB4"}`
- 回應：`{"message": "Project updated successfully"}`

### DELETE /projects/{projectId}
- 描述：刪除專案（簡化：未遞迴刪除所有關聯）
- 回應：`{"message": "Project deleted successfully"}`

---

## Project Events

### GET /projects/{projectId}/events[?startDate&endDate]
- 描述：查詢專案事件；若提供 `startDate`、`endDate`，使用日期範圍過濾
- 回應：
```json
{
  "events": [
    {"eventId": "...", "title": "...", "startDate": "...", "endDate": "...", "allDay": false, "color": "#FF9900", "projectId": "..."}
  ],
  "count": 10
}
```

### POST /projects/{projectId}/events
- 描述：在專案底下建立事件
- 請求：
```json
{
  "title": "事件名稱",
  "description": "說明",
  "startDate": "2025-01-01T09:00:00Z",
  "endDate": "2025-01-01T10:00:00Z",
  "allDay": false,
  "color": "#FF9900"
}
```
- 回應：
```json
{
  "message": "Event created successfully",
  "event": {"eventId": "...", "projectId": "...", "title": "...", "startDate": "...", "endDate": "..."}
}
```

### DELETE /projects/{projectId}/events/{eventId}
- 描述：刪除事件
- 回應：HTTP 204

---

<!-- calendars 已移除，統一改為專案層級事件路徑 -->

---

## Tasks（已掛載，但尚屬初步）
- POST /tasks
- PUT /tasks/{taskId}
- DELETE /tasks/{taskId}
- GET /projects/{projectId}/tasks

---

## 安全與授權
- 需已登入 Cognito；事件、專案等操作需具備對應關係（OWNER/MEMBER）


