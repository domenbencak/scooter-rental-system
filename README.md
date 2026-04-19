# Scooter Rental System (Microservices)

This repository defines and implements a city-wide electric scooter rental platform based on microservices and clean architecture.

The goal is to design a Clean Architecture based microservice system where:

- users create accounts,
- users start rentals,
- users end rentals,
- users check scooter availability.

The backend services are implemented incrementally in different technologies while keeping the architecture, API contracts, and repository organization consistent.

## Project Scope

The system consists of six components:

- `user-service`
- `rental-service`
- `scooter-availability-service`
- `web-api-gateway`
- `mobile-api-gateway`
- `web-ui`

## Architecture Overview

The system follows these principles:

- Business logic is independent from frameworks, databases, and transport protocols.
- Dependencies point inward (`infrastructure -> interfaces -> application -> domain`).
- Services are loosely coupled and communicate only through explicit API contracts.
- Folders reflect business capabilities (screaming architecture), not technical stacks.

Detailed architecture notes are in `docs/architecture.md`.

## Microservices

### 1) User Service

- Owns user identity and profile data.
- Provides registration and user lookup.

### 2) Rental Service

- Owns rental lifecycle and rules.
- Starts and ends rentals.

### 3) Scooter Availability Service

- Owns scooter status and city availability view.
- Tracks whether scooters are available, rented, charging, or out-of-service.

### 4) Web UI

- Frontend application for end users.
- Calls backend APIs through dedicated API gateways.

### 5) Web API Gateway

- Node.js + Express.
- Single entry point for browser clients.
- Routes REST requests to `user-service` and `rental-service`, and maps scooter gRPC calls to REST.

### 6) Mobile API Gateway

- Python + FastAPI.
- Mobile-optimized API facade with dedicated endpoint structure and an aggregated dashboard endpoint.
- Aggregates data from user, rental, and scooter services.

## Service Communication (Conceptual)

Synchronous communication:

- `web-ui -> web-api-gateway -> user-service/rental-service/scooter-availability-service`.
- `mobile client -> mobile-api-gateway -> user-service/rental-service/scooter-availability-service`.

Inter-service communication:

- `rental-service -> user-service` validates user existence before rental start.
- `rental-service -> scooter-availability-service` reserves and releases scooter state.

Future asynchronous options (recommended):

- `rental.started` event updates availability projection.
- `rental.ended` event updates scooter state and analytics.

Current asynchronous implementation:

- `rental-service -> ActiveMQ` publishes `rental.started` and `rental.ended` events on topic `rental.lifecycle`.

See `docs/architecture.md` and `docs/api-specifications.md` for details.

## Repository Structure

```text
scooter-rental-system/
  README.md
  docs/
    architecture.md
    api-specifications.md
  web-ui/
    README.md
  services/
    user-service/
      README.md
      domain/
      application/
      interfaces/
      infrastructure/
    rental-service/
      README.md
      domain/
      application/
      interfaces/
      infrastructure/
    scooter-availability-service/
      README.md
      domain/
      application/
      interfaces/
      infrastructure/
    web-api-gateway/
      README.md
      src/
    mobile-api-gateway/
      README.md
  ```

## Local Run (with API Gateways)

1. Start all services:

```bash
docker compose up --build
```

2. Gateway URLs:
   - Web gateway: `http://localhost:8083`
   - Mobile gateway: `http://localhost:8084`

3. Example gateway calls (curl/Postman):

```bash
# Web gateway - scooters availability
curl "http://localhost:8083/api/v1/scooters/available?lat=46.5547&lon=15.6459&radiusMeters=500"

# Mobile gateway - aggregated dashboard
curl "http://localhost:8084/api/mobile/v1/dashboard/<userId>?lat=46.5547&lon=15.6459&radiusMeters=500"
```
