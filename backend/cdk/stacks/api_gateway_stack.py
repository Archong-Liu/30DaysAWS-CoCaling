"""
API Gateway 堆疊
提供 RESTful API 服務
"""

from aws_cdk import (
    Stack,
    aws_apigateway as apigateway,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    Duration,
    CfnOutput,
    Aws,
)
from constructs import Construct


class ApiGatewayStack(Stack):
    def __init__(
        self, 
        scope: Construct, 
        construct_id: str, 
        cognito_user_pool: cognito.UserPool,
        dynamodb_table: dynamodb.Table,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 建立 Lambda 函數（命名對齊資源與路徑語義）
        # /events 集合資源：GET/POST/PUT 以及 /projects/{projectId}/events/{eventId} 的 DELETE 由同一處理器負責
        self.events_collection_lambda = lambda_.Function(
            self, "EventsCollectionFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/events"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        # 刪除事件由同一個 events 處理器處理，無需單獨函數

        # /projects 集合資源：GET/POST/PUT/DELETE
        self.projects_collection_lambda = lambda_.Function(
            self, "ProjectsCollectionFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/project_manager"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        # /tasks 集合資源：GET/POST/PUT/DELETE
        self.tasks_collection_lambda = lambda_.Function(
            self, "TasksCollectionFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/task_manager"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        # 授予 Lambda 函數 DynamoDB 權限
        dynamodb_table.grant_read_write_data(self.events_collection_lambda)
        
        # 新增：授予專案和任務管理 Lambda 函數 DynamoDB 權限
        dynamodb_table.grant_read_write_data(self.projects_collection_lambda)
        dynamodb_table.grant_read_write_data(self.tasks_collection_lambda)

        # 建立 API Gateway
        self.api = apigateway.RestApi(
            self, "CalendarAppApi",
            rest_api_name="Co-Caling 日暦共編 API",
            description="Co-Caling 日暦共編 - 多用戶共用日曆 API",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["*"],
                allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                allow_headers=["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
            )
        )

        # 建立 Cognito 授權器
        auth = apigateway.CognitoUserPoolsAuthorizer(
            self, "CalendarAppAuthorizer",
            cognito_user_pools=[cognito_user_pool]
        )

        # 建立 API 資源
        # calendars 已移除（保留註解以提醒）
        # calendars = self.api.root.add_resource("calendars")
        events = self.api.root.add_resource("events")
        event_id = events.add_resource("{eventId}")
        
        # 新增：專案管理資源
        projects = self.api.root.add_resource("projects")
        project_id = projects.add_resource("{projectId}")
        
        # 新增：任務管理資源
        tasks = self.api.root.add_resource("tasks")
        task_id = tasks.add_resource("{taskId}")
        
        # 新增：專案任務資源
        project_tasks = project_id.add_resource("tasks")
        # 新增：專案事件資源
        project_events = project_id.add_resource("events")
        project_event_id = project_events.add_resource("{eventId}")

        # 建立 Lambda 整合
        events_collection_integration = apigateway.LambdaIntegration(
            self.events_collection_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        # 單一刪除路由也使用同一整合

        # 新增：專案管理 Lambda 整合
        projects_collection_integration = apigateway.LambdaIntegration(
            self.projects_collection_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        # 新增：任務管理 Lambda 整合
        tasks_collection_integration = apigateway.LambdaIntegration(
            self.tasks_collection_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        # 明確授予 API Gateway 調用 Lambda 的權限
        self.events_collection_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        # 無需額外權限，已授予 events_collection_lambda

        # 新增：專案管理 Lambda 權限
        self.projects_collection_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        # 新增：任務管理 Lambda 權限
        self.tasks_collection_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        # calendars 端點已移除

        # 主要資源端點 - 簡化設計，ID 通過請求體傳遞
        
        # 專案管理 API 端點
        projects.add_method(
            "GET",
            projects_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        projects.add_method(
            "POST",
            projects_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        projects.add_method(
            "PUT",
            projects_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        projects.add_method(
            "DELETE",
            projects_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # RESTful 刪除專案：/projects/{projectId}
        project_id.add_method(
            "DELETE",
            projects_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # 任務管理 API 端點
        tasks.add_method(
            "GET",
            tasks_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        tasks.add_method(
            "POST",
            tasks_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        tasks.add_method(
            "PUT",
            tasks_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        tasks.add_method(
            "DELETE",
            tasks_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        # 事件管理 API 端點
        events.add_method(
            "GET",
            events_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        events.add_method(
            "POST",
            events_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        events.add_method(
            "PUT",
            events_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        # 舊的 DELETE /events 端點已移除，改用 RESTful /projects/{projectId}/events/{eventId}
        
        # RESTful 刪除事件：/projects/{projectId}/events/{eventId}
        project_event_id.add_method(
            "DELETE",
            events_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        # 關聯查詢端點（使用查詢參數過濾）
        project_tasks.add_method(
            "GET",
            tasks_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        project_events.add_method(
            "GET",
            events_collection_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # 輸出
        CfnOutput(self, "ApiGatewayUrl", value=self.api.url)
        CfnOutput(self, "ApiGatewayId", value=self.api.rest_api_id)
