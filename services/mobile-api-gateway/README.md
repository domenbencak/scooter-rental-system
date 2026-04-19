# Mobile API Gateway

## Purpose

`mobile-api-gateway` is a dedicated entry point for mobile clients.

It exposes mobile-specific endpoints and response shapes, and aggregates data from:

- `user-service` (REST)
- `rental-service` (REST)
- `scooter-availability-service` (gRPC)

## Technology

- Python
- FastAPI
- `httpx` (REST client)
- `grpcio` (gRPC client)

## Endpoints

- `GET /health`
- `POST /api/mobile/v1/onboarding/register`
- `GET /api/mobile/v1/rides/active/{userId}`
- `POST /api/mobile/v1/rides/start`
- `POST /api/mobile/v1/rides/{rentalId}/finish`
- `GET /api/mobile/v1/scooters/nearby?lat={lat}&lon={lon}&radiusMeters={radius}`
- `GET /api/mobile/v1/dashboard/{userId}?lat={lat}&lon={lon}&radiusMeters={radius}`

## Local Run

From `services/mobile-api-gateway`:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8084
```

Default port: `8084`.
