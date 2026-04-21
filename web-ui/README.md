# Web UI (Micro Frontends)

`web-ui` is implemented as a **Micro Frontends** client:

- `shell` - host/container application
- `mfes/users` - user registration and user lookup
- `mfes/rentals` - rental start, end, and active rentals
- `mfes/scooters` - available scooters and scooter status updates

The shell dynamically loads each micro frontend as a separate browser module and keeps shared context (`userId`, `rentalId`, `scooterId`) between them.

## Covered Backend Functionalities

The UI supports testing all web gateway endpoints:

- `POST /api/v1/users`
- `GET /api/v1/users/{userId}`
- `POST /api/v1/rentals/start`
- `POST /api/v1/rentals/{rentalId}/end`
- `GET /api/v1/rentals/active?userId={userId}`
- `GET /api/v1/scooters/available?lat={lat}&lon={lon}&radiusMeters={radius}`
- `PATCH /api/v1/scooters/{scooterId}/status`

## Run with Docker Compose

From repository root:

```bash
docker compose up --build web-ui web-api-gateway user-service rental-service scooter-availability-service
```

Open:

- Web UI: `http://localhost:8085`
- Web API Gateway: `http://localhost:8083`

You can change the gateway URL directly in the shell header if needed.

## Docker Image

`web-ui` has its own `Dockerfile` and is included in the DockerHub publish workflow.
