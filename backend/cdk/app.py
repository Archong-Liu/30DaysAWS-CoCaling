#!/usr/bin/env python3
"""
Calendar App CDK Application
多用戶週曆平台的 CDK 部署應用
"""

import aws_cdk as cdk
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.api_gateway_stack import ApiGatewayStack
from stacks.s3_frontend_stack import S3FrontendStack

app = cdk.App()

# 設定預設環境為 ap-east-1（支援 Cognito）
env = cdk.Environment(
    account=cdk.Aws.ACCOUNT_ID,
    region="ap-east-1"
)

# 建立 Cognito 用戶池
cognito_stack = CognitoStack(app, "CalendarAppCognitoStack", env=env)

# 建立 DynamoDB 表格
dynamodb_stack = DynamoDBStack(app, "CalendarAppDynamoDBStack", env=env)

# 建立 API Gateway
api_gateway_stack = ApiGatewayStack(
    app, 
    "CalendarAppApiGatewayStack",
    cognito_user_pool=cognito_stack.user_pool,
    dynamodb_table=dynamodb_stack.table,
    env=env
)

# 建立 S3 前端託管
s3_frontend_stack = S3FrontendStack(app, "CalendarAppS3FrontendStack", env=env)

app.synth()
