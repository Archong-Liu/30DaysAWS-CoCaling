"""
DynamoDB 單表設計堆疊
使用單一表格儲存所有業務資料，透過不同的 PK/SK 組合來區分資料類型
"""

from aws_cdk import (
    Stack,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    RemovalPolicy,
    CfnOutput,
)
from constructs import Construct


class DynamoDBStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 單表設計：儲存所有業務資料
        self.table = dynamodb.Table(
            self, "CalendarAppTable",
            table_name="calendar-app-data",
            partition_key=dynamodb.Attribute(
                name="PK",  # Partition Key
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="SK",  # Sort Key
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,  # 開發環境使用
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # GSI1: 用於按類型查詢和排序
        self.table.add_global_secondary_index(
            index_name="GSI1",
            partition_key=dynamodb.Attribute(
                name="GSI1PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI1SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # GSI2: 用於按日期查詢
        self.table.add_global_secondary_index(
            index_name="GSI2",
            partition_key=dynamodb.Attribute(
                name="GSI2PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI2SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # 輸出
        CfnOutput(self, "TableName", value=self.table.table_name)
        CfnOutput(self, "TableArn", value=self.table.table_arn)
        CfnOutput(self, "TableStreamArn", value=self.table.table_stream_arn)
