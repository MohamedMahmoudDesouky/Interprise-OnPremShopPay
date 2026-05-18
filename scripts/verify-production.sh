#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://192.168.1.113:30000}"

echo "======================================"
echo "ShopPay Production Verification"
echo "======================================"
echo "KONG_URL=$KONG_URL"
echo "FRONTEND_URL=$FRONTEND_URL"
echo

echo "1) Checking pods..."
kubectl get pods -n shoppay-product
kubectl get pods -n shoppay-order
kubectl get pods -n shoppay-payment
kubectl get pods -n shoppay-contact
kubectl get pods -n shoppay-frontend
kubectl get pods -n shoppay-gateway
kubectl get pods -n shoppay-vault
echo

echo "2) Checking deployed images..."
kubectl get deploy -n shoppay-product product-service -o jsonpath='product-service: {.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-order order-service -o jsonpath='order-service: {.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-payment payment-service -o jsonpath='payment-service: {.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-contact contact-service -o jsonpath='contact-service: {.spec.template.spec.containers[0].image}{"\n"}'
kubectl get deploy -n shoppay-frontend frontend -o jsonpath='frontend: {.spec.template.spec.containers[0].image}{"\n"}'
echo

echo "3) Checking Vault status..."
kubectl exec -n shoppay-vault vault-0 -- vault status | grep -E "Sealed|Initialized" || true
echo

echo "4) Checking NetworkPolicies..."
kubectl get networkpolicy -n shoppay-product
kubectl get networkpolicy -n shoppay-order
kubectl get networkpolicy -n shoppay-payment
kubectl get networkpolicy -n shoppay-contact
kubectl get networkpolicy -n shoppay-frontend
kubectl get networkpolicy -n shoppay-gateway
echo

echo "5) Testing frontend /api proxy..."
curl -fsS "$FRONTEND_URL/api/products" >/dev/null
echo "Frontend /api/products OK"
echo

echo "6) Testing Kong product route..."
curl -fsS "$KONG_URL/api/products" >/dev/null
echo "Kong /api/products OK"
echo

echo "7) Testing admin login..."
curl -fsS -X POST "$KONG_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@12345"}' >/dev/null
echo "Admin login OK"
echo

echo "8) Testing contact service..."
curl -fsS -X POST "$KONG_URL/api/contact/messages" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mohamed","email":"test@example.com","topic":"verify-production","message":"Production verification contact test"}' >/dev/null
echo "Contact message OK"
echo

echo "9) Testing order -> payment flow..."
ORDER_RESPONSE=$(curl -fsS -X POST "$KONG_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Mohamed","email":"test@example.com"},"items":[{"productId":"p-001","quantity":1,"price":89}],"total":89}')

echo "$ORDER_RESPONSE" | grep -q '"status":"paid"'
echo "$ORDER_RESPONSE" | grep -q '"paymentId"'
echo "Order -> Payment OK"
echo

echo "======================================"
echo "All production verification checks passed ✅"
echo "======================================"
