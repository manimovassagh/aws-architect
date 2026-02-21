# ─── S3 Buckets ─────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "static_assets" {
  bucket = "prod-static-assets-eu"

  tags = {
    Name        = "static-assets"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "prod-data-lake-eu"

  tags = {
    Name        = "data-lake"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "prod-access-logs-eu"

  tags = {
    Name = "access-logs"
  }
}

# ─── CloudFront Distribution ───────────────────────────────────────────────

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "s3-static"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "prod-cdn"
  }
}

# ─── API Gateway ───────────────────────────────────────────────────────────

resource "aws_api_gateway_rest_api" "main" {
  name        = "prod-api"
  description = "Production REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "prod-api-gateway"
  }
}

# ─── Lambda Functions ──────────────────────────────────────────────────────

resource "aws_lambda_function" "image_processor" {
  function_name = "image-processor"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 512
  timeout       = 60
  filename      = "lambda/image-processor.zip"

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.static_assets.bucket
    }
  }

  tags = {
    Name = "image-processor"
  }
}

resource "aws_lambda_function" "data_pipeline" {
  function_name = "data-pipeline"
  runtime       = "python3.12"
  handler       = "main.handler"
  memory_size   = 1024
  timeout       = 300
  filename      = "lambda/data-pipeline.zip"

  environment {
    variables = {
      DATA_BUCKET = aws_s3_bucket.data_lake.bucket
    }
  }

  tags = {
    Name = "data-pipeline"
  }
}

# ─── SQS Queues ────────────────────────────────────────────────────────────

resource "aws_sqs_queue" "processing" {
  name                       = "image-processing-queue"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 86400
  delay_seconds              = 0

  tags = {
    Name = "processing-queue"
  }
}

resource "aws_sqs_queue" "dead_letter" {
  name = "image-processing-dlq"

  tags = {
    Name = "processing-dlq"
  }
}

# ─── SNS Topics ────────────────────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name = "production-alerts"

  tags = {
    Name = "prod-alerts"
  }
}

resource "aws_sns_topic" "deployment" {
  name = "deployment-notifications"

  tags = {
    Name = "deploy-notifications"
  }
}
