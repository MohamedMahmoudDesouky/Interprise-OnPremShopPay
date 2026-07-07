## Interprise On-Premises ShopPay 
**Classification:** On-prem DevSecOps Production Project  
**Author:** By Mohamed Mahmoud Desouky DevSecOps Engineer
**Status:** Approved & Verified   

---

## Table of Contents
1. **Introduction and Architectural Blueprint**
   - 1.1 Architectural Pillars & Zero-Trust Model
   - 1.2 Kubernetes Namespace Isolation Strategy
   - 1.3 Enterprise System Architecture Diagram
2. **Detailed File and Folder Layout / Directory Tree Analysis**
3. **Core Services & Microservices Architecture**
   - 3.1 Next.js Frontend Application
   - 3.2 Backend Microservices (Product, Order, Payment, Contact)
4. **Database Isolation & State Management**
5. **Security Architecture & SecOps Hardening**
   - 5.1 Calico Network Policies (Zero-Trust Design)
   - 5.2 Centralized Secret Management (HashiCorp Vault & Vault Agent Injector)
   - 5.3 Pod Hardening and Kubernetes Security Standards
   - 5.4 Trivy Container Vulnerability Scanning
6. **API Gateway & Routing Layer (Kong Ingress Controller)**
7. **GitOps & Continuous Deployment (Helm + ArgoCD)**
8. **Monitoring, Observability & Alerting**
9. **Horizontal Pod Autoscaling (HPA)**
10. **Operational Troubleshooting & Incident Log Deep Dives**
    - 10.1 Case Study A: Next.js Cache Write Errors on Read-Only Filesystems
    - 10.2 Case Study B: ArgoCD Gateway Routing Hang (Namespace Routing Limits)
    - 10.3 Case Study C: Vault Agent Injection Connection Failures

---

## 1. Introduction and Architectural Blueprint

The **Interprise-OnPremShopPay** is an enterprise-grade, microservices-based Point of Sale (POS) and retail management application deployed on an on-premises Kubernetes cluster. The architecture is built around the **Zero-Trust Security Model**, meaning that no microservice is trusted by default, all network traffic is blocked unless explicitly whitelisted, and all secrets are dynamically injected in memory rather than being stored on disk or in source code repositories.

### 1.1 Architectural Pillars & Zero-Trust Model
* **Database-per-Service Isolation:** To prevent data coupling and enforce security boundaries, each microservice possesses its own isolated PostgreSQL database. Cross-database queries are strictly prohibited; microservices communicate only via API calls routed through the API Gateway.
* **Zero-Trust Microsegmentation:** Network communication is restricted by default. Workloads can only talk to verified destinations explicitly defined in Calico NetworkPolicies.
* **Externalized Secrets Management:** Sensitive credentials, certificates, and API tokens are stored securely in HashiCorp Vault. Workloads dynamically consume secrets through the Vault Agent Injector using file-based volume mounts, ensuring no secret is ever committed to source control or exposed in environment variables.
* **GitOps-driven Infrastructure:** The cluster state is continuously reconciled with the Git repository using Helm and ArgoCD, ensuring infrastructure-as-code consistency.

### 1.2 Kubernetes Namespace Isolation Strategy
To enforce strict boundary controls and operational isolation, the cluster is segmented into nine distinct Kubernetes namespaces. Workloads are placed in these namespaces according to their security classification, data sensitivity, and operational role:

