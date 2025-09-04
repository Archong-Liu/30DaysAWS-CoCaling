"""
S3 前端託管堆疊
託管 React 前端應用
"""

from aws_cdk import (
    Stack,
    aws_s3 as s3,
    RemovalPolicy,
    CfnOutput,
)
from constructs import Construct


class S3FrontendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 只建立預設 S3 儲存桶；CloudFront / OAI / OAC 由人工配置
        self.bucket = s3.Bucket(
            self, "CalendarAppFrontendBucket",
            bucket_name="co-caling-app-frontend",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            public_read_access=False,
            removal_policy=RemovalPolicy.DESTROY,  # 開發環境使用
            auto_delete_objects=True,  # 開發環境使用
            versioned=True
        )

        # 輸出
        CfnOutput(self, "FrontendBucketName", value=self.bucket.bucket_name)
        CfnOutput(self, "FrontendBucketArn", value=self.bucket.bucket_arn)
        # 僅輸出 S3 資訊；CloudFront 由手動建立
