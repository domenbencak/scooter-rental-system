# Web API Gateway

## Purpose

`web-api-gateway` is the single entry point for browser/web clients.

It exposes web-facing REST endpoints and routes traffic to:

- `user-service` (REST)
- `rental-service` (REST)
- `scooter-availability-service` (gRPC)

## Technology

- Node.js
- Express
- gRPC client (`@grpc/grpc-js`)

## Endpoints

- `GET /health`
- `POST /api/v1/users`
- `GET /api/v1/users/{userId}`
- `POST /api/v1/rentals/start`
- `POST /api/v1/rentals/{rentalId}/end`
- `GET /api/v1/rentals/active?userId={userId}`
- `GET /api/v1/scooters/available?lat={lat}&lon={lon}&radiusMeters={radius}`
- `PATCH /api/v1/scooters/{scooterId}/status`

## Local Run

From `services/web-api-gateway`:

```bash
npm install
npm start
```

Default port: `8083`.
