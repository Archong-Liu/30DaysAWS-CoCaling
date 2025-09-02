# Calendar App 架構最佳實踐

## 概述

本文檔描述了 Calendar App 中前端、Lambda 函數和 DynamoDB 之間的最佳實踐設計，確保系統的可維護性、可擴展性和性能。

## 架構原則

### 1. 單一職責原則
- 每個 Lambda 函數只負責一個業務領域（如專案管理、任務管理、事件管理）
- 前端 DataService 只負責數據轉換和 API 調用，不包含業務邏輯
- DynamoDB 表設計遵循單表設計模式，通過 PK/SK 組合區分數據類型

### 2. 數據流設計
```
前端組件 → DataService → API Client → Lambda → DynamoDB
    ↑           ↓           ↓         ↓        ↓
  狀態管理   數據轉換    HTTP請求   業務邏輯   數據存儲
```

### 3. 錯誤處理策略
- 前端：用戶友好的錯誤提示，自動重試機制
- Lambda：結構化的錯誤響應，詳細的日誌記錄
- DynamoDB：事務性操作，數據一致性保證

## 前端設計最佳實踐

### 1. DataService 設計
```javascript
export class DataService {
  constructor(apiClient) {
    this.api = apiClient; // 依賴注入，便於測試
  }

  // 方法命名清晰，職責單一
  async createProject(projectData) {
    try {
      const result = await this.api.createProject(projectData);
      return this.validateProjectResponse(result);
    } catch (error) {
      this.handleError(error, 'createProject');
      throw error;
    }
  }

  // 統一的錯誤處理
  handleError(error, operation) {
    console.error(`Error in ${operation}:`, error);
    // 可以添加錯誤報告、重試邏輯等
  }
}
```

### 2. 數據驗證和轉換
- 前端負責數據格式驗證
- 後端負責業務規則驗證
- 使用 TypeScript 接口定義數據結構

### 3. 狀態管理
- 使用 React Context 或 Redux 管理全局狀態
- 本地狀態與服務器狀態分離
- 實現樂觀更新和錯誤回滾

## Lambda 函數設計最佳實踐

### 1. 函數結構
```python
def lambda_handler(event, context):
    """主處理函數"""
    try:
        # 1. 驗證和解析請求
        user_id = get_user_id_from_event(event)
        request_data = parse_request(event)
        
        # 2. 業務邏輯處理
        result = process_business_logic(request_data, user_id)
        
        # 3. 返回響應
        return build_success_response(result)
        
    except ValidationError as e:
        return build_error_response(400, str(e))
    except PermissionError as e:
        return build_error_response(403, str(e))
    except Exception as e:
        log_error(e)
        return build_error_response(500, "Internal server error")
```

### 2. 用戶認證
```python
def get_user_id_from_event(event):
    """統一的用戶ID提取邏輯"""
    # 優先使用 Cognito 認證
    if 'requestContext' in event and 'authorizer' in event['requestContext']:
        claims = event['requestContext']['authorizer']['claims']
        if 'sub' in claims:
            return claims['sub']
    
    # 備用 JWT 解析
    if 'headers' in event and 'Authorization' in event['headers']:
        return extract_user_from_jwt(event['headers']['Authorization'])
    
    # 開發模式默認值
    return 'demo-user'
```

### 3. 響應格式標準化
```python
def build_success_response(data, message="Success"):
    """標準成功響應格式"""
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'success': True,
            'message': message,
            'data': data
        }, ensure_ascii=False)
    }

def build_error_response(status_code, message, details=None):
    """標準錯誤響應格式"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'success': False,
            'message': message,
            'details': details
        }, ensure_ascii=False)
    }
```

## DynamoDB 設計最佳實踐

