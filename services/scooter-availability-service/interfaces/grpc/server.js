const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ReflectionService } = require("@grpc/reflection");
const { ValidationError, InvalidStatusTransitionError } = require("../../domain/errors");

const PROTO_PATH = path.join(__dirname, "proto", "scooter_availability.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const scooterAvailabilityProto = grpc.loadPackageDefinition(packageDefinition).scooteravailability;

function mapToProtoScooter(scooter) {
  return {
    scooter_id: scooter.scooterId,
    status: scooter.status,
    battery_level: scooter.batteryLevel,
    latitude: scooter.location.lat,
    longitude: scooter.location.lon,
    updated_at: scooter.updatedAt
  };
}

function mapToGrpcError(error) {
  if (error instanceof ValidationError || error instanceof InvalidStatusTransitionError) {
    return {
      code: grpc.status.INVALID_ARGUMENT,
      message: error.message
    };
  }

  return {
    code: grpc.status.INTERNAL,
    message: "Internal service error."
  };
}

function createGrpcServer({ useCases, logger }) {
  const server = new grpc.Server();

  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  server.addService(scooterAvailabilityProto.ScooterAvailabilityService.service, {
    async CheckAvailableScooters(call, callback) {
      try {
        const scooters = await useCases.checkAvailableScooters({
          lat: call.request.latitude,
          lon: call.request.longitude,
          radiusMeters: call.request.radius_meters
        });

        callback(null, { scooters: scooters.map(mapToProtoScooter) });
      } catch (error) {
        logger.error("grpc_check_available_failed", { error: error.message });
        callback(mapToGrpcError(error));
      }
    },

    async UpdateScooterStatus(call, callback) {
      try {
        const scooter = await useCases.updateScooterStatus({
          scooterId: call.request.scooter_id,
          status: call.request.status,
          batteryLevel: call.request.battery_level,
          location: {
            lat: call.request.latitude,
            lon: call.request.longitude
          }
        });

        callback(null, { scooter: mapToProtoScooter(scooter) });
      } catch (error) {
        logger.error("grpc_update_status_failed", { error: error.message });
        callback(mapToGrpcError(error));
      }
    }
  });

  return server;
}

module.exports = {
  createGrpcServer
};
