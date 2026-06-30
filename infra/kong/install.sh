#!/usr/bin/env bash
set -euo pipefail

helm upgrade \
  --install kong kong/kong \
  --namespace shoppay-gateway \
  --create-namespace \
  -f values-base.yaml \
  -f values-dev.yaml