### 1. 單表設計原則
```javascript
// 數據類型通過 PK/SK 組合區分
const keyPatterns = {
  // 用戶資料
  user: (userId) => ({
    PK: `USER#${userId}`,
    SK: `USER#${userId}`
  }),
  
  // 專案資料
  project: (projectId) => ({
    PK: `PROJECT#${projectId}`,
    SK: `PROJECT#${projectId}`
  }),
  
  // 專案成員關係
  projectMember: (projectId, userId) => ({
    PK: `PROJECT#${projectId}`,
    SK: `MEMBER#${userId}`
  })
};
```

### 2. GSI 設計策略
- **GSI1**: 按用戶查詢（USER#userId → PROJECT#projectId）
- **GSI2**: 按日期查詢（EVENT#eventId → startDate）
- 避免過度使用 GSI，每個表格最多 20 個

### 3. 查詢模式優化
```python
# 獲取用戶的所有專案
def get_user_projects(user_id):
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1PK').eq(f'USER#{user_id}') & 
                              Key('GSI1SK').begins_with('PROJECT#'),
        FilterExpression=Attr('entityType').eq('PROJECT')
    )
    return response['Items']
```

## API 設計最佳實踐

### 1. RESTful 設計
```
# 專案管理
GET    /projects          # 獲取用戶專案列表
POST   /projects          # 創建新專案
GET    /projects/{id}     # 獲取特定專案
PUT    /projects/{id}     # 更新專案
DELETE /projects/{id}     # 刪除專案

# 任務管理
GET    /projects/{id}/tasks    # 獲取專案任務
POST   /projects/{id}/tasks    # 創建任務
PUT    /tasks/{id}             # 更新任務
DELETE /tasks/{id}             # 刪除任務
```

### 2. 請求/響應格式
```javascript
// 創建專案請求
{
  "name": "專案名稱",
  "description": "專案描述",
  "color": "#FF9900"
}

// 成功響應
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "project-123",
    "name": "專案名稱",
    "description": "專案描述",
    "color": "#FF9900",
    "ownerId": "user-456",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## 性能優化策略

### 1. 前端優化
- 實現數據緩存和分頁
- 使用 React.memo 和 useMemo 優化渲染
- 實現虛擬滾動處理大量數據

### 2. Lambda 優化
- 使用連接池管理數據庫連接
- 實現批量操作減少 API 調用
- 使用異步處理提高響應速度

### 3. DynamoDB 優化
- 合理設計分區鍵避免熱點
- 使用批量操作減少請求次數
- 實現數據壓縮減少存儲成本

## 安全最佳實踐

### 1. 認證和授權
- 使用 Cognito Hosted UI 進行用戶認證
- 實現基於角色的訪問控制 (RBAC)
- 驗證所有用戶輸入防止注入攻擊

### 2. 數據保護
- 敏感數據加密存儲
- 實現審計日誌記錄所有操作
- 定期備份和災難恢復計劃

### 3. API 安全
- 使用 HTTPS 加密傳輸
- 實現速率限制防止濫用
- 驗證和清理所有輸入數據

## 監控和日誌

### 1. 應用監控
- 使用 CloudWatch 監控 Lambda 性能
- 實現自定義指標和警報
- 監控 API 響應時間和錯誤率

### 2. 日誌記錄
```python
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(f"Processing request: {event}")
    try:
        # 業務邏輯
        result = process_request(event)
        logger.info(f"Request processed successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        raise
```

## 測試策略

### 1. 單元測試
- 測試 Lambda 函數的業務邏輯
- 測試前端的數據轉換邏輯
- 使用 Mock 對象隔離依賴

### 2. 集成測試
- 測試 Lambda 與 DynamoDB 的交互
- 測試前端與 API 的集成
- 使用測試數據庫避免影響生產環境

### 3. 端到端測試
- 測試完整的用戶流程
- 驗證數據一致性和業務規則
- 性能測試和負載測試

## 部署和 DevOps

### 1. 基礎設施即代碼
- 使用 CDK 管理 AWS 資源
- 版本控制和審查所有變更
- 自動化部署流程

### 2. 環境管理
- 分離開發、測試和生產環境
- 使用環境變量管理配置
- 實現藍綠部署減少停機時間

### 3. 持續集成/持續部署
- 自動化測試和部署
- 代碼質量檢查和掃描
- 回滾機制和災難恢復

## 總結

遵循這些最佳實踐可以確保 Calendar App 的架構設計符合現代雲原生應用的標準，提供良好的用戶體驗、可維護性和可擴展性。關鍵是要保持前後端的一致性，實現清晰的職責分離，並建立完善的錯誤處理和監控機制。