| Namespace | Key Resources | Operational Role | Rationale for Isolation |
| :--- | :--- | :--- | :--- |
| **`shoppay-frontend`** | Next.js Frontend Deployment, frontend Service, HPA | Presentation layer | Isolates the public-facing UI. By preventing direct access to backend microservices and databases, any frontend compromise is contained and cannot perform lateral traversal to database storage. |
| **`shoppay-gateway`** | Kong Ingress Controller, Kong Admin & Proxy Pods, Ingress resources | API Gateway & Routing | Entry point for all external client traffic. Handles SSL termination, routing rules, rate-limiting, and web application firewall properties. Isolating the gateway ensures traffic routing control is decoupled from business logic. |
| **`shoppay-product`** | Product Service, PostgreSQL StatefulSet, service accounts, secrets-store | Product Catalog | Houses product metadata. Database isolation ensures order/billing services cannot directly modify product inventories or prices except through authorized API contracts. |
| **`shoppay-order`** | Order Service, PostgreSQL StatefulSet, service accounts | Transaction Processing | Manages customer orders and checkout sequences. Separated from payment processing to limit exposure of transaction logs and isolate order states. |
| **`shoppay-payment`** | Payment Service, PostgreSQL StatefulSet, service accounts | Billing & Payment Audits | Highly secure zone processing financial transactions. Isolated to limit the PCI-DSS compliance auditing scope strictly to this namespace, shielding payment details from external systems. |
| **`shoppay-contact`** | Contact Service, PostgreSQL StatefulSet, service accounts | Support & Contact Forms | Low-privilege public inputs. Segregating contact form processing prevents form vulnerabilities (such as SQL injections or spam loops) from impacting transactional operations. |
| **`shoppay-vault`** | HashiCorp Vault Server, Vault Agent Injector | Secrets Management | The central authority for credentials, keys, and tokens. Restricts access exclusively to authorized ServiceAccounts requesting credentials, ensuring zero persistent secrets inside application containers. |
| **`shoppay`** | Kube-Prometheus-Stack (Prometheus, Grafana, Alertmanager, Kube-State-Metrics) | Monitoring & Observability | Observability subsystem. Decouples monitoring resources and permissions from application workloads, protecting metric scrape endpoints and Grafana dashboards. |
| **`argocd`** | ArgoCD Application Controller, Repo Server, Dex, Redis | GitOps CD Operator | System controller with cluster-admin access. Separated to ensure application code cannot modify CD control loops, safeguarding deployment integrity. |

### 1.3 Enterprise System Architecture Diagram
The diagram below provides a comprehensive map of the system components, namespace boundaries, resources, network policies, databases, monitoring metrics scraping, dynamic secret injection pipelines, and user traffic routing:

