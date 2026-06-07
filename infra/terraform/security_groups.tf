# Security groups. ALB is public; tasks accept traffic only from the ALB and
# from each other; data stores accept traffic only from tasks.
resource "aws_security_group" "alb" {
  name_prefix = "${var.project}-alb-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "tasks" {
  name_prefix = "${var.project}-tasks-"
  vpc_id      = aws_vpc.main.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ALB -> router (4000) and subgraphs (4001/4002)
resource "aws_security_group_rule" "alb_to_tasks" {
  type                     = "ingress"
  from_port                = 4000
  to_port                  = 4002
  protocol                 = "tcp"
  security_group_id        = aws_security_group.tasks.id
  source_security_group_id = aws_security_group.alb.id
}

# task -> task (router -> subgraphs intra-VPC)
resource "aws_security_group_rule" "tasks_to_tasks" {
  type                     = "ingress"
  from_port                = 4000
  to_port                  = 4002
  protocol                 = "tcp"
  security_group_id        = aws_security_group.tasks.id
  source_security_group_id = aws_security_group.tasks.id
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.project}-redis-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }
}

resource "aws_security_group" "kafka" {
  name_prefix = "${var.project}-kafka-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 9092
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }
}
