# ─── Multi-VPC Networking with Transit Gateway ─────────────────────────────

# ─── Production VPC ─────────────────────────────────────────────────────────

resource "aws_vpc" "production" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

resource "aws_internet_gateway" "production" {
  vpc_id = aws_vpc.production.id

  tags = {
    Name = "production-igw"
  }
}

resource "aws_subnet" "prod_public_1" {
  vpc_id                  = aws_vpc.production.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-central-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "prod-public-1a"
    Tier = "public"
  }
}

resource "aws_subnet" "prod_public_2" {
  vpc_id                  = aws_vpc.production.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "eu-central-1b"
  map_public_ip_on_launch = true

  tags = {
    Name = "prod-public-1b"
    Tier = "public"
  }
}

resource "aws_subnet" "prod_private_1" {
  vpc_id            = aws_vpc.production.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "eu-central-1a"

  tags = {
    Name = "prod-private-1a"
    Tier = "private"
  }
}

resource "aws_subnet" "prod_private_2" {
  vpc_id            = aws_vpc.production.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "eu-central-1b"

  tags = {
    Name = "prod-private-1b"
    Tier = "private"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "prod-nat-eip"
  }
}

resource "aws_nat_gateway" "production" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.prod_public_1.id

  tags = {
    Name = "prod-nat-gw"
  }
}

resource "aws_route_table" "prod_public" {
  vpc_id = aws_vpc.production.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.production.id
  }

  tags = {
    Name = "prod-public-rt"
  }
}

resource "aws_route_table" "prod_private" {
  vpc_id = aws_vpc.production.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.production.id
  }

  tags = {
    Name = "prod-private-rt"
  }
}

resource "aws_route_table_association" "prod_public_1" {
  subnet_id      = aws_subnet.prod_public_1.id
  route_table_id = aws_route_table.prod_public.id
}

resource "aws_route_table_association" "prod_public_2" {
  subnet_id      = aws_subnet.prod_public_2.id
  route_table_id = aws_route_table.prod_public.id
}

resource "aws_security_group" "alb" {
  name        = "prod-alb-sg"
  description = "Allow HTTP/HTTPS inbound"
  vpc_id      = aws_vpc.production.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "prod-alb-sg"
  }
}

resource "aws_security_group" "app" {
  name        = "prod-app-sg"
  description = "Allow traffic from ALB"
  vpc_id      = aws_vpc.production.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "prod-app-sg"
  }
}

resource "aws_security_group" "database" {
  name        = "prod-db-sg"
  description = "Allow traffic from app tier"
  vpc_id      = aws_vpc.production.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name = "prod-db-sg"
  }
}

# ─── Staging VPC ────────────────────────────────────────────────────────────

resource "aws_vpc" "staging" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "staging-vpc"
    Environment = "staging"
  }
}

resource "aws_internet_gateway" "staging" {
  vpc_id = aws_vpc.staging.id

  tags = {
    Name = "staging-igw"
  }
}

resource "aws_subnet" "staging_public" {
  vpc_id                  = aws_vpc.staging.id
  cidr_block              = "10.1.1.0/24"
  availability_zone       = "eu-central-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "staging-public"
  }
}

resource "aws_subnet" "staging_private" {
  vpc_id            = aws_vpc.staging.id
  cidr_block        = "10.1.10.0/24"
  availability_zone = "eu-central-1a"

  tags = {
    Name = "staging-private"
  }
}