```mermaid
graph TD
    %% Namespaces (Subgraphs)
    subgraph Client ["Client Layer / External Network"]
        Browser["User Browser"]
    end

    subgraph shoppay-gateway ["Namespace: shoppay-gateway"]
        KongProxy["Kong API Gateway Proxy<br>(Service: NodePort 30080/TCP)"]
        KongController["Kong Ingress Controller"]
        NP_Gateway["NP: gateway-allow-egress-to-services"]
    end

    subgraph shoppay-frontend ["Namespace: shoppay-frontend"]
        FrontendDeployment["Frontend Pods (Next.js)<br>(Min: 2 / Max: 10 Replicas)"]
        FrontendService["Service: frontend (NodePort 30000)"]
        NP_Frontend["NP: frontend-allow-egress-to-gateway"]
    end

    subgraph shoppay-product ["Namespace: shoppay-product"]
        ProductDeployment["Product Service Pods<br>(Min: 2 / Max: 10 Replicas)"]
        ProductService["Service: product-service (ClusterIP 4001)"]
        ProductDB["Product DB (PostgreSQL StatefulSet)<br>(shoppay-product-postgresql-0)"]
        ProductDBService["Service: product-postgresql (Port 5432)"]
        NP_Product["NP: product-allow-ingress-from-kong"]
    end

    subgraph shoppay-order ["Namespace: shoppay-order"]
        OrderDeployment["Order Service Pods<br>(Min: 2 / Max: 10 Replicas)"]
        OrderService["Service: order-service (ClusterIP 4002)"]
        OrderDB["Order DB (PostgreSQL StatefulSet)<br>(shoppay-order-postgresql-0)"]
        OrderDBService["Service: order-postgresql (Port 5432)"]
        NP_Order["NP: order-allow-ingress-from-kong"]
    end

    subgraph shoppay-payment ["Namespace: shoppay-payment"]
        PaymentDeployment["Payment Service Pods<br>(Min: 2 / Max: 10 Replicas)"]
        PaymentService["Service: payment-service (ClusterIP 4003)"]
        PaymentDB["Payment DB (PostgreSQL StatefulSet)<br>(shoppay-payment-postgresql-0)"]
        PaymentDBService["Service: payment-postgresql (Port 5432)"]
        NP_Payment["NP: payment-allow-ingress-from-kong"]
    end

    subgraph shoppay-contact ["Namespace: shoppay-contact"]
        ContactDeployment["Contact Service Pods<br>(Min: 2 / Max: 10 Replicas)"]
        ContactService["Service: contact-service (ClusterIP 4004)"]
        ContactDB["Contact DB (PostgreSQL StatefulSet)<br>(shoppay-contact-postgresql-0)"]
        ContactDBService["Service: contact-postgresql (Port 5432)"]
        NP_Contact["NP: contact-allow-ingress-from-kong"]
    end

    subgraph shoppay-vault ["Namespace: shoppay-vault"]
        VaultStatefulSet["Vault StatefulSet (vault-0)<br>(Active / Port 8200)"]
        VaultInjector["Vault Agent Injector"]
        VaultService["Service: vault (ClusterIP 8200)"]
    end

    subgraph shoppay-monitoring ["Namespace: shoppay"]
        Prometheus["Prometheus Server<br>(Port 9090)"]
        Grafana["Grafana UI<br>(NodePort 30300)"]
        AlertManager["Alertmanager<br>(Port 9093)"]
        NodeExporter["Node Exporter"]
        KubeStateMetrics["Kube State Metrics"]
    end

    subgraph argocd ["Namespace: argocd"]
        ArgoCDServer["ArgoCD Server UI<br>(Host: argocd.local)"]
        ArgoCDRepo["ArgoCD Repo Server"]
        ArgoCDController["ArgoCD Controller"]
    end

    %% Routing / Traffic flows
    Browser -->|Port 30000| FrontendService
    FrontendService --> FrontendDeployment
    FrontendDeployment -->|API Rewrite /api/*| KongProxy

    Browser -->|Port 30080| KongProxy

    KongProxy -->|Egress Whitelisted by NP_Gateway| ProductService
    KongProxy -->|Egress Whitelisted by NP_Gateway| OrderService
    KongProxy -->|Egress Whitelisted by NP_Gateway| PaymentService
    KongProxy -->|Egress Whitelisted by NP_Gateway| ContactService

    ProductService --> ProductDeployment
    OrderService --> OrderDeployment
    PaymentService --> PaymentDeployment
    ContactService --> ContactDeployment

    %% DB Connections
    ProductDeployment -->|Port 5432 - NP Whitelisted| ProductDBService
    ProductDBService --> ProductDB

    OrderDeployment -->|Port 5432 - NP Whitelisted| OrderDBService
    OrderDBService --> OrderDB
    OrderDeployment -->|Port 4003 - NP Whitelisted| PaymentService

    PaymentDeployment -->|Port 5432 - NP Whitelisted| PaymentDBService
    PaymentDBService --> PaymentDB

    ContactDeployment -->|Port 5432 - NP Whitelisted| ContactDBService
    ContactDBService --> ContactDB

    %% Secret Management (Vault Injection)
    ProductDeployment -.->|Template Ingress/Egress Port 8200| VaultService
    OrderDeployment -.->|Template Ingress/Egress Port 8200| VaultService
    PaymentDeployment -.->|Template Ingress/Egress Port 8200| VaultService
    ContactDeployment -.->|Template Ingress/Egress Port 8200| VaultService

    %% Monitoring
    Prometheus -->|Scrape metrics via ServiceMonitor| ProductDeployment
    Prometheus -->|Scrape metrics via ServiceMonitor| OrderDeployment
    Prometheus -->|Scrape metrics via ServiceMonitor| PaymentDeployment
    Prometheus -->|Scrape metrics via ServiceMonitor| ContactDeployment
    Prometheus -->|Scrape metrics via ServiceMonitor| FrontendDeployment
    Prometheus -->|Scrape metrics| NodeExporter
    Prometheus -->|Scrape metrics| KubeStateMetrics
    Grafana -->|Query Metrics| Prometheus
    Prometheus -->|Send Alerts| AlertManager

    %% GitOps Reconcile
    ArgoCDController -.->|App State Sync| FrontendDeployment
    ArgoCDController -.->|App State Sync| ProductDeployment
    ArgoCDController -.->|App State Sync| OrderDeployment
    ArgoCDController -.->|App State Sync| PaymentDeployment
    ArgoCDController -.->|App State Sync| ContactDeployment
```

---

## 2. Detailed File and Folder Layout

The workspace is organized to decouple local infrastructure config, application logic, and Helm deployment scripts.

