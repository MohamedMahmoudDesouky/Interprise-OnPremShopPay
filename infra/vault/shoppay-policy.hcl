# infra/vault/shoppay-policy.hcl
# Read-only access to all ShopPay application secrets.
# Bound to every microservice's Kubernetes auth role, and to the
# external-secrets-role used by the External Secrets Operator.
path "secret/data/shoppay/*" {
  capabilities = ["read"]
}

path "secret/metadata/shoppay/*" {
  capabilities = ["read", "list"]
}
