# ElastiCache Redis, cluster mode enabled, in private subnets. ioredis Cluster in
# packages/core connects via the configuration endpoint.
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project}-redis"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project}-redis"
  description          = "${var.project} cache"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t4g.small"
  port                 = 6379

  # Cluster mode enabled: shards with replicas.
  num_node_groups         = 2
  replicas_per_node_group = 1

  automatic_failover_enabled = true
  transit_encryption_enabled = true

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
}
