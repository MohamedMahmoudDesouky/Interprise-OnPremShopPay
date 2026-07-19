#!/usr/bin/env bash
set -euo pipefail

helm repo add kong https://charts.konghq.com
helm repo update

helm upgrade \
  --install kong kong/kong \
  --namespace shoppay-gateway \
  --create-namespace \
  -f values-base.yaml \
  -f values-prod.yaml