```
/home/selcon/Downloads/Interprise-OnPremShopPay/
├── .gitlab-ci.yml                   # GitLab CI/CD Pipeline definition for image building & security scans
├── .trivyignore                     # CVE exclusion rules for Trivy container vulnerability scanning
├── README.md                        # Setup guides and high-level description
├── api-gateway/                     # Custom configurations and definitions for Kong Gateway
│   ├── kong-values.yaml             # Custom Helm values override for the Kong Gateway deployment
│   └── plugins/                     # Kong custom plugins (rate-limiting, security headers)
├── backend/                         # Backend Microservices source code
│   └── services/
│       ├── contact-service/         # Support, feedback, and customer queries handler
│       │   ├── Dockerfile           # Multi-stage Dockerfile for contact service
│       │   ├── package.json         # Node.js dependencies
│       │   └── src/                 # Source code files
│       ├── order-service/           # Order processing, state tracking, and checkout backend
│       │   ├── Dockerfile           # Multi-stage Dockerfile for order service
│       │   ├── package.json         # Node.js dependencies
│       │   └── src/                 # Source code files
│       ├── payment-service/         # Payment integration and authorization logic
│       │   ├── Dockerfile           # Multi-stage Dockerfile for payment service
│       │   ├── package.json         # Node.js dependencies
│       │   └── src/                 # Source code files
│       └── product-service/         # Product catalog management, details, and inventory
│           ├── Dockerfile           # Multi-stage Dockerfile for product service
│           ├── package.json         # Node.js dependencies
│           └── src/                 # Source code files
├── charts/                          # Helm charts for local resource packaging
│   └── shoppay/                     # Core Shoppay Helm Chart
│       ├── Chart.yaml               # Helm chart metadata and dependency configurations
│       ├── templates/               # Kubernetes resource templates (Deployments, Services, Policies)
│       │   ├── argocd-ingress.yaml  # ArgoCD UI routing ingress rules
│       │   ├── frontend.yaml        # Next.js Frontend deployment configuration
│       │   ├── networkpolicy-gateway.yaml # NetworkPolicy rules for Kong API Gateway
│       │   ├── networkpolicy-frontend.yaml # NetworkPolicy rules for Next.js Frontend
│       │   ├── networkpolicy-product.yaml  # NetworkPolicy rules for Product service
│       │   ├── networkpolicy-order.yaml    # NetworkPolicy rules for Order service
│       │   ├── networkpolicy-payment.yaml  # NetworkPolicy rules for Payment service
│       │   ├── networkpolicy-contact.yaml  # NetworkPolicy rules for Contact service
│       │   ├── networkpolicy-argocd-server-allow-kong.yaml # Direct calico rules for ArgoCD
│       │   ├── product-service.yaml # Product service and database configurations
│       │   ├── order-service.yaml   # Order service and database configurations
│       │   ├── payment-service.yaml # Payment service and database configurations
│       │   ├── contact-service.yaml # Contact service and database configurations
│       │   ├── serviceaccounts.yaml # Common ServiceAccounts configuration
│       │   └── secrets-store.yaml   # SecretStore resources for Vault integration
│       └── values.yaml              # Local parameters, tags, secrets-mappings, and configuration variables
├── frontend/                        # Next.js Web UI Application
│   ├── Dockerfile                   # Multistage production Dockerfile for Next.js (non-root runner)
│   ├── next.config.js               # Next.js rewrite rules acting as a local reverse proxy to Kong
│   ├── package.json                 # Node dependencies and build scripts
│   ├── public/                      # Static assets (images, icons, manifest files)
│   └── src/                         # React UI Pages, assets, components, and state management
├── helm/                            # System-wide third-party Helm values and configurations
│   └── values-prometheus.yaml       # Configuration values override for Kube-Prometheus-Stack
├── infra/                           # Cluster infra addons (Vault configuration, ingress controllers, monitoring)
│   ├── kong/                        # Kong Ingress Controller CRDs and manifests
│   ├── monitoring/                  # Prometheus Operator and Grafana dashboard configurations
│   └── vault/                       # HashiCorp Vault initialization, policies, and auth-role bindings
│       ├── vault-init.sh            # Automation script for Vault setup and config
│       ├── shoppay-policy.hcl       # Policy restricting microservices secret access paths
│       └── vault-configmap.yaml     # Custom configuration map for Vault agents
├── k8s/                             # Standard Kubernetes raw manifests (development/testing fallbacks)
├── reports/                         # Generated security audits, test scripts, and debugging output
└── scripts/                         # Operational helper scripts for local automation
    ├── scan-images.sh               # Local script to execute Trivy security scanner on images
    └── test-pos.sh                  # Production integration and connectivity verification test suite
```

