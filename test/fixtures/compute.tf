# ─── ALB + Target Group ─────────────────────────────────────────────────────

resource "aws_lb" "production" {
  name               = "prod-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnet_ids         = [aws_subnet.prod_public_1.id, aws_subnet.prod_public_2.id]

  tags = {
    Name = "prod-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "prod-app-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.production.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }

  tags = {
    Name = "prod-app-tg"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.production.arn
  port              = 443
  protocol          = "HTTPS"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ─── ECS Fargate Cluster ───────────────────────────────────────────────────

resource "aws_ecs_cluster" "production" {
  name = "prod-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "prod-ecs-cluster"
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "api-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "123456789.dkr.ecr.eu-central-1.amazonaws.com/api:latest"
      cpu       = 512
      memory    = 1024
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/api"
          awslogs-region        = "eu-central-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "api-task-def"
  }
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.production.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.prod_private_1.id, aws_subnet.prod_private_2.id]
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "api"
    container_port   = 8080
  }

  tags = {
    Name = "api-ecs-service"
  }
}

# ─── EC2 Bastion Host ──────────────────────────────────────────────────────

resource "aws_instance" "bastion" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.prod_public_1.id
  vpc_security_group_ids = [aws_security_group.alb.id]

  tags = {
    Name = "bastion-host"
    Role = "bastion"
  }
}

# ─── RDS PostgreSQL ────────────────────────────────────────────────────────

resource "aws_db_instance" "postgres" {
  identifier             = "prod-postgres"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.r6g.large"
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_encrypted      = true
  multi_az               = true
  db_name                = "appdb"
  username               = "admin"
  password               = "changeme"
  subnet_id              = aws_subnet.prod_private_1.id
  vpc_security_group_ids = [aws_security_group.database.id]
  skip_final_snapshot    = false

  tags = {
    Name = "prod-postgres"
  }
}

# ─── ElastiCache Redis ─────────────────────────────────────────────────────

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "prod-redis"
  engine               = "redis"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 1
  port                 = 6379
  subnet_group_name    = "prod-cache-subnet-group"
  security_group_ids   = [aws_security_group.app.id]

  tags = {
    Name = "prod-redis"
  }
}

# ─── Staging EC2 instance ──────────────────────────────────────────────────

resource "aws_instance" "staging_app" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.small"
  subnet_id              = aws_subnet.staging_public.id
  vpc_security_group_ids = [aws_security_group.alb.id]

  tags = {
    Name = "staging-app-server"
  }
}
