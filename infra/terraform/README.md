# Terraform — AWS Fargate deployment

Provisions the full runtime: VPC (public/private subnets, NAT), DynamoDB tables,
ElastiCache Redis (cluster mode), MSK (Kafka), ECR repos, IAM roles, an ECS
Fargate cluster, a public ALB fronting the Apollo Router, and private Cloud Map
service discovery for the two subgraphs.

## Topology

```
Internet → ALB (public) → router (Fargate) ──┬─→ users.<ns>:4001  (Fargate, private)
                                              └─→ orders.<ns>:4002 (Fargate, private)
                                                     │
                              DynamoDB ◄─────────────┤
                              ElastiCache Redis ◄─────┤
                              MSK (Kafka) ◄───────────┘
```

## Usage

1. Build and push images to ECR (repos are created by this stack — apply once
   for the repos, push, then apply again with image vars, or import existing).
2. Compose the supergraph SDL and bake it into the router image (see root
   `Dockerfile.router` / CI), pointing subgraph URLs at the Cloud Map DNS names.
3. Apply:

   ```sh
   terraform init
   terraform apply \
     -var "users_image=<acct>.dkr.ecr.<region>.amazonaws.com/federated-service/users:latest" \
     -var "orders_image=<acct>.dkr.ecr.<region>.amazonaws.com/federated-service/orders:latest" \
     -var "router_image=<acct>.dkr.ecr.<region>.amazonaws.com/federated-service/router:latest"
   ```

4. `terraform output router_url` → the public supergraph endpoint.

## Notes

- Secrets (if added later) belong in SSM Parameter Store / Secrets Manager and
  should be injected via the task definition `secrets` block, not `environment`.
- TLS termination: add an ACM cert + HTTPS listener on the ALB for production.
- MSK uses `TLS_PLAINTEXT`; tighten to `TLS` only and IAM auth for production.
