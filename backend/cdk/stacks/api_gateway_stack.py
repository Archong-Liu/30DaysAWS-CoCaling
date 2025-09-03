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

        # 建立 Lambda 函數
        self.get_calendars_lambda = lambda_.Function(
            self, "GetCalendarsFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/get_calendars"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        self.add_event_lambda = lambda_.Function(
            self, "AddEventFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/add_event"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        self.delete_event_lambda = lambda_.Function(
            self, "DeleteEventFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/delete_event"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        # 新增：專案管理 Lambda 函數
        self.project_manager_lambda = lambda_.Function(
            self, "ProjectManagerFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/project_manager"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        # 新增：任務管理 Lambda 函數
        self.task_manager_lambda = lambda_.Function(
            self, "TaskManagerFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../lambda/task_manager"),
            timeout=Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": dynamodb_table.table_name
            }
        )

        # 授予 Lambda 函數 DynamoDB 權限
        dynamodb_table.grant_read_data(self.get_calendars_lambda)
        dynamodb_table.grant_write_data(self.add_event_lambda)
        dynamodb_table.grant_write_data(self.delete_event_lambda)
        
        # 新增：授予專案和任務管理 Lambda 函數 DynamoDB 權限
        dynamodb_table.grant_read_write_data(self.project_manager_lambda)
        dynamodb_table.grant_read_write_data(self.task_manager_lambda)

        # 建立 API Gateway
        self.api = apigateway.RestApi(
            self, "CalendarAppApi",
            rest_api_name="Calendar App API",
            description="多用戶週曆平台 API",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["http://localhost:3000"],
                allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                allow_headers=["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"],
                allow_credentials=True
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
        get_calendars_integration = apigateway.LambdaIntegration(
            self.get_calendars_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        add_event_integration = apigateway.LambdaIntegration(
            self.add_event_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        delete_event_integration = apigateway.LambdaIntegration(
            self.delete_event_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        # 新增：專案管理 Lambda 整合
        project_manager_integration = apigateway.LambdaIntegration(
            self.project_manager_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        # 新增：任務管理 Lambda 整合
        task_manager_integration = apigateway.LambdaIntegration(
            self.task_manager_lambda,
            request_templates={"application/json": '{"statusCode": "200"}'}
        )

        # 明確授予 API Gateway 調用 Lambda 的權限
        self.get_calendars_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        self.add_event_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        self.delete_event_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        # 新增：專案管理 Lambda 權限
        self.project_manager_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        # 新增：任務管理 Lambda 權限
        self.task_manager_lambda.add_permission(
            "ApiGatewayInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=f"arn:aws:execute-api:{Aws.REGION}:{Aws.ACCOUNT_ID}:{self.api.rest_api_id}/*"
        )

        # calendars 端點已移除

        events.add_method(
            "POST",
            add_event_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        event_id.add_method(
            "DELETE",
            delete_event_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # 新增：專案底下的事件 RESTful 端點
        project_events.add_method(
            "GET",
            get_calendars_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        project_events.add_method(
            "POST",
            add_event_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        project_event_id.add_method(
            "DELETE",
            delete_event_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # 新增：專案管理 API 端點
        projects.add_method(
            "GET",
            project_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        projects.add_method(
            "POST",
            project_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        project_id.add_method(
            "PUT",
            project_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        project_id.add_method(
            "DELETE",
            project_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # 新增：任務管理 API 端點
        tasks.add_method(
            "POST",
            task_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        task_id.add_method(
            "PUT",
            task_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        task_id.add_method(
            "DELETE",
            task_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )
        
        # 新增：專案任務查詢 API 端點
        project_tasks.add_method(
            "GET",
            task_manager_integration,
            authorizer=auth,
            authorization_type=apigateway.AuthorizationType.COGNITO
        )

        # 輸出
        CfnOutput(self, "ApiGatewayUrl", value=self.api.url)
        CfnOutput(self, "ApiGatewayId", value=self.api.rest_api_id)
