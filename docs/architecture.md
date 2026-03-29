# Architecture Description

## 1. Purpose

The scooter rental system is designed as a set of autonomous business services with clear ownership boundaries:

- user identity and account lifecycle,
- rental lifecycle,
- scooter availability state.

The architecture prioritizes independent evolution, explicit contracts, and clean separation of business rules from technical details.

## 2. High-Level Components

- `web-ui`: user-facing client application.
- `user-service`: manages user registration and retrieval.
- `rental-service`: controls rental start/end and active rental state.
- `scooter-availability-service`: provides available scooters and maintains scooter operational status.

## 3. Clean Architecture Inside Each Service

Each service contains four layers:

1. `domain/`

- Enterprise business entities and invariants.
- No framework/database/network code.

2. `application/`

- Use cases and orchestration of domain behavior.
- Depends only on `domain` abstractions.

3. `interfaces/`

- API contracts (REST controllers, gRPC adapters, DTO mappers).
- Translates external requests into application use case calls.

4. `infrastructure/`

- Concrete adapters: persistence, messaging, HTTP clients, framework wiring.
- Implements ports/interfaces declared by inner layers.

Dependency direction:

```text
infrastructure -> interfaces -> application -> domain
```

## 4. Service Boundaries and Data Ownership

- `user-service` owns user data.
- `rental-service` owns rental records.
- `scooter-availability-service` owns scooter status and location projection.

No service writes directly to another service database.
All cross-service collaboration goes through API contracts or events.

## 5. Communication Model

### Synchronous API calls

- `web-ui -> user-service`
- `web-ui -> rental-service`
- `web-ui -> scooter-availability-service`
- `rental-service -> user-service` (validate user existence)
- `rental-service -> scooter-availability-service` (reserve/release scooter)

### Asynchronous events (future recommendation)

- `rental.started`
- `rental.ended`
- `scooter.status.changed`

Asynchronous messaging reduces coupling and improves resiliency for projections and analytics.

Current implementation note:

- `rental-service` publishes `rental.started` and `rental.ended` events to ActiveMQ topic `rental.lifecycle`.

## 6. Screaming Architecture Convention

The repository layout is business-centered:

- top-level folders are business components (`services/user-service`, `services/rental-service`, etc.),
- internal folders reflect business roles (`domain`, `application`) rather than specific frameworks.

## 7. Non-Functional Considerations (Planning)

- `Scalability`: independently scale high-traffic services (availability and rental).
- `Reliability`: retries, timeouts, circuit breakers for inter-service calls.
- `Observability`: logs, metrics, tracing across service boundaries.
- `Security`: authentication/authorization handled consistently at gateway and service boundaries.
- `Versioning`: API versioning required for backward compatibility.

## 8. Communication Diagram (Textual)

```text
[Web UI]
   |--> [User Service]
   |--> [Rental Service] --> [User Service]
   |                     --> [Scooter Availability Service]
   |--> [Scooter Availability Service]

Future events:
[Rental Service] --rental.started/rental.ended--> [Scooter Availability Service]
```
