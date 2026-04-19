import asyncio
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from uuid import uuid4

import grpc
import httpx
from fastapi import FastAPI, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from grpc_stubs import scooter_availability_pb2, scooter_availability_pb2_grpc

USER_SERVICE_BASE_URL = os.getenv("USER_SERVICE_BASE_URL", "http://user-service:8081")
RENTAL_SERVICE_BASE_URL = os.getenv("RENTAL_SERVICE_BASE_URL", "http://rental-service:8082")
SCOOTER_SERVICE_HOST = os.getenv("SCOOTER_SERVICE_HOST", "scooter-availability-service")
SCOOTER_SERVICE_PORT = int(os.getenv("SCOOTER_SERVICE_PORT", "50051"))
SCOOTER_SERVICE_ADDRESS = f"{SCOOTER_SERVICE_HOST}:{SCOOTER_SERVICE_PORT}"


class LocationRequest(BaseModel):
    lat: float
    lon: float


class RegisterUserRequest(BaseModel):
    email: str
    fullName: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=6, max_length=32)


class StartRideRequest(BaseModel):
    userId: str
    scooterId: str
    startLocation: LocationRequest


class FinishRideRequest(BaseModel):
    lat: float
    lon: float
    batteryLevel: int = Field(ge=0, le=100)


@dataclass
class GatewayClients:
    http_client: httpx.AsyncClient
    grpc_channel: grpc.aio.Channel
    scooter_stub: scooter_availability_pb2_grpc.ScooterAvailabilityServiceStub


class GrpcServiceError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=3.0))
    grpc_channel = grpc.aio.insecure_channel(SCOOTER_SERVICE_ADDRESS)
    scooter_stub = scooter_availability_pb2_grpc.ScooterAvailabilityServiceStub(grpc_channel)

    app.state.clients = GatewayClients(
        http_client=http_client,
        grpc_channel=grpc_channel,
        scooter_stub=scooter_stub,
    )
    yield
    await http_client.aclose()
    await grpc_channel.close()


app = FastAPI(title="Mobile API Gateway", version="1.0.0", lifespan=lifespan)


def resolve_trace_id(x_trace_id: str | None) -> str:
    return x_trace_id or str(uuid4())


def build_json_response(status_code: int, payload: dict | list, trace_id: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=payload, headers={"X-Trace-Id": trace_id})


async def call_http_service(
    *,
    clients: GatewayClients,
    method: str,
    url: str,
    trace_id: str,
    payload: dict | None = None,
) -> tuple[int, dict | list, str]:
    response = await clients.http_client.request(
        method,
        url,
        json=payload,
        headers={"X-Trace-Id": trace_id},
    )

    try:
        body: dict | list = response.json()
    except ValueError:
        body = {"error": "DEPENDENCY_FAILURE", "message": response.text}

    downstream_trace = response.headers.get("X-Trace-Id", trace_id)
    return response.status_code, body, downstream_trace


def map_grpc_status_to_http(code: grpc.StatusCode) -> int:
    if code == grpc.StatusCode.INVALID_ARGUMENT:
        return 400
    if code == grpc.StatusCode.NOT_FOUND:
        return 404
    if code == grpc.StatusCode.FAILED_PRECONDITION:
        return 409
    if code == grpc.StatusCode.UNAVAILABLE:
        return 503
    return 502


def map_scooter(scooter: scooter_availability_pb2.Scooter) -> dict:
    return {
        "scooterId": scooter.scooter_id,
        "status": scooter_availability_pb2.ScooterStatus.Name(scooter.status),
        "batteryLevel": scooter.battery_level,
        "location": {"lat": scooter.latitude, "lon": scooter.longitude},
        "updatedAt": scooter.updated_at,
    }


async def get_available_scooters(
    *,
    clients: GatewayClients,
    lat: float,
    lon: float,
    radius_meters: int,
    trace_id: str,
) -> list[dict]:
    request = scooter_availability_pb2.CheckAvailableScootersRequest(
        latitude=lat,
        longitude=lon,
        radius_meters=radius_meters,
    )
    metadata = (("x-trace-id", trace_id),)
    try:
        response = await clients.scooter_stub.CheckAvailableScooters(request, metadata=metadata, timeout=5.0)
    except grpc.aio.AioRpcError as error:
        raise GrpcServiceError(
            status_code=map_grpc_status_to_http(error.code()),
            message=error.details() or "Scooter service call failed.",
        ) from error
    return [map_scooter(scooter) for scooter in response.scooters]


@app.get("/health")
async def health(x_trace_id: str | None = Header(default=None, alias="X-Trace-Id")) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    return build_json_response(200, {"status": "ok"}, trace_id)


