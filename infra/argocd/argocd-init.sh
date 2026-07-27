#!/usr/bin/env bash
# infra/argocd/argocd-init.sh
#
# Idempotent bootstrap of ArgoCD (core install.yaml, no Helm chart involved)
# for the ShopPay platform. Safe to re-run.
#
# Usage:
#   ./infra/argocd/argocd-init.sh
#
# Requires: kubectl

set -euo pipefail

ARGOCD_NS="${ARGOCD_NS:-argocd}"
ARGOCD_VERSION_REF="${ARGOCD_VERSION_REF:-stable}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPLICATIONS_DIR="$REPO_ROOT/k8s/argocd/applications"

log() { echo -e "\033[1;34m[argocd-init]\033[0m $*"; }
err() { echo -e "\033[1;31m[argocd-init][ERROR]\033[0m $*" >&2; }

require_bin() {
  command -v "$1" >/dev/null 2>&1 || { err "'$1' is required but not installed."; exit 1; }
}
require_bin kubectl

# ---------------------------------------------------------------------------
# Step 1: Namespace
# ---------------------------------------------------------------------------
log "Ensuring namespace '$ARGOCD_NS' exists..."
kubectl create namespace "$ARGOCD_NS" --dry-run=client -o yaml | kubectl apply -f -

# ---------------------------------------------------------------------------
# Step 2: CRDs
#
# ArgoCD's CRDs are deliberately NOT bundled in install.yaml (see
# https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)
# and must be applied separately. They are also large enough that a plain
# `kubectl apply` can hit the "metadata.annotations: Too long" limit, so we
# use --server-side --force-conflicts as recommended upstream.
# ---------------------------------------------------------------------------
log "Applying ArgoCD CRDs (applications, appprojects, applicationsets)..."
kubectl apply --server-side --force-conflicts \
  -k "https://github.com/argoproj/argo-cd/manifests/crds?ref=${ARGOCD_VERSION_REF}"

# ---------------------------------------------------------------------------
# Step 3: Core install (server, repo-server, application-controller,
# applicationset-controller, dex, redis, notifications-controller)
# ---------------------------------------------------------------------------
log "Applying ArgoCD core install manifests (ref: ${ARGOCD_VERSION_REF})..."
# --server-side avoids the classic "metadata.annotations: Too long" error:
# install.yaml bundles a copy of the CRDs, and a plain client-side `kubectl
# apply` tries to stuff the whole manifest into the
# kubectl.kubernetes.io/last-applied-configuration annotation, which the
# ApplicationSet CRD schema exceeds. Server-side apply tracks ownership via
# field managers instead, so it has no such size limit.
kubectl apply --server-side --force-conflicts -n "$ARGOCD_NS" \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION_REF}/manifests/install.yaml"

# ---------------------------------------------------------------------------
# Step 4: Wait for the core deployments to be ready before bootstrapping apps
# ---------------------------------------------------------------------------
log "Waiting for argocd-server to become available (up to 5m)..."
kubectl rollout status deployment/argocd-server -n "$ARGOCD_NS" --timeout=300s

log "Waiting for argocd-applicationset-controller to become available (up to 3m)..."
kubectl rollout status deployment/argocd-applicationset-controller -n "$ARGOCD_NS" --timeout=180s

# ---------------------------------------------------------------------------
# Step 5: Bootstrap Applications (the "app of apps" that then manages
# everything else declared in k8s/argocd/applications/)
# ---------------------------------------------------------------------------
if [ -d "$APPLICATIONS_DIR" ]; then
  log "Applying Application manifests from $APPLICATIONS_DIR ..."
  kubectl apply -n "$ARGOCD_NS" -f "$APPLICATIONS_DIR"
else
  err "No $APPLICATIONS_DIR directory found — skipping Application bootstrap."
fi

log "ArgoCD bootstrap complete."
log "Get the initial admin password with:"
log "  kubectl -n $ARGOCD_NS get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
