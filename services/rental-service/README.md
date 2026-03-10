# Rental Service

## Responsibility

Controls rental lifecycle and enforces rental business rules.

## Main Business Entities

- `Rental`
  - `rentalId`
  - `userId`
  - `scooterId`
  - `status` (`ACTIVE`, `ENDED`)
  - `startedAt`
  - `endedAt`
  - `startLocation`
  - `endLocation`

## Example API Endpoints

- `POST /api/v1/rentals/start` - start rental
- `POST /api/v1/rentals/{rentalId}/end` - end rental
- `GET /api/v1/rentals/active?userId={userId}` - get active rentals

Alternative gRPC methods:
- `StartRental(...)`
- `EndRental(...)`
- `GetActiveRentals(...)`

## Communication with Other Services

- Calls `user-service` to verify user eligibility before starting a rental.
- Calls `scooter-availability-service` to set scooter state:
  - `AVAILABLE -> RENTED` on rental start,
  - `RENTED -> AVAILABLE` on rental end.
- Can publish domain events (`rental.started`, `rental.ended`) in future architecture.

## Internal Clean Architecture Layers

- `domain/`
  - Rental aggregate and lifecycle invariants.

- `application/`
  - Use cases: start rental, end rental, list active rentals.

- `interfaces/`
  - API endpoints and request/response mapping.

- `infrastructure/`
  - Repositories, service clients, messaging adapters.
