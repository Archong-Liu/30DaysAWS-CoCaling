# API 實現計劃

## 當前已實現的接口

### 1. 日曆事件管理
- **GET /calendars** - 獲取用戶的所有日曆事件
- **POST /events** - 創建新事件
- **DELETE /events/{eventId}** - 刪除事件

### 2. 對應的 Lambda 函數
- `get_calendars` - 處理 GET /calendars 請求
- `add_event` - 處理 POST /events 請求
- `delete_event` - 處理 DELETE /events/{eventId} 請求

## 新實現的接口

### 3. 專案管理
- **GET /projects** - 獲取用戶的所有專案
- **POST /projects** - 創建新專案
- **PUT /projects/{projectId}** - 更新專案
- **DELETE /projects/{projectId}** - 刪除專案

### 4. 任務管理
- **POST /tasks** - 創建新任務
- **PUT /tasks/{taskId}** - 更新任務
- **DELETE /tasks/{taskId}** - 刪除任務
- **GET /projects/{projectId}/tasks** - 獲取指定專案的所有任務

### 5. 對應的 Lambda 函數
- `project_manager` - 處理所有專案相關操作
- `task_manager` - 處理所有任務相關操作

## 需要新增的接口

### 1. 專案管理接口

#### 1.1 獲取用戶專案
```
GET /projects
- 描述：獲取當前用戶的所有專案
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：專案列表
```

#### 1.2 創建專案
```
POST /projects
- 描述：創建新專案
- 認證：需要 Cognito JWT Token
- 參數：
  - name: 專案名稱（必填）
  - description: 專案描述（可選）
  - color: 專案顏色（可選）
- 返回：創建的專案信息
```

#### 1.3 更新專案
```
PUT /projects/{projectId}
- 描述：更新專案信息
- 認證：需要 Cognito JWT Token
- 參數：同創建專案
- 返回：更新後的專案信息
```

#### 1.4 刪除專案
```
DELETE /projects/{projectId}
- 描述：刪除專案
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：成功/失敗狀態
```

### 2. 任務管理接口

#### 2.1 獲取專案任務
```
GET /projects/{projectId}/tasks
- 描述：獲取指定專案的所有任務
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：任務列表
```

#### 2.2 創建任務
```
POST /tasks
- 描述：創建新任務
- 認證：需要 Cognito JWT Token
- 參數：
  - projectId: 專案ID（必填）
  - title: 任務標題（必填）
  - description: 任務描述（可選）
  - assigneeId: 負責人ID（可選）
  - dueDate: 到期日期（可選）
  - priority: 優先級（可選）
- 返回：創建的任務信息
```

#### 2.3 更新任務
```
PUT /tasks/{taskId}
- 描述：更新任務信息
- 認證：需要 Cognito JWT Token
- 參數：同創建任務
- 返回：更新後的任務信息
```

#### 2.4 刪除任務
```
DELETE /tasks/{taskId}
- 描述：刪除任務
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：成功/失敗狀態
```

### 3. 用戶管理接口

#### 3.1 獲取用戶資料
```
GET /users/{userId}
- 描述：獲取指定用戶的資料
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：用戶資料
```

#### 3.2 更新用戶資料
```
PUT /users/{userId}
- 描述：更新用戶資料
- 認證：需要 Cognito JWT Token
- 參數：
  - name: 用戶姓名（可選）
  - avatar: 頭像URL（可選）
- 返回：更新後的用戶資料
```

### 4. 專案成員管理接口

#### 4.1 添加專案成員
```
POST /projects/{projectId}/members
- 描述：添加用戶到專案
- 認證：需要 Cognito JWT Token
- 參數：
  - userId: 用戶ID（必填）
  - role: 角色（OWNER/MEMBER/VIEWER）
- 返回：成功/失敗狀態
```

#### 4.2 移除專案成員
```
DELETE /projects/{projectId}/members/{userId}
- 描述：從專案中移除用戶
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：成功/失敗狀態
```

### 5. 活動紀錄接口

#### 5.1 獲取活動紀錄
```
GET /{entityType}/{entityId}/activities
- 描述：獲取指定實體的活動紀錄
- 認證：需要 Cognito JWT Token
- 參數：無
- 返回：活動紀錄列表
```

