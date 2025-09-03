"""
取得日曆事件的 Lambda 函數
"""

import json
import boto3
import os
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def lambda_handler(event, context):
    """
    Lambda 處理函數
    取得指定用戶的日曆事件
    """
    try:
        # 檢查事件結構
        print(f"Event structure: {json.dumps(event, default=str)}")
        
        # 從 Cognito 取得用戶 ID
        if 'requestContext' not in event:
            raise Exception("Missing requestContext in event")
        if 'authorizer' not in event['requestContext']:
            raise Exception("Missing authorizer in requestContext")
        if 'claims' not in event['requestContext']['authorizer']:
            raise Exception("Missing claims in authorizer")
        if 'sub' not in event['requestContext']['authorizer']['claims']:
            raise Exception("Missing sub in claims")
            
        user_id = event['requestContext']['authorizer']['claims']['sub']
        print(f"User ID: {user_id}")
        
        # 取得路徑與查詢參數
        path_params = event.get('pathParameters', {}) or {}
        project_id_from_path = path_params.get('projectId')
        query_params = event.get('queryStringParameters', {}) or {}
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')
        week_of_year = query_params.get('weekOfYear')
        project_id = project_id_from_path or query_params.get('projectId')
        
        # 建立查詢條件
        # 1) 若給 projectId，使用主表 PK=PROJECT# 查該專案的事件
        # 2) 否則使用 GSI1 依使用者查事件，或 GSI2 依日期範圍
        if project_id:
            query_kwargs = {
                'KeyConditionExpression': Key('PK').eq(f'PROJECT#{project_id}') & Key('SK').begins_with('EVENT#'),
                'ConsistentRead': True  # 主表查詢支援強一致，避免讀到未同步的資料
            }
        else:
            query_kwargs = {
                'IndexName': 'GSI1',
                'KeyConditionExpression': Key('GSI1PK').eq(f'USER#{user_id}') & Key('GSI1SK').begins_with('EVENT#')
            }

        if week_of_year:
            # 使用 GSI1 查詢特定週的事件
            query_kwargs['FilterExpression'] = Attr('weekOfYear').eq(week_of_year)
        elif start_date and end_date and not project_id:
            # 使用 GSI2 查詢日期範圍（僅在未指定 projectId 時）
            query_kwargs['IndexName'] = 'GSI2'
            query_kwargs['KeyConditionExpression'] = Key('GSI2PK').eq(f'USER#{user_id}') & Key('GSI2SK').between(start_date, end_date)

        response = table.query(**query_kwargs)

        events = response.get('Items', [])

        # 處理分頁：每次查詢都帶入相同的 Index 與條件
        while 'LastEvaluatedKey' in response:
            response = table.query(
                ExclusiveStartKey=response['LastEvaluatedKey'],
                **query_kwargs
            )
            events.extend(response.get('Items', []))
        
        # 轉換為向後兼容的格式，並包含專案信息
        formatted_events = []
        for event in events:
            # 檢查事件是否包含專案信息
            has_project_info = 'projectId' in event
            
            formatted_event = {
                'userId': user_id,
                'eventId': event.get('eventId') or event['SK'].replace('EVENT#', ''),
                'title': event['title'],
                'description': event.get('description', ''),
                'startDate': event['startDate'],
                'endDate': event['endDate'],
                'weekOfYear': event.get('weekOfYear', ''),
                'allDay': event.get('allDay', False),
                'color': event.get('color', '#3788d8'),
                'createdAt': event['createdAt'],
                'updatedAt': event['updatedAt']
            }
            
            # 如果事件包含專案信息，則添加到返回數據中
            if has_project_info:
                formatted_event['projectId'] = event['projectId']
                formatted_event['projectName'] = event.get('projectName', f'專案 {event["projectId"]}')
                formatted_event['projectDescription'] = event.get('projectDescription', '')
                formatted_event['ownerId'] = event.get('ownerId', user_id)
                
            formatted_events.append(formatted_event)
        
        return build_response(200, {
            'events': formatted_events,
            'count': len(formatted_events)
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
