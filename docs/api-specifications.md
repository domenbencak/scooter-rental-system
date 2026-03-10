# API Specifications (Examples Only)

This file defines API contracts only. It does not include implementation details.

## Conventions

- REST endpoints are versioned under `/api/v1`.
- IDs are UUID strings.
- Timestamps use ISO-8601 UTC format.
- Error payloads follow a common pattern:

```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Detailed error message",
  "traceId": "optional-correlation-id"
}
```

## 1) User Service API

### REST Endpoints

`POST /api/v1/users`
- Purpose: register a user.
- Request:

```json
{
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "phone": "+38640111222"
}
```

- Response `201 Created`:

```json
{
  "userId": "a2f7c6c9-3c12-4a8d-8f8d-1b2f2cb2a111",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "createdAt": "2026-03-10T09:30:00Z"
}
```

`GET /api/v1/users/{userId}`
- Purpose: retrieve user details.
- Response `200 OK`:

```json
{
  "userId": "a2f7c6c9-3c12-4a8d-8f8d-1b2f2cb2a111",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "status": "ACTIVE"
}
```

### Optional gRPC Contract

```proto
service UserService {
  rpc RegisterUser(RegisterUserRequest) returns (RegisterUserResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```

## 2) Rental Service API

### REST Endpoints

`POST /api/v1/rentals/start`
- Purpose: start a rental.
- Request:

```json
{
  "userId": "a2f7c6c9-3c12-4a8d-8f8d-1b2f2cb2a111",
  "scooterId": "f4ec7f52-7079-4f02-9f42-6a4e8f99b222",
  "startLocation": {
    "lat": 46.5547,
    "lon": 15.6459
  }
}
```

- Response `201 Created`:

```json
{
  "rentalId": "b3b39fe6-d5d7-4860-95d9-0bd5f7b7c333",
  "status": "ACTIVE",
  "startedAt": "2026-03-10T09:35:00Z"
}
```

`POST /api/v1/rentals/{rentalId}/end`
- Purpose: end a rental.
- Request:

```json
{
  "endLocation": {
    "lat": 46.5601,
    "lon": 15.6500
  }
}
```

- Response `200 OK`:

```json
{
  "rentalId": "b3b39fe6-d5d7-4860-95d9-0bd5f7b7c333",
  "status": "ENDED",
  "endedAt": "2026-03-10T10:02:00Z",
  "durationMinutes": 27
}
```

`GET /api/v1/rentals/active?userId={userId}`
- Purpose: get active rentals for a specific user.
- Response `200 OK`:

```json
{
  "items": [
    {
      "rentalId": "b3b39fe6-d5d7-4860-95d9-0bd5f7b7c333",
      "userId": "a2f7c6c9-3c12-4a8d-8f8d-1b2f2cb2a111",
      "scooterId": "f4ec7f52-7079-4f02-9f42-6a4e8f99b222",
      "startedAt": "2026-03-10T09:35:00Z"
    }
  ]
}
```

### Optional gRPC Contract

```proto
service RentalService {
  rpc StartRental(StartRentalRequest) returns (StartRentalResponse);
  rpc EndRental(EndRentalRequest) returns (EndRentalResponse);
  rpc GetActiveRentals(GetActiveRentalsRequest) returns (GetActiveRentalsResponse);
}
```

## 3) Scooter Availability Service API

### REST Endpoints

`GET /api/v1/scooters/available?lat={lat}&lon={lon}&radiusMeters={radius}`
- Purpose: find available scooters near a location.
- Response `200 OK`:

```json
{
  "items": [
    {
      "scooterId": "f4ec7f52-7079-4f02-9f42-6a4e8f99b222",
      "status": "AVAILABLE",
      "batteryLevel": 86,
      "location": {
        "lat": 46.5549,
        "lon": 15.6461
      }
    }
  ]
}
```

`PATCH /api/v1/scooters/{scooterId}/status`
- Purpose: update scooter status (internal use by rental and operations workflows).
- Request:

```json
{
  "status": "RENTED"
}
```

- Response `200 OK`:

```json
{
  "scooterId": "f4ec7f52-7079-4f02-9f42-6a4e8f99b222",
  "status": "RENTED",
  "updatedAt": "2026-03-10T09:35:01Z"
}
```

### Optional gRPC Contract

```proto
service ScooterAvailabilityService {
  rpc CheckAvailableScooters(CheckAvailableScootersRequest) returns (CheckAvailableScootersResponse);
  rpc UpdateScooterStatus(UpdateScooterStatusRequest) returns (UpdateScooterStatusResponse);
}
```

## Inter-Service API Usage

- `rental-service -> user-service`
  - `GET /api/v1/users/{userId}` or `GetUser(...)`
  - Used before rental start to validate user account.

- `rental-service -> scooter-availability-service`
  - `PATCH /api/v1/scooters/{scooterId}/status` or `UpdateScooterStatus(...)`
  - Sets scooter to `RENTED` on start and back to `AVAILABLE` on end.
