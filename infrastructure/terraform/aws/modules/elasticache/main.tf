variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "redis_security_group_id" { type = string }
variable "node_type" { type = string }

resource "aws_elasticache_subnet_group" "main" {
  name       = "innflow-${var.environment}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "innflow-${var.environment}"
  description                = "InnFlow Redis cluster"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.node_type
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [var.redis_security_group_id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "innflow-${var.environment}-redis"
  }
}

output "endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  value = aws_elasticache_replication_group.main.port
}
