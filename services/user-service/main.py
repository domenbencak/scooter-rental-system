import logging
import os

from fastapi import FastAPI

from infrastructure.db import Base, engine
from infrastructure import models  # noqa: F401
from interfaces.exception_handlers import register_exception_handlers
from interfaces.middleware import RequestContextLoggingMiddleware
from interfaces.routes import router


def configure_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


configure_logging()
logger = logging.getLogger("user-service")

app = FastAPI(
    title="User Service API",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(RequestContextLoggingMiddleware)
app.include_router(router, prefix="/api/v1", tags=["Users"])
register_exception_handlers(app)


@app.on_event("startup")
def on_startup() -> None:
    logger.info("service_starting", extra={"trace_id": "-"})
    # Keep startup robust in local/dev environments where migrations may not be run yet.
    Base.metadata.create_all(bind=engine)
    logger.info("service_started", extra={"trace_id": "-"})


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
