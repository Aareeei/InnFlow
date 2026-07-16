variable "aws_region" {
  type        = string
  description = "AWS region for InnFlow infrastructure"
  default     = "us-west-2"
}

variable "environment" {
  type        = string
  description = "Deployment environment (staging, production)"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "artifacts_bucket_name" {
  type        = string
  description = "S3 bucket name for workflow artifacts"
}

variable "db_name" {
  type    = string
  default = "innflow"
}

variable "db_username" {
  type    = string
  default = "innflow"
}

variable "db_instance_class" {
  type    = string
  default = "db.r6g.large"
}

variable "redis_node_type" {
  type    = string
  default = "cache.r6g.large"
}

variable "eks_cluster_version" {
  type    = string
  default = "1.31"
}

variable "eks_node_instance_types" {
  type    = list(string)
  default = ["m6i.xlarge"]
}

variable "eks_node_desired_size" {
  type    = number
  default = 3
}

variable "eks_node_min_size" {
  type    = number
  default = 2
}

variable "eks_node_max_size" {
  type    = number
  default = 10
}
