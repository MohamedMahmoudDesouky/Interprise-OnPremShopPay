#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR="${REPORT_DIR:-reports/trivy/current}"

mkdir -p "$REPORT_DIR"

echo "======================================"
echo "ShopPay Image Security Scan"
echo "======================================"
echo "REPORT_DIR=$REPORT_DIR"
echo

PRODUCT_IMAGE=$(kubectl get deploy -n shoppay-product product-service -o jsonpath='{.spec.template.spec.containers[0].image}')
ORDER_IMAGE=$(kubectl get deploy -n shoppay-order order-service -o jsonpath='{.spec.template.spec.containers[0].image}')
PAYMENT_IMAGE=$(kubectl get deploy -n shoppay-payment payment-service -o jsonpath='{.spec.template.spec.containers[0].image}')
CONTACT_IMAGE=$(kubectl get deploy -n shoppay-contact contact-service -o jsonpath='{.spec.template.spec.containers[0].image}')
FRONTEND_IMAGE=$(kubectl get deploy -n shoppay-frontend frontend -o jsonpath='{.spec.template.spec.containers[0].image}')

scan_image() {
  local name="$1"
  local image="$2"

  echo "Scanning $name: $image"

  trivy image --scanners vuln --severity MEDIUM,HIGH,CRITICAL \
    --format table \
    --output "$REPORT_DIR/$name.txt" \
    "$image"

  trivy image --scanners vuln --severity MEDIUM,HIGH,CRITICAL \
    --format json \
    --output "$REPORT_DIR/$name.json" \
    "$image"

  echo "Saved: $REPORT_DIR/$name.txt"
  echo
}

scan_image "product-service" "$PRODUCT_IMAGE"
scan_image "order-service" "$ORDER_IMAGE"
scan_image "payment-service" "$PAYMENT_IMAGE"
scan_image "contact-service" "$CONTACT_IMAGE"
scan_image "frontend" "$FRONTEND_IMAGE"

echo "======================================"
echo "Summary"
echo "======================================"

grep -R "Total:" "$REPORT_DIR"/*.txt || echo "No MEDIUM/HIGH/CRITICAL vulnerabilities found in table reports"

echo
echo "Checking CRITICAL vulnerabilities..."
for image in "$PRODUCT_IMAGE" "$ORDER_IMAGE" "$PAYMENT_IMAGE" "$CONTACT_IMAGE" "$FRONTEND_IMAGE"; do
  trivy image --scanners vuln --severity HIGH,CRITICAL --exit-code 1 "$image" >/dev/null
done

echo
echo "Image security scan passed ✅"
echo "Reports saved in: $REPORT_DIR"
