تمام يا محمد، نكمل بمرحلة **README + Git cleanup** عشان المشروع يبقى متوثق ومترتب قبل ما نعمل commit.

## 1. اعمل README احترافي

نفّذ:

````bash
cd /home/selcon/Downloads/Interprise-OnPremShopPay

[ -f README.md ] && cp README.md README.old.md

cat > README.md <<'EOF'
# ShopPay Enterprise by Desouky

ShopPay Enterprise is a production-style cloud-native e-commerce platform built with microservices, Kubernetes, Helm, Kong Gateway, PostgreSQL, HashiCorp Vault, strict NetworkPolicies, image security scanning, and a modern Next.js frontend.

The project demonstrates a real enterprise DevOps workflow: secure container builds, service isolation, API gateway routing, secret management, Kubernetes hardening, and production verification.

---

## Architecture

```text
Browser
  |
  v
Frontend Service :30000
  |
  v
Next.js /api Proxy
  |
  v
Kong Gateway
  |
  +--> product-service  -> product PostgreSQL
  +--> order-service    -> order PostgreSQL
  |        |
  |        v
  |    payment-service  -> payment PostgreSQL
  |
  +--> contact-service  -> contact PostgreSQL
````

---

## Services

| Service         | Purpose                                      |
| --------------- | -------------------------------------------- |
| frontend        | Next.js web application                      |
| product-service | Product catalog and admin product management |
| order-service   | Order creation and payment orchestration     |
| payment-service | Mock payment authorization                   |
| contact-service | Contact message handling                     |
| Kong Gateway    | API Gateway and routing layer                |
| HashiCorp Vault | Secret injection and admin credentials       |
| PostgreSQL      | Dedicated database per backend service       |

---

## Kubernetes Namespaces

```text
shoppay-frontend
shoppay-gateway
shoppay-product
shoppay-order
shoppay-payment
shoppay-contact
shoppay-vault
```

---

## Security Features

* Non-root containers
* Runtime images without npm/npx
* HashiCorp Vault Agent injection
* JWT-based admin authentication
* Dedicated ServiceAccounts
* Dedicated PostgreSQL database per service
* Strict Kubernetes NetworkPolicies
* Kong Gateway API routing
* Trivy image scanning
* Current images have 0 Medium/High/Critical vulnerabilities
* Frontend calls APIs through internal `/api` proxy instead of exposing backend URLs in the browser

---

## Current Production Images

```text
selconyt/shoppay-product-service:v11
selconyt/shoppay-order-service:v7
selconyt/shoppay-payment-service:v7
selconyt/shoppay-contact-service:v7
selconyt/shoppay-frontend:v17
```

---

## Deploy

```bash
helm lint charts/shoppay

helm template shoppay charts/shoppay > /tmp/shoppay-rendered.yaml

helm upgrade --install shoppay charts/shoppay
```

---

## Verify Production

Run the production verification script:

```bash
./scripts/verify-production.sh
```

The script checks:

* Pods status
* Deployed images
* Vault status
* NetworkPolicies
* Frontend `/api` proxy
* Product API
* Admin login
* Contact message creation
* Order to payment end-to-end flow

---

## Scan Images

Run Trivy image scanning:

```bash
./scripts/scan-images.sh
```

Reports are saved under:

```text
reports/trivy/current
```

The current scan checks:

```text
MEDIUM
HIGH
CRITICAL
```

The current image set is clean:

```text
0 Medium
0 High
0 Critical
```

---

## Frontend Access

```text
http://192.168.1.113:30000
```

The frontend uses the internal `/api` proxy.

Example:

```text
http://192.168.1.113:30000/api/products
```

This request is proxied internally to Kong Gateway.

---

## Kong Gateway

Kong Gateway is available for direct API testing:

```text
http://192.168.1.113:30080/api/products
```

Opening the Kong root path may return:

```text
no Route matched with those values
```

This is expected because only `/api/*` routes are configured.

---

## Vault Notes

Vault is deployed in standalone mode.

Check Vault status:

```bash
kubectl exec -n shoppay-vault vault-0 -- vault status
```

If Vault is sealed after a restart, unseal it:

```bash
VAULT_UNSEAL_KEY=$(grep 'Unseal Key 1:' /tmp/vault-init.txt | awk '{print $4}')

kubectl exec -n shoppay-vault vault-0 -- vault operator unseal "$VAULT_UNSEAL_KEY"
```

If `product-service` is stuck in `Init:0/1`, check Vault first.

---

## Useful Commands

Check all ShopPay pods:

```bash
kubectl get pods -A | grep shoppay
```

Check all NetworkPolicies:

```bash
kubectl get networkpolicy -n shoppay-product
kubectl get networkpolicy -n shoppay-order
kubectl get networkpolicy -n shoppay-payment
kubectl get networkpolicy -n shoppay-contact
kubectl get networkpolicy -n shoppay-frontend
kubectl get networkpolicy -n shoppay-gateway
```

Check current deployed images:

```bash
kubectl get deploy -n shoppay-product product-service -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-order order-service -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-payment payment-service -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-contact contact-service -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-frontend frontend -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

---

## Production Verification Status

The latest production verification passed:

```text
Pods Running
Vault unsealed
NetworkPolicies applied
Frontend proxy working
Kong routes working
Admin login working
Contact service working
Order to Payment flow working
Trivy scan clean for Medium/High/Critical vulnerabilities
