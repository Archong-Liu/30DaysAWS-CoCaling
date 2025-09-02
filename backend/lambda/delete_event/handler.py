"""
刪除日曆事件的 Lambda 函數
"""

import json
import boto3
import os
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def lambda_handler(event, context):
    """
    依 userId + eventId 刪除事件
    路徑參數：/events/{eventId}
    需要 Cognito Authorizer，從 claims 取得 sub 作為 userId
    """
    try:
        # 從 Cognito 取得用戶 ID
        user_id = event['requestContext']['authorizer']['claims']['sub']
        # 取得路徑參數
        event_id = event.get('pathParameters', {}).get('eventId')

        if not event_id:
            return build_response(400, {
                'error': 'Missing eventId in path'
            })

        # 刪除項目（使用新單表設計）
        table.delete_item(
            Key={
                'PK': f'EVENT#{event_id}',
                'SK': f'EVENT#{event_id}'
            }
        )

        return build_response(204, {
            'message': 'Event deleted successfully'
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
        'body': json.dumps(body, ensure_ascii=False) if body else ''
    }