---

## 3. Core Services & Microservices Architecture

### 3.1 Next.js Frontend Application
* **Workspace Path:** `/home/selcon/Downloads/Interprise-OnPremShopPay/frontend`
* **Port:** `3000` (mapped via NodePort `30000` for direct network access)
* **Configuration Summary:** Next.js uses client-side fetch calls to `/api/*` routes. To prevent Cross-Origin Resource Sharing (CORS) problems, `next.config.js` configures rewrite rules that act as an internal reverse-proxy, redirecting all `/api/:path*` calls directly to the Kong API Gateway proxy IP inside the cluster.

```javascript
// frontend/next.config.js
module.exports = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://kong-kong-proxy.shoppay-gateway.svc.cluster.local:80/api/:path*',
      },
    ];
  },
};
```

* **Production Multi-Stage Container Setup:** The frontend Dockerfile utilizes node:18-alpine for building and running. It leverages `output: 'standalone'` to reduce image footprint by copying only the necessary files for production run.

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

---

### 3.2 Backend Microservices (Product, Order, Payment, Contact)
All services are written in Node.js/Express, exposing REST APIs mapped to specific routes in the Kong Gateway:

#### A. Product Service (`product-service`):
- **Path:** `/home/selcon/Downloads/Interprise-OnPremShopPay/backend/services/product-service`
- **Port:** `4001`
- **DB Connection:** `postgresql://product_user:$(PRODUCT_DB_PASSWORD)@shoppay-product-postgresql:5432/productdb`
- **API Endpoints:**
  - `GET /api/products` (returns all items)
  - `GET /api/products/:id` (returns individual item details)
  - `POST /api/products` (restricted admin access to add items)
  - `GET /health` (readiness and liveness check)

#### B. Order Service (`order-service`):
- **Path:** `/home/selcon/Downloads/Interprise-OnPremShopPay/backend/services/order-service`
- **Port:** `4002`
- **DB Connection:** `postgresql://order_user:$(ORDER_DB_PASSWORD)@shoppay-order-postgresql:5432/orderdb`
- **API Endpoints:**
  - `POST /api/orders` (creates new checkout order)
  - `GET /api/orders/:id` (gets order state)
  - `GET /health` (readiness and liveness check)

#### C. Payment Service (`payment-service`):
- **Path:** `/home/selcon/Downloads/Interprise-OnPremShopPay/backend/services/payment-service`
- **Port:** `4003`
- **DB Connection:** `postgresql://payment_user:$(PAYMENT_DB_PASSWORD)@shoppay-payment-postgresql:5432/paymentdb`
- **API Endpoints:**
  - `POST /api/payments` (processes payments and audits status)
  - `GET /health` (readiness and liveness check)

#### D. Contact Service (`contact-service`):
- **Path:** `/home/selcon/Downloads/Interprise-OnPremShopPay/backend/services/contact-service`
- **Port:** `4004`
- **DB Connection:** `postgresql://contact_user:$(CONTACT_DB_PASSWORD)@shoppay-contact-postgresql:5432/contactdb`
- **API Endpoints:**
  - `POST /api/contact` (submits user support forms)
  - `GET /health` (readiness and liveness check)

---

## 4. Database Isolation & State Management

Each microservice is bound to a dedicated, independent PostgreSQL database to maintain strict database isolation. The services do not share connection strings or access credentials.

```
Microservice          Database Deployment                 Storage Class    Size
-------------------------------------------------------------------------------
product-service   --> shoppay-product-postgresql-0    --> local-path   --> 2Gi
order-service     --> shoppay-order-postgresql-0      --> local-path   --> 2Gi
payment-service   --> shoppay-payment-postgresql-0    --> local-path   --> 2Gi
contact-service   --> shoppay-contact-postgresql-0    --> local-path   --> 2Gi
```

### PostgreSQL Helm Values Override Structure
Each database is managed dynamically via individual instances of Bitnami PostgreSQL subcharts inside Helm. Here is an example of the values configuration applied:

