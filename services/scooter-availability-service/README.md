# Scooter Availability Service

## Responsibility

Maintains scooter availability and status in the city.

## Technology

- Node.js (JavaScript)
- gRPC (`@grpc/grpc-js`, `@grpc/proto-loader`)
- Embedded database: NeDB (`@seald-io/nedb`)

## Main Business Entities

- `Scooter`
  - `scooterId`
  - `status` (`AVAILABLE`, `RENTED`, `CHARGING`, `OUT_OF_SERVICE`)
  - `batteryLevel`
  - `location`
  - `updatedAt`

## Example API Endpoints

- `GET /api/v1/scooters/available?lat={lat}&lon={lon}&radiusMeters={radius}` - check available scooters
- `PATCH /api/v1/scooters/{scooterId}/status` - update scooter status

Alternative gRPC methods:

- `CheckAvailableScooters(...)`
- `UpdateScooterStatus(...)`

Implemented gRPC contract is defined in `interfaces/grpc/proto/scooter_availability.proto`.

## Communication with Other Services

- Called by `rental-service` during rental start/end to synchronize scooter status.
- Does not need direct dependency on `user-service`.
- May subscribe to rental events in future event-driven mode.

## Internal Clean Architecture Layers

- `domain/`
  - Scooter status rules and transition constraints.

- `application/`
  - Use cases: query available scooters, update scooter status.

- `interfaces/`
  - API contracts, transport adapters, DTO mapping.

- `infrastructure/`
  - Data store adapters, geospatial indexing integrations.

## Implemented Functionalities

- Check available scooters around coordinates and radius (`CheckAvailableScooters`)
- Update scooter status with transition validation (`UpdateScooterStatus`)
- Battery level validation (0-100)
- Distance filtering using Haversine formula
- Structured logging for startup and gRPC calls

Allowed scooter statuses:

- `AVAILABLE`
- `RENTED`
- `CHARGING`
- `OUT_OF_SERVICE`

## Run Locally

From `services/scooter-availability-service`:

```bash
npm install
npm start
```

Default gRPC port: `50051` (override with env var `GRPC_PORT`).

## Tests

Unit tests are in `tests/` and cover:

- Application use cases
- Repository behavior
- Distance helper

Run tests:

```bash
npm test
```

## Docker

The service contains a `Dockerfile` for container build and run:

```bash
docker build -t scooter-availability-service .
docker run --rm -p 50051:50051 scooter-availability-service
```
