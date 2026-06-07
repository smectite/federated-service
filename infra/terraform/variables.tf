variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "federated-service"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "users_image" {
  type        = string
  description = "ECR image URI for the users subgraph (with tag)"
}

variable "orders_image" {
  type        = string
  description = "ECR image URI for the orders subgraph (with tag)"
}

variable "router_image" {
  type        = string
  description = "ECR image URI for the router (supergraph SDL baked in)"
}

variable "task_cpu" {
  type    = number
  default = 256
}

variable "task_memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 2
}