```yaml
# charts/shoppay/values.yaml (Database Extraction snippet)
product-postgresql:
  enabled: true
  namespaceOverride: shoppay-product
  architecture: standalone
  auth:
    username: product_user
    database: productdb
    existingSecret: product-db-credentials
    secretKeys:
      adminPasswordKey: postgres-password
      userPasswordKey: password
  primary:
    persistence:
      enabled: true
      storageClass: local-path
      size: 2Gi
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    podSecurityContext:
      enabled: true
      fsGroup: 1001
    containerSecurityContext:
      enabled: true
      runAsUser: 1001
      runAsGroup: 1001
      runAsNonRoot: true
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: false
```

---

## 5. Security Architecture & SecOps Hardening

### 5.1 Calico Network Policies (Zero-Trust Design)
Network communications are governed by strict microsegmentation via Kubernetes/Calico NetworkPolicies. By default, namespaces utilize `ingress.policyTypes: [Ingress, Egress]` deny rules, and traffic is explicitly whitelisted through dedicated network configuration manifests.

#### A. Gateway Network Policy (`networkpolicy-gateway.yaml`)
Ensures the Kong API Gateway proxy only communicates with internal services and Kubernetes infrastructure DNS:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gateway-allow-egress-to-product
  namespace: shoppay-gateway
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: kong
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: shoppay-product
          podSelector:
            matchLabels:
              app.kubernetes.io/name: product-service
      ports:
        - protocol: TCP
          port: 4001
```

#### B. Microservice Network Policy (`networkpolicy-product.yaml`)
Restricts the product service namespace, accepting ingress traffic **only** from the Kong Ingress Controller proxy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: product-allow-ingress-from-kong
  namespace: shoppay-product
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: product-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: shoppay-gateway
          podSelector:
            matchLabels:
              app.kubernetes.io/name: kong
      ports:
        - protocol: TCP
          port: 4001
  egress:
    # Egress to PostgreSQL Database
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: product-postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Egress to Vault Server for secret extraction
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: shoppay-vault
          podSelector:
            matchLabels:
              app.kubernetes.io/name: vault
      ports:
        - protocol: TCP
          port: 8200
```

---

### 5.2 Centralized Secret Management (HashiCorp Vault)
Workloads dynamically read credentials from **HashiCorp Vault** using the sidecar injector. No static secrets exist in configurations.

```
       [ Kubernetes API Server ]
                   │
                   ▼ Pod creation triggers mutating webhook
       [ Vault Agent Injector Pod ]
                   │
                   ▼ Injects init & sidecar containers
       +---------------------------------------------+
       | WORKLOAD POD                                |
       |                                             |
       |  [ init-container ] -- Authenticates &      |
       |                       downloads secrets     |
       |                              │              |
       |                              ▼              |
       |  [ shared emptyDir volume (/vault/secrets) ]|
       |                              ▲              |
       |                              │              |
       |  [ sidecar-container ] - Renew tokens       |
       |                          periodically       |
       |                                             |
       |  [ app-container ] ----- Reads credentials  |
       |                          from JSON file     |
       +---------------------------------------------+
```

#### A. Vault Access Policy Definition (`shoppay-policy.hcl`)
Restricts microservices to their specific path configurations:

```hcl
path "secret/data/shoppay/product/*" {
  capabilities = ["read"]
}
path "secret/data/shoppay/order/*" {
  capabilities = ["read"]
}
path "secret/data/shoppay/payment/*" {
  capabilities = ["read"]
}
path "secret/data/shoppay/contact/*" {
  capabilities = ["read"]
}
```

#### B. Service Secret Consumption Injection configuration
Microservice deployments are configured with the following annotations to automatically invoke Vault Agent templates at startup:

```yaml
# charts/shoppay/templates/product-service.yaml (Deployment Extract)
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "shoppay-product-role"
        vault.hashicorp.com/agent-inject-secret-admin-auth.json: "secret/data/shoppay/product/admin"
        vault.hashicorp.com/agent-inject-template-admin-auth.json: |
          {{- with secret "secret/data/shoppay/product/admin" -}}
          {
            "ADMIN_USERNAME": "{{ .Data.data.ADMIN_USERNAME }}",
            "ADMIN_PASSWORD_HASH": "{{ .Data.data.ADMIN_PASSWORD_HASH }}",
            "JWT_SECRET": "{{ .Data.data.JWT_SECRET }}"
          }
          {{- end -}}
```

---

