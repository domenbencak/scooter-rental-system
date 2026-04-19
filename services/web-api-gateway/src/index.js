const crypto = require("crypto");
const path = require("path");
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PORT = Number(process.env.PORT || 8083);
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || "http://user-service:8081";
const RENTAL_SERVICE_BASE_URL = process.env.RENTAL_SERVICE_BASE_URL || "http://rental-service:8082";
const SCOOTER_SERVICE_HOST = process.env.SCOOTER_SERVICE_HOST || "scooter-availability-service";
const SCOOTER_SERVICE_PORT = Number(process.env.SCOOTER_SERVICE_PORT || 50051);

const PROTO_PATH = path.join(__dirname, "proto", "scooter_availability.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const scooterAvailabilityProto =
  grpc.loadPackageDefinition(packageDefinition).scooteravailability;

const scooterClient = new scooterAvailabilityProto.ScooterAvailabilityService(
  `${SCOOTER_SERVICE_HOST}:${SCOOTER_SERVICE_PORT}`,
  grpc.credentials.createInsecure(),
);

const app = express();
app.use(express.json());

function resolveTraceId(request) {
  return request.header("X-Trace-Id") || crypto.randomUUID();
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function parseResponseBody(response) {
  const raw = await response.text();
  if (raw.length === 0) {
    return null;
  }

  const parsed = tryParseJson(raw);
  return parsed === null ? { message: raw } : parsed;
}

async function forwardHttpRequest({ baseUrl, pathName, method, traceId, payload }) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Trace-Id": traceId,
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  const body = await parseResponseBody(response);
  return {
    status: response.status,
    body,
    traceId: response.headers.get("X-Trace-Id") || traceId,
  };
}

function mapGrpcErrorToHttpStatus(errorCode) {
  if (errorCode === grpc.status.INVALID_ARGUMENT) {
    return 400;
  }
  if (errorCode === grpc.status.NOT_FOUND) {
    return 404;
  }
  if (errorCode === grpc.status.FAILED_PRECONDITION) {
    return 409;
  }
  if (errorCode === grpc.status.UNAVAILABLE) {
    return 503;
  }
  return 502;
}

function toGatewayError(error, traceId) {
  return {
    error: "DEPENDENCY_FAILURE",
    message: error.message || "Dependency call failed.",
    traceId,
  };
}

function respondForwarded(response, forwarded) {
  response.setHeader("X-Trace-Id", forwarded.traceId);
  if (forwarded.body === null) {
    response.status(forwarded.status).end();
    return;
  }
  response.status(forwarded.status).json(forwarded.body);
}

function checkAvailableScooters(request, traceId) {
  const metadata = new grpc.Metadata();
  metadata.set("x-trace-id", traceId);

  return new Promise((resolve, reject) => {
    scooterClient.CheckAvailableScooters(
      request,
      metadata,
      { deadline: Date.now() + 5000 },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response);
      },
    );
  });
}

function updateScooterStatus(request, traceId) {
  const metadata = new grpc.Metadata();
  metadata.set("x-trace-id", traceId);

  return new Promise((resolve, reject) => {
    scooterClient.UpdateScooterStatus(
      request,
      metadata,
      { deadline: Date.now() + 5000 },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response);
      },
    );
  });
}

function wrapRoute(handler) {
  return async (request, response) => {
    const traceId = resolveTraceId(request);
    response.setHeader("X-Trace-Id", traceId);

    try {
      await handler(request, response, traceId);
    } catch (error) {
      const payload = toGatewayError(error, traceId);
      response.status(502).json(payload);
    }
  };
}

app.get(
  "/health",
  wrapRoute(async (_, response) => {
    response.status(200).json({ status: "ok" });
  }),
);

app.post(
  "/api/v1/users",
  wrapRoute(async (request, response, traceId) => {
    const forwarded = await forwardHttpRequest({
      baseUrl: USER_SERVICE_BASE_URL,
      pathName: "/api/v1/users",
      method: "POST",
      payload: request.body,
      traceId,
    });
    respondForwarded(response, forwarded);
  }),
);

