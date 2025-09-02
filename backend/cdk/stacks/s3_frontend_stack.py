"""
S3 前端託管堆疊
託管 React 前端應用
"""

from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_s3_deployment as s3_deployment,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    RemovalPolicy,
    CfnOutput,
)
from constructs import Construct


class S3FrontendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 建立 S3 儲存桶
        self.bucket = s3.Bucket(
            self, "CalendarAppFrontendBucket",
            bucket_name="co-caling-app-frontend",
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,  # 開發環境使用
            auto_delete_objects=True,  # 開發環境使用
            versioned=True
        )


        # 輸出
        CfnOutput(self, "FrontendBucketName", value=self.bucket.bucket_name)
        CfnOutput(self, "FrontendBucketArn", value=self.bucket.bucket_arn)
