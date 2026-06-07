# ECS Fargate cluster, an internal Cloud Map namespace for subgraph discovery,
# a public ALB fronting the router, and three Fargate services (users, orders,
# router). Subgraphs are private (reachable only via Cloud Map DNS + SG); the
# router is the single public entry point.

resource "aws_ecs_cluster" "main" {
  name = var.project
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project}"
  retention_in_days = 14
}

# ---- Service discovery (Cloud Map) for subgraphs ----
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "${var.project}.internal"
  vpc  = aws_vpc.main.id
}

resource "aws_service_discovery_service" "users" {
  name = "users"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "orders" {
  name = "orders"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config {
    failure_threshold = 1
  }
}

# ---- Public ALB -> router ----
resource "aws_lb" "router" {
  name               = "${var.project}-router"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "router" {
  name        = "${var.project}-router"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/health"
    port                = "8088"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.router.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.router.arn
  }
}

# ---- Common task settings ----
locals {
  common_env = [
    { name = "AWS_REGION", value = var.aws_region },
    { name = "NODE_ENV", value = "production" },
    { name = "REDIS_NODES", value = "${aws_elasticache_replication_group.redis.configuration_endpoint_address}:6379" },
    { name = "REDIS_CLUSTER", value = "true" },
    { name = "REDIS_TLS", value = "true" },
    { name = "KAFKA_BROKERS", value = aws_msk_cluster.kafka.bootstrap_brokers },
  ]
}

# ---- users service ----
resource "aws_ecs_task_definition" "users" {
  family                   = "${var.project}-users"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([
    {
      name      = "users"
      image     = var.users_image
      essential = true
      portMappings = [{ containerPort = 4001 }]
      environment = concat(local.common_env, [
        { name = "USERS_PORT", value = "4001" },
        { name = "DYNAMODB_USERS_TABLE", value = aws_dynamodb_table.users.name },
      ])
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "users"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:4001/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 20
      }
    }
  ])
}

resource "aws_ecs_service" "users" {
  name            = "users"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.users.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.tasks.id]
  }
  service_registries {
    registry_arn = aws_service_discovery_service.users.arn
  }
}

# ---- orders service ----
resource "aws_ecs_task_definition" "orders" {
  family                   = "${var.project}-orders"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([
    {
      name      = "orders"
      image     = var.orders_image
      essential = true
      portMappings = [{ containerPort = 4002 }]
      environment = concat(local.common_env, [
        { name = "ORDERS_PORT", value = "4002" },
        { name = "DYNAMODB_ORDERS_TABLE", value = aws_dynamodb_table.orders.name },
      ])
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "orders"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:4002/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 20
      }
    }
  ])
}

resource "aws_ecs_service" "orders" {
  name            = "orders"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.orders.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.tasks.id]
  }
  service_registries {
    registry_arn = aws_service_discovery_service.orders.arn
  }
}

# ---- router service (public via ALB) ----
# Router image bakes in the composed supergraph.graphql + router config pointing
# at the Cloud Map subgraph DNS names (users.<ns>:4001, orders.<ns>:4002).
resource "aws_ecs_task_definition" "router" {
  family                   = "${var.project}-router"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([
    {
      name      = "router"
      image     = var.router_image
      essential = true
      portMappings = [{ containerPort = 4000 }, { containerPort = 8088 }]
      environment = [
        { name = "APOLLO_ROUTER_LISTEN", value = "0.0.0.0:4000" },
        { name = "USERS_URL", value = "http://users.${aws_service_discovery_private_dns_namespace.internal.name}:4001/graphql" },
        { name = "ORDERS_URL", value = "http://orders.${aws_service_discovery_private_dns_namespace.internal.name}:4002/graphql" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "router"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "router" {
  name            = "router"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.router.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.tasks.id]
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.router.arn
    container_name   = "router"
    container_port   = 4000
  }
  depends_on = [aws_lb_listener.http]
}
