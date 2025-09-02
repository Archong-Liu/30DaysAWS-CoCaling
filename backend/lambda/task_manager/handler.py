"""
任務管理 Lambda 函數
支持任務的創建、讀取、更新、刪除操作
"""

import json
import boto3
import os
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

# 初始化 DynamoDB 客戶端
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def lambda_handler(event, context):
    """
    處理任務管理請求
    支持 GET, POST, PUT, DELETE 操作
    """
    try:
        http_method = event['httpMethod']
        path = event['path']
        
        # 從 JWT Token 獲取用戶ID
        user_id = get_user_id_from_event(event)
        
        if http_method == 'POST':
            return create_task(event, user_id)
        elif http_method == 'GET':
            return get_tasks(event, user_id)
        elif http_method == 'PUT':
            return update_task(event, user_id)
        elif http_method == 'DELETE':
            return delete_task(event, user_id)
        else:
            return build_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return build_response(500, {'error': 'Internal server error'})

def create_task(event, user_id):
    """創建新任務"""
    try:
        body = json.loads(event['body'])
        
        # 驗證必要字段
        if not body.get('title') or not body.get('projectId'):
            return build_response(400, {'error': 'Task title and projectId are required'})
        
        # 生成任務ID
        task_id = f"task-{int(datetime.now().timestamp())}"
        
        # 任務資料
        task_data = {
            'PK': f'TASK#{task_id}',
            'SK': f'TASK#{task_id}',
            'GSI1PK': f'TASK#{task_id}',
            'GSI1SK': f'TASK#{task_id}',
            'title': body['title'],
            'description': body.get('description', ''),
            'status': body.get('status', 'TODO'),
            'priority': body.get('priority', 'MEDIUM'),
            'projectId': body['projectId'],
            'assigneeId': body.get('assigneeId'),
            'dueDate': body.get('dueDate'),
            'entityType': 'TASK',
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        # 創建專案任務關係
        project_task_relation = {
            'PK': f'PROJECT#{body["projectId"]}',
            'SK': f'TASK#{task_id}',
            'GSI1PK': f'TASK#{task_id}',
            'GSI1SK': f'PROJECT#{body["projectId"]}',
            'assignedAt': datetime.now().isoformat()
        }
        
        # 創建用戶任務關係（如果指定了負責人）
        user_task_relation = None
        if body.get('assigneeId'):
            user_task_relation = {
                'PK': f'USER#{body["assigneeId"]}',
                'SK': f'TASK#{task_id}',
                'GSI1PK': f'TASK#{task_id}',
                'GSI1SK': f'USER#{body["assigneeId"]}',
                'assignedAt': datetime.now().isoformat()
            }
        
        # 寫入 DynamoDB
        with table.batch_writer() as batch:
            batch.put_item(Item=task_data)
            batch.put_item(Item=project_task_relation)
            if user_task_relation:
                batch.put_item(Item=user_task_relation)
        
        return build_response(201, {
            'message': 'Task created successfully',
            'task': {
                'id': task_id,
                'title': task_data['title'],
                'description': task_data['description'],
                'status': task_data['status'],
                'priority': task_data['priority'],
                'projectId': task_data['projectId'],
                'assigneeId': task_data.get('assigneeId')
            }
        })
        
    except Exception as e:
        print(f"Error creating task: {str(e)}")
        return build_response(500, {'error': 'Failed to create task'})

def get_tasks(event, user_id):
    """獲取任務"""
    try:
        # 檢查是否有專案ID參數
        path_parameters = event.get('pathParameters', {})
        project_id = path_parameters.get('projectId')
        
        if project_id:
            # 獲取指定專案的所有任務
            response = table.query(
                KeyConditionExpression=Key('PK').eq(f'PROJECT#{project_id}') & 
                                      Key('SK').begins_with('TASK#')
            )
        else:
            # 獲取用戶的所有任務
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1PK').eq(f'USER#{user_id}') & 
                                      Key('GSI1SK').begins_with('TASK#')
            )
        
        tasks = []
        for item in response['Items']:
            if 'title' in item:  # 確保是任務項目
                tasks.append({
                    'id': item['PK'].replace('TASK#', ''),
                    'title': item['title'],
                    'description': item.get('description', ''),
                    'status': item.get('status', 'TODO'),
                    'priority': item.get('priority', 'MEDIUM'),
                    'projectId': item.get('projectId'),
                    'assigneeId': item.get('assigneeId'),
                    'dueDate': item.get('dueDate'),
                    'createdAt': item['createdAt'],
                    'updatedAt': item['updatedAt']
                })
        
        return build_response(200, {'tasks': tasks})
        
    except Exception as e:
        print(f"Error getting tasks: {str(e)}")
        return build_response(500, {'error': 'Failed to get tasks'})

