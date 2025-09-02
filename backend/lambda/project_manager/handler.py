"""
專案管理 Lambda 函數
支持專案的創建、讀取、更新、刪除操作
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
    處理專案管理請求
    支持 GET, POST, PUT, DELETE 操作
    """
    try:
        http_method = event['httpMethod']
        path = event['path']
        
        # 只依賴 API Gateway Cognito Authorizer
        user_id = get_user_id_from_event(event)
        if not user_id:
            return build_response(401, {'error': 'Unauthorized'})
        
        if http_method == 'POST':
            return create_project(event, user_id)
        elif http_method == 'GET':
            return get_projects(event, user_id)
        elif http_method == 'PUT':
            return update_project(event, user_id)
        elif http_method == 'DELETE':
            return delete_project(event, user_id)
        else:
            return build_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return build_response(500, {'error': 'Internal server error'})

def create_project(event, user_id):
    """創建新專案"""
    try:
        body = json.loads(event['body'])
        
        # 驗證必要字段
        if not body.get('name'):
            return build_response(400, {'error': 'Project name is required'})
        
        # 生成專案ID
        project_id = f"project-{int(datetime.now().timestamp())}"
        
        # 專案資料
        project_data = {
            'PK': f'PROJECT#{project_id}',
            'SK': f'PROJECT#{project_id}',
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'PROJECT#{project_id}',
            'name': body['name'],
            'description': body.get('description', ''),
            'color': body.get('color', '#FF9900'),
            'ownerId': user_id,
            'status': 'ACTIVE',
            'entityType': 'PROJECT',
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        # 創建專案擁有者關係
        owner_relation = {
            'PK': f'PROJECT#{project_id}',
            'SK': f'MEMBER#{user_id}',
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'PROJECT#{project_id}',
            'role': 'OWNER',
            'joinedAt': datetime.now().isoformat()
        }
        
        # 寫入 DynamoDB
        with table.batch_writer() as batch:
            batch.put_item(Item=project_data)
            batch.put_item(Item=owner_relation)
        
        return build_response(201, {
            'message': 'Project created successfully',
            'project': {
                'id': project_id,
                'name': project_data['name'],
                'description': project_data['description'],
                'color': project_data['color'],
                'ownerId': user_id
            }
        })
        
    except Exception as e:
        print(f"Error creating project: {str(e)}")
        return build_response(500, {'error': 'Failed to create project'})

def get_projects(event, user_id):
    """獲取用戶的所有專案"""
    try:
        # 使用 GSI1 查詢用戶的所有專案
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'USER#{user_id}') & 
                                  Key('GSI1SK').begins_with('PROJECT#'),
            FilterExpression=Attr('entityType').eq('PROJECT')
        )
        
        projects = []
        for item in response['Items']:
            projects.append({
                'id': item['PK'].replace('PROJECT#', ''),
                'name': item['name'],
                'description': item.get('description', ''),
                'color': item.get('color', '#FF9900'),
                'status': item.get('status', 'ACTIVE'),
                'createdAt': item['createdAt'],
                'updatedAt': item['updatedAt']
            })
        
        return build_response(200, {'projects': projects})
        
    except Exception as e:
        print(f"Error getting projects: {str(e)}")
        return build_response(500, {'error': 'Failed to get projects'})

def update_project(event, user_id):
    """更新專案"""
    try:
        # 從路徑參數獲取專案ID
        project_id = event['pathParameters']['projectId']
        
        # 檢查用戶權限
        if not check_project_permission(project_id, user_id, ['OWNER']):
            return build_response(403, {'error': 'Insufficient permissions'})
        
        body = json.loads(event['body'])
        
        # 更新表達式
        update_expression = 'SET '
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        if 'name' in body:
            update_expression += '#name = :name, '
            expression_attribute_names['#name'] = 'name'
            expression_attribute_values[':name'] = body['name']
        
        if 'description' in body:
            update_expression += '#description = :description, '
            expression_attribute_names['#description'] = 'description'
            expression_attribute_values[':description'] = body['description']
        
        if 'color' in body:
            update_expression += '#color = :color, '
            expression_attribute_names['#color'] = 'color'
            expression_attribute_values[':color'] = body['color']
        
        update_expression += '#updatedAt = :updatedAt'
        expression_attribute_names['#updatedAt'] = 'updatedAt'
        expression_attribute_values[':updatedAt'] = datetime.now().isoformat()
        
        # 更新專案
        table.update_item(
            Key={
                'PK': f'PROJECT#{project_id}',
                'SK': f'PROJECT#{project_id}'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        return build_response(200, {'message': 'Project updated successfully'})
        
    except Exception as e:
        print(f"Error updating project: {str(e)}")
        return build_response(500, {'error': 'Failed to update project'})

def delete_project(event, user_id):
    """刪除專案"""
    try:
        project_id = event['pathParameters']['projectId']
        
        # 檢查用戶權限
        if not check_project_permission(project_id, user_id, ['OWNER']):
            return build_response(403, {'error': 'Insufficient permissions'})
        
        # 刪除專案及相關數據
        # 注意：這裡應該刪除所有相關的任務、事件等，簡化處理
        table.delete_item(
            Key={
                'PK': f'PROJECT#{project_id}',
                'SK': f'PROJECT#{project_id}'
            }
        )
        
        # 刪除專案成員關係
        table.delete_item(
            Key={
                'PK': f'PROJECT#{project_id}',
                'SK': f'MEMBER#{user_id}'
            }
        )
        
        return build_response(200, {'message': 'Project deleted successfully'})
        
    except Exception as e:
        print(f"Error deleting project: {str(e)}")
        return build_response(500, {'error': 'Failed to delete project'})

def check_project_permission(project_id, user_id, allowed_roles):
    """檢查用戶對專案的權限"""
    try:
        response = table.get_item(
            Key={
                'PK': f'PROJECT#{project_id}',
                'SK': f'MEMBER#{user_id}'
            }
        )
        
        if 'Item' in response:
            return response['Item'].get('role') in allowed_roles
        
        return False
        
    except Exception as e:
        print(f"Error checking permission: {str(e)}")
        return False

def get_user_id_from_event(event):
    """僅從 API Gateway Cognito Authorizer 取得用戶ID；若缺失則返回 None"""
    try:
        request_context = event.get('requestContext') or {}
        authorizer = (request_context.get('authorizer') or {})
        claims = authorizer.get('claims') or {}
        sub = claims.get('sub')
        return sub
    except Exception as e:
        print(f"Error extracting user ID: {str(e)}")
        return None

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
