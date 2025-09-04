"""
統一事件處理 Lambda
負責：
- GET /events 以及 GET /projects/{projectId}/events
- POST /events（建立事件）
- PUT /events（更新事件，若無 id 則視為建立）
- DELETE /projects/{projectId}/events/{eventId}
"""

import json
import boto3
import os
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])


def lambda_handler(event, context):
    try:
        method = event.get('httpMethod')
        path_params = event.get('pathParameters', {}) or {}
        query_params = event.get('queryStringParameters', {}) or {}

        # 使用 Cognito user sub 當 userId
        user_id = event['requestContext']['authorizer']['claims']['sub']

        if method == 'GET':
            return handle_get_events(user_id, path_params, query_params)

        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_create_event(user_id, path_params, body)

        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_upsert_event(user_id, path_params, body)

        if method == 'DELETE':
            # 僅支援 RESTful：/projects/{projectId}/events/{eventId}
            event_id = path_params.get('eventId')
            project_id = path_params.get('projectId')
            if not event_id or not project_id:
                return build_response(400, {
                    'error': 'Missing parameters',
                    'details': 'eventId and projectId are required in path'
                })
            table.delete_item(
                Key={
                    'PK': f'PROJECT#{project_id}',
                    'SK': f'EVENT#{event_id}'
                }
            )
            return build_response(204, {'message': 'Event deleted successfully'})

        return build_response(405, {'error': 'Method Not Allowed'})

    except json.JSONDecodeError:
        return build_response(400, {'error': 'Invalid JSON format'})
    except Exception as e:
        print(f"Error: {str(e)}")
        return build_response(500, {'error': 'Internal server error', 'message': str(e)})


def handle_get_events(user_id, path_params, query_params):
    project_id_from_path = path_params.get('projectId')
    project_id = project_id_from_path or query_params.get('projectId')
    start_date = query_params.get('startDate')
    end_date = query_params.get('endDate')
    week_of_year = query_params.get('weekOfYear')

    if project_id:
        query_kwargs = {
            'KeyConditionExpression': Key('PK').eq(f'PROJECT#{project_id}') & Key('SK').begins_with('EVENT#'),
            'ConsistentRead': True
        }
    else:
        query_kwargs = {
            'IndexName': 'GSI1',
            'KeyConditionExpression': Key('GSI1PK').eq(f'USER#{user_id}') & Key('GSI1SK').begins_with('EVENT#')
        }

    if week_of_year:
        query_kwargs['FilterExpression'] = Attr('weekOfYear').eq(week_of_year)
    elif start_date and end_date and not project_id:
        query_kwargs['IndexName'] = 'GSI2'
        query_kwargs['KeyConditionExpression'] = Key('GSI2PK').eq(f'USER#{user_id}') & Key('GSI2SK').between(start_date, end_date)

    response = table.query(**query_kwargs)
    items = response.get('Items', [])
    while 'LastEvaluatedKey' in response:
        response = table.query(ExclusiveStartKey=response['LastEvaluatedKey'], **query_kwargs)
        items.extend(response.get('Items', []))

    formatted = []
    for it in items:
        evt = {
            'userId': user_id,
            'eventId': it.get('eventId') or it['SK'].replace('EVENT#', ''),
            'title': it['title'],
            'description': it.get('description', ''),
            'startDate': it['startDate'],
            'endDate': it['endDate'],
            'weekOfYear': it.get('weekOfYear', ''),
            'allDay': it.get('allDay', False),
            'color': it.get('color', '#3788d8'),
            'createdAt': it['createdAt'],
            'updatedAt': it['updatedAt']
        }
        if 'projectId' in it:
            evt['projectId'] = it['projectId']
            evt['projectName'] = it.get('projectName', f"專案 {it['projectId']}")
            evt['projectDescription'] = it.get('projectDescription', '')
            evt['ownerId'] = it.get('ownerId', user_id)
        formatted.append(evt)

    return build_response(200, {'events': formatted, 'count': len(formatted)})


def handle_create_event(user_id, path_params, body):
    for f in ['title', 'startDate', 'endDate']:
        if f not in body:
            return build_response(400, {'error': 'Missing required field', 'field': f})

    project_id = path_params.get('projectId') or body.get('projectId')
    if not project_id:
        return build_response(400, {'error': 'Missing projectId'})

    event_id = str(uuid.uuid4())
    start_dt = datetime.fromisoformat(body['startDate'].replace('Z', '+00:00'))
    week_of_year = f"{start_dt.year}-W{start_dt.isocalendar()[1]:02d}"

    item = {
        'PK': f'PROJECT#{project_id}',
        'SK': f'EVENT#{event_id}',
        'GSI1PK': f'USER#{user_id}',
        'GSI1SK': f'EVENT#{event_id}',
        'GSI2PK': f'USER#{user_id}',
        'GSI2SK': body['startDate'],
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
        'updatedAt': datetime.utcnow().isoformat() + 'Z',
        'projectId': project_id
    }
    if 'projectName' in body:
        item['projectName'] = body['projectName']
    if 'projectDescription' in body:
        item['projectDescription'] = body['projectDescription']
    if 'ownerId' in body:
        item['ownerId'] = body['ownerId']

    try:
        table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)")
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        return build_response(409, {'error': 'Duplicate event detected'})

    return build_response(201, {'message': 'Event created successfully', 'event': item})


def handle_upsert_event(user_id, path_params, body):
    # 若含 id/eventId 則更新，否則視為建立
    event_id = body.get('id') or body.get('eventId')
    if not event_id:
        return handle_create_event(user_id, path_params, body)

    project_id = path_params.get('projectId') or body.get('projectId')
    if not project_id:
        return build_response(400, {'error': 'Missing projectId'})

    # 更新字段
    fields = {
        'title': body.get('title'),
        'description': body.get('description'),
        'startDate': body.get('startDate'),
        'endDate': body.get('endDate'),
        'allDay': body.get('allDay'),
        'color': body.get('color'),
        'updatedAt': datetime.utcnow().isoformat() + 'Z'
    }
    # 濾除 None
    fields = {k: v for k, v in fields.items() if v is not None}

    if not fields:
        return build_response(400, {'error': 'No fields to update'})

    # 動態 Update 表達式
    update_expr = 'SET ' + ', '.join([f"#{k} = :{k}" for k in fields.keys()])
    expr_attr_names = {f"#{k}": k for k in fields.keys()}
    expr_attr_values = {f":{k}": v for k, v in fields.items()}

    table.update_item(
        Key={
            'PK': f'PROJECT#{project_id}',
            'SK': f'EVENT#{event_id}'
        },
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values,
        ReturnValues='UPDATED_NEW'
    )

    return build_response(200, {'message': 'Event updated successfully', 'eventId': event_id})


def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False) if body is not None else ''
    }