def update_task(event, user_id):
    """更新任務"""
    try:
        task_id = event['pathParameters']['taskId']
        
        # 檢查用戶權限（任務創建者或專案擁有者）
        if not check_task_permission(task_id, user_id):
            return build_response(403, {'error': 'Insufficient permissions'})
        
        body = json.loads(event['body'])
        
        # 更新表達式
        update_expression = 'SET '
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        if 'title' in body:
            update_expression += '#title = :title, '
            expression_attribute_names['#title'] = 'title'
            expression_attribute_values[':title'] = body['title']
        
        if 'description' in body:
            update_expression += '#description = :description, '
            expression_attribute_names['#description'] = 'description'
            expression_attribute_values[':description'] = body['description']
        
        if 'status' in body:
            update_expression += '#status = :status, '
            expression_attribute_names['#status'] = 'status'
            expression_attribute_values[':status'] = body['status']
        
        if 'priority' in body:
            update_expression += '#priority = :priority, '
            expression_attribute_names['#priority'] = 'priority'
            expression_attribute_values[':priority'] = body['priority']
        
        if 'assigneeId' in body:
            update_expression += '#assigneeId = :assigneeId, '
            expression_attribute_names['#assigneeId'] = 'assigneeId'
            expression_attribute_values[':assigneeId'] = body['assigneeId']
        
        if 'dueDate' in body:
            update_expression += '#dueDate = :dueDate, '
            expression_attribute_names['#dueDate'] = 'dueDate'
            expression_attribute_values[':dueDate'] = body['dueDate']
        
        update_expression += '#updatedAt = :updatedAt'
        expression_attribute_names['#updatedAt'] = 'updatedAt'
        expression_attribute_values[':updatedAt'] = datetime.now().isoformat()
        
        # 更新任務
        table.update_item(
            Key={
                'PK': f'TASK#{task_id}',
                'SK': f'TASK#{task_id}'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        return build_response(200, {'message': 'Task updated successfully'})
        
    except Exception as e:
        print(f"Error updating task: {str(e)}")
        return build_response(500, {'error': 'Failed to update task'})

def delete_task(event, user_id):
    """刪除任務"""
    try:
        task_id = event['pathParameters']['taskId']
        
        # 檢查用戶權限
        if not check_task_permission(task_id, user_id):
            return build_response(403, {'error': 'Insufficient permissions'})
        
        # 獲取任務信息以刪除相關關係
        task_response = table.get_item(
            Key={
                'PK': f'TASK#{task_id}',
                'SK': f'TASK#{task_id}'
            }
        )
        
        if 'Item' in task_response:
            task = task_response['Item']
            project_id = task.get('projectId')
            assignee_id = task.get('assigneeId')
            
            # 刪除任務本身
            table.delete_item(
                Key={
                    'PK': f'TASK#{task_id}',
                    'SK': f'TASK#{task_id}'
                }
            )
            
            # 刪除專案任務關係
            if project_id:
                table.delete_item(
                    Key={
                        'PK': f'PROJECT#{project_id}',
                        'SK': f'TASK#{task_id}'
                    }
                )
            
            # 刪除用戶任務關係
            if assignee_id:
                table.delete_item(
                    Key={
                        'PK': f'USER#{assignee_id}',
                        'SK': f'TASK#{task_id}'
                    }
                )
        
        return build_response(200, {'message': 'Task deleted successfully'})
        
    except Exception as e:
        print(f"Error deleting task: {str(e)}")
        return build_response(500, {'error': 'Failed to delete task'})

def check_task_permission(task_id, user_id):
    """檢查用戶對任務的權限"""
    try:
        # 獲取任務信息
        task_response = table.get_item(
            Key={
                'PK': f'TASK#{task_id}',
                'SK': f'TASK#{task_id}'
            }
        )
        
        if 'Item' not in task_response:
            return False
        
        task = task_response['Item']
        project_id = task.get('projectId')
        
        # 檢查是否是任務創建者
        if task.get('assigneeId') == user_id:
            return True
        
        # 檢查是否是專案擁有者
        if project_id:
            member_response = table.get_item(
                Key={
                    'PK': f'PROJECT#{project_id}',
                    'SK': f'MEMBER#{user_id}'
                }
            )
            
            if 'Item' in member_response:
                return member_response['Item'].get('role') == 'OWNER'
        
        return False
        
    except Exception as e:
        print(f"Error checking task permission: {str(e)}")
        return False

def get_user_id_from_event(event):
    """從事件中獲取用戶ID"""
    try:
        # 從 Cognito 認證中獲取用戶ID
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                claims = event['requestContext']['authorizer']['claims']
                if 'sub' in claims:
                    return claims['sub']
        
        # 如果沒有 Cognito 認證，嘗試從 Authorization header 解析 JWT（延遲導入 jwt）
        if 'headers' in event and event['headers'] and ('Authorization' in event['headers'] or 'authorization' in event['headers']):
            auth_header = event['headers'].get('Authorization') or event['headers'].get('authorization')
            if isinstance(auth_header, str) and auth_header.startswith('Bearer '):
                token = auth_header[7:]
                try:
                    # 動態導入，避免部署包缺少依賴時崩潰
                    import jwt  # type: ignore
                    decoded = jwt.decode(token, options={"verify_signature": False})
                    return decoded.get('sub', 'unknown-user')
                except Exception as e:
                    print(f"JWT parse skipped: {str(e)}")
        
        # 如果都失敗，返回默認值（僅用於開發測試）
        print("Warning: Could not extract user ID from event, using default")
        return 'demo-user'
        
    except Exception as e:
        print(f"Error extracting user ID: {str(e)}")
        return 'demo-user'

def build_response(status_code, body):
    """構建 HTTP 響應"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