@app.post("/api/mobile/v1/onboarding/register")
async def mobile_register_user(
    request: RegisterUserRequest,
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    clients: GatewayClients = app.state.clients

    status_code, body, downstream_trace = await call_http_service(
        clients=clients,
        method="POST",
        url=f"{USER_SERVICE_BASE_URL}/api/v1/users",
        payload=request.model_dump(),
        trace_id=trace_id,
    )
    return build_json_response(status_code, body, downstream_trace)


@app.get("/api/mobile/v1/rides/active/{user_id}")
async def mobile_get_active_rides(
    user_id: str,
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    clients: GatewayClients = app.state.clients
    status_code, body, downstream_trace = await call_http_service(
        clients=clients,
        method="GET",
        url=f"{RENTAL_SERVICE_BASE_URL}/api/v1/rentals/active?userId={user_id}",
        trace_id=trace_id,
    )
    return build_json_response(status_code, body, downstream_trace)


@app.post("/api/mobile/v1/rides/start")
async def mobile_start_ride(
    request: StartRideRequest,
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    clients: GatewayClients = app.state.clients
    status_code, body, downstream_trace = await call_http_service(
        clients=clients,
        method="POST",
        url=f"{RENTAL_SERVICE_BASE_URL}/api/v1/rentals/start",
        payload=request.model_dump(),
        trace_id=trace_id,
    )
    return build_json_response(status_code, body, downstream_trace)


@app.post("/api/mobile/v1/rides/{rental_id}/finish")
async def mobile_finish_ride(
    rental_id: str,
    request: FinishRideRequest,
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    clients: GatewayClients = app.state.clients
    payload = {
        "endLocation": {"lat": request.lat, "lon": request.lon},
        "batteryLevel": request.batteryLevel,
    }
    status_code, body, downstream_trace = await call_http_service(
        clients=clients,
        method="POST",
        url=f"{RENTAL_SERVICE_BASE_URL}/api/v1/rentals/{rental_id}/end",
        payload=payload,
        trace_id=trace_id,
    )
    return build_json_response(status_code, body, downstream_trace)


@app.get("/api/mobile/v1/scooters/nearby")
async def mobile_get_nearby_scooters(
    lat: float = Query(...),
    lon: float = Query(...),
    radiusMeters: int = Query(500, gt=0),
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    clients: GatewayClients = app.state.clients

    try:
        scooters = await get_available_scooters(
            clients=clients,
            lat=lat,
            lon=lon,
            radius_meters=radiusMeters,
            trace_id=trace_id,
        )
    except GrpcServiceError as error:
        return build_json_response(
            error.status_code,
            {"error": "DEPENDENCY_FAILURE", "message": str(error), "traceId": trace_id},
            trace_id,
        )

    return build_json_response(200, {"items": scooters}, trace_id)


@app.get("/api/mobile/v1/dashboard/{user_id}")
async def mobile_dashboard(
    user_id: str,
    lat: float = Query(...),
    lon: float = Query(...),
    radiusMeters: int = Query(500, gt=0),
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
) -> JSONResponse:
    trace_id = resolve_trace_id(x_trace_id)
    clients: GatewayClients = app.state.clients

    user_task = call_http_service(
        clients=clients,
        method="GET",
        url=f"{USER_SERVICE_BASE_URL}/api/v1/users/{user_id}",
        trace_id=trace_id,
    )
    active_rides_task = call_http_service(
        clients=clients,
        method="GET",
        url=f"{RENTAL_SERVICE_BASE_URL}/api/v1/rentals/active?userId={user_id}",
        trace_id=trace_id,
    )
    nearby_scooters_task = get_available_scooters(
        clients=clients,
        lat=lat,
        lon=lon,
        radius_meters=radiusMeters,
        trace_id=trace_id,
    )

    user_result, active_result, scooters_result = await asyncio.gather(
        user_task,
        active_rides_task,
        nearby_scooters_task,
        return_exceptions=True,
    )

    if isinstance(user_result, Exception):
        return build_json_response(
            502,
            {"error": "DEPENDENCY_FAILURE", "message": "User service call failed.", "traceId": trace_id},
            trace_id,
        )
    if isinstance(active_result, Exception):
        return build_json_response(
            502,
            {"error": "DEPENDENCY_FAILURE", "message": "Rental service call failed.", "traceId": trace_id},
            trace_id,
        )
    if isinstance(scooters_result, Exception):
        status_code = 502
        if isinstance(scooters_result, GrpcServiceError):
            status_code = scooters_result.status_code
        return build_json_response(
            status_code,
            {"error": "DEPENDENCY_FAILURE", "message": str(scooters_result), "traceId": trace_id},
            trace_id,
        )

    user_status, user_body, _ = user_result
    if user_status >= 400:
        return build_json_response(user_status, user_body, trace_id)

    active_status, active_body, _ = active_result
    if active_status >= 400:
        return build_json_response(active_status, active_body, trace_id)

    active_items = []
    if isinstance(active_body, dict):
        active_items = active_body.get("items", [])

    response_payload = {
        "user": user_body,
        "activeRental": active_items[0] if active_items else None,
        "availableScooters": scooters_result,
    }
    return build_json_response(200, response_payload, trace_id)
