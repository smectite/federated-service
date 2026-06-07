# DynamoDB tables, on-demand billing. Orders table carries a byUser GSI to back
# the User.orders federation resolver.
resource "aws_dynamodb_table" "users" {
  name         = "${var.project}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "orders" {
  name         = "${var.project}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "userId"
    type = "S"
  }
  global_secondary_index {
    name            = "byUser"
    hash_key        = "userId"
    projection_type = "ALL"
  }
}
