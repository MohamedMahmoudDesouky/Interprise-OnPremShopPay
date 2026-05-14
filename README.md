# ShopPay Split Architecture

This version keeps the working frontend separate from the backend services so every part can later become its own Docker image and Kubernetes Deployment.

## Structure

```text
shoppay-split-devops/
├── frontend/                         # Next.js UI
│   └── Dockerfile                    # Empty on purpose, write the frontend image steps here later
├── backend/
│   └── services/
│       ├── product-service/          # Products API
│       │   └── Dockerfile            # Empty on purpose
│       ├── order-service/            # Orders API
│       │   └── Dockerfile            # Empty on purpose
│       ├── payment-service/          # Mock payments API
│       │   └── Dockerfile            # Empty on purpose
│       └── contact-service/          # Contact messages API
│           └── Dockerfile            # Empty on purpose
└── api-gateway/                      # Nginx routing layer
    ├── nginx.conf
    └── Dockerfile                    # Empty on purpose
```

## Run frontend only

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Run backend services locally without Docker

Open one terminal per service:

```bash
cd backend/services/product-service
npm install
PORT=4001 npm run dev
```

```bash
cd backend/services/payment-service
npm install
PORT=4003 npm run dev
```

```bash
cd backend/services/order-service
npm install
PORT=4002 PAYMENT_SERVICE_URL=http://localhost:4003 npm run dev
```

```bash
cd backend/services/contact-service
npm install
PORT=4004 npm run dev
```

The API Gateway Dockerfile is intentionally empty for now. Until we write it, the frontend can call the gateway later through:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

For quick direct testing without the gateway, you can test services directly:

```bash
curl http://localhost:4001/api/products
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health
```

## What each service owns

- `product-service`: products catalog
- `order-service`: checkout and order creation
- `payment-service`: mock payment authorization
- `contact-service`: contact form messages
- `api-gateway`: routes `/api/...` traffic to the correct backend service

## Database note

Database integration is not added here because PostgreSQL will be created later using Kubernetes. The services already contain `.env.example` files with a `DATABASE_URL` placeholder so we know where to connect the DB later.

## Next step

After this split, the next DevOps step is writing Dockerfiles one by one, then building images, then creating Kubernetes Deployments and Services.
