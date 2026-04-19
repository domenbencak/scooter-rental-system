# Web UI

## Responsibility

`web-ui` is the user-facing frontend application for:

- account creation,
- browsing nearby available scooters,
- starting a rental,
- ending a rental.

## Interaction with Services

The UI consumes backend APIs through a dedicated gateway:

- `web-api-gateway` (`http://localhost:8083`) for:
  - account flows,
  - rental lifecycle,
  - scooter availability views.

For mobile clients, a separate `mobile-api-gateway` (`http://localhost:8084`) is provided with mobile-specific endpoints.

## Planned Screens

- Registration/Login
- Scooter availability map/list
- Active rental dashboard
- Rental history summary

No frontend implementation is included yet.