### 5.3 Pod Hardening and Kubernetes Security Standards
To reduce container breakout attack surfaces, all deployments strictly implement standard hardening configuration parameters:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  runAsGroup: 65532
  fsGroup: 65532
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: product-service
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
```

---

### 5.4 Trivy Container Vulnerability Scanning
All custom images (frontend and backend microservices) are subjected to container image scanning inside the CI/CD pipeline using **Trivy**. High and Critical severity issues block deployments automatically.

```bash
# scripts/scan-images.sh
#!/bin/bash
set -e
IMAGE_NAME=$1
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --quiet $IMAGE_NAME
```

A list of accepted system exceptions and baseline overrides is tracked via `.trivyignore` in the project root directory.

---

## 6. API Gateway & Routing Layer (Kong Ingress Controller)

Kong runs as a Kubernetes Ingress Controller, parsing native `Ingress` specs and mapping routes.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd
  namespace: argocd
  annotations:
    konghq.com/protocols: "http"
    ingress.kubernetes.io/service-upstream: "true"
spec:
  ingressClassName: kong
  rules:
    - host: argocd.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
```

### Route Reconciliation Mechanics (DB-less Mode)
1. **Dynamic Manifest Parsing:** The Kong Ingress Controller monitors the Kubernetes API server for changes to `Ingress` and `Service` resources.
2. **In-Memory Config Generation:** It constructs a configuration tree mapping ingress paths to Kong services.
3. **Decoupled Configuration POST:** The configuration is applied via a POST request to Kong's admin API (`https://localhost:8444/config`) in-memory.
4. **Endpoint Resolution Override:** Using `ingress.kubernetes.io/service-upstream: "true"` bypasses endpoint matching, configuring the upstream to use the Service's ClusterIP DNS domain name rather than parsing direct container IPs.

---

## 7. GitOps & Continuous Deployment (Helm + ArgoCD)

Continuous integration and continuous deployment are managed through infrastructure-as-code tooling:

### A. Helm Configuration Structure
The Helm configuration encapsulates all resources in a nested template layout:

```
charts/shoppay/
├── Chart.yaml                  # Chart metadata and dependencies (e.g. postgresql)
├── values.yaml                 # Values file specifying image tags and ports
└── templates/                  # Microservice manifests
    ├── deployment.yaml         # Shared deployment template structure
    ├── service.yaml            # Internal ClusterIP declarations
    └── networkpolicy.yaml      # Calico namespace rules
```

### B. ArgoCD Declarative Synchronization
The state of the Helm chart is continuously reconciled with the active Kubernetes cluster state via an ArgoCD Application definition:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shoppay-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/MohamedMahmoudDesouky/Interprise-OnPremShopPay.git'
    targetRevision: HEAD
    path: charts/shoppay
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: shoppay-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

---

## 8. Monitoring, Observability & Alerting

We track cluster health using a Prometheus/Grafana integration:
- **ServiceMonitors:** Intercept application `/metrics` endpoints and export metrics to Prometheus.
- **Grafana Dashboards:** Provide live visualization of core metrics:
  - **Latency:** Request response time histogram values.
  - **Traffic:** Average requests per second.
  - **Errors:** HTTP 5xx/4xx error rate ratio calculation.
  - **Saturation:** CPU and memory request/limit consumption ratios.
- **Alertmanager alerts:** Trigger slack notifications if a service experiences pod restarts or latency climbs above acceptable levels.

---

## 9. Horizontal Pod Autoscaling (HPA)

To ensure high availability and responsiveness under fluctuating user loads, the **Interprise-OnPremShopPay** application integrates dynamic autoscaling via the Kubernetes **HorizontalPodAutoscaler (HPA)** (`autoscaling/v2`). 

Each frontend and backend microservice is configured with HPA templates that automatically adjust the number of replica pods based on observed resource utilization (CPU and Memory).

### 9.1 Autoscaling Configuration & Thresholds
The HPA specifies target utilization percentages based on the resource requests of the pods. The threshold and replica specifications for each service are detailed below:

| Microservice | Namespace | Min Replicas | Max Replicas | CPU Target | Memory Target |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **frontend** | `shoppay-frontend` | 2 | 10 | 70% | 75% |
| **product-service** | `shoppay-product` | 2 | 10 | 70% | 75% |
| **order-service** | `shoppay-order` | 2 | 10 | 70% | 75% |
| **payment-service** | `shoppay-payment` | 2 | 10 | 70% | 80% |
| **contact-service** | `shoppay-contact` | 2 | 10 | 70% | 75% |

