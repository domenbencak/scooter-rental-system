# Scooter Availability Service

## Responsibility

Maintains scooter availability and status in the city.

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
