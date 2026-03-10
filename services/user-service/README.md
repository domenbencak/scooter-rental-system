# User Service

## Responsibility

Manages user accounts and user identity data.

## Main Business Entities

- `User`
  - `userId`
  - `email`
  - `fullName`
  - `phone`
  - `status`
  - `createdAt`

## Example API Endpoints

- `POST /api/v1/users` - register user
- `GET /api/v1/users/{userId}` - get user by ID

Alternative gRPC methods:

- `RegisterUser(...)`
- `GetUser(...)`

## Communication with Other Services

- Called by `rental-service` to verify that a user exists and is active before starting a rental.
- Does not directly call other services in the initial design.

## Internal Clean Architecture Layers

- `domain/`
  - User entity rules (e.g., identity consistency).

- `application/`
  - Use cases: register user, fetch user.

- `interfaces/`
  - REST/gRPC endpoints and DTO mapping.

- `infrastructure/`
  - Persistence implementation, framework wiring, and adapters.
