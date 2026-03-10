# Web UI

## Responsibility

`web-ui` is the user-facing frontend application for:

- account creation,
- browsing nearby available scooters,
- starting a rental,
- ending a rental.

## Interaction with Services

The UI consumes backend APIs:

- `user-service` for account flows,
- `rental-service` for rental lifecycle,
- `scooter-availability-service` for availability views.

In future phases, an API gateway or BFF is recommended to simplify client communication and auth handling.

## Planned Screens

- Registration/Login
- Scooter availability map/list
- Active rental dashboard
- Rental history summary

No frontend implementation is included yet.
