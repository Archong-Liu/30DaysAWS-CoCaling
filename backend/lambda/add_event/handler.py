"""
新增日曆事件的 Lambda 函數
"""

import json
import boto3
import os
import uuid
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def lambda_handler(event, context):
    """
    Lambda 處理函數
    新增日曆事件
    """
    try:
        # 從 Cognito 取得用戶 ID
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # 解析請求內容與路徑參數
        body = json.loads(event.get('body', '{}'))
        path_params = event.get('pathParameters') or {}
        project_id_from_path = path_params.get('projectId')
        
        # 驗證必要欄位（事件需隸屬某專案）
        required_fields = ['title', 'startDate', 'endDate']
        for field in required_fields:
            if field not in body:
                return build_response(400, {
                    'error': 'Missing required field',
                    'field': field
                })
        
        # 生成事件 ID
        event_id = str(uuid.uuid4())
        
        # 計算週數
        start_date = datetime.fromisoformat(body['startDate'].replace('Z', '+00:00'))
        week_of_year = f"{start_date.year}-W{start_date.isocalendar()[1]:02d}"
        
        # 決定專案 ID（優先 pathParameters，其次 body）
        project_id = project_id_from_path or body.get('projectId')
        if not project_id:
            return build_response(400, {
                'error': 'Missing projectId'
            })

        # 建立事件項目（統一以專案為分區鍵）
        event_item = {
            'PK': f'PROJECT#{project_id}',
            'SK': f'EVENT#{event_id}',
            # 供使用者維度查詢
            'GSI1PK': f'USER#{user_id}',
            'GSI1SK': f'EVENT#{event_id}',
            # 供使用者 + 日期維度查詢
            'GSI2PK': f'USER#{user_id}',
            'GSI2SK': body['startDate'],
            # 便於 API 回傳與刪除時辨識
            'eventId': event_id,
            'title': body['title'],
            'description': body.get('description', ''),
            'startDate': body['startDate'],
            'endDate': body['endDate'],
            'weekOfYear': week_of_year,
            'allDay': body.get('allDay', False),
            'color': body.get('color', '#3788d8'),
            'entityType': 'EVENT',
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        # 如果事件包含專案信息，則添加到事件項目中
        event_item['projectId'] = project_id
        if 'projectName' in body:
            event_item['projectName'] = body['projectName']
        if 'projectDescription' in body:
            event_item['projectDescription'] = body['projectDescription']
        if 'ownerId' in body:
            event_item['ownerId'] = body['ownerId']
        
        # 儲存到 DynamoDB（避免重複，條件寫入）
        try:
            table.put_item(
                Item=event_item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)"
            )
        except table.meta.client.exceptions.ConditionalCheckFailedException:
            return build_response(409, {
                'error': 'Duplicate event detected'
            })
        
        return build_response(201, {
            'message': 'Event created successfully',
            'event': event_item
        })
        
    except json.JSONDecodeError:
        return build_response(400, {
            'error': 'Invalid JSON format'
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return build_response(500, {
            'error': 'Internal server error',
            'message': str(e)
        })

def build_response(status_code, body):
    """構建 HTTP 響應"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