### 9.2 Helm Template Architecture (`hpa.yaml`)
A single, modular `hpa.yaml` template dynamically iterates through the active services specified in the values file to declare HPA manifests:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ $service.name }}
  namespace: {{ $service.namespace }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ $service.name }}
  minReplicas: {{ $service.hpa.minReplicas }}
  maxReplicas: {{ $service.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ $service.hpa.metrics.cpu.averageUtilization }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ $service.hpa.metrics.memory.averageUtilization }}
```

### 9.3 Custom Scaling Behavior & Policies
To optimize reactivity and prevent cluster thrashing, custom scale-up and scale-down behaviors are defined for all services:

#### A. Scale-Up Behavior
* **Stabilization Window:** 0 seconds (scale up immediately when a spike is detected to preserve application responsiveness).
* **Scaling Policies:**
  * **Percent:** Increase replica capacity by **100%** of current replicas every 15 seconds.
  * **Pods:** Add **2** pods every 15 seconds.
* **Selection Policy:** `Max` (applies the policy that yields the highest number of pods to handle rapid spikes in traffic).

#### B. Scale-Down Behavior
* **Stabilization Window:** 300 seconds (5 minutes cooldown period where the system evaluates historical metrics before scaling down). This prevents the "flapping" phenomenon (frequent scale-up/scale-down cycles).
* **Scaling Policies:**
  * **Percent:** Decrease replicas by a maximum of **10%** every 60 seconds.
* **Selection Policy:** `Max`.

---

## 10. Operational Troubleshooting & Incident Log Deep Dives

### 10.1 Case Study A: Next.js Cache Write Errors on Read-Only Filesystems
* **Symptom:** Next.js frontend pods failed Kubernetes liveness probes and crashed shortly after launch, throwing write permissions errors on `/app/.next/cache`.
* **Root Cause:** Enforcing `readOnlyRootFilesystem: true` blocks Next.js from writing dynamic render cache assets to its default build folders during execution.
* **Resolution:** An ephemeral memory-backed volume was mounted at `/app/.next/cache` in the frontend Helm template to allow temporary writes to RAM:

```yaml
# charts/shoppay/templates/frontend.yaml (Volume Mount snippet)
volumeMounts:
  - name: next-cache
    mountPath: /app/.next/cache
volumes:
  - name: next-cache
    emptyDir: {}
```

---

### 10.2 Case Study B: ArgoCD Ingress Connectivity Hang
* **Symptom:** Exposing ArgoCD via Kong proxy resulted in connection attempts hanging indefinitely without returning data or HTTP status errors.
* **Root Cause Investigation:** We executed network calls directly within the Kong pod namespace. A TCP query directly to the ArgoCD server pod IP (`10.244.102.182:8080`) failed with `No route to host (errno 113)`. Calico processes routing using host-level routing tables, meaning direct container-to-container IP connections across namespaces are restricted by the Calico host interface routing rules in this environment.
* **Resolution:** We mapped routing through the ClusterIP layer instead of direct pod IP routing. By applying the `ingress.kubernetes.io/service-upstream: "true"` annotation to the `argocd-server` Service, KIC configured the upstream target as the service DNS (`argocd-server.argocd.svc:80`). This allowed requests to target the ClusterIP, which is intercepted and successfully DNAT'd by the host's `kube-proxy` rules, resolving the routing issue and returning **200 OK**.

---

### 10.3 Case Study C: Vault Agent Injection Connection Failures
* **Symptom:** Backend microservices hung at startup during the init-container stage, timing out with connection error logs targeting `http://vault.shoppay-vault.svc:8200`.
* **Root Cause:** Calico NetworkPolicies on the microservice namespaces had egress policies that allowed connection to local database resources but did not include permission rules to reach the `shoppay-vault` namespace.
* **Resolution:** We updated the `egress` block in the microservice NetworkPolicies to explicitly whitelist TCP port `8200` traffic targeting the `shoppay-vault` namespace:

```yaml
egress:
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: shoppay-vault
        podSelector:
          matchLabels:
            app.kubernetes.io/name: vault
    ports:
      - protocol: TCP
        port: 8200
```
This enabled the Vault Agent to successfully authenticate, pull secrets, and mount them for the main application, resolving the startup connection hang.
