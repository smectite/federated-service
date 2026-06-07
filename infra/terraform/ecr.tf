# ECR repositories for the two subgraph images and the router image. CI pushes
# tagged images here; the *_image variables reference them.
resource "aws_ecr_repository" "users" {
  name                 = "${var.project}/users"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "orders" {
  name                 = "${var.project}/orders"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "router" {
  name                 = "${var.project}/router"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}
