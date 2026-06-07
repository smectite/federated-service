output "router_url" {
  description = "Public GraphQL endpoint (supergraph) served by the router"
  value       = "http://${aws_lb.router.dns_name}/"
}

output "ecr_users_repo" {
  value = aws_ecr_repository.users.repository_url
}

output "ecr_orders_repo" {
  value = aws_ecr_repository.orders.repository_url
}

output "ecr_router_repo" {
  value = aws_ecr_repository.router.repository_url
}

output "redis_configuration_endpoint" {
  value = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

output "kafka_bootstrap_brokers" {
  value = aws_msk_cluster.kafka.bootstrap_brokers
}
