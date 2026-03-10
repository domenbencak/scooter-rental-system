# Scooter Rental System (Microservices)

This repository defines the architecture and planning baseline for a city-wide electric scooter rental platform.

The goal is to design a Clean Architecture based microservice system where:

- users create accounts,
- users start rentals,
- users end rentals,
- users check scooter availability.

No production logic is implemented in this repository yet. The focus is architecture, API contracts, and repository organization.

## Project Scope

The system consists of four components:

- `user-service`
- `rental-service`
- `scooter-availability-service`
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
- Calls backend APIs via an API gateway/BFF in future stages.

## Service Communication (Conceptual)

Synchronous communication:

- `web-ui -> user-service` for account flows.
- `web-ui -> rental-service` for start/end rental flows.
- `web-ui -> scooter-availability-service` for map/list availability.

Inter-service communication:

- `rental-service -> user-service` validates user existence before rental start.
- `rental-service -> scooter-availability-service` reserves and releases scooter state.

Future asynchronous options (recommended):

- `rental.started` event updates availability projection.
- `rental.ended` event updates scooter state and analytics.

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
```

## How The System Would Run In The Future

Planned runtime model (not implemented here):

1. Each service is built and deployed independently.
2. Services expose versioned HTTP/gRPC APIs.
3. A gateway/BFF routes external requests from `web-ui` to internal services.
4. Each service owns its own datastore (database-per-service pattern).
5. Observability (logs/metrics/traces) is centralized.

Possible local development workflow (future):

1. Start dependencies with Docker Compose or Kubernetes.
2. Start `user-service`, `rental-service`, and `scooter-availability-service`.
3. Start `web-ui`.
4. Run contract tests against API specs.