app.get(
  "/api/v1/users/:userId",
  wrapRoute(async (request, response, traceId) => {
    const forwarded = await forwardHttpRequest({
      baseUrl: USER_SERVICE_BASE_URL,
      pathName: `/api/v1/users/${request.params.userId}`,
      method: "GET",
      traceId,
    });
    respondForwarded(response, forwarded);
  }),
);

app.post(
  "/api/v1/rentals/start",
  wrapRoute(async (request, response, traceId) => {
    const forwarded = await forwardHttpRequest({
      baseUrl: RENTAL_SERVICE_BASE_URL,
      pathName: "/api/v1/rentals/start",
      method: "POST",
      payload: request.body,
      traceId,
    });
    respondForwarded(response, forwarded);
  }),
);

app.post(
  "/api/v1/rentals/:rentalId/end",
  wrapRoute(async (request, response, traceId) => {
    const forwarded = await forwardHttpRequest({
      baseUrl: RENTAL_SERVICE_BASE_URL,
      pathName: `/api/v1/rentals/${request.params.rentalId}/end`,
      method: "POST",
      payload: request.body,
      traceId,
    });
    respondForwarded(response, forwarded);
  }),
);

app.get(
  "/api/v1/rentals/active",
  wrapRoute(async (request, response, traceId) => {
    const userId = request.query.userId;
    const forwarded = await forwardHttpRequest({
      baseUrl: RENTAL_SERVICE_BASE_URL,
      pathName: `/api/v1/rentals/active?userId=${encodeURIComponent(userId || "")}`,
      method: "GET",
      traceId,
    });
    respondForwarded(response, forwarded);
  }),
);

app.get(
  "/api/v1/scooters/available",
  wrapRoute(async (request, response, traceId) => {
    const lat = Number(request.query.lat);
    const lon = Number(request.query.lon);
    const radiusMeters = Number.parseInt(String(request.query.radiusMeters), 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isInteger(radiusMeters) || radiusMeters <= 0) {
      response.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Query params lat, lon and radiusMeters are required.",
        traceId,
      });
      return;
    }

    try {
      const grpcResponse = await checkAvailableScooters(
        { latitude: lat, longitude: lon, radius_meters: radiusMeters },
        traceId,
      );

      response.status(200).json({
        items: grpcResponse.scooters.map((scooter) => ({
          scooterId: scooter.scooter_id,
          status: scooter.status,
          batteryLevel: scooter.battery_level,
          location: {
            lat: scooter.latitude,
            lon: scooter.longitude,
          },
          updatedAt: scooter.updated_at,
        })),
      });
    } catch (error) {
      response.status(mapGrpcErrorToHttpStatus(error.code)).json(toGatewayError(error, traceId));
    }
  }),
);

app.patch(
  "/api/v1/scooters/:scooterId/status",
  wrapRoute(async (request, response, traceId) => {
    const { status, batteryLevel, location } = request.body;
    if (
      typeof status !== "string" ||
      !Number.isInteger(batteryLevel) ||
      !location ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lon)
    ) {
      response.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Body must include status, batteryLevel and location {lat, lon}.",
        traceId,
      });
      return;
    }

    try {
      const grpcResponse = await updateScooterStatus(
        {
          scooter_id: request.params.scooterId,
          status,
          battery_level: batteryLevel,
          latitude: location.lat,
          longitude: location.lon,
        },
        traceId,
      );

      response.status(200).json({
        scooterId: grpcResponse.scooter.scooter_id,
        status: grpcResponse.scooter.status,
        batteryLevel: grpcResponse.scooter.battery_level,
        location: {
          lat: grpcResponse.scooter.latitude,
          lon: grpcResponse.scooter.longitude,
        },
        updatedAt: grpcResponse.scooter.updated_at,
      });
    } catch (error) {
      response.status(mapGrpcErrorToHttpStatus(error.code)).json(toGatewayError(error, traceId));
    }
  }),
);

app.listen(PORT, () => {
  console.log(`web-api-gateway listening on port ${PORT}`);
});
