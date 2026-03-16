# User Service

## Responsibility

Manages user accounts and user identity data.

## Implemented Stack

- Python 3.12
- FastAPI
- SQLAlchemy 2.x
- PostgreSQL
- Alembic
- pytest

## API Endpoints

- `POST /api/v1/users` - register user
- `GET /api/v1/users/{userId}` - get user by ID

## OpenAPI

- Swagger UI: `http://localhost:8081/docs`
- OpenAPI JSON: `http://localhost:8081/openapi.json`

## Architecture Summary

- `domain/` entity and domain exceptions
- `application/` ports and use cases
- `interfaces/` HTTP routes, DTOs, middleware, and exception handlers
- `infrastructure/` SQLAlchemy models, database setup, repository adapter

## Run Locally

1. Install dependencies:

```bash
pip install -r requirements-dev.txt
```

2. Set database URL (optional, defaults are provided):

```bash
export DATABASE_URL=postgresql+psycopg://user_user:user_pass@localhost:5435/user_db
```

3. Run migrations:

```bash
alembic upgrade head
```

4. Start service:

```bash
uvicorn main:app --host 0.0.0.0 --port 8081
```

## Run Tests

```bash
pytest
```

## Run with Docker Compose

From repository root:

```bash
docker compose up --build user-db user-service
```

## CI

- Workflow file: `.github/workflows/user-service-ci.yml`
- Trigger: push changes under `services/user-service/**`
- CI action: install dependencies and run `pytest`