#### 5.2 記錄活動
```
POST /activities
- 描述：記錄新的活動
- 認證：需要 Cognito JWT Token
- 參數：
  - entityType: 實體類型（PROJECT/TASK/EVENT）
  - entityId: 實體ID
  - action: 動作類型
  - details: 詳細信息
- 返回：成功/失敗狀態
```

## Lambda 函數實現計劃

### 1. 專案管理 Lambda 函數

#### 1.1 `get_projects`
```python
# lambda/get_projects/handler.py
def lambda_handler(event, context):
    # 從 JWT Token 獲取用戶ID
    # 使用 GSI1 查詢用戶的所有專案
    # 返回專案列表
```

#### 1.2 `create_project`
```python
# lambda/create_project/handler.py
def lambda_handler(event, context):
    # 驗證請求數據
    # 創建專案記錄
    # 創建專案擁有者關係
    # 返回專案信息
```

#### 1.3 `update_project`
```python
# lambda/update_project/handler.py
def lambda_handler(event, context):
    # 驗證用戶權限
    # 更新專案信息
    # 返回更新後的專案信息
```

#### 1.4 `delete_project`
```python
# lambda/delete_project/handler.py
def lambda_handler(event, context):
    # 驗證用戶權限
    # 刪除專案及相關數據
    # 返回成功狀態
```

### 2. 任務管理 Lambda 函數

#### 2.1 `get_tasks`
```python
# lambda/get_tasks/handler.py
def lambda_handler(event, context):
    # 從路徑參數獲取專案ID
    # 查詢專案的所有任務
    # 返回任務列表
```

#### 2.2 `create_task`
```python
# lambda/create_task/handler.py
def lambda_handler(event, context):
    # 驗證請求數據
    # 創建任務記錄
    # 創建專案任務關係
    # 創建用戶任務關係（如果指定了負責人）
    # 返回任務信息
```

### 3. 用戶管理 Lambda 函數

#### 3.1 `get_user_profile`
```python
# lambda/get_user_profile/handler.py
def lambda_handler(event, context):
    # 從路徑參數獲取用戶ID
    # 查詢用戶資料
    # 返回用戶信息
```

#### 3.2 `update_user_profile`
```python
# lambda/update_user_profile/handler.py
def lambda_handler(event, context):
    # 驗證用戶權限
    # 更新用戶資料
    # 返回更新後的用戶信息
```

## API Gateway 更新計劃

### 1. 新增資源
```python
# 在 api_gateway_stack.py 中添加
projects = self.api.root.add_resource("projects")
project_id = projects.add_resource("{projectId}")
project_members = project_id.add_resource("members")
project_member_id = project_members.add_resource("{userId}")

tasks = self.api.root.add_resource("tasks")
task_id = tasks.add_resource("{taskId}")

users = self.api.root.add_resource("users")
user_id = users.add_resource("{userId}")

activities = self.api.root.add_resource("activities")
```

### 2. 新增方法
```python
# 專案相關
projects.add_method("GET", get_projects_integration, authorizer=auth)
projects.add_method("POST", create_project_integration, authorizer=auth)
project_id.add_method("PUT", update_project_integration, authorizer=auth)
project_id.add_method("DELETE", delete_project_integration, authorizer=auth)

# 任務相關
tasks.add_method("POST", create_task_integration, authorizer=auth)
task_id.add_method("PUT", update_task_integration, authorizer=auth)
task_id.add_method("DELETE", delete_task_integration, authorizer=auth)

# 用戶相關
user_id.add_method("GET", get_user_profile_integration, authorizer=auth)
user_id.add_method("PUT", update_user_profile_integration, authorizer=auth)
```

## 實現優先級

### 高優先級（第一階段）
1. **專案管理接口** - 支持基本的專案 CRUD 操作
2. **任務管理接口** - 支持基本的任務 CRUD 操作

### 中優先級（第二階段）
1. **用戶管理接口** - 支持用戶資料管理
2. **專案成員管理** - 支持團隊協作

### 低優先級（第三階段）
1. **活動紀錄接口** - 支持審計和追蹤
2. **高級查詢接口** - 支持複雜的數據查詢

## 注意事項

1. **單表設計**：所有 Lambda 函數都應該使用單表設計的查詢模式
2. **權限控制**：每個接口都需要驗證用戶權限
3. **錯誤處理**：統一的錯誤處理和響應格式
4. **日誌記錄**：記錄所有操作以支持審計
5. **性能優化**：使用適當的 GSI 索引優化查詢性能
