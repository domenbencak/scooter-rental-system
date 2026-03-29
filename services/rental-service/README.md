# Rental Service

## Responsibility

Controls rental lifecycle and enforces rental business rules.

## Implemented Stack

- Java 21
- Spring Boot 3 / WebFlux
- Reactor
- Reactive MongoDB
- gRPC client for `scooter-availability-service`
- ActiveMQ topic publishing
- JUnit 5 / Mockito / WebTestClient

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
- `GET /health` - health check

## OpenAPI

- Swagger UI: `http://localhost:8082/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8082/v3/api-docs`

Alternative gRPC methods:

- `StartRental(...)`
- `EndRental(...)`
- `GetActiveRentals(...)`

## Communication with Other Services

- Calls `user-service` to verify user eligibility before starting a rental.
- Calls `scooter-availability-service` via gRPC to validate nearby scooter availability and set scooter state:
  - `AVAILABLE -> RENTED` on rental start,
  - `RENTED -> AVAILABLE` on rental end.
- Publishes domain events to ActiveMQ topic `rental.lifecycle`:
  - `rental.started`
  - `rental.ended`

## Internal Clean Architecture Layers

- `domain/`
  - Rental aggregate and lifecycle invariants.

- `application/`
  - Use cases: start rental, end rental, list active rentals.

- `interfaces/`
  - API endpoints and request/response mapping.

- `infrastructure/`
  - Repositories, service clients, messaging adapters.

## Implemented Functionalities

- Start rental with user validation against `user-service`
- Prevent more than one active rental per user
- Validate scooter availability near the requested start location through gRPC
- End rental and release scooter back to `AVAILABLE`
- Persist rental records in MongoDB
- Publish rental lifecycle events to ActiveMQ
- Structured request and business logs
- OpenAPI/Swagger documentation
- Unit and API tests

## Environment Variables

- `MONGODB_URI` default: `mongodb://localhost:27017/rental_db`
- `USER_SERVICE_BASE_URL` default: `http://localhost:8081`
- `SCOOTER_SERVICE_HOST` default: `localhost`
- `SCOOTER_SERVICE_PORT` default: `50051`
- `SCOOTER_AVAILABILITY_RADIUS_METERS` default: `500`
- `ACTIVEMQ_BROKER_URL` default: `tcp://localhost:61616`
- `ACTIVEMQ_USER` default: `admin`
- `ACTIVEMQ_PASSWORD` default: `admin`
- `RENTAL_EVENTS_TOPIC` default: `rental.lifecycle`

## Run Locally

From `services/rental-service`:

```bash
mvn spring-boot:run
```

Or:

```bash
mvn package
java -jar target/rental-service-1.0.0.jar
```

## Tests

Run unit and API tests:

```bash
mvn test
```

## Docker

Build and run:

```bash
docker build -t rental-service .
docker run --rm -p 8082:8082 rental-service
```

## Run With Docker Compose

From repository root:

```bash
docker compose up --build activemq rental-db rental-service
```

## CI

- Workflow file: `.github/workflows/rental-service-ci.yml`
- Trigger: push changes under `services/rental-service/**`
- CI action: run `mvn test`
