variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_security_group_id" { type = string }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "db_instance_class" { type = string }

resource "aws_db_subnet_group" "main" {
  name       = "innflow-${var.environment}-db"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "innflow-${var.environment}-db-subnet-group"
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "innflow/${var.environment}/db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    dbname   = var.db_name
  })
}

resource "aws_db_instance" "main" {
  identifier             = "innflow-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_encrypted      = true
  db_name                = var.db_name
  username               = var.db_username
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]
  multi_az               = var.environment == "production"
  backup_retention_period = 14
  skip_final_snapshot    = var.environment != "production"
  deletion_protection    = var.environment == "production"

  tags = {
    Name = "innflow-${var.environment}-postgres"
  }
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}
