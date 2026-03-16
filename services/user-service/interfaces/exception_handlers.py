from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from domain.exceptions import UserConflictError, UserNotFoundError
from interfaces.middleware import current_trace_id
from interfaces.schemas import ErrorResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UserConflictError)
    async def handle_conflict(_: Request, exc: UserConflictError):
        payload = ErrorResponse(error=exc.error_code, message=str(exc), traceId=current_trace_id())
        return JSONResponse(status_code=409, content=payload.model_dump())

    @app.exception_handler(UserNotFoundError)
    async def handle_not_found(_: Request, exc: UserNotFoundError):
        payload = ErrorResponse(error=exc.error_code, message=str(exc), traceId=current_trace_id())
        return JSONResponse(status_code=404, content=payload.model_dump())

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError):
        message = exc.errors()[0].get("msg", "Validation error") if exc.errors() else "Validation error"
        payload = ErrorResponse(error="VALIDATION_ERROR", message=message, traceId=current_trace_id())
        return JSONResponse(status_code=422, content=payload.model_dump())

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception):
        payload = ErrorResponse(error="INTERNAL_ERROR", message="Unexpected server error", traceId=current_trace_id())
        return JSONResponse(status_code=500, content=payload.model_dump())
