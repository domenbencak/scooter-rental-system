import logging
import time
import uuid
from contextvars import ContextVar

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

trace_id_ctx_var: ContextVar[str] = ContextVar("trace_id", default="-")
logger = logging.getLogger("user-service.http")


class RequestContextLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
        token = trace_id_ctx_var.set(trace_id)
        request.state.trace_id = trace_id
        start = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            status_code = response.status_code if response is not None else 500
            logger.info(
                "request method=%s path=%s status=%s durationMs=%s traceId=%s",
                request.method,
                request.url.path,
                status_code,
                duration_ms,
                trace_id,
            )
            if response is not None:
                response.headers["X-Trace-Id"] = trace_id
            trace_id_ctx_var.reset(token)


def current_trace_id() -> str:
    return trace_id_ctx_var.get()
