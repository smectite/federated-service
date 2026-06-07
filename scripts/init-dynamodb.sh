#!/usr/bin/env sh
# Creates the local DynamoDB tables (and the orders byUser GSI) against
# dynamodb-local. Idempotent: ignores "table already exists" errors.
set -e

ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb:8000}"
REGION="${AWS_REGION:-us-east-1}"
USERS_TABLE="${DYNAMODB_USERS_TABLE:-users}"
ORDERS_TABLE="${DYNAMODB_ORDERS_TABLE:-orders}"

export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local

aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" --region "$REGION" \
  --table-name "$USERS_TABLE" \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "users table exists"

aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" --region "$REGION" \
  --table-name "$ORDERS_TABLE" \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=byUser,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL}' \
  --billing-mode PAY_PER_REQUEST 2>/dev/null || echo "orders table exists"

echo "DynamoDB tables ready."
